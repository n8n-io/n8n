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

export const appVersionSchema = z.object({
	id: z.string(),
	appId: z.string(),
	createdAt: z.string().datetime(),
	// False once retention pruned the dist tarball; the source tarball stays.
	hasDist: z.boolean(),
});

export type AppVersion = z.infer<typeof appVersionSchema>;
