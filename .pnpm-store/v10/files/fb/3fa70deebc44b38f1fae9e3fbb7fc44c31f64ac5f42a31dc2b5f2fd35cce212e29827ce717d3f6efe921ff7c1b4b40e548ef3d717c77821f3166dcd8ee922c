"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScriptSetupRanges = parseScriptSetupRanges;
exports.parseBindingRanges = parseBindingRanges;
exports.findBindingVars = findBindingVars;
exports.getStartEnd = getStartEnd;
exports.getNodeText = getNodeText;
const utils_1 = require("../codegen/utils");
const tsCheckReg = /^\/\/\s*@ts-(?:no)?check($|\s)/;
function parseScriptSetupRanges(ts, ast, vueCompilerOptions) {
    const defineProp = [];
    let defineProps;
    let withDefaults;
    let defineEmits;
    let defineSlots;
    let defineExpose;
    let defineOptions;
    const useAttrs = [];
    const useCssModule = [];
    const useSlots = [];
    const useTemplateRef = [];
    const definePropProposalA = vueCompilerOptions.experimentalDefinePropProposal === 'kevinEdition';
    const definePropProposalB = vueCompilerOptions.experimentalDefinePropProposal === 'johnsonEdition';
    const text = ast.text;
    const leadingCommentRanges = ts.getLeadingCommentRanges(text, 0)?.reverse() ?? [];
    const leadingCommentEndOffset = leadingCommentRanges.find(range => tsCheckReg.test(text.slice(range.pos, range.end)))?.end ?? 0;
    let bindings = parseBindingRanges(ts, ast);
    let foundNonImportExportNode = false;
    let importSectionEndOffset = 0;
    ts.forEachChild(ast, node => {
        const isTypeExport = (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))
            && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
        if (!foundNonImportExportNode
            && !ts.isImportDeclaration(node)
            && !isTypeExport
            && !ts.isEmptyStatement(node)
            // fix https://github.com/vuejs/language-tools/issues/1223
            && !ts.isImportEqualsDeclaration(node)) {
            const commentRanges = ts.getLeadingCommentRanges(text, node.pos);
            if (commentRanges?.length) {
                const commentRange = commentRanges.sort((a, b) => a.pos - b.pos)[0];
                importSectionEndOffset = commentRange.pos;
            }
            else {
                importSectionEndOffset = getStartEnd(ts, node, ast).start;
            }
            foundNonImportExportNode = true;
        }
    });
    ts.forEachChild(ast, node => visitNode(node, [ast]));
    const templateRefNames = new Set(useTemplateRef.map(ref => ref.name));
    bindings = bindings.filter(({ range }) => {
        const name = text.slice(range.start, range.end);
        return !templateRefNames.has(name);
    });
    return {
        leadingCommentEndOffset,
        importSectionEndOffset,
        bindings,
        defineProp,
        defineProps,
        withDefaults,
        defineEmits,
        defineSlots,
        defineExpose,
        defineOptions,
        useAttrs,
        useCssModule,
        useSlots,
        useTemplateRef,
    };
    function visitNode(node, parents) {
        const parent = parents[parents.length - 1];
        if (ts.isCallExpression(node)
            && ts.isIdentifier(node.expression)) {
            const callText = _getNodeText(node.expression);
            const isDefineModel = vueCompilerOptions.macros.defineModel.includes(callText);
            if (isDefineModel || callText === 'defineProp') {
                let localName;
                let propName;
                let options;
                let type;
                let modifierType;
                let runtimeType;
                let defaultValue;
                let required = false;
                if (ts.isVariableDeclaration(parent) &&
                    ts.isIdentifier(parent.name)) {
                    localName = _getStartEnd(parent.name);
                }
                if (node.typeArguments) {
                    if (node.typeArguments.length >= 1) {
                        type = _getStartEnd(node.typeArguments[0]);
                    }
                    if (node.typeArguments.length >= 2) {
                        modifierType = _getStartEnd(node.typeArguments[1]);
                    }
                }
                if (isDefineModel) {
                    if (node.arguments.length >= 2) {
                        propName = node.arguments[0];
                        options = node.arguments[1];
                    }
                    else if (node.arguments.length >= 1) {
                        if (ts.isStringLiteralLike(node.arguments[0])) {
                            propName = node.arguments[0];
                        }
                        else {
                            options = node.arguments[0];
                        }
                    }
                }
                else if (definePropProposalA) {
                    if (node.arguments.length >= 2) {
                        options = node.arguments[1];
                    }
                    if (node.arguments.length >= 1) {
                        propName = node.arguments[0];
                    }
                }
                else if (definePropProposalB) {
                    if (node.arguments.length >= 3) {
                        options = node.arguments[2];
                    }
                    if (node.arguments.length >= 2) {
                        if (node.arguments[1].kind === ts.SyntaxKind.TrueKeyword) {
                            required = true;
                        }
                    }
                    if (node.arguments.length >= 1) {
                        defaultValue = _getStartEnd(node.arguments[0]);
                    }
                }
                if (options && ts.isObjectLiteralExpression(options)) {
                    for (const property of options.properties) {
                        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
                            continue;
                        }
                        const text = _getNodeText(property.name);
                        if (text === 'type') {
                            runtimeType = _getStartEnd(property.initializer);
                        }
                        else if (text === 'default') {
                            defaultValue = _getStartEnd(property.initializer);
                        }
                        else if (text === 'required' && property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
                            required = true;
                        }
                    }
                }
                let name;
                if (propName && ts.isStringLiteralLike(propName)) {
                    name = _getStartEnd(propName);
                }
                defineProp.push({
                    localName,
                    name,
                    type,
                    modifierType,
                    runtimeType,
                    defaultValue,
                    required,
                    isModel: isDefineModel,
                    comments: getCommentsRange(ts, node, parents, ast),
                    argNode: options,
                });
            }
            else if (vueCompilerOptions.macros.defineProps.includes(callText)) {
                defineProps = {
                    ...parseCallExpressionAssignment(node, parent),
                    statement: getStatementRange(ts, parents, node, ast),
                    argNode: node.arguments[0]
                };
                if (ts.isVariableDeclaration(parent) && ts.isObjectBindingPattern(parent.name)) {
                    defineProps.destructured = new Map();
                    const identifiers = (0, utils_1.collectIdentifiers)(ts, parent.name, []);
                    for (const { id, isRest, initializer } of identifiers) {
                        const name = _getNodeText(id);
                        if (isRest) {
                            defineProps.destructuredRest = name;
                        }
                        else {
                            defineProps.destructured.set(name, initializer);
                        }
                    }
                }
                else if (ts.isCallExpression(parent)
                    && vueCompilerOptions.macros.withDefaults.includes(_getNodeText(parent.expression))) {
                    const grand = parents.at(-2);
                    if (grand && ts.isVariableDeclaration(grand)) {
                        defineProps.name = _getNodeText(grand.name);
                    }
                }
            }
            else if (vueCompilerOptions.macros.withDefaults.includes(callText)) {
                const [, arg] = node.arguments;
                withDefaults = {
                    callExp: _getStartEnd(node),
                    exp: _getStartEnd(node.expression),
                    arg: arg ? _getStartEnd(arg) : undefined,
                    argNode: arg
                };
            }
            else if (vueCompilerOptions.macros.defineEmits.includes(callText)) {
                defineEmits = {
                    ...parseCallExpressionAssignment(node, parent),
                    statement: getStatementRange(ts, parents, node, ast)
                };
                if (node.typeArguments?.length && ts.isTypeLiteralNode(node.typeArguments[0])) {
                    for (const member of node.typeArguments[0].members) {
                        if (ts.isCallSignatureDeclaration(member)) {
                            const type = member.parameters[0]?.type;
                            if (type && ts.isUnionTypeNode(type)) {
                                defineEmits.hasUnionTypeArg = true;
                                break;
                            }
                        }
                    }
                }
            }
            else if (vueCompilerOptions.macros.defineSlots.includes(callText)) {
                defineSlots = {
                    ...parseCallExpressionAssignment(node, parent),
                    statement: getStatementRange(ts, parents, node, ast)
                };
            }
            else if (vueCompilerOptions.macros.defineExpose.includes(callText)) {
                defineExpose = parseCallExpression(node);
            }
            else if (vueCompilerOptions.macros.defineOptions.includes(callText)
                && node.arguments.length
                && ts.isObjectLiteralExpression(node.arguments[0])) {
                defineOptions = {};
                const obj = node.arguments[0];
                for (const prop of obj.properties) {
                    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                        const name = _getNodeText(prop.name);
                        if (name === 'inheritAttrs') {
                            defineOptions.inheritAttrs = _getNodeText(prop.initializer);
                        }
                        else if (name === 'name' && ts.isStringLiteral(prop.initializer)) {
                            defineOptions.name = prop.initializer.text;
                        }
                    }
                }
            }
            else if (vueCompilerOptions.composables.useAttrs.includes(callText)) {
                useAttrs.push(parseCallExpression(node));
            }
            else if (vueCompilerOptions.composables.useCssModule.includes(callText)) {
                useCssModule.push(parseCallExpression(node));
            }
            else if (vueCompilerOptions.composables.useSlots.includes(callText)) {
                useSlots.push(parseCallExpression(node));
            }
            else if (vueCompilerOptions.composables.useTemplateRef.includes(callText)
                && !node.typeArguments?.length) {
                useTemplateRef.push(parseCallExpressionAssignment(node, parent));
            }
        }
        ts.forEachChild(node, child => {
            if (ts.isFunctionLike(node)) {
                return;
            }
            parents.push(node);
            visitNode(child, parents);
            parents.pop();
        });
    }
    function parseCallExpression(node) {
        return {
            callExp: _getStartEnd(node),
            exp: _getStartEnd(node.expression),
            arg: node.arguments.length ? _getStartEnd(node.arguments[0]) : undefined,
            typeArg: node.typeArguments?.length ? _getStartEnd(node.typeArguments[0]) : undefined,
        };
    }
    function parseCallExpressionAssignment(node, parent) {
        return {
            name: ts.isVariableDeclaration(parent) ? _getNodeText(parent.name) : undefined,
            ...parseCallExpression(node),
        };
    }
    function _getStartEnd(node) {
        return getStartEnd(ts, node, ast);
    }
    function _getNodeText(node) {
        return getNodeText(ts, node, ast);
    }
}
function parseBindingRanges(ts, ast) {
    const bindings = [];
    ts.forEachChild(ast, node => {
        if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
                const vars = _findBindingVars(decl.name);
                bindings.push(...vars.map(range => ({ range })));
            }
        }
        else if (ts.isFunctionDeclaration(node)) {
            if (node.name && ts.isIdentifier(node.name)) {
                bindings.push({
                    range: _getStartEnd(node.name)
                });
            }
        }
        else if (ts.isClassDeclaration(node)) {
            if (node.name) {
                bindings.push({
                    range: _getStartEnd(node.name)
                });
            }
        }
        else if (ts.isEnumDeclaration(node)) {
            bindings.push({
                range: _getStartEnd(node.name)
            });
        }
        if (ts.isImportDeclaration(node)) {
            const moduleName = _getNodeText(node.moduleSpecifier).slice(1, -1);
            if (node.importClause && !node.importClause.isTypeOnly) {
                const { name, namedBindings } = node.importClause;
                if (name) {
                    bindings.push({
                        range: _getStartEnd(name),
                        moduleName,
                        isDefaultImport: true
                    });
                }
                if (namedBindings) {
                    if (ts.isNamedImports(namedBindings)) {
                        for (const element of namedBindings.elements) {
                            if (element.isTypeOnly) {
                                continue;
                            }
                            bindings.push({
                                range: _getStartEnd(element.name),
                                moduleName,
                                isDefaultImport: element.propertyName?.text === 'default'
                            });
                        }
                    }
                    else {
                        bindings.push({
                            range: _getStartEnd(namedBindings.name),
                            moduleName,
                            isNamespace: true
                        });
                    }
                }
            }
        }
    });
    return bindings;
    function _getStartEnd(node) {
        return getStartEnd(ts, node, ast);
    }
    function _getNodeText(node) {
        return getNodeText(ts, node, ast);
    }
    function _findBindingVars(left) {
        return findBindingVars(ts, left, ast);
    }
}
function findBindingVars(ts, left, ast) {
    const vars = [];
    worker(left);
    return vars;
    function worker(node) {
        if (ts.isIdentifier(node)) {
            vars.push(getStartEnd(ts, node, ast));
        }
        // { ? } = ...
        // [ ? ] = ...
        else if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
            for (const property of node.elements) {
                if (ts.isBindingElement(property)) {
                    worker(property.name);
                }
            }
        }
        // { foo: ? } = ...
        else if (ts.isPropertyAssignment(node)) {
            worker(node.initializer);
        }
        // { foo } = ...
        else if (ts.isShorthandPropertyAssignment(node)) {
            vars.push(getStartEnd(ts, node.name, ast));
        }
        // { ...? } = ...
        // [ ...? ] = ...
        else if (ts.isSpreadAssignment(node) || ts.isSpreadElement(node)) {
            worker(node.expression);
        }
    }
}
function getStartEnd(ts, node, ast) {
    return {
        start: ts.getTokenPosOfNode(node, ast),
        end: node.end,
    };
}
function getNodeText(ts, node, ast) {
    const { start, end } = getStartEnd(ts, node, ast);
    return ast.text.slice(start, end);
}
function getStatementRange(ts, parents, node, ast) {
    let statementRange;
    for (let i = parents.length - 1; i >= 0; i--) {
        if (ts.isStatement(parents[i])) {
            const statement = parents[i];
            ts.forEachChild(statement, child => {
                const range = getStartEnd(ts, child, ast);
                statementRange ??= range;
                statementRange.end = range.end;
            });
            break;
        }
    }
    if (!statementRange) {
        statementRange = getStartEnd(ts, node, ast);
    }
    return statementRange;
}
function getCommentsRange(ts, node, parents, ast) {
    for (let i = parents.length - 1; i >= 0; i--) {
        if (ts.isStatement(node)) {
            break;
        }
        node = parents[i];
    }
    const comments = ts.getLeadingCommentRanges(ast.text, node.pos);
    if (comments?.length) {
        return {
            start: comments[0].pos,
            end: comments.at(-1).end,
        };
    }
}
//# sourceMappingURL=scriptSetupRanges.js.map