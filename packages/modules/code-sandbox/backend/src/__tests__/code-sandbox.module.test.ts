import { mockLogger } from '@n8n/backend-test-utils';
import { CodeExecutionBackend } from '@n8n/backend-services';
import type { CodeSandboxConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { CodeSandboxBackend } from '../code-sandbox-backend';
import { CodeSandboxModule } from '../code-sandbox.module';
import { InvalidCodeSandboxConfigError } from '../errors/invalid-code-sandbox-config.error';

describe('CodeSandboxModule', () => {
	beforeEach(() => {
		Container.reset();
		vi.restoreAllMocks();
	});

	it('sets the code sandbox backend as the code execution backend', () => {
		const config = mock<CodeSandboxConfig>({
			url: 'https://code-sandbox.example.com',
			apiKey: 'secret',
		});

		new CodeSandboxModule(mockLogger(), config).start();

		expect(Container.get(CodeExecutionBackend)).toBeInstanceOf(CodeSandboxBackend);
	});

	it('fails to start with an invalid config', () => {
		const config = mock<CodeSandboxConfig>({ url: '', apiKey: '' });
		const module = new CodeSandboxModule(mockLogger(), config);
		const set = vi.spyOn(Container, 'set');

		expect(() => module.start()).toThrow(InvalidCodeSandboxConfigError);
		expect(set).not.toHaveBeenCalled();
	});
});
