import {
	bestPracticesRegistry,
	TechniqueDescription,
	WorkflowTechnique,
	type BestPracticesDocument,
	type WorkflowTechniqueType,
} from '@n8n/workflow-sdk/prompts/best-practices';
import { createHash } from 'node:crypto';

export const RUNTIME_KB_REGISTRY_SCHEMA_VERSION = 1;
const HASH_LENGTH = 12;

export interface BestPracticeContent {
	id: WorkflowTechniqueType;
	name: string;
	description: string;
	version: string;
	documentation: string;
}

export interface BestPracticeRegistryEntry {
	id: WorkflowTechniqueType;
	name: string;
	description: string;
	version: string;
	path: string;
	directory: string;
}

export interface BestPracticeRegistry {
	schemaVersion: typeof RUNTIME_KB_REGISTRY_SCHEMA_VERSION;
	techniquesHash: string;
	techniques: BestPracticeRegistryEntry[];
}

export interface BestPracticeSource {
	registry: BestPracticeRegistry;
	loadTechnique: (techniqueId: WorkflowTechniqueType) => Promise<BestPracticeContent | null>;
}

function titleCaseTechniqueId(id: string): string {
	return id
		.split('_')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function stableClone(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableClone);
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, entryValue]) => entryValue !== undefined)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entryValue]) => [key, stableClone(entryValue)]),
		);
	}
	return value;
}

function hashJson(value: unknown): string {
	return createHash('sha256')
		.update(JSON.stringify(stableClone(value)))
		.digest('hex')
		.slice(0, HASH_LENGTH);
}

function hashTechniqueRegistry(techniques: BestPracticeRegistryEntry[]): string {
	return hashJson({
		schemaVersion: RUNTIME_KB_REGISTRY_SCHEMA_VERSION,
		techniques,
	});
}

function loadTechniqueContent(
	techniqueId: WorkflowTechniqueType,
	doc: BestPracticesDocument,
): BestPracticeContent {
	const description = TechniqueDescription[techniqueId];
	return {
		id: techniqueId,
		name: titleCaseTechniqueId(techniqueId),
		description,
		version: doc.version,
		documentation: doc.getDocumentation(),
	};
}

let cachedBestPracticeSource: BestPracticeSource | undefined;

export function loadInstanceAiBestPracticeSource(): BestPracticeSource {
	if (cachedBestPracticeSource) return cachedBestPracticeSource;

	const contents: BestPracticeContent[] = [];
	for (const techniqueId of Object.values(WorkflowTechnique)) {
		const doc = bestPracticesRegistry[techniqueId];
		if (!doc) continue;
		contents.push(loadTechniqueContent(techniqueId, doc));
	}

	contents.sort((left, right) => left.id.localeCompare(right.id));
	const contentsById = new Map(contents.map((entry) => [entry.id, entry]));

	const techniques = contents.map((content) => ({
		id: content.id,
		name: content.name,
		description: content.description,
		version: content.version,
		path: '',
		directory: '',
	}));

	const registry: BestPracticeRegistry = {
		schemaVersion: RUNTIME_KB_REGISTRY_SCHEMA_VERSION,
		techniquesHash: hashTechniqueRegistry(techniques),
		techniques,
	};

	cachedBestPracticeSource = {
		registry,
		loadTechnique: async (techniqueId) => {
			const content = contentsById.get(techniqueId);
			return await Promise.resolve(content ?? null);
		},
	};

	return cachedBestPracticeSource;
}

export function hasBestPractices(
	source: BestPracticeSource | undefined,
): source is BestPracticeSource {
	return (source?.registry.techniques.length ?? 0) > 0;
}
