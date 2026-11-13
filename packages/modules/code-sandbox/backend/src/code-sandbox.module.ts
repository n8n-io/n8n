import { Logger } from '@n8n/backend-common';
import { CodeExecutionBackend } from '@n8n/backend-services';
import { CodeSandboxConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';

import { CodeSandboxBackend } from './code-sandbox-backend';
import { validateCodeSandboxConfig } from './validate-code-sandbox-config';

/**
 * Runs code tasks on the sandbox service. n8n starts either this module or
 * the task runner module, based on `N8N_CODE_TASKS_BACKEND`.
 */
@Service()
export class CodeSandboxModule {
	constructor(
		private readonly logger: Logger,
		private readonly config: CodeSandboxConfig,
	) {}

	start() {
		validateCodeSandboxConfig(this.config);

		Container.set(CodeExecutionBackend, Container.get(CodeSandboxBackend));

		this.logger.warn(
			'The code sandbox backend is experimental and cannot run code tasks yet. Code nodes fail until it is complete.',
		);
	}
}
