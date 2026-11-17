import {
	CodeExecutionBackend,
	type CodeExecutionBackendStatus,
	type CodeTaskRequest,
} from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import type { Result } from '@n8n/utils/result';

/** Runs code tasks in code sandboxes of the sandbox service. */
@Service()
export class CodeSandboxBackend extends CodeExecutionBackend {
	async runTask<T, E = unknown>(_request: CodeTaskRequest): Promise<Result<T, E>> {
		throw new UnexpectedError('The code sandbox backend cannot run code tasks yet');
	}

	getStatus(_taskType: string): CodeExecutionBackendStatus {
		return { available: true };
	}
}
