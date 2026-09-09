import { Service } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';

export const APP_PAGE_TOKEN_TTL_SECONDS = 15 * 60;

const audienceFor = (appId: string) => `app:${appId}`;

/**
 * Signed hand-off between the served page and the runtime API. The page runs on an
 * opaque origin, so it cannot send cookies to `/apps/<ns>/api`; n8n injects this
 * token into `index.html` instead and the SDK sends it back as a bearer token.
 * Signed like the form auth token: HS256 with the instance's hmac secret.
 */
@Service()
export class AppPageTokenService {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	mint(appId: string): string {
		return jwt.sign({}, this.secret, {
			algorithm: 'HS256',
			audience: audienceFor(appId),
			expiresIn: APP_PAGE_TOKEN_TTL_SECONDS,
		});
	}

	/** `false` for anything that does not verify: bad signature, expired, other app. */
	verify(token: string, appId: string): boolean {
		try {
			jwt.verify(token, this.secret, { algorithms: ['HS256'], audience: audienceFor(appId) });
			return true;
		} catch {
			return false;
		}
	}

	private get secret() {
		return this.instanceSettings.hmacSignatureSecret;
	}
}
