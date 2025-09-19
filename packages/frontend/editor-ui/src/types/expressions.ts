import type { Basic, IExecutionResponse } from '@/Interface';
import type { IConnections, IWorkflowDataProxyAdditionalKeys, Workflow } from 'n8n-workflow';

type Range = { from: number; to: number };

export type RawSegment = { text: string; token: string } & Range;

export type Segment = Plaintext | Resolvable;

export type Plaintext = { kind: 'plaintext'; plaintext: string } & Range;

export type Html = Plaintext; // for n8n parser, functionally identical to plaintext

export type ResolvableState = 'valid' | 'invalid' | 'pending';

export type Resolvable = {
	kind: 'resolvable';
	resolvable: string;
	resolved: unknown;
	state: ResolvableState;
	error: Error | null;
	fullError?: Error;
} & Range;

export type Resolved = Resolvable;

export namespace ColoringStateEffect {
	export type Value = {
		kind?: 'plaintext' | 'resolvable';
		state?: ResolvableState;
	} & Range;
}

/**
 * Collection of data, intended to be sufficient for resolving expressions
 * in parameter name/value without referencing global state
 */
export interface ExpressionLocalResolveContext {
	localResolve: true;
	envVars: Record<string, Basic>;
	additionalKeys: IWorkflowDataProxyAdditionalKeys;
	workflow: Workflow;
	connections: IConnections;
	execution: IExecutionResponse | null;
	nodeName: string;
	/**
	 * Allowed to be undefined (e.g., trigger node, partial execution)
	 */
	inputNode?: {
		name: string;
		runIndex: number;
		branchIndex: number;
	};
}
