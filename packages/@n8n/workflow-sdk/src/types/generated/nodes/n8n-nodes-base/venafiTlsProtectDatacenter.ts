/**
 * Venafi TLS Protect Datacenter Node Types
 *
 * Consume Venafi TLS Protect Datacenter
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/venafitlsprotectdatacenter/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Provision a new certificate */
export type VenafiTlsProtectDatacenterV1CertificateCreateConfig = {
	resource: 'certificate';
	operation: 'create';
	/**
	 * The folder DN for the new certificate. If the value is missing, the folder name is the system default. If no system default is configured
	 */
	PolicyDN?: string | Expression<string>;
	/**
	 * The Common Name field for the certificate Subject (DN)
	 */
	Subject?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a certificate */
export type VenafiTlsProtectDatacenterV1CertificateDeleteConfig = {
	resource: 'certificate';
	operation: 'delete';
	/**
	 * A GUID that uniquely identifies the certificate
	 */
	certificateId: string | Expression<string>;
};

/** Download a certificate */
export type VenafiTlsProtectDatacenterV1CertificateDownloadConfig = {
	resource: 'certificate';
	operation: 'download';
	certificateDn: string | Expression<string>;
	includePrivateKey?: boolean | Expression<boolean>;
	password: string | Expression<string>;
	/**
	 * The name of the input field containing the binary file data to be uploaded
	 * @default data
	 */
	binaryProperty: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve a certificate */
export type VenafiTlsProtectDatacenterV1CertificateGetConfig = {
	resource: 'certificate';
	operation: 'get';
	/**
	 * A GUID that uniquely identifies the certificate
	 */
	certificateId: string | Expression<string>;
};

/** Retrieve many certificates */
export type VenafiTlsProtectDatacenterV1CertificateGetManyConfig = {
	resource: 'certificate';
	operation: 'getMany';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Renew a certificate */
export type VenafiTlsProtectDatacenterV1CertificateRenewConfig = {
	resource: 'certificate';
	operation: 'renew';
	/**
	 * The Distinguished Name (DN) of the certificate to renew
	 */
	certificateDN: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve a certificate */
export type VenafiTlsProtectDatacenterV1PolicyGetConfig = {
	resource: 'policy';
	operation: 'get';
	/**
	 * The Distinguished Name (DN) of the policy folder
	 */
	policyDn: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type VenafiTlsProtectDatacenterV1Params =
	| VenafiTlsProtectDatacenterV1CertificateCreateConfig
	| VenafiTlsProtectDatacenterV1CertificateDeleteConfig
	| VenafiTlsProtectDatacenterV1CertificateDownloadConfig
	| VenafiTlsProtectDatacenterV1CertificateGetConfig
	| VenafiTlsProtectDatacenterV1CertificateGetManyConfig
	| VenafiTlsProtectDatacenterV1CertificateRenewConfig
	| VenafiTlsProtectDatacenterV1PolicyGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface VenafiTlsProtectDatacenterV1Credentials {
	venafiTlsProtectDatacenterApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type VenafiTlsProtectDatacenterNode = {
	type: 'n8n-nodes-base.venafiTlsProtectDatacenter';
	version: 1;
	config: NodeConfig<VenafiTlsProtectDatacenterV1Params>;
	credentials?: VenafiTlsProtectDatacenterV1Credentials;
};
