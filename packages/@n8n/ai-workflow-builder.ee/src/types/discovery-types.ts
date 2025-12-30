/**
 * Available operation for a resource
 */
export interface DiscoveryOperationInfo {
	value: string;
	displayName: string;
}

/**
 * Available resource with its operations
 */
export interface DiscoveryResourceInfo {
	value: string;
	displayName: string;
	operations: DiscoveryOperationInfo[];
}

export interface DiscoveryContext {
	nodesFound: Array<{
		nodeName: string;
		version: number;
		reasoning: string;
		connectionChangingParameters: Array<{
			name: string;
			possibleValues: Array<string | boolean | number>;
		}>;
		/**
		 * Available resources and operations for this node version.
		 * Only present for nodes that follow the resource/operation pattern.
		 */
		availableResources?: DiscoveryResourceInfo[];
	}>;
	bestPractices?: string;
}
