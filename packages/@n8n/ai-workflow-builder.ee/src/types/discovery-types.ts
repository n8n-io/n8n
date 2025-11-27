export interface DiscoveryContext {
	nodesFound: Array<{
		nodeName: string;
		version: number;
		reasoning: string;
		connectionChangingParameters: Array<{
			name: string;
			possibleValues: Array<string | boolean | number>;
		}>;
	}>;
	bestPractices?: string;
}
