import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { deepCopy, type IConnection, type IConnections, type IDataObject } from 'n8n-workflow';

import type { NodeRegistry } from '../catalog/node-registry';
import { CORE_OPERATION_IDS } from '../catalog/operations';
import type { NodeOperation, ParameterDefinition } from '../catalog/types';
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
	type Condition,
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

interface Emitter {
	registry: NodeRegistry;
	options: CompileOptions;
	nodes: NodeJSON[];
	connections: IConnections;
	stepNodeNames: Record<string, string>;
	nodeStepIds: Record<string, string>;
	usedNames: Set<string>;
	warnings: CompileWarning[];
	workflowId: string;
	nextRow: number;
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

	const triggerOutlets: Outlet[] = [];
	ir.triggers.forEach((trigger, index) => {
		const node = emitTrigger(emitter, trigger, index);
		triggerOutlets.push({ node: node.name ?? '', outputIndex: 0 });
	});

	const trailing = compileSequence(emitter, ir.steps, triggerOutlets, 1, ir);
	void trailing;

	layout(emitter);

	const workflow: WorkflowJSON = {
		name: ir.name,
		nodes: emitter.nodes,
		connections: emitter.connections,
		settings: {
			executionOrder: ir.settings.executionOrder,
			...(ir.settings.timezone ? { timezone: ir.settings.timezone } : {}),
		},
	};

	return {
		workflow,
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
	let suffix = 1;
	while (emitter.usedNames.has(name)) {
		suffix += 1;
		name = `${base} ${suffix}`;
	}
	emitter.usedNames.add(name);
	return name;
}

function nodeId(emitter: Emitter, key: string): string {
	// Deterministic, stable across recompiles of the same IR. Persistence keeps
	// saved ids by name, so this only needs to be unique inside the artifact.
	return `${slug(emitter.workflowId)}-${slug(key)}`;
}

function slug(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'node'
	);
}

interface EmitNodeInput {
	key: string;
	name: string;
	type: string;
	typeVersion: number;
	parameters: IDataObject;
	stepId?: string;
	column: number;
	credentials?: NodeJSON['credentials'];
	extra?: Partial<NodeJSON>;
}

function emitNode(emitter: Emitter, input: EmitNodeInput): NodeJSON {
	const name = uniqueName(emitter, input.name);
	const node: NodeJSON = {
		id: nodeId(emitter, input.key),
		name,
		type: input.type,
		typeVersion: input.typeVersion,
		position: [input.column * COLUMN_WIDTH, emitter.nextRow * ROW_HEIGHT],
		parameters: input.parameters,
		...(input.credentials ? { credentials: input.credentials } : {}),
		...input.extra,
	};
	emitter.nodes.push(node);
	if (input.stepId) {
		emitter.stepNodeNames[input.stepId] = name;
		emitter.nodeStepIds[name] = input.stepId;
	}
	return node;
}

function connect(emitter: Emitter, from: Outlet, toNode: string, inputIndex = 0): void {
	const source = (emitter.connections[from.node] ??= {});
	const main = (source.main ??= []);
	while (main.length <= from.outputIndex) main.push([]);
	const slot = (main[from.outputIndex] ??= []);
	const connection: IConnection = { node: toNode, type: 'main', index: inputIndex };
	if (!slot.some((existing) => existing.node === toNode && existing.index === inputIndex))
		slot.push(connection);
}

function connectAll(
	emitter: Emitter,
	from: readonly Outlet[],
	toNode: string,
	inputIndex = 0,
): void {
	for (const outlet of from) connect(emitter, outlet, toNode, inputIndex);
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
		if (typeof next === 'object' && next !== null && !Array.isArray(next)) {
			cursor = next as IDataObject;
		} else {
			const created: IDataObject = {};
			cursor[segment] = created;
			cursor = created;
		}
	}
	cursor[segments[segments.length - 1]] = value as IDataObject[string];
}

function locator(mode: ParameterDefinition['locatorMode'], value: unknown): unknown {
	if (isExpressionParam(value)) return { __rl: true, mode: mode ?? 'id', value };
	return { __rl: true, mode: mode ?? 'id', value };
}

function clone<T extends object>(value: T): T {
	return deepCopy(value);
}

/** Applies the operation's discriminators and binds semantic params to node parameter paths. */
export function bindParameters(
	operation: NodeOperation,
	params: Record<string, unknown>,
	emitter: Pick<Emitter, 'warnings'>,
	stepId: string,
): IDataObject {
	const parameters: IDataObject = clone(operation.baseParameters) as IDataObject;
	const definitions = [...operation.requiredParameters, ...operation.optionalParameters];
	const shaped = shapeParameters(operation, params);
	for (const [name, value] of Object.entries(shaped)) {
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
		setPath(
			parameters,
			definition.path,
			definition.type === 'resource_locator' ? locator(definition.locatorMode, value) : value,
		);
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

function credentialsFor(step: {
	credential?: { credentialType: string; credentialId?: string; name?: string };
}): NodeJSON['credentials'] | undefined {
	if (!step.credential?.credentialId) return undefined;
	return {
		[step.credential.credentialType]: {
			id: step.credential.credentialId,
			name: step.credential.name ?? '',
		},
	};
}

function errorSettings(
	policy: ErrorPolicy | undefined,
	retry: RetryPolicy | undefined,
): Partial<NodeJSON> {
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

function emitTrigger(emitter: Emitter, trigger: TriggerIR, index: number): NodeJSON {
	const operation = emitter.registry.require(trigger.operation.operationId);
	const parameters = bindParameters(operation, trigger.params, emitter, trigger.id);
	const compiledParameters = compileParameterTree(parameters, resolver(emitter)) as IDataObject;
	emitter.nextRow = index;
	return emitNode(emitter, {
		key: trigger.id,
		name: trigger.label ?? operation.label ?? operation.title,
		type: operation.nodeType,
		typeVersion: operation.version,
		parameters: compiledParameters,
		stepId: trigger.id,
		column: 0,
		credentials: credentialsFor(trigger),
		...(trigger.notes ? { extra: { notes: trigger.notes } } : {}),
	});
}

function compileSequence(
	emitter: Emitter,
	steps: readonly StepIR[],
	incoming: Outlet[],
	column: number,
	ir: WorkflowIR,
): Outlet[] {
	let current = incoming;
	let currentColumn = column;
	for (const step of steps) {
		const result = compileStep(emitter, step, current, currentColumn, ir);
		current = result.outlets;
		currentColumn = result.nextColumn;
	}
	return current;
}

interface StepResult {
	outlets: Outlet[];
	nextColumn: number;
}

function compileStep(
	emitter: Emitter,
	step: StepIR,
	incoming: Outlet[],
	column: number,
	ir: WorkflowIR,
): StepResult {
	switch (step.kind) {
		case 'trigger':
			throw new CompileError(
				`Trigger "${step.id}" must be listed under triggers, not steps.`,
				step.id,
			);
		case 'action':
			return compileAction(emitter, step, incoming, column);
		case 'transform':
			return single(emitter, step, incoming, column, {
				operation: CORE_OPERATION_IDS.SET,
				name: step.label ?? 'Edit Fields',
				params: {
					assignments: {
						assignments: Object.entries(step.fields).map(([name, value], index) => ({
							id: `assignment-${index + 1}`,
							name,
							value,
							type: inferAssignmentType(value),
						})),
					},
					includeOtherFields: step.includeInput,
				},
			});
		case 'code':
			return single(emitter, step, incoming, column, {
				operation: CORE_OPERATION_IDS.CODE,
				name: step.label ?? 'Code',
				params: {
					source: step.source,
					mode: step.mode === 'each_item' ? 'runOnceForEachItem' : 'runOnceForAllItems',
					...(step.language === 'python' ? { language: 'python' } : {}),
				},
			});
		case 'respond':
			return single(emitter, step, incoming, column, {
				operation: CORE_OPERATION_IDS.RESPOND,
				name: step.label ?? 'Respond to Webhook',
				params: { body: objectExpression(step.body, resolver(emitter)), status: step.status },
			});
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
			return single(emitter, step, incoming, column, {
				operation: CORE_OPERATION_IDS.EXECUTE_WORKFLOW,
				name: step.label ?? 'Execute Workflow',
				params: {
					workflowId: workflowId ?? `<<workflow:${step.workflowRef ?? 'unknown'}>>`,
					...(Object.keys(step.inputs).length > 0 ? { inputs: step.inputs } : {}),
					...(step.wait ? {} : { 'options.waitForSubWorkflow': false }),
				},
			});
		}
		case 'noop':
			return single(emitter, step, incoming, column, {
				operation: CORE_OPERATION_IDS.NOOP,
				name: step.label ?? 'No Operation',
				params: {},
			});
		case 'validate':
			return compileValidate(emitter, step, incoming, column, ir);
		case 'branch':
			return compileBranch(emitter, step, incoming, column, ir);
		case 'switch':
			return compileSwitch(emitter, step, incoming, column, ir);
		case 'parallel':
			return compileParallel(emitter, step, incoming, column, ir);
		case 'map':
			return compileMap(emitter, step, incoming, column, ir);
	}
}

function inferAssignmentType(value: unknown): string {
	if (isExpressionParam(value)) return 'string';
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object' && value !== null) return 'object';
	return 'string';
}

function single(
	emitter: Emitter,
	step: { id: string; notes?: string },
	incoming: Outlet[],
	column: number,
	spec: {
		operation: string;
		name: string;
		params: Record<string, unknown>;
		extra?: Partial<NodeJSON>;
		credentials?: NodeJSON['credentials'];
	},
): StepResult {
	const operation = emitter.registry.require(spec.operation);
	const parameters = bindParameters(operation, spec.params, emitter, step.id);
	const node = emitNode(emitter, {
		key: step.id,
		name: spec.name,
		type: operation.nodeType,
		typeVersion: operation.version,
		parameters: compileParameterTree(parameters, resolver(emitter)) as IDataObject,
		stepId: step.id,
		column,
		credentials: spec.credentials,
		extra: { ...(step.notes ? { notes: step.notes } : {}), ...spec.extra },
	});
	connectAll(emitter, incoming, node.name ?? '');
	for (const limitation of operation.limitations ?? []) {
		emitter.warnings.push({
			code: 'limitation',
			message: `${node.name}: ${limitation}`,
			stepId: step.id,
			nodeName: node.name,
		});
	}
	return { outlets: [{ node: node.name ?? '', outputIndex: 0 }], nextColumn: column + 1 };
}

function compileAction(
	emitter: Emitter,
	step: Extract<StepIR, { kind: 'action' }>,
	incoming: Outlet[],
	column: number,
): StepResult {
	const operation = emitter.registry.require(step.operation.operationId);
	const result = single(emitter, step, incoming, column, {
		operation: operation.id,
		name: step.label ?? operation.label ?? operation.title,
		params: step.params,
		credentials: credentialsFor(step),
		extra: errorSettings(step.onError, step.retry),
	});
	if (step.onError === 'dead_letter') {
		const sourceName = result.outlets[0].node;
		const deadLetter = emitNode(emitter, {
			key: `${step.id}:dead-letter`,
			name: `Dead Letter: ${sourceName}`,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			parameters: {},
			column: result.nextColumn,
			extra: {
				notes: 'Failed items land here. Connect a dead-letter workflow or notification.',
				notesInFlow: true,
			},
		});
		connect(emitter, { node: sourceName, outputIndex: 1 }, deadLetter.name ?? '');
		emitter.warnings.push({
			code: 'dead_letter_stub',
			message: `${sourceName}: failed items route to "${deadLetter.name}"; wire a handler there.`,
			stepId: step.id,
			nodeName: deadLetter.name,
		});
	}
	return result;
}

function compileValidate(
	emitter: Emitter,
	step: Extract<StepIR, { kind: 'validate' }>,
	incoming: Outlet[],
	column: number,
	ir: WorkflowIR,
): StepResult {
	const triggerStepId = ir.triggers[0]?.id;
	const conditions = step.rules.map((rule, index) => {
		const left: Expression = triggerStepId
			? { type: 'field', stepId: triggerStepId, path: rule.field }
			: { type: 'input', path: rule.field };
		return conditionRow(`rule-${index + 1}`, ruleCondition(rule.rule, left), resolver(emitter));
	});
	const ifOperation = emitter.registry.require(CORE_OPERATION_IDS.IF);
	const node = emitNode(emitter, {
		key: step.id,
		name: step.label ?? 'Validate',
		type: ifOperation.nodeType,
		typeVersion: ifOperation.version,
		parameters: { conditions: filterParameter(conditions, 'and'), options: {} },
		stepId: step.id,
		column,
	});
	connectAll(emitter, incoming, node.name ?? '');
	const valid: Outlet = { node: node.name ?? '', outputIndex: 0 };
	if (step.onInvalid === 'respond_400') {
		const respond = emitter.registry.require(CORE_OPERATION_IDS.RESPOND);
		emitter.nextRow += 1;
		const errorNode = emitNode(emitter, {
			key: `${step.id}:invalid`,
			name: 'Respond 400',
			type: respond.nodeType,
			typeVersion: respond.version,
			parameters: bindParameters(
				respond,
				{ body: JSON.stringify({ error: 'Invalid request' }), status: 400 },
				emitter,
				step.id,
			),
			column: column + 1,
		});
		connect(emitter, { node: node.name ?? '', outputIndex: 1 }, errorNode.name ?? '');
		emitter.nextRow -= 1;
	}
	return { outlets: [valid], nextColumn: column + 1 };
}

function ruleCondition(
	rule: Extract<StepIR, { kind: 'validate' }>['rules'][number]['rule'],
	left: Expression,
): Condition {
	switch (rule) {
		case 'required':
			return { op: 'exists', left };
		case 'email':
			return { op: 'contains', left, right: { type: 'literal', value: '@' } };
		case 'string':
		case 'number':
		case 'boolean':
			return { op: 'exists', left };
	}
}

function compileBranch(
	emitter: Emitter,
	step: Extract<StepIR, { kind: 'branch' }>,
	incoming: Outlet[],
	column: number,
	ir: WorkflowIR,
): StepResult {
	const ifOperation = emitter.registry.require(CORE_OPERATION_IDS.IF);
	const node = emitNode(emitter, {
		key: step.id,
		name: step.label ?? 'If',
		type: ifOperation.nodeType,
		typeVersion: ifOperation.version,
		parameters: { conditions: compileCondition(step.condition, resolver(emitter)), options: {} },
		stepId: step.id,
		column,
	});
	connectAll(emitter, incoming, node.name ?? '');
	const trueOutlet: Outlet = { node: node.name ?? '', outputIndex: 0 };
	const falseOutlet: Outlet = { node: node.name ?? '', outputIndex: 1 };
	const thenOutlets = compileSequence(emitter, step.then, [trueOutlet], column + 1, ir);
	emitter.nextRow += 1;
	const elseOutlets = compileSequence(emitter, step.else, [falseOutlet], column + 1, ir);
	emitter.nextRow -= 1;
	const width = Math.max(depth(step.then), depth(step.else));
	return { outlets: [...thenOutlets, ...elseOutlets], nextColumn: column + 1 + width };
}

function compileSwitch(
	emitter: Emitter,
	step: Extract<StepIR, { kind: 'switch' }>,
	incoming: Outlet[],
	column: number,
	ir: WorkflowIR,
): StepResult {
	const switchOperation = emitter.registry.require(CORE_OPERATION_IDS.SWITCH);
	const resolve = resolver(emitter);
	const node = emitNode(emitter, {
		key: step.id,
		name: step.label ?? 'Switch',
		type: switchOperation.nodeType,
		typeVersion: switchOperation.version,
		parameters: {
			rules: {
				values: step.cases.map((c, index) => ({
					conditions: filterParameter(
						[
							conditionRow(
								`case-${index + 1}`,
								{ op: 'equals', left: step.on, right: { type: 'literal', value: c.value } },
								resolve,
							),
						],
						'and',
					),
					renameOutput: true,
					outputKey: c.value,
				})),
			},
			options: step.fallback ? { fallbackOutput: 'extra' } : {},
		},
		stepId: step.id,
		column,
	});
	connectAll(emitter, incoming, node.name ?? '');
	const outlets: Outlet[] = [];
	let width = 0;
	step.cases.forEach((c, index) => {
		if (index > 0) emitter.nextRow += 1;
		outlets.push(
			...compileSequence(
				emitter,
				c.steps,
				[{ node: node.name ?? '', outputIndex: index }],
				column + 1,
				ir,
			),
		);
		width = Math.max(width, depth(c.steps));
	});
	if (step.fallback) {
		emitter.nextRow += 1;
		outlets.push(
			...compileSequence(
				emitter,
				step.fallback,
				[{ node: node.name ?? '', outputIndex: step.cases.length }],
				column + 1,
				ir,
			),
		);
		width = Math.max(width, depth(step.fallback));
	}
	emitter.nextRow -= step.cases.length - 1 + (step.fallback ? 1 : 0);
	return { outlets, nextColumn: column + 1 + width };
}

function compileParallel(
	emitter: Emitter,
	step: Extract<StepIR, { kind: 'parallel' }>,
	incoming: Outlet[],
	column: number,
	ir: WorkflowIR,
): StepResult {
	const branchOutlets: Outlet[][] = [];
	let width = 0;
	step.branches.forEach((branch, index) => {
		if (index > 0) emitter.nextRow += 1;
		branchOutlets.push(compileSequence(emitter, branch, incoming, column, ir));
		width = Math.max(width, depth(branch));
	});
	emitter.nextRow -= step.branches.length - 1;
	if (step.join === 'none') return { outlets: branchOutlets.flat(), nextColumn: column + width };
	const mergeOperation = emitter.registry.require(CORE_OPERATION_IDS.MERGE);
	const merge = emitNode(emitter, {
		key: step.id,
		name: step.label ?? 'Merge',
		type: mergeOperation.nodeType,
		typeVersion: mergeOperation.version,
		parameters: { mode: 'append', numberInputs: step.branches.length },
		stepId: step.id,
		column: column + width,
	});
	branchOutlets.forEach((outlets, index) => connectAll(emitter, outlets, merge.name ?? '', index));
	return { outlets: [{ node: merge.name ?? '', outputIndex: 0 }], nextColumn: column + width + 1 };
}

function compileMap(
	emitter: Emitter,
	step: Extract<StepIR, { kind: 'map' }>,
	incoming: Outlet[],
	column: number,
	ir: WorkflowIR,
): StepResult {
	const loopOperation = emitter.registry.require(CORE_OPERATION_IDS.LOOP);
	const node = emitNode(emitter, {
		key: step.id,
		name: step.label ?? 'Loop Over Items',
		type: loopOperation.nodeType,
		typeVersion: loopOperation.version,
		parameters: bindParameters(loopOperation, { batchSize: step.batchSize }, emitter, step.id),
		stepId: step.id,
		column,
	});
	connectAll(emitter, incoming, node.name ?? '');
	emitter.nextRow += 1;
	const bodyOutlets = compileSequence(
		emitter,
		step.steps,
		[{ node: node.name ?? '', outputIndex: 1 }],
		column + 1,
		ir,
	);
	emitter.nextRow -= 1;
	connectAll(emitter, bodyOutlets, node.name ?? '');
	return {
		outlets: [{ node: node.name ?? '', outputIndex: 0 }],
		nextColumn: column + 1 + depth(step.steps),
	};
}

function depth(steps: readonly StepIR[]): number {
	let total = 0;
	for (const step of steps) {
		switch (step.kind) {
			case 'branch':
				total += 1 + Math.max(depth(step.then), depth(step.else));
				break;
			case 'switch':
				total +=
					1 +
					Math.max(
						...step.cases.map((c) => depth(c.steps)),
						step.fallback ? depth(step.fallback) : 0,
					);
				break;
			case 'parallel':
				total += Math.max(...step.branches.map(depth)) + (step.join === 'all' ? 1 : 0);
				break;
			case 'map':
				total += 1 + depth(step.steps);
				break;
			default:
				total += 1;
		}
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
	return {
		options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
		conditions: rows,
		combinator,
	};
}

function conditionRow(id: string, condition: Condition, resolve: StepNameResolver): ConditionRow {
	if (isCompoundCondition(condition)) {
		throw new CompileError('Nested boolean conditions are not supported inside a single rule.');
	}
	const left = compileExpression(condition.left, resolve);
	const right = condition.right ? compileExpression(condition.right, resolve) : undefined;
	const row = (type: string, operation: string, singleValue = false): ConditionRow => ({
		id,
		leftValue: left,
		rightValue: singleValue ? '' : (right ?? ''),
		operator: singleValue ? { type, operation, singleValue: true } : { type, operation },
	});
	switch (condition.op) {
		case 'exists':
			return row('string', 'notEmpty', true);
		case 'not_exists':
			return row('string', 'empty', true);
		case 'equals':
			return row(typeOf(condition.right), 'equals');
		case 'not_equals':
			return row(typeOf(condition.right), 'notEquals');
		case 'contains':
			return row('string', 'contains');
		case 'is_true':
			return row('boolean', 'true', true);
		case 'is_false':
			return row('boolean', 'false', true);
		case 'gt':
			return row('number', 'gt');
		case 'lt':
			return row('number', 'lt');
		case 'gte':
			return row('number', 'gte');
		case 'lte':
			return row('number', 'lte');
	}
}

function typeOf(expression: Expression | undefined): string {
	if (expression?.type === 'literal') {
		if (typeof expression.value === 'number') return 'number';
		if (typeof expression.value === 'boolean') return 'boolean';
	}
	return 'string';
}

function compileCondition(condition: Condition, resolve: StepNameResolver): IDataObject {
	if (isCompoundCondition(condition)) {
		return filterParameter(
			condition.conditions.map((inner, index) =>
				conditionRow(`condition-${index + 1}`, inner, resolve),
			),
			condition.op,
		);
	}
	return filterParameter([conditionRow('condition-1', condition, resolve)], 'and');
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

// ── layout ───────────────────────────────────────────────────────────────────

function layout(emitter: Emitter): void {
	// Positions were assigned during emission; normalize so the canvas starts at the origin.
	const minY = Math.min(0, ...emitter.nodes.map((node) => node.position[1]));
	for (const node of emitter.nodes) node.position = [node.position[0], node.position[1] - minY];
}
