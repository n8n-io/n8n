import type { Logger } from '@n8n/backend-common';
import type { Request, Response } from 'express';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';

import type { ResolveCredentialRequest } from '../engine-credentials.contract';
import { EngineCredentialsController } from '../engine-credentials.controller';

const mocks = vi.hoisted(() => ({ getBase: vi.fn() }));
vi.mock('@/workflow-execute-additional-data', () => ({ getBase: mocks.getBase }));

const resolveRequest: ResolveCredentialRequest = {
	credential: { id: 'cred-1', name: 'Acme API', type: 'httpHeaderAuth' },
	execution: { executionId: 'exec-1', workflowId: 'wf-1', mode: 'manual' },
	context: { userId: 'user-1', projectId: 'project-1' },
	consumer: { nodeType: 'n8n-nodes-base.httpRequest' },
};

const decrypted = { name: 'X-Api-Key', value: 'secret' };

describe('EngineCredentialsController', () => {
	let permissionChecker: CredentialsPermissionChecker;
	let credentialsHelper: CredentialsHelper;
	let logger: Logger;
	let controller: EngineCredentialsController;
	let additionalData: IWorkflowExecuteAdditionalData;

	const newResponse = () => {
		const res = { status: vi.fn(), json: vi.fn() };
		res.status.mockReturnValue(res);
		return res as unknown as Mocked<Response>;
	};

	const newRequest = (body: unknown = resolveRequest) => ({ body }) as unknown as Request;

	beforeEach(() => {
		vi.resetAllMocks();
		permissionChecker = mock<CredentialsPermissionChecker>();
		credentialsHelper = mock<CredentialsHelper>();
		logger = mock<Logger>();
		controller = new EngineCredentialsController(
			permissionChecker,
			credentialsHelper,
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
		);

		additionalData = {} as IWorkflowExecuteAdditionalData;
		mocks.getBase.mockResolvedValue(additionalData);
		vi.mocked(permissionChecker.findInaccessible).mockResolvedValue({
			homeProject: mock(),
			inaccessibleIds: [],
		});
		vi.mocked(credentialsHelper.getDecrypted).mockResolvedValue(decrypted);
	});

	describe('resolveCredential', () => {
		it('answers 200 with the decrypted data', async () => {
			const res = newResponse();

			await controller.resolveCredential(newRequest(), res);

			expect(res.status).toHaveBeenCalledExactlyOnceWith(200);
			expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: decrypted });
		});

		it('decrypts with the credential, mode and consumer node type from the request', async () => {
			await controller.resolveCredential(newRequest(), newResponse());

			expect(credentialsHelper.getDecrypted).toHaveBeenCalledExactlyOnceWith(
				additionalData,
				{ id: 'cred-1', name: 'Acme API' },
				'httpHeaderAuth',
				'manual',
				expect.objectContaining({
					node: expect.objectContaining({ type: 'n8n-nodes-base.httpRequest' }),
				}),
			);
		});

		it('builds additional data for the execution in the request', async () => {
			await controller.resolveCredential(newRequest(), newResponse());

			expect(mocks.getBase).toHaveBeenCalledExactlyOnceWith({
				userId: 'user-1',
				workflowId: 'wf-1',
				projectId: 'project-1',
			});
			// The engine's id, so `$execution.id` in a credential reads the right one.
			expect(additionalData.executionId).toBe('exec-1');
		});

		it('checks that the workflow may use the credential before decrypting', async () => {
			await controller.resolveCredential(newRequest(), newResponse());

			expect(permissionChecker.findInaccessible).toHaveBeenCalledExactlyOnceWith('wf-1', [
				'cred-1',
			]);
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
			expect(permissionChecker.findInaccessible).not.toHaveBeenCalled();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
		});

		it('refuses a credential the workflow may not use, and logs it', async () => {
			vi.mocked(permissionChecker.findInaccessible).mockResolvedValue({
				homeProject: mock(),
				inaccessibleIds: ['cred-1'],
			});
			const res = newResponse();

			await expect(controller.resolveCredential(newRequest(), res)).rejects.toThrow(ForbiddenError);
			expect(res.status).not.toHaveBeenCalled();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			// The client discards the body, so the operator's record is the log.
			expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
				expect.stringContaining('Refused credential "cred-1" to workflow "wf-1"'),
			);
		});

		it('answers 404 when the store has no credential with that id and type', async () => {
			vi.mocked(credentialsHelper.getDecrypted).mockRejectedValue(
				new CredentialNotFoundError('cred-1', 'httpHeaderAuth'),
			);

			await expect(controller.resolveCredential(newRequest(), newResponse())).rejects.toThrow(
				NotFoundError,
			);
		});

		it('passes on any other decryption error unchanged', async () => {
			const error = new Error('cipher unavailable');
			vi.mocked(credentialsHelper.getDecrypted).mockRejectedValue(error);

			await expect(controller.resolveCredential(newRequest(), newResponse())).rejects.toBe(error);
		});
	});
});
