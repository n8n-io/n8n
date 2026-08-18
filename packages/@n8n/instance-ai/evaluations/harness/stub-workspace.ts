// ---------------------------------------------------------------------------
// In-memory runtime workspace for in-process eval harnesses.
//
// Without a workspace, `build-workflow` fails its source read with a
// `code_fixable` remediation telling the agent to write the file with
// `workspace_write_file` — a tool that only exists when a workspace is attached.
// ---------------------------------------------------------------------------

import {
	CORE_WORKSPACE_TOOL_NAMES,
	Workspace,
	type FileContent,
	type ProviderStatus,
	type WorkspaceFilesystem,
} from '@n8n/agents';
import { getPromptWorkspaceRoot } from '@n8n/agents/sandbox';

export const stubWorkspaceRoot = getPromptWorkspaceRoot('n8n-sandbox');

function relativePath(path: string): string {
	const trimmed = path.trim();
	const rooted = `${stubWorkspaceRoot}/`;
	return (trimmed.startsWith(rooted) ? trimmed.slice(rooted.length) : trimmed).replace(
		/^\.?\/+/,
		'',
	);
}

async function unreachable(): Promise<never> {
	return await Promise.reject(new Error('Stub workspace exposes only CORE_WORKSPACE_TOOL_NAMES'));
}

class InMemoryWorkspaceFilesystem implements WorkspaceFilesystem {
	readonly id = 'stub-workspace-filesystem';
	readonly name = 'stub-workspace-filesystem';
	readonly provider = 'in-memory';
	readonly basePath = stubWorkspaceRoot;
	status: ProviderStatus = 'ready';

	private readonly files = new Map<string, string>();

	async readFile(path: string): Promise<string> {
		const content = this.files.get(relativePath(path));
		if (content === undefined) throw new Error(`No such file: ${path}`);
		return await Promise.resolve(content);
	}

	async writeFile(path: string, content: FileContent): Promise<void> {
		this.files.set(
			relativePath(path),
			typeof content === 'string' ? content : Buffer.from(content).toString('utf-8'),
		);
		await Promise.resolve();
	}

	// Directories are implicit: a path exists as long as a file sits under it.
	async mkdir(): Promise<void> {
		await Promise.resolve();
	}

	appendFile = unreachable;
	deleteFile = unreachable;
	copyFile = unreachable;
	moveFile = unreachable;
	rmdir = unreachable;
	readdir = unreachable;
	exists = unreachable;
	stat = unreachable;
}

export function createStubWorkspace(): Workspace {
	const workspace = new Workspace({
		id: 'stub-workspace',
		name: 'stub-workspace',
		filesystem: new InMemoryWorkspaceFilesystem(),
	});

	const allTools = workspace.getTools.bind(workspace);
	workspace.getTools = () => allTools().filter((tool) => CORE_WORKSPACE_TOOL_NAMES.has(tool.name));

	return workspace;
}
