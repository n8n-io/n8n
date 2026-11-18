import type {
	AquariumEntity,
	AquariumSourceContext,
	EntityKind,
	EntityMetrics,
	EntitySource,
	MetricsSource,
} from '../aquarium.types';

export function entityKey(kind: EntityKind, id: string): string {
	return `${kind}:${id}`;
}

export function emptyMetrics(): EntityMetrics {
	return {
		complexity: 0,
		executionCount: 0,
		failedCount: 0,
		averageRunTimeMs: 0,
		waitingCount: 0,
		finishedCount: 0,
	};
}

export interface LoadResult {
	entities: AquariumEntity[];
	failedSources: string[];
}

/**
 * Runs all sources in parallel. A failed source does not stop the others, because most
 * sources depend on a license, a module or a permission.
 */
export async function loadFromSources(
	context: AquariumSourceContext,
	entitySources: EntitySource[],
	metricsSources: MetricsSource[],
): Promise<LoadResult> {
	const [entityResults, metricsResults] = await Promise.all([
		Promise.allSettled(entitySources.map(async (source) => await source.load(context))),
		Promise.allSettled(metricsSources.map(async (source) => await source.load(context))),
	]);

	const failedSources: string[] = [];
	const entities = new Map<string, AquariumEntity>();

	entityResults.forEach((result, i) => {
		if (result.status === 'rejected') {
			failedSources.push(entitySources[i].id);
			return;
		}
		for (const entity of result.value) entities.set(entity.key, entity);
	});

	// Sources later in the list win, so put the most accurate source last.
	metricsResults.forEach((result, i) => {
		if (result.status === 'rejected') {
			failedSources.push(metricsSources[i].id);
			return;
		}
		for (const patch of result.value) {
			const entity = entities.get(patch.key);
			if (!entity) continue;
			entities.set(patch.key, { ...entity, metrics: { ...entity.metrics, ...patch.metrics } });
		}
	});

	return { entities: [...entities.values()], failedSources };
}
