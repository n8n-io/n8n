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

export interface CalEventType {
	id: number;
	title: string;
}

export interface CalSchedule {
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
