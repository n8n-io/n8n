import type { Logger } from '@n8n/backend-common';
import type { SurfaceId } from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';

export type AuthenticationOutcome = {
	surface: SurfaceId;
	/** The protected resource URL the caller entered. */
	resource: string;
	/** Present when the pipeline produced a context, also for a denial after it. */
	context?: SecurityContext;
	/** Absent when the caller is allowed. */
	reason?: string;
};

/**
 * The one log line a surface writes per authentication outcome it decides itself: the
 * caller was allowed, or refused before or after the pipeline. The pipeline logs its own
 * rejections. Carries no token, no external subject and no email.
 */
export function logAuthenticationOutcome(logger: Logger, outcome: AuthenticationOutcome): void {
	const { surface, resource, context, reason } = outcome;
	const fields = {
		surface,
		resource,
		sourceId: context?.subjectClaim?.sourceId,
		authMethod: context?.authMethod,
		userId: context?.subject.id,
	};
	if (reason === undefined) {
		logger.info('Inbound authentication allowed', fields);
	} else {
		logger.warn('Inbound authentication denied', { ...fields, reason });
	}
}
