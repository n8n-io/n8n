import type {
	DataObject,
	FilterValue,
	GeoRangeFilter,
	TimeoutParams,
	WeaviateClient,
} from 'weaviate-client';
import { OperationalError, UserError } from '@n8n/errors';
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
	custom_connection_grpc_proxy?: string;
};

function getGrpcProxy(credentials: WeaviateCredential, nodeOptionProxy?: string) {
	const credentialProxy = credentials.custom_connection_grpc_proxy;
	const proxy = credentialProxy || nodeOptionProxy;
	if (!proxy) return undefined;

	if (
		!credentialProxy &&
		credentials.weaviate_api_key &&
		!credentials.custom_connection_grpc_secure
	) {
		throw new UserError('The gRPC proxy option needs a secure gRPC connection', {
			description:
				'Set the gRPC proxy in the Weaviate credential, or turn on "Custom Connection gRPC Secure" in the credential.',
		});
	}

	if (!URL.canParse(proxy) || new URL(proxy).protocol !== 'http:') {
		throw new UserError('The gRPC proxy must be an http:// URL');
	}

	return proxy;
}

export async function createWeaviateClient(
	credentials: WeaviateCredential,
	timeout?: TimeoutParams,
	nodeOptionProxy?: string,
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
		return weaviateClient;
	} else {
		const grpcProxy = getGrpcProxy(credentials, nodeOptionProxy);
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
			proxies: grpcProxy ? { grpc: grpcProxy } : undefined,
			skipInitChecks,
		});
		return weaviateClient;
	}
}
/** Weaviate added server-side batching in v1.36.0 */
export async function supportsServerSideBatching(client: WeaviateClient): Promise<boolean> {
	try {
		return (await client.getWeaviateVersion()).isAtLeast(1, 36, 0);
	} catch {
		return false;
	}
}

export type WeaviateInsertObject = DataObject<undefined> & { id: string };

/**
 * Inserts the objects through server-side batching. Weaviate controls the batch
 * size, so the client sends at the rate that the server can accept.
 * Returns the IDs of the objects in the input order.
 */
export async function insertWithServerSideBatching(
	client: WeaviateClient,
	collectionName: string,
	tenant: string | undefined,
	objects: WeaviateInsertObject[],
): Promise<string[]> {
	const collection = client.collections.get(collectionName);
	const data = tenant ? collection.withTenant(tenant).data : collection.data;
	const result = await data.ingest(objects);

	const errors = Object.values(result.errors);
	if (errors.length > 0) {
		throw new UserError(
			`Weaviate did not insert ${errors.length} of ${objects.length} objects: ${errors[0].message}`,
		);
	}
	return objects.map(({ id }) => id);
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
