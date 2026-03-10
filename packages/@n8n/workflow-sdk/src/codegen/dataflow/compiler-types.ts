export interface CompilerTestEntry {
	title: string;
	dirName: string;
	skip?: string;
	inputCode: string;
	parsedJson?: string;
	reGeneratedCode?: string;
	roundTripStatus: 'pass' | 'error' | 'skip';
	roundTripError?: string;
	codeMatch?: boolean;
	nodeCount?: number;
	connectionCount?: number;
	validationErrors?: string[];
}
