//#region src/store/utils.ts
/**
* Tokenize a JSON path into parts.
* @example
* tokenizePath("metadata.title") // -> ["metadata", "title"]
* tokenizePath("chapters[*].content") // -> ["chapters[*]", "content"]
*/
function tokenizePath(path) {
	if (!path) return [];
	const tokens = [];
	let current = [];
	let i = 0;
	while (i < path.length) {
		const char = path[i];
		if (char === "[") {
			if (current.length) {
				tokens.push(current.join(""));
				current = [];
			}
			let bracketCount = 1;
			const indexChars = ["["];
			i += 1;
			while (i < path.length && bracketCount > 0) {
				if (path[i] === "[") bracketCount += 1;
				else if (path[i] === "]") bracketCount -= 1;
				indexChars.push(path[i]);
				i += 1;
			}
			tokens.push(indexChars.join(""));
			continue;
		} else if (char === "{") {
			if (current.length) {
				tokens.push(current.join(""));
				current = [];
			}
			let braceCount = 1;
			const fieldChars = ["{"];
			i += 1;
			while (i < path.length && braceCount > 0) {
				if (path[i] === "{") braceCount += 1;
				else if (path[i] === "}") braceCount -= 1;
				fieldChars.push(path[i]);
				i += 1;
			}
			tokens.push(fieldChars.join(""));
			continue;
		} else if (char === ".") {
			if (current.length) {
				tokens.push(current.join(""));
				current = [];
			}
		} else current.push(char);
		i += 1;
	}
	if (current.length) tokens.push(current.join(""));
	return tokens;
}
/**
* Type guard to check if an object is a FilterOperators
*/
function isFilterOperators(obj) {
	return typeof obj === "object" && obj !== null && Object.keys(obj).every((key) => key === "$eq" || key === "$ne" || key === "$gt" || key === "$gte" || key === "$lt" || key === "$lte" || key === "$in" || key === "$nin");
}
/**
* Compare values for filtering, supporting operator-based comparisons.
*/
function compareValues(itemValue, filterValue) {
	if (isFilterOperators(filterValue)) {
		const operators = Object.keys(filterValue).filter((k) => k.startsWith("$"));
		return operators.every((op) => {
			const value = filterValue[op];
			switch (op) {
				case "$eq": return itemValue === value;
				case "$ne": return itemValue !== value;
				case "$gt": return Number(itemValue) > Number(value);
				case "$gte": return Number(itemValue) >= Number(value);
				case "$lt": return Number(itemValue) < Number(value);
				case "$lte": return Number(itemValue) <= Number(value);
				case "$in": return Array.isArray(value) ? value.includes(itemValue) : false;
				case "$nin": return Array.isArray(value) ? !value.includes(itemValue) : true;
				default: return false;
			}
		});
	}
	return itemValue === filterValue;
}
/**
* Extract text from a value at a specific JSON path.
*
* Supports:
* - Simple paths: "field1.field2"
* - Array indexing: "[0]", "[*]", "[-1]"
* - Wildcards: "*"
* - Multi-field selection: "{field1,field2}"
* - Nested paths in multi-field: "{field1,nested.field2}"
*/
function getTextAtPath(obj, path) {
	if (!path || path === "$") return [JSON.stringify(obj, null, 2)];
	const tokens = Array.isArray(path) ? path : tokenizePath(path);
	function extractFromObj(obj$1, tokens$1, pos) {
		if (pos >= tokens$1.length) {
			if (typeof obj$1 === "string" || typeof obj$1 === "number" || typeof obj$1 === "boolean") return [String(obj$1)];
			if (obj$1 === null || obj$1 === void 0) return [];
			if (Array.isArray(obj$1) || typeof obj$1 === "object") return [JSON.stringify(obj$1, null, 2)];
			return [];
		}
		const token = tokens$1[pos];
		const results = [];
		if (pos === 0 && token === "$") results.push(JSON.stringify(obj$1, null, 2));
		if (token.startsWith("[") && token.endsWith("]")) {
			if (!Array.isArray(obj$1)) return [];
			const index = token.slice(1, -1);
			if (index === "*") for (const item of obj$1) results.push(...extractFromObj(item, tokens$1, pos + 1));
			else try {
				let idx = parseInt(index, 10);
				if (idx < 0) idx = obj$1.length + idx;
				if (idx >= 0 && idx < obj$1.length) results.push(...extractFromObj(obj$1[idx], tokens$1, pos + 1));
			} catch {
				return [];
			}
		} else if (token.startsWith("{") && token.endsWith("}")) {
			if (typeof obj$1 !== "object" || obj$1 === null) return [];
			const fields = token.slice(1, -1).split(",").map((f) => f.trim());
			for (const field of fields) {
				const nestedTokens = tokenizePath(field);
				if (nestedTokens.length) {
					let currentObj = obj$1;
					for (const nestedToken of nestedTokens) if (currentObj && typeof currentObj === "object" && nestedToken in currentObj) currentObj = currentObj[nestedToken];
					else {
						currentObj = void 0;
						break;
					}
					if (currentObj !== void 0) {
						if (typeof currentObj === "string" || typeof currentObj === "number" || typeof currentObj === "boolean") results.push(String(currentObj));
						else if (Array.isArray(currentObj) || typeof currentObj === "object") results.push(JSON.stringify(currentObj, null, 2));
					}
				}
			}
		} else if (token === "*") {
			if (Array.isArray(obj$1)) for (const item of obj$1) results.push(...extractFromObj(item, tokens$1, pos + 1));
			else if (typeof obj$1 === "object" && obj$1 !== null) for (const value of Object.values(obj$1)) results.push(...extractFromObj(value, tokens$1, pos + 1));
		} else if (typeof obj$1 === "object" && obj$1 !== null && token in obj$1) results.push(...extractFromObj(obj$1[token], tokens$1, pos + 1));
		return results;
	}
	return extractFromObj(obj, tokens, 0);
}

//#endregion
export { compareValues, getTextAtPath, tokenizePath };
//# sourceMappingURL=utils.js.map