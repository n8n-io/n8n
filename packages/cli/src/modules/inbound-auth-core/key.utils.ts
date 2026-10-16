import { type Jwk } from '@n8n/inbound-auth';

import { createPublicKey } from 'node:crypto';

export const getPublicKeyFromJwk = (jwks: Array<Jwk>, kid: string, usage: string = 'sig') => {
	const foundKey = jwks
		.filter((key) => key.use === usage || !key.use)
		.find((key) => key.kid === kid);

	if (!foundKey) {
		return undefined;
	}
	return createPublicKey({
		key: foundKey,
		format: 'jwk',
	});
};
