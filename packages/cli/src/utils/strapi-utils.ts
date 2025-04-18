import axios from 'axios';
import type { CommunityNodeAttributes, INodeTypeDescription } from 'n8n-workflow';

interface StrapiResponseData {
	data: StrapiData[];
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

export interface StrapiData {
	id: number;
	attributes: CommunityNodeAttributes & {
		nodeDescription: INodeTypeDescription;
	};
}

export async function strapiPaginatedRequest(url: string): Promise<StrapiData[]> {
	let returnData: StrapiData[] = [];
	let responseData: StrapiData[] | undefined = [];

	const params = {
		pagination: {
			page: 1,
			pageSize: 25,
		},
	};

	do {
		let response;
		try {
			response = await axios.get<StrapiResponseData>(url, {
				headers: { 'Content-Type': 'application/json' },
				params,
			});
		} catch (error) {}

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
