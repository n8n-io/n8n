import type { AuthPayload, IAuthProvider } from '../../helpers/interfaces';

export class TokenAuthProvider implements IAuthProvider {
	constructor(private readonly token: string) {}

	getPayload(): AuthPayload {
		return {
			provider: 'token',
			credentials: { token: this.token },
		};
	}
}
