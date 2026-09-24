import '../../openapi-extend';

import { z } from 'zod';

import { Z } from '../../zod-class';

const AutoPublishModeSchema = z.enum(['none', 'all', 'published']);
export const AUTO_PUBLISH_MODE = AutoPublishModeSchema.Values;

export class PullWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional().openapi({
		description: 'Discard local changes and force the pull to complete.',
	}),
	autoPublish: AutoPublishModeSchema.optional()
		.default('none')
		.openapi({
			description:
				'Controls automatic workflow publishing after import:\n' +
				'- `none`: Keep workflows in their local published state (default)\n' +
				'- `all`: Publish all imported workflows\n' +
				'- `published`: Publish only workflows that were published locally before import',
		}),
}) {}
