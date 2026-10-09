import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { AgentCodingConfigSchema, type AgentCodingStatus } from '@n8n/api-types';
import type { WorkspaceFilesystem, WorkspaceSandbox } from '@n8n/agents';
import type { SandboxProvider } from '@n8n/agents/sandbox';
import type { LockService, Logger } from '@n8n/backend-common';
import { createFakeOutboundHttp } from '@n8n/backend-network/testing';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';
import type { CredentialsService } from '@/credentials/credentials.service';
import { JwtService } from '@/services/jwt.service';
import type { SandboxSettingsService } from '@/services/sandbox-settings.service';
import { AgentCodingService } from '../agent-coding.service';
import { codingSessionPaths } from '../agent-coding-session';
import type { CodingMetaFacts, CodingProcessFacts } from '../agent-coding-status';
import type { AgentSandboxRuntime } from '../agent-sandbox-runtime.service';
import type { AgentWorkspaceService } from '../agent-workspace.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import {
	SandboxPortCapability,
	SandboxPreviewUnavailableError,
} from '../sandbox-preview/sandbox-port-capability.service';
import { SandboxPreviewService } from '../sandbox-preview/sandbox-preview.service';
import { createShallowClone } from './test-utils/coding-sandbox';

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
		mock<SandboxPreviewService>(),
	);
	return { service, threads, executions };
}

const RUN = 'boot-a:4242';
const IDLE: CodingProcessFacts = {
	pid: null,
	exit: null,
	stopped: null,
	started: null,
	heartbeatAgeMs: null,
	alive: false,
};
const RUNNING: CodingProcessFacts = {
	...IDLE,
	pid: '42',
	started: RUN,
	heartbeatAgeMs: 0,
	alive: true,
};
const APP_FACTS: Record<AgentCodingStatus['app'], CodingProcessFacts> = {
	running: RUNNING,
	starting: RUNNING,
	stopped: IDLE,
	error: { ...IDLE, pid: '42', started: RUN, exit: '1' },
};

/** Facts script output of a prepared checkout whose app is in the state `app`. */
function factsOutput(app: AgentCodingStatus['app']): string {
	const status: CodingMetaFacts = {
		stage: 'ready',
		repoExists: true,
		appResponds: app === 'running',
		processes: {
			setup: { ...IDLE, pid: '41', started: RUN, exit: '0' },
			app: APP_FACTS[app],
			check: IDLE,
		},
		git: { branch: 'main\n', nameStatus: '', numstat: '', porcelain: '', untracked: [] },
	};
	return JSON.stringify({ incarnation: RUN, status });
}

/**
 * A coding service whose facts probe answers with the output for `app`, so these tests
 * do not depend on the script that runs in the sandbox.
 */
function codingService(
	provider: SandboxProvider,
	sandbox: WorkspaceSandbox,
	sandboxPreviewService: SandboxPreviewService,
) {
	const config = AgentCodingConfigSchema.parse({
		repositoryUrl: 'https://example.invalid/demo.git',
		port: 5173,
	});
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockResolvedValue(
		mock<Agent>({ schema: { name: 'Coding', model: 'test', instructions: '', coding: config } }),
	);
	const workspaceService = mock<AgentWorkspaceService>();
	workspaceService.getAgentWorkspace.mockResolvedValue({
		workspace: mock(),
		handle: mock<AgentSandboxRuntime>({
			provider,
			sandbox,
			filesystem: mock<WorkspaceFilesystem>(),
			workspaceRoot: '/home/user/workspace',
			cacheKey: 'workspace',
		}),
	});
	const service = new AgentCodingService(
		agentRepository,
		workspaceService,
		mock<CredentialsService>(),
		mock<AgentExecutionThreadRepository>(),
		mock<AgentExecutionRepository>(),
		mock<LockService>(),
		sandboxPreviewService,
	);
	const inspect = vi.spyOn(service as unknown as { inspect: () => Promise<unknown> }, 'inspect');
	inspect.mockResolvedValue(factsOutput('running'));
	return { service, inspect };
}

function previewService(provider: SandboxProvider, sandbox: WorkspaceSandbox) {
	const sandboxPreviewService = mock<SandboxPreviewService>();
	return { ...codingService(provider, sandbox, sandboxPreviewService), sandboxPreviewService };
}

/** The real preview service, with a sandbox service whose `/healthz` lists `capabilities`. */
function realPreviewService(capabilities: string[]) {
	const { outboundHttp } = createFakeOutboundHttp(
		[{ pathname: '/healthz', status: 200, body: { status: 'ok', capabilities } }],
		vi.fn as unknown as Parameters<typeof createFakeOutboundHttp>[1],
	);
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const jwtService = new JwtService(
		mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
		mock<GlobalConfig>({ userManagement: { jwtSecret: '' } }),
		mock(),
	);
	return new SandboxPreviewService(
		jwtService,
		mock<SandboxSettingsService>(),
		new SandboxPortCapability(logger, outboundHttp),
		mock<GlobalConfig>({ path: '/' }),
	);
}

describe('AgentCodingService.preview', () => {
	const user = mock<User>({ id: 'test-user' });

	describe('on the n8n sandbox service', () => {
		it.each(['running', 'starting'] as const)(
			'returns the n8n proxy URL while the app is %s',
			async (app) => {
				const getPreviewUrl = vi.fn();
				const sandbox = mock<WorkspaceSandbox>({ getPreviewUrl });
				const { service, sandboxPreviewService, inspect } = previewService('n8n-sandbox', sandbox);
				inspect.mockResolvedValue(factsOutput(app));
				sandboxPreviewService.open.mockResolvedValue({ url: '/sandbox-preview/token/' });

				const preview = await service.preview('project', 'agent', user);

				expect(preview).toEqual({ available: true, url: '/sandbox-preview/token/' });
				expect(sandboxPreviewService.open).toHaveBeenCalledWith(sandbox, {
					userId: 'test-user',
					projectId: 'project',
					port: 5173,
				});
				expect(getPreviewUrl).not.toHaveBeenCalled();
			},
		);

		it('reports no preview, without an error, for a service without the ports capability', async () => {
			const { service, sandboxPreviewService } = previewService(
				'n8n-sandbox',
				mock<WorkspaceSandbox>(),
			);
			sandboxPreviewService.open.mockRejectedValue(
				new SandboxPreviewUnavailableError('This sandbox service cannot show app previews yet.'),
			);

			await expect(service.preview('project', 'agent', user)).resolves.toEqual({
				available: false,
			});
		});

		it.each([
			['a service that cannot be reached', new ServiceUnavailableError('Try again in a moment.')],
			['another bad request', new BadRequestError('The preview port is not valid')],
		])('passes on the error of %s', async (_case, error) => {
			const { service, sandboxPreviewService } = previewService(
				'n8n-sandbox',
				mock<WorkspaceSandbox>(),
			);
			sandboxPreviewService.open.mockRejectedValue(error);

			await expect(service.preview('project', 'agent', user)).rejects.toBe(error);
		});

		it.each(['stopped', 'error'] as const)(
			'asks to run the app first when the app is %s',
			async (app) => {
				const { service, sandboxPreviewService, inspect } = previewService(
					'n8n-sandbox',
					mock<WorkspaceSandbox>(),
				);
				inspect.mockResolvedValue(factsOutput(app));

				await expect(service.preview('project', 'agent', user)).rejects.toThrow(
					'Run the app for this session before opening its preview',
				);
				expect(sandboxPreviewService.open).not.toHaveBeenCalled();
			},
		);
	});

	describe('on the n8n sandbox service, with the real preview service', () => {
		const route = {
			serviceUrl: 'http://sandbox-service.test',
			path: '/sandboxes/sb-1/ports/5173',
		};

		it('returns a URL whose token names the user, the project and the port route', async () => {
			const getPortRoute = vi.fn().mockResolvedValue(route);
			const previews = realPreviewService(['exec', 'ports']);
			const { service } = codingService(
				'n8n-sandbox',
				mock<WorkspaceSandbox>({ getPortRoute }),
				previews,
			);

			const preview = await service.preview('project', 'agent', user);

			expect(preview).toEqual({
				available: true,
				url: expect.stringMatching(/^\/sandbox-preview\/[^/]+\/$/),
			});
			const { url } = preview as { url: string };
			expect(previews.resolveToken(url.split('/')[2])).toEqual(
				expect.objectContaining({ userId: 'test-user', projectId: 'project', ...route }),
			);
			expect(getPortRoute).toHaveBeenCalledWith(5173);
		});

		it('reports no preview when the service cannot serve ports', async () => {
			const getPortRoute = vi.fn().mockResolvedValue(route);
			const { service } = codingService(
				'n8n-sandbox',
				mock<WorkspaceSandbox>({ getPortRoute }),
				realPreviewService(['exec']),
			);

			await expect(service.preview('project', 'agent', user)).resolves.toEqual({
				available: false,
			});
		});

		it('reports no preview when the sandbox has no port route', async () => {
			const { service } = codingService(
				'n8n-sandbox',
				mock<WorkspaceSandbox>({ getPortRoute: undefined }),
				realPreviewService(['exec', 'ports']),
			);

			await expect(service.preview('project', 'agent', user)).resolves.toEqual({
				available: false,
			});
		});
	});

	describe('on Daytona', () => {
		it('keeps returning the signed Daytona preview URL', async () => {
			const getPreviewUrl = vi
				.fn()
				.mockResolvedValue('https://5173-sandbox.proxy.daytona.test/?t=1');
			const { service, sandboxPreviewService } = previewService(
				'daytona',
				mock<WorkspaceSandbox>({ getPreviewUrl }),
			);

			const preview = await service.preview('project', 'agent', user);

			expect(preview).toEqual({
				available: true,
				url: 'https://5173-sandbox.proxy.daytona.test/?t=1',
			});
			expect(getPreviewUrl).toHaveBeenCalledWith(5173);
			expect(sandboxPreviewService.open).not.toHaveBeenCalled();
		});

		it('reports no preview for a sandbox without a preview URL', async () => {
			const { service, sandboxPreviewService } = previewService(
				'daytona',
				mock<WorkspaceSandbox>({ getPreviewUrl: undefined }),
			);

			await expect(service.preview('project', 'agent', user)).resolves.toEqual({
				available: false,
			});
			expect(sandboxPreviewService.open).not.toHaveBeenCalled();
		});
	});
});

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

it('offers the branches of a shallow clone as base branches, without the remote name', async () => {
	const root = await mkdtemp(join(tmpdir(), 'n8n-coding-branches-'));
	const user = mock<User>({ id: 'test-user' });
	try {
		await createShallowClone(join(root, 'remote'), join(root, 'repo'), { 'app.txt': 'original\n' });
		const { service } = localService(root);
		const session = await service.createSession('project', 'agent', user, {
			name: 'Due dates',
			original: false,
			baseBranch: 'main',
			branch: 'agent/due-dates',
		});

		const { branches } = await service.sessions('project', 'agent', user);

		expect(session.branch).toBe('agent/due-dates');
		expect(branches).toEqual(['agent/due-dates', 'main', 'origin/main']);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}, 30_000);
