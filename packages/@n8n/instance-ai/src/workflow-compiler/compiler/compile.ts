import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { deepCopy, type IConnections, type IDataObject } from 'n8n-workflow';

import type { NodeRegistry } from '../catalog/node-registry';
import { CORE_OPERATION_IDS } from '../catalog/operations';
import type { NodeOperation } from '../catalog/types';
import {
	compileExpression,
	compileExpressionBody,
	compileParameterTree,
	isExpressionParam,
	type Expression,
	type StepNameResolver,
} from '../expressions/expression';
import {
	isCompoundCondition,
	type ComparisonOp,
	type Condition,
	type CredentialRef,
	type ErrorPolicy,
	type RetryPolicy,
	type StepIR,
	type TriggerIR,
	type WorkflowIR,
} from '../ir/schema';
import {
	COMPILER_VERSION,
	NODE_REGISTRY_VERSION,
	PATTERN_REGISTRY_VERSION,
	WORKFLOW_SCHEMA_VERSION,
} from '../versions';

type NodeJSON = WorkflowJSON['nodes'][number];

export interface CompileWarning {
	code: 'unknown_parameter' | 'dead_letter_stub' | 'unresolved_workflow_ref' | 'limitation';
	message: string;
	stepId?: string;
	nodeName?: string;
}

export interface GeneratorMetadata {
	compilerVersion: string;
	patternRegistryVersion: string;
	nodeRegistryVersion: string;
	schemaVersion: string;
	patternIds: string[];
}

export interface CompiledWorkflow {
	workflow: WorkflowJSON;
	/** IR step id → emitted node name. */
	stepNodeNames: Record<string, string>;
	/** Emitted node name → IR step id (control helpers such as merge nodes have none). */
	nodeStepIds: Record<string, string>;
	generator: GeneratorMetadata;
	warnings: CompileWarning[];
}

export interface CompileOptions {
	/** Bundle-local workflow ref → saved n8n workflow id. */
	workflowRefs?: ReadonlyMap<string, string>;
}

export class CompileError extends Error {
	constructor(
		message: string,
		readonly stepId?: string,
	) {
		super(message);
		this.name = 'CompileError';
	}
}

interface Outlet {
	node: string;
	outputIndex: number;
}

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 180;

interface Emitter extends Pick<CompiledWorkflow, 'stepNodeNames' | 'nodeStepIds' | 'warnings'> {
	registry: NodeRegistry;
	options: CompileOptions;
	nodes: NodeJSON[];
	connections: IConnections;
	usedNames: Set<string>;
	workflowId: string;
	nextRow: number;
}

/** Where a step compiles: the emitter, the outlets that feed it and its column. */
interface Site {
	emitter: Emitter;
	incoming: Outlet[];
	column: number;
	ir: WorkflowIR;
}

/**
 * Deterministic IR → n8n JSON compiler. The same IR with the same registry
 * versions always yields the same nodes, names, ids, parameters and wiring.
 */
export function compileWorkflow(
	ir: WorkflowIR,
	registry: NodeRegistry,
	options: CompileOptions = {},
): CompiledWorkflow {
	const emitter: Emitter = {
		registry,
		options,
		nodes: [],
		connections: {},
		stepNodeNames: {},
		nodeStepIds: {},
		usedNames: new Set(),
		warnings: [],
		workflowId: ir.id,
		nextRow: 0,
	};
	const incoming = ir.triggers.map((trigger, index) => {
		emitter.nextRow = index;
		return outlet(emitTrigger(emitter, trigger));
	});
	compileSequence({ emitter, incoming, column: 1, ir }, ir.steps);
	// Positions were assigned during emission; normalize so the canvas starts at the origin.
	const minY = Math.min(0, ...emitter.nodes.map((node) => node.position[1]));
	for (const node of emitter.nodes) node.position = [node.position[0], node.position[1] - minY];
	return {
		workflow: {
			name: ir.name,
			nodes: emitter.nodes,
			connections: emitter.connections,
			settings: {
				executionOrder: ir.settings.executionOrder,
				...(ir.settings.timezone ? { timezone: ir.settings.timezone } : {}),
			},
		},
		stepNodeNames: emitter.stepNodeNames,
		nodeStepIds: emitter.nodeStepIds,
		generator: {
			compilerVersion: COMPILER_VERSION,
			patternRegistryVersion: PATTERN_REGISTRY_VERSION,
			nodeRegistryVersion: NODE_REGISTRY_VERSION,
			schemaVersion: WORKFLOW_SCHEMA_VERSION,
			patternIds: ir.patternIds,
		},
		warnings: emitter.warnings,
	};
}

// ── node emission ────────────────────────────────────────────────────────────

function uniqueName(emitter: Emitter, base: string): string {
	let name = base;
	for (let suffix = 2; emitter.usedNames.has(name); suffix += 1) name = `${base} ${suffix}`;
	emitter.usedNames.add(name);
	return name;
}

function slug(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'node'
	);
}

type NodeInput = Omit<NodeJSON, 'id' | 'position' | 'name'> & { name: string };

/** Emits one node at `column` and returns its unique name. A `stepId` registers the node to that step. */
function emitNode(
	emitter: Emitter,
	key: string,
	column: number,
	stepId: string | undefined,
	node: NodeInput,
): string {
	const { name: base, type, typeVersion, ...rest } = node;
	const name = uniqueName(emitter, base);
	const position: [number, number] = [column * COLUMN_WIDTH, emitter.nextRow * ROW_HEIGHT];
	// Ids stay stable across recompiles; they only need to be unique inside the artifact.
	const id = `${slug(emitter.workflowId)}-${slug(key)}`;
	emitter.nodes.push({ id, name, type, typeVersion, position, ...rest });
	if (stepId) {
		emitter.stepNodeNames[stepId] = name;
		emitter.nodeStepIds[name] = stepId;
	}
	return name;
}

const outlet = (node: string, outputIndex = 0): Outlet => ({ node, outputIndex });

function connect(emitter: Emitter, from: Outlet, toNode: string, inputIndex = 0): void {
	const main = ((emitter.connections[from.node] ??= {}).main ??= []);
	while (main.length <= from.outputIndex) main.push([]);
	const slot = (main[from.outputIndex] ??= []);
	if (!slot.some((existing) => existing.node === toNode && existing.index === inputIndex))
		slot.push({ node: toNode, type: 'main', index: inputIndex });
}

function connectAll(emitter: Emitter, from: readonly Outlet[], toNode: string, index = 0): void {
	for (const source of from) connect(emitter, source, toNode, index);
}

function resolver(emitter: Emitter): StepNameResolver {
	return (stepId) => emitter.stepNodeNames[stepId];
}

// ── parameter binding ────────────────────────────────────────────────────────

function setPath(target: IDataObject, path: string, value: unknown): void {
	const segments = path.split('.');
	let cursor: IDataObject = target;
	for (const segment of segments.slice(0, -1)) {
		const next = cursor[segment];
		if (typeof next === 'object' && next !== null && !Array.isArray(next))
			cursor = next as IDataObject;
		else cursor = cursor[segment] = {};
	}
	cursor[segments[segments.length - 1]] = value as IDataObject[string];
}

/** Applies the operation's discriminators and binds semantic params to node parameter paths. */
export function bindParameters(
	operation: NodeOperation,
	params: Record<string, unknown>,
	emitter: Pick<Emitter, 'warnings'>,
	stepId: string,
): IDataObject {
	const parameters = deepCopy(operation.baseParameters) as IDataObject;
	const definitions = [...operation.requiredParameters, ...operation.optionalParameters];
	for (const [name, value] of Object.entries(shapeParameters(operation, params))) {
		if (value === undefined) continue;
		const definition = definitions.find((candidate) => candidate.name === name);
		if (!definition) {
			emitter.warnings.push({
				code: 'unknown_parameter',
				message: `Parameter "${name}" is not declared for ${operation.id}; it was set as a raw node parameter.`,
				stepId,
			});
			setPath(parameters, name, value);
			continue;
		}
		const locator = { __rl: true, mode: definition.locatorMode ?? 'id', value };
		setPath(parameters, definition.path, definition.type === 'resource_locator' ? locator : value);
	}
	return parameters;
}

/** Operation-specific reshaping from semantic values to node parameter values. */
function shapeParameters(
	operation: NodeOperation,
	params: Record<string, unknown>,
): Record<string, unknown> {
	switch (operation.id) {
		case CORE_OPERATION_IDS.SCHEDULE_TRIGGER: {
			const { cron, ...rest } = params;
			if (typeof cron !== 'string') return params;
			return { ...rest, cron: { interval: [{ field: 'cronExpression', expression: cron }] } };
		}
		case 'postgres.row.insert':
		case 'postgres.row.upsert':
			return { columns: { mappingMode: 'autoMapInputData', value: {} }, ...params };
		case CORE_OPERATION_IDS.EXECUTE_WORKFLOW: {
			const { inputs, ...rest } = params;
			if (inputs === undefined) return rest;
			return { ...rest, inputs: { mappingMode: 'defineBelow', value: inputs } };
		}
		case CORE_OPERATION_IDS.HTTP_REQUEST: {
			const { body, ...rest } = params;
			if (body === undefined) return rest;
			return { ...rest, body, sendBody: true, specifyBody: 'json' };
		}
		default:
			return params;
	}
}

function credentialsFor({ credential }: { credential?: CredentialRef }): NodeJSON['credentials'] {
	if (!credential?.credentialId) return undefined;
	const { credentialType, credentialId: id, name = '' } = credential;
	return { [credentialType]: { id, name } };
}

function errorSettings(policy: ErrorPolicy | undefined, retry: RetryPolicy | undefined) {
	const settings: Partial<NodeJSON> = {};
	if (policy === 'retry' || policy === 'retry_exponential' || retry) {
		const attempts = retry?.maxAttempts ?? 3;
		const wait = retry?.waitMs ?? 1000;
		settings.retryOnFail = true;
		settings.maxTries = attempts;
		// n8n retries with a fixed wait; exponential intent is recorded as the last-attempt wait.
		settings.waitBetweenTries =
			policy === 'retry_exponential' || retry?.backoff === 'exponential'
				? wait * 2 ** Math.max(0, attempts - 2)
				: wait;
	}
	if (policy === 'continue_marked') settings.onError = 'continueRegularOutput';
	if (policy === 'continue_error_output' || policy === 'dead_letter')
		settings.onError = 'continueErrorOutput';
	return settings;
}

// ── step compilation ─────────────────────────────────────────────────────────

interface OperationSpec {
	operation: string;
	/** Node name; defaults to the operation label. */
	name?: string;
	params: Record<string, unknown>;
	extra?: Partial<NodeJSON>;
	credentials?: NodeJSON['credentials'];
}

/** Emits a registry operation node. A `helperKey` marks a helper node not registered to the step. */
function emitOperation(
	emitter: Emitter,
	step: { id: string; notes?: string },
	spec: OperationSpec,
	column: number,
	helperKey?: string,
): string {
	const operation = emitter.registry.require(spec.operation);
	const parameters = bindParameters(operation, spec.params, emitter, step.id);
	return emitNode(emitter, helperKey ?? step.id, column, helperKey ? undefined : step.id, {
		name: spec.name ?? operation.label ?? operation.title,
		type: operation.nodeType,
		typeVersion: operation.version,
		parameters: compileParameterTree(parameters, resolver(emitter)) as IDataObject,
		...(spec.credentials ? { credentials: spec.credentials } : {}),
		...(step.notes ? { notes: step.notes } : {}),
		...spec.extra,
	});
}

/** Emits a control node (If, Switch, Merge, Loop) for a step, without notes. */
function emitControl(
	emitter: Emitter,
	step: { id: string; label?: string },
	name: string,
	operationId: string,
	parameters: IDataObject,
	column: number,
): string {
	const { nodeType: type, version: typeVersion } = emitter.registry.require(operationId);
	return emitNode(emitter, step.id, column, step.id, {
		name: step.label ?? name,
		type,
		typeVersion,
		parameters,
	});
}

function emitTrigger(emitter: Emitter, trigger: TriggerIR): string {
	const { label: name, params } = trigger;
	const spec = { operation: trigger.operation.operationId, name, params };
	return emitOperation(emitter, trigger, { ...spec, credentials: credentialsFor(trigger) }, 0);
}

interface StepResult {
	outlets: Outlet[];
	nextColumn: number;
}

function compileSequence(site: Site, steps: readonly StepIR[]): Outlet[] {
	let current = site;
	for (const step of steps) {
		const { outlets: incoming, nextColumn: column } = compileStep(current, step);
		current = { ...current, incoming, column };
	}
	return current.incoming;
}

type Group = [steps: readonly StepIR[], incoming: Outlet[]];

/** Compiles sibling sequences on consecutive rows, then restores the row. */
function compileGroups(
	site: Site,
	groups: readonly Group[],
): { outlets: Outlet[][]; width: number } {
	const outlets: Outlet[][] = [];
	let width = 0;
	groups.forEach(([steps, incoming], index) => {
		if (index > 0) site.emitter.nextRow += 1;
		outlets.push(compileSequence({ ...site, incoming }, steps));
		width = Math.max(width, depth(steps));
	});
	site.emitter.nextRow -= groups.length - 1;
	return { outlets, width };
}

function compileStep(site: Site, step: StepIR): StepResult {
	if (step.kind === 'trigger') {
		throw new CompileError(
			`Trigger "${step.id}" must be listed under triggers, not steps.`,
			step.id,
		);
	}
	if (step.kind === 'action') return compileAction(site, step);
	if (step.kind === 'validate') return compileValidate(site, step);
	if (step.kind === 'branch') return compileBranch(site, step);
	if (step.kind === 'switch') return compileSwitch(site, step);
	if (step.kind === 'parallel') return compileParallel(site, step);
	if (step.kind === 'map') return compileMap(site, step);
	return single(site, step, simpleSpec(site.emitter, step));
}

type StepOf<K extends StepIR['kind']> = Extract<StepIR, { kind: K }>;

function simpleSpec(
	emitter: Emitter,
	step: StepOf<'transform' | 'code' | 'respond' | 'call_workflow' | 'noop'>,
): OperationSpec {
	switch (step.kind) {
		case 'transform': {
			const assignments = Object.entries(step.fields).map(([name, value], index) => ({
				id: `assignment-${index + 1}`,
				name,
				value,
				type: inferAssignmentType(value),
			}));
			return {
				operation: CORE_OPERATION_IDS.SET,
				name: step.label ?? 'Edit Fields',
				params: { assignments: { assignments }, includeOtherFields: step.includeInput },
			};
		}
		case 'code':
			return {
				operation: CORE_OPERATION_IDS.CODE,
				name: step.label ?? 'Code',
				params: {
					source: step.source,
					mode: step.mode === 'each_item' ? 'runOnceForEachItem' : 'runOnceForAllItems',
					...(step.language === 'python' ? { language: 'python' } : {}),
				},
			};
		case 'respond':
			return {
				operation: CORE_OPERATION_IDS.RESPOND,
				name: step.label ?? 'Respond to Webhook',
				params: { body: objectExpression(step.body, resolver(emitter)), status: step.status },
			};
		case 'call_workflow': {
			const workflowId =
				step.workflowId ??
				(step.workflowRef ? emitter.options.workflowRefs?.get(step.workflowRef) : undefined);
			if (!workflowId) {
				emitter.warnings.push({
					code: 'unresolved_workflow_ref',
					message: `Step "${step.id}" calls workflow "${step.workflowRef ?? '?'}" which has no saved id yet.`,
					stepId: step.id,
				});
			}
			return {
				operation: CORE_OPERATION_IDS.EXECUTE_WORKFLOW,
				name: step.label ?? 'Execute Workflow',
				params: {
					workflowId: workflowId ?? `<<workflow:${step.workflowRef ?? 'unknown'}>>`,
					...(Object.keys(step.inputs).length > 0 ? { inputs: step.inputs } : {}),
					...(step.wait ? {} : { 'options.waitForSubWorkflow': false }),
				},
			};
		}
		case 'noop':
			return { operation: CORE_OPERATION_IDS.NOOP, name: step.label ?? 'No Operation', params: {} };
	}
}

function inferAssignmentType(value: unknown): string {
	if (isExpressionParam(value)) return 'string';
	if (typeof value === 'number' || typeof value === 'boolean') return typeof value;
	if (Array.isArray(value)) return 'array';
	return typeof value === 'object' && value !== null ? 'object' : 'string';
}

function single(site: Site, step: { id: string; notes?: string }, spec: OperationSpec): StepResult {
	const { emitter, column } = site;
	const node = emitOperation(emitter, step, spec, column);
	connectAll(emitter, site.incoming, node);
	for (const limitation of emitter.registry.require(spec.operation).limitations ?? []) {
		const message = `${node}: ${limitation}`;
		emitter.warnings.push({ code: 'limitation', message, stepId: step.id, nodeName: node });
	}
	return { outlets: [outlet(node)], nextColumn: column + 1 };
}

function compileAction(site: Site, step: StepOf<'action'>): StepResult {
	const { emitter } = site;
	const result = single(site, step, {
		operation: step.operation.operationId,
		name: step.label,
		params: step.params,
		credentials: credentialsFor(step),
		extra: errorSettings(step.onError, step.retry),
	});
	if (step.onError === 'dead_letter') {
		const source = result.outlets[0].node;
		const deadLetter = emitNode(emitter, `${step.id}:dead-letter`, result.nextColumn, undefined, {
			name: `Dead Letter: ${source}`,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			parameters: {},
			notes: 'Failed items land here. Connect a dead-letter workflow or notification.',
			notesInFlow: true,
		});
		connect(emitter, outlet(source, 1), deadLetter);
		emitter.warnings.push({
			code: 'dead_letter_stub',
			message: `${source}: failed items route to "${deadLetter}"; wire a handler there.`,
			stepId: step.id,
			nodeName: deadLetter,
		});
	}
	return result;
}

function compileValidate(site: Site, step: StepOf<'validate'>): StepResult {
	const { emitter, column } = site;
	const triggerStepId = site.ir.triggers[0]?.id;
	const rows = step.rules.map(({ field: path, rule }, index) => {
		const left: Expression = triggerStepId
			? { type: 'field', stepId: triggerStepId, path }
			: { type: 'input', path };
		const condition: Condition =
			rule === 'email'
				? { op: 'contains', left, right: { type: 'literal', value: '@' } }
				: { op: 'exists', left };
		return conditionRow(`rule-${index + 1}`, condition, resolver(emitter));
	});
	const parameters = { conditions: filterParameter(rows, 'and'), options: {} };
	const node = emitControl(emitter, step, 'Validate', CORE_OPERATION_IDS.IF, parameters, column);
	connectAll(emitter, site.incoming, node);
	if (step.onInvalid === 'respond_400') {
		const spec: OperationSpec = {
			operation: CORE_OPERATION_IDS.RESPOND,
			name: 'Respond 400',
			params: { body: JSON.stringify({ error: 'Invalid request' }), status: 400 },
		};
		emitter.nextRow += 1;
		const errorNode = emitOperation(
			emitter,
			{ id: step.id },
			spec,
			column + 1,
			`${step.id}:invalid`,
		);
		connect(emitter, outlet(node, 1), errorNode);
		emitter.nextRow -= 1;
	}
	return { outlets: [outlet(node)], nextColumn: column + 1 };
}

function compileBranch(site: Site, step: StepOf<'branch'>): StepResult {
	const { emitter, column } = site;
	const conditions = compileCondition(step.condition, resolver(emitter));
	const node = emitControl(
		emitter,
		step,
		'If',
		CORE_OPERATION_IDS.IF,
		{ conditions, options: {} },
		column,
	);
	connectAll(emitter, site.incoming, node);
	const groups: Group[] = [
		[step.then, [outlet(node, 0)]],
		[step.else, [outlet(node, 1)]],
	];
	const { outlets, width } = compileGroups({ ...site, column: column + 1 }, groups);
	return { outlets: outlets.flat(), nextColumn: column + 1 + width };
}

function compileSwitch(site: Site, step: StepOf<'switch'>): StepResult {
	const { emitter, column } = site;
	const resolve = resolver(emitter);
	const values = step.cases.map((c, index) => {
		const right: Expression = { type: 'literal', value: c.value };
		const row = conditionRow(`case-${index + 1}`, { op: 'equals', left: step.on, right }, resolve);
		return { conditions: filterParameter([row], 'and'), renameOutput: true, outputKey: c.value };
	});
	const options = step.fallback ? { fallbackOutput: 'extra' } : {};
	const parameters = { rules: { values }, options };
	const node = emitControl(emitter, step, 'Switch', CORE_OPERATION_IDS.SWITCH, parameters, column);
	connectAll(emitter, site.incoming, node);
	const groups = step.cases.map((c, index): Group => [c.steps, [outlet(node, index)]]);
	if (step.fallback) groups.push([step.fallback, [outlet(node, step.cases.length)]]);
	const { outlets, width } = compileGroups({ ...site, column: column + 1 }, groups);
	return { outlets: outlets.flat(), nextColumn: column + 1 + width };
}

function compileParallel(site: Site, step: StepOf<'parallel'>): StepResult {
	const { emitter, column } = site;
	const groups = step.branches.map((branch): Group => [branch, site.incoming]);
	const { outlets, width } = compileGroups(site, groups);
	if (step.join === 'none') return { outlets: outlets.flat(), nextColumn: column + width };
	const parameters = { mode: 'append', numberInputs: step.branches.length };
	const { MERGE } = CORE_OPERATION_IDS;
	const merge = emitControl(emitter, step, 'Merge', MERGE, parameters, column + width);
	outlets.forEach((group, index) => connectAll(emitter, group, merge, index));
	return { outlets: [outlet(merge)], nextColumn: column + width + 1 };
}

function compileMap(site: Site, step: StepOf<'map'>): StepResult {
	const { emitter, column } = site;
	const loop = emitter.registry.require(CORE_OPERATION_IDS.LOOP);
	const parameters = bindParameters(loop, { batchSize: step.batchSize }, emitter, step.id);
	const node = emitControl(emitter, step, 'Loop Over Items', loop.id, parameters, column);
	connectAll(emitter, site.incoming, node);
	emitter.nextRow += 1;
	const body = compileSequence(
		{ ...site, incoming: [outlet(node, 1)], column: column + 1 },
		step.steps,
	);
	emitter.nextRow -= 1;
	connectAll(emitter, body, node);
	return { outlets: [outlet(node)], nextColumn: column + 1 + depth(step.steps) };
}

/** Number of columns a sequence occupies. */
function depth(steps: readonly StepIR[]): number {
	let total = 0;
	for (const step of steps) {
		if (step.kind === 'branch') total += 1 + Math.max(depth(step.then), depth(step.else));
		else if (step.kind === 'switch') {
			const fallback = step.fallback ? depth(step.fallback) : 0;
			total += 1 + Math.max(...step.cases.map((c) => depth(c.steps)), fallback);
		} else if (step.kind === 'parallel')
			total += Math.max(...step.branches.map(depth)) + (step.join === 'all' ? 1 : 0);
		else if (step.kind === 'map') total += 1 + depth(step.steps);
		else total += 1;
	}
	return total;
}

// ── conditions ───────────────────────────────────────────────────────────────

interface ConditionRow {
	id: string;
	leftValue: unknown;
	rightValue: unknown;
	operator: { type: string; operation: string; singleValue?: boolean };
}

function filterParameter(rows: ConditionRow[], combinator: 'and' | 'or'): IDataObject {
	const options = { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 };
	return { options, conditions: rows, combinator };
}

/** Filter operator per comparison op: [type, operation, singleValue]. No type: follow the right operand. */
const OPERATORS: Record<ComparisonOp, readonly [string | undefined, string, boolean?]> = {
	exists: ['string', 'notEmpty', true],
	not_exists: ['string', 'empty', true],
	equals: [undefined, 'equals'],
	not_equals: [undefined, 'notEquals'],
	contains: ['string', 'contains'],
	is_true: ['boolean', 'true', true],
	is_false: ['boolean', 'false', true],
	gt: ['number', 'gt'],
	lt: ['number', 'lt'],
	gte: ['number', 'gte'],
	lte: ['number', 'lte'],
};

function conditionRow(id: string, condition: Condition, resolve: StepNameResolver): ConditionRow {
	if (isCompoundCondition(condition)) {
		throw new CompileError('Nested boolean conditions are not supported inside a single rule.');
	}
	const leftValue = compileExpression(condition.left, resolve);
	const right = condition.right ? compileExpression(condition.right, resolve) : undefined;
	const [type = typeOf(condition.right), operation, singleValue] = OPERATORS[condition.op];
	return {
		id,
		leftValue,
		rightValue: singleValue ? '' : (right ?? ''),
		operator: singleValue ? { type, operation, singleValue: true } : { type, operation },
	};
}

function typeOf(expression: Expression | undefined): string {
	const value = expression?.type === 'literal' ? expression.value : undefined;
	return typeof value === 'number' || typeof value === 'boolean' ? typeof value : 'string';
}

function compileCondition(condition: Condition, resolve: StepNameResolver): IDataObject {
	const [rows, combinator] = isCompoundCondition(condition)
		? [condition.conditions, condition.op]
		: [[condition], 'and' as const];
	const compiled = rows.map((row, index) => conditionRow(`condition-${index + 1}`, row, resolve));
	return filterParameter(compiled, combinator);
}

// ── response bodies ──────────────────────────────────────────────────────────

/** Compiles `{ key: value | {$expr} }` into one JSON-object expression. */
export function objectExpression(body: Record<string, unknown>, resolve: StepNameResolver): string {
	const entries = Object.entries(body).map(([key, value]) => {
		const compiled = isExpressionParam(value)
			? compileExpressionBody(value.$expr, resolve)
			: JSON.stringify(value ?? null);
		return `${JSON.stringify(key)}: ${compiled}`;
	});
	return `={{ ({ ${entries.join(', ')} }) }}`;
}
