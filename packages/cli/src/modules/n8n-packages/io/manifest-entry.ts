import type { SerializedWorkflow, SerializedWorkflowMetadata } from '@n8n/api-types';

import { formatEntityFile } from './entity-file-format';
import type { PackageWriter } from './package-writer';
import { generateSlug } from './slug.utils';
import { PackageExportBlockedError } from '../entities/package-export.errors';
import type {
	ManifestEntry,
	PackageManifest,
	WorkflowManifestEntry,
} from '../spec/manifest.schema';

/**
 * Derived from the manifest so a new collection cannot ship without a
 * directory, a file name, and a fallback slug below.
 */
export type ManifestEntityCollection = {
	[K in keyof PackageManifest]-?: NonNullable<PackageManifest[K]> extends ManifestEntry[]
		? K
		: never;
}[keyof PackageManifest];

/**
 * Import derives a project's scope and a workflow's parent folder from these
 * path segments, so they are part of the package contract.
 */
export const PACKAGE_ENTITY_LAYOUT = {
	projects: { directory: 'projects', fileName: 'project.json' },
	folders: { directory: 'folders', fileName: 'folder.json' },
	workflows: { directory: 'workflows', fileName: 'workflow.json' },
	agents: { directory: 'agents', fileName: 'agent.json' },
	credentials: { directory: 'credentials', fileName: 'credential.json' },
	dataTables: { directory: 'data-tables', fileName: 'data-table.json' },
	variables: { directory: 'variables', fileName: 'variable.json' },
	tags: { directory: 'tags', fileName: 'tag.json' },
} as const satisfies Record<ManifestEntityCollection, { directory: string; fileName: string }>;

// Hyphens delimit the slug and ID in exported directory names.
// Unsafe ID characters become uppercase .XX UTF-8 byte escapes.
// Promotions decode these paths from Git, so keep the format stable.
const UNSAFE_ID_CHARACTER = /[^A-Za-z0-9_]/gu;
const ESCAPED_ID_BYTES = /(?:\.[0-9A-F]{2})+/g;

// Keep generated entity directory names within the common 255-character filesystem limit.
const MAX_PATH_SEGMENT_LENGTH = 255;

/** Keeps the leaf from starting with a hyphen when a name slugifies to nothing. */
const FALLBACK_SLUGS = {
	projects: 'project',
	folders: 'folder',
	workflows: 'workflow',
	agents: 'agent',
	credentials: 'credential',
	dataTables: 'data-table',
	variables: 'variable',
	tags: 'tag',
} as const satisfies Record<ManifestEntityCollection, string>;

export function packageDirectory(
	collection: ManifestEntityCollection,
	basePrefix?: string,
): string {
	const { directory } = PACKAGE_ENTITY_LAYOUT[collection];
	return basePrefix ? `${basePrefix}/${directory}` : directory;
}

/**
 * Inside the owner project's target when that project is part of the export,
 * otherwise the top-level collection directory.
 */
export function projectScopedDirectory(
	collection: ManifestEntityCollection,
	ownerProjectId: string | undefined,
	projectTargetsById: Map<string, string> | undefined,
): string {
	const prefix = ownerProjectId ? projectTargetsById?.get(ownerProjectId) : undefined;
	return packageDirectory(collection, prefix);
}

export function entityFilePath(collection: ManifestEntityCollection, target: string): string {
	return `${target}/${PACKAGE_ENTITY_LAYOUT[collection].fileName}`;
}

/** Metadata files share the workflow target and have no manifest entry. */
export const WORKFLOW_METADATA_FILE_NAME = 'workflow-metadata.json';

export function workflowMetadataFilePath(target: string): string {
	return `${target}/${WORKFLOW_METADATA_FILE_NAME}`;
}

export function agentMetadataFilePath(target: string): string {
	return `${target}/agent-metadata.json`;
}

function encodeIdSegment(id: string): string {
	return id.replace(UNSAFE_ID_CHARACTER, (character) =>
		Buffer.from(character).toString('hex').toUpperCase().replace(/../g, '.$&'),
	);
}

export function entityIdOfSegment(segment: string): string {
	return segment
		.slice(segment.lastIndexOf('-') + 1)
		.replace(ESCAPED_ID_BYTES, (escaped) =>
			Buffer.from(escaped.replace(/\./g, ''), 'hex').toString(),
		);
}

export function createManifestEntry(
	collection: ManifestEntityCollection,
	baseDir: string,
	entity: { id: string; name: string },
): ManifestEntry {
	const slug = generateSlug(entity.name, FALLBACK_SLUGS[collection]);
	const pathSegment = `${slug}-${encodeIdSegment(entity.id)}`;
	if (pathSegment.length > MAX_PATH_SEGMENT_LENGTH) {
		throw new PackageExportBlockedError(
			`${collection} entry "${entity.name}" creates a path segment longer than ${MAX_PATH_SEGMENT_LENGTH} characters. Shorten the entity name and retry the export.`,
			{
				description: `The generated path segment has ${pathSegment.length} characters.`,
			},
		);
	}

	return { id: entity.id, name: entity.name, target: `${baseDir}/${pathSegment}` };
}

export async function writeManifestEntry(
	writer: PackageWriter,
	collection: ManifestEntityCollection,
	baseDir: string,
	entity: { id: string; name: string },
	serialized: unknown,
): Promise<ManifestEntry> {
	const entry = createManifestEntry(collection, baseDir, entity);
	await writer.writeDirectory(entry.target);
	await writer.writeFile(entityFilePath(collection, entry.target), formatEntityFile(serialized));
	return entry;
}

export async function writeWorkflowManifestEntry(
	writer: PackageWriter,
	baseDir: string,
	workflow: { id: string; name: string },
	content: SerializedWorkflow,
	metadata: SerializedWorkflowMetadata,
): Promise<WorkflowManifestEntry> {
	const entry = await writeManifestEntry(writer, 'workflows', baseDir, workflow, content);
	await writer.writeFile(
		workflowMetadataFilePath(entry.target),
		JSON.stringify(metadata, null, '\t'),
	);
	return { ...entry, isArchived: content.isArchived };
}
