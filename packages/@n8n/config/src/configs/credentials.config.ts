import { Config, Env, Nested } from '../decorators';

@Config
class CredentialsOverwrite {
	/**
	 * Prefilled data ("overwrite") in credential types. End users cannot view or change this data.
	 * Format: { CREDENTIAL_NAME: { PARAMETER: VALUE }}
	 */
	@Env('CREDENTIALS_OVERWRITE_DATA')
	data: string = '{}';

	/** Internal API endpoint to fetch overwritten credential types from. */
	@Env('CREDENTIALS_OVERWRITE_ENDPOINT')
	endpoint: string = '';

	/** Authentication token for the credentials overwrite endpoint. */
	@Env('CREDENTIALS_OVERWRITE_ENDPOINT_AUTH_TOKEN')
	endpointAuthToken: string = '';

	/** Enable persistence for credentials overwrites. */
	@Env('CREDENTIALS_OVERWRITE_PERSISTENCE')
	persistence: boolean = false;
}

@Config
export class CredentialsConfig {
	/** Default name for credentials */
	@Env('CREDENTIALS_DEFAULT_NAME')
	defaultName: string = 'My credentials';

	@Nested
	overwrite: CredentialsOverwrite;
}
