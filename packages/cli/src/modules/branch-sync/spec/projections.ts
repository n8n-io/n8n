import type { CredentialsEntity, Project, Variables, WorkflowEntity } from '@n8n/db';
import { z } from 'zod';

import { serializedCredentialSchema } from '@/modules/n8n-packages/spec/serialized/credential.schema';

import { canonicalStringify } from '../engine/canonical-json';
import type { Package, ResourceContent } from '../engine/types';

/**
 * Fresh id-keyed tracked-repo layout (D006): the file path IS the stable
 * resource id, so `git diff --name-status` maps 1:1 to resources and never
 * misreads a rename as delete+add. The slug-keyed n8n-packages layout is
 * deliberately not used here.
 */
export const PACKAGE_DIRS = ['workflows', 'credentials', 'variables', 'projects'] as const;

export type ResourceKind = 'workflow' | 'credential' | 'variable' | 'project';

const DIR_TO_KIND: Record<string, ResourceKind> = {
	workflows: 'workflow',
	credentials: 'credential',
	variables: 'variable',
	projects: 'project',
};

export function resourceKindOf(path: string): ResourceKind | null {
	return DIR_TO_KIND[path.split('/')[0]] ?? null;
}

export function resourceIdOf(path: string): string {
	return path.split('/')[1].replace(/\.json$/, '');
}

export const workflowPath = (id: string) => `workflows/${id}.json`;
export const credentialPath = (id: string) => `credentials/${id}.json`;
export const variablePath = (id: string) => `variables/${id}.json`;
export const teamProjectPath = (id: string) => `projects/${id}.json`;

// Round-trippable content projections. `versionId` is deliberately absent: it is
// a per-instance random token, so two instances making the same logical edit
// would produce different versionIds — a false conflict (D006).
const workflowFileSchema = z
	.object({
		id: z.string().min(1),
		name: z.string(),
		nodes: z.array(z.unknown()),
		connections: z.record(z.unknown()),
		settings: z.record(z.unknown()).optional(),
		parentFolderId: z.string().nullable(),
		isArchived: z.boolean(),
		// Owning TEAM project id; only present at instance scope (project-scoped
		// trees imply the project, and personal projects never travel).
		homeProjectId: z.string().nullable().optional(),
	})
	.passthrough();

const variableFileSchema = z
	.object({
		id: z.string().min(1),
		key: z.string().min(1),
		type: z.string(),
	})
	.passthrough();

const teamProjectFileSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
	})
	.passthrough();

const SCHEMAS: Record<ResourceKind, z.ZodTypeAny> = {
	workflow: workflowFileSchema,
	credential: serializedCredentialSchema.passthrough(),
	variable: variableFileSchema,
	project: teamProjectFileSchema,
};

export function projectWorkflow(
	workflow: WorkflowEntity,
	/** Owning team-project id (null = personal); undefined omits the field (project scope). */
	homeProjectId?: string | null,
): ResourceContent {
	return {
		id: workflow.id,
		name: workflow.name,
		nodes: workflow.nodes,
		connections: workflow.connections,
		settings: workflow.settings,
		parentFolderId: workflow.parentFolder?.id ?? null,
		// Archive is a modification, not a deletion (D007): the file stays present.
		isArchived: workflow.isArchived,
		...(homeProjectId !== undefined ? { homeProjectId } : {}),
	};
}

/** Team projects travel as entities so instance-scope sync preserves structure. */
export function projectTeamProject(project: Project): ResourceContent {
	return {
		id: project.id,
		name: project.name,
		icon: project.icon ?? null,
		description: project.description ?? null,
	};
}

/** Credentials travel as stubs — bindings, never secrets (design invariant). */
export function projectCredential(credential: CredentialsEntity): ResourceContent {
	return { id: credential.id, name: credential.name, type: credential.type };
}

/** Variable values never leave the instance; local values survive sync. */
export function projectVariable(variable: Variables): ResourceContent {
	return { id: variable.id, key: variable.key, type: variable.type };
}

export interface PackageFileError {
	path: string;
	error: string;
}

/**
 * Validate-on-read (B2 robustness): a malformed / hand-edited file fails as one
 * error row and is excluded from the reconcile — it never corrupts the instance
 * or aborts the whole run.
 */
export function parsePackageFile(
	path: string,
	raw: string,
): { ok: true; content: ResourceContent } | { ok: false; error: string } {
	const kind = resourceKindOf(path);
	if (!kind) return { ok: false, error: `not a package path: ${path}` };
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (e) {
		return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
	}
	const result = SCHEMAS[kind].safeParse(parsed);
	if (!result.success) return { ok: false, error: result.error.message };
	return { ok: true, content: result.data as ResourceContent };
}

/** Serialize a package to its on-disk file map (path -> canonical file content). */
export function serializePackage(pkg: Package): Record<string, string> {
	return Object.fromEntries(
		Object.entries(pkg).map(([path, content]) => [path, canonicalStringify(content)]),
	);
}

/** Parse a tree's raw files into a package; malformed files become error rows. */
export function parsePackageTree(
	files: Record<string, string>,
	side: string,
): { pkg: Package; errors: PackageFileError[] } {
	const pkg: Package = {};
	const errors: PackageFileError[] = [];
	for (const [path, raw] of Object.entries(files)) {
		const parsed = parsePackageFile(path, raw);
		if (parsed.ok) pkg[path] = parsed.content;
		else errors.push({ path, error: `${side}: ${parsed.error}` });
	}
	return { pkg, errors };
}
