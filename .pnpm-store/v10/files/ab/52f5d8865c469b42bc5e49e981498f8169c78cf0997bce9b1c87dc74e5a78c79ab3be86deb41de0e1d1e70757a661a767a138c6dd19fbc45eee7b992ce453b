//#region src/ui/queue.ts
/**
* Tracks pending server-side runs created via `multitaskStrategy: "enqueue"`.
*
* Uses the same subscribe/getSnapshot pattern as StreamManager
* to integrate with framework-specific reactivity systems.
*/
var PendingRunsTracker = class {
	pending = [];
	listeners = /* @__PURE__ */ new Set();
	/**
	* Add a pending run entry.
	*/
	add(entry) {
		this.pending.push(entry);
		this.notifyListeners();
	}
	/**
	* Remove and return the next pending entry (FIFO).
	*/
	shift() {
		const entry = this.pending.shift();
		if (entry) this.notifyListeners();
		return entry;
	}
	/**
	* Remove a specific entry by ID.
	* @returns true if the entry was found and removed.
	*/
	remove = (id) => {
		const index = this.pending.findIndex((e) => e.id === id);
		if (index === -1) return false;
		this.pending.splice(index, 1);
		this.notifyListeners();
		return true;
	};
	/**
	* Remove all entries from the tracker.
	* @returns The removed entries (for server-side cancellation).
	*/
	removeAll = () => {
		if (this.pending.length === 0) return [];
		const entries = [...this.pending];
		this.pending = [];
		this.notifyListeners();
		return entries;
	};
	/** Read-only snapshot of all pending entries. */
	get entries() {
		return this.pending;
	}
	/** Number of pending entries. */
	get size() {
		return this.pending.length;
	}
	/** Subscribe to state changes. Returns an unsubscribe function. */
	subscribe = (listener) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	/** Snapshot token for useSyncExternalStore compatibility. */
	getSnapshot = () => {
		return this.pending.length;
	};
	notifyListeners() {
		for (const listener of this.listeners) listener();
	}
};
//#endregion
exports.PendingRunsTracker = PendingRunsTracker;

//# sourceMappingURL=queue.cjs.map