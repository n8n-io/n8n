import { Service } from 'typedi';
import config from '@/config';
import { JwtBaseService } from '@/services/jwt-base.service';
import type { SignInOptions, VerifyOptions } from '@/services/jwt-base.service';
export type * from '@/services/jwt-base.service';

@Service()
export class JwtService extends JwtBaseService {
	private readonly userManagementSecret = config.getEnv('userManagement.jwtSecret');

	public signData(payload: object, options: SignInOptions = {}): string {
		return this.sign(payload, this.userManagementSecret, options);
	}

	public verifyToken(token: string, options: VerifyOptions = {}) {
		return this.verify(token, this.userManagementSecret, options);
	}
}
