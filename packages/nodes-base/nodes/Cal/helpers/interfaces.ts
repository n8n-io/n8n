import type { IDataObject } from 'n8n-workflow';

/** Every Cal.com v2 endpoint wraps its payload in a `{ status, data }` envelope. */
export interface CalApiResponse<T> {
	data: T;
}

export interface CalPagination {
	nextCursor?: string | null;
	hasMore?: boolean;
}

/** List endpoints add cursor pagination next to the envelope. */
export interface CalPaginatedApiResponse<T> extends CalApiResponse<T[]> {
	pagination?: CalPagination;
}

/**
 * The domain types extend `IDataObject` so that an operation can hand a
 * response straight to the output, and so that the fields Cal.com adds beyond
 * the ones named here survive.
 */
export interface CalEventType extends IDataObject {
	id: number;
	title: string;
}

export interface CalSchedule extends IDataObject {
	id: number;
	name: string;
	timeZone?: string;
	isDefault?: boolean;
}

/**
 * A free slot. It extends `IDataObject` so that the fields Cal.com adds for a
 * seated or recurring event type reach the output untouched. `end` is absent
 * when the request asks for the `time` format.
 */
export interface CalSlot extends IDataObject {
	start: string;
	end?: string;
}

/** `GET /v2/slots` keys its slots by date, for example `{ '2033-09-05': [...] }`. */
export type CalSlotsByDate = Record<string, CalSlot[]>;
