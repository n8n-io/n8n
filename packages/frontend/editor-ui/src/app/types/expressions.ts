import type { IWorkflowDataProxyAdditionalKeys } from 'n8n-workflow';

type Range = { from: number; to: number };

export type RawSegment = { text: string; token: string } & Range;

export type Segment = Plaintext | Resolvable;

export type Plaintext = { kind: 'plaintext'; plaintext: string } & Range;

export type Html = Plaintext; // for n8n parser, functionally identical to plaintext

export type ResolvableState = 'valid' | 'invalid' | 'pending';

/** Expression X-Ray result: why a property path failed, and the likely fix */
export interface ExpressionDiagnosis {
	message: string;
	/** full replacement expression, e.g. `{{ $json.user_email }}` */
	suggestion?: string;
	/** just the part that changes, for compact display (e.g. `user_email`) */
	suggestionLabel?: string;
}

export type Resolvable = {
	kind: 'resolvable';
	resolvable: string;
	resolved: unknown;
	state: ResolvableState;
	error: Error | null;
	fullError?: Error;
	diagnosis?: ExpressionDiagnosis;
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
	additionalKeys: IWorkflowDataProxyAdditionalKeys;
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
