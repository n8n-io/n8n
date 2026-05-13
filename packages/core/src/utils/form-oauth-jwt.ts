import { randomBytes } from 'crypto';
import { sign, verify, type SignOptions, type VerifyOptions } from 'jsonwebtoken';

export const FORM_OAUTH_ISSUER = 'n8n-form-oauth';

export const FORM_OAUTH_STATE_JWT_EXPIRY_SEC = 60 * 10;

export const FORM_OAUTH_SESSION_JWT_EXPIRY_SEC = 60 * 60;

export interface FormOauthStateJwtPayload {
	nonce: string;
	wf: string;
	node: string;
}

export interface FormOauthSessionJwtPayload {
	wf: string;
	node: string;
	claims: Record<string, unknown>;
}

export type FormOauthJwtPayload = FormOauthStateJwtPayload | FormOauthSessionJwtPayload;

export function signFormOauthJwt<T extends FormOauthJwtPayload>(
	payload: T,
	secret: string,
	expiresInSec: number,
): string {
	const opts: SignOptions = {
		algorithm: 'HS256',
		expiresIn: expiresInSec,
		issuer: FORM_OAUTH_ISSUER,
	};
	return sign({ ...payload }, secret, opts);
}

export function verifyFormOauthJwt<T extends FormOauthJwtPayload>(
	token: string,
	secret: string,
): T | null {
	try {
		const opts: VerifyOptions = { algorithms: ['HS256'], issuer: FORM_OAUTH_ISSUER };
		const decoded = verify(token, secret, opts);
		if (typeof decoded === 'string') return null;
		return decoded as unknown as T;
	} catch {
		return null;
	}
}

export function generateFormOauthNonce(): string {
	return randomBytes(16).toString('hex');
}
