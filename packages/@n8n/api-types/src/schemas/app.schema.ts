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

/** What the menu and the browser tab show for a page; the route stays a URL segment only. */
export const pageTitleSchema = z.string().trim().min(1).max(255);

const cssColorSchema = z.string().trim().min(1).max(32);

/** Colors, radius and font an App applies on top of the default page stylesheet. */
export const appThemeSchema = z.object({
	colors: z
		.object({
			primary: cssColorSchema.optional(),
			background: cssColorSchema.optional(),
			surface: cssColorSchema.optional(),
			text: cssColorSchema.optional(),
			muted: cssColorSchema.optional(),
		})
		.optional(),
	radius: z.enum(['none', 'sm', 'md', 'lg']).optional(),
	fontFamily: z.string().trim().max(100).optional(),
	/** Max width of `.app-container`, e.g. `72rem` or `1200px`. */
	contentWidth: z
		.string()
		.trim()
		.regex(/^\d{2,4}(px|rem)$/, 'Use a length in px or rem, e.g. 72rem')
		.optional(),
	/** Appended to every served page after the theme variables. */
	customCss: z.string().max(20_000).optional(),
});

export type AppTheme = z.infer<typeof appThemeSchema>;

/** TSX source of the App's shared components, imported by code blocks from `app/components`. */
export const appComponentsSchema = z.string().max(50_000);

/** Who may open the App: anyone, or only a signed-in user of this n8n instance. */
export const appAuthSchema = z.enum(['public', 'n8n']);

export type AppAuth = z.infer<typeof appAuthSchema>;
