import { Config, Env, Nested } from '../decorators';

@Config
class CredentialsOverwrite {
	/**
	 * Prefilled data ("overwrite") in credential types. End users cannot view or change this data.
	 * Format: { CREDENTIAL_NAME: { PARAMETER: VALUE }}
	 */
	@Env('CREDENTIALS_OVERWRITE_DATA')
	readonly data: string = '{}';

	/** Internal API endpoint to fetch overwritten credential types from. */
	@Env('CREDENTIALS_OVERWRITE_ENDPOINT')
	readonly endpoint: string = '';
}

@Config
export class CredentialsConfig {
	/** Default name for credentials */
	@Env('CREDENTIALS_DEFAULT_NAME')
	readonly defaultName: string = 'My credentials';

	@Nested
	readonly overwrite: CredentialsOverwrite;
}
