import { TELEMETRY_EVENT } from '../index';
import { getEventValidationError } from '../validate';

describe('credential description telemetry', () => {
	it.each([
		TELEMETRY_EVENT.CREDENTIALS.USER_CREATED_CREDENTIALS,
		TELEMETRY_EVENT.CREDENTIALS.USER_UPDATED_CREDENTIALS,
	])('accepts backend metadata and rejects description text in $name', (event) => {
		const properties = {
			user_id: 'user-1',
			credential_id: 'credential-1',
			credential_type: 'postgres',
			source: 'backend',
			has_description: true,
			description_length: 18,
			is_private: false,
			uses_external_secrets: false,
			jwe_enabled: false,
			credential_supports_managed_auth: false,
			credential_uses_managed_auth: false,
			...(event === TELEMETRY_EVENT.CREDENTIALS.USER_CREATED_CREDENTIALS
				? { public_api: false }
				: {}),
		};
		expect(getEventValidationError(event, properties)).toBeNull();
		expect(
			getEventValidationError(event, { ...properties, description: 'Production reports' }),
		).toContain('description: unrecognized property');
	});

	it('accepts frontend creation without description metadata', () => {
		expect(
			getEventValidationError(TELEMETRY_EVENT.CREDENTIALS.USER_CREATED_CREDENTIALS, {
				credential_id: 'credential-1',
				credential_type: 'postgres',
				source: 'frontend',
				workflow_id: 'workflow-1',
			}),
		).toBeNull();
	});
});
