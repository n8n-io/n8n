import type { AppAuth, AppContent, AppTheme } from '@n8n/api-types';

export interface App {
	id: string;
	name: string;
	namespace: string;
	theme: AppTheme | null;
	auth: AppAuth;
	projectId: string;
	activeVersionId: string | null;
	/** `createdAt` of the active version, or null when the app has never been published. */
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Page {
	id: string;
	appId: string;
	parentPageId: string | null;
	route: string;
	content: AppContent | null;
	createdAt: string;
	updatedAt: string;
}

export interface UpdateAppInput {
	name?: string;
	namespace?: string;
	theme?: AppTheme | null;
	auth?: AppAuth;
}

export interface UpdatePageInput {
	route?: string;
	content?: AppContent | null;
}

export interface AppVersionSummary {
	id: string;
	createdAt: string;
	createdById: string | null;
	active: boolean;
}

export interface PreviewParams {
	path: string;
	params?: Record<string, string>;
}
