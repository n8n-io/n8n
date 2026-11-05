import { randomUUID } from 'node:crypto';

import type { SerializableAgentState } from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { testModules } from '@n8n/backend-test-utils';
import { type Project, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import { initCredentialsTypes, setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
	// The channel fills in the defaults of the credential type before it checks a caller.
	await initCredentialsTypes();
});

const server = setupTestServer({ endpointGroups: ['ai'] });

/** The cases end before a model call, or stub the run, so the agent needs no model credential. */
describe('webhook channel HTTP route', () => {
	async function createPublishedAgent(
		webhook: AgentIntegrationConfig | ((project: Project) => Promise<AgentIntegrationConfig>),
	) {
		const owner = await createOwner();
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const schema = { name: 'Agent', model: 'openai/gpt-4o-mini', instructions: 'Help' };
		const repository = Container.get(AgentRepository);
		const agent = await repository.save(
			repository.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				schema,
				integrations: [typeof webhook === 'function' ? await webhook(project) : webhook],
				tools: {},
				versionId: randomUUID(),
			}),
		);
		const versionId = randomUUID();
		await Container.get(AgentHistoryRepository).saveVersion(
			{ versionId, agentId: agent.id, schema, tools: {}, publishedBy: 'test' },
			{},
		);
		await repository.update({ id: agent.id }, { activeVersionId: versionId });
		return agent;
	}

	const post = (agentId: string, body: object) =>
		server.restlessAgent.post(`/agent-webhook/${agentId}/responses`).send(body);

	it('answers an unknown agent with 404 in the OpenAI error shape, without n8n auth', async () => {
		const response = await post(randomUUID(), { input: 'Hi' }).expect(404);

		expect(response.body).toEqual({
			error: expect.objectContaining({ type: 'not_found_error', code: 'agent_not_found' }),
		});
	});

	it('rejects an invalid body with 400 on its parameter', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: '',
			settings: { authentication: 'none' },
		});

		const response = await post(agent.id, { input: [] }).expect(400);

		expect(response.body.error).toMatchObject({ type: 'invalid_request_error', param: 'input' });
	});

	it('rejects a streaming request with 400 on the stream parameter', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: '',
			settings: { authentication: 'none' },
		});

		const response = await post(agent.id, { input: 'Hi', stream: true }).expect(400);

		expect(response.body.error).toMatchObject({ code: 'unsupported_parameter', param: 'stream' });
	});

	it('answers with the agent text in the Responses API shape', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: '',
			settings: { authentication: 'none' },
		});
		const run = vi
			.spyOn(Container.get(AgentExecutionOrchestratorService), 'executeForChatPublished')
			.mockImplementation(async function* () {
				yield await Promise.resolve({ type: 'text-delta' as const, id: 't1', delta: 'Hello' });
			});

		try {
			const response = await post(agent.id, { input: 'Hi' }).expect(200);

			expect(response.body).toMatchObject({
				object: 'response',
				status: 'completed',
				output: [{ content: [{ type: 'output_text', text: 'Hello' }] }],
			});
			expect(response.body.conversation.id).toEqual(expect.any(String));
			expect(response.body.conversation.id).not.toBe('');
		} finally {
			run.mockRestore();
		}
	});

	it('answers an unknown conversation with 404', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: '',
			settings: { authentication: 'none' },
		});

		const response = await post(agent.id, { input: 'Hi', conversation: 'unknown' }).expect(404);

		expect(response.body.error).toMatchObject({ code: 'conversation_not_found' });
	});

	it('returns 500 when the header-auth credential is missing', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: 'missing-credential',
			settings: { authentication: 'headerAuth' },
		});

		const response = await post(agent.id, { input: 'Hi' }).expect(500);

		expect(response.body.error).toMatchObject({ code: 'credential_unavailable' });
	});

	it('rejects a wrong header with 403 before any run', async () => {
		const agent = await createPublishedAgent(async (project) => {
			const credential = await saveCredential(
				{ name: 'Header', type: 'httpHeaderAuth', data: { name: 'X-Api-Key', value: 'key-1' } },
				{ project, role: 'credential:owner' },
			);
			return {
				type: 'webhook',
				credentialId: credential.id,
				settings: { authentication: 'headerAuth' },
			};
		});

		const response = await post(agent.id, { input: 'Hi' }).set('X-Api-Key', 'key-2').expect(403);

		expect(response.body.error).toMatchObject({ type: 'permission_error' });
	});

	describe('approval requests', () => {
		const approvalResumeSchema = zodToJsonSchema(APPROVAL_RESUME_SCHEMA);
		const suspendPayload = {
			type: 'approval',
			toolName: 'send_email',
			args: { to: 'ana@example.com' },
		};

		const createOpenAgent = async () =>
			await createPublishedAgent({
				type: 'webhook',
				credentialId: '',
				settings: { authentication: 'none' },
			});

		/** Stubs a run that waits for approval of call-1, and returns the path of its URL. */
		async function suspendRun(agentId: string) {
			const run = vi
				.spyOn(Container.get(AgentExecutionOrchestratorService), 'executeForChatPublished')
				.mockImplementation(async function* () {
					yield await Promise.resolve({
						type: 'tool-call-suspended' as const,
						runId: 'run-1',
						toolCallId: 'call-1',
						toolName: 'send_email',
						suspendPayload,
						resumeSchema: approvalResumeSchema,
					});
				});
			try {
				const response = await post(agentId, { input: 'Send it' }).expect(200);
				const [, approval] = response.body.output;
				return {
					conversationId: response.body.conversation.id as string,
					approval,
					path: new URL(approval.url as string).pathname,
				};
			} finally {
				run.mockRestore();
			}
		}

		function stubConversation(agentId: string, conversationId: string) {
			const threadId = `${agentId}:webhook:${conversationId}`;
			return [
				vi
					.spyOn(Container.get(AgentExecutionService), 'findThreadById')
					.mockResolvedValue({ id: threadId } as AgentExecutionThread),
				vi.spyOn(Container.get(N8NCheckpointStorage), 'load').mockResolvedValue({
					status: 'suspended',
					persistence: { threadId, resourceId: `integration:webhook:${conversationId}` },
					pendingToolCalls: {
						'call-1': {
							toolCallId: 'call-1',
							toolName: 'send_email',
							input: {},
							suspended: true,
							runId: 'run-1',
							suspendPayload,
							resumeSchema: approvalResumeSchema,
						},
					},
				} as unknown as SerializableAgentState),
			];
		}

		it('returns an approval request, and resumes the run when the caller posts a decision to its URL', async () => {
			const agent = await createOpenAgent();
			const { conversationId, approval, path } = await suspendRun(agent.id);
			expect(approval).toMatchObject({
				type: 'approval_request',
				id: 'call-1',
				name: 'send_email',
			});
			expect(path).toBe(`/agent-webhook/${agent.id}/approvals/${conversationId}/run-1/call-1`);

			const stubs = stubConversation(agent.id, conversationId);
			const resume = vi
				.spyOn(Container.get(AgentExecutionOrchestratorService), 'resumeForChat')
				.mockImplementation(async function* () {
					yield await Promise.resolve({ type: 'text-delta' as const, id: 't2', delta: 'Sent.' });
				});
			try {
				const response = await server.restlessAgent.post(path).send({ approved: true }).expect(200);

				expect(response.body).toMatchObject({
					status: 'completed',
					conversation: { id: conversationId },
					output: [{ content: [{ text: 'Sent.' }] }],
				});
				expect(resume).toHaveBeenCalledWith(
					expect.objectContaining({
						runId: 'run-1',
						toolCallId: 'call-1',
						resumeData: { approved: true },
					}),
				);
			} finally {
				resume.mockRestore();
				stubs.forEach((stub) => stub.mockRestore());
			}
		});

		it('does nothing for a GET request to the URL', async () => {
			const agent = await createOpenAgent();
			const resume = vi.spyOn(Container.get(AgentExecutionOrchestratorService), 'resumeForChat');
			try {
				// The route takes POST only. The server answers other methods with `responsesApiFallback`.
				await server.restlessAgent
					.get(`/agent-webhook/${agent.id}/approvals/c-1/run-1/call-1`)
					.expect(404);

				expect(resume).not.toHaveBeenCalled();
			} finally {
				resume.mockRestore();
			}
		});

		it('answers a run that does not wait for a decision with 404', async () => {
			const agent = await createOpenAgent();
			const conversationId = randomUUID();
			const thread = vi
				.spyOn(Container.get(AgentExecutionService), 'findThreadById')
				.mockResolvedValue({ id: `${agent.id}:webhook:${conversationId}` } as AgentExecutionThread);
			try {
				const response = await server.restlessAgent
					.post(`/agent-webhook/${agent.id}/approvals/${conversationId}/run-unknown/call-1`)
					.send({ approved: true })
					.expect(404);

				expect(response.body.error).toMatchObject({ code: 'approval_not_found' });
			} finally {
				thread.mockRestore();
			}
		});

		it('rejects a wrong header with 403 before it reads the run', async () => {
			const agent = await createPublishedAgent(async (project) => {
				const credential = await saveCredential(
					{ name: 'Header', type: 'httpHeaderAuth', data: { name: 'X-Api-Key', value: 'key-1' } },
					{ project, role: 'credential:owner' },
				);
				return {
					type: 'webhook',
					credentialId: credential.id,
					settings: { authentication: 'headerAuth' },
				};
			});
			const load = vi.spyOn(Container.get(N8NCheckpointStorage), 'load');
			try {
				await server.restlessAgent
					.post(`/agent-webhook/${agent.id}/approvals/c-1/run-1/call-1`)
					.set('X-Api-Key', 'key-2')
					.send({ approved: true })
					.expect(403);

				expect(load).not.toHaveBeenCalled();
			} finally {
				load.mockRestore();
			}
		});
	});
});
