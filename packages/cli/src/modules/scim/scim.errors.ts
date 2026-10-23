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

/** Filter expression is not supported. Maps to HTTP 400 with scimType "invalidFilter". */
export class ScimInvalidFilterError extends UserError {
	constructor(filter: string) {
		super(`Unsupported filter expression: ${filter}`);
	}
}

/** An attribute value is not acceptable (e.g. unknown role). Maps to HTTP 400 with scimType "invalidValue". */
export class ScimInvalidValueError extends UserError {
	constructor(detail: string) {
		super(detail);
	}
}
