import { createHash } from 'node:crypto';

import { transformSync } from 'esbuild';
import {
	Project,
	SyntaxKind,
	type SourceFile,
	type Node,
	type CallExpression,
	type VariableDeclaration,
	type FunctionDeclaration,
} from 'ts-morph';

import type {
	WorkflowGraphData,
	GraphNodeData,
	GraphEdgeData,
	GraphStepConfig,
} from '../graph/graph.types';
import type { TriggerConfig } from '../sdk/types';
import { zodCallToJsonSchema } from './zod-to-json-schema';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TranspilerResult {
	code: string;
	graph: WorkflowGraphData;
	triggers: TriggerConfig[];
	sourceMap: string | null;
	errors: CompilationError[];
	warnings: CompilationError[];
}

export interface CompilationError {
	message: string;
	line?: number;
	column?: number;
	severity: 'error' | 'warning';
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface StepDefinition {
	/** User-provided step name (from the definition object) */
	name: string;
	/** Deterministic ID derived from the step name */
	id: string;
	/** The full text of the step function body (second argument) */
	functionBodyText: string;
	/** Parsed retry config from the definition object */
	retryConfig?: { maxAttempts: number; baseDelay: number; maxDelay?: number; jitter?: boolean };
	/** Parsed timeout from the definition object */
	timeout?: number;
	/** Step type from the definition object */
	stepType?: string;
	/** Icon name from the definition object */
	icon?: string;
	/** Hex color from the definition object */
	color?: string;
	/** Description from the definition object */
	description?: string;
	/** Names of variables from other step outputs referenced inside the body */
	dependencies: Map<string, string>; // variableName -> sourceStepId
	/** The variable name this step's output is assigned to (if any) */
	assignedVariable: string | undefined;
	/** Position in source for error reporting */
	line: number;
	column: number;
	/** The CallExpression node for the ctx.step() or ctx.batch() call */
	callNode: CallExpression;
	/** Variables from ctx.triggerData referenced inside the step body */
	triggerDataVars: Set<string>;
	/** Whether this step is inside a conditional (if/else) */
	conditionalParent?: ConditionalInfo;
	/** Whether this step is inside a catch block (try/catch) */
	catchParent?: CatchInfo;
	/** Whether this is a batch step (ctx.batch call) */
	isBatch?: boolean;
	/** Batch config from the definition (onItemFailure strategy) */
	batchConfig?: { onItemFailure?: string };
	/** Parameter name for the per-item callback in batch steps (e.g., 'product' from `async (product) => ...`) */
	batchItemParam?: string;
	/** The items expression text for batch steps (e.g., 'products' — the 2nd arg to ctx.batch) */
	batchItemsExpr?: string;
	/** If inside a Promise.all, the group index (all steps with same groupId are parallel) */
	promiseAllGroupId?: number;
	/** Line in the original source where the function body content starts (after { and whitespace) */
	bodyStartLine: number;
}

interface ConditionalInfo {
	/** The condition expression text */
	conditionText: string;
	/** Whether this step is in the 'then' or 'else' branch */
	branch: 'then' | 'else';
	/** The step ID whose output the condition references (if any) */
	conditionSourceStepId?: string;
	/** The variable name in the condition that references the step output */
	conditionVariableName?: string;
	/** Whether the condition variable is a triggerData variable (replaces with output.varName) */
	isTriggerDataVar?: boolean;
}

interface CatchInfo {
	/** Step IDs in the try block that can trigger this catch handler */
	tryStepIds: string[];
	/** The catch clause variable name (e.g., 'error') */
	catchVarName?: string;
}

interface SleepDefinition {
	/** Deterministic ID derived from position */
	id: string;
	/** Display name for the sleep node */
	name: string;
	/** Sleep duration in milliseconds (for ctx.sleep) */
	sleepMs?: number;
	/** Raw expression text for waitUntil (for ctx.waitUntil) */
	waitUntilExpr?: string;
	/** Position in source for ordering */
	sourcePos: number;
	/** The CallExpression node for the ctx.sleep() call */
	callNode: CallExpression;
}

interface TriggerWorkflowDefinition {
	/** Deterministic ID derived from position */
	id: string;
	/** Display name for the trigger-workflow node */
	name: string;
	/** The target workflow ID */
	workflow: string;
	/** Position in source for ordering */
	sourcePos: number;
	/** The CallExpression node for the ctx.triggerWorkflow() call */
	callNode: CallExpression;
	/** The full text of the enclosing step function body that contains the call */
	functionBodyText: string;
	/** The variable name this call's output is assigned to (if any) */
	assignedVariable: string | undefined;
	/** Names of variables from other step outputs referenced inside the body */
	dependencies: Map<string, string>;
	/** Variables from ctx.triggerData referenced inside the step body */
	triggerDataVars: Set<string>;
}

interface AgentDefinition {
	/** Deterministic ID derived from position */
	id: string;
	/** Display name for the agent node */
	name: string;
	/** Position in source for ordering */
	sourcePos: number;
	/** The CallExpression node for the ctx.agent() call */
	callNode: CallExpression;
	/** The full text of the agent builder expression (first arg — preserved verbatim for runtime) */
	agentBuilderExpr: string;
	/** The input expression text (second arg — string or AgentMessage[]) */
	inputExpr: string;
	/** The variable name this call's output is assigned to (if any) */
	assignedVariable: string | undefined;
	/** Names of variables from other step outputs referenced in the agent/input expressions */
	dependencies: Map<string, string>;
	/** Variables from ctx.triggerData referenced in the expressions */
	triggerDataVars: Set<string>;
	/** Timeout override for the agent step */
	timeout?: number;
}

/** Union of step, sleep, trigger-workflow, and agent calls for sequential ordering */
type OrchestratorCall =
	| { kind: 'step'; step: StepDefinition; sourcePos: number }
	| { kind: 'sleep'; sleep: SleepDefinition; sourcePos: number }
	| { kind: 'trigger-workflow'; triggerWorkflow: TriggerWorkflowDefinition; sourcePos: number }
	| { kind: 'agent'; agent: AgentDefinition; sourcePos: number };

interface HelperFunction {
	name: string;
	text: string;
	/** Names of other helpers this one references */
	references: Set<string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

function sanitizeName(name: string): string {
	return name
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/^(\d)/, '_$1')
		.replace(/_+/g, '_');
}

function toCamelCase(name: string): string {
	return sanitizeName(name).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// SDK type declarations for in-memory type checking
// ---------------------------------------------------------------------------

const SDK_TYPE_DECLARATIONS = `
declare module '@n8n/engine/sdk' {
	export interface BatchConfig {
		onItemFailure?: 'fail-fast' | 'continue' | 'abort-remaining';
	}

	export interface BatchResult<T> {
		status: 'fulfilled' | 'rejected';
		value?: T;
		reason?: Error;
	}

	export interface StepDefinition {
		name: string;
		description?: string;
		icon?: string;
		color?: string;
		stepType?: 'step' | 'approval' | 'condition';
		retry?: { maxAttempts: number; baseDelay: number; maxDelay?: number; jitter?: boolean };
		timeout?: number;
		retriableErrors?: string[];
		retryOnTimeout?: boolean;
	}

	export interface BatchStepDefinition {
		name: string;
		description?: string;
		icon?: string;
		color?: string;
		onItemFailure?: 'fail-fast' | 'continue' | 'abort-remaining';
		retry?: { maxAttempts: number; baseDelay: number; maxDelay?: number; jitter?: boolean };
		timeout?: number;
	}

	export interface TriggerWorkflowConfig {
		workflow: string;
		input?: Record<string, unknown>;
		timeout?: number;
	}

	export interface WebhookResponse {
		statusCode?: number;
		body?: unknown;
		headers?: Record<string, string>;
	}

	export type WebhookResponseMode = 'lastNode' | 'respondImmediately' | 'respondWithNode' | 'allData';

	export interface TriggerConfig {
		type: 'webhook' | 'manual' | 'poll';
		config: Record<string, unknown>;
	}

	export interface WebhookTriggerConfig extends TriggerConfig {
		type: 'webhook';
		config: {
			path: string;
			method: string;
			responseMode?: WebhookResponseMode;
		};
	}

	export interface AgentStepResult {
		status: 'completed' | 'suspended';
		output?: unknown;
		snapshot?: unknown;
		resumeCondition?: unknown;
		suspendPayload?: unknown;
		usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
		toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
	}

	export interface ExecutionContext {
		input: Record<string, unknown>;
		triggerData: { body: any; query: any; headers: any; method: string; path: string; [key: string]: unknown };
		error?: unknown;
		executionId: string;
		stepId: string;
		attempt: number;
		step: <T>(definition: StepDefinition, fn: () => Promise<T>) => Promise<T>;
		approval: <T>(definition: StepDefinition, fn: () => Promise<T>) => Promise<T & { approved: boolean }>;
		batch: <T, I>(definition: BatchStepDefinition, items: I[], fn: (item: I, index: number) => Promise<T>) => Promise<BatchResult<T>[]>;
		sendChunk: (data: unknown) => Promise<void>;
		respondToWebhook: (response: WebhookResponse) => Promise<void>;
		sleep: (ms: number) => Promise<void>;
		waitUntil: (date: Date) => Promise<void>;
		triggerWorkflow: (config: TriggerWorkflowConfig) => Promise<unknown>;
		agent: (agent: any, input: string | any[]) => Promise<AgentStepResult>;
		getSecret: (name: string) => string | undefined;
	}

	export interface WorkflowDefinition {
		name: string;
		triggers?: TriggerConfig[];
		settings?: { executionMode?: 'queued' | 'in-process' };
		run: (ctx: ExecutionContext) => Promise<unknown>;
	}

	export function defineWorkflow(def: WorkflowDefinition): WorkflowDefinition;

	export function webhook(
		path: string,
		config?: {
			method?: string;
			responseMode?: WebhookResponseMode;
			schema?: {
				body?: import('zod').ZodType;
				query?: import('zod').ZodType;
				headers?: import('zod').ZodType;
			};
		},
	): WebhookTriggerConfig;
}

declare module 'zod' {
	interface ZodType<T = unknown> {
		optional(): ZodType<T | undefined>;
		default(value: T): ZodType<T>;
	}
	interface ZodString extends ZodType<string> {
		min(n: number): ZodString;
		max(n: number): ZodString;
	}
	interface ZodNumber extends ZodType<number> {
		min(n: number): ZodNumber;
		max(n: number): ZodNumber;
	}
	interface ZodBoolean extends ZodType<boolean> {}
	interface ZodEnum<T extends string> extends ZodType<T> {}
	interface ZodArray<T> extends ZodType<T[]> {}
	interface ZodObject<T> extends ZodType<T> {}
	const z: {
		string(): ZodString;
		number(): ZodNumber;
		boolean(): ZodBoolean;
		enum<T extends string>(values: readonly T[]): ZodEnum<T>;
		array<T>(schema: ZodType<T>): ZodArray<T>;
		object<T extends Record<string, ZodType>>(shape: T): ZodObject<{ [K in keyof T]: T[K] extends ZodType<infer U> ? U : never }>;
	};
	export { z };
}
`;

const AGENTS_TYPE_DECLARATIONS = `
declare module '@n8n/agents' {
	export class Agent {
		model(provider: string, model: string): Agent;
		instructions(text: string): Agent;
		tool(tool: any): Agent;
		memory(memory: any): Agent;
		credential(name: string): Agent;
		structuredOutput(schema: any): Agent;
		thinking(config?: any): Agent;
		checkpoint(store: any): Agent;
	}
	export class Tool {
		constructor(name: string);
		description(text: string): Tool;
		input(schema: any): Tool;
		handler(fn: (input: any, ctx?: any) => Promise<any>): Tool;
	}
	export interface BuiltAgent {
		generate(input: any, options?: any): Promise<any>;
		resume(method: string, data: unknown, options: { runId: string; toolCallId: string }): Promise<any>;
		getState(): any;
		abort(): void;
	}
	export type AgentMessage = any;
}
`;

// ---------------------------------------------------------------------------
// TranspilerService
// ---------------------------------------------------------------------------

export class TranspilerService {
	compile(source: string): TranspilerResult {
		const errors: CompilationError[] = [];
		const warnings: CompilationError[] = [];

		// Validate basic structure
		if (!source.trim()) {
			errors.push({ message: 'Empty source file', severity: 'error' });
			return {
				code: '',
				graph: { nodes: [], edges: [] },
				triggers: [],
				sourceMap: null,
				errors,
				warnings,
			};
		}

		if (!source.includes('defineWorkflow')) {
			errors.push({
				message: 'Source must use defineWorkflow() to define a workflow',
				severity: 'error',
			});
			return {
				code: '',
				graph: { nodes: [], edges: [] },
				triggers: [],
				sourceMap: null,
				errors,
				warnings,
			};
		}

		// Parse with ts-morph
		const project = new Project({
			useInMemoryFileSystem: true,
			compilerOptions: {
				target: 99, // ESNext
				module: 99, // ESNext
				strict: true,
				noEmit: true,
			},
		});

		// Inject SDK type declarations for type checking
		project.createSourceFile('node_modules/@n8n/engine/sdk.d.ts', SDK_TYPE_DECLARATIONS);
		project.createSourceFile('node_modules/@n8n/agents/index.d.ts', AGENTS_TYPE_DECLARATIONS);

		const sourceFile = project.createSourceFile('workflow.ts', source);

		// Collect type diagnostics
		const diagnostics = sourceFile.getPreEmitDiagnostics();
		for (const diag of diagnostics) {
			const messageText = diag.getMessageText();
			const message = typeof messageText === 'string' ? messageText : messageText.getMessageText();
			const start = diag.getStart();
			let line: number | undefined;
			let column: number | undefined;
			if (start !== undefined) {
				const lineAndCol = sourceFile.getLineAndColumnAtPos(start);
				line = lineAndCol.line;
				column = lineAndCol.column;
			}
			const category = diag.getCategory();
			// Type diagnostics are reported as warnings, not blocking errors.
			// This matches IDE behavior: code can still compile and run with
			// type issues. The warnings show as inline markers in the editor.
			if (category <= 1) {
				warnings.push({ message, line, column, severity: 'warning' });
			}
		}

		if (errors.length > 0) {
			return {
				code: '',
				graph: { nodes: [], edges: [] },
				triggers: [],
				sourceMap: null,
				errors,
				warnings,
			};
		}

		// Find the run method and workflow definition object
		const workflowDef = this.findWorkflowDefinition(sourceFile);
		if (!workflowDef) {
			errors.push({
				message: 'Could not find run() method in defineWorkflow()',
				severity: 'error',
			});
			return {
				code: '',
				graph: { nodes: [], edges: [] },
				triggers: [],
				sourceMap: null,
				errors,
				warnings,
			};
		}

		// Extract triggers from the workflow definition object
		const triggers = this.findTriggers(workflowDef.objectLiteral);

		// Step 1: Find all ctx.step(), ctx.approval(), ctx.batch(), ctx.sleep(), ctx.triggerWorkflow(), and ctx.agent() calls
		const stepCalls = this.findStepCalls(workflowDef.runMethod);
		const batchCalls = this.findBatchCalls(workflowDef.runMethod);
		const steps = [...stepCalls, ...batchCalls];
		const sleeps = this.findSleepCalls(workflowDef.runMethod);
		const triggerWorkflows = this.findTriggerWorkflowCalls(workflowDef.runMethod);
		const agentCalls = this.findAgentCalls(workflowDef.runMethod);

		if (steps.length === 0 && agentCalls.length === 0) {
			errors.push({
				message: 'No ctx.step(), ctx.batch(), or ctx.agent() calls found in run() method',
				severity: 'error',
			});
			return {
				code: '',
				graph: { nodes: [], edges: [] },
				triggers: [],
				sourceMap: null,
				errors,
				warnings,
			};
		}

		// Check for duplicate step names
		const nameSet = new Set<string>();
		for (const step of steps) {
			if (nameSet.has(step.name)) {
				errors.push({
					message: `Duplicate step name: '${step.name}'`,
					line: step.line,
					column: step.column,
					severity: 'error',
				});
			}
			nameSet.add(step.name);
		}

		if (errors.length > 0) {
			return {
				code: '',
				graph: { nodes: [], edges: [] },
				triggers: [],
				sourceMap: null,
				errors,
				warnings,
			};
		}

		// Step 2: Build variable-to-step mapping and analyze dependencies
		const variableToStepId = new Map<string, string>();
		for (const step of steps) {
			if (step.assignedVariable) {
				variableToStepId.set(step.assignedVariable, step.id);
			}
		}
		for (const tw of triggerWorkflows) {
			if (tw.assignedVariable) {
				variableToStepId.set(tw.assignedVariable, tw.id);
			}
		}
		for (const ag of agentCalls) {
			if (ag.assignedVariable) {
				variableToStepId.set(ag.assignedVariable, ag.id);
			}
		}

		// Detect variables destructured from ctx.triggerData
		const triggerDataVars = this.findTriggerDataVariables(workflowDef.runMethod);

		// Resolve dependencies for each step
		for (const step of steps) {
			this.resolveStepDependencies(step, variableToStepId);
			// Also check for trigger data variable references
			this.resolveTriggerDataDependencies(step, triggerDataVars);
		}

		// Resolve dependencies for trigger-workflow calls
		for (const tw of triggerWorkflows) {
			this.resolveTriggerWorkflowDependencies(tw, variableToStepId);
		}

		// Step 3: Detect conditionals
		this.detectConditionals(workflowDef.runMethod, steps, variableToStepId, triggerDataVars);

		// Step 3b: Detect try/catch
		this.detectTryCatch(workflowDef.runMethod, steps);

		// Step 4: Find helper functions (also considers agent builder expressions)
		const helpers = this.findHelperFunctions(sourceFile, steps, agentCalls);

		// Resolve dependencies for agent calls
		for (const ag of agentCalls) {
			this.resolveAgentDependencies(ag, variableToStepId);
		}

		// Step 5: Build ordered list of orchestrator calls (steps + sleeps + trigger-workflows + agents)
		const orchestratorCalls = this.buildOrchestratorCallOrder(
			steps,
			sleeps,
			triggerWorkflows,
			agentCalls,
		);

		// Step 6: Build the graph (now includes sleep, trigger-workflow, and agent nodes)
		const graph = this.buildGraph(
			steps,
			sleeps,
			orchestratorCalls,
			triggers,
			triggerWorkflows,
			agentCalls,
		);

		// Step 7: Generate compiled code (for step functions, trigger-workflow functions, and agent functions)
		const { code: rawCode, generatedToOriginalLineMap } = this.generateCode(
			steps,
			helpers,
			triggerWorkflows,
			agentCalls,
		);

		// Step 8: Compile with esbuild
		const { code, sourceMap } = this.compileWithEsbuild(rawCode, generatedToOriginalLineMap);

		return { code, graph, triggers, sourceMap, errors, warnings };
	}

	// -----------------------------------------------------------------------
	// AST analysis methods
	// -----------------------------------------------------------------------

	private findWorkflowDefinition(
		sourceFile: SourceFile,
	): { runMethod: Node; objectLiteral: Node } | undefined {
		const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

		for (const call of callExpressions) {
			const expr = call.getExpression();
			if (expr.getText() === 'defineWorkflow') {
				const args = call.getArguments();
				if (args.length > 0) {
					const objLiteral = args[0];
					if (objLiteral.isKind(SyntaxKind.ObjectLiteralExpression)) {
						for (const prop of objLiteral.getProperties()) {
							if (prop.isKind(SyntaxKind.MethodDeclaration) && prop.getName() === 'run') {
								return { runMethod: prop, objectLiteral: objLiteral };
							}
							if (prop.isKind(SyntaxKind.PropertyAssignment) && prop.getName() === 'run') {
								return { runMethod: prop.getInitializerOrThrow(), objectLiteral: objLiteral };
							}
						}
					}
				}
			}
		}

		return undefined;
	}

	private findTriggers(objectLiteral: Node): TriggerConfig[] {
		if (!objectLiteral.isKind(SyntaxKind.ObjectLiteralExpression)) return [];

		const triggersProp = objectLiteral.getProperty('triggers');
		if (!triggersProp?.isKind(SyntaxKind.PropertyAssignment)) return [];

		const init = triggersProp.getInitializer();
		if (!init?.isKind(SyntaxKind.ArrayLiteralExpression)) return [];

		const triggers: TriggerConfig[] = [];

		for (const element of init.getElements()) {
			if (!element.isKind(SyntaxKind.CallExpression)) continue;

			const fnName = element.getExpression().getText();
			if (fnName !== 'webhook') continue;

			const args = element.getArguments();
			if (args.length === 0) continue;

			// First arg: path string
			const pathArg = args[0];
			let path: string | undefined;
			if (pathArg.isKind(SyntaxKind.StringLiteral)) {
				path = pathArg.getLiteralText();
			}
			if (!path) continue;

			// Second arg: optional config object
			let method = 'POST';
			let responseMode = 'lastNode';

			if (args.length >= 2 && args[1].isKind(SyntaxKind.ObjectLiteralExpression)) {
				const configObj = args[1];
				method = this.extractStringProperty(configObj, 'method') ?? 'POST';
				responseMode = this.extractStringProperty(configObj, 'responseMode') ?? 'lastNode';
			}

			// Extract schema if present
			let schema: Record<string, unknown> | undefined;
			if (args.length >= 2 && args[1].isKind(SyntaxKind.ObjectLiteralExpression)) {
				const configObj = args[1];
				const schemaProp = configObj.getProperty('schema');
				if (schemaProp?.isKind(SyntaxKind.PropertyAssignment)) {
					const schemaInit = schemaProp.getInitializer();
					if (schemaInit?.isKind(SyntaxKind.ObjectLiteralExpression)) {
						schema = {};
						for (const field of schemaInit.getProperties()) {
							if (!field.isKind(SyntaxKind.PropertyAssignment)) continue;
							const fieldName = field.getName();
							if (['body', 'query', 'headers'].includes(fieldName)) {
								const fieldInit = field.getInitializer();
								if (fieldInit) {
									const jsonSchema = zodCallToJsonSchema(fieldInit);
									if (jsonSchema) {
										schema[fieldName] = jsonSchema;
									}
								}
							}
						}
						if (Object.keys(schema).length === 0) schema = undefined;
					}
				}
			}

			triggers.push({
				type: 'webhook',
				config: { path, method, responseMode, ...(schema ? { schema } : {}) },
			});
		}

		return triggers;
	}

	private findStepCalls(runMethod: Node): StepDefinition[] {
		const steps: StepDefinition[] = [];
		const callExpressions = runMethod.getDescendantsOfKind(SyntaxKind.CallExpression);

		// Detect Promise.all groups: assign a group ID to each Promise.all call
		let promiseAllGroupCounter = 0;
		const promiseAllGroups = new Map<CallExpression, number>();
		for (const call of callExpressions) {
			const expr = call.getExpression();
			if (expr.isKind(SyntaxKind.PropertyAccessExpression) && expr.getText() === 'Promise.all') {
				promiseAllGroups.set(call, promiseAllGroupCounter++);
			}
		}

		for (const call of callExpressions) {
			// Match both ctx.step() and ctx.approval() calls
			const isStep = this.isCtxStepCall(call);
			const isApproval = !isStep && this.isCtxApprovalCall(call);
			if (!isStep && !isApproval) continue;

			const args = call.getArguments();
			if (args.length < 2) continue;

			// First arg: StepDefinition object literal
			const defArg = args[0];
			if (!defArg.isKind(SyntaxKind.ObjectLiteralExpression)) continue;

			// Extract 'name' property (required)
			const nameProp = defArg.getProperty('name');
			if (!nameProp || !nameProp.isKind(SyntaxKind.PropertyAssignment)) continue;
			const nameInit = nameProp.getInitializer();
			let stepName: string;
			if (nameInit?.isKind(SyntaxKind.StringLiteral)) {
				stepName = nameInit.getLiteralText();
			} else if (nameInit?.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
				stepName = nameInit.getLiteralText();
			} else {
				continue; // skip dynamic names
			}

			// Normal 2-arg call: ctx.step(def, fn) or ctx.approval(def, fn)
			const fnArg = args[1];
			const fnBodyText = this.extractFunctionBodyText(fnArg);

			if (fnBodyText === undefined) continue;

			// Extract display properties from the definition object
			const description = this.extractStringProperty(defArg, 'description');
			const icon = this.extractStringProperty(defArg, 'icon');
			const color = this.extractStringProperty(defArg, 'color');
			// For ctx.approval(), force stepType to 'approval'; for ctx.step(), read from definition
			const stepType = isApproval ? 'approval' : this.extractStringProperty(defArg, 'stepType');

			// Extract retry config from the definition object
			const retryProp = defArg.getProperty('retry');
			const retryConfig = retryProp ? this.parseRetryConfig(retryProp.getText()) : undefined;

			// Extract timeout from the definition object
			const timeoutProp = defArg.getProperty('timeout');
			let timeout: number | undefined;
			if (timeoutProp?.isKind(SyntaxKind.PropertyAssignment)) {
				const timeoutInit = timeoutProp.getInitializer();
				if (timeoutInit?.isKind(SyntaxKind.NumericLiteral)) {
					timeout = parseInt(timeoutInit.getText(), 10);
				}
			}

			// Determine assigned variable
			const assignedVariable = this.findAssignedVariable(call);

			// Check if this step is inside a Promise.all array
			let promiseAllGroupId: number | undefined;
			const arrayParent = call.getParent();
			if (arrayParent?.isKind(SyntaxKind.ArrayLiteralExpression)) {
				const promiseAllCall = arrayParent.getParent();
				if (promiseAllCall?.isKind(SyntaxKind.CallExpression)) {
					promiseAllGroupId = promiseAllGroups.get(promiseAllCall);
				}
			}

			const stepId = sha256(stepName);

			const { line, column } = sourceFileLineAndColumn(call);
			const bodyStartLine = this.extractFunctionBodyStartLine(fnArg);

			steps.push({
				name: stepName,
				id: stepId,
				functionBodyText: fnBodyText,
				retryConfig,
				timeout,
				stepType,
				icon,
				color,
				description,
				dependencies: new Map(),
				triggerDataVars: new Set(),
				assignedVariable,
				line,
				column,
				callNode: call,
				promiseAllGroupId,
				bodyStartLine,
			});
		}

		return steps;
	}

	private findBatchCalls(runMethod: Node): StepDefinition[] {
		const steps: StepDefinition[] = [];
		const callExpressions = runMethod.getDescendantsOfKind(SyntaxKind.CallExpression);

		for (const call of callExpressions) {
			if (!this.isCtxBatchCall(call)) continue;

			const args = call.getArguments();
			if (args.length < 3) continue;

			// First arg: BatchStepDefinition object literal
			const defArg = args[0];
			if (!defArg.isKind(SyntaxKind.ObjectLiteralExpression)) continue;

			// Extract 'name' property (required)
			const nameProp = defArg.getProperty('name');
			if (!nameProp || !nameProp.isKind(SyntaxKind.PropertyAssignment)) continue;
			const nameInit = nameProp.getInitializer();
			let stepName: string;
			if (nameInit?.isKind(SyntaxKind.StringLiteral)) {
				stepName = nameInit.getLiteralText();
			} else if (nameInit?.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
				stepName = nameInit.getLiteralText();
			} else {
				continue; // skip dynamic names
			}

			// Second arg: items expression
			const batchItemsExpr = args[1].getText();

			// Third arg: per-item callback function
			const fnArg = args[2];
			const fnBodyText = this.extractFunctionBodyText(fnArg);
			if (fnBodyText === undefined) continue;

			// Extract the per-item callback parameter name (e.g., 'product' from `async (product) => ...`)
			let batchItemParam: string | undefined;
			if (fnArg.isKind(SyntaxKind.ArrowFunction) || fnArg.isKind(SyntaxKind.FunctionExpression)) {
				const params = fnArg.getParameters();
				if (params.length > 0) {
					batchItemParam = params[0].getName();
				}
			}

			// Extract onItemFailure from top-level definition
			const onItemFailure = this.extractStringProperty(defArg, 'onItemFailure');
			const batchConfig: { onItemFailure?: string } | undefined = onItemFailure
				? { onItemFailure }
				: undefined;

			// Extract display properties from the definition object
			const description = this.extractStringProperty(defArg, 'description');
			const icon = this.extractStringProperty(defArg, 'icon');
			const color = this.extractStringProperty(defArg, 'color');

			// Extract retry config from the definition object
			const retryProp = defArg.getProperty('retry');
			const retryConfig = retryProp ? this.parseRetryConfig(retryProp.getText()) : undefined;

			// Extract timeout from the definition object
			const timeoutProp = defArg.getProperty('timeout');
			let timeout: number | undefined;
			if (timeoutProp?.isKind(SyntaxKind.PropertyAssignment)) {
				const timeoutInit = timeoutProp.getInitializer();
				if (timeoutInit?.isKind(SyntaxKind.NumericLiteral)) {
					timeout = parseInt(timeoutInit.getText(), 10);
				}
			}

			// Determine assigned variable
			const assignedVariable = this.findAssignedVariable(call);

			const stepId = sha256(stepName);
			const { line, column } = sourceFileLineAndColumn(call);
			const bodyStartLine = this.extractFunctionBodyStartLine(fnArg);

			steps.push({
				name: stepName,
				id: stepId,
				functionBodyText: fnBodyText,
				retryConfig,
				timeout,
				icon,
				color,
				description,
				dependencies: new Map(),
				triggerDataVars: new Set(),
				assignedVariable,
				line,
				column,
				callNode: call,
				isBatch: true,
				batchConfig,
				batchItemParam,
				batchItemsExpr,
				bodyStartLine,
			});
		}

		return steps;
	}

	private findSleepCalls(runMethod: Node): SleepDefinition[] {
		const sleeps: SleepDefinition[] = [];
		const callExpressions = runMethod.getDescendantsOfKind(SyntaxKind.CallExpression);

		let sleepIndex = 0;
		for (const call of callExpressions) {
			const sleepType = this.getCtxSleepType(call);
			if (!sleepType) continue;

			const args = call.getArguments();
			if (args.length < 1) continue;

			const name = `sleep-${sleepIndex}`;
			const id = sha256(`__sleep__${sleepIndex}`);

			if (sleepType === 'sleep') {
				const durationArg = args[0];
				if (!durationArg.isKind(SyntaxKind.NumericLiteral)) continue;
				const sleepMs = parseInt(durationArg.getText(), 10);

				sleeps.push({
					id,
					name,
					sleepMs,
					sourcePos: call.getStart(),
					callNode: call,
				});
			} else {
				// waitUntil — store the expression text for runtime evaluation
				sleeps.push({
					id,
					name,
					waitUntilExpr: args[0].getText(),
					sourcePos: call.getStart(),
					callNode: call,
				});
			}

			sleepIndex++;
		}

		return sleeps;
	}

	/** Returns 'sleep' | 'waitUntil' | undefined */
	private getCtxSleepType(call: CallExpression): 'sleep' | 'waitUntil' | undefined {
		const expr = call.getExpression();
		if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
			const name = expr.getName();
			if ((name === 'sleep' || name === 'waitUntil') && expr.getExpression().getText() === 'ctx') {
				return name;
			}
		}
		return undefined;
	}

	private isCtxTriggerWorkflowCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
			const name = expr.getName();
			if (name === 'triggerWorkflow' && expr.getExpression().getText() === 'ctx') {
				return true;
			}
		}
		return false;
	}

	private findTriggerWorkflowCalls(runMethod: Node): TriggerWorkflowDefinition[] {
		const triggerWorkflows: TriggerWorkflowDefinition[] = [];
		const callExpressions = runMethod.getDescendantsOfKind(SyntaxKind.CallExpression);

		let twIndex = 0;
		for (const call of callExpressions) {
			if (!this.isCtxTriggerWorkflowCall(call)) continue;

			const args = call.getArguments();
			if (args.length < 1) continue;

			const configArg = args[0];
			if (!configArg.isKind(SyntaxKind.ObjectLiteralExpression)) continue;

			// Extract workflow from the config object
			const workflowValue = this.extractStringProperty(configArg, 'workflow');
			if (!workflowValue) continue;

			const name = `trigger-workflow-${twIndex}`;
			const id = sha256(`__trigger_workflow__${twIndex}`);

			// Determine assigned variable
			const assignedVariable = this.findAssignedVariable(call);

			// The function body is the full triggerWorkflow call text (for code gen, we wrap it)
			const functionBodyText = `return await ctx.triggerWorkflow(${configArg.getText()});`;

			triggerWorkflows.push({
				id,
				name,
				workflow: workflowValue,
				sourcePos: call.getStart(),
				callNode: call,
				functionBodyText,
				assignedVariable,
				dependencies: new Map(),
				triggerDataVars: new Set(),
			});

			twIndex++;
		}

		return triggerWorkflows;
	}

	private findAgentCalls(runMethod: Node): AgentDefinition[] {
		const agents: AgentDefinition[] = [];
		const callExpressions = runMethod.getDescendantsOfKind(SyntaxKind.CallExpression);

		let agentIndex = 0;
		for (const call of callExpressions) {
			if (!this.isCtxAgentCall(call)) continue;

			const args = call.getArguments();
			if (args.length < 2) continue;

			// First arg: Agent builder expression (preserved verbatim for runtime execution)
			const agentBuilderExpr = args[0].getText();

			// Second arg: input (string literal or expression)
			const inputExpr = args[1].getText();

			const name = `agent-${agentIndex}`;
			const id = sha256(`__agent__${agentIndex}`);

			// Determine assigned variable
			const assignedVariable = this.findAssignedVariable(call);

			agents.push({
				id,
				name,
				sourcePos: call.getStart(),
				callNode: call,
				agentBuilderExpr,
				inputExpr,
				assignedVariable,
				dependencies: new Map(),
				triggerDataVars: new Set(),
			});

			agentIndex++;
		}

		return agents;
	}

	private resolveAgentDependencies(
		ag: AgentDefinition,
		variableToStepId: Map<string, string>,
	): void {
		// Check if the agent builder or input expressions reference variables from other steps
		const fullText = `${ag.agentBuilderExpr} ${ag.inputExpr}`;
		for (const [varName, stepId] of variableToStepId) {
			if (stepId === ag.id) continue;
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(fullText)) {
				ag.dependencies.set(varName, stepId);
			}
		}
	}

	private resolveTriggerWorkflowDependencies(
		tw: TriggerWorkflowDefinition,
		variableToStepId: Map<string, string>,
	): void {
		// Check if the triggerWorkflow call body references variables from other steps
		for (const [varName, stepId] of variableToStepId) {
			if (stepId === tw.id) continue;
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(tw.functionBodyText)) {
				tw.dependencies.set(varName, stepId);
			}
		}
	}

	private extractStringProperty(obj: Node, propName: string): string | undefined {
		if (!obj.isKind(SyntaxKind.ObjectLiteralExpression)) return undefined;
		const prop = obj.getProperty(propName);
		if (!prop?.isKind(SyntaxKind.PropertyAssignment)) return undefined;
		const init = prop.getInitializer();
		if (init?.isKind(SyntaxKind.StringLiteral)) {
			return init.getLiteralText();
		}
		return undefined;
	}

	private isCtxStepCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
			const name = expr.getName();
			if (name === 'step') {
				const objectExpr = expr.getExpression();
				// Match ctx.step, or any *.step pattern
				return objectExpr.getText() === 'ctx';
			}
		}
		return false;
	}

	private isCtxApprovalCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
			const name = expr.getName();
			if (name === 'approval') {
				const objectExpr = expr.getExpression();
				return objectExpr.getText() === 'ctx';
			}
		}
		return false;
	}

	private isCtxBatchCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
			const name = expr.getName();
			if (name === 'batch') {
				const objectExpr = expr.getExpression();
				return objectExpr.getText() === 'ctx';
			}
		}
		return false;
	}

	private isCtxAgentCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
			return expr.getName() === 'agent' && expr.getExpression().getText() === 'ctx';
		}
		return false;
	}

	private extractFunctionBodyText(node: Node): string | undefined {
		if (node.isKind(SyntaxKind.ArrowFunction)) {
			const body = node.getBody();
			if (body.isKind(SyntaxKind.Block)) {
				// Get the text inside the braces
				const fullText = body.getText();
				return fullText.slice(1, -1).trim();
			}
			// Expression body: return the expression
			return `return ${body.getText()};`;
		}
		if (node.isKind(SyntaxKind.FunctionExpression)) {
			const body = node.getBody();
			const fullText = body.getText();
			return fullText.slice(1, -1).trim();
		}
		return undefined;
	}

	/**
	 * Returns the 1-based line number where the function body content starts
	 * in the original source (i.e., the first non-whitespace line after the opening brace).
	 */
	private extractFunctionBodyStartLine(node: Node): number {
		const sourceFile = node.getSourceFile();

		const getBlockBodyStartLine = (body: Node): number => {
			const fullText = body.getText();
			const afterBrace = fullText.slice(1); // text after opening {
			const firstContentOffset = afterBrace.length - afterBrace.trimStart().length;
			const contentStart = body.getStart() + 1 + firstContentOffset;
			return sourceFile.getLineAndColumnAtPos(contentStart).line;
		};

		if (node.isKind(SyntaxKind.ArrowFunction)) {
			const body = node.getBody();
			if (body.isKind(SyntaxKind.Block)) {
				return getBlockBodyStartLine(body);
			}
			// Expression body: the expression itself
			return sourceFile.getLineAndColumnAtPos(body.getStart()).line;
		}
		if (node.isKind(SyntaxKind.FunctionExpression)) {
			return getBlockBodyStartLine(node.getBody());
		}
		// Fallback: use the node's own position
		return sourceFile.getLineAndColumnAtPos(node.getStart()).line;
	}

	private findAssignedVariable(call: CallExpression): string | undefined {
		// Walk up: call might be inside an AwaitExpression, then a VariableDeclaration
		let current: Node = call;
		const parent = current.getParent();
		if (parent?.isKind(SyntaxKind.AwaitExpression)) {
			current = parent;
		}

		const grandParent = current.getParent();
		if (grandParent?.isKind(SyntaxKind.VariableDeclaration)) {
			const nameNode = (grandParent as VariableDeclaration).getNameNode();
			if (nameNode.isKind(SyntaxKind.Identifier)) {
				return nameNode.getText();
			}
			if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
				return nameNode.getText();
			}
		}

		// Handle Promise.all destructuring: const [a, b] = await Promise.all([ctx.step(...), ...])
		// Walk up: call → ArrayLiteralExpression → CallExpression(Promise.all) → AwaitExpression → VariableDeclaration
		const arrayParent = call.getParent(); // might be the array literal
		if (arrayParent?.isKind(SyntaxKind.ArrayLiteralExpression)) {
			const promiseAllCall = arrayParent.getParent(); // Promise.all(...)
			if (promiseAllCall?.isKind(SyntaxKind.CallExpression)) {
				let promiseAllCurrent: Node = promiseAllCall;
				const awaitParent = promiseAllCurrent.getParent();
				if (awaitParent?.isKind(SyntaxKind.AwaitExpression)) {
					promiseAllCurrent = awaitParent;
				}
				const varDecl = promiseAllCurrent.getParent();
				if (varDecl?.isKind(SyntaxKind.VariableDeclaration)) {
					const nameNode = (varDecl as VariableDeclaration).getNameNode();
					if (nameNode.isKind(SyntaxKind.ArrayBindingPattern)) {
						// Find the index of this call in the array
						const elements = arrayParent.getElements();
						const callIndex = elements.findIndex((el) => el === call);
						if (callIndex >= 0) {
							const bindings = nameNode.getElements();
							const binding = bindings[callIndex];
							if (binding && binding.isKind(SyntaxKind.BindingElement)) {
								return binding.getName();
							}
						}
					}
				}
			}
		}

		return undefined;
	}

	private resolveStepDependencies(
		step: StepDefinition,
		variableToStepId: Map<string, string>,
	): void {
		// Parse the function body text to find references to variables assigned from other steps
		for (const [varName, stepId] of variableToStepId) {
			if (stepId === step.id) continue; // Skip self-reference

			// Check if the variable name appears in the function body
			// Use word-boundary matching to avoid partial matches
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(step.functionBodyText)) {
				step.dependencies.set(varName, stepId);
			}
			// For batch steps, also check the items expression (2nd arg of ctx.step)
			if (step.batchItemsExpr && regex.test(step.batchItemsExpr)) {
				step.dependencies.set(varName, stepId);
			}
		}
	}

	/**
	 * Find variables destructured from ctx.triggerData in the run() body.
	 * e.g. `const { body, headers, query } = ctx.triggerData;`
	 * Returns a map: variableName -> destructuring pattern text
	 */
	private findTriggerDataVariables(runMethod: Node): Map<string, string> {
		const vars = new Map<string, string>();

		const varDeclarations = runMethod.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
		for (const decl of varDeclarations) {
			const init = decl.getInitializer();
			if (!init) continue;

			// Match: ctx.triggerData or similar
			const initText = init.getText();
			if (initText === 'ctx.triggerData' || initText.endsWith('.triggerData')) {
				const nameNode = decl.getNameNode();
				if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
					// Destructuring: const { body, headers } = ctx.triggerData
					for (const element of nameNode.getElements()) {
						const name = element.getName();
						vars.set(name, name);
					}
				} else if (nameNode.isKind(SyntaxKind.Identifier)) {
					// Simple: const triggerData = ctx.triggerData
					vars.set(nameNode.getText(), nameNode.getText());
				}
			}
		}

		return vars;
	}

	/**
	 * Check if a step's function body references variables from ctx.triggerData
	 * and add them to step.triggerDataVars
	 */
	private resolveTriggerDataDependencies(
		step: StepDefinition,
		triggerDataVars: Map<string, string>,
	): void {
		for (const [varName] of triggerDataVars) {
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(step.functionBodyText)) {
				step.triggerDataVars.add(varName);
			}
		}
	}

	private detectConditionals(
		runMethod: Node,
		steps: StepDefinition[],
		variableToStepId: Map<string, string>,
		triggerDataVars: Map<string, string>,
	): void {
		// Build a map of derived variables: local variables whose initializer
		// references a triggerData variable. This lets us trace expressions like
		// `const category = query.category ?? 'all'` back to triggerData.
		// derivedVarExpansions maps: varName -> expression with triggerData vars
		// replaced by `output.X`
		const derivedVarExpansions = this.buildDerivedVarExpansions(runMethod, triggerDataVars);

		const ifStatements = runMethod.getDescendantsOfKind(SyntaxKind.IfStatement);

		for (const ifStmt of ifStatements) {
			const conditionText = ifStmt.getExpression().getText();

			// Determine which step the condition references by looking for
			// variable names that are step outputs in the condition expression
			const condMatch = this.matchConditionSource(
				conditionText,
				variableToStepId,
				triggerDataVars,
				derivedVarExpansions,
			);

			// Find step calls in the 'then' block
			const thenBlock = ifStmt.getThenStatement();
			const thenStepCalls = thenBlock.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of thenStepCalls) {
				if (!this.isCtxStepCall(call) && !this.isCtxBatchCall(call)) continue;
				const step = this.findStepForCall(call, steps);
				if (step) {
					step.conditionalParent = {
						conditionText: condMatch.rewrittenCondition ?? conditionText,
						branch: 'then',
						conditionSourceStepId: condMatch.sourceStepId,
						conditionVariableName: condMatch.variableName,
						isTriggerDataVar: condMatch.isTriggerDataVar,
					};

					// Add the condition source as a dependency if the step body
					// does not already reference it, so the edge connects properly
					if (
						condMatch.sourceStepId &&
						condMatch.sourceStepId !== 'trigger' &&
						!step.dependencies.has(conditionText.split('.')[0])
					) {
						// Find the variable name for this step ID
						for (const [varName, sid] of variableToStepId) {
							if (sid === condMatch.sourceStepId) {
								step.dependencies.set(varName, sid);
								break;
							}
						}
					}
				}
			}

			// Find step calls in the 'else' block
			const elseStmt = ifStmt.getElseStatement();
			if (elseStmt) {
				const elseStepCalls = elseStmt.getDescendantsOfKind(SyntaxKind.CallExpression);
				for (const call of elseStepCalls) {
					if (!this.isCtxStepCall(call) && !this.isCtxBatchCall(call)) continue;
					const step = this.findStepForCall(call, steps);
					if (step) {
						step.conditionalParent = {
							conditionText: condMatch.rewrittenCondition ?? conditionText,
							branch: 'else',
							conditionSourceStepId: condMatch.sourceStepId,
							conditionVariableName: condMatch.variableName,
							isTriggerDataVar: condMatch.isTriggerDataVar,
						};

						// Add the condition source as a dependency
						if (condMatch.sourceStepId && condMatch.sourceStepId !== 'trigger') {
							for (const [varName, sid] of variableToStepId) {
								if (sid === condMatch.sourceStepId) {
									step.dependencies.set(varName, sid);
									break;
								}
							}
						}
					}
				}
			}
		}

		// Detect switch/case statements — each case clause is a conditional branch
		const switchStatements = runMethod.getDescendantsOfKind(SyntaxKind.SwitchStatement);

		for (const switchStmt of switchStatements) {
			const switchExprText = switchStmt.getExpression().getText();

			// Find which step variable the switch expression references
			const condMatch = this.matchConditionSource(
				switchExprText,
				variableToStepId,
				triggerDataVars,
				derivedVarExpansions,
			);

			// Walk each case clause
			const caseBlock = switchStmt.getCaseBlock();
			// Collect all non-default case expressions for the default clause negation
			const allCaseExprs: string[] = [];
			for (const clause of caseBlock.getClauses()) {
				if (clause.isKind(SyntaxKind.CaseClause)) {
					const caseExpr = clause.getExpression().getText();
					const resolvedSwitch = condMatch.rewrittenCondition ?? switchExprText;
					allCaseExprs.push(`${resolvedSwitch} === ${caseExpr}`);
				}
			}

			for (const clause of caseBlock.getClauses()) {
				let conditionText: string;
				const resolvedSwitch = condMatch.rewrittenCondition ?? switchExprText;
				if (clause.isKind(SyntaxKind.CaseClause)) {
					const caseExpr = clause.getExpression().getText();
					conditionText = `${resolvedSwitch} === ${caseExpr}`;
				} else {
					// DefaultClause — negate all case conditions
					if (allCaseExprs.length > 0) {
						conditionText = `!(${allCaseExprs.join(' || ')})`;
					} else {
						conditionText = `!(${resolvedSwitch})`;
					}
				}

				const clauseStepCalls = clause.getDescendantsOfKind(SyntaxKind.CallExpression);
				for (const call of clauseStepCalls) {
					if (!this.isCtxStepCall(call) && !this.isCtxBatchCall(call)) continue;
					const step = this.findStepForCall(call, steps);
					if (step) {
						step.conditionalParent = {
							conditionText,
							branch: 'then',
							conditionSourceStepId: condMatch.sourceStepId,
							conditionVariableName: condMatch.isTriggerDataVar
								? undefined
								: condMatch.variableName,
							isTriggerDataVar: condMatch.isTriggerDataVar,
						};

						if (condMatch.sourceStepId && condMatch.sourceStepId !== 'trigger') {
							for (const [varName, sid] of variableToStepId) {
								if (sid === condMatch.sourceStepId) {
									step.dependencies.set(varName, sid);
									break;
								}
							}
						}
					}
				}
			}
		}
	}

	/**
	 * Match a condition expression to its source — either a step output variable
	 * or a triggerData variable (direct or derived).
	 */
	private matchConditionSource(
		exprText: string,
		variableToStepId: Map<string, string>,
		triggerDataVars: Map<string, string>,
		derivedVarExpansions: Map<string, string>,
	): {
		sourceStepId?: string;
		variableName?: string;
		isTriggerDataVar?: boolean;
		rewrittenCondition?: string;
	} {
		// 1. Check step output variables first
		for (const [varName, stepId] of variableToStepId) {
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(exprText)) {
				return { sourceStepId: stepId, variableName: varName };
			}
		}

		// 2. Check direct triggerData variables (e.g., `body` from `const { body } = ctx.triggerData`)
		for (const [varName] of triggerDataVars) {
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(exprText)) {
				// Replace the triggerData variable with `output.varName` in the condition
				const globalRegex = new RegExp(`\\b${escapeRegExp(varName)}\\b`, 'g');
				const rewritten = exprText.replace(globalRegex, `output.${varName}`);
				return {
					sourceStepId: 'trigger',
					variableName: varName,
					isTriggerDataVar: true,
					rewrittenCondition: rewritten,
				};
			}
		}

		// 3. Check derived variables (e.g., `category` from `const category = query.category ?? 'all'`)
		for (const [varName, expansion] of derivedVarExpansions) {
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(exprText)) {
				// Replace the derived variable with its expanded expression
				const globalRegex = new RegExp(`\\b${escapeRegExp(varName)}\\b`, 'g');
				const rewritten = exprText.replace(globalRegex, `(${expansion})`);
				return {
					sourceStepId: 'trigger',
					variableName: varName,
					isTriggerDataVar: true,
					rewrittenCondition: rewritten,
				};
			}
		}

		return {};
	}

	/**
	 * Build a map of derived variable expansions.
	 * For each variable declaration in the run method body that references
	 * a triggerData variable, compute the expanded expression with triggerData
	 * vars replaced by `output.X`.
	 *
	 * Example: `const category = query.category ?? 'all'` where `query` is from
	 * ctx.triggerData produces: `category` -> `output.query.category ?? 'all'`
	 */
	private buildDerivedVarExpansions(
		runMethod: Node,
		triggerDataVars: Map<string, string>,
	): Map<string, string> {
		const expansions = new Map<string, string>();

		const varDeclarations = runMethod.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
		for (const decl of varDeclarations) {
			const init = decl.getInitializer();
			if (!init) continue;

			const nameNode = decl.getNameNode();
			if (!nameNode.isKind(SyntaxKind.Identifier)) continue;

			const varName = nameNode.getText();
			const initText = init.getText();

			// Skip triggerData vars themselves (they're handled directly)
			if (triggerDataVars.has(varName)) continue;

			// Check if the initializer references any triggerData variable
			for (const [tdVar] of triggerDataVars) {
				const regex = new RegExp(`\\b${escapeRegExp(tdVar)}\\b`);
				if (regex.test(initText)) {
					// Replace the triggerData var with output.tdVar
					const expanded = initText.replace(
						new RegExp(`\\b${escapeRegExp(tdVar)}\\b`, 'g'),
						`output.${tdVar}`,
					);
					expansions.set(varName, expanded);
					break;
				}
			}
		}

		return expansions;
	}

	private detectTryCatch(runMethod: Node, steps: StepDefinition[]): void {
		const tryStatements = runMethod.getDescendantsOfKind(SyntaxKind.TryStatement);

		for (const tryStmt of tryStatements) {
			const tryBlock = tryStmt.getTryBlock();
			const catchClause = tryStmt.getCatchClause();
			if (!catchClause) continue;

			// Find step calls in the try block
			const tryStepCalls = tryBlock.getDescendantsOfKind(SyntaxKind.CallExpression);
			const tryStepIds: string[] = [];

			for (const call of tryStepCalls) {
				if (!this.isCtxStepCall(call) && !this.isCtxBatchCall(call)) continue;
				const step = this.findStepForCall(call, steps);
				if (step) {
					tryStepIds.push(step.id);
				}
			}

			if (tryStepIds.length === 0) continue;

			// Extract catch variable name
			const catchVariableDecl = catchClause.getVariableDeclaration();
			const catchVarName = catchVariableDecl?.getName();

			// Find step calls in the catch block
			const catchBlock = catchClause.getBlock();
			const catchStepCalls = catchBlock.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of catchStepCalls) {
				if (!this.isCtxStepCall(call) && !this.isCtxBatchCall(call)) continue;
				const step = this.findStepForCall(call, steps);
				if (step) {
					step.catchParent = {
						tryStepIds,
						catchVarName,
					};
				}
			}
		}
	}

	private findStepForCall(
		call: CallExpression,
		steps: StepDefinition[],
	): StepDefinition | undefined {
		const args = call.getArguments();
		if (args.length < 1) return undefined;

		const defArg = args[0];
		if (defArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
			const nameProp = defArg.getProperty('name');
			if (nameProp?.isKind(SyntaxKind.PropertyAssignment)) {
				const init = nameProp.getInitializer();
				if (init?.isKind(SyntaxKind.StringLiteral)) {
					const name = init.getLiteralText();
					return steps.find((s) => s.name === name);
				}
			}
		}

		return undefined;
	}

	private findHelperFunctions(
		sourceFile: SourceFile,
		steps: StepDefinition[],
		agents: AgentDefinition[] = [],
	): HelperFunction[] {
		const helpers: HelperFunction[] = [];
		// Include step bodies and agent builder/input expressions for reference checking
		const allFnBodies =
			steps.map((s) => s.functionBodyText).join('\n') +
			'\n' +
			agents.map((ag) => `${ag.agentBuilderExpr} ${ag.inputExpr}`).join('\n');

		// Find top-level function declarations
		for (const fn of sourceFile.getFunctions()) {
			const name = fn.getName();
			if (!name) continue;

			helpers.push({
				name,
				text: fn.getText(),
				references: this.findFunctionReferences(fn, sourceFile),
			});
		}

		// Find top-level variable declarations (arrow functions, builder chains, etc.)
		for (const stmt of sourceFile.getVariableStatements()) {
			for (const decl of stmt.getDeclarations()) {
				const init = decl.getInitializer();
				if (init) {
					const name = decl.getName();
					helpers.push({
						name,
						text: stmt.getText(),
						references: this.findVariableReferences(name, sourceFile),
					});
				}
			}
		}

		// Filter to only helpers referenced by step functions (directly or transitively)
		const referencedNames = new Set<string>();
		const helperMap = new Map(helpers.map((h) => [h.name, h]));

		const markReferenced = (name: string) => {
			if (referencedNames.has(name)) return;
			referencedNames.add(name);
			const helper = helperMap.get(name);
			if (helper) {
				for (const ref of helper.references) {
					if (helperMap.has(ref)) {
						markReferenced(ref);
					}
				}
			}
		};

		for (const helper of helpers) {
			// Check if any step body or agent expression references this helper
			const regex = new RegExp(`\\b${escapeRegExp(helper.name)}\\b`);
			if (regex.test(allFnBodies)) {
				markReferenced(helper.name);
			}
		}

		return helpers.filter((h) => referencedNames.has(h.name));
	}

	private findFunctionReferences(fn: FunctionDeclaration, _sourceFile: SourceFile): Set<string> {
		const refs = new Set<string>();
		const fnBody = fn.getBody();
		if (!fnBody) return refs;

		const identifiers = fnBody.getDescendantsOfKind(SyntaxKind.Identifier);
		for (const id of identifiers) {
			refs.add(id.getText());
		}
		return refs;
	}

	private findVariableReferences(name: string, sourceFile: SourceFile): Set<string> {
		const refs = new Set<string>();
		const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
		for (const id of identifiers) {
			const text = id.getText();
			if (text !== name) {
				refs.add(text);
			}
		}
		return refs;
	}

	private parseRetryConfig(
		optionsText: string,
	): { maxAttempts: number; baseDelay: number; maxDelay?: number; jitter?: boolean } | undefined {
		// Extract retry config from options text like { retry: { maxAttempts: 3, baseDelay: 1000 } }
		const retryMatch = optionsText.match(/retry\s*:\s*\{([^}]+)\}/);
		if (!retryMatch) return undefined;

		const retryText = retryMatch[1];

		const maxAttemptsMatch = retryText.match(/maxAttempts\s*:\s*(\d+)/);
		const baseDelayMatch = retryText.match(/baseDelay\s*:\s*(\d+)/);
		const maxDelayMatch = retryText.match(/maxDelay\s*:\s*(\d+)/);
		const jitterMatch = retryText.match(/jitter\s*:\s*(true|false)/);

		if (!maxAttemptsMatch || !baseDelayMatch) return undefined;

		return {
			maxAttempts: parseInt(maxAttemptsMatch[1], 10),
			baseDelay: parseInt(baseDelayMatch[1], 10),
			maxDelay: maxDelayMatch ? parseInt(maxDelayMatch[1], 10) : undefined,
			jitter: jitterMatch ? jitterMatch[1] === 'true' : undefined,
		};
	}

	// -----------------------------------------------------------------------
	// Orchestrator call ordering
	// -----------------------------------------------------------------------

	private buildOrchestratorCallOrder(
		steps: StepDefinition[],
		sleeps: SleepDefinition[],
		triggerWorkflows: TriggerWorkflowDefinition[] = [],
		agents: AgentDefinition[] = [],
	): OrchestratorCall[] {
		const calls: OrchestratorCall[] = [];

		for (const step of steps) {
			calls.push({ kind: 'step', step, sourcePos: step.callNode.getStart() });
		}
		for (const sleep of sleeps) {
			calls.push({ kind: 'sleep', sleep, sourcePos: sleep.sourcePos });
		}
		for (const tw of triggerWorkflows) {
			calls.push({ kind: 'trigger-workflow', triggerWorkflow: tw, sourcePos: tw.sourcePos });
		}
		for (const ag of agents) {
			calls.push({ kind: 'agent', agent: ag, sourcePos: ag.sourcePos });
		}

		calls.sort((a, b) => a.sourcePos - b.sourcePos);
		return calls;
	}

	// -----------------------------------------------------------------------
	// Graph building — sequential-by-default with Promise.all parallel groups
	// -----------------------------------------------------------------------

	private buildGraph(
		steps: StepDefinition[],
		_sleeps: SleepDefinition[],
		orchestratorCalls: OrchestratorCall[],
		triggers: TriggerConfig[],
		triggerWorkflows: TriggerWorkflowDefinition[] = [],
		agents: AgentDefinition[] = [],
	): WorkflowGraphData {
		const nodes: GraphNodeData[] = [];
		const edges: GraphEdgeData[] = [];

		// Create trigger node — use webhook name if a webhook trigger exists
		const hasWebhook = triggers.some((t) => t.type === 'webhook');
		const webhookPath = triggers.find((t) => t.type === 'webhook')?.config?.path;

		nodes.push({
			id: 'trigger',
			name: hasWebhook ? `Webhook: ${webhookPath}` : 'Manual Trigger',
			type: 'trigger',
			stepFunctionRef: 'step_trigger',
			config: {
				name: hasWebhook ? `Webhook: ${webhookPath}` : 'Manual Trigger',
			},
		});

		// Create step/batch graph nodes
		for (const step of steps) {
			const config: GraphNodeData['config'] = { name: step.name };
			if (step.retryConfig) config.retryConfig = step.retryConfig;
			if (step.timeout) config.timeout = step.timeout;
			if (step.stepType) config.stepType = step.stepType as GraphStepConfig['stepType'];
			if (step.icon) config.icon = step.icon;
			if (step.color) config.color = step.color;
			if (step.description) config.description = step.description;
			if (step.isBatch) {
				config.stepType = 'batch';
				if (step.batchConfig?.onItemFailure) {
					config.onItemFailure = step.batchConfig.onItemFailure as GraphStepConfig['onItemFailure'];
				}
			}
			nodes.push({
				id: step.id,
				name: step.name,
				type: step.isBatch ? 'batch' : step.stepType === 'approval' ? 'approval' : 'step',
				stepFunctionRef: `step_${step.id}`,
				config,
			});
		}

		// Add sleep nodes from orchestrator calls
		for (const call of orchestratorCalls) {
			if (call.kind === 'sleep') {
				const sleep = call.sleep;
				nodes.push({
					id: sleep.id,
					name: sleep.name,
					type: 'sleep',
					stepFunctionRef: '',
					config: {
						name: sleep.name,
						stepType: 'sleep',
						...(sleep.sleepMs != null ? { sleepMs: sleep.sleepMs } : {}),
						...(sleep.waitUntilExpr ? { waitUntilExpr: sleep.waitUntilExpr } : {}),
					},
				});
			}
		}

		// Add trigger-workflow nodes
		for (const tw of triggerWorkflows) {
			nodes.push({
				id: tw.id,
				name: tw.name,
				type: 'trigger-workflow',
				stepFunctionRef: `step_${tw.id}`,
				config: {
					name: tw.name,
					workflow: tw.workflow,
				},
			});
		}

		// Add agent nodes
		for (const ag of agents) {
			nodes.push({
				id: ag.id,
				name: ag.name,
				type: 'agent',
				stepFunctionRef: `step_${ag.id}`,
				config: {
					name: ag.name,
					agentConfig: {
						timeout: ag.timeout ?? 600_000,
					},
				},
			});
		}

		// --- Sequential-by-default edge building ---
		// Steps chain sequentially by declaration order. Promise.all groups
		// fan-out/fan-in. Conditionals branch. Sleeps insert inline.
		//
		// Walk orchestratorCalls in source order. Each node connects from
		// the previous node (sequential-by-default). Exceptions:
		// - Promise.all groups: fan-out from previous, fan-in to next
		// - Conditionals: branch from the condition source step
		// - Sleeps: insert inline in the sequential chain
		let previousNodeIds: string[] = ['trigger'];
		const addedEdgeKeys = new Set<string>();

		const addEdge = (from: string, to: string, condition?: string) => {
			const key = condition ? `${from}->${to}?${condition}` : `${from}->${to}`;
			if (addedEdgeKeys.has(key)) return;
			addedEdgeKeys.add(key);
			edges.push({ from, to, ...(condition ? { condition } : {}) });
		};

		let idx = 0;
		while (idx < orchestratorCalls.length) {
			const call = orchestratorCalls[idx];

			if (call.kind === 'sleep') {
				const sleepId = call.sleep.id;
				for (const prevId of previousNodeIds) {
					addEdge(prevId, sleepId);
				}
				previousNodeIds = [sleepId];
				idx++;
				continue;
			}

			if (call.kind === 'trigger-workflow') {
				const twId = call.triggerWorkflow.id;
				for (const prevId of previousNodeIds) {
					addEdge(prevId, twId);
				}
				previousNodeIds = [twId];
				idx++;
				continue;
			}

			if (call.kind === 'agent') {
				const agId = call.agent.id;
				for (const prevId of previousNodeIds) {
					addEdge(prevId, agId);
				}
				previousNodeIds = [agId];
				idx++;
				continue;
			}

			// call.kind === 'step'
			const step = call.step;

			// Catch steps: connect from each try step with error edge
			if (step.catchParent) {
				for (const tryStepId of step.catchParent.tryStepIds) {
					addEdge(tryStepId, step.id, '__error__');
				}
				// Catch branches don't update previousNodeIds
				idx++;
				continue;
			}

			// Conditional steps: connect from the condition source
			if (step.conditionalParent) {
				const conditionExpr = this.getConditionExpression(step);
				const condSourceId = step.conditionalParent.conditionSourceStepId;
				if (condSourceId) {
					addEdge(condSourceId, step.id, conditionExpr);
				} else {
					for (const prevId of previousNodeIds) {
						addEdge(prevId, step.id, conditionExpr);
					}
				}
				// Conditional branches don't update previousNodeIds
				idx++;
				continue;
			}

			// Promise.all group: collect all steps with same groupId
			if (step.promiseAllGroupId !== undefined) {
				const groupId = step.promiseAllGroupId;
				const groupSteps: StepDefinition[] = [];
				while (idx < orchestratorCalls.length) {
					const c = orchestratorCalls[idx];
					if (c.kind === 'step' && c.step.promiseAllGroupId === groupId) {
						groupSteps.push(c.step);
						idx++;
					} else {
						break;
					}
				}
				// Fan-out: all group steps connect from previous
				for (const gs of groupSteps) {
					for (const prevId of previousNodeIds) {
						addEdge(prevId, gs.id);
					}
				}
				// Fan-in: next node connects from all group steps
				previousNodeIds = groupSteps.map((gs) => gs.id);
				continue;
			}

			// Normal sequential step
			for (const prevId of previousNodeIds) {
				addEdge(prevId, step.id);
			}
			previousNodeIds = [step.id];
			idx++;
		}

		return { nodes, edges };
	}

	private getConditionExpression(step: StepDefinition): string | undefined {
		if (!step.conditionalParent) return undefined;

		const { conditionText, branch, conditionVariableName, isTriggerDataVar } =
			step.conditionalParent;

		let expr = conditionText;
		if (isTriggerDataVar) {
			// Condition text is already rewritten with `output.X` references
			// by matchConditionSource — no further replacement needed.
		} else if (conditionVariableName) {
			// Replace the source variable name with 'output' so evaluateCondition
			// can evaluate it with the step output as the 'output' parameter.
			// e.g. "data.amount > 100" → "output.amount > 100"
			const regex = new RegExp(`\\b${escapeRegExp(conditionVariableName)}\\b`, 'g');
			expr = expr.replace(regex, 'output');
		}

		if (branch === 'then') {
			return expr;
		}
		return `!(${expr})`;
	}

	// -----------------------------------------------------------------------
	// Code generation
	// -----------------------------------------------------------------------

	private generateCode(
		steps: StepDefinition[],
		helpers: HelperFunction[],
		triggerWorkflows: TriggerWorkflowDefinition[] = [],
		agents: AgentDefinition[] = [],
	): { code: string; generatedToOriginalLineMap: Record<number, number> } {
		// Track the current line number in the generated code (1-based)
		let currentLine = 1;
		const outputLines: string[] = [];
		// Maps generated-code line number -> original-source line number
		const generatedToOriginalLineMap: Record<number, number> = {};

		const appendLine = (text: string) => {
			outputLines.push(text);
			currentLine++;
		};

		const appendBodyWithMapping = (body: string, originalStartLine: number) => {
			const bodyLines = body.split('\n');
			for (let i = 0; i < bodyLines.length; i++) {
				generatedToOriginalLineMap[currentLine] = originalStartLine + i;
				outputLines.push(bodyLines[i]);
				currentLine++;
			}
		};

		// Emit agent framework require before helpers (helpers may reference Agent/Tool/z)
		if (agents.length > 0) {
			appendLine('// --- Agent framework ---');
			appendLine('const __agents__ = require("@n8n/agents");');
			appendLine('const { Agent, Tool } = __agents__;');
			appendLine('const { z } = require("zod");');
			appendLine('');
		}

		// Emit helper functions at module level
		if (helpers.length > 0) {
			appendLine('// --- Helper functions ---');
			for (const helper of helpers) {
				// Strip TypeScript annotations for JS output
				const helperLines = helper.text.split('\n');
				for (const hl of helperLines) {
					appendLine(hl);
				}
			}
			appendLine('');
		}

		// Emit each step as an exported function
		appendLine('// --- Step functions ---');
		for (const step of steps) {
			const fnName = `step_${toCamelCase(step.name)}`;
			const exportName = `step_${step.id}`;

			// Generate variable injection lines for dependencies
			const injections: string[] = [];
			for (const [varName, sourceStepId] of step.dependencies) {
				injections.push(`const ${varName} = ctx.input['${sourceStepId}'];`);
			}
			// Inject trigger data variables — but only if the body doesn't already destructure them
			const body = step.functionBodyText;
			if (step.triggerDataVars.size > 0 && !body.includes('ctx.triggerData')) {
				const varNames = [...step.triggerDataVars].join(', ');
				injections.push(`const { ${varNames} } = ctx.triggerData;`);
			}
			// Inject catch variable — maps the catch clause variable to ctx.error
			if (step.catchParent?.catchVarName) {
				injections.push(`const ${step.catchParent.catchVarName} = ctx.error;`);
			}

			if (step.isBatch && step.batchItemParam) {
				// Batch step: function signature line
				appendLine(`exports.${exportName} = async function ${fnName}(ctx) {`);
				// Injection lines
				for (const inj of injections) {
					appendLine(`    ${inj}`);
				}
				appendLine(`    if (ctx.batchItem !== undefined) {`);
				appendLine(`        const ${step.batchItemParam} = ctx.batchItem;`);
				// Body lines with mapping
				const indentedBody = body
					.split('\n')
					.map((l) => `        ${l}`)
					.join('\n');
				appendBodyWithMapping(indentedBody, step.bodyStartLine);
				const itemsExpr = step.batchItemsExpr ?? 'null';
				appendLine(`    }`);
				appendLine(`    return ${itemsExpr};`);
				appendLine(`};`);
			} else {
				// Regular step: function signature line
				appendLine(`exports.${exportName} = async function ${fnName}(ctx) {`);
				// Injection lines
				for (const inj of injections) {
					appendLine(`    ${inj}`);
				}
				// Body lines with mapping
				const indentedBody = body
					.split('\n')
					.map((l) => `    ${l}`)
					.join('\n');
				appendBodyWithMapping(indentedBody, step.bodyStartLine);
				appendLine(`};`);
			}
			appendLine('');
		}

		// Emit trigger-workflow step functions
		for (const tw of triggerWorkflows) {
			const fnName = `step_${toCamelCase(tw.name)}`;
			const exportName = `step_${tw.id}`;

			const injections: string[] = [];
			for (const [varName, sourceStepId] of tw.dependencies) {
				injections.push(`const ${varName} = ctx.input['${sourceStepId}'];`);
			}
			const body = tw.functionBodyText;
			if (tw.triggerDataVars.size > 0 && !body.includes('ctx.triggerData')) {
				const varNames = [...tw.triggerDataVars].join(', ');
				injections.push(`const { ${varNames} } = ctx.triggerData;`);
			}

			appendLine(`exports.${exportName} = async function ${fnName}(ctx) {`);
			for (const inj of injections) {
				appendLine(`    ${inj}`);
			}
			// Trigger workflow bodies are synthesized (not from original source),
			// so we use the call position line as the mapping
			const bodyLines = body.split('\n');
			for (const bl of bodyLines) {
				appendLine(`    ${bl}`);
			}
			appendLine(`};`);
			appendLine('');
		}

		// Emit agent step functions
		for (const ag of agents) {
			const fnName = `step_${toCamelCase(ag.name)}`;
			const exportName = `step_${ag.id}`;

			const injections: string[] = [];
			for (const [varName, sourceStepId] of ag.dependencies) {
				injections.push(`const ${varName} = ctx.input['${sourceStepId}'];`);
			}
			if (ag.triggerDataVars.size > 0) {
				const varNames = [...ag.triggerDataVars].join(', ');
				injections.push(`const { ${varNames} } = ctx.triggerData;`);
			}

			// The agent step function returns { agent, input } for the bridge to invoke.
			// The agent builder expression is preserved verbatim — it's runtime code.
			appendLine(`exports.${exportName} = async function ${fnName}(ctx) {`);
			for (const inj of injections) {
				appendLine(`    ${inj}`);
			}
			appendLine(`    const __agent__ = ${ag.agentBuilderExpr};`);
			appendLine(`    const __input__ = ${ag.inputExpr};`);
			appendLine(`    return { agent: __agent__, input: __input__ };`);
			appendLine(`};`);
			appendLine('');
		}

		return { code: outputLines.join('\n'), generatedToOriginalLineMap };
	}

	/**
	 * Compiles intermediate generated code with esbuild and produces a line map
	 * from compiled output lines to original source lines.
	 *
	 * The chain is: original source -> generated intermediate code -> compiled output.
	 * The esbuild source map maps compiled lines -> generated lines, and the
	 * generatedToOriginalLineMap maps generated lines -> original lines. This method
	 * combines both to produce a direct compiled-line -> original-line mapping.
	 */
	private compileWithEsbuild(
		rawCode: string,
		generatedToOriginalLineMap: Record<number, number>,
	): { code: string; sourceMap: string | null } {
		try {
			const result = transformSync(rawCode, {
				loader: 'ts',
				format: 'cjs',
				target: 'node18',
				sourcemap: 'external',
				sourcefile: 'workflow.ts',
			});

			// Parse the esbuild source map and combine with our generated-to-original mapping
			// to produce a direct compiled-line -> original-line map
			const compiledToOriginalMap = buildCompiledToOriginalLineMap(
				result.map || '',
				generatedToOriginalLineMap,
			);

			return {
				code: result.code,
				sourceMap:
					Object.keys(compiledToOriginalMap).length > 0
						? JSON.stringify(compiledToOriginalMap)
						: null,
			};
		} catch (err) {
			// If esbuild fails, return the raw code. The generatedToOriginalLineMap
			// IS the line map since the raw code is used directly.
			return {
				code: rawCode,
				sourceMap:
					Object.keys(generatedToOriginalLineMap).length > 0
						? JSON.stringify(generatedToOriginalLineMap)
						: null,
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceFileLineAndColumn(node: Node): { line: number; column: number } {
	const sourceFile = node.getSourceFile();
	const pos = node.getStart();
	const lineAndCol = sourceFile.getLineAndColumnAtPos(pos);
	return { line: lineAndCol.line, column: lineAndCol.column };
}

// ---------------------------------------------------------------------------
// Source map VLQ decoder
// ---------------------------------------------------------------------------

const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VLQ_LOOKUP = new Map<string, number>();
for (let i = 0; i < VLQ_CHARS.length; i++) {
	VLQ_LOOKUP.set(VLQ_CHARS[i], i);
}

/**
 * Decodes a VLQ-encoded source map mappings string and returns an array
 * where index i contains the 1-based source line for compiled output line (i+1).
 * Only the source line (field index 2) is extracted.
 */
function decodeVlqMappings(mappings: string): number[] {
	const outputLineToSourceLine: number[] = [];
	const groups = mappings.split(';');
	// State variables maintained across all lines (VLQ is relative)
	let sourceLine = 0; // 0-based
	let sourceCol = 0;
	let sourceIdx = 0;
	let nameIdx = 0;

	for (const group of groups) {
		if (group.length === 0) {
			// Empty group = no mappings for this output line
			outputLineToSourceLine.push(-1);
			continue;
		}

		// Parse the first segment of this group (gives the mapping for the line start)
		const segments = group.split(',');
		let firstMapped = false;
		let lineSourceLine = -1;

		// We need the first segment that has >= 4 fields (source mapping)
		for (const segment of segments) {
			if (segment.length === 0) continue;

			const values = decodeVlqSegment(segment);
			if (values.length >= 4) {
				sourceIdx += values[1];
				sourceLine += values[2];
				sourceCol += values[3];
				if (values.length >= 5) {
					nameIdx += values[4];
				}
				if (!firstMapped) {
					lineSourceLine = sourceLine + 1; // Convert to 1-based
					firstMapped = true;
				}
			}
		}

		outputLineToSourceLine.push(lineSourceLine);
	}

	return outputLineToSourceLine;
}

function decodeVlqSegment(segment: string): number[] {
	const values: number[] = [];
	let shift = 0;
	let value = 0;

	for (const char of segment) {
		const digit = VLQ_LOOKUP.get(char);
		if (digit === undefined) break;

		const hasContinuation = (digit & 32) !== 0;
		value += (digit & 31) << shift;
		shift += 5;

		if (!hasContinuation) {
			// Sign is in the least significant bit
			const isNegative = (value & 1) !== 0;
			const absValue = value >> 1;
			values.push(isNegative ? -absValue : absValue);
			value = 0;
			shift = 0;
		}
	}

	return values;
}

/**
 * Combines the esbuild source map (compiled -> generated) with our
 * generated-to-original line map to produce a direct compiled-line -> original-line map.
 */
function buildCompiledToOriginalLineMap(
	esbuildSourceMapJson: string,
	generatedToOriginalLineMap: Record<number, number>,
): Record<number, number> {
	const result: Record<number, number> = {};

	if (!esbuildSourceMapJson) {
		return result;
	}

	try {
		const sourceMap = JSON.parse(esbuildSourceMapJson) as { mappings: string };
		const compiledToGeneratedLines = decodeVlqMappings(sourceMap.mappings);

		for (let compiledLine = 0; compiledLine < compiledToGeneratedLines.length; compiledLine++) {
			const generatedLine = compiledToGeneratedLines[compiledLine];
			if (generatedLine < 0) continue;

			const originalLine = generatedToOriginalLineMap[generatedLine];
			if (originalLine !== undefined) {
				// compiledLine is 0-indexed here, store as 1-based
				result[compiledLine + 1] = originalLine;
			}
		}
	} catch {
		// If source map parsing fails, return empty map
	}

	return result;
}
