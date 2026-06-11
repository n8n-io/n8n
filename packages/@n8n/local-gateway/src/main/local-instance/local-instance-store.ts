import Store from 'electron-store';

import { decrypt, encrypt } from '../oauth/token-store';

/** Generated owner credentials for the embedded local instance. Encrypted at rest when possible. */
export interface LocalOwnerCredentials {
	email: string;
	password: string;
}

interface LocalInstanceStoreSchema {
	/** Owner credentials, JSON-serialized and (when available) safeStorage-encrypted. */
	credentials?: string;
	/** Whether local mode is active: spawn + sign in to the embedded instance on app start. */
	enabled?: boolean;
}

/** Persists the embedded instance's owner credentials and the "local mode" choice. */
export class LocalInstanceStore {
	private readonly store = new Store<LocalInstanceStoreSchema>({ name: 'local-instance' });

	getCredentials(): LocalOwnerCredentials | null {
		const raw = this.store.get('credentials');
		if (!raw) return null;
		try {
			return JSON.parse(decrypt(raw)) as LocalOwnerCredentials;
		} catch {
			return null;
		}
	}

	setCredentials(credentials: LocalOwnerCredentials): void {
		this.store.set('credentials', encrypt(JSON.stringify(credentials)));
	}

	isEnabled(): boolean {
		return this.store.get('enabled') ?? false;
	}

	/** Deliberately keeps the credentials on disable: the instance DB persists, so re-enabling logs back in. */
	setEnabled(enabled: boolean): void {
		this.store.set('enabled', enabled);
	}
}
