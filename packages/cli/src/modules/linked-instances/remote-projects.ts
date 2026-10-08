import { linkedInstanceRemoteProjectIdSchema } from '@n8n/api-types';
import { truncate } from '@n8n/utils/string/truncate';
import { z } from 'zod';

import type { RemoteInstanceClient } from './remote/remote-instance.client';
import { RemoteInstanceError } from './remote/remote-instance.errors';
import type { RemoteProjectList } from './remote-project-picker';

/** The MCP tool of an n8n instance that lists the projects of the token's user. */
export const SEARCH_PROJECTS_TOOL = 'search_projects';

// The highest limit that the tool accepts.
const MAX_PROJECTS = 100;
const LIST_TIMEOUT_MS = 10_000;
// The length of the column that keeps the name.
const MAX_NAME_LENGTH = 255;
const ELLIPSIS_LENGTH = 3;
// The name shows in the UI and in prompts, so it stays on one line.
const CONTROL_CHARACTERS = /\p{Cc}+/gu;

function cleanName(name: string): string {
	const oneLine = name.replace(CONTROL_CHARACTERS, ' ').trim();
	if (oneLine.length <= MAX_NAME_LENGTH) return oneLine;
	return truncate(oneLine, MAX_NAME_LENGTH - ELLIPSIS_LENGTH);
}

// Unknown fields are dropped, so a newer n8n version can add fields.
const resultSchema = z.object({
	data: z.array(z.unknown()),
	teamProjectsEnabled: z.boolean().optional(),
});

const projectSchema = z.object({
	id: linkedInstanceRemoteProjectIdSchema,
	name: z.string().transform(cleanName).pipe(z.string().min(1)),
	type: z.enum(['personal', 'team']),
});

/**
 * Reads the result of the `search_projects` tool. It skips each project that it cannot use,
 * such as a project of a type that a newer n8n version adds, instead of failing.
 * An older instance does not tell if team projects are licensed, so they count as licensed.
 * @throws {RemoteInstanceError} when the result holds no project list
 */
export function parseRemoteProjects(result: unknown): RemoteProjectList {
	const parsed = resultSchema.safeParse(result);
	if (!parsed.success) {
		throw new RemoteInstanceError(
			'tool-error',
			'The linked instance sent its projects in an unknown format.',
		);
	}
	const projects = parsed.data.data.flatMap((item) => {
		const project = projectSchema.safeParse(item);
		return project.success ? [project.data] : [];
	});
	return { projects, teamProjectsEnabled: parsed.data.teamProjectsEnabled ?? true };
}

/**
 * Lists up to 100 projects of the token's user, team projects first.
 * @throws {RemoteInstanceError}
 */
export async function listRemoteProjects(client: RemoteInstanceClient): Promise<RemoteProjectList> {
	const result = await client.callTool(
		SEARCH_PROJECTS_TOOL,
		{ limit: MAX_PROJECTS },
		{ timeoutMs: LIST_TIMEOUT_MS },
	);
	return parseRemoteProjects(result);
}
