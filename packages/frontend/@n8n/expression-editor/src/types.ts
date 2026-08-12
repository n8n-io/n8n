import type { CompletionSource } from '@codemirror/autocomplete';

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

/** What one `{{ … }}` evaluated to, or why it could not. */
export interface ExpressionResolution {
	resolved: unknown;
	error: boolean;
	fullError: Error | null;
}

/**
 * How a host evaluates expressions. The editor knows how to find resolvables,
 * colour them and show their results; what a name means is the host's.
 */
export interface ExpressionResolver {
	/** One resolvable, braces included. Reports failure rather than throwing. */
	resolve: (resolvable: string) => ExpressionResolution | Promise<ExpressionResolution>;
	/** Re-resolve every segment when this changes. */
	watchImmediate?: () => unknown;
	/** Re-resolve every segment, debounced, when this changes. */
	watchDebounced?: () => unknown;
}

/**
 * What a host offers inside `{{ }}`. `n8nLang` scopes each source to the
 * `Resolvable` node, so a source never fires in surrounding plaintext.
 */
export type ExpressionCompletionSource = CompletionSource;
