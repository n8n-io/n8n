import { z } from 'zod';
import { Z } from 'zod-class';

const AutoPublishModeSchema = z.enum(['none', 'all', 'published']);
export const AUTO_PUBLISH_MODE = AutoPublishModeSchema.Values;
export type AutoPublishMode = z.infer<typeof AutoPublishModeSchema>;

export class PullWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional(),
	autoPublish: AutoPublishModeSchema.optional().default('none'),
}) {}
