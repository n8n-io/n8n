'use strict';

var common = require('@ts-morph/common');
var CodeBlockWriter = require('code-block-writer');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e : { default: e }; }

var CodeBlockWriter__default = /*#__PURE__*/_interopDefaultCompat(CodeBlockWriter);

class AdvancedIterator {
    #iterator;
    #buffer = [undefined, undefined, undefined];
    #bufferIndex = 0;
    #isDone = false;
    #nextCount = 0;
    constructor(iterator) {
        this.#iterator = iterator;
        this.#advance();
    }
    get done() {
        return this.#isDone;
    }
    get current() {
        if (this.#nextCount === 0)
            throw new common.errors.InvalidOperationError("Cannot get the current when the iterator has not been advanced.");
        return this.#buffer[this.#bufferIndex];
    }
    get previous() {
        if (this.#nextCount <= 1)
            throw new common.errors.InvalidOperationError("Cannot get the previous when the iterator has not advanced enough.");
        return this.#buffer[(this.#bufferIndex + this.#buffer.length - 1) % this.#buffer.length];
    }
    get peek() {
        if (this.#isDone)
            throw new common.errors.InvalidOperationError("Cannot peek at the end of the iterator.");
        return this.#buffer[(this.#bufferIndex + 1) % this.#buffer.length];
    }
    next() {
        if (this.done)
            throw new common.errors.InvalidOperationError("Cannot get the next when at the end of the iterator.");
        const next = this.#buffer[this.#getNextBufferIndex()];
        this.#advance();
        this.#nextCount++;
        return next;
    }
    *rest() {
        while (!this.done)
            yield this.next();
    }
    #advance() {
        const next = this.#iterator.next();
        this.#bufferIndex = this.#getNextBufferIndex();
        if (next.done) {
            this.#isDone = true;
            return;
        }
        this.#buffer[this.#getNextBufferIndex()] = next.value;
    }
    #getNextBufferIndex() {
        return (this.#bufferIndex + 1) % this.#buffer.length;
    }
}

const CharCodes = {
    ASTERISK: "*".charCodeAt(0),
    NEWLINE: "\n".charCodeAt(0),
    CARRIAGE_RETURN: "\r".charCodeAt(0),
    SPACE: " ".charCodeAt(0),
    TAB: "\t".charCodeAt(0),
    CLOSE_BRACE: "}".charCodeAt(0),
};

function getNodeByNameOrFindFunction(items, nameOrFindFunc) {
    let findFunc;
    if (typeof nameOrFindFunc === "string")
        findFunc = dec => nodeHasName(dec, nameOrFindFunc);
    else
        findFunc = nameOrFindFunc;
    return items.find(findFunc);
}
function nodeHasName(node, name) {
    if (node.getNameNode == null)
        return false;
    const nameNode = node.getNameNode();
    if (nameNode == null)
        return false;
    if (Node.isArrayBindingPattern(nameNode) || Node.isObjectBindingPattern(nameNode))
        return nameNode.getElements().some(element => nodeHasName(element, name));
    const nodeName = node.getName != null ? node.getName() : nameNode.getText();
    return nodeName === name;
}
function getNotFoundErrorMessageForNameOrFindFunction(findName, nameOrFindFunction) {
    if (typeof nameOrFindFunction === "string")
        return `Expected to find ${findName} named '${nameOrFindFunction}'.`;
    return `Expected to find ${findName} that matched the provided condition.`;
}

exports.CommentNodeKind = void 0;
(function (CommentNodeKind) {
    CommentNodeKind[CommentNodeKind["Statement"] = 0] = "Statement";
    CommentNodeKind[CommentNodeKind["ClassElement"] = 1] = "ClassElement";
    CommentNodeKind[CommentNodeKind["TypeElement"] = 2] = "TypeElement";
    CommentNodeKind[CommentNodeKind["ObjectLiteralElement"] = 3] = "ObjectLiteralElement";
    CommentNodeKind[CommentNodeKind["EnumMember"] = 4] = "EnumMember";
})(exports.CommentNodeKind || (exports.CommentNodeKind = {}));
class CompilerCommentNode {
    #fullStart;
    #start;
    #sourceFile;
    constructor(fullStart, pos, end, kind, sourceFile, parent) {
        this.#fullStart = fullStart;
        this.#start = pos;
        this.#sourceFile = sourceFile;
        this.pos = pos;
        this.end = end;
        this.kind = kind;
        this.flags = common.ts.NodeFlags.None;
        this.parent = parent;
    }
    pos;
    end;
    kind;
    flags;
    modifiers;
    parent;
    getSourceFile() {
        return this.#sourceFile;
    }
    getChildCount(sourceFile) {
        return 0;
    }
    getChildAt(index, sourceFile) {
        return undefined;
    }
    getChildren(sourceFile) {
        return [];
    }
    getStart(sourceFile, includeJsDocComment) {
        return this.#start;
    }
    getFullStart() {
        return this.#fullStart;
    }
    getEnd() {
        return this.end;
    }
    getWidth(sourceFile) {
        return this.end - this.#start;
    }
    getFullWidth() {
        return this.end - this.#fullStart;
    }
    getLeadingTriviaWidth(sourceFile) {
        return this.#start - this.#fullStart;
    }
    getFullText(sourceFile) {
        return this.#sourceFile.text.substring(this.#fullStart, this.end);
    }
    getText(sourceFile) {
        return this.#sourceFile.text.substring(this.#start, this.end);
    }
    getFirstToken(sourceFile) {
        return undefined;
    }
    getLastToken(sourceFile) {
        return undefined;
    }
    forEachChild(cbNode, cbNodeArray) {
        return undefined;
    }
}
class CompilerCommentStatement extends CompilerCommentNode {
    _jsdocContainerBrand;
    _statementBrand;
    _commentKind = exports.CommentNodeKind.Statement;
}
class CompilerCommentClassElement extends CompilerCommentNode {
    _classElementBrand;
    _declarationBrand;
    _commentKind = exports.CommentNodeKind.ClassElement;
}
class CompilerCommentTypeElement extends CompilerCommentNode {
    _typeElementBrand;
    _declarationBrand;
    _commentKind = exports.CommentNodeKind.TypeElement;
}
class CompilerCommentObjectLiteralElement extends CompilerCommentNode {
    _declarationBrand;
    _objectLiteralBrand;
    declarationBrand;
    _commentKind = exports.CommentNodeKind.ObjectLiteralElement;
}
class CompilerCommentEnumMember extends CompilerCommentNode {
    _commentKind = exports.CommentNodeKind.EnumMember;
}

var CommentKind;
(function (CommentKind) {
    CommentKind[CommentKind["SingleLine"] = 0] = "SingleLine";
    CommentKind[CommentKind["MultiLine"] = 1] = "MultiLine";
    CommentKind[CommentKind["JsDoc"] = 2] = "JsDoc";
})(CommentKind || (CommentKind = {}));
const childrenSaver = new WeakMap();
const commentNodeParserKinds = new Set([
    common.SyntaxKind.SourceFile,
    common.SyntaxKind.Block,
    common.SyntaxKind.ModuleBlock,
    common.SyntaxKind.CaseClause,
    common.SyntaxKind.DefaultClause,
    common.SyntaxKind.ClassDeclaration,
    common.SyntaxKind.InterfaceDeclaration,
    common.SyntaxKind.EnumDeclaration,
    common.SyntaxKind.ClassExpression,
    common.SyntaxKind.TypeLiteral,
    common.SyntaxKind.ObjectLiteralExpression,
]);
class CommentNodeParser {
    constructor() {
    }
    static getOrParseChildren(container, sourceFile) {
        if (isSyntaxList(container))
            container = container.parent;
        let children = childrenSaver.get(container);
        if (children == null) {
            children = Array.from(getNodes(container, sourceFile));
            childrenSaver.set(container, children);
        }
        return children;
    }
    static shouldParseChildren(container) {
        return commentNodeParserKinds.has(container.kind)
            && container.pos !== container.end;
    }
    static hasParsedChildren(container) {
        if (isSyntaxList(container))
            container = container.parent;
        return childrenSaver.has(container);
    }
    static isCommentStatement(node) {
        return node._commentKind === exports.CommentNodeKind.Statement;
    }
    static isCommentClassElement(node) {
        return node._commentKind === exports.CommentNodeKind.ClassElement;
    }
    static isCommentTypeElement(node) {
        return node._commentKind === exports.CommentNodeKind.TypeElement;
    }
    static isCommentObjectLiteralElement(node) {
        return node._commentKind === exports.CommentNodeKind.ObjectLiteralElement;
    }
    static isCommentEnumMember(node) {
        return node._commentKind === exports.CommentNodeKind.EnumMember;
    }
    static getContainerBodyPos(container, sourceFile) {
        if (common.ts.isSourceFile(container))
            return 0;
        if (common.ts.isClassDeclaration(container)
            || common.ts.isEnumDeclaration(container)
            || common.ts.isInterfaceDeclaration(container)
            || common.ts.isTypeLiteralNode(container)
            || common.ts.isClassExpression(container)
            || common.ts.isBlock(container)
            || common.ts.isModuleBlock(container)
            || common.ts.isObjectLiteralExpression(container)) {
            return getTokenEnd(container, common.SyntaxKind.OpenBraceToken);
        }
        if (common.ts.isCaseClause(container) || common.ts.isDefaultClause(container))
            return getTokenEnd(container, common.SyntaxKind.ColonToken);
        return common.errors.throwNotImplementedForNeverValueError(container);
        function getTokenEnd(node, kind) {
            return node.getChildren(sourceFile).find(c => c.kind === kind)?.end;
        }
    }
}
function* getNodes(container, sourceFile) {
    const sourceFileText = sourceFile.text;
    const childNodes = getContainerChildren();
    const createComment = getCreationFunction();
    if (childNodes.length === 0) {
        const bodyStartPos = CommentNodeParser.getContainerBodyPos(container, sourceFile);
        if (bodyStartPos != null)
            yield* getCommentNodes(bodyStartPos, false);
    }
    else {
        for (const childNode of childNodes) {
            yield* getCommentNodes(childNode.pos, true);
            yield childNode;
        }
        const lastChild = childNodes[childNodes.length - 1];
        yield* getCommentNodes(lastChild.end, false);
    }
    function* getCommentNodes(pos, stopAtJsDoc) {
        const fullStart = pos;
        skipTrailingLine();
        const leadingComments = Array.from(getLeadingComments());
        const maxEnd = sourceFileText.length === pos || sourceFileText[pos] === "}" ? pos : common.StringUtils.getLineStartFromPos(sourceFileText, pos);
        for (const leadingComment of leadingComments) {
            if (leadingComment.end <= maxEnd)
                yield leadingComment;
        }
        function skipTrailingLine() {
            if (pos === 0)
                return;
            let lineEnd = common.StringUtils.getLineEndFromPos(sourceFileText, pos);
            while (pos < lineEnd) {
                const commentKind = getCommentKind();
                if (commentKind != null) {
                    const comment = parseForComment(commentKind);
                    if (comment.kind === common.SyntaxKind.SingleLineCommentTrivia)
                        return;
                    else
                        lineEnd = common.StringUtils.getLineEndFromPos(sourceFileText, pos);
                }
                else if (!common.StringUtils.isWhitespace(sourceFileText[pos]) && sourceFileText[pos] !== ",")
                    return;
                else
                    pos++;
            }
            while (common.StringUtils.startsWithNewLine(sourceFileText[pos]))
                pos++;
        }
        function* getLeadingComments() {
            while (pos < sourceFileText.length) {
                const commentKind = getCommentKind();
                if (commentKind != null) {
                    const isJsDoc = commentKind === CommentKind.JsDoc;
                    if (isJsDoc && stopAtJsDoc)
                        return;
                    else
                        yield parseForComment(commentKind);
                    skipTrailingLine();
                }
                else if (!common.StringUtils.isWhitespace(sourceFileText[pos]))
                    return;
                else
                    pos++;
            }
        }
        function parseForComment(commentKind) {
            if (commentKind === CommentKind.SingleLine)
                return parseSingleLineComment();
            const isJsDoc = commentKind === CommentKind.JsDoc;
            return parseMultiLineComment(isJsDoc);
        }
        function getCommentKind() {
            const currentChar = sourceFileText[pos];
            if (currentChar !== "/")
                return undefined;
            const nextChar = sourceFileText[pos + 1];
            if (nextChar === "/")
                return CommentKind.SingleLine;
            if (nextChar !== "*")
                return undefined;
            const nextNextChar = sourceFileText[pos + 2];
            return nextNextChar === "*" ? CommentKind.JsDoc : CommentKind.MultiLine;
        }
        function parseSingleLineComment() {
            const start = pos;
            skipSingleLineComment();
            const end = pos;
            return createComment(fullStart, start, end, common.SyntaxKind.SingleLineCommentTrivia);
        }
        function skipSingleLineComment() {
            pos += 2;
            while (pos < sourceFileText.length && sourceFileText[pos] !== "\n" && sourceFileText[pos] !== "\r")
                pos++;
        }
        function parseMultiLineComment(isJsDoc) {
            const start = pos;
            skipSlashStarComment(isJsDoc);
            const end = pos;
            return createComment(fullStart, start, end, common.SyntaxKind.MultiLineCommentTrivia);
        }
        function skipSlashStarComment(isJsDoc) {
            pos += isJsDoc ? 3 : 2;
            while (pos < sourceFileText.length) {
                if (sourceFileText[pos] === "*" && sourceFileText[pos + 1] === "/") {
                    pos += 2;
                    break;
                }
                pos++;
            }
        }
    }
    function getContainerChildren() {
        if (common.ts.isSourceFile(container) || common.ts.isBlock(container) || common.ts.isModuleBlock(container) || common.ts.isCaseClause(container) || common.ts.isDefaultClause(container))
            return container.statements;
        if (common.ts.isClassDeclaration(container)
            || common.ts.isClassExpression(container)
            || common.ts.isEnumDeclaration(container)
            || common.ts.isInterfaceDeclaration(container)
            || common.ts.isTypeLiteralNode(container)
            || common.ts.isClassExpression(container)) {
            return container.members;
        }
        if (common.ts.isObjectLiteralExpression(container))
            return container.properties;
        return common.errors.throwNotImplementedForNeverValueError(container);
    }
    function getCreationFunction() {
        const ctor = getCtor();
        return (fullStart, pos, end, kind) => new ctor(fullStart, pos, end, kind, sourceFile, container);
        function getCtor() {
            if (isStatementContainerNode(container))
                return CompilerCommentStatement;
            if (common.ts.isClassLike(container))
                return CompilerCommentClassElement;
            if (common.ts.isInterfaceDeclaration(container) || common.ts.isTypeLiteralNode(container))
                return CompilerCommentTypeElement;
            if (common.ts.isObjectLiteralExpression(container))
                return CompilerCommentObjectLiteralElement;
            if (common.ts.isEnumDeclaration(container))
                return CompilerCommentEnumMember;
            throw new common.errors.NotImplementedError(`Not implemented comment node container type: ${common.getSyntaxKindName(container.kind)}`);
        }
    }
}
function isSyntaxList(node) {
    return node.kind === common.SyntaxKind.SyntaxList;
}
function isStatementContainerNode(node) {
    return getStatementContainerNode() != null;
    function getStatementContainerNode() {
        const container = node;
        if (common.ts.isSourceFile(container)
            || common.ts.isBlock(container)
            || common.ts.isModuleBlock(container)
            || common.ts.isCaseClause(container)
            || common.ts.isDefaultClause(container)) {
            return container;
        }
        return undefined;
    }
}

const forEachChildSaver = new WeakMap();
const getChildrenSaver = new WeakMap();
class ExtendedParser {
    static getContainerArray(container, sourceFile) {
        return CommentNodeParser.getOrParseChildren(container, sourceFile);
    }
    static hasParsedTokens(node) {
        return getChildrenSaver.has(node) || node.kind == common.SyntaxKind.SyntaxList;
    }
    static getCompilerChildrenFast(node, sourceFile) {
        if (ExtendedParser.hasParsedTokens(node))
            return ExtendedParser.getCompilerChildren(node, sourceFile);
        return ExtendedParser.getCompilerForEachChildren(node, sourceFile);
    }
    static getCompilerForEachChildren(node, sourceFile) {
        if (CommentNodeParser.shouldParseChildren(node)) {
            let result = forEachChildSaver.get(node);
            if (result == null) {
                result = getForEachChildren();
                mergeInComments(result, CommentNodeParser.getOrParseChildren(node, sourceFile));
                forEachChildSaver.set(node, result);
            }
            return result;
        }
        return getForEachChildren();
        function getForEachChildren() {
            const children = [];
            node.forEachChild(child => {
                children.push(child);
            });
            return children;
        }
    }
    static getCompilerChildren(node, sourceFile) {
        let result = getChildrenSaver.get(node);
        if (result == null) {
            if (isStatementMemberOrPropertyHoldingSyntaxList()) {
                const newArray = [...node.getChildren(sourceFile)];
                mergeInComments(newArray, CommentNodeParser.getOrParseChildren(node, sourceFile));
                result = newArray;
            }
            else {
                result = node.getChildren(sourceFile);
            }
            getChildrenSaver.set(node, result);
        }
        return result;
        function isStatementMemberOrPropertyHoldingSyntaxList() {
            if (node.kind !== common.ts.SyntaxKind.SyntaxList)
                return false;
            const parent = node.parent;
            if (!CommentNodeParser.shouldParseChildren(parent))
                return false;
            return CommentNodeParser.getContainerBodyPos(parent, sourceFile) === node.pos;
        }
    }
}
function mergeInComments(nodes, otherNodes) {
    let currentIndex = 0;
    for (const child of otherNodes) {
        if (child.kind !== common.SyntaxKind.SingleLineCommentTrivia && child.kind !== common.SyntaxKind.MultiLineCommentTrivia)
            continue;
        while (currentIndex < nodes.length && nodes[currentIndex].end < child.end)
            currentIndex++;
        nodes.splice(currentIndex, 0, child);
        currentIndex++;
    }
}

function isComment(node) {
    return node.kind === common.ts.SyntaxKind.SingleLineCommentTrivia
        || node.kind === common.ts.SyntaxKind.MultiLineCommentTrivia;
}

function getParentSyntaxList(node, sourceFile) {
    if (node.kind === common.SyntaxKind.EndOfFileToken)
        return undefined;
    const parent = node.parent;
    if (parent == null)
        return undefined;
    const { pos, end } = node;
    for (const child of ExtendedParser.getCompilerChildren(parent, sourceFile)) {
        if (child.pos > end || child === node)
            return undefined;
        if (child.kind === common.SyntaxKind.SyntaxList && child.pos <= pos && child.end >= end)
            return child;
    }
    return undefined;
}

function getSymbolByNameOrFindFunction(items, nameOrFindFunc) {
    let findFunc;
    if (typeof nameOrFindFunc === "string")
        findFunc = dec => dec.getName() === nameOrFindFunc;
    else
        findFunc = nameOrFindFunc;
    return items.find(findFunc);
}

function isNodeAmbientOrInAmbientContext(node) {
    if (checkNodeIsAmbient(node) || node._sourceFile.isDeclarationFile())
        return true;
    for (const ancestor of node._getAncestorsIterator(false)) {
        if (checkNodeIsAmbient(ancestor))
            return true;
    }
    return false;
}
function checkNodeIsAmbient(node) {
    const isThisAmbient = (node.getCombinedModifierFlags() & common.ts.ModifierFlags.Ambient) === common.ts.ModifierFlags.Ambient;
    return isThisAmbient || Node.isInterfaceDeclaration(node) || Node.isTypeAliasDeclaration(node);
}

function isStringKind(kind) {
    switch (kind) {
        case common.SyntaxKind.StringLiteral:
        case common.SyntaxKind.NoSubstitutionTemplateLiteral:
        case common.SyntaxKind.TemplateHead:
        case common.SyntaxKind.TemplateMiddle:
        case common.SyntaxKind.TemplateTail:
            return true;
        default:
            return false;
    }
}

class ModuleUtils {
    constructor() {
    }
    static isModuleSpecifierRelative(text) {
        return text.startsWith("./")
            || text.startsWith("../");
    }
    static getReferencedSourceFileFromSymbol(symbol) {
        const declarations = symbol.getDeclarations();
        if (declarations.length === 0 || declarations[0].getKind() !== common.SyntaxKind.SourceFile)
            return undefined;
        return declarations[0];
    }
}

function printNode(node, sourceFileOrOptions, secondOverloadOptions) {
    const isFirstOverload = sourceFileOrOptions == null || sourceFileOrOptions.kind !== common.SyntaxKind.SourceFile;
    const options = getOptions();
    const sourceFile = getSourceFile();
    const printer = common.ts.createPrinter({
        newLine: options.newLineKind ?? common.NewLineKind.LineFeed,
        removeComments: options.removeComments || false,
    });
    if (sourceFile == null)
        return printer.printFile(node);
    else
        return printer.printNode(options.emitHint ?? common.EmitHint.Unspecified, node, sourceFile);
    function getSourceFile() {
        if (isFirstOverload) {
            if (node.kind === common.SyntaxKind.SourceFile)
                return undefined;
            const topParent = getNodeSourceFile();
            if (topParent == null) {
                const scriptKind = getScriptKind();
                return common.ts.createSourceFile(`print.${getFileExt(scriptKind)}`, "", common.ScriptTarget.Latest, false, scriptKind);
            }
            return topParent;
        }
        return sourceFileOrOptions;
        function getScriptKind() {
            return options.scriptKind ?? common.ScriptKind.TSX;
        }
        function getFileExt(scriptKind) {
            if (scriptKind === common.ScriptKind.JSX || scriptKind === common.ScriptKind.TSX)
                return "tsx";
            return "ts";
        }
    }
    function getNodeSourceFile() {
        let topNode = node.parent;
        while (topNode != null && topNode.parent != null)
            topNode = topNode.parent;
        return topNode;
    }
    function getOptions() {
        return (isFirstOverload ? sourceFileOrOptions : secondOverloadOptions) || {};
    }
}

exports.IndentationText = void 0;
(function (IndentationText) {
    IndentationText["TwoSpaces"] = "  ";
    IndentationText["FourSpaces"] = "    ";
    IndentationText["EightSpaces"] = "        ";
    IndentationText["Tab"] = "\t";
})(exports.IndentationText || (exports.IndentationText = {}));
class ManipulationSettingsContainer extends common.SettingsContainer {
    #editorSettings;
    #formatCodeSettings;
    #userPreferences;
    constructor() {
        super({
            indentationText: exports.IndentationText.FourSpaces,
            newLineKind: common.NewLineKind.LineFeed,
            quoteKind: exports.QuoteKind.Double,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
            usePrefixAndSuffixTextForRename: false,
            useTrailingCommas: false,
        });
    }
    getEditorSettings() {
        if (this.#editorSettings == null) {
            this.#editorSettings = {};
            fillDefaultEditorSettings(this.#editorSettings, this);
        }
        return { ...this.#editorSettings };
    }
    getFormatCodeSettings() {
        if (this.#formatCodeSettings == null) {
            this.#formatCodeSettings = {
                ...this.getEditorSettings(),
                insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: this._settings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces,
            };
        }
        return { ...this.#formatCodeSettings };
    }
    getUserPreferences() {
        if (this.#userPreferences == null) {
            this.#userPreferences = {
                quotePreference: this.getQuoteKind() === exports.QuoteKind.Double ? "double" : "single",
                providePrefixAndSuffixTextForRename: this.getUsePrefixAndSuffixTextForRename(),
            };
        }
        return { ...this.#userPreferences };
    }
    getQuoteKind() {
        return this._settings.quoteKind;
    }
    getNewLineKind() {
        return this._settings.newLineKind;
    }
    getNewLineKindAsString() {
        return newLineKindToString(this.getNewLineKind());
    }
    getIndentationText() {
        return this._settings.indentationText;
    }
    getUsePrefixAndSuffixTextForRename() {
        return this._settings.usePrefixAndSuffixTextForRename;
    }
    getUseTrailingCommas() {
        return this._settings.useTrailingCommas;
    }
    set(settings) {
        super.set(settings);
        this.#editorSettings = undefined;
        this.#formatCodeSettings = undefined;
        this.#userPreferences = undefined;
    }
    _getIndentSizeInSpaces() {
        const indentationText = this.getIndentationText();
        switch (indentationText) {
            case exports.IndentationText.EightSpaces:
                return 8;
            case exports.IndentationText.FourSpaces:
                return 4;
            case exports.IndentationText.TwoSpaces:
                return 2;
            case exports.IndentationText.Tab:
                return 4;
            default:
                return common.errors.throwNotImplementedForNeverValueError(indentationText);
        }
    }
}

function setValueIfUndefined(obj, propertyName, defaultValue) {
    if (typeof obj[propertyName] === "undefined")
        obj[propertyName] = defaultValue;
}

function fillDefaultEditorSettings(settings, manipulationSettings) {
    setValueIfUndefined(settings, "convertTabsToSpaces", manipulationSettings.getIndentationText() !== exports.IndentationText.Tab);
    setValueIfUndefined(settings, "newLineCharacter", manipulationSettings.getNewLineKindAsString());
    setValueIfUndefined(settings, "indentStyle", common.ts.IndentStyle.Smart);
    setValueIfUndefined(settings, "indentSize", manipulationSettings.getIndentationText().length);
    setValueIfUndefined(settings, "tabSize", manipulationSettings.getIndentationText().length);
}

function fillDefaultFormatCodeSettings(settings, manipulationSettings) {
    fillDefaultEditorSettings(settings, manipulationSettings);
    setValueIfUndefined(settings, "insertSpaceAfterCommaDelimiter", true);
    setValueIfUndefined(settings, "insertSpaceAfterConstructor", false);
    setValueIfUndefined(settings, "insertSpaceAfterSemicolonInForStatements", true);
    setValueIfUndefined(settings, "insertSpaceAfterKeywordsInControlFlowStatements", true);
    setValueIfUndefined(settings, "insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces", true);
    setValueIfUndefined(settings, "insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets", false);
    setValueIfUndefined(settings, "insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces", false);
    setValueIfUndefined(settings, "insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces", false);
    setValueIfUndefined(settings, "insertSpaceBeforeFunctionParenthesis", false);
    setValueIfUndefined(settings, "insertSpaceBeforeAndAfterBinaryOperators", true);
    setValueIfUndefined(settings, "placeOpenBraceOnNewLineForFunctions", false);
    setValueIfUndefined(settings, "placeOpenBraceOnNewLineForControlBlocks", false);
    setValueIfUndefined(settings, "ensureNewLineAtEndOfFile", true);
}

function getTextFromStringOrWriter(writer, textOrWriterFunction) {
    printTextFromStringOrWriter(writer, textOrWriterFunction);
    return writer.toString();
}
function printTextFromStringOrWriter(writer, textOrWriterFunction) {
    if (typeof textOrWriterFunction === "string")
        writer.write(textOrWriterFunction);
    else if (textOrWriterFunction instanceof Function)
        textOrWriterFunction(writer);
    else {
        for (let i = 0; i < textOrWriterFunction.length; i++) {
            if (i > 0)
                writer.newLineIfLastNot();
            printTextFromStringOrWriter(writer, textOrWriterFunction[i]);
        }
    }
}

class EnableableLogger {
    #enabled = false;
    setEnabled(enabled) {
        this.#enabled = enabled;
    }
    log(text) {
        if (this.#enabled)
            this.logInternal(text);
    }
    warn(text) {
        if (this.#enabled)
            this.warnInternal(text);
    }
}

class ConsoleLogger extends EnableableLogger {
    logInternal(text) {
        console.log(text);
    }
    warnInternal(text) {
        console.warn(text);
    }
}

const reg = /^[$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc][$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc0-9\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19b0-\u19c0\u19c8\u19c9\u19d0-\u19d9\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1dc0-\u1de6\u1dfc-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]*$/;
const bannedNames = new Set([
    "do", "if", "in", "for", "let", "new", "try", "var", "case", "else", "enum", "eval", "false", "null",
    "this", "true", "void", "with", "break", "catch", "class", "const", "super", "throw", "while", "yield",
    "delete", "export", "import", "public", "return", "static", "switch", "typeof", "default", "extends",
    "finally", "package", "private", "continue", "debugger", "function", "arguments", "interface", "protected",
    "implements", "instanceof"
]);
function isValidVariableName(variableName) {
    if (bannedNames.has(variableName))
        return false;
    if (isAlphaNumeric(variableName))
        return true;
    return reg.test(variableName);
}
function isAlphaNumeric(variableName) {
    for (let i = 0; i < variableName.length; i++) {
        const ch = variableName.charCodeAt(i);
        if (!(ch >= 48 && ch <= 57)
            && !(ch >= 65 && ch <= 90)
            && !(ch >= 97 && ch <= 122)) {
            return false;
        }
    }
    return true;
}

function newLineKindToString(kind) {
    switch (kind) {
        case common.NewLineKind.CarriageReturnLineFeed:
            return "\r\n";
        case common.NewLineKind.LineFeed:
            return "\n";
        default:
            throw new common.errors.NotImplementedError(`Not implemented newline kind: ${kind}`);
    }
}

class LazyReferenceCoordinator {
    #dirtySourceFiles = new Set();
    constructor(factory) {
        const onSourceFileModified = (sourceFile) => {
            if (!sourceFile.wasForgotten())
                this.#dirtySourceFiles.add(sourceFile);
        };
        factory.onSourceFileAdded(sourceFile => {
            this.#dirtySourceFiles.add(sourceFile);
            sourceFile.onModified(onSourceFileModified);
        });
        factory.onSourceFileRemoved(sourceFile => {
            sourceFile._referenceContainer.clear();
            this.#dirtySourceFiles.delete(sourceFile);
            sourceFile.onModified(onSourceFileModified, false);
        });
    }
    refreshDirtySourceFiles() {
        for (const sourceFile of this.#dirtySourceFiles.values())
            sourceFile._referenceContainer.refresh();
        this.clearDirtySourceFiles();
    }
    refreshSourceFileIfDirty(sourceFile) {
        if (!this.#dirtySourceFiles.has(sourceFile))
            return;
        sourceFile._referenceContainer.refresh();
        this.clearDirtyForSourceFile(sourceFile);
    }
    addDirtySourceFile(sourceFile) {
        this.#dirtySourceFiles.add(sourceFile);
    }
    clearDirtySourceFiles() {
        this.#dirtySourceFiles.clear();
    }
    clearDirtyForSourceFile(sourceFile) {
        this.#dirtySourceFiles.delete(sourceFile);
    }
}

class SourceFileReferenceContainer {
    #sourceFile;
    #nodesInThis = new common.KeyValueCache();
    #nodesInOther = new common.KeyValueCache();
    #unresolvedLiterals = [];
    constructor(sourceFile) {
        this.#sourceFile = sourceFile;
    }
    getDependentSourceFiles() {
        this.#sourceFile._context.lazyReferenceCoordinator.refreshDirtySourceFiles();
        const hashSet = new Set();
        for (const nodeInOther of this.#nodesInOther.getKeys())
            hashSet.add(nodeInOther._sourceFile);
        return hashSet.values();
    }
    getLiteralsReferencingOtherSourceFilesEntries() {
        this.#sourceFile._context.lazyReferenceCoordinator.refreshSourceFileIfDirty(this.#sourceFile);
        return this.#nodesInThis.getEntries();
    }
    getReferencingLiteralsInOtherSourceFiles() {
        this.#sourceFile._context.lazyReferenceCoordinator.refreshDirtySourceFiles();
        return this.#nodesInOther.getKeys();
    }
    refresh() {
        if (this.#unresolvedLiterals.length > 0)
            this.#sourceFile._context.compilerFactory.onSourceFileAdded(this.#resolveUnresolved, false);
        this.clear();
        this.#populateReferences();
        if (this.#unresolvedLiterals.length > 0)
            this.#sourceFile._context.compilerFactory.onSourceFileAdded(this.#resolveUnresolved);
    }
    clear() {
        this.#unresolvedLiterals.length = 0;
        for (const [node, sourceFile] of this.#nodesInThis.getEntries()) {
            this.#nodesInThis.removeByKey(node);
            sourceFile._referenceContainer.#nodesInOther.removeByKey(node);
        }
    }
    #resolveUnresolved = () => {
        for (let i = this.#unresolvedLiterals.length - 1; i >= 0; i--) {
            const literal = this.#unresolvedLiterals[i];
            const sourceFile = this.#getSourceFileForLiteral(literal);
            if (sourceFile != null) {
                this.#unresolvedLiterals.splice(i, 1);
                this.#addNodeInThis(literal, sourceFile);
            }
        }
        if (this.#unresolvedLiterals.length === 0)
            this.#sourceFile._context.compilerFactory.onSourceFileAdded(this.#resolveUnresolved, false);
    };
    #populateReferences() {
        this.#sourceFile._context.compilerFactory.forgetNodesCreatedInBlock(remember => {
            for (const literal of this.#sourceFile.getImportStringLiterals()) {
                const sourceFile = this.#getSourceFileForLiteral(literal);
                remember(literal);
                if (sourceFile == null)
                    this.#unresolvedLiterals.push(literal);
                else
                    this.#addNodeInThis(literal, sourceFile);
            }
        });
    }
    #getSourceFileForLiteral(literal) {
        const parent = literal.getParentOrThrow();
        const grandParent = parent.getParent();
        if (Node.isImportDeclaration(parent) || Node.isExportDeclaration(parent))
            return parent.getModuleSpecifierSourceFile();
        else if (grandParent != null && Node.isImportEqualsDeclaration(grandParent))
            return grandParent.getExternalModuleReferenceSourceFile();
        else if (grandParent != null && Node.isImportTypeNode(grandParent)) {
            const importTypeSymbol = grandParent.getSymbol();
            if (importTypeSymbol != null)
                return ModuleUtils.getReferencedSourceFileFromSymbol(importTypeSymbol);
        }
        else if (Node.isCallExpression(parent)) {
            const literalSymbol = literal.getSymbol();
            if (literalSymbol != null)
                return ModuleUtils.getReferencedSourceFileFromSymbol(literalSymbol);
        }
        else {
            this.#sourceFile._context.logger.warn(`Unknown import string literal parent: ${parent.getKindName()}`);
        }
        return undefined;
    }
    #addNodeInThis(literal, sourceFile) {
        this.#nodesInThis.set(literal, sourceFile);
        sourceFile._referenceContainer.#nodesInOther.set(literal, sourceFile);
    }
}

function getCompilerOptionsFromTsConfig(filePath, options = {}) {
    const result = common.getCompilerOptionsFromTsConfig(filePath, options);
    return {
        options: result.options,
        errors: result.errors.map(error => new Diagnostic(undefined, error)),
    };
}

const [tsMajor, tsMinor, tsPatch] = common.ts.version.split(".").map(v => parseInt(v, 10));

class WriterUtils {
    constructor() {
    }
    static getLastCharactersToPos(writer, pos) {
        const writerLength = writer.getLength();
        const charCount = writerLength - pos;
        const chars = new Array(charCount);
        writer.iterateLastChars((char, i) => {
            const insertPos = i - pos;
            if (insertPos < 0)
                return true;
            chars[insertPos] = char;
            return undefined;
        });
        return chars.join("");
    }
}

function callBaseGetStructure(basePrototype, node, structure) {
    let newStructure;
    if (basePrototype.getStructure != null)
        newStructure = basePrototype.getStructure.call(node);
    else
        newStructure = {};
    if (structure != null)
        Object.assign(newStructure, structure);
    return newStructure;
}

function callBaseSet(basePrototype, node, structure) {
    if (basePrototype.set != null)
        basePrototype.set.call(node, structure);
}

function AmbientableNode(Base) {
    return class extends Base {
        hasDeclareKeyword() {
            return this.getDeclareKeyword() != null;
        }
        getDeclareKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getDeclareKeyword(), message ?? "Expected to find a declare keyword.", this);
        }
        getDeclareKeyword() {
            return this.getFirstModifierByKind(common.SyntaxKind.DeclareKeyword);
        }
        isAmbient() {
            return isNodeAmbientOrInAmbientContext(this);
        }
        setHasDeclareKeyword(value) {
            this.toggleModifier("declare", value);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.hasDeclareKeyword != null)
                this.setHasDeclareKeyword(structure.hasDeclareKeyword);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                hasDeclareKeyword: this.hasDeclareKeyword(),
            });
        }
    };
}

var FormattingKind;
(function (FormattingKind) {
    FormattingKind[FormattingKind["Newline"] = 0] = "Newline";
    FormattingKind[FormattingKind["Blankline"] = 1] = "Blankline";
    FormattingKind[FormattingKind["Space"] = 2] = "Space";
    FormattingKind[FormattingKind["None"] = 3] = "None";
})(FormattingKind || (FormattingKind = {}));

function getClassMemberFormatting(parent, member) {
    if (Node.isAmbientable(parent) && parent.isAmbient())
        return FormattingKind.Newline;
    if (hasBody$1(member))
        return FormattingKind.Blankline;
    return FormattingKind.Newline;
}
function hasBody$1(node) {
    if (Node.isBodyable(node) && node.getBody() != null)
        return true;
    if (Node.isBodied(node))
        return true;
    return false;
}

function getFormattingKindText(formattingKind, opts) {
    switch (formattingKind) {
        case FormattingKind.Space:
            return " ";
        case FormattingKind.Newline:
            return opts.newLineKind;
        case FormattingKind.Blankline:
            return opts.newLineKind + opts.newLineKind;
        case FormattingKind.None:
            return "";
        default:
            throw new common.errors.NotImplementedError(`Not implemented formatting kind: ${formattingKind}`);
    }
}

function getInterfaceMemberFormatting(parent, member) {
    return FormattingKind.Newline;
}

function hasBody(node) {
    if (Node.isBodyable(node) && node.hasBody())
        return true;
    if (Node.isBodied(node))
        return true;
    return Node.isInterfaceDeclaration(node) || Node.isClassDeclaration(node) || Node.isEnumDeclaration(node);
}

function getStatementedNodeChildFormatting(parent, member) {
    if (hasBody(member))
        return FormattingKind.Blankline;
    return FormattingKind.Newline;
}
function getClausedNodeChildFormatting(parent, member) {
    return FormattingKind.Newline;
}

function getGeneralFormatting(parent, child) {
    if (Node.isClassDeclaration(parent))
        return getClassMemberFormatting(parent, child);
    if (Node.isInterfaceDeclaration(parent))
        return getInterfaceMemberFormatting();
    return getStatementedNodeChildFormatting(parent, child);
}

function getTextFromTextChanges(sourceFile, textChanges) {
    const text = sourceFile.getFullText();
    const editResult = [];
    let start = 0;
    for (const { edit } of getSortedTextChanges()) {
        const span = edit.getSpan();
        const beforeEdit = text.slice(start, span.getStart());
        start = span.getEnd();
        editResult.push(beforeEdit);
        editResult.push(edit.getNewText());
    }
    editResult.push(text.slice(start));
    return editResult.join("");
    function getSortedTextChanges() {
        return textChanges.map((edit, index) => ({ edit: toWrappedTextChange(edit), index })).sort((a, b) => {
            const aStart = a.edit.getSpan().getStart();
            const bStart = b.edit.getSpan().getStart();
            const difference = aStart - bStart;
            if (difference === 0)
                return a.index < b.index ? -1 : 1;
            return difference < 0 ? -1 : 1;
        });
    }
    function toWrappedTextChange(change) {
        if (change instanceof TextChange)
            return change;
        else
            return new TextChange(change);
    }
}

function getNewInsertCode(opts) {
    const { structures, newCodes, parent, getSeparator, previousFormattingKind, nextFormattingKind } = opts;
    const indentationText = opts.indentationText ?? parent.getChildIndentationText();
    const newLineKind = parent._context.manipulationSettings.getNewLineKindAsString();
    return getFormattingKindTextWithIndent(previousFormattingKind) + getChildCode() + getFormattingKindTextWithIndent(nextFormattingKind);
    function getChildCode() {
        let code = newCodes[0];
        for (let i = 1; i < newCodes.length; i++) {
            const formattingKind = getSeparator(structures[i - 1], structures[i]);
            code += getFormattingKindTextWithIndent(formattingKind);
            code += newCodes[i];
        }
        return code;
    }
    function getFormattingKindTextWithIndent(formattingKind) {
        let code = getFormattingKindText(formattingKind, { newLineKind });
        if (formattingKind === FormattingKind.Newline || formattingKind === FormattingKind.Blankline)
            code += indentationText;
        return code;
    }
}

const scanner = common.ts.createScanner(common.ts.ScriptTarget.Latest, true);
function appendCommaToText(text) {
    const pos = getAppendCommaPos(text);
    if (pos === -1)
        return text;
    return text.substring(0, pos) + "," + text.substring(pos);
}
function getAppendCommaPos(text) {
    scanner.setText(text);
    try {
        let token = scanner.scan();
        if (token === common.ts.SyntaxKind.EndOfFileToken)
            return -1;
        const templateStack = [];
        while (token !== common.ts.SyntaxKind.EndOfFileToken) {
            switch (token) {
                case common.ts.SyntaxKind.TemplateHead:
                    templateStack.push(token);
                    break;
                case common.ts.SyntaxKind.OpenBraceToken:
                    if (templateStack.length > 0)
                        templateStack.push(token);
                    break;
                case common.ts.SyntaxKind.CloseBraceToken: {
                    if (templateStack.length > 0) {
                        const lastTemplateStackToken = templateStack.at(-1);
                        if (lastTemplateStackToken === common.ts.SyntaxKind.TemplateHead) {
                            token = scanner.reScanTemplateToken(false);
                            if (token === common.ts.SyntaxKind.TemplateTail)
                                templateStack.pop();
                        }
                        else {
                            templateStack.pop();
                        }
                    }
                    break;
                }
            }
            token = scanner.scan();
        }
        const pos = scanner.getTokenFullStart();
        return text[pos - 1] === "," ? -1 : pos;
    }
    finally {
        scanner.setText(undefined);
    }
}

function getEndIndexFromArray(array) {
    return array?.length ?? 0;
}

function getNextMatchingPos(text, pos, condition) {
    while (pos < text.length) {
        const charCode = text.charCodeAt(pos);
        if (!condition(charCode))
            pos++;
        else
            break;
    }
    return pos;
}

function getPreviousMatchingPos(text, pos, condition) {
    while (pos > 0) {
        const charCode = text.charCodeAt(pos - 1);
        if (!condition(charCode))
            pos--;
        else
            break;
    }
    return pos;
}

function getNextNonWhitespacePos(text, pos) {
    return getNextMatchingPos(text, pos, isNotWhitespace);
}
function getPreviousNonWhitespacePos(text, pos) {
    return getPreviousMatchingPos(text, pos, isNotWhitespace);
}
function isNotWhitespace(charCode) {
    return !common.StringUtils.isWhitespaceCharCode(charCode);
}

function getPosAtEndOfPreviousLine(fullText, pos) {
    while (pos > 0) {
        pos--;
        if (fullText[pos] === "\n") {
            if (fullText[pos - 1] === "\r")
                return pos - 1;
            return pos;
        }
    }
    return pos;
}

function getPosAtNextNonBlankLine(text, pos) {
    let newPos = pos;
    for (let i = pos; i < text.length; i++) {
        if (text[i] === " " || text[i] === "\t")
            continue;
        if (text[i] === "\r" && text[i + 1] === "\n" || text[i] === "\n") {
            newPos = i + 1;
            if (text[i] === "\r") {
                i++;
                newPos++;
            }
            continue;
        }
        return newPos;
    }
    return newPos;
}

function getPosAtStartOfLineOrNonWhitespace(fullText, pos) {
    while (pos > 0) {
        pos--;
        const currentChar = fullText[pos];
        if (currentChar === "\n")
            return pos + 1;
        else if (currentChar !== " " && currentChar !== "\t")
            return pos + 1;
    }
    return pos;
}

function getInsertPosFromIndex(index, syntaxList, children) {
    if (index === 0) {
        const parent = syntaxList.getParentOrThrow();
        if (Node.isSourceFile(parent))
            return 0;
        else if (Node.isCaseClause(parent) || Node.isDefaultClause(parent)) {
            const colonToken = parent.getFirstChildByKindOrThrow(common.SyntaxKind.ColonToken);
            return colonToken.getEnd();
        }
        const isInline = syntaxList !== parent.getChildSyntaxList();
        if (isInline)
            return syntaxList.getStart();
        const parentContainer = getParentContainerOrThrow(parent);
        const openBraceToken = parentContainer.getFirstChildByKindOrThrow(common.SyntaxKind.OpenBraceToken);
        return openBraceToken.getEnd();
    }
    else {
        return children[index - 1].getEnd();
    }
}
function getEndPosFromIndex(index, parent, children, fullText) {
    let endPos;
    if (index === children.length) {
        if (Node.isSourceFile(parent))
            endPos = parent.getEnd();
        else if (Node.isCaseClause(parent) || Node.isDefaultClause(parent))
            endPos = parent.getEnd();
        else {
            const parentContainer = getParentContainerOrThrow(parent);
            const closeBraceToken = parentContainer.getLastChildByKind(common.SyntaxKind.CloseBraceToken);
            if (closeBraceToken == null)
                endPos = parent.getEnd();
            else
                endPos = closeBraceToken.getStart();
        }
    }
    else {
        endPos = children[index].getNonWhitespaceStart();
    }
    return getPosAtStartOfLineOrNonWhitespace(fullText, endPos);
}
function getParentContainerOrThrow(parent) {
    if (Node.isModuleDeclaration(parent)) {
        const innerBody = parent._getInnerBody();
        if (innerBody == null)
            throw new common.errors.InvalidOperationError("This operation requires the module to have a body.");
        return innerBody;
    }
    else if (Node.isBodied(parent))
        return parent.getBody();
    else if (Node.isBodyable(parent))
        return parent.getBodyOrThrow();
    else
        return parent;
}

function fromAbstractableNode(node) {
    return {
        isAbstract: node.isAbstract(),
    };
}
function fromAmbientableNode(node) {
    return {
        hasDeclareKeyword: node.hasDeclareKeyword(),
    };
}
function fromExportableNode(node) {
    return {
        isDefaultExport: node.hasDefaultKeyword(),
        isExported: node.hasExportKeyword(),
    };
}
function fromStaticableNode(node) {
    return {
        isStatic: node.isStatic(),
    };
}
function fromScopedNode(node) {
    return {
        scope: node.hasScopeKeyword() ? node.getScope() : undefined,
    };
}
function fromOverrideableNode(node) {
    return {
        hasOverrideKeyword: node.hasOverrideKeyword(),
    };
}
function fromQuestionTokenableNode(node) {
    return {
        hasQuestionToken: node.hasQuestionToken(),
    };
}

function getNodesToReturn(oldChildren, newChildren, index, allowCommentNodes) {
    const oldChildCount = typeof oldChildren === "number" ? oldChildren : oldChildren.length;
    const newLength = newChildren.length - oldChildCount;
    const result = [];
    for (let i = 0; i < newLength; i++) {
        const currentChild = newChildren[index + i];
        if (allowCommentNodes || !Node.isCommentNode(currentChild))
            result.push(currentChild);
    }
    return result;
}

function getRangeWithoutCommentsFromArray(array, index, length, expectedKind) {
    const children = [];
    while (index < array.length && children.length < length) {
        const child = array[index];
        const childKind = child.getKind();
        if (childKind !== common.SyntaxKind.SingleLineCommentTrivia && childKind !== common.SyntaxKind.MultiLineCommentTrivia) {
            if (childKind !== expectedKind) {
                throw new common.errors.NotImplementedError(`Unexpected! Inserting syntax kind of ${common.getSyntaxKindName(expectedKind)}`
                    + `, but ${child.getKindName()} was inserted.`);
            }
            children.push(child);
        }
        index++;
    }
    if (children.length !== length)
        throw new common.errors.NotImplementedError(`Unexpected! Inserted ${length} child/children, but ${children.length} were inserted.`);
    return children;
}

function fromConstructorDeclarationOverload(node) {
    const structure = {};
    Object.assign(structure, fromScopedNode(node));
    return structure;
}
function fromFunctionDeclarationOverload(node) {
    const structure = {};
    Object.assign(structure, fromAmbientableNode(node));
    Object.assign(structure, fromExportableNode(node));
    return structure;
}
function fromMethodDeclarationOverload(node) {
    const structure = {};
    Object.assign(structure, fromStaticableNode(node));
    Object.assign(structure, fromAbstractableNode(node));
    Object.assign(structure, fromScopedNode(node));
    Object.assign(structure, fromQuestionTokenableNode(node));
    Object.assign(structure, fromOverrideableNode(node));
    return structure;
}

function verifyAndGetIndex(index, length) {
    const newIndex = index < 0 ? length + index : index;
    if (newIndex < 0)
        throw new common.errors.InvalidOperationError(`Invalid index: The max negative index is ${length * -1}, but ${index} was specified.`);
    if (index > length)
        throw new common.errors.InvalidOperationError(`Invalid index: The max index is ${length}, but ${index} was specified.`);
    return newIndex;
}

class NodeHandlerHelper {
    #compilerFactory;
    constructor(compilerFactory) {
        this.#compilerFactory = compilerFactory;
    }
    handleForValues(handler, currentNode, newNode, newSourceFile) {
        if (this.#compilerFactory.hasCompilerNode(currentNode))
            handler.handleNode(this.#compilerFactory.getExistingNodeFromCompilerNode(currentNode), newNode, newSourceFile);
        else if (currentNode.kind === common.SyntaxKind.SyntaxList) {
            const sourceFile = this.#compilerFactory.getExistingNodeFromCompilerNode(currentNode.getSourceFile());
            handler.handleNode(this.#compilerFactory.getNodeFromCompilerNode(currentNode, sourceFile), newNode, newSourceFile);
        }
    }
    forgetNodeIfNecessary(currentNode) {
        if (this.#compilerFactory.hasCompilerNode(currentNode))
            this.#compilerFactory.getExistingNodeFromCompilerNode(currentNode).forget();
    }
    getCompilerChildrenAsIterators(currentNode, newNode, newSourceFile) {
        const children = this.getCompilerChildren(currentNode, newNode, newSourceFile);
        return [
            new AdvancedIterator(common.ArrayUtils.toIterator(children[0])),
            new AdvancedIterator(common.ArrayUtils.toIterator(children[1])),
        ];
    }
    getCompilerChildren(currentNode, newNode, newSourceFile) {
        const currentCompilerNode = currentNode.compilerNode;
        const currentSourceFile = currentNode._sourceFile.compilerNode;
        return [
            ExtendedParser.getCompilerChildren(currentCompilerNode, currentSourceFile),
            ExtendedParser.getCompilerChildren(newNode, newSourceFile),
        ];
    }
    getChildrenFast(currentNode, newNode, newSourceFile) {
        const currentCompilerNode = currentNode.compilerNode;
        const currentSourceFile = currentNode._sourceFile.compilerNode;
        if (ExtendedParser.hasParsedTokens(currentCompilerNode)) {
            return [
                ExtendedParser.getCompilerChildren(currentCompilerNode, currentSourceFile),
                ExtendedParser.getCompilerChildren(newNode, newSourceFile),
            ];
        }
        return [
            ExtendedParser.getCompilerForEachChildren(currentCompilerNode, currentSourceFile),
            ExtendedParser.getCompilerForEachChildren(newNode, newSourceFile),
        ];
    }
}

class StraightReplacementNodeHandler {
    compilerFactory;
    helper;
    constructor(compilerFactory) {
        this.compilerFactory = compilerFactory;
        this.helper = new NodeHandlerHelper(compilerFactory);
    }
    handleNode(currentNode, newNode, newSourceFile) {
        if (currentNode.getKind() !== newNode.kind) {
            const kinds = [currentNode.getKind(), newNode.kind];
            if (kinds.includes(common.ts.SyntaxKind.Identifier) && kinds.includes(common.ts.SyntaxKind.PrivateIdentifier)) {
                currentNode.forget();
                return;
            }
            throw new common.errors.InvalidOperationError(`Error replacing tree! Perhaps a syntax error was inserted `
                + `(Current: ${currentNode.getKindName()} -- New: ${common.getSyntaxKindName(newNode.kind)}).`);
        }
        if (currentNode._hasWrappedChildren())
            this.#handleChildren(currentNode, newNode, newSourceFile);
        this.compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
    #handleChildren(currentNode, newNode, newSourceFile) {
        const [currentChildren, newChildren] = this.helper.getChildrenFast(currentNode, newNode, newSourceFile);
        if (currentChildren.length !== newChildren.length) {
            throw new Error(`Error replacing tree: The children of the old and new trees were expected to have the `
                + `same count (${currentChildren.length}:${newChildren.length}).`);
        }
        for (let i = 0; i < currentChildren.length; i++)
            this.helper.handleForValues(this, currentChildren[i], newChildren[i], newSourceFile);
    }
}

class ChangeChildOrderParentHandler {
    #compilerFactory;
    #straightReplacementNodeHandler;
    #helper;
    #oldIndex;
    #newIndex;
    constructor(compilerFactory, opts) {
        this.#straightReplacementNodeHandler = new StraightReplacementNodeHandler(compilerFactory);
        this.#helper = new NodeHandlerHelper(compilerFactory);
        this.#oldIndex = opts.oldIndex;
        this.#newIndex = opts.newIndex;
        this.#compilerFactory = compilerFactory;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        const [currentChildren, newChildren] = this.#helper.getCompilerChildren(currentNode, newNode, newSourceFile);
        const currentChildrenInNewOrder = this.#getChildrenInNewOrder(currentChildren);
        common.errors.throwIfNotEqual(newChildren.length, currentChildrenInNewOrder.length, "New children length should match the old children length.");
        for (let i = 0; i < newChildren.length; i++)
            this.#helper.handleForValues(this.#straightReplacementNodeHandler, currentChildrenInNewOrder[i], newChildren[i], newSourceFile);
        this.#compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
    #getChildrenInNewOrder(children) {
        const result = [...children];
        const movingNode = result.splice(this.#oldIndex, 1)[0];
        result.splice(this.#newIndex, 0, movingNode);
        return result;
    }
}

class DefaultParentHandler {
    #compilerFactory;
    #straightReplacementNodeHandler;
    #helper;
    #childCount;
    #isFirstChild;
    #replacingNodes;
    #customMappings;
    constructor(compilerFactory, opts) {
        this.#straightReplacementNodeHandler = new StraightReplacementNodeHandler(compilerFactory);
        this.#helper = new NodeHandlerHelper(compilerFactory);
        this.#childCount = opts.childCount;
        this.#isFirstChild = opts.isFirstChild;
        this.#replacingNodes = opts.replacingNodes?.map(n => n.compilerNode);
        this.#customMappings = opts.customMappings;
        this.#compilerFactory = compilerFactory;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        const [currentChildren, newChildren] = this.#helper.getCompilerChildrenAsIterators(currentNode, newNode, newSourceFile);
        let count = this.#childCount;
        this.#handleCustomMappings(newNode);
        while (!currentChildren.done && !newChildren.done && !this.#isFirstChild(currentChildren.peek, newChildren.peek))
            this.#helper.handleForValues(this.#straightReplacementNodeHandler, currentChildren.next(), newChildren.next(), newSourceFile);
        while (!currentChildren.done && this.#tryReplaceNode(currentChildren.peek))
            currentChildren.next();
        if (count > 0) {
            while (count > 0) {
                newChildren.next();
                count--;
            }
        }
        else if (count < 0) {
            while (count < 0) {
                this.#helper.forgetNodeIfNecessary(currentChildren.next());
                count++;
            }
        }
        while (!currentChildren.done)
            this.#helper.handleForValues(this.#straightReplacementNodeHandler, currentChildren.next(), newChildren.next(), newSourceFile);
        if (!newChildren.done)
            throw new Error("Error replacing tree: Should not have children left over.");
        this.#compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
    #handleCustomMappings(newParentNode) {
        if (this.#customMappings == null)
            return;
        const customMappings = this.#customMappings(newParentNode);
        for (const mapping of customMappings)
            this.#compilerFactory.replaceCompilerNode(mapping.currentNode, mapping.newNode);
    }
    #tryReplaceNode(currentCompilerNode) {
        if (this.#replacingNodes == null || this.#replacingNodes.length === 0)
            return false;
        const index = this.#replacingNodes.indexOf(currentCompilerNode);
        if (index === -1)
            return false;
        this.#replacingNodes.splice(index, 1);
        this.#helper.forgetNodeIfNecessary(currentCompilerNode);
        return true;
    }
}

class ForgetChangedNodeHandler {
    #compilerFactory;
    #helper;
    constructor(compilerFactory) {
        this.#helper = new NodeHandlerHelper(compilerFactory);
        this.#compilerFactory = compilerFactory;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        if (currentNode.getKind() !== newNode.kind) {
            currentNode.forget();
            return;
        }
        if (currentNode._hasWrappedChildren())
            this.#handleChildren(currentNode, newNode, newSourceFile);
        this.#compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
    #handleChildren(currentNode, newNode, newSourceFile) {
        const [currentNodeChildren, newNodeChildrenArray] = this.#helper.getChildrenFast(currentNode, newNode, newSourceFile);
        const newNodeChildren = common.ArrayUtils.toIterator(newNodeChildrenArray);
        for (const currentNodeChild of currentNodeChildren) {
            const nextNodeChildResult = newNodeChildren.next();
            if (nextNodeChildResult.done) {
                const existingNode = this.#compilerFactory.getExistingNodeFromCompilerNode(currentNodeChild);
                if (existingNode != null)
                    existingNode.forget();
            }
            else {
                this.#helper.handleForValues(this, currentNodeChild, nextNodeChildResult.value, newSourceFile);
            }
        }
    }
}

class ParentFinderReplacementNodeHandler extends StraightReplacementNodeHandler {
    #changingParent;
    #parentNodeHandler;
    #changingParentParent;
    #foundParent = false;
    #parentsAtSamePos;
    constructor(compilerFactory, parentNodeHandler, changingParent) {
        super(compilerFactory);
        this.#changingParentParent = changingParent.getParentSyntaxList() ?? changingParent.getParent();
        this.#parentsAtSamePos = this.#changingParentParent != null && this.#changingParentParent.getPos() === changingParent.getPos();
        this.#parentNodeHandler = parentNodeHandler;
        this.#changingParent = changingParent;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        if (!this.#foundParent && this.#isParentNode(newNode, newSourceFile)) {
            this.#foundParent = true;
            this.#parentNodeHandler.handleNode(currentNode, newNode, newSourceFile);
        }
        else {
            super.handleNode(currentNode, newNode, newSourceFile);
        }
    }
    #isParentNode(newNode, newSourceFile) {
        const positionsAndKindsEqual = areNodesEqual(newNode, this.#changingParent)
            && areNodesEqual(getParentSyntaxList(newNode, newSourceFile) || newNode.parent, this.#changingParentParent);
        if (!positionsAndKindsEqual)
            return false;
        if (!this.#parentsAtSamePos)
            return true;
        return getAncestorLength(this.#changingParent.compilerNode) === getAncestorLength(newNode);
        function getAncestorLength(nodeToCheck) {
            let node = nodeToCheck;
            let count = 0;
            while (node.parent != null) {
                count++;
                node = node.parent;
            }
            return count;
        }
    }
}
function areNodesEqual(a, b) {
    if (a == null && b == null)
        return true;
    if (a == null || b == null)
        return false;
    if (a.pos === b.getPos() && a.kind === b.getKind())
        return true;
    return false;
}

class RangeHandler {
    #compilerFactory;
    #straightReplacementNodeHandler;
    #helper;
    #start;
    #end;
    constructor(compilerFactory, opts) {
        this.#straightReplacementNodeHandler = new StraightReplacementNodeHandler(compilerFactory);
        this.#helper = new NodeHandlerHelper(compilerFactory);
        this.#start = opts.start;
        this.#end = opts.end;
        this.#compilerFactory = compilerFactory;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        const currentSourceFile = currentNode._sourceFile.compilerNode;
        const children = this.#helper.getChildrenFast(currentNode, newNode, newSourceFile);
        const currentNodeChildren = new AdvancedIterator(common.ArrayUtils.toIterator(children[0]));
        const newNodeChildren = new AdvancedIterator(common.ArrayUtils.toIterator(children[1]));
        while (!currentNodeChildren.done && !newNodeChildren.done && newNodeChildren.peek.getEnd() <= this.#start)
            this.#straightReplace(currentNodeChildren.next(), newNodeChildren.next(), newSourceFile);
        while (!currentNodeChildren.done && !newNodeChildren.done
            && (currentNodeChildren.peek.getStart(currentSourceFile) < this.#start
                || currentNodeChildren.peek.getStart(currentSourceFile) === this.#start && newNodeChildren.peek.end > this.#end)) {
            this.#rangeHandlerReplace(currentNodeChildren.next(), newNodeChildren.next(), newSourceFile);
        }
        while (!newNodeChildren.done && newNodeChildren.peek.getEnd() <= this.#end)
            newNodeChildren.next();
        while (!currentNodeChildren.done)
            this.#straightReplace(currentNodeChildren.next(), newNodeChildren.next(), newSourceFile);
        if (!newNodeChildren.done)
            throw new Error("Error replacing tree: Should not have children left over.");
        this.#compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
    #straightReplace(currentNode, nextNode, newSourceFile) {
        this.#helper.handleForValues(this.#straightReplacementNodeHandler, currentNode, nextNode, newSourceFile);
    }
    #rangeHandlerReplace(currentNode, nextNode, newSourceFile) {
        this.#helper.handleForValues(this, currentNode, nextNode, newSourceFile);
    }
}

class RangeParentHandler {
    #compilerFactory;
    #straightReplacementNodeHandler;
    #helper;
    #start;
    #end;
    #replacingLength;
    #replacingNodes;
    #customMappings;
    constructor(compilerFactory, opts) {
        this.#straightReplacementNodeHandler = new StraightReplacementNodeHandler(compilerFactory);
        this.#helper = new NodeHandlerHelper(compilerFactory);
        this.#start = opts.start;
        this.#end = opts.end;
        this.#replacingLength = opts.replacingLength;
        this.#replacingNodes = opts.replacingNodes?.map(n => n.compilerNode);
        this.#customMappings = opts.customMappings;
        this.#compilerFactory = compilerFactory;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        const currentSourceFile = currentNode._sourceFile.compilerNode;
        const [currentNodeChildren, newNodeChildren] = this.#helper.getCompilerChildrenAsIterators(currentNode, newNode, newSourceFile);
        this.#handleCustomMappings(newNode, newSourceFile);
        while (!currentNodeChildren.done && !newNodeChildren.done && newNodeChildren.peek.getStart(newSourceFile) < this.#start)
            this.#straightReplace(currentNodeChildren.next(), newNodeChildren.next(), newSourceFile);
        const newNodes = [];
        while (!newNodeChildren.done && newNodeChildren.peek.getStart(newSourceFile) >= this.#start
            && getRealEnd(newNodeChildren.peek, newSourceFile) <= this.#end) {
            newNodes.push(newNodeChildren.next());
        }
        if (this.#replacingLength != null) {
            const replacingEnd = this.#start + this.#replacingLength;
            const oldNodes = [];
            while (!currentNodeChildren.done
                && (getRealEnd(currentNodeChildren.peek, currentSourceFile) <= replacingEnd
                    || currentNodeChildren.peek.getStart(currentSourceFile) < replacingEnd)) {
                oldNodes.push(currentNodeChildren.next());
            }
            if (oldNodes.length === newNodes.length && oldNodes.every((node, i) => node.kind === newNodes[i].kind)) {
                for (let i = 0; i < oldNodes.length; i++) {
                    const node = this.#compilerFactory.getExistingNodeFromCompilerNode(oldNodes[i]);
                    if (node != null) {
                        node.forgetDescendants();
                        this.#compilerFactory.replaceCompilerNode(oldNodes[i], newNodes[i]);
                    }
                }
            }
            else {
                oldNodes.forEach(node => this.#helper.forgetNodeIfNecessary(node));
            }
        }
        while (!currentNodeChildren.done)
            this.#straightReplace(currentNodeChildren.next(), newNodeChildren.next(), newSourceFile);
        if (!newNodeChildren.done)
            throw new Error("Error replacing tree: Should not have children left over.");
        this.#compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
    #handleCustomMappings(newParentNode, newSourceFile) {
        if (this.#customMappings == null)
            return;
        const customMappings = this.#customMappings(newParentNode, newSourceFile);
        for (const mapping of customMappings)
            mapping.currentNode._context.compilerFactory.replaceCompilerNode(mapping.currentNode, mapping.newNode);
    }
    #straightReplace(currentNode, nextNode, newSourceFile) {
        if (!this.#tryReplaceNode(currentNode))
            this.#helper.handleForValues(this.#straightReplacementNodeHandler, currentNode, nextNode, newSourceFile);
    }
    #tryReplaceNode(currentCompilerNode) {
        if (this.#replacingNodes == null || this.#replacingNodes.length === 0)
            return false;
        const index = this.#replacingNodes.indexOf(currentCompilerNode);
        if (index === -1)
            return false;
        this.#replacingNodes.splice(index, 1);
        this.#helper.forgetNodeIfNecessary(currentCompilerNode);
        return true;
    }
}
function getRealEnd(node, sourceFile) {
    if (node.kind >= common.ts.SyntaxKind.FirstJSDocNode && node.kind <= common.ts.SyntaxKind.LastJSDocNode) {
        return getPreviousMatchingPos(sourceFile.text, node.end, charCode => charCode !== CharCodes.ASTERISK && !common.StringUtils.isWhitespaceCharCode(charCode));
    }
    return node.end;
}

class RenameNodeHandler extends StraightReplacementNodeHandler {
    handleNode(currentNode, newNode, newSourceFile) {
        const currentNodeKind = currentNode.getKind();
        const newNodeKind = newNode.kind;
        if (currentNodeKind === common.SyntaxKind.ShorthandPropertyAssignment && newNodeKind === common.SyntaxKind.PropertyAssignment) {
            const currentSourceFile = currentNode.getSourceFile();
            const currentIdentifier = currentNode.getNameNode();
            const newIdentifier = newNode.initializer;
            this.compilerFactory.replaceCompilerNode(currentIdentifier, newIdentifier);
            currentNode.forget();
            this.compilerFactory.getNodeFromCompilerNode(newNode, currentSourceFile);
            return;
        }
        else if (currentNodeKind === common.SyntaxKind.ExportSpecifier && newNodeKind === common.SyntaxKind.ExportSpecifier
            && currentNode.compilerNode.propertyName == null && newNode.propertyName != null) {
            handleImportOrExportSpecifier(this.compilerFactory);
            return;
        }
        else if (currentNodeKind === common.SyntaxKind.ImportSpecifier && newNodeKind === common.SyntaxKind.ImportSpecifier
            && currentNode.compilerNode.propertyName == null && newNode.propertyName != null) {
            handleImportOrExportSpecifier(this.compilerFactory);
            return;
        }
        super.handleNode(currentNode, newNode, newSourceFile);
        return;
        function handleImportOrExportSpecifier(compilerFactory) {
            function getNameText(node) {
                return node.kind === common.SyntaxKind.Identifier ? node.escapedText : node.text;
            }
            const currentName = currentNode.getNameNode();
            const newSpecifier = newNode;
            const newPropertyName = newSpecifier.propertyName;
            const newName = newSpecifier.name;
            const newIdentifier = getNameText(newPropertyName) === getNameText(currentName.compilerNode) ? newName : newPropertyName;
            compilerFactory.replaceCompilerNode(currentName, newIdentifier);
            compilerFactory.replaceCompilerNode(currentNode, newNode);
        }
    }
}

class TryOrForgetNodeHandler {
    #handler;
    constructor(handler) {
        this.#handler = handler;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        if (!Node.isSourceFile(currentNode))
            throw new common.errors.InvalidOperationError(`Can only use a TryOrForgetNodeHandler with a source file.`);
        try {
            this.#handler.handleNode(currentNode, newNode, newSourceFile);
        }
        catch (ex) {
            currentNode._context.logger.warn("Could not replace tree, so forgetting all nodes instead. Message: " + ex);
            currentNode.getChildSyntaxListOrThrow().forget();
            currentNode._context.compilerFactory.replaceCompilerNode(currentNode, newNode);
        }
    }
}

class UnwrapParentHandler {
    #childIndex;
    #compilerFactory;
    #straightReplacementNodeHandler;
    #helper;
    constructor(compilerFactory, childIndex) {
        this.#straightReplacementNodeHandler = new StraightReplacementNodeHandler(compilerFactory);
        this.#helper = new NodeHandlerHelper(compilerFactory);
        this.#compilerFactory = compilerFactory;
        this.#childIndex = childIndex;
    }
    handleNode(currentNode, newNode, newSourceFile) {
        const [currentChildren, newChildren] = this.#helper.getCompilerChildrenAsIterators(currentNode, newNode, newSourceFile);
        let index = 0;
        while (!currentChildren.done && !newChildren.done && index++ < this.#childIndex)
            this.#helper.handleForValues(this.#straightReplacementNodeHandler, currentChildren.next(), newChildren.next(), newSourceFile);
        const currentChild = this.#compilerFactory.getExistingNodeFromCompilerNode(currentChildren.next());
        const childSyntaxList = currentChild.getChildSyntaxListOrThrow();
        for (const child of ExtendedParser.getCompilerChildren(childSyntaxList.compilerNode, childSyntaxList._sourceFile.compilerNode))
            this.#helper.handleForValues(this.#straightReplacementNodeHandler, child, newChildren.next(), newSourceFile);
        forgetNodes(currentChild);
        function forgetNodes(node) {
            if (node === childSyntaxList) {
                node._forgetOnlyThis();
                return;
            }
            for (const child of node._getChildrenInCacheIterator())
                forgetNodes(child);
            node._forgetOnlyThis();
        }
        while (!currentChildren.done)
            this.#helper.handleForValues(this.#straightReplacementNodeHandler, currentChildren.next(), newChildren.next(), newSourceFile);
        if (!newChildren.done)
            throw new Error("Error replacing tree: Should not have children left over.");
        this.#compilerFactory.replaceCompilerNode(currentNode, newNode);
    }
}

class NodeHandlerFactory {
    getDefault(opts) {
        const { parent: changingParent, isFirstChild, childCount, customMappings } = opts;
        const sourceFile = changingParent.getSourceFile();
        const compilerFactory = sourceFile._context.compilerFactory;
        const replacingNodes = opts.replacingNodes == null ? undefined : [...opts.replacingNodes];
        const parentHandler = new DefaultParentHandler(compilerFactory, { childCount, isFirstChild, replacingNodes, customMappings });
        if (changingParent === sourceFile)
            return parentHandler;
        else
            return new ParentFinderReplacementNodeHandler(compilerFactory, parentHandler, changingParent);
    }
    getForParentRange(opts) {
        const { parent: changingParent, start, end, replacingLength, replacingNodes, customMappings } = opts;
        const sourceFile = changingParent.getSourceFile();
        const compilerFactory = sourceFile._context.compilerFactory;
        const parentHandler = new RangeParentHandler(compilerFactory, { start, end, replacingLength, replacingNodes, customMappings });
        if (changingParent === sourceFile)
            return parentHandler;
        else
            return new ParentFinderReplacementNodeHandler(compilerFactory, parentHandler, changingParent);
    }
    getForRange(opts) {
        const { sourceFile, start, end } = opts;
        const compilerFactory = sourceFile._context.compilerFactory;
        return new RangeHandler(compilerFactory, { start, end });
    }
    getForChildIndex(opts) {
        const { parent, childIndex, childCount, replacingNodes, customMappings } = opts;
        const parentChildren = parent.getChildren();
        common.errors.throwIfOutOfRange(childIndex, [0, parentChildren.length], "opts.childIndex");
        if (childCount < 0)
            common.errors.throwIfOutOfRange(childCount, [childIndex - parentChildren.length, 0], "opts.childCount");
        let i = 0;
        const isFirstChild = () => i++ === childIndex;
        return this.getDefault({
            parent,
            isFirstChild,
            childCount,
            replacingNodes,
            customMappings,
        });
    }
    getForStraightReplacement(compilerFactory) {
        return new StraightReplacementNodeHandler(compilerFactory);
    }
    getForForgetChanged(compilerFactory) {
        return new ForgetChangedNodeHandler(compilerFactory);
    }
    getForRename(compilerFactory) {
        return new RenameNodeHandler(compilerFactory);
    }
    getForTryOrForget(handler) {
        return new TryOrForgetNodeHandler(handler);
    }
    getForChangingChildOrder(opts) {
        const { parent: changingParent, oldIndex, newIndex } = opts;
        const sourceFile = changingParent.getSourceFile();
        const compilerFactory = sourceFile._context.compilerFactory;
        const changeChildOrderParentHandler = new ChangeChildOrderParentHandler(compilerFactory, { oldIndex, newIndex });
        if (changingParent === sourceFile)
            return changeChildOrderParentHandler;
        else
            return new ParentFinderReplacementNodeHandler(compilerFactory, changeChildOrderParentHandler, changingParent);
    }
    getForUnwrappingNode(unwrappingNode) {
        const changingParent = unwrappingNode.getParentSyntaxList() || unwrappingNode.getParentOrThrow();
        const childIndex = unwrappingNode.getChildIndex();
        const sourceFile = changingParent.getSourceFile();
        const compilerFactory = sourceFile._context.compilerFactory;
        const unwrapParentHandler = new UnwrapParentHandler(compilerFactory, childIndex);
        if (changingParent === sourceFile)
            return unwrapParentHandler;
        else
            return new ParentFinderReplacementNodeHandler(compilerFactory, unwrapParentHandler, changingParent);
    }
}

function getSpacingBetweenNodes(opts) {
    const { parent, previousSibling, nextSibling, newLineKind, getSiblingFormatting } = opts;
    if (previousSibling == null || nextSibling == null)
        return "";
    const previousSiblingFormatting = getSiblingFormatting(parent, previousSibling);
    const nextSiblingFormatting = getSiblingFormatting(parent, nextSibling);
    if (previousSiblingFormatting === FormattingKind.Blankline || nextSiblingFormatting === FormattingKind.Blankline)
        return newLineKind + newLineKind;
    else if (previousSiblingFormatting === FormattingKind.Newline || nextSiblingFormatting === FormattingKind.Newline)
        return newLineKind;
    else if (previousSiblingFormatting === FormattingKind.Space || nextSiblingFormatting === FormattingKind.Space)
        return " ";
    else
        return "";
}

class ChangingChildOrderTextManipulator {
    #opts;
    constructor(opts) {
        this.#opts = opts;
    }
    getNewText(inputText) {
        const { parent, oldIndex, newIndex, getSiblingFormatting } = this.#opts;
        const children = parent.getChildren();
        const newLineKind = parent._context.manipulationSettings.getNewLineKindAsString();
        const movingNode = children[oldIndex];
        const fullText = parent._sourceFile.getFullText();
        const movingNodeStart = getPosAtNextNonBlankLine(fullText, movingNode.getPos());
        const movingNodeText = fullText.substring(movingNodeStart, movingNode.getEnd());
        const lowerIndex = Math.min(newIndex, oldIndex);
        const upperIndex = Math.max(newIndex, oldIndex);
        const childrenInNewOrder = getChildrenInNewOrder();
        const isParentSourceFile = Node.isSourceFile(parent.getParentOrThrow());
        let finalText = "";
        fillPrefixText();
        fillTextForIndex(lowerIndex);
        fillMiddleText();
        fillTextForIndex(upperIndex);
        fillSuffixText();
        return finalText;
        function getChildrenInNewOrder() {
            const result = [...children];
            result.splice(oldIndex, 1);
            result.splice(newIndex, 0, movingNode);
            return result;
        }
        function fillPrefixText() {
            finalText += fullText.substring(0, children[lowerIndex].getPos());
            if (lowerIndex === 0 && !isParentSourceFile)
                finalText += newLineKind;
        }
        function fillMiddleText() {
            let startPos;
            let endPos;
            if (lowerIndex === oldIndex) {
                startPos = getPosAtNextNonBlankLine(fullText, children[lowerIndex].getEnd());
                endPos = children[upperIndex].getEnd();
            }
            else {
                startPos = getPosAtNextNonBlankLine(fullText, children[lowerIndex].getPos());
                endPos = children[upperIndex].getPos();
            }
            finalText += fullText.substring(startPos, endPos);
        }
        function fillSuffixText() {
            if (children.length - 1 === upperIndex && !isParentSourceFile)
                finalText += newLineKind;
            finalText += fullText.substring(getPosAtNextNonBlankLine(fullText, children[upperIndex].getEnd()));
        }
        function fillTextForIndex(index) {
            if (index === oldIndex)
                fillSpacingForRemoval();
            else {
                fillSpacingBeforeInsertion();
                finalText += movingNodeText;
                fillSpacingAfterInsertion();
            }
        }
        function fillSpacingForRemoval() {
            if (oldIndex === 0 || oldIndex === children.length - 1)
                return;
            fillSpacingCommon({
                previousSibling: childrenInNewOrder[oldIndex - 1],
                nextSibling: childrenInNewOrder[oldIndex],
            });
        }
        function fillSpacingBeforeInsertion() {
            if (newIndex === 0)
                return;
            fillSpacingCommon({
                previousSibling: childrenInNewOrder[newIndex - 1],
                nextSibling: childrenInNewOrder[newIndex],
            });
        }
        function fillSpacingAfterInsertion() {
            fillSpacingCommon({
                previousSibling: childrenInNewOrder[newIndex],
                nextSibling: childrenInNewOrder[newIndex + 1],
            });
        }
        function fillSpacingCommon(spacingOpts) {
            const spacing = getSpacingBetweenNodes({
                parent,
                getSiblingFormatting,
                newLineKind,
                previousSibling: spacingOpts.previousSibling,
                nextSibling: spacingOpts.nextSibling,
            });
            const twoNewLines = newLineKind + newLineKind;
            if (spacing === twoNewLines) {
                if (finalText.endsWith(twoNewLines))
                    return;
                else if (finalText.endsWith(newLineKind))
                    finalText += newLineKind;
                else
                    finalText += twoNewLines;
            }
            else if (spacing === newLineKind) {
                if (finalText.endsWith(newLineKind))
                    return;
                else
                    finalText += newLineKind;
            }
            else if (spacing === " ") {
                if (finalText.endsWith(" "))
                    return;
                else
                    finalText += " ";
            }
            else {
                finalText += spacing;
            }
        }
    }
    getTextForError(newText) {
        return newText;
    }
}

class FullReplacementTextManipulator {
    #newText;
    constructor(newText) {
        this.#newText = newText;
    }
    getNewText(inputText) {
        return this.#newText;
    }
    getTextForError(newText) {
        return newText;
    }
}

function getTextForError(newText, pos, length = 0) {
    const startPos = Math.max(0, newText.lastIndexOf("\n", pos) - 100);
    let endPos = Math.min(newText.length, newText.indexOf("\n", pos + length));
    endPos = endPos === -1 ? newText.length : Math.min(newText.length, endPos + 100);
    let text = "";
    text += newText.substring(startPos, endPos);
    if (startPos !== 0)
        text = "..." + text;
    if (endPos !== newText.length)
        text += "...";
    return text;
}

class InsertionTextManipulator {
    #opts;
    constructor(opts) {
        this.#opts = opts;
    }
    getNewText(inputText) {
        const { insertPos, newText, replacingLength = 0 } = this.#opts;
        return inputText.substring(0, insertPos) + newText + inputText.substring(insertPos + replacingLength);
    }
    getTextForError(newText) {
        return getTextForError(newText, this.#opts.insertPos, this.#opts.newText.length);
    }
}

class RemoveChildrenTextManipulator {
    #opts;
    #removalPos;
    constructor(opts) {
        this.#opts = opts;
    }
    getNewText(inputText) {
        const opts = this.#opts;
        const { children, removePrecedingSpaces = false, removeFollowingSpaces = false, removePrecedingNewLines = false, removeFollowingNewLines = false, replaceTrivia = "", } = opts;
        const sourceFile = children[0].getSourceFile();
        const fullText = sourceFile.getFullText();
        const removalPos = getRemovalPos();
        this.#removalPos = removalPos;
        return getPrefix() + replaceTrivia + getSuffix();
        function getPrefix() {
            return fullText.substring(0, removalPos);
        }
        function getSuffix() {
            return fullText.substring(getRemovalEnd());
        }
        function getRemovalPos() {
            if (opts.customRemovalPos != null)
                return opts.customRemovalPos;
            const pos = children[0].getNonWhitespaceStart();
            if (removePrecedingSpaces || removePrecedingNewLines)
                return getPreviousMatchingPos(fullText, pos, getCharRemovalFunction(removePrecedingSpaces, removePrecedingNewLines));
            return pos;
        }
        function getRemovalEnd() {
            if (opts.customRemovalEnd != null)
                return opts.customRemovalEnd;
            const end = children[children.length - 1].getEnd();
            if (removeFollowingSpaces || removeFollowingNewLines)
                return getNextMatchingPos(fullText, end, getCharRemovalFunction(removeFollowingSpaces, removeFollowingNewLines));
            return end;
        }
        function getCharRemovalFunction(removeSpaces, removeNewLines) {
            return (char) => {
                if (removeNewLines && (char === CharCodes.CARRIAGE_RETURN || char === CharCodes.NEWLINE))
                    return false;
                if (removeSpaces && !charNotSpaceOrTab(char))
                    return false;
                return true;
            };
        }
        function charNotSpaceOrTab(charCode) {
            return charCode !== CharCodes.SPACE && charCode !== CharCodes.TAB;
        }
    }
    getTextForError(newText) {
        return getTextForError(newText, this.#removalPos);
    }
}

function isNewLineAtPos(fullText, pos) {
    return fullText[pos] === "\n" || (fullText[pos] === "\r" && fullText[pos + 1] === "\n");
}
function hasNewLineInRange(fullText, range) {
    for (let i = range[0]; i < range[1]; i++) {
        if (fullText[i] === "\n")
            return true;
    }
    return false;
}

class RemoveChildrenWithFormattingTextManipulator {
    #opts;
    #removalPos;
    constructor(opts) {
        this.#opts = opts;
    }
    getNewText(inputText) {
        const { children, getSiblingFormatting } = this.#opts;
        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        const parent = firstChild.getParentOrThrow();
        const sourceFile = parent.getSourceFile();
        const fullText = sourceFile.getFullText();
        const newLineKind = sourceFile._context.manipulationSettings.getNewLineKindAsString();
        const previousSibling = firstChild.getPreviousSibling();
        const nextSibling = lastChild.getNextSibling();
        const removalPos = getRemovalPos();
        this.#removalPos = removalPos;
        return getPrefix() + getSpacing() + getSuffix();
        function getPrefix() {
            return fullText.substring(0, removalPos);
        }
        function getSpacing() {
            return getSpacingBetweenNodes({
                parent,
                previousSibling,
                nextSibling,
                newLineKind,
                getSiblingFormatting,
            });
        }
        function getSuffix() {
            return fullText.substring(getRemovalEnd());
        }
        function getRemovalPos() {
            if (previousSibling != null) {
                const trailingEnd = previousSibling.getTrailingTriviaEnd();
                return isNewLineAtPos(fullText, trailingEnd) ? trailingEnd : previousSibling.getEnd();
            }
            const firstPos = getPreviousNonWhitespacePos(fullText, firstChild.getPos());
            if (parent.getPos() === firstPos)
                return firstChild.getNonWhitespaceStart();
            return firstChild.isFirstNodeOnLine() ? firstPos : firstChild.getNonWhitespaceStart();
        }
        function getRemovalEnd() {
            const triviaEnd = lastChild.getTrailingTriviaEnd();
            if (previousSibling != null && nextSibling != null) {
                const nextSiblingFormatting = getSiblingFormatting(parent, nextSibling);
                if (nextSiblingFormatting === FormattingKind.Blankline || nextSiblingFormatting === FormattingKind.Newline)
                    return getPosAtStartOfLineOrNonWhitespace(fullText, nextSibling.getNonWhitespaceStart());
                return nextSibling.getNonWhitespaceStart();
            }
            if (parent.getEnd() === lastChild.getEnd())
                return lastChild.getEnd();
            if (isNewLineAtPos(fullText, triviaEnd)) {
                if (previousSibling == null && firstChild.getPos() === 0)
                    return getPosAtNextNonBlankLine(fullText, triviaEnd);
                return getPosAtEndOfPreviousLine(fullText, getPosAtNextNonBlankLine(fullText, triviaEnd));
            }
            if (previousSibling == null)
                return triviaEnd;
            else
                return lastChild.getEnd();
        }
    }
    getTextForError(newText) {
        return getTextForError(newText, this.#removalPos);
    }
}

class RenameLocationTextManipulator {
    #newName;
    #renameLocations;
    constructor(renameLocations, newName) {
        this.#renameLocations = renameLocations;
        this.#newName = newName;
    }
    getNewText(inputText) {
        const renameLocations = [...this.#renameLocations].sort((a, b) => b.getTextSpan().getStart() - a.getTextSpan().getStart());
        let currentPos = inputText.length;
        let result = "";
        for (let i = 0; i < renameLocations.length; i++) {
            const renameLocation = renameLocations[i];
            const textSpan = renameLocation.getTextSpan();
            result = (renameLocation.getPrefixText() || "")
                + this.#newName
                + (renameLocation.getSuffixText() || "")
                + inputText.substring(textSpan.getEnd(), currentPos)
                + result;
            currentPos = textSpan.getStart();
        }
        return inputText.substring(0, currentPos) + result;
    }
    getTextForError(newText) {
        if (this.#renameLocations.length === 0)
            return newText;
        return "..." + newText.substring(this.#renameLocations[0].getTextSpan().getStart());
    }
}

class UnchangedTextManipulator {
    getNewText(inputText) {
        return inputText;
    }
    getTextForError(newText) {
        return newText;
    }
}

class UnwrapTextManipulator extends InsertionTextManipulator {
    constructor(node) {
        super({
            insertPos: node.getStart(true),
            newText: getReplacementText(node),
            replacingLength: node.getWidth(true),
        });
    }
}
function getReplacementText(node) {
    const sourceFile = node._sourceFile;
    const range = getInnerBraceRange();
    const startPos = range[0];
    const text = sourceFile.getFullText().substring(range[0], range[1]);
    return common.StringUtils.indent(text, -1, {
        indentText: sourceFile._context.manipulationSettings.getIndentationText(),
        indentSizeInSpaces: sourceFile._context.manipulationSettings._getIndentSizeInSpaces(),
        isInStringAtPos: pos => sourceFile.isInStringAtPos(startPos + pos),
    }).trim();
    function getInnerBraceRange() {
        const bodyNode = getBodyNodeOrThrow();
        return [bodyNode.getStart() + 1, bodyNode.getEnd() - 1];
        function getBodyNodeOrThrow() {
            if (Node.isModuleDeclaration(node)) {
                const bodyNode = node._getInnerBody();
                if (bodyNode == null)
                    throw new common.errors.InvalidOperationError("This operation requires the module to have a body.");
                return bodyNode;
            }
            else if (Node.isBodied(node))
                return node.getBody();
            else if (Node.isBodyable(node))
                return node.getBodyOrThrow();
            else
                common.errors.throwNotImplementedForSyntaxKindError(node.getKind(), node);
        }
    }
}

class ManipulationError extends common.errors.InvalidOperationError {
    filePath;
    oldText;
    newText;
    constructor(filePath, oldText, newText, errorMessage) {
        super(errorMessage);
        this.filePath = filePath;
        this.oldText = oldText;
        this.newText = newText;
    }
}

function doManipulation(sourceFile, textManipulator, nodeHandler, newFilePath) {
    sourceFile._firePreModified();
    const oldFileText = sourceFile.getFullText();
    const newFileText = textManipulator.getNewText(oldFileText);
    try {
        const replacementSourceFile = sourceFile._context.compilerFactory.createCompilerSourceFileFromText(newFilePath || sourceFile.getFilePath(), newFileText, sourceFile.getScriptKind());
        nodeHandler.handleNode(sourceFile, replacementSourceFile, replacementSourceFile);
    }
    catch (err) {
        const diagnostics = getSyntacticDiagnostics(sourceFile, newFileText);
        const errorDetails = err.message + "\n\n"
            + `-- Details --\n`
            + "Path: " + sourceFile.getFilePath() + "\n"
            + "Text: " + JSON.stringify(textManipulator.getTextForError(newFileText)) + "\n"
            + "Stack: " + err.stack;
        if (diagnostics.length > 0) {
            throwError("Manipulation error: " + "A syntax error was inserted." + "\n\n"
                + sourceFile._context.project.formatDiagnosticsWithColorAndContext(diagnostics, { newLineChar: "\n" })
                + "\n" + errorDetails);
        }
        throwError("Manipulation error: " + errorDetails);
        function throwError(message) {
            throw new ManipulationError(sourceFile.getFilePath(), oldFileText, newFileText, message);
        }
    }
}
function getSyntacticDiagnostics(sourceFile, newText) {
    try {
        const projectOptions = { useInMemoryFileSystem: true };
        const project = new sourceFile._context.project.constructor(projectOptions);
        const newFile = project.createSourceFile(sourceFile.getFilePath(), newText);
        return project.getProgram().getSyntacticDiagnostics(newFile);
    }
    catch (err) {
        return [];
    }
}

function insertIntoParentTextRange(opts) {
    const { insertPos, newText, parent } = opts;
    doManipulation(parent._sourceFile, new InsertionTextManipulator({
        insertPos,
        newText,
        replacingLength: opts.replacing?.textLength,
    }), new NodeHandlerFactory().getForParentRange({
        parent,
        start: insertPos,
        end: insertPos + newText.length,
        replacingLength: opts.replacing?.textLength,
        replacingNodes: opts.replacing?.nodes,
        customMappings: opts.customMappings,
    }));
}
function insertIntoTextRange(opts) {
    const { insertPos, newText, sourceFile } = opts;
    doManipulation(sourceFile, new InsertionTextManipulator({
        insertPos,
        newText,
    }), new NodeHandlerFactory().getForRange({
        sourceFile,
        start: insertPos,
        end: insertPos + newText.length,
    }));
}
function insertIntoCommaSeparatedNodes(opts) {
    const { currentNodes, insertIndex, parent } = opts;
    const previousNode = currentNodes[insertIndex - 1];
    const previousNonCommentNode = getPreviousNonCommentNode();
    const nextNode = currentNodes[insertIndex];
    const nextNonCommentNode = getNextNonCommentNode();
    const separator = opts.useNewLines ? parent._context.manipulationSettings.getNewLineKindAsString() : " ";
    const parentNextSibling = parent.getNextSibling();
    const isContained = parentNextSibling != null && (parentNextSibling.getKind() === common.SyntaxKind.CloseBraceToken || parentNextSibling.getKind() === common.SyntaxKind.CloseBracketToken);
    let { newText } = opts;
    if (previousNode != null) {
        prependCommaAndSeparator();
        if (nextNonCommentNode != null || opts.useTrailingCommas)
            appendCommaAndSeparator();
        else if (opts.useNewLines || opts.surroundWithSpaces)
            appendSeparator();
        else
            appendIndentation();
        const nextEndStart = nextNode == null ? (isContained ? parentNextSibling.getStart(true) : parent.getEnd()) : nextNode.getStart(true);
        const insertPos = (previousNonCommentNode || previousNode).getEnd();
        insertIntoParentTextRange({
            insertPos,
            newText,
            parent,
            replacing: { textLength: nextEndStart - insertPos },
        });
    }
    else if (nextNode != null) {
        if (opts.useNewLines || opts.surroundWithSpaces)
            prependSeparator();
        if (nextNonCommentNode != null || opts.useTrailingCommas)
            appendCommaAndSeparator();
        else
            appendSeparator();
        const insertPos = isContained ? parent.getPos() : parent.getStart(true);
        insertIntoParentTextRange({
            insertPos,
            newText,
            parent,
            replacing: { textLength: nextNode.getStart(true) - insertPos },
        });
    }
    else {
        if (opts.useNewLines || opts.surroundWithSpaces) {
            prependSeparator();
            if (opts.useTrailingCommas)
                appendCommaAndSeparator();
            else
                appendSeparator();
        }
        else {
            appendIndentation();
        }
        insertIntoParentTextRange({
            insertPos: parent.getPos(),
            newText,
            parent,
            replacing: { textLength: parent.getNextSiblingOrThrow().getStart() - parent.getPos() },
        });
    }
    function prependCommaAndSeparator() {
        if (previousNonCommentNode == null) {
            prependSeparator();
            return;
        }
        const originalSourceFileText = parent.getSourceFile().getFullText();
        const previousNodeNextSibling = previousNonCommentNode.getNextSibling();
        let text = "";
        if (previousNodeNextSibling != null && previousNodeNextSibling.getKind() === common.SyntaxKind.CommaToken) {
            appendNodeTrailingCommentRanges(previousNonCommentNode);
            text += ",";
            if (previousNonCommentNode === previousNode)
                appendNodeTrailingCommentRanges(previousNodeNextSibling);
            else
                appendCommentNodeTexts();
        }
        else {
            text += ",";
            if (previousNonCommentNode === previousNode)
                appendNodeTrailingCommentRanges(previousNonCommentNode);
            else
                appendCommentNodeTexts();
        }
        prependSeparator();
        newText = text + newText;
        function appendCommentNodeTexts() {
            const lastCommentRangeEnd = getLastCommentRangeEnd(previousNode) || previousNode.getEnd();
            text += originalSourceFileText.substring(previousNonCommentNode.getEnd(), lastCommentRangeEnd);
        }
        function appendNodeTrailingCommentRanges(node) {
            const lastCommentRangeEnd = getLastCommentRangeEnd(node);
            if (lastCommentRangeEnd == null)
                return;
            text += originalSourceFileText.substring(node.getEnd(), lastCommentRangeEnd);
        }
        function getLastCommentRangeEnd(node) {
            const commentRanges = node.getTrailingCommentRanges();
            const lastCommentRange = commentRanges[commentRanges.length - 1];
            return lastCommentRange?.getEnd();
        }
    }
    function getPreviousNonCommentNode() {
        for (let i = insertIndex - 1; i >= 0; i--) {
            if (!Node.isCommentNode(currentNodes[i]))
                return currentNodes[i];
        }
        return undefined;
    }
    function getNextNonCommentNode() {
        for (let i = insertIndex; i < currentNodes.length; i++) {
            if (!Node.isCommentNode(currentNodes[i]))
                return currentNodes[i];
        }
        return undefined;
    }
    function prependSeparator() {
        if (!common.StringUtils.startsWithNewLine(newText))
            newText = separator + newText;
    }
    function appendCommaAndSeparator() {
        newText = appendCommaToText(newText);
        appendSeparator();
    }
    function appendSeparator() {
        if (!common.StringUtils.endsWithNewLine(newText))
            newText += separator;
        appendIndentation();
    }
    function appendIndentation() {
        if (opts.useNewLines || common.StringUtils.endsWithNewLine(newText)) {
            if (nextNode != null)
                newText += parent.getParentOrThrow().getChildIndentationText();
            else
                newText += parent.getParentOrThrow().getIndentationText();
        }
    }
}
function insertIntoBracesOrSourceFile(opts) {
    const { parent, index, children } = opts;
    const fullText = parent._sourceFile.getFullText();
    const childSyntaxList = parent.getChildSyntaxListOrThrow();
    const insertPos = getInsertPosFromIndex(index, childSyntaxList, children);
    const endPos = getEndPosFromIndex(index, parent, children, fullText);
    const replacingLength = endPos - insertPos;
    const newText = getNewText();
    doManipulation(parent._sourceFile, new InsertionTextManipulator({ insertPos, replacingLength, newText }), new NodeHandlerFactory().getForParentRange({
        parent: childSyntaxList,
        start: insertPos,
        end: insertPos + newText.length,
        replacingLength,
    }));
    function getNewText() {
        const writer = parent._getWriterWithChildIndentation();
        opts.write(writer, {
            previousMember: getChild(children[index - 1]),
            nextMember: getChild(children[index]),
            isStartOfFile: insertPos === 0,
        });
        return writer.toString();
        function getChild(child) {
            if (child == null)
                return child;
            else if (Node.isOverloadable(child))
                return child.getImplementation() || child;
            else
                return child;
        }
    }
}
function insertIntoBracesOrSourceFileWithGetChildren(opts) {
    if (opts.structures.length === 0)
        return [];
    const startChildren = opts.getIndexedChildren();
    const parentSyntaxList = opts.parent.getChildSyntaxListOrThrow();
    const index = verifyAndGetIndex(opts.index, startChildren.length);
    const previousJsDocCount = getPreviousJsDocCount();
    insertIntoBracesOrSourceFile({
        parent: opts.parent,
        index: getChildIndex(),
        children: parentSyntaxList.getChildren(),
        write: opts.write,
    });
    return getRangeWithoutCommentsFromArray(opts.getIndexedChildren(), opts.index - previousJsDocCount, opts.structures.length, opts.expectedKind);
    function getChildIndex() {
        if (index === 0)
            return 0;
        return startChildren[index - 1].getChildIndex() + 1;
    }
    function getPreviousJsDocCount() {
        let commentCount = 0;
        let count = 0;
        for (let i = index - 1; i >= 0; i--) {
            const node = startChildren[i];
            if (Node.isCommentNode(node)) {
                commentCount++;
                if (node.getText().startsWith("/**"))
                    count = commentCount;
            }
            else {
                break;
            }
        }
        return count;
    }
}
function insertIntoBracesOrSourceFileWithGetChildrenWithComments(opts) {
    const startChildren = opts.getIndexedChildren();
    const parentSyntaxList = opts.parent.getChildSyntaxListOrThrow();
    const index = verifyAndGetIndex(opts.index, startChildren.length);
    insertIntoBracesOrSourceFile({
        parent: opts.parent,
        index: getChildIndex(),
        children: parentSyntaxList.getChildren(),
        write: opts.write,
    });
    return getNodesToReturn(startChildren, opts.getIndexedChildren(), index, true);
    function getChildIndex() {
        if (index === 0)
            return 0;
        return startChildren[index - 1].getChildIndex() + 1;
    }
}

function changeChildOrder(opts) {
    const { parent } = opts;
    doManipulation(parent._sourceFile, new ChangingChildOrderTextManipulator(opts), new NodeHandlerFactory().getForChangingChildOrder(opts));
}

function removeChildren(opts) {
    const { children } = opts;
    if (children.length === 0)
        return;
    doManipulation(children[0].getSourceFile(), new RemoveChildrenTextManipulator(opts), new NodeHandlerFactory().getForChildIndex({
        parent: children[0].getParentSyntaxList() || children[0].getParentOrThrow(),
        childIndex: children[0].getChildIndex(),
        childCount: -1 * children.length,
    }));
}
function removeChildrenWithFormattingFromCollapsibleSyntaxList(opts) {
    const { children } = opts;
    if (children.length === 0)
        return;
    const syntaxList = children[0].getParentSyntaxListOrThrow();
    if (syntaxList.getChildCount() === children.length) {
        removeChildrenWithFormatting({
            children: [syntaxList],
            getSiblingFormatting: () => FormattingKind.None,
        });
    }
    else {
        removeChildrenWithFormatting(opts);
    }
}
function removeChildrenWithFormatting(opts) {
    const { children, getSiblingFormatting } = opts;
    if (children.length === 0)
        return;
    doManipulation(children[0]._sourceFile, new RemoveChildrenWithFormattingTextManipulator({
        children,
        getSiblingFormatting,
    }), new NodeHandlerFactory().getForChildIndex({
        parent: children[0].getParentSyntaxList() || children[0].getParentOrThrow(),
        childIndex: children[0].getChildIndex(),
        childCount: -1 * children.length,
    }));
}
function removeClassMember(classMember) {
    if (Node.isOverloadable(classMember)) {
        if (classMember.isImplementation())
            removeClassMembers([...classMember.getOverloads(), classMember]);
        else {
            const parent = classMember.getParentOrThrow();
            if (Node.isAmbientable(parent) && parent.isAmbient())
                removeClassMembers([classMember]);
            else
                removeChildren({ children: [classMember], removeFollowingSpaces: true, removeFollowingNewLines: true });
        }
    }
    else {
        removeClassMembers([classMember]);
    }
}
function removeClassMembers(classMembers) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getClassMemberFormatting,
        children: classMembers,
    });
}
function removeInterfaceMember(interfaceMember) {
    removeInterfaceMembers([interfaceMember]);
}
function removeInterfaceMembers(interfaceMembers) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getInterfaceMemberFormatting,
        children: interfaceMembers,
    });
}
function removeCommaSeparatedChild(child) {
    const childrenToRemove = [child];
    const syntaxList = child.getParentSyntaxListOrThrow();
    const isRemovingFirstChild = childrenToRemove[0] === syntaxList.getFirstChild();
    addNextCommaIfAble();
    addPreviousCommaIfAble();
    removeChildren({
        children: childrenToRemove,
        removePrecedingSpaces: !isRemovingFirstChild || syntaxList.getChildren().length === childrenToRemove.length && childrenToRemove[0].isFirstNodeOnLine(),
        removeFollowingSpaces: isRemovingFirstChild,
        removePrecedingNewLines: !isRemovingFirstChild,
        removeFollowingNewLines: isRemovingFirstChild,
    });
    function addNextCommaIfAble() {
        const commaToken = child.getNextSiblingIfKind(common.SyntaxKind.CommaToken);
        if (commaToken != null)
            childrenToRemove.push(commaToken);
    }
    function addPreviousCommaIfAble() {
        if (syntaxList.getLastChild() !== childrenToRemove[childrenToRemove.length - 1])
            return;
        const precedingComma = child.getPreviousSiblingIfKind(common.SyntaxKind.CommaToken);
        if (precedingComma != null)
            childrenToRemove.unshift(precedingComma);
    }
}
function removeOverloadableStatementedNodeChild(node) {
    if (node.isOverload())
        removeChildren({ children: [node], removeFollowingSpaces: true, removeFollowingNewLines: true });
    else
        removeStatementedNodeChildren([...node.getOverloads(), node]);
}
function removeStatementedNodeChild(node) {
    removeStatementedNodeChildren([node]);
}
function removeStatementedNodeChildren(nodes) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getStatementedNodeChildFormatting,
        children: nodes,
    });
}
function removeClausedNodeChild(node) {
    removeClausedNodeChildren([node]);
}
function removeClausedNodeChildren(nodes) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getClausedNodeChildFormatting,
        children: nodes,
    });
}
function unwrapNode(node) {
    doManipulation(node._sourceFile, new UnwrapTextManipulator(node), new NodeHandlerFactory().getForUnwrappingNode(node));
}

function replaceNodeText(opts) {
    doManipulation(opts.sourceFile, new InsertionTextManipulator({
        insertPos: opts.start,
        newText: opts.newText,
        replacingLength: opts.replacingLength,
    }), new NodeHandlerFactory().getForForgetChanged(opts.sourceFile._context.compilerFactory));
}
function replaceSourceFileTextForFormatting(opts) {
    replaceSourceFileTextStraight(opts);
}
function replaceSourceFileTextStraight(opts) {
    const { sourceFile, newText } = opts;
    doManipulation(sourceFile, new FullReplacementTextManipulator(newText), new NodeHandlerFactory().getForStraightReplacement(sourceFile._context.compilerFactory));
}
function replaceSourceFileTextForRename(opts) {
    const { sourceFile, renameLocations, newName } = opts;
    const nodeHandlerFactory = new NodeHandlerFactory();
    doManipulation(sourceFile, new RenameLocationTextManipulator(renameLocations, newName), nodeHandlerFactory.getForTryOrForget(nodeHandlerFactory.getForRename(sourceFile._context.compilerFactory)));
}
function replaceTextPossiblyCreatingChildNodes(opts) {
    const { replacePos, replacingLength, newText, parent } = opts;
    doManipulation(parent._sourceFile, new InsertionTextManipulator({
        insertPos: replacePos,
        replacingLength,
        newText,
    }), new NodeHandlerFactory().getForParentRange({
        parent,
        start: replacePos,
        end: replacePos + newText.length,
    }));
}
function replaceSourceFileForFilePathMove(opts) {
    const { sourceFile, newFilePath } = opts;
    doManipulation(sourceFile, new UnchangedTextManipulator(), new NodeHandlerFactory().getForStraightReplacement(sourceFile._context.compilerFactory), newFilePath);
}
function replaceSourceFileForCacheUpdate(sourceFile) {
    replaceSourceFileForFilePathMove({ sourceFile, newFilePath: sourceFile.getFilePath() });
}

function ArgumentedNode(Base) {
    return class extends Base {
        getArguments() {
            return this.compilerNode.arguments?.map(a => this._getNodeFromCompilerNode(a)) ?? [];
        }
        addArgument(argumentText) {
            return this.addArguments([argumentText])[0];
        }
        addArguments(argumentTexts) {
            return this.insertArguments(this.getArguments().length, argumentTexts);
        }
        insertArgument(index, argumentText) {
            return this.insertArguments(index, [argumentText])[0];
        }
        insertArguments(index, argumentTexts) {
            if (argumentTexts instanceof Function)
                argumentTexts = [argumentTexts];
            if (common.ArrayUtils.isNullOrEmpty(argumentTexts))
                return [];
            this._addParensIfNecessary();
            const originalArgs = this.getArguments();
            index = verifyAndGetIndex(index, originalArgs.length);
            const writer = this._getWriterWithQueuedChildIndentation();
            for (let i = 0; i < argumentTexts.length; i++) {
                writer.conditionalWrite(i > 0, ", ");
                printTextFromStringOrWriter(writer, argumentTexts[i]);
            }
            insertIntoCommaSeparatedNodes({
                parent: this.getFirstChildByKindOrThrow(common.SyntaxKind.OpenParenToken).getNextSiblingIfKindOrThrow(common.SyntaxKind.SyntaxList),
                currentNodes: originalArgs,
                insertIndex: index,
                newText: writer.toString(),
                useTrailingCommas: false,
            });
            return getNodesToReturn(originalArgs, this.getArguments(), index, false);
        }
        removeArgument(argOrIndex) {
            const args = this.getArguments();
            if (args.length === 0)
                throw new common.errors.InvalidOperationError("Cannot remove an argument when none exist.");
            const argToRemove = typeof argOrIndex === "number" ? getArgFromIndex(argOrIndex) : argOrIndex;
            removeCommaSeparatedChild(argToRemove);
            return this;
            function getArgFromIndex(index) {
                return args[verifyAndGetIndex(index, args.length - 1)];
            }
        }
        _addParensIfNecessary() {
            const fullText = this.getFullText();
            if (fullText[fullText.length - 1] !== ")") {
                insertIntoParentTextRange({
                    insertPos: this.getEnd(),
                    newText: "()",
                    parent: this,
                });
            }
        }
    };
}

function AsyncableNode(Base) {
    return class extends Base {
        isAsync() {
            return this.hasModifier(common.SyntaxKind.AsyncKeyword);
        }
        getAsyncKeyword() {
            return this.getFirstModifierByKind(common.SyntaxKind.AsyncKeyword);
        }
        getAsyncKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getAsyncKeyword(), message ?? "Expected to find an async keyword.", this);
        }
        setIsAsync(value) {
            this.toggleModifier("async", value);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.isAsync != null)
                this.setIsAsync(structure.isAsync);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                isAsync: this.isAsync(),
            });
        }
    };
}

function AwaitableNode(Base) {
    return class extends Base {
        isAwaited() {
            return this.compilerNode.awaitModifier != null;
        }
        getAwaitKeyword() {
            const awaitModifier = this.compilerNode.awaitModifier;
            return this._getNodeFromCompilerNodeIfExists(awaitModifier);
        }
        getAwaitKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getAwaitKeyword(), message ?? "Expected to find an await token.");
        }
        setIsAwaited(value) {
            const awaitModifier = this.getAwaitKeyword();
            const isSet = awaitModifier != null;
            if (isSet === value)
                return this;
            if (awaitModifier == null) {
                insertIntoParentTextRange({
                    insertPos: getAwaitInsertPos(this),
                    parent: this,
                    newText: " await",
                });
            }
            else {
                removeChildren({
                    children: [awaitModifier],
                    removePrecedingSpaces: true,
                });
            }
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.isAwaited != null)
                this.setIsAwaited(structure.isAwaited);
            return this;
        }
    };
}
function getAwaitInsertPos(node) {
    if (node.getKind() === common.SyntaxKind.ForOfStatement)
        return node.getFirstChildByKindOrThrow(common.SyntaxKind.ForKeyword).getEnd();
    throw new common.errors.NotImplementedError("Expected a for of statement node.");
}

function getBodyText(writer, textOrWriterFunction) {
    writer.newLineIfLastNot();
    if (typeof textOrWriterFunction !== "string" || textOrWriterFunction.length > 0) {
        writer.indent(() => {
            printTextFromStringOrWriter(writer, textOrWriterFunction);
        });
    }
    writer.newLineIfLastNot();
    writer.write("");
    return writer.toString();
}

function getBodyTextWithoutLeadingIndentation(body) {
    const sourceFile = body._sourceFile;
    const textArea = body.getChildSyntaxList() || body;
    const startPos = textArea.getNonWhitespaceStart();
    const endPos = Math.max(startPos, textArea._getTrailingTriviaNonWhitespaceEnd());
    const width = endPos - startPos;
    if (width === 0)
        return "";
    const fullText = sourceFile.getFullText().substring(startPos, endPos);
    return common.StringUtils.removeIndentation(fullText, {
        indentSizeInSpaces: body._context.manipulationSettings._getIndentSizeInSpaces(),
        isInStringAtPos: pos => sourceFile.isInStringAtPos(pos + startPos),
    });
}

class TextRange {
    #compilerObject;
    #sourceFile;
    constructor(compilerObject, sourceFile) {
        this.#compilerObject = compilerObject;
        this.#sourceFile = sourceFile;
    }
    get compilerObject() {
        this.#throwIfForgotten();
        return this.#compilerObject;
    }
    getSourceFile() {
        this.#throwIfForgotten();
        return this.#sourceFile;
    }
    getPos() {
        return this.compilerObject.pos;
    }
    getEnd() {
        return this.compilerObject.end;
    }
    getWidth() {
        return this.getEnd() - this.getPos();
    }
    getText() {
        const fullText = this.getSourceFile().getFullText();
        return fullText.substring(this.compilerObject.pos, this.compilerObject.end);
    }
    _forget() {
        this.#compilerObject = undefined;
        this.#sourceFile = undefined;
    }
    wasForgotten() {
        return this.#compilerObject == null;
    }
    #throwIfForgotten() {
        if (this.#compilerObject != null)
            return;
        const message = "Attempted to get a text range that was forgotten. "
            + "Text ranges are forgotten after a manipulation has occurred. "
            + "Please re-request the text range after manipulations.";
        throw new common.errors.InvalidOperationError(message);
    }
}

class CommentRange extends TextRange {
    constructor(compilerObject, sourceFile) {
        super(compilerObject, sourceFile);
    }
    getKind() {
        return this.compilerObject.kind;
    }
}

class Node {
    #compilerNode;
    #forgottenText;
    #childStringRanges;
    #leadingCommentRanges;
    #trailingCommentRanges;
    _wrappedChildCount = 0;
    _context;
    __sourceFile;
    get _sourceFile() {
        if (this.__sourceFile == null)
            throw new common.errors.InvalidOperationError("Operation cannot be performed on a node that has no source file.");
        return this.__sourceFile;
    }
    get compilerNode() {
        if (this.#compilerNode == null) {
            let message = "Attempted to get information from a node that was removed or forgotten.";
            if (this.#forgottenText != null)
                message += `\n\nNode text: ${this.#forgottenText}`;
            throw new common.errors.InvalidOperationError(message);
        }
        return this.#compilerNode;
    }
    constructor(context, node, sourceFile) {
        if (context == null || context.compilerFactory == null) {
            throw new common.errors.InvalidOperationError("Constructing a node is not supported. Please create a source file from the default export "
                + "of the package and manipulate the source file from there.");
        }
        this._context = context;
        this.#compilerNode = node;
        this.__sourceFile = sourceFile;
    }
    forget() {
        if (this.wasForgotten())
            return;
        this.forgetDescendants();
        this._forgetOnlyThis();
    }
    forgetDescendants() {
        for (const child of this._getChildrenInCacheIterator())
            child.forget();
    }
    _forgetOnlyThis() {
        if (this.wasForgotten())
            return;
        const parent = this.getParent();
        if (parent != null)
            parent._wrappedChildCount--;
        this.#storeTextForForgetting();
        this._context.compilerFactory.removeNodeFromCache(this);
        this._clearInternals();
    }
    wasForgotten() {
        return this.#compilerNode == null;
    }
    _hasWrappedChildren() {
        return this._wrappedChildCount > 0 || this.#compilerNode?.kind === common.SyntaxKind.SyntaxList;
    }
    _replaceCompilerNodeFromFactory(compilerNode) {
        if (compilerNode == null)
            this.#storeTextForForgetting();
        this._clearInternals();
        this.#compilerNode = compilerNode;
    }
    #storeTextForForgetting() {
        const sourceFileCompilerNode = this._sourceFile && this._sourceFile.compilerNode;
        const compilerNode = this.#compilerNode;
        if (sourceFileCompilerNode == null || compilerNode == null)
            return;
        this.#forgottenText = getText();
        function getText() {
            const start = compilerNode.getStart(sourceFileCompilerNode);
            const length = compilerNode.end - start;
            const trimmedLength = Math.min(length, 100);
            const text = sourceFileCompilerNode.text.substr(start, trimmedLength);
            return trimmedLength !== length ? text + "..." : text;
        }
    }
    _clearInternals() {
        this.#compilerNode = undefined;
        this.#childStringRanges = undefined;
        clearTextRanges(this.#leadingCommentRanges);
        clearTextRanges(this.#trailingCommentRanges);
        this.#leadingCommentRanges = undefined;
        this.#trailingCommentRanges = undefined;
        function clearTextRanges(textRanges) {
            if (textRanges == null)
                return;
            textRanges.forEach(r => r._forget());
        }
    }
    getKind() {
        return this.compilerNode.kind;
    }
    getKindName() {
        return common.getSyntaxKindName(this.compilerNode.kind);
    }
    getFlags() {
        return this.compilerNode.flags;
    }
    print(options = {}) {
        if (options.newLineKind == null)
            options.newLineKind = this._context.manipulationSettings.getNewLineKind();
        if (this.getKind() === common.SyntaxKind.SourceFile)
            return printNode(this.compilerNode, options);
        else
            return printNode(this.compilerNode, this._sourceFile.compilerNode, options);
    }
    getSymbolOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getSymbol(), message ?? "Could not find the node's symbol.", this);
    }
    getSymbol() {
        const boundSymbol = this.compilerNode.symbol;
        if (boundSymbol != null)
            return this._context.compilerFactory.getSymbol(boundSymbol);
        const typeChecker = this._context.typeChecker;
        const typeCheckerSymbol = typeChecker.getSymbolAtLocation(this);
        if (typeCheckerSymbol != null)
            return typeCheckerSymbol;
        const nameNode = this.compilerNode.name;
        if (nameNode != null)
            return this._getNodeFromCompilerNode(nameNode).getSymbol();
        return undefined;
    }
    getSymbolsInScope(meaning) {
        return this._context.typeChecker.getSymbolsInScope(this, meaning);
    }
    getLocalOrThrow(name, message) {
        return common.errors.throwIfNullOrUndefined(this.getLocal(name), message ?? (() => `Expected to find local symbol with name: ${name}`), this);
    }
    getLocal(name) {
        const locals = this.#getCompilerLocals();
        if (locals == null)
            return undefined;
        const tsSymbol = locals.get(common.ts.escapeLeadingUnderscores(name));
        return tsSymbol == null ? undefined : this._context.compilerFactory.getSymbol(tsSymbol);
    }
    getLocals() {
        const locals = this.#getCompilerLocals();
        if (locals == null)
            return [];
        return Array.from(locals.values()).map(symbol => this._context.compilerFactory.getSymbol(symbol));
    }
    #getCompilerLocals() {
        this._ensureBound();
        return this.compilerNode.locals;
    }
    getType() {
        return this._context.typeChecker.getTypeAtLocation(this);
    }
    containsRange(pos, end) {
        return this.getPos() <= pos && end <= this.getEnd();
    }
    isInStringAtPos(pos) {
        common.errors.throwIfOutOfRange(pos, [this.getPos(), this.getEnd()], "pos");
        if (this.#childStringRanges == null) {
            this.#childStringRanges = [];
            for (const descendant of this._getCompilerDescendantsIterator()) {
                if (isStringKind(descendant.kind))
                    this.#childStringRanges.push([descendant.getStart(this._sourceFile.compilerNode), descendant.getEnd()]);
            }
        }
        class InStringRangeComparer {
            compareTo(value) {
                if (pos <= value[0])
                    return -1;
                if (pos >= value[1] - 1)
                    return 1;
                return 0;
            }
        }
        return common.ArrayUtils.binarySearch(this.#childStringRanges, new InStringRangeComparer()) !== -1;
    }
    asKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.asKind(kind), message ?? (() => `Expected the node to be of kind ${common.getSyntaxKindName(kind)}, but it was ${common.getSyntaxKindName(this.getKind())}.`), this);
    }
    isKind(kind) {
        return this.getKind() === kind;
    }
    asKind(kind) {
        if (this.isKind(kind))
            return this;
        else
            return undefined;
    }
    getFirstChildOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getFirstChild(condition), message ?? "Could not find a child that matched the specified condition.", this);
    }
    getFirstChild(condition) {
        const firstChild = this._getCompilerFirstChild(getWrappedCondition(this, condition));
        return this._getNodeFromCompilerNodeIfExists(firstChild);
    }
    getLastChildOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getLastChild(condition), message ?? "Could not find a child that matched the specified condition.", this);
    }
    getLastChild(condition) {
        const lastChild = this._getCompilerLastChild(getWrappedCondition(this, condition));
        return this._getNodeFromCompilerNodeIfExists(lastChild);
    }
    getFirstDescendantOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getFirstDescendant(condition), message ?? "Could not find a descendant that matched the specified condition.", this);
    }
    getFirstDescendant(condition) {
        for (const descendant of this._getDescendantsIterator()) {
            if (condition == null || condition(descendant))
                return descendant;
        }
        return undefined;
    }
    getPreviousSiblingOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getPreviousSibling(condition), message ?? "Could not find the previous sibling.", this);
    }
    getPreviousSibling(condition) {
        const previousSibling = this._getCompilerPreviousSibling(getWrappedCondition(this, condition));
        return this._getNodeFromCompilerNodeIfExists(previousSibling);
    }
    getNextSiblingOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getNextSibling(condition), message ?? "Could not find the next sibling.", this);
    }
    getNextSibling(condition) {
        const nextSibling = this._getCompilerNextSibling(getWrappedCondition(this, condition));
        return this._getNodeFromCompilerNodeIfExists(nextSibling);
    }
    getPreviousSiblings() {
        return this._getCompilerPreviousSiblings().map(n => this._getNodeFromCompilerNode(n));
    }
    getNextSiblings() {
        return this._getCompilerNextSiblings().map(n => this._getNodeFromCompilerNode(n));
    }
    getChildren() {
        return this._getCompilerChildren().map(n => this._getNodeFromCompilerNode(n));
    }
    getChildAtIndex(index) {
        return this._getNodeFromCompilerNode(this._getCompilerChildAtIndex(index));
    }
    *_getChildrenIterator() {
        for (const compilerChild of this._getCompilerChildren())
            yield this._getNodeFromCompilerNode(compilerChild);
    }
    *_getChildrenInCacheIterator() {
        const children = this._getCompilerChildrenFast();
        for (const child of children) {
            if (this._context.compilerFactory.hasCompilerNode(child))
                yield this._context.compilerFactory.getExistingNodeFromCompilerNode(child);
            else if (child.kind === common.SyntaxKind.SyntaxList) {
                yield this._getNodeFromCompilerNode(child);
            }
        }
    }
    getChildSyntaxListOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getChildSyntaxList(), message ?? "A child syntax list was expected.", this);
    }
    getChildSyntaxList() {
        let node = this;
        if (Node.isBodyable(node) || Node.isBodied(node)) {
            do {
                const bodyNode = Node.isBodyable(node) ? node.getBody() : node.getBody();
                if (bodyNode == null)
                    return undefined;
                node = bodyNode;
            } while ((Node.isBodyable(node) || Node.isBodied(node)) && node.compilerNode.statements == null);
        }
        if (Node.isSourceFile(node)
            || Node.isBodyable(this)
            || Node.isBodied(this)
            || Node.isCaseBlock(this)
            || Node.isCaseClause(this)
            || Node.isDefaultClause(this)
            || Node.isJsxElement(this)) {
            return node.getFirstChildByKind(common.SyntaxKind.SyntaxList);
        }
        let passedBrace = false;
        for (const child of node._getCompilerChildren()) {
            if (!passedBrace)
                passedBrace = child.kind === common.SyntaxKind.OpenBraceToken;
            else if (child.kind === common.SyntaxKind.SyntaxList)
                return this._getNodeFromCompilerNode(child);
        }
        return undefined;
    }
    forEachChild(cbNode, cbNodeArray) {
        const snapshots = [];
        this.compilerNode.forEachChild(node => {
            snapshots.push(this._getNodeFromCompilerNode(node));
        }, cbNodeArray == null ? undefined : nodes => {
            snapshots.push(nodes.map(n => this._getNodeFromCompilerNode(n)));
        });
        for (const snapshot of snapshots) {
            if (snapshot instanceof Array) {
                const filteredNodes = snapshot.filter(n => !n.wasForgotten());
                if (filteredNodes.length > 0) {
                    const returnValue = cbNodeArray(filteredNodes);
                    if (returnValue)
                        return returnValue;
                }
            }
            else if (!snapshot.wasForgotten()) {
                const returnValue = cbNode(snapshot);
                if (returnValue)
                    return returnValue;
            }
        }
        return undefined;
    }
    forEachDescendant(cbNode, cbNodeArray) {
        const stopReturnValue = {};
        const upReturnValue = {};
        let stop = false;
        let up = false;
        const traversal = {
            stop: () => stop = true,
            up: () => up = true,
        };
        const nodeCallback = (node) => {
            if (stop)
                return stopReturnValue;
            let skip = false;
            const returnValue = cbNode(node, {
                ...traversal,
                skip: () => skip = true,
            });
            if (returnValue)
                return returnValue;
            if (stop)
                return stopReturnValue;
            if (skip || up)
                return undefined;
            if (!node.wasForgotten())
                return forEachChildForNode(node);
            return undefined;
        };
        const arrayCallback = cbNodeArray == null ? undefined : (nodes) => {
            if (stop)
                return stopReturnValue;
            let skip = false;
            const returnValue = cbNodeArray(nodes, {
                ...traversal,
                skip: () => skip = true,
            });
            if (returnValue)
                return returnValue;
            if (skip)
                return undefined;
            for (const node of nodes) {
                if (stop)
                    return stopReturnValue;
                if (up)
                    return undefined;
                const innerReturnValue = forEachChildForNode(node);
                if (innerReturnValue)
                    return innerReturnValue;
            }
            return undefined;
        };
        const finalResult = forEachChildForNode(this);
        return finalResult === stopReturnValue ? undefined : finalResult;
        function forEachChildForNode(node) {
            const result = node.forEachChild(innerNode => {
                const returnValue = nodeCallback(innerNode);
                if (up) {
                    up = false;
                    return returnValue || upReturnValue;
                }
                return returnValue;
            }, arrayCallback == null ? undefined : nodes => {
                const returnValue = arrayCallback(nodes);
                if (up) {
                    up = false;
                    return returnValue || upReturnValue;
                }
                return returnValue;
            });
            return result === upReturnValue ? undefined : result;
        }
    }
    forEachChildAsArray() {
        const children = [];
        this.compilerNode.forEachChild(child => {
            children.push(this._getNodeFromCompilerNode(child));
        });
        return children;
    }
    forEachDescendantAsArray() {
        const descendants = [];
        this.forEachDescendant(descendant => {
            descendants.push(descendant);
        });
        return descendants;
    }
    getDescendants() {
        return Array.from(this._getDescendantsIterator());
    }
    *_getDescendantsIterator() {
        for (const descendant of this._getCompilerDescendantsIterator())
            yield this._getNodeFromCompilerNode(descendant);
    }
    getDescendantStatements() {
        const statements = [];
        handleNode(this, this.compilerNode);
        return statements;
        function handleNode(thisNode, node) {
            if (handleStatements(thisNode, node))
                return;
            else if (node.kind === common.SyntaxKind.ArrowFunction) {
                const arrowFunction = node;
                if (arrowFunction.body.kind !== common.SyntaxKind.Block)
                    statements.push(thisNode._getNodeFromCompilerNode(arrowFunction.body));
                else
                    handleNode(thisNode, arrowFunction.body);
            }
            else {
                handleChildren(thisNode, node);
            }
        }
        function handleStatements(thisNode, node) {
            if (node.statements == null)
                return false;
            const statementedNode = thisNode._getNodeFromCompilerNode(node);
            for (const statement of statementedNode.getStatements()) {
                statements.push(statement);
                handleChildren(thisNode, statement.compilerNode);
            }
            return true;
        }
        function handleChildren(thisNode, node) {
            common.ts.forEachChild(node, childNode => handleNode(thisNode, childNode));
        }
    }
    getChildCount() {
        return this._getCompilerChildren().length;
    }
    getChildAtPos(pos) {
        if (pos < this.getPos() || pos >= this.getEnd())
            return undefined;
        for (const child of this._getCompilerChildren()) {
            if (pos >= child.pos && pos < child.end)
                return this._getNodeFromCompilerNode(child);
        }
        return undefined;
    }
    getDescendantAtPos(pos) {
        let node;
        while (true) {
            const nextNode = (node || this).getChildAtPos(pos);
            if (nextNode == null)
                return node;
            else
                node = nextNode;
        }
    }
    getDescendantAtStartWithWidth(start, width) {
        let foundNode;
        this._context.compilerFactory.forgetNodesCreatedInBlock(remember => {
            let nextNode = this.getSourceFile();
            do {
                nextNode = nextNode.getChildAtPos(start);
                if (nextNode != null) {
                    if (nextNode.getStart() === start && nextNode.getWidth() === width)
                        foundNode = nextNode;
                    else if (foundNode != null)
                        break;
                }
            } while (nextNode != null);
            if (foundNode != null)
                remember(foundNode);
        });
        return foundNode;
    }
    getPos() {
        return this.compilerNode.pos;
    }
    getEnd() {
        return this.compilerNode.end;
    }
    getStart(includeJsDocComments) {
        return this.compilerNode.getStart(this._sourceFile.compilerNode, includeJsDocComments);
    }
    getFullStart() {
        return this.compilerNode.getFullStart();
    }
    getNonWhitespaceStart() {
        return this._context.compilerFactory.forgetNodesCreatedInBlock(() => {
            const parent = this.getParent();
            const pos = this.getPos();
            const parentTakesPrecedence = parent != null
                && !Node.isSourceFile(parent)
                && parent.getPos() === pos;
            if (parentTakesPrecedence)
                return this.getStart(true);
            let startSearchPos;
            const sourceFileFullText = this._sourceFile.getFullText();
            const previousSibling = this.getPreviousSibling();
            if (previousSibling != null && Node.isCommentNode(previousSibling))
                startSearchPos = previousSibling.getEnd();
            else if (previousSibling != null) {
                if (hasNewLineInRange(sourceFileFullText, [pos, this.getStart(true)]))
                    startSearchPos = previousSibling.getTrailingTriviaEnd();
                else
                    startSearchPos = pos;
            }
            else {
                startSearchPos = this.getPos();
            }
            return getNextNonWhitespacePos(sourceFileFullText, startSearchPos);
        });
    }
    _getTrailingTriviaNonWhitespaceEnd() {
        return getPreviousNonWhitespacePos(this._sourceFile.getFullText(), this.getTrailingTriviaEnd());
    }
    getWidth(includeJsDocComments) {
        return this.getEnd() - this.getStart(includeJsDocComments);
    }
    getFullWidth() {
        return this.compilerNode.getFullWidth();
    }
    getLeadingTriviaWidth() {
        return this.compilerNode.getLeadingTriviaWidth(this._sourceFile.compilerNode);
    }
    getTrailingTriviaWidth() {
        return this.getTrailingTriviaEnd() - this.getEnd();
    }
    getTrailingTriviaEnd() {
        const parent = this.getParent();
        const end = this.getEnd();
        if (parent == null)
            return end;
        const parentEnd = parent.getEnd();
        if (parentEnd === end)
            return end;
        const trailingComments = this.getTrailingCommentRanges();
        const searchStart = getSearchStart();
        return getNextMatchingPos(this._sourceFile.getFullText(), searchStart, char => char !== CharCodes.SPACE && char !== CharCodes.TAB);
        function getSearchStart() {
            return trailingComments.length > 0 ? trailingComments[trailingComments.length - 1].getEnd() : end;
        }
    }
    getText(includeJsDocCommentOrOptions) {
        const options = typeof includeJsDocCommentOrOptions === "object" ? includeJsDocCommentOrOptions : undefined;
        const includeJsDocComments = includeJsDocCommentOrOptions === true || (options != null && options.includeJsDocComments);
        const trimLeadingIndentation = options != null && options.trimLeadingIndentation;
        const startPos = this.getStart(includeJsDocComments);
        const text = this._sourceFile.getFullText().substring(startPos, this.getEnd());
        if (trimLeadingIndentation) {
            return common.StringUtils.removeIndentation(text, {
                isInStringAtPos: pos => this._sourceFile.isInStringAtPos(pos + startPos),
                indentSizeInSpaces: this._context.manipulationSettings._getIndentSizeInSpaces(),
            });
        }
        else {
            return text;
        }
    }
    getFullText() {
        return this.compilerNode.getFullText(this._sourceFile.compilerNode);
    }
    getCombinedModifierFlags() {
        return common.ts.getCombinedModifierFlags(this.compilerNode);
    }
    getSourceFile() {
        return this._sourceFile;
    }
    getProject() {
        return this._context.project;
    }
    getNodeProperty(propertyName) {
        const property = this.compilerNode[propertyName];
        if (property == null)
            return undefined;
        else if (property instanceof Array)
            return property.map(p => isNode(p) ? this._getNodeFromCompilerNode(p) : p);
        else if (isNode(property))
            return this._getNodeFromCompilerNode(property);
        else
            return property;
        function isNode(value) {
            return typeof value.kind === "number" && typeof value.pos === "number" && typeof value.end === "number";
        }
    }
    getAncestors(includeSyntaxLists = false) {
        return Array.from(this._getAncestorsIterator(includeSyntaxLists));
    }
    *_getAncestorsIterator(includeSyntaxLists) {
        let parent = getParent(this);
        while (parent != null) {
            yield parent;
            parent = getParent(parent);
        }
        function getParent(node) {
            return includeSyntaxLists ? node.getParentSyntaxList() || node.getParent() : node.getParent();
        }
    }
    getParent() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.parent);
    }
    getParentOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getParent(), message ?? "Expected to find a parent.", this);
    }
    getParentWhileOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getParentWhile(condition), message ?? "The initial parent did not match the provided condition.", this);
    }
    getParentWhile(condition) {
        let node = undefined;
        let parent = this.getParent();
        while (parent && condition(parent, node || this)) {
            node = parent;
            parent = node.getParent();
        }
        return node;
    }
    getParentWhileKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getParentWhileKind(kind), message ?? (() => `The initial parent was not a syntax kind of ${common.getSyntaxKindName(kind)}.`), this);
    }
    getParentWhileKind(kind) {
        return this.getParentWhile(n => n.getKind() === kind);
    }
    getLastToken() {
        const lastToken = this.compilerNode.getLastToken(this._sourceFile.compilerNode);
        if (lastToken == null)
            throw new common.errors.NotImplementedError("Not implemented scenario where the last token does not exist.");
        return this._getNodeFromCompilerNode(lastToken);
    }
    isInSyntaxList() {
        return this.getParentSyntaxList() != null;
    }
    getParentSyntaxListOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getParentSyntaxList(), message ?? "Expected the parent to be a syntax list.", this);
    }
    getParentSyntaxList() {
        const kind = this.getKind();
        if (kind === common.SyntaxKind.SingleLineCommentTrivia || kind === common.SyntaxKind.MultiLineCommentTrivia)
            return this.getParentOrThrow().getChildSyntaxList();
        const syntaxList = getParentSyntaxList(this.compilerNode, this._sourceFile.compilerNode);
        return this._getNodeFromCompilerNodeIfExists(syntaxList);
    }
    _getParentSyntaxListIfWrapped() {
        const parent = this.getParent();
        if (parent == null || !ExtendedParser.hasParsedTokens(parent.compilerNode))
            return undefined;
        return this.getParentSyntaxList();
    }
    getChildIndex() {
        const parent = this.getParentSyntaxList() || this.getParentOrThrow();
        const index = parent._getCompilerChildren().indexOf(this.compilerNode);
        if (index === -1)
            throw new common.errors.NotImplementedError("For some reason the child's parent did not contain the child.");
        return index;
    }
    getIndentationLevel() {
        const indentationText = this._context.manipulationSettings.getIndentationText();
        return this._context.languageService.getIdentationAtPosition(this._sourceFile, this.getStart()) / indentationText.length;
    }
    getChildIndentationLevel() {
        if (Node.isSourceFile(this))
            return 0;
        return this.getIndentationLevel() + 1;
    }
    getIndentationText(offset = 0) {
        return this.#getIndentationTextForLevel(this.getIndentationLevel() + offset);
    }
    getChildIndentationText(offset = 0) {
        return this.#getIndentationTextForLevel(this.getChildIndentationLevel() + offset);
    }
    #getIndentationTextForLevel(level) {
        return this._context.manipulationSettings.getIndentationText().repeat(level);
    }
    getStartLinePos(includeJsDocComments) {
        const sourceFileText = this._sourceFile.getFullText();
        return getPreviousMatchingPos(sourceFileText, this.getStart(includeJsDocComments), char => char === CharCodes.NEWLINE || char === CharCodes.CARRIAGE_RETURN);
    }
    getStartLineNumber(includeJsDocComments) {
        return common.StringUtils.getLineNumberAtPos(this._sourceFile.getFullText(), this.getStartLinePos(includeJsDocComments));
    }
    getEndLineNumber() {
        const sourceFileText = this._sourceFile.getFullText();
        const endLinePos = getPreviousMatchingPos(sourceFileText, this.getEnd(), char => char === CharCodes.NEWLINE || char === CharCodes.CARRIAGE_RETURN);
        return common.StringUtils.getLineNumberAtPos(this._sourceFile.getFullText(), endLinePos);
    }
    isFirstNodeOnLine() {
        const sourceFileText = this._sourceFile.getFullText();
        const startPos = this.getNonWhitespaceStart();
        for (let i = startPos - 1; i >= 0; i--) {
            const currentChar = sourceFileText[i];
            if (currentChar === " " || currentChar === "\t")
                continue;
            if (currentChar === "\n")
                return true;
            return false;
        }
        return true;
    }
    replaceWithText(textOrWriterFunction, writer) {
        const newText = getTextFromStringOrWriter(writer || this._getWriterWithQueuedIndentation(), textOrWriterFunction);
        if (Node.isSourceFile(this)) {
            this.replaceText([this.getPos(), this.getEnd()], newText);
            return this;
        }
        const parent = this.getParentSyntaxList() || this.getParentOrThrow();
        const childIndex = this.getChildIndex();
        const start = this.getStart(true);
        insertIntoParentTextRange({
            parent,
            insertPos: start,
            newText,
            replacing: {
                textLength: this.getEnd() - start,
            },
        });
        return parent.getChildren()[childIndex];
    }
    prependWhitespace(textOrWriterFunction) {
        insertWhiteSpaceTextAtPos(this, this.getStart(true), textOrWriterFunction, common.nameof(this, "prependWhitespace"));
    }
    appendWhitespace(textOrWriterFunction) {
        insertWhiteSpaceTextAtPos(this, this.getEnd(), textOrWriterFunction, common.nameof(this, "appendWhitespace"));
    }
    formatText(settings = {}) {
        const formattingEdits = this._context.languageService.getFormattingEditsForRange(this._sourceFile.getFilePath(), [this.getStart(true), this.getEnd()], settings);
        replaceSourceFileTextForFormatting({
            sourceFile: this._sourceFile,
            newText: getTextFromTextChanges(this._sourceFile, formattingEdits),
        });
    }
    transform(visitNode) {
        const compilerFactory = this._context.compilerFactory;
        const printer = common.ts.createPrinter({
            newLine: this._context.manipulationSettings.getNewLineKind(),
            removeComments: false,
        });
        const transformations = [];
        const compilerSourceFile = this._sourceFile.compilerNode;
        const compilerNode = this.compilerNode;
        const transformerFactory = context => {
            return rootNode => innerVisit(rootNode, context);
        };
        if (this.getKind() === common.ts.SyntaxKind.SourceFile) {
            common.ts.transform(compilerNode, [transformerFactory], this._context.compilerOptions.get());
            replaceSourceFileTextStraight({
                sourceFile: this._sourceFile,
                newText: getTransformedText([0, this.getEnd()]),
            });
            return this;
        }
        else {
            const parent = this.getParentSyntaxList() || this.getParentOrThrow();
            const childIndex = this.getChildIndex();
            const start = this.getStart(true);
            const end = this.getEnd();
            common.ts.transform(compilerNode, [transformerFactory], this._context.compilerOptions.get());
            insertIntoParentTextRange({
                parent,
                insertPos: start,
                newText: getTransformedText([start, end]),
                replacing: {
                    textLength: end - start,
                },
            });
            return parent.getChildren()[childIndex];
        }
        function innerVisit(node, context) {
            const traversal = {
                factory: context.factory,
                visitChildren() {
                    node = common.ts.visitEachChild(node, child => innerVisit(child, context), context);
                    return node;
                },
                currentNode: node,
            };
            const resultNode = visitNode(traversal);
            handleTransformation(node, resultNode);
            return resultNode;
        }
        function handleTransformation(oldNode, newNode) {
            if (oldNode === newNode && newNode.emitNode == null)
                return;
            const start = oldNode.getStart(compilerSourceFile, true);
            const end = oldNode.end;
            let lastTransformation;
            while ((lastTransformation = transformations[transformations.length - 1]) && lastTransformation.start > start)
                transformations.pop();
            const wrappedNode = compilerFactory.getExistingNodeFromCompilerNode(oldNode);
            transformations.push({
                start,
                end,
                compilerNode: newNode,
            });
            if (wrappedNode != null) {
                if (oldNode.kind !== newNode.kind)
                    wrappedNode.forget();
                else
                    wrappedNode.forgetDescendants();
            }
        }
        function getTransformedText(replaceRange) {
            const fileText = compilerSourceFile.getFullText();
            let finalText = "";
            let lastPos = replaceRange[0];
            for (const transform of transformations) {
                finalText += fileText.substring(lastPos, transform.start);
                finalText += printer.printNode(common.ts.EmitHint.Unspecified, transform.compilerNode, transform.compilerNode.getSourceFile() ?? compilerSourceFile);
                lastPos = transform.end;
            }
            finalText += fileText.substring(lastPos, replaceRange[1]);
            return finalText;
        }
    }
    getLeadingCommentRanges() {
        return this.#leadingCommentRanges || (this.#leadingCommentRanges = this.#getCommentsAtPos(this.getFullStart(), (text, pos) => {
            const comments = common.ts.getLeadingCommentRanges(text, pos) || [];
            if (this.getKind() === common.SyntaxKind.SingleLineCommentTrivia || this.getKind() === common.SyntaxKind.MultiLineCommentTrivia) {
                const thisPos = this.getPos();
                return comments.filter(r => r.pos < thisPos);
            }
            else {
                return comments;
            }
        }));
    }
    getTrailingCommentRanges() {
        return this.#trailingCommentRanges ?? (this.#trailingCommentRanges = this.#getCommentsAtPos(this.getEnd(), common.ts.getTrailingCommentRanges));
    }
    #getCommentsAtPos(pos, getComments) {
        if (this.getKind() === common.SyntaxKind.SourceFile)
            return [];
        return (getComments(this._sourceFile.getFullText(), pos) ?? []).map(r => new CommentRange(r, this._sourceFile));
    }
    getChildrenOfKind(kind) {
        return this._getCompilerChildrenOfKind(kind).map(c => this._getNodeFromCompilerNode(c));
    }
    getFirstChildByKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getFirstChildByKind(kind), message ?? (() => `A child of the kind ${common.getSyntaxKindName(kind)} was expected.`), this);
    }
    getFirstChildByKind(kind) {
        const child = this._getCompilerChildrenOfKind(kind)[0];
        return child == null ? undefined : this._getNodeFromCompilerNode(child);
    }
    getFirstChildIfKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getFirstChildIfKind(kind), message ?? (() => `A first child of the kind ${common.getSyntaxKindName(kind)} was expected.`), this);
    }
    getFirstChildIfKind(kind) {
        const firstChild = this._getCompilerFirstChild();
        return firstChild != null && firstChild.kind === kind ? this._getNodeFromCompilerNode(firstChild) : undefined;
    }
    getLastChildByKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getLastChildByKind(kind), message ?? (() => `A child of the kind ${common.getSyntaxKindName(kind)} was expected.`), this);
    }
    getLastChildByKind(kind) {
        const children = this._getCompilerChildrenOfKind(kind);
        const lastChild = children[children.length - 1];
        return this._getNodeFromCompilerNodeIfExists(lastChild);
    }
    getLastChildIfKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getLastChildIfKind(kind), message ?? (() => `A last child of the kind ${common.getSyntaxKindName(kind)} was expected.`), this);
    }
    getLastChildIfKind(kind) {
        const lastChild = this._getCompilerLastChild();
        return lastChild != null && lastChild.kind === kind ? this._getNodeFromCompilerNode(lastChild) : undefined;
    }
    getChildAtIndexIfKindOrThrow(index, kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getChildAtIndexIfKind(index, kind), message ?? (() => `Child at index ${index} was expected to be ${common.getSyntaxKindName(kind)}`), this);
    }
    getChildAtIndexIfKind(index, kind) {
        const node = this._getCompilerChildAtIndex(index);
        return node.kind === kind ? this._getNodeFromCompilerNode(node) : undefined;
    }
    getPreviousSiblingIfKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getPreviousSiblingIfKind(kind), message ?? (() => `A previous sibling of kind ${common.getSyntaxKindName(kind)} was expected.`), this);
    }
    getNextSiblingIfKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getNextSiblingIfKind(kind), message ?? (() => `A next sibling of kind ${common.getSyntaxKindName(kind)} was expected.`), this);
    }
    getPreviousSiblingIfKind(kind) {
        const previousSibling = this._getCompilerPreviousSibling();
        return previousSibling != null && previousSibling.kind === kind
            ? this._getNodeFromCompilerNode(previousSibling)
            : undefined;
    }
    getNextSiblingIfKind(kind) {
        const nextSibling = this._getCompilerNextSibling();
        return nextSibling != null && nextSibling.kind === kind ? this._getNodeFromCompilerNode(nextSibling) : undefined;
    }
    getParentIfOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getParentIf(condition), message ?? "The parent did not match the provided condition.", this);
    }
    getParentIf(condition) {
        return condition(this.getParent(), this) ? this.getParent() : undefined;
    }
    getParentIfKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getParentIfKind(kind), message ?? (() => `The parent was not a syntax kind of ${common.getSyntaxKindName(kind)}.`), this);
    }
    getParentIfKind(kind) {
        return this.getParentIf(n => n !== undefined && n.getKind() === kind);
    }
    getFirstAncestorByKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getFirstAncestorByKind(kind), message ?? (() => `Expected an ancestor with a syntax kind of ${common.getSyntaxKindName(kind)}.`), this);
    }
    getFirstAncestorByKind(kind) {
        for (const parent of this._getAncestorsIterator(kind === common.SyntaxKind.SyntaxList)) {
            if (parent.getKind() === kind)
                return parent;
        }
        return undefined;
    }
    getFirstAncestorOrThrow(condition, message) {
        return common.errors.throwIfNullOrUndefined(this.getFirstAncestor(condition), message ?? `Expected to find an ancestor that matched the provided condition.`, this);
    }
    getFirstAncestor(condition) {
        for (const ancestor of this._getAncestorsIterator(false)) {
            if (condition == null || condition(ancestor))
                return ancestor;
        }
        return undefined;
    }
    getDescendantsOfKind(kind) {
        const descendants = [];
        for (const descendant of this._getCompilerDescendantsOfKindIterator(kind))
            descendants.push(this._getNodeFromCompilerNode(descendant));
        return descendants;
    }
    getFirstDescendantByKindOrThrow(kind, message) {
        return common.errors.throwIfNullOrUndefined(this.getFirstDescendantByKind(kind), message ?? (() => `A descendant of kind ${common.getSyntaxKindName(kind)} was expected to be found.`), this);
    }
    getFirstDescendantByKind(kind) {
        for (const descendant of this._getCompilerDescendantsOfKindIterator(kind))
            return this._getNodeFromCompilerNode(descendant);
        return undefined;
    }
    _getCompilerChildren() {
        return ExtendedParser.getCompilerChildren(this.compilerNode, this._sourceFile.compilerNode);
    }
    _getCompilerForEachChildren() {
        return ExtendedParser.getCompilerForEachChildren(this.compilerNode, this._sourceFile.compilerNode);
    }
    _getCompilerChildrenFast() {
        return ExtendedParser.hasParsedTokens(this.compilerNode) ? this._getCompilerChildren() : this._getCompilerForEachChildren();
    }
    _getCompilerChildrenOfKind(kind) {
        const children = useParseTreeSearchForKind(this, kind) ? this._getCompilerForEachChildren() : this._getCompilerChildren();
        return children.filter(c => c.kind === kind);
    }
    *_getCompilerDescendantsOfKindIterator(kind) {
        const children = useParseTreeSearchForKind(this, kind) ? this._getCompilerForEachChildren() : this._getCompilerChildren();
        for (const child of children) {
            if (child.kind === kind)
                yield child;
            const descendants = useParseTreeSearchForKind(child.kind, kind)
                ? getCompilerForEachDescendantsIterator(child)
                : getCompilerDescendantsIterator(child, this._sourceFile.compilerNode);
            for (const descendant of descendants) {
                if (descendant.kind === kind)
                    yield descendant;
            }
        }
    }
    _getCompilerDescendantsIterator() {
        return getCompilerDescendantsIterator(this.compilerNode, this._sourceFile.compilerNode);
    }
    _getCompilerForEachDescendantsIterator() {
        return getCompilerForEachDescendantsIterator(this.compilerNode);
    }
    _getCompilerFirstChild(condition) {
        for (const child of this._getCompilerChildren()) {
            if (condition == null || condition(child))
                return child;
        }
        return undefined;
    }
    _getCompilerLastChild(condition) {
        const children = this._getCompilerChildren();
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (condition == null || condition(child))
                return child;
        }
        return undefined;
    }
    _getCompilerPreviousSiblings() {
        const parent = this.getParentSyntaxList() || this.getParentOrThrow();
        const previousSiblings = [];
        for (const child of parent._getCompilerChildren()) {
            if (child === this.compilerNode)
                break;
            previousSiblings.unshift(child);
        }
        return previousSiblings;
    }
    _getCompilerNextSiblings() {
        let foundChild = false;
        const parent = this.getParentSyntaxList() || this.getParentOrThrow();
        const nextSiblings = [];
        for (const child of parent._getCompilerChildren()) {
            if (!foundChild) {
                foundChild = child === this.compilerNode;
                continue;
            }
            nextSiblings.push(child);
        }
        return nextSiblings;
    }
    _getCompilerPreviousSibling(condition) {
        for (const sibling of this._getCompilerPreviousSiblings()) {
            if (condition == null || condition(sibling))
                return sibling;
        }
        return undefined;
    }
    _getCompilerNextSibling(condition) {
        for (const sibling of this._getCompilerNextSiblings()) {
            if (condition == null || condition(sibling))
                return sibling;
        }
        return undefined;
    }
    _getCompilerChildAtIndex(index) {
        const children = this._getCompilerChildren();
        common.errors.throwIfOutOfRange(index, [0, children.length - 1], "index");
        return children[index];
    }
    _getWriterWithIndentation() {
        const writer = this._getWriter();
        writer.setIndentationLevel(this.getIndentationLevel());
        return writer;
    }
    _getWriterWithQueuedIndentation() {
        const writer = this._getWriter();
        writer.queueIndentationLevel(this.getIndentationLevel());
        return writer;
    }
    _getWriterWithChildIndentation() {
        const writer = this._getWriter();
        writer.setIndentationLevel(this.getChildIndentationLevel());
        return writer;
    }
    _getWriterWithQueuedChildIndentation() {
        const writer = this._getWriter();
        writer.queueIndentationLevel(this.getChildIndentationLevel());
        return writer;
    }
    _getTextWithQueuedChildIndentation(textOrWriterFunc) {
        const writer = this._getWriterWithQueuedChildIndentation();
        if (typeof textOrWriterFunc === "string")
            writer.write(textOrWriterFunc);
        else
            textOrWriterFunc(writer);
        return writer.toString();
    }
    _getWriter() {
        return this._context.createWriter();
    }
    _getNodeFromCompilerNode(compilerNode) {
        return this._context.compilerFactory.getNodeFromCompilerNode(compilerNode, this._sourceFile);
    }
    _getNodeFromCompilerNodeIfExists(compilerNode) {
        return compilerNode == null ? undefined : this._getNodeFromCompilerNode(compilerNode);
    }
    _ensureBound() {
        if (this.compilerNode.symbol != null)
            return;
        this.getSymbol();
    }
    static hasExpression(node) {
        return node.getExpression?.() != null;
    }
    static hasName(node) {
        return typeof node.getName?.() === "string";
    }
    static hasBody(node) {
        return node.getBody?.() != null;
    }
    static hasStructure(node) {
        return typeof node.getStructure === "function";
    }
    static is(kind) {
        return (node) => {
            return node?.getKind() == kind;
        };
    }
    static isNode(value) {
        return value != null && value.compilerNode != null;
    }
    static isCommentNode(node) {
        const kind = node?.getKind();
        return kind === common.SyntaxKind.SingleLineCommentTrivia || kind === common.SyntaxKind.MultiLineCommentTrivia;
    }
    static isCommentStatement(node) {
        return node?.compilerNode?._commentKind === exports.CommentNodeKind.Statement;
    }
    static isCommentClassElement(node) {
        return node?.compilerNode?._commentKind === exports.CommentNodeKind.ClassElement;
    }
    static isCommentTypeElement(node) {
        return node?.compilerNode?._commentKind === exports.CommentNodeKind.TypeElement;
    }
    static isCommentObjectLiteralElement(node) {
        return node?.compilerNode?._commentKind === exports.CommentNodeKind.ObjectLiteralElement;
    }
    static isCommentEnumMember(node) {
        return node?.compilerNode?._commentKind == exports.CommentNodeKind.EnumMember;
    }
    static isAbstractable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.ConstructorType:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isAmbientable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.VariableStatement:
                return true;
            default:
                return false;
        }
    }
    static isAnyKeyword = Node.is(common.SyntaxKind.AnyKeyword);
    static isArgumented(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.NewExpression:
                return true;
            default:
                return false;
        }
    }
    static isArrayBindingPattern = Node.is(common.SyntaxKind.ArrayBindingPattern);
    static isArrayLiteralExpression = Node.is(common.SyntaxKind.ArrayLiteralExpression);
    static isArrayTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.ArrayType;
    }
    static isArrowFunction = Node.is(common.SyntaxKind.ArrowFunction);
    static isAsExpression = Node.is(common.SyntaxKind.AsExpression);
    static isAsyncable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.MethodDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isAwaitable(node) {
        return node?.getKind() === common.SyntaxKind.ForOfStatement;
    }
    static isAwaitExpression = Node.is(common.SyntaxKind.AwaitExpression);
    static isBigIntLiteral = Node.is(common.SyntaxKind.BigIntLiteral);
    static isBinaryExpression = Node.is(common.SyntaxKind.BinaryExpression);
    static isBindingElement = Node.is(common.SyntaxKind.BindingElement);
    static isBindingNamed(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BindingElement:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isBlock = Node.is(common.SyntaxKind.Block);
    static isBodied(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.ClassStaticBlockDeclaration:
            case common.SyntaxKind.FunctionExpression:
                return true;
            default:
                return false;
        }
    }
    static isBodyable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isBooleanKeyword = Node.is(common.SyntaxKind.BooleanKeyword);
    static isBreakStatement = Node.is(common.SyntaxKind.BreakStatement);
    static isCallExpression = Node.is(common.SyntaxKind.CallExpression);
    static isCallSignatureDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.CallSignature;
    }
    static isCaseBlock = Node.is(common.SyntaxKind.CaseBlock);
    static isCaseClause = Node.is(common.SyntaxKind.CaseClause);
    static isCatchClause = Node.is(common.SyntaxKind.CatchClause);
    static isChildOrderable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.Block:
            case common.SyntaxKind.BreakStatement:
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassStaticBlockDeclaration:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.ContinueStatement:
            case common.SyntaxKind.DebuggerStatement:
            case common.SyntaxKind.DoStatement:
            case common.SyntaxKind.EmptyStatement:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.ExportAssignment:
            case common.SyntaxKind.ExportDeclaration:
            case common.SyntaxKind.ExpressionStatement:
            case common.SyntaxKind.ForInStatement:
            case common.SyntaxKind.ForOfStatement:
            case common.SyntaxKind.ForStatement:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.IfStatement:
            case common.SyntaxKind.ImportDeclaration:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.IndexSignature:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.LabeledStatement:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.ModuleBlock:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.NotEmittedStatement:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.ReturnStatement:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.SwitchStatement:
            case common.SyntaxKind.ThrowStatement:
            case common.SyntaxKind.TryStatement:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.VariableStatement:
            case common.SyntaxKind.WhileStatement:
            case common.SyntaxKind.WithStatement:
                return true;
            default:
                return false;
        }
    }
    static isClassDeclaration = Node.is(common.SyntaxKind.ClassDeclaration);
    static isClassExpression = Node.is(common.SyntaxKind.ClassExpression);
    static isClassLikeDeclarationBase(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
                return true;
            default:
                return false;
        }
    }
    static isClassStaticBlockDeclaration = Node.is(common.SyntaxKind.ClassStaticBlockDeclaration);
    static isCommaListExpression = Node.is(common.SyntaxKind.CommaListExpression);
    static isComputedPropertyName = Node.is(common.SyntaxKind.ComputedPropertyName);
    static isConditionalExpression = Node.is(common.SyntaxKind.ConditionalExpression);
    static isConditionalTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.ConditionalType;
    }
    static isConstructorDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.Constructor;
    }
    static isConstructorTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.ConstructorType;
    }
    static isConstructSignatureDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.ConstructSignature;
    }
    static isContinueStatement = Node.is(common.SyntaxKind.ContinueStatement);
    static isDebuggerStatement = Node.is(common.SyntaxKind.DebuggerStatement);
    static isDecoratable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isDecorator = Node.is(common.SyntaxKind.Decorator);
    static isDefaultClause = Node.is(common.SyntaxKind.DefaultClause);
    static isDeleteExpression = Node.is(common.SyntaxKind.DeleteExpression);
    static isDoStatement = Node.is(common.SyntaxKind.DoStatement);
    static isDotDotDotTokenable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BindingElement:
            case common.SyntaxKind.JsxExpression:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.Parameter:
                return true;
            default:
                return false;
        }
    }
    static isElementAccessExpression = Node.is(common.SyntaxKind.ElementAccessExpression);
    static isEmptyStatement = Node.is(common.SyntaxKind.EmptyStatement);
    static isEnumDeclaration = Node.is(common.SyntaxKind.EnumDeclaration);
    static isEnumMember = Node.is(common.SyntaxKind.EnumMember);
    static isExclamationTokenable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isExportable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.VariableStatement:
                return true;
            default:
                return false;
        }
    }
    static isExportAssignment = Node.is(common.SyntaxKind.ExportAssignment);
    static isExportDeclaration = Node.is(common.SyntaxKind.ExportDeclaration);
    static isExportGetable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.VariableDeclaration:
            case common.SyntaxKind.VariableStatement:
                return true;
            default:
                return false;
        }
    }
    static isExportSpecifier = Node.is(common.SyntaxKind.ExportSpecifier);
    static isExpression(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.AnyKeyword:
            case common.SyntaxKind.BooleanKeyword:
            case common.SyntaxKind.NumberKeyword:
            case common.SyntaxKind.ObjectKeyword:
            case common.SyntaxKind.StringKeyword:
            case common.SyntaxKind.SymbolKeyword:
            case common.SyntaxKind.UndefinedKeyword:
            case common.SyntaxKind.ArrayLiteralExpression:
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.AsExpression:
            case common.SyntaxKind.AwaitExpression:
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.BinaryExpression:
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.CommaListExpression:
            case common.SyntaxKind.ConditionalExpression:
            case common.SyntaxKind.DeleteExpression:
            case common.SyntaxKind.ElementAccessExpression:
            case common.SyntaxKind.FalseKeyword:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportKeyword:
            case common.SyntaxKind.JsxClosingFragment:
            case common.SyntaxKind.JsxElement:
            case common.SyntaxKind.JsxExpression:
            case common.SyntaxKind.JsxFragment:
            case common.SyntaxKind.JsxOpeningElement:
            case common.SyntaxKind.JsxOpeningFragment:
            case common.SyntaxKind.JsxSelfClosingElement:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.NonNullExpression:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NullKeyword:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.ObjectLiteralExpression:
            case common.SyntaxKind.OmittedExpression:
            case common.SyntaxKind.ParenthesizedExpression:
            case common.SyntaxKind.PartiallyEmittedExpression:
            case common.SyntaxKind.PostfixUnaryExpression:
            case common.SyntaxKind.PrefixUnaryExpression:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.SatisfiesExpression:
            case common.SyntaxKind.SpreadElement:
            case common.SyntaxKind.StringLiteral:
            case common.SyntaxKind.SuperKeyword:
            case common.SyntaxKind.TaggedTemplateExpression:
            case common.SyntaxKind.TemplateExpression:
            case common.SyntaxKind.ThisKeyword:
            case common.SyntaxKind.TrueKeyword:
            case common.SyntaxKind.TypeAssertionExpression:
            case common.SyntaxKind.TypeOfExpression:
            case common.SyntaxKind.VoidExpression:
            case common.SyntaxKind.YieldExpression:
                return true;
            default:
                return false;
        }
    }
    static isExpressionable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ExternalModuleReference:
            case common.SyntaxKind.JsxExpression:
            case common.SyntaxKind.ReturnStatement:
            case common.SyntaxKind.YieldExpression:
                return true;
            default:
                return false;
        }
    }
    static isExpressioned(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.AsExpression:
            case common.SyntaxKind.CaseClause:
            case common.SyntaxKind.ComputedPropertyName:
            case common.SyntaxKind.DoStatement:
            case common.SyntaxKind.ExportAssignment:
            case common.SyntaxKind.ExpressionStatement:
            case common.SyntaxKind.ForInStatement:
            case common.SyntaxKind.ForOfStatement:
            case common.SyntaxKind.IfStatement:
            case common.SyntaxKind.JsxSpreadAttribute:
            case common.SyntaxKind.NonNullExpression:
            case common.SyntaxKind.ParenthesizedExpression:
            case common.SyntaxKind.PartiallyEmittedExpression:
            case common.SyntaxKind.SatisfiesExpression:
            case common.SyntaxKind.SpreadAssignment:
            case common.SyntaxKind.SpreadElement:
            case common.SyntaxKind.SwitchStatement:
            case common.SyntaxKind.TemplateSpan:
            case common.SyntaxKind.ThrowStatement:
            case common.SyntaxKind.WhileStatement:
            case common.SyntaxKind.WithStatement:
                return true;
            default:
                return false;
        }
    }
    static isExpressionStatement = Node.is(common.SyntaxKind.ExpressionStatement);
    static isExpressionWithTypeArguments = Node.is(common.SyntaxKind.ExpressionWithTypeArguments);
    static isExtendsClauseable(node) {
        return node?.getKind() === common.SyntaxKind.InterfaceDeclaration;
    }
    static isExternalModuleReference = Node.is(common.SyntaxKind.ExternalModuleReference);
    static isFalseLiteral(node) {
        return node?.getKind() === common.SyntaxKind.FalseKeyword;
    }
    static isForInStatement = Node.is(common.SyntaxKind.ForInStatement);
    static isForOfStatement = Node.is(common.SyntaxKind.ForOfStatement);
    static isForStatement = Node.is(common.SyntaxKind.ForStatement);
    static isFunctionDeclaration = Node.is(common.SyntaxKind.FunctionDeclaration);
    static isFunctionExpression = Node.is(common.SyntaxKind.FunctionExpression);
    static isFunctionLikeDeclaration(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isFunctionTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.FunctionType;
    }
    static isGeneratorable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.YieldExpression:
                return true;
            default:
                return false;
        }
    }
    static isGetAccessorDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.GetAccessor;
    }
    static isHeritageClause = Node.is(common.SyntaxKind.HeritageClause);
    static isHeritageClauseable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.InterfaceDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isIdentifier = Node.is(common.SyntaxKind.Identifier);
    static isIfStatement = Node.is(common.SyntaxKind.IfStatement);
    static isImplementsClauseable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
                return true;
            default:
                return false;
        }
    }
    static isImportAttribute = Node.is(common.SyntaxKind.ImportAttribute);
    static isImportAttributeNamed(node) {
        return node?.getKind() === common.SyntaxKind.ImportAttribute;
    }
    static isImportAttributes = Node.is(common.SyntaxKind.ImportAttributes);
    static isImportClause = Node.is(common.SyntaxKind.ImportClause);
    static isImportDeclaration = Node.is(common.SyntaxKind.ImportDeclaration);
    static isImportEqualsDeclaration = Node.is(common.SyntaxKind.ImportEqualsDeclaration);
    static isImportExpression(node) {
        return node?.getKind() === common.SyntaxKind.ImportKeyword;
    }
    static isImportSpecifier = Node.is(common.SyntaxKind.ImportSpecifier);
    static isImportTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.ImportType;
    }
    static isIndexedAccessTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.IndexedAccessType;
    }
    static isIndexSignatureDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.IndexSignature;
    }
    static isInferKeyword = Node.is(common.SyntaxKind.InferKeyword);
    static isInferTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.InferType;
    }
    static isInitializerExpressionable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BindingElement:
            case common.SyntaxKind.EnumMember:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isInitializerExpressionGetable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BindingElement:
            case common.SyntaxKind.EnumMember:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyAssignment:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.ShorthandPropertyAssignment:
            case common.SyntaxKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isInterfaceDeclaration = Node.is(common.SyntaxKind.InterfaceDeclaration);
    static isIntersectionTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.IntersectionType;
    }
    static isIterationStatement(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.DoStatement:
            case common.SyntaxKind.ForInStatement:
            case common.SyntaxKind.ForOfStatement:
            case common.SyntaxKind.ForStatement:
            case common.SyntaxKind.WhileStatement:
                return true;
            default:
                return false;
        }
    }
    static isJSDoc = Node.is(common.SyntaxKind.JSDoc);
    static isJSDocable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.CaseClause:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.ClassStaticBlockDeclaration:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.EnumMember:
            case common.SyntaxKind.ExportAssignment:
            case common.SyntaxKind.ExpressionStatement:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.IndexSignature:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.LabeledStatement:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.VariableStatement:
                return true;
            default:
                return false;
        }
    }
    static isJSDocAllType = Node.is(common.SyntaxKind.JSDocAllType);
    static isJSDocAugmentsTag = Node.is(common.SyntaxKind.JSDocAugmentsTag);
    static isJSDocAuthorTag = Node.is(common.SyntaxKind.JSDocAuthorTag);
    static isJSDocCallbackTag = Node.is(common.SyntaxKind.JSDocCallbackTag);
    static isJSDocClassTag = Node.is(common.SyntaxKind.JSDocClassTag);
    static isJSDocDeprecatedTag = Node.is(common.SyntaxKind.JSDocDeprecatedTag);
    static isJSDocEnumTag = Node.is(common.SyntaxKind.JSDocEnumTag);
    static isJSDocFunctionType = Node.is(common.SyntaxKind.JSDocFunctionType);
    static isJSDocImplementsTag = Node.is(common.SyntaxKind.JSDocImplementsTag);
    static isJSDocImportTag(node) {
        return node?.getKind() === common.SyntaxKind.JSDocImportTag;
    }
    static isJSDocLink = Node.is(common.SyntaxKind.JSDocLink);
    static isJSDocLinkCode = Node.is(common.SyntaxKind.JSDocLinkCode);
    static isJSDocLinkPlain = Node.is(common.SyntaxKind.JSDocLinkPlain);
    static isJSDocMemberName = Node.is(common.SyntaxKind.JSDocMemberName);
    static isJSDocNamepathType = Node.is(common.SyntaxKind.JSDocNamepathType);
    static isJSDocNameReference = Node.is(common.SyntaxKind.JSDocNameReference);
    static isJSDocNonNullableType = Node.is(common.SyntaxKind.JSDocNonNullableType);
    static isJSDocNullableType = Node.is(common.SyntaxKind.JSDocNullableType);
    static isJSDocOptionalType = Node.is(common.SyntaxKind.JSDocOptionalType);
    static isJSDocOverloadTag = Node.is(common.SyntaxKind.JSDocOverloadTag);
    static isJSDocOverrideTag = Node.is(common.SyntaxKind.JSDocOverrideTag);
    static isJSDocParameterTag = Node.is(common.SyntaxKind.JSDocParameterTag);
    static isJSDocPrivateTag = Node.is(common.SyntaxKind.JSDocPrivateTag);
    static isJSDocPropertyLikeTag(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.JSDocParameterTag:
            case common.SyntaxKind.JSDocPropertyTag:
                return true;
            default:
                return false;
        }
    }
    static isJSDocPropertyTag = Node.is(common.SyntaxKind.JSDocPropertyTag);
    static isJSDocProtectedTag = Node.is(common.SyntaxKind.JSDocProtectedTag);
    static isJSDocPublicTag = Node.is(common.SyntaxKind.JSDocPublicTag);
    static isJSDocReadonlyTag = Node.is(common.SyntaxKind.JSDocReadonlyTag);
    static isJSDocReturnTag = Node.is(common.SyntaxKind.JSDocReturnTag);
    static isJSDocSatisfiesTag = Node.is(common.SyntaxKind.JSDocSatisfiesTag);
    static isJSDocSeeTag = Node.is(common.SyntaxKind.JSDocSeeTag);
    static isJSDocSignature = Node.is(common.SyntaxKind.JSDocSignature);
    static isJSDocTag(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.JSDocAugmentsTag:
            case common.SyntaxKind.JSDocAuthorTag:
            case common.SyntaxKind.JSDocCallbackTag:
            case common.SyntaxKind.JSDocClassTag:
            case common.SyntaxKind.JSDocDeprecatedTag:
            case common.SyntaxKind.JSDocEnumTag:
            case common.SyntaxKind.JSDocImplementsTag:
            case common.SyntaxKind.JSDocImportTag:
            case common.SyntaxKind.JSDocOverloadTag:
            case common.SyntaxKind.JSDocOverrideTag:
            case common.SyntaxKind.JSDocParameterTag:
            case common.SyntaxKind.JSDocPrivateTag:
            case common.SyntaxKind.JSDocPropertyTag:
            case common.SyntaxKind.JSDocProtectedTag:
            case common.SyntaxKind.JSDocPublicTag:
            case common.SyntaxKind.JSDocReadonlyTag:
            case common.SyntaxKind.JSDocReturnTag:
            case common.SyntaxKind.JSDocSatisfiesTag:
            case common.SyntaxKind.JSDocSeeTag:
            case common.SyntaxKind.JSDocTemplateTag:
            case common.SyntaxKind.JSDocThisTag:
            case common.SyntaxKind.JSDocThrowsTag:
            case common.SyntaxKind.JSDocTypedefTag:
            case common.SyntaxKind.JSDocTypeTag:
            case common.SyntaxKind.JSDocTag:
                return true;
            default:
                return false;
        }
    }
    static isJSDocTemplateTag = Node.is(common.SyntaxKind.JSDocTemplateTag);
    static isJSDocText = Node.is(common.SyntaxKind.JSDocText);
    static isJSDocThisTag = Node.is(common.SyntaxKind.JSDocThisTag);
    static isJSDocThrowsTag = Node.is(common.SyntaxKind.JSDocThrowsTag);
    static isJSDocType(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.JSDocAllType:
            case common.SyntaxKind.JSDocFunctionType:
            case common.SyntaxKind.JSDocNamepathType:
            case common.SyntaxKind.JSDocNonNullableType:
            case common.SyntaxKind.JSDocNullableType:
            case common.SyntaxKind.JSDocOptionalType:
            case common.SyntaxKind.JSDocSignature:
            case common.SyntaxKind.JSDocTypeLiteral:
            case common.SyntaxKind.JSDocUnknownType:
            case common.SyntaxKind.JSDocVariadicType:
                return true;
            default:
                return false;
        }
    }
    static isJSDocTypedefTag = Node.is(common.SyntaxKind.JSDocTypedefTag);
    static isJSDocTypeExpression = Node.is(common.SyntaxKind.JSDocTypeExpression);
    static isJSDocTypeExpressionableTag(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.JSDocOverloadTag:
            case common.SyntaxKind.JSDocReturnTag:
            case common.SyntaxKind.JSDocSatisfiesTag:
            case common.SyntaxKind.JSDocSeeTag:
            case common.SyntaxKind.JSDocThisTag:
            case common.SyntaxKind.JSDocThrowsTag:
                return true;
            default:
                return false;
        }
    }
    static isJSDocTypeLiteral = Node.is(common.SyntaxKind.JSDocTypeLiteral);
    static isJSDocTypeParameteredTag(node) {
        return node?.getKind() === common.SyntaxKind.JSDocTemplateTag;
    }
    static isJSDocTypeTag = Node.is(common.SyntaxKind.JSDocTypeTag);
    static isJSDocUnknownTag(node) {
        return node?.getKind() === common.SyntaxKind.JSDocTag;
    }
    static isJSDocUnknownType = Node.is(common.SyntaxKind.JSDocUnknownType);
    static isJSDocVariadicType = Node.is(common.SyntaxKind.JSDocVariadicType);
    static isJsxAttribute = Node.is(common.SyntaxKind.JsxAttribute);
    static isJsxAttributed(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.JsxOpeningElement:
            case common.SyntaxKind.JsxSelfClosingElement:
                return true;
            default:
                return false;
        }
    }
    static isJsxClosingElement = Node.is(common.SyntaxKind.JsxClosingElement);
    static isJsxClosingFragment = Node.is(common.SyntaxKind.JsxClosingFragment);
    static isJsxElement = Node.is(common.SyntaxKind.JsxElement);
    static isJsxExpression = Node.is(common.SyntaxKind.JsxExpression);
    static isJsxFragment = Node.is(common.SyntaxKind.JsxFragment);
    static isJsxNamespacedName = Node.is(common.SyntaxKind.JsxNamespacedName);
    static isJsxOpeningElement = Node.is(common.SyntaxKind.JsxOpeningElement);
    static isJsxOpeningFragment = Node.is(common.SyntaxKind.JsxOpeningFragment);
    static isJsxSelfClosingElement = Node.is(common.SyntaxKind.JsxSelfClosingElement);
    static isJsxSpreadAttribute = Node.is(common.SyntaxKind.JsxSpreadAttribute);
    static isJsxTagNamed(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.JsxClosingElement:
            case common.SyntaxKind.JsxOpeningElement:
            case common.SyntaxKind.JsxSelfClosingElement:
                return true;
            default:
                return false;
        }
    }
    static isJsxText = Node.is(common.SyntaxKind.JsxText);
    static isLabeledStatement = Node.is(common.SyntaxKind.LabeledStatement);
    static isLeftHandSideExpression(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrayLiteralExpression:
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.ElementAccessExpression:
            case common.SyntaxKind.FalseKeyword:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportKeyword:
            case common.SyntaxKind.JsxElement:
            case common.SyntaxKind.JsxFragment:
            case common.SyntaxKind.JsxSelfClosingElement:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.NonNullExpression:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NullKeyword:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.ObjectLiteralExpression:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.StringLiteral:
            case common.SyntaxKind.SuperKeyword:
            case common.SyntaxKind.TaggedTemplateExpression:
            case common.SyntaxKind.TemplateExpression:
            case common.SyntaxKind.ThisKeyword:
            case common.SyntaxKind.TrueKeyword:
                return true;
            default:
                return false;
        }
    }
    static isLeftHandSideExpressioned(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.Decorator:
            case common.SyntaxKind.ElementAccessExpression:
            case common.SyntaxKind.ExpressionWithTypeArguments:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.PropertyAccessExpression:
                return true;
            default:
                return false;
        }
    }
    static isLiteralExpression(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.StringLiteral:
                return true;
            default:
                return false;
        }
    }
    static isLiteralLike(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.JsxText:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.StringLiteral:
            case common.SyntaxKind.TemplateHead:
            case common.SyntaxKind.TemplateMiddle:
            case common.SyntaxKind.TemplateTail:
                return true;
            default:
                return false;
        }
    }
    static isLiteralTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.LiteralType;
    }
    static isMappedTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.MappedType;
    }
    static isMemberExpression(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrayLiteralExpression:
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.ElementAccessExpression:
            case common.SyntaxKind.FalseKeyword:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportKeyword:
            case common.SyntaxKind.JsxElement:
            case common.SyntaxKind.JsxFragment:
            case common.SyntaxKind.JsxSelfClosingElement:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NullKeyword:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.ObjectLiteralExpression:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.StringLiteral:
            case common.SyntaxKind.SuperKeyword:
            case common.SyntaxKind.TaggedTemplateExpression:
            case common.SyntaxKind.TemplateExpression:
            case common.SyntaxKind.ThisKeyword:
            case common.SyntaxKind.TrueKeyword:
                return true;
            default:
                return false;
        }
    }
    static isMetaProperty = Node.is(common.SyntaxKind.MetaProperty);
    static isMethodDeclaration = Node.is(common.SyntaxKind.MethodDeclaration);
    static isMethodSignature = Node.is(common.SyntaxKind.MethodSignature);
    static isModifierable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructorType:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.IndexSignature:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.TypeParameter:
            case common.SyntaxKind.VariableDeclarationList:
            case common.SyntaxKind.VariableStatement:
                return true;
            default:
                return false;
        }
    }
    static isModuleBlock = Node.is(common.SyntaxKind.ModuleBlock);
    static isModuleChildable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.VariableStatement:
                return true;
            default:
                return false;
        }
    }
    static isModuleDeclaration = Node.is(common.SyntaxKind.ModuleDeclaration);
    static isModuled(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.SourceFile:
                return true;
            default:
                return false;
        }
    }
    static isModuleNamed(node) {
        return node?.getKind() === common.SyntaxKind.ModuleDeclaration;
    }
    static isNameable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
                return true;
            default:
                return false;
        }
    }
    static isNamedExports = Node.is(common.SyntaxKind.NamedExports);
    static isNamedImports = Node.is(common.SyntaxKind.NamedImports);
    static isNamed(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.ShorthandPropertyAssignment:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.TypeParameter:
                return true;
            default:
                return false;
        }
    }
    static isNamedTupleMember = Node.is(common.SyntaxKind.NamedTupleMember);
    static isNamespaceExport = Node.is(common.SyntaxKind.NamespaceExport);
    static isNamespaceImport = Node.is(common.SyntaxKind.NamespaceImport);
    static isNeverKeyword = Node.is(common.SyntaxKind.NeverKeyword);
    static isNewExpression = Node.is(common.SyntaxKind.NewExpression);
    static isNodeWithTypeArguments(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ExpressionWithTypeArguments:
            case common.SyntaxKind.ImportType:
            case common.SyntaxKind.TypeQuery:
            case common.SyntaxKind.TypeReference:
                return true;
            default:
                return false;
        }
    }
    static isNonNullExpression = Node.is(common.SyntaxKind.NonNullExpression);
    static isNoSubstitutionTemplateLiteral = Node.is(common.SyntaxKind.NoSubstitutionTemplateLiteral);
    static isNotEmittedStatement = Node.is(common.SyntaxKind.NotEmittedStatement);
    static isNullLiteral(node) {
        return node?.getKind() === common.SyntaxKind.NullKeyword;
    }
    static isNumberKeyword = Node.is(common.SyntaxKind.NumberKeyword);
    static isNumericLiteral = Node.is(common.SyntaxKind.NumericLiteral);
    static isObjectBindingPattern = Node.is(common.SyntaxKind.ObjectBindingPattern);
    static isObjectKeyword = Node.is(common.SyntaxKind.ObjectKeyword);
    static isObjectLiteralExpression = Node.is(common.SyntaxKind.ObjectLiteralExpression);
    static isOmittedExpression = Node.is(common.SyntaxKind.OmittedExpression);
    static isOptionalTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.OptionalType;
    }
    static isOverloadable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.MethodDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isOverrideable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isParameterDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.Parameter;
    }
    static isParametered(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructorType:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.FunctionType:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.JSDocFunctionType:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isParenthesizedExpression = Node.is(common.SyntaxKind.ParenthesizedExpression);
    static isParenthesizedTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.ParenthesizedType;
    }
    static isPartiallyEmittedExpression = Node.is(common.SyntaxKind.PartiallyEmittedExpression);
    static isPostfixUnaryExpression = Node.is(common.SyntaxKind.PostfixUnaryExpression);
    static isPrefixUnaryExpression = Node.is(common.SyntaxKind.PrefixUnaryExpression);
    static isPrimaryExpression(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrayLiteralExpression:
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.FalseKeyword:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportKeyword:
            case common.SyntaxKind.JsxElement:
            case common.SyntaxKind.JsxFragment:
            case common.SyntaxKind.JsxSelfClosingElement:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NullKeyword:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.ObjectLiteralExpression:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.StringLiteral:
            case common.SyntaxKind.SuperKeyword:
            case common.SyntaxKind.TemplateExpression:
            case common.SyntaxKind.ThisKeyword:
            case common.SyntaxKind.TrueKeyword:
                return true;
            default:
                return false;
        }
    }
    static isPrivateIdentifier = Node.is(common.SyntaxKind.PrivateIdentifier);
    static isPropertyAccessExpression = Node.is(common.SyntaxKind.PropertyAccessExpression);
    static isPropertyAssignment = Node.is(common.SyntaxKind.PropertyAssignment);
    static isPropertyDeclaration = Node.is(common.SyntaxKind.PropertyDeclaration);
    static isPropertyNamed(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.EnumMember:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.PropertyAssignment:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isPropertySignature = Node.is(common.SyntaxKind.PropertySignature);
    static isQualifiedName = Node.is(common.SyntaxKind.QualifiedName);
    static isQuestionDotTokenable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.ElementAccessExpression:
            case common.SyntaxKind.PropertyAccessExpression:
                return true;
            default:
                return false;
        }
    }
    static isQuestionTokenable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyAssignment:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.ShorthandPropertyAssignment:
                return true;
            default:
                return false;
        }
    }
    static isReadonlyable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.IndexSignature:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
                return true;
            default:
                return false;
        }
    }
    static isReferenceFindable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BindingElement:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.EnumMember:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportAttribute:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PrivateIdentifier:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.PropertyAssignment:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.ShorthandPropertyAssignment:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.TypeParameter:
            case common.SyntaxKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isRegularExpressionLiteral = Node.is(common.SyntaxKind.RegularExpressionLiteral);
    static isRenameable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.BindingElement:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.EnumMember:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportAttribute:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.NamespaceExport:
            case common.SyntaxKind.NamespaceImport:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PrivateIdentifier:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.PropertyAssignment:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.ShorthandPropertyAssignment:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.TypeParameter:
            case common.SyntaxKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isRestTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.RestType;
    }
    static isReturnStatement = Node.is(common.SyntaxKind.ReturnStatement);
    static isReturnTyped(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructorType:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.FunctionType:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.IndexSignature:
            case common.SyntaxKind.JSDocFunctionType:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isSatisfiesExpression = Node.is(common.SyntaxKind.SatisfiesExpression);
    static isScopeable(node) {
        return node?.getKind() === common.SyntaxKind.Parameter;
    }
    static isScoped(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isSemicolonToken = Node.is(common.SyntaxKind.SemicolonToken);
    static isSetAccessorDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.SetAccessor;
    }
    static isShorthandPropertyAssignment = Node.is(common.SyntaxKind.ShorthandPropertyAssignment);
    static isSignaturedDeclaration(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructorType:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.FunctionType:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.JSDocFunctionType:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isSourceFile = Node.is(common.SyntaxKind.SourceFile);
    static isSpreadAssignment = Node.is(common.SyntaxKind.SpreadAssignment);
    static isSpreadElement = Node.is(common.SyntaxKind.SpreadElement);
    static isStatement(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.Block:
            case common.SyntaxKind.BreakStatement:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ContinueStatement:
            case common.SyntaxKind.DebuggerStatement:
            case common.SyntaxKind.DoStatement:
            case common.SyntaxKind.EmptyStatement:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.ExportAssignment:
            case common.SyntaxKind.ExportDeclaration:
            case common.SyntaxKind.ExpressionStatement:
            case common.SyntaxKind.ForInStatement:
            case common.SyntaxKind.ForOfStatement:
            case common.SyntaxKind.ForStatement:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.IfStatement:
            case common.SyntaxKind.ImportDeclaration:
            case common.SyntaxKind.ImportEqualsDeclaration:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.LabeledStatement:
            case common.SyntaxKind.ModuleBlock:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.NotEmittedStatement:
            case common.SyntaxKind.ReturnStatement:
            case common.SyntaxKind.SwitchStatement:
            case common.SyntaxKind.ThrowStatement:
            case common.SyntaxKind.TryStatement:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.VariableStatement:
            case common.SyntaxKind.WhileStatement:
            case common.SyntaxKind.WithStatement:
                return true;
            default:
                return false;
        }
    }
    static isStatemented(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.Block:
            case common.SyntaxKind.CaseClause:
            case common.SyntaxKind.ClassStaticBlockDeclaration:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.DefaultClause:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.ModuleBlock:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.SourceFile:
                return true;
            default:
                return false;
        }
    }
    static isStaticable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.SetAccessor:
                return true;
            default:
                return false;
        }
    }
    static isStringKeyword = Node.is(common.SyntaxKind.StringKeyword);
    static isStringLiteral = Node.is(common.SyntaxKind.StringLiteral);
    static isSuperExpression(node) {
        return node?.getKind() === common.SyntaxKind.SuperKeyword;
    }
    static isSwitchStatement = Node.is(common.SyntaxKind.SwitchStatement);
    static isSymbolKeyword = Node.is(common.SyntaxKind.SymbolKeyword);
    static isSyntaxList = Node.is(common.SyntaxKind.SyntaxList);
    static isTaggedTemplateExpression = Node.is(common.SyntaxKind.TaggedTemplateExpression);
    static isTemplateExpression = Node.is(common.SyntaxKind.TemplateExpression);
    static isTemplateHead = Node.is(common.SyntaxKind.TemplateHead);
    static isTemplateLiteralTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.TemplateLiteralType;
    }
    static isTemplateMiddle = Node.is(common.SyntaxKind.TemplateMiddle);
    static isTemplateSpan = Node.is(common.SyntaxKind.TemplateSpan);
    static isTemplateTail = Node.is(common.SyntaxKind.TemplateTail);
    static isTextInsertable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.Block:
            case common.SyntaxKind.CaseBlock:
            case common.SyntaxKind.CaseClause:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.ClassStaticBlockDeclaration:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.DefaultClause:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.SourceFile:
                return true;
            default:
                return false;
        }
    }
    static isThisExpression(node) {
        return node?.getKind() === common.SyntaxKind.ThisKeyword;
    }
    static isThisTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.ThisType;
    }
    static isThrowStatement = Node.is(common.SyntaxKind.ThrowStatement);
    static isTrueLiteral(node) {
        return node?.getKind() === common.SyntaxKind.TrueKeyword;
    }
    static isTryStatement = Node.is(common.SyntaxKind.TryStatement);
    static isTupleTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.TupleType;
    }
    static isTypeAliasDeclaration = Node.is(common.SyntaxKind.TypeAliasDeclaration);
    static isTypeArgumented(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.ExpressionWithTypeArguments:
            case common.SyntaxKind.ImportType:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.TypeQuery:
            case common.SyntaxKind.TypeReference:
                return true;
            default:
                return false;
        }
    }
    static isTypeAssertion(node) {
        return node?.getKind() === common.SyntaxKind.TypeAssertionExpression;
    }
    static isTyped(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.AsExpression:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.SatisfiesExpression:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.TypeAssertionExpression:
            case common.SyntaxKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isTypeElement(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.IndexSignature:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.PropertySignature:
                return true;
            default:
                return false;
        }
    }
    static isTypeElementMembered(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.TypeLiteral:
                return true;
            default:
                return false;
        }
    }
    static isTypeLiteral(node) {
        return node?.getKind() === common.SyntaxKind.TypeLiteral;
    }
    static isTypeNode(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrayType:
            case common.SyntaxKind.ConditionalType:
            case common.SyntaxKind.ConstructorType:
            case common.SyntaxKind.ExpressionWithTypeArguments:
            case common.SyntaxKind.FunctionType:
            case common.SyntaxKind.ImportType:
            case common.SyntaxKind.IndexedAccessType:
            case common.SyntaxKind.InferType:
            case common.SyntaxKind.IntersectionType:
            case common.SyntaxKind.JSDocAllType:
            case common.SyntaxKind.JSDocFunctionType:
            case common.SyntaxKind.JSDocNamepathType:
            case common.SyntaxKind.JSDocNonNullableType:
            case common.SyntaxKind.JSDocNullableType:
            case common.SyntaxKind.JSDocOptionalType:
            case common.SyntaxKind.JSDocSignature:
            case common.SyntaxKind.JSDocTypeExpression:
            case common.SyntaxKind.JSDocTypeLiteral:
            case common.SyntaxKind.JSDocUnknownType:
            case common.SyntaxKind.JSDocVariadicType:
            case common.SyntaxKind.LiteralType:
            case common.SyntaxKind.MappedType:
            case common.SyntaxKind.NamedTupleMember:
            case common.SyntaxKind.OptionalType:
            case common.SyntaxKind.ParenthesizedType:
            case common.SyntaxKind.RestType:
            case common.SyntaxKind.TemplateLiteralType:
            case common.SyntaxKind.ThisType:
            case common.SyntaxKind.TupleType:
            case common.SyntaxKind.TypeLiteral:
            case common.SyntaxKind.TypeOperator:
            case common.SyntaxKind.TypePredicate:
            case common.SyntaxKind.TypeQuery:
            case common.SyntaxKind.TypeReference:
            case common.SyntaxKind.UnionType:
                return true;
            default:
                return false;
        }
    }
    static isTypeOfExpression = Node.is(common.SyntaxKind.TypeOfExpression);
    static isTypeOperatorTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.TypeOperator;
    }
    static isTypeParameterDeclaration(node) {
        return node?.getKind() === common.SyntaxKind.TypeParameter;
    }
    static isTypeParametered(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrowFunction:
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.FunctionType:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.TypeAliasDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isTypePredicate(node) {
        return node?.getKind() === common.SyntaxKind.TypePredicate;
    }
    static isTypeQuery(node) {
        return node?.getKind() === common.SyntaxKind.TypeQuery;
    }
    static isTypeReference(node) {
        return node?.getKind() === common.SyntaxKind.TypeReference;
    }
    static isUnaryExpression(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrayLiteralExpression:
            case common.SyntaxKind.AwaitExpression:
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.DeleteExpression:
            case common.SyntaxKind.ElementAccessExpression:
            case common.SyntaxKind.FalseKeyword:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportKeyword:
            case common.SyntaxKind.JsxElement:
            case common.SyntaxKind.JsxFragment:
            case common.SyntaxKind.JsxSelfClosingElement:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.NonNullExpression:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NullKeyword:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.ObjectLiteralExpression:
            case common.SyntaxKind.PostfixUnaryExpression:
            case common.SyntaxKind.PrefixUnaryExpression:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.StringLiteral:
            case common.SyntaxKind.SuperKeyword:
            case common.SyntaxKind.TaggedTemplateExpression:
            case common.SyntaxKind.TemplateExpression:
            case common.SyntaxKind.ThisKeyword:
            case common.SyntaxKind.TrueKeyword:
            case common.SyntaxKind.TypeAssertionExpression:
            case common.SyntaxKind.TypeOfExpression:
            case common.SyntaxKind.VoidExpression:
                return true;
            default:
                return false;
        }
    }
    static isUnaryExpressioned(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.AwaitExpression:
            case common.SyntaxKind.DeleteExpression:
            case common.SyntaxKind.TypeAssertionExpression:
            case common.SyntaxKind.TypeOfExpression:
            case common.SyntaxKind.VoidExpression:
                return true;
            default:
                return false;
        }
    }
    static isUndefinedKeyword = Node.is(common.SyntaxKind.UndefinedKeyword);
    static isUnionTypeNode(node) {
        return node?.getKind() === common.SyntaxKind.UnionType;
    }
    static isUnwrappable(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.ModuleDeclaration:
                return true;
            default:
                return false;
        }
    }
    static isUpdateExpression(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.ArrayLiteralExpression:
            case common.SyntaxKind.BigIntLiteral:
            case common.SyntaxKind.CallExpression:
            case common.SyntaxKind.ClassExpression:
            case common.SyntaxKind.ElementAccessExpression:
            case common.SyntaxKind.FalseKeyword:
            case common.SyntaxKind.FunctionExpression:
            case common.SyntaxKind.Identifier:
            case common.SyntaxKind.ImportKeyword:
            case common.SyntaxKind.JsxElement:
            case common.SyntaxKind.JsxFragment:
            case common.SyntaxKind.JsxSelfClosingElement:
            case common.SyntaxKind.MetaProperty:
            case common.SyntaxKind.NewExpression:
            case common.SyntaxKind.NonNullExpression:
            case common.SyntaxKind.NoSubstitutionTemplateLiteral:
            case common.SyntaxKind.NullKeyword:
            case common.SyntaxKind.NumericLiteral:
            case common.SyntaxKind.ObjectLiteralExpression:
            case common.SyntaxKind.PropertyAccessExpression:
            case common.SyntaxKind.RegularExpressionLiteral:
            case common.SyntaxKind.StringLiteral:
            case common.SyntaxKind.SuperKeyword:
            case common.SyntaxKind.TaggedTemplateExpression:
            case common.SyntaxKind.TemplateExpression:
            case common.SyntaxKind.ThisKeyword:
            case common.SyntaxKind.TrueKeyword:
                return true;
            default:
                return false;
        }
    }
    static isVariableDeclaration = Node.is(common.SyntaxKind.VariableDeclaration);
    static isVariableDeclarationList = Node.is(common.SyntaxKind.VariableDeclarationList);
    static isVariableStatement = Node.is(common.SyntaxKind.VariableStatement);
    static isVoidExpression = Node.is(common.SyntaxKind.VoidExpression);
    static isWhileStatement = Node.is(common.SyntaxKind.WhileStatement);
    static isWithStatement = Node.is(common.SyntaxKind.WithStatement);
    static isYieldExpression = Node.is(common.SyntaxKind.YieldExpression);
    static _hasStructure(node) {
        switch (node?.getKind()) {
            case common.SyntaxKind.CallSignature:
            case common.SyntaxKind.ClassDeclaration:
            case common.SyntaxKind.ClassStaticBlockDeclaration:
            case common.SyntaxKind.Constructor:
            case common.SyntaxKind.ConstructSignature:
            case common.SyntaxKind.Decorator:
            case common.SyntaxKind.EnumDeclaration:
            case common.SyntaxKind.EnumMember:
            case common.SyntaxKind.ExportAssignment:
            case common.SyntaxKind.ExportDeclaration:
            case common.SyntaxKind.ExportSpecifier:
            case common.SyntaxKind.FunctionDeclaration:
            case common.SyntaxKind.GetAccessor:
            case common.SyntaxKind.ImportAttribute:
            case common.SyntaxKind.ImportDeclaration:
            case common.SyntaxKind.ImportSpecifier:
            case common.SyntaxKind.IndexSignature:
            case common.SyntaxKind.InterfaceDeclaration:
            case common.SyntaxKind.JSDoc:
            case common.SyntaxKind.JsxAttribute:
            case common.SyntaxKind.JsxElement:
            case common.SyntaxKind.JsxNamespacedName:
            case common.SyntaxKind.JsxSelfClosingElement:
            case common.SyntaxKind.JsxSpreadAttribute:
            case common.SyntaxKind.MethodDeclaration:
            case common.SyntaxKind.MethodSignature:
            case common.SyntaxKind.ModuleDeclaration:
            case common.SyntaxKind.Parameter:
            case common.SyntaxKind.PropertyAssignment:
            case common.SyntaxKind.PropertyDeclaration:
            case common.SyntaxKind.PropertySignature:
            case common.SyntaxKind.SetAccessor:
            case common.SyntaxKind.ShorthandPropertyAssignment:
            case common.SyntaxKind.SourceFile:
            case common.SyntaxKind.SpreadAssignment:
            case common.SyntaxKind.TypeAliasDeclaration:
            case common.SyntaxKind.TypeParameter:
            case common.SyntaxKind.VariableDeclaration:
            case common.SyntaxKind.VariableStatement:
                return true;
            default:
                return false;
        }
    }
}
function getWrappedCondition(thisNode, condition) {
    return condition == null ? undefined : ((c) => condition(thisNode._getNodeFromCompilerNode(c)));
}
function insertWhiteSpaceTextAtPos(node, insertPos, textOrWriterFunction, methodName) {
    const parent = Node.isSourceFile(node) ? node.getChildSyntaxListOrThrow() : node.getParentSyntaxList() || node.getParentOrThrow();
    const newText = getTextFromStringOrWriter(node._getWriterWithQueuedIndentation(), textOrWriterFunction);
    if (!/^[\s\r\n]*$/.test(newText))
        throw new common.errors.InvalidOperationError(`Cannot insert non-whitespace into ${methodName}.`);
    insertIntoParentTextRange({
        parent,
        insertPos,
        newText,
    });
}
function* getCompilerForEachDescendantsIterator(node) {
    for (const child of getForEachChildren()) {
        yield child;
        yield* getCompilerForEachDescendantsIterator(child);
    }
    function getForEachChildren() {
        const children = [];
        node.forEachChild(child => {
            children.push(child);
        });
        return children;
    }
}
function* getCompilerDescendantsIterator(node, sourceFile) {
    for (const child of ExtendedParser.getCompilerChildren(node, sourceFile)) {
        yield child;
        yield* getCompilerDescendantsIterator(child, sourceFile);
    }
}
function useParseTreeSearchForKind(thisNodeOrSyntaxKind, searchingKind) {
    return searchingKind >= common.SyntaxKind.FirstNode && searchingKind < common.SyntaxKind.FirstJSDocNode
        && getThisKind() !== common.SyntaxKind.SyntaxList;
    function getThisKind() {
        if (typeof thisNodeOrSyntaxKind === "number")
            return thisNodeOrSyntaxKind;
        return thisNodeOrSyntaxKind.compilerNode.kind;
    }
}

exports.Scope = void 0;
(function (Scope) {
    Scope["Public"] = "public";
    Scope["Protected"] = "protected";
    Scope["Private"] = "private";
})(exports.Scope || (exports.Scope = {}));

class SyntaxList extends Node {
    addChildText(textOrWriterFunction) {
        return this.insertChildText(this.getChildCount(), textOrWriterFunction);
    }
    insertChildText(index, textOrWriterFunction) {
        const initialChildCount = this.getChildCount();
        const newLineKind = this._context.manipulationSettings.getNewLineKindAsString();
        const parent = this.getParentOrThrow();
        index = verifyAndGetIndex(index, initialChildCount);
        const isInline = this !== parent.getChildSyntaxList();
        let insertText = getTextFromStringOrWriter(isInline ? parent._getWriterWithQueuedChildIndentation() : parent._getWriterWithChildIndentation(), textOrWriterFunction);
        if (insertText.length === 0)
            return [];
        if (isInline) {
            if (index === 0)
                insertText += " ";
            else
                insertText = " " + insertText;
        }
        else {
            if (index === 0 && Node.isSourceFile(parent)) {
                if (!insertText.endsWith("\n"))
                    insertText += newLineKind;
            }
            else {
                insertText = newLineKind + insertText;
                if (!Node.isSourceFile(parent) && index === initialChildCount && insertText.endsWith("\n"))
                    insertText = insertText.replace(/\r?\n$/, "");
            }
        }
        const insertPos = getInsertPosFromIndex(index, this, this.getChildren());
        insertIntoParentTextRange({
            insertPos,
            newText: insertText,
            parent: this,
        });
        const finalChildren = this.getChildren();
        return getNodesToReturn(initialChildCount, finalChildren, index, true);
    }
}

function renameNode(node, newName, options) {
    common.errors.throwIfWhitespaceOrNotString(newName, "newName");
    if (node.getText() === newName)
        return;
    const renameLocations = node._context.languageService.findRenameLocations(node, options);
    const renameLocationsBySourceFile = new common.KeyValueCache();
    for (const renameLocation of renameLocations) {
        const locations = renameLocationsBySourceFile.getOrCreate(renameLocation.getSourceFile(), () => []);
        locations.push(renameLocation);
    }
    for (const [sourceFile, locations] of renameLocationsBySourceFile.getEntries()) {
        replaceSourceFileTextForRename({
            sourceFile,
            renameLocations: locations,
            newName,
        });
    }
}

function setBodyTextForNode(body, textOrWriterFunction) {
    const newText = getBodyText(body._getWriterWithIndentation(), textOrWriterFunction);
    const openBrace = body.getFirstChildByKindOrThrow(common.SyntaxKind.OpenBraceToken);
    const closeBrace = body.getFirstChildByKindOrThrow(common.SyntaxKind.CloseBraceToken);
    insertIntoParentTextRange({
        insertPos: openBrace.getEnd(),
        newText,
        parent: body,
        replacing: {
            textLength: closeBrace.getStart() - openBrace.getEnd(),
        },
    });
}

function BodiedNode(Base) {
    return class extends Base {
        getBody() {
            const body = this.compilerNode.body;
            if (body == null)
                throw new common.errors.InvalidOperationError("Bodied node should have a body.");
            return this._getNodeFromCompilerNode(body);
        }
        setBodyText(textOrWriterFunction) {
            const body = this.getBody();
            setBodyTextForNode(body, textOrWriterFunction);
            return this;
        }
        getBodyText() {
            return getBodyTextWithoutLeadingIndentation(this.getBody());
        }
    };
}

function BodyableNode(Base) {
    return class extends Base {
        getBodyOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getBody(), message ?? "Expected to find the node's body.", this);
        }
        getBody() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.body);
        }
        getBodyText() {
            const body = this.getBody();
            return body == null ? undefined : getBodyTextWithoutLeadingIndentation(body);
        }
        setBodyText(textOrWriterFunction) {
            this.addBody();
            setBodyTextForNode(this.getBodyOrThrow(), textOrWriterFunction);
            return this;
        }
        hasBody() {
            return this.compilerNode.body != null;
        }
        addBody() {
            if (this.hasBody())
                return this;
            const semiColon = this.getLastChildByKind(common.SyntaxKind.SemicolonToken);
            insertIntoParentTextRange({
                parent: this,
                insertPos: semiColon == null ? this.getEnd() : semiColon.getStart(),
                newText: this._getWriterWithQueuedIndentation().space().block().toString(),
                replacing: {
                    textLength: semiColon?.getFullWidth() ?? 0,
                },
            });
            return this;
        }
        removeBody() {
            const body = this.getBody();
            if (body == null)
                return this;
            insertIntoParentTextRange({
                parent: this,
                insertPos: body.getPos(),
                newText: ";",
                replacing: {
                    textLength: body.getFullWidth(),
                },
            });
            return this;
        }
    };
}

function ChildOrderableNode(Base) {
    return class extends Base {
        setOrder(order) {
            const childIndex = this.getChildIndex();
            const parent = this.getParentSyntaxList() || this.getParentSyntaxListOrThrow();
            common.errors.throwIfOutOfRange(order, [0, parent.getChildCount() - 1], "order");
            if (childIndex === order)
                return this;
            changeChildOrder({
                parent,
                getSiblingFormatting: getGeneralFormatting,
                oldIndex: childIndex,
                newIndex: order,
            });
            return this;
        }
    };
}

function DecoratableNode(Base) {
    return class extends Base {
        getDecorator(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getDecorators(), nameOrFindFunction);
        }
        getDecoratorOrThrow(nameOrFindFunction, message) {
            return common.errors.throwIfNullOrUndefined(this.getDecorator(nameOrFindFunction), message ?? (() => getNotFoundErrorMessageForNameOrFindFunction("decorator", nameOrFindFunction)), this);
        }
        getDecorators() {
            return getCompilerNodeDecorators(this.compilerNode).map(d => this._getNodeFromCompilerNode(d));
        }
        addDecorator(structure) {
            return this.insertDecorator(getEndIndexFromArray(getCompilerNodeDecorators(this.compilerNode)), structure);
        }
        addDecorators(structures) {
            return this.insertDecorators(getEndIndexFromArray(getCompilerNodeDecorators(this.compilerNode)), structures);
        }
        insertDecorator(index, structure) {
            return this.insertDecorators(index, [structure])[0];
        }
        insertDecorators(index, structures) {
            if (common.ArrayUtils.isNullOrEmpty(structures))
                return [];
            const decoratorLines = getDecoratorLines(this, structures);
            const decorators = this.getDecorators();
            index = verifyAndGetIndex(index, decorators.length);
            const formattingKind = getDecoratorFormattingKind(this, decorators);
            const previousDecorator = decorators[index - 1];
            const decoratorCode = getNewInsertCode({
                structures,
                newCodes: decoratorLines,
                parent: this,
                indentationText: this.getIndentationText(),
                getSeparator: () => formattingKind,
                previousFormattingKind: previousDecorator == null ? FormattingKind.None : formattingKind,
                nextFormattingKind: previousDecorator == null ? formattingKind : FormattingKind.None,
            });
            insertIntoParentTextRange({
                parent: decorators[0]?.getParentSyntaxListOrThrow() ?? this.getModifiers()[0]?.getParentSyntaxListOrThrow() ?? this,
                insertPos: index === 0 ? (decorators[0] ?? this).getStart() : decorators[index - 1].getEnd(),
                newText: decoratorCode,
            });
            return getNodesToReturn(decorators, this.getDecorators(), index, false);
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.decorators != null) {
                this.getDecorators().forEach(d => d.remove());
                this.addDecorators(structure.decorators);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                decorators: this.getDecorators().map(d => d.getStructure()),
            });
        }
    };
}
function getCompilerNodeDecorators(node) {
    return common.ts.canHaveDecorators(node) ? common.ts.getDecorators(node) ?? [] : [];
}
function getDecoratorLines(node, structures) {
    const lines = [];
    for (const structure of structures) {
        const writer = node._getWriter();
        const structurePrinter = node._context.structurePrinterFactory.forDecorator();
        structurePrinter.printText(writer, structure);
        lines.push(writer.toString());
    }
    return lines;
}
function getDecoratorFormattingKind(parent, currentDecorators) {
    const sameLine = areDecoratorsOnSameLine(parent, currentDecorators);
    return sameLine ? FormattingKind.Space : FormattingKind.Newline;
}
function areDecoratorsOnSameLine(parent, currentDecorators) {
    if (currentDecorators.length === 1) {
        const previousNode = currentDecorators[0].getPreviousSibling();
        if (previousNode != null && previousNode.getStartLinePos() === currentDecorators[0].getStartLinePos())
            return true;
    }
    if (currentDecorators.length <= 1)
        return parent.getKind() === common.SyntaxKind.Parameter;
    const startLinePos = currentDecorators[0].getStartLinePos();
    for (let i = 1; i < currentDecorators.length; i++) {
        if (currentDecorators[i].getStartLinePos() !== startLinePos)
            return false;
    }
    return true;
}

function DotDotDotTokenableNode(Base) {
    return class extends Base {
        getDotDotDotTokenOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getDotDotDotToken(), message ?? "Expected to find a dot dot dot token (...).", this);
        }
        getDotDotDotToken() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.dotDotDotToken);
        }
    };
}

function ExclamationTokenableNode(Base) {
    return class extends Base {
        hasExclamationToken() {
            return this.compilerNode.exclamationToken != null;
        }
        getExclamationTokenNode() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.exclamationToken);
        }
        getExclamationTokenNodeOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getExclamationTokenNode(), message ?? "Expected to find an exclamation token.", this);
        }
        setHasExclamationToken(value) {
            const exclamationTokenNode = this.getExclamationTokenNode();
            const hasExclamationToken = exclamationTokenNode != null;
            if (value === hasExclamationToken)
                return this;
            if (value) {
                if (Node.isQuestionTokenable(this))
                    this.setHasQuestionToken(false);
                const colonNode = this.getFirstChildByKind(common.SyntaxKind.ColonToken);
                if (colonNode == null)
                    throw new common.errors.InvalidOperationError("Cannot add an exclamation token to a node that does not have a type.");
                insertIntoParentTextRange({
                    insertPos: colonNode.getStart(),
                    parent: this,
                    newText: "!",
                });
            }
            else {
                removeChildren({ children: [exclamationTokenNode] });
            }
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.hasExclamationToken != null)
                this.setHasExclamationToken(structure.hasExclamationToken);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                hasExclamationToken: this.hasExclamationToken(),
            });
        }
    };
}

function ExportGetableNode(Base) {
    return class extends Base {
        hasExportKeyword() {
            return this.getExportKeyword() != null;
        }
        getExportKeyword() {
            if (Node.isVariableDeclaration(this)) {
                const variableStatement = this.getVariableStatement();
                return variableStatement?.getExportKeyword();
            }
            if (!Node.isModifierable(this))
                return throwForNotModifierableNode();
            return this.getFirstModifierByKind(common.SyntaxKind.ExportKeyword);
        }
        getExportKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getExportKeyword(), message ?? "Expected to find an export keyword.", this);
        }
        hasDefaultKeyword() {
            return this.getDefaultKeyword() != null;
        }
        getDefaultKeyword() {
            if (Node.isVariableDeclaration(this)) {
                const variableStatement = this.getVariableStatement();
                return variableStatement?.getDefaultKeyword();
            }
            if (!Node.isModifierable(this))
                return throwForNotModifierableNode();
            return this.getFirstModifierByKind(common.SyntaxKind.DefaultKeyword);
        }
        getDefaultKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getDefaultKeyword(), message ?? "Expected to find a default keyword.", this);
        }
        isExported() {
            if (this.hasExportKeyword())
                return true;
            const thisSymbol = this.getSymbol();
            const sourceFileSymbol = this.getSourceFile().getSymbol();
            if (thisSymbol == null || sourceFileSymbol == null)
                return false;
            return sourceFileSymbol.getExports().some(e => e === thisSymbol || e.getAliasedSymbol() === thisSymbol);
        }
        isDefaultExport() {
            if (this.hasDefaultKeyword())
                return true;
            const thisSymbol = this.getSymbol();
            if (thisSymbol == null)
                return false;
            const defaultExportSymbol = this.getSourceFile().getDefaultExportSymbol();
            if (defaultExportSymbol == null)
                return false;
            if (thisSymbol === defaultExportSymbol)
                return true;
            const aliasedSymbol = defaultExportSymbol.getAliasedSymbol();
            return thisSymbol === aliasedSymbol;
        }
        isNamedExport() {
            const thisSymbol = this.getSymbol();
            const sourceFileSymbol = this.getSourceFile().getSymbol();
            if (thisSymbol == null || sourceFileSymbol == null)
                return false;
            return !isDefaultExport() && sourceFileSymbol.getExports().some(e => e === thisSymbol || e.getAliasedSymbol() === thisSymbol);
            function isDefaultExport() {
                const defaultExportSymbol = sourceFileSymbol.getExport("default");
                if (defaultExportSymbol == null)
                    return false;
                return thisSymbol === defaultExportSymbol || thisSymbol === defaultExportSymbol.getAliasedSymbol();
            }
        }
    };
}
function throwForNotModifierableNode() {
    throw new common.errors.NotImplementedError(`Not implemented situation where node was not a ModifierableNode.`);
}

function ExportableNode(Base) {
    return apply$1(ExportGetableNode(Base));
}
function apply$1(Base) {
    return class extends Base {
        setIsDefaultExport(value) {
            if (value === this.isDefaultExport())
                return this;
            if (value && !Node.isSourceFile(this.getParentOrThrow()))
                throw new common.errors.InvalidOperationError("The parent must be a source file in order to set this node as a default export.");
            const sourceFile = this.getSourceFile();
            const fileDefaultExportSymbol = sourceFile.getDefaultExportSymbol();
            if (fileDefaultExportSymbol != null)
                sourceFile.removeDefaultExport(fileDefaultExportSymbol);
            if (!value)
                return this;
            if (Node.hasName(this) && shouldWriteAsSeparateStatement.call(this)) {
                const parentSyntaxList = this.getFirstAncestorByKindOrThrow(common.SyntaxKind.SyntaxList);
                const name = this.getName();
                parentSyntaxList.insertChildText(this.getChildIndex() + 1, writer => {
                    writer.newLine().write(`export default ${name};`);
                });
            }
            else {
                this.addModifier("export");
                this.addModifier("default");
            }
            return this;
            function shouldWriteAsSeparateStatement() {
                if (Node.isEnumDeclaration(this) || Node.isModuleDeclaration(this) || Node.isTypeAliasDeclaration(this))
                    return true;
                if (Node.isAmbientable(this) && this.isAmbient())
                    return true;
                return false;
            }
        }
        setIsExported(value) {
            if (Node.isSourceFile(this.getParentOrThrow()))
                this.toggleModifier("default", false);
            this.toggleModifier("export", value);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.isExported != null)
                this.setIsExported(structure.isExported);
            if (structure.isDefaultExport != null)
                this.setIsDefaultExport(structure.isDefaultExport);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                isExported: this.hasExportKeyword(),
                isDefaultExport: this.hasDefaultKeyword(),
            });
        }
    };
}

class Printer {
    printTextOrWriterFunc(writer, textOrWriterFunc) {
        if (typeof textOrWriterFunc === "string")
            writer.write(textOrWriterFunc);
        else if (textOrWriterFunc != null)
            textOrWriterFunc(writer);
    }
    getNewWriter(writer) {
        return new CodeBlockWriter__default.default(writer.getOptions());
    }
    getNewWriterWithQueuedChildIndentation(writer) {
        const newWriter = new CodeBlockWriter__default.default(writer.getOptions());
        newWriter.queueIndentationLevel(1);
        return newWriter;
    }
    getText(writer, textOrWriterFunc) {
        const newWriter = this.getNewWriter(writer);
        this.printTextOrWriterFunc(newWriter, textOrWriterFunc);
        return newWriter.toString();
    }
    getTextWithQueuedChildIndentation(writer, textOrWriterFunc) {
        const queuedChildIndentationWriter = this.getNewWriterWithQueuedChildIndentation(writer);
        this.printTextOrWriterFunc(queuedChildIndentationWriter, textOrWriterFunc);
        return queuedChildIndentationWriter.toString();
    }
}

class InitializerExpressionableNodeStructurePrinter extends Printer {
    printText(writer, structure) {
        const { initializer } = structure;
        if (initializer == null)
            return;
        const initializerText = this.getText(writer, initializer);
        if (!common.StringUtils.isNullOrWhitespace(initializerText)) {
            writer.hangingIndent(() => {
                writer.spaceIfLastNot();
                writer.write(`= ${initializerText}`);
            });
        }
    }
}

class ModifierableNodeStructurePrinter extends Printer {
    printText(writer, structure) {
        const scope = structure.scope;
        if (structure.isDefaultExport)
            writer.write("export default ");
        else if (structure.isExported)
            writer.write("export ");
        if (structure.hasDeclareKeyword)
            writer.write("declare ");
        if (scope != null)
            writer.write(`${scope} `);
        if (structure.isStatic)
            writer.write("static ");
        if (structure.hasOverrideKeyword)
            writer.write("override ");
        if (structure.isAbstract)
            writer.write("abstract ");
        if (structure.isAsync)
            writer.write("async ");
        if (structure.isReadonly)
            writer.write("readonly ");
        if (structure.hasAccessorKeyword)
            writer.write("accessor ");
    }
}

class ReturnTypedNodeStructurePrinter extends Printer {
    #alwaysWrite;
    constructor(alwaysWrite = false) {
        super();
        this.#alwaysWrite = alwaysWrite;
    }
    printText(writer, structure) {
        let { returnType } = structure;
        if (returnType == null && this.#alwaysWrite === false)
            return;
        returnType = returnType ?? "void";
        const returnTypeText = this.getText(writer, returnType);
        if (!common.StringUtils.isNullOrWhitespace(returnTypeText)) {
            writer.hangingIndent(() => {
                writer.write(`: ${returnTypeText}`);
            });
        }
    }
}

class TypedNodeStructurePrinter extends Printer {
    #separator;
    #alwaysWrite;
    constructor(separator, alwaysWrite = false) {
        super();
        this.#alwaysWrite = alwaysWrite;
        this.#separator = separator;
    }
    printText(writer, structure) {
        let { type } = structure;
        if (type == null && this.#alwaysWrite === false)
            return;
        type = type ?? "any";
        const typeText = this.getText(writer, type);
        if (!common.StringUtils.isNullOrWhitespace(typeText)) {
            writer.hangingIndent(() => {
                writer.write(`${this.#separator} ${typeText}`);
            });
        }
    }
}

class BlankLineFormattingStructuresPrinter extends Printer {
    #printer;
    constructor(printer) {
        super();
        this.#printer = printer;
    }
    printText(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            writer.conditionalBlankLine(i > 0);
            this.#printer.printText(writer, structures[i]);
        }
    }
}

class CommaSeparatedStructuresPrinter extends Printer {
    #printer;
    constructor(printer) {
        super();
        this.#printer = printer;
    }
    printText(writer, structures) {
        printTextWithSeparator(this.#printer, writer, structures, () => writer.spaceIfLastNot());
    }
}
function printTextWithSeparator(printer, writer, structures, separator) {
    if (structures == null)
        return;
    if (structures instanceof Function || typeof structures === "string")
        printer.printText(writer, structures);
    else {
        const commaAppendPositions = new Array(structures.length);
        for (let i = 0; i < structures.length; i++) {
            if (i > 0)
                separator();
            const structure = structures[i];
            const startPos = writer.getLength();
            printer.printText(writer, structure);
            const pos = getAppendCommaPos(WriterUtils.getLastCharactersToPos(writer, startPos));
            commaAppendPositions[i] = pos === -1 ? false : pos + startPos;
        }
        let foundFirst = false;
        for (let i = commaAppendPositions.length - 1; i >= 0; i--) {
            const pos = commaAppendPositions[i];
            if (pos === false)
                continue;
            else if (!foundFirst)
                foundFirst = true;
            else
                writer.unsafeInsert(pos, ",");
        }
    }
}

class CommaNewLineSeparatedStructuresPrinter extends Printer {
    #printer;
    constructor(printer) {
        super();
        this.#printer = printer;
    }
    printText(writer, structures) {
        printTextWithSeparator(this.#printer, writer, structures, () => writer.newLineIfLastNot());
    }
}

class NewLineFormattingStructuresPrinter extends Printer {
    #printer;
    constructor(printer) {
        super();
        this.#printer = printer;
    }
    printText(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            writer.conditionalNewLine(i > 0);
            this.#printer.printText(writer, structures[i]);
        }
    }
}

class SpaceFormattingStructuresPrinter extends Printer {
    #printer;
    constructor(printer) {
        super();
        this.#printer = printer;
    }
    printText(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            writer.conditionalWrite(i > 0, " ");
            this.#printer.printText(writer, structures[i]);
        }
    }
}

class NodePrinter extends Printer {
    factory;
    constructor(factory) {
        super();
        this.factory = factory;
    }
    printTextWithoutTrivia(writer, structure) {
        this.printTextInternal(writer, structure);
    }
    printText(writer, structure) {
        this.printLeadingTrivia(writer, structure);
        writer.closeComment();
        this.printTextInternal(writer, structure);
        this.printTrailingTrivia(writer, structure);
    }
    printLeadingTrivia(writer, structure) {
        const leadingTrivia = structure?.leadingTrivia;
        if (leadingTrivia) {
            this.#printTrivia(writer, leadingTrivia);
            if (writer.isInComment())
                writer.closeComment();
        }
    }
    printTrailingTrivia(writer, structure) {
        const trailingTrivia = structure?.trailingTrivia;
        if (trailingTrivia != null)
            this.#printTrivia(writer, trailingTrivia);
    }
    #printTrivia(writer, trivia) {
        if (trivia instanceof Array) {
            for (let i = 0; i < trivia.length; i++) {
                this.printTextOrWriterFunc(writer, trivia[i]);
                if (i !== trivia.length - 1)
                    writer.newLineIfLastNot();
            }
        }
        else {
            this.printTextOrWriterFunc(writer, trivia);
        }
    }
}

class GetAndSetAccessorStructurePrinter {
    #getAccessorPrinter;
    #setAccessorPrinter;
    constructor(getAccessorPrinter, setAccessorPrinter) {
        this.#getAccessorPrinter = getAccessorPrinter;
        this.#setAccessorPrinter = setAccessorPrinter;
    }
    printGetAndSet(writer, getAccessors, setAccessors, isAmbient) {
        getAccessors = [...getAccessors ?? []];
        setAccessors = [...setAccessors ?? []];
        for (const getAccessor of getAccessors) {
            this.#conditionalSeparator(writer, isAmbient);
            this.#getAccessorPrinter.printText(writer, getAccessor);
            const setAccessorIndex = setAccessors.findIndex(item => item.name === getAccessor.name);
            if (setAccessorIndex >= 0) {
                this.#conditionalSeparator(writer, isAmbient);
                this.#setAccessorPrinter.printText(writer, setAccessors[setAccessorIndex]);
                setAccessors.splice(setAccessorIndex, 1);
            }
        }
        for (const setAccessor of setAccessors) {
            this.#conditionalSeparator(writer, isAmbient);
            this.#setAccessorPrinter.printText(writer, setAccessor);
        }
    }
    #conditionalSeparator(writer, isAmbient) {
        if (writer.isAtStartOfFirstLineOfBlock())
            return;
        if (isAmbient)
            writer.newLine();
        else
            writer.blankLine();
    }
}

class ClassDeclarationStructurePrinter extends NodePrinter {
    #options;
    #multipleWriter = new BlankLineFormattingStructuresPrinter(this);
    constructor(factory, options) {
        super(factory);
        this.#options = options;
    }
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        const isAmbient = structure.hasDeclareKeyword || this.#options.isAmbient;
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forDecorator().printTexts(writer, structure.decorators);
        this.#printHeader(writer, structure);
        writer.inlineBlock(() => {
            this.factory.forPropertyDeclaration().printTexts(writer, structure.properties);
            this.#printStaticBlocks(writer, structure);
            this.#printCtors(writer, structure, isAmbient);
            this.#printGetAndSet(writer, structure, isAmbient);
            if (!common.ArrayUtils.isNullOrEmpty(structure.methods)) {
                this.#conditionalSeparator(writer, isAmbient);
                this.factory.forMethodDeclaration({ isAmbient }).printTexts(writer, structure.methods);
            }
        });
    }
    #printHeader(writer, structure) {
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(`class`);
        if (!common.StringUtils.isNullOrWhitespace(structure.name))
            writer.space().write(structure.name);
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        writer.space();
        writer.hangingIndent(() => {
            if (structure.extends != null) {
                const extendsText = this.getText(writer, structure.extends);
                if (!common.StringUtils.isNullOrWhitespace(extendsText))
                    writer.write(`extends ${extendsText} `);
            }
            if (structure.implements != null) {
                const implementsText = structure.implements instanceof Array
                    ? structure.implements.map(i => this.getText(writer, i)).join(", ")
                    : this.getText(writer, structure.implements);
                if (!common.StringUtils.isNullOrWhitespace(implementsText))
                    writer.write(`implements ${implementsText} `);
            }
        });
    }
    #printCtors(writer, structure, isAmbient) {
        if (common.ArrayUtils.isNullOrEmpty(structure.ctors))
            return;
        for (const ctor of structure.ctors) {
            this.#conditionalSeparator(writer, isAmbient);
            this.factory.forConstructorDeclaration({ isAmbient }).printText(writer, ctor);
        }
    }
    #printStaticBlocks(writer, structure) {
        if (common.ArrayUtils.isNullOrEmpty(structure.staticBlocks))
            return;
        for (const block of structure.staticBlocks) {
            this.#conditionalSeparator(writer, false);
            this.factory.forClassStaticBlockDeclaration().printText(writer, block);
        }
    }
    #printGetAndSet(writer, structure, isAmbient) {
        if (structure.getAccessors == null && structure.setAccessors == null)
            return;
        const getAccessorWriter = this.factory.forGetAccessorDeclaration({ isAmbient });
        const setAccessorWriter = this.factory.forSetAccessorDeclaration({ isAmbient });
        const combinedPrinter = new GetAndSetAccessorStructurePrinter(getAccessorWriter, setAccessorWriter);
        combinedPrinter.printGetAndSet(writer, structure.getAccessors, structure.setAccessors, isAmbient);
    }
    #conditionalSeparator(writer, isAmbient) {
        if (writer.isAtStartOfFirstLineOfBlock())
            return;
        if (isAmbient)
            writer.newLine();
        else
            writer.blankLine();
    }
}

exports.StructureKind = void 0;
(function (StructureKind) {
    StructureKind[StructureKind["ImportAttribute"] = 0] = "ImportAttribute";
    StructureKind[StructureKind["CallSignature"] = 1] = "CallSignature";
    StructureKind[StructureKind["Class"] = 2] = "Class";
    StructureKind[StructureKind["ClassStaticBlock"] = 3] = "ClassStaticBlock";
    StructureKind[StructureKind["ConstructSignature"] = 4] = "ConstructSignature";
    StructureKind[StructureKind["Constructor"] = 5] = "Constructor";
    StructureKind[StructureKind["ConstructorOverload"] = 6] = "ConstructorOverload";
    StructureKind[StructureKind["Decorator"] = 7] = "Decorator";
    StructureKind[StructureKind["Enum"] = 8] = "Enum";
    StructureKind[StructureKind["EnumMember"] = 9] = "EnumMember";
    StructureKind[StructureKind["ExportAssignment"] = 10] = "ExportAssignment";
    StructureKind[StructureKind["ExportDeclaration"] = 11] = "ExportDeclaration";
    StructureKind[StructureKind["ExportSpecifier"] = 12] = "ExportSpecifier";
    StructureKind[StructureKind["Function"] = 13] = "Function";
    StructureKind[StructureKind["FunctionOverload"] = 14] = "FunctionOverload";
    StructureKind[StructureKind["GetAccessor"] = 15] = "GetAccessor";
    StructureKind[StructureKind["ImportDeclaration"] = 16] = "ImportDeclaration";
    StructureKind[StructureKind["ImportSpecifier"] = 17] = "ImportSpecifier";
    StructureKind[StructureKind["IndexSignature"] = 18] = "IndexSignature";
    StructureKind[StructureKind["Interface"] = 19] = "Interface";
    StructureKind[StructureKind["JsxAttribute"] = 20] = "JsxAttribute";
    StructureKind[StructureKind["JsxSpreadAttribute"] = 21] = "JsxSpreadAttribute";
    StructureKind[StructureKind["JsxElement"] = 22] = "JsxElement";
    StructureKind[StructureKind["JsxSelfClosingElement"] = 23] = "JsxSelfClosingElement";
    StructureKind[StructureKind["JSDoc"] = 24] = "JSDoc";
    StructureKind[StructureKind["JSDocTag"] = 25] = "JSDocTag";
    StructureKind[StructureKind["Method"] = 26] = "Method";
    StructureKind[StructureKind["MethodOverload"] = 27] = "MethodOverload";
    StructureKind[StructureKind["MethodSignature"] = 28] = "MethodSignature";
    StructureKind[StructureKind["Module"] = 29] = "Module";
    StructureKind[StructureKind["Parameter"] = 30] = "Parameter";
    StructureKind[StructureKind["Property"] = 31] = "Property";
    StructureKind[StructureKind["PropertyAssignment"] = 32] = "PropertyAssignment";
    StructureKind[StructureKind["PropertySignature"] = 33] = "PropertySignature";
    StructureKind[StructureKind["SetAccessor"] = 34] = "SetAccessor";
    StructureKind[StructureKind["ShorthandPropertyAssignment"] = 35] = "ShorthandPropertyAssignment";
    StructureKind[StructureKind["SourceFile"] = 36] = "SourceFile";
    StructureKind[StructureKind["SpreadAssignment"] = 37] = "SpreadAssignment";
    StructureKind[StructureKind["TypeAlias"] = 38] = "TypeAlias";
    StructureKind[StructureKind["TypeParameter"] = 39] = "TypeParameter";
    StructureKind[StructureKind["VariableDeclaration"] = 40] = "VariableDeclaration";
    StructureKind[StructureKind["VariableStatement"] = 41] = "VariableStatement";
})(exports.StructureKind || (exports.StructureKind = {}));

const Structure = {
    hasName(structure) {
        return typeof structure.name === "string";
    },
    isCallSignature(structure) {
        return structure?.kind === exports.StructureKind.CallSignature;
    },
    isJSDocable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.CallSignature:
            case exports.StructureKind.Class:
            case exports.StructureKind.ClassStaticBlock:
            case exports.StructureKind.ConstructorOverload:
            case exports.StructureKind.Constructor:
            case exports.StructureKind.ConstructSignature:
            case exports.StructureKind.Enum:
            case exports.StructureKind.EnumMember:
            case exports.StructureKind.ExportAssignment:
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.IndexSignature:
            case exports.StructureKind.Interface:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.MethodSignature:
            case exports.StructureKind.Module:
            case exports.StructureKind.Property:
            case exports.StructureKind.PropertySignature:
            case exports.StructureKind.SetAccessor:
            case exports.StructureKind.TypeAlias:
            case exports.StructureKind.VariableStatement:
                return true;
            default:
                return false;
        }
    },
    isSignatured(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.CallSignature:
            case exports.StructureKind.ConstructorOverload:
            case exports.StructureKind.Constructor:
            case exports.StructureKind.ConstructSignature:
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.MethodSignature:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isParametered(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.CallSignature:
            case exports.StructureKind.ConstructorOverload:
            case exports.StructureKind.Constructor:
            case exports.StructureKind.ConstructSignature:
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.MethodSignature:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isReturnTyped(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.CallSignature:
            case exports.StructureKind.ConstructorOverload:
            case exports.StructureKind.Constructor:
            case exports.StructureKind.ConstructSignature:
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.IndexSignature:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.MethodSignature:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isTypeParametered(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.CallSignature:
            case exports.StructureKind.Class:
            case exports.StructureKind.ConstructorOverload:
            case exports.StructureKind.Constructor:
            case exports.StructureKind.ConstructSignature:
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.Interface:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.MethodSignature:
            case exports.StructureKind.SetAccessor:
            case exports.StructureKind.TypeAlias:
                return true;
            default:
                return false;
        }
    },
    isClass(structure) {
        return structure?.kind === exports.StructureKind.Class;
    },
    isClassLikeDeclarationBase(structure) {
        return structure?.kind === exports.StructureKind.Class;
    },
    isNameable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Class:
            case exports.StructureKind.Function:
                return true;
            default:
                return false;
        }
    },
    isImplementsClauseable(structure) {
        return structure?.kind === exports.StructureKind.Class;
    },
    isDecoratable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Class:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.Method:
            case exports.StructureKind.Parameter:
            case exports.StructureKind.Property:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isAbstractable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Class:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.Property:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isAmbientable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Class:
            case exports.StructureKind.Enum:
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.Interface:
            case exports.StructureKind.Module:
            case exports.StructureKind.Property:
            case exports.StructureKind.TypeAlias:
            case exports.StructureKind.VariableStatement:
                return true;
            default:
                return false;
        }
    },
    isExportable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Class:
            case exports.StructureKind.Enum:
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.Interface:
            case exports.StructureKind.Module:
            case exports.StructureKind.TypeAlias:
            case exports.StructureKind.VariableStatement:
                return true;
            default:
                return false;
        }
    },
    isClassStaticBlock(structure) {
        return structure?.kind === exports.StructureKind.ClassStaticBlock;
    },
    isStatemented(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.ClassStaticBlock:
            case exports.StructureKind.Constructor:
            case exports.StructureKind.Function:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.Method:
            case exports.StructureKind.Module:
            case exports.StructureKind.SetAccessor:
            case exports.StructureKind.SourceFile:
                return true;
            default:
                return false;
        }
    },
    isConstructorDeclarationOverload(structure) {
        return structure?.kind === exports.StructureKind.ConstructorOverload;
    },
    isScoped(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.ConstructorOverload:
            case exports.StructureKind.Constructor:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.Property:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isConstructor(structure) {
        return structure?.kind === exports.StructureKind.Constructor;
    },
    isFunctionLike(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Constructor:
            case exports.StructureKind.Function:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.Method:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isConstructSignature(structure) {
        return structure?.kind === exports.StructureKind.ConstructSignature;
    },
    isDecorator(structure) {
        return structure?.kind === exports.StructureKind.Decorator;
    },
    isEnum(structure) {
        return structure?.kind === exports.StructureKind.Enum;
    },
    isNamed(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Enum:
            case exports.StructureKind.Interface:
            case exports.StructureKind.ShorthandPropertyAssignment:
            case exports.StructureKind.TypeAlias:
            case exports.StructureKind.TypeParameter:
                return true;
            default:
                return false;
        }
    },
    isEnumMember(structure) {
        return structure?.kind === exports.StructureKind.EnumMember;
    },
    isPropertyNamed(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.EnumMember:
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.Method:
            case exports.StructureKind.MethodSignature:
            case exports.StructureKind.PropertyAssignment:
            case exports.StructureKind.Property:
            case exports.StructureKind.PropertySignature:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isInitializerExpressionable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.EnumMember:
            case exports.StructureKind.Parameter:
            case exports.StructureKind.Property:
            case exports.StructureKind.PropertySignature:
            case exports.StructureKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    },
    isExportAssignment(structure) {
        return structure?.kind === exports.StructureKind.ExportAssignment;
    },
    isExportDeclaration(structure) {
        return structure?.kind === exports.StructureKind.ExportDeclaration;
    },
    isExportSpecifier(structure) {
        return structure?.kind === exports.StructureKind.ExportSpecifier;
    },
    isFunctionDeclarationOverload(structure) {
        return structure?.kind === exports.StructureKind.FunctionOverload;
    },
    isAsyncable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
                return true;
            default:
                return false;
        }
    },
    isGeneratorable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.FunctionOverload:
            case exports.StructureKind.Function:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
                return true;
            default:
                return false;
        }
    },
    isFunction(structure) {
        return structure?.kind === exports.StructureKind.Function;
    },
    isGetAccessor(structure) {
        return structure?.kind === exports.StructureKind.GetAccessor;
    },
    isStaticable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.GetAccessor:
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.Property:
            case exports.StructureKind.SetAccessor:
                return true;
            default:
                return false;
        }
    },
    isImportAttribute(structure) {
        return structure?.kind === exports.StructureKind.ImportAttribute;
    },
    isImportAttributeNamed(structure) {
        return structure?.kind === exports.StructureKind.ImportAttribute;
    },
    isImportDeclaration(structure) {
        return structure?.kind === exports.StructureKind.ImportDeclaration;
    },
    isImportSpecifier(structure) {
        return structure?.kind === exports.StructureKind.ImportSpecifier;
    },
    isIndexSignature(structure) {
        return structure?.kind === exports.StructureKind.IndexSignature;
    },
    isReadonlyable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.IndexSignature:
            case exports.StructureKind.Parameter:
            case exports.StructureKind.Property:
            case exports.StructureKind.PropertySignature:
                return true;
            default:
                return false;
        }
    },
    isInterface(structure) {
        return structure?.kind === exports.StructureKind.Interface;
    },
    isExtendsClauseable(structure) {
        return structure?.kind === exports.StructureKind.Interface;
    },
    isTypeElementMembered(structure) {
        return structure?.kind === exports.StructureKind.Interface;
    },
    isJSDoc(structure) {
        return structure?.kind === exports.StructureKind.JSDoc;
    },
    isJSDocTag(structure) {
        return structure?.kind === exports.StructureKind.JSDocTag;
    },
    isJsxAttribute(structure) {
        return structure?.kind === exports.StructureKind.JsxAttribute;
    },
    isJsxElement(structure) {
        return structure?.kind === exports.StructureKind.JsxElement;
    },
    isJsxSelfClosingElement(structure) {
        return structure?.kind === exports.StructureKind.JsxSelfClosingElement;
    },
    isJsxTagNamed(structure) {
        return structure?.kind === exports.StructureKind.JsxSelfClosingElement;
    },
    isJsxAttributed(structure) {
        return structure?.kind === exports.StructureKind.JsxSelfClosingElement;
    },
    isJsxSpreadAttribute(structure) {
        return structure?.kind === exports.StructureKind.JsxSpreadAttribute;
    },
    isMethodDeclarationOverload(structure) {
        return structure?.kind === exports.StructureKind.MethodOverload;
    },
    isQuestionTokenable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.MethodSignature:
            case exports.StructureKind.Parameter:
            case exports.StructureKind.Property:
            case exports.StructureKind.PropertySignature:
                return true;
            default:
                return false;
        }
    },
    isOverrideable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.MethodOverload:
            case exports.StructureKind.Method:
            case exports.StructureKind.Parameter:
            case exports.StructureKind.Property:
                return true;
            default:
                return false;
        }
    },
    isMethod(structure) {
        return structure?.kind === exports.StructureKind.Method;
    },
    isMethodSignature(structure) {
        return structure?.kind === exports.StructureKind.MethodSignature;
    },
    isModule(structure) {
        return structure?.kind === exports.StructureKind.Module;
    },
    isModuleNamed(structure) {
        return structure?.kind === exports.StructureKind.Module;
    },
    isParameter(structure) {
        return structure?.kind === exports.StructureKind.Parameter;
    },
    isBindingNamed(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Parameter:
            case exports.StructureKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    },
    isTyped(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Parameter:
            case exports.StructureKind.Property:
            case exports.StructureKind.PropertySignature:
            case exports.StructureKind.TypeAlias:
            case exports.StructureKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    },
    isScopeable(structure) {
        return structure?.kind === exports.StructureKind.Parameter;
    },
    isPropertyAssignment(structure) {
        return structure?.kind === exports.StructureKind.PropertyAssignment;
    },
    isProperty(structure) {
        return structure?.kind === exports.StructureKind.Property;
    },
    isExclamationTokenable(structure) {
        switch (structure?.kind) {
            case exports.StructureKind.Property:
            case exports.StructureKind.VariableDeclaration:
                return true;
            default:
                return false;
        }
    },
    isPropertySignature(structure) {
        return structure?.kind === exports.StructureKind.PropertySignature;
    },
    isSetAccessor(structure) {
        return structure?.kind === exports.StructureKind.SetAccessor;
    },
    isShorthandPropertyAssignment(structure) {
        return structure?.kind === exports.StructureKind.ShorthandPropertyAssignment;
    },
    isSourceFile(structure) {
        return structure?.kind === exports.StructureKind.SourceFile;
    },
    isSpreadAssignment(structure) {
        return structure?.kind === exports.StructureKind.SpreadAssignment;
    },
    isExpressioned(structure) {
        return structure?.kind === exports.StructureKind.SpreadAssignment;
    },
    isTypeAlias(structure) {
        return structure?.kind === exports.StructureKind.TypeAlias;
    },
    isTypeParameter(structure) {
        return structure?.kind === exports.StructureKind.TypeParameter;
    },
    isVariableDeclaration(structure) {
        return structure?.kind === exports.StructureKind.VariableDeclaration;
    },
    isVariableStatement(structure) {
        return structure?.kind === exports.StructureKind.VariableStatement;
    }
};

function forEachStructureChild(structure, callback) {
    if (common.ArrayUtils.isReadonlyArray(structure)) {
        for (const item of structure) {
            const result = callback(item);
            if (result)
                return result;
        }
        return undefined;
    }
    switch (structure.kind) {
        case exports.StructureKind.CallSignature:
            return forCallSignatureDeclaration(structure, callback);
        case exports.StructureKind.Class:
            return forClassDeclaration(structure, callback);
        case exports.StructureKind.ClassStaticBlock:
            return forClassStaticBlockDeclaration(structure, callback);
        case exports.StructureKind.ConstructorOverload:
            return forConstructorDeclarationOverload(structure, callback);
        case exports.StructureKind.Constructor:
            return forConstructorDeclaration(structure, callback);
        case exports.StructureKind.ConstructSignature:
            return forConstructSignatureDeclaration(structure, callback);
        case exports.StructureKind.Enum:
            return forEnumDeclaration(structure, callback);
        case exports.StructureKind.EnumMember:
            return forEnumMember(structure, callback);
        case exports.StructureKind.ExportAssignment:
            return forExportAssignment(structure, callback);
        case exports.StructureKind.ExportDeclaration:
            return forExportDeclaration(structure, callback);
        case exports.StructureKind.FunctionOverload:
            return forFunctionDeclarationOverload(structure, callback);
        case exports.StructureKind.Function:
            return forFunctionDeclaration(structure, callback);
        case exports.StructureKind.GetAccessor:
            return forGetAccessorDeclaration(structure, callback);
        case exports.StructureKind.ImportDeclaration:
            return forImportDeclaration(structure, callback);
        case exports.StructureKind.IndexSignature:
            return forIndexSignatureDeclaration(structure, callback);
        case exports.StructureKind.Interface:
            return forInterfaceDeclaration(structure, callback);
        case exports.StructureKind.JSDoc:
            return forJSDoc(structure, callback);
        case exports.StructureKind.JsxElement:
            return forJsxElement(structure, callback);
        case exports.StructureKind.JsxSelfClosingElement:
            return forJsxSelfClosingElement(structure, callback);
        case exports.StructureKind.MethodOverload:
            return forMethodDeclarationOverload(structure, callback);
        case exports.StructureKind.Method:
            return forMethodDeclaration(structure, callback);
        case exports.StructureKind.MethodSignature:
            return forMethodSignature(structure, callback);
        case exports.StructureKind.Module:
            return forModuleDeclaration(structure, callback);
        case exports.StructureKind.Parameter:
            return forParameterDeclaration(structure, callback);
        case exports.StructureKind.Property:
            return forPropertyDeclaration(structure, callback);
        case exports.StructureKind.PropertySignature:
            return forPropertySignature(structure, callback);
        case exports.StructureKind.SetAccessor:
            return forSetAccessorDeclaration(structure, callback);
        case exports.StructureKind.SourceFile:
            return forSourceFile(structure, callback);
        case exports.StructureKind.TypeAlias:
            return forTypeAliasDeclaration(structure, callback);
        case exports.StructureKind.VariableStatement:
            return forVariableStatement(structure, callback);
        default:
            return undefined;
    }
}
function forCallSignatureDeclaration(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forSignaturedDeclaration(structure, callback)
        || forTypeParameteredNode(structure, callback);
}
function forJSDocableNode(structure, callback) {
    return forAllIfStructure(structure.docs, callback, exports.StructureKind.JSDoc);
}
function forSignaturedDeclaration(structure, callback) {
    return forParameteredNode(structure, callback);
}
function forParameteredNode(structure, callback) {
    return forAll(structure.parameters, callback, exports.StructureKind.Parameter);
}
function forTypeParameteredNode(structure, callback) {
    return forAllIfStructure(structure.typeParameters, callback, exports.StructureKind.TypeParameter);
}
function forClassDeclaration(structure, callback) {
    return forClassLikeDeclarationBase(structure, callback);
}
function forClassLikeDeclarationBase(structure, callback) {
    return forDecoratableNode(structure, callback)
        || forTypeParameteredNode(structure, callback)
        || forJSDocableNode(structure, callback)
        || forAll(structure.ctors, callback, exports.StructureKind.Constructor)
        || forAll(structure.staticBlocks, callback, exports.StructureKind.ClassStaticBlock)
        || forAll(structure.properties, callback, exports.StructureKind.Property)
        || forAll(structure.getAccessors, callback, exports.StructureKind.GetAccessor)
        || forAll(structure.setAccessors, callback, exports.StructureKind.SetAccessor)
        || forAll(structure.methods, callback, exports.StructureKind.Method);
}
function forDecoratableNode(structure, callback) {
    return forAll(structure.decorators, callback, exports.StructureKind.Decorator);
}
function forClassStaticBlockDeclaration(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forStatementedNode(structure, callback);
}
function forStatementedNode(structure, callback) {
    return forAllUnknownKindIfStructure(structure.statements, callback);
}
function forConstructorDeclarationOverload(structure, callback) {
    return forSignaturedDeclaration(structure, callback)
        || forTypeParameteredNode(structure, callback)
        || forJSDocableNode(structure, callback);
}
function forConstructorDeclaration(structure, callback) {
    return forFunctionLikeDeclaration(structure, callback)
        || forAll(structure.overloads, callback, exports.StructureKind.ConstructorOverload);
}
function forFunctionLikeDeclaration(structure, callback) {
    return forSignaturedDeclaration(structure, callback)
        || forTypeParameteredNode(structure, callback)
        || forJSDocableNode(structure, callback)
        || forStatementedNode(structure, callback);
}
function forConstructSignatureDeclaration(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forSignaturedDeclaration(structure, callback)
        || forTypeParameteredNode(structure, callback);
}
function forEnumDeclaration(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forAll(structure.members, callback, exports.StructureKind.EnumMember);
}
function forEnumMember(structure, callback) {
    return forJSDocableNode(structure, callback);
}
function forExportAssignment(structure, callback) {
    return forJSDocableNode(structure, callback);
}
function forExportDeclaration(structure, callback) {
    return forAllIfStructure(structure.namedExports, callback, exports.StructureKind.ExportSpecifier)
        || forAll(structure.attributes, callback, exports.StructureKind.ImportAttribute);
}
function forFunctionDeclarationOverload(structure, callback) {
    return forSignaturedDeclaration(structure, callback)
        || forTypeParameteredNode(structure, callback)
        || forJSDocableNode(structure, callback);
}
function forFunctionDeclaration(structure, callback) {
    return forFunctionLikeDeclaration(structure, callback)
        || forAll(structure.overloads, callback, exports.StructureKind.FunctionOverload);
}
function forGetAccessorDeclaration(structure, callback) {
    return forDecoratableNode(structure, callback)
        || forFunctionLikeDeclaration(structure, callback);
}
function forImportDeclaration(structure, callback) {
    return forAllIfStructure(structure.namedImports, callback, exports.StructureKind.ImportSpecifier)
        || forAll(structure.attributes, callback, exports.StructureKind.ImportAttribute);
}
function forIndexSignatureDeclaration(structure, callback) {
    return forJSDocableNode(structure, callback);
}
function forInterfaceDeclaration(structure, callback) {
    return forTypeParameteredNode(structure, callback)
        || forJSDocableNode(structure, callback)
        || forTypeElementMemberedNode(structure, callback);
}
function forTypeElementMemberedNode(structure, callback) {
    return forAll(structure.callSignatures, callback, exports.StructureKind.CallSignature)
        || forAll(structure.constructSignatures, callback, exports.StructureKind.ConstructSignature)
        || forAll(structure.getAccessors, callback, exports.StructureKind.GetAccessor)
        || forAll(structure.indexSignatures, callback, exports.StructureKind.IndexSignature)
        || forAll(structure.methods, callback, exports.StructureKind.MethodSignature)
        || forAll(structure.properties, callback, exports.StructureKind.PropertySignature)
        || forAll(structure.setAccessors, callback, exports.StructureKind.SetAccessor);
}
function forJSDoc(structure, callback) {
    return forAll(structure.tags, callback, exports.StructureKind.JSDocTag);
}
function forJsxElement(structure, callback) {
    return forAllUnknownKindIfStructure(structure.attributes, callback)
        || forAllUnknownKindIfStructure(structure.children, callback);
}
function forJsxSelfClosingElement(structure, callback) {
    return forJsxAttributedNode(structure, callback);
}
function forJsxAttributedNode(structure, callback) {
    return forAllUnknownKindIfStructure(structure.attributes, callback);
}
function forMethodDeclarationOverload(structure, callback) {
    return forSignaturedDeclaration(structure, callback)
        || forTypeParameteredNode(structure, callback)
        || forJSDocableNode(structure, callback);
}
function forMethodDeclaration(structure, callback) {
    return forDecoratableNode(structure, callback)
        || forFunctionLikeDeclaration(structure, callback)
        || forAll(structure.overloads, callback, exports.StructureKind.MethodOverload);
}
function forMethodSignature(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forSignaturedDeclaration(structure, callback)
        || forTypeParameteredNode(structure, callback);
}
function forModuleDeclaration(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forStatementedNode(structure, callback);
}
function forParameterDeclaration(structure, callback) {
    return forDecoratableNode(structure, callback);
}
function forPropertyDeclaration(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forDecoratableNode(structure, callback);
}
function forPropertySignature(structure, callback) {
    return forJSDocableNode(structure, callback);
}
function forSetAccessorDeclaration(structure, callback) {
    return forDecoratableNode(structure, callback)
        || forFunctionLikeDeclaration(structure, callback);
}
function forSourceFile(structure, callback) {
    return forStatementedNode(structure, callback);
}
function forTypeAliasDeclaration(structure, callback) {
    return forTypeParameteredNode(structure, callback)
        || forJSDocableNode(structure, callback);
}
function forVariableStatement(structure, callback) {
    return forJSDocableNode(structure, callback)
        || forAll(structure.declarations, callback, exports.StructureKind.VariableDeclaration);
}
function forAll(structures, callback, kind) {
    if (structures == null)
        return;
    for (const structure of structures) {
        const result = callback(ensureKind(structure, kind));
        if (result)
            return result;
    }
    return undefined;
}
function forAllIfStructure(values, callback, kind) {
    if (values == null || !(values instanceof Array))
        return;
    for (const value of values) {
        if (isStructure(value)) {
            const result = callback(ensureKind(value, kind));
            if (result)
                return result;
        }
    }
    return undefined;
}
function forAllUnknownKindIfStructure(values, callback) {
    if (values == null || !(values instanceof Array))
        return;
    for (const value of values) {
        if (isStructure(value)) {
            const result = callback(value);
            if (result)
                return result;
        }
    }
    return undefined;
}
function ensureKind(structure, kind) {
    if (structure.kind == null)
        structure.kind = kind;
    return structure;
}
function isStructure(value) {
    return value != null && typeof value.kind === "number";
}

function isLastNonWhitespaceCharCloseBrace(writer) {
    return writer.iterateLastCharCodes(charCode => {
        if (charCode === CharCodes.CLOSE_BRACE)
            return true;
        else if (common.StringUtils.isWhitespaceCharCode(charCode))
            return undefined;
        else
            return false;
    }) || false;
}

class ClassMemberStructurePrinter extends Printer {
    #options;
    #factory;
    constructor(factory, options) {
        super();
        this.#factory = factory;
        this.#options = options;
    }
    printTexts(writer, members) {
        if (members == null)
            return;
        if (typeof members === "string" || members instanceof Function)
            this.printText(writer, members);
        else {
            for (const member of members) {
                if (isLastNonWhitespaceCharCloseBrace(writer))
                    writer.blankLineIfLastNot();
                else if (!writer.isAtStartOfFirstLineOfBlock())
                    writer.newLineIfLastNot();
                this.printText(writer, member);
            }
        }
    }
    printText(writer, member) {
        if (typeof member === "string" || member instanceof Function || member == null) {
            this.printTextOrWriterFunc(writer, member);
            return;
        }
        switch (member.kind) {
            case exports.StructureKind.Method:
                if (!this.#options.isAmbient)
                    ensureBlankLine();
                this.#factory.forMethodDeclaration(this.#options).printText(writer, member);
                break;
            case exports.StructureKind.Property:
                this.#factory.forPropertyDeclaration().printText(writer, member);
                break;
            case exports.StructureKind.GetAccessor:
                if (!this.#options.isAmbient)
                    ensureBlankLine();
                this.#factory.forGetAccessorDeclaration(this.#options).printText(writer, member);
                break;
            case exports.StructureKind.SetAccessor:
                if (!this.#options.isAmbient)
                    ensureBlankLine();
                this.#factory.forSetAccessorDeclaration(this.#options).printText(writer, member);
                break;
            case exports.StructureKind.Constructor:
                if (!this.#options.isAmbient)
                    ensureBlankLine();
                this.#factory.forConstructorDeclaration(this.#options).printText(writer, member);
                break;
            case exports.StructureKind.ClassStaticBlock:
                ensureBlankLine();
                this.#factory.forClassStaticBlockDeclaration().printText(writer, member);
                break;
            default:
                common.errors.throwNotImplementedForNeverValueError(member);
        }
        function ensureBlankLine() {
            if (!writer.isAtStartOfFirstLineOfBlock())
                writer.blankLineIfLastNot();
        }
    }
}

class ClassStaticBlockDeclarationStructurePrinter extends NodePrinter {
    constructor(factory) {
        super(factory);
    }
    printTexts(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            if (i > 0)
                writer.blankLine();
            this.printText(writer, structures[i]);
        }
    }
    printTextInternal(writer, structure) {
        writer.write("static");
        writer.space().inlineBlock(() => {
            this.factory.forStatementedNode({ isAmbient: false }).printText(writer, structure);
        });
    }
}

class ConstructorDeclarationStructurePrinter extends NodePrinter {
    #options;
    constructor(factory, options) {
        super(factory);
        this.#options = options;
    }
    printTexts(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            if (i > 0) {
                if (this.#options.isAmbient)
                    writer.newLine();
                else
                    writer.blankLine();
            }
            this.printText(writer, structures[i]);
        }
    }
    printTextInternal(writer, structure) {
        this.#printOverloads(writer, getOverloadStructures());
        this.#printHeader(writer, structure);
        if (this.#options.isAmbient)
            writer.write(";");
        else {
            writer.space().inlineBlock(() => {
                this.factory.forStatementedNode(this.#options).printText(writer, structure);
            });
        }
        function getOverloadStructures() {
            const overloads = common.ObjectUtils.clone(structure.overloads);
            if (overloads == null || overloads.length === 0)
                return;
            for (const overload of overloads)
                setValueIfUndefined(overload, "scope", structure.scope);
            return overloads;
        }
    }
    #printOverloads(writer, structures) {
        if (structures == null || structures.length === 0)
            return;
        for (const structure of structures) {
            this.printOverload(writer, structure);
            writer.newLine();
        }
    }
    printOverload(writer, structure) {
        this.printLeadingTrivia(writer, structure);
        this.#printHeader(writer, structure);
        writer.write(";");
        this.printTrailingTrivia(writer, structure);
    }
    #printHeader(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write("constructor");
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
    }
}

class GetAccessorDeclarationStructurePrinter extends NodePrinter {
    #options;
    #multipleWriter;
    constructor(factory, options) {
        super(factory);
        this.#options = options;
        this.#multipleWriter = this.#options.isAmbient ? new NewLineFormattingStructuresPrinter(this) : new BlankLineFormattingStructuresPrinter(this);
    }
    printTexts(writer, structures) {
        if (structures != null)
            this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forDecorator().printTexts(writer, structure.decorators);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(`get ${structure.name}`);
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
        this.factory.forReturnTypedNode().printText(writer, structure);
        if (this.#options.isAmbient || structure.isAbstract)
            writer.write(";");
        else {
            writer.spaceIfLastNot().inlineBlock(() => {
                this.factory.forStatementedNode(this.#options).printText(writer, structure);
            });
        }
    }
}

class MethodDeclarationStructurePrinter extends NodePrinter {
    #options;
    constructor(factory, options) {
        super(factory);
        this.#options = options;
    }
    printTexts(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            if (i > 0) {
                if (this.#options.isAmbient)
                    writer.newLine();
                else
                    writer.blankLine();
            }
            this.printText(writer, structures[i]);
        }
    }
    printTextInternal(writer, structure) {
        this.#printOverloads(writer, structure.name, getOverloadStructures());
        this.#printHeader(writer, structure.name, structure);
        if (this.#options.isAmbient || structure.isAbstract)
            writer.write(";");
        else {
            writer.spaceIfLastNot().inlineBlock(() => {
                this.factory.forStatementedNode(this.#options).printText(writer, structure);
            });
        }
        function getOverloadStructures() {
            const overloads = common.ObjectUtils.clone(structure.overloads);
            if (overloads == null || overloads.length === 0)
                return;
            for (const overload of overloads) {
                setValueIfUndefined(overload, "scope", structure.scope);
                setValueIfUndefined(overload, "isStatic", structure.isStatic);
                setValueIfUndefined(overload, "isAbstract", structure.isAbstract);
                setValueIfUndefined(overload, "hasQuestionToken", structure.hasQuestionToken);
            }
            return overloads;
        }
    }
    #printOverloads(writer, name, structures) {
        if (structures == null || structures.length === 0)
            return;
        for (const structure of structures) {
            this.printOverload(writer, name, structure);
            writer.newLine();
        }
    }
    printOverload(writer, name, structure) {
        this.printLeadingTrivia(writer, structure);
        this.#printHeader(writer, name, structure);
        writer.write(";");
        this.printTrailingTrivia(writer, structure);
    }
    #printHeader(writer, name, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        if (structure.decorators != null)
            this.factory.forDecorator().printTexts(writer, structure.decorators);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.conditionalWrite(structure.isGenerator, "*");
        writer.write(name);
        writer.conditionalWrite(structure.hasQuestionToken, "?");
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
        this.factory.forReturnTypedNode().printText(writer, structure);
    }
}

class PropertyDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forDecorator().printTexts(writer, structure.decorators);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(structure.name);
        writer.conditionalWrite(structure.hasQuestionToken, "?");
        writer.conditionalWrite(structure.hasExclamationToken && !structure.hasQuestionToken, "!");
        this.factory.forTypedNode(":").printText(writer, structure);
        this.factory.forInitializerExpressionableNode().printText(writer, structure);
        writer.write(";");
    }
}

class SetAccessorDeclarationStructurePrinter extends NodePrinter {
    #options;
    #multipleWriter;
    constructor(factory, options) {
        super(factory);
        this.#options = options;
        this.#multipleWriter = this.#options.isAmbient ? new NewLineFormattingStructuresPrinter(this) : new BlankLineFormattingStructuresPrinter(this);
    }
    printTexts(writer, structures) {
        if (structures != null)
            this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forDecorator().printTexts(writer, structure.decorators);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(`set ${structure.name}`);
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
        this.factory.forReturnTypedNode().printText(writer, structure);
        if (this.#options.isAmbient || structure.isAbstract)
            writer.write(";");
        else {
            writer.spaceIfLastNot().inlineBlock(() => {
                this.factory.forStatementedNode(this.#options).printText(writer, structure);
            });
        }
    }
}

class StringStructurePrinter extends Printer {
    printText(writer, textOrWriterFunc) {
        if (typeof textOrWriterFunc === "string")
            writer.write(textOrWriterFunc);
        else
            textOrWriterFunc(writer);
    }
}

class DecoratorStructurePrinter extends NodePrinter {
    printTexts(writer, structures) {
        this.#printMultiple(writer, structures, () => writer.newLine());
    }
    printTextsInline(writer, structures) {
        this.#printMultiple(writer, structures, () => writer.space());
    }
    printTextInternal(writer, structure) {
        writer.write(`@${structure.name}`);
        this.#printTypeArguments(writer, structure);
        this.#printArguments(writer, structure);
    }
    #printTypeArguments(writer, structure) {
        if (structure.typeArguments == null || structure.typeArguments.length === 0)
            return;
        writer.write("<");
        for (let i = 0; i < structure.typeArguments.length; i++) {
            writer.conditionalWrite(i > 0, ", ");
            writer.write(this.getTextWithQueuedChildIndentation(writer, structure.typeArguments[i]));
        }
        writer.write(">");
    }
    #printArguments(writer, structure) {
        if (structure.arguments == null)
            return;
        writer.write("(");
        const args = structure.arguments instanceof Array ? structure.arguments : [structure.arguments];
        for (let i = 0; i < args.length; i++) {
            writer.conditionalWrite(i > 0, ", ");
            writer.write(this.getTextWithQueuedChildIndentation(writer, args[i]));
        }
        writer.write(")");
    }
    #printMultiple(writer, structures, separator) {
        if (structures == null || structures.length === 0)
            return;
        for (const structure of structures) {
            this.printText(writer, structure);
            separator();
        }
    }
}

class JSDocStructurePrinter extends NodePrinter {
    printDocs(writer, structures) {
        if (structures == null)
            return;
        for (const structure of structures) {
            this.printText(writer, structure);
            writer.newLine();
        }
    }
    printTextInternal(writer, structure) {
        const text = getText(this);
        const lines = text.split(/\r?\n/);
        const startsWithNewLine = lines[0].length === 0;
        const isSingleLine = lines.length <= 1;
        const startIndex = startsWithNewLine ? 1 : 0;
        writer.write("/**");
        if (isSingleLine)
            writer.space();
        else
            writer.newLine();
        if (isSingleLine)
            writer.write(lines[startIndex]);
        else {
            for (let i = startIndex; i < lines.length; i++) {
                writer.write(` *`);
                if (lines[i].length > 0)
                    writer.write(` ${lines[i]}`);
                writer.newLine();
            }
        }
        writer.spaceIfLastNot();
        writer.write("*/");
        function getText(jsdocPrinter) {
            if (typeof structure === "string")
                return structure;
            const tempWriter = jsdocPrinter.getNewWriter(writer);
            if (typeof structure === "function")
                structure(tempWriter);
            else {
                if (structure.description)
                    printTextFromStringOrWriter(tempWriter, structure.description);
                if (structure.tags && structure.tags.length > 0) {
                    if (tempWriter.getLength() > 0)
                        tempWriter.newLine();
                    jsdocPrinter.factory.forJSDocTag({ printStarsOnNewLine: false }).printTexts(tempWriter, structure.tags);
                }
            }
            return tempWriter.toString();
        }
    }
}

class JSDocTagStructurePrinter extends NodePrinter {
    #options;
    constructor(factory, options) {
        super(factory);
        this.#options = options;
    }
    printTexts(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            if (i > 0) {
                writer.newLine();
                writer.conditionalWrite(this.#options.printStarsOnNewLine, " * ");
            }
            this.printText(writer, structures[i]);
        }
    }
    printTextInternal(writer, structure) {
        const text = getText(this);
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            if (i > 0) {
                writer.newLine();
                if (this.#options.printStarsOnNewLine)
                    writer.write(` *`);
            }
            if (lines[i].length > 0) {
                if (this.#options.printStarsOnNewLine && i > 0)
                    writer.space();
                writer.write(lines[i]);
            }
        }
        function getText(tagPrinter) {
            if (typeof structure === "string")
                return structure;
            const tempWriter = tagPrinter.getNewWriter(writer);
            if (typeof structure === "function")
                structure(tempWriter);
            else {
                if (structure.text)
                    printTextFromStringOrWriter(tempWriter, structure.text);
                const currentText = tempWriter.toString();
                tempWriter.unsafeInsert(0, `@${structure.tagName}` + (currentText.length > 0 && !common.StringUtils.startsWithNewLine(currentText) ? " " : ""));
            }
            return tempWriter.toString();
        }
    }
}

class EnumDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new BlankLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.conditionalWrite(structure.isConst, "const ");
        writer.write(`enum ${structure.name} `).inlineBlock(() => {
            this.factory.forEnumMember().printTexts(writer, structure.members);
        });
    }
}

class EnumMemberStructurePrinter extends NodePrinter {
    #multipleWriter = new CommaNewLineSeparatedStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        if (structure instanceof Function) {
            structure(writer);
            return;
        }
        else if (typeof structure === "string") {
            writer.write(structure);
            return;
        }
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        if (isValidVariableName(structure.name) || common.StringUtils.isQuoted(structure.name))
            writer.write(structure.name);
        else
            writer.quote(structure.name);
        if (typeof structure.value === "string") {
            const { value } = structure;
            writer.hangingIndent(() => writer.write(` = `).quote(value));
        }
        else if (typeof structure.value === "number")
            writer.write(` = ${structure.value}`);
        else
            this.factory.forInitializerExpressionableNode().printText(writer, structure);
    }
}

class ObjectLiteralExpressionPropertyStructurePrinter extends Printer {
    #factory;
    #multipleWriter = new CommaNewLineSeparatedStructuresPrinter(this);
    #options = { isAmbient: false };
    constructor(factory) {
        super();
        this.#factory = factory;
    }
    printTexts(writer, members) {
        this.#multipleWriter.printText(writer, members);
    }
    printText(writer, member) {
        if (typeof member === "string" || member instanceof Function || member == null) {
            this.printTextOrWriterFunc(writer, member);
            return;
        }
        switch (member.kind) {
            case exports.StructureKind.PropertyAssignment:
                this.#factory.forPropertyAssignment().printText(writer, member);
                break;
            case exports.StructureKind.ShorthandPropertyAssignment:
                this.#factory.forShorthandPropertyAssignment().printText(writer, member);
                break;
            case exports.StructureKind.SpreadAssignment:
                this.#factory.forSpreadAssignment().printText(writer, member);
                break;
            case exports.StructureKind.Method:
                this.#factory.forMethodDeclaration(this.#options).printText(writer, member);
                break;
            case exports.StructureKind.GetAccessor:
                this.#factory.forGetAccessorDeclaration(this.#options).printText(writer, member);
                break;
            case exports.StructureKind.SetAccessor:
                this.#factory.forSetAccessorDeclaration(this.#options).printText(writer, member);
                break;
            default:
                common.errors.throwNotImplementedForNeverValueError(member);
        }
    }
}

class PropertyAssignmentStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        writer.hangingIndent(() => {
            writer.write(`${structure.name}: `);
            printTextFromStringOrWriter(writer, structure.initializer);
        });
    }
}

class ShorthandPropertyAssignmentStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        writer.write(`${structure.name}`);
    }
}

class SpreadAssignmentStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        writer.hangingIndent(() => {
            writer.write("...");
            printTextFromStringOrWriter(writer, structure.expression);
        });
    }
}

class FunctionDeclarationStructurePrinter extends NodePrinter {
    #options;
    constructor(factory, options) {
        super(factory);
        this.#options = options;
    }
    printTexts(writer, structures) {
        if (structures == null)
            return;
        for (let i = 0; i < structures.length; i++) {
            const currentStructure = structures[i];
            if (i > 0) {
                const previousStructure = structures[i - 1];
                if (this.#options.isAmbient || previousStructure.hasDeclareKeyword && currentStructure.hasDeclareKeyword)
                    writer.newLine();
                else
                    writer.blankLine();
            }
            this.printText(writer, currentStructure);
        }
    }
    printTextInternal(writer, structure) {
        this.#printOverloads(writer, structure.name, getOverloadStructures());
        this.#printHeader(writer, structure.name, structure);
        if (this.#options.isAmbient || structure.hasDeclareKeyword)
            writer.write(";");
        else {
            writer.space().inlineBlock(() => {
                this.factory.forStatementedNode({ isAmbient: false }).printText(writer, structure);
            });
        }
        function getOverloadStructures() {
            const overloads = common.ObjectUtils.clone(structure.overloads);
            if (overloads == null || overloads.length === 0)
                return;
            for (const overload of overloads) {
                setValueIfUndefined(overload, "hasDeclareKeyword", structure.hasDeclareKeyword);
                setValueIfUndefined(overload, "isExported", structure.isExported);
                setValueIfUndefined(overload, "isDefaultExport", structure.isDefaultExport);
            }
            return overloads;
        }
    }
    #printOverloads(writer, name, structures) {
        if (structures == null || structures.length === 0)
            return;
        for (const structure of structures) {
            this.printOverload(writer, name, structure);
            writer.newLine();
        }
    }
    printOverload(writer, name, structure) {
        this.printLeadingTrivia(writer, structure);
        this.#printHeader(writer, name, structure);
        writer.write(";");
        this.printTrailingTrivia(writer, structure);
    }
    #printHeader(writer, name, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(`function`);
        writer.conditionalWrite(structure.isGenerator, "*");
        if (!common.StringUtils.isNullOrWhitespace(name))
            writer.write(` ${name}`);
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
        this.factory.forReturnTypedNode().printText(writer, structure);
    }
}

class ParameterDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new CommaSeparatedStructuresPrinter(this);
    printTextsWithParenthesis(writer, structures) {
        writer.write("(");
        if (structures != null)
            this.factory.forParameterDeclaration().printTexts(writer, structures);
        writer.write(`)`);
    }
    printTexts(writer, structures) {
        if (structures == null || structures.length === 0)
            return;
        writer.hangingIndent(() => {
            this.#multipleWriter.printText(writer, structures);
        });
    }
    printTextInternal(writer, structure) {
        if (structure.name == null) {
            throw new common.errors
                .NotImplementedError("Not implemented scenario where parameter declaration structure doesn't have a name. Please open an issue if you need this.");
        }
        this.factory.forDecorator().printTextsInline(writer, structure.decorators);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.conditionalWrite(structure.isRestParameter, "...");
        writer.write(structure.name);
        writer.conditionalWrite(structure.hasQuestionToken, "?");
        this.factory.forTypedNode(":", structure.hasQuestionToken).printText(writer, structure);
        this.factory.forInitializerExpressionableNode().printText(writer, structure);
    }
}

class CallSignatureDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
        this.factory.forReturnTypedNode(true).printText(writer, structure);
        writer.write(";");
    }
}

class ConstructSignatureDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        writer.write("new");
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
        this.factory.forReturnTypedNode().printText(writer, structure);
        writer.write(";");
    }
}

class IndexSignatureDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(`[${structure.keyName || "key"}: ${structure.keyType || "string"}]`);
        this.factory.forReturnTypedNode().printText(writer, structure);
        writer.write(";");
    }
}

class InterfaceDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new BlankLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(`interface ${structure.name}`);
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        writer.space();
        if (structure.extends != null) {
            const extendsText = structure.extends instanceof Array
                ? structure.extends.map(i => this.getText(writer, i)).join(", ")
                : this.getText(writer, structure.extends);
            if (!common.StringUtils.isNullOrWhitespace(extendsText))
                writer.hangingIndent(() => writer.write(`extends ${extendsText} `));
        }
        writer.inlineBlock(() => {
            this.factory.forTypeElementMemberedNode().printText(writer, structure);
        });
    }
}

class MethodSignatureStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        writer.write(structure.name);
        writer.conditionalWrite(structure.hasQuestionToken, "?");
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forParameterDeclaration().printTextsWithParenthesis(writer, structure.parameters);
        this.factory.forReturnTypedNode().printText(writer, structure);
        writer.write(";");
    }
}

class PropertySignatureStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(structure.name);
        writer.conditionalWrite(structure.hasQuestionToken, "?");
        this.factory.forTypedNode(":").printText(writer, structure);
        this.factory.forInitializerExpressionableNode().printText(writer, structure);
        writer.write(";");
    }
}

class TypeElementMemberedNodeStructurePrinter extends Printer {
    #factory;
    constructor(factory) {
        super();
        this.#factory = factory;
    }
    printText(writer, structure) {
        this.#factory.forCallSignatureDeclaration().printTexts(writer, structure.callSignatures);
        this.#conditionalSeparator(writer, structure.constructSignatures);
        this.#factory.forConstructSignatureDeclaration().printTexts(writer, structure.constructSignatures);
        this.#conditionalSeparator(writer, structure.indexSignatures);
        this.#factory.forIndexSignatureDeclaration().printTexts(writer, structure.indexSignatures);
        this.#printGetAndSet(writer, structure);
        this.#conditionalSeparator(writer, structure.properties);
        this.#factory.forPropertySignature().printTexts(writer, structure.properties);
        this.#conditionalSeparator(writer, structure.methods);
        this.#factory.forMethodSignature().printTexts(writer, structure.methods);
    }
    #printGetAndSet(writer, structure) {
        if (structure.getAccessors == null && structure.setAccessors == null)
            return;
        const getAccessorWriter = this.#factory.forGetAccessorDeclaration({ isAmbient: true });
        const setAccessorWriter = this.#factory.forSetAccessorDeclaration({ isAmbient: true });
        const combinedPrinter = new GetAndSetAccessorStructurePrinter(getAccessorWriter, setAccessorWriter);
        combinedPrinter.printGetAndSet(writer, structure.getAccessors, structure.setAccessors, true);
    }
    #conditionalSeparator(writer, structures) {
        if (!common.ArrayUtils.isNullOrEmpty(structures) && !writer.isAtStartOfFirstLineOfBlock())
            writer.newLine();
    }
}

class TypeElementMemberStructurePrinter extends Printer {
    #factory;
    constructor(factory) {
        super();
        this.#factory = factory;
    }
    printTexts(writer, members) {
        if (members == null)
            return;
        if (typeof members === "string" || members instanceof Function)
            this.printText(writer, members);
        else {
            for (const member of members) {
                if (isLastNonWhitespaceCharCloseBrace(writer))
                    writer.blankLineIfLastNot();
                else if (!writer.isAtStartOfFirstLineOfBlock())
                    writer.newLineIfLastNot();
                this.printText(writer, member);
            }
        }
    }
    printText(writer, members) {
        if (typeof members === "string" || members instanceof Function || members == null) {
            this.printTextOrWriterFunc(writer, members);
            return;
        }
        switch (members.kind) {
            case exports.StructureKind.PropertySignature:
                this.#factory.forPropertySignature().printText(writer, members);
                break;
            case exports.StructureKind.MethodSignature:
                this.#factory.forMethodSignature().printText(writer, members);
                break;
            case exports.StructureKind.CallSignature:
                this.#factory.forCallSignatureDeclaration().printText(writer, members);
                break;
            case exports.StructureKind.IndexSignature:
                this.#factory.forIndexSignatureDeclaration().printText(writer, members);
                break;
            case exports.StructureKind.ConstructSignature:
                this.#factory.forConstructSignatureDeclaration().printText(writer, members);
                break;
            default:
                common.errors.throwNotImplementedForNeverValueError(members);
        }
    }
}

class JsxAttributeDeciderStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        if (isJsxAttribute())
            this.factory.forJsxAttribute().printTextWithoutTrivia(writer, structure);
        else if (structure.kind === exports.StructureKind.JsxSpreadAttribute)
            this.factory.forJsxSpreadAttribute().printTextWithoutTrivia(writer, structure);
        else
            throw common.errors.throwNotImplementedForNeverValueError(structure);
        function isJsxAttribute(struct) {
            return structure.kind == null || structure.kind === exports.StructureKind.JsxAttribute;
        }
    }
}

class JsxAttributeStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        if (typeof structure.name === "object")
            this.factory.forJsxNamespacedName().printText(writer, structure.name);
        else
            writer.write(structure.name);
        if (structure.initializer != null)
            writer.write("=").write(structure.initializer);
    }
}

class JsxChildDeciderStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        if (isJsxElement(structure))
            this.factory.forJsxElement().printText(writer, structure);
        else if (structure.kind === exports.StructureKind.JsxSelfClosingElement)
            this.factory.forJsxSelfClosingElement().printText(writer, structure);
        else
            common.errors.throwNotImplementedForNeverValueError(structure);
        function isJsxElement(struct) {
            return struct.kind == null || struct.kind === exports.StructureKind.JsxElement;
        }
    }
}

class JsxElementStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        writer.hangingIndent(() => {
            writer.write(`<${structure.name}`);
            if (structure.attributes)
                this.#printAttributes(writer, structure.attributes);
            writer.write(">");
        });
        this.#printChildren(writer, structure.children);
        writer.write(`</${structure.name}>`);
    }
    #printAttributes(writer, attributes) {
        const attributePrinter = this.factory.forJsxAttributeDecider();
        for (const attrib of attributes) {
            writer.space();
            attributePrinter.printText(writer, attrib);
        }
    }
    #printChildren(writer, children) {
        if (children == null)
            return;
        writer.newLine();
        writer.indent(() => {
            for (const child of children) {
                this.factory.forJsxChildDecider().printText(writer, child);
                writer.newLine();
            }
        });
    }
}

class JsxNamespacedNameStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        writer.write(structure.namespace).write(":").write(structure.name);
    }
}

class JsxSelfClosingElementStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        writer.hangingIndent(() => {
            writer.write(`<${structure.name}`);
            if (structure.attributes)
                this.#printAttributes(writer, structure.attributes);
            writer.write(" />");
        });
    }
    #printAttributes(writer, attributes) {
        const attributePrinter = this.factory.forJsxAttributeDecider();
        for (const attrib of attributes) {
            writer.space();
            attributePrinter.printText(writer, attrib);
        }
    }
}

class JsxSpreadAttributeStructurePrinter extends NodePrinter {
    printTextInternal(writer, structure) {
        writer.hangingIndent(() => {
            writer.write("{");
            writer.write("...");
            writer.write(structure.expression);
            writer.write("}");
        });
    }
}

class ExportAssignmentStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        writer.write("export");
        if (structure.isExportEquals !== false)
            writer.write(" = ");
        else
            writer.write(" default ");
        writer.write(this.getTextWithQueuedChildIndentation(writer, structure.expression)).write(";");
    }
}

class ExportDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        const hasModuleSpecifier = structure.moduleSpecifier != null && structure.moduleSpecifier.length > 0;
        const hasNamedImport = structure.namedExports != null && structure.namedExports.length > 0;
        if (hasNamedImport && structure.namespaceExport != null)
            throw new common.errors.InvalidOperationError("An export declaration cannot have both a namespace export and a named export.");
        writer.write("export");
        if (structure.isTypeOnly)
            writer.write(" type");
        if (structure.namedExports != null && structure.namedExports.length > 0) {
            writer.space();
            this.factory.forNamedImportExportSpecifier().printTextsWithBraces(writer, structure.namedExports);
        }
        else if (structure.namespaceExport != null) {
            writer.write(" *");
            if (!common.StringUtils.isNullOrWhitespace(structure.namespaceExport))
                writer.write(` as ${structure.namespaceExport}`);
        }
        else if (!hasModuleSpecifier) {
            writer.write(" {")
                .conditionalWrite(this.factory.getFormatCodeSettings().insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces, " ")
                .write("}");
        }
        else {
            writer.write(` *`);
        }
        if (hasModuleSpecifier) {
            writer.write(" from ");
            writer.quote(structure.moduleSpecifier);
        }
        if (structure.attributes) {
            writer.space();
            this.factory.forImportAttribute().printAttributes(writer, structure.attributes);
        }
        writer.write(";");
    }
}

class ImportAttributeStructurePrinter extends NodePrinter {
    #multipleWriter = new CommaNewLineSeparatedStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printAttributes(writer, structures) {
        if (!structures)
            return;
        writer.write("with ");
        writer.inlineBlock(() => {
            this.printTexts(writer, structures);
        });
    }
    printTextInternal(writer, structure) {
        writer.write(structure.name);
        writer.write(": ");
        writer.quote(structure.value);
    }
}

class ImportDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        const hasNamedImport = structure.namedImports != null && structure.namedImports.length > 0;
        if (hasNamedImport && structure.namespaceImport != null)
            throw new common.errors.InvalidOperationError("An import declaration cannot have both a namespace import and a named import.");
        writer.write("import");
        if (structure.isTypeOnly)
            writer.write(" type");
        if (structure.defaultImport != null) {
            writer.write(` ${structure.defaultImport}`);
            writer.conditionalWrite(hasNamedImport || structure.namespaceImport != null, ",");
        }
        if (structure.namespaceImport != null)
            writer.write(` * as ${structure.namespaceImport}`);
        if (structure.namedImports != null && structure.namedImports.length > 0) {
            writer.space();
            this.factory.forNamedImportExportSpecifier().printTextsWithBraces(writer, structure.namedImports);
        }
        writer.conditionalWrite(structure.defaultImport != null || hasNamedImport || structure.namespaceImport != null, " from");
        writer.write(" ");
        writer.quote(structure.moduleSpecifier);
        if (structure.attributes) {
            writer.space();
            this.factory.forImportAttribute().printAttributes(writer, structure.attributes);
        }
        writer.write(";");
    }
}

class ModuleDeclarationStructurePrinter extends NodePrinter {
    #options;
    #blankLineFormattingWriter = new BlankLineFormattingStructuresPrinter(this);
    constructor(factory, options) {
        super(factory);
        this.#options = options;
    }
    printTexts(writer, structures) {
        this.#blankLineFormattingWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        structure = this.#validateAndGetStructure(structure);
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        if (structure.declarationKind == null || structure.declarationKind !== exports.ModuleDeclarationKind.Global)
            writer.write(`${structure.declarationKind || "namespace"} ${structure.name}`);
        else
            writer.write("global");
        if (structure.hasDeclareKeyword && common.StringUtils.isQuoted(structure.name.trim())
            && structure.hasOwnProperty(common.nameof(structure, "statements")) && structure.statements == null) {
            writer.write(";");
        }
        else {
            writer.write(" ");
            writer.inlineBlock(() => {
                this.factory.forStatementedNode({
                    isAmbient: structure.hasDeclareKeyword || this.#options.isAmbient,
                }).printText(writer, structure);
            });
        }
    }
    #validateAndGetStructure(structure) {
        if (common.StringUtils.isQuoted(structure.name.trim())) {
            if (structure.declarationKind === exports.ModuleDeclarationKind.Namespace) {
                throw new common.errors.InvalidOperationError(`Cannot print a namespace with quotes for namespace with name ${structure.name}. `
                    + `Use ModuleDeclarationKind.Module instead.`);
            }
            structure = common.ObjectUtils.clone(structure);
            setValueIfUndefined(structure, "hasDeclareKeyword", true);
            setValueIfUndefined(structure, "declarationKind", exports.ModuleDeclarationKind.Module);
        }
        return structure;
    }
}

class NamedImportExportSpecifierStructurePrinter extends NodePrinter {
    #multipleWriter = new CommaSeparatedStructuresPrinter(this);
    printTextsWithBraces(writer, structures) {
        const formatSettings = this.factory.getFormatCodeSettings();
        writer.write("{");
        const specifierWriter = this.getNewWriter(writer);
        this.printTexts(specifierWriter, structures);
        const specifierText = specifierWriter.toString();
        if (formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces && !common.StringUtils.startsWithNewLine(specifierText))
            writer.space();
        writer.write(specifierText);
        if (formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces && !common.StringUtils.endsWithNewLine(specifierText))
            writer.space();
        writer.write("}");
    }
    printTexts(writer, structures) {
        if (structures instanceof Function)
            this.printText(writer, structures);
        else
            this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        const specifierWriter = this.getNewWriterWithQueuedChildIndentation(writer);
        if (typeof structure === "string")
            specifierWriter.write(structure);
        else if (structure instanceof Function)
            structure(specifierWriter);
        else {
            if (structure.isTypeOnly)
                writer.write("type ");
            specifierWriter.write(structure.name);
            if (!common.StringUtils.isNullOrWhitespace(structure.alias)) {
                if (!specifierWriter.isLastNewLine())
                    specifierWriter.space();
                specifierWriter.write(`as ${structure.alias}`);
            }
        }
        writer.write(specifierWriter.toString());
    }
}

class SourceFileStructurePrinter extends NodePrinter {
    #options;
    constructor(factory, options) {
        super(factory);
        this.#options = options;
    }
    printTextInternal(writer, structure) {
        this.factory.forStatementedNode(this.#options).printText(writer, structure);
        writer.conditionalNewLine(!writer.isAtStartOfFirstLineOfBlock() && !writer.isLastNewLine());
    }
}

class StatementedNodeStructurePrinter extends Printer {
    #options;
    #factory;
    constructor(factory, options) {
        super();
        this.#factory = factory;
        this.#options = options;
    }
    printText(writer, structure) {
        this.#factory.forStatement(this.#options).printTexts(writer, structure.statements);
    }
}

class StatementStructurePrinter extends Printer {
    #options;
    #factory;
    constructor(factory, options) {
        super();
        this.#factory = factory;
        this.#options = options;
    }
    printTexts(writer, statements) {
        if (statements == null)
            return;
        if (typeof statements === "string" || statements instanceof Function)
            this.printText(writer, statements);
        else {
            for (const statement of statements) {
                if (isLastNonWhitespaceCharCloseBrace(writer))
                    writer.blankLineIfLastNot();
                else if (!writer.isAtStartOfFirstLineOfBlock())
                    writer.newLineIfLastNot();
                this.printText(writer, statement);
            }
        }
    }
    printText(writer, statement) {
        if (typeof statement === "string" || statement instanceof Function || statement == null) {
            this.printTextOrWriterFunc(writer, statement);
            return;
        }
        switch (statement.kind) {
            case exports.StructureKind.Function:
                if (!this.#options.isAmbient)
                    ensureBlankLine();
                this.#factory.forFunctionDeclaration(this.#options).printText(writer, statement);
                break;
            case exports.StructureKind.Class:
                ensureBlankLine();
                this.#factory.forClassDeclaration(this.#options).printText(writer, statement);
                break;
            case exports.StructureKind.Interface:
                ensureBlankLine();
                this.#factory.forInterfaceDeclaration().printText(writer, statement);
                break;
            case exports.StructureKind.TypeAlias:
                this.#factory.forTypeAliasDeclaration().printText(writer, statement);
                break;
            case exports.StructureKind.VariableStatement:
                this.#factory.forVariableStatement().printText(writer, statement);
                break;
            case exports.StructureKind.ImportDeclaration:
                this.#factory.forImportDeclaration().printText(writer, statement);
                break;
            case exports.StructureKind.Module:
                ensureBlankLine();
                this.#factory.forModuleDeclaration(this.#options).printText(writer, statement);
                break;
            case exports.StructureKind.Enum:
                ensureBlankLine();
                this.#factory.forEnumDeclaration().printText(writer, statement);
                break;
            case exports.StructureKind.ExportDeclaration:
                this.#factory.forExportDeclaration().printText(writer, statement);
                break;
            case exports.StructureKind.ExportAssignment:
                this.#factory.forExportAssignment().printText(writer, statement);
                break;
            default:
                common.errors.throwNotImplementedForNeverValueError(statement);
        }
        function ensureBlankLine() {
            if (!writer.isAtStartOfFirstLineOfBlock())
                writer.blankLineIfLastNot();
        }
    }
}

exports.VariableDeclarationKind = void 0;
(function (VariableDeclarationKind) {
    VariableDeclarationKind["Var"] = "var";
    VariableDeclarationKind["Let"] = "let";
    VariableDeclarationKind["Const"] = "const";
    VariableDeclarationKind["AwaitUsing"] = "await using";
    VariableDeclarationKind["Using"] = "using";
})(exports.VariableDeclarationKind || (exports.VariableDeclarationKind = {}));

class VariableStatementStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        writer.hangingIndent(() => {
            this.factory.forModifierableNode().printText(writer, structure);
            writer.write(`${structure.declarationKind || exports.VariableDeclarationKind.Let} `);
            if (structure.declarations.length === 0)
                throw new Error("You must provide at least one declaration when inserting a variable statement.");
            this.factory.forVariableDeclaration().printTexts(writer, structure.declarations);
            writer.write(";");
        });
    }
}

class TypeAliasDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new NewLineFormattingStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        this.factory.forJSDoc().printDocs(writer, structure.docs);
        this.factory.forModifierableNode().printText(writer, structure);
        writer.write(`type ${structure.name}`);
        this.factory.forTypeParameterDeclaration().printTextsWithBrackets(writer, structure.typeParameters);
        this.factory.forTypedNode(" =").printText(writer, structure);
        writer.write(";");
    }
}

class TypeParameterDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new CommaSeparatedStructuresPrinter(this);
    printTextsWithBrackets(writer, structures) {
        if (structures == null || structures.length === 0)
            return;
        writer.write("<");
        this.printTexts(writer, structures);
        writer.write(">");
    }
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        if (typeof structure === "string") {
            writer.write(structure);
            return;
        }
        writer.hangingIndent(() => {
            if (structure.isConst)
                writer.write("const ");
            if (structure.variance != null) {
                if ((structure.variance & exports.TypeParameterVariance.In) !== 0)
                    writer.write("in ");
                if ((structure.variance & exports.TypeParameterVariance.Out) !== 0)
                    writer.write("out ");
            }
            writer.write(structure.name);
            if (structure.constraint != null) {
                const constraintText = this.getText(writer, structure.constraint);
                if (!common.StringUtils.isNullOrWhitespace(constraintText))
                    writer.write(` extends ${constraintText}`);
            }
            if (structure.default != null) {
                const defaultText = this.getText(writer, structure.default);
                if (!common.StringUtils.isNullOrWhitespace(defaultText))
                    writer.write(` = ${defaultText}`);
            }
        });
    }
}

class VariableDeclarationStructurePrinter extends NodePrinter {
    #multipleWriter = new CommaSeparatedStructuresPrinter(this);
    printTexts(writer, structures) {
        this.#multipleWriter.printText(writer, structures);
    }
    printTextInternal(writer, structure) {
        writer.write(structure.name);
        writer.conditionalWrite(structure.hasExclamationToken, "!");
        this.factory.forTypedNode(":").printText(writer, structure);
        this.factory.forInitializerExpressionableNode().printText(writer, structure);
    }
}

function ExtendsClauseableNode(Base) {
    return class extends Base {
        getExtends() {
            const extendsClause = this.getHeritageClauseByKind(common.SyntaxKind.ExtendsKeyword);
            return extendsClause?.getTypeNodes() ?? [];
        }
        addExtends(text) {
            return this.insertExtends(this.getExtends().length, text);
        }
        insertExtends(index, texts) {
            const originalExtends = this.getExtends();
            const wasStringInput = typeof texts === "string";
            if (typeof texts === "string") {
                common.errors.throwIfWhitespaceOrNotString(texts, "texts");
                texts = [texts];
            }
            else if (texts.length === 0) {
                return [];
            }
            const writer = this._getWriterWithQueuedChildIndentation();
            const structurePrinter = new CommaSeparatedStructuresPrinter(new StringStructurePrinter());
            structurePrinter.printText(writer, texts);
            index = verifyAndGetIndex(index, originalExtends.length);
            if (originalExtends.length > 0) {
                const extendsClause = this.getHeritageClauseByKindOrThrow(common.SyntaxKind.ExtendsKeyword);
                insertIntoCommaSeparatedNodes({
                    parent: extendsClause.getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
                    currentNodes: originalExtends,
                    insertIndex: index,
                    newText: writer.toString(),
                    useTrailingCommas: false,
                });
            }
            else {
                const openBraceToken = this.getFirstChildByKindOrThrow(common.SyntaxKind.OpenBraceToken);
                const openBraceStart = openBraceToken.getStart();
                const isLastSpace = /\s/.test(this.getSourceFile().getFullText()[openBraceStart - 1]);
                let insertText = `extends ${writer.toString()} `;
                if (!isLastSpace)
                    insertText = " " + insertText;
                insertIntoParentTextRange({
                    parent: this,
                    insertPos: openBraceStart,
                    newText: insertText,
                });
            }
            const newExtends = this.getExtends();
            return wasStringInput ? newExtends[index] : getNodesToReturn(originalExtends, newExtends, index, false);
        }
        removeExtends(implementsNodeOrIndex) {
            const extendsClause = this.getHeritageClauseByKind(common.SyntaxKind.ExtendsKeyword);
            if (extendsClause == null)
                throw new common.errors.InvalidOperationError("Cannot remove an extends when none exist.");
            extendsClause.removeExpression(implementsNodeOrIndex);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.extends != null) {
                this.getExtends().forEach(e => this.removeExtends(e));
                this.addExtends(structure.extends);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                extends: this.getExtends().map(e => e.getText()),
            });
        }
    };
}

function GeneratorableNode(Base) {
    return class extends Base {
        isGenerator() {
            return this.compilerNode.asteriskToken != null;
        }
        getAsteriskToken() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.asteriskToken);
        }
        getAsteriskTokenOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getAsteriskToken(), message ?? "Expected to find an asterisk token.", this);
        }
        setIsGenerator(value) {
            const asteriskToken = this.getAsteriskToken();
            const isSet = asteriskToken != null;
            if (isSet === value)
                return this;
            if (asteriskToken == null) {
                insertIntoParentTextRange({
                    insertPos: getAsteriskInsertPos(this),
                    parent: this,
                    newText: "*",
                });
            }
            else {
                removeChildrenWithFormatting({
                    children: [asteriskToken],
                    getSiblingFormatting: () => FormattingKind.Space,
                });
            }
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.isGenerator != null)
                this.setIsGenerator(structure.isGenerator);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                isGenerator: this.isGenerator(),
            });
        }
    };
}
function getAsteriskInsertPos(node) {
    if (node.getKind() === common.SyntaxKind.FunctionDeclaration)
        return node.getFirstChildByKindOrThrow(common.SyntaxKind.FunctionKeyword).getEnd();
    const namedNode = node;
    if (namedNode.getName == null)
        throw new common.errors.NotImplementedError("Expected a name node for a non-function declaration.");
    return namedNode.getNameNode().getStart();
}

function HeritageClauseableNode(Base) {
    return class extends Base {
        getHeritageClauses() {
            const heritageClauses = this.compilerNode.heritageClauses;
            return heritageClauses?.map(c => this._getNodeFromCompilerNode(c)) ?? [];
        }
        getHeritageClauseByKindOrThrow(kind, message) {
            return common.errors.throwIfNullOrUndefined(this.getHeritageClauseByKind(kind), message ?? (() => `Expected to have heritage clause of kind ${common.getSyntaxKindName(kind)}.`), this);
        }
        getHeritageClauseByKind(kind) {
            return this.getHeritageClauses().find(c => c.compilerNode.token === kind);
        }
    };
}

function ImplementsClauseableNode(Base) {
    return class extends Base {
        getImplements() {
            const implementsClause = this.getHeritageClauseByKind(common.SyntaxKind.ImplementsKeyword);
            return implementsClause?.getTypeNodes() ?? [];
        }
        addImplements(text) {
            return this.insertImplements(this.getImplements().length, text);
        }
        insertImplements(index, texts) {
            const originalImplements = this.getImplements();
            const wasStringInput = typeof texts === "string";
            if (typeof texts === "string") {
                common.errors.throwIfWhitespaceOrNotString(texts, "texts");
                texts = [texts];
            }
            else if (texts.length === 0) {
                return [];
            }
            const writer = this._getWriterWithQueuedChildIndentation();
            const structurePrinter = new CommaSeparatedStructuresPrinter(new StringStructurePrinter());
            structurePrinter.printText(writer, texts);
            const heritageClauses = this.getHeritageClauses();
            index = verifyAndGetIndex(index, originalImplements.length);
            if (originalImplements.length > 0) {
                const implementsClause = this.getHeritageClauseByKindOrThrow(common.SyntaxKind.ImplementsKeyword);
                insertIntoCommaSeparatedNodes({
                    parent: implementsClause.getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
                    currentNodes: originalImplements,
                    insertIndex: index,
                    newText: writer.toString(),
                    useTrailingCommas: false,
                });
            }
            else {
                const openBraceToken = this.getFirstChildByKindOrThrow(common.SyntaxKind.OpenBraceToken);
                const openBraceStart = openBraceToken.getStart();
                const isLastSpace = /\s/.test(this.getSourceFile().getFullText()[openBraceStart - 1]);
                let insertText = `implements ${writer.toString()} `;
                if (!isLastSpace)
                    insertText = " " + insertText;
                insertIntoParentTextRange({
                    parent: heritageClauses.length === 0 ? this : heritageClauses[0].getParentSyntaxListOrThrow(),
                    insertPos: openBraceStart,
                    newText: insertText,
                });
            }
            const newImplements = this.getImplements();
            return wasStringInput ? newImplements[0] : getNodesToReturn(originalImplements, newImplements, index, false);
        }
        removeImplements(implementsNodeOrIndex) {
            const implementsClause = this.getHeritageClauseByKind(common.SyntaxKind.ImplementsKeyword);
            if (implementsClause == null)
                throw new common.errors.InvalidOperationError("Cannot remove an implements when none exist.");
            implementsClause.removeExpression(implementsNodeOrIndex);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.implements != null) {
                this.getImplements().forEach(expr => this.removeImplements(expr));
                this.addImplements(structure.implements);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                implements: this.getImplements().map(node => node.getText()),
            });
        }
    };
}

function InitializerExpressionGetableNode(Base) {
    return class extends Base {
        hasInitializer() {
            return this.compilerNode.initializer != null;
        }
        getInitializerIfKindOrThrow(kind, message) {
            return common.errors.throwIfNullOrUndefined(this.getInitializerIfKind(kind), message ?? `Expected to find an initializer of kind '${common.getSyntaxKindName(kind)}'.`, this);
        }
        getInitializerIfKind(kind) {
            const initializer = this.getInitializer();
            if (initializer != null && initializer.getKind() !== kind)
                return undefined;
            return initializer;
        }
        getInitializerOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getInitializer(), message ?? "Expected to find an initializer.", this);
        }
        getInitializer() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.initializer);
        }
    };
}

function InitializerExpressionableNode(Base) {
    return apply(InitializerExpressionGetableNode(Base));
}
function apply(Base) {
    return class extends Base {
        removeInitializer() {
            const initializer = this.getInitializer();
            if (initializer == null)
                return this;
            const previousSibling = initializer.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.EqualsToken);
            removeChildren({
                children: [previousSibling, initializer],
                removePrecedingSpaces: true,
            });
            return this;
        }
        setInitializer(textOrWriterFunction) {
            const text = getTextFromStringOrWriter(this._getWriterWithQueuedChildIndentation(), textOrWriterFunction);
            common.errors.throwIfWhitespaceOrNotString(text, "textOrWriterFunction");
            if (this.hasInitializer())
                this.removeInitializer();
            const semiColonToken = this.getLastChildIfKind(common.SyntaxKind.SemicolonToken);
            insertIntoParentTextRange({
                insertPos: semiColonToken != null ? semiColonToken.getPos() : this.getEnd(),
                parent: this,
                newText: ` = ${text}`,
            });
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.initializer != null)
                this.setInitializer(structure.initializer);
            else if (structure.hasOwnProperty(common.nameof(structure, "initializer")))
                this.removeInitializer();
            return this;
        }
        getStructure() {
            const initializer = this.getInitializer();
            return callBaseGetStructure(Base.prototype, this, {
                initializer: initializer ? initializer.getText() : undefined,
            });
        }
    };
}

function JSDocableNode(Base) {
    return class extends Base {
        getJsDocs() {
            const nodes = this.compilerNode.jsDoc;
            return nodes?.map(n => this._getNodeFromCompilerNode(n)) ?? [];
        }
        addJsDoc(structure) {
            return this.addJsDocs([structure])[0];
        }
        addJsDocs(structures) {
            return this.insertJsDocs(getEndIndexFromArray(this.compilerNode.jsDoc), structures);
        }
        insertJsDoc(index, structure) {
            return this.insertJsDocs(index, [structure])[0];
        }
        insertJsDocs(index, structures) {
            if (common.ArrayUtils.isNullOrEmpty(structures))
                return [];
            const writer = this._getWriterWithQueuedIndentation();
            const structurePrinter = this._context.structurePrinterFactory.forJSDoc();
            structurePrinter.printDocs(writer, structures);
            writer.write("");
            const code = writer.toString();
            const nodes = this.getJsDocs();
            index = verifyAndGetIndex(index, nodes.length);
            const insertPos = index === nodes.length ? this.getStart() : nodes[index].getStart();
            insertIntoParentTextRange({
                insertPos,
                parent: this,
                newText: code,
            });
            return getNodesToReturn(nodes, this.getJsDocs(), index, false);
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.docs != null) {
                this.getJsDocs().forEach(doc => doc.remove());
                this.addJsDocs(structure.docs);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                docs: this.getJsDocs().map(jsdoc => jsdoc.getStructure()),
            });
        }
    };
}

function LiteralLikeNode(Base) {
    return class extends Base {
        getLiteralText() {
            return this.compilerNode.text;
        }
        isTerminated() {
            return !(this.compilerNode.isUnterminated || false);
        }
        hasExtendedUnicodeEscape() {
            return this.compilerNode.hasExtendedUnicodeEscape || false;
        }
    };
}

function ModifierableNode(Base) {
    return class extends Base {
        getModifiers() {
            return this.getCompilerModifiers().map(m => this._getNodeFromCompilerNode(m));
        }
        getFirstModifierByKindOrThrow(kind, message) {
            return common.errors.throwIfNullOrUndefined(this.getFirstModifierByKind(kind), message ?? (() => `Expected a modifier of syntax kind: ${common.getSyntaxKindName(kind)}`), this);
        }
        getFirstModifierByKind(kind) {
            for (const modifier of this.getCompilerModifiers()) {
                if (modifier.kind === kind)
                    return this._getNodeFromCompilerNode(modifier);
            }
            return undefined;
        }
        hasModifier(textOrKind) {
            if (typeof textOrKind === "string")
                return this.getModifiers().some(m => m.getText() === textOrKind);
            else
                return this.getCompilerModifiers().some(m => m.kind === textOrKind);
        }
        toggleModifier(text, value) {
            if (value == null)
                value = !this.hasModifier(text);
            if (value)
                this.addModifier(text);
            else
                this.removeModifier(text);
            return this;
        }
        addModifier(text) {
            const rawModifiers = this.getModifiers();
            const modifiers = this.getModifiers().filter(m => m.getKind() !== common.SyntaxKind.Decorator);
            const existingModifier = modifiers.find(m => m.getText() === text);
            if (existingModifier != null)
                return existingModifier;
            const insertPos = getInsertPos(this);
            let startPos;
            let newText;
            const isFirstModifier = modifiers.length === 0 || insertPos === modifiers[0].getStart();
            if (isFirstModifier) {
                newText = text + " ";
                startPos = insertPos;
            }
            else {
                newText = " " + text;
                startPos = insertPos + 1;
            }
            insertIntoParentTextRange({
                parent: rawModifiers.length === 0 ? this : rawModifiers[0].getParentSyntaxListOrThrow(),
                insertPos,
                newText,
            });
            return this.getModifiers().find(m => m.getStart() === startPos);
            function getInsertPos(node) {
                let pos = getInitialInsertPos();
                for (const addAfterText of getAddAfterModifierTexts(text)) {
                    for (let i = 0; i < modifiers.length; i++) {
                        const modifier = modifiers[i];
                        if (modifier.getText() === addAfterText) {
                            if (pos < modifier.getEnd())
                                pos = modifier.getEnd();
                            break;
                        }
                    }
                }
                return pos;
                function getInitialInsertPos() {
                    if (modifiers.length > 0)
                        return modifiers[0].getStart();
                    if (node.getKind() === common.SyntaxKind.ArrowFunction)
                        return node.getStart();
                    for (const child of node._getChildrenIterator()) {
                        if (child.getKind() === common.SyntaxKind.SyntaxList || common.ts.isJSDocCommentContainingNode(child.compilerNode))
                            continue;
                        return child.getStart();
                    }
                    return node.getStart();
                }
            }
        }
        removeModifier(text) {
            const modifiers = this.getModifiers();
            const modifier = modifiers.find(m => m.getText() === text);
            if (modifier == null)
                return false;
            removeChildren({
                children: [modifiers.length === 1 ? modifier.getParentSyntaxListOrThrow() : modifier],
                removeFollowingSpaces: true,
            });
            return true;
        }
        getCompilerModifiers() {
            return this.compilerNode.modifiers ?? [];
        }
    };
}
function getAddAfterModifierTexts(text) {
    switch (text) {
        case "export":
            return [];
        case "public":
        case "protected":
        case "private":
            return [];
        case "default":
            return ["export"];
        case "const":
            return ["export"];
        case "declare":
            return ["export", "default"];
        case "static":
            return ["public", "protected", "private"];
        case "override":
            return ["public", "private", "protected", "static"];
        case "abstract":
            return ["export", "default", "declare", "public", "private", "protected", "static", "override"];
        case "async":
            return ["export", "default", "declare", "public", "private", "protected", "static", "override", "abstract"];
        case "readonly":
            return ["export", "default", "declare", "public", "private", "protected", "static", "override", "abstract"];
        case "out":
            return ["const", "in"];
        case "in":
            return ["const"];
        case "accessor":
            return ["public", "private", "protected", "declare", "override", "static", "abstract", "readonly"];
        default:
            common.errors.throwNotImplementedForNeverValueError(text);
    }
}

function ModuledNode(Base) {
    return class extends Base {
        addImportDeclaration(structure) {
            return this.addImportDeclarations([structure])[0];
        }
        addImportDeclarations(structures) {
            const compilerChildren = this._getCompilerStatementsWithComments();
            return this.insertImportDeclarations(getInsertIndex(), structures);
            function getInsertIndex() {
                let insertIndex = 0;
                let wasLastComment = true;
                for (let i = 0; i < compilerChildren.length; i++) {
                    const child = compilerChildren[i];
                    if (wasLastComment && child.kind === common.SyntaxKind.MultiLineCommentTrivia)
                        insertIndex = i + 1;
                    else {
                        wasLastComment = false;
                        if (child.kind === common.SyntaxKind.ImportDeclaration)
                            insertIndex = i + 1;
                    }
                }
                return insertIndex;
            }
        }
        insertImportDeclaration(index, structure) {
            return this.insertImportDeclarations(index, [structure])[0];
        }
        insertImportDeclarations(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.ImportDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forImportDeclaration().printTexts(writer, structures);
                    }, {
                        previousNewLine: previousMember => Node.isImportDeclaration(previousMember) || isComment(previousMember.compilerNode),
                        nextNewLine: nextMember => Node.isImportDeclaration(nextMember),
                    });
                },
            });
        }
        getImportDeclaration(conditionOrModuleSpecifier) {
            return this.getImportDeclarations().find(getCondition());
            function getCondition() {
                if (typeof conditionOrModuleSpecifier === "string")
                    return (dec) => dec.getModuleSpecifierValue() === conditionOrModuleSpecifier;
                else
                    return conditionOrModuleSpecifier;
            }
        }
        getImportDeclarationOrThrow(conditionOrModuleSpecifier, message) {
            return common.errors.throwIfNullOrUndefined(this.getImportDeclaration(conditionOrModuleSpecifier), message ?? "Expected to find an import with the provided condition.", this);
        }
        getImportDeclarations() {
            return this.getStatements().filter(Node.isImportDeclaration);
        }
        addExportDeclaration(structure) {
            return this.addExportDeclarations([structure])[0];
        }
        addExportDeclarations(structures) {
            return this.insertExportDeclarations(this.getChildSyntaxListOrThrow().getChildCount(), structures);
        }
        insertExportDeclaration(index, structure) {
            return this.insertExportDeclarations(index, [structure])[0];
        }
        insertExportDeclarations(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.ExportDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forExportDeclaration().printTexts(writer, structures);
                    }, {
                        previousNewLine: previousMember => Node.isExportDeclaration(previousMember) || isComment(previousMember.compilerNode),
                        nextNewLine: nextMember => Node.isExportDeclaration(nextMember),
                    });
                },
            });
        }
        getExportDeclaration(conditionOrModuleSpecifier) {
            return this.getExportDeclarations().find(getCondition());
            function getCondition() {
                if (typeof conditionOrModuleSpecifier === "string")
                    return (dec) => dec.getModuleSpecifierValue() === conditionOrModuleSpecifier;
                else
                    return conditionOrModuleSpecifier;
            }
        }
        getExportDeclarationOrThrow(conditionOrModuleSpecifier, message) {
            return common.errors.throwIfNullOrUndefined(this.getExportDeclaration(conditionOrModuleSpecifier), message ?? "Expected to find an export declaration with the provided condition.", this);
        }
        getExportDeclarations() {
            return this.getStatements().filter(Node.isExportDeclaration);
        }
        addExportAssignment(structure) {
            return this.addExportAssignments([structure])[0];
        }
        addExportAssignments(structures) {
            return this.insertExportAssignments(this.getChildSyntaxListOrThrow().getChildCount(), structures);
        }
        insertExportAssignment(index, structure) {
            return this.insertExportAssignments(index, [structure])[0];
        }
        insertExportAssignments(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.ExportAssignment,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forExportAssignment().printTexts(writer, structures);
                    }, {
                        previousNewLine: previousMember => Node.isExportAssignment(previousMember) || isComment(previousMember.compilerNode),
                        nextNewLine: nextMember => Node.isExportAssignment(nextMember),
                    });
                },
            });
        }
        getExportAssignment(condition) {
            return this.getExportAssignments().find(condition);
        }
        getExportAssignmentOrThrow(condition, message) {
            return common.errors.throwIfNullOrUndefined(this.getExportAssignment(condition), message ?? "Expected to find an export assignment with the provided condition.", this);
        }
        getExportAssignments() {
            return this.getStatements().filter(Node.isExportAssignment);
        }
        getDefaultExportSymbol() {
            const sourceFileSymbol = this.getSymbol();
            if (sourceFileSymbol == null)
                return undefined;
            return sourceFileSymbol.getExport("default");
        }
        getDefaultExportSymbolOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getDefaultExportSymbol(), message ?? "Expected to find a default export symbol");
        }
        getExportSymbols() {
            const symbol = this.getSymbol();
            return symbol == null ? [] : this._context.typeChecker.getExportsOfModule(symbol);
        }
        getExportedDeclarations() {
            const result = new Map();
            const exportSymbols = this.getExportSymbols();
            for (const symbol of exportSymbols) {
                for (const declaration of symbol.getDeclarations()) {
                    const declarations = Array.from(getDeclarationHandlingImportsAndExports(declaration));
                    const name = symbol.getName();
                    const existingArray = result.get(name);
                    if (existingArray != null)
                        existingArray.push(...declarations);
                    else
                        result.set(symbol.getName(), declarations);
                }
            }
            return result;
            function* getDeclarationHandlingImportsAndExports(declaration) {
                if (Node.isExportSpecifier(declaration)) {
                    for (const d of declaration.getLocalTargetDeclarations())
                        yield* getDeclarationHandlingImportsAndExports(d);
                }
                else if (Node.isExportAssignment(declaration)) {
                    const expression = declaration.getExpression();
                    if (expression == null || expression.getKind() !== common.SyntaxKind.Identifier) {
                        yield expression;
                        return;
                    }
                    yield* getDeclarationsForSymbol(expression.getSymbol());
                }
                else if (Node.isImportSpecifier(declaration)) {
                    const identifier = declaration.getNameNode();
                    const symbol = identifier.getSymbol();
                    if (symbol == null)
                        return;
                    yield* getDeclarationsForSymbol(symbol.getAliasedSymbol() || symbol);
                }
                else if (Node.isImportClause(declaration)) {
                    const identifier = declaration.getDefaultImport();
                    if (identifier == null)
                        return;
                    const symbol = identifier.getSymbol();
                    if (symbol == null)
                        return;
                    yield* getDeclarationsForSymbol(symbol.getAliasedSymbol() || symbol);
                }
                else if (Node.isNamespaceImport(declaration) || Node.isNamespaceExport(declaration)) {
                    const symbol = declaration.getNameNode().getSymbol();
                    if (symbol == null)
                        return;
                    yield* getDeclarationsForSymbol(symbol.getAliasedSymbol() || symbol);
                }
                else {
                    yield declaration;
                }
                function* getDeclarationsForSymbol(symbol) {
                    if (symbol == null)
                        return;
                    for (const d of symbol.getDeclarations())
                        yield* getDeclarationHandlingImportsAndExports(d);
                }
            }
        }
        removeDefaultExport(defaultExportSymbol) {
            defaultExportSymbol = defaultExportSymbol || this.getDefaultExportSymbol();
            if (defaultExportSymbol == null)
                return this;
            const declaration = defaultExportSymbol.getDeclarations()[0];
            if (declaration.compilerNode.kind === common.SyntaxKind.ExportAssignment)
                removeChildrenWithFormatting({ children: [declaration], getSiblingFormatting: () => FormattingKind.Newline });
            else if (Node.isModifierable(declaration)) {
                declaration.toggleModifier("default", false);
                declaration.toggleModifier("export", false);
            }
            return this;
        }
    };
}

function NamedNodeBase(Base) {
    return class extends Base {
        getNameNode() {
            return this._getNodeFromCompilerNode(this.compilerNode.name);
        }
        getName() {
            return this.getNameNode().getText();
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.name != null)
                this.getNameNode().replaceWithText(structure.name);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                name: this.getName(),
            });
        }
    };
}

function ReferenceFindableNode(Base) {
    return class extends Base {
        findReferences() {
            return this._context.languageService.findReferences(getNodeForReferences(this));
        }
        findReferencesAsNodes() {
            return this._context.languageService.findReferencesAsNodes(getNodeForReferences(this));
        }
    };
}
function getNodeForReferences(node) {
    if (Node.isIdentifier(node) || Node.isStringLiteral(node))
        return node;
    const nameNode = node.getNodeProperty("name");
    if (nameNode != null)
        return nameNode;
    if (Node.isExportable(node))
        return node.getDefaultKeyword() || node;
    return node;
}

function RenameableNode(Base) {
    return class extends Base {
        rename(newName, options) {
            renameNode(getNodeToRename(this), newName, options);
            return this;
            function getNodeToRename(thisNode) {
                if (Node.isIdentifier(thisNode) || Node.isPrivateIdentifier(thisNode) || Node.isStringLiteral(thisNode))
                    return thisNode;
                else if (thisNode.getNameNode != null) {
                    const node = thisNode.getNameNode();
                    common.errors.throwIfNullOrUndefined(node, "Expected to find a name node when renaming.");
                    if (Node.isArrayBindingPattern(node) || Node.isObjectBindingPattern(node))
                        throw new common.errors.NotImplementedError(`Not implemented renameable scenario for ${node.getKindName()}.`);
                    return node;
                }
                else {
                    throw new common.errors.NotImplementedError(`Not implemented renameable scenario for ${thisNode.getKindName()}`);
                }
            }
        }
    };
}

function BindingNamedNode(Base) {
    const base = ReferenceFindableNode(RenameableNode(Base));
    return NamedNodeBase(base);
}

function ImportAttributeNamedNode(Base) {
    const base = ReferenceFindableNode(RenameableNode(Base));
    return NamedNodeBase(base);
}

function ModuleNamedNode(Base) {
    const base = ReferenceFindableNode(RenameableNode(Base));
    return NamedNodeBase(base);
}

function NameableNode(Base) {
    return NameableNodeInternal(ReferenceFindableNode(RenameableNode(Base)));
}
function NameableNodeInternal(Base) {
    return class extends Base {
        getNameNode() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.name);
        }
        getNameNodeOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getNameNode(), message ?? "Expected to have a name node.", this);
        }
        getName() {
            return this.getNameNode()?.getText() ?? undefined;
        }
        getNameOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getName(), message ?? "Expected to have a name.", this);
        }
        rename(newName) {
            if (newName === this.getName())
                return this;
            if (common.StringUtils.isNullOrWhitespace(newName)) {
                this.removeName();
                return this;
            }
            const nameNode = this.getNameNode();
            if (nameNode == null)
                addNameNode(this, newName);
            else
                Base.prototype.rename.call(this, newName);
            return this;
        }
        removeName() {
            const nameNode = this.getNameNode();
            if (nameNode == null)
                return this;
            removeChildren({ children: [nameNode], removePrecedingSpaces: true });
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.name != null) {
                common.errors.throwIfWhitespaceOrNotString(structure.name, "structure.name");
                const nameNode = this.getNameNode();
                if (nameNode == null)
                    addNameNode(this, structure.name);
                else
                    nameNode.replaceWithText(structure.name);
            }
            else if (structure.hasOwnProperty(common.nameof(structure, "name"))) {
                this.removeName();
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                name: this.getName(),
            });
        }
    };
}
function addNameNode(node, newName) {
    if (Node.isClassDeclaration(node) || Node.isClassExpression(node)) {
        const classKeyword = node.getFirstChildByKindOrThrow(common.SyntaxKind.ClassKeyword);
        insertIntoParentTextRange({
            insertPos: classKeyword.getEnd(),
            newText: " " + newName,
            parent: node,
        });
    }
    else {
        const openParenToken = node.getFirstChildByKindOrThrow(common.SyntaxKind.OpenParenToken);
        insertIntoParentTextRange({
            insertPos: openParenToken.getStart(),
            newText: " " + newName,
            parent: node,
        });
    }
}

function NamedNode(Base) {
    const base = RenameableNode(ReferenceFindableNode(Base));
    return NamedNodeBase(base);
}

function PropertyNamedNode(Base) {
    const base = ReferenceFindableNode(RenameableNode(Base));
    return NamedNodeBase(base);
}

function OverrideableNode(Base) {
    return class extends Base {
        hasOverrideKeyword() {
            return this.hasModifier(common.SyntaxKind.OverrideKeyword);
        }
        getOverrideKeyword() {
            return this.getFirstModifierByKind(common.SyntaxKind.OverrideKeyword);
        }
        getOverrideKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getOverrideKeyword(), message ?? "Expected to find an override keyword.", this);
        }
        setHasOverrideKeyword(value) {
            this.toggleModifier("override", value);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.hasOverrideKeyword != null)
                this.setHasOverrideKeyword(structure.hasOverrideKeyword);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                hasOverrideKeyword: this.hasOverrideKeyword(),
            });
        }
    };
}

function ParameteredNode(Base) {
    return class extends Base {
        getParameter(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getParameters(), nameOrFindFunction);
        }
        getParameterOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getParameter(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("parameter", nameOrFindFunction));
        }
        getParameters() {
            return this.compilerNode.parameters.map(p => this._getNodeFromCompilerNode(p));
        }
        addParameter(structure) {
            return this.addParameters([structure])[0];
        }
        addParameters(structures) {
            return this.insertParameters(getEndIndexFromArray(this.compilerNode.parameters), structures);
        }
        insertParameter(index, structure) {
            return this.insertParameters(index, [structure])[0];
        }
        insertParameters(index, structures) {
            if (common.ArrayUtils.isNullOrEmpty(structures))
                return [];
            const parameters = this.getParameters();
            const syntaxList = this.getFirstChildByKindOrThrow(common.SyntaxKind.OpenParenToken).getNextSiblingIfKindOrThrow(common.SyntaxKind.SyntaxList);
            index = verifyAndGetIndex(index, parameters.length);
            const writer = this._getWriterWithQueuedChildIndentation();
            const structurePrinter = this._context.structurePrinterFactory.forParameterDeclaration();
            structurePrinter.printTexts(writer, structures);
            insertIntoCommaSeparatedNodes({
                parent: syntaxList,
                currentNodes: parameters,
                insertIndex: index,
                newText: writer.toString(),
                useTrailingCommas: false,
            });
            return getNodesToReturn(parameters, this.getParameters(), index, false);
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.parameters != null) {
                this.getParameters().forEach(p => p.remove());
                this.addParameters(structure.parameters);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                parameters: this.getParameters().map(p => p.getStructure()),
            });
        }
    };
}

function QuestionDotTokenableNode(Base) {
    return class extends Base {
        hasQuestionDotToken() {
            return this.compilerNode.questionDotToken != null;
        }
        getQuestionDotTokenNode() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.questionDotToken);
        }
        getQuestionDotTokenNodeOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getQuestionDotTokenNode(), message ?? "Expected to find a question dot token.", this);
        }
        setHasQuestionDotToken(value) {
            const questionDotTokenNode = this.getQuestionDotTokenNode();
            const hasQuestionDotToken = questionDotTokenNode != null;
            if (value === hasQuestionDotToken)
                return this;
            if (value) {
                if (Node.isPropertyAccessExpression(this))
                    this.getFirstChildByKindOrThrow(common.SyntaxKind.DotToken).replaceWithText("?.");
                else {
                    insertIntoParentTextRange({
                        insertPos: getInsertPos.call(this),
                        parent: this,
                        newText: "?.",
                    });
                }
            }
            else {
                if (Node.isPropertyAccessExpression(this))
                    questionDotTokenNode.replaceWithText(".");
                else
                    removeChildren({ children: [questionDotTokenNode] });
            }
            return this;
            function getInsertPos() {
                if (Node.isCallExpression(this))
                    return this.getFirstChildByKindOrThrow(common.SyntaxKind.OpenParenToken).getStart();
                if (Node.isElementAccessExpression(this))
                    return this.getFirstChildByKindOrThrow(common.SyntaxKind.OpenBracketToken).getStart();
                common.errors.throwNotImplementedForSyntaxKindError(this.compilerNode.kind);
            }
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.hasQuestionDotToken != null)
                this.setHasQuestionDotToken(structure.hasQuestionDotToken);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                hasQuestionDotToken: this.hasQuestionDotToken(),
            });
        }
    };
}

function QuestionTokenableNode(Base) {
    return class extends Base {
        hasQuestionToken() {
            return this.compilerNode.questionToken != null;
        }
        getQuestionTokenNode() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.questionToken);
        }
        getQuestionTokenNodeOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getQuestionTokenNode(), message ?? "Expected to find a question token.", this);
        }
        setHasQuestionToken(value) {
            const questionTokenNode = this.getQuestionTokenNode();
            const hasQuestionToken = questionTokenNode != null;
            if (value === hasQuestionToken)
                return this;
            if (value) {
                if (Node.isExclamationTokenable(this))
                    this.setHasExclamationToken(false);
                insertIntoParentTextRange({
                    insertPos: getInsertPos.call(this),
                    parent: this,
                    newText: "?",
                });
            }
            else {
                removeChildren({ children: [questionTokenNode] });
            }
            return this;
            function getInsertPos() {
                if (Node.hasName(this))
                    return this.getNameNode().getEnd();
                const colonNode = this.getFirstChildByKind(common.SyntaxKind.ColonToken);
                if (colonNode != null)
                    return colonNode.getStart();
                const semicolonToken = this.getLastChildByKind(common.SyntaxKind.SemicolonToken);
                if (semicolonToken != null)
                    return semicolonToken.getStart();
                return this.getEnd();
            }
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.hasQuestionToken != null)
                this.setHasQuestionToken(structure.hasQuestionToken);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                hasQuestionToken: this.hasQuestionToken(),
            });
        }
    };
}

function ReadonlyableNode(Base) {
    return class extends Base {
        isReadonly() {
            return this.getReadonlyKeyword() != null;
        }
        getReadonlyKeyword() {
            return this.getFirstModifierByKind(common.SyntaxKind.ReadonlyKeyword);
        }
        getReadonlyKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getReadonlyKeyword(), message ?? "Expected to find a readonly keyword.", this);
        }
        setIsReadonly(value) {
            this.toggleModifier("readonly", value);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.isReadonly != null)
                this.setIsReadonly(structure.isReadonly);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                isReadonly: this.isReadonly(),
            });
        }
    };
}

function ReturnTypedNode(Base) {
    return class extends Base {
        getReturnType() {
            return this.getSignature().getReturnType();
        }
        getReturnTypeNode() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.type);
        }
        getReturnTypeNodeOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getReturnTypeNode(), message ?? "Expected to find a return type node.", this);
        }
        setReturnType(textOrWriterFunction) {
            const text = getTextFromStringOrWriter(this._getWriterWithQueuedChildIndentation(), textOrWriterFunction);
            if (common.StringUtils.isNullOrWhitespace(text))
                return this.removeReturnType();
            const returnTypeNode = this.getReturnTypeNode();
            if (returnTypeNode != null) {
                if (returnTypeNode.getText() !== text)
                    returnTypeNode.replaceWithText(text);
                return this;
            }
            insertIntoParentTextRange({
                parent: this,
                insertPos: getEndNode(this).getEnd(),
                newText: `: ${text}`,
            });
            return this;
            function getEndNode(thisNode) {
                if (thisNode.getKind() === common.SyntaxKind.IndexSignature)
                    return thisNode.getFirstChildByKindOrThrow(common.SyntaxKind.CloseBracketToken);
                return thisNode.getFirstChildByKindOrThrow(common.SyntaxKind.CloseParenToken);
            }
        }
        removeReturnType() {
            const returnTypeNode = this.getReturnTypeNode();
            if (returnTypeNode == null)
                return this;
            const colonToken = returnTypeNode.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.ColonToken);
            removeChildren({ children: [colonToken, returnTypeNode], removePrecedingSpaces: true });
            return this;
        }
        getSignature() {
            const signature = this._context.typeChecker.getSignatureFromNode(this);
            if (signature == null)
                throw new common.errors.NotImplementedError("Expected the node to have a signature.");
            return signature;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.returnType != null)
                this.setReturnType(structure.returnType);
            else if (structure.hasOwnProperty(common.nameof(structure, "returnType")))
                this.removeReturnType();
            return this;
        }
        getStructure() {
            const returnTypeNode = this.getReturnTypeNode();
            return callBaseGetStructure(Base.prototype, this, {
                returnType: returnTypeNode ? returnTypeNode.getText({ trimLeadingIndentation: true }) : undefined,
            });
        }
    };
}

function ScopeableNode(Base) {
    return class extends Base {
        getScope() {
            const scope = getScopeForNode(this);
            if (scope != null)
                return scope;
            if (Node.isParameterDeclaration(this) && this.isReadonly())
                return exports.Scope.Public;
            return undefined;
        }
        setScope(scope) {
            setScopeForNode(this, scope);
            return this;
        }
        getScopeKeyword() {
            return this.getModifiers().find(m => {
                const text = m.getText();
                return text === "public" || text === "protected" || text === "private";
            });
        }
        hasScopeKeyword() {
            return this.getScopeKeyword() != null;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.hasOwnProperty(common.nameof(structure, "scope")))
                this.setScope(structure.scope);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                scope: this.getScope(),
            });
        }
    };
}
function getScopeForNode(node) {
    const modifierFlags = node.getCombinedModifierFlags();
    if ((modifierFlags & common.ts.ModifierFlags.Private) !== 0)
        return exports.Scope.Private;
    else if ((modifierFlags & common.ts.ModifierFlags.Protected) !== 0)
        return exports.Scope.Protected;
    else if ((modifierFlags & common.ts.ModifierFlags.Public) !== 0)
        return exports.Scope.Public;
    else
        return undefined;
}
function setScopeForNode(node, scope) {
    node.toggleModifier("public", scope === exports.Scope.Public);
    node.toggleModifier("protected", scope === exports.Scope.Protected);
    node.toggleModifier("private", scope === exports.Scope.Private);
}

function ScopedNode(Base) {
    return class extends Base {
        getScope() {
            return getScopeForNode(this) || exports.Scope.Public;
        }
        setScope(scope) {
            setScopeForNode(this, scope);
            return this;
        }
        hasScopeKeyword() {
            return getScopeForNode(this) != null;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.hasOwnProperty(common.nameof(structure, "scope")))
                this.setScope(structure.scope);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                scope: this.hasScopeKeyword() ? this.getScope() : undefined,
            });
        }
    };
}

function SignaturedDeclaration(Base) {
    return ReturnTypedNode(ParameteredNode(Base));
}

function StaticableNode(Base) {
    return class extends Base {
        isStatic() {
            return this.hasModifier(common.SyntaxKind.StaticKeyword);
        }
        getStaticKeyword() {
            return this.getFirstModifierByKind(common.SyntaxKind.StaticKeyword);
        }
        getStaticKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getStaticKeyword(), message ?? "Expected to find a static keyword.", this);
        }
        setIsStatic(value) {
            this.toggleModifier("static", value);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.isStatic != null)
                this.setIsStatic(structure.isStatic);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                isStatic: this.isStatic(),
            });
        }
    };
}

function TextInsertableNode(Base) {
    return class extends Base {
        insertText(pos, textOrWriterFunction) {
            this.replaceText([pos, pos], textOrWriterFunction);
            return this;
        }
        removeText(pos, end) {
            if (pos == null)
                this.replaceText(getValidRange(this), "");
            else
                this.replaceText([pos, end], "");
            return this;
        }
        replaceText(range, textOrWriterFunction) {
            const childSyntaxList = this.getChildSyntaxListOrThrow();
            const validRange = getValidRange(this);
            const pos = range[0];
            const end = range[1];
            verifyArguments();
            insertIntoParentTextRange({
                insertPos: pos,
                newText: getTextFromStringOrWriter(this._getWriter(), textOrWriterFunction),
                parent: childSyntaxList.getParentOrThrow(),
                replacing: {
                    textLength: end - pos,
                    nodes: [childSyntaxList],
                },
            });
            return this;
            function verifyArguments() {
                verifyInRange(pos);
                verifyInRange(end);
                if (pos > end)
                    throw new common.errors.ArgumentError("range", "Cannot specify a start position greater than the end position.");
            }
            function verifyInRange(i) {
                if (i >= validRange[0] && i <= validRange[1])
                    return;
                throw new common.errors.InvalidOperationError(`Cannot insert or replace text outside the bounds of the node. `
                    + `Expected a position between [${validRange[0]}, ${validRange[1]}], but received ${i}.`);
            }
        }
    };
}
function getValidRange(thisNode) {
    const rangeNode = getRangeNode();
    const openBrace = Node.isSourceFile(rangeNode) ? undefined : rangeNode.getPreviousSiblingIfKind(common.SyntaxKind.OpenBraceToken);
    const closeBrace = openBrace == null ? undefined : rangeNode.getNextSiblingIfKind(common.SyntaxKind.CloseBraceToken);
    if (openBrace != null && closeBrace != null)
        return [openBrace.getEnd(), closeBrace.getStart()];
    else
        return [rangeNode.getPos(), rangeNode.getEnd()];
    function getRangeNode() {
        if (Node.isSourceFile(thisNode))
            return thisNode;
        return thisNode.getChildSyntaxListOrThrow();
    }
}

function TypeArgumentedNode(Base) {
    return class extends Base {
        getTypeArguments() {
            if (this.compilerNode.typeArguments == null)
                return [];
            return this.compilerNode.typeArguments.map(a => this._getNodeFromCompilerNode(a));
        }
        addTypeArgument(argumentText) {
            return this.addTypeArguments([argumentText])[0];
        }
        addTypeArguments(argumentTexts) {
            return this.insertTypeArguments(this.getTypeArguments().length, argumentTexts);
        }
        insertTypeArgument(index, argumentText) {
            return this.insertTypeArguments(index, [argumentText])[0];
        }
        insertTypeArguments(index, argumentTexts) {
            if (common.ArrayUtils.isNullOrEmpty(argumentTexts))
                return [];
            const typeArguments = this.getTypeArguments();
            index = verifyAndGetIndex(index, typeArguments.length);
            if (typeArguments.length === 0) {
                const identifier = this.getFirstChildByKindOrThrow(common.SyntaxKind.Identifier);
                insertIntoParentTextRange({
                    insertPos: identifier.getEnd(),
                    parent: this,
                    newText: `<${argumentTexts.join(", ")}>`,
                });
            }
            else {
                insertIntoCommaSeparatedNodes({
                    parent: this.getFirstChildByKindOrThrow(common.SyntaxKind.LessThanToken).getNextSiblingIfKindOrThrow(common.SyntaxKind.SyntaxList),
                    currentNodes: typeArguments,
                    insertIndex: index,
                    newText: argumentTexts.join(", "),
                    useTrailingCommas: false,
                });
            }
            return getNodesToReturn(typeArguments, this.getTypeArguments(), index, false);
        }
        removeTypeArgument(typeArgOrIndex) {
            const typeArguments = this.getTypeArguments();
            if (typeArguments.length === 0)
                throw new common.errors.InvalidOperationError("Cannot remove a type argument when none exist.");
            const typeArgToRemove = typeof typeArgOrIndex === "number" ? getTypeArgFromIndex(typeArgOrIndex) : typeArgOrIndex;
            if (typeArguments.length === 1) {
                const childSyntaxList = typeArguments[0].getParentSyntaxListOrThrow();
                removeChildren({
                    children: [
                        childSyntaxList.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.LessThanToken),
                        childSyntaxList,
                        childSyntaxList.getNextSiblingIfKindOrThrow(common.SyntaxKind.GreaterThanToken),
                    ],
                });
            }
            else {
                removeCommaSeparatedChild(typeArgToRemove);
            }
            return this;
            function getTypeArgFromIndex(index) {
                return typeArguments[verifyAndGetIndex(index, typeArguments.length - 1)];
            }
        }
    };
}

function TypedNode(Base) {
    return class extends Base {
        getTypeNode() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.type);
        }
        getTypeNodeOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getTypeNode(), message ?? "Expected to find a type node.", this);
        }
        setType(textOrWriterFunction) {
            const text = getTextFromStringOrWriter(this._getWriterWithQueuedChildIndentation(), textOrWriterFunction);
            if (common.StringUtils.isNullOrWhitespace(text))
                return this.removeType();
            const typeNode = this.getTypeNode();
            if (typeNode != null && typeNode.getText() === text)
                return this;
            const separatorSyntaxKind = getSeparatorSyntaxKindForNode(this);
            const separatorNode = this.getFirstChildByKind(separatorSyntaxKind);
            let insertPos;
            let newText;
            if (separatorNode == null) {
                insertPos = getInsertPosWhenNoType(this);
                newText = (separatorSyntaxKind === common.SyntaxKind.EqualsToken ? " = " : ": ") + text;
            }
            else {
                insertPos = typeNode.getStart();
                newText = text;
            }
            insertIntoParentTextRange({
                parent: this,
                insertPos,
                newText,
                replacing: {
                    textLength: typeNode == null ? 0 : typeNode.getWidth(),
                },
            });
            return this;
            function getInsertPosWhenNoType(node) {
                let identifier = node.getFirstChildByKind(common.SyntaxKind.Identifier) ?? node.getFirstChildByKind(common.SyntaxKind.ArrayBindingPattern) ?? node.getFirstChildIfKindOrThrow(common.SyntaxKind.ObjectBindingPattern, "A first child of the kind Identifier, ArrayBindingPattern, or ObjectBindingPattern was expected.");
                const nextSibling = identifier.getNextSibling();
                const insertAfterNode = isQuestionOrExclamation(nextSibling) ? nextSibling : identifier;
                return insertAfterNode.getEnd();
            }
            function isQuestionOrExclamation(node) {
                if (node == null)
                    return false;
                const kind = node.getKind();
                return kind === common.SyntaxKind.QuestionToken || kind === common.SyntaxKind.ExclamationToken;
            }
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.type != null)
                this.setType(structure.type);
            else if (structure.hasOwnProperty(common.nameof(structure, "type")))
                this.removeType();
            return this;
        }
        removeType() {
            if (this.getKind() === common.SyntaxKind.TypeAliasDeclaration)
                throw new common.errors.NotSupportedError(`Cannot remove the type of a type alias. Use ${common.nameof("setType")} instead.`);
            const typeNode = this.getTypeNode();
            if (typeNode == null)
                return this;
            const separatorToken = typeNode.getPreviousSiblingIfKindOrThrow(getSeparatorSyntaxKindForNode(this));
            removeChildren({ children: [separatorToken, typeNode], removePrecedingSpaces: true });
            return this;
        }
        getStructure() {
            const typeNode = this.getTypeNode();
            return callBaseGetStructure(Base.prototype, this, {
                type: typeNode ? typeNode.getText({ trimLeadingIndentation: true }) : undefined,
            });
        }
    };
}
function getSeparatorSyntaxKindForNode(node) {
    switch (node.getKind()) {
        case common.SyntaxKind.TypeAliasDeclaration:
            return common.SyntaxKind.EqualsToken;
        default:
            return common.SyntaxKind.ColonToken;
    }
}

function TypeElementMemberedNode(Base) {
    return class extends Base {
        addMember(member) {
            return this.addMembers([member])[0];
        }
        addMembers(members) {
            return this.insertMembers(getEndIndexFromArray(this.getMembersWithComments()), members);
        }
        insertMember(index, member) {
            return this.insertMembers(index, [member])[0];
        }
        insertMembers(index, members) {
            return insertIntoBracesOrSourceFileWithGetChildrenWithComments({
                getIndexedChildren: () => this.getMembersWithComments(),
                index,
                parent: this,
                write: writer => {
                    writer.newLineIfLastNot();
                    const memberWriter = this._getWriter();
                    const memberPrinter = this._context.structurePrinterFactory.forTypeElementMember();
                    memberPrinter.printTexts(memberWriter, members);
                    writer.write(memberWriter.toString());
                    writer.newLineIfLastNot();
                },
            });
        }
        addConstructSignature(structure) {
            return this.addConstructSignatures([structure])[0];
        }
        addConstructSignatures(structures) {
            return this.insertConstructSignatures(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertConstructSignature(index, structure) {
            return this.insertConstructSignatures(index, [structure])[0];
        }
        insertConstructSignatures(index, structures) {
            return insertChildren$1({
                thisNode: this,
                index,
                structures,
                expectedKind: common.SyntaxKind.ConstructSignature,
                createStructurePrinter: () => this._context.structurePrinterFactory.forConstructSignatureDeclaration(),
            });
        }
        getConstructSignature(findFunction) {
            return this.getConstructSignatures().find(findFunction);
        }
        getConstructSignatureOrThrow(findFunction, message) {
            return common.errors.throwIfNullOrUndefined(this.getConstructSignature(findFunction), message ?? "Expected to find a construct signature with the provided condition.", this);
        }
        getConstructSignatures() {
            return this.compilerNode.members.filter(m => m.kind === common.SyntaxKind.ConstructSignature)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        addCallSignature(structure) {
            return this.addCallSignatures([structure])[0];
        }
        addCallSignatures(structures) {
            return this.insertCallSignatures(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertCallSignature(index, structure) {
            return this.insertCallSignatures(index, [structure])[0];
        }
        insertCallSignatures(index, structures) {
            return insertChildren$1({
                thisNode: this,
                index,
                structures,
                expectedKind: common.SyntaxKind.CallSignature,
                createStructurePrinter: () => this._context.structurePrinterFactory.forCallSignatureDeclaration(),
            });
        }
        getCallSignature(findFunction) {
            return this.getCallSignatures().find(findFunction);
        }
        getCallSignatureOrThrow(findFunction, message) {
            return common.errors.throwIfNullOrUndefined(this.getCallSignature(findFunction), message ?? "Expected to find a call signature with the provided condition.", this);
        }
        getCallSignatures() {
            return this.compilerNode.members.filter(m => m.kind === common.SyntaxKind.CallSignature)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        addIndexSignature(structure) {
            return this.addIndexSignatures([structure])[0];
        }
        addIndexSignatures(structures) {
            return this.insertIndexSignatures(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertIndexSignature(index, structure) {
            return this.insertIndexSignatures(index, [structure])[0];
        }
        insertIndexSignatures(index, structures) {
            return insertChildren$1({
                thisNode: this,
                index,
                structures,
                expectedKind: common.SyntaxKind.IndexSignature,
                createStructurePrinter: () => this._context.structurePrinterFactory.forIndexSignatureDeclaration(),
            });
        }
        getIndexSignature(findFunction) {
            return this.getIndexSignatures().find(findFunction);
        }
        getIndexSignatureOrThrow(findFunction, message) {
            return common.errors.throwIfNullOrUndefined(this.getIndexSignature(findFunction), message ?? "Expected to find a index signature with the provided condition.", this);
        }
        getIndexSignatures() {
            return this.compilerNode.members.filter(m => m.kind === common.SyntaxKind.IndexSignature)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        addMethod(structure) {
            return this.addMethods([structure])[0];
        }
        addMethods(structures) {
            return this.insertMethods(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertMethod(index, structure) {
            return this.insertMethods(index, [structure])[0];
        }
        insertMethods(index, structures) {
            return insertChildren$1({
                thisNode: this,
                index,
                structures,
                expectedKind: common.SyntaxKind.MethodSignature,
                createStructurePrinter: () => this._context.structurePrinterFactory.forMethodSignature(),
            });
        }
        getMethod(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getMethods(), nameOrFindFunction);
        }
        getMethodOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getMethod(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("interface method signature", nameOrFindFunction));
        }
        getMethods() {
            return this.compilerNode.members.filter(m => m.kind === common.SyntaxKind.MethodSignature)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        addProperty(structure) {
            return this.addProperties([structure])[0];
        }
        addProperties(structures) {
            return this.insertProperties(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertProperty(index, structure) {
            return this.insertProperties(index, [structure])[0];
        }
        insertProperties(index, structures) {
            return insertChildren$1({
                thisNode: this,
                index,
                structures,
                expectedKind: common.SyntaxKind.PropertySignature,
                createStructurePrinter: () => this._context.structurePrinterFactory.forPropertySignature(),
            });
        }
        getProperty(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getProperties(), nameOrFindFunction);
        }
        getPropertyOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getProperty(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("interface property signature", nameOrFindFunction));
        }
        getProperties() {
            return this.compilerNode.members.filter(m => m.kind === common.SyntaxKind.PropertySignature)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        addGetAccessor(structure) {
            return this.addGetAccessors([structure])[0];
        }
        addGetAccessors(structures) {
            const result = [];
            for (const structure of structures) {
                const setAccessor = this.getSetAccessor(structure.name);
                const index = setAccessor == null ? getEndIndexFromArray(this.getMembersWithComments()) : setAccessor.getChildIndex();
                result.push(this.insertGetAccessor(index, structure));
            }
            return result;
        }
        insertGetAccessor(index, structure) {
            return this.insertGetAccessors(index, [structure])[0];
        }
        insertGetAccessors(index, structures) {
            return insertChildren$1({
                thisNode: this,
                index,
                structures,
                expectedKind: common.SyntaxKind.GetAccessor,
                createStructurePrinter: () => this._context.structurePrinterFactory.forGetAccessorDeclaration({
                    isAmbient: true,
                }),
            });
        }
        getGetAccessor(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getGetAccessors(), nameOrFindFunction);
        }
        getGetAccessorOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getGetAccessor(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("interface get accessor", nameOrFindFunction));
        }
        getGetAccessors() {
            return this.compilerNode.members.filter(m => m.kind === common.SyntaxKind.GetAccessor)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        addSetAccessor(structure) {
            return this.addSetAccessors([structure])[0];
        }
        addSetAccessors(structures) {
            const result = [];
            for (const structure of structures) {
                const getAccessor = this.getGetAccessor(structure.name);
                const index = getAccessor == null ? getEndIndexFromArray(this.getMembersWithComments()) : getAccessor.getChildIndex() + 1;
                result.push(this.insertSetAccessor(index, structure));
            }
            return result;
        }
        insertSetAccessor(index, structure) {
            return this.insertSetAccessors(index, [structure])[0];
        }
        insertSetAccessors(index, structures) {
            return insertChildren$1({
                thisNode: this,
                index,
                structures,
                expectedKind: common.SyntaxKind.SetAccessor,
                createStructurePrinter: () => this._context.structurePrinterFactory.forSetAccessorDeclaration({
                    isAmbient: true,
                }),
            });
        }
        getSetAccessor(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getSetAccessors(), nameOrFindFunction);
        }
        getSetAccessorOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getSetAccessor(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("interface set accessor", nameOrFindFunction));
        }
        getSetAccessors() {
            return this.compilerNode.members.filter(m => m.kind === common.SyntaxKind.SetAccessor)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        getMembers() {
            return this.compilerNode.members.map(m => this._getNodeFromCompilerNode(m));
        }
        getMembersWithComments() {
            const compilerNode = this.compilerNode;
            return ExtendedParser.getContainerArray(compilerNode, this._sourceFile.compilerNode)
                .map(m => this._getNodeFromCompilerNode(m));
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.callSignatures != null) {
                this.getCallSignatures().forEach(c => c.remove());
                this.addCallSignatures(structure.callSignatures);
            }
            if (structure.constructSignatures != null) {
                this.getConstructSignatures().forEach(c => c.remove());
                this.addConstructSignatures(structure.constructSignatures);
            }
            if (structure.indexSignatures != null) {
                this.getIndexSignatures().forEach(c => c.remove());
                this.addIndexSignatures(structure.indexSignatures);
            }
            if (structure.properties != null) {
                this.getProperties().forEach(c => c.remove());
                this.addProperties(structure.properties);
            }
            if (structure.getAccessors != null) {
                this.getGetAccessors().forEach(c => c.remove());
                this.addGetAccessors(structure.getAccessors);
            }
            if (structure.setAccessors != null) {
                this.getSetAccessors().forEach(c => c.remove());
                this.addSetAccessors(structure.setAccessors);
            }
            if (structure.methods != null) {
                this.getMethods().forEach(c => c.remove());
                this.addMethods(structure.methods);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                callSignatures: this.getCallSignatures().map(node => node.getStructure()),
                constructSignatures: this.getConstructSignatures().map(node => node.getStructure()),
                getAccessors: this.getGetAccessors().map(node => node.getStructure()),
                indexSignatures: this.getIndexSignatures().map(node => node.getStructure()),
                methods: this.getMethods().map(node => node.getStructure()),
                properties: this.getProperties().map(node => node.getStructure()),
                setAccessors: this.getSetAccessors().map(node => node.getStructure()),
            });
        }
    };
}
function insertChildren$1(opts) {
    return insertIntoBracesOrSourceFileWithGetChildren({
        getIndexedChildren: () => opts.thisNode.getMembersWithComments(),
        parent: opts.thisNode,
        index: opts.index,
        structures: opts.structures,
        expectedKind: opts.expectedKind,
        write: (writer, info) => {
            writer.newLineIfLastNot();
            opts.createStructurePrinter().printTexts(writer, opts.structures);
            writer.newLineIfLastNot();
        },
    });
}

function TypeParameteredNode(Base) {
    return class extends Base {
        getTypeParameter(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getTypeParameters(), nameOrFindFunction);
        }
        getTypeParameterOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getTypeParameter(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("type parameter", nameOrFindFunction));
        }
        getTypeParameters() {
            const typeParameters = this.compilerNode.typeParameters;
            if (typeParameters == null)
                return [];
            return typeParameters.map(t => this._getNodeFromCompilerNode(t));
        }
        addTypeParameter(structure) {
            return this.addTypeParameters([structure])[0];
        }
        addTypeParameters(structures) {
            return this.insertTypeParameters(getEndIndexFromArray(this.compilerNode.typeParameters), structures);
        }
        insertTypeParameter(index, structure) {
            return this.insertTypeParameters(index, [structure])[0];
        }
        insertTypeParameters(index, structures) {
            if (common.ArrayUtils.isNullOrEmpty(structures))
                return [];
            const typeParameters = this.getTypeParameters();
            const writer = this._getWriterWithQueuedChildIndentation();
            const structurePrinter = this._context.structurePrinterFactory.forTypeParameterDeclaration();
            index = verifyAndGetIndex(index, typeParameters.length);
            structurePrinter.printTexts(writer, structures);
            if (typeParameters.length === 0) {
                insertIntoParentTextRange({
                    insertPos: getInsertPos(this),
                    parent: this,
                    newText: `<${writer.toString()}>`,
                });
            }
            else {
                insertIntoCommaSeparatedNodes({
                    parent: this.getFirstChildByKindOrThrow(common.SyntaxKind.LessThanToken).getNextSiblingIfKindOrThrow(common.SyntaxKind.SyntaxList),
                    currentNodes: typeParameters,
                    insertIndex: index,
                    newText: writer.toString(),
                    useTrailingCommas: false,
                });
            }
            return getNodesToReturn(typeParameters, this.getTypeParameters(), index, false);
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.typeParameters != null) {
                this.getTypeParameters().forEach(t => t.remove());
                this.addTypeParameters(structure.typeParameters);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                typeParameters: this.getTypeParameters().map(p => p.getStructure()),
            });
        }
    };
}
function getInsertPos(node) {
    const namedNode = node;
    if (namedNode.getNameNode != null)
        return namedNode.getNameNode().getEnd();
    else if (Node.isCallSignatureDeclaration(node) || Node.isFunctionTypeNode(node))
        return node.getFirstChildByKindOrThrow(common.SyntaxKind.OpenParenToken).getStart();
    else
        throw new common.errors.NotImplementedError(`Not implemented scenario inserting type parameters for node with kind ${node.getKindName()}.`);
}

function UnwrappableNode(Base) {
    return class extends Base {
        unwrap() {
            unwrapNode(this);
        }
    };
}

class ArrayBindingPattern extends Node {
    getElements() {
        return this.compilerNode.elements.map(e => this._getNodeFromCompilerNode(e));
    }
}

const createBase$F = (ctor) => DotDotDotTokenableNode(InitializerExpressionableNode(BindingNamedNode(ctor)));
const BindingElementBase = createBase$F(Node);
class BindingElement extends BindingElementBase {
    getPropertyNameNodeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getPropertyNameNode(), message ?? "Expected to find a property name node.", this);
    }
    getPropertyNameNode() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.propertyName);
    }
}

class ObjectBindingPattern extends Node {
    getElements() {
        return this.compilerNode.elements.map(e => this._getNodeFromCompilerNode(e));
    }
}

function AbstractableNode(Base) {
    return class extends Base {
        isAbstract() {
            return this.getAbstractKeyword() != null;
        }
        getAbstractKeyword() {
            return this.getFirstModifierByKind(common.SyntaxKind.AbstractKeyword);
        }
        getAbstractKeywordOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getAbstractKeyword(), message ?? "Expected to find an abstract keyword.", this);
        }
        setIsAbstract(isAbstract) {
            this.toggleModifier("abstract", isAbstract);
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.isAbstract != null)
                this.setIsAbstract(structure.isAbstract);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                isAbstract: this.isAbstract(),
            });
        }
    };
}

class Expression extends Node {
    getContextualType() {
        return this._context.typeChecker.getContextualType(this);
    }
}

const BinaryExpressionBase = Expression;
class BinaryExpression extends BinaryExpressionBase {
    getLeft() {
        return this._getNodeFromCompilerNode(this.compilerNode.left);
    }
    getOperatorToken() {
        return this._getNodeFromCompilerNode(this.compilerNode.operatorToken);
    }
    getRight() {
        return this._getNodeFromCompilerNode(this.compilerNode.right);
    }
}

const AssignmentExpressionBase = BinaryExpression;
class AssignmentExpression extends AssignmentExpressionBase {
    getOperatorToken() {
        return this._getNodeFromCompilerNode(this.compilerNode.operatorToken);
    }
}

const ArrayDestructuringAssignmentBase = AssignmentExpression;
class ArrayDestructuringAssignment extends ArrayDestructuringAssignmentBase {
    getLeft() {
        return this._getNodeFromCompilerNode(this.compilerNode.left);
    }
}

class UnaryExpression extends Expression {
}

class UpdateExpression extends UnaryExpression {
}

class LeftHandSideExpression extends UpdateExpression {
}

class MemberExpression extends LeftHandSideExpression {
}

class PrimaryExpression extends MemberExpression {
}

class ArrayLiteralExpression extends PrimaryExpression {
    getElements() {
        return this.compilerNode.elements.map(e => this._getNodeFromCompilerNode(e));
    }
    addElement(textOrWriterFunction, options) {
        return this.addElements([textOrWriterFunction], options)[0];
    }
    addElements(textsOrWriterFunction, options) {
        return this.insertElements(this.compilerNode.elements.length, textsOrWriterFunction, options);
    }
    insertElement(index, textOrWriterFunction, options) {
        return this.insertElements(index, [textOrWriterFunction], options)[0];
    }
    insertElements(index, textsOrWriterFunction, options = {}) {
        const elements = this.getElements();
        index = verifyAndGetIndex(index, elements.length);
        const useNewLines = getUseNewLines(this);
        const writer = useNewLines ? this._getWriterWithChildIndentation() : this._getWriterWithQueuedChildIndentation();
        const stringStructurePrinter = new StringStructurePrinter();
        const structurePrinter = useNewLines
            ? new CommaNewLineSeparatedStructuresPrinter(stringStructurePrinter)
            : new CommaSeparatedStructuresPrinter(stringStructurePrinter);
        structurePrinter.printText(writer, textsOrWriterFunction);
        return insertTexts(this);
        function insertTexts(node) {
            insertIntoCommaSeparatedNodes({
                parent: node.getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
                currentNodes: elements,
                insertIndex: index,
                newText: writer.toString(),
                useNewLines,
                useTrailingCommas: useNewLines && node._context.manipulationSettings.getUseTrailingCommas(),
            });
            const newElements = node.getElements();
            return getNodesToReturn(elements, newElements, index, false);
        }
        function getUseNewLines(node) {
            if (options.useNewLines != null)
                return options.useNewLines;
            if (elements.length > 1)
                return allElementsOnDifferentLines();
            return node.getStartLineNumber() !== node.getEndLineNumber();
            function allElementsOnDifferentLines() {
                let previousLine = elements[0].getStartLineNumber();
                for (let i = 1; i < elements.length; i++) {
                    const currentLine = elements[i].getStartLineNumber();
                    if (previousLine === currentLine)
                        return false;
                    previousLine = currentLine;
                }
                return true;
            }
        }
    }
    removeElement(elementOrIndex) {
        const elements = this.getElements();
        if (elements.length === 0)
            throw new common.errors.InvalidOperationError("Cannot remove an element when none exist.");
        const elementToRemove = typeof elementOrIndex === "number" ? getElementFromIndex(elementOrIndex) : elementOrIndex;
        removeCommaSeparatedChild(elementToRemove);
        function getElementFromIndex(index) {
            return elements[verifyAndGetIndex(index, elements.length - 1)];
        }
    }
}

function ExpressionableNode(Base) {
    return class extends Base {
        getExpression() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.expression);
        }
        getExpressionOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getExpression(), message ?? "Expected to find an expression.", this);
        }
        getExpressionIfKind(kind) {
            const expression = this.getExpression();
            return expression?.getKind() === kind ? expression : undefined;
        }
        getExpressionIfKindOrThrow(kind, message) {
            return common.errors.throwIfNullOrUndefined(this.getExpressionIfKind(kind), message ?? `An expression with the kind kind ${common.getSyntaxKindName(kind)} was expected.`, this);
        }
    };
}

function BaseExpressionedNode(Base) {
    return class extends Base {
        getExpression() {
            return this._getNodeFromCompilerNode(this.compilerNode.expression);
        }
        getExpressionIfKind(kind) {
            const { expression } = this.compilerNode;
            return expression.kind === kind ? this._getNodeFromCompilerNode(expression) : undefined;
        }
        getExpressionIfKindOrThrow(kind, message) {
            return common.errors.throwIfNullOrUndefined(this.getExpressionIfKind(kind), message ?? `An expression of the kind ${common.getSyntaxKindName(kind)} was expected.`, this);
        }
        setExpression(textOrWriterFunction) {
            this.getExpression().replaceWithText(textOrWriterFunction, this._getWriterWithQueuedChildIndentation());
            return this;
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.expression != null)
                this.setExpression(structure.expression);
            return this;
        }
    };
}
function ExpressionedNode(Base) {
    return BaseExpressionedNode(Base);
}

function ImportExpressionedNode(Base) {
    return BaseExpressionedNode(Base);
}

function LeftHandSideExpressionedNode(Base) {
    return BaseExpressionedNode(Base);
}

function SuperExpressionedNode(Base) {
    return BaseExpressionedNode(Base);
}

function UnaryExpressionedNode(Base) {
    return BaseExpressionedNode(Base);
}

const createBase$E = (ctor) => TypedNode(ExpressionedNode(ctor));
const AsExpressionBase = createBase$E(Expression);
class AsExpression extends AsExpressionBase {
}

const AwaitExpressionBase = UnaryExpressionedNode(UnaryExpression);
class AwaitExpression extends AwaitExpressionBase {
}

const createBase$D = (ctor) => TypeArgumentedNode(ArgumentedNode(QuestionDotTokenableNode(LeftHandSideExpressionedNode(ctor))));
const CallExpressionBase = createBase$D(LeftHandSideExpression);
class CallExpression extends CallExpressionBase {
    getReturnType() {
        return this._context.typeChecker.getTypeAtLocation(this);
    }
}

const CommaListExpressionBase = Expression;
class CommaListExpression extends CommaListExpressionBase {
    getElements() {
        return this.compilerNode.elements.map(e => this._getNodeFromCompilerNode(e));
    }
}

const ConditionalExpressionBase = Expression;
class ConditionalExpression extends ConditionalExpressionBase {
    getCondition() {
        return this._getNodeFromCompilerNode(this.compilerNode.condition);
    }
    getQuestionToken() {
        return this._getNodeFromCompilerNode(this.compilerNode.questionToken);
    }
    getWhenTrue() {
        return this._getNodeFromCompilerNode(this.compilerNode.whenTrue);
    }
    getColonToken() {
        return this._getNodeFromCompilerNode(this.compilerNode.colonToken);
    }
    getWhenFalse() {
        return this._getNodeFromCompilerNode(this.compilerNode.whenFalse);
    }
}

const DeleteExpressionBase = UnaryExpressionedNode(UnaryExpression);
class DeleteExpression extends DeleteExpressionBase {
}

const createBase$C = (ctor) => QuestionDotTokenableNode(LeftHandSideExpressionedNode(ctor));
const ElementAccessExpressionBase = createBase$C(MemberExpression);
class ElementAccessExpression extends ElementAccessExpressionBase {
    getArgumentExpression() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.argumentExpression);
    }
    getArgumentExpressionOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getArgumentExpression(), message ?? "Expected to find an argument expression.", this);
    }
}

const ImportExpressionBase = PrimaryExpression;
class ImportExpression extends ImportExpressionBase {
}

const LiteralExpressionBase = LiteralLikeNode(PrimaryExpression);
class LiteralExpression extends LiteralExpressionBase {
}

const MetaPropertyBase = NamedNode(PrimaryExpression);
class MetaProperty extends MetaPropertyBase {
    getKeywordToken() {
        return this.compilerNode.keywordToken;
    }
}

const createBase$B = (ctor) => TypeArgumentedNode(ArgumentedNode(LeftHandSideExpressionedNode(ctor)));
const NewExpressionBase = createBase$B(PrimaryExpression);
class NewExpression extends NewExpressionBase {
}

const NonNullExpressionBase = ExpressionedNode(LeftHandSideExpression);
class NonNullExpression extends NonNullExpressionBase {
}

class ObjectLiteralElement extends Node {
    remove() {
        removeCommaSeparatedChild(this);
    }
}

class CommentObjectLiteralElement extends ObjectLiteralElement {
}

const ObjectDestructuringAssignmentBase = AssignmentExpression;
class ObjectDestructuringAssignment extends ObjectDestructuringAssignmentBase {
    getLeft() {
        return this._getNodeFromCompilerNode(this.compilerNode.left);
    }
}

const ObjectLiteralExpressionBase = PrimaryExpression;
class ObjectLiteralExpression extends ObjectLiteralExpressionBase {
    getPropertyOrThrow(nameOrFindFunction) {
        return common.errors.throwIfNullOrUndefined(this.getProperty(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("property", nameOrFindFunction));
    }
    getProperty(nameOrFindFunction) {
        let findFunc;
        if (typeof nameOrFindFunction === "string") {
            findFunc = prop => {
                if (prop[common.nameof("getName")] == null)
                    return false;
                return prop.getName() === nameOrFindFunction;
            };
        }
        else {
            findFunc = nameOrFindFunction;
        }
        return this.getProperties().find(findFunc);
    }
    getProperties() {
        return this.compilerNode.properties.map(p => this._getNodeFromCompilerNode(p));
    }
    getPropertiesWithComments() {
        const members = ExtendedParser.getContainerArray(this.compilerNode, this.getSourceFile().compilerNode);
        return members.map(p => this._getNodeFromCompilerNode(p));
    }
    #getAddIndex() {
        const members = ExtendedParser.getContainerArray(this.compilerNode, this.getSourceFile().compilerNode);
        return members.length;
    }
    addProperty(structure) {
        return this.insertProperties(this.#getAddIndex(), [structure])[0];
    }
    addProperties(structures) {
        return this.insertProperties(this.#getAddIndex(), structures);
    }
    insertProperty(index, structure) {
        return this.insertProperties(index, [structure])[0];
    }
    insertProperties(index, structures) {
        const properties = this.getPropertiesWithComments();
        index = verifyAndGetIndex(index, properties.length);
        const writer = this._getWriterWithChildIndentation();
        const structurePrinter = this._context.structurePrinterFactory.forObjectLiteralExpressionProperty();
        structurePrinter.printTexts(writer, structures);
        insertIntoCommaSeparatedNodes({
            parent: this.getChildSyntaxListOrThrow(),
            currentNodes: properties,
            insertIndex: index,
            newText: writer.toString(),
            useNewLines: true,
            useTrailingCommas: this._context.manipulationSettings.getUseTrailingCommas(),
        });
        return getNodesToReturn(properties, this.getPropertiesWithComments(), index, true);
    }
    addPropertyAssignment(structure) {
        return this.addPropertyAssignments([structure])[0];
    }
    addPropertyAssignments(structures) {
        return this.insertPropertyAssignments(this.#getAddIndex(), structures);
    }
    insertPropertyAssignment(index, structure) {
        return this.insertPropertyAssignments(index, [structure])[0];
    }
    insertPropertyAssignments(index, structures) {
        return this.#insertProperty(index, structures, () => this._context.structurePrinterFactory.forPropertyAssignment());
    }
    addShorthandPropertyAssignment(structure) {
        return this.addShorthandPropertyAssignments([structure])[0];
    }
    addShorthandPropertyAssignments(structures) {
        return this.insertShorthandPropertyAssignments(this.#getAddIndex(), structures);
    }
    insertShorthandPropertyAssignment(index, structure) {
        return this.insertShorthandPropertyAssignments(index, [structure])[0];
    }
    insertShorthandPropertyAssignments(index, structures) {
        return this.#insertProperty(index, structures, () => this._context.structurePrinterFactory.forShorthandPropertyAssignment());
    }
    addSpreadAssignment(structure) {
        return this.addSpreadAssignments([structure])[0];
    }
    addSpreadAssignments(structures) {
        return this.insertSpreadAssignments(this.#getAddIndex(), structures);
    }
    insertSpreadAssignment(index, structure) {
        return this.insertSpreadAssignments(index, [structure])[0];
    }
    insertSpreadAssignments(index, structures) {
        return this.#insertProperty(index, structures, () => this._context.structurePrinterFactory.forSpreadAssignment());
    }
    addMethod(structure) {
        return this.addMethods([structure])[0];
    }
    addMethods(structures) {
        return this.insertMethods(this.#getAddIndex(), structures);
    }
    insertMethod(index, structure) {
        return this.insertMethods(index, [structure])[0];
    }
    insertMethods(index, structures) {
        return this.#insertProperty(index, structures, () => this._context.structurePrinterFactory.forMethodDeclaration({ isAmbient: false }));
    }
    addGetAccessor(structure) {
        return this.addGetAccessors([structure])[0];
    }
    addGetAccessors(structures) {
        return this.insertGetAccessors(this.#getAddIndex(), structures);
    }
    insertGetAccessor(index, structure) {
        return this.insertGetAccessors(index, [structure])[0];
    }
    insertGetAccessors(index, structures) {
        return this.#insertProperty(index, structures, () => this._context.structurePrinterFactory.forGetAccessorDeclaration({ isAmbient: false }));
    }
    addSetAccessor(structure) {
        return this.addSetAccessors([structure])[0];
    }
    addSetAccessors(structures) {
        return this.insertSetAccessors(this.#getAddIndex(), structures);
    }
    insertSetAccessor(index, structure) {
        return this.insertSetAccessors(index, [structure])[0];
    }
    insertSetAccessors(index, structures) {
        return this.#insertProperty(index, structures, () => this._context.structurePrinterFactory.forSetAccessorDeclaration({ isAmbient: false }));
    }
    #insertProperty(index, structures, createStructurePrinter) {
        index = verifyAndGetIndex(index, this.#getAddIndex());
        const writer = this._getWriterWithChildIndentation();
        const structurePrinter = new CommaNewLineSeparatedStructuresPrinter(createStructurePrinter());
        const oldProperties = this.getPropertiesWithComments();
        structurePrinter.printText(writer, structures);
        insertIntoCommaSeparatedNodes({
            parent: this.getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
            currentNodes: oldProperties,
            insertIndex: index,
            newText: writer.toString(),
            useNewLines: true,
            useTrailingCommas: this._context.manipulationSettings.getUseTrailingCommas(),
        });
        return getNodesToReturn(oldProperties, this.getPropertiesWithComments(), index, false);
    }
}

const createBase$A = (ctor) => InitializerExpressionGetableNode(QuestionTokenableNode(PropertyNamedNode(ctor)));
const PropertyAssignmentBase = createBase$A(ObjectLiteralElement);
class PropertyAssignment extends PropertyAssignmentBase {
    removeInitializer() {
        const initializer = this.getInitializerOrThrow();
        const colonToken = initializer.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.ColonToken);
        const childIndex = this.getChildIndex();
        const sourceFileText = this._sourceFile.getFullText();
        const insertPos = this.getStart();
        const newText = sourceFileText.substring(insertPos, colonToken.getPos()) + sourceFileText.substring(initializer.getEnd(), this.getEnd());
        const parent = this.getParentSyntaxList() || this.getParentOrThrow();
        insertIntoParentTextRange({
            insertPos,
            newText,
            parent,
            replacing: {
                textLength: this.getWidth(),
            },
        });
        return parent.getChildAtIndexIfKindOrThrow(childIndex, common.SyntaxKind.ShorthandPropertyAssignment);
    }
    setInitializer(textOrWriterFunction) {
        const initializer = this.getInitializerOrThrow();
        insertIntoParentTextRange({
            insertPos: initializer.getStart(),
            newText: getTextFromStringOrWriter(this._getWriterWithQueuedChildIndentation(), textOrWriterFunction),
            parent: this,
            replacing: {
                textLength: initializer.getWidth(),
            },
        });
        return this;
    }
    set(structure) {
        callBaseSet(PropertyAssignmentBase.prototype, this, structure);
        if (structure.initializer != null)
            this.setInitializer(structure.initializer);
        else if (structure.hasOwnProperty(common.nameof(structure, "initializer")))
            return this.removeInitializer();
        return this;
    }
    getStructure() {
        const initializer = this.getInitializerOrThrow();
        const structure = callBaseGetStructure(PropertyAssignmentBase.prototype, this, {
            kind: exports.StructureKind.PropertyAssignment,
            initializer: initializer.getText(),
        });
        delete structure.hasQuestionToken;
        return structure;
    }
}

const createBase$z = (ctor) => InitializerExpressionGetableNode(QuestionTokenableNode(NamedNode(ctor)));
const ShorthandPropertyAssignmentBase = createBase$z(ObjectLiteralElement);
class ShorthandPropertyAssignment extends ShorthandPropertyAssignmentBase {
    hasObjectAssignmentInitializer() {
        return this.compilerNode.objectAssignmentInitializer != null;
    }
    getObjectAssignmentInitializerOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getObjectAssignmentInitializer(), message ?? "Expected to find an object assignment initializer.", this);
    }
    getObjectAssignmentInitializer() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.objectAssignmentInitializer);
    }
    getEqualsTokenOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getEqualsToken(), message ?? "Expected to find an equals token.", this);
    }
    getEqualsToken() {
        const equalsToken = this.compilerNode.equalsToken;
        if (equalsToken == null)
            return undefined;
        return this._getNodeFromCompilerNode(equalsToken);
    }
    removeObjectAssignmentInitializer() {
        if (!this.hasObjectAssignmentInitializer())
            return this;
        removeChildren({
            children: [this.getEqualsTokenOrThrow(), this.getObjectAssignmentInitializerOrThrow()],
            removePrecedingSpaces: true,
        });
        return this;
    }
    setInitializer(text) {
        const parent = this.getParentSyntaxList() || this.getParentOrThrow();
        const childIndex = this.getChildIndex();
        insertIntoParentTextRange({
            insertPos: this.getStart(),
            newText: this.getText() + `: ${text}`,
            parent,
            replacing: {
                textLength: this.getWidth(),
            },
        });
        return parent.getChildAtIndexIfKindOrThrow(childIndex, common.SyntaxKind.PropertyAssignment);
    }
    set(structure) {
        callBaseSet(ShorthandPropertyAssignmentBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        const structure = callBaseGetStructure(ShorthandPropertyAssignmentBase.prototype, this, {
            kind: exports.StructureKind.ShorthandPropertyAssignment,
        });
        delete structure.hasQuestionToken;
        return structure;
    }
    getValueSymbol() {
        return this._context.typeChecker.getShorthandAssignmentValueSymbol(this);
    }
    getValueSymbolOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getValueSymbol(), message ?? "Expected to find a value symbol.", this);
    }
}

const SpreadAssignmentBase = ExpressionedNode(ObjectLiteralElement);
class SpreadAssignment extends SpreadAssignmentBase {
    set(structure) {
        callBaseSet(SpreadAssignmentBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(SpreadAssignmentBase.prototype, this, {
            kind: exports.StructureKind.SpreadAssignment,
            expression: this.getExpression().getText(),
        });
    }
}

const OmittedExpressionBase = Expression;
class OmittedExpression extends OmittedExpressionBase {
}

const ParenthesizedExpressionBase = ExpressionedNode(Expression);
class ParenthesizedExpression extends ParenthesizedExpressionBase {
}

const PartiallyEmittedExpressionBase = ExpressionedNode(Expression);
class PartiallyEmittedExpression extends PartiallyEmittedExpressionBase {
}

const PostfixUnaryExpressionBase = UnaryExpression;
class PostfixUnaryExpression extends PostfixUnaryExpressionBase {
    getOperatorToken() {
        return this.compilerNode.operator;
    }
    getOperand() {
        return this._getNodeFromCompilerNode(this.compilerNode.operand);
    }
}

const PrefixUnaryExpressionBase = UnaryExpression;
class PrefixUnaryExpression extends PrefixUnaryExpressionBase {
    getOperatorToken() {
        return this.compilerNode.operator;
    }
    getOperand() {
        return this._getNodeFromCompilerNode(this.compilerNode.operand);
    }
}

const createBase$y = (ctor) => NamedNode(QuestionDotTokenableNode(LeftHandSideExpressionedNode(ctor)));
const PropertyAccessExpressionBase = createBase$y(MemberExpression);
class PropertyAccessExpression extends PropertyAccessExpressionBase {
}

const createBase$x = (ctor) => TypedNode(ExpressionedNode(ctor));
const SatisfiesExpressionBase = createBase$x(Expression);
class SatisfiesExpression extends SatisfiesExpressionBase {
}

const SpreadElementBase = ExpressionedNode(Expression);
class SpreadElement extends SpreadElementBase {
}

const SuperElementAccessExpressionBase = SuperExpressionedNode(ElementAccessExpression);
class SuperElementAccessExpression extends SuperElementAccessExpressionBase {
}

const SuperExpressionBase = PrimaryExpression;
class SuperExpression extends SuperExpressionBase {
}

const SuperPropertyAccessExpressionBase = SuperExpressionedNode(PropertyAccessExpression);
class SuperPropertyAccessExpression extends SuperPropertyAccessExpressionBase {
}

const ThisExpressionBase = PrimaryExpression;
class ThisExpression extends ThisExpressionBase {
}

const createBase$w = (ctor) => TypedNode(UnaryExpressionedNode(ctor));
const TypeAssertionBase = createBase$w(UnaryExpression);
class TypeAssertion extends TypeAssertionBase {
}

const TypeOfExpressionBase = UnaryExpressionedNode(UnaryExpression);
class TypeOfExpression extends TypeOfExpressionBase {
}

const VoidExpressionBase = UnaryExpressionedNode(UnaryExpression);
class VoidExpression extends VoidExpressionBase {
}

const YieldExpressionBase = ExpressionableNode(GeneratorableNode(Expression));
class YieldExpression extends YieldExpressionBase {
}

const StatementBase = ChildOrderableNode(Node);
class Statement extends StatementBase {
    remove() {
        removeStatementedNodeChild(this);
    }
}

function StatementedNode(Base) {
    return class extends Base {
        getStatements() {
            const statementsContainer = this._getCompilerStatementsContainer();
            const statements = statementsContainer?.statements ?? [];
            return statements.map(s => this._getNodeFromCompilerNode(s));
        }
        getStatementsWithComments() {
            return this._getCompilerStatementsWithComments().map(s => this._getNodeFromCompilerNode(s));
        }
        getStatement(findFunction) {
            return this.getStatements().find(findFunction);
        }
        getStatementOrThrow(findFunction, message) {
            return common.errors.throwIfNullOrUndefined(this.getStatement(findFunction), message ?? "Expected to find a statement matching the provided condition.", this);
        }
        getStatementByKind(kind) {
            const statement = this._getCompilerStatementsWithComments().find(s => s.kind === kind);
            return this._getNodeFromCompilerNodeIfExists(statement);
        }
        getStatementByKindOrThrow(kind, message) {
            return common.errors.throwIfNullOrUndefined(this.getStatementByKind(kind), message ?? `Expected to find a statement with syntax kind ${common.getSyntaxKindName(kind)}.`, this);
        }
        addStatements(textOrWriterFunction) {
            return this.insertStatements(this._getCompilerStatementsWithComments().length, textOrWriterFunction);
        }
        insertStatements(index, statements) {
            addBodyIfNotExists(this);
            const writerFunction = (writer) => {
                const statementsPrinter = this._context.structurePrinterFactory.forStatement({ isAmbient: isNodeAmbientOrInAmbientContext(this) });
                statementsPrinter.printTexts(writer, statements);
            };
            return getChildSyntaxList.call(this).insertChildText(index, writerFunction);
            function getChildSyntaxList() {
                const childSyntaxList = this.getChildSyntaxListOrThrow();
                if (Node.isCaseClause(this) || Node.isDefaultClause(this)) {
                    const block = childSyntaxList.getFirstChildIfKind(common.SyntaxKind.Block);
                    if (block != null)
                        return block.getChildSyntaxListOrThrow();
                }
                return childSyntaxList;
            }
        }
        removeStatement(index) {
            index = verifyAndGetIndex(index, this._getCompilerStatementsWithComments().length - 1);
            return this.removeStatements([index, index]);
        }
        removeStatements(indexRange) {
            const statements = this.getStatementsWithComments();
            common.errors.throwIfRangeOutOfRange(indexRange, [0, statements.length], "indexRange");
            removeStatementedNodeChildren(statements.slice(indexRange[0], indexRange[1] + 1));
            return this;
        }
        addClass(structure) {
            return this.addClasses([structure])[0];
        }
        addClasses(structures) {
            return this.insertClasses(this._getCompilerStatementsWithComments().length, structures);
        }
        insertClass(index, structure) {
            return this.insertClasses(index, [structure])[0];
        }
        insertClasses(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.ClassDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forClassDeclaration({ isAmbient: isNodeAmbientOrInAmbientContext(this) })
                            .printTexts(writer, structures);
                    });
                },
            });
        }
        getClasses() {
            return this.getStatements().filter(Node.isClassDeclaration);
        }
        getClass(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getClasses(), nameOrFindFunction);
        }
        getClassOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getClass(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class", nameOrFindFunction));
        }
        addEnum(structure) {
            return this.addEnums([structure])[0];
        }
        addEnums(structures) {
            return this.insertEnums(this._getCompilerStatementsWithComments().length, structures);
        }
        insertEnum(index, structure) {
            return this.insertEnums(index, [structure])[0];
        }
        insertEnums(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.EnumDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forEnumDeclaration().printTexts(writer, structures);
                    });
                },
            });
        }
        getEnums() {
            return this.getStatements().filter(Node.isEnumDeclaration);
        }
        getEnum(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getEnums(), nameOrFindFunction);
        }
        getEnumOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getEnum(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("enum", nameOrFindFunction));
        }
        addFunction(structure) {
            return this.addFunctions([structure])[0];
        }
        addFunctions(structures) {
            return this.insertFunctions(this._getCompilerStatementsWithComments().length, structures);
        }
        insertFunction(index, structure) {
            return this.insertFunctions(index, [structure])[0];
        }
        insertFunctions(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.FunctionDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forFunctionDeclaration({
                            isAmbient: isNodeAmbientOrInAmbientContext(this),
                        }).printTexts(writer, structures);
                    }, {
                        previousNewLine: previousMember => structures[0].hasDeclareKeyword === true
                            && Node.isFunctionDeclaration(previousMember)
                            && previousMember.getBody() == null,
                        nextNewLine: nextMember => structures[structures.length - 1].hasDeclareKeyword === true
                            && Node.isFunctionDeclaration(nextMember)
                            && nextMember.getBody() == null,
                    });
                },
            });
        }
        getFunctions() {
            return this.getStatements().filter(Node.isFunctionDeclaration).filter(f => f.isAmbient() || f.isImplementation());
        }
        getFunction(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getFunctions(), nameOrFindFunction);
        }
        getFunctionOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getFunction(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("function", nameOrFindFunction));
        }
        addInterface(structure) {
            return this.addInterfaces([structure])[0];
        }
        addInterfaces(structures) {
            return this.insertInterfaces(this._getCompilerStatementsWithComments().length, structures);
        }
        insertInterface(index, structure) {
            return this.insertInterfaces(index, [structure])[0];
        }
        insertInterfaces(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.InterfaceDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forInterfaceDeclaration().printTexts(writer, structures);
                    });
                },
            });
        }
        getInterfaces() {
            return this.getStatements().filter(Node.isInterfaceDeclaration);
        }
        getInterface(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getInterfaces(), nameOrFindFunction);
        }
        getInterfaceOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getInterface(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("interface", nameOrFindFunction));
        }
        addModule(structure) {
            return this.addModules([structure])[0];
        }
        addModules(structures) {
            return this.insertModules(this._getCompilerStatementsWithComments().length, structures);
        }
        insertModule(index, structure) {
            return this.insertModules(index, [structure])[0];
        }
        insertModules(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.ModuleDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forModuleDeclaration({ isAmbient: isNodeAmbientOrInAmbientContext(this) })
                            .printTexts(writer, structures);
                    });
                },
            });
        }
        getModules() {
            return this.getStatements().filter(Node.isModuleDeclaration);
        }
        getModule(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getModules(), nameOrFindFunction);
        }
        getModuleOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getModule(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("module", nameOrFindFunction));
        }
        addTypeAlias(structure) {
            return this.addTypeAliases([structure])[0];
        }
        addTypeAliases(structures) {
            return this.insertTypeAliases(this._getCompilerStatementsWithComments().length, structures);
        }
        insertTypeAlias(index, structure) {
            return this.insertTypeAliases(index, [structure])[0];
        }
        insertTypeAliases(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.TypeAliasDeclaration,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forTypeAliasDeclaration().printTexts(writer, structures);
                    }, {
                        previousNewLine: previousMember => Node.isTypeAliasDeclaration(previousMember),
                        nextNewLine: nextMember => Node.isTypeAliasDeclaration(nextMember),
                    });
                },
            });
        }
        getTypeAliases() {
            return this.getStatements().filter(Node.isTypeAliasDeclaration);
        }
        getTypeAlias(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getTypeAliases(), nameOrFindFunction);
        }
        getTypeAliasOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getTypeAlias(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("type alias", nameOrFindFunction));
        }
        getVariableStatements() {
            return this.getStatements().filter(Node.isVariableStatement);
        }
        getVariableStatement(nameOrFindFunction) {
            return this.getVariableStatements().find(getFindFunction());
            function getFindFunction() {
                if (typeof nameOrFindFunction === "string")
                    return (statement) => statement.getDeclarations().some(d => nodeHasName(d, nameOrFindFunction));
                return nameOrFindFunction;
            }
        }
        getVariableStatementOrThrow(nameOrFindFunction, message) {
            return common.errors.throwIfNullOrUndefined(this.getVariableStatement(nameOrFindFunction), message ?? "Expected to find a variable statement that matched the provided condition.", this);
        }
        addVariableStatement(structure) {
            return this.addVariableStatements([structure])[0];
        }
        addVariableStatements(structures) {
            return this.insertVariableStatements(this._getCompilerStatementsWithComments().length, structures);
        }
        insertVariableStatement(index, structure) {
            return this.insertVariableStatements(index, [structure])[0];
        }
        insertVariableStatements(index, structures) {
            return this._insertChildren({
                expectedKind: common.SyntaxKind.VariableStatement,
                index,
                structures,
                write: (writer, info) => {
                    this._standardWrite(writer, info, () => {
                        this._context.structurePrinterFactory.forVariableStatement().printTexts(writer, structures);
                    }, {
                        previousNewLine: previousMember => Node.isVariableStatement(previousMember),
                        nextNewLine: nextMember => Node.isVariableStatement(nextMember),
                    });
                },
            });
        }
        getVariableDeclarations() {
            const variables = [];
            for (const list of this.getVariableStatements())
                variables.push(...list.getDeclarations());
            return variables;
        }
        getVariableDeclaration(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getVariableDeclarations(), nameOrFindFunction);
        }
        getVariableDeclarationOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getVariableDeclaration(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("variable declaration", nameOrFindFunction));
        }
        getStructure() {
            const structure = {};
            if (Node.isBodyable(this) && !this.hasBody())
                structure.statements = undefined;
            else {
                structure.statements = this.getStatements().map(s => {
                    if (Node._hasStructure(s))
                        return s.getStructure();
                    return s.getText({ trimLeadingIndentation: true });
                });
            }
            return callBaseGetStructure(Base.prototype, this, structure);
        }
        set(structure) {
            if (Node.isBodyable(this) && structure.statements == null && structure.hasOwnProperty(common.nameof(structure, "statements")))
                this.removeBody();
            else if (structure.statements != null) {
                const statementCount = this._getCompilerStatementsWithComments().length;
                if (statementCount > 0)
                    this.removeStatements([0, statementCount - 1]);
            }
            callBaseSet(Base.prototype, this, structure);
            if (structure.statements != null)
                this.addStatements(structure.statements);
            return this;
        }
        _getCompilerStatementsWithComments() {
            const statementsContainer = this._getCompilerStatementsContainer();
            if (statementsContainer == null)
                return [];
            else {
                return ExtendedParser.getContainerArray(statementsContainer, this._sourceFile.compilerNode);
            }
        }
        _getCompilerStatementsContainer() {
            if (Node.isSourceFile(this) || Node.isCaseClause(this) || Node.isDefaultClause(this))
                return this.compilerNode;
            else if (Node.isModuleDeclaration(this)) {
                const body = this._getInnerBody();
                if (body == null)
                    return undefined;
                else
                    return body.compilerNode;
            }
            else if (Node.isBodyable(this) || Node.isBodied(this))
                return this.getBody()?.compilerNode;
            else if (Node.isBlock(this) || Node.isModuleBlock(this))
                return this.compilerNode;
            else
                throw new common.errors.NotImplementedError(`Could not find the statements for node kind: ${this.getKindName()}, text: ${this.getText()}`);
        }
        _insertChildren(opts) {
            addBodyIfNotExists(this);
            return insertIntoBracesOrSourceFileWithGetChildren({
                expectedKind: opts.expectedKind,
                getIndexedChildren: () => this.getStatementsWithComments(),
                index: opts.index,
                parent: this,
                structures: opts.structures,
                write: (writer, info) => opts.write(writer, info),
            });
        }
        _standardWrite(writer, info, writeStructures, opts = {}) {
            if (info.previousMember != null && (opts.previousNewLine == null || !opts.previousNewLine(info.previousMember))
                && !Node.isCommentNode(info.previousMember)) {
                writer.blankLine();
            }
            else if (!info.isStartOfFile) {
                writer.newLineIfLastNot();
            }
            writeStructures();
            if (info.nextMember != null && (opts.nextNewLine == null || !opts.nextNewLine(info.nextMember)))
                writer.blankLine();
            else
                writer.newLineIfLastNot();
        }
    };
}
function addBodyIfNotExists(node) {
    if (Node.isBodyable(node) && !node.hasBody())
        node.addBody();
}

const createBase$v = (ctor) => TextInsertableNode(StatementedNode(ctor));
const BlockBase = createBase$v(Statement);
class Block extends BlockBase {
}

class BreakStatement extends Statement {
    getLabel() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.label);
    }
    getLabelOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getLabel(), message ?? "Expected to find a label.", this);
    }
}

const CaseBlockBase = TextInsertableNode(Node);
class CaseBlock extends CaseBlockBase {
    getClauses() {
        const clauses = this.compilerNode.clauses || [];
        return clauses.map(s => this._getNodeFromCompilerNode(s));
    }
    removeClause(index) {
        index = verifyAndGetIndex(index, this.getClauses().length - 1);
        return this.removeClauses([index, index]);
    }
    removeClauses(indexRange) {
        const clauses = this.getClauses();
        common.errors.throwIfRangeOutOfRange(indexRange, [0, clauses.length], "indexRange");
        removeClausedNodeChildren(clauses.slice(indexRange[0], indexRange[1] + 1));
        return this;
    }
}

const createBase$u = (ctor) => JSDocableNode(ExpressionedNode(TextInsertableNode(StatementedNode(ctor))));
const CaseClauseBase = createBase$u(Node);
class CaseClause extends CaseClauseBase {
    remove() {
        removeClausedNodeChild(this);
    }
}

const CatchClauseBase = Node;
class CatchClause extends CatchClauseBase {
    getBlock() {
        return this._getNodeFromCompilerNode(this.compilerNode.block);
    }
    getVariableDeclaration() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.variableDeclaration);
    }
    getVariableDeclarationOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getVariableDeclaration(), message ?? "Expected to find a variable declaration.", this);
    }
}

class CommentStatement extends Statement {
}

class ContinueStatement extends Statement {
    getLabel() {
        return this.compilerNode.label == null
            ? undefined
            : this._getNodeFromCompilerNode(this.compilerNode.label);
    }
    getLabelOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getLabel(), message ?? "Expected to find a label.", this);
    }
}

const DebuggerStatementBase = Statement;
class DebuggerStatement extends DebuggerStatementBase {
}

const createBase$t = (ctor) => TextInsertableNode(StatementedNode(ctor));
const DefaultClauseBase = createBase$t(Node);
class DefaultClause extends DefaultClauseBase {
    remove() {
        removeClausedNodeChild(this);
    }
}

class IterationStatement extends Statement {
    getStatement() {
        return this._getNodeFromCompilerNode(this.compilerNode.statement);
    }
}

const DoStatementBase = ExpressionedNode(IterationStatement);
class DoStatement extends DoStatementBase {
}

const EmptyStatementBase = Statement;
class EmptyStatement extends EmptyStatementBase {
}

const ExpressionStatementBase = ExpressionedNode(JSDocableNode(Statement));
class ExpressionStatement extends ExpressionStatementBase {
}

const ForInStatementBase = ExpressionedNode(IterationStatement);
class ForInStatement extends ForInStatementBase {
    getInitializer() {
        return this._getNodeFromCompilerNode(this.compilerNode.initializer);
    }
}

const ForOfStatementBase = ExpressionedNode(AwaitableNode(IterationStatement));
class ForOfStatement extends ForOfStatementBase {
    getInitializer() {
        return this._getNodeFromCompilerNode(this.compilerNode.initializer);
    }
}

const ForStatementBase = IterationStatement;
class ForStatement extends ForStatementBase {
    getInitializer() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.initializer);
    }
    getInitializerOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getInitializer(), message ?? "Expected to find an initializer.", this);
    }
    getCondition() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.condition);
    }
    getConditionOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getCondition(), message ?? "Expected to find a condition.", this);
    }
    getIncrementor() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.incrementor);
    }
    getIncrementorOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getIncrementor(), message ?? "Expected to find an incrementor.", this);
    }
}

const IfStatementBase = ExpressionedNode(Statement);
class IfStatement extends IfStatementBase {
    getThenStatement() {
        return this._getNodeFromCompilerNode(this.compilerNode.thenStatement);
    }
    getElseStatement() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.elseStatement);
    }
    remove() {
        const nodes = [];
        if (Node.isIfStatement(this.getParentOrThrow()))
            nodes.push(this.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.ElseKeyword));
        nodes.push(this);
        removeStatementedNodeChildren(nodes);
    }
}

const LabeledStatementBase = JSDocableNode(Statement);
class LabeledStatement extends LabeledStatementBase {
    getLabel() {
        return this._getNodeFromCompilerNode(this.compilerNode.label);
    }
    getStatement() {
        return this._getNodeFromCompilerNode(this.compilerNode.statement);
    }
}

const NotEmittedStatementBase = Statement;
class NotEmittedStatement extends NotEmittedStatementBase {
}

const ReturnStatementBase = ExpressionableNode(Statement);
class ReturnStatement extends ReturnStatementBase {
}

const SwitchStatementBase = ExpressionedNode(Statement);
class SwitchStatement extends SwitchStatementBase {
    getCaseBlock() {
        return this._getNodeFromCompilerNode(this.compilerNode.caseBlock);
    }
    getClauses() {
        return this.getCaseBlock().getClauses();
    }
    removeClause(index) {
        return this.getCaseBlock().removeClause(index);
    }
    removeClauses(indexRange) {
        return this.getCaseBlock().removeClauses(indexRange);
    }
}

const ThrowStatementBase = ExpressionedNode(Statement);
class ThrowStatement extends ThrowStatementBase {
}

const TryStatementBase = Statement;
class TryStatement extends TryStatementBase {
    getTryBlock() {
        return this._getNodeFromCompilerNode(this.compilerNode.tryBlock);
    }
    getCatchClause() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.catchClause);
    }
    getCatchClauseOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getCatchClause(), message ?? "Expected to find a catch clause.", this);
    }
    getFinallyBlock() {
        if (this.compilerNode.finallyBlock == null || this.compilerNode.finallyBlock.getFullWidth() === 0)
            return undefined;
        return this._getNodeFromCompilerNode(this.compilerNode.finallyBlock);
    }
    getFinallyBlockOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getFinallyBlock(), message ?? "Expected to find a finally block.", this);
    }
}

const ExportAssignmentBase = ExpressionedNode(JSDocableNode(Statement));
class ExportAssignment extends ExportAssignmentBase {
    isExportEquals() {
        return this.compilerNode.isExportEquals || false;
    }
    setIsExportEquals(value) {
        if (this.isExportEquals() === value)
            return this;
        if (value)
            this.getFirstChildByKindOrThrow(common.SyntaxKind.DefaultKeyword).replaceWithText("=");
        else
            this.getFirstChildByKindOrThrow(common.SyntaxKind.EqualsToken).replaceWithText("default");
        return this;
    }
    set(structure) {
        callBaseSet(ExportAssignmentBase.prototype, this, structure);
        if (structure.expression != null)
            this.setExpression(structure.expression);
        if (structure.isExportEquals != null)
            this.setIsExportEquals(structure.isExportEquals);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(Statement.prototype, this, {
            kind: exports.StructureKind.ExportAssignment,
            expression: this.getExpression().getText(),
            isExportEquals: this.isExportEquals(),
        });
    }
}

const ExportDeclarationBase = Statement;
class ExportDeclaration extends ExportDeclarationBase {
    isTypeOnly() {
        return this.compilerNode.isTypeOnly;
    }
    setIsTypeOnly(value) {
        if (this.isTypeOnly() === value)
            return this;
        if (value) {
            insertIntoParentTextRange({
                parent: this,
                insertPos: (this.getNodeProperty("exportClause") ?? this.getFirstChildByKindOrThrow(common.SyntaxKind.AsteriskToken)).getStart(),
                newText: "type ",
            });
        }
        else {
            const typeKeyword = this.getFirstChildByKindOrThrow(common.ts.SyntaxKind.TypeKeyword);
            removeChildren({
                children: [typeKeyword],
                removeFollowingSpaces: true,
            });
        }
        return this;
    }
    getNamespaceExport() {
        const exportClause = this.getNodeProperty("exportClause");
        return exportClause != null && Node.isNamespaceExport(exportClause) ? exportClause : undefined;
    }
    getNamespaceExportOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getNamespaceExport(), message ?? "Expected to find a namespace export.", this);
    }
    setNamespaceExport(name) {
        const exportClause = this.getNodeProperty("exportClause");
        const newText = common.StringUtils.isNullOrWhitespace(name) ? "*" : `* as ${name}`;
        if (exportClause == null) {
            const asteriskToken = this.getFirstChildByKindOrThrow(common.SyntaxKind.AsteriskToken);
            insertIntoParentTextRange({
                insertPos: asteriskToken.getStart(),
                parent: this,
                newText,
                replacing: {
                    textLength: 1,
                },
            });
        }
        else if (Node.isNamespaceExport(exportClause))
            exportClause.getNameNode().replaceWithText(name);
        else {
            insertIntoParentTextRange({
                insertPos: exportClause.getStart(),
                parent: this,
                newText,
                replacing: {
                    textLength: exportClause.getWidth(),
                },
            });
        }
        return this;
    }
    setModuleSpecifier(textOrSourceFile) {
        const text = typeof textOrSourceFile === "string" ? textOrSourceFile : this._sourceFile.getRelativePathAsModuleSpecifierTo(textOrSourceFile);
        if (common.StringUtils.isNullOrEmpty(text)) {
            this.removeModuleSpecifier();
            return this;
        }
        const stringLiteral = this.getModuleSpecifier();
        if (stringLiteral == null) {
            const semiColonToken = this.getLastChildIfKind(common.SyntaxKind.SemicolonToken);
            const quoteKind = this._context.manipulationSettings.getQuoteKind();
            insertIntoParentTextRange({
                insertPos: semiColonToken != null ? semiColonToken.getPos() : this.getEnd(),
                parent: this,
                newText: ` from ${quoteKind}${text}${quoteKind}`,
            });
        }
        else {
            stringLiteral.setLiteralValue(text);
        }
        return this;
    }
    getModuleSpecifier() {
        const moduleSpecifier = this._getNodeFromCompilerNodeIfExists(this.compilerNode.moduleSpecifier);
        if (moduleSpecifier == null)
            return undefined;
        if (!Node.isStringLiteral(moduleSpecifier))
            throw new common.errors.InvalidOperationError("Expected the module specifier to be a string literal.");
        return moduleSpecifier;
    }
    getModuleSpecifierValue() {
        const moduleSpecifier = this.getModuleSpecifier();
        return moduleSpecifier?.getLiteralValue();
    }
    getModuleSpecifierSourceFileOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getModuleSpecifierSourceFile(), message ?? `A module specifier source file was expected.`, this);
    }
    getModuleSpecifierSourceFile() {
        const stringLiteral = this.getLastChildByKind(common.SyntaxKind.StringLiteral);
        if (stringLiteral == null)
            return undefined;
        const symbol = stringLiteral.getSymbol();
        if (symbol == null)
            return undefined;
        const declaration = symbol.getDeclarations()[0];
        return declaration != null && Node.isSourceFile(declaration) ? declaration : undefined;
    }
    isModuleSpecifierRelative() {
        const moduleSpecifierValue = this.getModuleSpecifierValue();
        if (moduleSpecifierValue == null)
            return false;
        return ModuleUtils.isModuleSpecifierRelative(moduleSpecifierValue);
    }
    removeModuleSpecifier() {
        const moduleSpecifier = this.getModuleSpecifier();
        if (moduleSpecifier == null)
            return this;
        if (!this.hasNamedExports())
            throw new common.errors.InvalidOperationError(`Cannot remove the module specifier from an export declaration that has no named exports.`);
        removeChildren({
            children: [this.getFirstChildByKindOrThrow(common.SyntaxKind.FromKeyword), moduleSpecifier],
            removePrecedingNewLines: true,
            removePrecedingSpaces: true,
        });
        return this;
    }
    hasModuleSpecifier() {
        return this.getLastChildByKind(common.SyntaxKind.StringLiteral) != null;
    }
    isNamespaceExport() {
        return !this.hasNamedExports();
    }
    hasNamedExports() {
        return this.compilerNode.exportClause?.kind === common.SyntaxKind.NamedExports;
    }
    addNamedExport(namedExport) {
        return this.addNamedExports([namedExport])[0];
    }
    addNamedExports(namedExports) {
        return this.insertNamedExports(this.getNamedExports().length, namedExports);
    }
    insertNamedExport(index, namedExport) {
        return this.insertNamedExports(index, [namedExport])[0];
    }
    insertNamedExports(index, namedExports) {
        if (!(namedExports instanceof Function) && common.ArrayUtils.isNullOrEmpty(namedExports))
            return [];
        const originalNamedExports = this.getNamedExports();
        const writer = this._getWriterWithIndentation();
        const namedExportStructurePrinter = this._context.structurePrinterFactory.forNamedImportExportSpecifier();
        index = verifyAndGetIndex(index, originalNamedExports.length);
        const exportClause = this.getNodeProperty("exportClause");
        if (exportClause == null) {
            namedExportStructurePrinter.printTextsWithBraces(writer, namedExports);
            const asteriskToken = this.getFirstChildByKindOrThrow(common.SyntaxKind.AsteriskToken);
            insertIntoParentTextRange({
                insertPos: asteriskToken.getStart(),
                parent: this,
                newText: writer.toString(),
                replacing: {
                    textLength: 1,
                },
            });
        }
        else if (exportClause.getKind() === common.SyntaxKind.NamespaceExport) {
            namedExportStructurePrinter.printTextsWithBraces(writer, namedExports);
            insertIntoParentTextRange({
                insertPos: exportClause.getStart(),
                parent: this,
                newText: writer.toString(),
                replacing: {
                    textLength: exportClause.getWidth(),
                },
            });
        }
        else {
            namedExportStructurePrinter.printTexts(writer, namedExports);
            insertIntoCommaSeparatedNodes({
                parent: this.getFirstChildByKindOrThrow(common.SyntaxKind.NamedExports).getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
                currentNodes: originalNamedExports,
                insertIndex: index,
                newText: writer.toString(),
                surroundWithSpaces: this._context.getFormatCodeSettings().insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces,
                useTrailingCommas: false,
            });
        }
        const newNamedExports = this.getNamedExports();
        return getNodesToReturn(originalNamedExports, newNamedExports, index, false);
    }
    getNamedExports() {
        const namedExports = this.compilerNode.exportClause;
        if (namedExports == null || common.ts.isNamespaceExport(namedExports))
            return [];
        return namedExports.elements.map(e => this._getNodeFromCompilerNode(e));
    }
    toNamespaceExport() {
        if (!this.hasModuleSpecifier())
            throw new common.errors.InvalidOperationError("Cannot change to a namespace export when no module specifier exists.");
        const namedExportsNode = this.getNodeProperty("exportClause");
        if (namedExportsNode == null)
            return this;
        insertIntoParentTextRange({
            parent: this,
            newText: "*",
            insertPos: namedExportsNode.getStart(),
            replacing: {
                textLength: namedExportsNode.getWidth(),
            },
        });
        return this;
    }
    setAttributes(elements) {
        let attributes = this.getAttributes();
        if (attributes) {
            if (elements)
                attributes.setElements(elements);
            else
                attributes.remove();
        }
        else if (elements) {
            const printer = this._context.structurePrinterFactory.forImportAttribute();
            const writer = this._context.createWriter();
            writer.space();
            printer.printAttributes(writer, elements);
            insertIntoParentTextRange({
                parent: this,
                newText: writer.toString(),
                insertPos: this.getSourceFile().getFullText()[this.getEnd() - 1] === ";" ? this.getEnd() - 1 : this.getEnd(),
            });
        }
        return this;
    }
    getAttributes() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.attributes);
    }
    set(structure) {
        callBaseSet(ExportDeclarationBase.prototype, this, structure);
        if (structure.namedExports != null) {
            setEmptyNamedExport(this);
            this.addNamedExports(structure.namedExports);
        }
        else if (structure.hasOwnProperty(common.nameof(structure, "namedExports")) && structure.moduleSpecifier == null) {
            this.toNamespaceExport();
        }
        if (structure.moduleSpecifier != null)
            this.setModuleSpecifier(structure.moduleSpecifier);
        else if (structure.hasOwnProperty(common.nameof(structure, "moduleSpecifier")))
            this.removeModuleSpecifier();
        if (structure.namedExports == null && structure.hasOwnProperty(common.nameof(structure, "namedExports")))
            this.toNamespaceExport();
        if (structure.namespaceExport != null)
            this.setNamespaceExport(structure.namespaceExport);
        if (structure.isTypeOnly != null)
            this.setIsTypeOnly(structure.isTypeOnly);
        if (structure.hasOwnProperty(common.nameof(structure, "attributes")))
            this.setAttributes(structure.attributes);
        return this;
    }
    getStructure() {
        const moduleSpecifier = this.getModuleSpecifier();
        const attributes = this.getAttributes();
        return callBaseGetStructure(ExportDeclarationBase.prototype, this, {
            kind: exports.StructureKind.ExportDeclaration,
            isTypeOnly: this.isTypeOnly(),
            moduleSpecifier: moduleSpecifier?.getLiteralText(),
            namedExports: this.getNamedExports().map(node => node.getStructure()),
            namespaceExport: this.getNamespaceExport()?.getName(),
            attributes: attributes ? attributes.getElements().map(e => e.getStructure()) : undefined,
        });
    }
}
function setEmptyNamedExport(node) {
    const namedExportsNode = node.getNodeProperty("exportClause");
    let replaceNode;
    if (namedExportsNode != null) {
        if (node.getNamedExports().length === 0)
            return;
        replaceNode = namedExportsNode;
    }
    else {
        replaceNode = node.getFirstChildByKindOrThrow(common.SyntaxKind.AsteriskToken);
    }
    insertIntoParentTextRange({
        parent: node,
        newText: "{ }",
        insertPos: replaceNode.getStart(),
        replacing: {
            textLength: replaceNode.getWidth(),
        },
    });
}

const ExportSpecifierBase = Node;
class ExportSpecifier extends ExportSpecifierBase {
    setName(name) {
        const nameNode = this.getNameNode();
        if (this.getName() === name)
            return this;
        if (isValidVariableName(name))
            nameNode.replaceWithText(name);
        else
            nameNode.replaceWithText(`"${name.replaceAll("\"", "\\\"")}"`);
        return this;
    }
    getName() {
        const nameNode = this.getNameNode();
        if (nameNode.getKind() === common.ts.SyntaxKind.StringLiteral)
            return nameNode.getLiteralText();
        else
            return nameNode.getText();
    }
    getNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.propertyName || this.compilerNode.name);
    }
    renameAlias(alias) {
        if (common.StringUtils.isNullOrWhitespace(alias)) {
            this.removeAliasWithRename();
            return this;
        }
        let aliasNode = this.getAliasNode();
        if (aliasNode == null) {
            this.setAlias(this.getName());
            aliasNode = this.getAliasNode();
        }
        if (aliasNode.getKind() === common.SyntaxKind.Identifier)
            aliasNode.rename(alias);
        return this;
    }
    setAlias(alias) {
        if (common.StringUtils.isNullOrWhitespace(alias)) {
            this.removeAlias();
            return this;
        }
        const aliasNode = this.getAliasNode();
        if (aliasNode == null) {
            insertIntoParentTextRange({
                insertPos: this.getNameNode().getEnd(),
                parent: this,
                newText: ` as ${alias}`,
            });
        }
        else if (isValidVariableName(alias))
            aliasNode.replaceWithText(alias);
        else
            aliasNode.replaceWithText(`"${alias.replaceAll("\"", "\\\"")}"`);
        return this;
    }
    removeAlias() {
        const aliasNode = this.getAliasNode();
        if (aliasNode == null)
            return this;
        removeChildren({
            children: [this.getFirstChildByKindOrThrow(common.SyntaxKind.AsKeyword), aliasNode],
            removePrecedingSpaces: true,
            removePrecedingNewLines: true,
        });
        return this;
    }
    removeAliasWithRename() {
        const aliasNode = this.getAliasNode();
        if (aliasNode == null)
            return this;
        if (aliasNode.getKind() === common.SyntaxKind.Identifier)
            aliasNode.rename(this.getName());
        this.removeAlias();
        return this;
    }
    getAliasNode() {
        if (this.compilerNode.propertyName == null)
            return undefined;
        return this._getNodeFromCompilerNode(this.compilerNode.name);
    }
    isTypeOnly() {
        return this.compilerNode.isTypeOnly;
    }
    setIsTypeOnly(value) {
        if (this.isTypeOnly() === value)
            return this;
        if (value) {
            insertIntoParentTextRange({
                insertPos: this.getStart(),
                parent: this,
                newText: `type `,
            });
        }
        else {
            removeChildren({
                children: [this.getFirstChildByKindOrThrow(common.ts.SyntaxKind.TypeKeyword)],
                removeFollowingSpaces: true,
            });
        }
        return this;
    }
    getExportDeclaration() {
        return this.getFirstAncestorByKindOrThrow(common.SyntaxKind.ExportDeclaration);
    }
    getLocalTargetSymbolOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getLocalTargetSymbol(), message ?? `The export specifier's local target symbol was expected.`, this);
    }
    getLocalTargetSymbol() {
        return this._context.typeChecker.getExportSpecifierLocalTargetSymbol(this);
    }
    getLocalTargetDeclarations() {
        return this.getLocalTargetSymbol()?.getDeclarations() ?? [];
    }
    remove() {
        const exportDeclaration = this.getExportDeclaration();
        const namedExports = exportDeclaration.getNamedExports();
        if (namedExports.length > 1 || exportDeclaration.getNamespaceExport() == null)
            removeCommaSeparatedChild(this);
        else
            exportDeclaration.toNamespaceExport();
    }
    set(structure) {
        callBaseSet(ExportSpecifierBase.prototype, this, structure);
        if (structure.isTypeOnly != null)
            this.setIsTypeOnly(structure.isTypeOnly);
        if (structure.name != null)
            this.setName(structure.name);
        if (structure.alias != null)
            this.setAlias(structure.alias);
        else if (structure.hasOwnProperty(common.nameof(structure, "alias")))
            this.removeAlias();
        return this;
    }
    getStructure() {
        const alias = this.getAliasNode();
        return callBaseGetStructure(Node.prototype, this, {
            kind: exports.StructureKind.ExportSpecifier,
            alias: alias ? alias.getText() : undefined,
            name: this.getNameNode().getText(),
            isTypeOnly: this.isTypeOnly(),
        });
    }
}

const ExternalModuleReferenceBase = ExpressionableNode(Node);
class ExternalModuleReference extends ExternalModuleReferenceBase {
    getReferencedSourceFileOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getReferencedSourceFile(), message ?? "Expected to find the referenced source file.", this);
    }
    isRelative() {
        const expression = this.getExpression();
        if (expression == null || !Node.isStringLiteral(expression))
            return false;
        return ModuleUtils.isModuleSpecifierRelative(expression.getLiteralText());
    }
    getReferencedSourceFile() {
        const expression = this.getExpression();
        if (expression == null)
            return undefined;
        const symbol = expression.getSymbol();
        if (symbol == null)
            return undefined;
        return ModuleUtils.getReferencedSourceFileFromSymbol(symbol);
    }
}

const ImportAttributeBase = ImportAttributeNamedNode(Node);
class ImportAttribute extends ImportAttributeBase {
    getValue() {
        return this._getNodeFromCompilerNode(this.compilerNode.value);
    }
    set(structure) {
        callBaseSet(ImportAttributeBase.prototype, this, structure);
        if (structure.value)
            this.getValue().replaceWithText(structure.value);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(ImportAttributeBase.prototype, this, {
            kind: exports.StructureKind.ImportAttribute,
            value: this.getValue().getText(),
        });
    }
}

const ImportAttributesBase = Node;
class ImportAttributes extends ImportAttributesBase {
    setElements(elements) {
        this.replaceWithText(writer => {
            const structurePrinter = this._context.structurePrinterFactory.forImportAttribute();
            structurePrinter.printAttributes(writer, elements);
        });
        return this;
    }
    getElements() {
        return this.compilerNode.elements.map(e => this._getNodeFromCompilerNode(e));
    }
    remove() {
        removeChildren({
            children: [this],
            removePrecedingNewLines: true,
            removePrecedingSpaces: true,
        });
    }
}

const ImportClauseBase = Node;
class ImportClause extends ImportClauseBase {
    getPhaseModifier() {
        return this.compilerNode.phaseModifier;
    }
    isTypeOnly() {
        return this.compilerNode.phaseModifier === common.SyntaxKind.TypeKeyword;
    }
    setIsTypeOnly(value) {
        if (this.isTypeOnly() === value)
            return this;
        if (value) {
            insertIntoParentTextRange({
                parent: this,
                insertPos: this.getStart(),
                newText: "type ",
            });
        }
        else {
            const typeKeyword = this.getFirstChildByKindOrThrow(common.ts.SyntaxKind.TypeKeyword);
            removeChildren({
                children: [typeKeyword],
                removeFollowingSpaces: true,
            });
        }
        return this;
    }
    isDeferred() {
        return this.compilerNode.phaseModifier === common.SyntaxKind.DeferKeyword;
    }
    setIsDeferred(value) {
        if (this.isDeferred() === value)
            return this;
        if (value) {
            if (this.getNamespaceImport() == null)
                throw new Error("Cannot set an import as deferred when not a namespace import.");
            insertIntoParentTextRange({
                parent: this,
                insertPos: this.getStart(),
                newText: "defer ",
            });
        }
        else {
            const deferKeyword = this.getFirstChildByKindOrThrow(common.ts.SyntaxKind.DeferKeyword);
            removeChildren({
                children: [deferKeyword],
                removeFollowingSpaces: true,
            });
        }
        return this;
    }
    getDefaultImportOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getDefaultImport(), message ?? "Expected to find a default import.", this);
    }
    getDefaultImport() {
        return this.getNodeProperty("name");
    }
    getNamedBindingsOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getNamedBindings(), message ?? "Expected to find an import declaration's named bindings.", this);
    }
    getNamedBindings() {
        return this.getNodeProperty("namedBindings");
    }
    getNamespaceImportOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getNamespaceImport(), message ?? "Expected to find a namespace import.", this);
    }
    getNamespaceImport() {
        const namedBindings = this.getNamedBindings();
        if (namedBindings == null || !Node.isNamespaceImport(namedBindings))
            return undefined;
        return namedBindings.getNameNode();
    }
    getNamedImports() {
        const namedBindings = this.getNamedBindings();
        if (namedBindings == null || !Node.isNamedImports(namedBindings))
            return [];
        return namedBindings.getElements();
    }
}

const ImportDeclarationBase = Statement;
class ImportDeclaration extends ImportDeclarationBase {
    isTypeOnly() {
        return this.getImportClause()?.isTypeOnly() ?? false;
    }
    setIsTypeOnly(value) {
        const importClause = this.getImportClause();
        if (importClause == null) {
            if (!value)
                return this;
            else
                throw new common.errors.InvalidOperationError("Cannot set an import as type only when there is no import clause.");
        }
        importClause.setIsTypeOnly(value);
        return this;
    }
    isDeferred() {
        return this.getImportClause()?.isDeferred() ?? false;
    }
    setIsDeferred(value) {
        const importClause = this.getImportClause();
        if (importClause == null) {
            if (!value)
                return this;
            else
                throw new common.errors.InvalidOperationError("Cannot set an import as deferred when there is no import clause.");
        }
        importClause.setIsDeferred(value);
        return this;
    }
    getPhaseModifier() {
        return this.getImportClause()?.getPhaseModifier();
    }
    setModuleSpecifier(textOrSourceFile) {
        const text = typeof textOrSourceFile === "string" ? textOrSourceFile : this._sourceFile.getRelativePathAsModuleSpecifierTo(textOrSourceFile);
        this.getModuleSpecifier().setLiteralValue(text);
        return this;
    }
    getModuleSpecifier() {
        const moduleSpecifier = this._getNodeFromCompilerNode(this.compilerNode.moduleSpecifier);
        if (!Node.isStringLiteral(moduleSpecifier))
            throw new common.errors.InvalidOperationError("Expected the module specifier to be a string literal.");
        return moduleSpecifier;
    }
    getModuleSpecifierValue() {
        return this.getModuleSpecifier().getLiteralValue();
    }
    getModuleSpecifierSourceFileOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getModuleSpecifierSourceFile(), message ?? `A module specifier source file was expected.`, this);
    }
    getModuleSpecifierSourceFile() {
        const symbol = this.getModuleSpecifier().getSymbol();
        if (symbol == null)
            return undefined;
        return ModuleUtils.getReferencedSourceFileFromSymbol(symbol);
    }
    isModuleSpecifierRelative() {
        return ModuleUtils.isModuleSpecifierRelative(this.getModuleSpecifierValue());
    }
    setDefaultImport(text) {
        if (common.StringUtils.isNullOrWhitespace(text))
            return this.removeDefaultImport();
        const defaultImport = this.getDefaultImport();
        if (defaultImport != null) {
            defaultImport.replaceWithText(text);
            return this;
        }
        const importKeyword = this.getFirstChildByKindOrThrow(common.SyntaxKind.ImportKeyword);
        const importClause = this.getImportClause();
        if (importClause == null) {
            insertIntoParentTextRange({
                insertPos: importKeyword.getEnd(),
                parent: this,
                newText: ` ${text} from`,
            });
            return this;
        }
        insertIntoParentTextRange({
            insertPos: importKeyword.getEnd(),
            parent: importClause,
            newText: ` ${text},`,
        });
        return this;
    }
    renameDefaultImport(text) {
        if (common.StringUtils.isNullOrWhitespace(text))
            return this.removeDefaultImport();
        const defaultImport = this.getDefaultImport();
        if (defaultImport != null) {
            defaultImport.rename(text);
            return this;
        }
        this.setDefaultImport(text);
        return this;
    }
    getDefaultImportOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getDefaultImport(), message ?? "Expected to find a default import.", this);
    }
    getDefaultImport() {
        return this.getImportClause()?.getDefaultImport() ?? undefined;
    }
    setNamespaceImport(text) {
        if (common.StringUtils.isNullOrWhitespace(text))
            return this.removeNamespaceImport();
        const namespaceImport = this.getNamespaceImport();
        if (namespaceImport != null) {
            namespaceImport.rename(text);
            return this;
        }
        if (this.getNamedImports().length > 0)
            throw new common.errors.InvalidOperationError("Cannot add a namespace import to an import declaration that has named imports.");
        const defaultImport = this.getDefaultImport();
        if (defaultImport != null) {
            insertIntoParentTextRange({
                insertPos: defaultImport.getEnd(),
                parent: this.getImportClause(),
                newText: `, * as ${text}`,
            });
            return this;
        }
        insertIntoParentTextRange({
            insertPos: this.getFirstChildByKindOrThrow(common.SyntaxKind.ImportKeyword).getEnd(),
            parent: this,
            newText: ` * as ${text} from`,
        });
        return this;
    }
    removeNamespaceImport() {
        const namespaceImport = this.getNamespaceImport();
        if (namespaceImport == null)
            return this;
        removeChildren({
            children: getChildrenToRemove.call(this),
            removePrecedingSpaces: true,
            removePrecedingNewLines: true,
        });
        return this;
        function getChildrenToRemove() {
            const defaultImport = this.getDefaultImport();
            if (defaultImport == null)
                return [this.getImportClauseOrThrow(), this.getLastChildByKindOrThrow(common.SyntaxKind.FromKeyword)];
            else
                return [defaultImport.getNextSiblingIfKindOrThrow(common.SyntaxKind.CommaToken), namespaceImport];
        }
    }
    removeDefaultImport() {
        const importClause = this.getImportClause();
        if (importClause == null)
            return this;
        const defaultImport = importClause.getDefaultImport();
        if (defaultImport == null)
            return this;
        const hasOnlyDefaultImport = importClause.getNamedBindings() == null;
        if (hasOnlyDefaultImport) {
            if (importClause.isTypeOnly()) {
                insertIntoParentTextRange({
                    parent: importClause,
                    newText: "{}",
                    insertPos: defaultImport.getStart(),
                    replacing: {
                        textLength: defaultImport.getWidth(),
                    },
                });
            }
            else {
                removeChildren({
                    children: [importClause, importClause.getNextSiblingIfKindOrThrow(common.SyntaxKind.FromKeyword)],
                    removePrecedingSpaces: true,
                    removePrecedingNewLines: true,
                });
            }
        }
        else {
            removeChildren({
                children: [defaultImport, defaultImport.getNextSiblingIfKindOrThrow(common.SyntaxKind.CommaToken)],
                removePrecedingSpaces: true,
                removePrecedingNewLines: true,
            });
        }
        return this;
    }
    getNamespaceImportOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getNamespaceImport(), message ?? "Expected to find a namespace import.", this);
    }
    getNamespaceImport() {
        return this.getImportClause()?.getNamespaceImport() ?? undefined;
    }
    addNamedImport(namedImport) {
        return this.addNamedImports([namedImport])[0];
    }
    addNamedImports(namedImports) {
        return this.insertNamedImports(this.getNamedImports().length, namedImports);
    }
    insertNamedImport(index, namedImport) {
        return this.insertNamedImports(index, [namedImport])[0];
    }
    insertNamedImports(index, namedImports) {
        if (!(namedImports instanceof Function) && common.ArrayUtils.isNullOrEmpty(namedImports))
            return [];
        const originalNamedImports = this.getNamedImports();
        const writer = this._getWriterWithQueuedIndentation();
        const namedImportStructurePrinter = this._context.structurePrinterFactory.forNamedImportExportSpecifier();
        const importClause = this.getImportClause();
        index = verifyAndGetIndex(index, originalNamedImports.length);
        if (originalNamedImports.length === 0) {
            namedImportStructurePrinter.printTextsWithBraces(writer, namedImports);
            if (importClause == null) {
                insertIntoParentTextRange({
                    insertPos: this.getFirstChildByKindOrThrow(common.SyntaxKind.ImportKeyword).getEnd(),
                    parent: this,
                    newText: ` ${writer.toString()} from`,
                });
            }
            else if (this.getNamespaceImport() != null)
                throw getErrorWhenNamespaceImportsExist();
            else if (importClause.getNamedBindings() != null) {
                const namedBindings = importClause.getNamedBindingsOrThrow();
                insertIntoParentTextRange({
                    insertPos: namedBindings.getStart(),
                    replacing: {
                        textLength: namedBindings.getWidth(),
                    },
                    parent: importClause,
                    newText: writer.toString(),
                });
            }
            else {
                insertIntoParentTextRange({
                    insertPos: this.getDefaultImport().getEnd(),
                    parent: importClause,
                    newText: `, ${writer.toString()}`,
                });
            }
        }
        else {
            if (importClause == null)
                throw new common.errors.NotImplementedError("Expected to have an import clause.");
            namedImportStructurePrinter.printTexts(writer, namedImports);
            insertIntoCommaSeparatedNodes({
                parent: importClause.getFirstChildByKindOrThrow(common.SyntaxKind.NamedImports).getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
                currentNodes: originalNamedImports,
                insertIndex: index,
                newText: writer.toString(),
                surroundWithSpaces: this._context.getFormatCodeSettings().insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces,
                useTrailingCommas: false,
            });
        }
        const newNamedImports = this.getNamedImports();
        return getNodesToReturn(originalNamedImports, newNamedImports, index, false);
    }
    getNamedImports() {
        return this.getImportClause()?.getNamedImports() ?? [];
    }
    removeNamedImports() {
        const importClause = this.getImportClause();
        if (importClause == null)
            return this;
        const namedImportsNode = importClause.getNamedBindings();
        if (namedImportsNode == null || namedImportsNode.getKind() !== common.SyntaxKind.NamedImports)
            return this;
        const defaultImport = this.getDefaultImport();
        if (defaultImport != null) {
            const commaToken = defaultImport.getNextSiblingIfKindOrThrow(common.SyntaxKind.CommaToken);
            removeChildren({ children: [commaToken, namedImportsNode] });
            return this;
        }
        const fromKeyword = importClause.getNextSiblingIfKindOrThrow(common.SyntaxKind.FromKeyword);
        removeChildren({ children: [importClause, fromKeyword], removePrecedingSpaces: true });
        return this;
    }
    getImportClauseOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getImportClause(), message ?? "Expected to find an import clause.", this);
    }
    getImportClause() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.importClause);
    }
    setAttributes(elements) {
        let attributes = this.getAttributes();
        if (attributes) {
            if (elements)
                attributes.setElements(elements);
            else
                attributes.remove();
        }
        else if (elements) {
            const printer = this._context.structurePrinterFactory.forImportAttribute();
            const writer = this._context.createWriter();
            writer.space();
            printer.printAttributes(writer, elements);
            insertIntoParentTextRange({
                parent: this,
                newText: writer.toString(),
                insertPos: this.getSourceFile().getFullText()[this.getEnd() - 1] === ";" ? this.getEnd() - 1 : this.getEnd(),
            });
        }
        return this;
    }
    getAttributes() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.attributes);
    }
    set(structure) {
        callBaseSet(ImportDeclarationBase.prototype, this, structure);
        if (structure.defaultImport != null)
            this.setDefaultImport(structure.defaultImport);
        else if (structure.hasOwnProperty(common.nameof(structure, "defaultImport")))
            this.removeDefaultImport();
        if (structure.hasOwnProperty(common.nameof(structure, "namedImports")))
            this.removeNamedImports();
        if (structure.namespaceImport != null)
            this.setNamespaceImport(structure.namespaceImport);
        else if (structure.hasOwnProperty(common.nameof(structure, "namespaceImport")))
            this.removeNamespaceImport();
        if (structure.namedImports != null) {
            setEmptyNamedImport(this);
            this.addNamedImports(structure.namedImports);
        }
        if (structure.moduleSpecifier != null)
            this.setModuleSpecifier(structure.moduleSpecifier);
        if (structure.isTypeOnly != null)
            this.setIsTypeOnly(structure.isTypeOnly);
        if (structure.hasOwnProperty(common.nameof(structure, "attributes")))
            this.setAttributes(structure.attributes);
        return this;
    }
    getStructure() {
        const namespaceImport = this.getNamespaceImport();
        const defaultImport = this.getDefaultImport();
        const attributes = this.getAttributes();
        return callBaseGetStructure(ImportDeclarationBase.prototype, this, {
            kind: exports.StructureKind.ImportDeclaration,
            isTypeOnly: this.isTypeOnly(),
            defaultImport: defaultImport ? defaultImport.getText() : undefined,
            moduleSpecifier: this.getModuleSpecifier().getLiteralText(),
            namedImports: this.getNamedImports().map(node => node.getStructure()),
            namespaceImport: namespaceImport ? namespaceImport.getText() : undefined,
            attributes: attributes ? attributes.getElements().map(e => e.getStructure()) : undefined,
        });
    }
}
function setEmptyNamedImport(node) {
    const importClause = node.getNodeProperty("importClause");
    const writer = node._getWriterWithQueuedChildIndentation();
    const namedImportStructurePrinter = node._context.structurePrinterFactory.forNamedImportExportSpecifier();
    namedImportStructurePrinter.printTextsWithBraces(writer, []);
    const emptyBracesText = writer.toString();
    if (node.getNamespaceImport() != null)
        throw getErrorWhenNamespaceImportsExist();
    if (importClause == null) {
        insertIntoParentTextRange({
            insertPos: node.getFirstChildByKindOrThrow(common.SyntaxKind.ImportKeyword).getEnd(),
            parent: node,
            newText: ` ${emptyBracesText} from`,
        });
        return;
    }
    const replaceNode = importClause.getNamedBindings();
    if (replaceNode != null) {
        insertIntoParentTextRange({
            parent: importClause,
            newText: emptyBracesText,
            insertPos: replaceNode.getStart(),
            replacing: {
                textLength: replaceNode.getWidth(),
            },
        });
        return;
    }
    const defaultImport = importClause.getDefaultImport();
    if (defaultImport != null) {
        insertIntoParentTextRange({
            insertPos: defaultImport.getEnd(),
            parent: importClause,
            newText: `, ${emptyBracesText}`,
        });
        return;
    }
}
function getErrorWhenNamespaceImportsExist() {
    return new common.errors.InvalidOperationError("Cannot add a named import to an import declaration that has a namespace import.");
}

const createBase$s = (ctor) => ExportableNode(ModifierableNode(JSDocableNode(NamedNode(ctor))));
const ImportEqualsDeclarationBase = createBase$s(Statement);
class ImportEqualsDeclaration extends ImportEqualsDeclarationBase {
    isTypeOnly() {
        return this.compilerNode.isTypeOnly ?? false;
    }
    setIsTypeOnly(value) {
        if (this.isTypeOnly() === value)
            return this;
        if (value) {
            insertIntoParentTextRange({
                parent: this,
                insertPos: this.getNameNode().getStart(),
                newText: "type ",
            });
        }
        else {
            const typeKeyword = this.getFirstChildByKindOrThrow(common.ts.SyntaxKind.TypeKeyword);
            removeChildren({
                children: [typeKeyword],
                removeFollowingSpaces: true,
            });
        }
        return this;
    }
    getModuleReference() {
        return this._getNodeFromCompilerNode(this.compilerNode.moduleReference);
    }
    isExternalModuleReferenceRelative() {
        const moduleReference = this.getModuleReference();
        if (!Node.isExternalModuleReference(moduleReference))
            return false;
        return moduleReference.isRelative();
    }
    setExternalModuleReference(textOrSourceFile) {
        const text = typeof textOrSourceFile === "string" ? textOrSourceFile : this._sourceFile.getRelativePathAsModuleSpecifierTo(textOrSourceFile);
        const moduleReference = this.getModuleReference();
        if (Node.isExternalModuleReference(moduleReference) && moduleReference.getExpression() != null)
            moduleReference.getExpressionOrThrow().replaceWithText(writer => writer.quote(text));
        else
            moduleReference.replaceWithText(writer => writer.write("require(").quote(text).write(")"));
        return this;
    }
    getExternalModuleReferenceSourceFileOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getExternalModuleReferenceSourceFile(), message ?? "Expected to find an external module reference's referenced source file.", this);
    }
    getExternalModuleReferenceSourceFile() {
        const moduleReference = this.getModuleReference();
        if (!Node.isExternalModuleReference(moduleReference))
            return undefined;
        return moduleReference.getReferencedSourceFile();
    }
}

const ImportSpecifierBase = Node;
class ImportSpecifier extends ImportSpecifierBase {
    setName(name) {
        const nameNode = this.getNameNode();
        if (this.getName() === name)
            return this;
        if (isValidVariableName(name))
            nameNode.replaceWithText(name);
        else
            nameNode.replaceWithText(`"${name.replaceAll("\"", "\\\"")}"`);
        return this;
    }
    getName() {
        const nameNode = this.getNameNode();
        if (nameNode.getKind() === common.ts.SyntaxKind.StringLiteral)
            return nameNode.getLiteralText();
        else
            return nameNode.getText();
    }
    getNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.propertyName ?? this.compilerNode.name);
    }
    renameAlias(alias) {
        if (common.StringUtils.isNullOrWhitespace(alias)) {
            this.removeAliasWithRename();
            return this;
        }
        let aliasIdentifier = this.getAliasNode();
        if (aliasIdentifier == null) {
            this.setAlias(this.getName());
            aliasIdentifier = this.getAliasNode();
        }
        aliasIdentifier.rename(alias);
        return this;
    }
    setAlias(alias) {
        if (common.StringUtils.isNullOrWhitespace(alias)) {
            this.removeAlias();
            return this;
        }
        const aliasIdentifier = this.getAliasNode();
        if (aliasIdentifier == null) {
            insertIntoParentTextRange({
                insertPos: this.getNameNode().getEnd(),
                parent: this,
                newText: ` as ${alias}`,
            });
        }
        else {
            aliasIdentifier.replaceWithText(alias);
        }
        return this;
    }
    removeAlias() {
        const aliasIdentifier = this.getAliasNode();
        if (aliasIdentifier == null)
            return this;
        removeChildren({
            children: [this.getFirstChildByKindOrThrow(common.SyntaxKind.AsKeyword), aliasIdentifier],
            removePrecedingSpaces: true,
            removePrecedingNewLines: true,
        });
        return this;
    }
    removeAliasWithRename() {
        const aliasIdentifier = this.getAliasNode();
        if (aliasIdentifier == null)
            return this;
        aliasIdentifier.rename(this.getName());
        this.removeAlias();
        return this;
    }
    getAliasNode() {
        if (this.compilerNode.propertyName == null)
            return undefined;
        return this._getNodeFromCompilerNode(this.compilerNode.name);
    }
    isTypeOnly() {
        return this.compilerNode.isTypeOnly;
    }
    setIsTypeOnly(value) {
        if (this.isTypeOnly() === value)
            return this;
        if (value) {
            insertIntoParentTextRange({
                insertPos: this.getStart(),
                parent: this,
                newText: `type `,
            });
        }
        else {
            removeChildren({
                children: [this.getFirstChildByKindOrThrow(common.ts.SyntaxKind.TypeKeyword)],
                removeFollowingSpaces: true,
            });
        }
        return this;
    }
    getImportDeclaration() {
        return this.getFirstAncestorByKindOrThrow(common.SyntaxKind.ImportDeclaration);
    }
    remove() {
        const importDeclaration = this.getImportDeclaration();
        const namedImports = importDeclaration.getNamedImports();
        if (namedImports.length > 1 || importDeclaration.getNamespaceImport() == null && importDeclaration.getDefaultImport() == null)
            removeCommaSeparatedChild(this);
        else
            importDeclaration.removeNamedImports();
    }
    set(structure) {
        callBaseSet(ImportSpecifierBase.prototype, this, structure);
        if (structure.isTypeOnly != null)
            this.setIsTypeOnly(structure.isTypeOnly);
        if (structure.name != null)
            this.setName(structure.name);
        if (structure.alias != null)
            this.setAlias(structure.alias);
        else if (structure.hasOwnProperty(common.nameof(structure, "alias")))
            this.removeAlias();
        return this;
    }
    getStructure() {
        const alias = this.getAliasNode();
        return callBaseGetStructure(ImportSpecifierBase.prototype, this, {
            kind: exports.StructureKind.ImportSpecifier,
            name: this.getName(),
            alias: alias ? alias.getText() : undefined,
            isTypeOnly: this.isTypeOnly(),
        });
    }
}

const ModuleBlockBase = StatementedNode(Statement);
class ModuleBlock extends ModuleBlockBase {
}

function ModuleChildableNode(Base) {
    return class extends Base {
        getParentModuleOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getParentModule(), message ?? "Expected to find the parent module declaration.", this);
        }
        getParentModule() {
            let parent = this.getParentOrThrow();
            if (!Node.isModuleBlock(parent))
                return undefined;
            while (parent.getParentOrThrow().getKind() === common.SyntaxKind.ModuleDeclaration)
                parent = parent.getParentOrThrow();
            return parent;
        }
    };
}

exports.ModuleDeclarationKind = void 0;
(function (ModuleDeclarationKind) {
    ModuleDeclarationKind["Namespace"] = "namespace";
    ModuleDeclarationKind["Module"] = "module";
    ModuleDeclarationKind["Global"] = "global";
})(exports.ModuleDeclarationKind || (exports.ModuleDeclarationKind = {}));

const createBase$r = (ctor) => ModuledNode(UnwrappableNode(TextInsertableNode(BodyableNode(ModuleChildableNode(StatementedNode(JSDocableNode(AmbientableNode(ExportableNode(ModifierableNode(ModuleNamedNode(ctor)))))))))));
const ModuleDeclarationBase = createBase$r(Statement);
class ModuleDeclaration extends ModuleDeclarationBase {
    getName() {
        const nameNodesOrStringLit = this.getNameNodes();
        if (nameNodesOrStringLit instanceof Array)
            return nameNodesOrStringLit.map(n => n.getText()).join(".");
        return nameNodesOrStringLit.getText();
    }
    setName(newName) {
        const openIssueText = `Please open an issue if you really need this and I'll up the priority.`;
        if (newName.indexOf(".") >= 0)
            throw new common.errors.NotImplementedError(`Not implemented to set a namespace name to a name containing a period. ${openIssueText}`);
        const moduleName = this.getNameNodes();
        if (moduleName instanceof Array) {
            if (moduleName.length > 1)
                throw new common.errors.NotImplementedError(`Not implemented to set a namespace name that uses dot notation. ${openIssueText}`);
            if (newName !== "global")
                addNamespaceKeywordIfNecessary(this);
            if (common.StringUtils.isQuoted(newName))
                changeToAmbientModuleIfNecessary(this);
            moduleName[0].replaceWithText(newName);
        }
        else {
            moduleName.replaceWithText(newName);
        }
        return this;
    }
    rename(newName, options) {
        if (newName.indexOf(".") >= 0)
            throw new common.errors.NotSupportedError(`Cannot rename a namespace name to a name containing a period.`);
        const nameNodes = this.getNameNodes();
        if (nameNodes instanceof Array) {
            if (nameNodes.length > 1) {
                throw new common.errors.NotSupportedError(`Cannot rename a namespace name that uses dot notation. Rename the individual nodes via .${common.nameof(this, "getNameNodes")}()`);
            }
            if (newName !== "global")
                addNamespaceKeywordIfNecessary(this);
            nameNodes[0].rename(newName, options);
        }
        else {
            renameNode(nameNodes, common.StringUtils.stripQuotes(newName), options);
        }
        return this;
    }
    getNameNodes() {
        const name = this.getNameNode();
        if (Node.isStringLiteral(name))
            return name;
        else {
            const nodes = [];
            let current = this;
            do {
                nodes.push(this._getNodeFromCompilerNode(current.compilerNode.name));
                current = current.getFirstChildByKind(common.SyntaxKind.ModuleDeclaration);
            } while (current != null);
            return nodes;
        }
    }
    hasNamespaceKeyword() {
        return this.getDeclarationKind() === exports.ModuleDeclarationKind.Namespace;
    }
    hasModuleKeyword() {
        return this.getDeclarationKind() === exports.ModuleDeclarationKind.Module;
    }
    setDeclarationKind(kind) {
        if (this.getDeclarationKind() === kind)
            return this;
        if (kind === exports.ModuleDeclarationKind.Global) {
            const declarationKindKeyword = this.getDeclarationKindKeyword();
            this.getNameNode().replaceWithText("global");
            if (declarationKindKeyword != null) {
                removeChildren({
                    children: [declarationKindKeyword],
                    removeFollowingNewLines: true,
                    removeFollowingSpaces: true,
                });
            }
        }
        else {
            const declarationKindKeyword = this.getDeclarationKindKeyword();
            if (declarationKindKeyword != null)
                declarationKindKeyword.replaceWithText(kind);
            else {
                insertIntoParentTextRange({
                    parent: this,
                    insertPos: this.getNameNode().getStart(),
                    newText: kind + " ",
                });
            }
        }
        return this;
    }
    getDeclarationKind() {
        const nodeFlags = this.getFlags();
        if ((nodeFlags & common.ts.NodeFlags.GlobalAugmentation) !== 0)
            return exports.ModuleDeclarationKind.Global;
        if ((nodeFlags & common.ts.NodeFlags.Namespace) !== 0)
            return exports.ModuleDeclarationKind.Namespace;
        return exports.ModuleDeclarationKind.Module;
    }
    getDeclarationKindKeyword() {
        return this.getFirstChild(child => child.getKind() === common.SyntaxKind.NamespaceKeyword
            || child.getKind() === common.SyntaxKind.ModuleKeyword);
    }
    set(structure) {
        if (structure.name != null && structure.name !== "global")
            addNamespaceKeywordIfNecessary(this);
        callBaseSet(ModuleDeclarationBase.prototype, this, structure);
        if (structure.declarationKind != null)
            this.setDeclarationKind(structure.declarationKind);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(ModuleDeclarationBase.prototype, this, {
            kind: exports.StructureKind.Module,
            declarationKind: this.getDeclarationKind(),
        });
    }
    _getInnerBody() {
        let node = this.getBody();
        while (node != null && Node.isBodyable(node) && node.compilerNode.statements == null)
            node = node.getBody();
        return node;
    }
}
function addNamespaceKeywordIfNecessary(namespaceDec) {
    if (namespaceDec.getDeclarationKind() === exports.ModuleDeclarationKind.Global)
        namespaceDec.setDeclarationKind(exports.ModuleDeclarationKind.Namespace);
}
function changeToAmbientModuleIfNecessary(namespaceDec) {
    if (namespaceDec.hasNamespaceKeyword())
        namespaceDec.setDeclarationKind(exports.ModuleDeclarationKind.Module);
    if (!namespaceDec.hasDeclareKeyword())
        namespaceDec.setHasDeclareKeyword(true);
}

const NamedExportsBase = Node;
class NamedExports extends NamedExportsBase {
    getElements() {
        return this.compilerNode.elements.map(e => this._getNodeFromCompilerNode(e));
    }
}

const NamedImportsBase = Node;
class NamedImports extends NamedImportsBase {
    getElements() {
        return this.compilerNode.elements.map(e => this._getNodeFromCompilerNode(e));
    }
}

const NamespaceExportBase = RenameableNode(Node);
class NamespaceExport extends NamespaceExportBase {
    setName(name) {
        const nameNode = this.getNameNode();
        if (this.getName() === name)
            return this;
        if (isValidVariableName(name))
            nameNode.replaceWithText(name);
        else
            nameNode.replaceWithText(`"${name.replaceAll("\"", "\\\"")}"`);
        return this;
    }
    getName() {
        const nameNode = this.getNameNode();
        if (nameNode.getKind() === common.ts.SyntaxKind.StringLiteral)
            return nameNode.getLiteralText();
        else
            return nameNode.getText();
    }
    getNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.name);
    }
}

const NamespaceImportBase = RenameableNode(Node);
class NamespaceImport extends NamespaceImportBase {
    setName(name) {
        const nameNode = this.getNameNode();
        if (nameNode.getText() === name)
            return this;
        nameNode.replaceWithText(name);
        return this;
    }
    getName() {
        return this.getNameNode().getText();
    }
    getNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.name);
    }
}

class FileReference extends TextRange {
    constructor(compilerObject, sourceFile) {
        super(compilerObject, sourceFile);
    }
    getFileName() {
        return this.compilerObject.fileName;
    }
}

exports.FileSystemRefreshResult = void 0;
(function (FileSystemRefreshResult) {
    FileSystemRefreshResult[FileSystemRefreshResult["NoChange"] = 0] = "NoChange";
    FileSystemRefreshResult[FileSystemRefreshResult["Updated"] = 1] = "Updated";
    FileSystemRefreshResult[FileSystemRefreshResult["Deleted"] = 2] = "Deleted";
})(exports.FileSystemRefreshResult || (exports.FileSystemRefreshResult = {}));

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
}
function __runInitializers(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
}
typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const SourceFileBase = ModuledNode(TextInsertableNode(StatementedNode(Node)));
let SourceFile = (() => {
    let _classSuper = SourceFileBase;
    let _instanceExtraInitializers = [];
    let _isFromExternalLibrary_decorators;
    return class SourceFile extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _isFromExternalLibrary_decorators = [common.Memoize];
            __esDecorate(this, null, _isFromExternalLibrary_decorators, { kind: "method", name: "isFromExternalLibrary", static: false, private: false, access: { has: obj => "isFromExternalLibrary" in obj, get: obj => obj.isFromExternalLibrary }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #isSaved = (__runInitializers(this, _instanceExtraInitializers), false);
        #modifiedEventContainer = new common.EventContainer();
        #preModifiedEventContainer = new common.EventContainer();
        _referenceContainer = new SourceFileReferenceContainer(this);
        #referencedFiles;
        #libReferenceDirectives;
        #typeReferenceDirectives;
        _hasBom;
        constructor(context, node) {
            super(context, node, undefined);
            this.__sourceFile = this;
            const onPreModified = () => {
                this.isFromExternalLibrary();
                this.#preModifiedEventContainer.unsubscribe(onPreModified);
            };
            this.#preModifiedEventContainer.subscribe(onPreModified);
        }
        _replaceCompilerNodeFromFactory(compilerNode) {
            super._replaceCompilerNodeFromFactory(compilerNode);
            this._context.resetProgram();
            this.#isSaved = false;
            this.#modifiedEventContainer.fire(this);
        }
        _clearInternals() {
            super._clearInternals();
            clearTextRanges(this.#referencedFiles);
            clearTextRanges(this.#typeReferenceDirectives);
            clearTextRanges(this.#libReferenceDirectives);
            this.#referencedFiles = undefined;
            this.#typeReferenceDirectives = undefined;
            this.#libReferenceDirectives = undefined;
            function clearTextRanges(textRanges) {
                textRanges?.forEach(r => r._forget());
            }
        }
        getFilePath() {
            return this.compilerNode.fileName;
        }
        getBaseName() {
            return common.FileUtils.getBaseName(this.getFilePath());
        }
        getBaseNameWithoutExtension() {
            const baseName = this.getBaseName();
            const extension = this.getExtension();
            return baseName.substring(0, baseName.length - extension.length);
        }
        getExtension() {
            return common.FileUtils.getExtension(this.getFilePath());
        }
        getDirectory() {
            return this._context.compilerFactory.getDirectoryFromCache(this.getDirectoryPath());
        }
        getDirectoryPath() {
            return this._context.fileSystemWrapper.getStandardizedAbsolutePath(common.FileUtils.getDirPath(this.compilerNode.fileName));
        }
        getFullText() {
            return this.compilerNode.text;
        }
        getLineAndColumnAtPos(pos) {
            const fullText = this.getFullText();
            return {
                line: common.StringUtils.getLineNumberAtPos(fullText, pos),
                column: common.StringUtils.getLengthFromLineStartAtPos(fullText, pos) + 1,
            };
        }
        getLengthFromLineStartAtPos(pos) {
            return common.StringUtils.getLengthFromLineStartAtPos(this.getFullText(), pos);
        }
        copyToDirectory(dirPathOrDirectory, options) {
            const dirPath = typeof dirPathOrDirectory === "string" ? dirPathOrDirectory : dirPathOrDirectory.getPath();
            return this.copy(common.FileUtils.pathJoin(dirPath, this.getBaseName()), options);
        }
        copy(filePath, options = {}) {
            this._throwIfIsInMemoryLibFile();
            const result = this._copyInternal(filePath, options);
            if (result === false)
                return this;
            const copiedSourceFile = result;
            if (copiedSourceFile.getDirectoryPath() !== this.getDirectoryPath())
                copiedSourceFile._updateReferencesForCopyInternal(this._getReferencesForCopyInternal());
            return copiedSourceFile;
        }
        _copyInternal(fileAbsoluteOrRelativePath, options = {}) {
            const { overwrite = false } = options;
            const { compilerFactory, fileSystemWrapper } = this._context;
            const standardizedFilePath = fileSystemWrapper.getStandardizedAbsolutePath(fileAbsoluteOrRelativePath, this.getDirectoryPath());
            if (standardizedFilePath === this.getFilePath())
                return false;
            return getCopiedSourceFile(this);
            function getCopiedSourceFile(currentFile) {
                try {
                    return compilerFactory.createSourceFileFromText(standardizedFilePath, currentFile.getFullText(), { overwrite, markInProject: getShouldBeInProject() });
                }
                catch (err) {
                    if (err instanceof common.errors.InvalidOperationError)
                        throw new common.errors.InvalidOperationError(`Did you mean to provide the overwrite option? ` + err.message);
                    else
                        throw err;
                }
                function getShouldBeInProject() {
                    if (currentFile._isInProject())
                        return true;
                    const destinationFile = compilerFactory.getSourceFileFromCacheFromFilePath(standardizedFilePath);
                    return destinationFile != null && destinationFile._isInProject();
                }
            }
        }
        _getReferencesForCopyInternal() {
            return Array.from(this._referenceContainer.getLiteralsReferencingOtherSourceFilesEntries());
        }
        _updateReferencesForCopyInternal(literalReferences) {
            for (const reference of literalReferences)
                reference[0] = this.getChildSyntaxListOrThrow().getDescendantAtStartWithWidth(reference[0].getStart(), reference[0].getWidth());
            updateStringLiteralReferences(literalReferences);
        }
        async copyImmediately(filePath, options) {
            const newSourceFile = this.copy(filePath, options);
            await newSourceFile.save();
            return newSourceFile;
        }
        copyImmediatelySync(filePath, options) {
            const newSourceFile = this.copy(filePath, options);
            newSourceFile.saveSync();
            return newSourceFile;
        }
        moveToDirectory(dirPathOrDirectory, options) {
            const dirPath = typeof dirPathOrDirectory === "string" ? dirPathOrDirectory : dirPathOrDirectory.getPath();
            return this.move(common.FileUtils.pathJoin(dirPath, this.getBaseName()), options);
        }
        move(filePath, options = {}) {
            this._throwIfIsInMemoryLibFile();
            const oldDirPath = this.getDirectoryPath();
            const sourceFileReferences = this._getReferencesForMoveInternal();
            const oldFilePath = this.getFilePath();
            if (!this._moveInternal(filePath, options))
                return this;
            this._context.fileSystemWrapper.queueFileDelete(oldFilePath);
            this._updateReferencesForMoveInternal(sourceFileReferences, oldDirPath);
            this._context.lazyReferenceCoordinator.clearDirtySourceFiles();
            this._context.lazyReferenceCoordinator.addDirtySourceFile(this);
            return this;
        }
        _moveInternal(fileRelativeOrAbsolutePath, options = {}) {
            const { overwrite = false } = options;
            const filePath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(fileRelativeOrAbsolutePath, this.getDirectoryPath());
            if (filePath === this.getFilePath())
                return false;
            let markAsInProject = false;
            if (overwrite) {
                const existingSourceFile = this._context.compilerFactory.getSourceFileFromCacheFromFilePath(filePath);
                if (existingSourceFile != null) {
                    markAsInProject = existingSourceFile._isInProject();
                    existingSourceFile.forget();
                }
            }
            else {
                this._context.compilerFactory.throwIfFileExists(filePath, "Did you mean to provide the overwrite option?");
            }
            replaceSourceFileForFilePathMove({
                newFilePath: filePath,
                sourceFile: this,
            });
            if (markAsInProject)
                this._markAsInProject();
            if (this._isInProject())
                this.getDirectory()._markAsInProject();
            return true;
        }
        _getReferencesForMoveInternal() {
            return {
                literalReferences: Array.from(this._referenceContainer.getLiteralsReferencingOtherSourceFilesEntries()),
                referencingLiterals: Array.from(this._referenceContainer.getReferencingLiteralsInOtherSourceFiles()),
            };
        }
        _updateReferencesForMoveInternal(sourceFileReferences, oldDirPath) {
            const { literalReferences, referencingLiterals } = sourceFileReferences;
            if (oldDirPath !== this.getDirectoryPath())
                updateStringLiteralReferences(literalReferences);
            updateStringLiteralReferences(referencingLiterals.map(node => [node, this]));
        }
        async moveImmediately(filePath, options) {
            const oldFilePath = this.getFilePath();
            const newFilePath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(filePath, this.getDirectoryPath());
            this.move(filePath, options);
            if (oldFilePath !== newFilePath) {
                await this._context.fileSystemWrapper.moveFileImmediately(oldFilePath, newFilePath, this.getFullText());
                this.#isSaved = true;
            }
            else {
                await this.save();
            }
            return this;
        }
        moveImmediatelySync(filePath, options) {
            const oldFilePath = this.getFilePath();
            const newFilePath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(filePath, this.getDirectoryPath());
            this.move(filePath, options);
            if (oldFilePath !== newFilePath) {
                this._context.fileSystemWrapper.moveFileImmediatelySync(oldFilePath, newFilePath, this.getFullText());
                this.#isSaved = true;
            }
            else {
                this.saveSync();
            }
            return this;
        }
        delete() {
            this._throwIfIsInMemoryLibFile();
            const filePath = this.getFilePath();
            this.forget();
            this._context.fileSystemWrapper.queueFileDelete(filePath);
        }
        async deleteImmediately() {
            this._throwIfIsInMemoryLibFile();
            const filePath = this.getFilePath();
            this.forget();
            await this._context.fileSystemWrapper.deleteFileImmediately(filePath);
        }
        deleteImmediatelySync() {
            this._throwIfIsInMemoryLibFile();
            const filePath = this.getFilePath();
            this.forget();
            this._context.fileSystemWrapper.deleteFileImmediatelySync(filePath);
        }
        async save() {
            if (this._isLibFileInMemory())
                return;
            await this._context.fileSystemWrapper.writeFile(this.getFilePath(), this.#getTextForSave());
            this.#isSaved = true;
        }
        saveSync() {
            if (this._isLibFileInMemory())
                return;
            this._context.fileSystemWrapper.writeFileSync(this.getFilePath(), this.#getTextForSave());
            this.#isSaved = true;
        }
        #getTextForSave() {
            const text = this.getFullText();
            return this._hasBom ? "\uFEFF" + text : text;
        }
        getPathReferenceDirectives() {
            if (this.#referencedFiles == null) {
                this.#referencedFiles = (this.compilerNode.referencedFiles || [])
                    .map(f => new FileReference(f, this));
            }
            return this.#referencedFiles;
        }
        getTypeReferenceDirectives() {
            if (this.#typeReferenceDirectives == null) {
                this.#typeReferenceDirectives = (this.compilerNode.typeReferenceDirectives || [])
                    .map(f => new FileReference(f, this));
            }
            return this.#typeReferenceDirectives;
        }
        getLibReferenceDirectives() {
            if (this.#libReferenceDirectives == null) {
                this.#libReferenceDirectives = (this.compilerNode.libReferenceDirectives || [])
                    .map(f => new FileReference(f, this));
            }
            return this.#libReferenceDirectives;
        }
        getReferencingSourceFiles() {
            return Array.from(this._referenceContainer.getDependentSourceFiles());
        }
        getReferencingNodesInOtherSourceFiles() {
            const literals = this.getReferencingLiteralsInOtherSourceFiles();
            return Array.from(getNodes());
            function* getNodes() {
                for (const literal of literals)
                    yield getReferencingNodeFromStringLiteral(literal);
            }
        }
        getReferencingLiteralsInOtherSourceFiles() {
            return Array.from(this._referenceContainer.getReferencingLiteralsInOtherSourceFiles());
        }
        getReferencedSourceFiles() {
            const entries = this._referenceContainer.getLiteralsReferencingOtherSourceFilesEntries();
            return Array.from(new Set(getSourceFilesFromEntries()).values());
            function* getSourceFilesFromEntries() {
                for (const [, sourceFile] of entries)
                    yield sourceFile;
            }
        }
        getNodesReferencingOtherSourceFiles() {
            const entries = this._referenceContainer.getLiteralsReferencingOtherSourceFilesEntries();
            return Array.from(getNodes());
            function* getNodes() {
                for (const [literal] of entries)
                    yield getReferencingNodeFromStringLiteral(literal);
            }
        }
        getLiteralsReferencingOtherSourceFiles() {
            const entries = this._referenceContainer.getLiteralsReferencingOtherSourceFilesEntries();
            return Array.from(getLiteralsFromEntries());
            function* getLiteralsFromEntries() {
                for (const [literal] of entries)
                    yield literal;
            }
        }
        getImportStringLiterals() {
            this._ensureBound();
            const literals = (this.compilerNode.imports || []);
            return literals.filter(l => l.pos !== -1).map(l => this._getNodeFromCompilerNode(l));
        }
        getLanguageVersion() {
            return this.compilerNode.languageVersion;
        }
        getLanguageVariant() {
            return this.compilerNode.languageVariant;
        }
        getScriptKind() {
            return this.compilerNode.scriptKind;
        }
        isDeclarationFile() {
            return this.compilerNode.isDeclarationFile;
        }
        isFromExternalLibrary() {
            if (!this._context.program._isCompilerProgramCreated())
                return false;
            const compilerProgram = this._context.program.compilerObject;
            return compilerProgram.isSourceFileFromExternalLibrary(this.compilerNode);
        }
        isInNodeModules() {
            return this.getFilePath().indexOf("/node_modules/") >= 0;
        }
        isSaved() {
            return this.#isSaved && !this._isLibFileInMemory();
        }
        _setIsSaved(value) {
            this.#isSaved = value;
        }
        getPreEmitDiagnostics() {
            return this._context.getPreEmitDiagnostics(this);
        }
        unindent(positionRangeOrPos, times = 1) {
            return this.indent(positionRangeOrPos, times * -1);
        }
        indent(positionRangeOrPos, times = 1) {
            if (times === 0)
                return this;
            const sourceFileText = this.getFullText();
            const positionRange = typeof positionRangeOrPos === "number" ? [positionRangeOrPos, positionRangeOrPos] : positionRangeOrPos;
            common.errors.throwIfRangeOutOfRange(positionRange, [0, sourceFileText.length], "positionRange");
            const startLinePos = getPreviousMatchingPos(sourceFileText, positionRange[0], char => char === CharCodes.NEWLINE);
            const endLinePos = getNextMatchingPos(sourceFileText, positionRange[1], char => char === CharCodes.CARRIAGE_RETURN || char === CharCodes.NEWLINE);
            const correctedText = common.StringUtils.indent(sourceFileText.substring(startLinePos, endLinePos), times, {
                indentText: this._context.manipulationSettings.getIndentationText(),
                indentSizeInSpaces: this._context.manipulationSettings._getIndentSizeInSpaces(),
                isInStringAtPos: pos => this.isInStringAtPos(pos + startLinePos),
            });
            replaceSourceFileTextForFormatting({
                sourceFile: this,
                newText: sourceFileText.substring(0, startLinePos) + correctedText + sourceFileText.substring(endLinePos),
            });
            return this;
        }
        emit(options) {
            return this._context.program.emit({ targetSourceFile: this, ...options });
        }
        emitSync(options) {
            return this._context.program.emitSync({ targetSourceFile: this, ...options });
        }
        getEmitOutput(options = {}) {
            return this._context.languageService.getEmitOutput(this, options.emitOnlyDtsFiles || false);
        }
        formatText(settings = {}) {
            replaceSourceFileTextForFormatting({
                sourceFile: this,
                newText: this._context.languageService.getFormattedDocumentText(this.getFilePath(), settings),
            });
        }
        async refreshFromFileSystem() {
            const fileReadResult = await this._context.fileSystemWrapper.readFileOrNotExists(this.getFilePath(), this._context.getEncoding());
            return this.#refreshFromFileSystemInternal(fileReadResult);
        }
        refreshFromFileSystemSync() {
            const fileReadResult = this._context.fileSystemWrapper.readFileOrNotExistsSync(this.getFilePath(), this._context.getEncoding());
            return this.#refreshFromFileSystemInternal(fileReadResult);
        }
        getRelativePathTo(sourceFileDirOrPath) {
            return this.getDirectory().getRelativePathTo(sourceFileDirOrPath);
        }
        getRelativePathAsModuleSpecifierTo(sourceFileDirOrFilePath) {
            return this.getDirectory().getRelativePathAsModuleSpecifierTo(sourceFileDirOrFilePath);
        }
        onModified(subscription, subscribe = true) {
            if (subscribe)
                this.#modifiedEventContainer.subscribe(subscription);
            else
                this.#modifiedEventContainer.unsubscribe(subscription);
            return this;
        }
        _doActionPreNextModification(action) {
            const wrappedSubscription = () => {
                action();
                this.#preModifiedEventContainer.unsubscribe(wrappedSubscription);
            };
            this.#preModifiedEventContainer.subscribe(wrappedSubscription);
            return this;
        }
        _firePreModified() {
            this.#preModifiedEventContainer.fire(this);
        }
        organizeImports(formatSettings = {}, userPreferences = {}) {
            this._context.languageService.organizeImports(this, formatSettings, userPreferences).forEach(fileTextChanges => fileTextChanges.applyChanges());
            return this;
        }
        fixUnusedIdentifiers(formatSettings = {}, userPreferences = {}) {
            this._context.languageService.getCombinedCodeFix(this, "unusedIdentifier_delete", formatSettings, userPreferences).applyChanges();
            this._context.languageService.getCombinedCodeFix(this, "unusedIdentifier_deleteImports", formatSettings, userPreferences).applyChanges();
            return this;
        }
        fixMissingImports(formatSettings = {}, userPreferences = {}) {
            const combinedCodeFix = this._context.languageService.getCombinedCodeFix(this, "fixMissingImport", formatSettings, userPreferences);
            const sourceFile = this;
            for (const fileTextChanges of combinedCodeFix.getChanges()) {
                const changes = fileTextChanges.getTextChanges();
                removeUnnecessaryDoubleBlankLines(changes);
                applyTextChanges(changes);
            }
            return this;
            function removeUnnecessaryDoubleBlankLines(changes) {
                changes.sort((a, b) => a.getSpan().getStart() - b.getSpan().getStart());
                for (let i = 0; i < changes.length - 1; i++) {
                    const { compilerObject } = changes[i];
                    compilerObject.newText = compilerObject.newText.replace(/(\r?)\n\r?\n$/, "$1\n");
                }
            }
            function applyTextChanges(changes) {
                const groups = common.ArrayUtils.groupBy(changes, change => change.getSpan().getStart());
                let addedLength = 0;
                for (const group of groups) {
                    const insertPos = group[0].getSpan().getStart() + addedLength;
                    const newText = group.map(item => item.getNewText()).join("");
                    insertIntoTextRange({
                        sourceFile,
                        insertPos,
                        newText,
                    });
                    addedLength += newText.length;
                }
            }
        }
        applyTextChanges(textChanges) {
            if (textChanges.length === 0)
                return this;
            this.forgetDescendants();
            replaceNodeText({
                sourceFile: this._sourceFile,
                start: 0,
                replacingLength: this.getFullWidth(),
                newText: getTextFromTextChanges(this, textChanges),
            });
            return this;
        }
        set(structure) {
            callBaseSet(SourceFileBase.prototype, this, structure);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(SourceFileBase.prototype, this, {
                kind: exports.StructureKind.SourceFile,
            });
        }
        #refreshFromFileSystemInternal(fileReadResult) {
            if (fileReadResult === false) {
                this.forget();
                return exports.FileSystemRefreshResult.Deleted;
            }
            const fileText = fileReadResult;
            if (fileText === this.getFullText())
                return exports.FileSystemRefreshResult.NoChange;
            this.replaceText([0, this.getEnd()], fileText);
            this._setIsSaved(true);
            return exports.FileSystemRefreshResult.Updated;
        }
        _isLibFileInMemory() {
            return this.compilerNode.fileName.startsWith(common.libFolderInMemoryPath);
        }
        _throwIfIsInMemoryLibFile() {
            if (this._isLibFileInMemory())
                throw new common.errors.InvalidOperationError(`This operation is not permitted on an in memory lib folder file.`);
        }
        _isInProject() {
            return this._context.inProjectCoordinator.isSourceFileInProject(this);
        }
        _markAsInProject() {
            this._context.inProjectCoordinator.markSourceFileAsInProject(this);
        }
    };
})();
function updateStringLiteralReferences(nodeReferences) {
    for (const [stringLiteral, sourceFile] of nodeReferences) {
        if (ModuleUtils.isModuleSpecifierRelative(stringLiteral.getLiteralText()))
            stringLiteral.setLiteralValue(stringLiteral._sourceFile.getRelativePathAsModuleSpecifierTo(sourceFile));
    }
}
function getReferencingNodeFromStringLiteral(literal) {
    const parent = literal.getParentOrThrow();
    const grandParent = parent.getParent();
    if (grandParent != null && Node.isImportEqualsDeclaration(grandParent))
        return grandParent;
    else
        return parent;
}

const createBase$q = (ctor) => ModuleChildableNode(JSDocableNode(AmbientableNode(ExportableNode(ModifierableNode(ctor)))));
const VariableStatementBase = createBase$q(Statement);
class VariableStatement extends VariableStatementBase {
    getDeclarationList() {
        return this._getNodeFromCompilerNode(this.compilerNode.declarationList);
    }
    getDeclarations() {
        return this.getDeclarationList().getDeclarations();
    }
    getDeclarationKind() {
        return this.getDeclarationList().getDeclarationKind();
    }
    getDeclarationKindKeywords() {
        return this.getDeclarationList().getDeclarationKindKeywords();
    }
    setDeclarationKind(type) {
        return this.getDeclarationList().setDeclarationKind(type);
    }
    addDeclaration(structure) {
        return this.getDeclarationList().addDeclaration(structure);
    }
    addDeclarations(structures) {
        return this.getDeclarationList().addDeclarations(structures);
    }
    insertDeclaration(index, structure) {
        return this.getDeclarationList().insertDeclaration(index, structure);
    }
    insertDeclarations(index, structures) {
        return this.getDeclarationList().insertDeclarations(index, structures);
    }
    set(structure) {
        callBaseSet(VariableStatementBase.prototype, this, structure);
        if (structure.declarationKind != null)
            this.setDeclarationKind(structure.declarationKind);
        if (structure.declarations != null) {
            const existingDeclarations = this.getDeclarations();
            this.addDeclarations(structure.declarations);
            existingDeclarations.forEach(d => d.remove());
        }
        return this;
    }
    getStructure() {
        return callBaseGetStructure(VariableStatementBase.prototype, this, {
            kind: exports.StructureKind.VariableStatement,
            declarationKind: this.getDeclarationKind(),
            declarations: this.getDeclarations().map(declaration => declaration.getStructure()),
        });
    }
}

const WhileStatementBase = ExpressionedNode(IterationStatement);
class WhileStatement extends WhileStatementBase {
}

const WithStatementBase = ExpressionedNode(Statement);
class WithStatement extends WithStatementBase {
    getStatement() {
        return this._getNodeFromCompilerNode(this.compilerNode.statement);
    }
}

function FunctionLikeDeclaration(Base) {
    return JSDocableNode(TypeParameteredNode(SignaturedDeclaration(StatementedNode(ModifierableNode(Base)))));
}

const createBase$p = (ctor) => TextInsertableNode(BodiedNode(AsyncableNode(FunctionLikeDeclaration(ctor))));
const ArrowFunctionBase = createBase$p(Expression);
class ArrowFunction extends ArrowFunctionBase {
    getEqualsGreaterThan() {
        return this._getNodeFromCompilerNode(this.compilerNode.equalsGreaterThanToken);
    }
}

function OverloadableNode(Base) {
    return class extends Base {
        getOverloads() {
            return getOverloadsAndImplementation(this).filter(n => n.isOverload());
        }
        getImplementation() {
            if (this.isImplementation())
                return this;
            return getOverloadsAndImplementation(this).find(n => n.isImplementation());
        }
        getImplementationOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getImplementation(), message ?? "Expected to find a corresponding implementation for the overload.", this);
        }
        isOverload() {
            return !this.isImplementation();
        }
        isImplementation() {
            return this.getBody() != null;
        }
    };
}
function getOverloadsAndImplementation(node) {
    const parent = node.getParentOrThrow();
    const name = getNameIfNamedNode(node);
    const isStatic = getStaticIfStaticable(node);
    const kind = node.getKind();
    return parent.forEachChildAsArray().filter(n => {
        return getNameIfNamedNode(n) === name
            && n.getKind() === kind
            && getStaticIfStaticable(n) === isStatic;
    });
}
function getNameIfNamedNode(node) {
    const nodeAsNamedNode = node;
    if (nodeAsNamedNode.getName instanceof Function)
        return nodeAsNamedNode.getName();
    return undefined;
}
function getStaticIfStaticable(node) {
    const nodeAsStaticableNode = node;
    if (nodeAsStaticableNode.isStatic instanceof Function)
        return nodeAsStaticableNode.isStatic();
    return false;
}
function insertOverloads(opts) {
    if (opts.structures.length === 0)
        return [];
    const parentSyntaxList = opts.node.getParentSyntaxListOrThrow();
    const implementationNode = opts.node.getImplementation() || opts.node;
    const overloads = opts.node.getOverloads();
    const overloadsCount = overloads.length;
    const firstIndex = overloads.length > 0 ? overloads[0].getChildIndex() : implementationNode.getChildIndex();
    const index = verifyAndGetIndex(opts.index, overloadsCount);
    const mainIndex = firstIndex + index;
    const thisStructure = opts.getThisStructure(implementationNode);
    const structures = opts.structures.map(structure => Object.assign(Object.assign({}, thisStructure), structure));
    const writer = implementationNode._getWriterWithQueuedIndentation();
    for (const structure of structures) {
        if (writer.getLength() > 0)
            writer.newLine();
        opts.printStructure(writer, structure);
    }
    writer.newLine();
    writer.write("");
    insertIntoParentTextRange({
        parent: parentSyntaxList,
        insertPos: (overloads[index] || implementationNode).getNonWhitespaceStart(),
        newText: writer.toString(),
    });
    return getRangeWithoutCommentsFromArray(parentSyntaxList.getChildren(), mainIndex, structures.length, opts.expectedSyntaxKind);
}

const createBase$o = (ctor) => UnwrappableNode(TextInsertableNode(OverloadableNode(BodyableNode(AsyncableNode(GeneratorableNode(AmbientableNode(ExportableNode(FunctionLikeDeclaration(ModuleChildableNode(NameableNode(ctor)))))))))));
const FunctionDeclarationBase = createBase$o(Statement);
const createOverloadBase$2 = (ctor) => UnwrappableNode(TextInsertableNode(AsyncableNode(GeneratorableNode(SignaturedDeclaration(AmbientableNode(ModuleChildableNode(JSDocableNode(TypeParameteredNode(ExportableNode(ModifierableNode(ctor)))))))))));
const FunctionDeclarationOverloadBase = createOverloadBase$2(Statement);
class FunctionDeclaration extends FunctionDeclarationBase {
    addOverload(structure) {
        return this.addOverloads([structure])[0];
    }
    addOverloads(structures) {
        return this.insertOverloads(this.getOverloads().length, structures);
    }
    insertOverload(index, structure) {
        return this.insertOverloads(index, [structure])[0];
    }
    insertOverloads(index, structures) {
        const thisName = this.getName();
        const printer = this._context.structurePrinterFactory.forFunctionDeclaration({
            isAmbient: this.isAmbient(),
        });
        return insertOverloads({
            node: this,
            index,
            structures,
            printStructure: (writer, structure) => {
                printer.printOverload(writer, thisName, structure);
            },
            getThisStructure: fromFunctionDeclarationOverload,
            expectedSyntaxKind: common.SyntaxKind.FunctionDeclaration,
        });
    }
    remove() {
        removeOverloadableStatementedNodeChild(this);
    }
    set(structure) {
        callBaseSet(FunctionDeclarationBase.prototype, this, structure);
        if (structure.overloads != null) {
            this.getOverloads().forEach(o => o.remove());
            this.addOverloads(structure.overloads);
        }
        return this;
    }
    getStructure() {
        const isOverload = this.isOverload();
        const hasImplementation = this.getImplementation();
        const basePrototype = isOverload && hasImplementation ? FunctionDeclarationOverloadBase.prototype : FunctionDeclarationBase.prototype;
        return callBaseGetStructure(basePrototype, this, getStructure(this));
        function getStructure(thisNode) {
            if (hasImplementation && isOverload)
                return getOverloadSpecificStructure();
            return getSpecificStructure();
            function getOverloadSpecificStructure() {
                return { kind: exports.StructureKind.FunctionOverload };
            }
            function getSpecificStructure() {
                if (!hasImplementation)
                    return { kind: exports.StructureKind.Function };
                else {
                    return {
                        kind: exports.StructureKind.Function,
                        overloads: thisNode.getOverloads().map(o => o.getStructure()),
                    };
                }
            }
        }
    }
}

const createBase$n = (ctor) => JSDocableNode(TextInsertableNode(BodiedNode(AsyncableNode(GeneratorableNode(StatementedNode(TypeParameteredNode(SignaturedDeclaration(ModifierableNode(NameableNode(ctor))))))))));
const FunctionExpressionBase = createBase$n(PrimaryExpression);
class FunctionExpression extends FunctionExpressionBase {
}

const createBase$m = (ctor) => OverrideableNode(QuestionTokenableNode(DecoratableNode(ScopeableNode(ReadonlyableNode(ModifierableNode(DotDotDotTokenableNode(TypedNode(InitializerExpressionableNode(BindingNamedNode(ctor))))))))));
const ParameterDeclarationBase = createBase$m(Node);
class ParameterDeclaration extends ParameterDeclarationBase {
    isRestParameter() {
        return this.compilerNode.dotDotDotToken != null;
    }
    isParameterProperty() {
        return this.getScope() != null || this.isReadonly() || this.hasOverrideKeyword();
    }
    setIsRestParameter(value) {
        if (this.isRestParameter() === value)
            return this;
        if (value) {
            addParensIfNecessary(this);
            insertIntoParentTextRange({
                insertPos: this.getNameNode().getStart(),
                parent: this,
                newText: "...",
            });
        }
        else {
            removeChildren({ children: [this.getDotDotDotTokenOrThrow()] });
        }
        return this;
    }
    isOptional() {
        return this.compilerNode.questionToken != null || this.isRestParameter() || this.hasInitializer();
    }
    remove() {
        removeCommaSeparatedChild(this);
    }
    set(structure) {
        callBaseSet(ParameterDeclarationBase.prototype, this, structure);
        if (structure.isRestParameter != null)
            this.setIsRestParameter(structure.isRestParameter);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(ParameterDeclarationBase.prototype, this, {
            kind: exports.StructureKind.Parameter,
            isRestParameter: this.isRestParameter(),
        });
    }
    setHasQuestionToken(value) {
        if (value)
            addParensIfNecessary(this);
        super.setHasQuestionToken(value);
        return this;
    }
    setInitializer(textOrWriterFunction) {
        addParensIfNecessary(this);
        super.setInitializer(textOrWriterFunction);
        return this;
    }
    setType(textOrWriterFunction) {
        addParensIfNecessary(this);
        super.setType.call(this, textOrWriterFunction);
        return this;
    }
}
function addParensIfNecessary(parameter) {
    const parent = parameter.getParentOrThrow();
    if (isParameterWithoutParens())
        addParens();
    function isParameterWithoutParens() {
        return Node.isArrowFunction(parent)
            && parent.compilerNode.parameters.length === 1
            && parameter.getParentSyntaxListOrThrow().getPreviousSiblingIfKind(common.SyntaxKind.OpenParenToken) == null;
    }
    function addParens() {
        const paramText = parameter.getText();
        insertIntoParentTextRange({
            parent,
            insertPos: parameter.getStart(),
            newText: `(${paramText})`,
            replacing: {
                textLength: paramText.length,
            },
            customMappings: newParent => {
                return [{ currentNode: parameter, newNode: newParent.parameters[0] }];
            },
        });
    }
}

class ClassElement extends Node {
    remove() {
        const parent = this.getParentOrThrow();
        if (Node.isClassDeclaration(parent) || Node.isClassExpression(parent))
            removeClassMember(this);
        else if (Node.isObjectLiteralExpression(parent))
            removeCommaSeparatedChild(this);
        else if (Node.isInterfaceDeclaration(parent))
            removeInterfaceMember(this);
        else
            common.errors.throwNotImplementedForSyntaxKindError(parent.getKind());
    }
}

const createBase$l = (ctor) => ChildOrderableNode(TextInsertableNode(OverrideableNode(OverloadableNode(BodyableNode(DecoratableNode(AbstractableNode(ScopedNode(QuestionTokenableNode(StaticableNode(AsyncableNode(GeneratorableNode(FunctionLikeDeclaration(PropertyNamedNode(ctor))))))))))))));
const MethodDeclarationBase = createBase$l(ClassElement);
const createOverloadBase$1 = (ctor) => JSDocableNode(ChildOrderableNode(TextInsertableNode(OverrideableNode(ScopedNode(TypeParameteredNode(AbstractableNode(QuestionTokenableNode(StaticableNode(AsyncableNode(ModifierableNode(GeneratorableNode(SignaturedDeclaration(ctor)))))))))))));
const MethodDeclarationOverloadBase = createOverloadBase$1(ClassElement);
class MethodDeclaration extends MethodDeclarationBase {
    set(structure) {
        callBaseSet(MethodDeclarationBase.prototype, this, structure);
        if (structure.overloads != null) {
            this.getOverloads().forEach(o => o.remove());
            this.addOverloads(structure.overloads);
        }
        return this;
    }
    addOverload(structure) {
        return this.addOverloads([structure])[0];
    }
    addOverloads(structures) {
        return this.insertOverloads(this.getOverloads().length, structures);
    }
    insertOverload(index, structure) {
        return this.insertOverloads(index, [structure])[0];
    }
    insertOverloads(index, structures) {
        const thisName = this.getName();
        const printer = this._context.structurePrinterFactory.forMethodDeclaration({
            isAmbient: isNodeAmbientOrInAmbientContext(this),
        });
        return insertOverloads({
            node: this,
            index,
            structures,
            printStructure: (writer, structure) => {
                printer.printOverload(writer, thisName, structure);
            },
            getThisStructure: fromMethodDeclarationOverload,
            expectedSyntaxKind: common.SyntaxKind.MethodDeclaration,
        });
    }
    getStructure() {
        const hasImplementation = this.getImplementation() != null;
        const isOverload = this.isOverload();
        const basePrototype = isOverload && hasImplementation ? MethodDeclarationOverloadBase.prototype : MethodDeclarationBase.prototype;
        return callBaseGetStructure(basePrototype, this, getStructure(this));
        function getStructure(thisNode) {
            if (hasImplementation && isOverload)
                return getOverloadSpecificStructure();
            return getSpecificStructure();
            function getOverloadSpecificStructure() {
                return { kind: exports.StructureKind.MethodOverload };
            }
            function getSpecificStructure() {
                if (!hasImplementation)
                    return { kind: exports.StructureKind.Method };
                else {
                    return {
                        kind: exports.StructureKind.Method,
                        overloads: thisNode.getOverloads().map(o => o.getStructure()),
                    };
                }
            }
        }
    }
}

function ClassLikeDeclarationBase(Base) {
    return ClassLikeDeclarationBaseSpecific(NameableNode(TextInsertableNode(ImplementsClauseableNode(HeritageClauseableNode(AbstractableNode(JSDocableNode(TypeParameteredNode(DecoratableNode(ModifierableNode(Base))))))))));
}
function ClassLikeDeclarationBaseSpecific(Base) {
    return class extends Base {
        setExtends(text) {
            text = this._getTextWithQueuedChildIndentation(text);
            if (common.StringUtils.isNullOrWhitespace(text))
                return this.removeExtends();
            const extendsClause = this.getHeritageClauseByKind(common.SyntaxKind.ExtendsKeyword);
            if (extendsClause != null) {
                const childSyntaxList = extendsClause.getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList);
                const childSyntaxListStart = childSyntaxList.getStart();
                insertIntoParentTextRange({
                    parent: extendsClause,
                    newText: text,
                    insertPos: childSyntaxListStart,
                    replacing: {
                        textLength: childSyntaxList.getEnd() - childSyntaxListStart,
                    },
                });
            }
            else {
                const implementsClause = this.getHeritageClauseByKind(common.SyntaxKind.ImplementsKeyword);
                let insertPos;
                if (implementsClause != null)
                    insertPos = implementsClause.getStart();
                else
                    insertPos = this.getFirstChildByKindOrThrow(common.SyntaxKind.OpenBraceToken).getStart();
                const isLastSpace = /\s/.test(this.getSourceFile().getFullText()[insertPos - 1]);
                let newText = `extends ${text} `;
                if (!isLastSpace)
                    newText = " " + newText;
                insertIntoParentTextRange({
                    parent: implementsClause == null ? this : implementsClause.getParentSyntaxListOrThrow(),
                    insertPos,
                    newText,
                });
            }
            return this;
        }
        removeExtends() {
            const extendsClause = this.getHeritageClauseByKind(common.SyntaxKind.ExtendsKeyword);
            if (extendsClause == null)
                return this;
            extendsClause.removeExpression(0);
            return this;
        }
        getExtendsOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getExtends(), message ?? `Expected to find the extends expression for the class ${this.getName()}.`, this);
        }
        getExtends() {
            const extendsClause = this.getHeritageClauseByKind(common.SyntaxKind.ExtendsKeyword);
            if (extendsClause == null)
                return undefined;
            const types = extendsClause.getTypeNodes();
            return types.length === 0 ? undefined : types[0];
        }
        addMembers(members) {
            return this.insertMembers(getEndIndexFromArray(this.getMembersWithComments()), members);
        }
        addMember(member) {
            return this.insertMember(getEndIndexFromArray(this.getMembersWithComments()), member);
        }
        insertMember(index, member) {
            return this.insertMembers(index, [member])[0];
        }
        insertMembers(index, members) {
            const isAmbient = isNodeAmbientOrInAmbientContext(this);
            return insertIntoBracesOrSourceFileWithGetChildrenWithComments({
                getIndexedChildren: () => this.getMembersWithComments(),
                index,
                parent: this,
                write: (writer, info) => {
                    const previousMemberHasBody = !isAmbient && info.previousMember != null && Node.isBodyable(info.previousMember)
                        && info.previousMember.hasBody();
                    const firstStructureHasBody = !isAmbient && members instanceof Array && structureHasBody(members[0]);
                    if (previousMemberHasBody || info.previousMember != null && firstStructureHasBody)
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                    const memberWriter = this._getWriter();
                    const memberPrinter = this._context.structurePrinterFactory.forClassMember({ isAmbient });
                    memberPrinter.printTexts(memberWriter, members);
                    writer.write(memberWriter.toString());
                    const lastStructureHasBody = !isAmbient && members instanceof Array && structureHasBody(members[members.length - 1]);
                    const nextMemberHasBody = !isAmbient && info.nextMember != null && Node.isBodyable(info.nextMember) && info.nextMember.hasBody();
                    if (info.nextMember != null && lastStructureHasBody || nextMemberHasBody)
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                },
            });
            function structureHasBody(value) {
                if (isAmbient || value == null || typeof value.kind !== "number")
                    return false;
                const structure = value;
                return Structure.isMethod(structure)
                    || Structure.isGetAccessor(structure)
                    || Structure.isSetAccessor(structure)
                    || Structure.isConstructor(structure);
            }
        }
        addConstructor(structure = {}) {
            return this.insertConstructor(getEndIndexFromArray(this.getMembersWithComments()), structure);
        }
        addConstructors(structures) {
            return this.insertConstructors(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertConstructor(index, structure = {}) {
            return this.insertConstructors(index, [structure])[0];
        }
        insertConstructors(index, structures) {
            const isAmbient = isNodeAmbientOrInAmbientContext(this);
            return insertChildren(this, {
                index,
                structures,
                expectedKind: common.SyntaxKind.Constructor,
                write: (writer, info) => {
                    if (!isAmbient && info.previousMember != null && !Node.isCommentNode(info.previousMember))
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                    this._context.structurePrinterFactory.forConstructorDeclaration({ isAmbient }).printTexts(writer, structures);
                    if (!isAmbient && info.nextMember != null)
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                },
            });
        }
        getConstructors() {
            return this.getMembers().filter(m => Node.isConstructorDeclaration(m));
        }
        addStaticBlock(structure = {}) {
            return this.insertStaticBlock(getEndIndexFromArray(this.getMembersWithComments()), structure);
        }
        addStaticBlocks(structures) {
            return this.insertStaticBlocks(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertStaticBlock(index, structure = {}) {
            return this.insertStaticBlocks(index, [structure])[0];
        }
        insertStaticBlocks(index, structures) {
            const isAmbient = isNodeAmbientOrInAmbientContext(this);
            return insertChildren(this, {
                index,
                structures,
                expectedKind: common.SyntaxKind.ClassStaticBlockDeclaration,
                write: (writer, info) => {
                    if (!isAmbient && info.previousMember != null && !Node.isCommentNode(info.previousMember))
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                    this._context.structurePrinterFactory.forClassStaticBlockDeclaration().printTexts(writer, structures);
                    if (!isAmbient && info.nextMember != null)
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                },
            });
        }
        getStaticBlocks() {
            return this.getMembers().filter(m => Node.isClassStaticBlockDeclaration(m));
        }
        addGetAccessor(structure) {
            return this.addGetAccessors([structure])[0];
        }
        addGetAccessors(structures) {
            return this.insertGetAccessors(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertGetAccessor(index, structure) {
            return this.insertGetAccessors(index, [structure])[0];
        }
        insertGetAccessors(index, structures) {
            return insertChildren(this, {
                index,
                structures,
                expectedKind: common.SyntaxKind.GetAccessor,
                write: (writer, info) => {
                    if (info.previousMember != null && !Node.isCommentNode(info.previousMember))
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                    this._context.structurePrinterFactory.forGetAccessorDeclaration({
                        isAmbient: isNodeAmbientOrInAmbientContext(this),
                    }).printTexts(writer, structures);
                    if (info.nextMember != null)
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                },
            });
        }
        addSetAccessor(structure) {
            return this.addSetAccessors([structure])[0];
        }
        addSetAccessors(structures) {
            return this.insertSetAccessors(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertSetAccessor(index, structure) {
            return this.insertSetAccessors(index, [structure])[0];
        }
        insertSetAccessors(index, structures) {
            return insertChildren(this, {
                index,
                structures,
                expectedKind: common.SyntaxKind.SetAccessor,
                write: (writer, info) => {
                    if (info.previousMember != null && !Node.isCommentNode(info.previousMember))
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                    this._context.structurePrinterFactory.forSetAccessorDeclaration({
                        isAmbient: isNodeAmbientOrInAmbientContext(this),
                    }).printTexts(writer, structures);
                    if (info.nextMember != null)
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                },
            });
        }
        addProperty(structure) {
            return this.addProperties([structure])[0];
        }
        addProperties(structures) {
            return this.insertProperties(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertProperty(index, structure) {
            return this.insertProperties(index, [structure])[0];
        }
        insertProperties(index, structures) {
            return insertChildren(this, {
                index,
                structures,
                expectedKind: common.SyntaxKind.PropertyDeclaration,
                write: (writer, info) => {
                    if (info.previousMember != null && Node.hasBody(info.previousMember))
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                    this._context.structurePrinterFactory.forPropertyDeclaration().printTexts(writer, structures);
                    if (info.nextMember != null && Node.hasBody(info.nextMember))
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                },
            });
        }
        addMethod(structure) {
            return this.addMethods([structure])[0];
        }
        addMethods(structures) {
            return this.insertMethods(getEndIndexFromArray(this.getMembersWithComments()), structures);
        }
        insertMethod(index, structure) {
            return this.insertMethods(index, [structure])[0];
        }
        insertMethods(index, structures) {
            const isAmbient = isNodeAmbientOrInAmbientContext(this);
            structures = structures.map(s => ({ ...s }));
            return insertChildren(this, {
                index,
                write: (writer, info) => {
                    if (!isAmbient && info.previousMember != null && !Node.isCommentNode(info.previousMember))
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                    this._context.structurePrinterFactory.forMethodDeclaration({ isAmbient }).printTexts(writer, structures);
                    if (!isAmbient && info.nextMember != null)
                        writer.blankLineIfLastNot();
                    else
                        writer.newLineIfLastNot();
                },
                structures,
                expectedKind: common.SyntaxKind.MethodDeclaration,
            });
        }
        getInstanceProperty(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getInstanceProperties(), nameOrFindFunction);
        }
        getInstancePropertyOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getInstanceProperty(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class instance property", nameOrFindFunction));
        }
        getInstanceProperties() {
            return this.getInstanceMembers()
                .filter(m => isClassPropertyType(m));
        }
        getStaticProperty(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getStaticProperties(), nameOrFindFunction);
        }
        getStaticPropertyOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getStaticProperty(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class static property", nameOrFindFunction));
        }
        getStaticProperties() {
            return this.getStaticMembers()
                .filter(m => isClassPropertyType(m));
        }
        getProperty(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getProperties(), nameOrFindFunction);
        }
        getPropertyOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getProperty(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class property declaration", nameOrFindFunction));
        }
        getProperties() {
            return this.getMembers()
                .filter(m => Node.isPropertyDeclaration(m));
        }
        getGetAccessor(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getGetAccessors(), nameOrFindFunction);
        }
        getGetAccessorOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getGetAccessor(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class getAccessor declaration", nameOrFindFunction));
        }
        getGetAccessors() {
            return this.getMembers()
                .filter(m => Node.isGetAccessorDeclaration(m));
        }
        getSetAccessor(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getSetAccessors(), nameOrFindFunction);
        }
        getSetAccessorOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getSetAccessor(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class setAccessor declaration", nameOrFindFunction));
        }
        getSetAccessors() {
            return this.getMembers()
                .filter(m => Node.isSetAccessorDeclaration(m));
        }
        getMethod(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getMethods(), nameOrFindFunction);
        }
        getMethodOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getMethod(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class method declaration", nameOrFindFunction));
        }
        getMethods() {
            return this.getMembers()
                .filter(m => Node.isMethodDeclaration(m));
        }
        getInstanceMethod(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getInstanceMethods(), nameOrFindFunction);
        }
        getInstanceMethodOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getInstanceMethod(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class instance method", nameOrFindFunction));
        }
        getInstanceMethods() {
            return this.getInstanceMembers().filter(m => m instanceof MethodDeclaration);
        }
        getStaticMethod(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getStaticMethods(), nameOrFindFunction);
        }
        getStaticMethodOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getStaticMethod(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class static method", nameOrFindFunction));
        }
        getStaticMethods() {
            return this.getStaticMembers().filter(m => m instanceof MethodDeclaration);
        }
        getInstanceMember(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getInstanceMembers(), nameOrFindFunction);
        }
        getInstanceMemberOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getInstanceMember(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class instance member", nameOrFindFunction));
        }
        getInstanceMembers() {
            return this.getMembersWithParameterProperties().filter(m => {
                if (Node.isConstructorDeclaration(m))
                    return false;
                return Node.isParameterDeclaration(m) || !m.isStatic();
            });
        }
        getStaticMember(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getStaticMembers(), nameOrFindFunction);
        }
        getStaticMemberOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getStaticMember(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class static member", nameOrFindFunction));
        }
        getStaticMembers() {
            return this.getMembers().filter(m => {
                if (Node.isConstructorDeclaration(m))
                    return false;
                return !Node.isParameterDeclaration(m) && m.isStatic();
            });
        }
        getMembersWithParameterProperties() {
            const members = this.getMembers();
            const implementationCtors = members.filter(c => Node.isConstructorDeclaration(c) && c.isImplementation());
            for (const ctor of implementationCtors) {
                let insertIndex = members.indexOf(ctor) + 1;
                for (const param of ctor.getParameters()) {
                    if (param.isParameterProperty()) {
                        members.splice(insertIndex, 0, param);
                        insertIndex++;
                    }
                }
            }
            return members;
        }
        getMembers() {
            return getAllMembers(this, this.compilerNode.members).filter(m => isSupportedClassMember(m));
        }
        getMembersWithComments() {
            const compilerNode = this.compilerNode;
            const members = ExtendedParser.getContainerArray(compilerNode, this.getSourceFile().compilerNode);
            return getAllMembers(this, members)
                .filter(m => isSupportedClassMember(m) || Node.isCommentClassElement(m));
        }
        getMember(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getMembers(), nameOrFindFunction);
        }
        getMemberOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getMember(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("class member", nameOrFindFunction));
        }
        getBaseTypes() {
            return this.getType().getBaseTypes();
        }
        getBaseClassOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getBaseClass(), message ?? `Expected to find the base class of ${this.getName()}.`, this);
        }
        getBaseClass() {
            const baseTypes = this.getBaseTypes().map(t => t.isIntersection() ? t.getIntersectionTypes() : [t]).flat();
            const declarations = baseTypes
                .map(t => t.getSymbol())
                .filter(s => s != null)
                .map(s => s.getDeclarations())
                .reduce((a, b) => a.concat(b), [])
                .filter(d => d.getKind() === common.SyntaxKind.ClassDeclaration);
            if (declarations.length !== 1)
                return undefined;
            return declarations[0];
        }
        getDerivedClasses() {
            const classes = getImmediateDerivedClasses(this);
            for (let i = 0; i < classes.length; i++) {
                const derivedClasses = getImmediateDerivedClasses(classes[i]);
                for (const derivedClass of derivedClasses) {
                    if (derivedClass !== this && classes.indexOf(derivedClass) === -1)
                        classes.push(derivedClass);
                }
            }
            return classes;
        }
    };
}
function getAllMembers(classDec, compilerMembers) {
    const isAmbient = isNodeAmbientOrInAmbientContext(classDec);
    const members = compilerMembers.map(m => classDec._getNodeFromCompilerNode(m));
    return isAmbient ? members : members.filter(m => {
        if (!(Node.isConstructorDeclaration(m) || Node.isMethodDeclaration(m)))
            return true;
        if (Node.isMethodDeclaration(m) && m.isAbstract())
            return true;
        return m.isImplementation();
    });
}
function getImmediateDerivedClasses(classDec) {
    const classes = [];
    const nameNode = classDec.getNameNode();
    if (nameNode == null)
        return classes;
    for (let node of nameNode.findReferencesAsNodes()) {
        node = node.getParentWhileKind(common.SyntaxKind.PropertyAccessExpression) ?? node;
        const nodeParent = node.getParentIfKind(common.SyntaxKind.ExpressionWithTypeArguments);
        if (nodeParent == null)
            continue;
        const heritageClause = nodeParent.getParentIfKind(common.SyntaxKind.HeritageClause);
        if (heritageClause == null || heritageClause.getToken() !== common.SyntaxKind.ExtendsKeyword)
            continue;
        const derivedClass = heritageClause.getParentIfKind(common.SyntaxKind.ClassDeclaration);
        if (derivedClass == null)
            continue;
        classes.push(derivedClass);
    }
    return classes;
}
function isClassPropertyType(m) {
    return Node.isPropertyDeclaration(m)
        || Node.isSetAccessorDeclaration(m)
        || Node.isGetAccessorDeclaration(m)
        || Node.isParameterDeclaration(m);
}
function isSupportedClassMember(m) {
    return Node.isMethodDeclaration(m)
        || Node.isPropertyDeclaration(m)
        || Node.isGetAccessorDeclaration(m)
        || Node.isSetAccessorDeclaration(m)
        || Node.isConstructorDeclaration(m)
        || Node.isClassStaticBlockDeclaration(m);
}
function insertChildren(classDeclaration, opts) {
    return insertIntoBracesOrSourceFileWithGetChildren({
        getIndexedChildren: () => classDeclaration.getMembersWithComments(),
        parent: classDeclaration,
        ...opts,
    });
}

const createBase$k = (ctor) => ModuleChildableNode(AmbientableNode(ExportableNode(ClassLikeDeclarationBase(ctor))));
const ClassDeclarationBase = createBase$k(Statement);
class ClassDeclaration extends ClassDeclarationBase {
    set(structure) {
        callBaseSet(ClassDeclarationBase.prototype, this, structure);
        if (structure.extends != null)
            this.setExtends(structure.extends);
        else if (structure.hasOwnProperty(common.nameof(structure, "extends")))
            this.removeExtends();
        if (structure.ctors != null) {
            this.getConstructors().forEach(c => c.remove());
            this.addConstructors(structure.ctors);
        }
        if (structure.staticBlocks != null) {
            this.getStaticBlocks().forEach(c => c.remove());
            this.addStaticBlocks(structure.staticBlocks);
        }
        if (structure.properties != null) {
            this.getProperties().forEach(p => p.remove());
            this.addProperties(structure.properties);
        }
        if (structure.getAccessors != null) {
            this.getGetAccessors().forEach(a => a.remove());
            this.addGetAccessors(structure.getAccessors);
        }
        if (structure.setAccessors != null) {
            this.getSetAccessors().forEach(a => a.remove());
            this.addSetAccessors(structure.setAccessors);
        }
        if (structure.methods != null) {
            this.getMethods().forEach(m => m.remove());
            this.addMethods(structure.methods);
        }
        return this;
    }
    getStructure() {
        const getExtends = this.getExtends();
        const isAmbient = this.isAmbient();
        return callBaseGetStructure(ClassDeclarationBase.prototype, this, {
            kind: exports.StructureKind.Class,
            ctors: this.getConstructors().filter(ctor => isAmbient || !ctor.isOverload()).map(ctor => ctor.getStructure()),
            staticBlocks: this.getStaticBlocks().map(ctor => ctor.getStructure()),
            methods: this.getMethods().filter(method => isAmbient || !method.isOverload()).map(method => method.getStructure()),
            properties: this.getProperties().map(property => property.getStructure()),
            extends: getExtends ? getExtends.getText() : undefined,
            getAccessors: this.getGetAccessors().map(getAccessor => getAccessor.getStructure()),
            setAccessors: this.getSetAccessors().map(accessor => accessor.getStructure()),
        });
    }
    extractInterface(name) {
        const { constructors, properties, methods, accessors } = getExtractedClassDetails(this, false);
        const parameterProperties = constructors.map(c => c.getParameters().filter(p => p.isParameterProperty()))
            .flat()
            .filter(p => p.getName() != null && p.getScope() === exports.Scope.Public);
        return {
            kind: exports.StructureKind.Interface,
            name: getDefaultExtractedName(name, this),
            docs: this.getJsDocs().map(d => d.getStructure()),
            typeParameters: this.getTypeParameters().map(p => p.getStructure()),
            properties: [
                ...parameterProperties.map(p => {
                    const jsDocComment = p.getParentOrThrow().getJsDocs().map(j => j.getTags())
                        .flat()
                        .filter(Node.isJSDocParameterTag)
                        .filter(t => t.getTagName() === "param" && t.getName() === p.getName() && t.getComment() != null)
                        .map(t => t.getCommentText().trim())[0];
                    return {
                        kind: exports.StructureKind.PropertySignature,
                        docs: jsDocComment == null ? [] : [{ kind: exports.StructureKind.JSDoc, description: jsDocComment }],
                        name: p.getName(),
                        type: p.getType().getText(p),
                        hasQuestionToken: p.hasQuestionToken(),
                        isReadonly: p.isReadonly(),
                    };
                }),
                ...properties.map(getExtractedInterfacePropertyStructure),
                ...accessors.map(getExtractedInterfaceAccessorStructure),
            ],
            methods: methods.map(getExtractedInterfaceMethodStructure),
        };
    }
    extractStaticInterface(name) {
        const { constructors, properties, methods, accessors } = getExtractedClassDetails(this, true);
        const instanceName = getDefaultExtractedName(undefined, this);
        return {
            kind: exports.StructureKind.Interface,
            name,
            properties: [
                ...properties.map(getExtractedInterfacePropertyStructure),
                ...accessors.map(getExtractedInterfaceAccessorStructure),
            ],
            methods: methods.map(getExtractedInterfaceMethodStructure),
            constructSignatures: constructors.map(c => ({
                kind: exports.StructureKind.ConstructSignature,
                docs: c.getJsDocs().map(d => d.getStructure()),
                parameters: c.getParameters().map(p => ({
                    ...getExtractedInterfaceParameterStructure(p),
                    scope: undefined,
                    isReadonly: false,
                })),
                returnType: instanceName,
            })),
        };
    }
}
function getExtractedClassDetails(classDec, isStatic) {
    const constructors = classDec.getConstructors().map(c => c.getOverloads().length > 0 ? c.getOverloads() : [c]).flat();
    const properties = classDec.getProperties().filter(p => p.isStatic() === isStatic && p.getScope() === exports.Scope.Public);
    const methods = classDec.getMethods()
        .filter(p => p.isStatic() === isStatic && p.getScope() === exports.Scope.Public)
        .map(m => m.getOverloads().length > 0 ? m.getOverloads() : [m]).flat();
    return { constructors, properties, methods, accessors: getAccessors() };
    function getAccessors() {
        const result = new common.KeyValueCache();
        for (const accessor of [...classDec.getGetAccessors(), ...classDec.getSetAccessors()]) {
            if (accessor.isStatic() === isStatic && accessor.getScope() === exports.Scope.Public)
                result.getOrCreate(accessor.getName(), () => []).push(accessor);
        }
        return result.getValuesAsArray();
    }
}
function getDefaultExtractedName(name, classDec) {
    name = common.StringUtils.isNullOrWhitespace(name) ? undefined : name;
    return name || classDec.getName() || classDec.getSourceFile().getBaseNameWithoutExtension().replace(/[^a-zA-Z0-9_$]/g, "");
}
function getExtractedInterfacePropertyStructure(prop) {
    return {
        kind: exports.StructureKind.PropertySignature,
        docs: prop.getJsDocs().map(d => d.getStructure()),
        name: prop.getName(),
        type: prop.getType().getText(prop),
        hasQuestionToken: prop.hasQuestionToken(),
        isReadonly: prop.isReadonly(),
    };
}
function getExtractedInterfaceAccessorStructure(getAndSet) {
    return {
        kind: exports.StructureKind.PropertySignature,
        docs: getAndSet[0].getJsDocs().map(d => d.getStructure()),
        name: getAndSet[0].getName(),
        type: getAndSet[0].getType().getText(getAndSet[0]),
        hasQuestionToken: false,
        isReadonly: getAndSet.every(Node.isGetAccessorDeclaration),
    };
}
function getExtractedInterfaceMethodStructure(method) {
    return {
        kind: exports.StructureKind.MethodSignature,
        docs: method.getJsDocs().map(d => d.getStructure()),
        name: method.getName(),
        hasQuestionToken: method.hasQuestionToken(),
        returnType: method.getReturnType().getText(method),
        parameters: method.getParameters().map(getExtractedInterfaceParameterStructure),
        typeParameters: method.getTypeParameters().map(p => p.getStructure()),
    };
}
function getExtractedInterfaceParameterStructure(param) {
    return {
        ...param.getStructure(),
        decorators: [],
    };
}

const ClassExpressionBase = ClassLikeDeclarationBase(PrimaryExpression);
class ClassExpression extends ClassExpressionBase {
}

const createBase$j = (ctor) => ChildOrderableNode(TextInsertableNode(StatementedNode(JSDocableNode(BodiedNode(ctor)))));
const ClassStaticBlockDeclarationBase = createBase$j(ClassElement);
class ClassStaticBlockDeclaration extends ClassStaticBlockDeclarationBase {
    getName() {
        return "static";
    }
    isStatic() {
        return true;
    }
    set(structure) {
        callBaseSet(ClassStaticBlockDeclarationBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(ClassStaticBlockDeclarationBase.prototype, this, {
            kind: exports.StructureKind.ClassStaticBlock,
        });
    }
}

class CommentClassElement extends ClassElement {
}

const createBase$i = (ctor) => ReferenceFindableNode(ChildOrderableNode(TextInsertableNode(OverloadableNode(ScopedNode(FunctionLikeDeclaration(BodyableNode(ctor)))))));
const ConstructorDeclarationBase = createBase$i(ClassElement);
const createOverloadBase = (ctor) => TypeParameteredNode(JSDocableNode(ChildOrderableNode(TextInsertableNode(ScopedNode(ModifierableNode(SignaturedDeclaration(ctor)))))));
const ConstructorDeclarationOverloadBase = createOverloadBase(ClassElement);
class ConstructorDeclaration extends ConstructorDeclarationBase {
    set(structure) {
        callBaseSet(ConstructorDeclarationBase.prototype, this, structure);
        if (structure.overloads != null) {
            this.getOverloads().forEach(o => o.remove());
            this.addOverloads(structure.overloads);
        }
        return this;
    }
    addOverload(structure) {
        return this.addOverloads([structure])[0];
    }
    addOverloads(structures) {
        return this.insertOverloads(this.getOverloads().length, structures);
    }
    insertOverload(index, structure) {
        return this.insertOverloads(index, [structure])[0];
    }
    insertOverloads(index, structures) {
        const printer = this._context.structurePrinterFactory.forConstructorDeclaration({
            isAmbient: isNodeAmbientOrInAmbientContext(this),
        });
        return insertOverloads({
            node: this,
            index,
            structures,
            printStructure: (writer, structure) => {
                printer.printOverload(writer, structure);
            },
            getThisStructure: fromConstructorDeclarationOverload,
            expectedSyntaxKind: common.SyntaxKind.Constructor,
        });
    }
    getStructure() {
        const hasImplementation = this.getImplementation() != null;
        const isOverload = this.isOverload();
        const basePrototype = isOverload && hasImplementation ? ConstructorDeclarationOverloadBase.prototype : ConstructorDeclarationBase.prototype;
        return callBaseGetStructure(basePrototype, this, getStructure(this));
        function getStructure(thisNode) {
            if (hasImplementation && isOverload)
                return getSpecificOverloadStructure();
            return getSpecificStructure();
            function getSpecificOverloadStructure() {
                return { kind: exports.StructureKind.ConstructorOverload };
            }
            function getSpecificStructure() {
                if (!hasImplementation)
                    return { kind: exports.StructureKind.Constructor };
                else {
                    return {
                        kind: exports.StructureKind.Constructor,
                        overloads: thisNode.getOverloads().map(o => o.getStructure()),
                    };
                }
            }
        }
    }
}

const createBase$h = (ctor) => ChildOrderableNode(TextInsertableNode(DecoratableNode(AbstractableNode(ScopedNode(StaticableNode(FunctionLikeDeclaration(BodyableNode(PropertyNamedNode(ctor)))))))));
const GetAccessorDeclarationBase = createBase$h(ClassElement);
class GetAccessorDeclaration extends GetAccessorDeclarationBase {
    set(structure) {
        callBaseSet(GetAccessorDeclarationBase.prototype, this, structure);
        return this;
    }
    getSetAccessor() {
        const thisName = this.getName();
        const isStatic = this.isStatic();
        return this.getParentOrThrow().forEachChild(sibling => {
            if (Node.isSetAccessorDeclaration(sibling) && sibling.getName() === thisName && sibling.isStatic() === isStatic)
                return sibling;
            return undefined;
        });
    }
    getSetAccessorOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getSetAccessor(), message ?? (() => `Expected to find a corresponding set accessor for ${this.getName()}.`), this);
    }
    getStructure() {
        return callBaseGetStructure(GetAccessorDeclarationBase.prototype, this, {
            kind: exports.StructureKind.GetAccessor,
        });
    }
}

const createBase$g = (ctor) => ChildOrderableNode(OverrideableNode(AmbientableNode(DecoratableNode(AbstractableNode(ScopedNode(StaticableNode(JSDocableNode(ReadonlyableNode(ExclamationTokenableNode(QuestionTokenableNode(InitializerExpressionableNode(TypedNode(PropertyNamedNode(ModifierableNode(ctor)))))))))))))));
const PropertyDeclarationBase = createBase$g(ClassElement);
class PropertyDeclaration extends PropertyDeclarationBase {
    hasAccessorKeyword() {
        return this.hasModifier(common.SyntaxKind.AccessorKeyword);
    }
    setHasAccessorKeyword(value) {
        return this.toggleModifier("accessor", value);
    }
    set(structure) {
        callBaseSet(PropertyDeclarationBase.prototype, this, structure);
        if (structure.hasAccessorKeyword != null)
            this.setHasAccessorKeyword(structure.hasAccessorKeyword);
        return this;
    }
    remove() {
        const parent = this.getParentOrThrow();
        switch (parent.getKind()) {
            case common.SyntaxKind.ClassDeclaration:
                super.remove();
                break;
            default:
                throw new common.errors.NotImplementedError(`Not implemented parent syntax kind: ${parent.getKindName()}`);
        }
    }
    getStructure() {
        return callBaseGetStructure(PropertyDeclarationBase.prototype, this, {
            kind: exports.StructureKind.Property,
            hasAccessorKeyword: this.hasAccessorKeyword(),
        });
    }
}

const createBase$f = (ctor) => ChildOrderableNode(TextInsertableNode(DecoratableNode(AbstractableNode(ScopedNode(StaticableNode(FunctionLikeDeclaration(BodyableNode(PropertyNamedNode(ctor)))))))));
const SetAccessorDeclarationBase = createBase$f(ClassElement);
class SetAccessorDeclaration extends SetAccessorDeclarationBase {
    set(structure) {
        callBaseSet(SetAccessorDeclarationBase.prototype, this, structure);
        return this;
    }
    getGetAccessor() {
        const thisName = this.getName();
        const isStatic = this.isStatic();
        return this.getParentOrThrow().forEachChild(sibling => {
            if (Node.isGetAccessorDeclaration(sibling) && sibling.getName() === thisName && sibling.isStatic() === isStatic)
                return sibling;
            return undefined;
        });
    }
    getGetAccessorOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getGetAccessor(), message ?? (() => `Expected to find a corresponding get accessor for ${this.getName()}.`), this);
    }
    getStructure() {
        return callBaseGetStructure(SetAccessorDeclarationBase.prototype, this, {
            kind: exports.StructureKind.SetAccessor,
        });
    }
}

const DecoratorBase = LeftHandSideExpressionedNode(Node);
class Decorator extends DecoratorBase {
    getName() {
        return this.getNameNode().getText();
    }
    getNameNode() {
        const callExpression = this.getCallExpression();
        if (callExpression)
            return getIdentifierFromName(callExpression.getExpression());
        else
            return getIdentifierFromName(this._getInnerExpression());
        function getIdentifierFromName(expression) {
            const identifier = getNameFromExpression(expression);
            if (!Node.isIdentifier(identifier)) {
                throw new common.errors.NotImplementedError(`Expected the decorator expression '${identifier.getText()}' to be an identifier. `
                    + `Please deal directly with 'getExpression()' on the decorator to handle more complex scenarios.`);
            }
            return identifier;
        }
        function getNameFromExpression(expression) {
            if (Node.isPropertyAccessExpression(expression))
                return expression.getNameNode();
            return expression;
        }
    }
    getFullName() {
        const sourceFile = this.getSourceFile();
        if (this.isDecoratorFactory())
            return this.getCallExpression().getExpression().getText();
        return this.compilerNode.expression.getText(sourceFile.compilerNode);
    }
    isDecoratorFactory() {
        return Node.isCallExpression(this._getInnerExpression());
    }
    setIsDecoratorFactory(isDecoratorFactory) {
        if (this.isDecoratorFactory() === isDecoratorFactory)
            return this;
        if (isDecoratorFactory) {
            const expression = this._getInnerExpression();
            const expressionText = expression.getText();
            insertIntoParentTextRange({
                parent: this,
                insertPos: expression.getStart(),
                newText: `${expressionText}()`,
                replacing: {
                    textLength: expressionText.length,
                },
                customMappings: newParent => {
                    return [{ currentNode: expression, newNode: newParent.expression.expression }];
                },
            });
        }
        else {
            const callExpression = this.getCallExpressionOrThrow();
            const expression = callExpression.getExpression();
            const expressionText = expression.getText();
            insertIntoParentTextRange({
                parent: this,
                insertPos: callExpression.getStart(),
                newText: `${expressionText}`,
                replacing: {
                    textLength: callExpression.getWidth(),
                },
                customMappings: newParent => {
                    return [{ currentNode: expression, newNode: newParent.expression }];
                },
            });
        }
        return this;
    }
    getCallExpressionOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getCallExpression(), message ?? "Expected to find a call expression.", this);
    }
    getCallExpression() {
        const expression = this._getInnerExpression();
        return Node.isCallExpression(expression) ? expression : undefined;
    }
    getArguments() {
        return this.getCallExpression()?.getArguments() ?? [];
    }
    getTypeArguments() {
        return this.getCallExpression()?.getTypeArguments() ?? [];
    }
    addTypeArgument(argumentText) {
        return this.getCallExpressionOrThrow().addTypeArgument(argumentText);
    }
    addTypeArguments(argumentTexts) {
        return this.getCallExpressionOrThrow().addTypeArguments(argumentTexts);
    }
    insertTypeArgument(index, argumentText) {
        return this.getCallExpressionOrThrow().insertTypeArgument(index, argumentText);
    }
    insertTypeArguments(index, argumentTexts) {
        return this.getCallExpressionOrThrow().insertTypeArguments(index, argumentTexts);
    }
    removeTypeArgument(typeArgOrIndex) {
        const callExpression = this.getCallExpression();
        if (callExpression == null)
            throw new common.errors.InvalidOperationError("Cannot remove a type argument from a decorator that has no type arguments.");
        callExpression.removeTypeArgument(typeArgOrIndex);
        return this;
    }
    addArgument(argumentText) {
        return this.addArguments([argumentText])[0];
    }
    addArguments(argumentTexts) {
        return this.insertArguments(this.getArguments().length, argumentTexts);
    }
    insertArgument(index, argumentText) {
        return this.insertArguments(index, [argumentText])[0];
    }
    insertArguments(index, argumentTexts) {
        this.setIsDecoratorFactory(true);
        return this.getCallExpressionOrThrow().insertArguments(index, argumentTexts);
    }
    removeArgument(argOrIndex) {
        const callExpression = this.getCallExpression();
        if (callExpression == null)
            throw new common.errors.InvalidOperationError("Cannot remove an argument from a decorator that has no arguments.");
        callExpression.removeArgument(argOrIndex);
        return this;
    }
    remove() {
        const thisStartLinePos = this.getStartLinePos();
        const previousDecorator = this.getPreviousSiblingIfKind(common.SyntaxKind.Decorator);
        if (previousDecorator != null && previousDecorator.getStartLinePos() === thisStartLinePos) {
            removeChildren({
                children: [this],
                removePrecedingSpaces: true,
            });
        }
        else {
            removeChildrenWithFormattingFromCollapsibleSyntaxList({
                children: [this],
                getSiblingFormatting: (parent, sibling) => sibling.getStartLinePos() === thisStartLinePos ? FormattingKind.Space : FormattingKind.Newline,
            });
        }
    }
    _getInnerExpression() {
        let expr = this.getExpression();
        while (Node.isParenthesizedExpression(expr))
            expr = expr.getExpression();
        return expr;
    }
    set(structure) {
        callBaseSet(DecoratorBase.prototype, this, structure);
        if (structure.name != null)
            this.getNameNode().replaceWithText(structure.name);
        if (structure.arguments != null) {
            this.setIsDecoratorFactory(true);
            this.getArguments().map(a => this.removeArgument(a));
            this.addArguments(structure.arguments);
        }
        if (structure.typeArguments != null && structure.typeArguments.length > 0) {
            this.setIsDecoratorFactory(true);
            this.getTypeArguments().map(a => this.removeTypeArgument(a));
            this.addTypeArguments(structure.typeArguments);
        }
        return this;
    }
    getStructure() {
        const isDecoratorFactory = this.isDecoratorFactory();
        return callBaseGetStructure(DecoratorBase.prototype, this, {
            kind: exports.StructureKind.Decorator,
            name: this.getName(),
            arguments: isDecoratorFactory ? this.getArguments().map(arg => arg.getText()) : undefined,
            typeArguments: isDecoratorFactory ? this.getTypeArguments().map(arg => arg.getText()) : undefined,
        });
    }
}

function JSDocPropertyLikeTag(Base) {
    return class extends Base {
        getTypeExpression() {
            return this._getNodeFromCompilerNodeIfExists(this.compilerNode.typeExpression);
        }
        getTypeExpressionOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getTypeExpression(), message ?? `Expected to find a JS doc type expression.`, this);
        }
        getName() {
            return this.getNameNode().getText();
        }
        getNameNode() {
            return this._getNodeFromCompilerNode(this.compilerNode.name);
        }
        isBracketed() {
            return this.compilerNode.isBracketed;
        }
    };
}

function JSDocTypeExpressionableTag(Base) {
    return class extends Base {
        getTypeExpression() {
            const result = this._getNodeFromCompilerNodeIfExists(this.compilerNode.typeExpression);
            if (result != null && result.getWidth() === 0)
                return undefined;
            return result;
        }
        getTypeExpressionOrThrow(message) {
            return common.errors.throwIfNullOrUndefined(this.getTypeExpression(), message ?? `Expected to find the JS doc tag's type expression.`, this);
        }
    };
}

function JSDocTypeParameteredTag(Base) {
    return class extends Base {
        getTypeParameters() {
            return this.compilerNode.typeParameters
                .map(p => this._getNodeFromCompilerNode(p))
                .filter(p => p.getWidth() > 0);
        }
    };
}

function getTextWithoutStars(inputText) {
    const innerTextWithStars = inputText.replace(/^\/\*\*[^\S\n]*\n?/, "").replace(/(\r?\n)?[^\S\n]*\*\/$/, "");
    return innerTextWithStars.split(/\n/).map(line => {
        const starPos = getStarPosIfFirstNonWhitespaceChar(line);
        if (starPos === -1)
            return line;
        const substringStart = line[starPos + 1] === " " ? starPos + 2 : starPos + 1;
        return line.substring(substringStart);
    }).join("\n");
    function getStarPosIfFirstNonWhitespaceChar(text) {
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if (charCode === CharCodes.ASTERISK)
                return i;
            else if (!common.StringUtils.isWhitespaceCharCode(charCode))
                break;
        }
        return -1;
    }
}

const JSDocBase = Node;
class JSDoc extends JSDocBase {
    isMultiLine() {
        return this.getText().includes("\n");
    }
    getTags() {
        return this.compilerNode.tags?.map(t => this._getNodeFromCompilerNode(t)) ?? [];
    }
    getInnerText() {
        return getTextWithoutStars(this.getText());
    }
    getComment() {
        if (this.compilerNode.comment == null)
            return undefined;
        else if (typeof this.compilerNode.comment === "string")
            return this.compilerNode.comment;
        else
            return this.compilerNode.comment.map(n => this._getNodeFromCompilerNodeIfExists(n));
    }
    getCommentText() {
        if (typeof this.compilerNode.comment === "string")
            return this.compilerNode.comment;
        else
            return common.ts.getTextOfJSDocComment(this.compilerNode.comment);
    }
    getDescription() {
        const sourceFileText = this.getSourceFile().getFullText();
        const endSearchStart = this.getTags()[0]?.getStart() ?? this.getEnd() - 2;
        const start = getStart(this);
        return getTextWithoutStars(sourceFileText.substring(start, Math.max(start, getEndPos())));
        function getStart(jsDoc) {
            const startOrSpacePos = jsDoc.getStart() + 3;
            if (sourceFileText.charCodeAt(startOrSpacePos) === CharCodes.SPACE)
                return startOrSpacePos + 1;
            return startOrSpacePos;
        }
        function getEndPos() {
            const endOrNewLinePos = getPreviousMatchingPos(sourceFileText, endSearchStart, charCode => charCode === CharCodes.NEWLINE || !common.StringUtils.isWhitespaceCharCode(charCode) && charCode !== CharCodes.ASTERISK);
            return getPreviousMatchingPos(sourceFileText, endOrNewLinePos, charCode => charCode !== CharCodes.NEWLINE && charCode !== CharCodes.CARRIAGE_RETURN);
        }
    }
    setDescription(textOrWriterFunction) {
        const tags = this.getTags();
        const startEditPos = this.getStart() + 3;
        const endEditPos = tags.length > 0
            ? getPreviousMatchingPos(this._sourceFile.getFullText(), tags[0].getStart(), c => c === CharCodes.ASTERISK) - 1
            : this.getEnd() - 2;
        replaceTextPossiblyCreatingChildNodes({
            parent: this,
            newText: getNewText.call(this),
            replacePos: startEditPos,
            replacingLength: endEditPos - startEditPos,
        });
        return this;
        function getNewText() {
            const indentationText = this.getIndentationText();
            const newLineKind = this._context.manipulationSettings.getNewLineKindAsString();
            const rawLines = getTextFromStringOrWriter(this._getWriter(), textOrWriterFunction).split(/\r?\n/);
            const startsWithNewLine = rawLines[0].length === 0;
            const isSingleLine = rawLines.length === 1 && (this.compilerNode.tags?.length ?? 0) === 0;
            const linesText = isSingleLine ? rawLines[0] : rawLines.map(l => l.length === 0 ? `${indentationText} *` : `${indentationText} * ${l}`)
                .slice(startsWithNewLine ? 1 : 0)
                .join(newLineKind);
            return isSingleLine ? " " + linesText + " " : newLineKind + linesText + newLineKind + indentationText + " ";
        }
    }
    addTag(structure) {
        return this.addTags([structure])[0];
    }
    addTags(structures) {
        return this.insertTags(this.compilerNode.tags?.length ?? 0, structures);
    }
    insertTag(index, structure) {
        return this.insertTags(index, [structure])[0];
    }
    insertTags(index, structures) {
        if (common.ArrayUtils.isNullOrEmpty(structures))
            return [];
        const writer = this._getWriterWithQueuedIndentation();
        const tags = this.getTags();
        index = verifyAndGetIndex(index, tags.length);
        if (tags.length === 0 && !this.isMultiLine()) {
            const structurePrinter = this._context.structurePrinterFactory.forJSDoc();
            this.replaceWithText(writer => {
                structurePrinter.printText(writer, {
                    description: this.getDescription(),
                    tags: structures,
                });
            });
        }
        else {
            const structurePrinter = this._context.structurePrinterFactory.forJSDocTag({ printStarsOnNewLine: true });
            writer.newLine().write(" * ");
            structurePrinter.printTexts(writer, structures);
            writer.newLine().write(" *");
            writer.conditionalWrite(index < tags.length, " ");
            const replaceStart = getReplaceStart.call(this);
            const replaceEnd = getReplaceEnd.call(this);
            insertIntoParentTextRange({
                parent: this,
                insertPos: replaceStart,
                replacing: { textLength: replaceEnd - replaceStart },
                newText: writer.toString(),
            });
        }
        return getNodesToReturn(tags, this.getTags(), index, false);
        function getReplaceStart() {
            const searchStart = index < tags.length ? tags[index].getStart() : this.getEnd() - 2;
            const maxMin = this.getStart() + 3;
            return Math.max(maxMin, getPreviousMatchingPos(this.getSourceFile().getFullText(), searchStart, charCode => !common.StringUtils.isWhitespaceCharCode(charCode) && charCode !== CharCodes.ASTERISK));
        }
        function getReplaceEnd() {
            if (index < tags.length)
                return tags[index].getStart();
            return this.getEnd() - 1;
        }
    }
    remove() {
        removeChildren({
            children: [this],
            removeFollowingSpaces: true,
            removeFollowingNewLines: true,
        });
    }
    set(structure) {
        callBaseSet(JSDocBase.prototype, this, structure);
        if (structure.tags != null) {
            return this.replaceWithText(writer => {
                this._context.structurePrinterFactory.forJSDoc().printText(writer, {
                    description: structure.description ?? this.getDescription(),
                    tags: structure.tags,
                });
            });
        }
        else if (structure.description != null) {
            this.setDescription(structure.description);
        }
        return this;
    }
    getStructure() {
        return callBaseGetStructure(JSDocBase.prototype, this, {
            kind: exports.StructureKind.JSDoc,
            description: this.getDescription(),
            tags: this.getTags().map(t => t.getStructure()),
        });
    }
}

class TypeNode extends Node {
}
const NodeWithTypeArgumentsBase = TypeArgumentedNode(TypeNode);
class NodeWithTypeArguments extends NodeWithTypeArgumentsBase {
}

class ArrayTypeNode extends TypeNode {
    getElementTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.elementType);
    }
}

class ConditionalTypeNode extends TypeNode {
    getCheckType() {
        return this._getNodeFromCompilerNode(this.compilerNode.checkType);
    }
    getExtendsType() {
        return this._getNodeFromCompilerNode(this.compilerNode.extendsType);
    }
    getTrueType() {
        return this._getNodeFromCompilerNode(this.compilerNode.trueType);
    }
    getFalseType() {
        return this._getNodeFromCompilerNode(this.compilerNode.falseType);
    }
}

const FunctionOrConstructorTypeNodeBaseBase = SignaturedDeclaration(TypeNode);
class FunctionOrConstructorTypeNodeBase extends FunctionOrConstructorTypeNodeBaseBase {
}

const ConstructorTypeNodeBase = AbstractableNode(ModifierableNode(FunctionOrConstructorTypeNodeBase));
class ConstructorTypeNode extends ConstructorTypeNodeBase {
}

const ExpressionWithTypeArgumentsBase = LeftHandSideExpressionedNode(NodeWithTypeArguments);
class ExpressionWithTypeArguments extends ExpressionWithTypeArgumentsBase {
}

const FunctionTypeNodeBase = TypeParameteredNode(FunctionOrConstructorTypeNodeBase);
class FunctionTypeNode extends FunctionTypeNodeBase {
}

class ImportTypeNode extends NodeWithTypeArguments {
    setArgument(text) {
        const arg = this.getArgument();
        if (Node.isLiteralTypeNode(arg)) {
            const literal = arg.getLiteral();
            if (Node.isStringLiteral(literal)) {
                literal.setLiteralValue(text);
                return this;
            }
        }
        arg.replaceWithText(writer => writer.quote(text), this._getWriterWithQueuedChildIndentation());
        return this;
    }
    getArgument() {
        return this._getNodeFromCompilerNode(this.compilerNode.argument);
    }
    setQualifier(text) {
        const qualifier = this.getQualifier();
        if (qualifier != null)
            qualifier.replaceWithText(text, this._getWriterWithQueuedChildIndentation());
        else {
            const paren = this.getFirstChildByKindOrThrow(common.SyntaxKind.CloseParenToken);
            insertIntoParentTextRange({
                insertPos: paren.getEnd(),
                parent: this,
                newText: this._getWriterWithQueuedIndentation().write(".").write(text).toString(),
            });
        }
        return this;
    }
    getQualifierOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getQualifier(), message ?? (() => `Expected to find a qualifier for the import type: ${this.getText()}`), this);
    }
    getQualifier() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.qualifier);
    }
    getAttributes() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.attributes);
    }
    getAttributesOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this._getNodeFromCompilerNodeIfExists(this.compilerNode.attributes), message ?? "Could not find import type assertion container.", this);
    }
}

class IndexedAccessTypeNode extends TypeNode {
    getObjectTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.objectType);
    }
    getIndexTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.indexType);
    }
}

class InferTypeNode extends TypeNode {
    getTypeParameter() {
        return this._getNodeFromCompilerNode(this.compilerNode.typeParameter);
    }
}

class IntersectionTypeNode extends TypeNode {
    getTypeNodes() {
        return this.compilerNode.types.map(t => this._getNodeFromCompilerNode(t));
    }
}

class LiteralTypeNode extends TypeNode {
    getLiteral() {
        const tsLiteral = this.compilerNode.literal;
        return this._getNodeFromCompilerNode(tsLiteral);
    }
}

class MappedTypeNode extends TypeNode {
    getNameTypeNode() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.nameType);
    }
    getNameTypeNodeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getNameTypeNode(), message ?? "Type did not exist.", this);
    }
    getReadonlyToken() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.readonlyToken);
    }
    getReadonlyTokenOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getReadonlyToken(), message ?? "Readonly token did not exist.", this);
    }
    getQuestionToken() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.questionToken);
    }
    getQuestionTokenOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getQuestionToken(), message ?? "Question token did not exist.", this);
    }
    getTypeParameter() {
        return this._getNodeFromCompilerNode(this.compilerNode.typeParameter);
    }
    getTypeNode() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.type);
    }
    getTypeNodeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getTypeNode(), message ?? "Type did not exist, but was expected to exist.", this);
    }
}

const createBase$e = (ctor) => TypedNode(QuestionTokenableNode(DotDotDotTokenableNode(JSDocableNode(NamedNode(ctor)))));
const NamedTupleMemberBase = createBase$e(TypeNode);
class NamedTupleMember extends NamedTupleMemberBase {
    getTypeNode() {
        return super.getTypeNode();
    }
    removeType() {
        throw new common.errors.InvalidOperationError("Cannot remove the type of a named tuple member.");
    }
}

class OptionalTypeNode extends TypeNode {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
}

class ParenthesizedTypeNode extends TypeNode {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
    setType(textOrWriterFunction) {
        this.getTypeNode().replaceWithText(textOrWriterFunction);
        return this;
    }
}

class RestTypeNode extends TypeNode {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
}

class TemplateLiteralTypeNode extends TypeNode {
    getHead() {
        return this._getNodeFromCompilerNode(this.compilerNode.head);
    }
    getTemplateSpans() {
        return this.compilerNode.templateSpans.map(s => this._getNodeFromCompilerNode(s));
    }
    setLiteralValue(value) {
        const childIndex = this.getChildIndex();
        const parent = this.getParentSyntaxList() ?? this.getParentOrThrow();
        replaceNodeText({
            sourceFile: this._sourceFile,
            start: this.getStart() + 1,
            replacingLength: this.getWidth() - 2,
            newText: value,
        });
        return parent.getChildAtIndex(childIndex);
    }
}

class ThisTypeNode extends TypeNode {
}

class TupleTypeNode extends TypeNode {
    getElements() {
        return this.compilerNode.elements.map(t => this._getNodeFromCompilerNode(t));
    }
}

const createBase$d = (ctor) => TypeParameteredNode(TypedNode(JSDocableNode(AmbientableNode(ExportableNode(ModifierableNode(NamedNode(ctor)))))));
const TypeAliasDeclarationBase = createBase$d(Statement);
class TypeAliasDeclaration extends TypeAliasDeclarationBase {
    set(structure) {
        callBaseSet(TypeAliasDeclarationBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(TypeAliasDeclarationBase.prototype, this, {
            kind: exports.StructureKind.TypeAlias,
            type: this.getTypeNodeOrThrow().getText(),
        });
    }
}

const TypeLiteralNodeBase = TypeElementMemberedNode(TypeNode);
class TypeLiteralNode extends TypeLiteralNodeBase {
}

class TypeOperatorTypeNode extends TypeNode {
    getOperator() {
        return this.compilerNode.operator;
    }
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
}

exports.TypeParameterVariance = void 0;
(function (TypeParameterVariance) {
    TypeParameterVariance[TypeParameterVariance["None"] = 0] = "None";
    TypeParameterVariance[TypeParameterVariance["In"] = 1] = "In";
    TypeParameterVariance[TypeParameterVariance["Out"] = 2] = "Out";
    TypeParameterVariance[TypeParameterVariance["InOut"] = 3] = "InOut";
})(exports.TypeParameterVariance || (exports.TypeParameterVariance = {}));
const createBase$c = (ctor) => ModifierableNode(NamedNode(ctor));
const TypeParameterDeclarationBase = createBase$c(Node);
class TypeParameterDeclaration extends TypeParameterDeclarationBase {
    isConst() {
        return this.hasModifier(common.SyntaxKind.ConstKeyword);
    }
    setIsConst(value) {
        return this.toggleModifier("const", value);
    }
    getConstraint() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.constraint);
    }
    getConstraintOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getConstraint(), message ?? "Expected to find the type parameter's constraint.", this);
    }
    setConstraint(text) {
        text = this.getParentOrThrow()._getTextWithQueuedChildIndentation(text);
        if (common.StringUtils.isNullOrWhitespace(text)) {
            this.removeConstraint();
            return this;
        }
        const constraint = this.getConstraint();
        if (constraint != null) {
            constraint.replaceWithText(text);
            return this;
        }
        const nameNode = this.getNameNode();
        insertIntoParentTextRange({
            parent: this,
            insertPos: nameNode.getEnd(),
            newText: ` extends ${text}`,
        });
        return this;
    }
    removeConstraint() {
        removeConstraintOrDefault(this.getConstraint(), common.SyntaxKind.ExtendsKeyword);
        return this;
    }
    getDefault() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.default);
    }
    getDefaultOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getDefault(), message ?? "Expected to find the type parameter's default.", this);
    }
    setDefault(text) {
        text = this.getParentOrThrow()._getTextWithQueuedChildIndentation(text);
        if (common.StringUtils.isNullOrWhitespace(text)) {
            this.removeDefault();
            return this;
        }
        const defaultNode = this.getDefault();
        if (defaultNode != null) {
            defaultNode.replaceWithText(text);
            return this;
        }
        const insertAfterNode = this.getConstraint() || this.getNameNode();
        insertIntoParentTextRange({
            parent: this,
            insertPos: insertAfterNode.getEnd(),
            newText: ` = ${text}`,
        });
        return this;
    }
    removeDefault() {
        removeConstraintOrDefault(this.getDefault(), common.SyntaxKind.EqualsToken);
        return this;
    }
    setVariance(variance) {
        this.toggleModifier("in", (variance & exports.TypeParameterVariance.In) !== 0);
        this.toggleModifier("out", (variance & exports.TypeParameterVariance.Out) !== 0);
        return this;
    }
    getVariance() {
        let variance = exports.TypeParameterVariance.None;
        if (this.hasModifier(common.SyntaxKind.InKeyword))
            variance |= exports.TypeParameterVariance.In;
        if (this.hasModifier(common.SyntaxKind.OutKeyword))
            variance |= exports.TypeParameterVariance.Out;
        return variance;
    }
    remove() {
        const parentSyntaxList = this.getParentSyntaxListOrThrow();
        const typeParameters = parentSyntaxList.getChildrenOfKind(common.SyntaxKind.TypeParameter);
        if (typeParameters.length === 1)
            removeAllTypeParameters();
        else
            removeCommaSeparatedChild(this);
        function removeAllTypeParameters() {
            const children = [
                parentSyntaxList.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.LessThanToken),
                parentSyntaxList,
                parentSyntaxList.getNextSiblingIfKindOrThrow(common.SyntaxKind.GreaterThanToken),
            ];
            removeChildren({ children });
        }
    }
    set(structure) {
        callBaseSet(TypeParameterDeclarationBase.prototype, this, structure);
        if (structure.isConst != null)
            this.setIsConst(structure.isConst);
        if (structure.constraint != null)
            this.setConstraint(structure.constraint);
        else if (structure.hasOwnProperty(common.nameof(structure, "constraint")))
            this.removeConstraint();
        if (structure.default != null)
            this.setDefault(structure.default);
        else if (structure.hasOwnProperty(common.nameof(structure, "default")))
            this.removeDefault();
        if (structure.variance != null)
            this.setVariance(structure.variance);
        return this;
    }
    getStructure() {
        const constraintNode = this.getConstraint();
        const defaultNode = this.getDefault();
        return callBaseGetStructure(TypeParameterDeclarationBase.prototype, this, {
            kind: exports.StructureKind.TypeParameter,
            isConst: this.isConst(),
            constraint: constraintNode != null ? constraintNode.getText({ trimLeadingIndentation: true }) : undefined,
            default: defaultNode ? defaultNode.getText({ trimLeadingIndentation: true }) : undefined,
            variance: this.getVariance(),
        });
    }
}
function removeConstraintOrDefault(nodeToRemove, siblingKind) {
    if (nodeToRemove == null)
        return;
    removeChildren({
        children: [nodeToRemove.getPreviousSiblingIfKindOrThrow(siblingKind), nodeToRemove],
        removePrecedingSpaces: true,
    });
}

class TypePredicateNode extends TypeNode {
    getParameterNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.parameterName);
    }
    hasAssertsModifier() {
        return this.compilerNode.assertsModifier != null;
    }
    getAssertsModifier() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.assertsModifier);
    }
    getAssertsModifierOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getAssertsModifier(), message ?? "Expected to find an asserts modifier.", this);
    }
    getTypeNode() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.type);
    }
    getTypeNodeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getTypeNode(), message ?? "Expected to find a type node.", this);
    }
}

class TypeQueryNode extends NodeWithTypeArguments {
    getExprName() {
        return this._getNodeFromCompilerNode(this.compilerNode.exprName);
    }
}

class TypeReferenceNode extends NodeWithTypeArguments {
    getTypeName() {
        return this._getNodeFromCompilerNode(this.compilerNode.typeName);
    }
}

class UnionTypeNode extends TypeNode {
    getTypeNodes() {
        return this.compilerNode.types.map(t => this._getNodeFromCompilerNode(t));
    }
}

class JSDocType extends TypeNode {
}

class JSDocAllType extends JSDocType {
}

const JSDocTagBase = Node;
class JSDocTag extends JSDocTagBase {
    getTagName() {
        return this.getTagNameNode().getText();
    }
    getTagNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.tagName);
    }
    setTagName(tagName) {
        return this.set({ tagName });
    }
    getComment() {
        if (this.compilerNode.comment == null)
            return undefined;
        else if (typeof this.compilerNode.comment === "string")
            return this.compilerNode.comment;
        else
            return this.compilerNode.comment.map(n => this._getNodeFromCompilerNodeIfExists(n));
    }
    getCommentText() {
        if (typeof this.compilerNode.comment === "string")
            return this.compilerNode.comment;
        else
            return common.ts.getTextOfJSDocComment(this.compilerNode.comment);
    }
    remove() {
        const jsDocBodyStart = this.getParentOrThrow().getStart() + 3;
        const nextJsDocTag = getNextJsDocTag(this);
        const isLastJsDoc = nextJsDocTag == null;
        const removalStart = getRemovalStart.call(this);
        removeChildren({
            children: [this],
            customRemovalPos: removalStart,
            customRemovalEnd: getNextTagStartOrDocEnd(this, nextJsDocTag),
            replaceTrivia: getReplaceTrivia.call(this),
        });
        function getRemovalStart() {
            return Math.max(jsDocBodyStart, getPreviousNonWhiteSpacePos(this, this.getStart()));
        }
        function getReplaceTrivia() {
            if (removalStart === jsDocBodyStart && isLastJsDoc)
                return "";
            const newLineKind = this._context.manipulationSettings.getNewLineKindAsString();
            const indentationText = this.getParentOrThrow().getIndentationText();
            return `${newLineKind}${indentationText} ` + (isLastJsDoc ? "" : "* ");
        }
    }
    set(structure) {
        callBaseSet(JSDocTagBase.prototype, this, structure);
        if (structure.text != null || structure.tagName != null) {
            return this.replaceWithText(writer => {
                this._context.structurePrinterFactory.forJSDocTag({ printStarsOnNewLine: true }).printText(writer, {
                    tagName: structure.tagName ?? this.getTagName(),
                    text: structure.text != null ? structure.text : getText(this),
                });
            });
        }
        return this;
    }
    replaceWithText(textOrWriterFunction) {
        const newText = getTextFromStringOrWriter(this._getWriterWithQueuedIndentation(), textOrWriterFunction);
        const parent = this.getParentOrThrow();
        const childIndex = this.getChildIndex();
        const start = this.getStart();
        insertIntoParentTextRange({
            parent,
            insertPos: start,
            newText,
            replacing: {
                textLength: getTagEnd(this) - start,
            },
        });
        return parent.getChildren()[childIndex];
    }
    getStructure() {
        const text = getText(this);
        return callBaseGetStructure(JSDocTagBase.prototype, this, {
            kind: exports.StructureKind.JSDocTag,
            tagName: this.getTagName(),
            text: text.length === 0 ? undefined : text,
        });
    }
}
function getText(jsDocTag) {
    const text = jsDocTag.getSourceFile().getFullText();
    const nameEnd = jsDocTag.getTagNameNode().getEnd();
    const tagEnd = getTagEnd(jsDocTag);
    const startPos = Math.min(text.charCodeAt(nameEnd) === CharCodes.SPACE ? nameEnd + 1 : nameEnd, tagEnd);
    return getTextWithoutStars(text.substring(startPos, tagEnd));
}
function getTagEnd(jsDocTag) {
    return getPreviousNonWhiteSpacePos(jsDocTag, getNextTagStartOrDocEnd(jsDocTag));
}
function getNextTagStartOrDocEnd(jsDocTag, nextJsDocTag) {
    nextJsDocTag = nextJsDocTag ?? getNextJsDocTag(jsDocTag);
    return nextJsDocTag != null
        ? nextJsDocTag.getStart()
        : jsDocTag.getParentOrThrow().getEnd() - 2;
}
function getNextJsDocTag(jsDocTag) {
    const parent = jsDocTag.getParentIfKindOrThrow(common.SyntaxKind.JSDoc);
    const tags = parent.getTags();
    const thisIndex = tags.indexOf(jsDocTag);
    return tags[thisIndex + 1];
}
function getPreviousNonWhiteSpacePos(jsDocTag, pos) {
    const sourceFileText = jsDocTag.getSourceFile().getFullText();
    return getPreviousMatchingPos(sourceFileText, pos, charCode => charCode !== CharCodes.ASTERISK && !common.StringUtils.isWhitespaceCharCode(charCode));
}

class JSDocAugmentsTag extends JSDocTag {
}

class JSDocAuthorTag extends JSDocTag {
}

class JSDocCallbackTag extends JSDocTag {
}

class JSDocClassTag extends JSDocTag {
}

class JSDocDeprecatedTag extends JSDocTag {
}

class JSDocEnumTag extends JSDocTag {
}

const JSDocFunctionTypeBase = SignaturedDeclaration(JSDocType);
class JSDocFunctionType extends JSDocFunctionTypeBase {
}

class JSDocImplementsTag extends JSDocTag {
}

class JSDocImportTag extends JSDocTag {
}

class JSDocLink extends Node {
}

class JSDocLinkCode extends Node {
}

class JSDocLinkPlain extends Node {
}

class JSDocMemberName extends Node {
}

class JSDocNamepathType extends JSDocType {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
}

class JSDocNameReference extends Node {
    getName() {
        return this._getNodeFromCompilerNode(this.compilerNode.name);
    }
}

class JSDocNonNullableType extends JSDocType {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
    isPostfix() {
        return this.compilerNode.postfix;
    }
}

class JSDocNullableType extends JSDocType {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
    isPostfix() {
        return this.compilerNode.postfix;
    }
}

class JSDocOptionalType extends JSDocType {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
}

const JSDocOverloadTagBase = JSDocTypeExpressionableTag(JSDocTag);
class JSDocOverloadTag extends JSDocOverloadTagBase {
}

class JSDocOverrideTag extends JSDocTag {
}

const JSDocParameterTagBase = JSDocPropertyLikeTag(JSDocTag);
class JSDocParameterTag extends JSDocParameterTagBase {
}

class JSDocPrivateTag extends JSDocTag {
}

const JSDocPropertyTagBase = JSDocPropertyLikeTag(JSDocTag);
class JSDocPropertyTag extends JSDocPropertyTagBase {
}

class JSDocProtectedTag extends JSDocTag {
}

class JSDocPublicTag extends JSDocTag {
}

class JSDocReadonlyTag extends JSDocTag {
}

const JSDocReturnTagBase = JSDocTypeExpressionableTag(JSDocTag);
class JSDocReturnTag extends JSDocReturnTagBase {
}

const JSDocSatisfiesTagBase = JSDocTypeExpressionableTag(JSDocTag);
class JSDocSatisfiesTag extends JSDocSatisfiesTagBase {
}

const JSDocSeeTagBase = JSDocTypeExpressionableTag(JSDocTag);
class JSDocSeeTag extends JSDocSeeTagBase {
}

class JSDocSignature extends JSDocType {
    getTypeNode() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.type);
    }
}

class JSDocTagInfo {
    #compilerObject;
    constructor(compilerObject) {
        this.#compilerObject = compilerObject;
    }
    get compilerObject() {
        return this.#compilerObject;
    }
    getName() {
        return this.compilerObject.name;
    }
    getText() {
        return this.compilerObject.text ?? [];
    }
}

const JSDocTemplateTagBase = JSDocTypeParameteredTag(JSDocTag);
class JSDocTemplateTag extends JSDocTemplateTagBase {
    getConstraint() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.constraint);
    }
    getConstraintOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getConstraint(), message ?? "Expected to find the JS doc template tag's constraint.", this);
    }
}

class JSDocText extends Node {
}

const JSDocThisTagBase = JSDocTypeExpressionableTag(JSDocTag);
class JSDocThisTag extends JSDocThisTagBase {
}

const JSDocThrowsTagBase = JSDocTypeExpressionableTag(JSDocTag);
class JSDocThrowsTag extends JSDocThrowsTagBase {
}

class JSDocTypedefTag extends JSDocTag {
}

class JSDocTypeExpression extends TypeNode {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
}

class JSDocTypeLiteral extends JSDocType {
    isArrayType() {
        return this.compilerNode.isArrayType;
    }
    getPropertyTags() {
        return this.compilerNode.jsDocPropertyTags ? this.compilerNode.jsDocPropertyTags.map(t => this._getNodeFromCompilerNode(t)) : undefined;
    }
}

class JSDocTypeTag extends JSDocTag {
    getTypeExpression() {
        const node = this.compilerNode.typeExpression;
        if (node != null && node.pos === node.end)
            return undefined;
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.typeExpression);
    }
}

class JSDocUnknownTag extends JSDocTag {
}

class JSDocUnknownType extends JSDocType {
}

class JSDocVariadicType extends JSDocType {
    getTypeNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.type);
    }
}

class CommentEnumMember extends Node {
    remove() {
        removeChildrenWithFormatting({
            children: [this],
            getSiblingFormatting: () => FormattingKind.Newline,
        });
    }
}

const createBase$b = (ctor) => TextInsertableNode(ModuleChildableNode(JSDocableNode(AmbientableNode(ExportableNode(ModifierableNode(NamedNode(ctor)))))));
const EnumDeclarationBase = createBase$b(Statement);
class EnumDeclaration extends EnumDeclarationBase {
    set(structure) {
        callBaseSet(EnumDeclarationBase.prototype, this, structure);
        if (structure.isConst != null)
            this.setIsConstEnum(structure.isConst);
        if (structure.members != null) {
            this.getMembers().forEach(m => m.remove());
            this.addMembers(structure.members);
        }
        return this;
    }
    addMember(structure) {
        return this.addMembers([structure])[0];
    }
    addMembers(structures) {
        return this.insertMembers(this.getMembers().length, structures);
    }
    insertMember(index, structure) {
        return this.insertMembers(index, [structure])[0];
    }
    insertMembers(index, structures) {
        if (structures.length === 0)
            return [];
        const members = this.getMembersWithComments();
        index = verifyAndGetIndex(index, members.length);
        const writer = this._getWriterWithChildIndentation();
        const structurePrinter = this._context.structurePrinterFactory.forEnumMember();
        structurePrinter.printTexts(writer, structures);
        insertIntoCommaSeparatedNodes({
            parent: this.getChildSyntaxListOrThrow(),
            currentNodes: members,
            insertIndex: index,
            newText: writer.toString(),
            useNewLines: true,
            useTrailingCommas: this._context.manipulationSettings.getUseTrailingCommas(),
        });
        return getNodesToReturn(members, this.getMembersWithComments(), index, !areAllStructuresStructures());
        function areAllStructuresStructures() {
            if (!(structures instanceof Array))
                return false;
            return structures.every(s => typeof s === "object");
        }
    }
    getMember(nameOrFindFunction) {
        return getNodeByNameOrFindFunction(this.getMembers(), nameOrFindFunction);
    }
    getMemberOrThrow(nameOrFindFunction) {
        return common.errors.throwIfNullOrUndefined(this.getMember(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("enum member", nameOrFindFunction));
    }
    getMembers() {
        return this.compilerNode.members.map(m => this._getNodeFromCompilerNode(m));
    }
    getMembersWithComments() {
        const compilerNode = this.compilerNode;
        return ExtendedParser.getContainerArray(compilerNode, this.getSourceFile().compilerNode)
            .map(m => this._getNodeFromCompilerNode(m));
    }
    setIsConstEnum(value) {
        return this.toggleModifier("const", value);
    }
    isConstEnum() {
        return this.getConstKeyword() != null;
    }
    getConstKeyword() {
        return this.getFirstModifierByKind(common.SyntaxKind.ConstKeyword);
    }
    getStructure() {
        return callBaseGetStructure(EnumDeclarationBase.prototype, this, {
            kind: exports.StructureKind.Enum,
            isConst: this.isConstEnum(),
            members: this.getMembers().map(member => member.getStructure()),
        });
    }
}

const createBase$a = (ctor) => JSDocableNode(InitializerExpressionableNode(PropertyNamedNode(ctor)));
const EnumMemberBase = createBase$a(Node);
class EnumMember extends EnumMemberBase {
    getValue() {
        return this._context.typeChecker.getConstantValue(this);
    }
    setValue(value) {
        let text;
        if (typeof value === "string") {
            const quoteKind = this._context.manipulationSettings.getQuoteKind();
            text = quoteKind + common.StringUtils.escapeForWithinString(value, quoteKind) + quoteKind;
        }
        else {
            text = value.toString();
        }
        this.setInitializer(text);
        return this;
    }
    remove() {
        const childrenToRemove = [this];
        const commaToken = this.getNextSiblingIfKind(common.SyntaxKind.CommaToken);
        if (commaToken != null)
            childrenToRemove.push(commaToken);
        removeChildrenWithFormatting({
            children: childrenToRemove,
            getSiblingFormatting: () => FormattingKind.Newline,
        });
    }
    set(structure) {
        callBaseSet(EnumMemberBase.prototype, this, structure);
        if (structure.value != null)
            this.setValue(structure.value);
        else if (structure.hasOwnProperty(common.nameof(structure, "value")) && structure.initializer == null)
            this.removeInitializer();
        return this;
    }
    getStructure() {
        return callBaseGetStructure(EnumMemberBase.prototype, this, {
            kind: exports.StructureKind.EnumMember,
            value: undefined,
        });
    }
}

class HeritageClause extends Node {
    getTypeNodes() {
        return this.compilerNode.types?.map(t => this._getNodeFromCompilerNode(t)) ?? [];
    }
    getToken() {
        return this.compilerNode.token;
    }
    removeExpression(expressionNodeOrIndex) {
        const expressions = this.getTypeNodes();
        const expressionNodeToRemove = typeof expressionNodeOrIndex === "number" ? getExpressionFromIndex(expressionNodeOrIndex) : expressionNodeOrIndex;
        if (expressions.length === 1) {
            const heritageClauses = this.getParentSyntaxListOrThrow().getChildren();
            if (heritageClauses.length === 1)
                removeChildren({ children: [heritageClauses[0].getParentSyntaxListOrThrow()], removePrecedingSpaces: true });
            else
                removeChildren({ children: [this], removePrecedingSpaces: true });
        }
        else {
            removeCommaSeparatedChild(expressionNodeToRemove);
        }
        return this;
        function getExpressionFromIndex(index) {
            return expressions[verifyAndGetIndex(index, expressions.length - 1)];
        }
    }
}

class TypeElement extends Node {
    remove() {
        removeInterfaceMember(this);
    }
}

const createBase$9 = (ctor) => TypeParameteredNode(ChildOrderableNode(JSDocableNode(SignaturedDeclaration(ctor))));
const CallSignatureDeclarationBase = createBase$9(TypeElement);
class CallSignatureDeclaration extends CallSignatureDeclarationBase {
    set(structure) {
        callBaseSet(CallSignatureDeclarationBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(CallSignatureDeclarationBase.prototype, this, {
            kind: exports.StructureKind.CallSignature,
        });
    }
}

class CommentTypeElement extends TypeElement {
}

const createBase$8 = (ctor) => TypeParameteredNode(ChildOrderableNode(JSDocableNode(SignaturedDeclaration(ctor))));
const ConstructSignatureDeclarationBase = createBase$8(TypeElement);
class ConstructSignatureDeclaration extends ConstructSignatureDeclarationBase {
    set(structure) {
        callBaseSet(ConstructSignatureDeclarationBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(ConstructSignatureDeclarationBase.prototype, this, {
            kind: exports.StructureKind.ConstructSignature,
        });
    }
}

const createBase$7 = (ctor) => ReturnTypedNode(ChildOrderableNode(JSDocableNode(ReadonlyableNode(ModifierableNode(ctor)))));
const IndexSignatureDeclarationBase = createBase$7(TypeElement);
class IndexSignatureDeclaration extends IndexSignatureDeclarationBase {
    getKeyName() {
        return this.getKeyNameNode().getText();
    }
    setKeyName(name) {
        common.errors.throwIfWhitespaceOrNotString(name, "name");
        if (this.getKeyName() === name)
            return;
        this.getKeyNameNode().replaceWithText(name, this._getWriterWithQueuedChildIndentation());
    }
    getKeyNameNode() {
        const param = this.compilerNode.parameters[0];
        return this._getNodeFromCompilerNode(param.name);
    }
    getKeyType() {
        return this.getKeyNameNode().getType();
    }
    setKeyType(type) {
        common.errors.throwIfWhitespaceOrNotString(type, "type");
        const keyTypeNode = this.getKeyTypeNode();
        if (keyTypeNode.getText() === type)
            return this;
        keyTypeNode.replaceWithText(type, this._getWriterWithQueuedChildIndentation());
        return this;
    }
    getKeyTypeNode() {
        const param = this.compilerNode.parameters[0];
        return this._getNodeFromCompilerNode(param.type);
    }
    set(structure) {
        callBaseSet(IndexSignatureDeclarationBase.prototype, this, structure);
        if (structure.keyName != null)
            this.setKeyName(structure.keyName);
        if (structure.keyType != null)
            this.setKeyType(structure.keyType);
        return this;
    }
    getStructure() {
        const keyTypeNode = this.getKeyTypeNode();
        return callBaseGetStructure(IndexSignatureDeclarationBase.prototype, this, {
            kind: exports.StructureKind.IndexSignature,
            keyName: this.getKeyName(),
            keyType: keyTypeNode.getText(),
        });
    }
}

const createBase$6 = (ctor) => TypeElementMemberedNode(TextInsertableNode(ExtendsClauseableNode(HeritageClauseableNode(TypeParameteredNode(JSDocableNode(AmbientableNode(ModuleChildableNode(ExportableNode(ModifierableNode(NamedNode(ctor)))))))))));
const InterfaceDeclarationBase = createBase$6(Statement);
class InterfaceDeclaration extends InterfaceDeclarationBase {
    getBaseTypes() {
        return this.getType().getBaseTypes();
    }
    getBaseDeclarations() {
        return this.getType().getBaseTypes().map(t => {
            return t.getSymbol()?.getDeclarations() ?? [];
        }).flat();
    }
    getImplementations() {
        return this.getNameNode().getImplementations();
    }
    set(structure) {
        callBaseSet(InterfaceDeclarationBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(InterfaceDeclarationBase.prototype, this, {
            kind: exports.StructureKind.Interface,
        });
    }
}

const createBase$5 = (ctor) => ChildOrderableNode(JSDocableNode(QuestionTokenableNode(TypeParameteredNode(SignaturedDeclaration(PropertyNamedNode(ctor))))));
const MethodSignatureBase = createBase$5(TypeElement);
class MethodSignature extends MethodSignatureBase {
    set(structure) {
        callBaseSet(MethodSignatureBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(MethodSignatureBase.prototype, this, {
            kind: exports.StructureKind.MethodSignature,
        });
    }
}

const createBase$4 = (ctor) => ChildOrderableNode(JSDocableNode(ReadonlyableNode(QuestionTokenableNode(InitializerExpressionableNode(TypedNode(PropertyNamedNode(ModifierableNode(ctor))))))));
const PropertySignatureBase = createBase$4(TypeElement);
class PropertySignature extends PropertySignatureBase {
    set(structure) {
        callBaseSet(PropertySignatureBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(PropertySignatureBase.prototype, this, {
            kind: exports.StructureKind.PropertySignature,
        });
    }
}

function JsxAttributedNode(Base) {
    return class extends Base {
        getAttributes() {
            return this.compilerNode.attributes.properties.map(p => this._getNodeFromCompilerNode(p));
        }
        getAttributeOrThrow(nameOrFindFunction) {
            return common.errors.throwIfNullOrUndefined(this.getAttribute(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("attribute", nameOrFindFunction));
        }
        getAttribute(nameOrFindFunction) {
            return getNodeByNameOrFindFunction(this.getAttributes(), nameOrFindFunction);
        }
        addAttribute(structure) {
            return this.addAttributes([structure])[0];
        }
        addAttributes(structures) {
            return this.insertAttributes(this.compilerNode.attributes.properties.length, structures);
        }
        insertAttribute(index, structure) {
            return this.insertAttributes(index, [structure])[0];
        }
        insertAttributes(index, structures) {
            if (structures.length === 0)
                return [];
            const originalChildrenCount = this.compilerNode.attributes.properties.length;
            index = verifyAndGetIndex(index, originalChildrenCount);
            const insertPos = index === 0 ? this.getTagNameNode().getEnd() : this.getAttributes()[index - 1].getEnd();
            const writer = this._getWriterWithQueuedChildIndentation();
            const structuresPrinter = new SpaceFormattingStructuresPrinter(this._context.structurePrinterFactory.forJsxAttributeDecider());
            structuresPrinter.printText(writer, structures);
            insertIntoParentTextRange({
                insertPos,
                newText: " " + writer.toString(),
                parent: this.getNodeProperty("attributes").getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
            });
            return getNodesToReturn(originalChildrenCount, this.getAttributes(), index, false);
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.attributes != null) {
                this.getAttributes().forEach(a => a.remove());
                this.addAttributes(structure.attributes);
            }
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                attributes: this.getAttributes().map(a => a.getStructure()),
            });
        }
    };
}

function JsxTagNamedNode(Base) {
    return class extends Base {
        getTagNameNode() {
            return this._getNodeFromCompilerNode(this.compilerNode.tagName);
        }
        set(structure) {
            callBaseSet(Base.prototype, this, structure);
            if (structure.name != null)
                this.getTagNameNode().replaceWithText(structure.name);
            return this;
        }
        getStructure() {
            return callBaseGetStructure(Base.prototype, this, {
                name: this.getTagNameNode().getText(),
            });
        }
    };
}

function CommonIdentifierBase(Base) {
    return class extends Base {
        getText() {
            return this.compilerNode.text;
        }
        getDefinitionNodes() {
            return this.getDefinitions().map(d => d.getDeclarationNode()).filter(d => d != null);
        }
        getDefinitions() {
            return this._context.languageService.getDefinitions(this);
        }
    };
}

const ComputedPropertyNameBase = ExpressionedNode(Node);
class ComputedPropertyName extends ComputedPropertyNameBase {
}

const IdentifierBase = CommonIdentifierBase(ReferenceFindableNode(RenameableNode(PrimaryExpression)));
class Identifier extends IdentifierBase {
    getImplementations() {
        return this._context.languageService.getImplementations(this);
    }
}

const PrivateIdentifierBase = CommonIdentifierBase(ReferenceFindableNode(RenameableNode(Node)));
class PrivateIdentifier extends PrivateIdentifierBase {
}

class QualifiedName extends Node {
    getLeft() {
        return this._getNodeFromCompilerNode(this.compilerNode.left);
    }
    getRight() {
        return this._getNodeFromCompilerNode(this.compilerNode.right);
    }
}

const JsxAttributeBase = Node;
class JsxAttribute extends JsxAttributeBase {
    getNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.name);
    }
    setName(name) {
        this.getNameNode().replaceWithText(writer => {
            if (typeof name === "object")
                this._context.structurePrinterFactory.forJsxNamespacedName().printText(writer, name);
            else
                writer.write(name);
        });
        return this;
    }
    getInitializerOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getInitializer(), message ?? `Expected to find an initializer for the JSX attribute '${this.getNameNode().getText()}'`, this);
    }
    getInitializer() {
        return this._getNodeFromCompilerNodeIfExists(this.compilerNode.initializer);
    }
    setInitializer(textOrWriterFunction) {
        const text = getTextFromStringOrWriter(this._getWriterWithQueuedIndentation(), textOrWriterFunction);
        if (common.StringUtils.isNullOrWhitespace(text)) {
            this.removeInitializer();
            return this;
        }
        const initializer = this.getInitializer();
        if (initializer != null) {
            initializer.replaceWithText(text);
            return this;
        }
        insertIntoParentTextRange({
            insertPos: this.getNameNode().getEnd(),
            parent: this,
            newText: `=${text}`,
        });
        return this;
    }
    removeInitializer() {
        const initializer = this.getInitializer();
        if (initializer == null)
            return this;
        removeChildren({
            children: [initializer.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.EqualsToken), initializer],
            removePrecedingSpaces: true,
            removePrecedingNewLines: true,
        });
        return this;
    }
    remove() {
        removeChildren({
            children: [this],
            removePrecedingNewLines: true,
            removePrecedingSpaces: true,
        });
    }
    set(structure) {
        callBaseSet(JsxAttributeBase.prototype, this, structure);
        if (structure.name != null)
            this.setName(structure.name);
        if (structure.initializer != null)
            this.setInitializer(structure.initializer);
        else if (structure.hasOwnProperty(common.nameof(structure, "initializer")))
            this.removeInitializer();
        return this;
    }
    getStructure() {
        const initializer = this.getInitializer();
        const nameNode = this.getNameNode();
        return callBaseGetStructure(JsxAttributeBase.prototype, this, {
            name: nameNode instanceof Identifier ? nameNode.getText() : nameNode.getStructure(),
            kind: exports.StructureKind.JsxAttribute,
            initializer: initializer?.getText(),
        });
    }
}

const createBase$3 = (ctor) => JsxTagNamedNode(ctor);
const JsxClosingElementBase = createBase$3(Node);
class JsxClosingElement extends JsxClosingElementBase {
}

class JsxClosingFragment extends Expression {
}

const JsxElementBase = PrimaryExpression;
class JsxElement extends JsxElementBase {
    getJsxChildren() {
        return this.compilerNode.children.map(c => this._getNodeFromCompilerNode(c));
    }
    getOpeningElement() {
        return this._getNodeFromCompilerNode(this.compilerNode.openingElement);
    }
    getClosingElement() {
        return this._getNodeFromCompilerNode(this.compilerNode.closingElement);
    }
    setBodyText(textOrWriterFunction) {
        const newText = getBodyText(this._getWriterWithIndentation(), textOrWriterFunction);
        setText(this, newText);
        return this;
    }
    setBodyTextInline(textOrWriterFunction) {
        const writer = this._getWriterWithQueuedChildIndentation();
        printTextFromStringOrWriter(writer, textOrWriterFunction);
        if (writer.isLastNewLine()) {
            writer.setIndentationLevel(Math.max(0, this.getIndentationLevel() - 1));
            writer.write("");
        }
        setText(this, writer.toString());
        return this;
    }
    set(structure) {
        callBaseSet(JsxElementBase.prototype, this, structure);
        if (structure.attributes != null) {
            const openingElement = this.getOpeningElement();
            openingElement.getAttributes().forEach(a => a.remove());
            openingElement.addAttributes(structure.attributes);
        }
        if (structure.children != null)
            throw new common.errors.NotImplementedError("Setting JSX children is currently not implemented. Please open an issue if you need this.");
        if (structure.bodyText != null)
            this.setBodyText(structure.bodyText);
        else if (structure.hasOwnProperty(common.nameof(structure, "bodyText")))
            this.setBodyTextInline("");
        if (structure.name != null) {
            this.getOpeningElement().getTagNameNode().replaceWithText(structure.name);
            this.getClosingElement().getTagNameNode().replaceWithText(structure.name);
        }
        return this;
    }
    getStructure() {
        const openingElement = this.getOpeningElement();
        const structure = callBaseGetStructure(JsxElementBase.prototype, this, {
            kind: exports.StructureKind.JsxElement,
            name: openingElement.getTagNameNode().getText(),
            attributes: openingElement.getAttributes().map(a => a.getStructure()),
            children: undefined,
            bodyText: getBodyTextWithoutLeadingIndentation(this),
        });
        delete structure.children;
        return structure;
    }
}
function setText(element, newText) {
    const openingElement = element.getOpeningElement();
    const closingElement = element.getClosingElement();
    insertIntoParentTextRange({
        insertPos: openingElement.getEnd(),
        newText,
        parent: element.getChildSyntaxListOrThrow(),
        replacing: {
            textLength: closingElement.getStart() - openingElement.getEnd(),
        },
    });
}

const JsxExpressionBase = ExpressionableNode(DotDotDotTokenableNode(Expression));
class JsxExpression extends JsxExpressionBase {
}

class JsxFragment extends PrimaryExpression {
    getJsxChildren() {
        return this.compilerNode.children.map(c => this._getNodeFromCompilerNode(c));
    }
    getOpeningFragment() {
        return this._getNodeFromCompilerNode(this.compilerNode.openingFragment);
    }
    getClosingFragment() {
        return this._getNodeFromCompilerNode(this.compilerNode.closingFragment);
    }
}

const JsxNamespacedNameBase = Node;
class JsxNamespacedName extends JsxNamespacedNameBase {
    getNamespaceNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.namespace);
    }
    getNameNode() {
        return this._getNodeFromCompilerNode(this.compilerNode.name);
    }
    set(structure) {
        this.getNamespaceNode().replaceWithText(structure.namespace);
        this.getNameNode().replaceWithText(structure.name);
        return this;
    }
    getStructure() {
        return {
            namespace: this.getNamespaceNode().getText(),
            name: this.getNameNode().getText(),
        };
    }
}

const createBase$2 = (ctor) => JsxAttributedNode(JsxTagNamedNode(ctor));
const JsxOpeningElementBase = createBase$2(Expression);
class JsxOpeningElement extends JsxOpeningElementBase {
}

class JsxOpeningFragment extends Expression {
}

const createBase$1 = (ctor) => JsxAttributedNode(JsxTagNamedNode(ctor));
const JsxSelfClosingElementBase = createBase$1(PrimaryExpression);
class JsxSelfClosingElement extends JsxSelfClosingElementBase {
    set(structure) {
        callBaseSet(JsxSelfClosingElementBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(JsxSelfClosingElementBase.prototype, this, {
            kind: exports.StructureKind.JsxSelfClosingElement,
        });
    }
}

const JsxSpreadAttributeBase = ExpressionedNode(Node);
class JsxSpreadAttribute extends JsxSpreadAttributeBase {
    remove() {
        removeChildren({
            children: [this],
            removePrecedingNewLines: true,
            removePrecedingSpaces: true,
        });
    }
    set(structure) {
        callBaseSet(JsxSpreadAttributeBase.prototype, this, structure);
        if (structure.expression != null)
            this.setExpression(structure.expression);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(JsxSpreadAttributeBase.prototype, this, {
            kind: exports.StructureKind.JsxSpreadAttribute,
            expression: this.getExpression().getText(),
        });
    }
}

const JsxTextBase = LiteralLikeNode(Node);
class JsxText extends JsxTextBase {
    containsOnlyTriviaWhiteSpaces() {
        const oldCompilerNode = this.compilerNode;
        if (typeof oldCompilerNode.containsOnlyWhiteSpaces === "boolean")
            return oldCompilerNode.containsOnlyWhiteSpaces;
        return this.compilerNode.containsOnlyTriviaWhiteSpaces;
    }
}

const BigIntLiteralBase = LiteralExpression;
class BigIntLiteral extends BigIntLiteralBase {
    getLiteralValue() {
        const text = this.compilerNode.text;
        if (typeof BigInt === "undefined")
            throw new common.errors.InvalidOperationError("Runtime environment does not support BigInts. Perhaps work with the text instead?");
        const textWithoutN = text.substring(0, text.length - 1);
        return BigInt(textWithoutN);
    }
    setLiteralValue(value) {
        if (typeof value !== "bigint")
            throw new common.errors.ArgumentTypeError("value", "bigint", typeof value);
        replaceNodeText({
            sourceFile: this._sourceFile,
            start: this.getStart(),
            replacingLength: this.getWidth(),
            newText: value.toString() + "n",
        });
        return this;
    }
}

const TrueLiteralBase = PrimaryExpression;
class TrueLiteral extends TrueLiteralBase {
    getLiteralValue() {
        return getLiteralValue(this);
    }
    setLiteralValue(value) {
        return setLiteralValue(this, value);
    }
}
const FalseLiteralBase = PrimaryExpression;
class FalseLiteral extends FalseLiteralBase {
    getLiteralValue() {
        return getLiteralValue(this);
    }
    setLiteralValue(value) {
        return setLiteralValue(this, value);
    }
}
function setLiteralValue(node, value) {
    if (getLiteralValue(node) === value)
        return node;
    const parent = node.getParentSyntaxList() || node.getParentOrThrow();
    const index = node.getChildIndex();
    node.replaceWithText(value ? "true" : "false");
    return parent.getChildAtIndex(index);
}
function getLiteralValue(node) {
    return node.getKind() === common.SyntaxKind.TrueKeyword;
}

const NullLiteralBase = PrimaryExpression;
class NullLiteral extends NullLiteralBase {
}

const NumericLiteralBase = LiteralExpression;
class NumericLiteral extends NumericLiteralBase {
    getLiteralValue() {
        const text = this.compilerNode.text;
        if (text.indexOf(".") >= 0)
            return parseFloat(text);
        return parseInt(text, 10);
    }
    setLiteralValue(value) {
        replaceNodeText({
            sourceFile: this._sourceFile,
            start: this.getStart(),
            replacingLength: this.getWidth(),
            newText: value.toString(10),
        });
        return this;
    }
}

exports.QuoteKind = void 0;
(function (QuoteKind) {
    QuoteKind["Single"] = "'";
    QuoteKind["Double"] = "\"";
})(exports.QuoteKind || (exports.QuoteKind = {}));

const RegularExpressionLiteralBase = LiteralExpression;
class RegularExpressionLiteral extends RegularExpressionLiteralBase {
    getLiteralValue() {
        const pattern = /^\/(.*)\/([^\/]*)$/;
        const text = this.compilerNode.text;
        const matches = pattern.exec(text);
        return new RegExp(matches[1], matches[2]);
    }
    setLiteralValue(regExpOrPattern, flags) {
        let pattern;
        if (typeof regExpOrPattern === "string")
            pattern = regExpOrPattern;
        else {
            pattern = regExpOrPattern.source;
            flags = regExpOrPattern.flags;
        }
        replaceNodeText({
            sourceFile: this._sourceFile,
            start: this.getStart(),
            replacingLength: this.getWidth(),
            newText: `/${pattern}/${flags || ""}`,
        });
        return this;
    }
}

const StringLiteralBase = LiteralExpression;
class StringLiteral extends StringLiteralBase {
    getLiteralValue() {
        return this.compilerNode.text;
    }
    setLiteralValue(value) {
        replaceNodeText({
            sourceFile: this._sourceFile,
            start: this.getStart() + 1,
            replacingLength: this.getWidth() - 2,
            newText: common.StringUtils.escapeForWithinString(value, this.getQuoteKind()),
        });
        return this;
    }
    getQuoteKind() {
        return this.getText()[0] === "'" ? exports.QuoteKind.Single : exports.QuoteKind.Double;
    }
}

const NoSubstitutionTemplateLiteralBase = LiteralExpression;
class NoSubstitutionTemplateLiteral extends NoSubstitutionTemplateLiteralBase {
    getLiteralValue() {
        return this.compilerNode.text;
    }
    setLiteralValue(value) {
        const childIndex = this.getChildIndex();
        const parent = this.getParentSyntaxList() || this.getParentOrThrow();
        replaceNodeText({
            sourceFile: this._sourceFile,
            start: this.getStart() + 1,
            replacingLength: this.getWidth() - 2,
            newText: value,
        });
        return parent.getChildAtIndex(childIndex);
    }
}

class TaggedTemplateExpression extends MemberExpression {
    getTag() {
        return this._getNodeFromCompilerNode(this.compilerNode.tag);
    }
    getTemplate() {
        return this._getNodeFromCompilerNode(this.compilerNode.template);
    }
    removeTag() {
        const parent = this.getParentSyntaxList() ?? this.getParentOrThrow();
        const index = this.getChildIndex();
        const template = this.getTemplate();
        insertIntoParentTextRange({
            customMappings: (newParent, newSourceFile) => [{ currentNode: template, newNode: newParent.getChildren(newSourceFile)[index] }],
            parent,
            insertPos: this.getStart(),
            newText: this.getTemplate().getText(),
            replacing: {
                textLength: this.getWidth(),
                nodes: [this],
            },
        });
        return parent.getChildAtIndex(index);
    }
}

const TemplateExpressionBase = PrimaryExpression;
class TemplateExpression extends TemplateExpressionBase {
    getHead() {
        return this._getNodeFromCompilerNode(this.compilerNode.head);
    }
    getTemplateSpans() {
        return this.compilerNode.templateSpans.map(s => this._getNodeFromCompilerNode(s));
    }
    setLiteralValue(value) {
        const childIndex = this.getChildIndex();
        const parent = this.getParentSyntaxList() ?? this.getParentOrThrow();
        replaceNodeText({
            sourceFile: this._sourceFile,
            start: this.getStart() + 1,
            replacingLength: this.getWidth() - 2,
            newText: value,
        });
        return parent.getChildAtIndex(childIndex);
    }
}

const TemplateHeadBase = LiteralLikeNode(Node);
class TemplateHead extends TemplateHeadBase {
}

const TemplateMiddleBase = LiteralLikeNode(Node);
class TemplateMiddle extends TemplateMiddleBase {
}

const TemplateSpanBase = ExpressionedNode(Node);
class TemplateSpan extends TemplateSpanBase {
    getLiteral() {
        return this._getNodeFromCompilerNode(this.compilerNode.literal);
    }
}

const TemplateTailBase = LiteralLikeNode(Node);
class TemplateTail extends TemplateTailBase {
}

const createBase = (ctor) => ExportGetableNode(ExclamationTokenableNode(TypedNode(InitializerExpressionableNode(BindingNamedNode(ctor)))));
const VariableDeclarationBase = createBase(Node);
class VariableDeclaration extends VariableDeclarationBase {
    remove() {
        const parent = this.getParentOrThrow();
        switch (parent.getKind()) {
            case common.SyntaxKind.VariableDeclarationList:
                removeFromDeclarationList(this);
                break;
            case common.SyntaxKind.CatchClause:
                removeFromCatchClause(this);
                break;
            default:
                throw new common.errors.NotImplementedError(`Not implemented for syntax kind: ${parent.getKindName()}`);
        }
        function removeFromDeclarationList(node) {
            const variableStatement = parent.getParentIfKindOrThrow(common.SyntaxKind.VariableStatement);
            const declarations = variableStatement.getDeclarations();
            if (declarations.length === 1)
                variableStatement.remove();
            else
                removeCommaSeparatedChild(node);
        }
        function removeFromCatchClause(node) {
            removeChildren({
                children: [
                    node.getPreviousSiblingIfKindOrThrow(common.SyntaxKind.OpenParenToken),
                    node,
                    node.getNextSiblingIfKindOrThrow(common.SyntaxKind.CloseParenToken),
                ],
                removePrecedingSpaces: true,
            });
        }
    }
    getVariableStatementOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getVariableStatement(), message ?? "Expected the grandparent to be a variable statement.", this);
    }
    getVariableStatement() {
        const grandParent = this.getParentOrThrow().getParentOrThrow();
        return Node.isVariableStatement(grandParent) ? grandParent : undefined;
    }
    set(structure) {
        callBaseSet(VariableDeclarationBase.prototype, this, structure);
        return this;
    }
    getStructure() {
        return callBaseGetStructure(VariableDeclarationBase.prototype, this, {
            kind: exports.StructureKind.VariableDeclaration,
        });
    }
}

const VariableDeclarationListBase = ModifierableNode(Node);
class VariableDeclarationList extends VariableDeclarationListBase {
    getDeclarations() {
        return this.compilerNode.declarations.map(d => this._getNodeFromCompilerNode(d));
    }
    getDeclarationKind() {
        const nodeFlags = this.compilerNode.flags;
        if (nodeFlags & common.ts.NodeFlags.Let)
            return exports.VariableDeclarationKind.Let;
        else if ((nodeFlags & common.ts.NodeFlags.AwaitUsing) === common.ts.NodeFlags.AwaitUsing)
            return exports.VariableDeclarationKind.AwaitUsing;
        else if ((nodeFlags & common.ts.NodeFlags.Using) === common.ts.NodeFlags.Using)
            return exports.VariableDeclarationKind.Using;
        else if (nodeFlags & common.ts.NodeFlags.Const)
            return exports.VariableDeclarationKind.Const;
        else
            return exports.VariableDeclarationKind.Var;
    }
    getDeclarationKindKeywords() {
        const declarationKind = this.getDeclarationKind();
        switch (declarationKind) {
            case exports.VariableDeclarationKind.Const:
                return [this.getFirstChildByKindOrThrow(common.SyntaxKind.ConstKeyword)];
            case exports.VariableDeclarationKind.Let:
                return [this.getFirstChildByKindOrThrow(common.SyntaxKind.LetKeyword)];
            case exports.VariableDeclarationKind.Var:
                return [this.getFirstChildByKindOrThrow(common.SyntaxKind.VarKeyword)];
            case exports.VariableDeclarationKind.Using:
                return [this.getFirstChildByKindOrThrow(common.SyntaxKind.UsingKeyword)];
            case exports.VariableDeclarationKind.AwaitUsing:
                const awaitKeyword = this.getFirstChildByKindOrThrow(common.SyntaxKind.AwaitKeyword);
                const usingKeyword = awaitKeyword.getNextSiblingIfKindOrThrow(common.SyntaxKind.UsingKeyword);
                return [awaitKeyword, usingKeyword];
            default:
                return common.errors.throwNotImplementedForNeverValueError(declarationKind);
        }
    }
    setDeclarationKind(type) {
        if (this.getDeclarationKind() === type)
            return this;
        const keywords = this.getDeclarationKindKeywords();
        const start = keywords[0].getStart();
        const end = keywords[keywords.length - 1].getEnd();
        insertIntoParentTextRange({
            insertPos: start,
            newText: type,
            parent: this,
            replacing: {
                textLength: end - start,
            },
        });
        return this;
    }
    addDeclaration(structure) {
        return this.addDeclarations([structure])[0];
    }
    addDeclarations(structures) {
        return this.insertDeclarations(this.getDeclarations().length, structures);
    }
    insertDeclaration(index, structure) {
        return this.insertDeclarations(index, [structure])[0];
    }
    insertDeclarations(index, structures) {
        const writer = this._getWriterWithQueuedChildIndentation();
        const structurePrinter = new CommaSeparatedStructuresPrinter(this._context.structurePrinterFactory.forVariableDeclaration());
        const originalChildrenCount = this.compilerNode.declarations.length;
        index = verifyAndGetIndex(index, originalChildrenCount);
        structurePrinter.printText(writer, structures);
        insertIntoCommaSeparatedNodes({
            parent: this.getFirstChildByKindOrThrow(common.SyntaxKind.SyntaxList),
            currentNodes: this.getDeclarations(),
            insertIndex: index,
            newText: writer.toString(),
            useTrailingCommas: false,
        });
        return getNodesToReturn(originalChildrenCount, this.getDeclarations(), index, false);
    }
}

class Signature {
    #context;
    #compilerSignature;
    constructor(context, signature) {
        this.#context = context;
        this.#compilerSignature = signature;
    }
    get compilerSignature() {
        return this.#compilerSignature;
    }
    getTypeParameters() {
        const typeParameters = this.compilerSignature.typeParameters || [];
        return typeParameters.map(t => this.#context.compilerFactory.getTypeParameter(t));
    }
    getParameters() {
        return this.compilerSignature.parameters.map(p => this.#context.compilerFactory.getSymbol(p));
    }
    getReturnType() {
        return this.#context.compilerFactory.getType(this.compilerSignature.getReturnType());
    }
    getDocumentationComments() {
        const docs = this.compilerSignature.getDocumentationComment(this.#context.typeChecker.compilerObject);
        return docs.map(d => this.#context.compilerFactory.getSymbolDisplayPart(d));
    }
    getJsDocTags() {
        const tags = this.compilerSignature.getJsDocTags();
        return tags.map(t => this.#context.compilerFactory.getJSDocTagInfo(t));
    }
    getDeclaration() {
        const { compilerFactory } = this.#context;
        const compilerSignatureDeclaration = this.compilerSignature.getDeclaration();
        return compilerFactory.getNodeFromCompilerNode(compilerSignatureDeclaration, compilerFactory.getSourceFileForNode(compilerSignatureDeclaration));
    }
}

let Symbol$1 = class Symbol {
    #context;
    #compilerSymbol;
    get compilerSymbol() {
        return this.#compilerSymbol;
    }
    constructor(context, symbol) {
        this.#context = context;
        this.#compilerSymbol = symbol;
        this.getValueDeclaration();
        this.getDeclarations();
    }
    getName() {
        return this.compilerSymbol.getName();
    }
    getEscapedName() {
        return this.compilerSymbol.getEscapedName();
    }
    getAliasedSymbolOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getAliasedSymbol(), message ?? "Expected to find an aliased symbol.");
    }
    getImmediatelyAliasedSymbol() {
        return this.#context.typeChecker.getImmediatelyAliasedSymbol(this);
    }
    getImmediatelyAliasedSymbolOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getImmediatelyAliasedSymbol(), message ?? "Expected to find an immediately aliased symbol.");
    }
    getAliasedSymbol() {
        return this.#context.typeChecker.getAliasedSymbol(this);
    }
    getExportSymbol() {
        return this.#context.typeChecker.getExportSymbolOfSymbol(this);
    }
    isAlias() {
        return (this.getFlags() & common.SymbolFlags.Alias) === common.SymbolFlags.Alias;
    }
    isOptional() {
        return (this.getFlags() & common.SymbolFlags.Optional) === common.SymbolFlags.Optional;
    }
    getFlags() {
        return this.compilerSymbol.getFlags();
    }
    hasFlags(flags) {
        return (this.compilerSymbol.flags & flags) === flags;
    }
    getValueDeclarationOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getValueDeclaration(), message ?? (() => `Expected to find the value declaration of symbol '${this.getName()}'.`));
    }
    getValueDeclaration() {
        const declaration = this.compilerSymbol.valueDeclaration;
        if (declaration == null)
            return undefined;
        return this.#context.compilerFactory.getNodeFromCompilerNode(declaration, this.#context.compilerFactory.getSourceFileForNode(declaration));
    }
    getDeclarations() {
        return (this.compilerSymbol.declarations ?? [])
            .map(d => this.#context.compilerFactory.getNodeFromCompilerNode(d, this.#context.compilerFactory.getSourceFileForNode(d)));
    }
    getExportOrThrow(name, message) {
        return common.errors.throwIfNullOrUndefined(this.getExport(name), message ?? (() => `Expected to find export with name: ${name}`));
    }
    getExport(name) {
        if (this.compilerSymbol.exports == null)
            return undefined;
        const tsSymbol = this.compilerSymbol.exports.get(common.ts.escapeLeadingUnderscores(name));
        return tsSymbol == null ? undefined : this.#context.compilerFactory.getSymbol(tsSymbol);
    }
    getExports() {
        if (this.compilerSymbol.exports == null)
            return [];
        return Array.from(this.compilerSymbol.exports.values()).map(symbol => this.#context.compilerFactory.getSymbol(symbol));
    }
    getGlobalExportOrThrow(name, message) {
        return common.errors.throwIfNullOrUndefined(this.getGlobalExport(name), message ?? (() => `Expected to find global export with name: ${name}`));
    }
    getGlobalExport(name) {
        if (this.compilerSymbol.globalExports == null)
            return undefined;
        const tsSymbol = this.compilerSymbol.globalExports.get(common.ts.escapeLeadingUnderscores(name));
        return tsSymbol == null ? undefined : this.#context.compilerFactory.getSymbol(tsSymbol);
    }
    getGlobalExports() {
        if (this.compilerSymbol.globalExports == null)
            return [];
        return Array.from(this.compilerSymbol.globalExports.values()).map(symbol => this.#context.compilerFactory.getSymbol(symbol));
    }
    getMemberOrThrow(name, message) {
        return common.errors.throwIfNullOrUndefined(this.getMember(name), message ?? `Expected to find member with name: ${name}`);
    }
    getMember(name) {
        if (this.compilerSymbol.members == null)
            return undefined;
        const tsSymbol = this.compilerSymbol.members.get(common.ts.escapeLeadingUnderscores(name));
        return tsSymbol == null ? undefined : this.#context.compilerFactory.getSymbol(tsSymbol);
    }
    getMembers() {
        if (this.compilerSymbol.members == null)
            return [];
        return Array.from(this.compilerSymbol.members.values()).map(symbol => this.#context.compilerFactory.getSymbol(symbol));
    }
    getDeclaredType() {
        return this.#context.typeChecker.getDeclaredTypeOfSymbol(this);
    }
    getTypeAtLocation(node) {
        return this.#context.typeChecker.getTypeOfSymbolAtLocation(this, node);
    }
    getFullyQualifiedName() {
        return this.#context.typeChecker.getFullyQualifiedName(this);
    }
    getJsDocTags() {
        return this.compilerSymbol.getJsDocTags(this.#context.typeChecker.compilerObject)
            .map(info => new JSDocTagInfo(info));
    }
};

class TextSpan {
    #compilerObject;
    constructor(compilerObject) {
        this.#compilerObject = compilerObject;
    }
    get compilerObject() {
        return this.#compilerObject;
    }
    getStart() {
        return this.compilerObject.start;
    }
    getEnd() {
        return this.compilerObject.start + this.compilerObject.length;
    }
    getLength() {
        return this.compilerObject.length;
    }
}

let TextChange = (() => {
    let _instanceExtraInitializers = [];
    let _getSpan_decorators;
    return class TextChange {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getSpan_decorators = [common.Memoize];
            __esDecorate(this, null, _getSpan_decorators, { kind: "method", name: "getSpan", static: false, private: false, access: { has: obj => "getSpan" in obj, get: obj => obj.getSpan }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #compilerObject = __runInitializers(this, _instanceExtraInitializers);
        constructor(compilerObject) {
            this.#compilerObject = compilerObject;
        }
        get compilerObject() {
            return this.#compilerObject;
        }
        getSpan() {
            return new TextSpan(this.compilerObject.span);
        }
        getNewText() {
            return this.compilerObject.newText;
        }
    };
})();

let FileTextChanges = (() => {
    let _instanceExtraInitializers = [];
    let _getTextChanges_decorators;
    return class FileTextChanges {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getTextChanges_decorators = [common.Memoize];
            __esDecorate(this, null, _getTextChanges_decorators, { kind: "method", name: "getTextChanges", static: false, private: false, access: { has: obj => "getTextChanges" in obj, get: obj => obj.getTextChanges }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #context = __runInitializers(this, _instanceExtraInitializers);
        #compilerObject;
        #sourceFile;
        #existingFileExists;
        #isApplied;
        constructor(context, compilerObject) {
            this.#context = context;
            this.#compilerObject = compilerObject;
            const file = context.compilerFactory
                .addOrGetSourceFileFromFilePath(context.fileSystemWrapper.getStandardizedAbsolutePath(compilerObject.fileName), {
                markInProject: false,
                scriptKind: undefined,
            });
            this.#existingFileExists = file != null;
            if (!compilerObject.isNewFile)
                this.#sourceFile = file;
        }
        getFilePath() {
            return this.#compilerObject.fileName;
        }
        getSourceFile() {
            return this.#sourceFile;
        }
        getTextChanges() {
            return this.#compilerObject.textChanges.map(c => new TextChange(c));
        }
        applyChanges(options = {}) {
            if (this.#isApplied)
                return;
            if (this.isNewFile() && this.#existingFileExists && !options.overwrite) {
                throw new common.errors.InvalidOperationError(`Cannot apply file text change for creating a new file when the `
                    + `file exists at path ${this.getFilePath()}. Did you mean to provide the overwrite option?`);
            }
            let file;
            if (this.isNewFile())
                file = this.#context.project.createSourceFile(this.getFilePath(), "", { overwrite: options.overwrite });
            else
                file = this.getSourceFile();
            if (file == null) {
                throw new common.errors.InvalidOperationError(`Cannot apply file text change to modify existing file `
                    + `that doesn't exist at path: ${this.getFilePath()}`);
            }
            file.applyTextChanges(this.getTextChanges());
            file._markAsInProject();
            this.#isApplied = true;
            return this;
        }
        isNewFile() {
            return !!this.#compilerObject.isNewFile;
        }
    };
})();

class CodeAction {
    #context;
    #compilerObject;
    constructor(context, compilerObject) {
        this.#context = context;
        this.#compilerObject = compilerObject;
    }
    get compilerObject() {
        return this.#compilerObject;
    }
    getDescription() {
        return this.compilerObject.description;
    }
    getChanges() {
        return this.compilerObject.changes.map(change => new FileTextChanges(this.#context, change));
    }
}

class CodeFixAction extends CodeAction {
    getFixName() {
        return this.compilerObject.fixName;
    }
    getFixId() {
        return this.compilerObject.fixId;
    }
    getFixAllDescription() {
        return this.compilerObject.fixAllDescription;
    }
}

let CombinedCodeActions = (() => {
    let _instanceExtraInitializers = [];
    let _getChanges_decorators;
    return class CombinedCodeActions {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getChanges_decorators = [common.Memoize];
            __esDecorate(this, null, _getChanges_decorators, { kind: "method", name: "getChanges", static: false, private: false, access: { has: obj => "getChanges" in obj, get: obj => obj.getChanges }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #context = __runInitializers(this, _instanceExtraInitializers);
        #compilerObject;
        constructor(context, compilerObject) {
            this.#context = context;
            this.#compilerObject = compilerObject;
        }
        get compilerObject() {
            return this.#compilerObject;
        }
        getChanges() {
            return this.compilerObject.changes.map(change => new FileTextChanges(this.#context, change));
        }
        applyChanges(options) {
            for (const change of this.getChanges())
                change.applyChanges(options);
            return this;
        }
    };
})();

let DocumentSpan = (() => {
    let _instanceExtraInitializers = [];
    let _getTextSpan_decorators;
    let _getNode_decorators;
    let _getOriginalTextSpan_decorators;
    return class DocumentSpan {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getTextSpan_decorators = [common.Memoize];
            _getNode_decorators = [common.Memoize];
            _getOriginalTextSpan_decorators = [common.Memoize];
            __esDecorate(this, null, _getTextSpan_decorators, { kind: "method", name: "getTextSpan", static: false, private: false, access: { has: obj => "getTextSpan" in obj, get: obj => obj.getTextSpan }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getNode_decorators, { kind: "method", name: "getNode", static: false, private: false, access: { has: obj => "getNode" in obj, get: obj => obj.getNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getOriginalTextSpan_decorators, { kind: "method", name: "getOriginalTextSpan", static: false, private: false, access: { has: obj => "getOriginalTextSpan" in obj, get: obj => obj.getOriginalTextSpan }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        _context = __runInitializers(this, _instanceExtraInitializers);
        _compilerObject;
        _sourceFile;
        constructor(context, compilerObject) {
            this._context = context;
            this._compilerObject = compilerObject;
            this._sourceFile = this._context.compilerFactory
                .addOrGetSourceFileFromFilePath(context.fileSystemWrapper.getStandardizedAbsolutePath(this.compilerObject.fileName), {
                markInProject: false,
                scriptKind: undefined,
            });
            this._sourceFile._doActionPreNextModification(() => this.getNode());
        }
        get compilerObject() {
            return this._compilerObject;
        }
        getSourceFile() {
            return this._sourceFile;
        }
        getTextSpan() {
            return new TextSpan(this.compilerObject.textSpan);
        }
        getNode() {
            const textSpan = this.getTextSpan();
            const sourceFile = this.getSourceFile();
            const start = textSpan.getStart();
            const width = textSpan.getEnd();
            return findBestMatchingNode();
            function findBestMatchingNode() {
                let bestNode;
                sourceFile._context.compilerFactory.forgetNodesCreatedInBlock(remember => {
                    let foundNode;
                    let nextNode = sourceFile;
                    while (nextNode != null) {
                        if (foundNode == null)
                            bestNode = nextNode;
                        if (nextNode.getStart() === start && nextNode.getWidth() === width)
                            bestNode = foundNode = nextNode;
                        else if (foundNode != null)
                            break;
                        nextNode = nextNode.getChildAtPos(start);
                    }
                    if (bestNode != null)
                        remember(bestNode);
                });
                return bestNode;
            }
        }
        getOriginalTextSpan() {
            const { originalTextSpan } = this.compilerObject;
            return originalTextSpan == null ? undefined : new TextSpan(originalTextSpan);
        }
        getOriginalFileName() {
            return this.compilerObject.originalFileName;
        }
    };
})();

let DefinitionInfo = (() => {
    let _classSuper = DocumentSpan;
    let _instanceExtraInitializers = [];
    let _getDeclarationNode_decorators;
    return class DefinitionInfo extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _getDeclarationNode_decorators = [common.Memoize];
            __esDecorate(this, null, _getDeclarationNode_decorators, { kind: "method", name: "getDeclarationNode", static: false, private: false, access: { has: obj => "getDeclarationNode" in obj, get: obj => obj.getDeclarationNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(context, compilerObject) {
            super(context, compilerObject);
            __runInitializers(this, _instanceExtraInitializers);
            this.getSourceFile()._doActionPreNextModification(() => this.getDeclarationNode());
        }
        getKind() {
            return this.compilerObject.kind;
        }
        getName() {
            return this.compilerObject.name;
        }
        getContainerKind() {
            return this.compilerObject.containerKind;
        }
        getContainerName() {
            return this.compilerObject.containerName;
        }
        getDeclarationNode() {
            if (this.getKind() === "module" && this.getTextSpan().getLength() === this.getSourceFile().getFullWidth())
                return this.getSourceFile();
            const start = this.getTextSpan().getStart();
            const identifier = findIdentifier(this.getSourceFile());
            return identifier == null ? undefined : identifier.getParentOrThrow();
            function findIdentifier(node) {
                if (node.getKind() === common.SyntaxKind.Identifier && node.getStart() === start)
                    return node;
                for (const child of node._getChildrenIterator()) {
                    if (child.getPos() <= start && child.getEnd() > start)
                        return findIdentifier(child);
                }
                return undefined;
            }
        }
    };
})();

class DiagnosticMessageChain {
    _compilerObject;
    constructor(compilerObject) {
        this._compilerObject = compilerObject;
    }
    get compilerObject() {
        return this._compilerObject;
    }
    getMessageText() {
        return this.compilerObject.messageText;
    }
    getNext() {
        const next = this.compilerObject.next;
        if (next == null)
            return undefined;
        if (next instanceof Array)
            return next.map(n => new DiagnosticMessageChain(n));
        return [new DiagnosticMessageChain(next)];
    }
    getCode() {
        return this.compilerObject.code;
    }
    getCategory() {
        return this.compilerObject.category;
    }
}

let Diagnostic = (() => {
    let _instanceExtraInitializers = [];
    let _getSourceFile_decorators;
    return class Diagnostic {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getSourceFile_decorators = [common.Memoize];
            __esDecorate(this, null, _getSourceFile_decorators, { kind: "method", name: "getSourceFile", static: false, private: false, access: { has: obj => "getSourceFile" in obj, get: obj => obj.getSourceFile }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        _context = __runInitializers(this, _instanceExtraInitializers);
        _compilerObject;
        constructor(context, compilerObject) {
            this._context = context;
            this._compilerObject = compilerObject;
            this.getSourceFile();
        }
        get compilerObject() {
            return this._compilerObject;
        }
        getSourceFile() {
            if (this._context == null)
                return undefined;
            const file = this.compilerObject.file;
            return file == null ? undefined : this._context.compilerFactory.getSourceFile(file, { markInProject: false });
        }
        getMessageText() {
            const messageText = this._compilerObject.messageText;
            if (typeof messageText === "string")
                return messageText;
            if (this._context == null)
                return new DiagnosticMessageChain(messageText);
            else
                return this._context.compilerFactory.getDiagnosticMessageChain(messageText);
        }
        getLineNumber() {
            const sourceFile = this.getSourceFile();
            const start = this.getStart();
            if (sourceFile == null || start == null)
                return undefined;
            return common.StringUtils.getLineNumberAtPos(sourceFile.getFullText(), start);
        }
        getStart() {
            return this.compilerObject.start;
        }
        getLength() {
            return this.compilerObject.length;
        }
        getCategory() {
            return this.compilerObject.category;
        }
        getCode() {
            return this.compilerObject.code;
        }
        getSource() {
            return this.compilerObject.source;
        }
    };
})();

class DiagnosticWithLocation extends Diagnostic {
    constructor(context, compilerObject) {
        super(context, compilerObject);
    }
    getLineNumber() {
        return super.getLineNumber();
    }
    getStart() {
        return super.getStart();
    }
    getLength() {
        return super.getLength();
    }
    getSourceFile() {
        return super.getSourceFile();
    }
}

class OutputFile {
    #compilerObject;
    #context;
    constructor(context, compilerObject) {
        this.#compilerObject = compilerObject;
        this.#context = context;
    }
    get compilerObject() {
        return this.#compilerObject;
    }
    getFilePath() {
        return this.#context.fileSystemWrapper.getStandardizedAbsolutePath(this.compilerObject.name);
    }
    getWriteByteOrderMark() {
        return this.compilerObject.writeByteOrderMark || false;
    }
    getText() {
        return this.compilerObject.text;
    }
}

let EmitOutput = (() => {
    let _instanceExtraInitializers = [];
    let _getDiagnostics_decorators;
    let _getOutputFiles_decorators;
    return class EmitOutput {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getDiagnostics_decorators = [common.Memoize];
            _getOutputFiles_decorators = [common.Memoize];
            __esDecorate(this, null, _getDiagnostics_decorators, { kind: "method", name: "getDiagnostics", static: false, private: false, access: { has: obj => "getDiagnostics" in obj, get: obj => obj.getDiagnostics }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getOutputFiles_decorators, { kind: "method", name: "getOutputFiles", static: false, private: false, access: { has: obj => "getOutputFiles" in obj, get: obj => obj.getOutputFiles }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #context = __runInitializers(this, _instanceExtraInitializers);
        #compilerObject;
        constructor(context, compilerObject) {
            this.#context = context;
            this.#compilerObject = compilerObject;
        }
        get compilerObject() {
            return this.#compilerObject;
        }
        getDiagnostics() {
            return this.compilerObject.diagnostics.map(d => this.#context.compilerFactory.getDiagnostic(d));
        }
        getEmitSkipped() {
            return this.compilerObject.emitSkipped;
        }
        getOutputFiles() {
            return this.compilerObject.outputFiles.map(f => new OutputFile(this.#context, f));
        }
    };
})();

let EmitResult = (() => {
    let _instanceExtraInitializers = [];
    let _getDiagnostics_decorators;
    return class EmitResult {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getDiagnostics_decorators = [common.Memoize];
            __esDecorate(this, null, _getDiagnostics_decorators, { kind: "method", name: "getDiagnostics", static: false, private: false, access: { has: obj => "getDiagnostics" in obj, get: obj => obj.getDiagnostics }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        _context = __runInitializers(this, _instanceExtraInitializers);
        _compilerObject;
        constructor(context, compilerObject) {
            this._context = context;
            this._compilerObject = compilerObject;
            this.getDiagnostics();
        }
        get compilerObject() {
            return this._compilerObject;
        }
        getEmitSkipped() {
            return this.compilerObject.emitSkipped;
        }
        getDiagnostics() {
            return this.compilerObject.diagnostics.map(d => this._context.compilerFactory.getDiagnostic(d));
        }
    };
})();

let ImplementationLocation = (() => {
    let _classSuper = DocumentSpan;
    let _instanceExtraInitializers = [];
    let _getDisplayParts_decorators;
    return class ImplementationLocation extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _getDisplayParts_decorators = [common.Memoize];
            __esDecorate(this, null, _getDisplayParts_decorators, { kind: "method", name: "getDisplayParts", static: false, private: false, access: { has: obj => "getDisplayParts" in obj, get: obj => obj.getDisplayParts }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(context, compilerObject) {
            super(context, compilerObject);
            __runInitializers(this, _instanceExtraInitializers);
        }
        getKind() {
            return this.compilerObject.kind;
        }
        getDisplayParts() {
            return this.compilerObject.displayParts.map(p => this._context.compilerFactory.getSymbolDisplayPart(p));
        }
    };
})();

class MemoryEmitResult extends EmitResult {
    #files;
    constructor(context, compilerObject, files) {
        super(context, compilerObject);
        this.#files = files;
    }
    getFiles() {
        return this.#files;
    }
    saveFiles() {
        const fileSystem = this._context.fileSystemWrapper;
        const promises = this.#files.map(f => fileSystem.writeFile(f.filePath, f.writeByteOrderMark ? "\uFEFF" + f.text : f.text));
        return Promise.all(promises);
    }
    saveFilesSync() {
        const fileSystem = this._context.fileSystemWrapper;
        for (const file of this.#files)
            fileSystem.writeFileSync(file.filePath, file.writeByteOrderMark ? "\uFEFF" + file.text : file.text);
    }
}

let RefactorEditInfo = (() => {
    let _instanceExtraInitializers = [];
    let _getEdits_decorators;
    return class RefactorEditInfo {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getEdits_decorators = [common.Memoize];
            __esDecorate(this, null, _getEdits_decorators, { kind: "method", name: "getEdits", static: false, private: false, access: { has: obj => "getEdits" in obj, get: obj => obj.getEdits }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #context = __runInitializers(this, _instanceExtraInitializers);
        #compilerObject;
        constructor(context, compilerObject) {
            this.#context = context;
            this.#compilerObject = compilerObject;
        }
        get compilerObject() {
            return this.#compilerObject;
        }
        getEdits() {
            return this.compilerObject.edits.map(edit => new FileTextChanges(this.#context, edit));
        }
        getRenameFilePath() {
            return this.compilerObject.renameFilename;
        }
        getRenameLocation() {
            return this.compilerObject.renameLocation;
        }
        applyChanges(options) {
            for (const change of this.getEdits())
                change.applyChanges(options);
            return this;
        }
    };
})();

let ReferencedSymbol = (() => {
    let _instanceExtraInitializers = [];
    let _getDefinition_decorators;
    return class ReferencedSymbol {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getDefinition_decorators = [common.Memoize];
            __esDecorate(this, null, _getDefinition_decorators, { kind: "method", name: "getDefinition", static: false, private: false, access: { has: obj => "getDefinition" in obj, get: obj => obj.getDefinition }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        _context = __runInitializers(this, _instanceExtraInitializers);
        #compilerObject;
        #references;
        constructor(context, compilerObject) {
            this._context = context;
            this.#compilerObject = compilerObject;
            this.#references = this.compilerObject.references.map(r => context.compilerFactory.getReferencedSymbolEntry(r));
        }
        get compilerObject() {
            return this.#compilerObject;
        }
        getDefinition() {
            return this._context.compilerFactory.getReferencedSymbolDefinitionInfo(this.compilerObject.definition);
        }
        getReferences() {
            return this.#references;
        }
    };
})();

let ReferencedSymbolDefinitionInfo = (() => {
    let _classSuper = DefinitionInfo;
    let _instanceExtraInitializers = [];
    let _getDisplayParts_decorators;
    return class ReferencedSymbolDefinitionInfo extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _getDisplayParts_decorators = [common.Memoize];
            __esDecorate(this, null, _getDisplayParts_decorators, { kind: "method", name: "getDisplayParts", static: false, private: false, access: { has: obj => "getDisplayParts" in obj, get: obj => obj.getDisplayParts }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(context, compilerObject) {
            super(context, compilerObject);
            __runInitializers(this, _instanceExtraInitializers);
        }
        getDisplayParts() {
            return this.compilerObject.displayParts.map(p => this._context.compilerFactory.getSymbolDisplayPart(p));
        }
    };
})();

class ReferenceEntry extends DocumentSpan {
    constructor(context, compilerObject) {
        super(context, compilerObject);
    }
    isWriteAccess() {
        return this.compilerObject.isWriteAccess;
    }
    isInString() {
        return this.compilerObject.isInString;
    }
}
class ReferencedSymbolEntry extends ReferenceEntry {
    constructor(context, compilerObject) {
        super(context, compilerObject);
    }
    isDefinition() {
        return this.compilerObject.isDefinition;
    }
}

class RenameLocation extends DocumentSpan {
    getPrefixText() {
        return this._compilerObject.prefixText;
    }
    getSuffixText() {
        return this._compilerObject.suffixText;
    }
}

class SymbolDisplayPart {
    #compilerObject;
    constructor(compilerObject) {
        this.#compilerObject = compilerObject;
    }
    get compilerObject() {
        return this.#compilerObject;
    }
    getText() {
        return this.compilerObject.text;
    }
    getKind() {
        return this.compilerObject.kind;
    }
}

class TypeChecker {
    #context;
    #getCompilerObject;
    constructor(context) {
        this.#context = context;
    }
    get compilerObject() {
        return this.#getCompilerObject();
    }
    _reset(getTypeChecker) {
        this.#getCompilerObject = getTypeChecker;
    }
    getAmbientModules() {
        return this.compilerObject.getAmbientModules().map(s => this.#context.compilerFactory.getSymbol(s));
    }
    getApparentType(type) {
        return this.#context.compilerFactory.getType(this.compilerObject.getApparentType(type.compilerType));
    }
    getAwaitedType(type) {
        const awaitedType = this.compilerObject.getAwaitedType(type.compilerType);
        return awaitedType ? this.#context.compilerFactory.getType(awaitedType) : undefined;
    }
    getConstantValue(node) {
        return this.compilerObject.getConstantValue(node.compilerNode);
    }
    getFullyQualifiedName(symbol) {
        return this.compilerObject.getFullyQualifiedName(symbol.compilerSymbol);
    }
    getTypeAtLocation(node) {
        return this.#context.compilerFactory.getType(this.compilerObject.getTypeAtLocation(node.compilerNode));
    }
    getContextualType(expression) {
        const contextualType = this.compilerObject.getContextualType(expression.compilerNode);
        return contextualType == null ? undefined : this.#context.compilerFactory.getType(contextualType);
    }
    getTypeOfSymbolAtLocation(symbol, node) {
        return this.#context.compilerFactory.getType(this.compilerObject.getTypeOfSymbolAtLocation(symbol.compilerSymbol, node.compilerNode));
    }
    getDeclaredTypeOfSymbol(symbol) {
        return this.#context.compilerFactory.getType(this.compilerObject.getDeclaredTypeOfSymbol(symbol.compilerSymbol));
    }
    getSymbolAtLocation(node) {
        const compilerSymbol = this.compilerObject.getSymbolAtLocation(node.compilerNode);
        return compilerSymbol == null ? undefined : this.#context.compilerFactory.getSymbol(compilerSymbol);
    }
    getAliasedSymbol(symbol) {
        if (!symbol.hasFlags(common.SymbolFlags.Alias))
            return undefined;
        const tsAliasSymbol = this.compilerObject.getAliasedSymbol(symbol.compilerSymbol);
        return tsAliasSymbol == null ? undefined : this.#context.compilerFactory.getSymbol(tsAliasSymbol);
    }
    getImmediatelyAliasedSymbol(symbol) {
        const tsAliasSymbol = this.compilerObject.getImmediateAliasedSymbol(symbol.compilerSymbol);
        return tsAliasSymbol == null ? undefined : this.#context.compilerFactory.getSymbol(tsAliasSymbol);
    }
    getExportSymbolOfSymbol(symbol) {
        return this.#context.compilerFactory.getSymbol(this.compilerObject.getExportSymbolOfSymbol(symbol.compilerSymbol));
    }
    getPropertiesOfType(type) {
        return this.compilerObject.getPropertiesOfType(type.compilerType).map(p => this.#context.compilerFactory.getSymbol(p));
    }
    getTypeText(type, enclosingNode, typeFormatFlags) {
        if (typeFormatFlags == null)
            typeFormatFlags = this.#getDefaultTypeFormatFlags(enclosingNode);
        return this.compilerObject.typeToString(type.compilerType, enclosingNode?.compilerNode, typeFormatFlags);
    }
    getReturnTypeOfSignature(signature) {
        return this.#context.compilerFactory.getType(this.compilerObject.getReturnTypeOfSignature(signature.compilerSignature));
    }
    getSignatureFromNode(node) {
        const signature = this.compilerObject.getSignatureFromDeclaration(node.compilerNode);
        return signature == null ? undefined : this.#context.compilerFactory.getSignature(signature);
    }
    getExportsOfModule(moduleSymbol) {
        const symbols = this.compilerObject.getExportsOfModule(moduleSymbol.compilerSymbol);
        return (symbols || []).map(s => this.#context.compilerFactory.getSymbol(s));
    }
    getExportSpecifierLocalTargetSymbol(exportSpecifier) {
        const symbol = this.compilerObject.getExportSpecifierLocalTargetSymbol(exportSpecifier.compilerNode);
        return symbol == null ? undefined : this.#context.compilerFactory.getSymbol(symbol);
    }
    getResolvedSignature(node) {
        const resolvedSignature = this.compilerObject.getResolvedSignature(node.compilerNode);
        if (!resolvedSignature || !resolvedSignature.declaration)
            return undefined;
        return this.#context.compilerFactory.getSignature(resolvedSignature);
    }
    getResolvedSignatureOrThrow(node, message) {
        return common.errors.throwIfNullOrUndefined(this.getResolvedSignature(node), message ?? "Signature could not be resolved.", node);
    }
    getBaseTypeOfLiteralType(type) {
        return this.#context.compilerFactory.getType(this.compilerObject.getBaseTypeOfLiteralType(type.compilerType));
    }
    getSymbolsInScope(node, meaning) {
        return this.compilerObject.getSymbolsInScope(node.compilerNode, meaning)
            .map(s => this.#context.compilerFactory.getSymbol(s));
    }
    getTypeArguments(typeReference) {
        return this.compilerObject.getTypeArguments(typeReference.compilerType)
            .map(arg => this.#context.compilerFactory.getType(arg));
    }
    isTypeAssignableTo(sourceType, targetType) {
        return this.compilerObject.isTypeAssignableTo(sourceType.compilerType, targetType.compilerType);
    }
    #getDefaultTypeFormatFlags(enclosingNode) {
        let formatFlags = (common.TypeFormatFlags.UseTypeOfFunction | common.TypeFormatFlags.NoTruncation | common.TypeFormatFlags.UseFullyQualifiedType
            | common.TypeFormatFlags.WriteTypeArgumentsOfSignature);
        if (enclosingNode != null && enclosingNode.getKind() === common.SyntaxKind.TypeAliasDeclaration)
            formatFlags |= common.TypeFormatFlags.InTypeAlias;
        return formatFlags;
    }
    getShorthandAssignmentValueSymbol(node) {
        const symbol = this.compilerObject.getShorthandAssignmentValueSymbol(node.compilerNode);
        return symbol ? this.#context.compilerFactory.getSymbol(symbol) : undefined;
    }
    resolveName(name, location, meaning, excludeGlobals) {
        const symbol = this.compilerObject.resolveName(name, location?.compilerNode, meaning, excludeGlobals);
        return symbol ? this.#context.compilerFactory.getSymbol(symbol) : undefined;
    }
}

class Program {
    #context;
    #typeChecker;
    #createdCompilerObject;
    #oldProgram;
    #getOrCreateCompilerObject;
    #configFileParsingDiagnostics;
    constructor(opts) {
        this.#context = opts.context;
        this.#configFileParsingDiagnostics = opts.configFileParsingDiagnostics;
        this.#typeChecker = new TypeChecker(this.#context);
        this._reset(opts.rootNames, opts.host);
    }
    get compilerObject() {
        return this.#getOrCreateCompilerObject();
    }
    _isCompilerProgramCreated() {
        return this.#createdCompilerObject != null;
    }
    _reset(rootNames, host) {
        const compilerOptions = this.#context.compilerOptions.get();
        this.#getOrCreateCompilerObject = () => {
            if (this.#createdCompilerObject == null) {
                this.#createdCompilerObject = common.ts.createProgram(rootNames, compilerOptions, host, this.#oldProgram, this.#configFileParsingDiagnostics);
                this.#oldProgram = undefined;
            }
            return this.#createdCompilerObject;
        };
        if (this.#createdCompilerObject != null) {
            this.#oldProgram = this.#createdCompilerObject;
            this.#createdCompilerObject = undefined;
        }
        this.#typeChecker._reset(() => this.compilerObject.getTypeChecker());
    }
    getTypeChecker() {
        return this.#typeChecker;
    }
    async emit(options = {}) {
        if (options.writeFile) {
            const message = `Cannot specify a ${common.nameof(options, "writeFile")} option when emitting asynchrously. `
                + `Use ${common.nameof(this, "emitSync")}() instead.`;
            throw new common.errors.InvalidOperationError(message);
        }
        const { fileSystemWrapper } = this.#context;
        const promises = [];
        const emitResult = this.#emit({
            writeFile: (filePath, text, writeByteOrderMark) => {
                promises
                    .push(fileSystemWrapper.writeFile(fileSystemWrapper.getStandardizedAbsolutePath(filePath), writeByteOrderMark ? "\uFEFF" + text : text));
            },
            ...options,
        });
        await Promise.all(promises);
        return new EmitResult(this.#context, emitResult);
    }
    emitSync(options = {}) {
        return new EmitResult(this.#context, this.#emit(options));
    }
    emitToMemory(options = {}) {
        const sourceFiles = [];
        const { fileSystemWrapper } = this.#context;
        const emitResult = this.#emit({
            writeFile: (filePath, text, writeByteOrderMark) => {
                sourceFiles.push({
                    filePath: fileSystemWrapper.getStandardizedAbsolutePath(filePath),
                    text,
                    writeByteOrderMark: writeByteOrderMark || false,
                });
            },
            ...options,
        });
        return new MemoryEmitResult(this.#context, emitResult, sourceFiles);
    }
    #emit(options = {}) {
        const targetSourceFile = options.targetSourceFile != null ? options.targetSourceFile.compilerNode : undefined;
        const { emitOnlyDtsFiles, customTransformers, writeFile } = options;
        const cancellationToken = undefined;
        return this.compilerObject.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    }
    getSyntacticDiagnostics(sourceFile) {
        const compilerDiagnostics = this.compilerObject.getSyntacticDiagnostics(sourceFile == null ? undefined : sourceFile.compilerNode);
        return compilerDiagnostics.map(d => this.#context.compilerFactory.getDiagnosticWithLocation(d));
    }
    getSemanticDiagnostics(sourceFile) {
        const compilerDiagnostics = this.compilerObject.getSemanticDiagnostics(sourceFile?.compilerNode);
        return compilerDiagnostics.map(d => this.#context.compilerFactory.getDiagnostic(d));
    }
    getDeclarationDiagnostics(sourceFile) {
        const compilerDiagnostics = this.compilerObject.getDeclarationDiagnostics(sourceFile?.compilerNode);
        return compilerDiagnostics.map(d => this.#context.compilerFactory.getDiagnosticWithLocation(d));
    }
    getGlobalDiagnostics() {
        const compilerDiagnostics = this.compilerObject.getGlobalDiagnostics();
        return compilerDiagnostics.map(d => this.#context.compilerFactory.getDiagnostic(d));
    }
    getConfigFileParsingDiagnostics() {
        const compilerDiagnostics = this.compilerObject.getConfigFileParsingDiagnostics();
        return compilerDiagnostics.map(d => this.#context.compilerFactory.getDiagnostic(d));
    }
    getEmitModuleResolutionKind() {
        return common.getEmitModuleResolutionKind(this.compilerObject.getCompilerOptions());
    }
    isSourceFileFromExternalLibrary(sourceFile) {
        return sourceFile.isFromExternalLibrary();
    }
}

class LanguageService {
    #compilerObject;
    #compilerHost;
    #program;
    #context;
    #projectVersion = 0;
    get compilerObject() {
        return this.#compilerObject;
    }
    constructor(params) {
        this.#context = params.context;
        const { languageServiceHost, compilerHost } = common.createHosts({
            transactionalFileSystem: this.#context.fileSystemWrapper,
            sourceFileContainer: this.#context.getSourceFileContainer(),
            compilerOptions: this.#context.compilerOptions,
            getNewLine: () => this.#context.manipulationSettings.getNewLineKindAsString(),
            getProjectVersion: () => `${this.#projectVersion}`,
            resolutionHost: params.resolutionHost ?? {},
            libFolderPath: params.libFolderPath,
            skipLoadingLibFiles: params.skipLoadingLibFiles,
        });
        this.#compilerHost = compilerHost;
        this.#compilerObject = common.ts.createLanguageService(languageServiceHost, this.#context.compilerFactory.documentRegistry);
        this.#program = new Program({
            context: this.#context,
            rootNames: Array.from(this.#context.compilerFactory.getSourceFilePaths()),
            host: this.#compilerHost,
            configFileParsingDiagnostics: params.configFileParsingDiagnostics,
        });
        this.#context.compilerFactory.onSourceFileAdded(sourceFile => {
            if (sourceFile._isInProject())
                this._reset();
        });
        this.#context.compilerFactory.onSourceFileRemoved(() => this._reset());
    }
    _reset() {
        this.#projectVersion += 1;
        this.#program._reset(Array.from(this.#context.compilerFactory.getSourceFilePaths()), this.#compilerHost);
    }
    getProgram() {
        return this.#program;
    }
    getDefinitions(node) {
        return this.getDefinitionsAtPosition(node._sourceFile, node.getStart());
    }
    getDefinitionsAtPosition(sourceFile, pos) {
        const results = this.compilerObject.getDefinitionAtPosition(sourceFile.getFilePath(), pos) || [];
        return results.map(info => this.#context.compilerFactory.getDefinitionInfo(info));
    }
    getImplementations(node) {
        return this.getImplementationsAtPosition(node._sourceFile, node.getStart());
    }
    getImplementationsAtPosition(sourceFile, pos) {
        const results = this.compilerObject.getImplementationAtPosition(sourceFile.getFilePath(), pos) || [];
        return results.map(location => new ImplementationLocation(this.#context, location));
    }
    findReferences(node) {
        return this.findReferencesAtPosition(node._sourceFile, node.getStart());
    }
    findReferencesAsNodes(node) {
        const referencedSymbols = this.findReferences(node);
        return Array.from(getReferencingNodes());
        function* getReferencingNodes() {
            for (const referencedSymbol of referencedSymbols) {
                const isAlias = referencedSymbol.getDefinition().getKind() === common.ts.ScriptElementKind.alias;
                const references = referencedSymbol.getReferences();
                for (let i = 0; i < references.length; i++) {
                    const reference = references[i];
                    if (isAlias || !reference.isDefinition() || i > 0)
                        yield reference.getNode();
                }
            }
        }
    }
    findReferencesAtPosition(sourceFile, pos) {
        const results = this.compilerObject.findReferences(sourceFile.getFilePath(), pos) || [];
        return results.map(s => this.#context.compilerFactory.getReferencedSymbol(s));
    }
    findRenameLocations(node, options = {}) {
        const usePrefixAndSuffixText = options.usePrefixAndSuffixText == null
            ? this.#context.manipulationSettings.getUsePrefixAndSuffixTextForRename()
            : options.usePrefixAndSuffixText;
        const renameLocations = this.compilerObject.findRenameLocations(node._sourceFile.getFilePath(), node.getStart(), options.renameInStrings || false, options.renameInComments || false, usePrefixAndSuffixText) || [];
        return renameLocations.map(l => new RenameLocation(this.#context, l));
    }
    getSuggestionDiagnostics(filePathOrSourceFile) {
        const filePath = this.#getFilePathFromFilePathOrSourceFile(filePathOrSourceFile);
        const suggestionDiagnostics = this.compilerObject.getSuggestionDiagnostics(filePath);
        return suggestionDiagnostics.map(d => this.#context.compilerFactory.getDiagnosticWithLocation(d));
    }
    getFormattingEditsForRange(filePath, range, formatSettings) {
        return (this.compilerObject.getFormattingEditsForRange(filePath, range[0], range[1], this.#getFilledSettings(formatSettings)) || []).map(e => new TextChange(e));
    }
    getFormattingEditsForDocument(filePath, formatSettings) {
        const standardizedFilePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePath);
        return (this.compilerObject.getFormattingEditsForDocument(standardizedFilePath, this.#getFilledSettings(formatSettings)) || [])
            .map(e => new TextChange(e));
    }
    getFormattedDocumentText(filePath, formatSettings) {
        const standardizedFilePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePath);
        const sourceFile = this.#context.compilerFactory.getSourceFileFromCacheFromFilePath(standardizedFilePath);
        if (sourceFile == null)
            throw new common.errors.FileNotFoundError(standardizedFilePath);
        formatSettings = this.#getFilledSettings(formatSettings);
        const formattingEdits = this.getFormattingEditsForDocument(standardizedFilePath, formatSettings);
        let newText = getTextFromTextChanges(sourceFile, formattingEdits);
        const newLineChar = formatSettings.newLineCharacter;
        if (formatSettings.ensureNewLineAtEndOfFile && !newText.endsWith(newLineChar))
            newText += newLineChar;
        return newText.replace(/\r?\n/g, newLineChar);
    }
    getEmitOutput(filePathOrSourceFile, emitOnlyDtsFiles) {
        const filePath = this.#getFilePathFromFilePathOrSourceFile(filePathOrSourceFile);
        const compilerObject = this.compilerObject;
        return new EmitOutput(this.#context, getCompilerEmitOutput());
        function getCompilerEmitOutput() {
            const program = compilerObject.getProgram();
            if (program == null || program.getSourceFile(filePath) == null)
                return { emitSkipped: true, outputFiles: [], diagnostics: [] };
            return compilerObject.getEmitOutput(filePath, emitOnlyDtsFiles);
        }
    }
    getIdentationAtPosition(filePathOrSourceFile, position, settings) {
        const filePath = this.#getFilePathFromFilePathOrSourceFile(filePathOrSourceFile);
        if (settings == null)
            settings = this.#context.manipulationSettings.getEditorSettings();
        else
            fillDefaultEditorSettings(settings, this.#context.manipulationSettings);
        return this.compilerObject.getIndentationAtPosition(filePath, position, settings);
    }
    organizeImports(filePathOrSourceFile, formatSettings = {}, userPreferences = {}) {
        const scope = {
            type: "file",
            fileName: this.#getFilePathFromFilePathOrSourceFile(filePathOrSourceFile),
        };
        return this.compilerObject.organizeImports(scope, this.#getFilledSettings(formatSettings), this.#getFilledUserPreferences(userPreferences))
            .map(fileTextChanges => new FileTextChanges(this.#context, fileTextChanges));
    }
    getEditsForRefactor(filePathOrSourceFile, formatSettings, positionOrRange, refactorName, actionName, preferences = {}) {
        const filePath = this.#getFilePathFromFilePathOrSourceFile(filePathOrSourceFile);
        const position = typeof positionOrRange === "number" ? positionOrRange : { pos: positionOrRange.getPos(), end: positionOrRange.getEnd() };
        const compilerObject = this.compilerObject.getEditsForRefactor(filePath, this.#getFilledSettings(formatSettings), position, refactorName, actionName, this.#getFilledUserPreferences(preferences));
        return compilerObject != null ? new RefactorEditInfo(this.#context, compilerObject) : undefined;
    }
    getCombinedCodeFix(filePathOrSourceFile, fixId, formatSettings = {}, preferences = {}) {
        const compilerResult = this.compilerObject.getCombinedCodeFix({
            type: "file",
            fileName: this.#getFilePathFromFilePathOrSourceFile(filePathOrSourceFile),
        }, fixId, this.#getFilledSettings(formatSettings), this.#getFilledUserPreferences(preferences || {}));
        return new CombinedCodeActions(this.#context, compilerResult);
    }
    getCodeFixesAtPosition(filePathOrSourceFile, start, end, errorCodes, formatOptions = {}, preferences = {}) {
        const filePath = this.#getFilePathFromFilePathOrSourceFile(filePathOrSourceFile);
        const compilerResult = this.compilerObject.getCodeFixesAtPosition(filePath, start, end, errorCodes, this.#getFilledSettings(formatOptions), this.#getFilledUserPreferences(preferences || {}));
        return compilerResult.map(compilerObject => new CodeFixAction(this.#context, compilerObject));
    }
    #getFilePathFromFilePathOrSourceFile(filePathOrSourceFile) {
        const filePath = typeof filePathOrSourceFile === "string"
            ? this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePathOrSourceFile)
            : filePathOrSourceFile.getFilePath();
        if (!this.#context.compilerFactory.containsSourceFileAtPath(filePath))
            throw new common.errors.FileNotFoundError(filePath);
        return filePath;
    }
    #getFilledSettings(settings) {
        if (settings["_filled"])
            return settings;
        settings = Object.assign(this.#context.getFormatCodeSettings(), settings);
        fillDefaultFormatCodeSettings(settings, this.#context.manipulationSettings);
        settings["_filled"] = true;
        return settings;
    }
    #getFilledUserPreferences(userPreferences) {
        return Object.assign(this.#context.getUserPreferences(), userPreferences);
    }
}

class Type {
    _context;
    #compilerType;
    get compilerType() {
        return this.#compilerType;
    }
    constructor(context, type) {
        this._context = context;
        this.#compilerType = type;
    }
    getText(enclosingNode, typeFormatFlags) {
        return this._context.typeChecker.getTypeText(this, enclosingNode, typeFormatFlags);
    }
    getAliasSymbol() {
        return this.compilerType.aliasSymbol == null ? undefined : this._context.compilerFactory.getSymbol(this.compilerType.aliasSymbol);
    }
    getAliasSymbolOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getAliasSymbol(), "Expected to find an alias symbol.");
    }
    getAliasTypeArguments() {
        const aliasTypeArgs = this.compilerType.aliasTypeArguments || [];
        return aliasTypeArgs.map(t => this._context.compilerFactory.getType(t));
    }
    getApparentType() {
        return this._context.typeChecker.getApparentType(this);
    }
    getAwaitedType() {
        return this._context.typeChecker.getAwaitedType(this);
    }
    getArrayElementTypeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getArrayElementType(), message ?? "Expected to find an array element type.");
    }
    getArrayElementType() {
        if (!this.isArray())
            return undefined;
        return this.getTypeArguments()[0];
    }
    getBaseTypes() {
        const baseTypes = this.compilerType.getBaseTypes() || [];
        return baseTypes.map(t => this._context.compilerFactory.getType(t));
    }
    getBaseTypeOfLiteralType() {
        return this._context.typeChecker.getBaseTypeOfLiteralType(this);
    }
    getCallSignatures() {
        return this.compilerType.getCallSignatures().map(s => this._context.compilerFactory.getSignature(s));
    }
    getConstructSignatures() {
        return this.compilerType.getConstructSignatures().map(s => this._context.compilerFactory.getSignature(s));
    }
    getConstraintOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getConstraint(), message ?? "Expected to find a constraint.");
    }
    getConstraint() {
        const constraint = this.compilerType.getConstraint();
        return constraint == null ? undefined : this._context.compilerFactory.getType(constraint);
    }
    getDefaultOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getDefault(), message ?? "Expected to find a default type.");
    }
    getDefault() {
        const defaultType = this.compilerType.getDefault();
        return defaultType == null ? undefined : this._context.compilerFactory.getType(defaultType);
    }
    getProperties() {
        return this.compilerType.getProperties().map(s => this._context.compilerFactory.getSymbol(s));
    }
    getPropertyOrThrow(nameOrFindFunction) {
        return common.errors.throwIfNullOrUndefined(this.getProperty(nameOrFindFunction), () => getNotFoundErrorMessageForNameOrFindFunction("symbol property", nameOrFindFunction));
    }
    getProperty(nameOrFindFunction) {
        return getSymbolByNameOrFindFunction(this.getProperties(), nameOrFindFunction);
    }
    getApparentProperties() {
        return this.compilerType.getApparentProperties().map(s => this._context.compilerFactory.getSymbol(s));
    }
    getApparentProperty(nameOrFindFunction) {
        return getSymbolByNameOrFindFunction(this.getApparentProperties(), nameOrFindFunction);
    }
    isNullable() {
        return this.getUnionTypes().some(t => t.isNull() || t.isUndefined());
    }
    getNonNullableType() {
        return this._context.compilerFactory.getType(this.compilerType.getNonNullableType());
    }
    getNumberIndexType() {
        const numberIndexType = this.compilerType.getNumberIndexType();
        return numberIndexType == null ? undefined : this._context.compilerFactory.getType(numberIndexType);
    }
    getStringIndexType() {
        const stringIndexType = this.compilerType.getStringIndexType();
        return stringIndexType == null ? undefined : this._context.compilerFactory.getType(stringIndexType);
    }
    getTargetType() {
        const targetType = this.compilerType.target || undefined;
        return targetType == null ? undefined : this._context.compilerFactory.getType(targetType);
    }
    getTargetTypeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getTargetType(), message ?? "Expected to find the target type.");
    }
    getTypeArguments() {
        return this._context.typeChecker.getTypeArguments(this);
    }
    getTupleElements() {
        return this.isTuple() ? this.getTypeArguments() : [];
    }
    getUnionTypes() {
        if (!this.isUnion())
            return [];
        return this.compilerType.types.map(t => this._context.compilerFactory.getType(t));
    }
    getIntersectionTypes() {
        if (!this.isIntersection())
            return [];
        return this.compilerType.types.map(t => this._context.compilerFactory.getType(t));
    }
    getLiteralValue() {
        return this.compilerType?.value;
    }
    getLiteralValueOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getLiteralValue(), message ?? "Type was not a literal type.");
    }
    getLiteralFreshType() {
        const type = this.compilerType?.freshType;
        return type == null ? undefined : this._context.compilerFactory.getType(type);
    }
    getLiteralFreshTypeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getLiteralFreshType(), message ?? "Type was not a literal type.");
    }
    getLiteralRegularType() {
        const type = this.compilerType?.regularType;
        return type == null ? undefined : this._context.compilerFactory.getType(type);
    }
    getLiteralRegularTypeOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getLiteralRegularType(), message ?? "Type was not a literal type.");
    }
    getSymbol() {
        const tsSymbol = this.compilerType.getSymbol();
        return tsSymbol == null ? undefined : this._context.compilerFactory.getSymbol(tsSymbol);
    }
    getSymbolOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getSymbol(), message ?? "Expected to find a symbol.");
    }
    isAssignableTo(target) {
        return this._context.typeChecker.isTypeAssignableTo(this, target);
    }
    isAnonymous() {
        return this.#hasObjectFlag(common.ObjectFlags.Anonymous);
    }
    isAny() {
        return this.#hasTypeFlag(common.TypeFlags.Any);
    }
    isNever() {
        return this.#hasTypeFlag(common.TypeFlags.Never);
    }
    isArray() {
        const symbol = this.getSymbol();
        if (symbol == null)
            return false;
        return (symbol.getName() === "Array" || symbol.getName() === "ReadonlyArray") && this.getTypeArguments().length === 1;
    }
    isReadonlyArray() {
        const symbol = this.getSymbol();
        if (symbol == null)
            return false;
        return symbol.getName() === "ReadonlyArray" && this.getTypeArguments().length === 1;
    }
    isTemplateLiteral() {
        return this.#hasTypeFlag(common.TypeFlags.TemplateLiteral);
    }
    isBoolean() {
        return this.#hasTypeFlag(common.TypeFlags.Boolean);
    }
    isString() {
        return this.#hasTypeFlag(common.TypeFlags.String);
    }
    isNumber() {
        return this.#hasTypeFlag(common.TypeFlags.Number);
    }
    isBigInt() {
        return this.#hasTypeFlag(common.TypeFlags.BigInt);
    }
    isLiteral() {
        const isBooleanLiteralForTs3_0 = this.isBooleanLiteral();
        return this.compilerType.isLiteral() || isBooleanLiteralForTs3_0;
    }
    isBooleanLiteral() {
        return this.#hasTypeFlag(common.TypeFlags.BooleanLiteral);
    }
    isBigIntLiteral() {
        return this.#hasTypeFlag(common.TypeFlags.BigIntLiteral);
    }
    isEnumLiteral() {
        return this.#hasTypeFlag(common.TypeFlags.EnumLiteral) && !this.isUnion();
    }
    isNumberLiteral() {
        return this.#hasTypeFlag(common.TypeFlags.NumberLiteral);
    }
    isStringLiteral() {
        return this.compilerType.isStringLiteral();
    }
    isClass() {
        return this.compilerType.isClass();
    }
    isClassOrInterface() {
        return this.compilerType.isClassOrInterface();
    }
    isEnum() {
        const hasEnumFlag = this.#hasTypeFlag(common.TypeFlags.Enum);
        if (hasEnumFlag)
            return true;
        if (this.isEnumLiteral() && !this.isUnion())
            return false;
        const symbol = this.getSymbol();
        if (symbol == null)
            return false;
        const valueDeclaration = symbol.getValueDeclaration();
        return valueDeclaration != null && Node.isEnumDeclaration(valueDeclaration);
    }
    isInterface() {
        return this.#hasObjectFlag(common.ObjectFlags.Interface);
    }
    isObject() {
        return this.#hasTypeFlag(common.TypeFlags.Object);
    }
    isTypeParameter() {
        return this.compilerType.isTypeParameter();
    }
    isTuple() {
        const targetType = this.getTargetType();
        if (targetType == null)
            return false;
        return targetType.#hasObjectFlag(common.ObjectFlags.Tuple);
    }
    isUnion() {
        return this.compilerType.isUnion();
    }
    isIntersection() {
        return this.compilerType.isIntersection();
    }
    isUnionOrIntersection() {
        return this.compilerType.isUnionOrIntersection();
    }
    isUnknown() {
        return this.#hasTypeFlag(common.TypeFlags.Unknown);
    }
    isNull() {
        return this.#hasTypeFlag(common.TypeFlags.Null);
    }
    isUndefined() {
        return this.#hasTypeFlag(common.TypeFlags.Undefined);
    }
    isVoid() {
        return this.#hasTypeFlag(common.TypeFlags.Void);
    }
    getFlags() {
        return this.compilerType.flags;
    }
    getObjectFlags() {
        if (!this.isObject())
            return 0;
        return this.compilerType.objectFlags || 0;
    }
    #hasTypeFlag(flag) {
        return (this.compilerType.flags & flag) === flag;
    }
    #hasObjectFlag(flag) {
        return (this.getObjectFlags() & flag) === flag;
    }
}

class TypeParameter extends Type {
    getConstraintOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getConstraint(), message ?? "Expected type parameter to have a constraint.");
    }
    getConstraint() {
        const declaration = this.#getTypeParameterDeclaration();
        if (declaration == null)
            return undefined;
        const constraintNode = declaration.getConstraint();
        if (constraintNode == null)
            return undefined;
        return this._context.typeChecker.getTypeAtLocation(constraintNode);
    }
    getDefaultOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getDefault(), message ?? "Expected type parameter to have a default type.");
    }
    getDefault() {
        const declaration = this.#getTypeParameterDeclaration();
        if (declaration == null)
            return undefined;
        const defaultNode = declaration.getDefault();
        if (defaultNode == null)
            return undefined;
        return this._context.typeChecker.getTypeAtLocation(defaultNode);
    }
    #getTypeParameterDeclaration() {
        const symbol = this.getSymbol();
        if (symbol == null)
            return undefined;
        const declaration = symbol.getDeclarations()[0];
        if (declaration == null)
            return undefined;
        if (!Node.isTypeParameterDeclaration(declaration))
            return undefined;
        return declaration;
    }
}

class DirectoryEmitResult {
    #outputFilePaths;
    #skippedFilePaths;
    constructor(skippedFilePaths, outputFilePaths) {
        this.#skippedFilePaths = skippedFilePaths;
        this.#outputFilePaths = outputFilePaths;
    }
    getSkippedFilePaths() {
        return this.#skippedFilePaths;
    }
    getOutputFilePaths() {
        return this.#outputFilePaths;
    }
}

class Directory {
    #context;
    #path;
    #pathParts;
    constructor(context, path) {
        this.#context = context;
        this._setPathInternal(path);
    }
    _setPathInternal(path) {
        this.#path = path;
        this.#pathParts = path.split("/").filter(p => p.length > 0);
    }
    get _context() {
        this.#throwIfDeletedOrRemoved();
        return this.#context;
    }
    isAncestorOf(possibleDescendant) {
        return Directory.#isAncestorOfDir(this, possibleDescendant);
    }
    isDescendantOf(possibleAncestor) {
        return Directory.#isAncestorOfDir(possibleAncestor, this);
    }
    _getDepth() {
        return this.#pathParts.length;
    }
    getPath() {
        this.#throwIfDeletedOrRemoved();
        return this.#path;
    }
    getBaseName() {
        return this.#pathParts[this.#pathParts.length - 1];
    }
    getParentOrThrow(message) {
        return common.errors.throwIfNullOrUndefined(this.getParent(), message ?? (() => `Parent directory of ${this.getPath()} does not exist or was never added.`));
    }
    getParent() {
        if (common.FileUtils.isRootDirPath(this.getPath()))
            return undefined;
        return this.addDirectoryAtPathIfExists(common.FileUtils.getDirPath(this.getPath()));
    }
    getDirectoryOrThrow(pathOrCondition) {
        return common.errors.throwIfNullOrUndefined(this.getDirectory(pathOrCondition), () => {
            if (typeof pathOrCondition === "string")
                return `Could not find a directory at path '${this._context.fileSystemWrapper.getStandardizedAbsolutePath(pathOrCondition, this.getPath())}'.`;
            return "Could not find child directory that matched condition.";
        });
    }
    getDirectory(pathOrCondition) {
        if (typeof pathOrCondition === "string") {
            const path = this._context.fileSystemWrapper.getStandardizedAbsolutePath(pathOrCondition, this.getPath());
            return this._context.compilerFactory.getDirectoryFromCache(path);
        }
        return this.getDirectories().find(pathOrCondition);
    }
    getSourceFileOrThrow(pathOrCondition) {
        return common.errors.throwIfNullOrUndefined(this.getSourceFile(pathOrCondition), () => {
            if (typeof pathOrCondition === "string") {
                const absolutePath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(pathOrCondition, this.getPath());
                return `Could not find child source file at path '${absolutePath}'.`;
            }
            return "Could not find child source file that matched condition.";
        });
    }
    getSourceFile(pathOrCondition) {
        if (typeof pathOrCondition === "string") {
            const path = this._context.fileSystemWrapper.getStandardizedAbsolutePath(pathOrCondition, this.getPath());
            return this._context.compilerFactory.getSourceFileFromCacheFromFilePath(path);
        }
        for (const sourceFile of this._getSourceFilesIterator()) {
            if (pathOrCondition(sourceFile))
                return sourceFile;
        }
        return undefined;
    }
    getDirectories() {
        return Array.from(this._getDirectoriesIterator());
    }
    _getDirectoriesIterator() {
        return this._context.compilerFactory.getChildDirectoriesOfDirectory(this.getPath());
    }
    getSourceFiles(globPatterns) {
        const { compilerFactory, fileSystemWrapper } = this._context;
        const dir = this;
        if (typeof globPatterns === "string" || globPatterns instanceof Array) {
            const finalGlobPatterns = typeof globPatterns === "string" ? [globPatterns] : globPatterns;
            return Array.from(getFilteredSourceFiles(finalGlobPatterns));
        }
        else {
            return Array.from(this._getSourceFilesIterator());
        }
        function* getFilteredSourceFiles(globPatterns) {
            const sourceFilePaths = Array.from(getSourceFilePaths());
            const matchedPaths = common.matchGlobs(sourceFilePaths, globPatterns, dir.getPath());
            for (const matchedPath of matchedPaths)
                yield compilerFactory.getSourceFileFromCacheFromFilePath(fileSystemWrapper.getStandardizedAbsolutePath(matchedPath));
            function* getSourceFilePaths() {
                for (const sourceFile of dir._getDescendantSourceFilesIterator())
                    yield sourceFile.getFilePath();
            }
        }
    }
    _getSourceFilesIterator() {
        return this._context.compilerFactory.getChildSourceFilesOfDirectory(this.getPath());
    }
    getDescendantSourceFiles() {
        return Array.from(this._getDescendantSourceFilesIterator());
    }
    *_getDescendantSourceFilesIterator() {
        for (const sourceFile of this._getSourceFilesIterator())
            yield sourceFile;
        for (const directory of this._getDirectoriesIterator())
            yield* directory._getDescendantSourceFilesIterator();
    }
    getDescendantDirectories() {
        return Array.from(this._getDescendantDirectoriesIterator());
    }
    *_getDescendantDirectoriesIterator() {
        for (const directory of this.getDirectories()) {
            yield directory;
            yield* directory._getDescendantDirectoriesIterator();
        }
    }
    addSourceFilesAtPaths(fileGlobs) {
        fileGlobs = typeof fileGlobs === "string" ? [fileGlobs] : fileGlobs;
        fileGlobs = fileGlobs.map(g => {
            if (common.FileUtils.pathIsAbsolute(g))
                return g;
            return common.FileUtils.pathJoin(this.getPath(), g);
        });
        return this._context.directoryCoordinator.addSourceFilesAtPaths(fileGlobs, { markInProject: this._isInProject() });
    }
    addDirectoryAtPathIfExists(relativeOrAbsoluteDirPath, options = {}) {
        const dirPath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(relativeOrAbsoluteDirPath, this.getPath());
        return this._context.directoryCoordinator.addDirectoryAtPathIfExists(dirPath, { ...options, markInProject: this._isInProject() });
    }
    addDirectoryAtPath(relativeOrAbsoluteDirPath, options = {}) {
        const dirPath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(relativeOrAbsoluteDirPath, this.getPath());
        return this._context.directoryCoordinator.addDirectoryAtPath(dirPath, { ...options, markInProject: this._isInProject() });
    }
    createDirectory(relativeOrAbsoluteDirPath) {
        const dirPath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(relativeOrAbsoluteDirPath, this.getPath());
        return this._context.directoryCoordinator.createDirectoryOrAddIfExists(dirPath, { markInProject: this._isInProject() });
    }
    createSourceFile(relativeFilePath, sourceFileText, options) {
        const filePath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(relativeFilePath, this.getPath());
        return this._context.compilerFactory.createSourceFile(filePath, sourceFileText || "", { ...(options || {}), markInProject: this._isInProject() });
    }
    addSourceFileAtPathIfExists(relativeFilePath) {
        const filePath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(relativeFilePath, this.getPath());
        return this._context.directoryCoordinator.addSourceFileAtPathIfExists(filePath, { markInProject: this._isInProject() });
    }
    addSourceFileAtPath(relativeFilePath) {
        const filePath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(relativeFilePath, this.getPath());
        return this._context.directoryCoordinator.addSourceFileAtPath(filePath, { markInProject: this._isInProject() });
    }
    async emit(options = {}) {
        const { fileSystemWrapper } = this._context;
        const writeTasks = [];
        const outputFilePaths = [];
        const skippedFilePaths = [];
        for (const emitResult of this.#emitInternal(options)) {
            if (isStandardizedFilePath(emitResult))
                skippedFilePaths.push(emitResult);
            else {
                writeTasks.push(fileSystemWrapper.writeFile(emitResult.filePath, emitResult.fileText));
                outputFilePaths.push(emitResult.filePath);
            }
        }
        await Promise.all(writeTasks);
        return new DirectoryEmitResult(skippedFilePaths, outputFilePaths);
    }
    emitSync(options = {}) {
        const { fileSystemWrapper } = this._context;
        const outputFilePaths = [];
        const skippedFilePaths = [];
        for (const emitResult of this.#emitInternal(options)) {
            if (isStandardizedFilePath(emitResult))
                skippedFilePaths.push(emitResult);
            else {
                fileSystemWrapper.writeFileSync(emitResult.filePath, emitResult.fileText);
                outputFilePaths.push(emitResult.filePath);
            }
        }
        return new DirectoryEmitResult(skippedFilePaths, outputFilePaths);
    }
    #emitInternal(options = {}) {
        const { emitOnlyDtsFiles = false } = options;
        const isJsFile = options.outDir == null ? undefined : /\.js$/i;
        const isMapFile = options.outDir == null ? undefined : /\.js\.map$/i;
        const isDtsFile = options.declarationDir == null && options.outDir == null ? undefined : /\.d\.ts$/i;
        const getStandardizedPath = (path) => path == null
            ? undefined
            : this._context.fileSystemWrapper.getStandardizedAbsolutePath(path, this.getPath());
        const getSubDirPath = (path, dir) => path == null
            ? undefined
            : common.FileUtils.pathJoin(path, dir.getBaseName());
        const hasDeclarationDir = this._context.compilerOptions.get().declarationDir != null || options.declarationDir != null;
        return emitDirectory(this, getStandardizedPath(options.outDir), getStandardizedPath(options.declarationDir));
        function* emitDirectory(directory, outDir, declarationDir) {
            for (const sourceFile of directory.getSourceFiles()) {
                const output = sourceFile.getEmitOutput({ emitOnlyDtsFiles });
                if (output.getEmitSkipped()) {
                    yield sourceFile.getFilePath();
                    continue;
                }
                for (const outputFile of output.getOutputFiles()) {
                    let filePath = outputFile.getFilePath();
                    const fileText = outputFile.getWriteByteOrderMark() ? common.FileUtils.getTextWithByteOrderMark(outputFile.getText()) : outputFile.getText();
                    if (outDir != null && (isJsFile.test(filePath) || isMapFile.test(filePath) || (!hasDeclarationDir && isDtsFile.test(filePath))))
                        filePath = common.FileUtils.pathJoin(outDir, common.FileUtils.getBaseName(filePath));
                    else if (declarationDir != null && isDtsFile.test(filePath))
                        filePath = common.FileUtils.pathJoin(declarationDir, common.FileUtils.getBaseName(filePath));
                    yield { filePath, fileText };
                }
            }
            for (const dir of directory.getDirectories())
                yield* emitDirectory(dir, getSubDirPath(outDir, dir), getSubDirPath(declarationDir, dir));
        }
    }
    copyToDirectory(dirPathOrDirectory, options) {
        const dirPath = typeof dirPathOrDirectory === "string" ? dirPathOrDirectory : dirPathOrDirectory.getPath();
        return this.copy(common.FileUtils.pathJoin(dirPath, this.getBaseName()), options);
    }
    copy(relativeOrAbsolutePath, options) {
        const originalPath = this.getPath();
        const fileSystem = this._context.fileSystemWrapper;
        const newPath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(relativeOrAbsolutePath, this.getPath());
        if (originalPath === newPath)
            return this;
        options = getDirectoryCopyOptions(options);
        if (options.includeUntrackedFiles)
            fileSystem.queueCopyDirectory(originalPath, newPath);
        return this.#copyInternal(newPath, options);
    }
    async copyImmediately(relativeOrAbsolutePath, options) {
        const fileSystem = this._context.fileSystemWrapper;
        const originalPath = this.getPath();
        const newPath = fileSystem.getStandardizedAbsolutePath(relativeOrAbsolutePath, originalPath);
        if (originalPath === newPath) {
            await this.save();
            return this;
        }
        options = getDirectoryCopyOptions(options);
        const newDir = this.#copyInternal(newPath, options);
        if (options.includeUntrackedFiles)
            await fileSystem.copyDirectoryImmediately(originalPath, newPath);
        await newDir.save();
        return newDir;
    }
    copyImmediatelySync(relativeOrAbsolutePath, options) {
        const fileSystem = this._context.fileSystemWrapper;
        const originalPath = this.getPath();
        const newPath = fileSystem.getStandardizedAbsolutePath(relativeOrAbsolutePath, originalPath);
        if (originalPath === newPath) {
            this.saveSync();
            return this;
        }
        options = getDirectoryCopyOptions(options);
        const newDir = this.#copyInternal(newPath, options);
        if (options.includeUntrackedFiles)
            fileSystem.copyDirectoryImmediatelySync(originalPath, newPath);
        newDir.saveSync();
        return newDir;
    }
    #copyInternal(newPath, options) {
        const originalPath = this.getPath();
        if (originalPath === newPath)
            return this;
        const { fileSystemWrapper: fileSystem, compilerFactory } = this._context;
        const copyingDirectories = [this, ...this.getDescendantDirectories()].map(directory => ({
            newDirPath: directory === this ? newPath : fileSystem.getStandardizedAbsolutePath(this.getRelativePathTo(directory), newPath),
        }));
        const copyingSourceFiles = this.getDescendantSourceFiles().map(sourceFile => ({
            sourceFile,
            newFilePath: fileSystem.getStandardizedAbsolutePath(this.getRelativePathTo(sourceFile), newPath),
            references: this.#getReferencesForCopy(sourceFile),
        }));
        for (const { newDirPath } of copyingDirectories)
            this._context.compilerFactory.createDirectoryOrAddIfExists(newDirPath, { markInProject: this._isInProject() });
        for (const { sourceFile, newFilePath } of copyingSourceFiles)
            sourceFile._copyInternal(newFilePath, options);
        for (const { references, newFilePath } of copyingSourceFiles)
            this.getSourceFileOrThrow(newFilePath)._updateReferencesForCopyInternal(references);
        return compilerFactory.getDirectoryFromCache(newPath);
    }
    moveToDirectory(dirPathOrDirectory, options) {
        const dirPath = typeof dirPathOrDirectory === "string" ? dirPathOrDirectory : dirPathOrDirectory.getPath();
        return this.move(common.FileUtils.pathJoin(dirPath, this.getBaseName()), options);
    }
    move(relativeOrAbsolutePath, options) {
        const fileSystem = this._context.fileSystemWrapper;
        const originalPath = this.getPath();
        const newPath = fileSystem.getStandardizedAbsolutePath(relativeOrAbsolutePath, originalPath);
        if (originalPath === newPath)
            return this;
        return this.#moveInternal(newPath, options, () => fileSystem.queueMoveDirectory(originalPath, newPath));
    }
    async moveImmediately(relativeOrAbsolutePath, options) {
        const fileSystem = this._context.fileSystemWrapper;
        const originalPath = this.getPath();
        const newPath = fileSystem.getStandardizedAbsolutePath(relativeOrAbsolutePath, originalPath);
        if (originalPath === newPath) {
            await this.save();
            return this;
        }
        this.#moveInternal(newPath, options);
        await fileSystem.moveDirectoryImmediately(originalPath, newPath);
        await this.save();
        return this;
    }
    moveImmediatelySync(relativeOrAbsolutePath, options) {
        const fileSystem = this._context.fileSystemWrapper;
        const originalPath = this.getPath();
        const newPath = fileSystem.getStandardizedAbsolutePath(relativeOrAbsolutePath, originalPath);
        if (originalPath === newPath) {
            this.saveSync();
            return this;
        }
        this.#moveInternal(newPath, options);
        fileSystem.moveDirectoryImmediatelySync(originalPath, newPath);
        this.saveSync();
        return this;
    }
    #moveInternal(newPath, options, preAction) {
        const originalPath = this.getPath();
        if (originalPath === newPath)
            return this;
        const existingDir = this._context.compilerFactory.getDirectoryFromCacheOnlyIfInCache(newPath);
        const markInProject = existingDir != null && existingDir._isInProject();
        if (preAction)
            preAction();
        const fileSystem = this._context.fileSystemWrapper;
        const compilerFactory = this._context.compilerFactory;
        const movingDirectories = [this, ...this.getDescendantDirectories()].map(directory => ({
            directory,
            oldPath: directory.getPath(),
            newDirPath: directory === this ? newPath : fileSystem.getStandardizedAbsolutePath(this.getRelativePathTo(directory), newPath),
        }));
        const movingSourceFiles = this.getDescendantSourceFiles().map(sourceFile => ({
            sourceFile,
            newFilePath: fileSystem.getStandardizedAbsolutePath(this.getRelativePathTo(sourceFile), newPath),
            references: this.#getReferencesForMove(sourceFile),
        }));
        for (const { directory, oldPath, newDirPath } of movingDirectories) {
            compilerFactory.removeDirectoryFromCache(oldPath);
            const dirToOverwrite = compilerFactory.getDirectoryFromCache(newDirPath);
            if (dirToOverwrite != null)
                dirToOverwrite._forgetOnlyThis();
            directory._setPathInternal(newDirPath);
            compilerFactory.addDirectoryToCache(directory);
        }
        for (const { sourceFile, newFilePath } of movingSourceFiles)
            sourceFile._moveInternal(newFilePath, options);
        for (const { sourceFile, references } of movingSourceFiles)
            sourceFile._updateReferencesForMoveInternal(references, originalPath);
        if (markInProject)
            this._markAsInProject();
        return this;
    }
    clear() {
        const path = this.getPath();
        this.#deleteDescendants();
        this._context.fileSystemWrapper.queueDirectoryDelete(path);
        this._context.fileSystemWrapper.queueMkdir(path);
    }
    async clearImmediately() {
        const path = this.getPath();
        this.#deleteDescendants();
        await this._context.fileSystemWrapper.clearDirectoryImmediately(path);
    }
    clearImmediatelySync() {
        const path = this.getPath();
        this.#deleteDescendants();
        this._context.fileSystemWrapper.clearDirectoryImmediatelySync(path);
    }
    delete() {
        const path = this.getPath();
        this.#deleteDescendants();
        this._context.fileSystemWrapper.queueDirectoryDelete(path);
        this.forget();
    }
    #deleteDescendants() {
        for (const sourceFile of this.getSourceFiles())
            sourceFile.delete();
        for (const dir of this.getDirectories())
            dir.delete();
    }
    async deleteImmediately() {
        const { fileSystemWrapper } = this._context;
        const path = this.getPath();
        this.forget();
        await fileSystemWrapper.deleteDirectoryImmediately(path);
    }
    deleteImmediatelySync() {
        const { fileSystemWrapper } = this._context;
        const path = this.getPath();
        this.forget();
        fileSystemWrapper.deleteDirectoryImmediatelySync(path);
    }
    forget() {
        if (this.wasForgotten())
            return;
        for (const sourceFile of this.getSourceFiles())
            sourceFile.forget();
        for (const dir of this.getDirectories())
            dir.forget();
        this._forgetOnlyThis();
    }
    _forgetOnlyThis() {
        if (this.wasForgotten())
            return;
        this._context.compilerFactory.removeDirectoryFromCache(this.getPath());
        this.#context = undefined;
    }
    async save() {
        await this._context.fileSystemWrapper.saveForDirectory(this.getPath());
        const unsavedSourceFiles = this.getDescendantSourceFiles().filter(s => !s.isSaved());
        await Promise.all(unsavedSourceFiles.map(s => s.save()));
    }
    saveSync() {
        this._context.fileSystemWrapper.saveForDirectorySync(this.getPath());
        const unsavedSourceFiles = this.getDescendantSourceFiles().filter(s => !s.isSaved());
        unsavedSourceFiles.forEach(s => s.saveSync());
    }
    getRelativePathTo(sourceFileDirOrPath) {
        const thisDirectory = this;
        return common.FileUtils.getRelativePathTo(this.getPath(), getPath());
        function getPath() {
            return sourceFileDirOrPath instanceof SourceFile
                ? sourceFileDirOrPath.getFilePath()
                : sourceFileDirOrPath instanceof Directory
                    ? sourceFileDirOrPath.getPath()
                    : thisDirectory._context.fileSystemWrapper.getStandardizedAbsolutePath(sourceFileDirOrPath, thisDirectory.getPath());
        }
    }
    getRelativePathAsModuleSpecifierTo(sourceFileDirOrFilePath) {
        const moduleResolution = this._context.program.getEmitModuleResolutionKind();
        const thisDirectory = this;
        const moduleSpecifier = common.FileUtils.getRelativePathTo(this.getPath(), getPath()).replace(/((\.d\.ts$)|(\.[^/.]+$))/i, "");
        return moduleSpecifier.startsWith("../") ? moduleSpecifier : "./" + moduleSpecifier;
        function getPath() {
            return sourceFileDirOrFilePath instanceof SourceFile
                ? getPathForSourceFile(sourceFileDirOrFilePath)
                : sourceFileDirOrFilePath instanceof Directory
                    ? getPathForDirectory(sourceFileDirOrFilePath)
                    : getPathForFilePath(thisDirectory._context.fileSystemWrapper.getStandardizedAbsolutePath(sourceFileDirOrFilePath, thisDirectory.getPath()));
            function getPathForSourceFile(sourceFile) {
                return getPathForFilePath(sourceFile.getFilePath());
            }
            function getPathForDirectory(dir) {
                switch (moduleResolution) {
                    case common.ModuleResolutionKind.Node10:
                        if (dir === thisDirectory)
                            return common.FileUtils.pathJoin(dir.getPath(), "index.ts");
                        return dir.getPath();
                    case common.ModuleResolutionKind.Classic:
                    case common.ModuleResolutionKind.Node16:
                    case common.ModuleResolutionKind.NodeNext:
                    case common.ModuleResolutionKind.Bundler:
                        return common.FileUtils.pathJoin(dir.getPath(), "index.ts");
                    default:
                        return common.errors.throwNotImplementedForNeverValueError(moduleResolution);
                }
            }
            function getPathForFilePath(filePath) {
                const dirPath = common.FileUtils.getDirPath(filePath);
                switch (moduleResolution) {
                    case common.ModuleResolutionKind.Node10:
                        if (dirPath === thisDirectory.getPath())
                            return filePath;
                        return filePath.replace(/\/index?(\.d\.ts|\.ts|\.js)$/i, "");
                    case common.ModuleResolutionKind.Classic:
                    case common.ModuleResolutionKind.Node16:
                    case common.ModuleResolutionKind.NodeNext:
                    case common.ModuleResolutionKind.Bundler:
                        return filePath;
                    default:
                        return common.errors.throwNotImplementedForNeverValueError(moduleResolution);
                }
            }
        }
    }
    getProject() {
        return this._context.project;
    }
    wasForgotten() {
        return this.#context == null;
    }
    _isInProject() {
        return this._context.inProjectCoordinator.isDirectoryInProject(this);
    }
    _markAsInProject() {
        this._context.inProjectCoordinator.markDirectoryAsInProject(this);
    }
    _hasLoadedParent() {
        return this._context.compilerFactory.containsDirectoryAtPath(common.FileUtils.getDirPath(this.getPath()));
    }
    #throwIfDeletedOrRemoved() {
        if (this.wasForgotten())
            throw new common.errors.InvalidOperationError("Cannot use a directory that was deleted, removed, or overwritten.");
    }
    #getReferencesForCopy(sourceFile) {
        const literalReferences = sourceFile._getReferencesForCopyInternal();
        return literalReferences.filter(r => !this.isAncestorOf(r[1]));
    }
    #getReferencesForMove(sourceFile) {
        const { literalReferences, referencingLiterals } = sourceFile._getReferencesForMoveInternal();
        return {
            literalReferences: literalReferences.filter(r => !this.isAncestorOf(r[1])),
            referencingLiterals: referencingLiterals.filter(l => !this.isAncestorOf(l._sourceFile)),
        };
    }
    static #isAncestorOfDir(ancestor, descendant) {
        if (descendant instanceof SourceFile) {
            descendant = descendant.getDirectory();
            if (ancestor === descendant)
                return true;
        }
        if (ancestor.#pathParts.length >= descendant.#pathParts.length)
            return false;
        for (let i = ancestor.#pathParts.length - 1; i >= 0; i--) {
            if (ancestor.#pathParts[i] !== descendant.#pathParts[i])
                return false;
        }
        return true;
    }
}
function getDirectoryCopyOptions(options) {
    options = common.ObjectUtils.clone(options || {});
    setValueIfUndefined(options, "includeUntrackedFiles", true);
    return options;
}
function isStandardizedFilePath(filePath) {
    return typeof filePath === "string";
}

class DirectoryCoordinator {
    #fileSystemWrapper;
    #compilerFactory;
    constructor(compilerFactory, fileSystemWrapper) {
        this.#compilerFactory = compilerFactory;
        this.#fileSystemWrapper = fileSystemWrapper;
    }
    addDirectoryAtPathIfExists(dirPath, options) {
        const directory = this.#compilerFactory.getDirectoryFromPath(dirPath, options);
        if (directory == null)
            return undefined;
        if (options.recursive) {
            for (const descendantDirPath of common.FileUtils.getDescendantDirectories(this.#fileSystemWrapper, dirPath))
                this.#compilerFactory.createDirectoryOrAddIfExists(descendantDirPath, options);
        }
        return directory;
    }
    addDirectoryAtPath(dirPath, options) {
        const directory = this.addDirectoryAtPathIfExists(dirPath, options);
        if (directory == null)
            throw new common.errors.DirectoryNotFoundError(dirPath);
        return directory;
    }
    createDirectoryOrAddIfExists(dirPath, options) {
        return this.#compilerFactory.createDirectoryOrAddIfExists(dirPath, options);
    }
    addSourceFileAtPathIfExists(filePath, options) {
        return this.#compilerFactory.addOrGetSourceFileFromFilePath(filePath, {
            markInProject: options.markInProject,
            scriptKind: undefined,
        });
    }
    addSourceFileAtPath(filePath, options) {
        const sourceFile = this.addSourceFileAtPathIfExists(filePath, options);
        if (sourceFile == null)
            throw new common.errors.FileNotFoundError(this.#fileSystemWrapper.getStandardizedAbsolutePath(filePath));
        return sourceFile;
    }
    addSourceFilesAtPaths(fileGlobs, options) {
        if (typeof fileGlobs === "string")
            fileGlobs = [fileGlobs];
        const sourceFiles = [];
        const globbedDirectories = new Set();
        for (const filePath of this.#fileSystemWrapper.globSync(fileGlobs)) {
            const sourceFile = this.addSourceFileAtPathIfExists(filePath, options);
            if (sourceFile != null)
                sourceFiles.push(sourceFile);
            globbedDirectories.add(common.FileUtils.getDirPath(filePath));
        }
        for (const dirPath of common.FileUtils.getParentMostPaths(Array.from(globbedDirectories)))
            this.addDirectoryAtPathIfExists(dirPath, { recursive: true, markInProject: options.markInProject });
        return sourceFiles;
    }
}

class DirectoryCache {
    #context;
    #directoriesByPath = new common.KeyValueCache();
    #sourceFilesByDirPath = new common.KeyValueCache();
    #directoriesByDirPath = new common.KeyValueCache();
    #orphanDirs = new common.KeyValueCache();
    constructor(context) {
        this.#context = context;
    }
    has(dirPath) {
        return this.#directoriesByPath.has(dirPath);
    }
    get(dirPath) {
        if (!this.#directoriesByPath.has(dirPath)) {
            for (const orphanDir of this.#orphanDirs.getValues()) {
                if (common.FileUtils.pathStartsWith(orphanDir.getPath(), dirPath))
                    return this.createOrAddIfExists(dirPath);
            }
            return undefined;
        }
        return this.#directoriesByPath.get(dirPath);
    }
    getOrphans() {
        return this.#orphanDirs.getValues();
    }
    getAll() {
        return this.#directoriesByPath.getValuesAsArray();
    }
    *getAllByDepth() {
        const dirLevels = new common.KeyValueCache();
        let depth = 0;
        for (const orphanDir of this.getOrphans())
            addToDirLevels(orphanDir);
        depth = Math.min(...Array.from(dirLevels.getKeys()));
        while (dirLevels.getSize() > 0) {
            for (const dir of dirLevels.get(depth) || []) {
                yield dir;
                dir.getDirectories().forEach(addToDirLevels);
            }
            dirLevels.removeByKey(depth);
            depth++;
        }
        function addToDirLevels(dir) {
            const dirDepth = dir._getDepth();
            if (depth > dirDepth)
                throw new Error(`For some reason a subdirectory had a lower depth than the parent directory: ${dir.getPath()}`);
            const dirs = dirLevels.getOrCreate(dirDepth, () => []);
            dirs.push(dir);
        }
    }
    remove(dirPath) {
        this.#removeFromDirectoriesByDirPath(dirPath);
        this.#directoriesByPath.removeByKey(dirPath);
        this.#orphanDirs.removeByKey(dirPath);
    }
    *getChildDirectoriesOfDirectory(dirPath) {
        const entries = this.#directoriesByDirPath.get(dirPath)?.entries();
        if (entries == null)
            return;
        for (const dir of entries)
            yield dir;
    }
    *getChildSourceFilesOfDirectory(dirPath) {
        const entries = this.#sourceFilesByDirPath.get(dirPath)?.entries();
        if (entries == null)
            return;
        for (const sourceFile of entries)
            yield sourceFile;
    }
    addSourceFile(sourceFile) {
        const dirPath = sourceFile.getDirectoryPath();
        this.createOrAddIfExists(dirPath);
        const sourceFiles = this.#sourceFilesByDirPath.getOrCreate(dirPath, () => new common.SortedKeyValueArray(item => item.getBaseName(), common.LocaleStringComparer.instance));
        sourceFiles.set(sourceFile);
    }
    removeSourceFile(filePath) {
        const dirPath = common.FileUtils.getDirPath(filePath);
        const sourceFiles = this.#sourceFilesByDirPath.get(dirPath);
        if (sourceFiles == null)
            return;
        sourceFiles.removeByKey(common.FileUtils.getBaseName(filePath));
        if (!sourceFiles.hasItems())
            this.#sourceFilesByDirPath.removeByKey(dirPath);
    }
    createOrAddIfExists(dirPath) {
        if (this.has(dirPath))
            return this.get(dirPath);
        this.#fillParentsOfDirPath(dirPath);
        return this.#createDirectory(dirPath);
    }
    #createDirectory(path) {
        const newDirectory = new Directory(this.#context, path);
        this.addDirectory(newDirectory);
        return newDirectory;
    }
    addDirectory(directory) {
        const path = directory.getPath();
        const parentDirPath = common.FileUtils.getDirPath(path);
        const isRootDir = parentDirPath === path;
        for (const orphanDir of this.#orphanDirs.getValues()) {
            const orphanDirPath = orphanDir.getPath();
            const orphanDirParentPath = common.FileUtils.getDirPath(orphanDirPath);
            const isOrphanRootDir = orphanDirParentPath === orphanDirPath;
            if (!isOrphanRootDir && orphanDirParentPath === path)
                this.#orphanDirs.removeByKey(orphanDirPath);
        }
        if (!isRootDir)
            this.#addToDirectoriesByDirPath(directory);
        if (!this.has(parentDirPath))
            this.#orphanDirs.set(path, directory);
        this.#directoriesByPath.set(path, directory);
        if (!this.#context.fileSystemWrapper.directoryExistsSync(path))
            this.#context.fileSystemWrapper.queueMkdir(path);
        for (const orphanDir of this.#orphanDirs.getValues()) {
            if (directory.isAncestorOf(orphanDir))
                this.#fillParentsOfDirPath(orphanDir.getPath());
        }
    }
    #addToDirectoriesByDirPath(directory) {
        if (common.FileUtils.isRootDirPath(directory.getPath()))
            return;
        const parentDirPath = common.FileUtils.getDirPath(directory.getPath());
        const directories = this.#directoriesByDirPath.getOrCreate(parentDirPath, () => new common.SortedKeyValueArray(item => item.getBaseName(), common.LocaleStringComparer.instance));
        directories.set(directory);
    }
    #removeFromDirectoriesByDirPath(dirPath) {
        if (common.FileUtils.isRootDirPath(dirPath))
            return;
        const parentDirPath = common.FileUtils.getDirPath(dirPath);
        const directories = this.#directoriesByDirPath.get(parentDirPath);
        if (directories == null)
            return;
        directories.removeByKey(common.FileUtils.getBaseName(dirPath));
        if (!directories.hasItems())
            this.#directoriesByDirPath.removeByKey(parentDirPath);
    }
    #fillParentsOfDirPath(dirPath) {
        const passedDirPaths = [];
        let parentDir = common.FileUtils.getDirPath(dirPath);
        while (dirPath !== parentDir) {
            dirPath = parentDir;
            parentDir = common.FileUtils.getDirPath(dirPath);
            if (this.#directoriesByPath.has(dirPath)) {
                for (const currentDirPath of passedDirPaths)
                    this.#createDirectory(currentDirPath);
                break;
            }
            passedDirPaths.unshift(dirPath);
        }
    }
}

class ForgetfulNodeCache extends common.KeyValueCache {
    #forgetStack = [];
    getOrCreate(key, createFunc) {
        return super.getOrCreate(key, () => {
            const node = createFunc();
            if (this.#forgetStack.length > 0)
                this.#forgetStack[this.#forgetStack.length - 1].add(node);
            return node;
        });
    }
    setForgetPoint() {
        this.#forgetStack.push(new Set());
    }
    forgetLastPoint() {
        const nodes = this.#forgetStack.pop();
        if (nodes != null)
            this.#forgetNodes(nodes.values());
    }
    rememberNode(node) {
        if (node.wasForgotten())
            throw new common.errors.InvalidOperationError("Cannot remember a node that was removed or forgotten.");
        let wasInForgetStack = false;
        for (const stackItem of this.#forgetStack) {
            if (stackItem.delete(node)) {
                wasInForgetStack = true;
                break;
            }
        }
        if (wasInForgetStack)
            this.#rememberParentOfNode(node);
        return wasInForgetStack;
    }
    #rememberParentOfNode(node) {
        const parent = node.getParentSyntaxList() || node.getParent();
        if (parent != null)
            this.rememberNode(parent);
    }
    #forgetNodes(nodes) {
        for (const node of nodes) {
            if (node.wasForgotten() || node.getKind() === common.SyntaxKind.SourceFile)
                continue;
            node._forgetOnlyThis();
        }
    }
}

const kindToWrapperMappings = {
    [common.SyntaxKind.SourceFile]: SourceFile,
    [common.SyntaxKind.ArrayBindingPattern]: ArrayBindingPattern,
    [common.SyntaxKind.ArrayLiteralExpression]: ArrayLiteralExpression,
    [common.SyntaxKind.ArrayType]: ArrayTypeNode,
    [common.SyntaxKind.ArrowFunction]: ArrowFunction,
    [common.SyntaxKind.AsExpression]: AsExpression,
    [common.SyntaxKind.AwaitExpression]: AwaitExpression,
    [common.SyntaxKind.BigIntLiteral]: BigIntLiteral,
    [common.SyntaxKind.BindingElement]: BindingElement,
    [common.SyntaxKind.BinaryExpression]: BinaryExpression,
    [common.SyntaxKind.Block]: Block,
    [common.SyntaxKind.BreakStatement]: BreakStatement,
    [common.SyntaxKind.CallExpression]: CallExpression,
    [common.SyntaxKind.CallSignature]: CallSignatureDeclaration,
    [common.SyntaxKind.CaseBlock]: CaseBlock,
    [common.SyntaxKind.CaseClause]: CaseClause,
    [common.SyntaxKind.CatchClause]: CatchClause,
    [common.SyntaxKind.ClassDeclaration]: ClassDeclaration,
    [common.SyntaxKind.ClassExpression]: ClassExpression,
    [common.SyntaxKind.ClassStaticBlockDeclaration]: ClassStaticBlockDeclaration,
    [common.SyntaxKind.ConditionalType]: ConditionalTypeNode,
    [common.SyntaxKind.Constructor]: ConstructorDeclaration,
    [common.SyntaxKind.ConstructorType]: ConstructorTypeNode,
    [common.SyntaxKind.ConstructSignature]: ConstructSignatureDeclaration,
    [common.SyntaxKind.ContinueStatement]: ContinueStatement,
    [common.SyntaxKind.CommaListExpression]: CommaListExpression,
    [common.SyntaxKind.ComputedPropertyName]: ComputedPropertyName,
    [common.SyntaxKind.ConditionalExpression]: ConditionalExpression,
    [common.SyntaxKind.DebuggerStatement]: DebuggerStatement,
    [common.SyntaxKind.Decorator]: Decorator,
    [common.SyntaxKind.DefaultClause]: DefaultClause,
    [common.SyntaxKind.DeleteExpression]: DeleteExpression,
    [common.SyntaxKind.DoStatement]: DoStatement,
    [common.SyntaxKind.ElementAccessExpression]: ElementAccessExpression,
    [common.SyntaxKind.EmptyStatement]: EmptyStatement,
    [common.SyntaxKind.EnumDeclaration]: EnumDeclaration,
    [common.SyntaxKind.EnumMember]: EnumMember,
    [common.SyntaxKind.ExportAssignment]: ExportAssignment,
    [common.SyntaxKind.ExportDeclaration]: ExportDeclaration,
    [common.SyntaxKind.ExportSpecifier]: ExportSpecifier,
    [common.SyntaxKind.ExpressionWithTypeArguments]: ExpressionWithTypeArguments,
    [common.SyntaxKind.ExpressionStatement]: ExpressionStatement,
    [common.SyntaxKind.ExternalModuleReference]: ExternalModuleReference,
    [common.SyntaxKind.QualifiedName]: QualifiedName,
    [common.SyntaxKind.ForInStatement]: ForInStatement,
    [common.SyntaxKind.ForOfStatement]: ForOfStatement,
    [common.SyntaxKind.ForStatement]: ForStatement,
    [common.SyntaxKind.FunctionDeclaration]: FunctionDeclaration,
    [common.SyntaxKind.FunctionExpression]: FunctionExpression,
    [common.SyntaxKind.FunctionType]: FunctionTypeNode,
    [common.SyntaxKind.GetAccessor]: GetAccessorDeclaration,
    [common.SyntaxKind.HeritageClause]: HeritageClause,
    [common.SyntaxKind.Identifier]: Identifier,
    [common.SyntaxKind.IfStatement]: IfStatement,
    [common.SyntaxKind.ImportClause]: ImportClause,
    [common.SyntaxKind.ImportDeclaration]: ImportDeclaration,
    [common.SyntaxKind.ImportEqualsDeclaration]: ImportEqualsDeclaration,
    [common.SyntaxKind.ImportSpecifier]: ImportSpecifier,
    [common.SyntaxKind.ImportType]: ImportTypeNode,
    [common.SyntaxKind.ImportAttribute]: ImportAttribute,
    [common.SyntaxKind.ImportAttributes]: ImportAttributes,
    [common.SyntaxKind.IndexedAccessType]: IndexedAccessTypeNode,
    [common.SyntaxKind.IndexSignature]: IndexSignatureDeclaration,
    [common.SyntaxKind.InferType]: InferTypeNode,
    [common.SyntaxKind.InterfaceDeclaration]: InterfaceDeclaration,
    [common.SyntaxKind.IntersectionType]: IntersectionTypeNode,
    [common.SyntaxKind.JSDocAllType]: JSDocAllType,
    [common.SyntaxKind.JSDocAugmentsTag]: JSDocAugmentsTag,
    [common.SyntaxKind.JSDocAuthorTag]: JSDocAuthorTag,
    [common.SyntaxKind.JSDocCallbackTag]: JSDocCallbackTag,
    [common.SyntaxKind.JSDocClassTag]: JSDocClassTag,
    [common.SyntaxKind.JSDocDeprecatedTag]: JSDocDeprecatedTag,
    [common.SyntaxKind.JSDocEnumTag]: JSDocEnumTag,
    [common.SyntaxKind.JSDocFunctionType]: JSDocFunctionType,
    [common.SyntaxKind.JSDocImplementsTag]: JSDocImplementsTag,
    [common.SyntaxKind.JSDocImportTag]: JSDocImportTag,
    [common.SyntaxKind.JSDocLink]: JSDocLink,
    [common.SyntaxKind.JSDocLinkCode]: JSDocLinkCode,
    [common.SyntaxKind.JSDocLinkPlain]: JSDocLinkPlain,
    [common.SyntaxKind.JSDocMemberName]: JSDocMemberName,
    [common.SyntaxKind.JSDocNamepathType]: JSDocNamepathType,
    [common.SyntaxKind.JSDocNameReference]: JSDocNameReference,
    [common.SyntaxKind.JSDocNonNullableType]: JSDocNonNullableType,
    [common.SyntaxKind.JSDocNullableType]: JSDocNullableType,
    [common.SyntaxKind.JSDocOptionalType]: JSDocOptionalType,
    [common.SyntaxKind.JSDocOverrideTag]: JSDocOverrideTag,
    [common.SyntaxKind.JSDocParameterTag]: JSDocParameterTag,
    [common.SyntaxKind.JSDocPrivateTag]: JSDocPrivateTag,
    [common.SyntaxKind.JSDocPropertyTag]: JSDocPropertyTag,
    [common.SyntaxKind.JSDocProtectedTag]: JSDocProtectedTag,
    [common.SyntaxKind.JSDocPublicTag]: JSDocPublicTag,
    [common.SyntaxKind.JSDocReturnTag]: JSDocReturnTag,
    [common.SyntaxKind.JSDocReadonlyTag]: JSDocReadonlyTag,
    [common.SyntaxKind.JSDocThrowsTag]: JSDocThrowsTag,
    [common.SyntaxKind.JSDocOverloadTag]: JSDocOverloadTag,
    [common.SyntaxKind.JSDocSatisfiesTag]: JSDocSatisfiesTag,
    [common.SyntaxKind.JSDocSeeTag]: JSDocSeeTag,
    [common.SyntaxKind.JSDocSignature]: JSDocSignature,
    [common.SyntaxKind.JSDocTag]: JSDocUnknownTag,
    [common.SyntaxKind.JSDocTemplateTag]: JSDocTemplateTag,
    [common.SyntaxKind.JSDocText]: JSDocText,
    [common.SyntaxKind.JSDocThisTag]: JSDocThisTag,
    [common.SyntaxKind.JSDocTypeExpression]: JSDocTypeExpression,
    [common.SyntaxKind.JSDocTypeLiteral]: JSDocTypeLiteral,
    [common.SyntaxKind.JSDocTypeTag]: JSDocTypeTag,
    [common.SyntaxKind.JSDocTypedefTag]: JSDocTypedefTag,
    [common.SyntaxKind.JSDocUnknownType]: JSDocUnknownType,
    [common.SyntaxKind.JSDocVariadicType]: JSDocVariadicType,
    [common.SyntaxKind.JsxAttribute]: JsxAttribute,
    [common.SyntaxKind.JsxClosingElement]: JsxClosingElement,
    [common.SyntaxKind.JsxClosingFragment]: JsxClosingFragment,
    [common.SyntaxKind.JsxElement]: JsxElement,
    [common.SyntaxKind.JsxExpression]: JsxExpression,
    [common.SyntaxKind.JsxFragment]: JsxFragment,
    [common.SyntaxKind.JsxNamespacedName]: JsxNamespacedName,
    [common.SyntaxKind.JsxOpeningElement]: JsxOpeningElement,
    [common.SyntaxKind.JsxOpeningFragment]: JsxOpeningFragment,
    [common.SyntaxKind.JsxSelfClosingElement]: JsxSelfClosingElement,
    [common.SyntaxKind.JsxSpreadAttribute]: JsxSpreadAttribute,
    [common.SyntaxKind.JsxText]: JsxText,
    [common.SyntaxKind.LabeledStatement]: LabeledStatement,
    [common.SyntaxKind.LiteralType]: LiteralTypeNode,
    [common.SyntaxKind.MappedType]: MappedTypeNode,
    [common.SyntaxKind.MetaProperty]: MetaProperty,
    [common.SyntaxKind.MethodDeclaration]: MethodDeclaration,
    [common.SyntaxKind.MethodSignature]: MethodSignature,
    [common.SyntaxKind.ModuleBlock]: ModuleBlock,
    [common.SyntaxKind.ModuleDeclaration]: ModuleDeclaration,
    [common.SyntaxKind.NamedExports]: NamedExports,
    [common.SyntaxKind.NamedImports]: NamedImports,
    [common.SyntaxKind.NamedTupleMember]: NamedTupleMember,
    [common.SyntaxKind.NamespaceExport]: NamespaceExport,
    [common.SyntaxKind.NamespaceImport]: NamespaceImport,
    [common.SyntaxKind.NewExpression]: NewExpression,
    [common.SyntaxKind.NonNullExpression]: NonNullExpression,
    [common.SyntaxKind.NotEmittedStatement]: NotEmittedStatement,
    [common.SyntaxKind.NoSubstitutionTemplateLiteral]: NoSubstitutionTemplateLiteral,
    [common.SyntaxKind.NumericLiteral]: NumericLiteral,
    [common.SyntaxKind.ObjectBindingPattern]: ObjectBindingPattern,
    [common.SyntaxKind.ObjectLiteralExpression]: ObjectLiteralExpression,
    [common.SyntaxKind.OmittedExpression]: OmittedExpression,
    [common.SyntaxKind.OptionalType]: OptionalTypeNode,
    [common.SyntaxKind.Parameter]: ParameterDeclaration,
    [common.SyntaxKind.ParenthesizedExpression]: ParenthesizedExpression,
    [common.SyntaxKind.ParenthesizedType]: ParenthesizedTypeNode,
    [common.SyntaxKind.PartiallyEmittedExpression]: PartiallyEmittedExpression,
    [common.SyntaxKind.PostfixUnaryExpression]: PostfixUnaryExpression,
    [common.SyntaxKind.PrefixUnaryExpression]: PrefixUnaryExpression,
    [common.SyntaxKind.PrivateIdentifier]: PrivateIdentifier,
    [common.SyntaxKind.PropertyAccessExpression]: PropertyAccessExpression,
    [common.SyntaxKind.PropertyAssignment]: PropertyAssignment,
    [common.SyntaxKind.PropertyDeclaration]: PropertyDeclaration,
    [common.SyntaxKind.PropertySignature]: PropertySignature,
    [common.SyntaxKind.RegularExpressionLiteral]: RegularExpressionLiteral,
    [common.SyntaxKind.RestType]: RestTypeNode,
    [common.SyntaxKind.ReturnStatement]: ReturnStatement,
    [common.SyntaxKind.SatisfiesExpression]: SatisfiesExpression,
    [common.SyntaxKind.SetAccessor]: SetAccessorDeclaration,
    [common.SyntaxKind.ShorthandPropertyAssignment]: ShorthandPropertyAssignment,
    [common.SyntaxKind.SpreadAssignment]: SpreadAssignment,
    [common.SyntaxKind.SpreadElement]: SpreadElement,
    [common.SyntaxKind.StringLiteral]: StringLiteral,
    [common.SyntaxKind.SwitchStatement]: SwitchStatement,
    [common.SyntaxKind.SyntaxList]: SyntaxList,
    [common.SyntaxKind.TaggedTemplateExpression]: TaggedTemplateExpression,
    [common.SyntaxKind.TemplateExpression]: TemplateExpression,
    [common.SyntaxKind.TemplateHead]: TemplateHead,
    [common.SyntaxKind.TemplateLiteralType]: TemplateLiteralTypeNode,
    [common.SyntaxKind.TemplateMiddle]: TemplateMiddle,
    [common.SyntaxKind.TemplateSpan]: TemplateSpan,
    [common.SyntaxKind.TemplateTail]: TemplateTail,
    [common.SyntaxKind.ThisType]: ThisTypeNode,
    [common.SyntaxKind.ThrowStatement]: ThrowStatement,
    [common.SyntaxKind.TryStatement]: TryStatement,
    [common.SyntaxKind.TupleType]: TupleTypeNode,
    [common.SyntaxKind.TypeAliasDeclaration]: TypeAliasDeclaration,
    [common.SyntaxKind.TypeAssertionExpression]: TypeAssertion,
    [common.SyntaxKind.TypeLiteral]: TypeLiteralNode,
    [common.SyntaxKind.TypeOperator]: TypeOperatorTypeNode,
    [common.SyntaxKind.TypeParameter]: TypeParameterDeclaration,
    [common.SyntaxKind.TypePredicate]: TypePredicateNode,
    [common.SyntaxKind.TypeQuery]: TypeQueryNode,
    [common.SyntaxKind.TypeReference]: TypeReferenceNode,
    [common.SyntaxKind.UnionType]: UnionTypeNode,
    [common.SyntaxKind.VariableDeclaration]: VariableDeclaration,
    [common.SyntaxKind.VariableDeclarationList]: VariableDeclarationList,
    [common.SyntaxKind.VariableStatement]: VariableStatement,
    [common.SyntaxKind.JSDoc]: JSDoc,
    [common.SyntaxKind.TypeOfExpression]: TypeOfExpression,
    [common.SyntaxKind.WhileStatement]: WhileStatement,
    [common.SyntaxKind.WithStatement]: WithStatement,
    [common.SyntaxKind.YieldExpression]: YieldExpression,
    [common.SyntaxKind.SemicolonToken]: Node,
    [common.SyntaxKind.AnyKeyword]: Expression,
    [common.SyntaxKind.BooleanKeyword]: Expression,
    [common.SyntaxKind.FalseKeyword]: FalseLiteral,
    [common.SyntaxKind.ImportKeyword]: ImportExpression,
    [common.SyntaxKind.InferKeyword]: Node,
    [common.SyntaxKind.NeverKeyword]: Node,
    [common.SyntaxKind.NullKeyword]: NullLiteral,
    [common.SyntaxKind.NumberKeyword]: Expression,
    [common.SyntaxKind.ObjectKeyword]: Expression,
    [common.SyntaxKind.StringKeyword]: Expression,
    [common.SyntaxKind.SymbolKeyword]: Expression,
    [common.SyntaxKind.SuperKeyword]: SuperExpression,
    [common.SyntaxKind.ThisKeyword]: ThisExpression,
    [common.SyntaxKind.TrueKeyword]: TrueLiteral,
    [common.SyntaxKind.UndefinedKeyword]: Expression,
    [common.SyntaxKind.VoidExpression]: VoidExpression,
};

class CompilerFactory {
    #context;
    #sourceFileCacheByFilePath = new Map();
    #diagnosticCache = new common.WeakCache();
    #definitionInfoCache = new common.WeakCache();
    #documentSpanCache = new common.WeakCache();
    #diagnosticMessageChainCache = new common.WeakCache();
    #jsDocTagInfoCache = new common.WeakCache();
    #signatureCache = new common.WeakCache();
    #symbolCache = new common.WeakCache();
    #symbolDisplayPartCache = new common.WeakCache();
    #referencedSymbolEntryCache = new common.WeakCache();
    #referencedSymbolCache = new common.WeakCache();
    #referencedSymbolDefinitionInfoCache = new common.WeakCache();
    #typeCache = new common.WeakCache();
    #typeParameterCache = new common.WeakCache();
    #nodeCache = new ForgetfulNodeCache();
    #directoryCache;
    #sourceFileAddedEventContainer = new common.EventContainer();
    #sourceFileRemovedEventContainer = new common.EventContainer();
    documentRegistry;
    constructor(context) {
        this.documentRegistry = new common.DocumentRegistry(context.fileSystemWrapper);
        this.#directoryCache = new DirectoryCache(context);
        context.compilerOptions.onModified(() => {
            const currentSourceFiles = Array.from(this.#sourceFileCacheByFilePath.values());
            for (const sourceFile of currentSourceFiles) {
                replaceSourceFileForCacheUpdate(sourceFile);
            }
        });
        this.#context = context;
    }
    *getSourceFilesByDirectoryDepth() {
        for (const dir of this.getDirectoriesByDepth())
            yield* dir.getSourceFiles();
    }
    getSourceFilePaths() {
        return this.#sourceFileCacheByFilePath.keys();
    }
    getChildDirectoriesOfDirectory(dirPath) {
        return this.#directoryCache.getChildDirectoriesOfDirectory(dirPath);
    }
    getChildSourceFilesOfDirectory(dirPath) {
        return this.#directoryCache.getChildSourceFilesOfDirectory(dirPath);
    }
    onSourceFileAdded(subscription, subscribe = true) {
        if (subscribe)
            this.#sourceFileAddedEventContainer.subscribe(subscription);
        else
            this.#sourceFileAddedEventContainer.unsubscribe(subscription);
    }
    onSourceFileRemoved(subscription) {
        this.#sourceFileRemovedEventContainer.subscribe(subscription);
    }
    createSourceFile(filePath, sourceFileText, options) {
        sourceFileText = sourceFileText instanceof Function ? getTextFromStringOrWriter(this.#context.createWriter(), sourceFileText) : sourceFileText || "";
        if (typeof sourceFileText === "string")
            return this.createSourceFileFromText(filePath, sourceFileText, options);
        const writer = this.#context.createWriter();
        const structurePrinter = this.#context.structurePrinterFactory.forSourceFile({
            isAmbient: common.FileUtils.getExtension(filePath) === ".d.ts",
        });
        structurePrinter.printText(writer, sourceFileText);
        return this.createSourceFileFromText(filePath, writer.toString(), options);
    }
    createSourceFileFromText(filePath, sourceText, options) {
        filePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePath);
        if (options.overwrite === true)
            return this.#createOrOverwriteSourceFileFromText(filePath, sourceText, options);
        this.throwIfFileExists(filePath, "Did you mean to provide the overwrite option?");
        return this.#createSourceFileFromTextInternal(filePath, sourceText, options);
    }
    throwIfFileExists(filePath, prefixMessage) {
        if (!this.containsSourceFileAtPath(filePath) && !this.#context.fileSystemWrapper.fileExistsSync(filePath))
            return;
        prefixMessage = prefixMessage == null ? "" : prefixMessage + " ";
        throw new common.errors.InvalidOperationError(`${prefixMessage}A source file already exists at the provided file path: ${filePath}`);
    }
    #createOrOverwriteSourceFileFromText(filePath, sourceText, options) {
        filePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePath);
        const existingSourceFile = this.addOrGetSourceFileFromFilePath(filePath, options);
        if (existingSourceFile != null) {
            existingSourceFile.getChildren().forEach(c => c.forget());
            this.replaceCompilerNode(existingSourceFile, this.createCompilerSourceFileFromText(filePath, sourceText, options.scriptKind));
            return existingSourceFile;
        }
        return this.#createSourceFileFromTextInternal(filePath, sourceText, options);
    }
    getSourceFileFromCacheFromFilePath(filePath) {
        filePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePath);
        return this.#sourceFileCacheByFilePath.get(filePath);
    }
    addOrGetSourceFileFromFilePath(filePath, options) {
        filePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePath);
        let sourceFile = this.#sourceFileCacheByFilePath.get(filePath);
        if (sourceFile == null) {
            const fileText = this.#context.fileSystemWrapper.readFileIfExistsSync(filePath, this.#context.getEncoding());
            if (fileText != null) {
                this.#context.logger.log(`Loaded file: ${filePath}`);
                sourceFile = this.#createSourceFileFromTextInternal(filePath, fileText, options);
                sourceFile._setIsSaved(true);
            }
        }
        if (sourceFile != null && options.markInProject)
            sourceFile._markAsInProject();
        return sourceFile;
    }
    containsSourceFileAtPath(filePath) {
        filePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(filePath);
        return this.#sourceFileCacheByFilePath.has(filePath);
    }
    containsDirectoryAtPath(dirPath) {
        dirPath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath);
        return this.#directoryCache.has(dirPath);
    }
    getSourceFileForNode(compilerNode) {
        let currentNode = compilerNode;
        while (currentNode.kind !== common.SyntaxKind.SourceFile) {
            if (currentNode.parent == null)
                return undefined;
            currentNode = currentNode.parent;
        }
        return this.getSourceFile(currentNode, { markInProject: false });
    }
    hasCompilerNode(compilerNode) {
        return this.#nodeCache.has(compilerNode);
    }
    getExistingNodeFromCompilerNode(compilerNode) {
        return this.#nodeCache.get(compilerNode);
    }
    getNodeFromCompilerNode(compilerNode, sourceFile) {
        if (compilerNode.kind === common.SyntaxKind.SourceFile)
            return this.getSourceFile(compilerNode, { markInProject: false });
        return this.#nodeCache.getOrCreate(compilerNode, () => {
            const node = createNode.call(this);
            initializeNode.call(this, node);
            return node;
        });
        function createNode() {
            if (isCommentNode(compilerNode)) {
                if (CommentNodeParser.isCommentStatement(compilerNode))
                    return new CommentStatement(this.#context, compilerNode, sourceFile);
                if (CommentNodeParser.isCommentClassElement(compilerNode))
                    return new CommentClassElement(this.#context, compilerNode, sourceFile);
                if (CommentNodeParser.isCommentTypeElement(compilerNode))
                    return new CommentTypeElement(this.#context, compilerNode, sourceFile);
                if (CommentNodeParser.isCommentObjectLiteralElement(compilerNode))
                    return new CommentObjectLiteralElement(this.#context, compilerNode, sourceFile);
                if (CommentNodeParser.isCommentEnumMember(compilerNode))
                    return new CommentEnumMember(this.#context, compilerNode, sourceFile);
                return common.errors.throwNotImplementedForNeverValueError(compilerNode);
            }
            const ctor = kindToWrapperMappings[compilerNode.kind] || Node;
            return new ctor(this.#context, compilerNode, sourceFile);
        }
        function isCommentNode(node) {
            return node._commentKind != null;
        }
        function initializeNode(node) {
            if (compilerNode.parent != null) {
                const parentNode = this.getNodeFromCompilerNode(compilerNode.parent, sourceFile);
                parentNode._wrappedChildCount++;
            }
            const parentSyntaxList = node._getParentSyntaxListIfWrapped();
            if (parentSyntaxList != null)
                parentSyntaxList._wrappedChildCount++;
            if (compilerNode.kind === common.SyntaxKind.SyntaxList) {
                let count = 0;
                for (const _ of node._getChildrenInCacheIterator())
                    count++;
                node._wrappedChildCount = count;
            }
        }
    }
    #createSourceFileFromTextInternal(filePath, text, options) {
        const hasBom = common.StringUtils.hasBom(text);
        if (hasBom)
            text = common.StringUtils.stripBom(text);
        const sourceFile = this.getSourceFile(this.createCompilerSourceFileFromText(filePath, text, options.scriptKind), options);
        if (hasBom)
            sourceFile._hasBom = true;
        return sourceFile;
    }
    createCompilerSourceFileFromText(filePath, text, scriptKind) {
        return this.documentRegistry.createOrUpdateSourceFile(filePath, this.#context.compilerOptions.get(), common.ts.ScriptSnapshot.fromString(text), scriptKind);
    }
    getSourceFile(compilerSourceFile, options) {
        let wasAdded = false;
        const sourceFile = this.#sourceFileCacheByFilePath.get(compilerSourceFile.fileName)
            ?? this.#nodeCache.getOrCreate(compilerSourceFile, () => {
                const createdSourceFile = new SourceFile(this.#context, compilerSourceFile);
                if (!options.markInProject)
                    this.#context.inProjectCoordinator.setSourceFileNotInProject(createdSourceFile);
                this.#addSourceFileToCache(createdSourceFile);
                wasAdded = true;
                return createdSourceFile;
            });
        if (options.markInProject)
            sourceFile._markAsInProject();
        if (wasAdded)
            this.#sourceFileAddedEventContainer.fire(sourceFile);
        return sourceFile;
    }
    #addSourceFileToCache(sourceFile) {
        this.#sourceFileCacheByFilePath.set(sourceFile.getFilePath(), sourceFile);
        this.#context.fileSystemWrapper.removeFileDelete(sourceFile.getFilePath());
        this.#directoryCache.addSourceFile(sourceFile);
    }
    getDirectoryFromPath(dirPath, options) {
        dirPath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath);
        let directory = this.#directoryCache.get(dirPath);
        if (directory == null && this.#context.fileSystemWrapper.directoryExistsSync(dirPath))
            directory = this.#directoryCache.createOrAddIfExists(dirPath);
        if (directory != null && options.markInProject)
            directory._markAsInProject();
        return directory;
    }
    createDirectoryOrAddIfExists(dirPath, options) {
        const directory = this.#directoryCache.createOrAddIfExists(dirPath);
        if (directory != null && options.markInProject)
            directory._markAsInProject();
        return directory;
    }
    getDirectoryFromCache(dirPath) {
        return this.#directoryCache.get(dirPath);
    }
    getDirectoryFromCacheOnlyIfInCache(dirPath) {
        return this.#directoryCache.has(dirPath)
            ? this.#directoryCache.get(dirPath)
            : undefined;
    }
    getDirectoriesByDepth() {
        return this.#directoryCache.getAllByDepth();
    }
    getOrphanDirectories() {
        return this.#directoryCache.getOrphans();
    }
    getSymbolDisplayPart(compilerObject) {
        return this.#symbolDisplayPartCache.getOrCreate(compilerObject, () => new SymbolDisplayPart(compilerObject));
    }
    getType(type) {
        if ((type.flags & common.TypeFlags.TypeParameter) === common.TypeFlags.TypeParameter)
            return this.getTypeParameter(type);
        return this.#typeCache.getOrCreate(type, () => new Type(this.#context, type));
    }
    getTypeParameter(typeParameter) {
        return this.#typeParameterCache.getOrCreate(typeParameter, () => new TypeParameter(this.#context, typeParameter));
    }
    getSignature(signature) {
        return this.#signatureCache.getOrCreate(signature, () => new Signature(this.#context, signature));
    }
    getSymbol(symbol) {
        return this.#symbolCache.getOrCreate(symbol, () => new Symbol$1(this.#context, symbol));
    }
    getDefinitionInfo(compilerObject) {
        return this.#definitionInfoCache.getOrCreate(compilerObject, () => new DefinitionInfo(this.#context, compilerObject));
    }
    getDocumentSpan(compilerObject) {
        return this.#documentSpanCache.getOrCreate(compilerObject, () => new DocumentSpan(this.#context, compilerObject));
    }
    getReferencedSymbolEntry(compilerObject) {
        return this.#referencedSymbolEntryCache.getOrCreate(compilerObject, () => new ReferencedSymbolEntry(this.#context, compilerObject));
    }
    getReferencedSymbol(compilerObject) {
        return this.#referencedSymbolCache.getOrCreate(compilerObject, () => new ReferencedSymbol(this.#context, compilerObject));
    }
    getReferencedSymbolDefinitionInfo(compilerObject) {
        return this.#referencedSymbolDefinitionInfoCache.getOrCreate(compilerObject, () => new ReferencedSymbolDefinitionInfo(this.#context, compilerObject));
    }
    getDiagnostic(diagnostic) {
        return this.#diagnosticCache.getOrCreate(diagnostic, () => {
            if (diagnostic.start != null)
                return new DiagnosticWithLocation(this.#context, diagnostic);
            return new Diagnostic(this.#context, diagnostic);
        });
    }
    getDiagnosticWithLocation(diagnostic) {
        return this.#diagnosticCache.getOrCreate(diagnostic, () => new DiagnosticWithLocation(this.#context, diagnostic));
    }
    getDiagnosticMessageChain(compilerObject) {
        return this.#diagnosticMessageChainCache.getOrCreate(compilerObject, () => new DiagnosticMessageChain(compilerObject));
    }
    getJSDocTagInfo(jsDocTagInfo) {
        return this.#jsDocTagInfoCache.getOrCreate(jsDocTagInfo, () => new JSDocTagInfo(jsDocTagInfo));
    }
    replaceCompilerNode(oldNode, newNode) {
        const nodeToReplace = oldNode instanceof Node ? oldNode.compilerNode : oldNode;
        const node = oldNode instanceof Node ? oldNode : this.#nodeCache.get(oldNode);
        if (nodeToReplace.kind === common.SyntaxKind.SourceFile && nodeToReplace.fileName !== newNode.fileName) {
            const sourceFile = node;
            this.#removeCompilerNodeFromCache(nodeToReplace);
            sourceFile._replaceCompilerNodeFromFactory(newNode);
            this.#nodeCache.set(newNode, sourceFile);
            this.#addSourceFileToCache(sourceFile);
            this.#sourceFileAddedEventContainer.fire(sourceFile);
        }
        else {
            this.#nodeCache.replaceKey(nodeToReplace, newNode);
            if (node != null)
                node._replaceCompilerNodeFromFactory(newNode);
        }
    }
    removeNodeFromCache(node) {
        this.#removeCompilerNodeFromCache(node.compilerNode);
    }
    #removeCompilerNodeFromCache(compilerNode) {
        this.#nodeCache.removeByKey(compilerNode);
        if (compilerNode.kind === common.SyntaxKind.SourceFile) {
            const sourceFile = compilerNode;
            const standardizedFilePath = this.#context.fileSystemWrapper.getStandardizedAbsolutePath(sourceFile.fileName);
            this.#directoryCache.removeSourceFile(standardizedFilePath);
            const wrappedSourceFile = this.#sourceFileCacheByFilePath.get(standardizedFilePath);
            this.#sourceFileCacheByFilePath.delete(standardizedFilePath);
            this.documentRegistry.removeSourceFile(standardizedFilePath);
            if (wrappedSourceFile != null)
                this.#sourceFileRemovedEventContainer.fire(wrappedSourceFile);
        }
    }
    addDirectoryToCache(directory) {
        this.#directoryCache.addDirectory(directory);
    }
    removeDirectoryFromCache(dirPath) {
        this.#directoryCache.remove(dirPath);
    }
    forgetNodesCreatedInBlock(block) {
        this.#nodeCache.setForgetPoint();
        let wasPromise = false;
        let result;
        try {
            result = block((...nodes) => {
                for (const node of nodes)
                    this.#nodeCache.rememberNode(node);
            });
            if (Node.isNode(result))
                this.#nodeCache.rememberNode(result);
            if (isPromise(result)) {
                wasPromise = true;
                return result.then(value => {
                    if (Node.isNode(value))
                        this.#nodeCache.rememberNode(value);
                    this.#nodeCache.forgetLastPoint();
                    return value;
                });
            }
        }
        finally {
            if (!wasPromise)
                this.#nodeCache.forgetLastPoint();
        }
        return result;
        function isPromise(value) {
            return value != null && typeof value.then === "function";
        }
    }
}

class InProjectCoordinator {
    #compilerFactory;
    #notInProjectFiles = new Set();
    constructor(compilerFactory) {
        compilerFactory.onSourceFileRemoved(sourceFile => {
            this.#notInProjectFiles.delete(sourceFile);
        });
        this.#compilerFactory = compilerFactory;
    }
    setSourceFileNotInProject(sourceFile) {
        this.#notInProjectFiles.add(sourceFile);
        sourceFile._inProject = false;
    }
    markSourceFileAsInProject(sourceFile) {
        if (this.isSourceFileInProject(sourceFile))
            return;
        this.#internalMarkSourceFileAsInProject(sourceFile);
        this.#notInProjectFiles.delete(sourceFile);
    }
    markSourceFilesAsInProjectForResolution() {
        const nodeModulesSearchName = "/node_modules/";
        const compilerFactory = this.#compilerFactory;
        const changedSourceFiles = [];
        const unchangedSourceFiles = [];
        for (const sourceFile of [...this.#notInProjectFiles.values()]) {
            if (shouldMarkInProject(sourceFile)) {
                this.#internalMarkSourceFileAsInProject(sourceFile);
                this.#notInProjectFiles.delete(sourceFile);
                changedSourceFiles.push(sourceFile);
            }
            else {
                unchangedSourceFiles.push(sourceFile);
            }
        }
        return { changedSourceFiles, unchangedSourceFiles };
        function shouldMarkInProject(sourceFile) {
            const filePath = sourceFile.getFilePath();
            const index = filePath.toLowerCase().lastIndexOf(nodeModulesSearchName);
            if (index === -1)
                return true;
            const nodeModulesPath = filePath.substring(0, index + nodeModulesSearchName.length - 1);
            const nodeModulesDir = compilerFactory.getDirectoryFromCacheOnlyIfInCache(nodeModulesPath);
            if (nodeModulesDir != null && nodeModulesDir._isInProject())
                return true;
            let directory = sourceFile.getDirectory();
            while (directory != null && directory.getPath() !== nodeModulesPath) {
                if (directory._isInProject())
                    return true;
                directory = compilerFactory.getDirectoryFromCacheOnlyIfInCache(common.FileUtils.getDirPath(directory.getPath()));
            }
            return false;
        }
    }
    #internalMarkSourceFileAsInProject(sourceFile) {
        sourceFile._inProject = true;
        this.markDirectoryAsInProject(sourceFile.getDirectory());
    }
    isSourceFileInProject(sourceFile) {
        return sourceFile._inProject === true;
    }
    setDirectoryAndFilesAsNotInProjectForTesting(directory) {
        for (const subDir of directory.getDirectories())
            this.setDirectoryAndFilesAsNotInProjectForTesting(subDir);
        for (const file of directory.getSourceFiles()) {
            delete file._inProject;
            this.#notInProjectFiles.add(file);
        }
        delete directory._inProject;
    }
    markDirectoryAsInProject(directory) {
        if (this.isDirectoryInProject(directory))
            return;
        const inProjectCoordinator = this;
        const compilerFactory = this.#compilerFactory;
        directory._inProject = true;
        markAncestorDirs(directory);
        function markAncestorDirs(dir) {
            const ancestorDirs = Array.from(getAncestorsUpToOneInProject(dir));
            const topAncestor = ancestorDirs[ancestorDirs.length - 1];
            if (topAncestor == null || !inProjectCoordinator.isDirectoryInProject(topAncestor))
                return;
            for (const ancestorDir of ancestorDirs)
                ancestorDir._inProject = true;
        }
        function* getAncestorsUpToOneInProject(dir) {
            if (common.FileUtils.isRootDirPath(dir.getPath()))
                return;
            const parentDirPath = common.FileUtils.getDirPath(dir.getPath());
            const parentDir = compilerFactory.getDirectoryFromCacheOnlyIfInCache(parentDirPath);
            if (parentDir == null)
                return;
            yield parentDir;
            if (!inProjectCoordinator.isDirectoryInProject(parentDir))
                yield* getAncestorsUpToOneInProject(parentDir);
        }
    }
    isDirectoryInProject(directory) {
        return directory._inProject === true;
    }
}

let StructurePrinterFactory = (() => {
    let _instanceExtraInitializers = [];
    let _forInitializerExpressionableNode_decorators;
    let _forModifierableNode_decorators;
    let _forReturnTypedNode_decorators;
    let _forTypedNode_decorators;
    let _forClassDeclaration_decorators;
    let _forClassMember_decorators;
    let _forClassStaticBlockDeclaration_decorators;
    let _forConstructorDeclaration_decorators;
    let _forGetAccessorDeclaration_decorators;
    let _forMethodDeclaration_decorators;
    let _forPropertyDeclaration_decorators;
    let _forSetAccessorDeclaration_decorators;
    let _forDecorator_decorators;
    let _forJSDoc_decorators;
    let _forJSDocTag_decorators;
    let _forEnumDeclaration_decorators;
    let _forEnumMember_decorators;
    let _forObjectLiteralExpressionProperty_decorators;
    let _forPropertyAssignment_decorators;
    let _forShorthandPropertyAssignment_decorators;
    let _forSpreadAssignment_decorators;
    let _forFunctionDeclaration_decorators;
    let _forParameterDeclaration_decorators;
    let _forCallSignatureDeclaration_decorators;
    let _forConstructSignatureDeclaration_decorators;
    let _forIndexSignatureDeclaration_decorators;
    let _forInterfaceDeclaration_decorators;
    let _forMethodSignature_decorators;
    let _forPropertySignature_decorators;
    let _forTypeElementMemberedNode_decorators;
    let _forTypeElementMember_decorators;
    let _forJsxAttributeDecider_decorators;
    let _forJsxAttribute_decorators;
    let _forJsxChildDecider_decorators;
    let _forJsxElement_decorators;
    let _forJsxNamespacedName_decorators;
    let _forJsxSelfClosingElement_decorators;
    let _forJsxSpreadAttribute_decorators;
    let _forExportAssignment_decorators;
    let _forExportDeclaration_decorators;
    let _forImportAttribute_decorators;
    let _forImportDeclaration_decorators;
    let _forModuleDeclaration_decorators;
    let _forNamedImportExportSpecifier_decorators;
    let _forSourceFile_decorators;
    let _forStatementedNode_decorators;
    let _forStatement_decorators;
    let _forVariableStatement_decorators;
    let _forTypeAliasDeclaration_decorators;
    let _forTypeParameterDeclaration_decorators;
    let _forVariableDeclaration_decorators;
    return class StructurePrinterFactory {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _forInitializerExpressionableNode_decorators = [common.Memoize];
            _forModifierableNode_decorators = [common.Memoize];
            _forReturnTypedNode_decorators = [common.Memoize];
            _forTypedNode_decorators = [common.Memoize];
            _forClassDeclaration_decorators = [common.Memoize];
            _forClassMember_decorators = [common.Memoize];
            _forClassStaticBlockDeclaration_decorators = [common.Memoize];
            _forConstructorDeclaration_decorators = [common.Memoize];
            _forGetAccessorDeclaration_decorators = [common.Memoize];
            _forMethodDeclaration_decorators = [common.Memoize];
            _forPropertyDeclaration_decorators = [common.Memoize];
            _forSetAccessorDeclaration_decorators = [common.Memoize];
            _forDecorator_decorators = [common.Memoize];
            _forJSDoc_decorators = [common.Memoize];
            _forJSDocTag_decorators = [common.Memoize];
            _forEnumDeclaration_decorators = [common.Memoize];
            _forEnumMember_decorators = [common.Memoize];
            _forObjectLiteralExpressionProperty_decorators = [common.Memoize];
            _forPropertyAssignment_decorators = [common.Memoize];
            _forShorthandPropertyAssignment_decorators = [common.Memoize];
            _forSpreadAssignment_decorators = [common.Memoize];
            _forFunctionDeclaration_decorators = [common.Memoize];
            _forParameterDeclaration_decorators = [common.Memoize];
            _forCallSignatureDeclaration_decorators = [common.Memoize];
            _forConstructSignatureDeclaration_decorators = [common.Memoize];
            _forIndexSignatureDeclaration_decorators = [common.Memoize];
            _forInterfaceDeclaration_decorators = [common.Memoize];
            _forMethodSignature_decorators = [common.Memoize];
            _forPropertySignature_decorators = [common.Memoize];
            _forTypeElementMemberedNode_decorators = [common.Memoize];
            _forTypeElementMember_decorators = [common.Memoize];
            _forJsxAttributeDecider_decorators = [common.Memoize];
            _forJsxAttribute_decorators = [common.Memoize];
            _forJsxChildDecider_decorators = [common.Memoize];
            _forJsxElement_decorators = [common.Memoize];
            _forJsxNamespacedName_decorators = [common.Memoize];
            _forJsxSelfClosingElement_decorators = [common.Memoize];
            _forJsxSpreadAttribute_decorators = [common.Memoize];
            _forExportAssignment_decorators = [common.Memoize];
            _forExportDeclaration_decorators = [common.Memoize];
            _forImportAttribute_decorators = [common.Memoize];
            _forImportDeclaration_decorators = [common.Memoize];
            _forModuleDeclaration_decorators = [common.Memoize];
            _forNamedImportExportSpecifier_decorators = [common.Memoize];
            _forSourceFile_decorators = [common.Memoize];
            _forStatementedNode_decorators = [common.Memoize];
            _forStatement_decorators = [common.Memoize];
            _forVariableStatement_decorators = [common.Memoize];
            _forTypeAliasDeclaration_decorators = [common.Memoize];
            _forTypeParameterDeclaration_decorators = [common.Memoize];
            _forVariableDeclaration_decorators = [common.Memoize];
            __esDecorate(this, null, _forInitializerExpressionableNode_decorators, { kind: "method", name: "forInitializerExpressionableNode", static: false, private: false, access: { has: obj => "forInitializerExpressionableNode" in obj, get: obj => obj.forInitializerExpressionableNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forModifierableNode_decorators, { kind: "method", name: "forModifierableNode", static: false, private: false, access: { has: obj => "forModifierableNode" in obj, get: obj => obj.forModifierableNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forReturnTypedNode_decorators, { kind: "method", name: "forReturnTypedNode", static: false, private: false, access: { has: obj => "forReturnTypedNode" in obj, get: obj => obj.forReturnTypedNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forTypedNode_decorators, { kind: "method", name: "forTypedNode", static: false, private: false, access: { has: obj => "forTypedNode" in obj, get: obj => obj.forTypedNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forClassDeclaration_decorators, { kind: "method", name: "forClassDeclaration", static: false, private: false, access: { has: obj => "forClassDeclaration" in obj, get: obj => obj.forClassDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forClassMember_decorators, { kind: "method", name: "forClassMember", static: false, private: false, access: { has: obj => "forClassMember" in obj, get: obj => obj.forClassMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forClassStaticBlockDeclaration_decorators, { kind: "method", name: "forClassStaticBlockDeclaration", static: false, private: false, access: { has: obj => "forClassStaticBlockDeclaration" in obj, get: obj => obj.forClassStaticBlockDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forConstructorDeclaration_decorators, { kind: "method", name: "forConstructorDeclaration", static: false, private: false, access: { has: obj => "forConstructorDeclaration" in obj, get: obj => obj.forConstructorDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forGetAccessorDeclaration_decorators, { kind: "method", name: "forGetAccessorDeclaration", static: false, private: false, access: { has: obj => "forGetAccessorDeclaration" in obj, get: obj => obj.forGetAccessorDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forMethodDeclaration_decorators, { kind: "method", name: "forMethodDeclaration", static: false, private: false, access: { has: obj => "forMethodDeclaration" in obj, get: obj => obj.forMethodDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forPropertyDeclaration_decorators, { kind: "method", name: "forPropertyDeclaration", static: false, private: false, access: { has: obj => "forPropertyDeclaration" in obj, get: obj => obj.forPropertyDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forSetAccessorDeclaration_decorators, { kind: "method", name: "forSetAccessorDeclaration", static: false, private: false, access: { has: obj => "forSetAccessorDeclaration" in obj, get: obj => obj.forSetAccessorDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forDecorator_decorators, { kind: "method", name: "forDecorator", static: false, private: false, access: { has: obj => "forDecorator" in obj, get: obj => obj.forDecorator }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJSDoc_decorators, { kind: "method", name: "forJSDoc", static: false, private: false, access: { has: obj => "forJSDoc" in obj, get: obj => obj.forJSDoc }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJSDocTag_decorators, { kind: "method", name: "forJSDocTag", static: false, private: false, access: { has: obj => "forJSDocTag" in obj, get: obj => obj.forJSDocTag }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forEnumDeclaration_decorators, { kind: "method", name: "forEnumDeclaration", static: false, private: false, access: { has: obj => "forEnumDeclaration" in obj, get: obj => obj.forEnumDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forEnumMember_decorators, { kind: "method", name: "forEnumMember", static: false, private: false, access: { has: obj => "forEnumMember" in obj, get: obj => obj.forEnumMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forObjectLiteralExpressionProperty_decorators, { kind: "method", name: "forObjectLiteralExpressionProperty", static: false, private: false, access: { has: obj => "forObjectLiteralExpressionProperty" in obj, get: obj => obj.forObjectLiteralExpressionProperty }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forPropertyAssignment_decorators, { kind: "method", name: "forPropertyAssignment", static: false, private: false, access: { has: obj => "forPropertyAssignment" in obj, get: obj => obj.forPropertyAssignment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forShorthandPropertyAssignment_decorators, { kind: "method", name: "forShorthandPropertyAssignment", static: false, private: false, access: { has: obj => "forShorthandPropertyAssignment" in obj, get: obj => obj.forShorthandPropertyAssignment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forSpreadAssignment_decorators, { kind: "method", name: "forSpreadAssignment", static: false, private: false, access: { has: obj => "forSpreadAssignment" in obj, get: obj => obj.forSpreadAssignment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forFunctionDeclaration_decorators, { kind: "method", name: "forFunctionDeclaration", static: false, private: false, access: { has: obj => "forFunctionDeclaration" in obj, get: obj => obj.forFunctionDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forParameterDeclaration_decorators, { kind: "method", name: "forParameterDeclaration", static: false, private: false, access: { has: obj => "forParameterDeclaration" in obj, get: obj => obj.forParameterDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forCallSignatureDeclaration_decorators, { kind: "method", name: "forCallSignatureDeclaration", static: false, private: false, access: { has: obj => "forCallSignatureDeclaration" in obj, get: obj => obj.forCallSignatureDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forConstructSignatureDeclaration_decorators, { kind: "method", name: "forConstructSignatureDeclaration", static: false, private: false, access: { has: obj => "forConstructSignatureDeclaration" in obj, get: obj => obj.forConstructSignatureDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forIndexSignatureDeclaration_decorators, { kind: "method", name: "forIndexSignatureDeclaration", static: false, private: false, access: { has: obj => "forIndexSignatureDeclaration" in obj, get: obj => obj.forIndexSignatureDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forInterfaceDeclaration_decorators, { kind: "method", name: "forInterfaceDeclaration", static: false, private: false, access: { has: obj => "forInterfaceDeclaration" in obj, get: obj => obj.forInterfaceDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forMethodSignature_decorators, { kind: "method", name: "forMethodSignature", static: false, private: false, access: { has: obj => "forMethodSignature" in obj, get: obj => obj.forMethodSignature }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forPropertySignature_decorators, { kind: "method", name: "forPropertySignature", static: false, private: false, access: { has: obj => "forPropertySignature" in obj, get: obj => obj.forPropertySignature }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forTypeElementMemberedNode_decorators, { kind: "method", name: "forTypeElementMemberedNode", static: false, private: false, access: { has: obj => "forTypeElementMemberedNode" in obj, get: obj => obj.forTypeElementMemberedNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forTypeElementMember_decorators, { kind: "method", name: "forTypeElementMember", static: false, private: false, access: { has: obj => "forTypeElementMember" in obj, get: obj => obj.forTypeElementMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJsxAttributeDecider_decorators, { kind: "method", name: "forJsxAttributeDecider", static: false, private: false, access: { has: obj => "forJsxAttributeDecider" in obj, get: obj => obj.forJsxAttributeDecider }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJsxAttribute_decorators, { kind: "method", name: "forJsxAttribute", static: false, private: false, access: { has: obj => "forJsxAttribute" in obj, get: obj => obj.forJsxAttribute }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJsxChildDecider_decorators, { kind: "method", name: "forJsxChildDecider", static: false, private: false, access: { has: obj => "forJsxChildDecider" in obj, get: obj => obj.forJsxChildDecider }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJsxElement_decorators, { kind: "method", name: "forJsxElement", static: false, private: false, access: { has: obj => "forJsxElement" in obj, get: obj => obj.forJsxElement }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJsxNamespacedName_decorators, { kind: "method", name: "forJsxNamespacedName", static: false, private: false, access: { has: obj => "forJsxNamespacedName" in obj, get: obj => obj.forJsxNamespacedName }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJsxSelfClosingElement_decorators, { kind: "method", name: "forJsxSelfClosingElement", static: false, private: false, access: { has: obj => "forJsxSelfClosingElement" in obj, get: obj => obj.forJsxSelfClosingElement }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forJsxSpreadAttribute_decorators, { kind: "method", name: "forJsxSpreadAttribute", static: false, private: false, access: { has: obj => "forJsxSpreadAttribute" in obj, get: obj => obj.forJsxSpreadAttribute }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forExportAssignment_decorators, { kind: "method", name: "forExportAssignment", static: false, private: false, access: { has: obj => "forExportAssignment" in obj, get: obj => obj.forExportAssignment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forExportDeclaration_decorators, { kind: "method", name: "forExportDeclaration", static: false, private: false, access: { has: obj => "forExportDeclaration" in obj, get: obj => obj.forExportDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forImportAttribute_decorators, { kind: "method", name: "forImportAttribute", static: false, private: false, access: { has: obj => "forImportAttribute" in obj, get: obj => obj.forImportAttribute }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forImportDeclaration_decorators, { kind: "method", name: "forImportDeclaration", static: false, private: false, access: { has: obj => "forImportDeclaration" in obj, get: obj => obj.forImportDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forModuleDeclaration_decorators, { kind: "method", name: "forModuleDeclaration", static: false, private: false, access: { has: obj => "forModuleDeclaration" in obj, get: obj => obj.forModuleDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forNamedImportExportSpecifier_decorators, { kind: "method", name: "forNamedImportExportSpecifier", static: false, private: false, access: { has: obj => "forNamedImportExportSpecifier" in obj, get: obj => obj.forNamedImportExportSpecifier }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forSourceFile_decorators, { kind: "method", name: "forSourceFile", static: false, private: false, access: { has: obj => "forSourceFile" in obj, get: obj => obj.forSourceFile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forStatementedNode_decorators, { kind: "method", name: "forStatementedNode", static: false, private: false, access: { has: obj => "forStatementedNode" in obj, get: obj => obj.forStatementedNode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forStatement_decorators, { kind: "method", name: "forStatement", static: false, private: false, access: { has: obj => "forStatement" in obj, get: obj => obj.forStatement }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forVariableStatement_decorators, { kind: "method", name: "forVariableStatement", static: false, private: false, access: { has: obj => "forVariableStatement" in obj, get: obj => obj.forVariableStatement }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forTypeAliasDeclaration_decorators, { kind: "method", name: "forTypeAliasDeclaration", static: false, private: false, access: { has: obj => "forTypeAliasDeclaration" in obj, get: obj => obj.forTypeAliasDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forTypeParameterDeclaration_decorators, { kind: "method", name: "forTypeParameterDeclaration", static: false, private: false, access: { has: obj => "forTypeParameterDeclaration" in obj, get: obj => obj.forTypeParameterDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forVariableDeclaration_decorators, { kind: "method", name: "forVariableDeclaration", static: false, private: false, access: { has: obj => "forVariableDeclaration" in obj, get: obj => obj.forVariableDeclaration }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        _getFormatCodeSettings = __runInitializers(this, _instanceExtraInitializers);
        constructor(_getFormatCodeSettings) {
            this._getFormatCodeSettings = _getFormatCodeSettings;
        }
        getFormatCodeSettings() {
            return this._getFormatCodeSettings();
        }
        forInitializerExpressionableNode() {
            return new InitializerExpressionableNodeStructurePrinter();
        }
        forModifierableNode() {
            return new ModifierableNodeStructurePrinter();
        }
        forReturnTypedNode(alwaysWrite) {
            return new ReturnTypedNodeStructurePrinter(alwaysWrite);
        }
        forTypedNode(separator, alwaysWrite) {
            return new TypedNodeStructurePrinter(separator, alwaysWrite);
        }
        forClassDeclaration(options) {
            return new ClassDeclarationStructurePrinter(this, options);
        }
        forClassMember(options) {
            return new ClassMemberStructurePrinter(this, options);
        }
        forClassStaticBlockDeclaration() {
            return new ClassStaticBlockDeclarationStructurePrinter(this);
        }
        forConstructorDeclaration(options) {
            return new ConstructorDeclarationStructurePrinter(this, options);
        }
        forGetAccessorDeclaration(options) {
            return new GetAccessorDeclarationStructurePrinter(this, options);
        }
        forMethodDeclaration(options) {
            return new MethodDeclarationStructurePrinter(this, options);
        }
        forPropertyDeclaration() {
            return new PropertyDeclarationStructurePrinter(this);
        }
        forSetAccessorDeclaration(options) {
            return new SetAccessorDeclarationStructurePrinter(this, options);
        }
        forDecorator() {
            return new DecoratorStructurePrinter(this);
        }
        forJSDoc() {
            return new JSDocStructurePrinter(this);
        }
        forJSDocTag(options) {
            return new JSDocTagStructurePrinter(this, options);
        }
        forEnumDeclaration() {
            return new EnumDeclarationStructurePrinter(this);
        }
        forEnumMember() {
            return new EnumMemberStructurePrinter(this);
        }
        forObjectLiteralExpressionProperty() {
            return new ObjectLiteralExpressionPropertyStructurePrinter(this);
        }
        forPropertyAssignment() {
            return new PropertyAssignmentStructurePrinter(this);
        }
        forShorthandPropertyAssignment() {
            return new ShorthandPropertyAssignmentStructurePrinter(this);
        }
        forSpreadAssignment() {
            return new SpreadAssignmentStructurePrinter(this);
        }
        forFunctionDeclaration(options) {
            return new FunctionDeclarationStructurePrinter(this, options);
        }
        forParameterDeclaration() {
            return new ParameterDeclarationStructurePrinter(this);
        }
        forCallSignatureDeclaration() {
            return new CallSignatureDeclarationStructurePrinter(this);
        }
        forConstructSignatureDeclaration() {
            return new ConstructSignatureDeclarationStructurePrinter(this);
        }
        forIndexSignatureDeclaration() {
            return new IndexSignatureDeclarationStructurePrinter(this);
        }
        forInterfaceDeclaration() {
            return new InterfaceDeclarationStructurePrinter(this);
        }
        forMethodSignature() {
            return new MethodSignatureStructurePrinter(this);
        }
        forPropertySignature() {
            return new PropertySignatureStructurePrinter(this);
        }
        forTypeElementMemberedNode() {
            return new TypeElementMemberedNodeStructurePrinter(this);
        }
        forTypeElementMember() {
            return new TypeElementMemberStructurePrinter(this);
        }
        forJsxAttributeDecider() {
            return new JsxAttributeDeciderStructurePrinter(this);
        }
        forJsxAttribute() {
            return new JsxAttributeStructurePrinter(this);
        }
        forJsxChildDecider() {
            return new JsxChildDeciderStructurePrinter(this);
        }
        forJsxElement() {
            return new JsxElementStructurePrinter(this);
        }
        forJsxNamespacedName() {
            return new JsxNamespacedNameStructurePrinter(this);
        }
        forJsxSelfClosingElement() {
            return new JsxSelfClosingElementStructurePrinter(this);
        }
        forJsxSpreadAttribute() {
            return new JsxSpreadAttributeStructurePrinter(this);
        }
        forExportAssignment() {
            return new ExportAssignmentStructurePrinter(this);
        }
        forExportDeclaration() {
            return new ExportDeclarationStructurePrinter(this);
        }
        forImportAttribute() {
            return new ImportAttributeStructurePrinter(this);
        }
        forImportDeclaration() {
            return new ImportDeclarationStructurePrinter(this);
        }
        forModuleDeclaration(options) {
            return new ModuleDeclarationStructurePrinter(this, options);
        }
        forNamedImportExportSpecifier() {
            return new NamedImportExportSpecifierStructurePrinter(this);
        }
        forSourceFile(options) {
            return new SourceFileStructurePrinter(this, options);
        }
        forStatementedNode(options) {
            return new StatementedNodeStructurePrinter(this, options);
        }
        forStatement(options) {
            return new StatementStructurePrinter(this, options);
        }
        forVariableStatement() {
            return new VariableStatementStructurePrinter(this);
        }
        forTypeAliasDeclaration() {
            return new TypeAliasDeclarationStructurePrinter(this);
        }
        forTypeParameterDeclaration() {
            return new TypeParameterDeclarationStructurePrinter(this);
        }
        forVariableDeclaration() {
            return new VariableDeclarationStructurePrinter(this);
        }
    };
})();

let ProjectContext = (() => {
    let _instanceExtraInitializers = [];
    let _getSourceFileContainer_decorators;
    let _getModuleResolutionHost_decorators;
    return class ProjectContext {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getSourceFileContainer_decorators = [common.Memoize];
            _getModuleResolutionHost_decorators = [common.Memoize];
            __esDecorate(this, null, _getSourceFileContainer_decorators, { kind: "method", name: "getSourceFileContainer", static: false, private: false, access: { has: obj => "getSourceFileContainer" in obj, get: obj => obj.getSourceFileContainer }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getModuleResolutionHost_decorators, { kind: "method", name: "getModuleResolutionHost", static: false, private: false, access: { has: obj => "getModuleResolutionHost" in obj, get: obj => obj.getModuleResolutionHost }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #languageService = __runInitializers(this, _instanceExtraInitializers);
        #compilerOptions;
        #customTypeChecker;
        #project;
        get project() {
            if (this.#project == null)
                throw new common.errors.InvalidOperationError("This operation is not permitted in this context.");
            return this.#project;
        }
        logger = new ConsoleLogger();
        lazyReferenceCoordinator;
        directoryCoordinator;
        fileSystemWrapper;
        manipulationSettings = new ManipulationSettingsContainer();
        structurePrinterFactory;
        compilerFactory;
        inProjectCoordinator;
        constructor(params) {
            this.#project = params.project;
            this.fileSystemWrapper = params.fileSystemWrapper;
            this.#compilerOptions = params.compilerOptionsContainer;
            this.compilerFactory = new CompilerFactory(this);
            this.inProjectCoordinator = new InProjectCoordinator(this.compilerFactory);
            this.structurePrinterFactory = new StructurePrinterFactory(() => this.manipulationSettings.getFormatCodeSettings());
            this.lazyReferenceCoordinator = new LazyReferenceCoordinator(this.compilerFactory);
            this.directoryCoordinator = new DirectoryCoordinator(this.compilerFactory, params.fileSystemWrapper);
            this.#languageService = params.createLanguageService
                ? new LanguageService({
                    context: this,
                    configFileParsingDiagnostics: params.configFileParsingDiagnostics,
                    resolutionHost: params.resolutionHost && params.resolutionHost(this.getModuleResolutionHost(), () => this.compilerOptions.get()),
                    skipLoadingLibFiles: params.skipLoadingLibFiles,
                    libFolderPath: params.libFolderPath,
                })
                : undefined;
            if (params.typeChecker != null) {
                common.errors.throwIfTrue(params.createLanguageService, "Cannot specify a type checker and create a language service.");
                this.#customTypeChecker = new TypeChecker(this);
                this.#customTypeChecker._reset(() => params.typeChecker);
            }
        }
        get compilerOptions() {
            return this.#compilerOptions;
        }
        get languageService() {
            if (this.#languageService == null)
                throw this.#getToolRequiredError("language service");
            return this.#languageService;
        }
        get program() {
            if (this.#languageService == null)
                throw this.#getToolRequiredError("program");
            return this.languageService.getProgram();
        }
        get typeChecker() {
            if (this.#customTypeChecker != null)
                return this.#customTypeChecker;
            if (this.#languageService == null)
                throw this.#getToolRequiredError("type checker");
            return this.program.getTypeChecker();
        }
        hasLanguageService() {
            return this.#languageService != null;
        }
        getEncoding() {
            return this.compilerOptions.getEncoding();
        }
        getFormatCodeSettings() {
            return this.manipulationSettings.getFormatCodeSettings();
        }
        getUserPreferences() {
            return this.manipulationSettings.getUserPreferences();
        }
        resetProgram() {
            this.languageService._reset();
        }
        createWriter() {
            const indentationText = this.manipulationSettings.getIndentationText();
            return new CodeBlockWriter__default.default({
                newLine: this.manipulationSettings.getNewLineKindAsString(),
                indentNumberOfSpaces: indentationText === exports.IndentationText.Tab ? undefined : indentationText.length,
                useTabs: indentationText === exports.IndentationText.Tab,
                useSingleQuote: this.manipulationSettings.getQuoteKind() === exports.QuoteKind.Single,
            });
        }
        getPreEmitDiagnostics(sourceFile) {
            const compilerDiagnostics = common.ts.getPreEmitDiagnostics(this.program.compilerObject, sourceFile?.compilerNode);
            return compilerDiagnostics.map(d => this.compilerFactory.getDiagnostic(d));
        }
        getSourceFileContainer() {
            return {
                addOrGetSourceFileFromFilePath: (filePath, opts) => {
                    return Promise.resolve(this.compilerFactory.addOrGetSourceFileFromFilePath(filePath, opts)?.compilerNode);
                },
                addOrGetSourceFileFromFilePathSync: (filePath, opts) => {
                    return this.compilerFactory.addOrGetSourceFileFromFilePath(filePath, opts)?.compilerNode;
                },
                containsDirectoryAtPath: dirPath => this.compilerFactory.containsDirectoryAtPath(dirPath),
                containsSourceFileAtPath: filePath => this.compilerFactory.containsSourceFileAtPath(filePath),
                getSourceFileFromCacheFromFilePath: filePath => {
                    const sourceFile = this.compilerFactory.getSourceFileFromCacheFromFilePath(filePath);
                    return sourceFile?.compilerNode;
                },
                getSourceFilePaths: () => this.compilerFactory.getSourceFilePaths(),
                getSourceFileVersion: sourceFile => this.compilerFactory.documentRegistry.getSourceFileVersion(sourceFile),
                getChildDirectoriesOfDirectory: dirPath => {
                    const result = [];
                    for (const dir of this.compilerFactory.getChildDirectoriesOfDirectory(dirPath))
                        result.push(dir.getPath());
                    return result;
                },
            };
        }
        getModuleResolutionHost() {
            return common.createModuleResolutionHost({
                transactionalFileSystem: this.fileSystemWrapper,
                getEncoding: () => this.getEncoding(),
                sourceFileContainer: this.getSourceFileContainer(),
            });
        }
        #getToolRequiredError(name) {
            return new common.errors.InvalidOperationError(`A ${name} is required for this operation. `
                + "This might occur when manipulating or getting type information from a node that was not added "
                + `to a Project object and created via createWrappedNode. `
                + `Please submit a bug report if you don't believe a ${name} should be required for this operation.`);
        }
    };
})();

class Project {
    _context;
    constructor(options = {}) {
        verifyOptions();
        const fileSystem = getFileSystem();
        const fileSystemWrapper = new common.TransactionalFileSystem({
            fileSystem,
            skipLoadingLibFiles: options.skipLoadingLibFiles,
            libFolderPath: options.libFolderPath,
        });
        const tsConfigResolver = options.tsConfigFilePath == null
            ? undefined
            : new common.TsConfigResolver(fileSystemWrapper, fileSystemWrapper.getStandardizedAbsolutePath(options.tsConfigFilePath), getEncoding());
        const compilerOptions = getCompilerOptions();
        const compilerOptionsContainer = new common.CompilerOptionsContainer(options.defaultCompilerOptions);
        compilerOptionsContainer.set(compilerOptions);
        this._context = new ProjectContext({
            project: this,
            compilerOptionsContainer,
            fileSystemWrapper,
            createLanguageService: true,
            resolutionHost: options.resolutionHost,
            configFileParsingDiagnostics: tsConfigResolver?.getErrors() ?? [],
            skipLoadingLibFiles: options.skipLoadingLibFiles,
            libFolderPath: options.libFolderPath,
        });
        if (options.manipulationSettings != null)
            this._context.manipulationSettings.set(options.manipulationSettings);
        if (tsConfigResolver != null && options.skipAddingFilesFromTsConfig !== true) {
            this.#addSourceFilesForTsConfigResolver(tsConfigResolver, compilerOptions);
            if (!options.skipFileDependencyResolution)
                this.resolveSourceFileDependencies();
        }
        function verifyOptions() {
            if (options.fileSystem != null && options.useInMemoryFileSystem)
                throw new common.errors.InvalidOperationError("Cannot provide a file system when specifying to use an in-memory file system.");
        }
        function getFileSystem() {
            if (options.useInMemoryFileSystem)
                return new common.InMemoryFileSystemHost();
            return options.fileSystem ?? new common.RealFileSystemHost();
        }
        function getCompilerOptions() {
            return {
                ...getTsConfigCompilerOptions(),
                ...(options.compilerOptions ?? {}),
            };
        }
        function getTsConfigCompilerOptions() {
            return tsConfigResolver?.getCompilerOptions() ?? {};
        }
        function getEncoding() {
            const defaultEncoding = "utf-8";
            if (options.compilerOptions != null)
                return options.compilerOptions.charset ?? defaultEncoding;
            return defaultEncoding;
        }
    }
    get manipulationSettings() {
        return this._context.manipulationSettings;
    }
    get compilerOptions() {
        return this._context.compilerOptions;
    }
    resolveSourceFileDependencies() {
        const sourceFiles = new Set();
        const onSourceFileAdded = (sourceFile) => sourceFiles.add(sourceFile);
        const { compilerFactory, inProjectCoordinator } = this._context;
        compilerFactory.onSourceFileAdded(onSourceFileAdded);
        try {
            this.getProgram().compilerObject;
        }
        finally {
            compilerFactory.onSourceFileAdded(onSourceFileAdded, false);
        }
        const result = inProjectCoordinator.markSourceFilesAsInProjectForResolution();
        for (const sourceFile of result.changedSourceFiles)
            sourceFiles.add(sourceFile);
        for (const sourceFile of result.unchangedSourceFiles)
            sourceFiles.delete(sourceFile);
        return Array.from(sourceFiles.values());
    }
    addDirectoryAtPathIfExists(dirPath, options = {}) {
        return this._context.directoryCoordinator.addDirectoryAtPathIfExists(this._context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath), { ...options, markInProject: true });
    }
    addDirectoryAtPath(dirPath, options = {}) {
        return this._context.directoryCoordinator.addDirectoryAtPath(this._context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath), { ...options, markInProject: true });
    }
    createDirectory(dirPath) {
        return this._context.directoryCoordinator.createDirectoryOrAddIfExists(this._context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath), { markInProject: true });
    }
    getDirectoryOrThrow(dirPath, message) {
        return common.errors.throwIfNullOrUndefined(this.getDirectory(dirPath), message ?? (() => `Could not find a directory at the specified path: ${this._context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath)}`));
    }
    getDirectory(dirPath) {
        const { compilerFactory } = this._context;
        return compilerFactory.getDirectoryFromCache(this._context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath));
    }
    getDirectories() {
        return Array.from(this.#getProjectDirectoriesByDirectoryDepth());
    }
    getRootDirectories() {
        const { inProjectCoordinator } = this._context;
        const result = [];
        for (const dir of this._context.compilerFactory.getOrphanDirectories()) {
            for (const inProjectDir of findInProjectDirectories(dir))
                result.push(inProjectDir);
        }
        return result;
        function* findInProjectDirectories(dir) {
            if (inProjectCoordinator.isDirectoryInProject(dir)) {
                yield dir;
                return;
            }
            for (const childDir of dir._getDirectoriesIterator())
                yield* findInProjectDirectories(childDir);
        }
    }
    addSourceFilesAtPaths(fileGlobs) {
        return this._context.directoryCoordinator.addSourceFilesAtPaths(fileGlobs, { markInProject: true });
    }
    addSourceFileAtPathIfExists(filePath) {
        return this._context.directoryCoordinator.addSourceFileAtPathIfExists(this._context.fileSystemWrapper.getStandardizedAbsolutePath(filePath), {
            markInProject: true,
        });
    }
    addSourceFileAtPath(filePath) {
        return this._context.directoryCoordinator.addSourceFileAtPath(this._context.fileSystemWrapper.getStandardizedAbsolutePath(filePath), {
            markInProject: true,
        });
    }
    addSourceFilesFromTsConfig(tsConfigFilePath) {
        const resolver = new common.TsConfigResolver(this._context.fileSystemWrapper, this._context.fileSystemWrapper.getStandardizedAbsolutePath(tsConfigFilePath), this._context.getEncoding());
        return this.#addSourceFilesForTsConfigResolver(resolver, resolver.getCompilerOptions());
    }
    #addSourceFilesForTsConfigResolver(tsConfigResolver, compilerOptions) {
        const paths = tsConfigResolver.getPaths(compilerOptions);
        const addedSourceFiles = paths.filePaths.map(p => this.addSourceFileAtPath(p));
        for (const dirPath of paths.directoryPaths)
            this.addDirectoryAtPathIfExists(dirPath);
        return addedSourceFiles;
    }
    createSourceFile(filePath, sourceFileText, options) {
        return this._context.compilerFactory.createSourceFile(this._context.fileSystemWrapper.getStandardizedAbsolutePath(filePath), sourceFileText ?? "", { ...(options ?? {}), markInProject: true });
    }
    removeSourceFile(sourceFile) {
        const previouslyForgotten = sourceFile.wasForgotten();
        sourceFile.forget();
        return !previouslyForgotten;
    }
    getSourceFileOrThrow(fileNameOrSearchFunction) {
        const sourceFile = this.getSourceFile(fileNameOrSearchFunction);
        if (sourceFile != null)
            return sourceFile;
        if (typeof fileNameOrSearchFunction === "string") {
            const fileNameOrPath = common.FileUtils.standardizeSlashes(fileNameOrSearchFunction);
            if (common.FileUtils.pathIsAbsolute(fileNameOrPath) || fileNameOrPath.indexOf("/") >= 0) {
                const errorFileNameOrPath = this._context.fileSystemWrapper.getStandardizedAbsolutePath(fileNameOrPath);
                throw new common.errors.InvalidOperationError(`Could not find source file in project at the provided path: ${errorFileNameOrPath}`);
            }
            else {
                throw new common.errors.InvalidOperationError(`Could not find source file in project with the provided file name: ${fileNameOrSearchFunction}`);
            }
        }
        else {
            throw new common.errors.InvalidOperationError(`Could not find source file in project based on the provided condition.`);
        }
    }
    getSourceFile(fileNameOrSearchFunction) {
        const filePathOrSearchFunction = getFilePathOrSearchFunction(this._context.fileSystemWrapper);
        if (isStandardizedFilePath(filePathOrSearchFunction)) {
            return this._context.compilerFactory.getSourceFileFromCacheFromFilePath(filePathOrSearchFunction);
        }
        return common.IterableUtils.find(this.#getProjectSourceFilesByDirectoryDepth(), filePathOrSearchFunction);
        function getFilePathOrSearchFunction(fileSystemWrapper) {
            if (fileNameOrSearchFunction instanceof Function)
                return fileNameOrSearchFunction;
            const fileNameOrPath = common.FileUtils.standardizeSlashes(fileNameOrSearchFunction);
            if (common.FileUtils.pathIsAbsolute(fileNameOrPath) || fileNameOrPath.indexOf("/") >= 0)
                return fileSystemWrapper.getStandardizedAbsolutePath(fileNameOrPath);
            else
                return def => common.FileUtils.pathEndsWith(def.getFilePath(), fileNameOrPath);
        }
        function isStandardizedFilePath(obj) {
            return typeof obj === "string";
        }
    }
    getSourceFiles(globPatterns) {
        const { compilerFactory, fileSystemWrapper } = this._context;
        const sourceFiles = this.#getProjectSourceFilesByDirectoryDepth();
        if (typeof globPatterns === "string" || globPatterns instanceof Array)
            return Array.from(getFilteredSourceFiles());
        else
            return Array.from(sourceFiles);
        function* getFilteredSourceFiles() {
            const sourceFilePaths = Array.from(getSourceFilePaths());
            const matchedPaths = common.matchGlobs(sourceFilePaths, globPatterns, fileSystemWrapper.getCurrentDirectory());
            for (const matchedPath of matchedPaths)
                yield compilerFactory.getSourceFileFromCacheFromFilePath(fileSystemWrapper.getStandardizedAbsolutePath(matchedPath));
            function* getSourceFilePaths() {
                for (const sourceFile of sourceFiles)
                    yield sourceFile.getFilePath();
            }
        }
    }
    *#getProjectSourceFilesByDirectoryDepth() {
        const { compilerFactory, inProjectCoordinator } = this._context;
        for (const sourceFile of compilerFactory.getSourceFilesByDirectoryDepth()) {
            if (inProjectCoordinator.isSourceFileInProject(sourceFile))
                yield sourceFile;
        }
    }
    *#getProjectDirectoriesByDirectoryDepth() {
        const { compilerFactory, inProjectCoordinator } = this._context;
        for (const directory of compilerFactory.getDirectoriesByDepth()) {
            if (inProjectCoordinator.isDirectoryInProject(directory))
                yield directory;
        }
    }
    getAmbientModule(moduleName) {
        moduleName = normalizeAmbientModuleName(moduleName);
        return this.getAmbientModules().find(s => s.getName() === moduleName);
    }
    getAmbientModuleOrThrow(moduleName, message) {
        return common.errors.throwIfNullOrUndefined(this.getAmbientModule(moduleName), message ?? (() => `Could not find ambient module with name: ${normalizeAmbientModuleName(moduleName)}`));
    }
    getAmbientModules() {
        return this.getTypeChecker().getAmbientModules();
    }
    async save() {
        await this._context.fileSystemWrapper.flush();
        await Promise.all(this.#getUnsavedSourceFiles().map(f => f.save()));
    }
    saveSync() {
        this._context.fileSystemWrapper.flushSync();
        for (const file of this.#getUnsavedSourceFiles())
            file.saveSync();
    }
    enableLogging(enabled = true) {
        this._context.logger.setEnabled(enabled);
    }
    #getUnsavedSourceFiles() {
        return Array.from(getUnsavedIterator(this._context.compilerFactory.getSourceFilesByDirectoryDepth()));
        function* getUnsavedIterator(sourceFiles) {
            for (const sourceFile of sourceFiles) {
                if (!sourceFile.isSaved())
                    yield sourceFile;
            }
        }
    }
    getPreEmitDiagnostics() {
        return this._context.getPreEmitDiagnostics();
    }
    getLanguageService() {
        return this._context.languageService;
    }
    getProgram() {
        return this._context.program;
    }
    getTypeChecker() {
        return this._context.typeChecker;
    }
    getFileSystem() {
        return this._context.fileSystemWrapper.getFileSystem();
    }
    emit(emitOptions = {}) {
        return this._context.program.emit(emitOptions);
    }
    emitSync(emitOptions = {}) {
        return this._context.program.emitSync(emitOptions);
    }
    emitToMemory(emitOptions = {}) {
        return this._context.program.emitToMemory(emitOptions);
    }
    getCompilerOptions() {
        return this._context.compilerOptions.get();
    }
    getConfigFileParsingDiagnostics() {
        return this.getProgram().getConfigFileParsingDiagnostics();
    }
    createWriter() {
        return this._context.createWriter();
    }
    forgetNodesCreatedInBlock(block) {
        return this._context.compilerFactory.forgetNodesCreatedInBlock(block);
    }
    formatDiagnosticsWithColorAndContext(diagnostics, opts = {}) {
        return common.ts.formatDiagnosticsWithColorAndContext(diagnostics.map(d => d.compilerObject), {
            getCurrentDirectory: () => this._context.fileSystemWrapper.getCurrentDirectory(),
            getCanonicalFileName: fileName => fileName,
            getNewLine: () => opts.newLineChar ?? common.runtime.getEndOfLine(),
        });
    }
    getModuleResolutionHost() {
        return this._context.getModuleResolutionHost();
    }
}
function normalizeAmbientModuleName(moduleName) {
    if (isQuote(moduleName[0]) && isQuote(moduleName[moduleName.length - 1]))
        moduleName = moduleName.substring(1, moduleName.length - 1);
    return `"${moduleName}"`;
    function isQuote(char) {
        return char === `"` || char === "'";
    }
}

function createWrappedNode(node, opts = {}) {
    const { compilerOptions = {}, sourceFile, typeChecker } = opts;
    const compilerOptionsContainer = new common.CompilerOptionsContainer();
    compilerOptionsContainer.set(compilerOptions);
    const projectContext = new ProjectContext({
        project: undefined,
        fileSystemWrapper: new common.TransactionalFileSystem({
            fileSystem: new common.RealFileSystemHost(),
            skipLoadingLibFiles: true,
            libFolderPath: undefined,
        }),
        compilerOptionsContainer,
        createLanguageService: false,
        typeChecker,
        configFileParsingDiagnostics: [],
        skipLoadingLibFiles: true,
        libFolderPath: undefined,
    });
    const wrappedSourceFile = projectContext.compilerFactory.getSourceFile(getSourceFileNode(), { markInProject: true });
    return projectContext.compilerFactory.getNodeFromCompilerNode(node, wrappedSourceFile);
    function getSourceFileNode() {
        return sourceFile ?? getSourceFileFromNode(node);
    }
    function getSourceFileFromNode(compilerNode) {
        if (compilerNode.kind === common.SyntaxKind.SourceFile)
            return compilerNode;
        if (compilerNode.parent == null)
            throw new common.errors.InvalidOperationError("Please ensure the node was created from a source file with 'setParentNodes' set to 'true'.");
        let parent = compilerNode;
        while (parent.parent != null)
            parent = parent.parent;
        if (parent.kind !== common.SyntaxKind.SourceFile)
            throw new common.errors.NotImplementedError("For some reason the top parent was not a source file.");
        return parent;
    }
}

const structurePrinterFactory = new StructurePrinterFactory(() => {
    throw new common.errors.NotImplementedError("Not implemented scenario for getting code format settings when using a writer function. Please open an issue.");
});
class Writers {
    constructor() {
    }
    static object(obj) {
        return (writer) => {
            const keyNames = Object.keys(obj);
            writer.write("{");
            if (keyNames.length > 0) {
                writer.indent(() => {
                    writeObject();
                });
            }
            writer.write("}");
            function writeObject() {
                for (let i = 0; i < keyNames.length; i++) {
                    if (i > 0)
                        writer.write(",").newLine();
                    const keyName = keyNames[i];
                    const value = obj[keyName];
                    writer.write(keyName);
                    if (value != null) {
                        writer.write(": ");
                        writeValue(writer, value);
                    }
                }
                writer.newLine();
            }
        };
    }
    static objectType(structure) {
        return (writer) => {
            writer.write("{");
            if (anyPropertyHasValue(structure)) {
                writer.indent(() => {
                    structurePrinterFactory.forTypeElementMemberedNode().printText(writer, structure);
                });
            }
            writer.write("}");
        };
    }
    static unionType(firstType, secondType, ...additionalTypes) {
        return getWriteFunctionForUnionOrIntersectionType("|", [firstType, secondType, ...additionalTypes]);
    }
    static intersectionType(firstType, secondType, ...additionalTypes) {
        return getWriteFunctionForUnionOrIntersectionType("&", [firstType, secondType, ...additionalTypes]);
    }
    static assertion(type, assertionType) {
        return (writer) => {
            writeValue(writer, type);
            writer.spaceIfLastNot().write("as ");
            writeValue(writer, assertionType);
        };
    }
    static returnStatement(value) {
        return (writer) => {
            writer.write("return ");
            writer.hangingIndentUnlessBlock(() => {
                writeValue(writer, value);
                writer.write(";");
            });
        };
    }
}
function getWriteFunctionForUnionOrIntersectionType(separator, args) {
    return (writer) => {
        writeSeparatedByString(writer, ` ${separator} `, args);
    };
}
function anyPropertyHasValue(obj) {
    for (const key of Object.keys(obj)) {
        if (obj[key] == null)
            continue;
        if (obj[key] instanceof Array && obj[key].length === 0)
            continue;
        return true;
    }
    return false;
}
function writeSeparatedByString(writer, separator, values) {
    for (let i = 0; i < values.length; i++) {
        writer.conditionalWrite(i > 0, separator);
        writeValue(writer, values[i]);
    }
}
function writeValue(writer, value) {
    if (value instanceof Function)
        value(writer);
    else
        writer.write(value.toString());
}

const { InvalidOperationError, FileNotFoundError, ArgumentError, ArgumentNullOrWhitespaceError, ArgumentOutOfRangeError, ArgumentTypeError, BaseError, DirectoryNotFoundError, NotImplementedError, NotSupportedError, PathNotFoundError, } = common.errors;

Object.defineProperty(exports, "CompilerOptionsContainer", {
    enumerable: true,
    get: function () { return common.CompilerOptionsContainer; }
});
Object.defineProperty(exports, "DiagnosticCategory", {
    enumerable: true,
    get: function () { return common.DiagnosticCategory; }
});
Object.defineProperty(exports, "EmitHint", {
    enumerable: true,
    get: function () { return common.EmitHint; }
});
Object.defineProperty(exports, "InMemoryFileSystemHost", {
    enumerable: true,
    get: function () { return common.InMemoryFileSystemHost; }
});
Object.defineProperty(exports, "LanguageVariant", {
    enumerable: true,
    get: function () { return common.LanguageVariant; }
});
Object.defineProperty(exports, "ModuleKind", {
    enumerable: true,
    get: function () { return common.ModuleKind; }
});
Object.defineProperty(exports, "ModuleResolutionKind", {
    enumerable: true,
    get: function () { return common.ModuleResolutionKind; }
});
Object.defineProperty(exports, "NewLineKind", {
    enumerable: true,
    get: function () { return common.NewLineKind; }
});
Object.defineProperty(exports, "NodeFlags", {
    enumerable: true,
    get: function () { return common.NodeFlags; }
});
Object.defineProperty(exports, "ObjectFlags", {
    enumerable: true,
    get: function () { return common.ObjectFlags; }
});
Object.defineProperty(exports, "ResolutionHosts", {
    enumerable: true,
    get: function () { return common.ResolutionHosts; }
});
Object.defineProperty(exports, "ScriptKind", {
    enumerable: true,
    get: function () { return common.ScriptKind; }
});
Object.defineProperty(exports, "ScriptTarget", {
    enumerable: true,
    get: function () { return common.ScriptTarget; }
});
Object.defineProperty(exports, "SettingsContainer", {
    enumerable: true,
    get: function () { return common.SettingsContainer; }
});
Object.defineProperty(exports, "SymbolFlags", {
    enumerable: true,
    get: function () { return common.SymbolFlags; }
});
Object.defineProperty(exports, "SyntaxKind", {
    enumerable: true,
    get: function () { return common.SyntaxKind; }
});
Object.defineProperty(exports, "TypeFlags", {
    enumerable: true,
    get: function () { return common.TypeFlags; }
});
Object.defineProperty(exports, "TypeFormatFlags", {
    enumerable: true,
    get: function () { return common.TypeFormatFlags; }
});
Object.defineProperty(exports, "ts", {
    enumerable: true,
    get: function () { return common.ts; }
});
Object.defineProperty(exports, "CodeBlockWriter", {
    enumerable: true,
    get: function () { return CodeBlockWriter__default.default; }
});
exports.AbstractableNode = AbstractableNode;
exports.AmbientableNode = AmbientableNode;
exports.ArgumentError = ArgumentError;
exports.ArgumentNullOrWhitespaceError = ArgumentNullOrWhitespaceError;
exports.ArgumentOutOfRangeError = ArgumentOutOfRangeError;
exports.ArgumentTypeError = ArgumentTypeError;
exports.ArgumentedNode = ArgumentedNode;
exports.ArrayBindingPattern = ArrayBindingPattern;
exports.ArrayDestructuringAssignment = ArrayDestructuringAssignment;
exports.ArrayDestructuringAssignmentBase = ArrayDestructuringAssignmentBase;
exports.ArrayLiteralExpression = ArrayLiteralExpression;
exports.ArrayTypeNode = ArrayTypeNode;
exports.ArrowFunction = ArrowFunction;
exports.ArrowFunctionBase = ArrowFunctionBase;
exports.AsExpression = AsExpression;
exports.AsExpressionBase = AsExpressionBase;
exports.AssignmentExpression = AssignmentExpression;
exports.AssignmentExpressionBase = AssignmentExpressionBase;
exports.AsyncableNode = AsyncableNode;
exports.AwaitExpression = AwaitExpression;
exports.AwaitExpressionBase = AwaitExpressionBase;
exports.AwaitableNode = AwaitableNode;
exports.BaseError = BaseError;
exports.BaseExpressionedNode = BaseExpressionedNode;
exports.BigIntLiteral = BigIntLiteral;
exports.BigIntLiteralBase = BigIntLiteralBase;
exports.BinaryExpression = BinaryExpression;
exports.BinaryExpressionBase = BinaryExpressionBase;
exports.BindingElement = BindingElement;
exports.BindingElementBase = BindingElementBase;
exports.BindingNamedNode = BindingNamedNode;
exports.Block = Block;
exports.BlockBase = BlockBase;
exports.BodiedNode = BodiedNode;
exports.BodyableNode = BodyableNode;
exports.BreakStatement = BreakStatement;
exports.CallExpression = CallExpression;
exports.CallExpressionBase = CallExpressionBase;
exports.CallSignatureDeclaration = CallSignatureDeclaration;
exports.CallSignatureDeclarationBase = CallSignatureDeclarationBase;
exports.CaseBlock = CaseBlock;
exports.CaseBlockBase = CaseBlockBase;
exports.CaseClause = CaseClause;
exports.CaseClauseBase = CaseClauseBase;
exports.CatchClause = CatchClause;
exports.CatchClauseBase = CatchClauseBase;
exports.ChildOrderableNode = ChildOrderableNode;
exports.ClassDeclaration = ClassDeclaration;
exports.ClassDeclarationBase = ClassDeclarationBase;
exports.ClassElement = ClassElement;
exports.ClassExpression = ClassExpression;
exports.ClassExpressionBase = ClassExpressionBase;
exports.ClassLikeDeclarationBase = ClassLikeDeclarationBase;
exports.ClassLikeDeclarationBaseSpecific = ClassLikeDeclarationBaseSpecific;
exports.ClassStaticBlockDeclaration = ClassStaticBlockDeclaration;
exports.ClassStaticBlockDeclarationBase = ClassStaticBlockDeclarationBase;
exports.CodeAction = CodeAction;
exports.CodeFixAction = CodeFixAction;
exports.CombinedCodeActions = CombinedCodeActions;
exports.CommaListExpression = CommaListExpression;
exports.CommaListExpressionBase = CommaListExpressionBase;
exports.CommentClassElement = CommentClassElement;
exports.CommentEnumMember = CommentEnumMember;
exports.CommentObjectLiteralElement = CommentObjectLiteralElement;
exports.CommentRange = CommentRange;
exports.CommentStatement = CommentStatement;
exports.CommentTypeElement = CommentTypeElement;
exports.CommonIdentifierBase = CommonIdentifierBase;
exports.CompilerCommentClassElement = CompilerCommentClassElement;
exports.CompilerCommentEnumMember = CompilerCommentEnumMember;
exports.CompilerCommentNode = CompilerCommentNode;
exports.CompilerCommentObjectLiteralElement = CompilerCommentObjectLiteralElement;
exports.CompilerCommentStatement = CompilerCommentStatement;
exports.CompilerCommentTypeElement = CompilerCommentTypeElement;
exports.ComputedPropertyName = ComputedPropertyName;
exports.ComputedPropertyNameBase = ComputedPropertyNameBase;
exports.ConditionalExpression = ConditionalExpression;
exports.ConditionalExpressionBase = ConditionalExpressionBase;
exports.ConditionalTypeNode = ConditionalTypeNode;
exports.ConstructSignatureDeclaration = ConstructSignatureDeclaration;
exports.ConstructSignatureDeclarationBase = ConstructSignatureDeclarationBase;
exports.ConstructorDeclaration = ConstructorDeclaration;
exports.ConstructorDeclarationBase = ConstructorDeclarationBase;
exports.ConstructorDeclarationOverloadBase = ConstructorDeclarationOverloadBase;
exports.ConstructorTypeNode = ConstructorTypeNode;
exports.ConstructorTypeNodeBase = ConstructorTypeNodeBase;
exports.ContinueStatement = ContinueStatement;
exports.DebuggerStatement = DebuggerStatement;
exports.DebuggerStatementBase = DebuggerStatementBase;
exports.DecoratableNode = DecoratableNode;
exports.Decorator = Decorator;
exports.DecoratorBase = DecoratorBase;
exports.DefaultClause = DefaultClause;
exports.DefaultClauseBase = DefaultClauseBase;
exports.DefinitionInfo = DefinitionInfo;
exports.DeleteExpression = DeleteExpression;
exports.DeleteExpressionBase = DeleteExpressionBase;
exports.Diagnostic = Diagnostic;
exports.DiagnosticMessageChain = DiagnosticMessageChain;
exports.DiagnosticWithLocation = DiagnosticWithLocation;
exports.Directory = Directory;
exports.DirectoryEmitResult = DirectoryEmitResult;
exports.DirectoryNotFoundError = DirectoryNotFoundError;
exports.DoStatement = DoStatement;
exports.DoStatementBase = DoStatementBase;
exports.DocumentSpan = DocumentSpan;
exports.DotDotDotTokenableNode = DotDotDotTokenableNode;
exports.ElementAccessExpression = ElementAccessExpression;
exports.ElementAccessExpressionBase = ElementAccessExpressionBase;
exports.EmitOutput = EmitOutput;
exports.EmitResult = EmitResult;
exports.EmptyStatement = EmptyStatement;
exports.EmptyStatementBase = EmptyStatementBase;
exports.EnumDeclaration = EnumDeclaration;
exports.EnumDeclarationBase = EnumDeclarationBase;
exports.EnumMember = EnumMember;
exports.EnumMemberBase = EnumMemberBase;
exports.ExclamationTokenableNode = ExclamationTokenableNode;
exports.ExportAssignment = ExportAssignment;
exports.ExportAssignmentBase = ExportAssignmentBase;
exports.ExportDeclaration = ExportDeclaration;
exports.ExportDeclarationBase = ExportDeclarationBase;
exports.ExportGetableNode = ExportGetableNode;
exports.ExportSpecifier = ExportSpecifier;
exports.ExportSpecifierBase = ExportSpecifierBase;
exports.ExportableNode = ExportableNode;
exports.Expression = Expression;
exports.ExpressionStatement = ExpressionStatement;
exports.ExpressionStatementBase = ExpressionStatementBase;
exports.ExpressionWithTypeArguments = ExpressionWithTypeArguments;
exports.ExpressionWithTypeArgumentsBase = ExpressionWithTypeArgumentsBase;
exports.ExpressionableNode = ExpressionableNode;
exports.ExpressionedNode = ExpressionedNode;
exports.ExtendsClauseableNode = ExtendsClauseableNode;
exports.ExternalModuleReference = ExternalModuleReference;
exports.ExternalModuleReferenceBase = ExternalModuleReferenceBase;
exports.FalseLiteral = FalseLiteral;
exports.FalseLiteralBase = FalseLiteralBase;
exports.FileNotFoundError = FileNotFoundError;
exports.FileReference = FileReference;
exports.FileTextChanges = FileTextChanges;
exports.ForInStatement = ForInStatement;
exports.ForInStatementBase = ForInStatementBase;
exports.ForOfStatement = ForOfStatement;
exports.ForOfStatementBase = ForOfStatementBase;
exports.ForStatement = ForStatement;
exports.ForStatementBase = ForStatementBase;
exports.FunctionDeclaration = FunctionDeclaration;
exports.FunctionDeclarationBase = FunctionDeclarationBase;
exports.FunctionDeclarationOverloadBase = FunctionDeclarationOverloadBase;
exports.FunctionExpression = FunctionExpression;
exports.FunctionExpressionBase = FunctionExpressionBase;
exports.FunctionLikeDeclaration = FunctionLikeDeclaration;
exports.FunctionOrConstructorTypeNodeBase = FunctionOrConstructorTypeNodeBase;
exports.FunctionOrConstructorTypeNodeBaseBase = FunctionOrConstructorTypeNodeBaseBase;
exports.FunctionTypeNode = FunctionTypeNode;
exports.FunctionTypeNodeBase = FunctionTypeNodeBase;
exports.GeneratorableNode = GeneratorableNode;
exports.GetAccessorDeclaration = GetAccessorDeclaration;
exports.GetAccessorDeclarationBase = GetAccessorDeclarationBase;
exports.HeritageClause = HeritageClause;
exports.HeritageClauseableNode = HeritageClauseableNode;
exports.Identifier = Identifier;
exports.IdentifierBase = IdentifierBase;
exports.IfStatement = IfStatement;
exports.IfStatementBase = IfStatementBase;
exports.ImplementationLocation = ImplementationLocation;
exports.ImplementsClauseableNode = ImplementsClauseableNode;
exports.ImportAttribute = ImportAttribute;
exports.ImportAttributeBase = ImportAttributeBase;
exports.ImportAttributeNamedNode = ImportAttributeNamedNode;
exports.ImportAttributes = ImportAttributes;
exports.ImportAttributesBase = ImportAttributesBase;
exports.ImportClause = ImportClause;
exports.ImportClauseBase = ImportClauseBase;
exports.ImportDeclaration = ImportDeclaration;
exports.ImportDeclarationBase = ImportDeclarationBase;
exports.ImportEqualsDeclaration = ImportEqualsDeclaration;
exports.ImportEqualsDeclarationBase = ImportEqualsDeclarationBase;
exports.ImportExpression = ImportExpression;
exports.ImportExpressionBase = ImportExpressionBase;
exports.ImportExpressionedNode = ImportExpressionedNode;
exports.ImportSpecifier = ImportSpecifier;
exports.ImportSpecifierBase = ImportSpecifierBase;
exports.ImportTypeNode = ImportTypeNode;
exports.IndexSignatureDeclaration = IndexSignatureDeclaration;
exports.IndexSignatureDeclarationBase = IndexSignatureDeclarationBase;
exports.IndexedAccessTypeNode = IndexedAccessTypeNode;
exports.InferTypeNode = InferTypeNode;
exports.InitializerExpressionGetableNode = InitializerExpressionGetableNode;
exports.InitializerExpressionableNode = InitializerExpressionableNode;
exports.InterfaceDeclaration = InterfaceDeclaration;
exports.InterfaceDeclarationBase = InterfaceDeclarationBase;
exports.IntersectionTypeNode = IntersectionTypeNode;
exports.InvalidOperationError = InvalidOperationError;
exports.IterationStatement = IterationStatement;
exports.JSDoc = JSDoc;
exports.JSDocAllType = JSDocAllType;
exports.JSDocAugmentsTag = JSDocAugmentsTag;
exports.JSDocAuthorTag = JSDocAuthorTag;
exports.JSDocBase = JSDocBase;
exports.JSDocCallbackTag = JSDocCallbackTag;
exports.JSDocClassTag = JSDocClassTag;
exports.JSDocDeprecatedTag = JSDocDeprecatedTag;
exports.JSDocEnumTag = JSDocEnumTag;
exports.JSDocFunctionType = JSDocFunctionType;
exports.JSDocFunctionTypeBase = JSDocFunctionTypeBase;
exports.JSDocImplementsTag = JSDocImplementsTag;
exports.JSDocImportTag = JSDocImportTag;
exports.JSDocLink = JSDocLink;
exports.JSDocLinkCode = JSDocLinkCode;
exports.JSDocLinkPlain = JSDocLinkPlain;
exports.JSDocMemberName = JSDocMemberName;
exports.JSDocNameReference = JSDocNameReference;
exports.JSDocNamepathType = JSDocNamepathType;
exports.JSDocNonNullableType = JSDocNonNullableType;
exports.JSDocNullableType = JSDocNullableType;
exports.JSDocOptionalType = JSDocOptionalType;
exports.JSDocOverloadTag = JSDocOverloadTag;
exports.JSDocOverloadTagBase = JSDocOverloadTagBase;
exports.JSDocOverrideTag = JSDocOverrideTag;
exports.JSDocParameterTag = JSDocParameterTag;
exports.JSDocParameterTagBase = JSDocParameterTagBase;
exports.JSDocPrivateTag = JSDocPrivateTag;
exports.JSDocPropertyLikeTag = JSDocPropertyLikeTag;
exports.JSDocPropertyTag = JSDocPropertyTag;
exports.JSDocPropertyTagBase = JSDocPropertyTagBase;
exports.JSDocProtectedTag = JSDocProtectedTag;
exports.JSDocPublicTag = JSDocPublicTag;
exports.JSDocReadonlyTag = JSDocReadonlyTag;
exports.JSDocReturnTag = JSDocReturnTag;
exports.JSDocReturnTagBase = JSDocReturnTagBase;
exports.JSDocSatisfiesTag = JSDocSatisfiesTag;
exports.JSDocSatisfiesTagBase = JSDocSatisfiesTagBase;
exports.JSDocSeeTag = JSDocSeeTag;
exports.JSDocSeeTagBase = JSDocSeeTagBase;
exports.JSDocSignature = JSDocSignature;
exports.JSDocTag = JSDocTag;
exports.JSDocTagBase = JSDocTagBase;
exports.JSDocTagInfo = JSDocTagInfo;
exports.JSDocTemplateTag = JSDocTemplateTag;
exports.JSDocTemplateTagBase = JSDocTemplateTagBase;
exports.JSDocText = JSDocText;
exports.JSDocThisTag = JSDocThisTag;
exports.JSDocThisTagBase = JSDocThisTagBase;
exports.JSDocThrowsTag = JSDocThrowsTag;
exports.JSDocThrowsTagBase = JSDocThrowsTagBase;
exports.JSDocType = JSDocType;
exports.JSDocTypeExpression = JSDocTypeExpression;
exports.JSDocTypeExpressionableTag = JSDocTypeExpressionableTag;
exports.JSDocTypeLiteral = JSDocTypeLiteral;
exports.JSDocTypeParameteredTag = JSDocTypeParameteredTag;
exports.JSDocTypeTag = JSDocTypeTag;
exports.JSDocTypedefTag = JSDocTypedefTag;
exports.JSDocUnknownTag = JSDocUnknownTag;
exports.JSDocUnknownType = JSDocUnknownType;
exports.JSDocVariadicType = JSDocVariadicType;
exports.JSDocableNode = JSDocableNode;
exports.JsxAttribute = JsxAttribute;
exports.JsxAttributeBase = JsxAttributeBase;
exports.JsxAttributedNode = JsxAttributedNode;
exports.JsxClosingElement = JsxClosingElement;
exports.JsxClosingElementBase = JsxClosingElementBase;
exports.JsxClosingFragment = JsxClosingFragment;
exports.JsxElement = JsxElement;
exports.JsxElementBase = JsxElementBase;
exports.JsxExpression = JsxExpression;
exports.JsxExpressionBase = JsxExpressionBase;
exports.JsxFragment = JsxFragment;
exports.JsxNamespacedName = JsxNamespacedName;
exports.JsxNamespacedNameBase = JsxNamespacedNameBase;
exports.JsxOpeningElement = JsxOpeningElement;
exports.JsxOpeningElementBase = JsxOpeningElementBase;
exports.JsxOpeningFragment = JsxOpeningFragment;
exports.JsxSelfClosingElement = JsxSelfClosingElement;
exports.JsxSelfClosingElementBase = JsxSelfClosingElementBase;
exports.JsxSpreadAttribute = JsxSpreadAttribute;
exports.JsxSpreadAttributeBase = JsxSpreadAttributeBase;
exports.JsxTagNamedNode = JsxTagNamedNode;
exports.JsxText = JsxText;
exports.JsxTextBase = JsxTextBase;
exports.LabeledStatement = LabeledStatement;
exports.LabeledStatementBase = LabeledStatementBase;
exports.LanguageService = LanguageService;
exports.LeftHandSideExpression = LeftHandSideExpression;
exports.LeftHandSideExpressionedNode = LeftHandSideExpressionedNode;
exports.LiteralExpression = LiteralExpression;
exports.LiteralExpressionBase = LiteralExpressionBase;
exports.LiteralLikeNode = LiteralLikeNode;
exports.LiteralTypeNode = LiteralTypeNode;
exports.ManipulationError = ManipulationError;
exports.ManipulationSettingsContainer = ManipulationSettingsContainer;
exports.MappedTypeNode = MappedTypeNode;
exports.MemberExpression = MemberExpression;
exports.MemoryEmitResult = MemoryEmitResult;
exports.MetaProperty = MetaProperty;
exports.MetaPropertyBase = MetaPropertyBase;
exports.MethodDeclaration = MethodDeclaration;
exports.MethodDeclarationBase = MethodDeclarationBase;
exports.MethodDeclarationOverloadBase = MethodDeclarationOverloadBase;
exports.MethodSignature = MethodSignature;
exports.MethodSignatureBase = MethodSignatureBase;
exports.ModifierableNode = ModifierableNode;
exports.ModuleBlock = ModuleBlock;
exports.ModuleBlockBase = ModuleBlockBase;
exports.ModuleChildableNode = ModuleChildableNode;
exports.ModuleDeclaration = ModuleDeclaration;
exports.ModuleDeclarationBase = ModuleDeclarationBase;
exports.ModuleNamedNode = ModuleNamedNode;
exports.ModuledNode = ModuledNode;
exports.NameableNode = NameableNode;
exports.NamedExports = NamedExports;
exports.NamedExportsBase = NamedExportsBase;
exports.NamedImports = NamedImports;
exports.NamedImportsBase = NamedImportsBase;
exports.NamedNode = NamedNode;
exports.NamedNodeBase = NamedNodeBase;
exports.NamedTupleMember = NamedTupleMember;
exports.NamedTupleMemberBase = NamedTupleMemberBase;
exports.NamespaceExport = NamespaceExport;
exports.NamespaceExportBase = NamespaceExportBase;
exports.NamespaceImport = NamespaceImport;
exports.NamespaceImportBase = NamespaceImportBase;
exports.NewExpression = NewExpression;
exports.NewExpressionBase = NewExpressionBase;
exports.NoSubstitutionTemplateLiteral = NoSubstitutionTemplateLiteral;
exports.NoSubstitutionTemplateLiteralBase = NoSubstitutionTemplateLiteralBase;
exports.Node = Node;
exports.NodeWithTypeArguments = NodeWithTypeArguments;
exports.NodeWithTypeArgumentsBase = NodeWithTypeArgumentsBase;
exports.NonNullExpression = NonNullExpression;
exports.NonNullExpressionBase = NonNullExpressionBase;
exports.NotEmittedStatement = NotEmittedStatement;
exports.NotEmittedStatementBase = NotEmittedStatementBase;
exports.NotImplementedError = NotImplementedError;
exports.NotSupportedError = NotSupportedError;
exports.NullLiteral = NullLiteral;
exports.NullLiteralBase = NullLiteralBase;
exports.NumericLiteral = NumericLiteral;
exports.NumericLiteralBase = NumericLiteralBase;
exports.ObjectBindingPattern = ObjectBindingPattern;
exports.ObjectDestructuringAssignment = ObjectDestructuringAssignment;
exports.ObjectDestructuringAssignmentBase = ObjectDestructuringAssignmentBase;
exports.ObjectLiteralElement = ObjectLiteralElement;
exports.ObjectLiteralExpression = ObjectLiteralExpression;
exports.ObjectLiteralExpressionBase = ObjectLiteralExpressionBase;
exports.OmittedExpression = OmittedExpression;
exports.OmittedExpressionBase = OmittedExpressionBase;
exports.OptionalTypeNode = OptionalTypeNode;
exports.OutputFile = OutputFile;
exports.OverloadableNode = OverloadableNode;
exports.OverrideableNode = OverrideableNode;
exports.ParameterDeclaration = ParameterDeclaration;
exports.ParameterDeclarationBase = ParameterDeclarationBase;
exports.ParameteredNode = ParameteredNode;
exports.ParenthesizedExpression = ParenthesizedExpression;
exports.ParenthesizedExpressionBase = ParenthesizedExpressionBase;
exports.ParenthesizedTypeNode = ParenthesizedTypeNode;
exports.PartiallyEmittedExpression = PartiallyEmittedExpression;
exports.PartiallyEmittedExpressionBase = PartiallyEmittedExpressionBase;
exports.PathNotFoundError = PathNotFoundError;
exports.PostfixUnaryExpression = PostfixUnaryExpression;
exports.PostfixUnaryExpressionBase = PostfixUnaryExpressionBase;
exports.PrefixUnaryExpression = PrefixUnaryExpression;
exports.PrefixUnaryExpressionBase = PrefixUnaryExpressionBase;
exports.PrimaryExpression = PrimaryExpression;
exports.PrivateIdentifier = PrivateIdentifier;
exports.PrivateIdentifierBase = PrivateIdentifierBase;
exports.Program = Program;
exports.Project = Project;
exports.PropertyAccessExpression = PropertyAccessExpression;
exports.PropertyAccessExpressionBase = PropertyAccessExpressionBase;
exports.PropertyAssignment = PropertyAssignment;
exports.PropertyAssignmentBase = PropertyAssignmentBase;
exports.PropertyDeclaration = PropertyDeclaration;
exports.PropertyDeclarationBase = PropertyDeclarationBase;
exports.PropertyNamedNode = PropertyNamedNode;
exports.PropertySignature = PropertySignature;
exports.PropertySignatureBase = PropertySignatureBase;
exports.QualifiedName = QualifiedName;
exports.QuestionDotTokenableNode = QuestionDotTokenableNode;
exports.QuestionTokenableNode = QuestionTokenableNode;
exports.ReadonlyableNode = ReadonlyableNode;
exports.RefactorEditInfo = RefactorEditInfo;
exports.ReferenceEntry = ReferenceEntry;
exports.ReferenceFindableNode = ReferenceFindableNode;
exports.ReferencedSymbol = ReferencedSymbol;
exports.ReferencedSymbolDefinitionInfo = ReferencedSymbolDefinitionInfo;
exports.ReferencedSymbolEntry = ReferencedSymbolEntry;
exports.RegularExpressionLiteral = RegularExpressionLiteral;
exports.RegularExpressionLiteralBase = RegularExpressionLiteralBase;
exports.RenameLocation = RenameLocation;
exports.RenameableNode = RenameableNode;
exports.RestTypeNode = RestTypeNode;
exports.ReturnStatement = ReturnStatement;
exports.ReturnStatementBase = ReturnStatementBase;
exports.ReturnTypedNode = ReturnTypedNode;
exports.SatisfiesExpression = SatisfiesExpression;
exports.SatisfiesExpressionBase = SatisfiesExpressionBase;
exports.ScopeableNode = ScopeableNode;
exports.ScopedNode = ScopedNode;
exports.SetAccessorDeclaration = SetAccessorDeclaration;
exports.SetAccessorDeclarationBase = SetAccessorDeclarationBase;
exports.ShorthandPropertyAssignment = ShorthandPropertyAssignment;
exports.ShorthandPropertyAssignmentBase = ShorthandPropertyAssignmentBase;
exports.Signature = Signature;
exports.SignaturedDeclaration = SignaturedDeclaration;
exports.SourceFile = SourceFile;
exports.SourceFileBase = SourceFileBase;
exports.SpreadAssignment = SpreadAssignment;
exports.SpreadAssignmentBase = SpreadAssignmentBase;
exports.SpreadElement = SpreadElement;
exports.SpreadElementBase = SpreadElementBase;
exports.Statement = Statement;
exports.StatementBase = StatementBase;
exports.StatementedNode = StatementedNode;
exports.StaticableNode = StaticableNode;
exports.StringLiteral = StringLiteral;
exports.StringLiteralBase = StringLiteralBase;
exports.Structure = Structure;
exports.SuperElementAccessExpression = SuperElementAccessExpression;
exports.SuperElementAccessExpressionBase = SuperElementAccessExpressionBase;
exports.SuperExpression = SuperExpression;
exports.SuperExpressionBase = SuperExpressionBase;
exports.SuperExpressionedNode = SuperExpressionedNode;
exports.SuperPropertyAccessExpression = SuperPropertyAccessExpression;
exports.SuperPropertyAccessExpressionBase = SuperPropertyAccessExpressionBase;
exports.SwitchStatement = SwitchStatement;
exports.SwitchStatementBase = SwitchStatementBase;
exports.Symbol = Symbol$1;
exports.SymbolDisplayPart = SymbolDisplayPart;
exports.SyntaxList = SyntaxList;
exports.TaggedTemplateExpression = TaggedTemplateExpression;
exports.TemplateExpression = TemplateExpression;
exports.TemplateExpressionBase = TemplateExpressionBase;
exports.TemplateHead = TemplateHead;
exports.TemplateHeadBase = TemplateHeadBase;
exports.TemplateLiteralTypeNode = TemplateLiteralTypeNode;
exports.TemplateMiddle = TemplateMiddle;
exports.TemplateMiddleBase = TemplateMiddleBase;
exports.TemplateSpan = TemplateSpan;
exports.TemplateSpanBase = TemplateSpanBase;
exports.TemplateTail = TemplateTail;
exports.TemplateTailBase = TemplateTailBase;
exports.TextChange = TextChange;
exports.TextInsertableNode = TextInsertableNode;
exports.TextRange = TextRange;
exports.TextSpan = TextSpan;
exports.ThisExpression = ThisExpression;
exports.ThisExpressionBase = ThisExpressionBase;
exports.ThisTypeNode = ThisTypeNode;
exports.ThrowStatement = ThrowStatement;
exports.ThrowStatementBase = ThrowStatementBase;
exports.TrueLiteral = TrueLiteral;
exports.TrueLiteralBase = TrueLiteralBase;
exports.TryStatement = TryStatement;
exports.TryStatementBase = TryStatementBase;
exports.TupleTypeNode = TupleTypeNode;
exports.Type = Type;
exports.TypeAliasDeclaration = TypeAliasDeclaration;
exports.TypeAliasDeclarationBase = TypeAliasDeclarationBase;
exports.TypeArgumentedNode = TypeArgumentedNode;
exports.TypeAssertion = TypeAssertion;
exports.TypeAssertionBase = TypeAssertionBase;
exports.TypeChecker = TypeChecker;
exports.TypeElement = TypeElement;
exports.TypeElementMemberedNode = TypeElementMemberedNode;
exports.TypeLiteralNode = TypeLiteralNode;
exports.TypeLiteralNodeBase = TypeLiteralNodeBase;
exports.TypeNode = TypeNode;
exports.TypeOfExpression = TypeOfExpression;
exports.TypeOfExpressionBase = TypeOfExpressionBase;
exports.TypeOperatorTypeNode = TypeOperatorTypeNode;
exports.TypeParameter = TypeParameter;
exports.TypeParameterDeclaration = TypeParameterDeclaration;
exports.TypeParameterDeclarationBase = TypeParameterDeclarationBase;
exports.TypeParameteredNode = TypeParameteredNode;
exports.TypePredicateNode = TypePredicateNode;
exports.TypeQueryNode = TypeQueryNode;
exports.TypeReferenceNode = TypeReferenceNode;
exports.TypedNode = TypedNode;
exports.UnaryExpression = UnaryExpression;
exports.UnaryExpressionedNode = UnaryExpressionedNode;
exports.UnionTypeNode = UnionTypeNode;
exports.UnwrappableNode = UnwrappableNode;
exports.UpdateExpression = UpdateExpression;
exports.VariableDeclaration = VariableDeclaration;
exports.VariableDeclarationBase = VariableDeclarationBase;
exports.VariableDeclarationList = VariableDeclarationList;
exports.VariableDeclarationListBase = VariableDeclarationListBase;
exports.VariableStatement = VariableStatement;
exports.VariableStatementBase = VariableStatementBase;
exports.VoidExpression = VoidExpression;
exports.VoidExpressionBase = VoidExpressionBase;
exports.WhileStatement = WhileStatement;
exports.WhileStatementBase = WhileStatementBase;
exports.WithStatement = WithStatement;
exports.WithStatementBase = WithStatementBase;
exports.Writers = Writers;
exports.YieldExpression = YieldExpression;
exports.YieldExpressionBase = YieldExpressionBase;
exports.createWrappedNode = createWrappedNode;
exports.forEachStructureChild = forEachStructureChild;
exports.getCompilerOptionsFromTsConfig = getCompilerOptionsFromTsConfig;
exports.getScopeForNode = getScopeForNode;
exports.insertOverloads = insertOverloads;
exports.printNode = printNode;
exports.setScopeForNode = setScopeForNode;
