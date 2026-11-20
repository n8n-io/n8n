/** The SCIM endpoint that the identity provider called. */
export type ScimOperation =
	| 'list_users'
	| 'get_user'
	| 'create_user'
	| 'replace_user'
	| 'patch_user'
	| 'delete_user'
	| 'discovery'
	| 'other';

/**
 * Why n8n rejected a SCIM request. The first six values are the reasons that
 * IAM-1564 names. The others cover the rejections that those do not.
 */
export type ScimRejectReason =
	| 'invalid_token'
	| 'superseded_token'
	| 'sso_off'
	| 'invalid_value'
	| 'owner_protected'
	| 'not_found'
	| 'scim_disabled'
	| 'forbidden'
	| 'conflict'
	| 'invalid_filter'
	| 'invalid_request'
	| 'rate_limited'
	| 'internal_error'
	| 'other';
