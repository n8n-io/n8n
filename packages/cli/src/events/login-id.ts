import type { OperationContext } from '@n8n/db';

/** The login a service account used, for audit events. Absent for people and outside a request. */
export function loginIdOf(ctx: OperationContext | undefined): string | undefined {
	return ctx?.security?.subIdentityId;
}
