import { t as require_binding } from "./binding-DkT6owYZ.mjs";
import { l as locate, n as error, s as logParseError, u as getCodeFrame } from "./logs-CSQ_UMWp.mjs";

//#region ../../node_modules/.pnpm/oxc-parser@0.97.0/node_modules/oxc-parser/src-js/wrap.js
function wrap$1(result) {
	let program, module, comments, errors;
	return {
		get program() {
			if (!program) program = jsonParseAst(result.program);
			return program;
		},
		get module() {
			if (!module) module = result.module;
			return module;
		},
		get comments() {
			if (!comments) comments = result.comments;
			return comments;
		},
		get errors() {
			if (!errors) errors = result.errors;
			return errors;
		}
	};
}
function jsonParseAst(programJson) {
	const { node: program, fixes } = JSON.parse(programJson);
	for (const fixPath of fixes) applyFix(program, fixPath);
	return program;
}
function applyFix(program, fixPath) {
	let node = program;
	for (const key of fixPath) node = node[key];
	if (node.bigint) node.value = BigInt(node.bigint);
	else try {
		node.value = RegExp(node.regex.pattern, node.regex.flags);
	} catch {}
}

//#endregion
//#region src/parse-ast-index.ts
var import_binding = require_binding();
function wrap(result, sourceText) {
	result = wrap$1(result);
	if (result.errors.length > 0) return normalizeParseError(sourceText, result.errors);
	return result.program;
}
function normalizeParseError(sourceText, errors) {
	let message = `Parse failed with ${errors.length} error${errors.length < 2 ? "" : "s"}:\n`;
	for (let i = 0; i < errors.length; i++) {
		if (i >= 5) {
			message += "\n...";
			break;
		}
		const e = errors[i];
		message += e.message + "\n" + e.labels.map((label) => {
			const location = locate(sourceText, label.start, { offsetLine: 1 });
			if (!location) return;
			return getCodeFrame(sourceText, location.line, location.column);
		}).filter(Boolean).join("\n");
	}
	return error(logParseError(message));
}
const defaultParserOptions = {
	lang: "js",
	preserveParens: false
};
function parseAst(sourceText, options, filename) {
	return wrap((0, import_binding.parseSync)(filename ?? "file.js", sourceText, {
		...defaultParserOptions,
		...options
	}), sourceText);
}
async function parseAstAsync(sourceText, options, filename) {
	return wrap(await (0, import_binding.parseAsync)(filename ?? "file.js", sourceText, {
		...defaultParserOptions,
		...options
	}), sourceText);
}

//#endregion
export { parseAstAsync as n, parseAst as t };