/**
 * AWS Certificate Manager Node - Version 1
 * Sends data to AWS Certificate Manager
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a certificate */
export type AwsCertificateManagerV1CertificateDeleteConfig = {
	resource: 'certificate';
	operation: 'delete';
/**
 * String that contains the ARN of the ACM certificate to be renewed. This must be of the form: arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012.
 * @displayOptions.show { resource: ["certificate"], operation: ["renew", "get", "delete", "getMetadata"] }
 */
		certificateArn: string | Expression<string>;
	bucketName: string | Expression<string>;
	certificateKey: string | Expression<string>;
};

/** Get a certificate */
export type AwsCertificateManagerV1CertificateGetConfig = {
	resource: 'certificate';
	operation: 'get';
/**
 * String that contains the ARN of the ACM certificate to be renewed. This must be of the form: arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012.
 * @displayOptions.show { resource: ["certificate"], operation: ["renew", "get", "delete", "getMetadata"] }
 */
		certificateArn: string | Expression<string>;
};

/** Get many certificates */
export type AwsCertificateManagerV1CertificateGetManyConfig = {
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

/** Get certificate metadata */
export type AwsCertificateManagerV1CertificateGetMetadataConfig = {
	resource: 'certificate';
	operation: 'getMetadata';
/**
 * String that contains the ARN of the ACM certificate to be renewed. This must be of the form: arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012.
 * @displayOptions.show { resource: ["certificate"], operation: ["renew", "get", "delete", "getMetadata"] }
 */
		certificateArn: string | Expression<string>;
};

/** Renew a certificate */
export type AwsCertificateManagerV1CertificateRenewConfig = {
	resource: 'certificate';
	operation: 'renew';
/**
 * String that contains the ARN of the ACM certificate to be renewed. This must be of the form: arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012.
 * @displayOptions.show { resource: ["certificate"], operation: ["renew", "get", "delete", "getMetadata"] }
 */
		certificateArn: string | Expression<string>;
};

export type AwsCertificateManagerV1Params =
	| AwsCertificateManagerV1CertificateDeleteConfig
	| AwsCertificateManagerV1CertificateGetConfig
	| AwsCertificateManagerV1CertificateGetManyConfig
	| AwsCertificateManagerV1CertificateGetMetadataConfig
	| AwsCertificateManagerV1CertificateRenewConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsCertificateManagerV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AwsCertificateManagerV1NodeBase {
	type: 'n8n-nodes-base.awsCertificateManager';
	version: 1;
	credentials?: AwsCertificateManagerV1Credentials;
}

export type AwsCertificateManagerV1CertificateDeleteNode = AwsCertificateManagerV1NodeBase & {
	config: NodeConfig<AwsCertificateManagerV1CertificateDeleteConfig>;
};

export type AwsCertificateManagerV1CertificateGetNode = AwsCertificateManagerV1NodeBase & {
	config: NodeConfig<AwsCertificateManagerV1CertificateGetConfig>;
};

export type AwsCertificateManagerV1CertificateGetManyNode = AwsCertificateManagerV1NodeBase & {
	config: NodeConfig<AwsCertificateManagerV1CertificateGetManyConfig>;
};

export type AwsCertificateManagerV1CertificateGetMetadataNode = AwsCertificateManagerV1NodeBase & {
	config: NodeConfig<AwsCertificateManagerV1CertificateGetMetadataConfig>;
};

export type AwsCertificateManagerV1CertificateRenewNode = AwsCertificateManagerV1NodeBase & {
	config: NodeConfig<AwsCertificateManagerV1CertificateRenewConfig>;
};

export type AwsCertificateManagerV1Node =
	| AwsCertificateManagerV1CertificateDeleteNode
	| AwsCertificateManagerV1CertificateGetNode
	| AwsCertificateManagerV1CertificateGetManyNode
	| AwsCertificateManagerV1CertificateGetMetadataNode
	| AwsCertificateManagerV1CertificateRenewNode
	;