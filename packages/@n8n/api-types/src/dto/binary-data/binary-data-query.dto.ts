import { z } from 'zod';

import { Z } from '../../zod-class';

export class BinaryDataQueryDto extends Z.class({
	id: z
		.string()
		.refine((id) => id.includes(':'), {
			error: 'Missing binary data mode',
		})
		.refine(
			(id) => {
				const [mode] = id.split(':');
				return ['database', 'filesystem', 'filesystem-v2', 's3'].includes(mode);
			},
			{
				error: 'Invalid binary data mode',
			},
		),
	action: z.enum(['view', 'download']),
	fileName: z.string().optional(),
	mimeType: z.string().optional(),
}) {}
