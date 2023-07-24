import { Service } from 'typedi';
import * as jwt from 'jsonwebtoken';

@Service()
export class JwtBaseService {
	protected sign(payload: object, secret: string, options: jwt.SignOptions = {}): string {
		return jwt.sign(payload, secret, options);
	}

	protected verify(token: string, secret: string, options: jwt.VerifyOptions = {}) {
		return jwt.verify(token, secret, options) as jwt.JwtPayload;
	}
}

export type JwtPayload = jwt.JwtPayload;

export type SignInOptions = jwt.SignOptions;

export type VerifyOptions = jwt.VerifyOptions;
