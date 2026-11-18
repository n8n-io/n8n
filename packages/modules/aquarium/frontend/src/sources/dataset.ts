import { isRecord } from '@n8n/utils/is-record';

import {
	DATASET_DEFAULT_WINDOW_SECONDS,
	DATASET_MAX_AGENTS,
	DATASET_MAX_WORKFLOWS,
} from '../aquarium.constants';
import type { AquariumEntity, EntityProject } from '../aquarium.types';
import { entityKey } from './source.utils';

/** Entities from a file, for example a scrape of another instance. Lives in memory only. */
export interface AquariumDataset {
	/** Host or label from the file. Empty when the file has none. */
	source: string;
	/** Entities in the file, before the cut to the tank limits. */
	totalEntities: number;
	/** Time that the execution counts cover. */
	windowSeconds: number;
	entities: AquariumEntity[];
}

function count(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function projectsOf(raw: unknown): Map<string, EntityProject> {
	const projects = new Map<string, EntityProject>();
	if (!Array.isArray(raw)) return projects;
	for (const item of raw) {
		if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') continue;
		const type = typeof item.type === 'string' ? item.type : undefined;
		projects.set(item.id, { id: item.id, name: item.name, ...(type ? { type } : {}) });
	}
	return projects;
}

/** Ids from another instance do not exist here, so the entity gets no route. */
function toEntity(raw: unknown, projects: Map<string, EntityProject>): AquariumEntity | undefined {
	if (!isRecord(raw)) return undefined;
	const { id, kind, name } = raw;
	if (typeof id !== 'string' || typeof name !== 'string') return undefined;
	if (kind !== 'workflow' && kind !== 'agent') return undefined;

	const metrics = isRecord(raw.metrics) ? raw.metrics : {};
	const executionCount = count(metrics.executionCount);
	// A project that the file does not list still groups its entities, under its id.
	const projectId = typeof raw.projectId === 'string' ? raw.projectId : undefined;
	const project = projectId
		? (projects.get(projectId) ?? { id: projectId, name: projectId })
		: undefined;
	return {
		key: entityKey(kind, id),
		id,
		kind,
		name,
		...(project ? { project } : {}),
		metrics: {
			complexity: Math.max(1, count(metrics.complexity)),
			executionCount,
			failedCount: Math.min(executionCount, count(metrics.failedCount)),
			averageRunTimeMs: count(metrics.averageRunTimeMs),
		},
	};
}

function windowSecondsOf(meta: Record<string, unknown>): number {
	const window = isRecord(meta.executionWindow) ? meta.executionWindow : {};
	const hours = count(window.approxHours);
	if (hours > 0) return hours * 3600;
	if (typeof window.from === 'string' && typeof window.to === 'string') {
		const seconds = (Date.parse(window.to) - Date.parse(window.from)) / 1000;
		if (seconds > 0) return seconds;
	}
	return DATASET_DEFAULT_WINDOW_SECONDS;
}

const byRunsThenSize = (a: AquariumEntity, b: AquariumEntity) =>
	b.metrics.executionCount - a.metrics.executionCount ||
	b.metrics.complexity - a.metrics.complexity;

/** Returns `undefined` when the value is not a data set with at least one valid entity. */
export function parseDataset(raw: unknown): AquariumDataset | undefined {
	if (!isRecord(raw) || !Array.isArray(raw.entities)) return undefined;

	const projects = projectsOf(raw.projects);
	const unique = new Map<string, AquariumEntity>();
	for (const item of raw.entities) {
		const entity = toEntity(item, projects);
		if (entity && !unique.has(entity.key)) unique.set(entity.key, entity);
	}
	if (unique.size === 0) return undefined;

	const all = [...unique.values()].sort(byRunsThenSize);
	const meta = isRecord(raw.meta) ? raw.meta : {};
	return {
		source: typeof meta.instance === 'string' ? meta.instance : '',
		totalEntities: all.length,
		windowSeconds: windowSecondsOf(meta),
		entities: [
			...all.filter((e) => e.kind === 'workflow').slice(0, DATASET_MAX_WORKFLOWS),
			...all.filter((e) => e.kind === 'agent').slice(0, DATASET_MAX_AGENTS),
		],
	};
}

export async function readDatasetFile(file: File): Promise<AquariumDataset | undefined> {
	try {
		return parseDataset(JSON.parse(await file.text()));
	} catch {
		return undefined;
	}
}
