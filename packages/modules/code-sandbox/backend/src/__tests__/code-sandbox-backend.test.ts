import type { CodeTaskRequest } from '@n8n/backend-services';
import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { CodeSandboxBackend } from '../code-sandbox-backend';

describe('CodeSandboxBackend', () => {
	const backend = new CodeSandboxBackend();

	it('does not run code tasks yet', async () => {
		await expect(backend.runTask(mock<CodeTaskRequest>())).rejects.toThrow(UnexpectedError);
	});

	it.each(['javascript', 'python'])('reports %s as available', (taskType) => {
		expect(backend.getStatus(taskType)).toEqual({ available: true });
	});
});
