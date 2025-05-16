import type { CommunityNodeData } from '@n8n/api-types';
import { Container } from '@n8n/di';
import axios from 'axios';
import { ErrorReporter, Logger } from 'n8n-core';

interface ResponseData {
	data: CommunityNodeData[];
	meta: Meta;
}

interface Meta {
	pagination: Pagination;
}

interface Pagination {
	page: number;
	pageSize: number;
	pageCount: number;
	total: number;
}

export async function paginatedRequest(url: string): Promise<CommunityNodeData[]> {
	let returnData: CommunityNodeData[] = [];
	let responseData: CommunityNodeData[] | undefined = [];

	const params = {
		pagination: {
			page: 1,
			pageSize: 25,
		},
	};

	do {
		let response;
		try {
			response = await axios.get<ResponseData>(url, {
				headers: { 'Content-Type': 'application/json' },
				params,
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

		responseData = response?.data?.data;

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
