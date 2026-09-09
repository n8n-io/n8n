/**
 * Flat CSS custom-property overrides on top of the shadcn-vue template's default
 * :root/.dark block. Open-ended: the Theme tab writes a handful of derived keys
 * (see AppThemeEditor.vue), but Instance AI can set any shadcn/Tailwind variable
 * directly by editing theme-overrides.css, so this isn't a fixed key set.
 */
export interface AppTheme {
	mode: 'light' | 'dark' | 'system';
	vars: Record<string, string>;
}

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
}

/** Answer of `POST /apps/:appId/publish`; a failed build is a 200 with `error`, like the agent's tool result. */
export type AppPublishResult =
	| { versionId: string; url: string }
	| { error: true; stage: string; message: string; log?: string };

/**
 * A page of an App, derived from its source's `src/router.ts` — not a DB
 * row. `id` is synthesized from the route's own full path, since there is
 * no row to key by.
 */
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
