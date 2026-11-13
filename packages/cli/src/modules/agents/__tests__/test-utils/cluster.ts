import type { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';

import { AgentClusterService } from '../../agent-cluster.service';

export interface TestClusterOptions {
	/** Queue mode: agent state is relayed across processes. Default false. */
	queue?: boolean;
	/** Multi-main setup is enabled. Default false. */
	multipleMains?: boolean;
	instanceType?: InstanceSettings['instanceType'];
	isLeader?: boolean;
	hostId?: string;
}

/** A real cluster service over plain config, so tests describe the topology, not the flags. */
export function testCluster(options: TestClusterOptions = {}): AgentClusterService {
	const executionsConfig = { mode: options.queue ? 'queue' : 'regular' } as ExecutionsConfig;
	const globalConfig = {
		multiMainSetup: { enabled: options.multipleMains ?? false },
	} as GlobalConfig;
	const instanceSettings = {
		instanceType: options.instanceType ?? 'main',
		isLeader: options.isLeader ?? true,
		hostId: options.hostId ?? 'main-test',
	} as InstanceSettings;
	return new AgentClusterService(executionsConfig, globalConfig, instanceSettings);
}
