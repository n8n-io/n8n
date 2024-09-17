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

	async function transaction(
		mode: 'readonly' | 'readwrite',
		action: (store: IDBObjectStore, db: IDBDatabase) => Promise<void> | void,
	): Promise<void> {
		const db = await openDb();
		const tx = db.transaction(storeName, mode);
		const store = tx.objectStore(storeName);

		await action(store, db);

		return await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => {
				db.close();
				resolve();
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

	return { getItem, removeItem, setItem, clear };
}
