import { a as isDOMComponent, f as createRule, r as getElementType } from "../utils.js";
import picomatch from "picomatch";
function testDigit(char) {
	const charCode = char.charCodeAt(0);
	return charCode >= 48 && charCode <= 57;
}
function testUpperCase(char) {
	const upperCase = char.toUpperCase();
	return char === upperCase && upperCase !== char.toLowerCase();
}
function testLowerCase(char) {
	const lowerCase = char.toLowerCase();
	return char === lowerCase && lowerCase !== char.toUpperCase();
}
function testPascalCase(name) {
	if (!testUpperCase(name.charAt(0))) return false;
	if (Array.prototype.some.call(name.slice(1), (char) => char.toLowerCase() === char.toUpperCase() && !testDigit(char))) return false;
	return Array.prototype.some.call(name.slice(1), (char) => testLowerCase(char) || testDigit(char));
}
function testAllCaps(name) {
	const firstChar = name.charAt(0);
	if (!(testUpperCase(firstChar) || testDigit(firstChar))) return false;
	for (let i = 1; i < name.length - 1; i += 1) {
		const char = name.charAt(i);
		if (!(testUpperCase(char) || testDigit(char) || char === "_")) return false;
	}
	const lastChar = name.charAt(name.length - 1);
	if (!(testUpperCase(lastChar) || testDigit(lastChar))) return false;
	return true;
}
var jsx_pascal_case_default = createRule({
	name: "jsx-pascal-case",
	meta: {
		type: "suggestion",
		docs: { description: "Enforce PascalCase for user-defined JSX components" },
		schema: [{
			type: "object",
			properties: {
				allowAllCaps: { type: "boolean" },
				allowLeadingUnderscore: { type: "boolean" },
				allowNamespace: { type: "boolean" },
				ignore: {
					items: { type: "string" },
					type: "array",
					uniqueItems: true
				}
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			allowAllCaps: false,
			allowLeadingUnderscore: false,
			allowNamespace: false
		}],
		messages: {
			usePascalCase: "Imported JSX component {{name}} must be in PascalCase",
			usePascalOrSnakeCase: "Imported JSX component {{name}} must be in PascalCase or SCREAMING_SNAKE_CASE"
		}
	},
	create(context, [configuration]) {
		const { allowAllCaps, allowLeadingUnderscore, allowNamespace, ignore = [] } = configuration;
		const isMatchIgnore = picomatch(ignore, { noglobstar: true });
		function ignoreCheck(name) {
			return isMatchIgnore(name) || ignore.includes(name);
		}
		return { JSXOpeningElement(node) {
			if (isDOMComponent(node)) return;
			const name = getElementType(node);
			let checkNames = [name];
			let index = 0;
			if (name.includes(":")) checkNames = name.split(":");
			else if (name.includes(".")) checkNames = name.split(".");
			do {
				const splitName = checkNames[index];
				if (splitName.length === 1) return;
				const isIgnored = ignoreCheck(splitName);
				const checkName = allowLeadingUnderscore && splitName.startsWith("_") ? splitName.slice(1) : splitName;
				const isPascalCase = testPascalCase(checkName);
				const isAllowedAllCaps = allowAllCaps && testAllCaps(checkName);
				if (!isPascalCase && !isAllowedAllCaps && !isIgnored) {
					const messageId = allowAllCaps ? "usePascalOrSnakeCase" : "usePascalCase";
					context.report({
						messageId,
						node,
						data: { name: splitName }
					});
					break;
				}
				index += 1;
			} while (index < checkNames.length && !allowNamespace);
		} };
	}
});
export { jsx_pascal_case_default as t };
