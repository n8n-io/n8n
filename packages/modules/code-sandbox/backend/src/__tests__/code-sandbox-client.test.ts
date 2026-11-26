import type { CodeSandboxConfig } from '@n8n/config';
import { SandboxClient, SandboxServiceError } from '@n8n/sandbox-client';

import { CodeSandboxClient } from '../code-sandbox-client';
import { CodeTaskOutcomeUnknownError } from '../task-outcome';

describe('CodeSandboxClient.runTask', () => {
	const config = { url: 'http://sandbox', apiKey: 'key' } as CodeSandboxConfig;
	const taskInput = Buffer.from('{}');

	afterEach(() => vi.restoreAllMocks());

	it('fails with an unknown outcome when the request gets no response', async () => {
		const lost = new SandboxServiceError('socket hang up', 0);
		vi.spyOn(SandboxClient.prototype, 'runCodeTask').mockRejectedValue(lost);

		const error: unknown = await new CodeSandboxClient(config)
			.runTask('sbx', 't1', taskInput)
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(CodeTaskOutcomeUnknownError);
		expect(error).toHaveProperty('cause', lost);
	});

	it('passes on a response error, because the sandbox did not run the task', async () => {
		const full = new SandboxServiceError('sandbox is full', 429);
		vi.spyOn(SandboxClient.prototype, 'runCodeTask').mockRejectedValue(full);

		await expect(new CodeSandboxClient(config).runTask('sbx', 't1', taskInput)).rejects.toBe(full);
	});
});
