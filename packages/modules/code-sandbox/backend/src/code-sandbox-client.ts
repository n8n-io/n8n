import { CodeSandboxConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	SandboxClient,
	type CodeSandbox,
	type CreateCodeSandboxOptions,
} from '@n8n/sandbox-client';

import { readTaskOutcome, type CodeTaskOutcome } from './task-outcome';

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
		const events = await this.client.runCodeTask(sandboxId, {
			spec: { taskId },
			taskInput,
			signal,
		});

		return await readTaskOutcome(events, signal);
	}
}
