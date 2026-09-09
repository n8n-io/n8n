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
	/** Version served at `/apps/<namespace>/`; null until the first build. */
	activeVersionId: string | null;
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

export interface UpdateAppInput {
	name?: string;
	namespace?: string;
	theme?: AppTheme;
}
