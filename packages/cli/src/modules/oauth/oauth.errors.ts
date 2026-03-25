import { AuthError } from '@/errors/response-errors/auth.error';

export class JWTVerificationError extends AuthError {
	constructor() {
		super('JWT Verification Failed');
		this.name = 'JWTVerificationError';
	}
}

export class AccessTokenNotFoundError extends AuthError {
	constructor() {
		super('Access Token Not Found in Database');
		this.name = 'AccessTokenNotFoundError';
	}
}
