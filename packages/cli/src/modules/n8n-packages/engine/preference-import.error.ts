import { classifyRestError, RestErrorKind, serializePublicApiError } from '@n8n/backend-services';
import { ResponseError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import type { ImportedPreferenceSummary } from '../n8n-packages.types';
import { countPreferenceStatuses } from './import-result';

/** Completed Preference changes survive a later import failure. */
export class PreferenceImportError extends ResponseError {
	override readonly meta: Record<string, unknown>;

	constructor(cause: unknown, preferences: ImportedPreferenceSummary[]) {
		const descriptor = classifyRestError(ensureError(cause));
		const { status, body } = serializePublicApiError(descriptor);
		const response = descriptor.kind === RestErrorKind.responseError ? descriptor : undefined;
		super(body.message, status, response?.code ?? status, response?.hint, cause);
		this.meta = {
			...response?.meta,
			preferences,
			counts: { preferences: countPreferenceStatuses(preferences) },
		};
	}
}
