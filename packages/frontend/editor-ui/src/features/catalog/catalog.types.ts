import type { ExecutionStatus } from 'n8n-workflow';

/** One field a workflow declares on its trigger, rendered as one form input. */
export type CatalogField = {
	name: string;
	type: string;
};

export type CatalogEntry = {
	id: string;
	name: string;
	description: string | null;
	fields: CatalogField[];
};

export type CatalogListing = {
	workflows: CatalogEntry[];
	/** The backend capped the list; say so rather than let it read as complete. */
	truncated: boolean;
};

export type CatalogRun = {
	id: string;
	workflowId: string;
	workflowName?: string;
	status: ExecutionStatus;
	startedAt: string | null;
	stoppedAt?: string;
};

export type CatalogRunListing = {
	runs: CatalogRun[];
	count: number;
	estimated: boolean;
};
