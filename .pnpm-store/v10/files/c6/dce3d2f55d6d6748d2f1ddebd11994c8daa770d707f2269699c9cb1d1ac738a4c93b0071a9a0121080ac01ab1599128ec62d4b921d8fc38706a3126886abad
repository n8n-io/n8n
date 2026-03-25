import MagicString from 'magic-string';
import { walk } from 'estree-walker';

const isNodeInPatternWeakSet = new WeakSet();
function setIsNodeInPattern(node) {
	return isNodeInPatternWeakSet.add(node);
}
function isNodeInPattern(node) {
	return isNodeInPatternWeakSet.has(node);
}
/**
* Same logic from \@vue/compiler-core & \@vue/compiler-sfc
* Except this is using acorn AST
*/
function esmWalker(root, { onIdentifier, onImportMeta, onDynamicImport, onCallExpression }) {
	const parentStack = [];
	const varKindStack = [];
	const scopeMap = new WeakMap();
	const identifiers = [];
	const setScope = (node, name) => {
		let scopeIds = scopeMap.get(node);
		if (scopeIds && scopeIds.has(name)) {
			return;
		}
		if (!scopeIds) {
			scopeIds = new Set();
			scopeMap.set(node, scopeIds);
		}
		scopeIds.add(name);
	};
	function isInScope(name, parents) {
		return parents.some((node) => {
			var _scopeMap$get;
			return node && ((_scopeMap$get = scopeMap.get(node)) === null || _scopeMap$get === void 0 ? void 0 : _scopeMap$get.has(name));
		});
	}
	function handlePattern(p, parentScope) {
		if (p.type === "Identifier") {
			setScope(parentScope, p.name);
		} else if (p.type === "RestElement") {
			handlePattern(p.argument, parentScope);
		} else if (p.type === "ObjectPattern") {
			p.properties.forEach((property) => {
				if (property.type === "RestElement") {
					setScope(parentScope, property.argument.name);
				} else {
					handlePattern(property.value, parentScope);
				}
			});
		} else if (p.type === "ArrayPattern") {
			p.elements.forEach((element) => {
				if (element) {
					handlePattern(element, parentScope);
				}
			});
		} else if (p.type === "AssignmentPattern") {
			handlePattern(p.left, parentScope);
		} else {
			setScope(parentScope, p.name);
		}
	}
	walk(root, {
		enter(node, parent) {
			if (node.type === "ImportDeclaration") {
				return this.skip();
			}
			// track parent stack, skip for "else-if"/"else" branches as acorn nests
			// the ast within "if" nodes instead of flattening them
			if (parent && !(parent.type === "IfStatement" && node === parent.alternate)) {
				parentStack.unshift(parent);
			}
			// track variable declaration kind stack used by VariableDeclarator
			if (node.type === "VariableDeclaration") {
				varKindStack.unshift(node.kind);
			}
			if (node.type === "CallExpression") {
				onCallExpression === null || onCallExpression === void 0 ? void 0 : onCallExpression(node);
			}
			if (node.type === "MetaProperty" && node.meta.name === "import") {
				onImportMeta === null || onImportMeta === void 0 ? void 0 : onImportMeta(node);
			} else if (node.type === "ImportExpression") {
				onDynamicImport === null || onDynamicImport === void 0 ? void 0 : onDynamicImport(node);
			}
			if (node.type === "Identifier") {
				if (!isInScope(node.name, parentStack) && isRefIdentifier(node, parent, parentStack)) {
					// record the identifier, for DFS -> BFS
					identifiers.push([node, parentStack.slice(0)]);
				}
			} else if (isFunctionNode(node)) {
				// If it is a function declaration, it could be shadowing an import
				// Add its name to the scope so it won't get replaced
				if (node.type === "FunctionDeclaration") {
					const parentScope = findParentScope(parentStack);
					if (parentScope) {
						setScope(parentScope, node.id.name);
					}
				}
				// walk function expressions and add its arguments to known identifiers
				// so that we don't prefix them
				node.params.forEach((p) => {
					if (p.type === "ObjectPattern" || p.type === "ArrayPattern") {
						handlePattern(p, node);
						return;
					}
					walk(p.type === "AssignmentPattern" ? p.left : p, { enter(child, parent) {
						// skip params default value of destructure
						if ((parent === null || parent === void 0 ? void 0 : parent.type) === "AssignmentPattern" && (parent === null || parent === void 0 ? void 0 : parent.right) === child) {
							return this.skip();
						}
						if (child.type !== "Identifier") {
							return;
						}
						// do not record as scope variable if is a destructuring keyword
						if (isStaticPropertyKey(child, parent)) {
							return;
						}
						// do not record if this is a default value
						// assignment of a destructuring variable
						if ((parent === null || parent === void 0 ? void 0 : parent.type) === "TemplateLiteral" && (parent === null || parent === void 0 ? void 0 : parent.expressions.includes(child)) || (parent === null || parent === void 0 ? void 0 : parent.type) === "CallExpression" && (parent === null || parent === void 0 ? void 0 : parent.callee) === child) {
							return;
						}
						setScope(node, child.name);
					} });
				});
			} else if (node.type === "Property" && parent.type === "ObjectPattern") {
				// mark property in destructuring pattern
				setIsNodeInPattern(node);
			} else if (node.type === "VariableDeclarator") {
				const parentFunction = findParentScope(parentStack, varKindStack[0] === "var");
				if (parentFunction) {
					handlePattern(node.id, parentFunction);
				}
			} else if (node.type === "CatchClause" && node.param) {
				handlePattern(node.param, node);
			}
		},
		leave(node, parent) {
			// untrack parent stack from above
			if (parent && !(parent.type === "IfStatement" && node === parent.alternate)) {
				parentStack.shift();
			}
			if (node.type === "VariableDeclaration") {
				varKindStack.shift();
			}
		}
	});
	// emit the identifier events in BFS so the hoisted declarations
	// can be captured correctly
	identifiers.forEach(([node, stack]) => {
		if (!isInScope(node.name, stack)) {
			const parent = stack[0];
			const grandparent = stack[1];
			const hasBindingShortcut = isStaticProperty(parent) && parent.shorthand && (!isNodeInPattern(parent) || isInDestructuringAssignment(parent, parentStack));
			const classDeclaration = parent.type === "PropertyDefinition" && (grandparent === null || grandparent === void 0 ? void 0 : grandparent.type) === "ClassBody" || parent.type === "ClassDeclaration" && node === parent.superClass;
			const classExpression = parent.type === "ClassExpression" && node === parent.id;
			onIdentifier === null || onIdentifier === void 0 ? void 0 : onIdentifier(node, {
				hasBindingShortcut,
				classDeclaration,
				classExpression
			}, stack);
		}
	});
}
function isRefIdentifier(id, parent, parentStack) {
	// declaration id
	if (parent.type === "CatchClause" || (parent.type === "VariableDeclarator" || parent.type === "ClassDeclaration") && parent.id === id) {
		return false;
	}
	if (isFunctionNode(parent)) {
		// function declaration/expression id
		if (parent.id === id) {
			return false;
		}
		// params list
		if (parent.params.includes(id)) {
			return false;
		}
	}
	// class method name
	if (parent.type === "MethodDefinition" && !parent.computed) {
		return false;
	}
	// property key
	if (isStaticPropertyKey(id, parent)) {
		return false;
	}
	// object destructuring pattern
	if (isNodeInPattern(parent) && parent.value === id) {
		return false;
	}
	// non-assignment array destructuring pattern
	if (parent.type === "ArrayPattern" && !isInDestructuringAssignment(parent, parentStack)) {
		return false;
	}
	// member expression property
	if (parent.type === "MemberExpression" && parent.property === id && !parent.computed) {
		return false;
	}
	if (parent.type === "ExportSpecifier") {
		return false;
	}
	// is a special keyword but parsed as identifier
	if (id.name === "arguments") {
		return false;
	}
	return true;
}
function isStaticProperty(node) {
	return node && node.type === "Property" && !node.computed;
}
function isStaticPropertyKey(node, parent) {
	return isStaticProperty(parent) && parent.key === node;
}
const functionNodeTypeRE = /Function(?:Expression|Declaration)$|Method$/;
function isFunctionNode(node) {
	return functionNodeTypeRE.test(node.type);
}
const blockNodeTypeRE = /^BlockStatement$|^For(?:In|Of)?Statement$/;
function isBlock(node) {
	return blockNodeTypeRE.test(node.type);
}
function findParentScope(parentStack, isVar = false) {
	return parentStack.find(isVar ? isFunctionNode : isBlock);
}
function isInDestructuringAssignment(parent, parentStack) {
	if (parent && (parent.type === "Property" || parent.type === "ArrayPattern")) {
		return parentStack.some((i) => i.type === "AssignmentExpression");
	}
	return false;
}
function getArbitraryModuleIdentifier(node) {
	return node.type === "Identifier" ? node.name : node.raw;
}

// TODO: better source map replacement
function automockModule(code, mockType, parse, options = {}) {
	const globalThisAccessor = options.globalThisAccessor || "\"__vitest_mocker__\"";
	const ast = parse(code);
	const m = new MagicString(code);
	const allSpecifiers = [];
	let importIndex = 0;
	for (const _node of ast.body) {
		if (_node.type === "ExportAllDeclaration") {
			throw new Error(`automocking files with \`export *\` is not supported in browser mode because it cannot be statically analysed`);
		}
		if (_node.type === "ExportNamedDeclaration") {
			const node = _node;
			const declaration = node.declaration;
			function traversePattern(expression) {
				// export const test = '1'
				if (expression.type === "Identifier") {
					allSpecifiers.push({ name: expression.name });
				} else if (expression.type === "ArrayPattern") {
					expression.elements.forEach((element) => {
						if (!element) {
							return;
						}
						traversePattern(element);
					});
				} else if (expression.type === "ObjectPattern") {
					expression.properties.forEach((property) => {
						// export const { ...rest } = {}
						if (property.type === "RestElement") {
							traversePattern(property);
						} else if (property.type === "Property") {
							traversePattern(property.value);
						} else ;
					});
				} else if (expression.type === "RestElement") {
					traversePattern(expression.argument);
				} else if (expression.type === "AssignmentPattern") {
					throw new Error(`AssignmentPattern is not supported. Please open a new bug report.`);
				} else if (expression.type === "MemberExpression") {
					throw new Error(`MemberExpression is not supported. Please open a new bug report.`);
				} else ;
			}
			if (declaration) {
				if (declaration.type === "FunctionDeclaration") {
					allSpecifiers.push({ name: declaration.id.name });
				} else if (declaration.type === "VariableDeclaration") {
					declaration.declarations.forEach((declaration) => {
						traversePattern(declaration.id);
					});
				} else if (declaration.type === "ClassDeclaration") {
					allSpecifiers.push({ name: declaration.id.name });
				} else ;
				m.remove(node.start, declaration.start);
			}
			const specifiers = node.specifiers || [];
			const source = node.source;
			if (!source && specifiers.length) {
				specifiers.forEach((specifier) => {
					allSpecifiers.push({
						alias: getArbitraryModuleIdentifier(specifier.exported),
						name: getArbitraryModuleIdentifier(specifier.local)
					});
				});
				m.remove(node.start, node.end);
			} else if (source && specifiers.length) {
				const importNames = [];
				specifiers.forEach((specifier) => {
					const importedName = `__vitest_imported_${importIndex++}__`;
					importNames.push([getArbitraryModuleIdentifier(specifier.local), importedName]);
					allSpecifiers.push({
						name: importedName,
						alias: getArbitraryModuleIdentifier(specifier.exported)
					});
				});
				const importString = `import { ${importNames.map(([name, alias]) => `${name} as ${alias}`).join(", ")} } from '${source.value}'`;
				m.overwrite(node.start, node.end, importString);
			}
		}
		if (_node.type === "ExportDefaultDeclaration") {
			const node = _node;
			const declaration = node.declaration;
			allSpecifiers.push({
				name: "__vitest_default",
				alias: "default"
			});
			m.overwrite(node.start, declaration.start, `const __vitest_default = `);
		}
	}
	const moduleObject = `
const __vitest_current_es_module__ = {
  __esModule: true,
  ${allSpecifiers.map(({ name }) => `["${name}"]: ${name},`).join("\n  ")}
}
const __vitest_mocked_module__ = globalThis[${globalThisAccessor}].mockObject(__vitest_current_es_module__, "${mockType}")
`;
	const assigning = allSpecifiers.map(({ name }, index) => {
		return `const __vitest_mocked_${index}__ = __vitest_mocked_module__["${name}"]`;
	}).join("\n");
	const redeclarations = allSpecifiers.map(({ name, alias }, index) => {
		return `  __vitest_mocked_${index}__ as ${alias || name},`;
	}).join("\n");
	const specifiersExports = `
export {
${redeclarations}
}
`;
	m.append(moduleObject + assigning + specifiersExports);
	return m;
}

export { automockModule as a, esmWalker as e };
