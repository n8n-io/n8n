import type { Basic, IExecutionResponse, TargetItem } from '@/Interface';
import type { IWorkflowDataProxyAdditionalKeys, Workflow } from 'n8n-workflow';

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
	envVars: Record<string, Basic>;
	additionalKeys: IWorkflowDataProxyAdditionalKeys;
	workflow: Workflow;
	execution: IExecutionResponse | null;
	nodeName: string | null;
	parameterPath?: string | null;
	/**
	 * Allowed to be null (e.g., trigger node, partial execution)
	 */
	inputNode: TargetItem | null;
}
