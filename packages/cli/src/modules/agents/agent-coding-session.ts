import { join } from 'node:path/posix';

import { AgentCodingSessionSchema, type AgentCodingSession } from '@n8n/api-types';
import type { WorkspaceFilesystem } from '@n8n/agents';
import { BadRequestError } from '@n8n/errors';
import { z } from 'zod';

export function codingSessionDirectory(workspaceRoot: string, id: string): string {
	if (!z.string().uuid().safeParse(id).success) {
		throw new BadRequestError('Select a valid coding session');
	}
	return join(workspaceRoot, '.coding', 'sessions', id);
}

export function codingSessionPaths(workspaceRoot: string, session?: AgentCodingSession) {
	if (!session || session.original) {
		return { root: join(workspaceRoot, 'repo'), meta: join(workspaceRoot, '.coding') };
	}
	const directory = codingSessionDirectory(workspaceRoot, session.id);
	return { root: join(directory, 'repo'), meta: directory };
}

export async function readCodingSession(
	filesystem: WorkspaceFilesystem,
	workspaceRoot: string,
	id: string,
): Promise<AgentCodingSession> {
	const path = join(codingSessionDirectory(workspaceRoot, id), 'session.json');
	if (!(await filesystem.exists(path))) {
		throw new BadRequestError('Create a coding session before sending a coding task');
	}
	const metadata: unknown = JSON.parse((await filesystem.readFile(path)).toString());
	const reference = z
		.object({ id: z.string().uuid(), worktreeId: z.string().uuid() })
		.safeParse(metadata);
	if (!reference.success) {
		const session = AgentCodingSessionSchema.parse(metadata);
		if (session.id !== id) throw new BadRequestError('Coding session not found');
		return session;
	}
	const worktreePath = join(
		codingSessionDirectory(workspaceRoot, reference.data.worktreeId),
		'session.json',
	);
	const session = AgentCodingSessionSchema.parse(
		JSON.parse((await filesystem.readFile(worktreePath)).toString()),
	);
	if (
		reference.data.id !== id ||
		session.id !== reference.data.worktreeId ||
		!session.chatIds.includes(id)
	) {
		throw new BadRequestError('Coding chat not found');
	}
	return session;
}
