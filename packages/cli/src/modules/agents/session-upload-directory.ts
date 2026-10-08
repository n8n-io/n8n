import {
	dirname as posixDirname,
	join as posixJoin,
	normalize as posixNormalize,
} from 'node:path/posix';

import type { WorkspaceFilesystem } from '@n8n/agents';

export function sessionUploadDir(sessionId: string): string {
	return `uploads/${sessionId}`;
}

export function absoluteSessionUploadDir(workspaceRoot: string, sessionId: string): string {
	return posixJoin(workspaceRoot, sessionUploadDir(sessionId));
}

export function sessionUploadsManifestRel(sessionId: string): string {
	return `${sessionUploadDir(sessionId)}/manifest.json`;
}

export function sessionFileEnv(workspaceRoot: string, sessionId: string): NodeJS.ProcessEnv {
	return {
		N8N_SESSION_ID: sessionId,
		N8N_UPLOADS_DIR: absoluteSessionUploadDir(workspaceRoot, sessionId),
		N8N_OUTPUTS_DIR: posixJoin(workspaceRoot, `outputs/${sessionId}`),
		N8N_UPLOADS_MANIFEST: posixJoin(workspaceRoot, sessionUploadsManifestRel(sessionId)),
	};
}

export function sessionFilesInstruction(workspaceRoot: string, sessionId: string): string {
	const uploadsAbs = absoluteSessionUploadDir(workspaceRoot, sessionId);
	const outputsAbs = posixJoin(workspaceRoot, `outputs/${sessionId}`);
	return `Read this Session's Attachments from \`$N8N_UPLOADS_DIR\` (absolute: \`${uploadsAbs}\`). The on-disk file list is \`$N8N_UPLOADS_MANIFEST\`. Do not open paths listed under skipped. Write files the user should retrieve only under \`$N8N_OUTPUTS_DIR\` (absolute: \`${outputsAbs}\`). Files anywhere else are Scratch Files and are not retrievable. Use \`workspace_run_javascript\` for short scripts (60 s); long jobs stay on \`workspace_execute_command\`.`;
}

function isInside(path: string, root: string): boolean {
	const boundary = root.endsWith('/') ? root : `${root}/`;
	return path === root || path.startsWith(boundary);
}

export function resolveParentUploadPath(
	path: string,
	workspaceRoot: string,
	sessionId: string,
	scopedRoot: string,
): string | null {
	const uploadAbs = absoluteSessionUploadDir(workspaceRoot, sessionId);
	const uploadRel = sessionUploadDir(sessionId);
	const normalized = posixNormalize(path);
	if (path.startsWith('/')) {
		return isInside(normalized, uploadAbs) ? normalized : null;
	}
	if (normalized === uploadRel || normalized.startsWith(`${uploadRel}/`)) {
		return posixJoin(workspaceRoot, normalized);
	}
	const fromScoped = posixNormalize(posixJoin(scopedRoot, normalized));
	return isInside(fromScoped, uploadAbs) ? fromScoped : null;
}

export function relativeUploadPath(absolutePath: string, uploadAbs: string): string {
	if (absolutePath === uploadAbs) return '';
	const prefix = uploadAbs.endsWith('/') ? uploadAbs : `${uploadAbs}/`;
	return absolutePath.startsWith(prefix) ? absolutePath.slice(prefix.length) : '';
}

export interface SessionUploadHost {
	materialize(params: {
		sessionId: string;
		filesystem: WorkspaceFilesystem;
		workspaceRoot: string;
	}): Promise<{ changed: boolean }>;
}

export function parentDirOf(path: string): string {
	return posixDirname(path);
}
