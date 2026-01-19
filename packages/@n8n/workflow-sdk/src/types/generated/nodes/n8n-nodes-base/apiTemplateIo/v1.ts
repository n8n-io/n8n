/**
 * APITemplate.io Node - Version 1
 * Consume the APITemplate.io API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type ApiTemplateIoV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
};

export type ApiTemplateIoV1ImageCreateConfig = {
	resource: 'image';
	operation: 'create';
/**
 * ID of the image template to use. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["image"], operation: ["create"] }
 */
		imageTemplateId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Name of the binary property to which to write the data of the read file
 * @displayOptions.show { resource: ["pdf", "image"], operation: ["create"] }
 * @default false
 */
		download?: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
	overridesJson?: IDataObject | string | Expression<string>;
	overridesUi?: {
		overrideValues?: Array<{
			/** Properties
			 * @default {}
			 */
			propertiesUi?: {
		propertyValues?: Array<{
			/** Name of the property
			 */
			key?: string | Expression<string>;
			/** Value to the property
			 */
			value?: string | Expression<string>;
		}>;
	};
		}>;
	};
	options?: Record<string, unknown>;
};

export type ApiTemplateIoV1PdfCreateConfig = {
	resource: 'pdf';
	operation: 'create';
/**
 * ID of the PDF template to use. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["pdf"], operation: ["create"] }
 */
		pdfTemplateId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Name of the binary property to which to write the data of the read file
 * @displayOptions.show { resource: ["pdf", "image"], operation: ["create"] }
 * @default false
 */
		download?: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
	propertiesJson?: IDataObject | string | Expression<string>;
	propertiesUi?: {
		propertyValues?: Array<{
			/** Name of the property
			 */
			key?: string | Expression<string>;
			/** Value to the property
			 */
			value?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ApiTemplateIoV1ImageCreateOutput = {
	download_url?: string;
	download_url_png?: string;
	status?: string;
	template_id?: string;
	transaction_ref?: string;
};

export type ApiTemplateIoV1PdfCreateOutput = {
	download_url?: string;
	status?: string;
	template_id?: string;
	transaction_ref?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ApiTemplateIoV1Credentials {
	apiTemplateIoApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ApiTemplateIoV1NodeBase {
	type: 'n8n-nodes-base.apiTemplateIo';
	version: 1;
	credentials?: ApiTemplateIoV1Credentials;
}

export type ApiTemplateIoV1AccountGetNode = ApiTemplateIoV1NodeBase & {
	config: NodeConfig<ApiTemplateIoV1AccountGetConfig>;
};

export type ApiTemplateIoV1ImageCreateNode = ApiTemplateIoV1NodeBase & {
	config: NodeConfig<ApiTemplateIoV1ImageCreateConfig>;
	output?: ApiTemplateIoV1ImageCreateOutput;
};

export type ApiTemplateIoV1PdfCreateNode = ApiTemplateIoV1NodeBase & {
	config: NodeConfig<ApiTemplateIoV1PdfCreateConfig>;
	output?: ApiTemplateIoV1PdfCreateOutput;
};

export type ApiTemplateIoV1Node =
	| ApiTemplateIoV1AccountGetNode
	| ApiTemplateIoV1ImageCreateNode
	| ApiTemplateIoV1PdfCreateNode
	;