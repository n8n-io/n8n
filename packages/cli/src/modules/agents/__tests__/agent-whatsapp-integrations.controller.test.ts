import type { WhatsAppCredentialCheck } from '@n8n/api-types';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentWhatsAppIntegrationsController } from '../agent-whatsapp-integrations.controller';
import type { WhatsAppCredentialCheckService } from '../integrations/platforms/whatsapp/whatsapp-credential-check.service';
import type { WhatsAppWebhookVerificationStore } from '../integrations/platforms/whatsapp/whatsapp-webhook-verification.store';
import type { AgentRepository } from '../repositories/agent.repository';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController() {
	const credentialCheckService = mock<WhatsAppCredentialCheckService>();
	const webhookVerification = mock<WhatsAppWebhookVerificationStore>();
	const agentRepository = mock<AgentRepository>();

	return {
		controller: new AgentWhatsAppIntegrationsController(
			credentialCheckService,
			webhookVerification,
			agentRepository,
		),
		credentialCheckService,
		webhookVerification,
		agentRepository,
	};
}

describe('AgentWhatsAppIntegrationsController', () => {
	expectProjectScopedAgentRoutes(AgentWhatsAppIntegrationsController);

	const routes = getRoutesByHandlerName(AgentWhatsAppIntegrationsController);

	it.each([
		['checkCredential', 'agent:update'],
		['metaStatus', 'agent:read'],
		['webhookStatus', 'agent:read'],
		['resetWebhookStatus', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});

	const user = { id: 'user-1' };
	const request = { params: { projectId: 'project-1' }, user } as never;

	describe('checkCredential', () => {
		it('delegates to the credential check with the caller, project and credential', async () => {
			const { controller, credentialCheckService } = makeController();
			const check: WhatsAppCredentialCheck = { status: 'failed', reason: 'mismatch' };
			credentialCheckService.check.mockResolvedValue(check);

			const result = await controller.checkCredential(request, undefined as never, 'cred-1');

			expect(credentialCheckService.check).toHaveBeenCalledWith(user, 'project-1', 'cred-1');
			expect(result).toBe(check);
		});
	});

	describe('metaStatus', () => {
		it('checks the agent exists, then reads the status for the caller and credential', async () => {
			const { controller, credentialCheckService, agentRepository } = makeController();
			agentRepository.existsBy.mockResolvedValue(true);
			credentialCheckService.getMetaStatus.mockResolvedValue({ state: 'dailyLimit' });

			const result = await controller.metaStatus(request, undefined as never, 'agent-1', 'cred-1');

			expect(agentRepository.existsBy).toHaveBeenCalledWith({
				id: 'agent-1',
				projectId: 'project-1',
			});
			expect(credentialCheckService.getMetaStatus).toHaveBeenCalledWith(
				user,
				'project-1',
				'cred-1',
			);
			expect(result).toEqual({ state: 'dailyLimit' });
		});

		it('throws NotFoundError for an agent outside the project', async () => {
			const { controller, credentialCheckService, agentRepository } = makeController();
			agentRepository.existsBy.mockResolvedValue(false);

			await expect(
				controller.metaStatus(request, undefined as never, 'agent-1', 'cred-1'),
			).rejects.toThrow(NotFoundError);
			expect(credentialCheckService.getMetaStatus).not.toHaveBeenCalled();
		});
	});

	describe('webhookStatus', () => {
		it('throws NotFoundError when the agent is not in the project', async () => {
			const { controller, agentRepository, webhookVerification } = makeController();
			agentRepository.existsBy.mockResolvedValue(false);

			await expect(
				controller.webhookStatus(request, undefined as never, 'agent-1', {}),
			).rejects.toThrow(NotFoundError);

			expect(agentRepository.existsBy).toHaveBeenCalledWith({
				id: 'agent-1',
				projectId: 'project-1',
			});
			expect(webhookVerification.verifiedAt).not.toHaveBeenCalled();
		});

		it.each([
			[true, 0],
			[false, undefined],
		])('returns verified %s from the verification store', async (verified, verifiedAt) => {
			const { controller, agentRepository, webhookVerification } = makeController();
			agentRepository.existsBy.mockResolvedValue(true);
			webhookVerification.verifiedAt.mockResolvedValue(verifiedAt);

			const result = await controller.webhookStatus(request, undefined as never, 'agent-1', {});

			expect(webhookVerification.verifiedAt).toHaveBeenCalledWith('agent-1');
			expect(result).toEqual({ verified });
		});

		describe('when the handshake is verified for a credential', () => {
			const NOW = new Date('2026-01-01T12:00:00Z').getTime();

			beforeEach(() => {
				vi.useFakeTimers({ now: NOW });
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const run = async (match: 'match' | 'mismatch' | 'unknown', handshakeAgoMs: number) => {
				const { controller, agentRepository, webhookVerification, credentialCheckService } =
					makeController();
				agentRepository.existsBy.mockResolvedValue(true);
				webhookVerification.verifiedAt.mockResolvedValue(NOW - handshakeAgoMs);
				credentialCheckService.matchCallbackUrl.mockResolvedValue(match);

				const result = await controller.webhookStatus(request, undefined as never, 'agent-1', {
					credentialId: 'cred-1',
				});

				expect(credentialCheckService.matchCallbackUrl).toHaveBeenCalledWith(
					user,
					'project-1',
					'cred-1',
					'agent-1',
				);
				return result;
			};

			it.each(['match', 'unknown'] as const)(
				'confirms the handshake when the callback URL check gives %s',
				async (match) => {
					expect(await run(match, 0)).toEqual({ verified: true, appMismatch: false });
				},
			);

			it('keeps waiting while Meta may still be saving the callback URL', async () => {
				expect(await run('mismatch', 5_000)).toEqual({ verified: false });
			});

			it('reports an app mismatch once Meta has had time to save the callback URL', async () => {
				expect(await run('mismatch', 60_000)).toEqual({ verified: true, appMismatch: true });
			});
		});

		it('skips the app check when the handshake is not verified', async () => {
			const { controller, agentRepository, webhookVerification, credentialCheckService } =
				makeController();
			agentRepository.existsBy.mockResolvedValue(true);
			webhookVerification.verifiedAt.mockResolvedValue(undefined);

			const result = await controller.webhookStatus(request, undefined as never, 'agent-1', {
				credentialId: 'cred-1',
			});

			expect(credentialCheckService.matchCallbackUrl).not.toHaveBeenCalled();
			expect(result).toEqual({ verified: false });
		});
	});

	describe('resetWebhookStatus', () => {
		it('throws NotFoundError when the agent is not in the project', async () => {
			const { controller, agentRepository, webhookVerification } = makeController();
			agentRepository.existsBy.mockResolvedValue(false);

			await expect(
				controller.resetWebhookStatus(request, undefined as never, 'agent-1'),
			).rejects.toThrow(NotFoundError);

			expect(webhookVerification.reset).not.toHaveBeenCalled();
		});

		it('resets the recorded handshake and reports it as not verified', async () => {
			const { controller, agentRepository, webhookVerification } = makeController();
			agentRepository.existsBy.mockResolvedValue(true);

			const result = await controller.resetWebhookStatus(request, undefined as never, 'agent-1');

			expect(webhookVerification.reset).toHaveBeenCalledExactlyOnceWith('agent-1');
			expect(result).toEqual({ verified: false });
		});

		it('fails when the reset fails, so the setup does not trust a stale record', async () => {
			const { controller, agentRepository, webhookVerification } = makeController();
			agentRepository.existsBy.mockResolvedValue(true);
			webhookVerification.reset.mockRejectedValue(new Error('cache down'));

			await expect(
				controller.resetWebhookStatus(request, undefined as never, 'agent-1'),
			).rejects.toThrow('cache down');
		});
	});
});
