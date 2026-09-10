/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentExecutionOrchestratorService } from '../../../agent-execution-orchestrator.service';
import type { Agent } from '../../../entities/agent.entity';
import type { AgentRepository } from '../../../repositories/agent.repository';
import { OpenAiCompatibleChatService } from '../openai-compatible-chat.service';

describe('OpenAiCompatibleChatService', () => {
	function makeAgent(overrides: Partial<Agent> = {}): Agent {
		return {
			id: 'agent-1',
			projectId: 'project-1',
			integrations: [],
			...overrides,
		} as Agent;
	}

	function makeService() {
		const agentRepository = mock<AgentRepository>();
		const credentialsService = mock<CredentialsService>();
		const orchestrator = mock<AgentExecutionOrchestratorService>();

		return {
			service: new OpenAiCompatibleChatService(agentRepository, credentialsService, orchestrator),
			agentRepository,
			credentialsService,
			orchestrator,
		};
	}

	describe('authenticate', () => {
		it('matches the bearer token against a connected credential', async () => {
			const { service, agentRepository, credentialsService } = makeService();
			const agent = makeAgent({
				integrations: [{ type: 'openwebui', credentialId: 'credential-1' }] as never,
			});
			agentRepository.findOneBy.mockResolvedValue(agent);
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
				{ id: 'credential-1', type: 'agentChatApiKeyApi' },
			] as never);
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'n8n_agent_secret' });

			const result = await service.authenticate('agent-1', 'n8n_agent_secret');

			expect(result).toEqual({ agent, credentialId: 'credential-1', type: 'openwebui' });
		});

		it('matches against either connected channel type', async () => {
			const { service, agentRepository, credentialsService } = makeService();
			const agent = makeAgent({
				integrations: [
					{ type: 'openwebui', credentialId: 'credential-a' },
					{ type: 'librechat', credentialId: 'credential-b' },
				] as never,
			});
			agentRepository.findOneBy.mockResolvedValue(agent);
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
				{ id: 'credential-a', type: 'agentChatApiKeyApi' },
				{ id: 'credential-b', type: 'agentChatApiKeyApi' },
			] as never);
			credentialsService.decrypt.mockImplementation(async (credential) =>
				credential.id === 'credential-b' ? { apiKey: 'librechat-secret' } : { apiKey: 'other' },
			);

			const result = await service.authenticate('agent-1', 'librechat-secret');

			expect(result).toEqual({ agent, credentialId: 'credential-b', type: 'librechat' });
		});

		it('rejects a token that matches no connected credential', async () => {
			const { service, agentRepository, credentialsService } = makeService();
			const agent = makeAgent({
				integrations: [{ type: 'openwebui', credentialId: 'credential-1' }] as never,
			});
			agentRepository.findOneBy.mockResolvedValue(agent);
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
				{ id: 'credential-1', type: 'agentChatApiKeyApi' },
			] as never);
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'the-real-secret' });

			await expect(service.authenticate('agent-1', 'wrong-token')).rejects.toThrow(NotFoundError);
		});

		it('throws when the agent does not exist', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findOneBy.mockResolvedValue(null);

			await expect(service.authenticate('missing', 'token')).rejects.toThrow(NotFoundError);
		});
	});

	describe('buildTranscript', () => {
		it('flattens accepted messages into labeled lines', () => {
			const { service } = makeService();

			const transcript = service.buildTranscript([
				{ role: 'system', content: 'Be terse.' },
				{ role: 'user', content: 'Hi' },
			]);

			expect(transcript).toBe('system: Be terse.\nuser: Hi');
		});

		it('rejects an empty messages array', () => {
			const { service } = makeService();

			expect(() => service.buildTranscript([])).toThrow(BadRequestError);
		});

		it('rejects a tool_calls entry', () => {
			const { service } = makeService();

			expect(() =>
				service.buildTranscript([
					{ role: 'assistant', content: '', tool_calls: [{ id: 'call-1' }] },
				]),
			).toThrow(BadRequestError);
		});

		it('rejects a tool role', () => {
			const { service } = makeService();

			expect(() => service.buildTranscript([{ role: 'tool', content: 'result' }])).toThrow(
				BadRequestError,
			);
		});

		it('rejects non-string content', () => {
			const { service } = makeService();

			expect(() =>
				service.buildTranscript([{ role: 'user', content: { not: 'a string' } }]),
			).toThrow(BadRequestError);
		});
	});

	describe('runNonStreaming', () => {
		it('drains text-delta chunks into the final content and surfaces the finish reason', async () => {
			const { service, orchestrator } = makeService();
			orchestrator.executeForChatPublished.mockImplementation(async function* () {
				yield { type: 'text-delta', id: '1', delta: 'Hel' } as never;
				yield { type: 'text-delta', id: '1', delta: 'lo' } as never;
				yield { type: 'finish', finishReason: 'stop' } as never;
			});

			const result = await service.runNonStreaming(
				{ agent: makeAgent(), credentialId: 'credential-1', type: 'openwebui' },
				'user: Hi',
				'hash' as never,
			);

			expect(result).toEqual({ content: 'Hello', finishReason: 'stop' });
		});

		it('throws when the stream emits an error chunk', async () => {
			const { service, orchestrator } = makeService();
			orchestrator.executeForChatPublished.mockImplementation(async function* () {
				yield { type: 'error', error: new Error('boom') } as never;
			});

			await expect(
				service.runNonStreaming(
					{ agent: makeAgent(), credentialId: 'credential-1', type: 'openwebui' },
					'user: Hi',
					'hash' as never,
				),
			).rejects.toThrow('boom');
		});
	});
});
