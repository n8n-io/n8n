import { AiPreferenceScopeFullError } from '@n8n/backend-services';
import { ForbiddenError, UserError } from '@n8n/errors';

import { PreferenceImportError } from '../preference-import.error';

it.each([
	[new ForbiddenError('Publication refused'), 403, 'Publication refused'],
	[new UserError('Invalid destination'), 400, 'Invalid destination'],
	[new Error('Database detail'), 500, 'Internal server error'],
] as const)('preserves the public response for %s', (cause, status, message) => {
	const preferences = [{ id: 'preference-id', scope: 'instance', status: 'create' }] as const;
	const error = new PreferenceImportError(cause, [...preferences]);
	expect(error).toMatchObject({
		cause,
		httpStatusCode: status,
		message,
		meta: {
			preferences,
			counts: { preferences: { created: 1, updated: 0, removed: 0, skipped: 0 } },
		},
	});
});

it('keeps internal error metadata out of the partial result', () => {
	const cause = new AiPreferenceScopeFullError('instance', { limit: 50, actual: 50 });
	expect(new PreferenceImportError(cause, []).meta).toEqual({
		preferences: [],
		counts: { preferences: { created: 0, updated: 0, removed: 0, skipped: 0 } },
	});
});
