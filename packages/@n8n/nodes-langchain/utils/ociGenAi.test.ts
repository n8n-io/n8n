import { models as ociModels } from 'oci-generativeai';

const { listModels, generativeAiInferenceClient } = vi.hoisted(() => ({
	listModels: vi.fn(),
	generativeAiInferenceClient: vi.fn(),
}));

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
	SimpleAuthenticationDetailsProvider: vi
		.fn()
		.mockImplementation(function MockAuthenticationProvider() {
			return {
				getTenantId: () => 'ocid1.tenancy.oc1..test',
			};
		}),
}));

vi.mock('oci-generativeai', () => ({
	models: { ModelCapability: { Chat: 'CHAT' } },
	GenerativeAiClient: vi.fn().mockImplementation(function MockGenerativeAiClient() {
		return { listModels };
	}),
}));

vi.mock('oci-generativeaiinference', () => ({
	GenerativeAiInferenceClient: generativeAiInferenceClient,
}));

import {
	clearOciGenAiCachesForTesting,
	createOciGenAiClient,
	getCachedOciGenAiModelCatalogPage,
	getOciEmbeddingModelCapabilities,
	getOciEmbeddingModelIdsWithOutputDimensions,
	getOnDemandModelId,
	getOnDemandEmbeddingModelFallbacks,
	isOnDemandModelAvailable,
	OCI_INFERENCE_CLIENT_CACHE_TTL_MS,
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

		it('does not synthesize a provider model ID from a management model OCID', () => {
			expect(
				getOnDemandModelId({
					id: 'ocid1.generativeaimodel.oc1.phx.example',
					vendor: 'Meta',
					displayName: 'Meta Llama 3.3 70B Instruct',
				}),
			).toBe('');
			expect(getOnDemandModelId({ id: 'meta.llama-3.3-70b-instruct' })).toBe(
				'meta.llama-3.3-70b-instruct',
			);
		});
	});

	describe('createOciGenAiClient', () => {
		beforeEach(() => {
			generativeAiInferenceClient.mockClear();
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
		it('accepts supported OCI inference endpoints', () => {
			expect(
				validateOciEndpoint(
					'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-phoenix-1',
				),
			).toBe('https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com');
			expect(
				validateOciEndpoint(
					'https://inference.generativeai.us-gov-ashburn-1.oci.oraclegovcloud.com',
					'us-gov-ashburn-1',
				),
			).toBe('https://inference.generativeai.us-gov-ashburn-1.oci.oraclegovcloud.com');
			expect(
				validateOciEndpoint(
					'https://inference.generativeai.uk-gov-london-1.oci.oraclegovcloud.uk',
					'uk-gov-london-1',
				),
			).toBe('https://inference.generativeai.uk-gov-london-1.oci.oraclegovcloud.uk');
		});

		it('rejects untrusted or malformed endpoints', () => {
			expect(() =>
				validateOciEndpoint(
					'http://inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-phoenix-1',
				),
			).toThrow();
			expect(() => validateOciEndpoint('https://example.com', 'us-phoenix-1')).toThrow();
			expect(() =>
				validateOciEndpoint(
					'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com.evil.example',
					'us-phoenix-1',
				),
			).toThrow();
			expect(() =>
				validateOciEndpoint(
					'https://user:pass@inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-phoenix-1',
				),
			).toThrow();
			expect(() =>
				validateOciEndpoint(
					'https://inference.generativeai.us-phoenix-1.oci.oraclecloud.com',
					'us-gov-ashburn-1',
				),
			).toThrow();
		});
	});

	describe('getCachedOciGenAiModelCatalogPage', () => {
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
							vendor: 'Cohere',
							displayName: 'Cohere Embed 4',
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
			]);
			expect(listModels).toHaveBeenCalledTimes(1);
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
