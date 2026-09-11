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
// default :root/.dark block. Open-ended by design: the server derives a handful
// of keys from `appThemeSettingsSchema` (see app-theme.service.ts), but Instance
// AI can set any shadcn/Tailwind variable directly by editing theme-overrides.css
// itself — the schema only needs to keep the *shape* (a flat map of CSS custom
// properties) honest, not gatekeep which properties exist.
const CSS_CUSTOM_PROPERTY_NAME = /^--[a-zA-Z0-9-]+$/;

export const appThemeVarsSchema = z.record(
	z
		.string()
		.regex(CSS_CUSTOM_PROPERTY_NAME, 'Must be a CSS custom property name, e.g. "--primary"'),
	z.string().trim().min(1).max(240),
);

export const appThemeModeSchema = z.enum(['light', 'dark', 'system']);

// What the Theme tab and the `apps` tool choose from. The server turns these
// into CSS variables so the contrast, tint and spacing maths lives in one place.
export const appThemeSettingsSchema = z.object({
	mode: appThemeModeSchema,
	primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color, e.g. "#ff6900"'),
	/** Corner radius in px; the template default is 4. */
	radius: z.number().int().min(0).max(32).optional(),
	/** CSS font-family stack for body text; omitted keeps the template's own. */
	font: z.string().trim().min(1).max(240).optional(),
	/** Scales every spacing utility (padding, gap, sizes) at once. */
	density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
	/** `tinted` derives surfaces (background, cards, borders) from the primary hue. */
	tone: z.enum(['neutral', 'tinted']).optional(),
});

export type AppThemeSettings = z.infer<typeof appThemeSettingsSchema>;

export const appThemeSchema = z.object({
	mode: appThemeModeSchema,
	vars: appThemeVarsSchema,
	/** Variables that apply in dark mode only, written into a `.dark` block. */
	darkVars: appThemeVarsSchema.optional(),
	/** The choices the variables were derived from; absent for hand-written themes. */
	settings: appThemeSettingsSchema.optional(),
});

export type AppTheme = z.infer<typeof appThemeSchema>;

export const appVersionSchema = z.object({
	id: z.string(),
	appId: z.string(),
	createdAt: z.string().datetime(),
	// False once retention pruned the dist tarball; the source tarball stays.
	hasDist: z.boolean(),
	// Served at `/apps/<namespace>/`.
	isActive: z.boolean(),
	// `publish` = built version that still has its dist; `snapshot` = source only.
	// The rows carry nothing else, so a build whose dist was pruned reads as a snapshot.
	kind: z.enum(['publish', 'snapshot']),
	// Short summary of what changed, or null when none was generated.
	label: z.string().nullable(),
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

/**
 * Outcome of asking n8n to run the app's dev server in a thread's sandbox.
 * `ready` carries a capability URL under `/apps-preview/<token>/`.
 */
export const appPreviewStatusSchema = z.discriminatedUnion('status', [
	z.object({ status: z.literal('ready'), url: z.string(), expiresAt: z.string().datetime() }),
	z.object({ status: z.literal('starting') }),
	z.object({ status: z.literal('no-source') }),
	z.object({ status: z.literal('unsupported'), reason: z.enum(['provider', 'port-route']) }),
	z.object({
		status: z.literal('unavailable'),
		reason: z.enum(['sandbox', 'start-failed']),
		log: z.string().max(4096).optional(),
	}),
]);

export type AppPreviewStatus = z.infer<typeof appPreviewStatusSchema>;
