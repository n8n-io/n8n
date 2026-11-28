import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createInstanceAgent, McpClientManager, type InstanceAiContext } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AgentChatAttachmentService } from '@/modules/agents/agent-chat-attachment.service';
import { AgentMessageQueueConsumer } from '@/modules/agents/agent-message-queue-consumer.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnOutcome,
} from '@/modules/agents/system-agents/system-agent.types';
import { SYSTEM_CHAT_SOURCE } from '@/modules/agents/utils/agent-thread-access';

import { createOwner } from '../shared/db/users';

type StreamPrompt = Parameters<MockLanguageModelV3['doStream']>[0]['prompt'];
type ModelStreamPart = Awaited<
	ReturnType<MockLanguageModelV3['doStream']>
>['stream'] extends ReadableStream<infer Part>
	? Part
	: never;

const AGENT_ID = 'parse-file-integration-system-agent';
const USAGE = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

interface HandoverFile {
	path: string;
	sha256: string;
	content: string;
}

interface SourceHandoverPayload {
	version: number;
	repo: string;
	files: HandoverFile[];
}

interface ParseFileResultView {
	fileId?: string;
	fileName?: string;
	format?: string;
	content?: string;
	totalChars?: number;
	totalRows?: number;
	truncated?: boolean;
	nextStartChar?: number;
	error?: string;
}

function sha256(content: string): string {
	return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function buildLargeHandoverJson(): { payload: SourceHandoverPayload; rawJson: string } {
	const files: HandoverFile[] = Array.from({ length: 14 }, (_, index) => {
		const header = `// Stored handover file ${index + 1} of 14 — 🚀😀\n`;
		const line = `export const entry_${index} = "quoted \\"payload\\" with 🚀";\n`;
		const content = `${header}${line.repeat(360)}// end-${index}\n`;
		return {
			path: `src/file-${String(index + 1).padStart(2, '0')}.ts`,
			sha256: sha256(content),
			content,
		};
	});

	const payload: SourceHandoverPayload = {
		version: 1,
		repo: 'acme/stored-handover',
		files,
	};
	return { payload, rawJson: `${JSON.stringify(payload, null, 2)}\n` };
}

function createDomainContext(turn: SystemAgentTurn): InstanceAiContext {
	return {
		userId: turn.user.id,
		workflowService: mock<InstanceAiContext['workflowService']>(),
		executionService: mock<InstanceAiContext['executionService']>(),
		credentialService: mock<InstanceAiContext['credentialService']>(),
		nodeService: mock<InstanceAiContext['nodeService']>(),
		dataTableService: mock<InstanceAiContext['dataTableService']>(),
		workflowTemplateService: mock<InstanceAiContext['workflowTemplateService']>(),
		logger: mock<InstanceAiContext['logger']>(),
		storedFiles: {
			read: async (fileId: string) => await turn.readFile(fileId),
		},
	};
}

function latestToolResult(prompt: StreamPrompt): ParseFileResultView | undefined {
	const toolMessages = prompt.filter((message) => message.role === 'tool');
	const latest = toolMessages.at(-1);
	if (!latest) return undefined;
	const part = latest.content.find((entry) => entry.type === 'tool-result');
	if (!part) return undefined;

	let raw: unknown;
	if (part.output.type === 'json' || part.output.type === 'error-json') {
		raw = part.output.value;
	} else if (part.output.type === 'text' || part.output.type === 'error-text') {
		try {
			raw = JSON.parse(part.output.value);
		} catch {
			return undefined;
		}
	}
	if (!isRecord(raw)) return undefined;

	return {
		fileId: typeof raw.fileId === 'string' ? raw.fileId : undefined,
		fileName: typeof raw.fileName === 'string' ? raw.fileName : undefined,
		format: typeof raw.format === 'string' ? raw.format : undefined,
		content: typeof raw.content === 'string' ? raw.content : undefined,
		totalChars: typeof raw.totalChars === 'number' ? raw.totalChars : undefined,
		totalRows: typeof raw.totalRows === 'number' ? raw.totalRows : undefined,
		truncated: typeof raw.truncated === 'boolean' ? raw.truncated : undefined,
		nextStartChar: typeof raw.nextStartChar === 'number' ? raw.nextStartChar : undefined,
		error: typeof raw.error === 'string' ? raw.error : undefined,
	};
}

function streamResponse(parts: ModelStreamPart[], callsTool: boolean) {
	return {
		stream: convertArrayToReadableStream<ModelStreamPart>([
			{ type: 'stream-start', warnings: [] },
			...parts,
			{
				type: 'finish',
				finishReason: {
					unified: callsTool ? 'tool-calls' : 'stop',
					raw: callsTool ? 'tool_use' : 'end_turn',
				},
				usage: USAGE,
			},
		]),
	};
}

function textReply(text: string) {
	return streamResponse(
		[
			{ type: 'text-start', id: 'reply' },
			{ type: 'text-delta', id: 'reply', delta: text },
			{ type: 'text-end', id: 'reply' },
		],
		false,
	);
}

describe('parse-file stored attachment integration (SQLite + filesystem binary storage + SystemAgent)', () => {
	let systemAgents: SystemAgentExecutionService;
	let attachmentService: AgentChatAttachmentService;
	let binaryDataService: BinaryDataService;
	let owner: User;
	let otherUser: User;
	let ownerProjectId: string;
	let otherProjectId: string;
	let binaryStorageDir: string;
	let originalBinaryMode: BinaryDataConfig['mode'];
	let originalBinaryStoragePath: string;

	let activeModelFactory: () => MockLanguageModelV3;
	let turnSettledResolve: ((outcome: SystemAgentTurnOutcome) => void) | undefined;
	let turnSettledReject: ((error: unknown) => void) | undefined;

	const provider: SystemAgentProvider = {
		agentId: AGENT_ID,
		name: 'Parse File Integration Agent',
		authorize: async () => true,
		async prepareTurn(turn: SystemAgentTurn) {
			try {
				const model = activeModelFactory();
				const { agent } = await createInstanceAgent({
					modelId: model,
					context: createDomainContext(turn),
					mcpManager: new McpClientManager(),
					memoryConfig: {},
					memory: Container.get(N8nMemory).getImplementation(AGENT_ID),
					checkpointStore: Container.get(N8NCheckpointStorage).getStorage(AGENT_ID),
					thinkingEnabled: false,
					modelFetch: async () => Response.json({}),
				});
				return {
					agent,
					runOptions: { maxIterations: 20 },
					onSettled: async (outcome) => {
						turnSettledResolve?.(outcome);
					},
				};
			} catch (error) {
				turnSettledReject?.(error);
				throw error;
			}
		},
	};

	beforeAll(async () => {
		await testModules.loadModules(['agents', 'instance-ai']);
		await testDb.init();

		binaryStorageDir = mkdtempSync(path.join(os.tmpdir(), 'n8n-parse-file-integration-'));
		const binaryConfig = Container.get(BinaryDataConfig);
		originalBinaryMode = binaryConfig.mode;
		originalBinaryStoragePath = binaryConfig.localStoragePath;
		binaryConfig.mode = 'filesystem';
		binaryConfig.localStoragePath = binaryStorageDir;

		binaryDataService = Container.get(BinaryDataService);
		await binaryDataService.init();

		systemAgents = Container.get(SystemAgentExecutionService);
		attachmentService = Container.get(AgentChatAttachmentService);
		await Container.get(SystemAgentRegistrationService).register(provider);
		Container.get(AgentMessageQueueConsumer).start();

		owner = await createOwner();
		otherUser = await createOwner();
		const projectRepo = Container.get(ProjectRepository);
		ownerProjectId = (await projectRepo.getPersonalProjectForUserOrFail(owner.id)).id;
		otherProjectId = (await projectRepo.getPersonalProjectForUserOrFail(otherUser.id)).id;
	});

	afterAll(async () => {
		Container.get(AgentMessageQueueConsumer).stop();
		const binaryConfig = Container.get(BinaryDataConfig);
		binaryConfig.mode = originalBinaryMode;
		binaryConfig.localStoragePath = originalBinaryStoragePath;
		await testDb.terminate();
		rmSync(binaryStorageDir, { recursive: true, force: true });
	});

	async function runTurn(params: {
		user: User;
		threadId: string;
		message: string;
		model: MockLanguageModelV3;
		attachments?: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number }>;
	}): Promise<SystemAgentTurnOutcome> {
		activeModelFactory = () => params.model;
		const settled = new Promise<SystemAgentTurnOutcome>((resolve, reject) => {
			turnSettledResolve = resolve;
			turnSettledReject = reject;
		});
		await systemAgents.sendMessage({
			agentId: AGENT_ID,
			user: params.user,
			threadId: params.threadId,
			message: params.message,
			...(params.attachments ? { attachments: params.attachments } : {}),
		});
		return await settled;
	}

	async function storeHandover(threadId: string, rawJson: string) {
		return await attachmentService.storeInbound({
			agentId: AGENT_ID,
			projectId: ownerProjectId,
			threadId,
			resourceId: systemAgents.resourceIdFor(owner),
			source: SYSTEM_CHAT_SOURCE,
			fileName: 'source-handover.json',
			mimeType: 'application/json',
			data: Buffer.from(rawJson, 'utf-8'),
		});
	}

	async function callParseFileOnce(params: {
		user: User;
		threadId: string;
		modelId: string;
		toolInput: Record<string, unknown>;
	}): Promise<{ outcome: SystemAgentTurnOutcome; result: ParseFileResultView | undefined }> {
		let parsedResult: ParseFileResultView | undefined;
		let step = 0;
		const outcome = await runTurn({
			user: params.user,
			threadId: params.threadId,
			message: 'Read attachment with parse-file.',
			model: new MockLanguageModelV3({
				provider: 'mock',
				modelId: params.modelId,
				doStream: async ({ prompt }) => {
					if (step++ === 0) {
						return streamResponse(
							[
								{
									type: 'tool-call',
									toolCallId: `${params.modelId}-call`,
									toolName: 'parse-file',
									input: JSON.stringify(params.toolInput),
								},
							],
							true,
						);
					}
					parsedResult = latestToolResult(prompt);
					return textReply('Done.');
				},
			}),
		});
		return { outcome, result: parsedResult };
	}

	it('paginates a stored ~300 KB 14-file JSON handover across turns and reconstructs exact SHA-256 hashes', async () => {
		const { payload, rawJson } = buildLargeHandoverJson();
		expect(rawJson.length).toBeGreaterThan(300_000);

		const thread = await systemAgents.createThread({
			agentId: AGENT_ID,
			user: owner,
			projectId: ownerProjectId,
		});
		const stored = await storeHandover(thread.id, rawJson);

		// Turn 1: paginate the entire ~300 KB JSON object from SQLite + filesystem binary storage.
		const turn1Pages: ParseFileResultView[] = [];
		let turn1Step = 0;
		const turn1Model = new MockLanguageModelV3({
			provider: 'mock',
			modelId: 'parse-file-turn-1',
			doStream: async ({ prompt }) => {
				if (turn1Step === 0) {
					turn1Step++;
					return streamResponse(
						[
							{
								type: 'tool-call',
								toolCallId: 'stored-handover-0',
								toolName: 'parse-file',
								input: JSON.stringify({ fileId: stored.id }),
							},
						],
						true,
					);
				}

				const page = latestToolResult(prompt);
				expect(page).toBeDefined();
				expect(page?.error).toBeUndefined();
				expect(page?.fileId).toBe(stored.id);
				expect(page?.format).toBe('json');
				expect(page?.totalRows).toBe(0);
				expect(page?.totalChars).toBe(rawJson.length);
				turn1Pages.push(page!);

				if (page?.truncated && page.nextStartChar !== undefined) {
					return streamResponse(
						[
							{
								type: 'tool-call',
								toolCallId: `stored-handover-${turn1Step++}`,
								toolName: 'parse-file',
								input: JSON.stringify({ fileId: stored.id, startChar: page.nextStartChar }),
							},
						],
						true,
					);
				}

				return textReply('Reconstructed full stored handover.');
			},
		});

		const turn1Outcome = await runTurn({
			user: owner,
			threadId: thread.id,
			message: `Read stored handover file ${stored.id}.`,
			model: turn1Model,
			attachments: [
				{
					id: stored.id,
					fileName: stored.fileName,
					mimeType: stored.mimeType,
					sizeBytes: stored.fileSizeBytes,
				},
			],
		});

		expect(turn1Outcome.status).toBe('completed');
		expect(turn1Pages.length).toBeGreaterThanOrEqual(7);
		expect(turn1Pages.at(-1)?.truncated).toBe(false);
		expect(turn1Pages.at(-1)?.nextStartChar).toBeUndefined();

		const reconstructed = turn1Pages.map((page) => page.content ?? '').join('');
		expect(reconstructed).toBe(rawJson);
		expect(sha256(reconstructed)).toBe(sha256(rawJson));
		const parsed = JSON.parse(reconstructed) as SourceHandoverPayload;
		expect(parsed.files).toHaveLength(14);
		for (let i = 0; i < payload.files.length; i++) {
			expect(parsed.files[i].content).toBe(payload.files[i].content);
			expect(sha256(parsed.files[i].content)).toBe(payload.files[i].sha256);
		}

		// Turn 2: later turn in the same thread with no new attachments still reads the stored file at an arbitrary offset.
		const targetSliceStart = 120_000;
		const targetSliceLength = 500;
		const { outcome: turn2Outcome, result: turn2Page } = await callParseFileOnce({
			user: owner,
			threadId: thread.id,
			modelId: 'parse-file-turn-2',
			toolInput: {
				fileId: stored.id,
				startChar: targetSliceStart,
				maxChars: targetSliceLength,
			},
		});

		expect(turn2Outcome.status).toBe('completed');
		expect(turn2Page?.error).toBeUndefined();
		expect(turn2Page?.fileId).toBe(stored.id);
		expect(turn2Page?.content).toBe(
			rawJson.slice(targetSliceStart, targetSliceStart + targetSliceLength),
		);
		expect(turn2Page?.truncated).toBe(true);
		expect(turn2Page?.nextStartChar).toBe(targetSliceStart + targetSliceLength);
	});

	it('isolates stored attachments across threads and users', async () => {
		const ownerThread = await systemAgents.createThread({
			agentId: AGENT_ID,
			user: owner,
			projectId: ownerProjectId,
		});
		const stored = await storeHandover(ownerThread.id, JSON.stringify({ secret: 'thread-only' }));

		const siblingThread = await systemAgents.createThread({
			agentId: AGENT_ID,
			user: owner,
			projectId: ownerProjectId,
		});
		const sibling = await callParseFileOnce({
			user: owner,
			threadId: siblingThread.id,
			modelId: 'parse-file-sibling',
			toolInput: { fileId: stored.id },
		});

		expect(sibling.outcome.status).toBe('completed');
		expect(sibling.result?.fileId).toBe(stored.id);
		expect(sibling.result?.error).toBe(`File "${stored.id}" not found in this conversation`);

		const otherThread = await systemAgents.createThread({
			agentId: AGENT_ID,
			user: otherUser,
			projectId: otherProjectId,
		});
		const other = await callParseFileOnce({
			user: otherUser,
			threadId: otherThread.id,
			modelId: 'parse-file-other-user',
			toolInput: { fileId: stored.id },
		});

		expect(other.outcome.status).toBe('completed');
		expect(other.result?.fileId).toBe(stored.id);
		expect(other.result?.error).toBe(`File "${stored.id}" not found in this conversation`);
	});

	it('returns a clean error when stored binary bytes have been pruned', async () => {
		const thread = await systemAgents.createThread({
			agentId: AGENT_ID,
			user: owner,
			projectId: ownerProjectId,
		});
		const stored = await storeHandover(thread.id, JSON.stringify({ ephemeral: true }));

		await binaryDataService.deleteManyByBinaryDataId([stored.binaryDataId]);

		const pruned = await callParseFileOnce({
			user: owner,
			threadId: thread.id,
			modelId: 'parse-file-pruned',
			toolInput: { fileId: stored.id },
		});

		expect(pruned.outcome.status).toBe('completed');
		expect(pruned.result?.fileId).toBe(stored.id);
		expect(pruned.result?.error).toBe(`File "${stored.id}" is no longer available`);
	});
});
