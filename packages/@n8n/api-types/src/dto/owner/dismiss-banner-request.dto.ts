import { bannerNameSchema } from '../../schemas/banner-name.schema';
import { Z } from '../../zod-class';

export class DismissBannerRequestDto extends Z.class({
	banner: bannerNameSchema.optional(),
}) {}
