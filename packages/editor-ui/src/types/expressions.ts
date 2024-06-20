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
