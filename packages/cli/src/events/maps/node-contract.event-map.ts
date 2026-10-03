import type { RunProfile } from '@n8n/nodes-base-next';

/** Events of contract node executions. The otel module turns the profile into child spans of the node span. */
export type NodeContractEventMap = {
	'node-contract-run-profiled': {
		executionId: string;
		nodeName: string;
		profile: RunProfile;
	};
};
