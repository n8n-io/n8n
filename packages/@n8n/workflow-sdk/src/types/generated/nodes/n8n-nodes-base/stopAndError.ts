/**
 * Stop and Error Node Types
 *
 * Throw an error in the workflow
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/stopanderror/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface StopAndErrorV1Params {
	/**
	 * Type of error to throw
	 * @default errorMessage
	 */
	errorType?: 'errorMessage' | 'errorObject' | Expression<string>;
	errorMessage: string | Expression<string>;
	/**
	 * Object containing error properties
	 * @displayOptions.show { errorType: ["errorObject"] }
	 */
	errorObject: IDataObject | string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type StopAndErrorV1Node = {
	type: 'n8n-nodes-base.stopAndError';
	version: 1;
	config: NodeConfig<StopAndErrorV1Params>;
	credentials?: Record<string, never>;
};

export type StopAndErrorNode = StopAndErrorV1Node;
