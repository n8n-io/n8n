import { getCredentialDescriptionTelemetry } from '../credential-description';
import { TELEMETRY_EVENT } from '../index';
import { getEventValidationError } from '../validate';

describe('credential description telemetry', () => {
	it.each([
		{ description: undefined, length: 0 },
		{ description: null, length: 0 },
		{ description: ' \n\t ', length: 0 },
		{ description: '  Production reports  ', length: 18 },
		{ description: ' 🔑 ', length: 2 },
	])('reports only presence and length for $description', ({ description, length }) => {
		expect(getCredentialDescriptionTelemetry(description)).toEqual({
			has_description: length > 0,
			description_length: length,
		});
	});

	it.each([
		TELEMETRY_EVENT.CREDENTIALS.USER_CREATED_CREDENTIALS,
		TELEMETRY_EVENT.CREDENTIALS.USER_SAVED_CREDENTIALS,
	])('rejects description text in $name', (event) => {
		const properties = {
			credential_id: 'credential-1',
			credential_type: 'postgres',
			has_description: true,
			description_length: 18,
			...(event === TELEMETRY_EVENT.CREDENTIALS.USER_SAVED_CREDENTIALS
				? {
						credential_saved: true,
						is_complete: true,
						is_new: false,
						uses_external_secrets: false,
					}
				: {}),
		};
		expect(getEventValidationError(event, properties)).toBeNull();
		expect(
			getEventValidationError(event, { ...properties, description: 'Production reports' }),
		).toContain('description: unrecognized property');
	});
});
