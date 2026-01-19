/**
 * Bannerbear Node - Version 1
 * Consume Bannerbear API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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


// ===========================================================================
// Output Types
// ===========================================================================

export type BannerbearV1ImageCreateOutput = {
	created_at?: string;
	height?: number;
	modifications?: Array<{
		name?: string;
	}>;
	pdf_url?: null;
	pdf_url_compressed?: null;
	render_pdf?: boolean;
	self?: string;
	status?: string;
	template?: string;
	template_name?: string;
	template_version?: null;
	transparent?: boolean;
	uid?: string;
	webhook_response_code?: null;
	webhook_url?: null;
	width?: number;
};

export type BannerbearV1ImageGetOutput = {
	created_at?: string;
	height?: number;
	metadata?: null;
	modifications?: Array<{
		name?: string;
	}>;
	pdf_url?: null;
	pdf_url_compressed?: null;
	render_pdf?: boolean;
	self?: string;
	status?: string;
	template?: string;
	template_name?: string;
	template_version?: null;
	transparent?: boolean;
	uid?: string;
	webhook_response_code?: null;
	webhook_url?: null;
	width?: number;
};

export type BannerbearV1TemplateGetOutput = {
	available_modifications?: Array<{
		background?: null;
		color?: null;
		image_url?: null;
		name?: string;
		text?: null;
	}>;
	created_at?: string;
	height?: number;
	metadata?: null;
	name?: string;
	preview_url?: string;
	self?: string;
	uid?: string;
	updated_at?: string;
	width?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface BannerbearV1Credentials {
	bannerbearApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface BannerbearV1NodeBase {
	type: 'n8n-nodes-base.bannerbear';
	version: 1;
	credentials?: BannerbearV1Credentials;
}

export type BannerbearV1ImageCreateNode = BannerbearV1NodeBase & {
	config: NodeConfig<BannerbearV1ImageCreateConfig>;
	output?: BannerbearV1ImageCreateOutput;
};

export type BannerbearV1ImageGetNode = BannerbearV1NodeBase & {
	config: NodeConfig<BannerbearV1ImageGetConfig>;
	output?: BannerbearV1ImageGetOutput;
};

export type BannerbearV1TemplateGetNode = BannerbearV1NodeBase & {
	config: NodeConfig<BannerbearV1TemplateGetConfig>;
	output?: BannerbearV1TemplateGetOutput;
};

export type BannerbearV1TemplateGetAllNode = BannerbearV1NodeBase & {
	config: NodeConfig<BannerbearV1TemplateGetAllConfig>;
};

export type BannerbearV1Node =
	| BannerbearV1ImageCreateNode
	| BannerbearV1ImageGetNode
	| BannerbearV1TemplateGetNode
	| BannerbearV1TemplateGetAllNode
	;