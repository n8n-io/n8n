import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { keyToJson, mapKeys } from "./map_keys.js";
import { escapeIfNeeded } from "./validation.js";
//#region src/load/serializable.ts
var serializable_exports = /* @__PURE__ */ __exportAll({
	Serializable: () => Serializable,
	get_lc_unique_name: () => get_lc_unique_name
});
function shallowCopy(obj) {
	return Array.isArray(obj) ? [...obj] : { ...obj };
}
function replaceSecrets(root, secretsMap) {
	const result = shallowCopy(root);
	for (const [path, secretId] of Object.entries(secretsMap)) {
		const [last, ...partsReverse] = path.split(".").reverse();
		let current = result;
		for (const part of partsReverse.reverse()) {
			if (current[part] === void 0) break;
			current[part] = shallowCopy(current[part]);
			current = current[part];
		}
		if (current[last] !== void 0) current[last] = {
			lc: 1,
			type: "secret",
			id: [secretId]
		};
	}
	return result;
}
/**
* Get a unique name for the module, rather than parent class implementations.
* Should not be subclassed, subclass lc_name above instead.
*/
function get_lc_unique_name(serializableClass) {
	const parentClass = Object.getPrototypeOf(serializableClass);
	if (typeof serializableClass.lc_name === "function" && (typeof parentClass.lc_name !== "function" || serializableClass.lc_name() !== parentClass.lc_name())) return serializableClass.lc_name();
	else return serializableClass.name;
}
var Serializable = class Serializable {
	lc_serializable = false;
	lc_kwargs;
	/**
	* The name of the serializable. Override to provide an alias or
	* to preserve the serialized module name in minified environments.
	*
	* Implemented as a static method to support loading logic.
	*/
	static lc_name() {
		return this.name;
	}
	/**
	* The final serialized identifier for the module.
	*/
	get lc_id() {
		return [...this.lc_namespace, get_lc_unique_name(this.constructor)];
	}
	/**
	* A map of secrets, which will be omitted from serialization.
	* Keys are paths to the secret in constructor args, e.g. "foo.bar.baz".
	* Values are the secret ids, which will be used when deserializing.
	*/
	get lc_secrets() {}
	/**
	* A map of additional attributes to merge with constructor args.
	* Keys are the attribute names, e.g. "foo".
	* Values are the attribute values, which will be serialized.
	* These attributes need to be accepted by the constructor as arguments.
	*/
	get lc_attributes() {}
	/**
	* A map of aliases for constructor args.
	* Keys are the attribute names, e.g. "foo".
	* Values are the alias that will replace the key in serialization.
	* This is used to eg. make argument names match Python.
	*/
	get lc_aliases() {}
	/**
	* A manual list of keys that should be serialized.
	* If not overridden, all fields passed into the constructor will be serialized.
	*/
	get lc_serializable_keys() {}
	constructor(kwargs, ..._args) {
		if (this.lc_serializable_keys !== void 0) this.lc_kwargs = Object.fromEntries(Object.entries(kwargs || {}).filter(([key]) => this.lc_serializable_keys?.includes(key)));
		else this.lc_kwargs = kwargs ?? {};
	}
	toJSON() {
		if (!this.lc_serializable) return this.toJSONNotImplemented();
		if (this.lc_kwargs instanceof Serializable || typeof this.lc_kwargs !== "object" || Array.isArray(this.lc_kwargs)) return this.toJSONNotImplemented();
		const aliases = {};
		const secrets = {};
		const kwargs = Object.keys(this.lc_kwargs).reduce((acc, key) => {
			acc[key] = key in this ? this[key] : this.lc_kwargs[key];
			return acc;
		}, {});
		for (let current = Object.getPrototypeOf(this); current; current = Object.getPrototypeOf(current)) {
			Object.assign(aliases, Reflect.get(current, "lc_aliases", this));
			Object.assign(secrets, Reflect.get(current, "lc_secrets", this));
			Object.assign(kwargs, Reflect.get(current, "lc_attributes", this));
		}
		Object.keys(secrets).forEach((keyPath) => {
			let read = this;
			let write = kwargs;
			const [last, ...partsReverse] = keyPath.split(".").reverse();
			for (const key of partsReverse.reverse()) {
				if (!(key in read) || read[key] === void 0) return;
				if (!(key in write) || write[key] === void 0) {
					if (typeof read[key] === "object" && read[key] != null) write[key] = {};
					else if (Array.isArray(read[key])) write[key] = [];
				}
				read = read[key];
				write = write[key];
			}
			if (last in read && read[last] !== void 0) write[last] = write[last] || read[last];
		});
		const escapedKwargs = {};
		const pathSet = /* @__PURE__ */ new WeakSet();
		pathSet.add(this);
		for (const [key, value] of Object.entries(kwargs)) escapedKwargs[key] = escapeIfNeeded(value, pathSet);
		const processedKwargs = mapKeys(Object.keys(secrets).length ? replaceSecrets(escapedKwargs, secrets) : escapedKwargs, keyToJson, aliases);
		return {
			lc: 1,
			type: "constructor",
			id: this.lc_id,
			kwargs: processedKwargs
		};
	}
	toJSONNotImplemented() {
		return {
			lc: 1,
			type: "not_implemented",
			id: this.lc_id
		};
	}
};
//#endregion
export { Serializable, get_lc_unique_name, serializable_exports };

//# sourceMappingURL=serializable.js.map