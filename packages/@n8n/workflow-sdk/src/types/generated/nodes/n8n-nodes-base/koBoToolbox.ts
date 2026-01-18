/**
 * KoBoToolbox Node Types
 *
 * Work with KoBoToolbox forms and submissions
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/kobotoolbox/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a file */
export type KoBoToolboxV1FileCreateConfig = {
	resource: 'file';
	operation: 'create';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	fileMode: 'binary' | 'url' | Expression<string>;
	/**
	 * Name of the binary property containing the file to upload. Supported types: image, audio, video, csv, xml, zip.
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * HTTP(s) link to the file to upload
	 */
	fileUrl: string | Expression<string>;
};

/** Delete a single submission */
export type KoBoToolboxV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Uid of the file (should start with "af" e.g. "afQoJxA4kmKEXVpkH6SYbhb"
	 */
	fileId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Uid of the file (should start with "af" e.g. "afQoJxA4kmKEXVpkH6SYbhb"
	 */
	fileId: string | Expression<string>;
	/**
	 * Name of the binary property to write the file into
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Whether to download the file content into a binary property
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
	 */
	formId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1FormGetConfig = {
	resource: 'form';
	operation: 'get';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
};

/** Get many forms */
export type KoBoToolboxV1FormGetAllConfig = {
	resource: 'form';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	formId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1HookGetConfig = {
	resource: 'hook';
	operation: 'get';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
	 */
	hookId: string | Expression<string>;
};

/** Get many forms */
export type KoBoToolboxV1HookGetAllConfig = {
	resource: 'hook';
	operation: 'getAll';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	formId: string | Expression<string>;
	/**
	 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
	 */
	hookId: string | Expression<string>;
	/**
	 * Only retrieve logs with a specific status
	 */
	status?: '' | '0' | '1' | '2' | Expression<string>;
	/**
	 * Minimum date for the hook log to retrieve
	 */
	startDate?: string | Expression<string>;
	/**
	 * Maximum date for the hook log to retrieve
	 */
	endDate?: string | Expression<string>;
};

/** Retry all failed attempts for a given hook */
export type KoBoToolboxV1HookRetryAllConfig = {
	resource: 'hook';
	operation: 'retryAll';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
	 */
	hookId: string | Expression<string>;
};

/** Retry a specific hook */
export type KoBoToolboxV1HookRetryOneConfig = {
	resource: 'hook';
	operation: 'retryOne';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)
	 */
	hookId: string | Expression<string>;
	/**
	 * Hook log ID (starts with hl, e.g. hlSbGKaUKzTVNoWEVMYbLHe)
	 */
	logId: string | Expression<string>;
};

/** Delete a single submission */
export type KoBoToolboxV1SubmissionDeleteConfig = {
	resource: 'submission';
	operation: 'delete';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Submission ID (number, e.g. 245128)
	 */
	submissionId: string | Expression<string>;
};

/** Get a form */
export type KoBoToolboxV1SubmissionGetConfig = {
	resource: 'submission';
	operation: 'get';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Submission ID (number, e.g. 245128)
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
	 */
	formId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	formId: string | Expression<string>;
	/**
	 * Submission ID (number, e.g. 245128)
	 */
	submissionId: string | Expression<string>;
};

/** Set the validation status of the submission */
export type KoBoToolboxV1SubmissionSetValidationConfig = {
	resource: 'submission';
	operation: 'setValidation';
	/**
	 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	/**
	 * Submission ID (number, e.g. 245128)
	 */
	submissionId: string | Expression<string>;
	/**
	 * Desired Validation Status
	 */
	validationStatus:
		| 'validation_status_approved'
		| 'validation_status_not_approved'
		| 'validation_status_on_hold'
		| Expression<string>;
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
	| KoBoToolboxV1SubmissionSetValidationConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface KoBoToolboxV1Credentials {
	koBoToolboxApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type KoBoToolboxV1Node = {
	type: 'n8n-nodes-base.koBoToolbox';
	version: 1;
	config: NodeConfig<KoBoToolboxV1Params>;
	credentials?: KoBoToolboxV1Credentials;
};

export type KoBoToolboxNode = KoBoToolboxV1Node;
