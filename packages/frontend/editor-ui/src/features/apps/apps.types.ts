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
	createdAt: string;
	updatedAt: string;
}
