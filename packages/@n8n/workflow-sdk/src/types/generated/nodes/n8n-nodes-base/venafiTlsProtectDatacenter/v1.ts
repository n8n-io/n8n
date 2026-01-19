/**
 * Venafi TLS Protect Datacenter Node - Version 1
 * Consume Venafi TLS Protect Datacenter
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Provision a new certificate */
export type VenafiTlsProtectDatacenterV1CertificateCreateConfig = {
	resource: 'certificate';
	operation: 'create';
/**
 * The folder DN for the new certificate. If the value is missing, the folder name is the system default. If no system default is configured
 * @displayOptions.show { operation: ["create"], resource: ["certificate"] }
 */
		PolicyDN?: string | Expression<string>;
/**
 * The Common Name field for the certificate Subject (DN)
 * @displayOptions.show { operation: ["create"], resource: ["certificate"] }
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
 * @displayOptions.show { operation: ["get", "delete"], resource: ["certificate"] }
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
 * @displayOptions.show { operation: ["download"], resource: ["certificate"] }
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
 * @displayOptions.show { operation: ["get", "delete"], resource: ["certificate"] }
 */
		certificateId: string | Expression<string>;
};

/** Retrieve many certificates */
export type VenafiTlsProtectDatacenterV1CertificateGetManyConfig = {
	resource: 'certificate';
	operation: 'getMany';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getMany"], resource: ["certificate"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getMany"], resource: ["certificate"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["renew"], resource: ["certificate"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["policy"] }
 */
		policyDn: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface VenafiTlsProtectDatacenterV1Credentials {
	venafiTlsProtectDatacenterApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface VenafiTlsProtectDatacenterV1NodeBase {
	type: 'n8n-nodes-base.venafiTlsProtectDatacenter';
	version: 1;
	credentials?: VenafiTlsProtectDatacenterV1Credentials;
}

export type VenafiTlsProtectDatacenterV1CertificateCreateNode = VenafiTlsProtectDatacenterV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectDatacenterV1CertificateCreateConfig>;
};

export type VenafiTlsProtectDatacenterV1CertificateDeleteNode = VenafiTlsProtectDatacenterV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectDatacenterV1CertificateDeleteConfig>;
};

export type VenafiTlsProtectDatacenterV1CertificateDownloadNode = VenafiTlsProtectDatacenterV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectDatacenterV1CertificateDownloadConfig>;
};

export type VenafiTlsProtectDatacenterV1CertificateGetNode = VenafiTlsProtectDatacenterV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectDatacenterV1CertificateGetConfig>;
};

export type VenafiTlsProtectDatacenterV1CertificateGetManyNode = VenafiTlsProtectDatacenterV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectDatacenterV1CertificateGetManyConfig>;
};

export type VenafiTlsProtectDatacenterV1CertificateRenewNode = VenafiTlsProtectDatacenterV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectDatacenterV1CertificateRenewConfig>;
};

export type VenafiTlsProtectDatacenterV1PolicyGetNode = VenafiTlsProtectDatacenterV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectDatacenterV1PolicyGetConfig>;
};

export type VenafiTlsProtectDatacenterV1Node =
	| VenafiTlsProtectDatacenterV1CertificateCreateNode
	| VenafiTlsProtectDatacenterV1CertificateDeleteNode
	| VenafiTlsProtectDatacenterV1CertificateDownloadNode
	| VenafiTlsProtectDatacenterV1CertificateGetNode
	| VenafiTlsProtectDatacenterV1CertificateGetManyNode
	| VenafiTlsProtectDatacenterV1CertificateRenewNode
	| VenafiTlsProtectDatacenterV1PolicyGetNode
	;