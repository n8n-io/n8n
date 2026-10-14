import type {} from '@n8n/backend-services';

export type DataTableEventMap = {
	'data-table-deleted': {
		dataTableId: string;
		projectId: string;
	};
	'data-table-storage-limit-hit': {
		totalBytes: number;
		maxBytes: number;
	};
};

declare module '@n8n/backend-services' {
	interface EventMap extends DataTableEventMap {}
}
