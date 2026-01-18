/**
 * Bannerbear Node Types
 *
 * Consume Bannerbear API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/bannerbear/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an image */
export type BannerbearV1ImageCreateConfig = {
	resource: 'image';
	operation: 'create';
	/**
	 * The template ID you want to use. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	templateId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	modificationsUi?: Record<string, unknown>;
};

/** Get an image */
export type BannerbearV1ImageGetConfig = {
	resource: 'image';
	operation: 'get';
	/**
	 * Unique identifier for the image
	 */
	imageId: string | Expression<string>;
};

/** Get an image */
export type BannerbearV1TemplateGetConfig = {
	resource: 'template';
	operation: 'get';
	/**
	 * Unique identifier for the template
	 */
	templateId: string | Expression<string>;
};

/** Get many templates */
export type BannerbearV1TemplateGetAllConfig = {
	resource: 'template';
	operation: 'getAll';
};

export type BannerbearV1Params =
	| BannerbearV1ImageCreateConfig
	| BannerbearV1ImageGetConfig
	| BannerbearV1TemplateGetConfig
	| BannerbearV1TemplateGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface BannerbearV1Credentials {
	bannerbearApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type BannerbearV1Node = {
	type: 'n8n-nodes-base.bannerbear';
	version: 1;
	config: NodeConfig<BannerbearV1Params>;
	credentials?: BannerbearV1Credentials;
};

export type BannerbearNode = BannerbearV1Node;
