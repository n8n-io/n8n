import { Time } from '@n8n/constants';
import { createUserKeyedRateLimiter } from '@n8n/decorators';

/** Routes that reach another instance give each user a small budget on each route. */
export const remoteCallRateLimit = () =>
	createUserKeyedRateLimiter({ limit: 10, windowMs: Time.minutes.toMilliseconds });
