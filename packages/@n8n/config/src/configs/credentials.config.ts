import { Config, Env, Nested } from '../decorators';

@Config
class CredentialsOverwrite {
	/**
	 * JSON object of prefilled credential data (overwrites). End users cannot view or edit these values.
	 * Format: `{ "CREDENTIAL_NAME": { "PARAMETER": "VALUE" } }`.
	 */
	@Env('CREDENTIALS_OVERWRITE_DATA')
	data: string = '{}';

	/** Endpoint of an internal API that returns overwritten credential definitions. When set, overwrites are loaded from this endpoint. */
	@Env('CREDENTIALS_OVERWRITE_ENDPOINT')
	endpoint: string = '';

	/** Token used to authenticate requests to the credentials overwrite endpoint. */
	@Env('CREDENTIALS_OVERWRITE_ENDPOINT_AUTH_TOKEN')
	endpointAuthToken: string = '';

	/** Whether to persist credential overwrites so they survive restarts. */
	@Env('CREDENTIALS_OVERWRITE_PERSISTENCE')
	persistence: boolean = false;
}

@Config
export class CredentialsConfig {
	/** Default name suggested when creating new credentials. */
	@Env('CREDENTIALS_DEFAULT_NAME')
	defaultName: string = 'My credentials';

	@Nested
	overwrite: CredentialsOverwrite;
}
