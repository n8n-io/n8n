import type { User } from '@n8n/db';

export type AuthFailureReason =
	| 'missing_authorization_header'
	| 'invalid_bearer_format'
	| 'jwt_decode_failed'
	| 'invalid_token'
	| 'token_not_found_in_db'
	| 'user_not_found'
	| 'user_id_not_in_auth_info'
	| 'unknown_error';

export type OAuthAuthType = 'oauth' | 'api_key' | 'unknown';

export type TelemetryAuthContext = {
	reason: AuthFailureReason;
	auth_type: OAuthAuthType;
	error_details?: string;
};

export type UserWithContext = {
	user: User | null;
	context?: TelemetryAuthContext;
};
