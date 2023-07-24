import { Service } from 'typedi';
import * as jwt from 'jsonwebtoken';
import config from '@/config';

@Service()
export class JwtService {
	private readonly userManagementSecret = config.getEnv('userManagement.jwtSecret');

	public signData(payload: object, options: jwt.SignOptions = {}): string {
		return this.sign(payload, this.userManagementSecret, options);
	}

	public verifyToken(token: string, options: jwt.VerifyOptions = {}) {
		return this.verify(token, this.userManagementSecret, options);
	}

	private sign(payload: object, secret: string, options: jwt.SignOptions = {}) {
		return jwt.sign(payload, secret, options);
	}

	private verify(token: string, secret: string, options: jwt.VerifyOptions = {}) {
		return jwt.verify(token, secret, options) as jwt.JwtPayload;
	}
}

export type JwtPayload = jwt.JwtPayload;
