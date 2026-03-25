const require_base = require('./base.cjs');
const require_utils = require('./utils.cjs');

//#region src/store/memory.ts
/**
* In-memory key-value store with optional vector search.
*
* A lightweight store implementation using JavaScript Maps. Supports basic
* key-value operations and vector search when configured with embeddings.
*
* @example
* ```typescript
* // Basic key-value storage
* const store = new InMemoryStore();
* await store.put(["users", "123"], "prefs", { theme: "dark" });
* const item = await store.get(["users", "123"], "prefs");
*
* // Vector search with embeddings
* import { OpenAIEmbeddings } from "@langchain/openai";
* const store = new InMemoryStore({
*   index: {
*     dims: 1536,
*     embeddings: new OpenAIEmbeddings({ modelName: "text-embedding-3-small" }),
*   }
* });
*
* // Store documents
* await store.put(["docs"], "doc1", { text: "Python tutorial" });
* await store.put(["docs"], "doc2", { text: "TypeScript guide" });
*
* // Search by similarity
* const results = await store.search(["docs"], { query: "python programming" });
* ```
*
* **Warning**: This store keeps all data in memory. Data is lost when the process exits.
* For persistence, use a database-backed store.
*/
var InMemoryStore = class extends require_base.BaseStore {
	data = /* @__PURE__ */ new Map();
	vectors = /* @__PURE__ */ new Map();
	_indexConfig;
	constructor(options) {
		super();
		if (options?.index) this._indexConfig = {
			...options.index,
			__tokenizedFields: (options.index.fields ?? ["$"]).map((p) => [p, p === "$" ? [p] : require_utils.tokenizePath(p)])
		};
	}
	async batch(operations) {
		const results = [];
		const putOps = /* @__PURE__ */ new Map();
		const searchOps = /* @__PURE__ */ new Map();
		for (let i = 0; i < operations.length; i += 1) {
			const op = operations[i];
			if ("key" in op && "namespace" in op && !("value" in op)) results.push(this.getOperation(op));
			else if ("namespacePrefix" in op) {
				const candidates = this.filterItems(op);
				searchOps.set(i, [op, candidates]);
				results.push(null);
			} else if ("value" in op) {
				const key = `${op.namespace.join(":")}:${op.key}`;
				putOps.set(key, op);
				results.push(null);
			} else if ("matchConditions" in op) results.push(this.listNamespacesOperation(op));
		}
		if (searchOps.size > 0) if (this._indexConfig?.embeddings) {
			const queries = /* @__PURE__ */ new Set();
			for (const [op] of searchOps.values()) if (op.query) queries.add(op.query);
			const queryEmbeddings = queries.size > 0 ? await Promise.all(Array.from(queries).map((q) => this._indexConfig.embeddings.embedQuery(q))) : [];
			const queryVectors = Object.fromEntries(Array.from(queries).map((q, i) => [q, queryEmbeddings[i]]));
			for (const [i, [op, candidates]] of searchOps.entries()) if (op.query && queryVectors[op.query]) {
				const queryVector = queryVectors[op.query];
				const scoredResults = this.scoreResults(candidates, queryVector, op.offset ?? 0, op.limit ?? 10);
				results[i] = scoredResults;
			} else results[i] = this.paginateResults(candidates.map((item) => ({
				...item,
				score: void 0
			})), op.offset ?? 0, op.limit ?? 10);
		} else for (const [i, [op, candidates]] of searchOps.entries()) results[i] = this.paginateResults(candidates.map((item) => ({
			...item,
			score: void 0
		})), op.offset ?? 0, op.limit ?? 10);
		if (putOps.size > 0 && this._indexConfig?.embeddings) {
			const toEmbed = this.extractTexts(Array.from(putOps.values()));
			if (Object.keys(toEmbed).length > 0) {
				const embeddings = await this._indexConfig.embeddings.embedDocuments(Object.keys(toEmbed));
				this.insertVectors(toEmbed, embeddings);
			}
		}
		for (const op of putOps.values()) this.putOperation(op);
		return results;
	}
	getOperation(op) {
		const namespaceKey = op.namespace.join(":");
		const item = this.data.get(namespaceKey)?.get(op.key);
		return item ?? null;
	}
	putOperation(op) {
		const namespaceKey = op.namespace.join(":");
		if (!this.data.has(namespaceKey)) this.data.set(namespaceKey, /* @__PURE__ */ new Map());
		const namespaceMap = this.data.get(namespaceKey);
		if (op.value === null) namespaceMap.delete(op.key);
		else {
			const now = /* @__PURE__ */ new Date();
			if (namespaceMap.has(op.key)) {
				const item = namespaceMap.get(op.key);
				item.value = op.value;
				item.updatedAt = now;
			} else namespaceMap.set(op.key, {
				value: op.value,
				key: op.key,
				namespace: op.namespace,
				createdAt: now,
				updatedAt: now
			});
		}
	}
	listNamespacesOperation(op) {
		const allNamespaces = Array.from(this.data.keys()).map((ns) => ns.split(":"));
		let namespaces = allNamespaces;
		if (op.matchConditions && op.matchConditions.length > 0) namespaces = namespaces.filter((ns) => op.matchConditions.every((condition) => this.doesMatch(condition, ns)));
		if (op.maxDepth !== void 0) namespaces = Array.from(new Set(namespaces.map((ns) => ns.slice(0, op.maxDepth).join(":")))).map((ns) => ns.split(":"));
		namespaces.sort((a, b) => a.join(":").localeCompare(b.join(":")));
		return namespaces.slice(op.offset ?? 0, (op.offset ?? 0) + (op.limit ?? namespaces.length));
	}
	doesMatch(matchCondition, key) {
		const { matchType, path } = matchCondition;
		if (matchType === "prefix") {
			if (path.length > key.length) return false;
			return path.every((pElem, index) => {
				const kElem = key[index];
				return pElem === "*" || kElem === pElem;
			});
		} else if (matchType === "suffix") {
			if (path.length > key.length) return false;
			return path.every((pElem, index) => {
				const kElem = key[key.length - path.length + index];
				return pElem === "*" || kElem === pElem;
			});
		}
		throw new Error(`Unsupported match type: ${matchType}`);
	}
	filterItems(op) {
		const candidates = [];
		for (const [namespace, items] of this.data.entries()) if (namespace.startsWith(op.namespacePrefix.join(":"))) candidates.push(...items.values());
		let filteredCandidates = candidates;
		if (op.filter) filteredCandidates = candidates.filter((item) => Object.entries(op.filter).every(([key, value]) => require_utils.compareValues(item.value[key], value)));
		return filteredCandidates;
	}
	scoreResults(candidates, queryVector, offset = 0, limit = 10) {
		const flatItems = [];
		const flatVectors = [];
		const scoreless = [];
		for (const item of candidates) {
			const vectors = this.getVectors(item);
			if (vectors.length) for (const vector of vectors) {
				flatItems.push(item);
				flatVectors.push(vector);
			}
			else scoreless.push(item);
		}
		const scores = this.cosineSimilarity(queryVector, flatVectors);
		const sortedResults = scores.map((score, i) => [score, flatItems[i]]).sort((a, b) => b[0] - a[0]);
		const seen = /* @__PURE__ */ new Set();
		const kept = [];
		for (const [score, item] of sortedResults) {
			const key = `${item.namespace.join(":")}:${item.key}`;
			if (seen.has(key)) continue;
			const ix = seen.size;
			if (ix >= offset + limit) break;
			if (ix < offset) {
				seen.add(key);
				continue;
			}
			seen.add(key);
			kept.push([score, item]);
		}
		if (scoreless.length && kept.length < limit) for (const item of scoreless.slice(0, limit - kept.length)) {
			const key = `${item.namespace.join(":")}:${item.key}`;
			if (!seen.has(key)) {
				seen.add(key);
				kept.push([void 0, item]);
			}
		}
		return kept.map(([score, item]) => ({
			...item,
			score
		}));
	}
	paginateResults(results, offset, limit) {
		return results.slice(offset, offset + limit);
	}
	extractTexts(ops) {
		if (!ops.length || !this._indexConfig) return {};
		const toEmbed = {};
		for (const op of ops) if (op.value !== null && op.index !== false) {
			const paths = op.index === null || op.index === void 0 ? this._indexConfig.__tokenizedFields ?? [] : op.index.map((ix) => [ix, require_utils.tokenizePath(ix)]);
			for (const [path, field] of paths) {
				const texts = require_utils.getTextAtPath(op.value, field);
				if (texts.length) if (texts.length > 1) texts.forEach((text, i) => {
					if (!toEmbed[text]) toEmbed[text] = [];
					toEmbed[text].push([
						op.namespace,
						op.key,
						`${path}.${i}`
					]);
				});
				else {
					if (!toEmbed[texts[0]]) toEmbed[texts[0]] = [];
					toEmbed[texts[0]].push([
						op.namespace,
						op.key,
						path
					]);
				}
			}
		}
		return toEmbed;
	}
	insertVectors(texts, embeddings) {
		for (const [text, metadata] of Object.entries(texts)) {
			const embedding = embeddings.shift();
			if (!embedding) throw new Error(`No embedding found for text: ${text}`);
			for (const [namespace, key, field] of metadata) {
				const namespaceKey = namespace.join(":");
				if (!this.vectors.has(namespaceKey)) this.vectors.set(namespaceKey, /* @__PURE__ */ new Map());
				const namespaceMap = this.vectors.get(namespaceKey);
				if (!namespaceMap.has(key)) namespaceMap.set(key, /* @__PURE__ */ new Map());
				const itemMap = namespaceMap.get(key);
				itemMap.set(field, embedding);
			}
		}
	}
	getVectors(item) {
		const namespaceKey = item.namespace.join(":");
		const itemKey = item.key;
		if (!this.vectors.has(namespaceKey)) return [];
		const namespaceMap = this.vectors.get(namespaceKey);
		if (!namespaceMap.has(itemKey)) return [];
		const itemMap = namespaceMap.get(itemKey);
		const vectors = Array.from(itemMap.values());
		if (!vectors.length) return [];
		return vectors;
	}
	cosineSimilarity(X, Y) {
		if (!Y.length) return [];
		const dotProducts = Y.map((vector) => vector.reduce((acc, val, i) => acc + val * X[i], 0));
		const magnitude1 = Math.sqrt(X.reduce((acc, val) => acc + val * val, 0));
		const magnitudes2 = Y.map((vector) => Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0)));
		return dotProducts.map((dot, i) => {
			const magnitude2 = magnitudes2[i];
			return magnitude1 && magnitude2 ? dot / (magnitude1 * magnitude2) : 0;
		});
	}
	get indexConfig() {
		return this._indexConfig;
	}
};
/** @deprecated Alias for InMemoryStore */
var MemoryStore = class extends InMemoryStore {};

//#endregion
exports.InMemoryStore = InMemoryStore;
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memory.cjs.map