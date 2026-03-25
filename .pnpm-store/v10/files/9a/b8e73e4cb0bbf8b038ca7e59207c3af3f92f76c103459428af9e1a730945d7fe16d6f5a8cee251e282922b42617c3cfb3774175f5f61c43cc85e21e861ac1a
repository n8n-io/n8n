import { keyFromJson, mapKeys } from "./map_keys.js";
import { isEscapedObject, unescapeValue } from "./validation.js";
import { get_lc_unique_name } from "./serializable.js";
import { getEnvironmentVariable } from "../utils/env.js";
import { optionalImportEntrypoints } from "./import_constants.js";
import { import_map_exports } from "./import_map.js";
//#region src/load/index.ts
/**
* Load LangChain objects from JSON strings or objects.
*
* **WARNING: `load()` deserializes data by instantiating classes and invoking
* constructors. Never call `load()` on untrusted or user-supplied input.**
* Doing so can lead to insecure deserialization — including arbitrary class
* instantiation, secret exfiltration, and server-side request forgery (SSRF).
* Only deserialize data that originates from a trusted source you control.
*
* ## How it works
*
* Each `Serializable` LangChain object has a unique identifier (its "class path"),
* which is a list of strings representing the module path and class name. For example:
*
* - `AIMessage` -> `["langchain_core", "messages", "ai", "AIMessage"]`
* - `ChatPromptTemplate` -> `["langchain_core", "prompts", "chat", "ChatPromptTemplate"]`
*
* When deserializing, the class path is validated against supported namespaces.
*
* ## Security model
*
* The `secretsFromEnv` parameter controls whether secrets can be loaded from environment
* variables:
*
* - `false` (default): Secrets must be provided in `secretsMap`. If a secret is not
*   found, `null` is returned instead of loading from environment variables.
* - `true`: If a secret is not found in `secretsMap`, it will be loaded from
*   environment variables. Use this only in trusted environments.
*
* ### Hardening recommendations
*
* - **Never enable `secretsFromEnv`** unless the serialized data is fully trusted.
*   A crafted payload can reference arbitrary environment variable names, leaking
*   secrets to an attacker-controlled class constructor.
* - **Keep `secretsMap` minimal.** Only include the specific secrets the serialized
*   object actually needs.
* - **Keep `importMap` / `optionalImportsMap` as small and static as possible.**
*   Each entry widens the set of classes an attacker can instantiate. Never
*   populate these maps from user input.
*
* ### Injection protection (escape-based)
*
* During serialization, plain objects that contain an `'lc'` key are escaped by wrapping
* them: `{"__lc_escaped__": {...}}`. During deserialization, escaped objects are unwrapped
* and returned as plain objects, NOT instantiated as LC objects.
*
* This is an allowlist approach: only objects explicitly produced by
* `Serializable.toJSON()` (which are NOT escaped) are treated as LC objects;
* everything else is user data.
*
* @module
*/
/**
* Default maximum recursion depth for deserialization.
* This provides protection against DoS attacks via deeply nested structures.
*/
const DEFAULT_MAX_DEPTH = 50;
function combineAliasesAndInvert(constructor) {
	const aliases = {};
	for (let current = constructor; current && current.prototype; current = Object.getPrototypeOf(current)) Object.assign(aliases, Reflect.get(current.prototype, "lc_aliases"));
	return Object.entries(aliases).reduce((acc, [key, value]) => {
		acc[value] = key;
		return acc;
	}, {});
}
/**
* Recursively revive a value, handling escape markers and LC objects.
*
* This function handles:
* 1. Escaped dicts - unwrapped and returned as plain objects
* 2. LC secret objects - resolved from secretsMap or env
* 3. LC constructor objects - instantiated
* 4. Regular objects/arrays - recursed into
*/
async function reviver(value) {
	const { optionalImportsMap, optionalImportEntrypoints: optionalImportEntrypoints$1, importMap, secretsMap, secretsFromEnv, path, depth, maxDepth } = this;
	const pathStr = path.join(".");
	if (depth > maxDepth) throw new Error(`Maximum recursion depth (${maxDepth}) exceeded during deserialization. This may indicate a malicious payload or you may need to increase maxDepth.`);
	if (typeof value !== "object" || value == null) return value;
	if (Array.isArray(value)) return Promise.all(value.map((v, i) => reviver.call({
		...this,
		path: [...path, `${i}`],
		depth: depth + 1
	}, v)));
	const record = value;
	if (isEscapedObject(record)) return unescapeValue(record);
	if ("lc" in record && "type" in record && "id" in record && record.lc === 1 && record.type === "secret") {
		const [key] = record.id;
		if (key in secretsMap) return secretsMap[key];
		else if (secretsFromEnv) {
			const secretValueInEnv = getEnvironmentVariable(key);
			if (secretValueInEnv) return secretValueInEnv;
		}
		throw new Error(`Missing secret "${key}" at ${pathStr}`);
	}
	if ("lc" in record && "type" in record && "id" in record && record.lc === 1 && record.type === "not_implemented") {
		const serialized = record;
		const str = JSON.stringify(serialized);
		throw new Error(`Trying to load an object that doesn't implement serialization: ${pathStr} -> ${str}`);
	}
	if ("lc" in record && "type" in record && "id" in record && "kwargs" in record && record.lc === 1 && record.type === "constructor") {
		const serialized = record;
		const str = JSON.stringify(serialized);
		const [name, ...namespaceReverse] = serialized.id.slice().reverse();
		const namespace = namespaceReverse.reverse();
		const importMaps = {
			langchain_core: import_map_exports,
			langchain: importMap
		};
		let module = null;
		const optionalImportNamespaceAliases = [namespace.join("/")];
		if (namespace[0] === "langchain_community") optionalImportNamespaceAliases.push(["langchain", ...namespace.slice(1)].join("/"));
		const matchingNamespaceAlias = optionalImportNamespaceAliases.find((alias) => alias in optionalImportsMap);
		if (optionalImportEntrypoints.concat(optionalImportEntrypoints$1).includes(namespace.join("/")) || matchingNamespaceAlias) if (matchingNamespaceAlias !== void 0) module = await optionalImportsMap[matchingNamespaceAlias];
		else throw new Error(`Missing key "${namespace.join("/")}" for ${pathStr} in load(optionalImportsMap={})`);
		else {
			let finalImportMap;
			if (namespace[0] === "langchain" || namespace[0] === "langchain_core") {
				finalImportMap = importMaps[namespace[0]];
				namespace.shift();
			} else throw new Error(`Invalid namespace: ${pathStr} -> ${str}`);
			if (namespace.length === 0) throw new Error(`Invalid namespace: ${pathStr} -> ${str}`);
			let importMapKey;
			do {
				importMapKey = namespace.join("__");
				if (importMapKey in finalImportMap) break;
				else namespace.pop();
			} while (namespace.length > 0);
			if (importMapKey in finalImportMap) module = finalImportMap[importMapKey];
		}
		if (typeof module !== "object" || module === null) throw new Error(`Invalid namespace: ${pathStr} -> ${str}`);
		const builder = module[name] ?? Object.values(module).find((v) => typeof v === "function" && get_lc_unique_name(v) === name);
		if (typeof builder !== "function") throw new Error(`Invalid identifer: ${pathStr} -> ${str}`);
		const instance = new builder(mapKeys(await reviver.call({
			...this,
			path: [...path, "kwargs"],
			depth: depth + 1
		}, serialized.kwargs), keyFromJson, combineAliasesAndInvert(builder)));
		Object.defineProperty(instance.constructor, "name", { value: name });
		return instance;
	}
	const result = {};
	for (const [key, val] of Object.entries(record)) result[key] = await reviver.call({
		...this,
		path: [...path, key],
		depth: depth + 1
	}, val);
	return result;
}
/**
* Load a LangChain object from a JSON string.
*
* **WARNING — insecure deserialization risk.** This function instantiates
* classes and invokes constructors based on the contents of `text`. If `text`
* originates from an untrusted source, an attacker can craft a payload that
* instantiates arbitrary allowed classes with attacker-controlled arguments,
* potentially causing secret exfiltration, SSRF, or other side effects.
*
* Only call `load()` on data you have produced yourself or received from a
* fully trusted origin (e.g., your own database). **Never deserialize
* user-supplied or network-received JSON without independent validation.**
*
* @param text - The JSON string to parse and load.
* @param options - Options for loading. See {@link LoadOptions} for security guidance.
* @returns The loaded LangChain object.
*
* @example
* ```typescript
* import { load } from "@langchain/core/load";
* import { AIMessage } from "@langchain/core/messages";
*
* // Basic usage - secrets must be provided explicitly
* const msg = await load<AIMessage>(jsonString);
*
* // With secrets from a map (preferred over secretsFromEnv)
* const msg = await load<AIMessage>(jsonString, {
*   secretsMap: { OPENAI_API_KEY: "sk-..." }
* });
*
* // Allow loading secrets from environment — ONLY for fully trusted data
* const msg = await load<AIMessage>(jsonString, {
*   secretsFromEnv: true
* });
* ```
*/
async function load(text, options) {
	const json = JSON.parse(text);
	const context = {
		optionalImportsMap: options?.optionalImportsMap ?? {},
		optionalImportEntrypoints: options?.optionalImportEntrypoints ?? [],
		secretsMap: options?.secretsMap ?? {},
		secretsFromEnv: options?.secretsFromEnv ?? false,
		importMap: options?.importMap ?? {},
		path: ["$"],
		depth: 0,
		maxDepth: options?.maxDepth ?? DEFAULT_MAX_DEPTH
	};
	return reviver.call(context, json);
}
//#endregion
export { load };

//# sourceMappingURL=index.js.map