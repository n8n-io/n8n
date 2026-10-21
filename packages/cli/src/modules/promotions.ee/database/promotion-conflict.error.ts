import { UserError } from 'n8n-workflow';

/**
 * A write lost to a database constraint. Repositories raise it so services can
 * answer 409 without looking at driver errors themselves.
 */
export class PromotionConflictError extends UserError {}
