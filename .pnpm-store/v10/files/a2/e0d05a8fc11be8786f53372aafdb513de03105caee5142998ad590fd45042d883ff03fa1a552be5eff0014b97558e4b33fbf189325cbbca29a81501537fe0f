import { compare } from "../utils/fast-json-patch/src/duplex.js";
import { BaseCumulativeTransformOutputParser } from "./transform.js";
import "../utils/json_patch.js";
import { sax } from "../utils/sax-js/sax.js";
//#region src/output_parsers/xml.ts
const XML_FORMAT_INSTRUCTIONS = `The output should be formatted as a XML file.
1. Output should conform to the tags below. 
2. If tags are not given, make them on your own.
3. Remember to always open and close all the tags.

As an example, for the tags ["foo", "bar", "baz"]:
1. String "<foo>\n   <bar>\n      <baz></baz>\n   </bar>\n</foo>" is a well-formatted instance of the schema. 
2. String "<foo>\n   <bar>\n   </foo>" is a badly-formatted instance.
3. String "<foo>\n   <tag>\n   </tag>\n</foo>" is a badly-formatted instance.

Here are the output tags:
\`\`\`
{tags}
\`\`\``;
var XMLOutputParser = class extends BaseCumulativeTransformOutputParser {
	tags;
	constructor(fields) {
		super(fields);
		this.tags = fields?.tags;
	}
	static lc_name() {
		return "XMLOutputParser";
	}
	lc_namespace = ["langchain_core", "output_parsers"];
	lc_serializable = true;
	_diff(prev, next) {
		if (!next) return;
		if (!prev) return [{
			op: "replace",
			path: "",
			value: next
		}];
		return compare(prev, next);
	}
	async parsePartialResult(generations) {
		return parseXMLMarkdown(generations[0].text);
	}
	async parse(text) {
		return parseXMLMarkdown(text);
	}
	getFormatInstructions() {
		return !!(this.tags && this.tags.length > 0) ? XML_FORMAT_INSTRUCTIONS.replace("{tags}", this.tags?.join(", ") ?? "") : XML_FORMAT_INSTRUCTIONS;
	}
};
const strip = (text) => text.split("\n").map((line) => line.replace(/^\s+/, "")).join("\n").trim();
const parseParsedResult = (input) => {
	if (Object.keys(input).length === 0) return {};
	const result = {};
	if (input.children.length > 0) {
		result[input.name] = input.children.map(parseParsedResult);
		return result;
	} else {
		result[input.name] = input.text ?? void 0;
		return result;
	}
};
function parseXMLMarkdown(s) {
	const cleanedString = strip(s);
	const parser = sax.parser(true);
	let parsedResult = {};
	const elementStack = [];
	parser.onopentag = (node) => {
		const element = {
			name: node.name,
			attributes: node.attributes,
			children: [],
			text: "",
			isSelfClosing: node.isSelfClosing
		};
		if (elementStack.length > 0) elementStack[elementStack.length - 1].children.push(element);
		else parsedResult = element;
		if (!node.isSelfClosing) elementStack.push(element);
	};
	parser.onclosetag = () => {
		if (elementStack.length > 0) {
			const lastElement = elementStack.pop();
			if (elementStack.length === 0 && lastElement) parsedResult = lastElement;
		}
	};
	parser.ontext = (text) => {
		if (elementStack.length > 0) {
			const currentElement = elementStack[elementStack.length - 1];
			currentElement.text += text;
		}
	};
	parser.onattribute = (attr) => {
		if (elementStack.length > 0) {
			const currentElement = elementStack[elementStack.length - 1];
			currentElement.attributes[attr.name] = attr.value;
		}
	};
	const match = /```(xml)?(.*)```/s.exec(cleanedString);
	const xmlString = match ? match[2] : cleanedString;
	parser.write(xmlString).close();
	if (parsedResult && parsedResult.name === "?xml") parsedResult = parsedResult.children[0];
	return parseParsedResult(parsedResult);
}
//#endregion
export { XMLOutputParser, XML_FORMAT_INSTRUCTIONS, parseXMLMarkdown };

//# sourceMappingURL=xml.js.map