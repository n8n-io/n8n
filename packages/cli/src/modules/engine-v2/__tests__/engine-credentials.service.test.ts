import type { Logger } from '@n8n/backend-common';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';

import type { ResolveCredentialRequest } from '../engine-credentials.contract';
import { EngineCredentialsService } from '../engine-credentials.service';

const mocks = vi.hoisted(() => ({ getBase: vi.fn() }));
vi.mock('@/workflow-execute-additional-data', () => ({ getBase: mocks.getBase }));

const resolveRequest: ResolveCredentialRequest = {
	credential: { id: 'cred-1', name: 'Acme API', type: 'httpHeaderAuth' },
	execution: { executionId: 'exec-1', workflowId: 'wf-1', mode: 'manual' },
	context: { userId: 'user-1', projectId: 'project-1' },
	consumer: { nodeType: 'n8n-nodes-base.httpRequest' },
};

const decrypted = { name: 'X-Api-Key', value: 'secret' };

describe('EngineCredentialsService', () => {
	let permissionChecker: CredentialsPermissionChecker;
	let credentialsHelper: CredentialsHelper;
	let logger: Logger;
	let service: EngineCredentialsService;
	let additionalData: IWorkflowExecuteAdditionalData;

	beforeEach(() => {
		vi.resetAllMocks();
		permissionChecker = mock<CredentialsPermissionChecker>();
		credentialsHelper = mock<CredentialsHelper>();
		logger = mock<Logger>();
		service = new EngineCredentialsService(
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

	describe('resolve', () => {
		it('returns the decrypted data', async () => {
			await expect(service.resolve(resolveRequest)).resolves.toBe(decrypted);
		});

		it('decrypts with the credential, mode and consumer node type from the request', async () => {
			await service.resolve(resolveRequest);

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
			await service.resolve(resolveRequest);

			expect(mocks.getBase).toHaveBeenCalledExactlyOnceWith({
				userId: 'user-1',
				workflowId: 'wf-1',
				projectId: 'project-1',
			});
			// The engine's id, so `$execution.id` in a credential reads the right one.
			expect(additionalData.executionId).toBe('exec-1');
		});

		it('checks that the workflow may use the credential before decrypting', async () => {
			await service.resolve(resolveRequest);

			expect(permissionChecker.findInaccessible).toHaveBeenCalledExactlyOnceWith('wf-1', [
				'cred-1',
			]);
		});

		it('refuses a credential the workflow may not use, and logs it', async () => {
			vi.mocked(permissionChecker.findInaccessible).mockResolvedValue({
				homeProject: mock(),
				inaccessibleIds: ['cred-1'],
			});

			await expect(service.resolve(resolveRequest)).rejects.toThrow(ForbiddenError);
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			// The client discards the body, so the operator's record is the log.
			expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
				expect.stringContaining('Refused credential "cred-1" to workflow "wf-1"'),
			);
		});

		it('reports not found when the store has no credential with that id and type', async () => {
			vi.mocked(credentialsHelper.getDecrypted).mockRejectedValue(
				new CredentialNotFoundError('cred-1', 'httpHeaderAuth'),
			);

			await expect(service.resolve(resolveRequest)).rejects.toThrow(NotFoundError);
		});

		it('passes on any other decryption error unchanged', async () => {
			const error = new Error('cipher unavailable');
			vi.mocked(credentialsHelper.getDecrypted).mockRejectedValue(error);

			await expect(service.resolve(resolveRequest)).rejects.toBe(error);
		});
	});
});
