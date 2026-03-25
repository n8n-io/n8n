import { stringify } from "./utils/fast-safe-stringify/index.js";
import { load } from "@langchain/core/load";

//#region src/serde/jsonplus.ts
function isLangChainSerializedObject(value) {
	return value !== null && value.lc === 1 && value.type === "constructor" && Array.isArray(value.id);
}
/**
* The replacer in stringify does not allow delegation to built-in LangChain
* serialization methods, and instead immediately calls `.toJSON()` and
* continues to stringify subfields.
*
* We therefore must start from the most nested elements in the input and
* deserialize upwards rather than top-down.
*/
async function _reviver(value) {
	if (value && typeof value === "object") if (Array.isArray(value)) {
		const revivedArray = await Promise.all(value.map((item) => _reviver(item)));
		return revivedArray;
	} else {
		const revivedObj = {};
		for (const [k, v] of Object.entries(value)) revivedObj[k] = await _reviver(v);
		if (revivedObj.lc === 2 && revivedObj.type === "undefined") return void 0;
		else if (revivedObj.lc === 2 && revivedObj.type === "constructor" && Array.isArray(revivedObj.id)) try {
			const constructorName = revivedObj.id[revivedObj.id.length - 1];
			let constructor;
			switch (constructorName) {
				case "Set":
					constructor = Set;
					break;
				case "Map":
					constructor = Map;
					break;
				case "RegExp":
					constructor = RegExp;
					break;
				case "Error":
					constructor = Error;
					break;
				default: return revivedObj;
			}
			if (revivedObj.method) return constructor[revivedObj.method](...revivedObj.args || []);
			else return new constructor(...revivedObj.args || []);
		} catch (error) {
			return revivedObj;
		}
		else if (isLangChainSerializedObject(revivedObj)) return load(JSON.stringify(revivedObj));
		return revivedObj;
	}
	return value;
}
function _encodeConstructorArgs(constructor, method, args, kwargs) {
	return {
		lc: 2,
		type: "constructor",
		id: [constructor.name],
		method: method ?? null,
		args: args ?? [],
		kwargs: kwargs ?? {}
	};
}
function _default(obj) {
	if (obj === void 0) return {
		lc: 2,
		type: "undefined"
	};
	else if (obj instanceof Set || obj instanceof Map) return _encodeConstructorArgs(obj.constructor, void 0, [Array.from(obj)]);
	else if (obj instanceof RegExp) return _encodeConstructorArgs(RegExp, void 0, [obj.source, obj.flags]);
	else if (obj instanceof Error) return _encodeConstructorArgs(obj.constructor, void 0, [obj.message]);
	else if (obj?.lg_name === "Send") return {
		node: obj.node,
		args: obj.args
	};
	else return obj;
}
var JsonPlusSerializer = class {
	_dumps(obj) {
		const encoder = new TextEncoder();
		return encoder.encode(stringify(obj, (_, value) => {
			return _default(value);
		}));
	}
	async dumpsTyped(obj) {
		if (obj instanceof Uint8Array) return ["bytes", obj];
		else return ["json", this._dumps(obj)];
	}
	async _loads(data) {
		const parsed = JSON.parse(data);
		return _reviver(parsed);
	}
	async loadsTyped(type, data) {
		if (type === "bytes") return typeof data === "string" ? new TextEncoder().encode(data) : data;
		else if (type === "json") return this._loads(typeof data === "string" ? data : new TextDecoder().decode(data));
		else throw new Error(`Unknown serialization type: ${type}`);
	}
};

//#endregion
export { JsonPlusSerializer };
//# sourceMappingURL=jsonplus.js.map