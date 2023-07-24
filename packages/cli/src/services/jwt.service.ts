import { Service } from 'typedi';
import * as jwt from 'jsonwebtoken';

@Service()
export class JwtService {
	public sign(payload: object, secret: string, options: jwt.SignOptions = {}): string {
		return jwt.sign(payload, secret, options);
	}

	public verify(token: string, secret: string, options: jwt.VerifyOptions = {}) {
		return jwt.verify(token, secret, options) as JwtPayload;
	}
}

export type JwtPayload = jwt.JwtPayload;
