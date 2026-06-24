import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';

interface ResponseData<T> {
	data: Array<StrapiEntity<T>>;
	meta: Meta;
}

interface Meta {
	pagination: Pagination;
}

/**
 * A single entity as returned by the n8n Strapi API.
 *
 * Strapi v4 (and Strapi v5 with the v4 response-compatibility header) nests an
 * entity's fields under `attributes`. Strapi v5's native response drops that
 * wrapper and places the fields directly on the entity, alongside `id` and the
 * new `documentId`. We accept both shapes so the client keeps working as the
 * upstream API migrates from v4 to v5.
 */
export type StrapiEntity<T> =
	| { id: number; documentId?: string; attributes: T }
	| ({ id: number; documentId?: string } & T);

interface Pagination {
	page: number;
	pageSize: number;
	pageCount: number;
	total: number;
}

export interface PaginationRequestOptions {
	throwOnError?: boolean;
}

export type StrapiFilters = { [key: string]: { ['$eq']?: string; ['$in']?: string[] } };

type PaginationRequestParams = {
	filters?: StrapiFilters;
	fields?: string[];
	pagination: {
		page: number;
		pageSize: number;
	};
	maxAiNodeSdk?: number;
};

const REQUEST_TIMEOUT_MS = 6000;

function isV4WrappedEntity<T>(
	item: StrapiEntity<T>,
): item is { id: number; documentId?: string; attributes: T } {
	return 'attributes' in item && item.attributes !== null && typeof item.attributes === 'object';
}

/**
 * Flattens a Strapi entity to a flat `id` + fields object, regardless of
 * whether the response used the v4 (`attributes`-wrapped) or v5 (flattened)
 * schema. The v5-only `documentId` is dropped so the result is identical for
 * both schemas.
 */
function flattenStrapiEntity<T>(item: StrapiEntity<T>): T & { id: number } {
	if (isV4WrappedEntity(item)) {
		return { id: item.id, ...item.attributes };
	}

	const flattened = { ...item };
	delete flattened.documentId;
	return flattened;
}

export async function paginatedRequest<T>(
	url: string,
	params: PaginationRequestParams,
	options?: PaginationRequestOptions,
): Promise<T[]> {
	let returnData: T[] = [];
	let responseData: T[] | undefined = [];

	do {
		let response: ResponseData<T> | undefined;
		try {
			const body = await Container.get(OutboundHttp)
				.requests({
					ssrf: 'disabled', // n8n-controlled templates/Strapi host
				})
				.request({
					url,
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
					qs: params,
					json: true,
					timeout: REQUEST_TIMEOUT_MS,
				});
			response = body as unknown as ResponseData<T>;
		} catch (error) {
			Container.get(ErrorReporter).error(error, {
				tags: { source: 'strapiPaginatedRequest' },
			});
			Container.get(Logger).error(
				`Error fetching from Strapi API (${url}): ${(error as Error).message}`,
			);
			if (options?.throwOnError) throw error;

			break;
		}

		responseData = response?.data?.map(flattenStrapiEntity);

		if (!responseData?.length) break;

		returnData = returnData.concat(responseData);

		if (response?.meta?.pagination) {
			const { page, pageCount } = response.meta.pagination;

			if (page === pageCount) break;
		}

		params.pagination.page++;
	} while (responseData?.length);

	return returnData;
}

export function buildStrapiUpdateQuery(ids: number[]): IDataObject {
	return {
		filters: {
			id: {
				$in: ids,
			},
		},
	};
}
