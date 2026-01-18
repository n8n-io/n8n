/**
 * QuickChart Node - Version 1
 * Create a chart via QuickChart
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface QuickChartV1Params {
/**
 * The type of chart to create
 * @default bar
 */
		chartType?: 'bar' | 'doughnut' | 'line' | 'pie' | 'polarArea' | Expression<string>;
	labelsMode?: 'manually' | 'array' | Expression<string>;
/**
 * Labels to use in the chart
 * @displayOptions.show { labelsMode: ["manually"] }
 * @default {}
 */
		labelsUi: {
		labelsValues?: Array<{
			/** Label
			 */
			label?: string | Expression<string>;
		}>;
	};
/**
 * The array of labels to be used in the chart
 * @displayOptions.show { labelsMode: ["array"] }
 */
		labelsArray: string | Expression<string>;
/**
 * Data to use for the dataset, documentation and examples &lt;a href="https://quickchart.io/documentation/chart-types/" target="_blank"&gt;here&lt;/a&gt;
 */
		data: IDataObject | string | Expression<string>;
/**
 * The binary data will be displayed in the Output panel on the right, under the Binary tab
 * @hint The name of the output field to put the binary file data in
 * @default data
 */
		output: string | Expression<string>;
	chartOptions?: Record<string, unknown>;
	datasetOptions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type QuickChartV1Node = {
	type: 'n8n-nodes-base.quickChart';
	version: 1;
	config: NodeConfig<QuickChartV1Params>;
	credentials?: Record<string, never>;
};