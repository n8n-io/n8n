import type { WhatsAppCredentialCheck } from '@n8n/api-types';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentWhatsAppIntegrationsController } from '../agent-whatsapp-integrations.controller';
import type { WhatsAppCredentialCheckService } from '../integrations/platforms/whatsapp-credential-check.service';
import type { WhatsAppWebhookVerificationStore } from '../integrations/platforms/whatsapp-webhook-verification.store';
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
		['webhookStatus', 'agent:read'],
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

	describe('webhookStatus', () => {
		it('throws NotFoundError when the agent is not in the project', async () => {
			const { controller, agentRepository, webhookVerification } = makeController();
			agentRepository.existsBy.mockResolvedValue(false);

			await expect(
				controller.webhookStatus(request, undefined as never, 'agent-1'),
			).rejects.toThrow(NotFoundError);

			expect(agentRepository.existsBy).toHaveBeenCalledWith({
				id: 'agent-1',
				projectId: 'project-1',
			});
			expect(webhookVerification.isVerified).not.toHaveBeenCalled();
		});

		it.each([true, false])('returns verified %s from the verification store', async (verified) => {
			const { controller, agentRepository, webhookVerification } = makeController();
			agentRepository.existsBy.mockResolvedValue(true);
			webhookVerification.isVerified.mockResolvedValue(verified);

			const result = await controller.webhookStatus(request, undefined as never, 'agent-1');

			expect(webhookVerification.isVerified).toHaveBeenCalledWith('agent-1');
			expect(result).toEqual({ verified });
		});
	});
});
