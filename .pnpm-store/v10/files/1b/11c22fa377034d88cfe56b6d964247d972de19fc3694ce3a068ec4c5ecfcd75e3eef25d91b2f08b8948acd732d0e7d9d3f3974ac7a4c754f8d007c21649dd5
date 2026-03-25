"use strict";

var ensureString        = require("type/string/ensure")
  , ensurePlainFunction = require("type/plain-function/ensure")
  , from                = require("es5-ext/array/from")
  , primitiveSet        = require("es5-ext/object/primitive-set")
  , eventEmitter        = require("event-emitter")
  , allOff              = require("event-emitter/all-off")
  , d                   = require("d")
  , eolSet              = require("./lib/ws-eol")
  , wsSet               = require("./lib/ws")
  , identStart          = require("./lib/ident-start-pattern")
  , identNext           = require("./lib/ident-next-pattern");

var objHasOwnProperty = Object.prototype.hasOwnProperty
  , preRegExpSet = primitiveSet.apply(null, from(";{=([,<>+-*/%&|^!~?:}"))
  , nonNameSet = primitiveSet.apply(null, from(";{=([,<>+-*/%&|^!~?:})].`"))
  , reIdentStart = new RegExp(identStart)
  , reIdentNext = new RegExp(identNext);

var code, index, char, state, columnIndex, line, quote, scopeDepth, templateContext, previousToken
  , followsWhitespace, results, followsSkip, collectedScopeDatum, collectedScopeData
  , collectedScopeDepth, commentDatum, shouldCollectComments;

var handleEol = function () {
	if (char === "\r" && code[index + 1] === "\n") char = code[++index];
	columnIndex = index + 1;
	++line;
};

var emitter = eventEmitter();
var accessor = Object.create(null, {
	skipCodePart: d(function (codePart) {
		var codePartLength = codePart.length;
		for (var i = 0; i < codePartLength; ++i) {
			if (code[index + i] !== codePart[i]) return false;
		}
		index += codePartLength;
		char = code[index];
		previousToken = code[index - 1];
		followsWhitespace = false;
		followsSkip = true;
		return true;
	}),
	skipIdentifier: d(function () {
		if (!reIdentStart.test(char)) return null;
		var startIndex = index;
		var identifier = char;
		while ((char = code[++index]) && reIdentNext.test(char)) identifier += char;
		followsWhitespace = false;
		followsSkip = true;
		previousToken = code[index - 1];
		return { name: identifier, start: startIndex, end: index };
	}),
	skipWhitespace: d(function () {
		while (char) {
			if (objHasOwnProperty.call(wsSet, char)) {
				if (objHasOwnProperty.call(eolSet, char)) handleEol();
			} else if (char === "/") {
				if (code[index + 1] === "/") {
					// Single line comment
					if (shouldCollectComments) {
						commentDatum = {
							type: "comment",
							point: index,
							line: line,
							column: index - columnIndex
						};
					}
					index += 2;
					char = code[index];
					while (char) {
						if (objHasOwnProperty.call(eolSet, char)) {
							if (commentDatum) {
								commentDatum.endPoint = index;
								results.push(commentDatum);
								commentDatum = null;
							}
							handleEol();
							break;
						}
						char = code[++index];
					}
				} else if (code[index + 1] === "*") {
					if (shouldCollectComments) {
						commentDatum = {
							type: "comment",
							point: index,
							line: line,
							column: index - columnIndex
						};
					}
					index += 2;
					char = code[index];
					while (char) {
						if (objHasOwnProperty.call(eolSet, char)) handleEol();
						if (char === "*" && code[index + 1] === "/") {
							if (commentDatum) {
								commentDatum.endPoint = index + 2;
								results.push(commentDatum);
								commentDatum = null;
							}
							char = code[++index];
							break;
						}
						char = code[++index];
					}
				} else {
					break;
				}
			} else {
				break;
			}
			followsWhitespace = true;
			followsSkip = true;
			char = code[++index];
		}
	}),
	collectScope: d(function () {
		if (char !== "(") return;
		previousToken = char;
		char = code[++index];
		followsSkip = true;
		if (collectedScopeDatum) collectedScopeData.push(collectedScopeDepth, collectedScopeDatum);
		collectedScopeDepth = ++scopeDepth;
		collectedScopeDatum = {
			type: "scope",
			point: index + 1,
			line: line,
			column: index - columnIndex + 1
		};
	}),
	stop: d(function () { state = null; }),
	index: d.gs(function () { return index; }),
	previousToken: d.gs(function () { return previousToken; }),
	scopeDepth: d.gs(function () { return scopeDepth; }),
	shouldCollectComments: d.gs(
		function () { return shouldCollectComments; },
		function (value) { shouldCollectComments = Boolean(value); }
	)
});

module.exports = function (userCode, executor) {
	code = ensureString(userCode);
	executor = ensurePlainFunction(executor);
	allOff(emitter);
	executor(emitter, accessor);
	index = -1;
	state = "out";
	columnIndex = 0;
	line = 1;
	scopeDepth = 0;
	templateContext = [];
	previousToken = null;
	followsWhitespace = true;
	results = [];
	followsSkip = false;
	collectedScopeDatum = null;
	collectedScopeData = [];
	collectedScopeDepth = null;

	stateLoop: while (state) {
		if (followsSkip) followsSkip = false;
		else char = code[++index];
		if (!char) break;

		switch (state) {
			case "out":
				if (objHasOwnProperty.call(wsSet, char)) {
					if (objHasOwnProperty.call(eolSet, char)) {
						handleEol();
					}
					followsWhitespace = true;
					continue stateLoop;
				}
				if (char === "/") {
					if (previousToken && objHasOwnProperty.call(preRegExpSet, previousToken)) {
						state = "slashOrRegexp";
					} else {
						state = "slash";
					}
				} else if (char === "'" || char === "\"") {
					state = "string";
					quote = char;
				} else if (char === "`") {
					state = "template";
				} else if (char === "(" || char === "{" || char === "[") {
					++scopeDepth;
				} else if (char === ")" || char === "}" || char === "]") {
					if (scopeDepth === collectedScopeDepth) {
						collectedScopeDatum.raw = code.slice(collectedScopeDatum.point - 1, index);
						results.push(collectedScopeDatum);
						collectedScopeDatum = collectedScopeData.pop();
						collectedScopeDepth = collectedScopeData.pop();
					}
					--scopeDepth;
					if (char === "}") {
						if (templateContext[templateContext.length - 1] === scopeDepth + 1) {
							templateContext.pop();
							state = "template";
						}
					}
				}
				if (
					!previousToken ||
					followsWhitespace ||
					objHasOwnProperty.call(nonNameSet, previousToken) ||
					objHasOwnProperty.call(nonNameSet, char)
				) {
					emitter.emit("trigger:" + char, accessor);
					if (followsSkip) continue stateLoop;
				}
				previousToken = char;
				followsWhitespace = false;
				continue stateLoop;
			case "slashOrRegexp":
			case "slash":
				if (char === "/") {
					if (shouldCollectComments) {
						commentDatum = {
							type: "comment",
							point: index - 1,
							line: line,
							column: index - columnIndex - 1
						};
					}
					state = "singleLineComment";
				} else if (char === "*") {
					if (shouldCollectComments) {
						commentDatum = {
							type: "comment",
							point: index - 1,
							line: line,
							column: index - columnIndex - 1
						};
					}
					state = "multiLineComment";
				} else if (objHasOwnProperty.call(eolSet, char)) {
					handleEol();
					followsWhitespace = true;
					state = "out";
					continue stateLoop;
				} else if (state === "slashOrRegexp") {
					state = "regexp";
				} else {
					state = "out";
					continue stateLoop;
				}
				break;
			case "singleLineComment":
				if (objHasOwnProperty.call(eolSet, char)) {
					if (commentDatum) {
						commentDatum.endPoint = index;
						results.push(commentDatum);
						commentDatum = null;
					}
					handleEol();
					followsWhitespace = true;
					state = "out";
				}
				continue stateLoop;
			case "multiLineComment":
				if (char === "*") state = "multiLineCommentStar";
				else if (objHasOwnProperty.call(eolSet, char)) handleEol();
				continue stateLoop;
			case "multiLineCommentStar":
				if (char === "/") {
					followsWhitespace = true;
					state = "out";
					if (commentDatum) {
						commentDatum.endPoint = index + 1;
						results.push(commentDatum);
						commentDatum = null;
					}
				} else if (char !== "*") {
					if (objHasOwnProperty.call(eolSet, char)) handleEol();
					state = "multiLineComment";
				}
				continue stateLoop;
			case "string":
				if (char === "\\") state = "stringEscape";
				else if (char === quote) state = "out";
				break;
			case "stringEscape":
				if (objHasOwnProperty.call(eolSet, char)) handleEol();
				state = "string";
				break;
			case "template":
				if (char === "$") state = "templateDollar";
				else if (char === "\\") state = "templateEscape";
				else if (char === "`") state = "out";
				else if (objHasOwnProperty.call(eolSet, char)) handleEol();
				break;
			case "templateEscape":
				if (objHasOwnProperty.call(eolSet, char)) handleEol();
				state = "template";
				break;
			case "templateDollar":
				if (char === "{") {
					templateContext.push(++scopeDepth);
					state = "out";
				} else if (char !== "$") {
					if (objHasOwnProperty.call(eolSet, char)) handleEol();
					state = "template";
				}
				break;
			case "regexp":
				if (char === "\\") state = "regexpEscape";
				else if (char === "/") state = "out";
				break;
			case "regexpEscape":
				state = "regexp";
				break;
			/* istanbul ignore next */
			default:
				throw new Error("Unexpected state " + state);
		}
		previousToken = null;
		followsWhitespace = false;
	}

	return results;
};
