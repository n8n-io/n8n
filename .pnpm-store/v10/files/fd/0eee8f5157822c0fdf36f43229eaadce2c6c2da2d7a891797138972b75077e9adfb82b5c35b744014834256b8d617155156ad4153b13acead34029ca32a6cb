import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { PatchError, _deepClone, hasUndefined, isInteger, unescapePathComponent } from "./helpers.js";
//#region src/utils/fast-json-patch/src/core.ts
var core_exports = /* @__PURE__ */ __exportAll({
	JsonPatchError: () => JsonPatchError,
	_areEquals: () => _areEquals,
	applyOperation: () => applyOperation,
	applyPatch: () => applyPatch,
	applyReducer: () => applyReducer,
	deepClone: () => deepClone,
	getValueByPointer: () => getValueByPointer,
	validate: () => validate,
	validator: () => validator
});
const JsonPatchError = PatchError;
const deepClone = _deepClone;
const objOps = {
	add: function(obj, key, document) {
		if (key === "__proto__" || key === "constructor") throw new TypeError("JSON-Patch: modifying `__proto__` or `constructor` prop is banned for security reasons");
		obj[key] = this.value;
		return { newDocument: document };
	},
	remove: function(obj, key, document) {
		if (key === "__proto__" || key === "constructor") throw new TypeError("JSON-Patch: modifying `__proto__` or `constructor` prop is banned for security reasons");
		var removed = obj[key];
		delete obj[key];
		return {
			newDocument: document,
			removed
		};
	},
	replace: function(obj, key, document) {
		if (key === "__proto__" || key === "constructor") throw new TypeError("JSON-Patch: modifying `__proto__` or `constructor` prop is banned for security reasons");
		var removed = obj[key];
		obj[key] = this.value;
		return {
			newDocument: document,
			removed
		};
	},
	move: function(obj, key, document) {
		let removed = getValueByPointer(document, this.path);
		if (removed) removed = _deepClone(removed);
		const originalValue = applyOperation(document, {
			op: "remove",
			path: this.from
		}).removed;
		applyOperation(document, {
			op: "add",
			path: this.path,
			value: originalValue
		});
		return {
			newDocument: document,
			removed
		};
	},
	copy: function(obj, key, document) {
		const valueToCopy = getValueByPointer(document, this.from);
		applyOperation(document, {
			op: "add",
			path: this.path,
			value: _deepClone(valueToCopy)
		});
		return { newDocument: document };
	},
	test: function(obj, key, document) {
		return {
			newDocument: document,
			test: _areEquals(obj[key], this.value)
		};
	},
	_get: function(obj, key, document) {
		this.value = obj[key];
		return { newDocument: document };
	}
};
var arrOps = {
	add: function(arr, i, document) {
		if (isInteger(i)) arr.splice(i, 0, this.value);
		else arr[i] = this.value;
		return {
			newDocument: document,
			index: i
		};
	},
	remove: function(arr, i, document) {
		return {
			newDocument: document,
			removed: arr.splice(i, 1)[0]
		};
	},
	replace: function(arr, i, document) {
		var removed = arr[i];
		arr[i] = this.value;
		return {
			newDocument: document,
			removed
		};
	},
	move: objOps.move,
	copy: objOps.copy,
	test: objOps.test,
	_get: objOps._get
};
/**
* Retrieves a value from a JSON document by a JSON pointer.
* Returns the value.
*
* @param document The document to get the value from
* @param pointer an escaped JSON pointer
* @return The retrieved value
*/
function getValueByPointer(document, pointer) {
	if (pointer == "") return document;
	var getOriginalDestination = {
		op: "_get",
		path: pointer
	};
	applyOperation(document, getOriginalDestination);
	return getOriginalDestination.value;
}
/**
* Apply a single JSON Patch Operation on a JSON document.
* Returns the {newDocument, result} of the operation.
* It modifies the `document` and `operation` objects - it gets the values by reference.
* If you would like to avoid touching your values, clone them:
* `jsonpatch.applyOperation(document, jsonpatch._deepClone(operation))`.
*
* @param document The document to patch
* @param operation The operation to apply
* @param validateOperation `false` is without validation, `true` to use default jsonpatch's validation, or you can pass a `validateOperation` callback to be used for validation.
* @param mutateDocument Whether to mutate the original document or clone it before applying
* @param banPrototypeModifications Whether to ban modifications to `__proto__`, defaults to `true`.
* @return `{newDocument, result}` after the operation
*/
function applyOperation(document, operation, validateOperation = false, mutateDocument = true, banPrototypeModifications = true, index = 0) {
	if (validateOperation) if (typeof validateOperation == "function") validateOperation(operation, 0, document, operation.path);
	else validator(operation, 0);
	if (operation.path === "") {
		let returnValue = { newDocument: document };
		if (operation.op === "add") {
			returnValue.newDocument = operation.value;
			return returnValue;
		} else if (operation.op === "replace") {
			returnValue.newDocument = operation.value;
			returnValue.removed = document;
			return returnValue;
		} else if (operation.op === "move" || operation.op === "copy") {
			returnValue.newDocument = getValueByPointer(document, operation.from);
			if (operation.op === "move") returnValue.removed = document;
			return returnValue;
		} else if (operation.op === "test") {
			returnValue.test = _areEquals(document, operation.value);
			if (returnValue.test === false) throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, document);
			returnValue.newDocument = document;
			return returnValue;
		} else if (operation.op === "remove") {
			returnValue.removed = document;
			returnValue.newDocument = null;
			return returnValue;
		} else if (operation.op === "_get") {
			operation.value = document;
			return returnValue;
		} else if (validateOperation) throw new JsonPatchError("Operation `op` property is not one of operations defined in RFC-6902", "OPERATION_OP_INVALID", index, operation, document);
		else return returnValue;
	} else {
		if (!mutateDocument) document = _deepClone(document);
		const keys = (operation.path || "").split("/");
		let obj = document;
		let t = 1;
		let len = keys.length;
		let existingPathFragment = void 0;
		let key;
		let validateFunction;
		if (typeof validateOperation == "function") validateFunction = validateOperation;
		else validateFunction = validator;
		while (true) {
			key = keys[t];
			if (key && key.indexOf("~") != -1) key = unescapePathComponent(key);
			if (banPrototypeModifications && (key == "__proto__" || key == "prototype" && t > 0 && keys[t - 1] == "constructor")) throw new TypeError("JSON-Patch: modifying `__proto__` or `constructor/prototype` prop is banned for security reasons, if this was on purpose, please set `banPrototypeModifications` flag false and pass it to this function. More info in fast-json-patch README");
			if (validateOperation) {
				if (existingPathFragment === void 0) {
					if (obj[key] === void 0) existingPathFragment = keys.slice(0, t).join("/");
					else if (t == len - 1) existingPathFragment = operation.path;
					if (existingPathFragment !== void 0) validateFunction(operation, 0, document, existingPathFragment);
				}
			}
			t++;
			if (Array.isArray(obj)) {
				if (key === "-") key = obj.length;
				else if (validateOperation && !isInteger(key)) throw new JsonPatchError("Expected an unsigned base-10 integer value, making the new referenced value the array element with the zero-based index", "OPERATION_PATH_ILLEGAL_ARRAY_INDEX", index, operation, document);
				else if (isInteger(key)) key = ~~key;
				if (t >= len) {
					if (validateOperation && operation.op === "add" && key > obj.length) throw new JsonPatchError("The specified index MUST NOT be greater than the number of elements in the array", "OPERATION_VALUE_OUT_OF_BOUNDS", index, operation, document);
					const returnValue = arrOps[operation.op].call(operation, obj, key, document);
					if (returnValue.test === false) throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, document);
					return returnValue;
				}
			} else if (t >= len) {
				const returnValue = objOps[operation.op].call(operation, obj, key, document);
				if (returnValue.test === false) throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, document);
				return returnValue;
			}
			obj = obj[key];
			if (validateOperation && t < len && (!obj || typeof obj !== "object")) throw new JsonPatchError("Cannot perform operation at the desired path", "OPERATION_PATH_UNRESOLVABLE", index, operation, document);
		}
	}
}
/**
* Apply a full JSON Patch array on a JSON document.
* Returns the {newDocument, result} of the patch.
* It modifies the `document` object and `patch` - it gets the values by reference.
* If you would like to avoid touching your values, clone them:
* `jsonpatch.applyPatch(document, jsonpatch._deepClone(patch))`.
*
* @param document The document to patch
* @param patch The patch to apply
* @param validateOperation `false` is without validation, `true` to use default jsonpatch's validation, or you can pass a `validateOperation` callback to be used for validation.
* @param mutateDocument Whether to mutate the original document or clone it before applying
* @param banPrototypeModifications Whether to ban modifications to `__proto__`, defaults to `true`.
* @return An array of `{newDocument, result}` after the patch
*/
function applyPatch(document, patch, validateOperation, mutateDocument = true, banPrototypeModifications = true) {
	if (validateOperation) {
		if (!Array.isArray(patch)) throw new JsonPatchError("Patch sequence must be an array", "SEQUENCE_NOT_AN_ARRAY");
	}
	if (!mutateDocument) document = _deepClone(document);
	const results = new Array(patch.length);
	for (let i = 0, length = patch.length; i < length; i++) {
		results[i] = applyOperation(document, patch[i], validateOperation, true, banPrototypeModifications, i);
		document = results[i].newDocument;
	}
	results.newDocument = document;
	return results;
}
/**
* Apply a single JSON Patch Operation on a JSON document.
* Returns the updated document.
* Suitable as a reducer.
*
* @param document The document to patch
* @param operation The operation to apply
* @return The updated document
*/
function applyReducer(document, operation, index) {
	const operationResult = applyOperation(document, operation);
	if (operationResult.test === false) throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, document);
	return operationResult.newDocument;
}
/**
* Validates a single operation. Called from `jsonpatch.validate`. Throws `JsonPatchError` in case of an error.
* @param {object} operation - operation object (patch)
* @param {number} index - index of operation in the sequence
* @param {object} [document] - object where the operation is supposed to be applied
* @param {string} [existingPathFragment] - comes along with `document`
*/
function validator(operation, index, document, existingPathFragment) {
	if (typeof operation !== "object" || operation === null || Array.isArray(operation)) throw new JsonPatchError("Operation is not an object", "OPERATION_NOT_AN_OBJECT", index, operation, document);
	else if (!objOps[operation.op]) throw new JsonPatchError("Operation `op` property is not one of operations defined in RFC-6902", "OPERATION_OP_INVALID", index, operation, document);
	else if (typeof operation.path !== "string") throw new JsonPatchError("Operation `path` property is not a string", "OPERATION_PATH_INVALID", index, operation, document);
	else if (operation.path.indexOf("/") !== 0 && operation.path.length > 0) throw new JsonPatchError("Operation `path` property must start with \"/\"", "OPERATION_PATH_INVALID", index, operation, document);
	else if ((operation.op === "move" || operation.op === "copy") && typeof operation.from !== "string") throw new JsonPatchError("Operation `from` property is not present (applicable in `move` and `copy` operations)", "OPERATION_FROM_REQUIRED", index, operation, document);
	else if ((operation.op === "add" || operation.op === "replace" || operation.op === "test") && operation.value === void 0) throw new JsonPatchError("Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)", "OPERATION_VALUE_REQUIRED", index, operation, document);
	else if ((operation.op === "add" || operation.op === "replace" || operation.op === "test") && hasUndefined(operation.value)) throw new JsonPatchError("Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)", "OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED", index, operation, document);
	else if (document) {
		if (operation.op == "add") {
			var pathLen = operation.path.split("/").length;
			var existingPathLen = existingPathFragment.split("/").length;
			if (pathLen !== existingPathLen + 1 && pathLen !== existingPathLen) throw new JsonPatchError("Cannot perform an `add` operation at the desired path", "OPERATION_PATH_CANNOT_ADD", index, operation, document);
		} else if (operation.op === "replace" || operation.op === "remove" || operation.op === "_get") {
			if (operation.path !== existingPathFragment) throw new JsonPatchError("Cannot perform the operation at a path that does not exist", "OPERATION_PATH_UNRESOLVABLE", index, operation, document);
		} else if (operation.op === "move" || operation.op === "copy") {
			var error = validate([{
				op: "_get",
				path: operation.from,
				value: void 0
			}], document);
			if (error && error.name === "OPERATION_PATH_UNRESOLVABLE") throw new JsonPatchError("Cannot perform the operation from a path that does not exist", "OPERATION_FROM_UNRESOLVABLE", index, operation, document);
		}
	}
}
/**
* Validates a sequence of operations. If `document` parameter is provided, the sequence is additionally validated against the object document.
* If error is encountered, returns a JsonPatchError object
* @param sequence
* @param document
* @returns {JsonPatchError|undefined}
*/
function validate(sequence, document, externalValidator) {
	try {
		if (!Array.isArray(sequence)) throw new JsonPatchError("Patch sequence must be an array", "SEQUENCE_NOT_AN_ARRAY");
		if (document) applyPatch(_deepClone(document), _deepClone(sequence), externalValidator || true);
		else {
			externalValidator = externalValidator || validator;
			for (var i = 0; i < sequence.length; i++) externalValidator(sequence[i], i, document, void 0);
		}
	} catch (e) {
		if (e instanceof JsonPatchError) return e;
		else throw e;
	}
}
function _areEquals(a, b) {
	if (a === b) return true;
	if (a && b && typeof a == "object" && typeof b == "object") {
		var arrA = Array.isArray(a), arrB = Array.isArray(b), i, length, key;
		if (arrA && arrB) {
			length = a.length;
			if (length != b.length) return false;
			for (i = length; i-- !== 0;) if (!_areEquals(a[i], b[i])) return false;
			return true;
		}
		if (arrA != arrB) return false;
		var keys = Object.keys(a);
		length = keys.length;
		if (length !== Object.keys(b).length) return false;
		for (i = length; i-- !== 0;) if (!b.hasOwnProperty(keys[i])) return false;
		for (i = length; i-- !== 0;) {
			key = keys[i];
			if (!_areEquals(a[key], b[key])) return false;
		}
		return true;
	}
	return a !== a && b !== b;
}
//#endregion
export { _areEquals, applyOperation, applyPatch, applyReducer, core_exports, getValueByPointer, validate, validator };

//# sourceMappingURL=core.js.map