import type { RunProfile } from '@n8n/nodes-base-next';

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
};
