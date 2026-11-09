import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../GenericFunctions';
import type { CalApiResponse, CalEventType, CalSchedule } from '../helpers/interfaces';

function filtered(items: INodeListSearchItems[], filter?: string): INodeListSearchResult {
	const term = (filter ?? '').trim().toLowerCase();
	const results =
		term === '' ? items : items.filter((item) => item.name.toLowerCase().includes(term));

	results.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	return { results };
}

export async function searchEventTypes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await (calApiRequestV2Versioned<CalApiResponse<CalEventType[]>>).call(
		this,
		'GET',
		'/event-types',
		CAL_API_VERSION.EVENT_TYPES,
	);

	const items = (response.data ?? []).map(({ id, title }) => ({
		name: title,
		value: String(id),
	}));

	return filtered(items, filter);
}

export async function searchSchedules(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await (calApiRequestV2Versioned<CalApiResponse<CalSchedule[]>>).call(
		this,
		'GET',
		'/schedules',
		CAL_API_VERSION.SCHEDULES,
	);

	const items = (response.data ?? []).map(({ id, name }) => ({
		name,
		value: String(id),
	}));

	return filtered(items, filter);
}
