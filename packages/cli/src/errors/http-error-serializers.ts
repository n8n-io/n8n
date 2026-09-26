import {
	isWorkflowPublishBlockedDetails,
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
} from '@n8n/api-types';

import { HttpErrorKind, type HttpErrorDescriptor } from '@/errors/http-error-classifier';

const GENERIC_PUBLIC_MESSAGE = 'Internal server error';

export type InternalRestErrorBody = {
	code: number;
	message: string;
	hint?: string;
	stacktrace?: string;
	meta?: Record<string, unknown>;
};

export function serializePublicApiError(descriptor: HttpErrorDescriptor): {
	status: number;
	body: { message: string };
} {
	switch (descriptor.kind) {
		case HttpErrorKind.responseError: {
			const body: { message: string } & Record<string, unknown> = {
				message: descriptor.message,
			};
			// Blocking-issue errors (package import) expose the structured list so
			// clients can see every blocker; the rest of `meta` stays internal.
			if (descriptor.meta?.issues !== undefined) {
				body.issues = descriptor.meta.issues;
			}
			// Same reasoning for policy violations: the caller is the one who has to fix
			// them, so the whole list travels with the response rather than the message alone.
			if (descriptor.meta?.violations !== undefined) {
				body.violations = descriptor.meta.violations;
			}
			// Same reasoning for a blocked push: the caller needs to see every conflicting
			// file to decide whether to force the push, not just the message.
			if (descriptor.meta?.conflicts !== undefined) {
				body.conflicts = descriptor.meta.conflicts;
			}
			const workflowPublishBlockedDetails = {
				reason: descriptor.meta?.reason,
				workflowReviewRequestId: descriptor.meta?.workflowReviewRequestId,
				versionId: descriptor.meta?.versionId,
			};
			if (
				descriptor.meta &&
				descriptor.meta.code === PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE &&
				Array.isArray(descriptor.meta.workflowIds)
			) {
				body.meta = {
					code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
					workflowIds: descriptor.meta.workflowIds,
				};
			}
			return {
				status: descriptor.status,
				body: {
					...body,
					...(isWorkflowPublishBlockedDetails(workflowPublishBlockedDetails) &&
						workflowPublishBlockedDetails),
				},
			};
		}
		case HttpErrorKind.userError:
			return {
				status: 400,
				body: { message: descriptor.message },
			};
		case HttpErrorKind.unexpectedError:
		case HttpErrorKind.serverError:
			return {
				status: 500,
				body: { message: GENERIC_PUBLIC_MESSAGE },
			};
		case HttpErrorKind.httpError:
			return {
				status: descriptor.status,
				body: { message: descriptor.message },
			};
	}
}

export function serializeInternalRestError(descriptor: HttpErrorDescriptor): {
	status: number;
	body: InternalRestErrorBody;
} {
	switch (descriptor.kind) {
		case HttpErrorKind.responseError: {
			const body: InternalRestErrorBody = {
				code: descriptor.code,
				message: descriptor.message,
			};
			if (descriptor.hint) {
				body.hint = descriptor.hint;
			}
			if (descriptor.meta) {
				body.meta = descriptor.meta;
			}
			return { status: descriptor.status, body };
		}
		case HttpErrorKind.userError:
			return {
				status: 400,
				body: { code: 0, message: descriptor.message },
			};
		case HttpErrorKind.unexpectedError:
		case HttpErrorKind.serverError:
			return {
				status: 500,
				body: { code: 0, message: descriptor.message },
			};
		case HttpErrorKind.httpError:
			return {
				status: descriptor.status,
				body: { code: 0, message: descriptor.message },
			};
	}
}
