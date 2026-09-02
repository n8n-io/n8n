/* eslint-disable @typescript-eslint/unbound-method */
import { OllamaEmbeddings } from '@langchain/ollama';
import { proxyFetch } from '@n8n/ai-utilities';
import { createResultOk } from '@n8n/utils/result';
import type { INode, ISupplyDataFunctions, NodeEgressFilter } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { EmbeddingsOllama } from '../EmbeddingsOllama.node';

vi.mock('@langchain/ollama');
vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...(actual as Record<string, unknown>),
		proxyFetch: vi.fn(),
	};
});

const MockedOllamaEmbeddings = vi.mocked(OllamaEmbeddings);
const mockedProxyFetch = proxyFetch as MockedFunction<typeof proxyFetch>;

const nodeDef: INode = {
	id: '1',
	name: 'Embeddings Ollama',
	typeVersion: 1,
	type: 'n8n-nodes-langchain.embeddingsOllama',
	position: [0, 0],
	parameters: {},
};

/**
 * The lookup may travel to `proxyFetch` as a positional argument or as a field
 * of an options object, so accept either shape.
 */
function lookupReachedProxyFetch(lookup: unknown): boolean {
	return mockedProxyFetch.mock.calls.some((call) =>
		call.some(
			(arg) =>
				arg === lookup ||
				(typeof arg === 'object' &&
					arg !== null &&
					(arg as { lookup?: unknown }).lookup === lookup),
		),
	);
}

describe('EmbeddingsOllama', () => {
	let node: EmbeddingsOllama;

	const setupContext = (credentials: Record<string, unknown>, egressFilter: NodeEgressFilter) => {
		const ctx = mockDeep<ISupplyDataFunctions>();
		ctx.getNode.mockReturnValue(nodeDef);
		ctx.getCredentials.mockResolvedValue(credentials);
		ctx.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'model') return 'llama3';
			return undefined;
		});
		ctx.helpers.getSecureEgressFilter.mockReturnValue(egressFilter);
		return ctx;
	};

	beforeEach(() => {
		node = new EmbeddingsOllama();
		vi.clearAllMocks();
		mockedProxyFetch.mockResolvedValue(new Response('ok', { status: 200 }));
	});

	it('routes requests through the egress filter lookup', async () => {
		const secureLookup = vi.fn();
		const egressFilter: NodeEgressFilter = {
			validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
			createSecureLookup: vi.fn().mockReturnValue(secureLookup),
		};
		const ctx = setupContext({ baseUrl: 'http://ollama.example.com:11434' }, egressFilter);

		await node.supplyData.call(ctx, 0);

		expect(egressFilter.createSecureLookup).toHaveBeenCalled();

		const embeddingsOptions = MockedOllamaEmbeddings.mock.calls[0][0] as
			| { fetch?: typeof fetch }
			| undefined;
		expect(embeddingsOptions?.fetch).toBeTypeOf('function');

		await embeddingsOptions?.fetch?.('http://ollama.example.com:11434/api/embed', {});

		expect(mockedProxyFetch).toHaveBeenCalled();
		expect(lookupReachedProxyFetch(secureLookup)).toBe(true);
	});

	it('rejects a base URL the credential does not allow', async () => {
		const egressFilter: NodeEgressFilter = {
			validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
			createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
		};
		const ctx = setupContext(
			{
				baseUrl: 'http://not-allowed.example.com:11434',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'ollama.example.com',
			},
			egressFilter,
		);

		await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('Domain not allowed');
		expect(MockedOllamaEmbeddings).not.toHaveBeenCalled();
	});

	it('rejects a credential restricted from use in this node', async () => {
		const egressFilter: NodeEgressFilter = {
			validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
			createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
		};
		const ctx = setupContext(
			{
				baseUrl: 'http://ollama.example.com:11434',
				allowedHttpRequestDomains: 'none',
			},
			egressFilter,
		);

		await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('configured to prevent use');
		expect(MockedOllamaEmbeddings).not.toHaveBeenCalled();
	});
});
