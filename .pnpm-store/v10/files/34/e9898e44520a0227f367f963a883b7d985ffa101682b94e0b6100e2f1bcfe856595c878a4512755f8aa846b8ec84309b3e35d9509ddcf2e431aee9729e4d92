import { asyncWalk } from "estree-walker";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LEAST_UPPER_BOUND, TraceMap, allGeneratedPositionsFor, originalPositionFor, sourceContentFor } from "@jridgewell/trace-mapping";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import jsTokens from "js-tokens";

//#region src/ast.ts
function getWalker() {
	let nextIgnore = false;
	function onIgnore(node) {
		nextIgnore = node;
	}
	async function walk(ast, ignoreHints, ignoreClassMethods, visitors) {
		return await asyncWalk(ast, {
			async enter(node) {
				if (nextIgnore !== false) return;
				const hint = getIgnoreHint(node);
				if (hint === "next") return onIgnore(node);
				if (isSkipped(node)) onIgnore(node);
				switch (node.type) {
					case "FunctionDeclaration": return visitors.onFunctionDeclaration(node);
					case "FunctionExpression":
						if (ignoreClassMethods && node.id?.name) {
							if (ignoreClassMethods.includes(node.id.name)) return onIgnore(node);
						}
						return visitors.onFunctionExpression(node);
					case "MethodDefinition": return visitors.onMethodDefinition(node);
					case "Property": return visitors.onProperty(node);
					case "ArrowFunctionExpression":
						if (node.body?.type === "ParenthesizedExpression") node.body = node.body.expression;
						return visitors.onArrowFunctionExpression(node);
					case "ExpressionStatement": return visitors.onExpressionStatement(node);
					case "BreakStatement": return visitors.onBreakStatement(node);
					case "ContinueStatement": return visitors.onContinueStatement(node);
					case "DebuggerStatement": return visitors.onDebuggerStatement(node);
					case "ReturnStatement": return visitors.onReturnStatement(node);
					case "ThrowStatement": return visitors.onThrowStatement(node);
					case "TryStatement": return visitors.onTryStatement(node);
					case "ForStatement": return visitors.onForStatement(node);
					case "ForInStatement": return visitors.onForInStatement(node);
					case "ForOfStatement": return visitors.onForOfStatement(node);
					case "WhileStatement": return visitors.onWhileStatement(node);
					case "DoWhileStatement": return visitors.onDoWhileStatement(node);
					case "WithStatement": return visitors.onWithStatement(node);
					case "LabeledStatement": return visitors.onLabeledStatement(node);
					case "VariableDeclarator": return visitors.onVariableDeclarator(node);
					case "ClassBody": {
						const classBody = node;
						if (ignoreClassMethods) {
							for (const child of classBody.body) if (child.type === "MethodDefinition" || child.type === "ClassMethod") {
								const name = child.key.type === "Identifier" && child.key.name;
								if (name && ignoreClassMethods.includes(name)) setSkipped(child);
							}
							classBody.body = classBody.body.filter((child) => !isSkipped(child));
						}
						return visitors.onClassBody(classBody);
					}
					case "IfStatement": {
						const branches = [];
						if (node.consequent.type !== "BlockStatement") node.consequent = {
							type: "BlockStatement",
							body: [node.consequent],
							start: node.consequent.start,
							end: node.consequent.end
						};
						if (node.alternate && node.alternate.type !== "BlockStatement") node.alternate = {
							type: "BlockStatement",
							body: [node.alternate],
							start: node.alternate.start,
							end: node.alternate.end
						};
						if (hint === "if") setSkipped(node.consequent);
						else branches.push(node.consequent);
						if (hint === "else" && node.alternate) setSkipped(node.alternate);
						else if (hint !== "if" && hint !== "else") branches.push(node.alternate);
						return visitors.onIfStatement(node, branches);
					}
					case "SwitchStatement": {
						const cases = [];
						for (const _case of node.cases) if (getIgnoreHint(_case) !== "next") cases.push(_case);
						return visitors.onSwitchStatement(node, cases);
					}
					case "ConditionalExpression": {
						const branches = [];
						if (node.consequent.type === "ParenthesizedExpression") node.consequent = node.consequent.expression;
						if (node.alternate.type === "ParenthesizedExpression") node.alternate = node.alternate.expression;
						if (getIgnoreHint(node.consequent) === "next") setSkipped(node.consequent);
						else branches.push(node.consequent);
						if (getIgnoreHint(node.alternate) === "next") setSkipped(node.alternate);
						else branches.push(node.alternate);
						return visitors.onConditionalExpression(node, branches);
					}
					case "LogicalExpression": {
						if (isSkipped(node)) return;
						const branches = [];
						function visit(child) {
							if (child.type === "LogicalExpression") {
								setSkipped(child);
								if (getIgnoreHint(child) !== "next") {
									visit(child.left);
									return visit(child.right);
								}
							}
							branches.push(child);
						}
						visit(node);
						return visitors.onLogicalExpression(node, branches);
					}
					case "AssignmentPattern": return visitors.onAssignmentPattern(node);
					case "ClassMethod": return visitors.onClassMethod(node);
					case "ObjectMethod": return visitors.onObjectMethod(node);
				}
			},
			async leave(node) {
				if (node === nextIgnore) nextIgnore = false;
			}
		});
		function getIgnoreHint(node) {
			for (const hint of ignoreHints) if (hint.loc.end === node.start) return hint.type;
			return null;
		}
	}
	return {
		walk,
		onIgnore
	};
}
const skippedNodes = /* @__PURE__ */ new WeakSet();
function getFunctionName(node) {
	if (node.type === "Identifier") return node.name;
	if ("id" in node && node.id) return getFunctionName(node.id);
}
function setSkipped(node) {
	skippedNodes.add(node);
}
function isSkipped(node) {
	return skippedNodes.has(node);
}

//#endregion
//#region src/coverage-map.ts
function createCoverageMapData(filename, sourceMap) {
	const data = {};
	const directory = dirname(filename);
	for (const source of sourceMap.sources) {
		let path = filename;
		if (source) if (source.startsWith("file://")) path = fileURLToPath(source);
		else path = resolve(directory, source);
		data[path] = {
			path,
			statementMap: {},
			fnMap: {},
			branchMap: {},
			s: {},
			f: {},
			b: {},
			meta: {
				lastBranch: 0,
				lastFunction: 0,
				lastStatement: 0,
				seen: {}
			}
		};
	}
	return data;
}
function addFunction(options) {
	const fileCoverage = options.coverageMapData[options.filename];
	const meta = fileCoverage.meta;
	const key = `f:${cacheKey(options.decl)}`;
	let index = meta.seen[key];
	if (index == null) {
		index = meta.lastFunction;
		meta.lastFunction++;
		meta.seen[key] = index;
		fileCoverage.fnMap[index] = {
			name: options.name || `(anonymous_${index})`,
			decl: pickLocation(options.decl),
			loc: pickLocation(options.loc),
			line: options.loc.start.line
		};
	}
	fileCoverage.f[index] ||= 0;
	fileCoverage.f[index] += options.covered || 0;
}
function addStatement(options) {
	const fileCoverage = options.coverageMapData[options.filename];
	const meta = fileCoverage.meta;
	const key = `s:${cacheKey(options.loc)}`;
	let index = meta.seen[key];
	if (index == null) {
		index = meta.lastStatement;
		meta.lastStatement++;
		meta.seen[key] = index;
		fileCoverage.statementMap[index] = pickLocation(options.loc);
	}
	fileCoverage.s[index] = options.covered || 0;
}
function addBranch(options) {
	const fileCoverage = options.coverageMapData[options.filename];
	const meta = fileCoverage.meta;
	const key = ["b", ...options.locations.map(cacheKey)].join(":");
	let index = meta.seen[key];
	if (index == null) {
		index = meta.lastBranch;
		meta.lastBranch++;
		meta.seen[key] = index;
		fileCoverage.branchMap[index] = {
			loc: pickLocation(options.loc),
			type: options.type,
			locations: options.locations.map((loc) => pickLocation(loc)),
			line: options.loc.start.line
		};
	}
	if (!fileCoverage.b[index]) fileCoverage.b[index] = Array(options.locations.length).fill(0);
	options.covered?.forEach((hit, i) => {
		fileCoverage.b[index][i] += hit;
	});
}
function pickLocation(loc) {
	return {
		start: {
			line: loc.start.line,
			column: loc.start.column
		},
		end: {
			line: loc.end.line,
			column: loc.end.column
		}
	};
}
function cacheKey(loc) {
	return `${loc.start.line}:${loc.start.column}:${loc.end.line}:${loc.end.column}`;
}

//#endregion
//#region src/ignore-hints.ts
const IGNORE_PATTERN = /^\s*(?:istanbul|[cv]8|node:coverage)\s+ignore\s+(if|else|next|file)(?=\W|$)/;
const IGNORE_LINES_PATTERN = /\s*(?:istanbul|[cv]8|node:coverage)\s+ignore\s+(start|stop)(?=\W|$)/;
const EOL_PATTERN = /\r?\n/g;
/**
* Parse ignore hints from **Javascript** code based on AST
* - Most AST parsers don't emit comments in AST like Acorn does, so parse comments manually instead.
*/
function getIgnoreHints(code) {
	const ignoreHints = [];
	const tokens = jsTokens(code);
	let current = 0;
	let previousTokenWasIgnoreHint = false;
	for (const token of tokens) {
		if (previousTokenWasIgnoreHint && token.type !== "WhiteSpace" && token.type !== "LineTerminatorSequence") {
			const previous = ignoreHints.at(-1);
			if (previous) previous.loc.end = current;
			previousTokenWasIgnoreHint = false;
		}
		if (token.type === "SingleLineComment" || token.type === "MultiLineComment") {
			const loc = {
				start: current,
				end: current + token.value.length
			};
			const type = token.value.replace(/^\/\*\*/, "").replace(/^\/\*/, "").replace(/\*\*\/$/, "").replace(/\*\/$/, "").replace(/^\/\//, "").match(IGNORE_PATTERN)?.[1];
			if (type === "file") return [{
				type: "file",
				loc: {
					start: 0,
					end: 0
				}
			}];
			if (type === "if" || type === "else" || type === "next") {
				ignoreHints.push({
					type,
					loc
				});
				previousTokenWasIgnoreHint = true;
			}
		}
		current += token.value.length;
	}
	return ignoreHints;
}
/**
* Parse ignore start/stop hints from **text file** based on regular expressions
* - Does not understand what a comment is in Javascript (or JSX, Vue, Svelte)
* - Parses source code (JS, TS, Vue, Svelte, anything) based on text search by
*   matching for `/* <name> ignore start *\/` pattern - not by looking for real comments
*
* ```js
* /* v8 ignore start *\/
* <!-- /* v8 ignore start *\/ -->
* <SomeFrameworkComment content="/* v8 ignore start *\/">
* ```
*/
function getIgnoredLines(text) {
	if (!text) return /* @__PURE__ */ new Set();
	const ranges = [];
	let lineNumber = 0;
	for (const line of text.split(EOL_PATTERN)) {
		lineNumber++;
		const match = line.match(IGNORE_LINES_PATTERN);
		if (match) {
			if (match[1] === "stop") {
				const previous = ranges.at(-1);
				if (previous && previous.stop === Infinity) previous.stop = lineNumber;
				continue;
			}
			ranges.push({
				start: lineNumber,
				stop: Infinity
			});
		}
	}
	const ignoredLines = /* @__PURE__ */ new Set();
	for (const range of ranges) for (let line = range.start; line <= range.stop; line++) {
		ignoredLines.add(line);
		if (line >= lineNumber) break;
	}
	return ignoredLines;
}

//#endregion
//#region src/location.ts
const WORD_PATTERN = /(\w+|\s|[^\w\s])/g;
const INLINE_MAP_PATTERN = /#\s*sourceMappingURL=(.*)\s*$/m;
const BASE_64_PREFIX = "data:application/json;base64,";
/** How often should offset calculations be cached */
const CACHE_THRESHOLD = 250;
var Locator = class {
	#cache = /* @__PURE__ */ new Map();
	#codeParts;
	#map;
	#directory;
	#ignoredLines = /* @__PURE__ */ new Map();
	constructor(code, map, directory) {
		this.#codeParts = code.split("");
		this.#map = map;
		this.#directory = directory;
	}
	reset() {
		this.#cache.clear();
		this.#ignoredLines.clear();
		this.#codeParts = [];
	}
	offsetToNeedle(offset) {
		const closestThreshold = Math.floor(offset / CACHE_THRESHOLD) * CACHE_THRESHOLD;
		const cacheHit = this.#cache.get(closestThreshold);
		let current = cacheHit ? closestThreshold : 0;
		let line = cacheHit?.line ?? 1;
		let column = cacheHit?.column ?? 0;
		for (let i = current; i <= this.#codeParts.length; i++) {
			if (current === offset) return {
				line,
				column
			};
			if (current % CACHE_THRESHOLD === 0) this.#cache.set(current, {
				line,
				column
			});
			if (this.#codeParts[i] === "\n") {
				line++;
				column = 0;
			} else column++;
			current++;
		}
		return {
			line,
			column
		};
	}
	getLoc(node) {
		const startNeedle = this.offsetToNeedle(node.start);
		const start = getPosition(startNeedle, this.#map);
		if (start === null) return null;
		const endNeedle = this.offsetToNeedle(node.end);
		endNeedle.column -= 1;
		let end = getPosition(endNeedle, this.#map);
		if (end === null) {
			for (let line = endNeedle.line; line >= startNeedle.line && end === null; line--) end = getPosition({
				line,
				column: Infinity
			}, this.#map);
			if (end === null) return null;
		}
		const loc = {
			start,
			end
		};
		const afterEndMappings = allGeneratedPositionsFor(this.#map, {
			source: loc.end.filename,
			line: loc.end.line,
			column: loc.end.column + 1,
			bias: LEAST_UPPER_BOUND
		});
		if (afterEndMappings.length === 0) loc.end.column = Infinity;
		else for (const mapping of afterEndMappings) {
			if (mapping.line === null) continue;
			const original = originalPositionFor(this.#map, mapping);
			if (original.line === loc.end.line) {
				loc.end = {
					...original,
					filename: original.source
				};
				break;
			}
		}
		const filename = loc.start.filename;
		let ignoredLines = this.#ignoredLines.get(filename);
		if (!ignoredLines) {
			ignoredLines = getIgnoredLines(sourceContentFor(this.#map, filename) ?? tryReadFileSync(filename));
			this.#ignoredLines.set(filename, ignoredLines);
		}
		if (ignoredLines.has(loc.start.line)) return null;
		return loc;
	}
	getSourceLines(loc, filename) {
		const index = this.#map.resolvedSources.findIndex((source) => source === filename || resolve(this.#directory, source) === filename);
		const sourcesContent = this.#map.sourcesContent?.[index];
		if (sourcesContent == null) return null;
		const lines = sourcesContent.split("\n").slice(loc.start.line - 1, loc.end.line);
		lines[0] = lines[0].slice(loc.start.column);
		lines[lines.length - 1] = lines[lines.length - 1].slice(0, loc.end.column);
		return lines.join("\n");
	}
};
function getPosition(needle, map) {
	let position = originalPositionFor(map, needle);
	if (position.source == null) position = originalPositionFor(map, {
		column: needle.column,
		line: needle.line,
		bias: LEAST_UPPER_BOUND
	});
	if (position.source == null) return null;
	return {
		line: position.line,
		column: position.column,
		filename: position.source
	};
}
function createEmptySourceMap(filename, code) {
	const mappings = [];
	for (const [line, content] of code.split("\n").entries()) {
		const parts = content.match(WORD_PATTERN) || [];
		const segments = [];
		let column = 0;
		for (const part of parts) {
			segments.push([
				column,
				0,
				line,
				column
			]);
			column += part.length;
		}
		mappings.push(segments);
	}
	return {
		version: 3,
		mappings,
		file: filename,
		sources: [filename],
		sourcesContent: [code],
		names: []
	};
}
async function getInlineSourceMap(filename, code) {
	const match = code.match(INLINE_MAP_PATTERN)?.[1];
	if (!match) return null;
	try {
		if (match.includes(BASE_64_PREFIX)) {
			const encoded = match.split(BASE_64_PREFIX).at(-1) || "";
			const decoded = atob(encoded);
			return JSON.parse(decoded);
		}
		const content = await readFile(resolve(dirname(filename), match), "utf-8");
		return JSON.parse(content);
	} catch {
		return null;
	}
}
function tryReadFileSync(filename) {
	try {
		return readFileSync(filename, "utf8");
	} catch {
		return;
	}
}

//#endregion
//#region src/script-coverage.ts
function normalize(scriptCoverage) {
	if (scriptCoverage.functions.length === 0) return [];
	const ranges = scriptCoverage.functions.flatMap((fn) => fn.ranges.map((range) => ({
		start: range.startOffset,
		end: range.endOffset,
		count: range.count,
		area: range.endOffset - range.startOffset
	}))).sort((a, b) => {
		const diff = b.area - a.area;
		if (diff !== 0) return diff;
		return a.end - b.end;
	});
	let maxEnd = 0;
	for (const r of ranges) if (r.end > maxEnd) maxEnd = r.end;
	const hits = new Uint32Array(maxEnd + 1);
	for (const range of ranges) hits.fill(range.count, range.start, range.end + 1);
	const normalized = [];
	let start = 0;
	for (let end = 1; end <= hits.length; end++) {
		const isLast = end === hits.length;
		const current = isLast ? null : hits[end];
		const previous = hits[start];
		if (current !== previous || isLast) {
			normalized.push({
				start,
				end: end - 1,
				count: previous
			});
			start = end;
		}
	}
	return normalized;
}
function getCount(offset, coverages) {
	let low = 0;
	let high = coverages.length - 1;
	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const coverage = coverages[mid];
		if (coverage.start <= offset.startOffset && offset.startOffset <= coverage.end) return coverage.count;
		else if (offset.startOffset < coverage.start) high = mid - 1;
		else low = mid + 1;
	}
	return 0;
}

//#endregion
//#region src/coverage-mapper.ts
var CoverageMapper = class CoverageMapper {
	constructor(locator, coverageMapData, ranges, wrapperLength, directory, onIgnoreNode, ignoreNode, ignoreSourceCode) {
		this.locator = locator;
		this.coverageMapData = coverageMapData;
		this.ranges = ranges;
		this.wrapperLength = wrapperLength;
		this.directory = directory;
		this.onIgnoreNode = onIgnoreNode;
		this.ignoreNode = ignoreNode;
		this.ignoreSourceCode = ignoreSourceCode;
	}
	static async create(options, onIgnoreNode) {
		const filename = fileURLToPath(options.coverage.url);
		const directory = dirname(filename);
		const map = new TraceMap(options.sourceMap || await getInlineSourceMap(filename, options.code) || createEmptySourceMap(filename, options.code));
		return new CoverageMapper(new Locator(options.code, map, directory), createCoverageMapData(filename, map), normalize(options.coverage), options.wrapperLength || 0, directory, onIgnoreNode, options.ignoreNode, options.ignoreSourceCode);
	}
	onFunction(node, positions) {
		if (this.#onIgnore(node, "function")) return;
		const loc = this.locator.getLoc(positions.loc);
		if (loc === null) return;
		const decl = this.locator.getLoc(positions.decl);
		if (decl === null) return;
		const covered = getCount({
			startOffset: node.start + this.wrapperLength,
			endOffset: node.end + this.wrapperLength
		}, this.ranges);
		if (this.ignoreSourceCode) {
			const current = this.locator.getLoc(node) || loc;
			const sources = this.locator.getSourceLines(current, this.#getSourceFilename(current));
			if (sources != null && this.ignoreSourceCode(sources, "function", {
				start: {
					line: current.start.line,
					column: current.start.column
				},
				end: {
					line: current.end.line,
					column: current.end.column
				}
			})) return;
		}
		addFunction({
			coverageMapData: this.coverageMapData,
			covered,
			loc,
			decl,
			filename: this.#getSourceFilename(loc),
			name: getFunctionName(node)
		});
	}
	onStatement(node, parent) {
		if (this.#onIgnore(parent || node, "statement")) return;
		const loc = this.locator.getLoc(node);
		if (loc === null) return;
		const covered = getCount({
			startOffset: (parent || node).start + this.wrapperLength,
			endOffset: (parent || node).end + this.wrapperLength
		}, this.ranges);
		if (this.ignoreSourceCode) {
			const current = parent && this.locator.getLoc(parent) || loc;
			const sources = this.locator.getSourceLines(current, this.#getSourceFilename(current));
			if (sources != null && this.ignoreSourceCode(sources, "statement", {
				start: {
					line: current.start.line,
					column: current.start.column
				},
				end: {
					line: current.end.line,
					column: current.end.column
				}
			})) return;
		}
		addStatement({
			coverageMapData: this.coverageMapData,
			loc,
			covered,
			filename: this.#getSourceFilename(loc)
		});
	}
	onBranch(type, node, branches) {
		if (this.#onIgnore(node, "branch")) return;
		const loc = this.locator.getLoc(node);
		if (loc === null) return;
		const locations = [];
		const covered = [];
		for (const branch of branches) {
			if (!branch) {
				locations.push({
					start: {
						line: void 0,
						column: void 0
					},
					end: {
						line: void 0,
						column: void 0
					}
				});
				const count = getCount({
					startOffset: node.start + this.wrapperLength,
					endOffset: node.end + this.wrapperLength
				}, this.ranges);
				const previous = covered.at(-1) || 0;
				covered.push(count - previous);
				continue;
			}
			const location = this.locator.getLoc(branch);
			if (location !== null) locations.push(location);
			const bias = branch.type === "BlockStatement" ? 1 : 0;
			covered.push(getCount({
				startOffset: branch.start + bias + this.wrapperLength,
				endOffset: branch.end - bias + this.wrapperLength
			}, this.ranges));
		}
		if (type === "if") {
			if (locations.length > 0) locations[0] = loc;
		}
		if (locations.length === 0) return;
		if (this.ignoreSourceCode) {
			const sources = this.locator.getSourceLines(loc, this.#getSourceFilename(loc));
			if (sources != null && this.ignoreSourceCode(sources, "branch", {
				start: {
					line: loc.start.line,
					column: loc.start.column
				},
				end: {
					line: loc.end.line,
					column: loc.end.column
				}
			})) return;
		}
		addBranch({
			coverageMapData: this.coverageMapData,
			loc,
			locations,
			type,
			covered,
			filename: this.#getSourceFilename(loc)
		});
	}
	generate() {
		this.locator.reset();
		return this.coverageMapData;
	}
	#getSourceFilename(position) {
		const sourceFilename = position.start.filename || position.end.filename;
		if (!sourceFilename) throw new Error(`Missing original filename for ${JSON.stringify(position, null, 2)}`);
		if (sourceFilename.startsWith("file://")) return fileURLToPath(sourceFilename);
		return resolve(this.directory, sourceFilename);
	}
	#onIgnore(node, type) {
		if (!this.ignoreNode) return false;
		const scope = this.ignoreNode(node, type);
		if (scope === "ignore-this-and-nested-nodes") this.onIgnoreNode(node);
		return scope;
	}
};

//#endregion
//#region src/index.ts
/**
* Maps V8 `ScriptCoverage` to Istanbul's `CoverageMap`.
* Results are identical with `istanbul-lib-instrument`.
*/
async function convert(options) {
	const ignoreHints = getIgnoreHints(options.code);
	if (ignoreHints.length === 1 && ignoreHints[0].type === "file") return {};
	const walker = getWalker();
	const mapper = await CoverageMapper.create(options, walker.onIgnore);
	const ast = await options.ast;
	await walker.walk(ast, ignoreHints, options.ignoreClassMethods, {
		onFunctionDeclaration(node) {
			mapper.onFunction(node, {
				loc: node.body,
				decl: node.id || {
					...node,
					end: node.start + 1
				}
			});
		},
		onFunctionExpression(node) {
			if (isCovered(node)) return;
			mapper.onFunction(node, {
				loc: node.body,
				decl: node.id || {
					...node,
					end: node.start + 1
				}
			});
		},
		onArrowFunctionExpression(node) {
			mapper.onFunction(node, {
				loc: node.body,
				decl: {
					...node,
					end: node.start + 1
				}
			});
			if (node.body.type !== "BlockStatement") mapper.onStatement(node.body, node);
		},
		onMethodDefinition(node) {
			if (node.value.type === "FunctionExpression") setCovered(node.value);
			mapper.onFunction(node, {
				loc: node.value.body,
				decl: node.key
			});
		},
		onProperty(node) {
			if (node.value.type === "FunctionExpression") {
				setCovered(node.value);
				mapper.onFunction(node, {
					loc: node.value.body,
					decl: node.key
				});
			}
		},
		onClassMethod(babelNode) {
			const node = {
				type: "FunctionExpression",
				start: babelNode.start,
				end: babelNode.end,
				body: {
					type: "BlockStatement",
					start: babelNode.body.start,
					end: babelNode.body.end,
					body: []
				},
				params: []
			};
			mapper.onFunction(node, {
				loc: node.body,
				decl: {
					start: babelNode.key.start,
					end: babelNode.key.end
				}
			});
		},
		onObjectMethod(babelNode) {
			const node = {
				type: "FunctionExpression",
				start: babelNode.start,
				end: babelNode.end,
				body: {
					type: "BlockStatement",
					start: babelNode.body.start,
					end: babelNode.body.end,
					body: []
				},
				params: []
			};
			mapper.onFunction(node, {
				loc: node.body,
				decl: {
					start: babelNode.key.start,
					end: babelNode.key.end
				}
			});
		},
		onBreakStatement: (node) => mapper.onStatement(node),
		onContinueStatement: (node) => mapper.onStatement(node),
		onDebuggerStatement: (node) => mapper.onStatement(node),
		onReturnStatement: (node) => mapper.onStatement(node),
		onThrowStatement: (node) => mapper.onStatement(node),
		onTryStatement: (node) => mapper.onStatement(node),
		onForStatement: (node) => mapper.onStatement(node),
		onForInStatement: (node) => mapper.onStatement(node),
		onForOfStatement: (node) => mapper.onStatement(node),
		onWhileStatement: (node) => mapper.onStatement(node),
		onDoWhileStatement: (node) => mapper.onStatement(node),
		onWithStatement: (node) => mapper.onStatement(node),
		onLabeledStatement: (node) => mapper.onStatement(node),
		onExpressionStatement(node) {
			if (node.expression.type === "Literal" && node.expression.value === "use strict") return;
			mapper.onStatement(node);
		},
		onVariableDeclarator(node) {
			if (node.init) mapper.onStatement(node.init, node);
		},
		onClassBody(node) {
			for (const child of node.body) if ((child.type === "PropertyDefinition" || child.type === "ClassProperty" || child.type === "ClassPrivateProperty") && child.value) mapper.onStatement(child.value);
		},
		onIfStatement(node, branches) {
			mapper.onBranch("if", node, branches);
			mapper.onStatement(node);
		},
		onConditionalExpression(node, branches) {
			mapper.onBranch("cond-expr", node, branches);
		},
		onLogicalExpression(node, branches) {
			mapper.onBranch("binary-expr", node, branches);
		},
		onSwitchStatement(node, cases) {
			mapper.onBranch("switch", node, cases);
			mapper.onStatement(node);
		},
		onAssignmentPattern(node) {
			mapper.onBranch("default-arg", node, [node.right]);
		}
	});
	return mapper.generate();
}
const coveredNodes = /* @__PURE__ */ new WeakSet();
function setCovered(node) {
	coveredNodes.add(node);
}
function isCovered(node) {
	return coveredNodes.has(node);
}

//#endregion
export { convert, convert as default };