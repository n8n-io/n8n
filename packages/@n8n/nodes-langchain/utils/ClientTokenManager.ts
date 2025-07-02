import { Mutex } from 'async-mutex';

export class ClientTokenManager {
	// Map to store client ID to access token mappings
	private tokenMap: Map<string, string> = new Map<string, string>();
	private mutex = new Mutex();

	/**
	 * Store an access token for a client ID
	 * @param clientId the client identifier
	 * @param accessToken the JWT token to store
	 */
	public async storeToken(clientId: string, accessToken: string): Promise<void> {
		const release = await this.mutex.acquire();
		try {
			this.tokenMap.set(clientId, accessToken);
		} finally {
			release();
		}
	}

	/**
	 * Retrieve an access token for a client ID
	 * @param clientId the client identifier
	 * @return the stored access token, or undefined if not found
	 */
	public async getToken(clientId: string): Promise<string | undefined> {
		const release = await this.mutex.acquire();
		try {
			return this.tokenMap.get(clientId);
		} finally {
			release();
		}
	}

	/**
	 * Check if a valid token exists for a client
	 * If the token has expired or will expire in next 2 minutes, removes it and returns false
	 */
	public async hasToken(clientId: string): Promise<boolean> {
		const release = await this.mutex.acquire();
		try {
			const token = this.tokenMap.get(clientId);
			if (!token) {
				return false;
			}

			const expTime = this.parseTokenExpiration(token);
			const twoMinutesInMs = 2 * 60 * 1000;

			// Check if token is expired or will expire in next 2 minutes
			if (
				expTime &&
				(Date.now() >= expTime * 1000 || expTime * 1000 - Date.now() < twoMinutesInMs)
			) {
				// Token has expired or will expire soon, remove it
				console.log(
					'Token for client ' + clientId + ' has expired or will' + ' expire soon, removing it.',
				);
				this.tokenMap.delete(clientId);
				return false;
			}

			return true;
		} finally {
			release();
		}
	}

	/**
	 * Remove a token
	 */
	public async removeToken(clientId: string): Promise<string | undefined> {
		const release = await this.mutex.acquire();
		try {
			const token = this.tokenMap.get(clientId);
			this.tokenMap.delete(clientId);
			return token;
		} finally {
			release();
		}
	}

	/**
	 * Parse JWT token and extract the expiration time
	 * @param token JWT token to parse
	 * @returns the expiration timestamp or undefined if parsing failed
	 */
	private parseTokenExpiration(token: string): number | undefined {
		try {
			// JWT format: header.payload.signature
			const parts = token.split('.');
			if (parts.length !== 3) return undefined;

			// Decode base64url-encoded payload
			const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');

			// Add padding if needed
			const pad = base64.length % 4;
			const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;

			// Parse the payload
			const payload = JSON.parse(Buffer.from(paddedBase64, 'base64').toString('utf8'));

			return payload.exp;
		} catch (error) {
			console.error('Error parsing JWT token:', error);
			return undefined;
		}
	}
}
