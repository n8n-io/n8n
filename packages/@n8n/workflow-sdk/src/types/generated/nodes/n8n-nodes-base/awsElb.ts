/**
 * AWS ELB Node Types
 *
 * Sends data to AWS ELB API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awselb/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Add the specified SSL server certificate to the certificate list for the specified HTTPS or TLS listener */
export type AwsElbV1ListenerCertificateAddConfig = {
	resource: 'listenerCertificate';
	operation: 'add';
	/**
	 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	loadBalancerId: string | Expression<string>;
	/**
	 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listenerId: string | Expression<string>;
	/**
	 * Unique identifier for a particular loadBalancer
	 */
	certificateId: string | Expression<string>;
};

/** Get many load balancers */
export type AwsElbV1ListenerCertificateGetManyConfig = {
	resource: 'listenerCertificate';
	operation: 'getMany';
	/**
	 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	loadBalancerId: string | Expression<string>;
	/**
	 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listenerId: string | Expression<string>;
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
};

/** Remove the specified certificate from the certificate list for the specified HTTPS or TLS listener */
export type AwsElbV1ListenerCertificateRemoveConfig = {
	resource: 'listenerCertificate';
	operation: 'remove';
	/**
	 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	loadBalancerId: string | Expression<string>;
	/**
	 * Unique identifier for a particular loadBalancer. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listenerId: string | Expression<string>;
	/**
	 * Unique identifier for a particular loadBalancer
	 */
	certificateId: string | Expression<string>;
};

/** Create a load balancer */
export type AwsElbV1LoadBalancerCreateConfig = {
	resource: 'loadBalancer';
	operation: 'create';
	/**
	 * The type of IP addresses used by the subnets for your load balancer
	 * @default ipv4
	 */
	ipAddressType: 'ipv4' | 'dualstack' | Expression<string>;
	/**
	 * This name must be unique per region per account, can have a maximum of 32 characters
	 */
	name: string | Expression<string>;
	schema: 'internal' | 'internet-facing' | Expression<string>;
	type: 'application' | 'network' | Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	loadBalancerId: string | Expression<string>;
};

/** Get a load balancer */
export type AwsElbV1LoadBalancerGetConfig = {
	resource: 'loadBalancer';
	operation: 'get';
	/**
	 * Unique identifier for a particular loadBalancer
	 */
	loadBalancerId: string | Expression<string>;
};

/** Get many load balancers */
export type AwsElbV1LoadBalancerGetManyConfig = {
	resource: 'loadBalancer';
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
	filters?: Record<string, unknown>;
};

export type AwsElbV1Params =
	| AwsElbV1ListenerCertificateAddConfig
	| AwsElbV1ListenerCertificateGetManyConfig
	| AwsElbV1ListenerCertificateRemoveConfig
	| AwsElbV1LoadBalancerCreateConfig
	| AwsElbV1LoadBalancerDeleteConfig
	| AwsElbV1LoadBalancerGetConfig
	| AwsElbV1LoadBalancerGetManyConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsElbV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AwsElbV1Node = {
	type: 'n8n-nodes-base.awsElb';
	version: 1;
	config: NodeConfig<AwsElbV1Params>;
	credentials?: AwsElbV1Credentials;
};

export type AwsElbNode = AwsElbV1Node;
