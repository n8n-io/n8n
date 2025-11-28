export type IndexedDbCache = Awaited<ReturnType<typeof indexedDbCache>>;

export async function indexedDbCache(dbName: string, storeName: string) {
	let cache: Record<string, string> = {};

	void (await loadCache());

	async function loadCache() {
		await transaction('readonly', async (store, db) => {
			return await new Promise<void>((resolve, reject) => {
				const request = store.openCursor();

				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

					if (cursor) {
						cache[cursor.key as string] = cursor.value.value;
						cursor.continue();
					} else {
						db.close();
						resolve();
					}
				};

				request.onerror = (event) => {
					db.close();
					reject(event);
				};
			});
		});
	}

	async function openDb(): Promise<IDBDatabase> {
		return await new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName, 1);
			request.onupgradeneeded = () => {
				request.result.createObjectStore(storeName, { keyPath: 'key' });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	function setItem(key: string, value: string): void {
		cache[key] = value;
		void persistToIndexedDB(key, value);
	}

	function getItem(key: string): string | null {
		return cache[key] ?? null;
	}

	function removeItem(key: string): void {
		delete cache[key];
		void deleteFromIndexedDB(key);
	}

	function clear(): void {
		cache = {};
		void clearIndexedDB();
	}

	async function getAllWithPrefix(prefix: string) {
		const keyRange = IDBKeyRange.bound(prefix, prefix + '\uffff', false, false);

		const results: Record<string, string> = {};
		return await transaction('readonly', async (store) => {
			return await new Promise<Record<string, string>>((resolve, reject) => {
				const request = store.openCursor(keyRange);

				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

					if (cursor) {
						results[cursor.key as string] = cursor.value.value;
						cursor.continue();
					} else {
						resolve(results);
					}
				};

				request.onerror = () => {
					reject(request.error);
				};
			});
		});
	}

	async function transaction<T>(
		mode: 'readonly' | 'readwrite',
		action: (store: IDBObjectStore, db: IDBDatabase) => Promise<T> | T,
	): Promise<T> {
		const db = await openDb();
		const tx = db.transaction(storeName, mode);
		const store = tx.objectStore(storeName);

		const result = await action(store, db);

		return await new Promise<T>((resolve, reject) => {
			tx.oncomplete = () => {
				db.close();
				resolve(result);
			};
			tx.onerror = () => {
				db.close();
				reject(tx.error);
			};
		});
	}

	async function persistToIndexedDB(key: string, value: string) {
		await transaction('readwrite', (store) => {
			store.put({ key, value });
		});
	}

	async function deleteFromIndexedDB(key: string) {
		await transaction('readwrite', (store) => {
			store.delete(key);
		});
	}

	async function clearIndexedDB() {
		await transaction('readwrite', (store) => {
			store.clear();
		});
	}

	return { getItem, removeItem, setItem, clear, getAllWithPrefix };
}
