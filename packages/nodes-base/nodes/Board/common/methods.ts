import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

import { BOARD_ID_FIELD } from './fields';
import { resolveBoardId } from './utils';

export async function boardSearch(
	this: ILoadOptionsFunctions,
	filterString?: string,
): Promise<INodeListSearchResult> {
	if (this.helpers.getBoardProxy === undefined) {
		return { results: [] };
	}

	const proxy = await this.helpers.getBoardProxy('');
	const response = await proxy.listBoards();

	let results = response.data.map((board) => ({
		name: board.name,
		value: board.id,
	}));

	if (filterString) {
		const lower = filterString.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(lower));
	}

	return { results };
}

export async function getBoardStatuses(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	if (this.helpers.getBoardProxy === undefined) {
		return [];
	}

	const resourceLocator = this.getNodeParameter(BOARD_ID_FIELD) as {
		mode: 'list' | 'id' | 'name';
		value: string;
	};

	if (!resourceLocator?.value) {
		return [];
	}

	const boardId = await resolveBoardId(this, resourceLocator);
	const proxy = await this.helpers.getBoardProxy(boardId);
	const statuses = await proxy.getStatuses();

	return statuses.map((status) => ({
		name: status,
		value: status,
	}));
}
