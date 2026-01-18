/**
 * Venafi TLS Protect Cloud Node Types
 *
 * Consume Venafi TLS Protect Cloud API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/venafitlsprotectcloud/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a certificate */
export type VenafiTlsProtectCloudV1CertificateDeleteConfig = {
	resource: 'certificate';
	operation: 'delete';
	certificateId: string | Expression<string>;
};

/** Download a certificate */
export type VenafiTlsProtectCloudV1CertificateDownloadConfig = {
	resource: 'certificate';
	operation: 'download';
	certificateId: string | Expression<string>;
	downloadItem?: 'certificate' | 'keystore' | Expression<string>;
	keystoreType?: 'JKS' | 'PKCS12' | 'PEM' | Expression<string>;
	certificateLabel: string | Expression<string>;
	privateKeyPassphrase: string | Expression<string>;
	keystorePassphrase: string | Expression<string>;
	/**
	 * The name of the input field containing the binary file data to be uploaded
	 * @default data
	 */
	binaryProperty: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve a certificate */
export type VenafiTlsProtectCloudV1CertificateGetConfig = {
	resource: 'certificate';
	operation: 'get';
	certificateId: string | Expression<string>;
};

/** Retrieve many certificates */
export type VenafiTlsProtectCloudV1CertificateGetManyConfig = {
	resource: 'certificate';
	operation: 'getMany';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Renew a certificate */
export type VenafiTlsProtectCloudV1CertificateRenewConfig = {
	resource: 'certificate';
	operation: 'renew';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	applicationId?: string | Expression<string>;
	existingCertificateId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	certificateIssuingTemplateId?: string | Expression<string>;
	certificateSigningRequest?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a new certificate request */
export type VenafiTlsProtectCloudV1CertificateRequestCreateConfig = {
	resource: 'certificateRequest';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	applicationId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	certificateIssuingTemplateId?: string | Expression<string>;
	generateCsr?: boolean | Expression<boolean>;
	/**
	 * The Common Name field for the certificate Subject (CN)
	 * @default n8n.io
	 */
	commonName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	certificateSigningRequest?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve a certificate */
export type VenafiTlsProtectCloudV1CertificateRequestGetConfig = {
	resource: 'certificateRequest';
	operation: 'get';
	certificateRequestId: string | Expression<string>;
};

/** Retrieve many certificates */
export type VenafiTlsProtectCloudV1CertificateRequestGetManyConfig = {
	resource: 'certificateRequest';
	operation: 'getMany';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

export type VenafiTlsProtectCloudV1Params =
	| VenafiTlsProtectCloudV1CertificateDeleteConfig
	| VenafiTlsProtectCloudV1CertificateDownloadConfig
	| VenafiTlsProtectCloudV1CertificateGetConfig
	| VenafiTlsProtectCloudV1CertificateGetManyConfig
	| VenafiTlsProtectCloudV1CertificateRenewConfig
	| VenafiTlsProtectCloudV1CertificateRequestCreateConfig
	| VenafiTlsProtectCloudV1CertificateRequestGetConfig
	| VenafiTlsProtectCloudV1CertificateRequestGetManyConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface VenafiTlsProtectCloudV1Credentials {
	venafiTlsProtectCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type VenafiTlsProtectCloudV1Node = {
	type: 'n8n-nodes-base.venafiTlsProtectCloud';
	version: 1;
	config: NodeConfig<VenafiTlsProtectCloudV1Params>;
	credentials?: VenafiTlsProtectCloudV1Credentials;
};

export type VenafiTlsProtectCloudNode = VenafiTlsProtectCloudV1Node;
