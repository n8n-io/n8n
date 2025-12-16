import { Z } from 'zod-class';

import { bannerNameSchema } from '../../schemas/banner-name.schema';

export class DismissBannerRequestDto extends Z.class({
	banner: bannerNameSchema.optional(),
}) {}
