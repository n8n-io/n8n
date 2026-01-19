/**
 * KoBoToolbox Node - Version 1
 * Work with KoBoToolbox forms and submissions
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a file */
export type KoBoToolboxV1FileCreateConfig = {
	resource: 'file';
	operation: 'create';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["file"] }
 */
		formId: string | Expression<string>;
	fileMode: 'binary' | 'url' | Expression<string>;
/**
 * Name of the binary property containing the file to upload. Supported types: image, audio, video, csv, xml, zip.
 * @displayOptions.show { resource: ["file"], operation: ["create"], fileMode: ["binary"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * HTTP(s) link to the file to upload
 * @displayOptions.show { resource: ["file"], operation: ["create"], fileMode: ["url"] }
 */
		fileUrl: string | Expression<string>;
};

/** Delete a single submission */
export type KoBoToolboxV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["file"] }
 */
		formId: string | Expression<string>;
/**
 * Uid of the file (should start with "af" e.g. "afQoJxA4kmKEXVpkH6SYbhb"
 * @displayOptions.show { resource: ["file"], operation: ["delete", "get"] }
 */
		fileId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["file"] }
 */
		formId: string | Expression<string>;
/**
 * Uid of the file (should start with "af" e.g. "afQoJxA4kmKEXVpkH6SYbhb"
 * @displayOptions.show { resource: ["file"], operation: ["delete", "get"] }
 */
		fileId: string | Expression<string>;
/**
 * Name of the binary property to write the file into
 * @displayOptions.show { resource: ["file"], operation: ["get"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Whether to download the file content into a binary property
 * @displayOptions.show { resource: ["file"], operation: ["get"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
};

/** Get many forms */
export type KoBoToolboxV1FileGetAllConfig = {
	resource: 'file';
	operation: 'getAll';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["file"] }
 */
		formId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1FormGetConfig = {
	resource: 'form';
	operation: 'get';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["form"], operation: ["get", "redeploy"] }
 */
		formId: string | Expression<string>;
};

/** Get many forms */
export type KoBoToolboxV1FormGetAllConfig = {
	resource: 'form';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["form"], operation: ["getAll"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["form"], operation: ["getAll"], returnAll: [false] }
 * @default 1000
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
	filters?: Record<string, unknown>;
};

/** Redeploy Current Form Version */
export type KoBoToolboxV1FormRedeployConfig = {
	resource: 'form';
	operation: 'redeploy';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["form"], operation: ["get", "redeploy"] }
 */
		formId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1HookGetConfig = {
	resource: 'hook';
	operation: 'get';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs"] }
 */
		hookId: string | Expression<string>;
};

/** Get many forms */
export type KoBoToolboxV1HookGetAllConfig = {
	resource: 'hook';
	operation: 'getAll';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["hook"], operation: ["getAll"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["hook"], operation: ["getAll"], returnAll: [false] }
 * @default 1000
 */
		limit?: number | Expression<number>;
};

/** Get hook logs */
export type KoBoToolboxV1HookGetLogsConfig = {
	resource: 'hook';
	operation: 'getLogs';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs"] }
 */
		hookId: string | Expression<string>;
/**
 * Only retrieve logs with a specific status
 * @displayOptions.show { resource: ["hook"], operation: ["getLogs"] }
 */
		status?: '' | '0' | '1' | '2' | Expression<string>;
/**
 * Minimum date for the hook log to retrieve
 * @displayOptions.show { resource: ["hook"], operation: ["getLogs"] }
 */
		startDate?: string | Expression<string>;
/**
 * Maximum date for the hook log to retrieve
 * @displayOptions.show { resource: ["hook"], operation: ["getLogs"] }
 */
		endDate?: string | Expression<string>;
};

/** Retry all failed attempts for a given hook */
export type KoBoToolboxV1HookRetryAllConfig = {
	resource: 'hook';
	operation: 'retryAll';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs"] }
 */
		hookId: string | Expression<string>;
};

/** Retry a specific hook */
export type KoBoToolboxV1HookRetryOneConfig = {
	resource: 'hook';
	operation: 'retryOne';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
 * @displayOptions.show { resource: ["hook"], operation: ["get", "retryOne", "retryAll", "getLogs"] }
 */
		hookId: string | Expression<string>;
/**
 * Hook log ID (starts with hl, e.g. hlSbGKaUKzTVNoWEVMYbLHe)
 * @displayOptions.show { resource: ["hook"], operation: ["retryOne"] }
 */
		logId: string | Expression<string>;
};

/** Delete a single submission */
export type KoBoToolboxV1SubmissionDeleteConfig = {
	resource: 'submission';
	operation: 'delete';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Submission ID (number, e.g. 245128)
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation"] }
 */
		submissionId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1SubmissionGetConfig = {
	resource: 'submission';
	operation: 'get';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Submission ID (number, e.g. 245128)
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation"] }
 */
		submissionId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many forms */
export type KoBoToolboxV1SubmissionGetAllConfig = {
	resource: 'submission';
	operation: 'getAll';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["submission"], operation: ["getAll"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["submission"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filterType?: 'none' | 'json' | Expression<string>;
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get the validation status for the submission */
export type KoBoToolboxV1SubmissionGetValidationConfig = {
	resource: 'submission';
	operation: 'getValidation';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Submission ID (number, e.g. 245128)
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation"] }
 */
		submissionId: string | Expression<string>;
};

/** Set the validation status of the submission */
export type KoBoToolboxV1SubmissionSetValidationConfig = {
	resource: 'submission';
	operation: 'setValidation';
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation", "getAll"] }
 */
		formId: string | Expression<string>;
/**
 * Submission ID (number, e.g. 245128)
 * @displayOptions.show { resource: ["submission"], operation: ["get", "delete", "getValidation", "setValidation"] }
 */
		submissionId: string | Expression<string>;
/**
 * Desired Validation Status
 * @displayOptions.show { resource: ["submission"], operation: ["setValidation"] }
 */
		validationStatus: 'validation_status_approved' | 'validation_status_not_approved' | 'validation_status_on_hold' | Expression<string>;
};

export type KoBoToolboxV1Params =
	| KoBoToolboxV1FileCreateConfig
	| KoBoToolboxV1FileDeleteConfig
	| KoBoToolboxV1FileGetConfig
	| KoBoToolboxV1FileGetAllConfig
	| KoBoToolboxV1FormGetConfig
	| KoBoToolboxV1FormGetAllConfig
	| KoBoToolboxV1FormRedeployConfig
	| KoBoToolboxV1HookGetConfig
	| KoBoToolboxV1HookGetAllConfig
	| KoBoToolboxV1HookGetLogsConfig
	| KoBoToolboxV1HookRetryAllConfig
	| KoBoToolboxV1HookRetryOneConfig
	| KoBoToolboxV1SubmissionDeleteConfig
	| KoBoToolboxV1SubmissionGetConfig
	| KoBoToolboxV1SubmissionGetAllConfig
	| KoBoToolboxV1SubmissionGetValidationConfig
	| KoBoToolboxV1SubmissionSetValidationConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type KoBoToolboxV1SubmissionGetAllOutput = {
	__version__?: string;
	_attachments?: Array<{
		download_large_url?: string;
		download_medium_url?: string;
		download_small_url?: string;
		download_url?: string;
		filename?: string;
		id?: number;
		instance?: number;
		mimetype?: string;
		question_xpath?: string;
		xform?: number;
	}>;
	_id?: number;
	_status?: string;
	_submission_time?: string;
	_uuid?: string;
	_validation_status?: {
		by_whom?: string;
		color?: string;
		label?: string;
		timestamp?: number;
		uid?: string;
	};
	_xform_id_string?: string;
	description?: string;
	deviceid?: string;
	end?: string;
	'formhub/uuid'?: string;
	gps_note?: string;
	infra_categ?: string;
	infra_subtype?: string;
	location?: string;
	'meta/instanceID'?: string;
	personal_QR_code?: string;
	pic1?: string;
	pic2?: string;
	q2nd_pic?: string;
	start?: string;
	today?: string;
	username?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface KoBoToolboxV1Credentials {
	koBoToolboxApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface KoBoToolboxV1NodeBase {
	type: 'n8n-nodes-base.koBoToolbox';
	version: 1;
	credentials?: KoBoToolboxV1Credentials;
}

export type KoBoToolboxV1FileCreateNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1FileCreateConfig>;
};

export type KoBoToolboxV1FileDeleteNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1FileDeleteConfig>;
};

export type KoBoToolboxV1FileGetNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1FileGetConfig>;
};

export type KoBoToolboxV1FileGetAllNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1FileGetAllConfig>;
};

export type KoBoToolboxV1FormGetNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1FormGetConfig>;
};

export type KoBoToolboxV1FormGetAllNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1FormGetAllConfig>;
};

export type KoBoToolboxV1FormRedeployNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1FormRedeployConfig>;
};

export type KoBoToolboxV1HookGetNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1HookGetConfig>;
};

export type KoBoToolboxV1HookGetAllNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1HookGetAllConfig>;
};

export type KoBoToolboxV1HookGetLogsNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1HookGetLogsConfig>;
};

export type KoBoToolboxV1HookRetryAllNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1HookRetryAllConfig>;
};

export type KoBoToolboxV1HookRetryOneNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1HookRetryOneConfig>;
};

export type KoBoToolboxV1SubmissionDeleteNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1SubmissionDeleteConfig>;
};

export type KoBoToolboxV1SubmissionGetNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1SubmissionGetConfig>;
};

export type KoBoToolboxV1SubmissionGetAllNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1SubmissionGetAllConfig>;
	output?: KoBoToolboxV1SubmissionGetAllOutput;
};

export type KoBoToolboxV1SubmissionGetValidationNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1SubmissionGetValidationConfig>;
};

export type KoBoToolboxV1SubmissionSetValidationNode = KoBoToolboxV1NodeBase & {
	config: NodeConfig<KoBoToolboxV1SubmissionSetValidationConfig>;
};

export type KoBoToolboxV1Node =
	| KoBoToolboxV1FileCreateNode
	| KoBoToolboxV1FileDeleteNode
	| KoBoToolboxV1FileGetNode
	| KoBoToolboxV1FileGetAllNode
	| KoBoToolboxV1FormGetNode
	| KoBoToolboxV1FormGetAllNode
	| KoBoToolboxV1FormRedeployNode
	| KoBoToolboxV1HookGetNode
	| KoBoToolboxV1HookGetAllNode
	| KoBoToolboxV1HookGetLogsNode
	| KoBoToolboxV1HookRetryAllNode
	| KoBoToolboxV1HookRetryOneNode
	| KoBoToolboxV1SubmissionDeleteNode
	| KoBoToolboxV1SubmissionGetNode
	| KoBoToolboxV1SubmissionGetAllNode
	| KoBoToolboxV1SubmissionGetValidationNode
	| KoBoToolboxV1SubmissionSetValidationNode
	;