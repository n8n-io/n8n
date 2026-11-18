import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
	ExecutingUserIdentifierProxy,
	ExecutionRedactionServiceProxy,
} from '@n8n/backend-services';
import type { ICredentialContext } from 'n8n-workflow';

import { N8NIdentifier } from '../../dynamic-credentials.ee/credential-resolvers/identifiers/n8n-identifier';

import { ExecutionRedactionService } from '../executions/execution-redaction.service';
import { RedactionModule } from '../redaction.module';

describe('RedactionModule', () => {
	let module: RedactionModule;
	let executionRedactionService: Mocked<ExecutionRedactionService>;
	let executionRedactionServiceProxy: Mocked<ExecutionRedactionServiceProxy>;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();

		const logger = mockInstance(Logger);
		executionRedactionService = mock<ExecutionRedactionService>();
		executionRedactionService.init.mockResolvedValue(undefined);
		executionRedactionServiceProxy = mock<ExecutionRedactionServiceProxy>();
		Container.set(ExecutionRedactionService, executionRedactionService);
		Container.set(ExecutionRedactionServiceProxy, executionRedactionServiceProxy);
		Container.set(Logger, logger);

		module = new RedactionModule();
	});

	describe('init', () => {
		it('should initialize ExecutionRedactionService and wire up proxy', async () => {
			await module.init();

			expect(executionRedactionService.init).toHaveBeenCalledTimes(1);
			expect(executionRedactionServiceProxy.setExecutionRedaction).toHaveBeenCalledWith(
				executionRedactionService,
			);
		});

		it('lets every instance identify the user a run executes as', async () => {
			const identifier = mock<N8NIdentifier>();
			identifier.identify.mockResolvedValue('user-1');
			Container.set(N8NIdentifier, identifier);
			const context = { version: 1, identity: 'token' } as ICredentialContext;

			await module.init();

			await expect(Container.get(ExecutingUserIdentifierProxy).identify(context)).resolves.toBe(
				'user-1',
			);
			expect(identifier.identify).toHaveBeenCalledWith(context);
		});
	});
});
