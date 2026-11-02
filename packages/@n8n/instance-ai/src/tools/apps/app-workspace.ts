import type { Workspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';

import type { InstanceAiAppService } from '../../types';
import {
	escapeSingleQuotes,
	readFileViaSandbox,
	runInSandbox,
	writeFileViaSandbox,
} from '../../workspace/sandbox-fs';
import { joinWorkspacePath } from '../../workspace/workspace-paths';

/** The app folder relative to the workspace root, as the workspace tools address it. */
export function appFolder(appId: string) {
	return `apps/${appId}`;
}

async function appPaths(workspace: Workspace, appId: string) {
	const dir = joinWorkspacePath(await getWorkspaceRoot(workspace), appFolder(appId));
	return { dir: escapeSingleQuotes(dir), baseFile: `${dir}.base-version`, archive: `${dir}.tgz` };
}

async function run(workspace: Workspace, command: string) {
	const result = await runInSandbox(workspace, command);
	if (result.exitCode !== 0) {
		throw new Error(`Sandbox command failed: ${(result.stderr || result.stdout).trim()}`);
	}
}

/**
 * The version that the app folder started from. `undefined` when the app is not open
 * in the workspace, `null` when it started from the scaffold.
 */
export async function readBaseVersion(workspace: Workspace, appId: string) {
	const content = await readFileViaSandbox(workspace, (await appPaths(workspace, appId)).baseFile);
	if (content === null) return undefined;
	return content.trim() || null;
}

export async function writeBaseVersion(
	workspace: Workspace,
	appId: string,
	versionId: string | null,
) {
	await writeFileViaSandbox(
		workspace,
		(await appPaths(workspace, appId)).baseFile,
		versionId ?? '',
	);
}

/** Replace the app folder with the draft source of the app. Installed dependencies stay. */
export async function checkOutDraft(
	workspace: Workspace,
	apps: InstanceAiAppService,
	appId: string,
) {
	const { baseVersionId, archive } = await apps.exportDraft(appId);
	const paths = await appPaths(workspace, appId);
	await writeFileViaSandbox(workspace, paths.archive, archive);
	const tarball = escapeSingleQuotes(paths.archive);
	await run(
		workspace,
		`mkdir -p '${paths.dir}' && find '${paths.dir}' -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} + && tar -xzf '${tarball}' --no-same-owner -C '${paths.dir}' && rm -f '${tarball}'`,
	);
	await writeBaseVersion(workspace, appId, baseVersionId);
	return baseVersionId;
}

/** The app folder as a gzip tar archive, without installed dependencies and build output. */
export async function packAppFolder(workspace: Workspace, appId: string) {
	const paths = await appPaths(workspace, appId);
	const tarball = escapeSingleQuotes(paths.archive);
	await run(
		workspace,
		`tar -czf '${tarball}' --exclude=./node_modules --exclude=./dist -C '${paths.dir}' .`,
	);
	try {
		const archive = await workspace.filesystem?.readFile(paths.archive);
		if (!Buffer.isBuffer(archive)) throw new Error('The sandbox returned an invalid app archive.');
		return archive;
	} finally {
		await run(workspace, `rm -f '${tarball}'`);
	}
}
