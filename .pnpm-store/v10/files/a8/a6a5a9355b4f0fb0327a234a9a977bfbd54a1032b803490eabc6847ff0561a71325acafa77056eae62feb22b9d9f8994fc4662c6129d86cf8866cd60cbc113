//#region src/utils/json.ts
function parseJsonMarkdown(s, parser = parsePartialJson) {
	s = s.trim();
	const firstFenceIndex = s.indexOf("```");
	if (firstFenceIndex === -1) return parser(s);
	let contentAfterFence = s.substring(firstFenceIndex + 3);
	if (contentAfterFence.startsWith("json\n")) contentAfterFence = contentAfterFence.substring(5);
	else if (contentAfterFence.startsWith("json")) contentAfterFence = contentAfterFence.substring(4);
	else if (contentAfterFence.startsWith("\n")) contentAfterFence = contentAfterFence.substring(1);
	const closingFenceIndex = contentAfterFence.indexOf("```");
	let finalContent = contentAfterFence;
	if (closingFenceIndex !== -1) finalContent = contentAfterFence.substring(0, closingFenceIndex);
	return parser(finalContent.trim());
}
/**
* Recursive descent partial JSON parser.
* @param s - The string to parse.
* @returns The parsed value.
* @throws Error if the input is a malformed JSON string.
*/
function strictParsePartialJson(s) {
	try {
		return JSON.parse(s);
	} catch {}
	const buffer = s.trim();
	if (buffer.length === 0) throw new Error("Unexpected end of JSON input");
	let pos = 0;
	function skipWhitespace() {
		while (pos < buffer.length && /\s/.test(buffer[pos])) pos += 1;
	}
	function parseString() {
		if (buffer[pos] !== "\"") throw new Error(`Expected '"' at position ${pos}, got '${buffer[pos]}'`);
		pos += 1;
		let result = "";
		let escaped = false;
		while (pos < buffer.length) {
			const char = buffer[pos];
			if (escaped) {
				if (char === "n") result += "\n";
				else if (char === "t") result += "	";
				else if (char === "r") result += "\r";
				else if (char === "\\") result += "\\";
				else if (char === "\"") result += "\"";
				else if (char === "b") result += "\b";
				else if (char === "f") result += "\f";
				else if (char === "/") result += "/";
				else if (char === "u") {
					const hex = buffer.substring(pos + 1, pos + 5);
					if (/^[0-9A-Fa-f]{0,4}$/.test(hex)) {
						if (hex.length === 4) result += String.fromCharCode(Number.parseInt(hex, 16));
						else result += `u${hex}`;
						pos += hex.length;
					} else throw new Error(`Invalid unicode escape sequence '\\u${hex}' at position ${pos}`);
				} else throw new Error(`Invalid escape sequence '\\${char}' at position ${pos}`);
				escaped = false;
			} else if (char === "\\") escaped = true;
			else if (char === "\"") {
				pos += 1;
				return result;
			} else result += char;
			pos += 1;
		}
		if (escaped) result += "\\";
		return result;
	}
	function parseNumber() {
		const start = pos;
		let numStr = "";
		if (buffer[pos] === "-") {
			numStr += "-";
			pos += 1;
		}
		if (pos < buffer.length && buffer[pos] === "0") {
			numStr += "0";
			pos += 1;
			if (buffer[pos] >= "0" && buffer[pos] <= "9") throw new Error(`Invalid number at position ${start}`);
		}
		if (pos < buffer.length && buffer[pos] >= "1" && buffer[pos] <= "9") while (pos < buffer.length && buffer[pos] >= "0" && buffer[pos] <= "9") {
			numStr += buffer[pos];
			pos += 1;
		}
		if (pos < buffer.length && buffer[pos] === ".") {
			numStr += ".";
			pos += 1;
			while (pos < buffer.length && buffer[pos] >= "0" && buffer[pos] <= "9") {
				numStr += buffer[pos];
				pos += 1;
			}
		}
		if (pos < buffer.length && (buffer[pos] === "e" || buffer[pos] === "E")) {
			numStr += buffer[pos];
			pos += 1;
			if (pos < buffer.length && (buffer[pos] === "+" || buffer[pos] === "-")) {
				numStr += buffer[pos];
				pos += 1;
			}
			while (pos < buffer.length && buffer[pos] >= "0" && buffer[pos] <= "9") {
				numStr += buffer[pos];
				pos += 1;
			}
		}
		if (numStr === "-") return -0;
		const num = Number.parseFloat(numStr);
		if (Number.isNaN(num)) {
			pos = start;
			throw new Error(`Invalid number '${numStr}' at position ${start}`);
		}
		return num;
	}
	function parseValue() {
		skipWhitespace();
		if (pos >= buffer.length) throw new Error(`Unexpected end of input at position ${pos}`);
		const char = buffer[pos];
		if (char === "{") return parseObject();
		if (char === "[") return parseArray();
		if (char === "\"") return parseString();
		if ("null".startsWith(buffer.substring(pos, pos + 4))) {
			pos += Math.min(4, buffer.length - pos);
			return null;
		}
		if ("true".startsWith(buffer.substring(pos, pos + 4))) {
			pos += Math.min(4, buffer.length - pos);
			return true;
		}
		if ("false".startsWith(buffer.substring(pos, pos + 5))) {
			pos += Math.min(5, buffer.length - pos);
			return false;
		}
		if (char === "-" || char >= "0" && char <= "9") return parseNumber();
		throw new Error(`Unexpected character '${char}' at position ${pos}`);
	}
	function parseArray() {
		if (buffer[pos] !== "[") throw new Error(`Expected '[' at position ${pos}, got '${buffer[pos]}'`);
		const arr = [];
		pos += 1;
		skipWhitespace();
		if (pos >= buffer.length) return arr;
		if (buffer[pos] === "]") {
			pos += 1;
			return arr;
		}
		while (pos < buffer.length) {
			skipWhitespace();
			if (pos >= buffer.length) return arr;
			arr.push(parseValue());
			skipWhitespace();
			if (pos >= buffer.length) return arr;
			if (buffer[pos] === "]") {
				pos += 1;
				return arr;
			} else if (buffer[pos] === ",") {
				pos += 1;
				continue;
			}
			throw new Error(`Expected ',' or ']' at position ${pos}, got '${buffer[pos]}'`);
		}
		return arr;
	}
	function parseObject() {
		if (buffer[pos] !== "{") throw new Error(`Expected '{' at position ${pos}, got '${buffer[pos]}'`);
		const obj = {};
		pos += 1;
		skipWhitespace();
		if (pos >= buffer.length) return obj;
		if (buffer[pos] === "}") {
			pos += 1;
			return obj;
		}
		while (pos < buffer.length) {
			skipWhitespace();
			if (pos >= buffer.length) return obj;
			const key = parseString();
			skipWhitespace();
			if (pos >= buffer.length) return obj;
			if (buffer[pos] !== ":") throw new Error(`Expected ':' at position ${pos}, got '${buffer[pos]}'`);
			pos += 1;
			skipWhitespace();
			if (pos >= buffer.length) return obj;
			obj[key] = parseValue();
			skipWhitespace();
			if (pos >= buffer.length) return obj;
			if (buffer[pos] === "}") {
				pos += 1;
				return obj;
			} else if (buffer[pos] === ",") {
				pos += 1;
				continue;
			}
			throw new Error(`Expected ',' or '}' at position ${pos}, got '${buffer[pos]}'`);
		}
		return obj;
	}
	const value = parseValue();
	skipWhitespace();
	if (pos < buffer.length) throw new Error(`Unexpected character '${buffer[pos]}' at position ${pos}`);
	return value;
}
function parsePartialJson(s) {
	try {
		if (typeof s === "undefined") return null;
		return strictParsePartialJson(s);
	} catch {
		return null;
	}
}
//#endregion
exports.parseJsonMarkdown = parseJsonMarkdown;
exports.parsePartialJson = parsePartialJson;

//# sourceMappingURL=json.cjs.map