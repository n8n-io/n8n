import { OperationalError } from 'n8n-workflow';
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
