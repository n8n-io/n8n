const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_errors_index = require("../errors/index.cjs");
let mustache = require("mustache");
mustache = require_runtime.__toESM(mustache);
//#region src/prompts/template.ts
function configureMustache() {
	mustache.default.escape = (text) => text;
}
const parseFString = (template) => {
	const chars = template.split("");
	const nodes = [];
	const nextBracket = (bracket, start) => {
		for (let i = start; i < chars.length; i += 1) if (bracket.includes(chars[i])) return i;
		return -1;
	};
	let i = 0;
	while (i < chars.length) if (chars[i] === "{" && i + 1 < chars.length && chars[i + 1] === "{") {
		nodes.push({
			type: "literal",
			text: "{"
		});
		i += 2;
	} else if (chars[i] === "}" && i + 1 < chars.length && chars[i + 1] === "}") {
		nodes.push({
			type: "literal",
			text: "}"
		});
		i += 2;
	} else if (chars[i] === "{") {
		const j = nextBracket("}", i);
		if (j < 0) throw new Error("Unclosed '{' in template.");
		nodes.push({
			type: "variable",
			name: chars.slice(i + 1, j).join("")
		});
		i = j + 1;
	} else if (chars[i] === "}") throw new Error("Single '}' in template.");
	else {
		const next = nextBracket("{}", i);
		const text = (next < 0 ? chars.slice(i) : chars.slice(i, next)).join("");
		nodes.push({
			type: "literal",
			text
		});
		i = next < 0 ? chars.length : next;
	}
	return nodes;
};
/**
* Convert the result of mustache.parse into an array of ParsedTemplateNode,
* to make it compatible with other LangChain string parsing template formats.
*
* @param {mustache.TemplateSpans} template The result of parsing a mustache template with the mustache.js library.
* @param {string[]} context Array of section variable names for nested context
* @returns {ParsedTemplateNode[]}
*/
const mustacheTemplateToNodes = (template, context = []) => {
	const nodes = [];
	for (const temp of template) if (temp[0] === "name") {
		const name = temp[1].includes(".") ? temp[1].split(".")[0] : temp[1];
		nodes.push({
			type: "variable",
			name
		});
	} else if ([
		"#",
		"&",
		"^",
		">"
	].includes(temp[0])) {
		nodes.push({
			type: "variable",
			name: temp[1]
		});
		if (temp[0] === "#" && temp.length > 4 && Array.isArray(temp[4])) {
			const newContext = [...context, temp[1]];
			const nestedNodes = mustacheTemplateToNodes(temp[4], newContext);
			nodes.push(...nestedNodes);
		}
	} else nodes.push({
		type: "literal",
		text: temp[1]
	});
	return nodes;
};
const parseMustache = (template) => {
	configureMustache();
	return mustacheTemplateToNodes(mustache.default.parse(template));
};
const interpolateFString = (template, values) => {
	return parseFString(template).reduce((res, node) => {
		if (node.type === "variable") {
			if (node.name in values) return res + (typeof values[node.name] === "string" ? values[node.name] : JSON.stringify(values[node.name]));
			throw new Error(`(f-string) Missing value for input ${node.name}`);
		}
		return res + node.text;
	}, "");
};
const interpolateMustache = (template, values) => {
	configureMustache();
	return mustache.default.render(template, values);
};
const DEFAULT_FORMATTER_MAPPING = {
	"f-string": interpolateFString,
	mustache: interpolateMustache
};
const DEFAULT_PARSER_MAPPING = {
	"f-string": parseFString,
	mustache: parseMustache
};
const renderTemplate = (template, templateFormat, inputValues) => {
	try {
		return DEFAULT_FORMATTER_MAPPING[templateFormat](template, inputValues);
	} catch (e) {
		throw require_errors_index.addLangChainErrorFields(e, "INVALID_PROMPT_INPUT");
	}
};
const parseTemplate = (template, templateFormat) => DEFAULT_PARSER_MAPPING[templateFormat](template);
const checkValidTemplate = (template, templateFormat, inputVariables) => {
	if (!(templateFormat in DEFAULT_FORMATTER_MAPPING)) {
		const validFormats = Object.keys(DEFAULT_FORMATTER_MAPPING);
		throw new Error(`Invalid template format. Got \`${templateFormat}\`;
                         should be one of ${validFormats}`);
	}
	try {
		const dummyInputs = Object.fromEntries(inputVariables.map((v) => [v, "foo"]));
		if (Array.isArray(template)) template.forEach((message) => {
			if (message.type === "text" && "text" in message && typeof message.text === "string") renderTemplate(message.text, templateFormat, dummyInputs);
			else if (message.type === "image_url") {
				if (typeof message.image_url === "string") renderTemplate(message.image_url, templateFormat, dummyInputs);
				else if (typeof message.image_url === "object" && message.image_url !== null && "url" in message.image_url && typeof message.image_url.url === "string") {
					const imageUrl = message.image_url.url;
					renderTemplate(imageUrl, templateFormat, dummyInputs);
				}
			} else throw new Error(`Invalid message template received. ${JSON.stringify(message, null, 2)}`);
		});
		else renderTemplate(template, templateFormat, dummyInputs);
	} catch (e) {
		throw new Error(`Invalid prompt schema: ${e.message}`);
	}
};
//#endregion
exports.DEFAULT_FORMATTER_MAPPING = DEFAULT_FORMATTER_MAPPING;
exports.DEFAULT_PARSER_MAPPING = DEFAULT_PARSER_MAPPING;
exports.checkValidTemplate = checkValidTemplate;
exports.interpolateFString = interpolateFString;
exports.interpolateMustache = interpolateMustache;
exports.parseFString = parseFString;
exports.parseMustache = parseMustache;
exports.parseTemplate = parseTemplate;
exports.renderTemplate = renderTemplate;

//# sourceMappingURL=template.cjs.map