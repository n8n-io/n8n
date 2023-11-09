import { Service } from 'typedi';
import * as jwt from 'jsonwebtoken';
import config from '@/config';

@Service()
export class JwtService {
	private readonly userManagementSecret = config.getEnv('userManagement.jwtSecret');

	public signData(payload: object, options: jwt.SignOptions = {}): string {
		return jwt.sign(payload, this.userManagementSecret, options);
	}

	public verifyToken<T = JwtPayload>(token: string, options: jwt.VerifyOptions = {}) {
		return jwt.verify(token, this.userManagementSecret, options) as T;
	}
}

export type JwtPayload = jwt.JwtPayload;
