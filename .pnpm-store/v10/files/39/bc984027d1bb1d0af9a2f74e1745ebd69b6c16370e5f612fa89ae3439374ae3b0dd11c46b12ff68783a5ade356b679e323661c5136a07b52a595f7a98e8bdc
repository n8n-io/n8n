import { a as cleanUrl, c as createManualModuleSource } from './chunk-utils.js';
import { a as automockModule, e as esmWalker } from './chunk-automock.js';
import MagicString from 'magic-string';
import { createFilter } from 'vite';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path/posix';
import { M as MockerRegistry, a as ManualMockedModule } from './chunk-registry.js';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { findMockRedirect } from './redirect.js';
import { i as isAbsolute, j as join$1, r as resolve } from './chunk-pathe.M-eThtNZ.js';
import 'estree-walker';
import 'node:module';

function automockPlugin(options = {}) {
	return {
		name: "vitest:automock",
		enforce: "post",
		transform(code, id) {
			if (id.includes("mock=automock") || id.includes("mock=autospy")) {
				const mockType = id.includes("mock=automock") ? "automock" : "autospy";
				const ms = automockModule(code, mockType, this.parse, options);
				return {
					code: ms.toString(),
					map: ms.generateMap({
						hires: "boundary",
						source: cleanUrl(id)
					})
				};
			}
		}
	};
}

const regexDynamicImport = /import\s*\(/;
function dynamicImportPlugin(options = {}) {
	return {
		name: "vitest:browser:esm-injector",
		enforce: "post",
		transform(source, id) {
			// TODO: test is not called for static imports
			if (!regexDynamicImport.test(source)) {
				return;
			}
			if (options.filter && !options.filter(id)) {
				return;
			}
			return injectDynamicImport(source, id, this.parse, options);
		}
	};
}
function injectDynamicImport(code, id, parse, options = {}) {
	const s = new MagicString(code);
	let ast;
	try {
		ast = parse(code);
	} catch (err) {
		console.error(`Cannot parse ${id}:\n${err.message}`);
		return;
	}
	// 3. convert references to import bindings & import.meta references
	esmWalker(ast, {
		onImportMeta() {
			// s.update(node.start, node.end, viImportMetaKey)
		},
		onDynamicImport(node) {
			const globalThisAccessor = options.globalThisAccessor || "\"__vitest_mocker__\"";
			const replaceString = `globalThis[${globalThisAccessor}].wrapDynamicImport(() => import(`;
			const importSubstring = code.substring(node.start, node.end);
			const hasIgnore = importSubstring.includes("/* @vite-ignore */");
			s.overwrite(node.start, node.source.start, replaceString + (hasIgnore ? "/* @vite-ignore */ " : ""));
			s.overwrite(node.end - 1, node.end, "))");
		}
	});
	return {
		code: s.toString(),
		map: s.generateMap({
			hires: "boundary",
			source: id
		})
	};
}

// AST walker module for ESTree compatible trees


function makeTest(test) {
  if (typeof test === "string")
    { return function (type) { return type === test; } }
  else if (!test)
    { return function () { return true; } }
  else
    { return test }
}

var Found = function Found(node, state) { this.node = node; this.state = state; };

// Find the innermost node of a given type that contains the given
// position. Interface similar to findNodeAt.
function findNodeAround(node, pos, test, baseVisitor, state) {
  test = makeTest(test);
  if (!baseVisitor) { baseVisitor = base; }
  try {
    (function c(node, st, override) {
      var type = override || node.type;
      if (node.start > pos || node.end < pos) { return }
      baseVisitor[type](node, st, c);
      if (test(type, node)) { throw new Found(node, st) }
    })(node, state);
  } catch (e) {
    if (e instanceof Found) { return e }
    throw e
  }
}

function skipThrough(node, st, c) { c(node, st); }
function ignore(_node, _st, _c) {}

// Node walkers.

var base = {};

base.Program = base.BlockStatement = base.StaticBlock = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var stmt = list[i];

    c(stmt, st, "Statement");
  }
};
base.Statement = skipThrough;
base.EmptyStatement = ignore;
base.ExpressionStatement = base.ParenthesizedExpression = base.ChainExpression =
  function (node, st, c) { return c(node.expression, st, "Expression"); };
base.IfStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Statement");
  if (node.alternate) { c(node.alternate, st, "Statement"); }
};
base.LabeledStatement = function (node, st, c) { return c(node.body, st, "Statement"); };
base.BreakStatement = base.ContinueStatement = ignore;
base.WithStatement = function (node, st, c) {
  c(node.object, st, "Expression");
  c(node.body, st, "Statement");
};
base.SwitchStatement = function (node, st, c) {
  c(node.discriminant, st, "Expression");
  for (var i = 0, list = node.cases; i < list.length; i += 1) {
    var cs = list[i];

    c(cs, st);
  }
};
base.SwitchCase = function (node, st, c) {
  if (node.test) { c(node.test, st, "Expression"); }
  for (var i = 0, list = node.consequent; i < list.length; i += 1)
    {
    var cons = list[i];

    c(cons, st, "Statement");
  }
};
base.ReturnStatement = base.YieldExpression = base.AwaitExpression = function (node, st, c) {
  if (node.argument) { c(node.argument, st, "Expression"); }
};
base.ThrowStatement = base.SpreadElement =
  function (node, st, c) { return c(node.argument, st, "Expression"); };
base.TryStatement = function (node, st, c) {
  c(node.block, st, "Statement");
  if (node.handler) { c(node.handler, st); }
  if (node.finalizer) { c(node.finalizer, st, "Statement"); }
};
base.CatchClause = function (node, st, c) {
  if (node.param) { c(node.param, st, "Pattern"); }
  c(node.body, st, "Statement");
};
base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForStatement = function (node, st, c) {
  if (node.init) { c(node.init, st, "ForInit"); }
  if (node.test) { c(node.test, st, "Expression"); }
  if (node.update) { c(node.update, st, "Expression"); }
  c(node.body, st, "Statement");
};
base.ForInStatement = base.ForOfStatement = function (node, st, c) {
  c(node.left, st, "ForInit");
  c(node.right, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForInit = function (node, st, c) {
  if (node.type === "VariableDeclaration") { c(node, st); }
  else { c(node, st, "Expression"); }
};
base.DebuggerStatement = ignore;

base.FunctionDeclaration = function (node, st, c) { return c(node, st, "Function"); };
base.VariableDeclaration = function (node, st, c) {
  for (var i = 0, list = node.declarations; i < list.length; i += 1)
    {
    var decl = list[i];

    c(decl, st);
  }
};
base.VariableDeclarator = function (node, st, c) {
  c(node.id, st, "Pattern");
  if (node.init) { c(node.init, st, "Expression"); }
};

base.Function = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    c(param, st, "Pattern");
  }
  c(node.body, st, node.expression ? "Expression" : "Statement");
};

base.Pattern = function (node, st, c) {
  if (node.type === "Identifier")
    { c(node, st, "VariablePattern"); }
  else if (node.type === "MemberExpression")
    { c(node, st, "MemberPattern"); }
  else
    { c(node, st); }
};
base.VariablePattern = ignore;
base.MemberPattern = skipThrough;
base.RestElement = function (node, st, c) { return c(node.argument, st, "Pattern"); };
base.ArrayPattern = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Pattern"); }
  }
};
base.ObjectPattern = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1) {
    var prop = list[i];

    if (prop.type === "Property") {
      if (prop.computed) { c(prop.key, st, "Expression"); }
      c(prop.value, st, "Pattern");
    } else if (prop.type === "RestElement") {
      c(prop.argument, st, "Pattern");
    }
  }
};

base.Expression = skipThrough;
base.ThisExpression = base.Super = base.MetaProperty = ignore;
base.ArrayExpression = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Expression"); }
  }
};
base.ObjectExpression = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1)
    {
    var prop = list[i];

    c(prop, st);
  }
};
base.FunctionExpression = base.ArrowFunctionExpression = base.FunctionDeclaration;
base.SequenceExpression = function (node, st, c) {
  for (var i = 0, list = node.expressions; i < list.length; i += 1)
    {
    var expr = list[i];

    c(expr, st, "Expression");
  }
};
base.TemplateLiteral = function (node, st, c) {
  for (var i = 0, list = node.quasis; i < list.length; i += 1)
    {
    var quasi = list[i];

    c(quasi, st);
  }

  for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1)
    {
    var expr = list$1[i$1];

    c(expr, st, "Expression");
  }
};
base.TemplateElement = ignore;
base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
  c(node.argument, st, "Expression");
};
base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
  c(node.left, st, "Expression");
  c(node.right, st, "Expression");
};
base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
  c(node.left, st, "Pattern");
  c(node.right, st, "Expression");
};
base.ConditionalExpression = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Expression");
  c(node.alternate, st, "Expression");
};
base.NewExpression = base.CallExpression = function (node, st, c) {
  c(node.callee, st, "Expression");
  if (node.arguments)
    { for (var i = 0, list = node.arguments; i < list.length; i += 1)
      {
        var arg = list[i];

        c(arg, st, "Expression");
      } }
};
base.MemberExpression = function (node, st, c) {
  c(node.object, st, "Expression");
  if (node.computed) { c(node.property, st, "Expression"); }
};
base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (node, st, c) {
  if (node.declaration)
    { c(node.declaration, st, node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression"); }
  if (node.source) { c(node.source, st, "Expression"); }
};
base.ExportAllDeclaration = function (node, st, c) {
  if (node.exported)
    { c(node.exported, st); }
  c(node.source, st, "Expression");
};
base.ImportDeclaration = function (node, st, c) {
  for (var i = 0, list = node.specifiers; i < list.length; i += 1)
    {
    var spec = list[i];

    c(spec, st);
  }
  c(node.source, st, "Expression");
};
base.ImportExpression = function (node, st, c) {
  c(node.source, st, "Expression");
};
base.ImportSpecifier = base.ImportDefaultSpecifier = base.ImportNamespaceSpecifier = base.Identifier = base.PrivateIdentifier = base.Literal = ignore;

base.TaggedTemplateExpression = function (node, st, c) {
  c(node.tag, st, "Expression");
  c(node.quasi, st, "Expression");
};
base.ClassDeclaration = base.ClassExpression = function (node, st, c) { return c(node, st, "Class"); };
base.Class = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  if (node.superClass) { c(node.superClass, st, "Expression"); }
  c(node.body, st);
};
base.ClassBody = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var elt = list[i];

    c(elt, st);
  }
};
base.MethodDefinition = base.PropertyDefinition = base.Property = function (node, st, c) {
  if (node.computed) { c(node.key, st, "Expression"); }
  if (node.value) { c(node.value, st, "Expression"); }
};

function hoistMocksPlugin(options = {}) {
	const filter = options.filter || createFilter(options.include, options.exclude);
	const { hoistableMockMethodNames = ["mock", "unmock"], dynamicImportMockMethodNames = [
		"mock",
		"unmock",
		"doMock",
		"doUnmock"
	], hoistedMethodNames = ["hoisted"], utilsObjectNames = ["vi", "vitest"] } = options;
	const methods = new Set([
		...hoistableMockMethodNames,
		...hoistedMethodNames,
		...dynamicImportMockMethodNames
	]);
	const regexpHoistable = new RegExp(`\\b(?:${utilsObjectNames.join("|")})\\s*\.\\s*(?:${Array.from(methods).join("|")})\\s*\\(`);
	return {
		name: "vitest:mocks",
		enforce: "post",
		transform(code, id) {
			if (!filter(id)) {
				return;
			}
			return hoistMocks(code, id, this.parse, {
				regexpHoistable,
				hoistableMockMethodNames,
				hoistedMethodNames,
				utilsObjectNames,
				dynamicImportMockMethodNames,
				...options
			});
		}
	};
}
const API_NOT_FOUND_ERROR = `There are some problems in resolving the mocks API.
You may encounter this issue when importing the mocks API from another module other than 'vitest'.
To fix this issue you can either:
- import the mocks API directly from 'vitest'
- enable the 'globals' options`;
function API_NOT_FOUND_CHECK(names) {
	return `\nif (${names.map((name) => `typeof globalThis["${name}"] === "undefined"`).join(" && ")}) ` + `{ throw new Error(${JSON.stringify(API_NOT_FOUND_ERROR)}) }\n`;
}
function isIdentifier(node) {
	return node.type === "Identifier";
}
function getNodeTail(code, node) {
	let end = node.end;
	if (code[node.end] === ";") {
		end += 1;
	}
	if (code[node.end] === "\n") {
		return end + 1;
	}
	if (code[node.end + 1] === "\n") {
		end += 1;
	}
	return end;
}
const regexpHoistable = /\b(?:vi|vitest)\s*\.\s*(?:mock|unmock|hoisted|doMock|doUnmock)\s*\(/;
const hashbangRE = /^#!.*\n/;
// this is a fork of Vite SSR transform
function hoistMocks(code, id, parse, options = {}) {
	var _hashbangRE$exec;
	const needHoisting = (options.regexpHoistable || regexpHoistable).test(code);
	if (!needHoisting) {
		return;
	}
	const s = new MagicString(code);
	let ast;
	try {
		ast = parse(code);
	} catch (err) {
		console.error(`Cannot parse ${id}:\n${err.message}.`);
		return;
	}
	const { hoistableMockMethodNames = ["mock", "unmock"], dynamicImportMockMethodNames = [
		"mock",
		"unmock",
		"doMock",
		"doUnmock"
	], hoistedMethodNames = ["hoisted"], utilsObjectNames = ["vi", "vitest"], hoistedModule = "vitest" } = options;
	// hoist at the start of the file, after the hashbang
	let hoistIndex = ((_hashbangRE$exec = hashbangRE.exec(code)) === null || _hashbangRE$exec === void 0 ? void 0 : _hashbangRE$exec[0].length) ?? 0;
	let hoistedModuleImported = false;
	let uid = 0;
	const idToImportMap = new Map();
	const imports = [];
	// this will transform import statements into dynamic ones, if there are imports
	// it will keep the import as is, if we don't need to mock anything
	// in browser environment it will wrap the module value with "vitest_wrap_module" function
	// that returns a proxy to the module so that named exports can be mocked
	function defineImport(importNode) {
		const source = importNode.source.value;
		// always hoist vitest import to top of the file, so
		// "vi" helpers can access it
		if (hoistedModule === source) {
			hoistedModuleImported = true;
			return;
		}
		const importId = `__vi_import_${uid++}__`;
		imports.push({
			id: importId,
			node: importNode
		});
		return importId;
	}
	// 1. check all import statements and record id -> importName map
	for (const node of ast.body) {
		// import foo from 'foo' --> foo -> __import_foo__.default
		// import { baz } from 'foo' --> baz -> __import_foo__.baz
		// import * as ok from 'foo' --> ok -> __import_foo__
		if (node.type === "ImportDeclaration") {
			const importId = defineImport(node);
			if (!importId) {
				continue;
			}
			for (const spec of node.specifiers) {
				if (spec.type === "ImportSpecifier") {
					if (spec.imported.type === "Identifier") {
						idToImportMap.set(spec.local.name, `${importId}.${spec.imported.name}`);
					} else {
						idToImportMap.set(spec.local.name, `${importId}[${JSON.stringify(spec.imported.value)}]`);
					}
				} else if (spec.type === "ImportDefaultSpecifier") {
					idToImportMap.set(spec.local.name, `${importId}.default`);
				} else {
					// namespace specifier
					idToImportMap.set(spec.local.name, importId);
				}
			}
		}
	}
	const declaredConst = new Set();
	const hoistedNodes = [];
	function createSyntaxError(node, message) {
		const _error = new SyntaxError(message);
		Error.captureStackTrace(_error, createSyntaxError);
		const serializedError = {
			name: "SyntaxError",
			message: _error.message,
			stack: _error.stack
		};
		if (options.codeFrameGenerator) {
			serializedError.frame = options.codeFrameGenerator(node, id, code);
		}
		return serializedError;
	}
	function assertNotDefaultExport(node, error) {
		var _findNodeAround;
		const defaultExport = (_findNodeAround = findNodeAround(ast, node.start, "ExportDefaultDeclaration")) === null || _findNodeAround === void 0 ? void 0 : _findNodeAround.node;
		if ((defaultExport === null || defaultExport === void 0 ? void 0 : defaultExport.declaration) === node || (defaultExport === null || defaultExport === void 0 ? void 0 : defaultExport.declaration.type) === "AwaitExpression" && defaultExport.declaration.argument === node) {
			throw createSyntaxError(defaultExport, error);
		}
	}
	function assertNotNamedExport(node, error) {
		var _findNodeAround2;
		const nodeExported = (_findNodeAround2 = findNodeAround(ast, node.start, "ExportNamedDeclaration")) === null || _findNodeAround2 === void 0 ? void 0 : _findNodeAround2.node;
		if ((nodeExported === null || nodeExported === void 0 ? void 0 : nodeExported.declaration) === node) {
			throw createSyntaxError(nodeExported, error);
		}
	}
	function getVariableDeclaration(node) {
		var _findNodeAround3, _declarationNode$decl;
		const declarationNode = (_findNodeAround3 = findNodeAround(ast, node.start, "VariableDeclaration")) === null || _findNodeAround3 === void 0 ? void 0 : _findNodeAround3.node;
		const init = declarationNode === null || declarationNode === void 0 || (_declarationNode$decl = declarationNode.declarations[0]) === null || _declarationNode$decl === void 0 ? void 0 : _declarationNode$decl.init;
		if (init && (init === node || init.type === "AwaitExpression" && init.argument === node)) {
			return declarationNode;
		}
	}
	const usedUtilityExports = new Set();
	esmWalker(ast, {
		onIdentifier(id, info, parentStack) {
			const binding = idToImportMap.get(id.name);
			if (!binding) {
				return;
			}
			if (info.hasBindingShortcut) {
				s.appendLeft(id.end, `: ${binding}`);
			} else if (info.classDeclaration) {
				if (!declaredConst.has(id.name)) {
					declaredConst.add(id.name);
					// locate the top-most node containing the class declaration
					const topNode = parentStack[parentStack.length - 2];
					s.prependRight(topNode.start, `const ${id.name} = ${binding};\n`);
				}
			} else if (!info.classExpression) {
				s.update(id.start, id.end, binding);
			}
		},
		onCallExpression(node) {
			if (node.callee.type === "MemberExpression" && isIdentifier(node.callee.object) && utilsObjectNames.includes(node.callee.object.name) && isIdentifier(node.callee.property)) {
				const methodName = node.callee.property.name;
				usedUtilityExports.add(node.callee.object.name);
				if (hoistableMockMethodNames.includes(methodName)) {
					const method = `${node.callee.object.name}.${methodName}`;
					assertNotDefaultExport(node, `Cannot export the result of "${method}". Remove export declaration because "${method}" doesn\'t return anything.`);
					const declarationNode = getVariableDeclaration(node);
					if (declarationNode) {
						assertNotNamedExport(declarationNode, `Cannot export the result of "${method}". Remove export declaration because "${method}" doesn\'t return anything.`);
					}
					// rewrite vi.mock(import('..')) into vi.mock('..')
					if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && dynamicImportMockMethodNames.includes(node.callee.property.name)) {
						const moduleInfo = node.arguments[0];
						// vi.mock(import('./path')) -> vi.mock('./path')
						if (moduleInfo.type === "ImportExpression") {
							const source = moduleInfo.source;
							s.overwrite(moduleInfo.start, moduleInfo.end, s.slice(source.start, source.end));
						}
						// vi.mock(await import('./path')) -> vi.mock('./path')
						if (moduleInfo.type === "AwaitExpression" && moduleInfo.argument.type === "ImportExpression") {
							const source = moduleInfo.argument.source;
							s.overwrite(moduleInfo.start, moduleInfo.end, s.slice(source.start, source.end));
						}
					}
					hoistedNodes.push(node);
				} else if (dynamicImportMockMethodNames.includes(methodName)) {
					const moduleInfo = node.arguments[0];
					let source = null;
					if (moduleInfo.type === "ImportExpression") {
						source = moduleInfo.source;
					}
					if (moduleInfo.type === "AwaitExpression" && moduleInfo.argument.type === "ImportExpression") {
						source = moduleInfo.argument.source;
					}
					if (source) {
						s.overwrite(moduleInfo.start, moduleInfo.end, s.slice(source.start, source.end));
					}
				}
				if (hoistedMethodNames.includes(methodName)) {
					assertNotDefaultExport(node, "Cannot export hoisted variable. You can control hoisting behavior by placing the import from this file first.");
					const declarationNode = getVariableDeclaration(node);
					if (declarationNode) {
						assertNotNamedExport(declarationNode, "Cannot export hoisted variable. You can control hoisting behavior by placing the import from this file first.");
						// hoist "const variable = vi.hoisted(() => {})"
						hoistedNodes.push(declarationNode);
					} else {
						var _findNodeAround4;
						const awaitedExpression = (_findNodeAround4 = findNodeAround(ast, node.start, "AwaitExpression")) === null || _findNodeAround4 === void 0 ? void 0 : _findNodeAround4.node;
						// hoist "await vi.hoisted(async () => {})" or "vi.hoisted(() => {})"
						const moveNode = (awaitedExpression === null || awaitedExpression === void 0 ? void 0 : awaitedExpression.argument) === node ? awaitedExpression : node;
						hoistedNodes.push(moveNode);
					}
				}
			}
		}
	});
	function getNodeName(node) {
		const callee = node.callee || {};
		if (callee.type === "MemberExpression" && isIdentifier(callee.property) && isIdentifier(callee.object)) {
			return `${callee.object.name}.${callee.property.name}()`;
		}
		return "\"hoisted method\"";
	}
	function getNodeCall(node) {
		if (node.type === "CallExpression") {
			return node;
		}
		if (node.type === "VariableDeclaration") {
			const { declarations } = node;
			const init = declarations[0].init;
			if (init) {
				return getNodeCall(init);
			}
		}
		if (node.type === "AwaitExpression") {
			const { argument } = node;
			if (argument.type === "CallExpression") {
				return getNodeCall(argument);
			}
		}
		return node;
	}
	function createError(outsideNode, insideNode) {
		const outsideCall = getNodeCall(outsideNode);
		const insideCall = getNodeCall(insideNode);
		throw createSyntaxError(insideCall, `Cannot call ${getNodeName(insideCall)} inside ${getNodeName(outsideCall)}: both methods are hoisted to the top of the file and not actually called inside each other.`);
	}
	// validate hoistedNodes doesn't have nodes inside other nodes
	for (let i = 0; i < hoistedNodes.length; i++) {
		const node = hoistedNodes[i];
		for (let j = i + 1; j < hoistedNodes.length; j++) {
			const otherNode = hoistedNodes[j];
			if (node.start >= otherNode.start && node.end <= otherNode.end) {
				throw createError(otherNode, node);
			}
			if (otherNode.start >= node.start && otherNode.end <= node.end) {
				throw createError(node, otherNode);
			}
		}
	}
	// hoist vi.mock/vi.hoisted
	for (const node of hoistedNodes) {
		const end = getNodeTail(code, node);
		// don't hoist into itself if it's already at the top
		if (hoistIndex === end || hoistIndex === node.start) {
			hoistIndex = end;
		} else {
			s.move(node.start, end, hoistIndex);
		}
	}
	// hoist actual dynamic imports last so they are inserted after all hoisted mocks
	for (const { node: importNode, id: importId } of imports) {
		const source = importNode.source.value;
		s.update(importNode.start, importNode.end, `const ${importId} = await import(${JSON.stringify(source)});\n`);
		if (importNode.start === hoistIndex) {
			// no need to hoist, but update hoistIndex to keep the order
			hoistIndex = importNode.end;
		} else {
			// There will be an error if the module is called before it is imported,
			// so the module import statement is hoisted to the top
			s.move(importNode.start, importNode.end, hoistIndex);
		}
	}
	if (!hoistedModuleImported && hoistedNodes.length) {
		const utilityImports = [...usedUtilityExports];
		// "vi" or "vitest" is imported from a module other than "vitest"
		if (utilityImports.some((name) => idToImportMap.has(name))) {
			s.prepend(API_NOT_FOUND_CHECK(utilityImports));
		} else if (utilityImports.length) {
			s.prepend(`import { ${[...usedUtilityExports].join(", ")} } from ${JSON.stringify(hoistedModule)}\n`);
		}
	}
	return {
		code: s.toString(),
		map: s.generateMap({
			hires: "boundary",
			source: id
		})
	};
}

function interceptorPlugin(options = {}) {
	const registry = options.registry || new MockerRegistry();
	return {
		name: "vitest:mocks:interceptor",
		enforce: "pre",
		load: {
			order: "pre",
			async handler(id) {
				const mock = registry.getById(id);
				if (!mock) {
					return;
				}
				if (mock.type === "manual") {
					const exports$1 = Object.keys(await mock.resolve());
					const accessor = options.globalThisAccessor || "\"__vitest_mocker__\"";
					return createManualModuleSource(mock.url, exports$1, accessor);
				}
				if (mock.type === "redirect") {
					return readFile(mock.redirect, "utf-8");
				}
			}
		},
		transform: {
			order: "post",
			handler(code, id) {
				const mock = registry.getById(id);
				if (!mock) {
					return;
				}
				if (mock.type === "automock" || mock.type === "autospy") {
					const m = automockModule(code, mock.type, this.parse, { globalThisAccessor: options.globalThisAccessor });
					return {
						code: m.toString(),
						map: m.generateMap({
							hires: "boundary",
							source: cleanUrl(id)
						})
					};
				}
			}
		},
		configureServer(server) {
			server.ws.on("vitest:interceptor:register", (event) => {
				if (event.type === "manual") {
					const module = ManualMockedModule.fromJSON(event, async () => {
						const keys = await getFactoryExports(event.url);
						return Object.fromEntries(keys.map((key) => [key, null]));
					});
					registry.add(module);
				} else {
					if (event.type === "redirect") {
						const redirectUrl = new URL(event.redirect);
						event.redirect = join(server.config.root, redirectUrl.pathname);
					}
					registry.register(event);
				}
				server.ws.send("vitest:interceptor:register:result");
			});
			server.ws.on("vitest:interceptor:delete", (id) => {
				registry.delete(id);
				server.ws.send("vitest:interceptor:delete:result");
			});
			server.ws.on("vitest:interceptor:invalidate", () => {
				registry.clear();
				server.ws.send("vitest:interceptor:invalidate:result");
			});
			function getFactoryExports(url) {
				server.ws.send("vitest:interceptor:resolve", url);
				let timeout;
				return new Promise((resolve, reject) => {
					timeout = setTimeout(() => {
						reject(new Error(`Timeout while waiting for factory exports of ${url}`));
					}, 1e4);
					server.ws.on("vitest:interceptor:resolved", ({ url: resolvedUrl, keys }) => {
						if (resolvedUrl === url) {
							clearTimeout(timeout);
							resolve(keys);
						}
					});
				});
			}
		}
	};
}

const VALID_ID_PREFIX = "/@id/";
class ServerMockResolver {
	constructor(server, options = {}) {
		this.server = server;
		this.options = options;
	}
	async resolveMock(rawId, importer, options) {
		const { id, fsPath, external } = await this.resolveMockId(rawId, importer);
		const resolvedUrl = this.normalizeResolveIdToUrl({ id }).url;
		if (options.mock === "factory") {
			var _manifest$fsPath;
			const manifest = getViteDepsManifest(this.server.config);
			const needsInterop = (manifest === null || manifest === void 0 || (_manifest$fsPath = manifest[fsPath]) === null || _manifest$fsPath === void 0 ? void 0 : _manifest$fsPath.needsInterop) ?? false;
			return {
				mockType: "manual",
				resolvedId: id,
				resolvedUrl,
				needsInterop
			};
		}
		if (options.mock === "spy") {
			return {
				mockType: "autospy",
				resolvedId: id,
				resolvedUrl
			};
		}
		const redirectUrl = findMockRedirect(this.server.config.root, fsPath, external);
		return {
			mockType: redirectUrl === null ? "automock" : "redirect",
			redirectUrl,
			resolvedId: id,
			resolvedUrl
		};
	}
	invalidate(ids) {
		ids.forEach((id) => {
			const moduleGraph = this.server.moduleGraph;
			const module = moduleGraph.getModuleById(id);
			if (module) {
				module.transformResult = null;
			}
		});
	}
	async resolveId(id, importer) {
		const resolved = await this.server.pluginContainer.resolveId(id, importer, { ssr: false });
		if (!resolved) {
			return null;
		}
		return this.normalizeResolveIdToUrl(resolved);
	}
	normalizeResolveIdToUrl(resolved) {
		const isOptimized = resolved.id.startsWith(withTrailingSlash(this.server.config.cacheDir));
		let url;
		// normalise the URL to be acceptable by the browser
		// https://github.com/vitejs/vite/blob/14027b0f2a9b01c14815c38aab22baf5b29594bb/packages/vite/src/node/plugins/importAnalysis.ts#L103
		const root = this.server.config.root;
		if (resolved.id.startsWith(withTrailingSlash(root))) {
			url = resolved.id.slice(root.length);
		} else if (resolved.id !== "/@react-refresh" && isAbsolute(resolved.id) && existsSync(cleanUrl(resolved.id))) {
			url = join$1("/@fs/", resolved.id);
		} else {
			url = resolved.id;
		}
		if (url[0] !== "." && url[0] !== "/") {
			url = resolved.id.startsWith(VALID_ID_PREFIX) ? resolved.id : VALID_ID_PREFIX + resolved.id.replace("\0", "__x00__");
		}
		return {
			id: resolved.id,
			url,
			optimized: isOptimized
		};
	}
	async resolveMockId(rawId, importer) {
		if (!this.server.moduleGraph.getModuleById(importer) && !importer.startsWith(this.server.config.root)) {
			importer = join$1(this.server.config.root, importer);
		}
		const resolved = await this.server.pluginContainer.resolveId(rawId, importer, { ssr: false });
		return this.resolveModule(rawId, resolved);
	}
	resolveModule(rawId, resolved) {
		const id = (resolved === null || resolved === void 0 ? void 0 : resolved.id) || rawId;
		const external = !isAbsolute(id) || isModuleDirectory(this.options, id) ? rawId : null;
		return {
			id,
			fsPath: cleanUrl(id),
			external
		};
	}
}
function isModuleDirectory(config, path) {
	const moduleDirectories = config.moduleDirectories || ["/node_modules/"];
	return moduleDirectories.some((dir) => path.includes(dir));
}
const metadata = new WeakMap();
function getViteDepsManifest(config) {
	if (metadata.has(config)) {
		return metadata.get(config);
	}
	const cacheDirPath = getDepsCacheDir(config);
	const metadataPath = resolve(cacheDirPath, "_metadata.json");
	if (!existsSync(metadataPath)) {
		return null;
	}
	const { optimized } = JSON.parse(readFileSync(metadataPath, "utf-8"));
	const newManifest = {};
	for (const name in optimized) {
		const dep = optimized[name];
		const file = resolve(cacheDirPath, dep.file);
		newManifest[file] = {
			hash: dep.fileHash,
			needsInterop: dep.needsInterop
		};
	}
	metadata.set(config, newManifest);
	return newManifest;
}
function getDepsCacheDir(config) {
	return resolve(config.cacheDir, "deps");
}
function withTrailingSlash(path) {
	if (path.at(-1) !== "/") {
		return `${path}/`;
	}
	return path;
}

// this is an implementation for public usage
// vitest doesn't use this plugin directly
function mockerPlugin(options = {}) {
	let server;
	const registerPath = resolve(fileURLToPath(new URL("./register.js", import.meta.url)));
	return [
		{
			name: "vitest:mocker:ws-rpc",
			config(_, { command }) {
				if (command !== "serve") {
					return;
				}
				return {
					server: { preTransformRequests: false },
					optimizeDeps: { exclude: ["@vitest/mocker/register", "@vitest/mocker/browser"] }
				};
			},
			configureServer(server_) {
				server = server_;
				const mockResolver = new ServerMockResolver(server);
				server.ws.on("vitest:mocks:resolveId", async ({ id, importer }) => {
					const resolved = await mockResolver.resolveId(id, importer);
					server.ws.send("vitest:mocks:resolvedId:result", resolved);
				});
				server.ws.on("vitest:mocks:resolveMock", async ({ id, importer, options }) => {
					const resolved = await mockResolver.resolveMock(id, importer, options);
					server.ws.send("vitest:mocks:resolveMock:result", resolved);
				});
				server.ws.on("vitest:mocks:invalidate", async ({ ids }) => {
					mockResolver.invalidate(ids);
					server.ws.send("vitest:mocks:invalidate:result");
				});
			},
			async load(id) {
				if (id !== registerPath) {
					return;
				}
				if (!server) {
					// mocker doesn't work during build
					return "export {}";
				}
				const content = await readFile(registerPath, "utf-8");
				const result = content.replace(/__VITEST_GLOBAL_THIS_ACCESSOR__/g, options.globalThisAccessor ?? "\"__vitest_mocker__\"").replace("__VITEST_MOCKER_ROOT__", JSON.stringify(server.config.root));
				return result;
			}
		},
		hoistMocksPlugin(options.hoistMocks),
		interceptorPlugin(options),
		automockPlugin(options),
		dynamicImportPlugin(options)
	];
}

export { ServerMockResolver, automockModule, automockPlugin, createManualModuleSource, dynamicImportPlugin, findMockRedirect, hoistMocks, hoistMocksPlugin, interceptorPlugin, mockerPlugin };
