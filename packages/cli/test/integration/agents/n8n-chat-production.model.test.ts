import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

import type { ToolDescriptor } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { linkUserToProject, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import nock, { back as nockBack } from 'nock';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { saveCredential } from '../shared/db/credentials';
import { createOwner, createMember } from '../shared/db/users';
import { initCredentialsTypes, setupTestServer } from '../shared/utils';

vi.mock('@/utils/ai-proxy-fetch', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/utils/ai-proxy-fetch')>();
	return {
		...original,
		createAiProxyFetch: () => async (input: RequestInfo | URL, init?: RequestInit) =>
			await globalThis.fetch(input, init),
	};
});

const enabled = process.env.AGENT_N8N_CHAT_MODEL_TESTS === '1' || Boolean(process.env.CI);
const record = process.env.VCR_MODE === 'record';
const replay = !record && (process.env.VCR_MODE === 'replay' || Boolean(process.env.CI));
const cassettes = path.join(__dirname, 'cassettes', 'n8n-chat-production');
const chatIntegration = { type: 'n8n_chat', credentialId: '' } as const;
const redPixel =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

nock.restore();
const directFetch = globalThis.fetch;

function bypassLocalFetchInterceptors() {
	const interceptedFetch = globalThis.fetch;
	Object.defineProperty(globalThis, 'fetch', {
		value: async (input: RequestInfo | URL, init?: RequestInit) =>
			await (/localhost|127\.0\.0\.1/.test(input.toString())
				? directFetch(input, init)
				: interceptedFetch(input, init)),
		configurable: true,
	});
}

const approvalToolCode = `
import { Tool } from '@n8n/agents';
import { z } from 'zod';

export default new Tool('approve_marker')
  .description('Approve a marker before recording it')
  .input(z.object({ marker: z.string() }))
  .handler(async ({ marker }) => ({ recorded: marker }));
`;

const approvalToolDescriptor: ToolDescriptor = {
	name: 'approve_marker',
	description: 'Approve a marker before recording it',
	systemInstruction: null,
	inputSchema: {
		type: 'object',
		properties: { marker: { type: 'string' } },
		required: ['marker'],
	},
	outputSchema: null,
	hasSuspend: false,
	hasResume: false,
	hasToMessage: false,
	requireApproval: false,
	providerOptions: null,
};

function events(body: string): Array<Record<string, unknown>> {
	return body
		.split('\n\n')
		.filter((block) => block.startsWith('data: '))
		.map((block) => JSON.parse(block.slice(6)) as Record<string, unknown>);
}

function eventOfType(items: Array<Record<string, unknown>>, type: string) {
	return items.find((event) => event.type === type);
}

function streamedText(items: Array<Record<string, unknown>>): string {
	return items
		.filter((event) => event.type === 'text-delta')
		.map((event) => (typeof event.delta === 'string' ? event.delta : ''))
		.join('');
}

function scrubCassette(definitions: nock.Definition[]): nock.Definition[] {
	return definitions
		.filter((definition) => !/localhost|127\.0\.0\.1|models\.dev/.test(String(definition.scope)))
		.map((definition) => {
			const headers = definition.rawHeaders;
			if (
				headers?.['content-type']?.includes('application/json') &&
				(headers['content-encoding'] === 'br' || headers['content-encoding'] === 'gzip') &&
				Array.isArray(definition.response) &&
				typeof definition.response[0] === 'string'
			) {
				const bytes = Buffer.from(definition.response[0], 'hex');
				definition.response =
					headers['content-encoding'] === 'br'
						? brotliDecompressSync(bytes).toString('utf8')
						: gunzipSync(bytes).toString('utf8');
				for (const header of ['content-encoding', 'content-length', 'transfer-encoding']) {
					delete headers[header];
				}
			}
			for (const header of ['authorization', 'api-key', 'x-api-key']) {
				delete definition.reqheaders?.[header];
			}
			for (const header of ['set-cookie', 'openai-organization', 'openai-project']) {
				delete definition.rawHeaders?.[header];
			}
			return definition;
		});
}

function formatCassette(definitions: nock.Definition[]): string {
	return `[
${definitions
	.map((definition) => {
		const fields = Object.entries(definition)
			.map(([key, value]) => `\t\t${JSON.stringify(key)}: ${JSON.stringify(value)}`)
			.join(',\n');
		return `\t{\n${fields}\n\t}`;
	})
	.join(',\n')}
]\n`;
}

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });

describe.skipIf(!enabled)('production n8n Chat with a real model', () => {
	let finishCassette: (() => void) | undefined;

	beforeAll(async () => {
		await initCredentialsTypes();
		const testFolder = process.env.N8N_USER_FOLDER;
		if (!testFolder) throw new Error('N8N_USER_FOLDER is required');
		const binaryDataConfig = Container.get(BinaryDataConfig);
		binaryDataConfig.mode = 'filesystem';
		binaryDataConfig.localStoragePath = path.join(testFolder, '.n8n', 'storage');
		await Container.get(BinaryDataService).init();
		if (!replay && !process.env.OPENAI_API_KEY) {
			throw new Error('Set OPENAI_API_KEY for live or record mode');
		}
		nockBack.fixtures = cassettes;
		if (record) mkdirSync(cassettes, { recursive: true });
		nockBack.setMode(record ? 'update' : replay ? 'lockdown' : 'wild');
		if (replay) process.env.OPENAI_API_KEY = 'sk-test-replay';
	});

	beforeEach(async (context) => {
		if (!record && !replay) return;
		if (!nock.isActive()) nock.activate();
		const name = `${context.task.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
		const cassette = await nockBack(name, {
			afterRecord: (definitions) => formatCassette(scrubCassette(definitions)),
		});
		finishCassette = cassette.nockDone;
		bypassLocalFetchInterceptors();
		nock.enableNetConnect(record ? /127\.0\.0\.1|api\.openai\.com/ : /127\.0\.0\.1/);
		nock('https://models.dev')
			.get('/api.json')
			.reply(200, {
				openai: {
					id: 'openai',
					name: 'OpenAI',
					models: {
						'gpt-4o-mini': {
							id: 'gpt-4o-mini',
							name: 'GPT-4o mini',
							tool_call: true,
							limit: { context: 128000, output: 16384 },
						},
					},
				},
			})
			.persist();
	});

	afterEach(() => {
		finishCassette?.();
		finishCassette = undefined;
		nock.cleanAll();
		nock.restore();
	});

	async function createPublishedAgent(options: { approvalTool?: boolean; instructions: string }) {
		const owner = await createOwner();
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const credential = await saveCredential(
			{
				name: 'OpenAI',
				type: 'openAiApi',
				data: { apiKey: process.env.OPENAI_API_KEY ?? 'sk-test-replay' },
			},
			{ project, role: 'credential:owner' },
		);
		const schema: AgentJsonConfig = {
			name: 'Chat test agent',
			model: 'openai/gpt-4o-mini',
			credential: credential.id,
			instructions: options.instructions,
			memory: { enabled: true, storage: 'n8n' },
			...(options.approvalTool
				? { tools: [{ type: 'custom' as const, id: 'approve_marker', requireApproval: true }] }
				: {}),
		};
		const tools: Agent['tools'] = options.approvalTool
			? {
					approve_marker: {
						code: approvalToolCode,
						descriptor: approvalToolDescriptor,
					},
				}
			: {};
		const repository = Container.get(AgentRepository);
		const agent = await repository.save(
			repository.create({
				id: randomUUID(),
				name: schema.name,
				projectId: project.id,
				schema,
				tools,
				skills: {},
				integrations: [chatIntegration],
				versionId: randomUUID(),
			}),
		);
		const versionId = randomUUID();
		await Container.get(AgentHistoryRepository).saveVersion({
			versionId,
			agentId: agent.id,
			schema: { ...schema, integrations: [chatIntegration] },
			tools,
			skills: {},
			publishedBy: owner,
		});
		await repository.update({ id: agent.id }, { activeVersionId: versionId });
		return { owner, project, agent, versionId };
	}

	it('streams the published instructions and records a private production session', async () => {
		const { owner, project, agent } = await createPublishedAgent({
			instructions: 'Reply with exactly PUBLISHED_MARKER to greeting requests.',
		});
		const repository = Container.get(AgentRepository);
		if (!agent.schema) throw new Error('Agent schema is missing');
		agent.schema = {
			...agent.schema,
			instructions: 'Reply with exactly DRAFT_MARKER to greeting requests.',
		};
		expect(await repository.saveDraftFenced(agent)).toBe(true);
		const response = await server
			.authAgentFor(owner)
			.post(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`)
			.send({ message: 'Give me the greeting marker.' })
			.expect(200);
		const streamed = events(response.text);
		const done = eventOfType(streamed, 'done');
		expect(done).toBeDefined();
		expect(streamedText(streamed)).toContain('PUBLISHED_MARKER');
		expect(streamedText(streamed)).not.toContain('DRAFT_MARKER');
		const threadId = done?.sessionId;
		if (typeof threadId !== 'string') throw new Error('Session ID is missing');
		const thread = await Container.get(AgentExecutionThreadRepository).findOneBy({ id: threadId });
		expect(thread).toMatchObject({ ownerId: owner.id, accessScope: 'user' });
		const execution = await Container.get(AgentExecutionRepository).findLatestByThreadId(threadId);
		expect(execution).toMatchObject({ source: 'n8n_chat_production' });
		const preview = await server
			.authAgentFor(owner)
			.post(`/projects/${project.id}/agents/v2/${agent.id}/chat`)
			.send({ message: 'Give me the greeting marker.' })
			.expect(200);
		const previewEvents = events(preview.text);
		const previewDone = eventOfType(previewEvents, 'done');
		expect(previewDone).toBeDefined();
		expect(streamedText(previewEvents)).toContain('DRAFT_MARKER');
		expect(streamedText(previewEvents)).not.toContain('PUBLISHED_MARKER');
		if (typeof previewDone?.sessionId !== 'string') {
			throw new Error('Preview session ID is missing');
		}
		const previewExecution = await Container.get(AgentExecutionRepository).findLatestByThreadId(
			previewDone.sessionId,
		);
		expect(previewExecution?.source).toBeNull();
	}, 120_000);

	it('suspends a tool call and resumes it only for the session owner', async () => {
		const { owner, project, agent } = await createPublishedAgent({
			approvalTool: true,
			instructions:
				'When asked to record a marker, call approve_marker with the exact marker. Then confirm the tool result.',
		});
		const base = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`;
		const response = await server
			.authAgentFor(owner)
			.post(base)
			.send({ message: 'Record marker A42 using approve_marker.' })
			.expect(200);
		const streamed = events(response.text);
		const suspended = eventOfType(streamed, 'tool-call-suspended');
		expect(suspended).toBeDefined();
		expect(eventOfType(streamed, 'done')).toBeUndefined();
		const payload = suspended?.payload;
		if (
			!payload ||
			typeof payload !== 'object' ||
			!('runId' in payload) ||
			!('toolCallId' in payload) ||
			typeof payload.runId !== 'string' ||
			typeof payload.toolCallId !== 'string'
		)
			throw new Error('Suspended tool call is missing its identifiers');
		const started = eventOfType(streamed, 'execution-started');
		const threadId = started?.sessionId as string;
		const other = await createMember();
		await linkUserToProject(other, project, 'project:editor');
		await server.authAgentFor(other).get(`${base}/${threadId}/messages`).expect(404);
		const denied = await server
			.authAgentFor(other)
			.post(`${base}/resume`)
			.send({
				runId: payload.runId,
				toolCallId: payload.toolCallId,
				resumeData: { approved: true },
			})
			.expect(200);
		expect(denied.text).toMatch(/does not belong|Session not found/);
		const history = await server
			.authAgentFor(owner)
			.get(`${base}/${threadId}/messages`)
			.expect(200);
		expect(history.body.data.openSuspensions).toHaveLength(1);
		const resumed = await server
			.authAgentFor(owner)
			.post(`${base}/resume`)
			.send({
				runId: payload.runId,
				toolCallId: payload.toolCallId,
				resumeData: { approved: true },
			})
			.expect(200);
		expect(eventOfType(events(resumed.text), 'done')).toBeDefined();
	}, 120_000);

	it('sends an image to the model and reloads the stored attachment', async () => {
		const { owner, project, agent } = await createPublishedAgent({
			instructions: 'Describe the color of an attached image in one word.',
		});
		const base = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`;
		const response = await server
			.authAgentFor(owner)
			.post(base)
			.send({
				message: 'What color is this image?',
				attachments: [{ fileName: 'pixel.png', mimeType: 'image/png', data: redPixel }],
			})
			.expect(200);
		const streamed = events(response.text);
		const done = eventOfType(streamed, 'done');
		expect(done, JSON.stringify(streamed)).toBeDefined();
		expect(streamedText(streamed)).toMatch(/red/i);
		const threadId = done?.sessionId as string;
		const history = await server
			.authAgentFor(owner)
			.get(`${base}/${threadId}/messages`)
			.expect(200);
		expect(history.body.data.messages).toEqual(expect.any(Array));
		const attachment = await Container.get(AgentExecutionRepository).findLatestByThreadId(threadId);
		const attachmentId = attachment?.attachments?.[0]?.id;
		expect(attachmentId).toBeDefined();
		const downloaded = await server
			.authAgentFor(owner)
			.get(`${base}/attachments/${attachmentId}`)
			.expect(200);
		expect(downloaded.body).toEqual(Buffer.from(redPixel, 'base64'));
	}, 120_000);

	it('allows only the session owner to cancel a suspended run', async () => {
		const { owner, project, agent } = await createPublishedAgent({
			approvalTool: true,
			instructions: 'When asked to record a marker, call approve_marker with that marker.',
		});
		const base = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`;
		const response = await server
			.authAgentFor(owner)
			.post(base)
			.send({ message: 'Record marker B17 using approve_marker.' })
			.expect(200);
		const suspension = eventOfType(events(response.text), 'tool-call-suspended');
		const payload = suspension?.payload;
		if (!payload || typeof payload !== 'object' || !('runId' in payload)) {
			throw new Error('Suspended tool call is missing its run ID');
		}
		if (typeof payload.runId !== 'string') throw new Error('Run ID is invalid');
		const other = await createMember();
		await linkUserToProject(other, project, 'project:editor');
		const foreignCancel = await server
			.authAgentFor(other)
			.delete(`${base}/runs/${payload.runId}`)
			.expect(200);
		expect(foreignCancel.body.data.cancelled).toBe(false);
		const ownerCancel = await server
			.authAgentFor(owner)
			.delete(`${base}/runs/${payload.runId}`)
			.expect(200);
		expect(ownerCancel.body.data.cancelled).toBe(true);
	}, 120_000);
});
