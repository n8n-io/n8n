import { OperationalError, UserError } from '@n8n/errors';
import type { FilterValue, GeoRangeFilter, TimeoutParams, WeaviateClient } from 'weaviate-client';
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
type WeaviateFilterUnit = {
	path: string[];
	operator: string;
	valueString?: string;
	valueTextArray?: string[];
	valueBoolean?: boolean;
	valueNumber?: number;
	valueGeoCoordinates?: GeoRangeFilter;
};

type WeaviateFilter = WeaviateFilterUnit | WeaviateCompositeFilter;

export type WeaviateCompositeFilter =
	| { AND: WeaviateFilter[] }
	| { OR: WeaviateFilter[] }
	| { NOT: WeaviateFilter };

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

export function parseCompositeFilter(filter: WeaviateFilter): FilterValue {
	// AND, OR and NOT can contain other groups, so parse their members recursively
	if ('AND' in filter) {
		if (!Array.isArray(filter.AND)) {
			throw new UserError("'AND' must contain an array of filters.");
		}
		return Filters.and(...filter.AND.map(parseCompositeFilter));
	}
	if ('OR' in filter) {
		if (!Array.isArray(filter.OR)) {
			throw new UserError("'OR' must contain an array of filters.");
		}
		return Filters.or(...filter.OR.map(parseCompositeFilter));
	}
	if ('NOT' in filter) {
		if (typeof filter.NOT !== 'object' || filter.NOT === null || Array.isArray(filter.NOT)) {
			throw new UserError("'NOT' must contain exactly one filter.");
		}
		return Filters.not(parseCompositeFilter(filter.NOT));
	}

	return buildFilter(filter);
}
