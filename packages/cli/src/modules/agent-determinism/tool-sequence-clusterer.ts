import { Service } from '@n8n/di';
import groupBy from 'lodash/groupBy';

import { MIN_CLUSTER_RUNS } from './agent-determinism.constants';
import { RunClusterer, type RecordedRun, type RunCluster } from './agent-determinism.contracts';

@Service()
export class ToolSequenceClusterer extends RunClusterer {
	cluster(runs: RecordedRun[]): RunCluster[] {
		const groups = groupBy(runs, (run) => run.toolCalls.map((call) => call.name).join('>'));
		return Object.entries(groups)
			.filter(([, members]) => members.length >= MIN_CLUSTER_RUNS)
			.map(([key, members]) => ({
				key,
				toolSequence: members[0].toolCalls.map((call) => call.name),
				runs: members,
				trafficShare: members.length / runs.length,
			}))
			.sort((a, b) => b.trafficShare - a.trafficShare);
	}
}
