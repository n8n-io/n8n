import { UserError } from 'n8n-workflow';

/** The duplicates a promotions write can hit. */
export type PromotionConflictKind =
	| 'instance-connection'
	| 'config-direction'
	| 'project-link'
	| 'provider-in-use';

/**
 * A write lost to a database constraint. Repositories raise it so services can
 * answer 409 without looking at driver errors themselves.
 */
export class PromotionConflictError extends UserError {
	constructor(
		readonly kind: PromotionConflictKind,
		message: string,
	) {
		super(message);
	}
}
