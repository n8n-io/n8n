import { createHash, randomUUID } from 'node:crypto';

import { join, normalize } from 'node:path/posix';

import {
	AgentCodingStatusSchema,
	AgentCodingSessionSchema,
	type AgentCodingCreateSession,
	type AgentCodingChat,
	type AgentCodingSession,
	type AgentCodingSessionSummary,
	type AgentCodingSessions,
	type AgentCodingAction,
	type AgentCodingConfig,
	type AgentCodingFile,
	type AgentCodingFileContent,
	type AgentCodingDiffContent,
	type AgentCodingPreview,
	type AgentCodingStatus,
} from '@n8n/api-types';
import { shellEscape, type ExecuteCommandOptions } from '@n8n/agents/sandbox';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { LockService, LockNamespace } from '@n8n/backend-common';
import { z } from 'zod';
import { BadRequestError } from '@n8n/errors';
import { redactText } from '@n8n/utils/redaction/redact-text';
import { OperationalError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { hashAgentSandboxPrincipal } from './agent-sandbox-principal';
import {
	sanitizeSandboxErrorDetail,
	type AgentSandboxRuntime,
} from './agent-sandbox-runtime.service';
import { AgentWorkspaceService } from './agent-workspace.service';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import {
	codingSessionDirectory,
	codingSessionPaths,
	readCodingSession,
} from './agent-coding-session';
import {
	buildLaunchCommand,
	buildLaunchScript,
	buildSetupBootstrap,
	buildStatusCommand,
	buildStopCommand,
	codingCheckTimeLimitSeconds,
} from './agent-coding-scripts';
import { parseCodingSessionsOutput, parseCodingStatusOutput } from './agent-coding-status';
import { SandboxPreviewUnavailableError } from './sandbox-preview/sandbox-port-capability.service';
import { SandboxPreviewService } from './sandbox-preview/sandbox-preview.service';

interface CodingContext {
	config: AgentCodingConfig;
	handle: AgentSandboxRuntime;
	root: string;
	meta: string;
	session?: AgentCodingSession;
}

@Service()
export class AgentCodingService {
	// oxlint-disable-next-line eslint/max-params -- DI constructor injection
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly workspaceService: AgentWorkspaceService,
		private readonly credentialsService: CredentialsService,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly lockService: LockService,
		private readonly sandboxPreviewService: SandboxPreviewService,
	) {}

	private async context(
		projectId: string,
		agentId: string,
		user: User,
		sessionId?: string,
	): Promise<CodingContext> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const config = agent.schema?.coding;
		if (!config) throw new BadRequestError('Set up coding for this agent first');
		const principal = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: user.id });
		const { handle } = await this.workspaceService.getAgentWorkspace(projectId, agentId, principal);
		const session = sessionId
			? await readCodingSession(handle.filesystem, handle.workspaceRoot, sessionId)
			: undefined;
		return { config, handle, session, ...codingSessionPaths(handle.workspaceRoot, session) };
	}

	private async execute(context: CodingContext, command: string, options?: ExecuteCommandOptions) {
		const execute = context.handle.sandbox.executeCommand;
		if (!execute) throw new BadRequestError('This sandbox cannot run commands');
		return await execute.call(context.handle.sandbox, command, [], {
			cwd: context.handle.workspaceRoot,
			timeout: 30_000,
			...options,
		});
	}

	private async checked(context: CodingContext, command: string, options?: ExecuteCommandOptions) {
		const result = await this.execute(context, command, options);
		if (!result.success) {
			throw new OperationalError(
				sanitizeSandboxErrorDetail(result.stderr || result.stdout || 'Sandbox command failed'),
			);
		}
		return result;
	}

	private path(context: CodingContext, path: string): string {
		const normalized = normalize(path);
		if (
			path.includes('\0') ||
			path.startsWith('/') ||
			normalized === '..' ||
			normalized.startsWith('../')
		) {
			throw new BadRequestError('Select a file inside the repository');
		}
		if (path.split('/').includes('.git')) {
			throw new BadRequestError('Git metadata is not available in the file viewer');
		}
		return join(context.root, path);
	}

	/**
	 * Returns the raw output of the facts script. Callers parse it with parseCodingStatusOutput()
	 * or parseCodingSessionsOutput().
	 */
	private async inspect(context: CodingContext, mode: 'status' | 'sessions'): Promise<string> {
		const probePath = context.config.repositoryUrl.includes('n8n-io/n8n')
			? '/healthz/readiness'
			: '/';
		const command = buildStatusCommand({
			workspaceRoot: context.handle.workspaceRoot,
			port: context.config.port,
			probePath,
			mode,
			sessionId: context.session?.id,
		});
		return (await this.checked(context, command)).stdout;
	}

	async status(
		projectId: string,
		agentId: string,
		user: User,
		sessionId?: string,
	): Promise<AgentCodingStatus> {
		const context = await this.context(projectId, agentId, user, sessionId);
		return parseCodingStatusOutput(await this.inspect(context, 'status'));
	}

	async sessions(projectId: string, agentId: string, user: User): Promise<AgentCodingSessions> {
		const context = await this.context(projectId, agentId, user);
		const result = z
			.object({
				sessions: z.array(AgentCodingSessionSchema.extend({ status: AgentCodingStatusSchema })),
				branches: z.array(z.string()),
			})
			.parse(parseCodingSessionsOutput(await this.inspect(context, 'sessions')));
		const threads = await this.threadRepository.findCodingSessionThreads(
			projectId,
			agentId,
			user.id,
			result.sessions.flatMap((session) => [session.id, ...session.chatIds]),
		);
		const threadIds = new Set(threads.map((thread) => thread.id));
		const titles = new Map(threads.map((thread) => [thread.id, thread.title]));
		const executions = await Promise.all(
			[...threadIds].map(async (id) => await this.executionRepository.findLatestByThreadId(id)),
		);
		const latest = new Map(
			executions.flatMap((execution) =>
				execution ? [[execution.threadId, execution] as const] : [],
			),
		);
		const sessions: AgentCodingSessionSummary[] = [];
		for (const session of result.sessions) {
			if (!session.hasConversation && threadIds.has(session.id)) {
				session.hasConversation = true;
			}
			let activity: AgentCodingSessionSummary['activity'] = 'idle';
			const chatIds = [session.id, ...session.chatIds];
			const chatExecutions = chatIds.map((id) => latest.get(id));
			const execution =
				chatExecutions.find((item) => item?.status === 'running') ??
				chatExecutions.find((item) => item?.hitlStatus === 'suspended') ??
				chatExecutions.at(-1);
			const executionStatus = execution?.status;
			if (executionStatus === 'running') activity = 'running';
			else if (execution?.hitlStatus === 'suspended') activity = 'waiting';
			else if (executionStatus === 'error' || executionStatus === 'cancelled') activity = 'error';
			else if (executionStatus) activity = 'completed';
			const chats = chatIds.map((id) => ({
				id,
				title: titles.get(id) ?? undefined,
				hasConversation: threadIds.has(id) || (id === session.id && session.hasConversation),
			}));
			sessions.push({ ...session, activity, chats });
		}
		return {
			sessions: sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
			branches: result.branches,
		};
	}

	async createSession(
		projectId: string,
		agentId: string,
		user: User,
		request: AgentCodingCreateSession,
	) {
		const context = await this.context(projectId, agentId, user);
		// Git also guards branch creation. Keep the metadata update in the same operation.
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			`coding:${context.handle.cacheKey}`,
			async () => {
				const state = parseCodingStatusOutput(await this.inspect(context, 'status'));
				if (state.phase !== 'ready')
					throw new BadRequestError('Prepare the repository before creating a session');
				if (request.original) {
					const existing = (await this.sessions(projectId, agentId, user)).sessions.find(
						(session) => session.original,
					);
					if (existing) return AgentCodingSessionSchema.parse(existing);
				}
				const id = request.id ?? randomUUID();
				const directory = codingSessionDirectory(context.handle.workspaceRoot, id);
				if (await context.handle.filesystem.exists(join(directory, 'session.json'))) {
					return await readCodingSession(
						context.handle.filesystem,
						context.handle.workspaceRoot,
						id,
					);
				}
				const baseBranch = request.original
					? state.branch
					: request.baseBranch || context.config.branch || state.branch;
				const baseCommit = await this.resolveBase(context, baseBranch, projectId, agentId, user);
				const slug =
					request.name
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/^-|-$/g, '')
						.slice(0, 48) || 'session';
				const branch = request.original
					? state.branch
					: request.branch || `coding/${slug}-${id.slice(0, 8)}`;
				const session: AgentCodingSession = {
					id,
					name: request.name,
					branch,
					baseBranch,
					baseCommit,
					original: request.original,
					createdAt: new Date().toISOString(),
					archivedAt: null,
					hasConversation: false,
					chatIds: [],
				};
				await context.handle.filesystem.mkdir(directory, { recursive: true });
				if (!request.original) {
					await this.checked(context, `git check-ref-format --branch ${shellEscape(branch)}`, {
						cwd: context.root,
					});
					await this.checked(
						context,
						`git worktree add -b ${shellEscape(branch)} ${shellEscape(join(directory, 'repo'))} ${shellEscape(baseCommit)}`,
						{ cwd: context.root },
					);
				}
				await this.saveSession(context, session);
				if (!request.original) {
					const worktree = {
						...context,
						session,
						...codingSessionPaths(context.handle.workspaceRoot, session),
					};
					await this.launch(worktree, 'setup', this.worktreeSetupCommand(worktree));
				}
				return session;
			},
		);
	}

	async createChat(
		projectId: string,
		agentId: string,
		user: User,
		sessionId: string,
	): Promise<AgentCodingChat> {
		const context = await this.context(projectId, agentId, user, sessionId);
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			`coding:${context.handle.cacheKey}`,
			async () => {
				const session = await readCodingSession(
					context.handle.filesystem,
					context.handle.workspaceRoot,
					sessionId,
				);
				if (session.archivedAt)
					throw new BadRequestError('Reopen this worktree before starting a chat');
				const status = parseCodingStatusOutput(await this.inspect(context, 'status'));
				if (status.phase !== 'ready')
					throw new BadRequestError('Prepare the worktree before starting a chat');
				const id = randomUUID();
				await context.handle.filesystem.mkdir(
					codingSessionDirectory(context.handle.workspaceRoot, id),
					{ recursive: true },
				);
				await this.saveSession(context, { id, worktreeId: session.id });
				await this.saveSession(context, { ...session, chatIds: [...session.chatIds, id] });
				return { id, hasConversation: false };
			},
		);
	}

	private async resolveBase(
		context: CodingContext,
		branch: string,
		projectId: string,
		agentId: string,
		user: User,
	) {
		if (!branch || branch.startsWith('-')) throw new BadRequestError('Select a base branch');
		const command = `git rev-parse --verify --end-of-options ${shellEscape(`${branch}^{commit}`)}`;
		let result = await this.execute(context, command, { cwd: context.root });
		if (!result.success) {
			await this.checked(
				context,
				`git fetch --depth 1 origin ${shellEscape(branch.replace(/^origin\//, ''))}`,
				{
					cwd: context.root,
					env: await this.gitEnv(context, projectId, agentId, user),
					timeout: 60_000,
				},
			);
			result = await this.checked(context, 'git rev-parse --verify FETCH_HEAD', {
				cwd: context.root,
			});
		}
		return z
			.string()
			.regex(/^[a-f0-9]{40,64}$/)
			.parse(result.stdout.trim());
	}

	private async saveSession(
		context: CodingContext,
		session: AgentCodingSession | { id: string; worktreeId: string },
	) {
		const path = join(
			codingSessionDirectory(context.handle.workspaceRoot, session.id),
			'session.json',
		);
		const temporaryPath = `${path}.${randomUUID()}.tmp`;
		await context.handle.filesystem.writeFile(temporaryPath, JSON.stringify(session));
		await context.handle.filesystem.moveFile(temporaryPath, path, { overwrite: true });
	}

	/** The setup script of a worktree. The worktree exists, so setup only installs. */
	private worktreeSetupCommand(context: CodingContext): string {
		return [
			`printf installing > ${shellEscape(join(context.meta, 'stage'))}`,
			`cd ${shellEscape(context.root)}`,
			context.config.setupCommand || 'true',
			`printf ready > ${shellEscape(join(context.meta, 'stage'))}`,
		].join('\n');
	}

	async archiveSession(
		projectId: string,
		agentId: string,
		user: User,
		sessionId: string,
		archived: boolean,
	) {
		const context = await this.context(projectId, agentId, user, sessionId);
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			`coding:${context.handle.cacheKey}`,
			async () => {
				const session = await readCodingSession(
					context.handle.filesystem,
					context.handle.workspaceRoot,
					sessionId,
				);
				const summary = (await this.sessions(projectId, agentId, user)).sessions.find(
					(item) => item.id === session.id,
				);
				if (
					archived &&
					(summary?.activity === 'running' ||
						summary?.status.check === 'running' ||
						['cloning', 'installing'].includes(summary?.status.phase ?? ''))
				) {
					throw new BadRequestError('Wait for this session to finish before archiving it');
				}
				if (archived) await this.stopApp(context);
				await this.saveSession(context, {
					...session,
					hasConversation: summary?.hasConversation ?? session.hasConversation,
					archivedAt: archived ? new Date().toISOString() : null,
				});
				return { accepted: true };
			},
		);
	}

	async files(
		projectId: string,
		agentId: string,
		user: User,
		path: string,
		search = '',
		sessionId?: string,
	): Promise<AgentCodingFile[]> {
		const context = await this.context(projectId, agentId, user, sessionId);
		if (search.trim()) {
			const result = await this.checked(
				context,
				'git ls-files --cached --others --exclude-standard -z',
				{ cwd: context.root },
			);
			return result.stdout
				.split('\0')
				.filter((file) => file && file.toLowerCase().includes(search.toLowerCase()))
				.slice(0, 200)
				.map((file) => ({ name: file.split('/').pop() ?? file, path: file, type: 'file' }));
		}
		const entries = await context.handle.filesystem.readdir(this.path(context, path));
		return entries
			.filter((entry) => !['.git', 'node_modules', '.turbo'].includes(entry.name))
			.map((entry) => ({ name: entry.name, path: join(path, entry.name), type: entry.type }))
			.sort((left, right) => {
				if (left.type !== right.type) return left.type === 'directory' ? -1 : 1;
				return left.name.localeCompare(right.name);
			});
	}

	async file(
		projectId: string,
		agentId: string,
		user: User,
		path: string,
		sessionId?: string,
	): Promise<AgentCodingFileContent> {
		const context = await this.context(projectId, agentId, user, sessionId);
		const relativePath = path.startsWith(`${context.root}/`)
			? path.slice(context.root.length + 1)
			: path;
		const target = this.path(context, relativePath);
		const stat = await context.handle.filesystem.stat(target);
		if (stat.type !== 'file' || stat.size > 1024 * 1024) {
			throw new BadRequestError('Select a text file smaller than 1 MB');
		}
		const content = await context.handle.filesystem.readFile(target);
		return { path: normalize(relativePath), content: content.toString() };
	}

	async diff(
		projectId: string,
		agentId: string,
		user: User,
		path: string,
		sessionId?: string,
	): Promise<AgentCodingDiffContent> {
		const context = await this.context(projectId, agentId, user, sessionId);
		this.path(context, path);
		const tracked = await this.execute(
			context,
			`git cat-file -e ${shellEscape(`${context.session?.baseCommit ?? 'HEAD'}:${path}`)}`,
			{ cwd: context.root },
		);
		const currentTracked = await this.execute(
			context,
			`git ls-files --error-unmatch -- ${shellEscape(path)}`,
			{ cwd: context.root },
		);
		const command =
			tracked.success || currentTracked.success
				? `git diff --no-ext-diff ${shellEscape(context.session?.baseCommit ?? 'HEAD')} -- ${shellEscape(path)}`
				: `git diff --no-ext-diff --no-index -- /dev/null ${shellEscape(path)}`;
		const result = await this.execute(context, command, { cwd: context.root });
		if (result.exitCode > 1)
			throw new OperationalError(sanitizeSandboxErrorDetail(result.stderr || result.stdout));
		return {
			path,
			content: result.stdout.slice(0, 1024 * 1024),
			revision: createHash('sha256').update(result.stdout).digest('hex'),
		};
	}

	async logs(
		projectId: string,
		agentId: string,
		user: User,
		stream: 'setup' | 'app' | 'check',
		sessionId?: string,
	) {
		const context = await this.context(projectId, agentId, user, sessionId);
		const result = await this.execute(
			context,
			`tail -c 60000 ${shellEscape(join(context.meta, `${stream}.log`))} 2>/dev/null || true`,
		);
		return { content: redactText(result.stdout).text };
	}

	/**
	 * A sandbox that cannot show previews gives `available: false`, so the editor
	 * can explain it in place. Other failures still throw.
	 */
	async preview(
		projectId: string,
		agentId: string,
		user: User,
		sessionId?: string,
	): Promise<AgentCodingPreview> {
		const context = await this.context(projectId, agentId, user, sessionId);
		const state = parseCodingStatusOutput(await this.inspect(context, 'status'));
		if (!['starting', 'running'].includes(state.app)) {
			throw new BadRequestError('Run the app for this session before opening its preview');
		}
		const sandbox = context.handle.sandbox;
		if (context.handle.provider === 'n8n-sandbox') {
			try {
				const { url } = await this.sandboxPreviewService.open(sandbox, {
					userId: user.id,
					projectId,
					port: context.config.port,
				});
				return { available: true, url };
			} catch (error) {
				if (error instanceof SandboxPreviewUnavailableError) return { available: false };
				throw error;
			}
		}
		if (!sandbox.getPreviewUrl) return { available: false };
		return { available: true, url: await sandbox.getPreviewUrl(context.config.port) };
	}

	async action(projectId: string, agentId: string, user: User, request: AgentCodingAction) {
		const context = await this.context(projectId, agentId, user, request.sessionId);
		if (context.session?.archivedAt && request.action !== 'stop') {
			throw new BadRequestError('Reopen this coding session first');
		}
		await context.handle.filesystem.mkdir(context.meta, { recursive: true });
		switch (request.action) {
			case 'prepare':
				await this.prepare(context, projectId, agentId, user);
				break;
			case 'start':
				await this.start(context);
				break;
			case 'stop':
				await this.stopApp(context);
				break;
			case 'check':
				if (!context.config.checkCommand.trim())
					throw new BadRequestError('Add a check command in coding settings');
				await this.launch(
					context,
					'check',
					`cd ${shellEscape(context.root)}\n${context.config.checkCommand}`,
				);
				break;
			case 'undo':
				await this.undo(context, request.path ?? '');
				break;
			case 'commit':
				if (!request.message) throw new BadRequestError('Enter a commit message');
				await this.checked(
					context,
					`git add -A && git -c user.name='n8n coding demo' -c user.email='coding-demo@example.com' commit -m ${shellEscape(request.message)}`,
					{ cwd: context.root },
				);
				break;
			case 'push':
				await this.checked(context, 'git push origin HEAD', {
					cwd: context.root,
					env: await this.gitEnv(context, projectId, agentId, user),
				});
		}
		return { accepted: true };
	}

	private async gitEnv(
		context: CodingContext,
		projectId: string,
		agentId: string,
		user: User,
	): Promise<NodeJS.ProcessEnv> {
		const env: NodeJS.ProcessEnv = { GIT_TERMINAL_PROMPT: '0' };
		if (!context.config.credentialId) return env;
		const provider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
			agentId,
		);
		const credential = await provider.resolve(context.config.credentialId);
		const token = credential.accessToken ?? credential.password ?? credential.apiKey;
		if (typeof token !== 'string' || !token)
			throw new BadRequestError('Select a GitHub access token credential');
		const askpass = join(context.meta, 'askpass.sh');
		await context.handle.filesystem.writeFile(
			askpass,
			'#!/bin/sh\ncase "$1" in *Username*) printf "%s" "$CODING_GIT_USERNAME" ;; *) printf "%s" "$CODING_GIT_TOKEN" ;; esac\n',
		);
		await this.checked(context, `chmod 700 ${shellEscape(askpass)}`);
		return {
			...env,
			GIT_ASKPASS: askpass,
			CODING_GIT_USERNAME: 'x-access-token',
			CODING_GIT_TOKEN: token,
		};
	}

	private async prepare(context: CodingContext, projectId: string, agentId: string, user: User) {
		if (context.session && !context.session.original) {
			await this.launch(context, 'setup', this.worktreeSetupCommand(context));
			return;
		}
		if (await context.handle.filesystem.exists(join(context.root, '.git'))) {
			const remote = await this.checked(context, 'git remote get-url origin', {
				cwd: context.root,
			});
			if (remote.stdout.trim() !== context.config.repositoryUrl) {
				throw new BadRequestError(
					'This sandbox already contains a different repository. Keep its repository URL to preserve the checkout',
				);
			}
		}
		const branch = context.config.branch.trim();
		const clone = `git clone --depth 1 ${branch ? `--branch ${shellEscape(branch)}` : ''} -- ${shellEscape(context.config.repositoryUrl)} ${shellEscape(context.root)}`;
		await this.launch(
			context,
			'setup',
			[
				`printf cloning > ${shellEscape(join(context.meta, 'stage'))}`,
				`if [ ! -d ${shellEscape(join(context.root, '.git'))} ]; then ${clone}; fi`,
				`cd ${shellEscape(context.root)}`,
				`printf installing > ${shellEscape(join(context.meta, 'stage'))}`,
				`bash -e -c ${shellEscape(context.config.setupCommand || 'true')}`,
				`printf ready > ${shellEscape(join(context.meta, 'stage'))}`,
			].join('\n'),
			await this.gitEnv(context, projectId, agentId, user),
		);
	}

	private async start(context: CodingContext) {
		if (!context.config.runCommand.trim())
			throw new BadRequestError('Add a run command in coding settings');
		const state = parseCodingStatusOutput(await this.inspect(context, 'status'));
		if (state.phase !== 'ready') throw new BadRequestError('Wait for this session to finish setup');
		const env: NodeJS.ProcessEnv = { N8N_USER_FOLDER: join(context.meta, 'app-data') };
		if (context.handle.sandbox.getPreviewUrl) {
			const url = new URL(await context.handle.sandbox.getPreviewUrl(context.config.port));
			env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = url.hostname.slice(url.hostname.indexOf('.'));
			env.N8N_EDITOR_BASE_URL = url.origin;
			env.N8N_WEBHOOK_URL = `${url.origin}/`;
		}
		await this.launch(
			context,
			'app',
			`cd ${shellEscape(context.root)}\n${context.config.runCommand}`,
			env,
		);
	}

	private previewLock(context: CodingContext): string {
		return `exec 9>${shellEscape(join(context.handle.workspaceRoot, '.coding', 'preview.lock'))}\nflock -w 30 9 || exit 1`;
	}

	private async stopApp(context: CodingContext) {
		const stop = buildStopCommand(context.handle.workspaceRoot, context.meta, false);
		await this.checked(context, `${this.previewLock(context)}\n${stop}`);
	}

	private async launch(
		context: CodingContext,
		name: 'setup' | 'app' | 'check',
		command: string,
		env?: NodeJS.ProcessEnv,
	) {
		const { workspaceRoot } = context.handle;
		const script = join(context.meta, `${name}.sh`);
		await context.handle.filesystem.writeFile(
			script,
			buildLaunchScript({
				workspaceRoot,
				meta: context.meta,
				name,
				command,
				bootstrap:
					name === 'setup' ? buildSetupBootstrap(context.config, workspaceRoot, context.meta) : '',
				timeLimitSeconds: name === 'check' ? codingCheckTimeLimitSeconds(context.config) : 0,
			}),
		);
		const app = name === 'app';
		await this.checked(
			context,
			buildLaunchCommand({
				meta: context.meta,
				name,
				script,
				lock: app ? this.previewLock(context) : undefined,
				beforeLaunch: app ? buildStopCommand(workspaceRoot, context.meta, true) : undefined,
			}),
			{ env },
		);
	}

	private async undo(context: CodingContext, path: string) {
		if (!path || normalize(path) === '.')
			throw new BadRequestError('Select one changed file to undo');
		const target = this.path(context, path);
		const tracked = await this.execute(context, `git cat-file -e ${shellEscape(`HEAD:${path}`)}`, {
			cwd: context.root,
		});
		if (tracked.success) {
			await this.checked(
				context,
				`git restore --source=HEAD --staged --worktree -- ${shellEscape(path)}`,
				{ cwd: context.root },
			);
		} else {
			await this.checked(context, `git rm --cached --ignore-unmatch -- ${shellEscape(path)}`, {
				cwd: context.root,
			});
			await context.handle.filesystem.deleteFile(target, { force: true });
		}
	}
}
