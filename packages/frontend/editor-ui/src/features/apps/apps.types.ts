import type { AppAuthMode } from '@n8n/api-types';

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
	authMode: AppAuthMode;
	projectId: string;
	/** Version served at `/apps/<namespace>/`; null until the first build. */
	activeVersionId: string | null;
	createdAt: string;
	updatedAt: string;
}

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
	authMode?: AppAuthMode;
}
