const __cjs_require = globalThis.process.getBuiltinModule("module").createRequire(import.meta.url);
import { a as RE_JSON, c as RE_VUE, d as filename_to_dts, f as replaceTemplateName, i as RE_JS, l as filename_dts_to, n as RE_DTS, o as RE_NODE_MODULES, p as resolveTemplateFn, r as RE_DTS_MAP, s as RE_TS, t as RE_CSS, u as filename_js_to_dts } from "./filename-Cqnsj8Gp.mjs";
import { n as globalContext, r as invalidateContextFile, t as createContext } from "./context-EuY-ImLj.mjs";
import { createDebug } from "obug";
import MagicString from "magic-string";
const {
  generate
} = __cjs_require("@babel/generator");
const {
  parse
} = __cjs_require("@babel/parser");
const t = __cjs_require("@babel/types");
import { isDeclarationType, isIdentifierOf, isTypeOf, resolveString, walkAST } from "ast-kit";
const {
  fork,
  spawn
} = globalThis.process.getBuiltinModule("node:child_process");
const {
  existsSync
} = globalThis.process.getBuiltinModule("node:fs");
const {
  mkdtemp,
  readFile,
  rm
} = globalThis.process.getBuiltinModule("node:fs/promises");
const {
  tmpdir
} = globalThis.process.getBuiltinModule("node:os");
const path = globalThis.process.getBuiltinModule("node:path");
import { ResolverFactory, isolatedDeclaration } from "rolldown/experimental";
const process = globalThis.process;
import { getTsconfig, parseTsconfig } from "get-tsconfig";
import { createResolver } from "dts-resolver";

//#region src/banner.ts
function createBannerPlugin({ banner, footer }) {
	return {
		name: "rolldown-plugin-dts:banner",
		async renderChunk(code, chunk) {
			if (!RE_DTS.test(chunk.fileName)) return;
			const s = new MagicString(code);
			if (banner) {
				const code$1 = await (typeof banner === "function" ? banner(chunk) : banner);
				if (code$1) s.prepend(`${code$1}\n`);
			}
			if (footer) {
				const code$1 = await (typeof footer === "function" ? footer(chunk) : footer);
				if (code$1) s.append(`\n${code$1}`);
			}
			return {
				code: s.toString(),
				get map() {
					return s.generateMap({
						source: chunk.fileName,
						includeContent: true,
						hires: "boundary"
					});
				}
			};
		}
	};
}

//#endregion
//#region src/dts-input.ts
function createDtsInputPlugin({ sideEffects }) {
	return {
		name: "rolldown-plugin-dts:dts-input",
		options: sideEffects === false ? (options) => {
			return {
				treeshake: options.treeshake === false ? false : {
					...options.treeshake === true ? {} : options.treeshake,
					moduleSideEffects: false
				},
				...options
			};
		} : void 0,
		outputOptions(options) {
			return {
				...options,
				entryFileNames(chunk) {
					const { entryFileNames } = options;
					if (entryFileNames) {
						const nameTemplate = resolveTemplateFn(entryFileNames, chunk);
						const renderedName = replaceTemplateName(nameTemplate, chunk.name);
						if (RE_DTS.test(renderedName)) return nameTemplate;
						const renderedNameWithD = replaceTemplateName(nameTemplate, `${chunk.name}.d`);
						if (RE_DTS.test(renderedNameWithD)) return renderedNameWithD;
					}
					if (RE_DTS.test(chunk.name)) return chunk.name;
					if (chunk.name.endsWith(".d")) return "[name].ts";
					return "[name].d.ts";
				}
			};
		}
	};
}

//#endregion
//#region src/fake-js.ts
function createFakeJsPlugin({ sourcemap, cjsDefault, sideEffects }) {
	let symbolIdx = 0;
	const identifierMap = Object.create(null);
	const symbolMap = /* @__PURE__ */ new Map();
	const commentsMap = /* @__PURE__ */ new Map();
	const typeOnlyMap = /* @__PURE__ */ new Map();
	return {
		name: "rolldown-plugin-dts:fake-js",
		outputOptions(options) {
			if (options.format === "cjs" || options.format === "commonjs") throw new Error("[rolldown-plugin-dts] Cannot bundle dts files with `cjs` format.");
			const { chunkFileNames, entryFileNames } = options;
			return {
				...options,
				sourcemap: options.sourcemap || sourcemap,
				chunkFileNames(chunk) {
					const nameTemplate = resolveTemplateFn(chunk.isEntry ? entryFileNames || "[name].js" : chunkFileNames || "[name]-[hash].js", chunk);
					if (chunk.name.endsWith(".d")) {
						const renderedNameWithoutD = filename_js_to_dts(replaceTemplateName(nameTemplate, chunk.name.slice(0, -2)));
						if (RE_DTS.test(renderedNameWithoutD)) return renderedNameWithoutD;
						const renderedName = filename_js_to_dts(replaceTemplateName(nameTemplate, chunk.name));
						if (RE_DTS.test(renderedName)) return renderedName;
					}
					return nameTemplate;
				}
			};
		},
		transform: {
			filter: { id: RE_DTS },
			handler: transform
		},
		renderChunk,
		generateBundle: sourcemap ? void 0 : (options, bundle) => {
			for (const chunk of Object.values(bundle)) {
				if (!RE_DTS_MAP.test(chunk.fileName)) continue;
				delete bundle[chunk.fileName];
			}
		}
	};
	function transform(code, id) {
		const file = parse(code, {
			plugins: [["typescript", { dts: true }]],
			sourceType: "module",
			errorRecovery: true
		});
		const { program, comments } = file;
		const typeOnlyIds = [];
		if (comments) {
			const directives = collectReferenceDirectives(comments);
			commentsMap.set(id, directives);
		}
		const appendStmts = [];
		const namespaceStmts = /* @__PURE__ */ new Map();
		for (const [i, stmt] of program.body.entries()) {
			const setStmt = (stmt$1) => program.body[i] = stmt$1;
			if (rewriteImportExport(stmt, setStmt, typeOnlyIds)) continue;
			const sideEffect = stmt.type === "TSModuleDeclaration" && stmt.kind !== "namespace";
			if (sideEffect && id.endsWith(".vue.d.ts") && code.slice(stmt.start, stmt.end).includes("__VLS_")) continue;
			const isDefaultExport = stmt.type === "ExportDefaultDeclaration";
			const isDecl = isTypeOf(stmt, ["ExportNamedDeclaration", "ExportDefaultDeclaration"]) && stmt.declaration;
			const decl = isDecl ? stmt.declaration : stmt;
			const setDecl = isDecl ? (decl$1) => stmt.declaration = decl$1 : setStmt;
			if (decl.type !== "TSDeclareFunction" && !isDeclarationType(decl)) continue;
			if (isTypeOf(decl, [
				"TSEnumDeclaration",
				"ClassDeclaration",
				"FunctionDeclaration",
				"TSDeclareFunction",
				"TSModuleDeclaration",
				"VariableDeclaration"
			])) decl.declare = true;
			const bindings = [];
			if (decl.type === "VariableDeclaration") bindings.push(...decl.declarations.map((decl$1) => decl$1.id));
			else if ("id" in decl && decl.id) {
				let binding = decl.id;
				binding = sideEffect ? t.identifier(`_${getIdentifierIndex("")}`) : binding;
				bindings.push(binding);
			} else {
				const binding = t.identifier("export_default");
				bindings.push(binding);
				decl.id = binding;
			}
			const params = collectParams(decl);
			const deps = collectDependencies(decl, namespaceStmts);
			if (decl !== stmt) decl.leadingComments = stmt.leadingComments;
			const symbolId = registerSymbol({
				decl,
				deps,
				bindings,
				params
			});
			const symbolIdNode = t.numericLiteral(symbolId);
			const depsNode = t.arrowFunctionExpression(params.map(({ name }) => t.identifier(name)), t.arrayExpression(deps));
			const sideEffectNode = sideEffect && t.callExpression(t.identifier("sideEffect"), [bindings[0]]);
			const runtimeArrayNode = runtimeBindingArrayExpression(sideEffectNode ? [
				symbolIdNode,
				depsNode,
				sideEffectNode
			] : [symbolIdNode, depsNode]);
			const runtimeAssignment = {
				type: "VariableDeclaration",
				kind: "var",
				declarations: [{
					type: "VariableDeclarator",
					id: {
						...bindings[0],
						typeAnnotation: null
					},
					init: runtimeArrayNode
				}, ...bindings.slice(1).map((binding) => ({
					type: "VariableDeclarator",
					id: {
						...binding,
						typeAnnotation: null
					}
				}))]
			};
			if (isDefaultExport) {
				appendStmts.push(t.exportNamedDeclaration(null, [t.exportSpecifier(bindings[0], t.identifier("default"))]));
				setStmt(runtimeAssignment);
			} else setDecl(runtimeAssignment);
		}
		if (sideEffects) appendStmts.push(t.expressionStatement(t.callExpression(t.identifier("sideEffect"), [])));
		program.body = [
			...Array.from(namespaceStmts.values()).map(({ stmt }) => stmt),
			...program.body,
			...appendStmts
		];
		typeOnlyMap.set(id, typeOnlyIds);
		return generate(file, {
			comments: false,
			sourceMaps: sourcemap,
			sourceFileName: id
		});
	}
	function renderChunk(code, chunk) {
		if (!RE_DTS.test(chunk.fileName)) return;
		const typeOnlyIds = [];
		for (const module of chunk.moduleIds) {
			const ids = typeOnlyMap.get(module);
			if (ids) typeOnlyIds.push(...ids);
		}
		const file = parse(code, { sourceType: "module" });
		const { program } = file;
		program.body = patchTsNamespace(program.body);
		program.body = patchReExport(program.body);
		program.body = program.body.map((node) => {
			if (isHelperImport(node)) return null;
			if (node.type === "ExpressionStatement") return null;
			const newNode = patchImportExport(node, typeOnlyIds, cjsDefault);
			if (newNode || newNode === false) return newNode;
			if (node.type !== "VariableDeclaration") return node;
			if (!isRuntimeBindingVariableDeclaration(node)) return null;
			const [symbolIdNode, depsFn] = node.declarations[0].init.elements;
			const symbolId = symbolIdNode.value;
			const original = getSymbol(symbolId);
			for (const [i, decl] of node.declarations.entries()) {
				const transformedBinding = {
					...decl.id,
					typeAnnotation: original.bindings[i].typeAnnotation
				};
				overwriteNode(original.bindings[i], transformedBinding);
			}
			const transformedParams = depsFn.params;
			for (const [i, transformedParam] of transformedParams.entries()) {
				const transformedName = transformedParam.name;
				for (const originalTypeParam of original.params[i].typeParams) originalTypeParam.name = transformedName;
			}
			const transformedDeps = depsFn.body.elements;
			for (let i = 0; i < original.deps.length; i++) {
				const originalDep = original.deps[i];
				if (originalDep.replace) originalDep.replace(transformedDeps[i]);
				else Object.assign(originalDep, transformedDeps[i]);
			}
			return inheritNodeComments(node, original.decl);
		}).filter((node) => !!node);
		if (program.body.length === 0) return "export { };";
		const comments = /* @__PURE__ */ new Set();
		const commentsValue = /* @__PURE__ */ new Set();
		for (const id of chunk.moduleIds) {
			const preserveComments = commentsMap.get(id);
			if (preserveComments) {
				preserveComments.forEach((c) => {
					const id$1 = c.type + c.value;
					if (commentsValue.has(id$1)) return;
					commentsValue.add(id$1);
					comments.add(c);
				});
				commentsMap.delete(id);
			}
		}
		if (comments.size) {
			program.body[0].leadingComments ||= [];
			program.body[0].leadingComments.unshift(...comments);
		}
		return generate(file, {
			comments: true,
			sourceMaps: sourcemap,
			sourceFileName: chunk.fileName
		});
	}
	function getIdentifierIndex(name) {
		if (name in identifierMap) return identifierMap[name]++;
		return identifierMap[name] = 0;
	}
	function registerSymbol(info) {
		const symbolId = symbolIdx++;
		symbolMap.set(symbolId, info);
		return symbolId;
	}
	function getSymbol(symbolId) {
		return symbolMap.get(symbolId);
	}
	/**
	* Collects all TSTypeParameter nodes from the given node and groups them by
	* their name. One name can associate with one or more type parameters. These
	* names will be used as the parameter name in the generated JavaScript
	* dependency function.
	*/
	function collectParams(node) {
		const typeParams = [];
		walkAST(node, { leave(node$1) {
			if ("typeParameters" in node$1 && node$1.typeParameters?.type === "TSTypeParameterDeclaration") typeParams.push(...node$1.typeParameters.params);
		} });
		const paramMap = /* @__PURE__ */ new Map();
		for (const typeParam of typeParams) {
			const name = typeParam.name;
			const group = paramMap.get(name);
			if (group) group.push(typeParam);
			else paramMap.set(name, [typeParam]);
		}
		return Array.from(paramMap.entries()).map(([name, typeParams$1]) => ({
			name,
			typeParams: typeParams$1
		}));
	}
	function collectDependencies(node, namespaceStmts) {
		const deps = /* @__PURE__ */ new Set();
		const seen = /* @__PURE__ */ new Set();
		walkAST(node, { leave(node$1) {
			if (node$1.type === "ExportNamedDeclaration") {
				for (const specifier of node$1.specifiers) if (specifier.type === "ExportSpecifier") addDependency(specifier.local);
			} else if (node$1.type === "TSInterfaceDeclaration" && node$1.extends) for (const heritage of node$1.extends || []) addDependency(TSEntityNameToRuntime(heritage.expression));
			else if (node$1.type === "ClassDeclaration") {
				if (node$1.superClass) addDependency(node$1.superClass);
				if (node$1.implements) for (const implement of node$1.implements) addDependency(TSEntityNameToRuntime(implement.expression));
			} else if (isTypeOf(node$1, [
				"ObjectMethod",
				"ObjectProperty",
				"ClassProperty",
				"TSPropertySignature",
				"TSDeclareMethod"
			])) {
				if (node$1.computed && isReferenceId(node$1.key)) addDependency(node$1.key);
				if ("value" in node$1 && isReferenceId(node$1.value)) addDependency(node$1.value);
			} else switch (node$1.type) {
				case "TSTypeReference":
					addDependency(TSEntityNameToRuntime(node$1.typeName));
					break;
				case "TSTypeQuery":
					if (seen.has(node$1.exprName)) return;
					if (node$1.exprName.type === "TSImportType") break;
					addDependency(TSEntityNameToRuntime(node$1.exprName));
					break;
				case "TSImportType": {
					seen.add(node$1);
					const source = node$1.argument;
					const imported = node$1.qualifier;
					addDependency(importNamespace(node$1, imported, source, namespaceStmts));
					break;
				}
			}
		} });
		return Array.from(deps);
		function addDependency(node$1) {
			if (isThisExpression(node$1)) return;
			deps.add(node$1);
		}
	}
	function importNamespace(node, imported, source, namespaceStmts) {
		const sourceText = source.value.replaceAll(/\W/g, "_");
		let local = t.identifier(`${sourceText}${getIdentifierIndex(sourceText)}`);
		if (namespaceStmts.has(source.value)) local = namespaceStmts.get(source.value).local;
		else namespaceStmts.set(source.value, {
			stmt: t.importDeclaration([t.importNamespaceSpecifier(local)], source),
			local
		});
		if (imported) {
			const importedLeft = getIdFromTSEntityName(imported);
			overwriteNode(importedLeft, t.tsQualifiedName(local, { ...importedLeft }));
			local = imported;
		}
		let replacement = node;
		if (node.typeParameters) {
			overwriteNode(node, t.tsTypeReference(local, node.typeParameters));
			replacement = local;
		} else overwriteNode(node, local);
		return {
			...TSEntityNameToRuntime(local),
			replace(newNode) {
				overwriteNode(replacement, newNode);
			}
		};
	}
}
const REFERENCE_RE = /\/\s*<reference\s+(?:path|types)=/;
function collectReferenceDirectives(comment, negative = false) {
	return comment.filter((c) => REFERENCE_RE.test(c.value) !== negative);
}
/**
* Check if the given node is a {@link RuntimeBindingVariableDeclration}
*/
function isRuntimeBindingVariableDeclaration(node) {
	return t.isVariableDeclaration(node) && node.declarations.length > 0 && t.isVariableDeclarator(node.declarations[0]) && isRuntimeBindingArrayExpression(node.declarations[0].init);
}
/**
* Check if the given node is a {@link RuntimeBindingArrayExpression}
*/
function isRuntimeBindingArrayExpression(node) {
	return t.isArrayExpression(node) && isRuntimeBindingArrayElements(node.elements);
}
function runtimeBindingArrayExpression(elements) {
	return t.arrayExpression(elements);
}
/**
* Check if the given array is a {@link RuntimeBindingArrayElements}
*/
function isRuntimeBindingArrayElements(elements) {
	const [symbolId, deps, effect] = elements;
	return t.isNumericLiteral(symbolId) && t.isArrowFunctionExpression(deps) && (!effect || t.isCallExpression(effect));
}
function isThisExpression(node) {
	return isIdentifierOf(node, "this") || node.type === "MemberExpression" && isThisExpression(node.object);
}
function TSEntityNameToRuntime(node) {
	if (node.type === "Identifier") return node;
	const left = TSEntityNameToRuntime(node.left);
	return Object.assign(node, t.memberExpression(left, node.right));
}
function getIdFromTSEntityName(node) {
	if (node.type === "Identifier") return node;
	return getIdFromTSEntityName(node.left);
}
function isReferenceId(node) {
	return isTypeOf(node, ["Identifier", "MemberExpression"]);
}
function isHelperImport(node) {
	return node.type === "ImportDeclaration" && node.specifiers.length === 1 && node.specifiers.every((spec) => spec.type === "ImportSpecifier" && spec.imported.type === "Identifier" && ["__export", "__reExport"].includes(spec.local.name));
}
/**
* patch `.d.ts` suffix in import source to `.js`
*/
function patchImportExport(node, typeOnlyIds, cjsDefault) {
	if (node.type === "ExportNamedDeclaration" && !node.declaration && !node.source && !node.specifiers.length && !node.attributes?.length) return false;
	if (isTypeOf(node, [
		"ImportDeclaration",
		"ExportAllDeclaration",
		"ExportNamedDeclaration"
	])) {
		if (node.type === "ExportNamedDeclaration" && typeOnlyIds.length) for (const spec of node.specifiers) {
			const name = resolveString(spec.exported);
			if (typeOnlyIds.includes(name)) if (spec.type === "ExportSpecifier") spec.exportKind = "type";
			else node.exportKind = "type";
		}
		if (node.source?.value && RE_DTS.test(node.source.value)) {
			node.source.value = filename_dts_to(node.source.value, "js");
			return node;
		}
		if (cjsDefault && node.type === "ExportNamedDeclaration" && !node.source && node.specifiers.length === 1 && node.specifiers[0].type === "ExportSpecifier" && resolveString(node.specifiers[0].exported) === "default") return {
			type: "TSExportAssignment",
			expression: node.specifiers[0].local
		};
	}
}
/**
* Handle `__export` call
*/
function patchTsNamespace(nodes) {
	const removed = /* @__PURE__ */ new Set();
	for (const [i, node] of nodes.entries()) {
		const result = handleExport(node);
		if (!result) continue;
		const [binding, exports] = result;
		nodes[i] = {
			type: "TSModuleDeclaration",
			id: binding,
			kind: "namespace",
			declare: true,
			body: {
				type: "TSModuleBlock",
				body: [{
					type: "ExportNamedDeclaration",
					specifiers: exports.properties.filter((property) => property.type === "ObjectProperty").map((property) => {
						const local = property.value.body;
						const exported = property.key;
						return t.exportSpecifier(local, exported);
					}),
					source: null,
					declaration: null
				}]
			}
		};
	}
	return nodes.filter((node) => !removed.has(node));
	function handleExport(node) {
		if (node.type !== "VariableDeclaration" || node.declarations.length !== 1 || node.declarations[0].id.type !== "Identifier" || node.declarations[0].init?.type !== "CallExpression" || node.declarations[0].init.callee.type !== "Identifier" || node.declarations[0].init.callee.name !== "__export" || node.declarations[0].init.arguments.length !== 1 || node.declarations[0].init.arguments[0].type !== "ObjectExpression") return false;
		return [node.declarations[0].id, node.declarations[0].init.arguments[0]];
	}
}
/**
* Handle `__reExport` call
*/
function patchReExport(nodes) {
	const exportsNames = /* @__PURE__ */ new Map();
	for (const [i, node] of nodes.entries()) if (node.type === "ImportDeclaration" && node.specifiers.length === 1 && node.specifiers[0].type === "ImportSpecifier" && node.specifiers[0].local.type === "Identifier" && node.specifiers[0].local.name.endsWith("_exports")) exportsNames.set(node.specifiers[0].local.name, node.specifiers[0].local.name);
	else if (node.type === "ExpressionStatement" && node.expression.type === "CallExpression" && isIdentifierOf(node.expression.callee, "__reExport")) {
		const args = node.expression.arguments;
		exportsNames.set(args[0].name, args[1].name);
	} else if (node.type === "VariableDeclaration" && node.declarations.length === 1 && node.declarations[0].init?.type === "MemberExpression" && node.declarations[0].init.object.type === "Identifier" && exportsNames.has(node.declarations[0].init.object.name)) nodes[i] = {
		type: "TSTypeAliasDeclaration",
		id: {
			type: "Identifier",
			name: node.declarations[0].id.name
		},
		typeAnnotation: {
			type: "TSTypeReference",
			typeName: {
				type: "TSQualifiedName",
				left: {
					type: "Identifier",
					name: exportsNames.get(node.declarations[0].init.object.name)
				},
				right: {
					type: "Identifier",
					name: node.declarations[0].init.property.name
				}
			}
		}
	};
	else if (node.type === "ExportNamedDeclaration" && node.specifiers.length === 1 && node.specifiers[0].type === "ExportSpecifier" && node.specifiers[0].local.type === "Identifier" && exportsNames.has(node.specifiers[0].local.name)) node.specifiers[0].local.name = exportsNames.get(node.specifiers[0].local.name);
	return nodes;
}
function rewriteImportExport(node, set, typeOnlyIds) {
	if (node.type === "ImportDeclaration" || node.type === "ExportNamedDeclaration" && !node.declaration) {
		for (const specifier of node.specifiers) {
			if ("exportKind" in specifier && specifier.exportKind === "type" || "exportKind" in node && node.exportKind === "type") typeOnlyIds.push(resolveString(specifier.exported));
			if (specifier.type === "ImportSpecifier") specifier.importKind = "value";
			else if (specifier.type === "ExportSpecifier") specifier.exportKind = "value";
		}
		if (node.type === "ImportDeclaration") node.importKind = "value";
		else if (node.type === "ExportNamedDeclaration") node.exportKind = "value";
		return true;
	} else if (node.type === "ExportAllDeclaration") {
		node.exportKind = "value";
		return true;
	} else if (node.type === "TSImportEqualsDeclaration") {
		if (node.moduleReference.type === "TSExternalModuleReference") set({
			type: "ImportDeclaration",
			specifiers: [{
				type: "ImportDefaultSpecifier",
				local: node.id
			}],
			source: node.moduleReference.expression
		});
		return true;
	} else if (node.type === "TSExportAssignment" && node.expression.type === "Identifier") {
		set({
			type: "ExportNamedDeclaration",
			specifiers: [{
				type: "ExportSpecifier",
				local: node.expression,
				exported: {
					type: "Identifier",
					name: "default"
				}
			}]
		});
		return true;
	} else if (node.type === "ExportDefaultDeclaration" && node.declaration.type === "Identifier") {
		set({
			type: "ExportNamedDeclaration",
			specifiers: [{
				type: "ExportSpecifier",
				local: node.declaration,
				exported: t.identifier("default")
			}]
		});
		return true;
	}
	return false;
}
function overwriteNode(node, newNode) {
	for (const key of Object.keys(node)) delete node[key];
	Object.assign(node, newNode);
	return node;
}
function inheritNodeComments(oldNode, newNode) {
	newNode.leadingComments ||= [];
	const leadingComments = oldNode.leadingComments?.filter((comment) => comment.value.startsWith("#"));
	if (leadingComments) newNode.leadingComments.unshift(...leadingComments);
	newNode.leadingComments = collectReferenceDirectives(newNode.leadingComments, true);
	return newNode;
}

//#endregion
//#region src/generate.ts
const debug$1 = createDebug("rolldown-plugin-dts:generate");
const WORKER_URL = "./tsc-worker.js";
const spawnAsync = (...args) => new Promise((resolve, reject) => {
	const child = spawn(...args);
	child.on("close", () => resolve());
	child.on("error", (error) => reject(error));
});
function createGeneratePlugin({ tsconfig, tsconfigRaw, build, incremental, cwd, oxc, emitDtsOnly, vue, tsMacro, parallel, eager, tsgo, newContext, emitJs, sourcemap }) {
	const dtsMap = /* @__PURE__ */ new Map();
	/**
	* A map of input id to output file name
	*
	* @example
	*
	* inputAlias = new Map([
	*   ['/absolute/path/to/src/source_file.ts', 'dist/foo/index'],
	* ])
	*/
	const inputAliasMap = /* @__PURE__ */ new Map();
	let childProcess;
	let rpc;
	let tscModule;
	let tscContext;
	let tsgoDist;
	return {
		name: "rolldown-plugin-dts:generate",
		async buildStart(options) {
			if (tsgo) tsgoDist = await runTsgo(cwd, tsconfig);
			else if (!oxc) if (parallel) {
				childProcess = fork(new URL(WORKER_URL, import.meta.url), { stdio: "inherit" });
				rpc = (await import("birpc")).createBirpc({}, {
					post: (data) => childProcess.send(data),
					on: (fn) => childProcess.on("message", fn)
				});
			} else {
				tscModule = await import("./tsc.mjs");
				if (newContext) tscContext = createContext();
			}
			if (!Array.isArray(options.input)) for (const [name, id] of Object.entries(options.input)) {
				debug$1("resolving input alias %s -> %s", name, id);
				let resolved = await this.resolve(id);
				if (!id.startsWith("./")) resolved ||= await this.resolve(`./${id}`);
				const resolvedId = resolved?.id || id;
				debug$1("resolved input alias %s -> %s", id, resolvedId);
				inputAliasMap.set(resolvedId, name);
			}
		},
		outputOptions(options) {
			return {
				...options,
				entryFileNames(chunk) {
					const { entryFileNames } = options;
					const nameTemplate = resolveTemplateFn(entryFileNames || "[name].js", chunk);
					if (chunk.name.endsWith(".d")) {
						if (RE_DTS.test(nameTemplate)) return replaceTemplateName(nameTemplate, chunk.name.slice(0, -2));
						if (RE_JS.test(nameTemplate)) return nameTemplate.replace(RE_JS, ".$1ts");
					}
					return nameTemplate;
				}
			};
		},
		resolveId(id) {
			if (dtsMap.has(id)) {
				debug$1("resolve dts id %s", id);
				return { id };
			}
		},
		transform: {
			order: "pre",
			filter: { id: {
				include: [
					RE_JS,
					RE_TS,
					RE_VUE,
					RE_JSON
				],
				exclude: [RE_DTS, RE_NODE_MODULES]
			} },
			handler(code, id) {
				if (!RE_JS.test(id) || emitJs) {
					const isEntry = !!this.getModuleInfo(id)?.isEntry;
					const dtsId = filename_to_dts(id);
					dtsMap.set(dtsId, {
						code,
						id,
						isEntry
					});
					debug$1("register dts source: %s", id);
					if (isEntry) {
						const name = inputAliasMap.get(id);
						this.emitFile({
							type: "chunk",
							id: dtsId,
							name: name ? `${name}.d` : void 0
						});
					}
				}
				if (emitDtsOnly) {
					if (RE_JSON.test(id)) return "{}";
					return "export { }";
				}
			}
		},
		load: {
			filter: { id: {
				include: [RE_DTS],
				exclude: [RE_NODE_MODULES]
			} },
			async handler(dtsId) {
				if (!dtsMap.has(dtsId)) return;
				const { code, id } = dtsMap.get(dtsId);
				let dtsCode;
				let map;
				debug$1("generate dts %s from %s", dtsId, id);
				if (tsgo) {
					if (RE_VUE.test(id)) throw new Error("tsgo does not support Vue files.");
					const dtsPath = path.resolve(tsgoDist, path.relative(path.resolve(cwd), filename_to_dts(id)));
					if (existsSync(dtsPath)) dtsCode = await readFile(dtsPath, "utf8");
					else {
						debug$1("[tsgo]", dtsPath, "is missing");
						throw new Error(`tsgo did not generate dts file for ${id}, please check your tsconfig.`);
					}
				} else if (oxc && !RE_VUE.test(id)) {
					const result = isolatedDeclaration(id, code, oxc);
					if (result.errors.length) {
						const [error] = result.errors;
						return this.error({
							message: error.message,
							frame: error.codeframe
						});
					}
					dtsCode = result.code;
					if (result.map) {
						map = result.map;
						map.sourcesContent = void 0;
					}
				} else {
					const options = {
						tsconfig,
						tsconfigRaw,
						build,
						incremental,
						cwd,
						entries: eager ? void 0 : Array.from(dtsMap.values()).filter((v) => v.isEntry).map((v) => v.id),
						id,
						sourcemap,
						vue,
						tsMacro,
						context: tscContext
					};
					let result;
					if (parallel) result = await rpc.tscEmit(options);
					else result = tscModule.tscEmit(options);
					if (result.error) return this.error(result.error);
					dtsCode = result.code;
					map = result.map;
					if (dtsCode && RE_JSON.test(id)) if (dtsCode.includes("declare const _exports")) {
						if (dtsCode.includes("declare const _exports: {")) {
							const exports = collectJsonExports(dtsCode);
							let i = 0;
							dtsCode += exports.map((e) => {
								const valid = `_${e.replaceAll(/[^\w$]/g, "_")}${i++}`;
								const jsonKey = JSON.stringify(e);
								return `declare let ${valid}: typeof _exports[${jsonKey}]\nexport { ${valid} as ${jsonKey} }`;
							}).join("\n");
						}
					} else {
						const exportMap = collectJsonExportMap(dtsCode);
						dtsCode += `
declare namespace __json_default_export {
  export { ${Array.from(exportMap.entries()).map(([exported, local]) => exported === local ? exported : `${local} as ${exported}`).join(", ")} }
}
export { __json_default_export as default }`;
					}
				}
				return {
					code: dtsCode || "",
					map
				};
			}
		},
		generateBundle: emitDtsOnly ? (options, bundle) => {
			for (const fileName of Object.keys(bundle)) if (bundle[fileName].type === "chunk" && !RE_DTS.test(fileName) && !RE_DTS_MAP.test(fileName)) delete bundle[fileName];
		} : void 0,
		async buildEnd() {
			childProcess?.kill();
			if (!debug$1.enabled && tsgoDist) await rm(tsgoDist, {
				recursive: true,
				force: true
			}).catch(() => {});
			tsgoDist = void 0;
			if (newContext) tscContext = void 0;
		},
		watchChange(id) {
			if (tscModule) invalidateContextFile(tscContext || globalContext, id);
		}
	};
}
async function runTsgo(root, tsconfig) {
	const tsgoPkg = import.meta.resolve("@typescript/native-preview/package.json");
	const { default: getExePath } = await import(new URL("lib/getExePath.js", tsgoPkg).href);
	const tsgo = getExePath();
	const tsgoDist = await mkdtemp(path.join(tmpdir(), "rolldown-plugin-dts-"));
	debug$1("[tsgo] tsgoDist", tsgoDist);
	await spawnAsync(tsgo, [
		"--noEmit",
		"false",
		"--declaration",
		"--emitDeclarationOnly",
		...tsconfig ? ["-p", tsconfig] : [],
		"--outDir",
		tsgoDist,
		"--rootDir",
		root,
		"--noCheck"
	], { stdio: "inherit" });
	return tsgoDist;
}
function collectJsonExportMap(code) {
	const exportMap = /* @__PURE__ */ new Map();
	const { program } = parse(code, {
		sourceType: "module",
		plugins: [["typescript", { dts: true }]],
		errorRecovery: true
	});
	for (const decl of program.body) if (decl.type === "ExportNamedDeclaration") {
		if (decl.declaration) {
			if (decl.declaration.type === "VariableDeclaration") {
				for (const vdecl of decl.declaration.declarations) if (vdecl.id.type === "Identifier") exportMap.set(vdecl.id.name, vdecl.id.name);
			} else if (decl.declaration.type === "TSModuleDeclaration" && decl.declaration.id.type === "Identifier") exportMap.set(decl.declaration.id.name, decl.declaration.id.name);
		} else if (decl.specifiers.length) {
			for (const spec of decl.specifiers) if (spec.type === "ExportSpecifier" && spec.exported.type === "Identifier") exportMap.set(spec.exported.name, spec.local.type === "Identifier" ? spec.local.name : spec.exported.name);
		}
	}
	return exportMap;
}
/** `declare const _exports` mode */
function collectJsonExports(code) {
	const exports = [];
	const { program } = parse(code, {
		sourceType: "module",
		plugins: [["typescript", { dts: true }]]
	});
	const members = program.body[0].declarations[0].id.typeAnnotation.typeAnnotation.members;
	for (const member of members) if (member.key.type === "Identifier") exports.push(member.key.name);
	else if (member.key.type === "StringLiteral") exports.push(member.key.value);
	return exports;
}

//#endregion
//#region src/options.ts
let warnedTsgo = false;
function resolveOptions({ cwd = process.cwd(), dtsInput = false, emitDtsOnly = false, tsconfig, tsconfigRaw: overriddenTsconfigRaw = {}, compilerOptions = {}, sourcemap, resolve = false, resolver = "oxc", cjsDefault = false, banner, footer, sideEffects = false, build = false, incremental = false, vue = false, tsMacro = false, parallel = false, eager = false, newContext = false, emitJs, oxc, tsgo = false }) {
	let resolvedTsconfig;
	if (tsconfig === true || tsconfig == null) {
		const { config, path: path$1 } = getTsconfig(cwd) || {};
		tsconfig = path$1;
		resolvedTsconfig = config;
	} else if (typeof tsconfig === "string") {
		tsconfig = path.resolve(cwd || process.cwd(), tsconfig);
		resolvedTsconfig = parseTsconfig(tsconfig);
	} else tsconfig = void 0;
	compilerOptions = {
		...resolvedTsconfig?.compilerOptions,
		...compilerOptions
	};
	incremental ||= compilerOptions.incremental || !!compilerOptions.tsBuildInfoFile;
	sourcemap ??= !!compilerOptions.declarationMap;
	compilerOptions.declarationMap = sourcemap;
	const tsconfigRaw = {
		...resolvedTsconfig,
		...overriddenTsconfigRaw,
		compilerOptions
	};
	oxc ??= !!(compilerOptions?.isolatedDeclarations && !vue && !tsgo && !tsMacro);
	if (oxc === true) oxc = {};
	if (oxc) {
		oxc.stripInternal ??= !!compilerOptions?.stripInternal;
		oxc.sourcemap = !!compilerOptions.declarationMap;
	}
	emitJs ??= !!(compilerOptions.checkJs || compilerOptions.allowJs);
	if (tsgo) {
		if (vue) throw new Error("[rolldown-plugin-dts] The `tsgo` option is not compatible with the `vue` option. Please disable one of them.");
		if (tsMacro) throw new Error("[rolldown-plugin-dts] The `tsgo` option is not compatible with the `tsMacro` option. Please disable one of them.");
		if (oxc) throw new Error("[rolldown-plugin-dts] The `tsgo` option is not compatible with the `oxc` option. Please disable one of them.");
	}
	if (oxc && vue) throw new Error("[rolldown-plugin-dts] The `oxc` option is not compatible with the `vue` option. Please disable one of them.");
	if (oxc && tsMacro) throw new Error("[rolldown-plugin-dts] The `oxc` option is not compatible with the `tsMacro` option. Please disable one of them.");
	if (tsgo && !warnedTsgo) {
		console.warn("The `tsgo` option is experimental and may change in the future.");
		warnedTsgo = true;
	}
	return {
		cwd,
		dtsInput,
		emitDtsOnly,
		tsconfig,
		tsconfigRaw,
		sourcemap,
		resolve,
		resolver,
		cjsDefault,
		banner,
		footer,
		sideEffects,
		build,
		incremental,
		vue,
		tsMacro,
		parallel,
		eager,
		newContext,
		emitJs,
		oxc,
		tsgo
	};
}

//#endregion
//#region src/resolver.ts
function isSourceFile(id) {
	return RE_TS.test(id) || RE_VUE.test(id) || RE_JSON.test(id);
}
function createDtsResolvePlugin({ cwd, tsconfig, tsconfigRaw, resolve, resolver, sideEffects }) {
	const baseDtsResolver = createResolver({
		tsconfig,
		resolveNodeModules: !!resolve,
		ResolverFactory
	});
	const moduleSideEffects = sideEffects ? true : null;
	return {
		name: "rolldown-plugin-dts:resolver",
		resolveId: {
			order: "pre",
			async handler(id, importer, options) {
				if (!importer || !RE_DTS.test(importer)) return;
				const external = {
					id,
					external: true,
					moduleSideEffects: sideEffects
				};
				if (RE_CSS.test(id)) return external;
				const rolldownResolution = await this.resolve(id, importer, options);
				const dtsResolution = await resolveDtsPath(id, importer, rolldownResolution);
				if (!dtsResolution) return isFilePath(id) ? null : external;
				if (RE_NODE_MODULES.test(dtsResolution) && !shouldBundleNodeModule(id) && (!RE_NODE_MODULES.test(importer) || rolldownResolution?.external)) return external;
				if (RE_DTS.test(dtsResolution)) return {
					id: dtsResolution,
					moduleSideEffects
				};
				if (isSourceFile(dtsResolution)) {
					await this.load({ id: dtsResolution });
					return {
						id: filename_to_dts(dtsResolution),
						moduleSideEffects
					};
				}
			}
		}
	};
	function shouldBundleNodeModule(id) {
		if (typeof resolve === "boolean") return resolve;
		return resolve.some((pattern) => typeof pattern === "string" ? id === pattern : pattern.test(id));
	}
	async function resolveDtsPath(id, importer, rolldownResolution) {
		let dtsPath;
		if (resolver === "tsc") {
			const { tscResolve } = await import("./resolver-DksQRwY1.mjs");
			dtsPath = tscResolve(id, importer, cwd, tsconfig, tsconfigRaw);
		} else dtsPath = baseDtsResolver(id, importer);
		if (dtsPath) dtsPath = path.normalize(dtsPath);
		if (!dtsPath || !isSourceFile(dtsPath)) {
			if (rolldownResolution && isFilePath(rolldownResolution.id) && isSourceFile(rolldownResolution.id) && !rolldownResolution.external) return rolldownResolution.id;
			return null;
		}
		return dtsPath;
	}
}
function isFilePath(id) {
	return id.startsWith(".") || path.isAbsolute(id);
}

//#endregion
//#region src/index.ts
const debug = createDebug("rolldown-plugin-dts:options");
function dts(options = {}) {
	debug("resolving dts options");
	const resolved = resolveOptions(options);
	debug("resolved dts options %o", resolved);
	const plugins = [];
	if (options.dtsInput) plugins.push(createDtsInputPlugin(resolved));
	else plugins.push(createGeneratePlugin(resolved));
	plugins.push(createDtsResolvePlugin(resolved), createFakeJsPlugin(resolved));
	if (options.banner || options.footer) plugins.push(createBannerPlugin(resolved));
	return plugins;
}

//#endregion
export { RE_CSS, RE_DTS, RE_DTS_MAP, RE_JS, RE_JSON, RE_NODE_MODULES, RE_TS, RE_VUE, createFakeJsPlugin, createGeneratePlugin, dts, resolveOptions };