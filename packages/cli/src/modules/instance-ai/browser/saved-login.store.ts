import { nanoid } from 'nanoid';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * PROTOTYPE (saved logins): one Browserbase context holding one site's sign-in, owned by
 * one user. The UI calls it a saved login, never a context.
 */
export interface SavedLogin {
	id: string;
	userId: string;
	/** Registrable domain, e.g. `example.com`. */
	site: string;
	label: string;
	/** Browserbase region the context was saved in. It only works there. */
	region: string;
	contextId: string;
	createdAt: string;
	lastUsedAt?: string;
	lastVerifiedAt?: string;
}

export type NewSavedLogin = Pick<SavedLogin, 'userId' | 'site' | 'label' | 'region' | 'contextId'>;

/**
 * Where saved logins live. Hosted, the AI gateway owns them and n8n never sees a context
 * id. Self-hosted with the user's own Browserbase key (BYOK), n8n stores them.
 */
export interface SavedLoginStore {
	list(userId: string): Promise<SavedLogin[]>;
	/** The user's saved login for a site, the most recently used one if there are several. */
	findBySite(userId: string, site: string): Promise<SavedLogin | undefined>;
	add(login: NewSavedLogin): Promise<SavedLogin>;
	touch(id: string, fields: Pick<SavedLogin, 'lastUsedAt' | 'lastVerifiedAt'>): Promise<void>;
	/** Removes the user's saved login and returns it, or undefined if they have none by that id. */
	remove(userId: string, id: string): Promise<SavedLogin | undefined>;
}

/** Encrypts the context id at rest, with the instance's encryption key (Q5.3). */
export interface ContextIdCipher {
	encrypt(contextId: string): Promise<string>;
	decrypt(stored: string): Promise<string>;
}

/**
 * PROTOTYPE: the BYOK store as a JSON file in the n8n folder, standing in for a table.
 * Writes are serialised, and each write replaces the file in one rename.
 */
export class JsonFileSavedLoginStore implements SavedLoginStore {
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly file: string,
		private readonly cipher: ContextIdCipher,
	) {}

	async list(userId: string): Promise<SavedLogin[]> {
		const all = await this.read();
		return await Promise.all(
			all.filter((l) => l.userId === userId).map(async (l) => await this.reveal(l)),
		);
	}

	async findBySite(userId: string, site: string): Promise<SavedLogin | undefined> {
		const matches = (await this.read())
			.filter((l) => l.userId === userId && l.site === site)
			.sort((a, b) => (b.lastUsedAt ?? b.createdAt).localeCompare(a.lastUsedAt ?? a.createdAt));
		return matches[0] ? await this.reveal(matches[0]) : undefined;
	}

	async add(login: NewSavedLogin): Promise<SavedLogin> {
		const saved: SavedLogin = { ...login, id: nanoid(), createdAt: new Date().toISOString() };
		const stored = { ...saved, contextId: await this.cipher.encrypt(saved.contextId) };
		await this.update((all) => [...all, stored]);
		return saved;
	}

	async touch(id: string, fields: Pick<SavedLogin, 'lastUsedAt' | 'lastVerifiedAt'>) {
		const defined = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
		await this.update((all) => all.map((l) => (l.id === id ? { ...l, ...defined } : l)));
	}

	async remove(userId: string, id: string): Promise<SavedLogin | undefined> {
		let removed: SavedLogin | undefined;
		await this.update((all) => {
			removed = all.find((l) => l.id === id && l.userId === userId);
			return all.filter((l) => l !== removed);
		});
		return removed ? await this.reveal(removed) : undefined;
	}

	private async reveal(stored: SavedLogin): Promise<SavedLogin> {
		return { ...stored, contextId: await this.cipher.decrypt(stored.contextId) };
	}

	private async read(): Promise<SavedLogin[]> {
		try {
			return JSON.parse(await readFile(this.file, 'utf8')) as SavedLogin[];
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
			throw error;
		}
	}

	private async update(change: (all: SavedLogin[]) => SavedLogin[]): Promise<void> {
		const next = this.queue.then(async () => {
			const all = change(await this.read());
			await mkdir(dirname(this.file), { recursive: true });
			const temp = `${this.file}.${process.pid}.tmp`;
			await writeFile(temp, JSON.stringify(all, null, '\t'), { mode: 0o600 });
			await rename(temp, this.file);
		});
		this.queue = next.catch(() => undefined);
		await next;
	}
}
