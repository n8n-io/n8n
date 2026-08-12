import { z } from 'zod';

import { Z } from '../../zod-class';

export class DownloadProjectFileQueryDto extends Z.class({
	/**
	 * `view` serves the bytes inline for preview, and only for
	 * `ProjectFilePreviewableMimeTypes`.
	 *
	 * Omitted means `download`; an unrecognised value is rejected rather than
	 * falling back, so nothing but an explicit `view` can render inline.
	 */
	action: z.enum(['view', 'download']).optional().default('download'),
}) {}
