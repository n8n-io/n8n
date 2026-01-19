/**
 * Venafi TLS Protect Cloud Node - Version 1
 * Consume Venafi TLS Protect Cloud API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { operation: ["download"], resource: ["certificate"] }
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
 * @displayOptions.show { operation: ["getMany"], resource: ["certificate"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getMany"], resource: ["certificate"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["renew"], resource: ["certificate"] }
 */
		applicationId?: string | Expression<string>;
	existingCertificateId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["renew"], resource: ["certificate"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["certificateRequest"] }
 */
		applicationId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["certificateRequest"] }
 */
		certificateIssuingTemplateId?: string | Expression<string>;
	generateCsr?: boolean | Expression<boolean>;
/**
 * The Common Name field for the certificate Subject (CN)
 * @displayOptions.show { operation: ["create"], resource: ["certificateRequest"], generateCsr: [true] }
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
 * @displayOptions.show { operation: ["getMany"], resource: ["certificateRequest"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getMany"], resource: ["certificateRequest"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface VenafiTlsProtectCloudV1Credentials {
	venafiTlsProtectCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface VenafiTlsProtectCloudV1NodeBase {
	type: 'n8n-nodes-base.venafiTlsProtectCloud';
	version: 1;
	credentials?: VenafiTlsProtectCloudV1Credentials;
}

export type VenafiTlsProtectCloudV1CertificateDeleteNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateDeleteConfig>;
};

export type VenafiTlsProtectCloudV1CertificateDownloadNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateDownloadConfig>;
};

export type VenafiTlsProtectCloudV1CertificateGetNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateGetConfig>;
};

export type VenafiTlsProtectCloudV1CertificateGetManyNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateGetManyConfig>;
};

export type VenafiTlsProtectCloudV1CertificateRenewNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateRenewConfig>;
};

export type VenafiTlsProtectCloudV1CertificateRequestCreateNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateRequestCreateConfig>;
};

export type VenafiTlsProtectCloudV1CertificateRequestGetNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateRequestGetConfig>;
};

export type VenafiTlsProtectCloudV1CertificateRequestGetManyNode = VenafiTlsProtectCloudV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudV1CertificateRequestGetManyConfig>;
};

export type VenafiTlsProtectCloudV1Node =
	| VenafiTlsProtectCloudV1CertificateDeleteNode
	| VenafiTlsProtectCloudV1CertificateDownloadNode
	| VenafiTlsProtectCloudV1CertificateGetNode
	| VenafiTlsProtectCloudV1CertificateGetManyNode
	| VenafiTlsProtectCloudV1CertificateRenewNode
	| VenafiTlsProtectCloudV1CertificateRequestCreateNode
	| VenafiTlsProtectCloudV1CertificateRequestGetNode
	| VenafiTlsProtectCloudV1CertificateRequestGetManyNode
	;