import { z } from 'zod';

import { Z } from '../../zod-class';

/** Generous bound for one source file's text content. */
const MAX_FILE_CONTENT_LENGTH = 500_000;

export class UpdateAppVersionFileDto extends Z.class({
	content: z.string().max(MAX_FILE_CONTENT_LENGTH),
}) {}
