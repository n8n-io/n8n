import { readFileSync } from 'fs';
import { jsonParse, OperationalError } from 'n8n-workflow';
import { join, resolve } from 'path';
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

/**
 * Resolves the running n8n version, used as the integration version reported to
 * Weaviate. Mirrors the helper used by the Airtop node: prefer the
 * `N8N_VERSION` env var (set at runtime) and fall back to the package version.
 */
export function getN8nVersion(): string {
	if (process.env.N8N_VERSION) {
		return process.env.N8N_VERSION;
	}

	try {
		const packageJsonPath = join(resolve(__dirname, '../../../'), 'package.json');
		const packageJson = jsonParse<{ version: string }>(readFileSync(packageJsonPath, 'utf8'));
		return packageJson.version;
	} catch {
		return '0.0.0';
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
			headers[INTEGRATION_HEADER] = `${INTEGRATION_NAME}/${getN8nVersion()}`;
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
