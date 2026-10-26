import { UserError } from 'n8n-workflow';

/** Requested SCIM resource does not exist. Maps to HTTP 404. */
export class ScimResourceNotFoundError extends UserError {
	constructor(resourceId: string) {
		super(`Resource ${resourceId} not found`);
	}
}

/** Resource conflicts with an existing one (e.g. duplicate userName). Maps to HTTP 409 with scimType "uniqueness". */
export class ScimConflictError extends UserError {
	constructor(detail: string) {
		super(detail);
	}
}

/** The operation is not allowed on this resource (e.g. deactivating the instance owner). Maps to HTTP 403. */
export class ScimForbiddenError extends UserError {
	constructor(detail: string) {
		super(detail);
	}
}

/** Filter expression is not supported. Maps to HTTP 400 with scimType "invalidFilter". */
export class ScimInvalidFilterError extends UserError {
	constructor(filter: string) {
		super(`Unsupported filter expression: ${filter}`);
	}
}

/** An attribute value is not acceptable (e.g. no usable email address). Maps to HTTP 400 with scimType "invalidValue". */
export class ScimInvalidValueError extends UserError {
	constructor(detail: string) {
		super(detail);
	}
}

/**
 * Another request changed the SCIM token while this one replaced it. Maps to
 * HTTP 409 on `POST /rest/scim/token`.
 */
export class ScimTokenConflictError extends UserError {
	constructor() {
		super('The SCIM token changed during this request. Load the token state again and retry.');
	}
}

/**
 * SCIM provisioning cannot turn on while SAML or OIDC single sign-on is off.
 * Maps to HTTP 400 on `PATCH /rest/scim/config`.
 */
export class ScimSsoRequiredError extends UserError {
	constructor() {
		super('Turn on SAML or OIDC single sign-on before you enable SCIM provisioning.');
	}
}
