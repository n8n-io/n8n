import { Serializable } from "../load/serializable.js";
import { isDataContentBlock } from "./content/data.js";
import { convertToV1FromAnthropicInput } from "./block_translators/anthropic.js";
import { convertToV1FromDataContent } from "./block_translators/data.js";
import { convertToV1FromChatCompletionsInput } from "./block_translators/openai.js";
import { isMessage } from "./message.js";
import { convertToFormattedString } from "./format.js";
//#region src/messages/base.ts
/** @internal */
const MESSAGE_SYMBOL = Symbol.for("langchain.message");
function mergeContent(firstContent, secondContent) {
	if (typeof firstContent === "string") {
		if (firstContent === "") return secondContent;
		if (typeof secondContent === "string") return firstContent + secondContent;
		else if (Array.isArray(secondContent) && secondContent.length === 0) return firstContent;
		else if (Array.isArray(secondContent) && secondContent.some((c) => isDataContentBlock(c))) return [{
			type: "text",
			source_type: "text",
			text: firstContent
		}, ...secondContent];
		else return [{
			type: "text",
			text: firstContent
		}, ...secondContent];
	} else if (Array.isArray(secondContent)) return _mergeLists(firstContent, secondContent) ?? [...firstContent, ...secondContent];
	else if (secondContent === "") return firstContent;
	else if (Array.isArray(firstContent) && firstContent.some((c) => isDataContentBlock(c))) return [...firstContent, {
		type: "file",
		source_type: "text",
		text: secondContent
	}];
	else return [...firstContent, {
		type: "text",
		text: secondContent
	}];
}
/**
* 'Merge' two statuses. If either value passed is 'error', it will return 'error'. Else
* it will return 'success'.
*
* @param {"success" | "error" | undefined} left The existing value to 'merge' with the new value.
* @param {"success" | "error" | undefined} right The new value to 'merge' with the existing value
* @returns {"success" | "error"} The 'merged' value.
*/
function _mergeStatus(left, right) {
	if (left === "error" || right === "error") return "error";
	return "success";
}
function stringifyWithDepthLimit(obj, depthLimit) {
	function helper(obj, currentDepth) {
		if (typeof obj !== "object" || obj === null || obj === void 0) return obj;
		if (currentDepth >= depthLimit) {
			if (Array.isArray(obj)) return "[Array]";
			return "[Object]";
		}
		if (Array.isArray(obj)) return obj.map((item) => helper(item, currentDepth + 1));
		const result = {};
		for (const key of Object.keys(obj)) result[key] = helper(obj[key], currentDepth + 1);
		return result;
	}
	return JSON.stringify(helper(obj, 0), null, 2);
}
/**
* Base class for all types of messages in a conversation. It includes
* properties like `content`, `name`, and `additional_kwargs`. It also
* includes methods like `toDict()` and `_getType()`.
*/
var BaseMessage = class extends Serializable {
	lc_namespace = ["langchain_core", "messages"];
	lc_serializable = true;
	get lc_aliases() {
		return {
			additional_kwargs: "additional_kwargs",
			response_metadata: "response_metadata"
		};
	}
	[MESSAGE_SYMBOL] = true;
	id;
	/** @inheritdoc */
	name;
	content;
	additional_kwargs;
	response_metadata;
	/**
	* @deprecated Use .getType() instead or import the proper typeguard.
	* For example:
	*
	* ```ts
	* import { isAIMessage } from "@langchain/core/messages";
	*
	* const message = new AIMessage("Hello!");
	* isAIMessage(message); // true
	* ```
	*/
	_getType() {
		return this.type;
	}
	/**
	* @deprecated Use .type instead
	* The type of the message.
	*/
	getType() {
		return this._getType();
	}
	constructor(arg) {
		const fields = typeof arg === "string" || Array.isArray(arg) ? { content: arg } : arg;
		if (!fields.additional_kwargs) fields.additional_kwargs = {};
		if (!fields.response_metadata) fields.response_metadata = {};
		super(fields);
		this.name = fields.name;
		if (fields.content === void 0 && fields.contentBlocks !== void 0) {
			this.content = fields.contentBlocks;
			this.response_metadata = {
				output_version: "v1",
				...fields.response_metadata
			};
		} else if (fields.content !== void 0) {
			this.content = fields.content ?? [];
			this.response_metadata = fields.response_metadata;
		} else {
			this.content = [];
			this.response_metadata = fields.response_metadata;
		}
		this.additional_kwargs = fields.additional_kwargs;
		this.id = fields.id;
	}
	/** Get text content of the message. */
	get text() {
		if (typeof this.content === "string") return this.content;
		if (!Array.isArray(this.content)) return "";
		return this.content.map((c) => {
			if (typeof c === "string") return c;
			if (c.type === "text") return c.text;
			return "";
		}).join("");
	}
	get contentBlocks() {
		const blocks = typeof this.content === "string" ? [{
			type: "text",
			text: this.content
		}] : this.content;
		return [
			convertToV1FromDataContent,
			convertToV1FromChatCompletionsInput,
			convertToV1FromAnthropicInput
		].reduce((blocks, step) => step(blocks), blocks);
	}
	toDict() {
		return {
			type: this.getType(),
			data: this.toJSON().kwargs
		};
	}
	static lc_name() {
		return "BaseMessage";
	}
	get _printableFields() {
		return {
			id: this.id,
			content: this.content,
			name: this.name,
			additional_kwargs: this.additional_kwargs,
			response_metadata: this.response_metadata
		};
	}
	static isInstance(obj) {
		return typeof obj === "object" && obj !== null && MESSAGE_SYMBOL in obj && obj[MESSAGE_SYMBOL] === true && isMessage(obj);
	}
	_updateId(value) {
		this.id = value;
		this.lc_kwargs.id = value;
	}
	get [Symbol.toStringTag]() {
		return this.constructor.lc_name();
	}
	[Symbol.for("nodejs.util.inspect.custom")](depth) {
		if (depth === null) return this;
		const printable = stringifyWithDepthLimit(this._printableFields, Math.max(4, depth));
		return `${this.constructor.lc_name()} ${printable}`;
	}
	toFormattedString(format = "pretty") {
		return convertToFormattedString(this, format);
	}
};
function isOpenAIToolCallArray(value) {
	return Array.isArray(value) && value.every((v) => typeof v.index === "number");
}
/**
* Default keys that should be preserved (not merged) when concatenating message chunks.
* These are identification and timestamp fields that shouldn't be summed or concatenated.
*/
const DEFAULT_MERGE_IGNORE_KEYS = [
	"index",
	"created",
	"timestamp"
];
function _mergeDicts(left, right, options) {
	/**
	* The keys to ignore during merging.
	*/
	const ignoreKeys = options?.ignoreKeys ?? DEFAULT_MERGE_IGNORE_KEYS;
	if (left == null && right == null) return;
	if (left == null || right == null) return left ?? right;
	const merged = { ...left };
	for (const [key, value] of Object.entries(right)) if (merged[key] == null) merged[key] = value;
	else if (value == null) continue;
	else if (typeof merged[key] !== typeof value || Array.isArray(merged[key]) !== Array.isArray(value)) throw new Error(`field[${key}] already exists in the message chunk, but with a different type.`);
	else if (typeof merged[key] === "string") if (key === "type") continue;
	else if ([
		"id",
		"name",
		"output_version",
		"model_provider"
	].includes(key)) {
		if (value) merged[key] = value;
	} else if (ignoreKeys.includes(key)) continue;
	else merged[key] += value;
	else if (typeof merged[key] === "number") {
		if (ignoreKeys.includes(key)) continue;
		merged[key] = merged[key] + value;
	} else if (typeof merged[key] === "object" && !Array.isArray(merged[key])) merged[key] = _mergeDicts(merged[key], value, options);
	else if (Array.isArray(merged[key])) merged[key] = _mergeLists(merged[key], value, options);
	else if (merged[key] === value) continue;
	else console.warn(`field[${key}] already exists in this message chunk and value has unsupported type.`);
	return merged;
}
function isMergeableIndex(index) {
	return typeof index === "number" || typeof index === "string";
}
function hasMergeableIndex(value) {
	if (typeof value !== "object" || value === null) return false;
	if (!("index" in value)) return false;
	return isMergeableIndex(value.index);
}
function _mergeLists(left, right, options) {
	if (left == null && right == null) return;
	else if (left == null || right == null) return left || right;
	else {
		const merged = [...left];
		for (const item of right) if (hasMergeableIndex(item)) {
			const toMerge = merged.findIndex((leftItem) => {
				if (!hasMergeableIndex(leftItem)) return false;
				const indiciesMatch = leftItem.index === item.index;
				const leftHasId = leftItem.id != null && leftItem.id !== "";
				const rightHasId = item.id != null && item.id !== "";
				const idsMatch = leftHasId && rightHasId && leftItem.id === item.id;
				return indiciesMatch && (idsMatch || !leftHasId || !rightHasId);
			});
			if (toMerge !== -1 && typeof merged[toMerge] === "object" && merged[toMerge] !== null) merged[toMerge] = _mergeDicts(merged[toMerge], item, options);
			else merged.push(item);
		} else if (typeof item === "object" && item !== null && "text" in item && item.text === "") continue;
		else merged.push(item);
		return merged;
	}
}
function _mergeObj(left, right, options) {
	if (left == null && right == null) return;
	if (left == null || right == null) return left ?? right;
	else if (typeof left !== typeof right) throw new Error(`Cannot merge objects of different types.\nLeft ${typeof left}\nRight ${typeof right}`);
	else if (typeof left === "string" && typeof right === "string") return left + right;
	else if (Array.isArray(left) && Array.isArray(right)) return _mergeLists(left, right, options);
	else if (typeof left === "object" && typeof right === "object") return _mergeDicts(left, right, options);
	else if (left === right) return left;
	else throw new Error(`Can not merge objects of different types.\nLeft ${left}\nRight ${right}`);
}
/**
* Represents a chunk of a message, which can be concatenated with other
* message chunks. It includes a method `_merge_kwargs_dict()` for merging
* additional keyword arguments from another `BaseMessageChunk` into this
* one. It also overrides the `__add__()` method to support concatenation
* of `BaseMessageChunk` instances.
*/
var BaseMessageChunk = class BaseMessageChunk extends BaseMessage {
	static isInstance(obj) {
		if (!super.isInstance(obj)) return false;
		let proto = Object.getPrototypeOf(obj);
		while (proto !== null) {
			if (proto === BaseMessageChunk.prototype) return true;
			proto = Object.getPrototypeOf(proto);
		}
		return false;
	}
};
function _isMessageFieldWithRole(x) {
	return typeof x.role === "string";
}
/**
* @deprecated Use {@link BaseMessage.isInstance} instead
*/
function isBaseMessage(messageLike) {
	return typeof messageLike?._getType === "function";
}
/**
* @deprecated Use {@link BaseMessageChunk.isInstance} instead
*/
function isBaseMessageChunk(messageLike) {
	return BaseMessageChunk.isInstance(messageLike);
}
//#endregion
export { BaseMessage, BaseMessageChunk, DEFAULT_MERGE_IGNORE_KEYS, _isMessageFieldWithRole, _mergeDicts, _mergeLists, _mergeObj, _mergeStatus, isBaseMessage, isBaseMessageChunk, isOpenAIToolCallArray, mergeContent };

//# sourceMappingURL=base.js.map