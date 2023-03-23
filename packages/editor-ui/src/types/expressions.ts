type Range = { from: number; to: number };

export type RawSegment = { text: string; token: string } & Range;

export type Segment = Plaintext | Resolvable;

export type Plaintext = { kind: 'plaintext'; plaintext: string } & Range;

export type Html = Plaintext; // for n8n parser, functionally identical to plaintext

export type Resolvable = {
	kind: 'resolvable';
	resolvable: string;
	resolved: unknown;
	error: boolean;
	fullError: Error | null;
} & Range;

export type Resolved = Resolvable;

export namespace ColoringStateEffect {
	export type Value = {
		kind?: 'plaintext' | 'resolvable';
		error?: boolean;
	} & Range;
}
