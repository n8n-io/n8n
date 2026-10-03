import {
	OperationalError,
	UnexpectedError,
	UserError,
	type ICredentialDataDecryptedObject,
	type NodeEgressFilter,
} from 'n8n-workflow';
import type * as common from 'oci-common';
import type * as genai from 'oci-generativeai';
import type * as genaiInference from 'oci-generativeaiinference';
import { PassThrough, Readable } from 'node:stream';

const OCI_MODEL_OCID_PATTERN =
	/^ocid[0-9]+\.generativeaimodel\.oc[0-9]+(?:\.[a-z0-9_-]*)*\.[a-z0-9_-]+$/i;
const OCI_PROVIDER_MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._+-]*$/i;
const OCI_VENDOR_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const OCI_COMPARTMENT_OCID_PATTERN =
	/^ocid[0-9]+\.(?:compartment|tenancy)\.oc[0-9]+(?:\.[a-z0-9_-]*)*\.[a-z0-9_-]+$/i;
const MAX_OCI_OCID_LENGTH = 256;
// Searchable selectors invoke list search per keystroke; retain a small, short-lived catalog.
const MODEL_CATALOG_CACHE_TTL_MS = 60_000;
const MAX_MODEL_CATALOG_CACHE_ENTRIES = 100;
const MAX_MODEL_CATALOG_PAGES_PER_ENTRY = 20;
export const OCI_MODEL_CATALOG_REQUEST_TIMEOUT_MS = 15_000;
export const OCI_INFERENCE_CLIENT_CACHE_TTL_MS = 60_000;
const MAX_INFERENCE_CLIENT_CACHE_ENTRIES = 32;

type OciSdk = {
	common: typeof common;
	genai: typeof genai;
	genaiInference: typeof genaiInference;
	// The package's CJS runtime and ESM type declarations have distinct private class identities.
	langchainOci: unknown;
};

let ociSdkPromise: Promise<OciSdk> | undefined;

/** Lazily loads the OCI runtime once so concurrent Chat and Embeddings requests share it. */
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function loadOciSdk(): Promise<OciSdk> {
	if (ociSdkPromise !== undefined) return ociSdkPromise;

	const request: Promise<OciSdk> = Promise.all([
		import('oci-common'),
		import('oci-generativeai'),
		import('oci-generativeaiinference'),
		import('@oracle/langchain-oci'),
	]).then(([common, genai, genaiInference, langchainOci]) => ({
		common,
		genai,
		genaiInference,
		langchainOci,
	}));

	ociSdkPromise = request;
	void request.catch(() => {
		// Do not retain a failed load; a later OCI request can retry it.
		if (ociSdkPromise === request) ociSdkPromise = undefined;
	});

	return request;
}

export type OciEmbeddingModelCapabilities = {
	outputDimensions?: readonly number[];
};

/**
 * Known embedding model capabilities until OCI exposes reliable per-model
 * output-dimension metadata. Keep this fallback aligned with OCI model documentation.
 */
const OCI_EMBEDDING_MODEL_CAPABILITIES: Readonly<Record<string, OciEmbeddingModelCapabilities>> = {
	'cohere.embed-v4.0': {
		outputDimensions: [256, 512, 1024, 1536],
	},
};

export interface OciGenAiCredentials {
	authentication: 'apiKey' | 'instancePrincipal' | 'resourcePrincipal' | 'session';
	tenancyId?: string;
	userId?: string;
	fingerprint?: string;
	privateKey?: string;
	passphrase?: string;
	configFilePath?: string;
	configProfile?: string;
	regionId: string;
	serviceEndpoint?: string;
}

export function validateOciModelId(modelId: string): string {
	const normalized = modelId.trim();
	if (!normalized) {
		throw new UserError('OCI model ID is required');
	}
	if (normalized.length > 256) {
		throw new UserError('OCI model ID is too long (maximum 256 characters)');
	}
	if ([...normalized].some((character) => character.charCodeAt(0) < 0x20 || character === '\x7f')) {
		throw new UserError('OCI model ID contains invalid control characters');
	}
	if (!OCI_MODEL_OCID_PATTERN.test(normalized) && !OCI_PROVIDER_MODEL_ID_PATTERN.test(normalized)) {
		throw new UserError(`Invalid OCI Generative AI model ID: "${normalized}"`);
	}
	return normalized;
}

/** Normalizes the optional OCI management API vendor filter before model discovery. */
export function validateOciVendor(vendor: string | undefined): string | undefined {
	const normalized = vendor?.trim().toLowerCase();
	if (!normalized) return undefined;

	if (!OCI_VENDOR_PATTERN.test(normalized)) {
		throw new UserError(
			'OCI vendor must contain only letters, numbers, hyphens, and underscores (maximum 64 characters)',
		);
	}

	return normalized;
}

/** Returns capabilities for the selected embedding model when n8n has a verified fallback. */
export function getOciEmbeddingModelCapabilities(
	modelId: string,
): OciEmbeddingModelCapabilities | undefined {
	return OCI_EMBEDDING_MODEL_CAPABILITIES[modelId.toLowerCase()];
}

/** Returns model IDs that expose verified output-dimension controls. */
export function getOciEmbeddingModelIdsWithOutputDimensions(): readonly string[] {
	return Object.entries(OCI_EMBEDDING_MODEL_CAPABILITIES)
		.filter(([, capabilities]) => capabilities.outputDimensions !== undefined)
		.map(([modelId]) => modelId);
}

export function validateOciCompartmentId(compartmentId: string): string {
	const normalized = compartmentId.trim();
	if (!normalized) {
		throw new UserError('Compartment OCID is required');
	}
	if (normalized.length > MAX_OCI_OCID_LENGTH) {
		throw new UserError('Compartment OCID is too long (maximum 256 characters)');
	}
	if ([...normalized].some((character) => character.charCodeAt(0) < 0x20 || character === '\x7f')) {
		throw new UserError('Compartment OCID contains invalid control characters');
	}
	if (!OCI_COMPARTMENT_OCID_PATTERN.test(normalized)) {
		throw new UserError('Invalid OCI Compartment OCID');
	}
	return normalized;
}

async function getExpectedOciInferenceEndpointHost(regionId: string): Promise<string> {
	const { common } = await loadOciSdk();
	const { Region } = common;
	let region: common.Region;
	try {
		region = Region.fromRegionId(regionId.trim());
	} catch {
		throw new UserError('Region ID must be a valid OCI region');
	}

	return `inference.generativeai.${region.regionId}.oci.${region.realm.secondLevelDomain}`;
}

async function getOciManagementEndpoint(regionId: string): Promise<string> {
	const { common } = await loadOciSdk();
	const { Region } = common;
	let region: common.Region;
	try {
		region = Region.fromRegionId(regionId.trim());
	} catch {
		throw new UserError('Region ID must be a valid OCI region');
	}

	return `https://generativeai.${region.regionId}.oci.${region.realm.secondLevelDomain}`;
}

/**
 * Splits the OCI SDK body between request signing and n8n's proxy fetch.
 *
 * Signing a stream consumes it, so streams need independent pass-through copies;
 * string bodies can safely be shared by both operations.
 */
function getOciSignerAndRequestBody(
	body: unknown,
	forceExcludeBody: boolean,
): { signerBody: unknown; requestBody: RequestInit['body'] } {
	// Requests without a body must not send a body or ask the signer to hash one.
	if (body === undefined || body === null || body === '') {
		return { signerBody: undefined, requestBody: undefined };
	}

	// OCI marks some requests as body-excluded, but the request itself still carries the body.
	if (forceExcludeBody) {
		return { signerBody: undefined, requestBody: body as RequestInit['body'] };
	}

	// Strings are immutable, so the signer and proxy fetch can use the same value.
	if (typeof body === 'string') {
		return { signerBody: body, requestBody: body };
	}

	if (body instanceof Readable) {
		return {
			// Pipe the source stream twice because signing and sending each consume their copy.
			signerBody: body.pipe(new PassThrough()),
			// Undici accepts Node streams although the DOM RequestInit type does not expose them.
			requestBody: body.pipe(new PassThrough()) as unknown as RequestInit['body'],
		};
	}

	throw new UnexpectedError('OCI SDK cannot prepare this request body for signing');
}

/** Bounds inference retries to the node timeout while retaining the SDK default when disabled. */
async function getOciInferenceClientConfiguration(requestTimeout?: number) {
	if (requestTimeout === undefined) return {};

	const { common } = await loadOciSdk();
	const { MaxTimeTerminationStrategy } = common;
	return {
		retryConfiguration: {
			terminationStrategy: new MaxTimeTerminationStrategy(requestTimeout / 1000),
		},
	};
}

/** Catalog calls have their own short caller deadline, so do not leave SDK retries running after it. */
async function getOciModelCatalogClientConfiguration() {
	const { common } = await loadOciSdk();
	const { MaxAttemptsTerminationStrategy } = common;
	return {
		retryConfiguration: {
			terminationStrategy: new MaxAttemptsTerminationStrategy(1),
		},
	};
}

/** Routes OCI SDK requests through n8n's egress-aware fetch when filtering is configured. */
async function createOciEgressHttpClient(
	authenticationDetailsProvider: common.AuthenticationDetailsProvider,
	egressFilter: NodeEgressFilter | undefined,
	requestTimeout?: number,
): Promise<common.HttpClient | undefined> {
	// n8n node helpers always provide a filter, including the passthrough filter when egress
	// restrictions are disabled. Undefined supports non-n8n callers using the OCI SDK transport.
	if (egressFilter === undefined) return undefined;

	const [{ proxyFetch }, { common }] = await Promise.all([
		import('@n8n/ai-utilities'),
		loadOciSdk(),
	]);
	const { DefaultRequestSigner } = common;
	const signer = new DefaultRequestSigner(authenticationDetailsProvider);

	return {
		async send(request, forceExcludeBody = false): Promise<Response> {
			const body = getOciSignerAndRequestBody(request.body, forceExcludeBody);
			await signer.signHttpRequest(
				{
					method: request.method,
					headers: request.headers,
					uri: request.uri,
					body: body.signerBody,
				},
				forceExcludeBody,
			);

			const init: RequestInit & { duplex?: 'half' } = {
				method: request.method,
				headers: request.headers,
				body: body.requestBody,
			};
			if (body.requestBody) init.duplex = 'half';

			return await proxyFetch({
				input: request.uri,
				init,
				egressFilter,
				...(requestTimeout === undefined
					? {}
					: {
							timeoutOptions: {
								connectTimeout: requestTimeout,
								headersTimeout: requestTimeout,
								bodyTimeout: requestTimeout,
							},
						}),
			});
		},
	};
}

export async function validateOciEndpoint(
	endpoint: string | undefined,
	regionId: string,
): Promise<string | undefined> {
	const normalized = endpoint?.trim();
	if (!normalized) return undefined;

	let url: URL;
	try {
		url = new URL(normalized);
	} catch {
		throw new UserError('Inference endpoint must be a valid URL');
	}

	if (url.protocol !== 'https:') {
		throw new UserError('Inference endpoint must use HTTPS');
	}
	// OCI clients sign outbound requests, so endpoint overrides must match the selected region's realm.
	if (url.hostname !== (await getExpectedOciInferenceEndpointHost(regionId))) {
		throw new UserError('Inference endpoint must match the configured OCI region and realm');
	}
	if (url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
		throw new UserError(
			'Inference endpoint must not include credentials, a port, a path, a query, or a fragment',
		);
	}

	return url.origin;
}

/** Raw OCI management-catalog fields used to determine whether a model can appear in a selector. */
export type OciGenAiCatalogModel = {
	id: string;
	vendor?: string;
	displayName?: string;
	timeOnDemandRetired?: Date | string | null;
};

/** One cached catalog page with both raw OCI records and normalized selector entries. */
type OciGenAiModelCatalogPage = {
	models: OciGenAiCatalogModel[];
	searchModels: OciGenAiSearchModel[];
	nextPage?: string;
};

type CachedModelCatalog = {
	expiresAt: number;
	pages: Map<string, Promise<OciGenAiModelCatalogPage>>;
};

type CachedInferenceClient = {
	// After expiry, new callers stop reusing this entry.
	// Existing references may keep the client alive until those workflows finish.
	expiresAt: number;
	client: genaiInference.GenerativeAiInferenceClient;
};

const modelCatalogCache = new Map<string, CachedModelCatalog>();
const inferenceClientCache = new Map<string, CachedInferenceClient>();
const inferenceClientInFlight = new Map<
	string,
	Promise<genaiInference.GenerativeAiInferenceClient>
>();
let egressFilterCacheIds = new WeakMap<NodeEgressFilter, number>();
let nextEgressFilterCacheId = 1;

export type OciGenAiSearchModel = {
	id: string;
	name: string;
	searchText: string;
};

export type OciGenAiOnDemandEmbeddingModel = {
	displayName: string;
	modelId: string;
	regions: string[];
};

/**
 * Curated, region-aware fallback for the embedding-model selector.
 *
 * listModels() discovers TEXT_EMBEDDINGS capability, but its response alone does not establish
 * current on-demand serving availability in a region. Keep this fallback aligned with OCI Models by
 * Region. A future hybrid selector can use discovered models once it has a reliable serving-mode signal.
 * Manual model ID entry remains available for new models.
 */
const OCI_ON_DEMAND_EMBEDDING_MODEL_FALLBACKS: OciGenAiOnDemandEmbeddingModel[] = [
	{
		displayName: 'Cohere Embed 4',
		modelId: 'cohere.embed-v4.0',
		regions: ['us-ashburn-1', 'us-chicago-1', 'me-abudhabi-1', 'me-riyadh-1', 'ap-osaka-1'],
	},
	{
		displayName: 'Cohere Embed English 3 (Deprecated)',
		modelId: 'cohere.embed-english-v3.0',
		regions: ['us-chicago-1', 'sa-saopaulo-1', 'eu-frankfurt-1', 'uk-london-1', 'ap-osaka-1'],
	},
	{
		displayName: 'Cohere Embed English Light 3 (Deprecated)',
		modelId: 'cohere.embed-english-light-v3.0',
		regions: ['us-chicago-1'],
	},
	{
		displayName: 'Cohere Embed Multilingual 3 (Deprecated)',
		modelId: 'cohere.embed-multilingual-v3.0',
		regions: ['us-chicago-1', 'sa-saopaulo-1', 'eu-frankfurt-1', 'uk-london-1', 'ap-osaka-1'],
	},
	{
		displayName: 'Cohere Embed Multilingual Light 3 (Deprecated)',
		modelId: 'cohere.embed-multilingual-light-v3.0',
		regions: ['us-chicago-1'],
	},
];

export function isOnDemandModelAvailable(model: OciGenAiCatalogModel): boolean {
	if (model.timeOnDemandRetired == null) return true;

	const retiredAt =
		typeof model.timeOnDemandRetired === 'string'
			? Date.parse(model.timeOnDemandRetired)
			: model.timeOnDemandRetired.getTime();

	return Number.isNaN(retiredAt) || retiredAt > Date.now();
}

function isOciModelOCID(modelId: string): boolean {
	return /^ocid[0-9]+\.generativeaimodel\./i.test(modelId);
}

// When the catalog displayName is a friendly name rather than a provider-qualified
// model ID, use only mappings verified against OCI's documented inference model IDs.
const VERIFIED_OCI_PROVIDER_MODEL_IDS: Readonly<Record<string, string>> = {
	'meta:metallama3370b': 'meta.llama-3.3-70b-instruct',
	'meta:metallama3370binstruct': 'meta.llama-3.3-70b-instruct',
	'google:googlegemini25pro': 'google.gemini-2.5-pro',
	'openai:openaigptoss120b': 'openai.gpt-oss-120b',
	'xai:xaigrok43': 'xai.grok-4.3',
	'xai:grok43': 'xai.grok-4.3',
	'cohere:coherecommanda': 'cohere.command-a-03-2025',
};

function getVerifiedOciModelMappingKey(vendor: string, displayName: string): string {
	const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
	return `${normalize(vendor)}:${normalize(displayName)}`;
}

function getVerifiedOciProviderModelId(model: OciGenAiCatalogModel): string {
	const vendor = model.vendor?.trim();
	const displayName = model.displayName?.trim();
	if (!vendor || !displayName) {
		return '';
	}

	return VERIFIED_OCI_PROVIDER_MODEL_IDS[getVerifiedOciModelMappingKey(vendor, displayName)] ?? '';
}

function getProviderModelIdFromDisplayName(
	vendor: string | undefined,
	displayName: string | undefined,
): string {
	const normalizedVendor = vendor?.trim().toLowerCase();
	if (!normalizedVendor || !displayName) return '';

	try {
		const modelId = validateOciModelId(displayName);
		return modelId.toLowerCase().startsWith(`${normalizedVendor}.`) ? modelId : '';
	} catch {
		return '';
	}
}

export function getOnDemandModelId(model: OciGenAiCatalogModel): string {
	if (isOciModelOCID(model.id)) {
		return (
			getProviderModelIdFromDisplayName(model.vendor, model.displayName) ||
			getVerifiedOciProviderModelId(model)
		);
	}

	try {
		return validateOciModelId(model.id);
	} catch {
		return '';
	}
}

function normalizeOciModelCatalog(models: OciGenAiCatalogModel[]): OciGenAiSearchModel[] {
	// Normalize once when the cache is populated so typeahead only performs a substring check.
	return models
		.filter(isOnDemandModelAvailable)
		.flatMap((model): OciGenAiSearchModel[] => {
			const id = getOnDemandModelId(model);
			if (!id) return [];

			const name = model.displayName || id;
			return [{ id, name, searchText: `${name} ${id}`.toLowerCase() }];
		})
		.sort((first, second) => first.name.localeCompare(second.name));
}

export function getOnDemandEmbeddingModelFallbacks(
	regionId: string,
	filter?: string,
): OciGenAiOnDemandEmbeddingModel[] {
	const normalizedRegionId = regionId.trim().toLowerCase();
	const normalizedFilter = filter?.trim().toLowerCase() ?? '';

	return OCI_ON_DEMAND_EMBEDDING_MODEL_FALLBACKS.filter(
		(model) =>
			model.regions.includes(normalizedRegionId) &&
			(!normalizedFilter ||
				model.displayName.toLowerCase().includes(normalizedFilter) ||
				model.modelId.includes(normalizedFilter)),
	);
}

export function isOciGenAiCredentials(
	credentials: ICredentialDataDecryptedObject,
): credentials is ICredentialDataDecryptedObject & OciGenAiCredentials {
	return (
		(credentials.authentication === 'apiKey' ||
			credentials.authentication === 'instancePrincipal' ||
			credentials.authentication === 'resourcePrincipal' ||
			credentials.authentication === 'session') &&
		typeof credentials.regionId === 'string'
	);
}

function required(credentials: OciGenAiCredentials, name: keyof OciGenAiCredentials): string {
	const value = credentials[name];
	if (typeof value !== 'string' || value.trim() === '') {
		throw new UserError(`OCI Generative AI credential "${name}" is required`);
	}
	return value.trim();
}

function getOciSdkErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error !== 'object' || error === null) return String(error);

	const details = error as Record<string, unknown>;
	const message = typeof details.message === 'string' ? details.message : 'OCI request failed';
	const statusCode = details.statusCode ?? details.code;
	const serviceCode = details.serviceCode;
	const prefix = [statusCode, serviceCode].filter((value) => value !== undefined).join(' ');

	return prefix ? `${prefix}: ${message}` : message;
}

/** Converts OCI SDK plain-object rejections before LangChain discards their details. */
function normalizeOciSdkError(error: unknown): Error {
	if (error instanceof Error) return error;

	const normalizedError = new Error(getOciSdkErrorMessage(error), { cause: error });
	if (typeof error === 'object' && error !== null) {
		Object.assign(normalizedError, error);
	}
	return normalizedError;
}

function normalizeOciSdkMethodErrors<T extends object>(
	client: T,
	methods: readonly PropertyKey[],
): T {
	return new Proxy(client, {
		get(target, property, receiver) {
			const value = Reflect.get(target, property, receiver);
			if (!methods.includes(property) || typeof value !== 'function') return value;

			return async (...args: unknown[]) => {
				try {
					return await Reflect.apply(value, target, args);
				} catch (error) {
					throw normalizeOciSdkError(error);
				}
			};
		},
	});
}

function sanitizePrivateKey(rawKey: string): string {
	let key = rawKey.trim();
	// Credentials pasted as JSON commonly preserve line breaks as literal escape sequences.
	if (key.includes('\\n')) {
		key = key.replace(/\\n/g, '\n');
	}
	return key;
}

async function getAuthenticationDetailsProvider(
	credentials: OciGenAiCredentials,
): Promise<common.AuthenticationDetailsProvider> {
	const { common } = await loadOciSdk();

	switch (credentials.authentication) {
		case 'apiKey': {
			const { Region, SimpleAuthenticationDetailsProvider } = common;
			const privateKey = sanitizePrivateKey(required(credentials, 'privateKey'));
			return new SimpleAuthenticationDetailsProvider(
				required(credentials, 'tenancyId'),
				required(credentials, 'userId'),
				required(credentials, 'fingerprint'),
				privateKey,
				credentials.passphrase || null,
				Region.fromRegionId(required(credentials, 'regionId')),
			);
		}
		case 'instancePrincipal': {
			const { InstancePrincipalsAuthenticationDetailsProviderBuilder } = common;
			return await new InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
		}
		case 'resourcePrincipal': {
			const { ResourcePrincipalAuthenticationDetailsProvider } = common;
			return ResourcePrincipalAuthenticationDetailsProvider.builder();
		}
		case 'session': {
			const { ConfigFileAuthenticationDetailsProvider } = common;
			return new ConfigFileAuthenticationDetailsProvider(
				required(credentials, 'configFilePath'),
				required(credentials, 'configProfile'),
			);
		}
		default:
			throw new UserError(
				`Unsupported OCI authentication method: ${String(credentials.authentication)}`,
			);
	}
}

// Keep construction separate so the cache can share initialization across model wrappers.
async function createOciGenAiClientInternal(
	credentials: OciGenAiCredentials,
	egressFilter?: NodeEgressFilter,
	requestTimeout?: number,
): Promise<genaiInference.GenerativeAiInferenceClient> {
	const [authenticationDetailsProvider, serviceEndpoint, { genaiInference }] = await Promise.all([
		getAuthenticationDetailsProvider(credentials),
		validateOciEndpoint(credentials.serviceEndpoint, credentials.regionId),
		loadOciSdk(),
	]);
	const { GenerativeAiInferenceClient } = genaiInference;
	const httpClient = await createOciEgressHttpClient(
		authenticationDetailsProvider,
		egressFilter,
		requestTimeout,
	);
	const client = new GenerativeAiInferenceClient(
		httpClient === undefined ? { authenticationDetailsProvider } : { httpClient },
		await getOciInferenceClientConfiguration(requestTimeout),
	);

	// Use the same region-id setup path as @oracle/langchain-oci.
	client.regionId = required(credentials, 'regionId');
	if (serviceEndpoint) {
		client.endpoint = serviceEndpoint;
	}

	return normalizeOciSdkMethodErrors(client, ['chat', 'embedText']);
}

// Cache only non-secret identity and routing settings; model and compartment are request-specific.
async function getInferenceClientCacheKey(
	credentials: OciGenAiCredentials,
	egressFilter: NodeEgressFilter | undefined,
	requestTimeout?: number,
): Promise<string> {
	// Private key and passphrase stay out of cache keys. The fingerprint identifies
	// the OCI signing key, so key rotation invalidates the cached client. Passphrase-only
	// changes take effect after the cache entry expires.
	const authenticationIdentity = getOciAuthenticationIdentity(credentials);
	const endpoint =
		(await validateOciEndpoint(credentials.serviceEndpoint, credentials.regionId)) ?? '';

	return JSON.stringify([
		authenticationIdentity,
		credentials.regionId.trim().toLowerCase(),
		endpoint,
		getEgressFilterCacheIdentity(egressFilter),
		requestTimeout,
	]);
}

/**
 * Keeps clients with different policy-bound transports out of the same cache entry.
 * n8n supplies stable, instance-owned filter objects, so this retains cache reuse
 * without allowing a client created for one egress policy to serve another.
 */
function getEgressFilterCacheIdentity(
	egressFilter: NodeEgressFilter | undefined,
): number | undefined {
	if (egressFilter === undefined) return undefined;

	let identity = egressFilterCacheIds.get(egressFilter);
	if (identity === undefined) {
		identity = nextEgressFilterCacheId++;
		egressFilterCacheIds.set(egressFilter, identity);
	}

	return identity;
}

// Agent tool calls rebuild LangChain wrappers, so reuse OCI client initialization across wrappers.
async function getCachedOciGenAiClient(
	credentials: OciGenAiCredentials,
	egressFilter?: NodeEgressFilter,
	requestTimeout?: number,
): Promise<genaiInference.GenerativeAiInferenceClient> {
	const now = Date.now();
	const key = await getInferenceClientCacheKey(credentials, egressFilter, requestTimeout);
	const cachedClient = inferenceClientCache.get(key);
	if (cachedClient) {
		if (cachedClient.expiresAt > now) {
			// Move a cache hit to the end so bounded eviction retains recently used clients.
			inferenceClientCache.delete(key);
			inferenceClientCache.set(key, cachedClient);
			return cachedClient.client;
		}

		// Existing workflows can still hold the expired client, so only remove the cache reference.
		inferenceClientCache.delete(key);
	}

	let request = inferenceClientInFlight.get(key);
	if (!request) {
		request = createOciGenAiClientInternal(credentials, egressFilter, requestTimeout);
		inferenceClientInFlight.set(key, request);

		void request
			.then((client) => {
				if (inferenceClientInFlight.get(key) !== request) return;

				inferenceClientCache.delete(key);
				if (inferenceClientCache.size >= MAX_INFERENCE_CLIENT_CACHE_ENTRIES) {
					const oldestEntry = inferenceClientCache.keys().next();
					if (!oldestEntry.done) {
						inferenceClientCache.delete(oldestEntry.value);
					}
				}

				inferenceClientCache.set(key, {
					client,
					expiresAt: Date.now() + OCI_INFERENCE_CLIENT_CACHE_TTL_MS,
				});
			})
			.catch(() => {
				// Failed initialization is not retained in either cache.
			})
			.finally(() => {
				if (inferenceClientInFlight.get(key) === request) {
					inferenceClientInFlight.delete(key);
				}
			});
	}

	return await request;
}

function usesExternalPrincipalAuthentication(credentials: OciGenAiCredentials): boolean {
	return (
		credentials.authentication === 'instancePrincipal' ||
		credentials.authentication === 'resourcePrincipal'
	);
}

// Preserve the shared client factory used by both OCI Chat and Embeddings nodes.
export async function createOciGenAiClient(
	credentials: OciGenAiCredentials,
	egressFilter?: NodeEgressFilter,
	requestTimeout?: number,
): Promise<genaiInference.GenerativeAiInferenceClient> {
	// Principal identity comes from the runtime environment and is not represented in credential data.
	// Do not reuse a client when its cache key cannot identify that external identity.
	if (usesExternalPrincipalAuthentication(credentials)) {
		return await createOciGenAiClientInternal(credentials, egressFilter, requestTimeout);
	}

	return await getCachedOciGenAiClient(credentials, egressFilter, requestTimeout);
}

// Reset module-level caches so unit tests do not depend on execution order.
export function clearOciGenAiCachesForTesting(): void {
	inferenceClientCache.clear();
	inferenceClientInFlight.clear();
	modelCatalogCache.clear();
	egressFilterCacheIds = new WeakMap<NodeEgressFilter, number>();
	nextEgressFilterCacheId = 1;
	ociSdkPromise = undefined;
}

export async function createOciGenAiModelClient(
	credentials: OciGenAiCredentials,
	egressFilter?: NodeEgressFilter,
): Promise<genai.GenerativeAiClient> {
	const [authenticationDetailsProvider, endpoint, { genai }] = await Promise.all([
		getAuthenticationDetailsProvider(credentials),
		getOciManagementEndpoint(credentials.regionId),
		loadOciSdk(),
	]);
	const { GenerativeAiClient } = genai;
	const httpClient = await createOciEgressHttpClient(authenticationDetailsProvider, egressFilter);
	const client = new GenerativeAiClient(
		httpClient === undefined ? { authenticationDetailsProvider } : { httpClient },
		await getOciModelCatalogClientConfiguration(),
	);

	client.regionId = required(credentials, 'regionId');
	client.endpoint = endpoint;

	return normalizeOciSdkMethodErrors(client, ['listModels']);
}

// Both OCI caches need the same non-secret identity boundary.
function getOciAuthenticationIdentity(credentials: OciGenAiCredentials): string {
	switch (credentials.authentication) {
		case 'apiKey':
			return JSON.stringify(
				[
					credentials.authentication,
					credentials.tenancyId,
					credentials.userId,
					credentials.fingerprint,
				].map((value) => value?.trim() ?? ''),
			);
		case 'session':
			return JSON.stringify(
				[credentials.authentication, credentials.configFilePath, credentials.configProfile].map(
					(value) => value?.trim() ?? '',
				),
			);
		default:
			return credentials.authentication;
	}
}

// Expire catalog entries so dropdown data stays current without unbounded retention.
function evictExpiredModelCatalogs(now: number): void {
	for (const [key, catalog] of modelCatalogCache) {
		if (catalog.expiresAt <= now) {
			modelCatalogCache.delete(key);
		}
	}
}

// Share a short-lived catalog across typeahead requests for the same OCI scope.
function getModelCatalogCache(key: string, now: number): CachedModelCatalog {
	evictExpiredModelCatalogs(now);

	const cachedCatalog = modelCatalogCache.get(key);
	if (cachedCatalog) {
		return cachedCatalog;
	}

	if (modelCatalogCache.size >= MAX_MODEL_CATALOG_CACHE_ENTRIES) {
		// Keep memory bounded with insertion-order eviction; the short TTL makes LRU unnecessary.
		const oldestEntry = modelCatalogCache.keys().next();
		if (!oldestEntry.done) {
			modelCatalogCache.delete(oldestEntry.value);
		}
	}

	const catalog = {
		expiresAt: now + MODEL_CATALOG_CACHE_TTL_MS,
		pages: new Map(),
	};
	modelCatalogCache.set(key, catalog);
	return catalog;
}

/** Bounds how long a catalog caller waits so a stalled SDK call cannot retain a cached page. */
async function getOciModelCatalogResponse<T>(request: Promise<T>): Promise<T> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => {
			reject(new OperationalError('OCI model catalog request timed out'));
		}, OCI_MODEL_CATALOG_REQUEST_TIMEOUT_MS);
	});

	try {
		return await Promise.race([request, timeoutPromise]);
	} finally {
		if (timeout !== undefined) {
			clearTimeout(timeout);
		}
	}
}

// Cache model pages because searchable selectors call this once per typed character.
export async function getCachedOciGenAiModelCatalogPage(
	credentials: OciGenAiCredentials,
	{
		compartmentId,
		capability,
		vendor,
		paginationToken,
		modelId,
	}: {
		compartmentId: string;
		capability: genai.models.ModelCapability;
		vendor?: string;
		paginationToken?: string;
		modelId?: string;
	},
	egressFilter?: NodeEgressFilter,
): Promise<OciGenAiModelCatalogPage> {
	const normalizedVendor = validateOciVendor(vendor) ?? '';
	const exactModelId = modelId === undefined ? undefined : validateOciModelId(modelId);
	const cacheKey = JSON.stringify([
		getOciAuthenticationIdentity(credentials),
		credentials.regionId.trim().toLowerCase(),
		compartmentId,
		normalizedVendor,
		capability,
		// Catalog results are scoped to the same egress policy as the request that fetched them.
		getEgressFilterCacheIdentity(egressFilter),
	]);
	const cachedCatalog = getModelCatalogCache(cacheKey, Date.now());
	const pageKey = exactModelId === undefined ? (paginationToken ?? '') : `id:${exactModelId}`;
	const cachedPage = cachedCatalog.pages.get(pageKey);
	if (cachedPage) {
		// Reuse the promise too, preventing concurrent keystrokes from duplicating OCI requests.
		return await cachedPage;
	}

	if (cachedCatalog.pages.size >= MAX_MODEL_CATALOG_PAGES_PER_ENTRY) {
		// Page tokens are also evicted in insertion order to bound a single catalog entry.
		const oldestPage = cachedCatalog.pages.keys().next();
		if (!oldestPage.done) {
			cachedCatalog.pages.delete(oldestPage.value);
		}
	}

	const page = createOciGenAiModelClient(credentials, egressFilter)
		.then(async (client) => {
			const request = {
				compartmentId,
				capability: [capability],
				...(normalizedVendor ? { vendor: normalizedVendor } : {}),
				...(exactModelId === undefined
					? { limit: 100, ...(paginationToken ? { page: paginationToken } : {}) }
					: { id: exactModelId, limit: 1 }),
			};
			let response = await getOciModelCatalogResponse(client.listModels(request));
			let models = response.modelCollection.items ?? [];

			// OCI catalog IDs can be management OCIDs while the selector exposes provider IDs.
			// For a typed provider ID, retry its exact displayName form before falling back to typeahead.
			if (exactModelId !== undefined && models.length === 0 && !isOciModelOCID(exactModelId)) {
				response = await getOciModelCatalogResponse(
					client.listModels({
						...request,
						id: undefined,
						displayName: exactModelId,
					}),
				);
				models = response.modelCollection.items ?? [];
			}

			return {
				models,
				searchModels: normalizeOciModelCatalog(models),
				nextPage: exactModelId === undefined ? response.opcNextPage : undefined,
			};
		})
		.catch((error: unknown) => {
			cachedCatalog.pages.delete(pageKey);
			throw error;
		});

	cachedCatalog.pages.set(pageKey, page);
	return await page;
}
