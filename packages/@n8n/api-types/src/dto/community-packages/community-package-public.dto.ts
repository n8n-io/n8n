import '../../openapi-extend';

import { z } from 'zod';

import { updateCommunityPackageFieldDocs } from './community-package-public.openapi';
import { communityPackageResponseSchema } from '../../schemas/community-package.schema';
import { Z } from '../../zod-class';

export class UpdateCommunityPackagePublicDto extends Z.class(
	{
		version: z.string().optional().openapi(updateCommunityPackageFieldDocs.version),
		verify: z.boolean().optional().openapi(updateCommunityPackageFieldDocs.verify),
	},
	{ strict: true },
) {}

export class CommunityPackagePublicDto extends Z.class(communityPackageResponseSchema.shape) {}
