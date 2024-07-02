import { Config, Env, Nested } from '../decorators';

@Config
class CredentialsOverwrite {
	/**
	 * Allows to set default values for credentials which get automatically prefilled and the user does not get displayed and can not change.
	 * Format: { CREDENTIAL_NAME: { PARAMETER: VALUE }}
	 */
	@Env('CREDENTIALS_OVERWRITE_DATA')
	readonly data: string = '{}';

	/** Fetch credentials from API */
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
