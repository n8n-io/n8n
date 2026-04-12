import { UserError } from 'n8n-workflow';

import type { IAuthProvider } from '../../helpers/interfaces';
import { LocalAuthProvider } from './LocalAuthProvider';
import { TokenAuthProvider } from './TokenAuthProvider';

export function createAuthProvider(credentials: Record<string, unknown>): IAuthProvider {
	const { authType, user, password, token } = credentials;

	switch (authType) {
		case 'local':
			return new LocalAuthProvider(String(user), String(password));
		case 'token':
			return new TokenAuthProvider(String(token));
		default:
			throw new UserError(`Unsupported auth type: ${String(authType)}`);
	}
}
