/**
 * Cortex Node - Version 1
 * Apply the Cortex analyzer/responder on the given entity
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Execute Analyzer */
export type CortexV1AnalyzerExecuteConfig = {
	resource: 'analyzer';
	operation: 'execute';
/**
 * Choose the analyzer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["analyzer"], operation: ["execute"] }
 */
		analyzer: string | Expression<string>;
/**
 * Choose the observable type. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["analyzer"], operation: ["execute"] }
 * @displayOptions.hide { analyzer: [""] }
 */
		observableType: string | Expression<string>;
/**
 * Enter the observable value
 * @displayOptions.show { resource: ["analyzer"], operation: ["execute"] }
 * @displayOptions.hide { observableType: ["file"], analyzer: [""] }
 */
		observableValue: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
/**
 * The TLP of the analyzed observable
 * @displayOptions.show { resource: ["analyzer"], operation: ["execute"] }
 * @displayOptions.hide { observableType: [""], analyzer: [""] }
 * @default 2
 */
		tlp?: 0 | 1 | 2 | 3 | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get job details */
export type CortexV1JobGetConfig = {
	resource: 'job';
	operation: 'get';
/**
 * ID of the job
 * @displayOptions.show { resource: ["job"], operation: ["get", "report"] }
 */
		jobId: string | Expression<string>;
};

/** Get job report */
export type CortexV1JobReportConfig = {
	resource: 'job';
	operation: 'report';
/**
 * ID of the job
 * @displayOptions.show { resource: ["job"], operation: ["get", "report"] }
 */
		jobId: string | Expression<string>;
};

/** Execute Analyzer */
export type CortexV1ResponderExecuteConfig = {
	resource: 'responder';
	operation: 'execute';
/**
 * Choose the responder. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["responder"] }
 */
		responder: string | Expression<string>;
/**
 * Choose the Data type. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["responder"] }
 */
		entityType: string | Expression<string>;
/**
 * Choose between providing JSON object or seperated attributes
 * @displayOptions.show { resource: ["responder"] }
 * @default false
 */
		jsonObject?: boolean | Expression<boolean>;
	objectData: string | Expression<string>;
	parameters?: string | Expression<string>;
};

export type CortexV1Params =
	| CortexV1AnalyzerExecuteConfig
	| CortexV1JobGetConfig
	| CortexV1JobReportConfig
	| CortexV1ResponderExecuteConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CortexV1Credentials {
	cortexApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CortexV1Node = {
	type: 'n8n-nodes-base.cortex';
	version: 1;
	config: NodeConfig<CortexV1Params>;
	credentials?: CortexV1Credentials;
};