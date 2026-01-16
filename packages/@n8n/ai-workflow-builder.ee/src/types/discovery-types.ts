import type { ResourceInfo } from '../utils/resource-operation-extractor';

export interface DiscoveryContext {
	nodesFound: Array<{
		nodeName: string;
		version: number;
		reasoning: string;
		/**
		 * Parameters that affect node connections (inputs/outputs).
		 * Discovered by analyzing <input>/<output> tags in node details.
		 * Examples: mode, hasOutputParser, textSplittingMode
		 *
		 * Note: For nodes with resource/operation pattern, these may overlap
		 * with availableResources - connectionChangingParameters tells WHICH
		 * parameters matter, availableResources tells WHAT values are available.
		 */
		connectionChangingParameters: Array<{
			name: string;
			possibleValues: Array<string | boolean | number>;
		}>;
		/**
		 * Available resources and operations for nodes following the
		 * resource/operation pattern (Gmail, Notion, Google Sheets, etc.).
		 *
		 * Used by Builder to set initialParameters: { resource, operation }
		 * which then enables Configurator to filter properties correctly.
		 *
		 * Only present for nodes that follow the resource/operation pattern.
		 */
		availableResources?: ResourceInfo[];
	}>;
	bestPractices?: string;
}
