import { createHash } from 'crypto';

import type { AuthPayload, IAuthProvider } from '../../helpers/interfaces';

export class LocalAuthProvider implements IAuthProvider {
	constructor(
		private readonly user: string,
		private readonly password: string,
	) {}

	getPayload(): AuthPayload {
		const password = createHash('md5').update(this.password).digest('hex').toUpperCase();

		return {
			provider: 'local',
			credentials: {
				user: this.user,
				password,
			},
		};
	}
}
