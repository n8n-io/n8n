import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { UserError, type INode, type ISupplyDataFunctions } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';
import weaviate from 'weaviate-client';

vi.mock('@langchain/weaviate', () => {
	class WeaviateStore {
		static async fromExistingIndex() {
			return new this();
		}
		static fromDocuments = vi.fn();
	}
	return { WeaviateStore };
});

vi.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: {
		getVectorStoreClient: (...args: unknown[]) => unknown;
		populateVectorStore: (...args: unknown[]) => unknown;
	}) =>
		class BaseNode {
			getVectorStoreClient = config.getVectorStoreClient;
			populateVectorStore = config.populateVectorStore;
		},
}));

vi.mock('../shared/methods/listSearch', () => ({ weaviateCollectionsSearch: vi.fn() }));
vi.mock('../shared/descriptions', () => ({ weaviateCollectionRLC: {} }));

import { VectorStoreWeaviate } from './VectorStoreWeaviate.node';

type TestNode = {
	getVectorStoreClient: (
		context: ISupplyDataFunctions,
		filter: undefined,
		embeddings: Embeddings,
		itemIndex: number,
	) => Promise<unknown>;
	populateVectorStore: (
		context: ISupplyDataFunctions,
		embeddings: Embeddings,
		documents: Document[],
		itemIndex: number,
	) => Promise<void>;
};

const CREDENTIAL_PROXY = 'http://credential-proxy.test:3128';
const NODE_PROXY = 'http://node-proxy.test:3128';

const baseCredentials = {
	weaviate_api_key: 'test-api-key',
	custom_connection_http_host: '127.0.0.1',
	custom_connection_http_port: 1,
	custom_connection_http_secure: false,
	custom_connection_grpc_host: '127.0.0.1',
	custom_connection_grpc_port: 2,
	custom_connection_grpc_secure: false,
};

function createContext(
	options: Record<string, unknown>,
	credentials: Record<string, unknown> = {},
) {
	const context = mock<ISupplyDataFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ name: 'Weaviate' }));
	context.getNodeParameter.mockImplementation((name: string) =>
		name === 'options' ? { skip_init_checks: true, ...options } : 'TestCollection',
	);
	context.getCredentials.mockResolvedValue({ ...baseCredentials, ...credentials });
	return context;
}

describe('VectorStoreWeaviate.node', () => {
	const originalGrpcProxy = process.env.grpc_proxy;
	const node = new VectorStoreWeaviate() as unknown as TestNode;
	let connectSpy: MockInstance<typeof weaviate.connectToCustom>;

	const getClient = async (
		options: Record<string, unknown>,
		credentials?: Record<string, unknown>,
	) =>
		await node.getVectorStoreClient(
			createContext(options, credentials),
			undefined,
			mock<Embeddings>(),
			0,
		);

	const usedProxies = () => connectSpy.mock.calls.map(([params]) => params.proxies?.grpc);

	beforeEach(() => {
		delete process.env.grpc_proxy;
		connectSpy = vi.spyOn(weaviate, 'connectToCustom');
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (originalGrpcProxy === undefined) delete process.env.grpc_proxy;
		else process.env.grpc_proxy = originalGrpcProxy;
	});

	it('should connect without a proxy by default', async () => {
		await getClient({});

		expect(usedProxies()).toEqual([undefined]);
	});

	it('should use the gRPC proxy from the credential', async () => {
		await getClient({}, { custom_connection_grpc_proxy: CREDENTIAL_PROXY });

		expect(usedProxies()).toEqual([CREDENTIAL_PROXY]);
	});

	it('should prefer the credential gRPC proxy over the node option', async () => {
		await getClient({ proxy_grpc: NODE_PROXY }, { custom_connection_grpc_proxy: CREDENTIAL_PROXY });

		expect(usedProxies()).toEqual([CREDENTIAL_PROXY]);
	});

	it('should use the node option proxy when the gRPC connection is secure', async () => {
		await getClient({ proxy_grpc: NODE_PROXY }, { custom_connection_grpc_secure: true });

		expect(usedProxies()).toEqual([NODE_PROXY]);
	});

	it('should use the node option proxy when the credential has no API key', async () => {
		await getClient({ proxy_grpc: NODE_PROXY }, { weaviate_api_key: '' });

		expect(usedProxies()).toEqual([NODE_PROXY]);
	});

	it('should reject the node option proxy for an insecure gRPC connection with an API key', async () => {
		await expect(getClient({ proxy_grpc: NODE_PROXY })).rejects.toThrow(UserError);
		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('should reject a gRPC proxy that is not an http:// URL', async () => {
		await expect(
			getClient({}, { custom_connection_grpc_proxy: 'https://credential-proxy.test:3128' }),
		).rejects.toThrow(UserError);
		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('should use the credential gRPC proxy when it inserts documents', async () => {
		// Insert mode always runs the init checks, which need a live server
		connectSpy.mockResolvedValue(mock());

		await node.populateVectorStore(
			createContext({}, { custom_connection_grpc_proxy: CREDENTIAL_PROXY }),
			mock<Embeddings>(),
			[],
			0,
		);

		expect(usedProxies()).toEqual([CREDENTIAL_PROXY]);
	});

	it('should keep process proxy settings unchanged for parallel executions', async () => {
		await Promise.all([
			getClient({ proxy_grpc: NODE_PROXY }, { custom_connection_grpc_secure: true }),
			getClient({}, { custom_connection_grpc_proxy: CREDENTIAL_PROXY }),
			getClient({}),
		]);

		expect(usedProxies()).toEqual([NODE_PROXY, CREDENTIAL_PROXY, undefined]);
		expect(process.env.grpc_proxy).toBeUndefined();
	});
});
