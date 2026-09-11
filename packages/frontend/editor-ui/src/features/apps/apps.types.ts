import type { AppTheme, AppThemeSettings } from '@n8n/api-types';

export type { AppTheme, AppThemeSettings };

export interface App {
	id: string;
	name: string;
	namespace: string;
	theme: AppTheme | null;
	projectId: string;
	/** Version served at `/apps/<namespace>/`; null until the first publish. */
	activeVersionId: string | null;
	/** A source newer than the published version exists (per-turn snapshot, or nothing published yet). */
	hasUnpublishedChanges: boolean;
	createdAt: string;
	updatedAt: string;
}

/** A stored version of the app: a published build, or a source-only snapshot of the draft. */
export interface AppVersion {
	id: string;
	appId: string;
	createdAt: string;
	/** False once retention pruned the build; only versions with a dist can be served. */
	hasDist: boolean;
	isActive: boolean;
	/** A build whose dist was pruned reads as a snapshot. */
	kind: 'publish' | 'snapshot';
	/** Short summary of what changed, or null when none was generated. */
	label: string | null;
}

/** Answer of `POST /apps/:appId/publish`; a failed build is a 200 with `error`, like the agent's tool result. */
export type AppPublishResult =
	| { versionId: string; url: string }
	| { error: true; stage: string; message: string; log?: string };

/** A page of an App, derived from its source's `src/router.ts`; `id` is the route's full path. */
export interface Page {
	id: string;
	parentPageId: string | null;
	route: string;
}

export interface UpdateAppInput {
	name?: string;
	namespace?: string;
	theme?: AppTheme;
}
