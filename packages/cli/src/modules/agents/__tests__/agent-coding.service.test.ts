import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { AgentCodingConfigSchema } from '@n8n/api-types';
import type { WorkspaceFilesystem, WorkspaceSandbox } from '@n8n/agents';
import type { LockService } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { CredentialsService } from '@/credentials/credentials.service';
import { AgentCodingService } from '../agent-coding.service';
import { codingSessionPaths } from '../agent-coding-session';
import type { AgentSandboxRuntime } from '../agent-sandbox-runtime.service';
import type { AgentWorkspaceService } from '../agent-workspace.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

const exec = promisify(execFile);

function localService(root: string) {
	const filesystem = mock<WorkspaceFilesystem>();
	filesystem.exists.mockImplementation(
		async (path) =>
			await access(path).then(
				() => true,
				() => false,
			),
	);
	filesystem.readFile.mockImplementation(async (path) => await readFile(path));
	filesystem.writeFile.mockImplementation(async (path, content) => await writeFile(path, content));
	filesystem.moveFile.mockImplementation(
		async (source, destination) => await rename(source, destination),
	);
	filesystem.mkdir.mockImplementation(async (path) => {
		await mkdir(path, { recursive: true });
	});
	filesystem.stat.mockImplementation(async (path) => {
		const value = await stat(path);
		return {
			path,
			name: basename(path),
			type: value.isDirectory() ? 'directory' : 'file',
			size: value.size,
			createdAt: value.birthtime,
			modifiedAt: value.mtime,
		};
	});
	const sandbox = mock<WorkspaceSandbox>();
	sandbox.executeCommand = vi.fn(async (command, _args, options) => {
		// Keep application launches and Linux process locks out of this local Git check.
		if (command.includes('nohup setsid'))
			return { success: true, exitCode: 0, stdout: '', stderr: '', executionTimeMs: 0 };
		try {
			const result = await exec('bash', ['-c', command.replace('flock -w 30 9', 'true')], {
				cwd: options?.cwd ?? root,
				env: { ...process.env, ...options?.env },
				timeout: 10_000,
			});
			return { ...result, success: true, exitCode: 0, executionTimeMs: 0 };
		} catch (error) {
			const failed = error as { code: number; stdout: string; stderr: string };
			return {
				success: false,
				exitCode: failed.code,
				stdout: failed.stdout,
				stderr: failed.stderr,
				executionTimeMs: 0,
			};
		}
	});
	const config = AgentCodingConfigSchema.parse({
		repositoryUrl: 'https://example.invalid/demo.git',
		branch: 'main',
	});
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockResolvedValue(
		mock<Agent>({ schema: { name: 'Coding', model: 'test', instructions: '', coding: config } }),
	);
	const workspaceService = mock<AgentWorkspaceService>();
	workspaceService.getAgentWorkspace.mockResolvedValue({
		workspace: mock(),
		handle: mock<AgentSandboxRuntime>({ filesystem, sandbox, workspaceRoot: root, cacheKey: root }),
	});
	const threads = mock<AgentExecutionThreadRepository>();
	threads.findCodingSessionThreads.mockResolvedValue([]);
	const executions = mock<AgentExecutionRepository>();
	executions.findLatestByThreadId.mockResolvedValue(null);
	const lock = mock<LockService>();
	lock.withLease.mockImplementation(
		async (_namespace, _key, callback) => await callback(new AbortController().signal),
	);
	const service = new AgentCodingService(
		agentRepository,
		workspaceService,
		mock<CredentialsService>(),
		threads,
		executions,
		lock,
	);
	return { service, threads, executions };
}

it('keeps worktree edits and reviews separate through commits and archive/reopen', async () => {
	const root = await mkdtemp(join(tmpdir(), 'n8n-coding-worktrees-'));
	const repo = join(root, 'repo');
	const user = mock<User>({ id: 'test-user' });
	try {
		await mkdir(repo);
		await exec('git', ['init', '-b', 'main', repo]);
		await exec('git', ['config', 'user.name', 'Test'], { cwd: repo });
		await exec('git', ['config', 'user.email', 'test@example.invalid'], { cwd: repo });
		await writeFile(join(repo, 'app.txt'), 'original\n');
		await exec('git', ['add', '.'], { cwd: repo });
		await exec('git', ['commit', '-m', 'Initial'], { cwd: repo });
		await writeFile(join(repo, 'keep.txt'), 'Existing uncommitted work\n');
		const { service, threads, executions } = localService(root);
		const original = await service.createSession('project', 'agent', user, {
			name: 'Original checkout',
			original: true,
			baseBranch: '',
			branch: '',
		});
		const first = await service.createSession('project', 'agent', user, {
			name: 'First',
			original: false,
			baseBranch: 'main',
			branch: '',
		});
		const second = await service.createSession('project', 'agent', user, {
			name: 'Second',
			original: false,
			baseBranch: 'main',
			branch: '',
		});
		const firstPaths = codingSessionPaths(root, first);
		const secondPaths = codingSessionPaths(root, second);
		await writeFile(join(firstPaths.root, 'app.txt'), 'first worktree\n');
		await writeFile(join(secondPaths.root, 'new file.txt'), 'second worktree\n');
		await writeFile(join(firstPaths.meta, 'setup.exit'), '0');
		await writeFile(join(secondPaths.meta, 'setup.exit'), '0');
		const previousThread = mock<AgentExecutionThread>({ id: first.id, title: 'First task' });
		threads.findCodingSessionThreads.mockImplementation(
			async (_projectId, _agentId, _userId, ids) =>
				[previousThread].filter((thread) => ids.includes(thread.id)),
		);
		const chat = await service.createChat('project', 'agent', user, first.id);
		expect(chat.id).not.toBe(first.id);
		expect((await service.file('project', 'agent', user, 'app.txt', chat.id)).content).toBe(
			'first worktree\n',
		);
		expect((await service.status('project', 'agent', user, chat.id)).branch).toBe(first.branch);
		const listed = await service.sessions('project', 'agent', user);
		expect(listed.sessions).toHaveLength(3);
		expect(listed.sessions.find((session) => session.id === first.id)?.chats).toEqual([
			{ id: first.id, title: 'First task', hasConversation: true },
			{ id: chat.id, hasConversation: false },
		]);
		const originalChat = await service.createChat('project', 'agent', user, original.id);
		expect(
			(await service.file('project', 'agent', user, 'keep.txt', originalChat.id)).content,
		).toBe('Existing uncommitted work\n');

		expect((await service.file('project', 'agent', user, 'app.txt', second.id)).content).toBe(
			'original\n',
		);
		expect((await service.file('project', 'agent', user, 'keep.txt', original.id)).content).toBe(
			'Existing uncommitted work\n',
		);
		expect((await service.status('project', 'agent', user, first.id)).changes).toEqual([
			{ path: 'app.txt', status: 'M', additions: 1, deletions: 1 },
		]);
		expect((await service.status('project', 'agent', user, second.id)).changes).toEqual([
			{ path: 'new file.txt', status: '??', additions: 1, deletions: 0 },
		]);
		const beforeCommit = await service.diff('project', 'agent', user, 'app.txt', first.id);
		expect(
			await service.file('project', 'agent', user, join(firstPaths.root, 'app.txt'), first.id),
		).toEqual({ path: 'app.txt', content: 'first worktree\n' });
		await expect(
			service.file('project', 'agent', user, join(secondPaths.root, 'app.txt'), first.id),
		).rejects.toThrow('inside the repository');
		expect(beforeCommit.content).toContain('+first worktree');
		expect(await service.diff('project', 'agent', user, 'app.txt', chat.id)).toEqual(beforeCommit);
		await exec('git', ['add', '.'], { cwd: firstPaths.root });
		await exec('git', ['commit', '-m', 'First edit'], { cwd: firstPaths.root });
		expect(await service.diff('project', 'agent', user, 'app.txt', first.id)).toEqual(beforeCommit);
		expect((await service.status('project', 'agent', user, first.id)).uncommittedChanges).toBe(0);
		expect(
			(await service.diff('project', 'agent', user, 'new file.txt', second.id)).content,
		).toContain('+second worktree');

		executions.findLatestByThreadId.mockResolvedValue(
			mock<AgentExecution>({ threadId: first.id, status: 'running' }),
		);
		await expect(service.archiveSession('project', 'agent', user, first.id, true)).rejects.toThrow(
			'Wait for this session',
		);
		executions.findLatestByThreadId.mockResolvedValue(null);
		await service.archiveSession('project', 'agent', user, first.id, true);
		expect(
			(await service.sessions('project', 'agent', user)).sessions.find(
				(session) => session.id === first.id,
			)?.archivedAt,
		).not.toBeNull();
		await expect(
			service.action('project', 'agent', user, { sessionId: chat.id, action: 'check' }),
		).rejects.toThrow('Reopen');
		await expect(service.createChat('project', 'agent', user, first.id)).rejects.toThrow('Reopen');
		await service.archiveSession('project', 'agent', user, first.id, false);
		expect(
			(await service.sessions('project', 'agent', user)).sessions.find(
				(session) => session.id === first.id,
			)?.archivedAt,
		).toBeNull();
		expect(await service.diff('project', 'agent', user, 'app.txt', first.id)).toEqual(beforeCommit);
		expect(await service.diff('project', 'agent', user, 'app.txt', chat.id)).toEqual(beforeCommit);
		await expect(
			service.file('project', 'agent', user, '../repo/app.txt', first.id),
		).rejects.toThrow('inside the repository');
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}, 30_000);
