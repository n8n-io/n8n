import { z } from 'zod';

import { promotionDirectionSchema } from './promotion-config.dto';
import { Z } from '../../zod-class';

/**
 * The local checkout of one direction, after a clone or a disconnect. It reports
 * the instance that handled the request. Other replicas may hold a different
 * checkout, so this never says the whole deployment is ready.
 */
export const promotionCheckoutPublicSchema = z.object({
	connectionId: z.string(),
	configId: z.string(),
	direction: promotionDirectionSchema,
	/** Apply tracks the branch it imports from, Promote the branch it starts from. */
	branchName: z.string(),
	hasCheckout: z.boolean(),
});

export class PromotionCheckoutPublicDto extends Z.class(promotionCheckoutPublicSchema.shape) {}
