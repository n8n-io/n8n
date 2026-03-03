import { CommaSeparatedStringArray } from '../custom-types';
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

	/**
	 * Comma-separated list of credential types for which overwrites are skipped
	 * when the credential has been customized (any overwrite field has a user-set
	 * value differing from the overwrite).
	 * @example `N8N_SKIP_CREDENTIAL_OVERWRITE=zohoOAuth2Api,salesforceOAuth2Api`
	 */
	@Env('N8N_SKIP_CREDENTIAL_OVERWRITE')
	skipTypes: CommaSeparatedStringArray<string> = [];
}

@Config
export class CredentialsConfig {
	/** Default name suggested when creating new credentials. */
	@Env('CREDENTIALS_DEFAULT_NAME')
	defaultName: string = 'My credentials';

	@Nested
	overwrite: CredentialsOverwrite;
}
