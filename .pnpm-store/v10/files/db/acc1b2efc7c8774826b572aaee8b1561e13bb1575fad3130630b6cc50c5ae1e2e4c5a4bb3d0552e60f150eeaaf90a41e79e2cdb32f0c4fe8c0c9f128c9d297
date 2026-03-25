const require_base = require('./base.cjs');

//#region src/cache/memory.ts
var InMemoryCache = class extends require_base.BaseCache {
	cache = {};
	async get(keys) {
		if (!keys.length) return [];
		const now = Date.now();
		return (await Promise.all(keys.map(async (fullKey) => {
			const [namespace, key] = fullKey;
			const strNamespace = namespace.join(",");
			if (strNamespace in this.cache && key in this.cache[strNamespace]) {
				const cached = this.cache[strNamespace][key];
				if (cached.exp == null || now < cached.exp) {
					const value = await this.serde.loadsTyped(cached.enc, cached.val);
					return [{
						key: fullKey,
						value
					}];
				} else delete this.cache[strNamespace][key];
			}
			return [];
		}))).flat();
	}
	async set(pairs) {
		const now = Date.now();
		for (const { key: fullKey, value, ttl } of pairs) {
			const [namespace, key] = fullKey;
			const strNamespace = namespace.join(",");
			const [enc, val] = await this.serde.dumpsTyped(value);
			const exp = ttl != null ? ttl * 1e3 + now : null;
			this.cache[strNamespace] ??= {};
			this.cache[strNamespace][key] = {
				enc,
				val,
				exp
			};
		}
	}
	async clear(namespaces) {
		if (!namespaces.length) {
			this.cache = {};
			return;
		}
		for (const namespace of namespaces) {
			const strNamespace = namespace.join(",");
			if (strNamespace in this.cache) delete this.cache[strNamespace];
		}
	}
};

//#endregion
exports.InMemoryCache = InMemoryCache;
//# sourceMappingURL=memory.cjs.map