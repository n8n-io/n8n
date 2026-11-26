import { CodeSandboxConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	SandboxClient,
	SandboxServiceError,
	type CodeSandbox,
	type CodeTaskEvent,
	type CreateCodeSandboxOptions,
} from '@n8n/sandbox-client';

import { CodeTaskOutcomeUnknownError, readTaskOutcome, type CodeTaskOutcome } from './task-outcome';

@Service()
export class CodeSandboxClient {
	private readonly client: SandboxClient;

	constructor(config: CodeSandboxConfig) {
		this.client = new SandboxClient({ baseUrl: config.url, apiKey: config.apiKey });
	}

	async getOrCreateSandbox(options: CreateCodeSandboxOptions): Promise<CodeSandbox> {
		return await this.client.createCodeSandbox(options);
	}

	async runTask(
		sandboxId: string,
		taskId: string,
		taskInput: Buffer,
		signal?: AbortSignal,
	): Promise<CodeTaskOutcome> {
		let events: AsyncIterable<CodeTaskEvent>;
		try {
			events = await this.client.runCodeTask(sandboxId, { spec: { taskId }, taskInput, signal });
		} catch (error) {
			// With no response, the sandbox may have received and run the task
			if (error instanceof SandboxServiceError && error.status === 0 && !signal?.aborted) {
				throw new CodeTaskOutcomeUnknownError(error);
			}
			throw error;
		}

		return await readTaskOutcome(events, signal);
	}
}
