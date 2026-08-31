import { jsonParse, OperationalError } from 'n8n-workflow';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
	FilterValue,
	GeoRangeFilter,
	ProxiesParams,
	TimeoutParams,
	WeaviateClient,
} from 'weaviate-client';
import weaviate, { Filters } from 'weaviate-client';

export type WeaviateCredential = {
	weaviate_cloud_endpoint: string;
	weaviate_api_key: string;
	custom_connection_http_host: string;
	custom_connection_http_port: number;
	custom_connection_http_secure: boolean;
	custom_connection_grpc_host: string;
	custom_connection_grpc_port: number;
	custom_connection_grpc_secure: boolean;
};

/**
 * Integration identifier reported to Weaviate telemetry, so Weaviate can track
 * usage originating from the n8n LangChain nodes.
 */
const INTEGRATION_NAME = 'n8n-langchain';

/**
 * Telemetry header that tags the connection so Weaviate can track integration
 * usage across both the HTTP and gRPC transports.
 */
const INTEGRATION_HEADER = 'X-Weaviate-Client-Integration';

/** Errors that mean "nothing here", so the walk should continue upwards. */
const MISSING_PATH_CODES = new Set(['ENOENT', 'ENOTDIR']);

/**
 * Filesystem errors worth retrying. Everything else — a missing or malformed
 * `package.json` — is a permanent property of the installation, so its failure
 * is cached rather than re-walked on every client creation.
 */
const TRANSIENT_FS_CODES = new Set(['EMFILE', 'ENFILE', 'EAGAIN', 'EBUSY', 'EIO']);

/**
 * Resolves the `@n8n/n8n-nodes-langchain` package version by walking up from
 * this module to the nearest `package.json`. The walk keeps this robust to the
 * differing directory depth between the compiled (`dist/nodes/...`) and
 * source/test (`nodes/...`) layouts.
 *
 * A direct `package.json` import is not an option: the build config
 * (`@n8n/typescript-config/modern/tsconfig.cjs.go.json`) sets
 * `resolveJsonModule: false`.
 *
 * Only "path does not exist" errors continue the walk — a `package.json` that
 * exists but cannot be read or parsed is a real problem, and must not silently
 * resolve some other package's version further up the tree.
 */
async function resolveIntegrationVersion(): Promise<string> {
	let dir = __dirname;
	while (true) {
		try {
			const contents = await readFile(join(dir, 'package.json'), 'utf8');
			const { version } = jsonParse<{ version?: string }>(contents);
			// A package.json without a version is not the one we are looking for;
			// returning it would tag requests with `n8n-langchain/undefined`.
			if (version) return version;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === undefined || !MISSING_PATH_CODES.has(code)) throw error;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new OperationalError('Could not resolve the n8n-nodes-langchain package version');
}

let cachedIntegrationVersion: Promise<string> | undefined;

/**
 * The version reported alongside {@link INTEGRATION_NAME} to Weaviate
 * telemetry. This is the version of the integration itself — the
 * nodes-langchain package — which is the value the `n8n-langchain/<version>`
 * header is meant to carry.
 *
 * The in-flight promise is memoized rather than the resolved value, so that
 * concurrent first calls share a single filesystem read.
 *
 * A rejection is cached too, since a missing or malformed `package.json` is a
 * permanent property of the installation and re-walking it on every client
 * creation would just repeat the same failure. Only transient filesystem
 * errors evict the cache, so a passing resource blip does not disable
 * telemetry for the lifetime of the process.
 */
export async function getIntegrationVersion(): Promise<string> {
	cachedIntegrationVersion ??= resolveIntegrationVersion();
	const pending = cachedIntegrationVersion;
	try {
		return await pending;
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		// Identity-guarded, so a retry already started by another caller is kept.
		if (code !== undefined && TRANSIENT_FS_CODES.has(code) && cachedIntegrationVersion === pending) {
			cachedIntegrationVersion = undefined;
		}
		throw error;
	}
}

/**
 * Best-effort registration of the {@link INTEGRATION_HEADER} on a Weaviate
 * client. Never throws.
 *
 * The JS `weaviate-client` exposes no public `integrations.configure(...)` API
 * (unlike the Python client). However, `getConnectionDetails()` returns the
 * client's live `headers` object by reference, and the client spreads that same
 * object into every HTTP and gRPC request. Mutating it therefore tags all
 * subsequent requests with `X-Weaviate-Client-Integration: n8n-langchain/<version>`
 * without depending on any private internals. If a future client version
 * changes shape, registration is silently skipped instead of breaking the node.
 */
export async function registerIntegrationHeader(client: WeaviateClient): Promise<void> {
	try {
		const { headers } = await client.getConnectionDetails();
		// The client only spreads object-form headers into requests, so only the
		// `Record<string, string>` form can be augmented in place.
		if (headers && !Array.isArray(headers)) {
			headers[INTEGRATION_HEADER] = `${INTEGRATION_NAME}/${await getIntegrationVersion()}`;
		}
	} catch {
		// Best-effort telemetry: never let header registration break the node.
	}
}

export async function createWeaviateClient(
	credentials: WeaviateCredential,
	timeout?: TimeoutParams,
	proxies?: ProxiesParams,
	skipInitChecks: boolean = false,
): Promise<WeaviateClient> {
	if (credentials.weaviate_cloud_endpoint) {
		const weaviateClient: WeaviateClient = await weaviate.connectToWeaviateCloud(
			credentials.weaviate_cloud_endpoint,
			{
				authCredentials: new weaviate.ApiKey(credentials.weaviate_api_key),
				timeout,
				skipInitChecks,
			},
		);
		await registerIntegrationHeader(weaviateClient);
		return weaviateClient;
	} else {
		const weaviateClient: WeaviateClient = await weaviate.connectToCustom({
			httpHost: credentials.custom_connection_http_host,
			httpPort: credentials.custom_connection_http_port,
			grpcHost: credentials.custom_connection_grpc_host,
			grpcPort: credentials.custom_connection_grpc_port,
			grpcSecure: credentials.custom_connection_grpc_secure,
			httpSecure: credentials.custom_connection_http_secure,
			authCredentials: credentials.weaviate_api_key
				? new weaviate.ApiKey(credentials.weaviate_api_key)
				: undefined,
			timeout,
			proxies,
			skipInitChecks,
		});
		await registerIntegrationHeader(weaviateClient);
		return weaviateClient;
	}
}
type WeaviateFilterUnit = {
	path: string[];
	operator: string;
	valueString?: string;
	valueTextArray?: string[];
	valueBoolean?: boolean;
	valueNumber?: number;
	valueGeoCoordinates?: GeoRangeFilter;
};

export type WeaviateCompositeFilter = { AND: WeaviateFilterUnit[] } | { OR: WeaviateFilterUnit[] };

function buildFilter(filter: WeaviateFilterUnit): FilterValue {
	const { path, operator } = filter;
	const property = weaviate.filter.byProperty(path[0]);

	switch (operator.toLowerCase()) {
		case 'equal':
			if (filter.valueString !== undefined) return property.equal(filter.valueString);
			if (filter.valueNumber !== undefined) return property.equal(filter.valueNumber);
			break;

		case 'like':
			if (filter.valueString === undefined) {
				throw new OperationalError("Missing 'valueString' for 'like' operator.");
			}
			return property.like(filter.valueString);

		case 'containsany':
			if (filter.valueTextArray === undefined) {
				throw new OperationalError("Missing 'valueTextArray' for 'containsAny' operator.");
			}
			return property.containsAny(filter.valueTextArray);

		case 'containsall':
			if (filter.valueTextArray === undefined) {
				throw new OperationalError("Missing 'valueTextArray' for 'containsAll' operator.");
			}
			return property.containsAll(filter.valueTextArray);

		case 'greaterthan':
			if (filter.valueNumber === undefined) {
				throw new OperationalError("Missing 'valueNumber' for 'greaterThan' operator.");
			}
			return property.greaterThan(filter.valueNumber);

		case 'lessthan':
			if (filter.valueNumber === undefined) {
				throw new OperationalError("Missing 'valueNumber' for 'lessThan' operator.");
			}
			return property.lessThan(filter.valueNumber);

		case 'isnull':
			if (filter.valueBoolean === undefined) {
				throw new OperationalError("Missing 'valueBoolean' for 'isNull' operator.");
			}
			return property.isNull(filter.valueBoolean);

		case 'withingeorange':
			if (!filter.valueGeoCoordinates) {
				throw new OperationalError("Missing 'valueGeoCoordinates' for 'withinGeoRange' operator.");
			}
			return property.withinGeoRange(filter.valueGeoCoordinates);

		default:
			throw new OperationalError(`Unsupported operator: ${operator}`);
	}

	throw new OperationalError(`No valid filter value provided for operator: ${operator}`);
}

export function parseCompositeFilter(
	filter: WeaviateCompositeFilter | WeaviateFilterUnit,
): FilterValue {
	// Handle composite filters (AND/OR)
	if (typeof filter === 'object' && ('AND' in filter || 'OR' in filter)) {
		if ('AND' in filter) {
			return Filters.and(...filter.AND.map(buildFilter));
		} else if ('OR' in filter) {
			return Filters.or(...filter.OR.map(buildFilter));
		}
	}

	// Handle individual filter units
	return buildFilter(filter);
}
