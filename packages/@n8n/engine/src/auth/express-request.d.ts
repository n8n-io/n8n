import type { AuthenticatedCaller } from './identity.types';

declare global {
	namespace Express {
		interface Request {
			/** Set by the authentication middleware once a request clears it. */
			caller?: AuthenticatedCaller;
		}
	}
}
