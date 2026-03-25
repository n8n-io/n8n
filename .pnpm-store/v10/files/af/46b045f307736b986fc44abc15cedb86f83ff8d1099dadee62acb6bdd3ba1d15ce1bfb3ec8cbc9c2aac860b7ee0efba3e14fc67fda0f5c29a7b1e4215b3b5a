
//#region src/store/base.ts
/**
* Error thrown when an invalid namespace is provided.
*/
var InvalidNamespaceError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "InvalidNamespaceError";
	}
};
/**
* Validates the provided namespace.
* @param namespace The namespace to validate.
* @throws {InvalidNamespaceError} If the namespace is invalid.
*/
function validateNamespace(namespace) {
	if (namespace.length === 0) throw new InvalidNamespaceError("Namespace cannot be empty.");
	for (const label of namespace) {
		if (typeof label !== "string") throw new InvalidNamespaceError(`Invalid namespace label '${label}' found in ${namespace}. Namespace labels must be strings, but got ${typeof label}.`);
		if (label.includes(".")) throw new InvalidNamespaceError(`Invalid namespace label '${label}' found in ${namespace}. Namespace labels cannot contain periods ('.').`);
		if (label === "") throw new InvalidNamespaceError(`Namespace labels cannot be empty strings. Got ${label} in ${namespace}`);
	}
	if (namespace[0] === "langgraph") throw new InvalidNamespaceError(`Root label for namespace cannot be "langgraph". Got: ${namespace}`);
}
/**
* Utility function to get text at a specific JSON path
*/
function getTextAtPath(obj, path) {
	const parts = path.split(".");
	let current = obj;
	for (const part of parts) {
		if (part.includes("[")) {
			const [arrayName, indexStr] = part.split("[");
			const index = indexStr.replace("]", "");
			if (!current[arrayName]) return [];
			if (index === "*") {
				const results = [];
				for (const item of current[arrayName]) if (typeof item === "string") results.push(item);
				return results;
			}
			const idx = parseInt(index, 10);
			if (Number.isNaN(idx)) return [];
			current = current[arrayName][idx];
		} else current = current[part];
		if (current === void 0) return [];
	}
	return typeof current === "string" ? [current] : [];
}
/**
* Tokenizes a JSON path into parts
*/
function tokenizePath(path) {
	return path.split(".");
}
/**
* Abstract base class for persistent key-value stores.
*
* Stores enable persistence and memory that can be shared across threads,
* scoped to user IDs, assistant IDs, or other arbitrary namespaces.
*
* Features:
* - Hierarchical namespaces for organization
* - Key-value storage with metadata
* - Vector similarity search (if configured)
* - Filtering and pagination
*/
var BaseStore = class {
	/**
	* Retrieve a single item by its namespace and key.
	*
	* @param namespace Hierarchical path for the item
	* @param key Unique identifier within the namespace
	* @returns Promise resolving to the item or null if not found
	*/
	async get(namespace, key) {
		return (await this.batch([{
			namespace,
			key
		}]))[0];
	}
	/**
	* Search for items within a namespace prefix.
	* Supports both metadata filtering and vector similarity search.
	*
	* @param namespacePrefix Hierarchical path prefix to search within
	* @param options Search options for filtering and pagination
	* @returns Promise resolving to list of matching items with relevance scores
	*
	* @example
	* // Search with filters
	* await store.search(["documents"], {
	*   filter: { type: "report", status: "active" },
	*   limit: 5,
	*   offset: 10
	* });
	*
	* // Vector similarity search
	* await store.search(["users", "content"], {
	*   query: "technical documentation about APIs",
	*   limit: 20
	* });
	*/
	async search(namespacePrefix, options = {}) {
		const { filter, limit = 10, offset = 0, query } = options;
		return (await this.batch([{
			namespacePrefix,
			filter,
			limit,
			offset,
			query
		}]))[0];
	}
	/**
	* Store or update an item.
	*
	* @param namespace Hierarchical path for the item
	* @param key Unique identifier within the namespace
	* @param value Object containing the item's data
	* @param index Optional indexing configuration
	*
	* @example
	* // Simple storage
	* await store.put(["docs"], "report", { title: "Annual Report" });
	*
	* // With specific field indexing
	* await store.put(
	*   ["docs"],
	*   "report",
	*   {
	*     title: "Q4 Report",
	*     chapters: [{ content: "..." }, { content: "..." }]
	*   },
	*   ["title", "chapters[*].content"]
	* );
	*/
	async put(namespace, key, value, index) {
		validateNamespace(namespace);
		await this.batch([{
			namespace,
			key,
			value,
			index
		}]);
	}
	/**
	* Delete an item from the store.
	*
	* @param namespace Hierarchical path for the item
	* @param key Unique identifier within the namespace
	*/
	async delete(namespace, key) {
		await this.batch([{
			namespace,
			key,
			value: null
		}]);
	}
	/**
	* List and filter namespaces in the store.
	* Used to explore data organization and navigate the namespace hierarchy.
	*
	* @param options Options for listing namespaces
	* @returns Promise resolving to list of namespace paths
	*
	* @example
	* // List all namespaces under "documents"
	* await store.listNamespaces({
	*   prefix: ["documents"],
	*   maxDepth: 2
	* });
	*
	* // List namespaces ending with "v1"
	* await store.listNamespaces({
	*   suffix: ["v1"],
	*   limit: 50
	* });
	*/
	async listNamespaces(options = {}) {
		const { prefix, suffix, maxDepth, limit = 100, offset = 0 } = options;
		const matchConditions = [];
		if (prefix) matchConditions.push({
			matchType: "prefix",
			path: prefix
		});
		if (suffix) matchConditions.push({
			matchType: "suffix",
			path: suffix
		});
		return (await this.batch([{
			matchConditions: matchConditions.length ? matchConditions : void 0,
			maxDepth,
			limit,
			offset
		}]))[0];
	}
	/**
	* Start the store. Override if initialization is needed.
	*/
	start() {}
	/**
	* Stop the store. Override if cleanup is needed.
	*/
	stop() {}
};

//#endregion
exports.BaseStore = BaseStore;
exports.InvalidNamespaceError = InvalidNamespaceError;
exports.getTextAtPath = getTextAtPath;
exports.tokenizePath = tokenizePath;
//# sourceMappingURL=base.cjs.map