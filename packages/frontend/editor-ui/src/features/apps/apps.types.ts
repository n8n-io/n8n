import type { AppAuth, AppContent, AppLayout, AppTheme } from '@n8n/api-types';

export interface App {
	id: string;
	name: string;
	namespace: string;
	theme: AppTheme | null;
	/** TSX source of the shared components code blocks import from `app/components`. */
	components: string | null;
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
	title: string | null;
	content: AppContent | null;
	/** `null` inherits the nearest ancestor's layout. */
	layout: AppLayout | null;
	createdAt: string;
	updatedAt: string;
}

export interface UpdateAppInput {
	name?: string;
	namespace?: string;
	theme?: AppTheme | null;
	components?: string | null;
	auth?: AppAuth;
}

export interface UpdatePageInput {
	route?: string;
	title?: string | null;
	content?: AppContent | null;
	layout?: AppLayout | null;
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

/** Message per block id for blocks whose renderer failed; such a block renders as nothing. */
export type RenderErrors = Record<string, string>;

export interface PagePreview {
	html: string;
	errors: RenderErrors;
	/** One-time code the preview iframe's script exchanges for a draft access token. */
	code: string | null;
}

/** The page's effective layout, rendered and sanitized server-side; `html` is null when no ancestor defines one. */
export interface LayoutPreview {
	ownerPageId: string | null;
	html: string | null;
	errors: RenderErrors;
}
