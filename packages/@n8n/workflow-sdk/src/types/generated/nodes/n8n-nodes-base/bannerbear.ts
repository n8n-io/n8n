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
	 * @displayOptions.show { resource: ["image"], operation: ["create"] }
	 */
	templateId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	modificationsUi?: {
		modificationsValues?: Array<{
			/** The name of the item you want to change. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Replacement text you want to use
			 */
			text?: string | Expression<string>;
			/** Color hex of object
			 */
			color?: string | Expression<string>;
			/** Color hex of text background
			 */
			background?: string | Expression<string>;
			/** Replacement image URL you want to use (must be publicly viewable)
			 */
			imageUrl?: string | Expression<string>;
		}>;
	};
};

/** Get an image */
export type BannerbearV1ImageGetConfig = {
	resource: 'image';
	operation: 'get';
	/**
	 * Unique identifier for the image
	 * @displayOptions.show { resource: ["image"], operation: ["get"] }
	 */
	imageId: string | Expression<string>;
};

/** Get an image */
export type BannerbearV1TemplateGetConfig = {
	resource: 'template';
	operation: 'get';
	/**
	 * Unique identifier for the template
	 * @displayOptions.show { resource: ["template"], operation: ["get"] }
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
