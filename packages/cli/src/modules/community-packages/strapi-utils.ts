import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import axios from 'axios';
import { ErrorReporter } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';

interface ResponseData<T> {
	data: Array<Entity<T>>;
	meta: Meta;
}

interface Meta {
	pagination: Pagination;
}

export interface Entity<T> {
	id: number;
	attributes: T;
}

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

interface PaginationRequestParams {
	filters?: StrapiFilters;
	fields?: string[];
	pagination: {
		page: number;
		pageSize: number;
	};
}

const REQUEST_TIMEOUT_MS = 6000;

export async function paginatedRequest<T>(
	url: string,
	params: PaginationRequestParams,
	options?: PaginationRequestOptions,
): Promise<T[]> {
	let returnData: T[] = [];
	let responseData: T[] | undefined = [];

	do {
		let response;
		try {
			response = await axios.get<ResponseData<T>>(url, {
				headers: { 'Content-Type': 'application/json' },
				params,
				timeout: REQUEST_TIMEOUT_MS,
			});
		} catch (error) {
			Container.get(ErrorReporter).error(error, {
				tags: { source: 'communityNodesPaginatedRequest' },
			});
			Container.get(Logger).error(
				`Error while fetching community nodes: ${(error as Error).message}`,
			);
			if (options?.throwOnError) throw error;

			break;
		}

		responseData = response?.data?.data?.map((item) => ({ id: item.id, ...item.attributes }));

		if (!responseData?.length) break;

		returnData = returnData.concat(responseData);

		if (response?.data?.meta?.pagination) {
			const { page, pageCount } = response?.data.meta.pagination;

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
