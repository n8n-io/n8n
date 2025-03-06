import { Z } from 'zod-class';

import { bannerNameSchema } from '../../schemas/bannerName.schema';

export class DismissBannerRequestDto extends Z.class({
	banner: bannerNameSchema.optional(),
}) {}
