import {
	linkedInstanceEntityIdSchema,
	linkedInstanceRemoteWorkflowIdSchema,
	type LinkedInstanceCredentialNeedingSetup,
} from '@n8n/api-types';
import { z } from 'zod';

import {
	EXPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME as EXPORT_TOOL,
	IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME as IMPORT_TOOL,
} from '@/services/capabilities/capability-scopes';

import { RemoteInstanceError } from '../remote/remote-instance.errors';
import { LIST_TIMEOUT_MS, parseRemoteProjects, SEARCH_PROJECTS_TOOL } from '../remote-projects';
import type { RemoteSession } from './linked-instance-sessions';
import type { RemoteCredentialList } from './transfer-preflight';

/** The MCP tools of an n8n instance that a move uses, besides the package tools. */
export const PUBLISH_WORKFLOW_TOOL = 'publish_workflow';
export const LIST_CREDENTIALS_TOOL = 'list_credentials';

// The highest limit that `list_credentials` accepts.
const MAX_CREDENTIALS = 200;
// The package tools can take a while for a large workflow. 60 s is the upper limit of a call.
const PACKAGE_CALL_TIMEOUT_MS = 60_000;
// The length of a name column.
const MAX_NAME_LENGTH = 255;

const UNKNOWN_FORMAT = {
	import:
		'The linked instance sent a result in an unknown format. Check the workflow there before you try again.',
	export: 'The linked instance sent the workflow in an unknown format.',
	publish: 'The linked instance sent a result in an unknown format.',
	credentials: 'The linked instance sent its credentials in an unknown format.',
} as const;

/** The copy in the linked instance after an import, with remote text made safe to show. */
export type RemoteImportResult = {
	workflowId: string;
	created: boolean;
	/** A version of the copy is live. It can be an earlier version. */
	published: boolean;
	/**
	 * The import put the version that it wrote live, for example for a re-import of a live copy.
	 * `undefined`: an older instance that does not tell.
	 */
	newVersionLive: boolean | undefined;
	credentialsNeedingSetup: LinkedInstanceCredentialNeedingSetup[];
	missingNodeTypes: string[];
	warnings: string[];
};

export type RemotePublishOutcome =
	| { ok: true }
	| { ok: false; failure: 'unavailable' }
	| { ok: false; failure: 'refused'; reason: string };

// Unknown fields are dropped, so a newer n8n version can add fields. Lists that do not parse are
// empty, so that a move that worked is not reported as a failure.
const importResultSchema = z.object({
	workflowId: linkedInstanceRemoteWorkflowIdSchema,
	created: z.boolean(),
	published: z.boolean().catch(false),
	newVersionLive: z.boolean().optional().catch(undefined),
	credentialsNeedingSetup: z.array(z.unknown()).catch([]),
	missingNodeTypes: z.array(z.unknown()).catch([]),
	warnings: z.array(z.unknown()).catch([]),
});

const credentialSchema = z.object({
	id: linkedInstanceEntityIdSchema(UNKNOWN_FORMAT.import),
	name: z.string(),
	type: z.string(),
});

const exportResultSchema = z.object({ packageBase64: z.string().min(1) });

const publishResultSchema = z.object({
	success: z.boolean(),
	error: z.string().optional().catch(undefined),
});

const credentialListSchema = z.object({ data: z.array(z.unknown()) });

const nameAndTypeSchema = z.object({ name: z.string(), type: z.string() });

function parseOrThrow<S extends z.ZodTypeAny>(
	schema: S,
	result: unknown,
	message: string,
): z.output<S> {
	const parsed: z.SafeParseReturnType<unknown, z.output<S>> = schema.safeParse(result);
	if (!parsed.success) throw new RemoteInstanceError('tool-error', message);
	return parsed.data;
}

/** Keeps the items that parse, with remote text made safe to show. Empty texts go. */
function cleanTexts(session: RemoteSession, items: unknown[], maxLength?: number): string[] {
	return items.flatMap((item) => {
		const text = typeof item === 'string' ? session.clean(item, maxLength) : '';
		return text === '' ? [] : [text];
	});
}

function cleanCredentials(
	session: RemoteSession,
	items: unknown[],
): LinkedInstanceCredentialNeedingSetup[] {
	return items.flatMap((item) => {
		const parsed = credentialSchema.safeParse(item);
		if (!parsed.success) return [];
		const { id, name, type } = parsed.data;
		return [
			{
				id,
				name: session.clean(name, MAX_NAME_LENGTH),
				type: session.clean(type, MAX_NAME_LENGTH),
			},
		];
	});
}

export type RemoteImportArgs = {
	packageBase64: string;
	/** The local workflow id. The import refuses a package that does not hold it. */
	sourceWorkflowId: string;
	/** Defaults to the personal project of the token's user. */
	projectId?: string;
};

/**
 * Imports a package into the linked instance. A repeated import of the same workflow into the
 * same project updates the copy of the first one.
 * @throws {RemoteInstanceError}
 */
export async function importOnRemote(
	session: RemoteSession,
	args: RemoteImportArgs,
): Promise<RemoteImportResult> {
	const result = await session.callTool(IMPORT_TOOL, args, {
		timeoutMs: PACKAGE_CALL_TIMEOUT_MS,
	});
	const parsed = parseOrThrow(importResultSchema, result, UNKNOWN_FORMAT.import);
	return {
		workflowId: parsed.workflowId,
		created: parsed.created,
		published: parsed.published,
		newVersionLive: parsed.newVersionLive,
		credentialsNeedingSetup: cleanCredentials(session, parsed.credentialsNeedingSetup),
		missingNodeTypes: cleanTexts(session, parsed.missingNodeTypes, MAX_NAME_LENGTH),
		warnings: cleanTexts(session, parsed.warnings),
	};
}

/**
 * Exports one workflow of the linked instance as a package (base64).
 * @throws {RemoteInstanceError}
 */
export async function exportFromRemote(
	session: RemoteSession,
	remoteWorkflowId: string,
): Promise<string> {
	const result = await session.callTool(
		EXPORT_TOOL,
		{ workflowId: remoteWorkflowId },
		{ timeoutMs: PACKAGE_CALL_TIMEOUT_MS },
	);
	return parseOrThrow(exportResultSchema, result, UNKNOWN_FORMAT.export).packageBase64;
}

/**
 * Puts the current version of the copy live. Never throws for a remote failure: the copy is in
 * the linked instance already, so a failure is a result.
 */
export async function publishOnRemote(
	session: RemoteSession,
	remoteWorkflowId: string,
): Promise<RemotePublishOutcome> {
	// An OAuth token without the workflow write grant does not see the tool.
	if (!session.toolNames.has(PUBLISH_WORKFLOW_TOOL)) return { ok: false, failure: 'unavailable' };
	try {
		const result = await session.callTool(PUBLISH_WORKFLOW_TOOL, {
			workflowId: remoteWorkflowId,
		});
		// The tool reports a refusal in its result, not as a tool error.
		const { success, error } = parseOrThrow(publishResultSchema, result, UNKNOWN_FORMAT.publish);
		if (success) return { ok: true };
		return {
			ok: false,
			failure: 'refused',
			reason: session.clean(error ?? '') || 'no reason given',
		};
	} catch (error) {
		if (!(error instanceof RemoteInstanceError)) throw error;
		// The session made the text of a tool error safe to show.
		return { ok: false, failure: 'refused', reason: error.message };
	}
}

/**
 * The id of the personal project of the token's user, where an import without a project goes.
 * @returns `undefined` when the access token cannot list projects or the list has no personal project
 * @throws {RemoteInstanceError}
 */
export async function findRemotePersonalProjectId(
	session: RemoteSession,
): Promise<string | undefined> {
	if (!session.toolNames.has(SEARCH_PROJECTS_TOOL)) return undefined;
	const result = await session.callTool(
		SEARCH_PROJECTS_TOOL,
		{ type: 'personal', limit: 1 },
		{ timeoutMs: LIST_TIMEOUT_MS },
	);
	return parseRemoteProjects(result).projects.find(({ type }) => type === 'personal')?.id;
}

type ListCredentialsArgs = { projectId: string } | { onlySharedWithMe: true };

async function callListCredentials(
	session: RemoteSession,
	args: ListCredentialsArgs,
): Promise<RemoteCredentialList> {
	const result = await session.callTool(
		LIST_CREDENTIALS_TOOL,
		{ limit: MAX_CREDENTIALS, ...args },
		{ timeoutMs: LIST_TIMEOUT_MS },
	);
	const { data } = parseOrThrow(credentialListSchema, result, UNKNOWN_FORMAT.credentials);
	const credentials = data.flatMap((item) => {
		const parsed = nameAndTypeSchema.safeParse(item);
		return parsed.success ? [parsed.data] : [];
	});
	return { credentials, complete: data.length < MAX_CREDENTIALS };
}

/**
 * The credentials of the project, by name and type, and the global ones. For a team project, the
 * tool lists the credentials that the project owns or that are shared with it. For a personal
 * project, it lists only the credentials that the project owns: see
 * {@link listPersonalRemoteCredentials}. Without a project, the tool would list every credential
 * that the user can use, also those of other projects, so the project is necessary.
 * @returns `null` when the access token cannot list credentials
 * @throws {RemoteInstanceError}
 */
export async function listRemoteCredentials(
	session: RemoteSession,
	projectId: string,
): Promise<RemoteCredentialList | null> {
	if (!session.toolNames.has(LIST_CREDENTIALS_TOOL)) return null;
	return await callListCredentials(session, { projectId });
}

/**
 * The credentials that an import into the personal project of the token's user can use: the
 * credentials that the project owns, the global ones, and the ones that other users shared with
 * the user. The tool lists the shared ones only on a separate request.
 * @returns `null` when the access token cannot list credentials
 * @throws {RemoteInstanceError}
 */
export async function listPersonalRemoteCredentials(
	session: RemoteSession,
	personalProjectId: string,
): Promise<RemoteCredentialList | null> {
	if (!session.toolNames.has(LIST_CREDENTIALS_TOOL)) return null;
	const owned = await callListCredentials(session, { projectId: personalProjectId });
	const shared = await callListCredentials(session, { onlySharedWithMe: true });
	return {
		credentials: [...owned.credentials, ...shared.credentials],
		complete: owned.complete && shared.complete,
	};
}

/**
 * The credentials that the import can use in the project that a move goes to: the default
 * project of the link, else the personal project of the token's user.
 * @returns `null` when the access token cannot list credentials or projects, or the linked
 *   instance lists no personal project
 * @throws {RemoteInstanceError}
 */
export async function listTargetCredentials(
	session: RemoteSession,
): Promise<RemoteCredentialList | null> {
	const project = session.link.defaultRemoteProject;
	if (project) return await listRemoteCredentials(session, project.id);
	if (!session.toolNames.has(LIST_CREDENTIALS_TOOL)) return null;
	const personalProjectId = await findRemotePersonalProjectId(session);
	return personalProjectId === undefined
		? null
		: await listPersonalRemoteCredentials(session, personalProjectId);
}
