import { z } from 'zod';

export const appNameSchema = z.string().trim().min(1).max(128);

// URL path segment under /apps/<namespace>; kebab-case, matches other n8n slug conventions.
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_ERROR_MESSAGE =
	'Only lowercase letters, numbers, and single hyphens between them are allowed.';

export const appNamespaceSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.regex(SLUG_REGEX, SLUG_ERROR_MESSAGE);

// Empty means this page is the index/home page for its level (the app's own
// landing page, for a top-level page with no parent). A page's own segment
// can also be a dynamic param, e.g. ":id" (as in /clients/:id), matching the
// data workflow's input field of the same name.
const PAGE_ROUTE_REGEX = /^(:[a-zA-Z_][a-zA-Z0-9_]*|[a-z0-9]+(-[a-z0-9]+)*)?$/;
const PAGE_ROUTE_ERROR_MESSAGE = `${SLUG_ERROR_MESSAGE} A dynamic segment starts with ':' followed by a name, e.g. ':id'.`;

export const pageRouteSchema = z
	.string()
	.trim()
	.max(255)
	.regex(PAGE_ROUTE_REGEX, PAGE_ROUTE_ERROR_MESSAGE);

// Flat CSS custom-property overrides applied on top of the shadcn-vue template's
// default :root/.dark block. Open-ended by design: the Theme tab writes a handful
// of derived keys (see AppThemeEditor.vue), but Instance AI can set any shadcn/
// Tailwind variable directly by editing theme-overrides.css itself — the schema
// only needs to keep the *shape* (a flat map of CSS custom properties) honest,
// not gatekeep which properties exist.
const CSS_CUSTOM_PROPERTY_NAME = /^--[a-zA-Z0-9-]+$/;

export const appThemeVarsSchema = z.record(
	z
		.string()
		.regex(CSS_CUSTOM_PROPERTY_NAME, 'Must be a CSS custom property name, e.g. "--primary"'),
	z.string().trim().min(1).max(240),
);

export const appThemeSchema = z.object({
	mode: z.enum(['light', 'dark', 'system']),
	vars: appThemeVarsSchema,
});

export type AppTheme = z.infer<typeof appThemeSchema>;

/**
 * Who may open the served app. `public`: anyone with the URL. `n8n`: the visitor
 * signs in to this n8n instance first and needs `app:read` on the app's project.
 */
export const appAuthModeSchema = z.enum(['public', 'n8n']);

export type AppAuthMode = z.infer<typeof appAuthModeSchema>;

export const appVersionSchema = z.object({
	id: z.string(),
	appId: z.string(),
	createdAt: z.string().datetime(),
	// False once retention pruned the dist tarball; the source tarball stays.
	hasDist: z.boolean(),
});

export type AppVersion = z.infer<typeof appVersionSchema>;

// A page derived from the app's own `src/router.ts`, not a `Page` DB row —
// `id` is synthesized from the route's own full path, since there is no row.
export const appRouteSchema = z.object({
	id: z.string(),
	parentPageId: z.string().nullable(),
	route: z.string(),
});

export type AppRoute = z.infer<typeof appRouteSchema>;
