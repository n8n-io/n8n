import { UserError } from 'n8n-workflow';

import { isChatCapableAzureDeployment, listAzureOpenAiModels } from '../providers/azure';

function mockFetch(body: unknown, ok = true, status = 200) {
	return vi.fn().mockResolvedValue({
		ok,
		status,
		text: async () => JSON.stringify(body),
		json: async () => body,
	}) as unknown as typeof globalThis.fetch;
}

function calledUrl(fetchFn: unknown): string {
	return String((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0]);
}

function calledHeaders(fetchFn: unknown): Record<string, string> {
	const init = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
		headers: Record<string, string>;
	};
	return init.headers;
}

describe('isChatCapableAzureDeployment', () => {
	it.each([
		[{ chat_completion: 'true' }, true],
		[{ chat_completion: true }, true],
		[{ chat_completion: 'false' }, false],
		[{ chat_completion: false }, false],
		[{ chatCompletion: 'true' }, true],
		[{ embeddings: 'true' }, false],
		[undefined, false],
	])('classifies %s as chat-capable: %s', (capabilities, expected) => {
		expect(isChatCapableAzureDeployment(capabilities)).toBe(expected);
	});
});

describe('listAzureOpenAiModels', () => {
	it('maps deployment name to id, sorted by name, and drops non-chat deployments', async () => {
		const fetch = mockFetch({
			value: [
				{
					name: 'my-embeddings',
					modelName: 'text-embedding-3-small',
					capabilities: { embeddings: 'true' },
				},
				{ name: 'my-gpt4', modelName: 'gpt-4.1-nano', capabilities: { chat_completion: 'true' } },
				{ name: 'a-chat-model', modelName: 'gpt-4o', capabilities: { chat_completion: 'true' } },
			],
		});

		const models = await listAzureOpenAiModels({
			baseURL: 'https://my-resource.services.ai.azure.com',
			project: 'my-project',
			headers: { 'api-key': 'key' },
			fetch,
		});

		expect(calledUrl(fetch)).toBe(
			'https://my-resource.services.ai.azure.com/api/projects/my-project/deployments?api-version=v1',
		);
		expect(calledHeaders(fetch)).toEqual({ 'api-key': 'key' });
		expect(models).toEqual([
			{ id: 'a-chat-model', name: 'a-chat-model (gpt-4o)' },
			{ id: 'my-gpt4', name: 'my-gpt4 (gpt-4.1-nano)' },
		]);
	});

	it('URL-encodes the project name and strips a trailing slash from baseURL', async () => {
		const fetch = mockFetch({ value: [] });

		await listAzureOpenAiModels({
			baseURL: 'https://my-resource.services.ai.azure.com/',
			project: 'a project/with slashes',
			headers: {},
			fetch,
		});

		expect(calledUrl(fetch)).toBe(
			'https://my-resource.services.ai.azure.com/api/projects/a%20project%2Fwith%20slashes/deployments?api-version=v1',
		);
	});

	it('falls back to the deployment name when modelName is missing', async () => {
		const fetch = mockFetch({
			value: [{ name: 'my-gpt4', capabilities: { chat_completion: 'true' } }],
		});

		const models = await listAzureOpenAiModels({
			baseURL: 'https://my-resource.services.ai.azure.com',
			project: 'my-project',
			headers: {},
			fetch,
		});

		expect(models).toEqual([{ id: 'my-gpt4', name: 'my-gpt4' }]);
	});

	it('returns an empty list when the response has no value field', async () => {
		const fetch = mockFetch({});

		const models = await listAzureOpenAiModels({
			baseURL: 'https://my-resource.services.ai.azure.com',
			project: 'my-project',
			headers: {},
			fetch,
		});

		expect(models).toEqual([]);
	});

	describe('error handling', () => {
		it.each([401, 403])(
			'throws a non-reportable user error on an authentication response with status %s',
			async (status) => {
				const fetch = mockFetch({ error: 'unauthorized' }, false, status);

				const error = await listAzureOpenAiModels({
					baseURL: 'https://my-resource.services.ai.azure.com',
					project: 'my-project',
					headers: {},
					fetch,
				}).catch((error: unknown) => error);

				expect(error).toBeInstanceOf(UserError);
				expect(error).toMatchObject({
					message:
						"Models couldn't be loaded. Check that the selected credential is valid and has the required permissions, then try again.",
					shouldReport: false,
				});
			},
		);

		it('names the project on a 404, rather than a bare not-found error', async () => {
			const fetch = mockFetch({ error: 'not found' }, false, 404);

			const error = await listAzureOpenAiModels({
				baseURL: 'https://my-resource.services.ai.azure.com',
				project: 'no-such-project',
				headers: {},
				fetch,
			}).catch((error: unknown) => error);

			expect(error).toBeInstanceOf(UserError);
			expect(error).toMatchObject({
				message: 'Project "no-such-project" was not found. Check the project name and try again.',
				shouldReport: false,
			});
		});

		it('keeps other server errors reportable', async () => {
			const fetch = mockFetch({ error: 'boom' }, false, 500);

			const error = await listAzureOpenAiModels({
				baseURL: 'https://my-resource.services.ai.azure.com',
				project: 'my-project',
				headers: {},
				fetch,
			}).catch((error: unknown) => error);

			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(UserError);
			expect(error).toMatchObject({
				message: 'Failed to list Azure OpenAI deployments (status 500): {"error":"boom"}',
			});
		});
	});
});
