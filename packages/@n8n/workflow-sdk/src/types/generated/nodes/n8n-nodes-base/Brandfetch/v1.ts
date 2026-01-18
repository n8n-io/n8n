/**
 * Brandfetch Node - Version 1
 * Consume Brandfetch API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface BrandfetchV1Params {
	operation?: 'color' | 'company' | 'font' | 'industry' | 'logo' | Expression<string>;
/**
 * The domain name of the company
 */
		domain: string | Expression<string>;
/**
 * Name of the binary property to which to write the data of the read file
 * @displayOptions.show { operation: ["logo"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
	imageTypes: Array<'icon' | 'logo'>;
/**
 * The image format in which the logo should be returned as
 * @displayOptions.show { operation: ["logo"], download: [true] }
 * @default ["png"]
 */
		imageFormats: Array<'png' | 'svg'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface BrandfetchV1Credentials {
	brandfetchApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type BrandfetchV1Node = {
	type: 'n8n-nodes-base.Brandfetch';
	version: 1;
	config: NodeConfig<BrandfetchV1Params>;
	credentials?: BrandfetchV1Credentials;
};