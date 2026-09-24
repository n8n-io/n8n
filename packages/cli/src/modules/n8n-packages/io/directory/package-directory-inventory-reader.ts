import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';
import type { z } from 'zod';
import { ZodError } from 'zod';

import {
	WorkflowSerializer,
	type WorkflowPackageContent,
} from '../../entities/workflow/workflow.serializer';
import {
	serializedCredentialSchema,
	type SerializedCredential,
} from '../../spec/serialized/credential.schema';
import {
	serializedProjectSchema,
	type SerializedProject,
} from '../../spec/serialized/project.schema';
import {
	serializedVariableSchema,
	type SerializedVariable,
} from '../../spec/serialized/variable.schema';
import { serializedWorkflowSchema } from '../../spec/serialized/workflow.schema';
import { PACKAGE_ENTITY_LAYOUT } from '../manifest-entry';
import type { PackageReader } from '../package-reader';

/** Listing and reads only. The inventory never needs a manifest. */
export type PackageFileSource = Pick<PackageReader, 'listEntries' | 'readFile'>;

export interface InventoryProject extends SerializedProject {
	/** Directory that holds `project.json`. */
	path: string;
}

export interface InventoryWorkflow {
	path: string;
	projectId: string;
	id: string;
	name: string;
	content: WorkflowPackageContent;
}

export interface InventoryCredential {
	path: string;
	/** `null` when the file is outside every project. */
	projectId: string | null;
	credential: SerializedCredential;
}

export interface InventoryVariable {
	path: string;
	/** `null` when the file is outside every project. */
	projectId: string | null;
	variable: SerializedVariable;
}

export interface PackageDirectoryInventory {
	projects: InventoryProject[];
	workflows: InventoryWorkflow[];
	credentials: InventoryCredential[];
	variables: InventoryVariable[];
}

type EntityKind = 'projects' | 'workflows' | 'credentials' | 'variables';

const KIND_BY_FILE_NAME: Record<string, EntityKind> = {
	[PACKAGE_ENTITY_LAYOUT.projects.fileName]: 'projects',
	[PACKAGE_ENTITY_LAYOUT.workflows.fileName]: 'workflows',
	[PACKAGE_ENTITY_LAYOUT.credentials.fileName]: 'credentials',
	[PACKAGE_ENTITY_LAYOUT.variables.fileName]: 'variables',
};

const LABELS: Record<EntityKind, string> = {
	projects: 'project',
	workflows: 'workflow',
	credentials: 'credential',
	variables: 'variable',
};

interface EntityFile {
	path: string;
	kind: EntityKind;
	/** `projects/<dir>` when the file is inside a project directory. */
	projectDir: string | null;
	/** Path segments after the project directory, or all segments at the top level. */
	segments: string[];
}

/**
 * Reads the projects, workflows, credentials and variables of a package from
 * its entity files. The directory layout decides which project a file belongs
 * to; the file content supplies every id and name. `manifest.json` and other
 * files are ignored.
 */
@Service()
export class PackageDirectoryInventoryReader {
	constructor(private readonly workflowSerializer: WorkflowSerializer) {}

	async read(source: PackageFileSource): Promise<PackageDirectoryInventory> {
		const files = (await source.listEntries()).sort().flatMap((path) => classify(path) ?? []);

		const projects = await this.readProjects(source, files);
		const projectIdByDir = new Map(projects.map((project) => [project.path, project.id]));

		const projectIdOf = (file: EntityFile): string | null => {
			if (file.projectDir === null) return null;
			const projectId = projectIdByDir.get(file.projectDir);
			if (projectId === undefined) {
				throw new UserError(
					`Package file at ${file.path} is inside "${file.projectDir}", which has no ${PACKAGE_ENTITY_LAYOUT.projects.fileName}.`,
				);
			}
			return projectId;
		};

		return {
			projects,
			workflows: await this.readWorkflows(source, files, projectIdOf),
			credentials: await this.readCredentials(source, files, projectIdOf),
			variables: await this.readVariables(source, files, projectIdOf),
		};
	}

	private async readProjects(
		source: PackageFileSource,
		files: EntityFile[],
	): Promise<InventoryProject[]> {
		const projects: InventoryProject[] = [];
		const seenIds = new Set<string>();

		for (const file of files.filter((f) => f.kind === 'projects')) {
			if (file.projectDir === null || file.segments.length !== 1) {
				throw unsupportedLocation(file);
			}
			const project = await this.readEntity(source, file, serializedProjectSchema);
			assertUnseen(seenIds, project.id, 'project id');
			projects.push({ path: file.projectDir, ...project });
		}

		return projects;
	}

	private async readWorkflows(
		source: PackageFileSource,
		files: EntityFile[],
		projectIdOf: (file: EntityFile) => string | null,
	): Promise<InventoryWorkflow[]> {
		const workflows: InventoryWorkflow[] = [];
		const seenIds = new Set<string>();

		for (const file of files.filter((f) => f.kind === 'workflows')) {
			if (!isWorkflowLocation(file.segments)) throw unsupportedLocation(file);
			const projectId = projectIdOf(file);
			if (projectId === null) {
				throw new UserError(`Package workflow file at ${file.path} is not inside a project.`);
			}

			const serialized = await this.readEntity(source, file, serializedWorkflowSchema);
			assertUnseen(seenIds, serialized.id, 'workflow id');
			workflows.push({
				path: file.path,
				projectId,
				id: serialized.id,
				name: serialized.name,
				content: this.workflowSerializer.deserialize(serialized),
			});
		}

		return workflows;
	}

	private async readCredentials(
		source: PackageFileSource,
		files: EntityFile[],
		projectIdOf: (file: EntityFile) => string | null,
	): Promise<InventoryCredential[]> {
		const credentials: InventoryCredential[] = [];
		const seenIds = new Set<string>();

		for (const file of files.filter((f) => f.kind === 'credentials')) {
			if (!isCollectionLocation(file.segments, 'credentials')) throw unsupportedLocation(file);
			const credential = await this.readEntity(source, file, serializedCredentialSchema);
			assertUnseen(seenIds, credential.id, 'credential id');
			credentials.push({ path: file.path, projectId: projectIdOf(file), credential });
		}

		return credentials;
	}

	private async readVariables(
		source: PackageFileSource,
		files: EntityFile[],
		projectIdOf: (file: EntityFile) => string | null,
	): Promise<InventoryVariable[]> {
		const variables: InventoryVariable[] = [];
		const seenNames = new Set<string>();

		for (const file of files.filter((f) => f.kind === 'variables')) {
			if (!isCollectionLocation(file.segments, 'variables')) throw unsupportedLocation(file);
			const projectId = projectIdOf(file);
			const variable = await this.readEntity(source, file, serializedVariableSchema);
			assertUnseen(
				seenNames,
				JSON.stringify([projectId, variable.name]),
				'variable name in one scope',
				`${projectId ?? ''}/${variable.name}`,
			);
			variables.push({ path: file.path, projectId, variable });
		}

		return variables;
	}

	private async readEntity<TSchema extends z.ZodTypeAny>(
		source: PackageFileSource,
		file: EntityFile,
		schema: TSchema,
	): Promise<z.infer<TSchema>> {
		const label = LABELS[file.kind];
		const raw = await source.readFile(file.path);
		const wire = jsonParse<unknown>(raw.toString('utf-8'), {
			errorMessage: `Package ${label} file at ${file.path} is not valid JSON.`,
		});

		try {
			return schema.parse(wire);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package ${label} file at ${file.path} failed schema validation.`, {
					cause,
				});
			}
			throw cause;
		}
	}
}

function classify(path: string): EntityFile | undefined {
	const segments = path.split('/');
	const kind = KIND_BY_FILE_NAME[segments[segments.length - 1]];
	if (kind === undefined) return undefined;

	const projectsDir = PACKAGE_ENTITY_LAYOUT.projects.directory;
	if (segments[0] === projectsDir && segments.length > 2) {
		return {
			path,
			kind,
			projectDir: `${projectsDir}/${segments[1]}`,
			segments: segments.slice(2),
		};
	}
	return { path, kind, projectDir: null, segments };
}

/** `<collection>/<entry>/<file>`, relative to the project directory or the package root. */
function isCollectionLocation(segments: string[], kind: EntityKind): boolean {
	return segments.length === 3 && segments[0] === PACKAGE_ENTITY_LAYOUT[kind].directory;
}

/**
 * `workflows/<entry>/workflow.json`, optionally nested below folders. The export
 * writes deeper folder levels as bare slugs under the first `folders/` segment
 * (`folders/<a>/<b>/workflows/...`), not as repeated `folders/<slug>` pairs, so
 * accept any folder-chain depth before the `workflows/<entry>/` leaf.
 */
function isWorkflowLocation(segments: string[]): boolean {
	if (!isCollectionLocation(segments.slice(-3), 'workflows')) return false;
	const container = segments.slice(0, -3);
	// Either a project/root workflow (no container), or one under a folder chain.
	// A folder chain is `folders/<slug>(/<slug>)*`, so it needs at least one slug
	// after `folders/` — reject a bare `folders/` with no folder entry.
	if (container.length === 0) return true;
	return container[0] === PACKAGE_ENTITY_LAYOUT.folders.directory && container.length >= 2;
}

function unsupportedLocation(file: EntityFile): UserError {
	return new UserError(
		`Package ${LABELS[file.kind]} file at ${file.path} is not in a supported location.`,
	);
}

function assertUnseen(seen: Set<string>, key: string, label: string, displayKey = key): void {
	if (seen.has(key)) throw new UserError(`Package contains a duplicate ${label}: ${displayKey}`);
	seen.add(key);
}
