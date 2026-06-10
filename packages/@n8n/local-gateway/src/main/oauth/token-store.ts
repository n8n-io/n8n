import { safeStorage } from 'electron';
import Store from 'electron-store';

/** The persisted, signed-in session. Token fields are encrypted at rest when possible. */
export interface PersistedSession {
	instanceUrl: string;
	accessToken: string;
	refreshToken?: string;
	/** Access-token expiry as epoch milliseconds, when the server reported `expires_in`. */
	expiresAt?: number;
}

interface OAuthStoreSchema {
	/** The active session, JSON-serialized and (when available) safeStorage-encrypted. */
	session?: string;
	/** Last successfully signed-in instance URL. Plaintext: it's not a secret, and it must outlive the session. */
	lastInstanceUrl?: string;
}

/**
 * Persists the active OAuth session via electron-store. Tokens are wrapped with
 * the OS keychain (`safeStorage`) when encryption is available, falling back to
 * plaintext otherwise. No client registry: the client id is a seeded constant.
 */
export class TokenStore {
	private readonly store = new Store<OAuthStoreSchema>({ name: 'oauth' });

	getSession(): PersistedSession | null {
		const raw = this.store.get('session');
		if (!raw) return null;
		try {
			return JSON.parse(decrypt(raw)) as PersistedSession;
		} catch {
			return null;
		}
	}

	setSession(session: PersistedSession): void {
		this.store.set('session', encrypt(JSON.stringify(session)));
	}

	/** Deliberately keeps `lastInstanceUrl`, so the sign-in form can prefill after sign-out. */
	clearSession(): void {
		this.store.delete('session');
	}

	getLastInstanceUrl(): string | null {
		return this.store.get('lastInstanceUrl') ?? null;
	}

	setLastInstanceUrl(instanceUrl: string): void {
		this.store.set('lastInstanceUrl', instanceUrl);
	}
}

/** Prefix marking a value as safeStorage-encrypted base64 (vs plaintext fallback). */
const ENCRYPTED_PREFIX = 'enc:';

function encrypt(value: string): string {
	if (!safeStorage.isEncryptionAvailable()) return value;
	return ENCRYPTED_PREFIX + safeStorage.encryptString(value).toString('base64');
}

function decrypt(value: string): string {
	if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
	const buffer = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), 'base64');
	return safeStorage.decryptString(buffer);
}
