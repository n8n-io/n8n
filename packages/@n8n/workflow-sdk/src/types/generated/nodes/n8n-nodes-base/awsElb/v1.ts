/**
 * AWS ELB Node - Version 1
 * Sends data to AWS ELB API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Add the specified SSL server certificate to the certificate list for the specified HTTPS or TLS listener */
export type AwsElbV1ListenerCertificateAddConfig = {
	resource: 'listenerCertificate';
	operation: 'add';
/**
 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["add"] }
 */
		loadBalancerId: string | Expression<string>;
/**
 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["add"] }
 */
		listenerId: string | Expression<string>;
/**
 * Unique identifier for a particular loadBalancer
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["add"] }
 */
		certificateId: string | Expression<string>;
};

/** Get many load balancers */
export type AwsElbV1ListenerCertificateGetManyConfig = {
	resource: 'listenerCertificate';
	operation: 'getMany';
/**
 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["getMany"] }
 */
		loadBalancerId: string | Expression<string>;
/**
 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["getMany"] }
 */
		listenerId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["getMany"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["getMany"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Remove the specified certificate from the certificate list for the specified HTTPS or TLS listener */
export type AwsElbV1ListenerCertificateRemoveConfig = {
	resource: 'listenerCertificate';
	operation: 'remove';
/**
 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["remove"] }
 */
		loadBalancerId: string | Expression<string>;
/**
 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["remove"] }
 */
		listenerId: string | Expression<string>;
/**
 * Unique identifier for a particular loadBalancer
 * @displayOptions.show { resource: ["listenerCertificate"], operation: ["remove"] }
 */
		certificateId: string | Expression<string>;
};

/** Create a load balancer */
export type AwsElbV1LoadBalancerCreateConfig = {
	resource: 'loadBalancer';
	operation: 'create';
/**
 * The type of IP addresses used by the subnets for your load balancer
 * @displayOptions.show { resource: ["loadBalancer"], operation: ["create"] }
 * @default ipv4
 */
		ipAddressType: 'ipv4' | 'dualstack' | Expression<string>;
/**
 * This name must be unique per region per account, can have a maximum of 32 characters
 * @displayOptions.show { resource: ["loadBalancer"], operation: ["create"] }
 */
		name: string | Expression<string>;
	schema: 'internal' | 'internet-facing' | Expression<string>;
	type: 'application' | 'network' | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["loadBalancer"], operation: ["create"] }
 * @default []
 */
		subnets: string[];
	additionalFields?: Record<string, unknown>;
};

/** Delete a load balancer */
export type AwsElbV1LoadBalancerDeleteConfig = {
	resource: 'loadBalancer';
	operation: 'delete';
/**
 * ID of loadBalancer to delete
 * @displayOptions.show { resource: ["loadBalancer"], operation: ["delete"] }
 */
		loadBalancerId: string | Expression<string>;
};

/** Get a load balancer */
export type AwsElbV1LoadBalancerGetConfig = {
	resource: 'loadBalancer';
	operation: 'get';
/**
 * Unique identifier for a particular loadBalancer
 * @displayOptions.show { resource: ["loadBalancer"], operation: ["get"] }
 */
		loadBalancerId: string | Expression<string>;
};

/** Get many load balancers */
export type AwsElbV1LoadBalancerGetManyConfig = {
	resource: 'loadBalancer';
	operation: 'getMany';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["loadBalancer"], operation: ["getMany"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["loadBalancer"], operation: ["getMany"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type AwsElbV1Params =
	| AwsElbV1ListenerCertificateAddConfig
	| AwsElbV1ListenerCertificateGetManyConfig
	| AwsElbV1ListenerCertificateRemoveConfig
	| AwsElbV1LoadBalancerCreateConfig
	| AwsElbV1LoadBalancerDeleteConfig
	| AwsElbV1LoadBalancerGetConfig
	| AwsElbV1LoadBalancerGetManyConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsElbV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsElbV1Node = {
	type: 'n8n-nodes-base.awsElb';
	version: 1;
	config: NodeConfig<AwsElbV1Params>;
	credentials?: AwsElbV1Credentials;
};