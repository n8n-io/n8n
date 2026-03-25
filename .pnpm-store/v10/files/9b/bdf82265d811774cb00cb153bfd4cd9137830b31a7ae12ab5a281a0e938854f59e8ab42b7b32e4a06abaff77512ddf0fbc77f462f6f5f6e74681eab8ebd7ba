const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_indexing = require_rolldown_runtime.__toESM(require("@langchain/core/indexing"));

//#region src/indexes/memory.ts
var memory_exports = {};
require_rolldown_runtime.__export(memory_exports, { InMemoryRecordManager: () => InMemoryRecordManager });
var InMemoryRecordManager = class extends __langchain_core_indexing.RecordManager {
	lc_namespace = [
		"langchain",
		"recordmanagers",
		"memory"
	];
	records;
	constructor() {
		super();
		this.records = /* @__PURE__ */ new Map();
	}
	async createSchema() {
		return Promise.resolve();
	}
	async getTime() {
		return Promise.resolve(Date.now());
	}
	async update(keys, updateOptions) {
		const updatedAt = await this.getTime();
		const { timeAtLeast, groupIds: _groupIds } = updateOptions ?? {};
		if (timeAtLeast && updatedAt < timeAtLeast) throw new Error(`Time sync issue with database ${updatedAt} < ${timeAtLeast}`);
		const groupIds = _groupIds ?? keys.map(() => null);
		if (groupIds.length !== keys.length) throw new Error(`Number of keys (${keys.length}) does not match number of group_ids ${groupIds.length})`);
		keys.forEach((key, i) => {
			const old = this.records.get(key);
			if (old) old.updatedAt = updatedAt;
			else this.records.set(key, {
				updatedAt,
				groupId: groupIds[i]
			});
		});
	}
	async exists(keys) {
		return Promise.resolve(keys.map((key) => this.records.has(key)));
	}
	async listKeys(options) {
		const { before, after, limit, groupIds } = options ?? {};
		const filteredRecords = Array.from(this.records).filter(([_key, doc]) => {
			const isBefore = !before || doc.updatedAt <= before;
			const isAfter = !after || doc.updatedAt >= after;
			const belongsToGroup = !groupIds || groupIds.includes(doc.groupId);
			return isBefore && isAfter && belongsToGroup;
		});
		return Promise.resolve(filteredRecords.map(([key]) => key).slice(0, limit ?? filteredRecords.length));
	}
	async deleteKeys(keys) {
		keys.forEach((key) => this.records.delete(key));
		return Promise.resolve();
	}
};

//#endregion
exports.InMemoryRecordManager = InMemoryRecordManager;
Object.defineProperty(exports, 'memory_exports', {
  enumerable: true,
  get: function () {
    return memory_exports;
  }
});
//# sourceMappingURL=memory.cjs.map