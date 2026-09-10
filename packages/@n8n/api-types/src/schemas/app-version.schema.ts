import { z } from 'zod';

import { appContentSchema, appLayoutSchema } from './app-content.schema';
import { appThemeSchema, pageRouteSchema } from './app.schema';

/** A published version: the whole page tree and theme, frozen at publish time. */
export const appVersionSnapshotSchema = z.object({
	pages: z.array(
		z.object({
			id: z.string().min(1),
			route: pageRouteSchema,
			parentPageId: z.string().nullable(),
			content: appContentSchema.nullable(),
			layout: appLayoutSchema.nullable().default(null),
		}),
	),
	theme: appThemeSchema.nullable(),
});

export type AppVersionSnapshot = z.infer<typeof appVersionSnapshotSchema>;
