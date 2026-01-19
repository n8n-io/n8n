/**
 * Stop and Error Node - Version 1
 * Throw an error in the workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface StopAndErrorV1Config {
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

interface StopAndErrorV1NodeBase {
	type: 'n8n-nodes-base.stopAndError';
	version: 1;
}

export type StopAndErrorV1Node = StopAndErrorV1NodeBase & {
	config: NodeConfig<StopAndErrorV1Config>;
};

export type StopAndErrorV1Node = StopAndErrorV1Node;