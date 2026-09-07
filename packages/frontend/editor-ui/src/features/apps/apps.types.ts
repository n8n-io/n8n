export interface App {
	id: string;
	name: string;
	namespace: string;
	theme: Record<string, unknown> | null;
	projectId: string;
	createdAt: string;
	updatedAt: string;
}

export interface Page {
	id: string;
	appId: string;
	parentPageId: string | null;
	route: string;
	content: unknown[] | null;
	dataWorkflowId: string | null;
	createdAt: string;
	updatedAt: string;
}

/** A workflow a page can wire up as its `dataWorkflowId`, i.e. it starts with a compatible trigger. */
export interface DataWorkflowOption {
	id: string;
	name: string;
}

export interface UpdatePageInput {
	route?: string;
	dataWorkflowId?: string | null;
}
