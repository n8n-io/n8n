import type { NodePermissionClass } from '@n8n/config';
import type { ContractInstall, RefusedPermission, RunProfile } from '@n8n/nodes-base-next';

/**
 * Events of contract nodes. The otel module turns the profile into child spans of the node span.
 * The Prometheus collector turns it into `node_contract_*` metrics.
 */
export type NodeContractEventMap = {
	'node-contract-run-profiled': {
		executionId: string;
		nodeName: string;
		profile: RunProfile;
	};

	/**
	 * A permission refused a request or a bundle of a contract node at run time, or
	 * `N8N_NODE_PERMISSIONS_DENY` refused a version at load.
	 */
	'node-permission-refused': {
		/** The action or trigger id, e.g. `httpRequest.get`. */
		action: string;
		/** The semver of the refused version. Only a refusal at load has it. */
		version?: string;
		/** The workflow node. Only a refusal at run time has it. */
		nodeName?: string;
		/** The node type of the workflow node. Only a refusal at run time has it. */
		nodeType?: string;
		/** The permission that refused, or the denied permission class at load. */
		permission: RefusedPermission | NodePermissionClass;
		/** The host of the refused request. Only an egress refusal has it. */
		host?: string;
		/** The error text. */
		message: string;
	};

	/**
	 * The store took a version of a major that n8n did not have: a new id or a major upgrade. The
	 * event lists the permissions that the major adds.
	 */
	'node-contract-installed': ContractInstall;
};
