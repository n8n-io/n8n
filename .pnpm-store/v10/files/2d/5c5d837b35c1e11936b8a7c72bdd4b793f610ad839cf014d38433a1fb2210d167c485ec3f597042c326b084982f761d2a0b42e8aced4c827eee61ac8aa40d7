const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_load_serializable = require_rolldown_runtime.__toESM(require("@langchain/core/load/serializable"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const jsonpointer = require_rolldown_runtime.__toESM(require("jsonpointer"));

//#region src/tools/json.ts
/**
* Represents a JSON object in the LangChain framework. Provides methods
* to get keys and values from the JSON object.
*/
var JsonSpec = class extends __langchain_core_load_serializable.Serializable {
	lc_namespace = [
		"langchain",
		"tools",
		"json"
	];
	obj;
	maxValueLength = 4e3;
	constructor(obj, max_value_length = 4e3) {
		super(...arguments);
		this.obj = obj;
		this.maxValueLength = max_value_length;
	}
	/**
	* Retrieves all keys at a given path in the JSON object.
	* @param input The path to the keys in the JSON object, provided as a string in JSON pointer syntax.
	* @returns A string containing all keys at the given path, separated by commas.
	*/
	getKeys(input) {
		const pointer = jsonpointer.default.compile(input);
		const res = pointer.get(this.obj);
		if (typeof res === "object" && !Array.isArray(res) && res !== null) return Object.keys(res).map((i) => i.replaceAll("~", "~0").replaceAll("/", "~1")).join(", ");
		throw new Error(`Value at ${input} is not a dictionary, get the value directly instead.`);
	}
	/**
	* Retrieves the value at a given path in the JSON object.
	* @param input The path to the value in the JSON object, provided as a string in JSON pointer syntax.
	* @returns The value at the given path in the JSON object, as a string. If the value is a large dictionary or exceeds the maximum length, a message is returned instead.
	*/
	getValue(input) {
		const pointer = jsonpointer.default.compile(input);
		const res = pointer.get(this.obj);
		if (res === null || res === void 0) throw new Error(`Value at ${input} is null or undefined.`);
		const str = typeof res === "object" ? JSON.stringify(res) : res.toString();
		if (typeof res === "object" && !Array.isArray(res) && str.length > this.maxValueLength) return `Value is a large dictionary, should explore its keys directly.`;
		if (str.length > this.maxValueLength) return `${str.slice(0, this.maxValueLength)}...`;
		return str;
	}
};
/**
* A tool in the LangChain framework that lists all keys at a given path
* in a JSON object.
*/
var JsonListKeysTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "JsonListKeysTool";
	}
	name = "json_list_keys";
	jsonSpec;
	constructor(fields) {
		if (!("jsonSpec" in fields)) fields = { jsonSpec: fields };
		super(fields);
		this.jsonSpec = fields.jsonSpec;
	}
	/** @ignore */
	async _call(input) {
		try {
			return this.jsonSpec.getKeys(input);
		} catch (error) {
			return `${error}`;
		}
	}
	description = `Can be used to list all keys at a given path.
    Before calling this you should be SURE that the path to this exists.
    The input is a text representation of the path to the json as json pointer syntax (e.g. /key1/0/key2).`;
};
/**
* A tool in the LangChain framework that retrieves the value at a given
* path in a JSON object.
*/
var JsonGetValueTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "JsonGetValueTool";
	}
	name = "json_get_value";
	constructor(jsonSpec) {
		super();
		this.jsonSpec = jsonSpec;
	}
	/** @ignore */
	async _call(input) {
		try {
			return this.jsonSpec.getValue(input);
		} catch (error) {
			return `${error}`;
		}
	}
	description = `Can be used to see value in string format at a given path.
    Before calling this you should be SURE that the path to this exists.
    The input is a text representation of the path to the json as json pointer syntax (e.g. /key1/0/key2).`;
};

//#endregion
exports.JsonGetValueTool = JsonGetValueTool;
exports.JsonListKeysTool = JsonListKeysTool;
exports.JsonSpec = JsonSpec;
//# sourceMappingURL=json.cjs.map