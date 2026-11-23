import { Service } from '@n8n/di';

import { RunClusterer, type RecordedRun, type RunCluster } from './agent-determinism.contracts';
import { groupByIntent, scoreGroup } from './trace-mining';

/** Groups runs by intent, then keeps the groups whose tool path repeats enough to convert. */
@Service()
export class TraceRunClusterer extends RunClusterer {
	cluster(runs: RecordedRun[]): RunCluster[] {
		return groupByIntent(runs)
			.map(({ label, runs: members }) => scoreGroup(label, members, runs.length))
			.filter((score) => score.convert)
			.sort((a, b) => b.share - a.share)
			.map((score) => ({
				key: score.label,
				toolSequence: score.dominantPath.split(' → '),
				runs: score.runs.map(({ run }) => run),
				trafficShare: score.share,
			}));
	}
}
