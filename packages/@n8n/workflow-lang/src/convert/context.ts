/**
 * The interface between the converter driver and the lowering of one node.
 */
import type { CredentialDerivation, CredentialMint } from '../node-compile/specialise.ts';
import type { NodeSources } from '../node-compile/convert.ts';
import type { Code, Writer } from './code.ts';
import type { ExpressionScope, TranslatedValue, TranslateOptions } from './expression.ts';
import type { N8nNode, N8nWorkflow } from './types.ts';

/** Stops the lowering of a node. The driver reports it as an error diagnostic. */
export class NodeFailure extends Error {
	readonly code: string;

	readonly parameter?: string;

	readonly feature?: string;

	constructor(code: string, message: string, parameter?: string, feature?: string) {
		super(message);
		this.code = code;
		this.parameter = parameter;
		this.feature = feature;
	}
}

export interface NodeContext {
	node: N8nNode;
	parameters: Record<string, unknown>;
	version: number;
	w: Writer;
	/** Code of the list on input 0 (an identifier). */
	input: string;
	/** Code of the list on each input index. */
	inputs: string[];
	/** Declares the name of output `index`. `suffix` names an output of several. */
	output(index: number, suffix?: string): string;
	/** Translates a parameter value; failed expressions keep their raw text. */
	translate(value: unknown, path: string, options?: TranslateOptions): TranslatedValue;
	/** Translates a parameter value and fails the node when an expression does not translate. */
	compiled(value: unknown, path: string, options?: TranslateOptions): TranslatedValue;
	/** Prints a code tree at the current indentation; `prefix` is the text before it on the line. */
	print(code: Code, prefix?: string): string;
	helper(name: string): void;
	warn(code: string, message: string, parameter?: string): void;
	info(code: string, message: string, parameter?: string): void;
	/**
	 * The credential slot of the node, or undefined. `type` picks one of several
	 * credentials. `of` asks for another node, such as an AI sub-node.
	 */
	credential(type?: string, of?: N8nNode): string | undefined;
	/** The workflow (or sub-workflow) that holds the node. */
	workflow: N8nWorkflow;
	/** The workflow JSON of a workflow id (`ConvertOptions.resolveWorkflow`), when the caller gives one. */
	resolveWorkflow?: (id: string) => unknown;
	/** The credential slot of another node (an AI sub-node), or undefined. */
	credentialOf(node: N8nNode): string | undefined;
	/** `retry: { … }` for the node settings, or null. */
	retry(): Code | null;
	scope: ExpressionScope;
	/** Records that the node runs in the fallback host. */
	markFallback(): void;
	/** Records that the node runs as code that is compiled from its source. */
	markCompiled?(): void;
	/** True when the source traces every node (`trace: 'all'`), sub-nodes of AI clusters too. */
	traceAll?: boolean;
	/** Code of a condition under which the node gives no output at all (v1 run data has none). */
	noOutputWhen?(condition: string): void;
	/** Code of a condition under which v1 does not run the node at all (no run data). */
	notRunWhen?(condition: string): void;
	/** `host` keeps JavaScript Code nodes in the fallback host (`ConvertOptions.codeNodes`). */
	codeNodes?: 'native' | 'host';
	/** The n8n instance (`ConvertOptions.instance`), when the caller gives it. */
	instance?: { baseUrl: string; id: string };
	/** Sources of nodes for the node compiler (`ConvertOptions.nodeSources`). */
	nodeSources?: NodeSources;
	/** Adds a module that the node compiler made to the result (`ConvertResult.nodes`). */
	addNode?(file: string, source: string): void;
	/**
	 * Records values that node code computes from the fields of a credential, for a credential
	 * slot (`ConvertResult.credentialDerivations`).
	 */
	addCredentialDerivations?(slot: string, derivations: CredentialDerivation[]): void;
	/**
	 * Records tokens that n8n makes from a credential, for a credential slot
	 * (`ConvertResult.credentialMints`).
	 */
	addCredentialMints?(slot: string, mints: CredentialMint[]): void;
	/** False when the runtime does not run `ctx.service` effects (`ConvertOptions.services`). */
	services?: boolean;
	/** Records a time zone that the node's native code formats dates in (META \`zones\`). */
	useZone?(zone: string): void;
	/** True when output `index` of the node has a connection. */
	connected(index: number): boolean;
	/** Names of the nodes that run before this one, which a code step may read. */
	ranBefore(name: string): string | null;
	/** True in the engine shape: the node is a function that can run more than once. */
	engine: boolean;
	/** Code of the run index of the node (`$runIndex`). */
	runIndex: string;
	/** The variable of the node context (v1 `getContext('node')`), kept across runs. */
	state(): string;
	/** A unique local name that starts with the node name and `suffix`. */
	local(suffix: string): string;
	/** The callee of an Execute Workflow node. */
	subWorkflow(): SubWorkflowCall;
}

/** How an Execute Workflow node reaches its callee. */
export type SubWorkflowCall =
	| { kind: 'function'; fn: string; workflowName: string }
	| { kind: 'host'; reason: string };

export type Lowerer = (c: NodeContext) => void;
