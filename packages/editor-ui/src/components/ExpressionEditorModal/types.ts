type Range = { from: number; to: number };

export type RawSegment = { text: string; type: string } & Range;

export type Segment = Plaintext | Resolvable;

export type Plaintext = { kind: 'plaintext'; plaintext: string } & Range;

export type Resolvable = {
	kind: 'resolvable';
	resolvable: string;
	resolved: unknown;
	error: boolean;
} & Range;

export type Resolved = Resolvable;

export namespace ColoringStateEffect {
	export type Value = {
		kind: 'plaintext' | 'resolvable';
		error: boolean;
	} & Range;
}
