import { models as ociModels } from 'oci-generativeai';
import type { NodeEgressFilter } from 'n8n-workflow';

const {
	proxyFetch,
	listModels,
	generativeAiClient,
	generativeAiInferenceClient,
	maxAttemptsTerminationStrategy,
	defaultRequestSigner,
	simpleAuthenticationDetailsProvider,
} = vi.hoisted(() => ({
	proxyFetch: vi.fn(),
	listModels: vi.fn(),
	generativeAiClient: vi.fn(),
	generativeAiInferenceClient: vi.fn(),
	maxAttemptsTerminationStrategy: vi.fn().mockImplementation(function MockMaxAttempts() {
		return { maxAttempts: 1 };
	}),
	defaultRequestSigner: vi.fn().mockImplementation(function MockDefaultRequestSigner() {
		return { signHttpRequest: vi.fn() };
	}),
	simpleAuthenticationDetailsProvider: vi.fn(),
}));

vi.mock('@n8n/ai-utilities', () => ({ proxyFetch }));

vi.mock('oci-common', () => ({
	Region: {
		fromRegionId: vi.fn((regionId: string) => {
			const realmDomains: Record<string, string> = {
				'us-phoenix-1': 'oraclecloud.com',
				'us-gov-ashburn-1': 'oraclegovcloud.com',
				'uk-gov-london-1': 'oraclegovcloud.uk',
			};
			const realmDomain = realmDomains[regionId];
			if (!realmDomain) throw new Error('Unknown region');
			return { regionId, realm: { secondLevelDomain: realmDomain } };
		}),
	},
	MaxAttemptsTerminationStrategy: maxAttemptsTerminationStrategy,
	DefaultRequestSigner: defaultRequestSigner,
	SimpleAuthenticationDetailsProvider: simpleAuthenticationDetailsProvider.mockImplementation(
		function MockAuthenticationProvider() {
			return {
				getTenantId: () => 'ocid1.tenancy.oc1..test',
			};
		},
	),
	InstancePrincipalsAuthenticationDetailsProviderBuilder: vi
		.fn()
		.mockImplementation(function MockInstancePrincipalProviderBuilder() {
			return { build: vi.fn().mockResolvedValue({}) };
		}),
	ResourcePrincipalAuthenticationDetailsProvider: {
		builder: vi.fn(() => ({})),
	},
}));

vi.mock('oci-generativeai', () => ({
	models: { ModelCapability: { Chat: 'CHAT' } },
	GenerativeAiClient: generativeAiClient.mockImplementation(function MockGenerativeAiClient() {
		return { listModels };
	}),
}));

vi.mock('oci-generativeaiinference', () => ({
	GenerativeAiInferenceClient: generativeAiInferenceClient,
}));

import {
	clearOciGenAiCachesForTesting,
	awaitOciGenAiRequest,
	createOciGenAiClient,
	getCachedOciGenAiModelCatalogPage,
	getOciEmbeddingModelCapabilities,
	getOciEmbeddingModelIdsWithOutputDimensions,
	getOnDemandModelId,
	getOnDemandEmbeddingModelFallbacks,
	isOnDemandModelAvailable,
	OCI_INFERENCE_CLIENT_CACHE_TTL_MS,
	OCI_MODEL_CATALOG_REQUEST_TIMEOUT_MS,
	type OciGenAiCredentials,
	validateOciCompartmentId,
	validateOciEndpoint,
	validateOciModelId,
	validateOciVendor,
} from './ociGenAi';

const ociCredentials: OciGenAiCredentials = {
	authentication: 'apiKey',
	regionId: 'us-phoenix-1',
	tenancyId: 'ocid1.tenancy.oc1..test',
	userId: 'ocid1.user.oc1..test',
	fingerprint: 'test',
	privateKey: 'test-key',
};

const secureEgressFilter: NodeEgressFilter = {
	validateUrl: vi.fn(),
	validateConnectionHost: vi.fn(),
	createSecureLookup: vi.fn(),
	validateRedirectSync: vi.fn(),
};

describe('OCI input validation', () => {
	beforeEach(() => {
		clearOciGenAiCachesForTesting();
	});

	describe('getOnDemandEmbeddingModelFallbacks', () => {
		it('returns verified on-demand Cohere Embed 4 regions', () => {
			expect(getOnDemandEmbeddingModelFallbacks('us-ashburn-1')).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						displayName: 'Cohere Embed 4',
						modelId: 'cohere.embed-v4.0',
					}),
				]),
			);
			expect(getOnDemandEmbeddingModelFallbacks('eu-frankfurt-1')).not.toEqual(
				expect.arrayContaining([expect.objectContaining({ modelId: 'cohere.embed-v4.0' })]),
			);
		});

		it('marks verified on-demand Embed 3 models as deprecated', () => {
			expect(getOnDemandEmbeddingModelFallbacks('us-chicago-1')).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						displayName: 'Cohere Embed English 3 (Deprecated)',
						modelId: 'cohere.embed-english-v3.0',
					}),
				]),
			);
		});

		it('does not list Cohere Embed 4 in dedicated-only regions', () => {
			expect(getOnDemandEmbeddingModelFallbacks('ap-hyderabad-1')).not.toEqual(
				expect.arrayContaining([expect.objectContaining({ modelId: 'cohere.embed-v4.0' })]),
			);
		});
	});

	describe('model catalog normalization', () => {
		it('keeps active models and excludes retired models', () => {
			expect(
				isOnDemandModelAvailable({
					id: 'meta.llama-3.3-70b-instruct',
					timeOnDemandRetired: null,
				}),
			).toBe(true);
			expect(
				isOnDemandModelAvailable({
					id: 'meta.llama-3.3-70b-instruct',
					timeOnDemandRetired: new Date(0),
				}),
			).toBe(false);
			expect(
				isOnDemandModelAvailable({
					id: 'meta.llama-3.3-70b-instruct',
					timeOnDemandRetired: 'not-a-date',
				}),
			).toBe(true);
		});

		it.each([
			['Meta', 'Meta Llama 3.3 (70B)', 'meta.llama-3.3-70b-instruct'],
			['Meta', 'Meta Llama 3.3 70B Instruct', 'meta.llama-3.3-70b-instruct'],
			['Google', 'Google Gemini 2.5 Pro', 'google.gemini-2.5-pro'],
			['OpenAI', 'OpenAI GPT OSS 120B', 'openai.gpt-oss-120b'],
			['xAI', 'xAI Grok 4.3', 'xai.grok-4.3'],
			['xAI', 'Grok 4.3', 'xai.grok-4.3'],
			['Cohere', 'Cohere Command A', 'cohere.command-a-03-2025'],
			['Meta', 'mEtA: Llama 3.3 70B Instruct', 'meta.llama-3.3-70b-instruct'],
		])('resolves a verified provider model ID for %s', (vendor, displayName, expectedId) => {
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.example',
					vendor,
					displayName,
				}),
			).toBe(expectedId);
		});

		it('does not derive a provider model ID without vendor and display-name metadata', () => {
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.example',
					displayName: 'Grok 4.3',
				}),
			).toBe('');
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.example',
					vendor: 'xAI',
				}),
			).toBe('');
		});

		it('does not derive a provider model ID from invalid OCID metadata', () => {
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.example',
					vendor: 'xAI',
					displayName: '---',
				}),
			).toBe('');
		});

		it('does not guess a provider model ID for an unverified catalog name', () => {
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.example',
					vendor: 'Meta',
					displayName: 'Meta Llama 4 Maverick',
				}),
			).toBe('');
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.example',
					vendor: 'Cohere',
					displayName: 'Cohere Command R',
				}),
			).toBe('');
		});

		it('preserves an explicit provider model ID from the catalog', () => {
			expect(getOnDemandModelId({ id: 'meta.llama-3.3-70b-instruct' })).toBe(
				'meta.llama-3.3-70b-instruct',
			);
			expect(getOnDemandModelId({ id: 'invalid/model-id' })).toBe('');
		});

		it('uses a provider model ID supplied as the display name for a management OCID', () => {
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.amaaaaaask7dceyal3a65uayrndlskb3atfb3juhkveeg4qkujuzcnl2jfna',
					vendor: 'xai',
					displayName: 'xai.grok-4.6',
				}),
			).toBe('xai.grok-4.6');
		});

		it('does not treat an unprefixed display name as a provider model ID', () => {
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.amaaaaaask7dceyal3a65uayrndlskb3atfb3juhkveeg4qkujuzcnl2jfna',
					vendor: 'xai',
					displayName: 'Grok-5',
				}),
			).toBe('');
		});
	});

	describe('createOciGenAiClient', () => {
		beforeEach(() => {
			generativeAiInferenceClient.mockClear();
			proxyFetch.mockClear();
			maxAttemptsTerminationStrategy.mockClear();
			simpleAuthenticationDetailsProvider.mockClear();
		});

		it('preserves whitespace in API key passphrases', async () => {
			await createOciGenAiClient({
				...ociCredentials,
				passphrase: ' secret passphrase ',
			});

			expect(simpleAuthenticationDetailsProvider).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.anything(),
				expect.anything(),
				' secret passphrase ',
				expect.anything(),
			);
		});

		it('uses null for an empty API key passphrase', async () => {
			await createOciGenAiClient({ ...ociCredentials, passphrase: '' });

			expect(simpleAuthenticationDetailsProvider).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.anything(),
				expect.anything(),
				null,
				expect.anything(),
			);
		});

		it('uses a custom OCI HTTP client for n8n secure egress', async () => {
			await createOciGenAiClient(ociCredentials, secureEgressFilter);

			expect(generativeAiInferenceClient).toHaveBeenCalledWith(
				expect.objectContaining({ httpClient: expect.anything() }),
				expect.anything(),
			);
			const httpClient = generativeAiInferenceClient.mock.calls[0][0].httpClient;
			await httpClient.send({
				method: 'POST',
				headers: new Headers(),
				uri: 'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com/test',
			});
			expect(proxyFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com/test',
					egressFilter: secureEgressFilter,
				}),
			);
		});

		it('uses the OCI SDK default transport with one SDK attempt outside n8n execution', async () => {
			await createOciGenAiClient(ociCredentials);

			expect(maxAttemptsTerminationStrategy).toHaveBeenCalledWith(1);
			expect(generativeAiInferenceClient).toHaveBeenCalledWith(expect.anything(), {
				retryConfiguration: { terminationStrategy: { maxAttempts: 1 } },
			});
		});

		it('applies the configured timeout to OCI inference requests', async () => {
			await createOciGenAiClient(ociCredentials, secureEgressFilter, 60000);

			const httpClient = generativeAiInferenceClient.mock.calls[0][0].httpClient;
			await httpClient.send({
				method: 'POST',
				headers: new Headers(),
				uri: 'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com/test',
			});
			expect(proxyFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					egressFilter: secureEgressFilter,
					timeoutOptions: { headersTimeout: 60000, bodyTimeout: 60000 },
				}),
			);
		});

		it('reuses a single inference client across concurrent model wrappers', async () => {
			const credentials = {
				...ociCredentials,
				userId: 'ocid1.user.oc1..inference-client-concurrent-test',
			};

			const [firstClient, secondClient] = await Promise.all([
				createOciGenAiClient(credentials),
				createOciGenAiClient(credentials),
			]);

			expect(firstClient).toBe(secondClient);
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(1);
		});

		it('reuses the cached inference client across sequential calls', async () => {
			const credentials = {
				...ociCredentials,
				userId: 'ocid1.user.oc1..inference-client-sequential-test',
			};

			const firstClient = await createOciGenAiClient(credentials);
			const secondClient = await createOciGenAiClient(credentials);

			expect(secondClient).toBe(firstClient);
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(1);
		});

		it.each(['instancePrincipal', 'resourcePrincipal'] as const)(
			'does not cache inference clients for %s authentication',
			async (authentication) => {
				const credentials: OciGenAiCredentials = {
					authentication,
					regionId: 'us-phoenix-1',
				};

				const firstClient = await createOciGenAiClient(credentials);
				const secondClient = await createOciGenAiClient(credentials);

				expect(secondClient).not.toBe(firstClient);
				expect(generativeAiInferenceClient).toHaveBeenCalledTimes(2);
			},
		);

		it('does not include private key material in the inference client cache identity', async () => {
			const credentials = {
				...ociCredentials,
				userId: 'ocid1.user.oc1..inference-client-identity-test',
			};

			const firstClient = await createOciGenAiClient(credentials);
			const secondClient = await createOciGenAiClient({
				...credentials,
				privateKey: 'rotated-key',
			});

			expect(secondClient).toBe(firstClient);
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(1);
		});

		it('does not reuse an inference client across different OCI users', async () => {
			const firstClient = await createOciGenAiClient({
				...ociCredentials,
				userId: 'ocid1.user.oc1..inference-client-user-a',
			});
			const secondClient = await createOciGenAiClient({
				...ociCredentials,
				userId: 'ocid1.user.oc1..inference-client-user-b',
			});

			expect(secondClient).not.toBe(firstClient);
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(2);
		});

		it('does not reuse an inference client after fingerprint rotation', async () => {
			const firstClient = await createOciGenAiClient({
				...ociCredentials,
				fingerprint: 'inference-client-fingerprint-a',
			});
			const secondClient = await createOciGenAiClient({
				...ociCredentials,
				fingerprint: 'inference-client-fingerprint-b',
			});

			expect(secondClient).not.toBe(firstClient);
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(2);
		});

		it('does not reuse an inference client across different regions and endpoints', async () => {
			const firstClient = await createOciGenAiClient({
				...ociCredentials,
				serviceEndpoint: 'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
			});
			const secondClient = await createOciGenAiClient({
				...ociCredentials,
				regionId: 'us-gov-ashburn-1',
				serviceEndpoint: 'https://inference.generativeai.us-gov-ashburn-1.oci.oraclegovcloud.com',
			});

			expect(secondClient).not.toBe(firstClient);
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(2);
		});

		it('does not reuse an inference client with a different request timeout', async () => {
			const credentials = {
				...ociCredentials,
				userId: 'ocid1.user.oc1..inference-client-timeout-test',
			};

			const firstClient = await createOciGenAiClient(credentials, undefined, 60000);
			const secondClient = await createOciGenAiClient(credentials, undefined, 120000);

			expect(secondClient).not.toBe(firstClient);
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(2);
		});

		it('creates a new inference client after cache expiration', async () => {
			vi.useFakeTimers();
			try {
				const credentials = {
					...ociCredentials,
					userId: 'ocid1.user.oc1..inference-client-expiration-test',
				};

				const firstClient = await createOciGenAiClient(credentials);
				vi.advanceTimersByTime(OCI_INFERENCE_CLIENT_CACHE_TTL_MS + 1);
				const secondClient = await createOciGenAiClient(credentials);

				expect(secondClient).not.toBe(firstClient);
				expect(generativeAiInferenceClient).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});

		it('retries client creation after a shared initialization failure', async () => {
			generativeAiInferenceClient.mockImplementationOnce(() => {
				throw new Error('initialization failed');
			});
			const credentials = {
				...ociCredentials,
				userId: 'ocid1.user.oc1..inference-client-failure-test',
			};

			await expect(
				Promise.all([createOciGenAiClient(credentials), createOciGenAiClient(credentials)]),
			).rejects.toThrow('initialization failed');
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(1);

			await expect(createOciGenAiClient(credentials)).resolves.toBeDefined();
			expect(generativeAiInferenceClient).toHaveBeenCalledTimes(2);
		});
	});

	describe('validateOciModelId', () => {
		it('accepts standard named models', () => {
			expect(validateOciModelId('meta.llama-3.3-70b-instruct')).toBe('meta.llama-3.3-70b-instruct');
			expect(validateOciModelId('cohere.command-r-plus')).toBe('cohere.command-r-plus');
		});

		it('accepts OCIDs across realms', () => {
			expect(validateOciModelId('ocid1.generativeaimodel.oc1.iad.amaaaaaa123')).toBe(
				'ocid1.generativeaimodel.oc1.iad.amaaaaaa123',
			);
			expect(validateOciModelId('ocid1.generativeaimodel.oc4.eu-frankfurt-1.amaaaaaa456')).toBe(
				'ocid1.generativeaimodel.oc4.eu-frankfurt-1.amaaaaaa456',
			);
		});

		it('rejects unsafe values', () => {
			expect(() => validateOciModelId('../../etc/passwd')).toThrow();
			expect(() => validateOciModelId('<script>alert(1)</script>')).toThrow();
			expect(() => validateOciModelId('model\nname')).toThrow();
			expect(() => validateOciModelId('')).toThrow();
		});

		it('rejects a pathological-looking value within a bounded time', () => {
			const input = `${'a.'.repeat(127)}!`;
			const startedAt = performance.now();

			expect(() => validateOciModelId(input)).toThrow();
			expect(performance.now() - startedAt).toBeLessThan(100);
		});

		it('rejects oversized model OCIDs before pattern matching', () => {
			const oversizedValue = 'ocid1.generativeaimodel.oc1..' + 'a'.repeat(257);
			const startedAt = performance.now();

			expect(() => validateOciModelId(oversizedValue)).toThrow('OCI model ID is too long');
			expect(performance.now() - startedAt).toBeLessThan(100);
		});
	});

	describe('validateOciCompartmentId', () => {
		it('accepts compartment and tenancy OCIDs across realms', () => {
			expect(validateOciCompartmentId('ocid1.compartment.oc1..aaaa123')).toBe(
				'ocid1.compartment.oc1..aaaa123',
			);
			expect(validateOciCompartmentId('ocid1.tenancy.oc1..aaaa456')).toBe(
				'ocid1.tenancy.oc1..aaaa456',
			);
			expect(validateOciCompartmentId('ocid1.compartment.oc2..gov123')).toBe(
				'ocid1.compartment.oc2..gov123',
			);
		});

		it('rejects invalid resource types and empty values', () => {
			expect(() => validateOciCompartmentId('ocid1.instance.oc1..aaaa123')).toThrow();
			expect(() => validateOciCompartmentId('   ')).toThrow();
		});

		it('rejects oversized and control-character values before pattern matching', () => {
			const oversizedValue = 'ocid1.tenancy.oc1..' + 'a'.repeat(257);
			const startedAt = performance.now();

			expect(() => validateOciCompartmentId(oversizedValue)).toThrow(
				'Compartment OCID is too long',
			);
			expect(() => validateOciCompartmentId('ocid1.compartment.oc1..aaaa\x00')).toThrow(
				'Compartment OCID contains invalid control characters',
			);
			expect(performance.now() - startedAt).toBeLessThan(100);
		});
	});

	describe('validateOciVendor', () => {
		it('normalizes supported provider names', () => {
			expect(validateOciVendor(' Meta ')).toBe('meta');
			expect(validateOciVendor('OpenAI')).toBe('openai');
			expect(validateOciVendor(undefined)).toBeUndefined();
		});

		it('rejects invalid vendor filters', () => {
			expect(() => validateOciVendor('open ai')).toThrow();
			expect(() => validateOciVendor('vendor/name')).toThrow();
			expect(() => validateOciVendor('a'.repeat(65))).toThrow();
		});
	});

	describe('embedding model capabilities', () => {
		it('returns output dimensions only for models with verified capability metadata', () => {
			expect(getOciEmbeddingModelCapabilities('COHERE.EMBED-V4.0')).toEqual({
				outputDimensions: [256, 512, 1024, 1536],
			});
			expect(getOciEmbeddingModelCapabilities('cohere.embed-english-v3.0')).toBeUndefined();
			expect(getOciEmbeddingModelIdsWithOutputDimensions()).toEqual(['cohere.embed-v4.0']);
		});
	});

	describe('validateOciEndpoint', () => {
		it('accepts supported OCI inference endpoints', async () => {
			expect(
				await validateOciEndpoint(
					'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-phoenix-1',
				),
			).toBe('https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com');
			expect(
				await validateOciEndpoint(
					'https://inference.generativeai.us-gov-ashburn-1.oci.oraclegovcloud.com',
					'us-gov-ashburn-1',
				),
			).toBe('https://inference.generativeai.us-gov-ashburn-1.oci.oraclegovcloud.com');
			expect(
				await validateOciEndpoint(
					'https://inference.generativeai.uk-gov-london-1.oci.oraclegovcloud.uk',
					'uk-gov-london-1',
				),
			).toBe('https://inference.generativeai.uk-gov-london-1.oci.oraclegovcloud.uk');
		});

		it('rejects untrusted or malformed endpoints', async () => {
			await expect(
				validateOciEndpoint(
					'http://inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-phoenix-1',
				),
			).rejects.toThrow();
			await expect(validateOciEndpoint('https://example.com', 'us-phoenix-1')).rejects.toThrow();
			await expect(
				validateOciEndpoint(
					'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com.evil.example',
					'us-phoenix-1',
				),
			).rejects.toThrow();
			await expect(
				validateOciEndpoint(
					'https://user:pass@inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-phoenix-1',
				),
			).rejects.toThrow();
			await expect(
				validateOciEndpoint(
					'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-gov-ashburn-1',
				),
			).rejects.toThrow();
		});
	});

	describe('getCachedOciGenAiModelCatalogPage', () => {
		beforeEach(() => {
			generativeAiClient.mockClear();
			proxyFetch.mockClear();
		});

		it('uses a custom OCI HTTP client for catalog requests through n8n secure egress', async () => {
			listModels.mockResolvedValue({ modelCollection: { items: [] } });

			await getCachedOciGenAiModelCatalogPage(
				ociCredentials,
				{
					compartmentId: 'ocid1.compartment.oc1..test',
					capability: ociModels.ModelCapability.Chat,
				},
				secureEgressFilter,
			);

			expect(generativeAiClient).toHaveBeenCalledWith(
				expect.objectContaining({ httpClient: expect.anything() }),
				expect.anything(),
			);
		});

		it('looks up an exact provider model ID that is not on the current catalog page', async () => {
			listModels.mockResolvedValue({
				modelCollection: {
					items: [
						{
							id: 'ocid1.generativeaimodel.oc1.phx.example',
							vendor: 'xai',
							displayName: 'xai.grok-4.6',
						},
					],
				},
			});

			const page = await getCachedOciGenAiModelCatalogPage(ociCredentials, {
				compartmentId: 'ocid1.compartment.oc1..test',
				capability: ociModels.ModelCapability.Chat,
				modelId: 'xai.grok-4.6',
			});

			expect(listModels).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'xai.grok-4.6', limit: 1 }),
			);
			expect(page.searchModels).toEqual([
				{
					id: 'xai.grok-4.6',
					name: 'xai.grok-4.6',
					searchText: 'xai.grok-4.6 xai.grok-4.6',
				},
			]);
		});

		it('retries an exact provider model ID as a display name when OCI IDs are management OCIDs', async () => {
			listModels.mockResolvedValueOnce({ modelCollection: { items: [] } }).mockResolvedValueOnce({
				modelCollection: {
					items: [
						{
							id: 'ocid1.generativeaimodel.oc1.phx.example',
							vendor: 'xai',
							displayName: 'xai.grok-4.6',
						},
					],
				},
			});

			const page = await getCachedOciGenAiModelCatalogPage(ociCredentials, {
				compartmentId: 'ocid1.compartment.oc1..test',
				capability: ociModels.ModelCapability.Chat,
				modelId: 'xai.grok-4.6',
			});

			expect(listModels).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ displayName: 'xai.grok-4.6', id: undefined, limit: 1 }),
			);
			expect(page.searchModels).not.toHaveLength(0);
		});

		it('removes a timed-out catalog page so the next search can create a new connection', async () => {
			vi.useFakeTimers();
			try {
				const request = {
					compartmentId: 'ocid1.compartment.oc1..test',
					capability: ociModels.ModelCapability.Chat,
				};
				listModels.mockImplementationOnce(async () => await new Promise<never>(() => {}));

				const pendingPage = getCachedOciGenAiModelCatalogPage(ociCredentials, request);
				const timedOutPage = expect(pendingPage).rejects.toThrow(
					'OCI model catalog request timed out',
				);
				// Let lazy OCI module loading reach the catalog timeout before advancing time.
				await vi.dynamicImportSettled();
				await vi.advanceTimersByTimeAsync(OCI_MODEL_CATALOG_REQUEST_TIMEOUT_MS);
				await timedOutPage;

				listModels.mockResolvedValueOnce({
					modelCollection: {
						items: [{ id: 'xai.grok-4.6', displayName: 'xai.grok-4.6' }],
					},
				});
				const retry = await getCachedOciGenAiModelCatalogPage(ociCredentials, request);

				expect(generativeAiClient).toHaveBeenCalledTimes(2);
				expect(listModels).toHaveBeenCalledTimes(2);
				expect(retry.searchModels).not.toHaveLength(0);
			} finally {
				vi.useRealTimers();
			}
		});
		beforeEach(() => {
			listModels.mockReset();
		});

		it('reuses the catalog response for subsequent searches', async () => {
			listModels.mockResolvedValue({
				modelCollection: {
					items: [
						{
							id: 'meta.llama-3.3-70b-instruct',
							displayName: 'Meta Llama 3.3 70B Instruct',
						},
						{
							id: 'ocid1.generativeaimodel.oc1.phx.example',
							vendor: 'xAI',
							displayName: 'xAI Grok 4.3',
						},
					],
				},
				opcNextPage: undefined,
			});

			const request = {
				compartmentId: 'ocid1.compartment.oc1..test',
				capability: ociModels.ModelCapability.Chat,
				vendor: 'meta',
			};
			const firstPage = await getCachedOciGenAiModelCatalogPage(ociCredentials, request);
			await getCachedOciGenAiModelCatalogPage(ociCredentials, request);

			expect(firstPage.searchModels).toEqual([
				{
					id: 'meta.llama-3.3-70b-instruct',
					name: 'Meta Llama 3.3 70B Instruct',
					searchText: 'meta llama 3.3 70b instruct meta.llama-3.3-70b-instruct',
				},
				{
					id: 'xai.grok-4.3',
					name: 'xAI Grok 4.3',
					searchText: 'xai grok 4.3 xai.grok-4.3',
				},
			]);
			expect(listModels).toHaveBeenCalledTimes(1);
		});

		it('forwards and caches a valid pagination token as a separate catalog page', async () => {
			listModels
				.mockResolvedValueOnce({
					modelCollection: { items: [] },
					opcNextPage: 'next-page-token',
				})
				.mockResolvedValueOnce({
					modelCollection: { items: [] },
					opcNextPage: undefined,
				});

			const request = {
				compartmentId: 'ocid1.compartment.oc1..test',
				capability: ociModels.ModelCapability.Chat,
			};

			await getCachedOciGenAiModelCatalogPage(ociCredentials, request);
			await getCachedOciGenAiModelCatalogPage(ociCredentials, {
				...request,
				paginationToken: 'next-page-token',
			});
			await getCachedOciGenAiModelCatalogPage(ociCredentials, {
				...request,
				paginationToken: 'next-page-token',
			});

			expect(listModels).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ page: 'next-page-token' }),
			);
			expect(listModels).toHaveBeenCalledTimes(2);
		});

		it('validates vendor filters before calling OCI', async () => {
			await expect(
				getCachedOciGenAiModelCatalogPage(ociCredentials, {
					compartmentId: 'ocid1.compartment.oc1..test',
					capability: ociModels.ModelCapability.Chat,
					vendor: 'vendor/name',
				}),
			).rejects.toThrow('OCI vendor must contain only letters');

			expect(listModels).not.toHaveBeenCalled();
		});

		it('removes a failed page from the cache so a later search can retry it', async () => {
			const request = {
				compartmentId: 'ocid1.compartment.oc1..test',
				capability: ociModels.ModelCapability.Chat,
			};
			listModels.mockRejectedValueOnce(new Error('OCI unavailable'));

			await expect(getCachedOciGenAiModelCatalogPage(ociCredentials, request)).rejects.toThrow(
				'OCI unavailable',
			);

			listModels.mockResolvedValueOnce({
				modelCollection: { items: [] },
				opcNextPage: undefined,
			});
			await expect(getCachedOciGenAiModelCatalogPage(ociCredentials, request)).resolves.toEqual({
				models: [],
				searchModels: [],
				nextPage: undefined,
			});
			expect(listModels).toHaveBeenCalledTimes(2);
		});
	});
});

describe('OCI request timeout', () => {
	it('returns the SDK response when it resolves before the configured timeout', async () => {
		await expect(awaitOciGenAiRequest(Promise.resolve('response'), 1_000)).resolves.toBe(
			'response',
		);
	});

	it('returns a timeout error when an SDK request remains pending', async () => {
		vi.useFakeTimers();
		try {
			const pendingRequest = awaitOciGenAiRequest(new Promise<never>(() => {}), 1_000);
			const expectation = expect(pendingRequest).rejects.toThrow(
				'OCI request timed out after 1000ms',
			);
			await vi.advanceTimersByTimeAsync(1_000);
			await expectation;
		} finally {
			vi.useRealTimers();
		}
	});
});
