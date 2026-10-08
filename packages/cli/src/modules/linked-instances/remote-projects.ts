import { linkedInstanceRemoteProjectIdSchema } from '@n8n/api-types';
import { truncate } from '@n8n/utils/string/truncate';
import { z } from 'zod';

import { withDeadline } from '@/modules/policy-infrastructure/policy-decision.service';

import type { RemoteInstanceClient } from './remote/remote-instance.client';
import { RemoteInstanceError } from './remote/remote-instance.errors';
import type { RemoteProject, RemoteProjectList } from './remote-project-picker';

/** The MCP tool of an n8n instance that lists the projects of the token's user. */
export const SEARCH_PROJECTS_TOOL = 'search_projects';

// The highest limit that the tool accepts.
const MAX_PROJECTS = 100;
// For the whole list, also for the connection that the first call opens. Other short list
// calls to a linked instance use it too.
export const LIST_TIMEOUT_MS = 10_000;
// The length of the column that keeps the name.
const MAX_NAME_LENGTH = 255;
const ELLIPSIS_LENGTH = 3;
// A teammate on the other instance sets the name, and it shows in the UI and in prompts.
// Characters without width go: format characters (such as bidi controls) and half surrogate pairs.
const INVISIBLE_CHARACTERS = /[\p{Cf}\p{Cs}]+/gu;
// Control characters and line or paragraph separators become one space, so the name stays on one line.
const LINE_BREAKS = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;

/**
 * Makes text from another instance safe to show on one line: drops characters without width,
 * folds control characters and line breaks into spaces, and cuts the text to `maxLength`.
 */
export function cleanName(name: string, maxLength = MAX_NAME_LENGTH): string {
	const oneLine = name.replace(INVISIBLE_CHARACTERS, '').replace(LINE_BREAKS, ' ').trim();
	if (oneLine.length <= maxLength) return oneLine;
	// `truncate` counts UTF-16 units, so it can cut a character in two. That half goes.
	return truncate(oneLine, maxLength - ELLIPSIS_LENGTH).replace(INVISIBLE_CHARACTERS, '');
}

// Unknown fields are dropped, so a newer n8n version can add fields.
const resultSchema = z.object({
	data: z.array(z.unknown()),
	// Only tells if the list is complete, so a value that is not valid does not block the list.
	count: z.number().optional().catch(undefined),
	teamProjectsEnabled: z.boolean().optional(),
});

const projectSchema = z.object({
	id: linkedInstanceRemoteProjectIdSchema,
	name: z
		.string()
		.transform((name) => cleanName(name))
		.pipe(z.string().min(1)),
	type: z.enum(['personal', 'team']),
});

type ProjectPage = { list: RemoteProjectList; complete: boolean };

const isPersonal = (project: RemoteProject) => project.type === 'personal';

function parsePage(result: unknown): ProjectPage {
	const parsed = resultSchema.safeParse(result);
	if (!parsed.success) {
		throw new RemoteInstanceError(
			'tool-error',
			'The linked instance sent its projects in an unknown format.',
		);
	}
	const { data, count, teamProjectsEnabled = true } = parsed.data;
	const projects = data.flatMap((item) => {
		const project = projectSchema.safeParse(item);
		return project.success ? [project.data] : [];
	});
	// Without a total, the list counts as complete.
	const complete = count === undefined || count <= data.length;
	return { list: { projects, teamProjectsEnabled }, complete };
}

/**
 * Reads the result of the `search_projects` tool. It skips each project that it cannot use,
 * such as a project of a type that a newer n8n version adds, instead of failing.
 * An older instance does not tell if team projects are licensed, so they count as licensed.
 * @throws {RemoteInstanceError} when the result holds no project list
 */
export function parseRemoteProjects(result: unknown): RemoteProjectList {
	return parsePage(result).list;
}

/**
 * Stops waiting after the list time. The caller closes the client, and that ends the request.
 * @throws {RemoteInstanceError} with the reason `timeout` when the time is over
 */
async function withinListTime<T>(work: () => Promise<T>): Promise<T> {
	const deadline: { signal?: AbortSignal } = {};
	try {
		return await withDeadline(async (signal) => {
			deadline.signal = signal;
			return await work();
		}, LIST_TIMEOUT_MS);
	} catch (error) {
		if (deadline.signal?.aborted) throw new RemoteInstanceError('timeout');
		throw error;
	}
}

async function searchProjects(
	client: RemoteInstanceClient,
	args: Record<string, unknown>,
): Promise<ProjectPage> {
	const result = await client.callTool(SEARCH_PROJECTS_TOOL, args, { timeoutMs: LIST_TIMEOUT_MS });
	return parsePage(result);
}

/**
 * Lists up to 100 projects of the token's user, team projects first, in 10 seconds.
 * When team projects fill the list, a second call gets the personal project.
 * @throws {RemoteInstanceError}
 */
export async function listRemoteProjects(client: RemoteInstanceClient): Promise<RemoteProjectList> {
	return await withinListTime(async () => {
		const { list, complete } = await searchProjects(client, { limit: MAX_PROJECTS });
		if (complete || list.projects.some(isPersonal)) return list;

		const personal = await searchProjects(client, { type: 'personal', limit: 1 });
		return {
			...list,
			projects: [...list.projects, ...personal.list.projects.filter(isPersonal)],
		};
	});
}
