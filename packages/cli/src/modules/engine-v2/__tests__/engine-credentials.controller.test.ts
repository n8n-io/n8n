import type { Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { ResolveCredentialRequest } from '../engine-credentials.contract';
import { EngineCredentialsController } from '../engine-credentials.controller';
import type { EngineCredentialsService } from '../engine-credentials.service';

const resolveRequest: ResolveCredentialRequest = {
	credential: { id: 'cred-1', name: 'Acme API', type: 'httpHeaderAuth' },
	execution: { executionId: 'exec-1', workflowId: 'wf-1', mode: 'manual' },
	context: { userId: 'user-1', projectId: 'project-1' },
	consumer: { nodeType: 'n8n-nodes-base.httpRequest' },
};

const decrypted = { name: 'X-Api-Key', value: 'secret' };

describe('EngineCredentialsController', () => {
	let credentialsService: EngineCredentialsService;
	let controller: EngineCredentialsController;

	const newResponse = () => {
		const res = { status: vi.fn(), json: vi.fn() };
		res.status.mockReturnValue(res);
		return res as unknown as Mocked<Response>;
	};

	const newRequest = (body: unknown = resolveRequest) => ({ body }) as unknown as Request;

	beforeEach(() => {
		credentialsService = mock<EngineCredentialsService>();
		controller = new EngineCredentialsController(credentialsService);

		vi.mocked(credentialsService.resolve).mockResolvedValue(decrypted);
	});

	describe('resolveCredential', () => {
		it('answers 200 with the decrypted data', async () => {
			const res = newResponse();

			await controller.resolveCredential(newRequest(), res);

			expect(res.status).toHaveBeenCalledExactlyOnceWith(200);
			expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: decrypted });
		});

		it('hands the validated body to the service', async () => {
			await controller.resolveCredential(newRequest(), newResponse());

			expect(credentialsService.resolve).toHaveBeenCalledExactlyOnceWith(resolveRequest);
		});

		it.each([
			[
				'a body without a credential id',
				{ ...resolveRequest, credential: { name: 'x', type: 'y' } },
			],
			[
				'a body with an unknown mode',
				{ ...resolveRequest, execution: { ...resolveRequest.execution, mode: 'nope' } },
			],
			['a body that is not a request at all', { hello: 'world' }],
		])('rejects %s without a reason', async (_label, body) => {
			const res = newResponse();

			await expect(controller.resolveCredential(newRequest(body), res)).rejects.toThrow(
				BadRequestError,
			);
			expect(res.status).not.toHaveBeenCalled();
			// Unvalidated input must never reach the access check or the store.
			expect(credentialsService.resolve).not.toHaveBeenCalled();
		});

		it('passes a service error on without writing a response', async () => {
			const error = new ForbiddenError('Credential is not shared with the workflow');
			vi.mocked(credentialsService.resolve).mockRejectedValue(error);
			const res = newResponse();

			await expect(controller.resolveCredential(newRequest(), res)).rejects.toBe(error);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
