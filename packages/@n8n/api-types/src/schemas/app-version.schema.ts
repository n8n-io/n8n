import { z } from 'zod';

import { appContentSchema, appLayoutSchema } from './app-content.schema';
import {
	appComponentsSchema,
	appThemeSchema,
	pageRouteSchema,
	pageTitleSchema,
} from './app.schema';

/** A published version: the whole page tree, theme and components, frozen at publish time. */
export const appVersionSnapshotSchema = z.object({
	pages: z.array(
		z.object({
			id: z.string().min(1),
			route: pageRouteSchema,
			title: pageTitleSchema.nullable().default(null),
			parentPageId: z.string().nullable(),
			content: appContentSchema.nullable(),
			layout: appLayoutSchema.nullable().default(null),
		}),
	),
	theme: appThemeSchema.nullable(),
	components: appComponentsSchema.nullable().default(null),
});

export type AppVersionSnapshot = z.infer<typeof appVersionSnapshotSchema>;
