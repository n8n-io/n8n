import type { User, AuthenticationInformation, ExecutionSummaries } from '@n8n/db';
/**
 * Augments the global Express.Request interface so that middleware functions
 * can be typed as (req: Request, ...) => void and remain assignable to
 * express.RequestHandler, avoiding contravariance casting.
 *
 * This is an ambient module declaration file (no imports/exports), so
 * top-level `namespace` declarations are automatically global.
 */
declare namespace Express {
	interface Request {
		/** Set by auth middleware after successful authentication */
		user?: User;
		/** Authentication details set by auth middleware */
		authInfo?: AuthenticationInformation;
		/** Browser fingerprint set by APIRequest middleware */
		browserId?: string;
		/** Parsed execution range query, set by parseRangeQuery middleware */
		rangeQuery?: ExecutionSummaries.RangeQuery;
	}
}
