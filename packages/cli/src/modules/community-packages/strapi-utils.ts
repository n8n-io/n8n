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

const REQUEST_TIMEOUT_MS = 3000;

export async function paginatedRequest<T>(url: string, qs: IDataObject = {}): Promise<T[]> {
	let returnData: T[] = [];
	let responseData: T[] | undefined = [];

	const params = {
		...qs,
		pagination: {
			page: 1,
			pageSize: 25,
		},
	};

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
			break;
		}

		responseData = response?.data?.data?.map((item) => item.attributes);

		if (!responseData?.length) break;

		returnData = returnData.concat(responseData);

		if (response?.data?.meta?.pagination) {
			const { page, pageCount } = response?.data.meta.pagination;

			if (page === pageCount) {
				break;
			}
		}

		params.pagination.page++;
	} while (responseData?.length);

	return returnData;
}

export async function metadataRequest<T>(url: string): Promise<T[]> {
	let response;

	const params = {
		fields: ['npmVersion', 'name'],
		pagination: {
			pageSize: 1000,
		},
	};

	try {
		response = await axios.get<ResponseData<T>>(url, {
			headers: { 'Content-Type': 'application/json' },
			params,
			timeout: REQUEST_TIMEOUT_MS,
		});
	} catch (error) {
		Container.get(ErrorReporter).error(error, {
			tags: { source: 'communityNodesMetadataRequest' },
		});
		Container.get(Logger).error(
			`Error while fetching community nodes metadata: ${(error as Error).message}`,
		);
	}

	const responseData: T[] =
		response?.data?.data?.map((item) => ({ id: item.id, ...item.attributes })) || [];

	return responseData;
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
