"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolReference = exports.Meaning = exports.ComponentNavigation = exports.ComponentRoot = exports.ComponentPathBase = exports.ComponentReference = exports.ComponentString = exports.Component = exports.GlobalSource = exports.ModuleSource = exports.Navigation = exports.DeclarationReference = void 0;
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/naming-convention */
// NOTE: See DeclarationReference.grammarkdown for information on the underlying grammar.
const StringChecks_1 = require("../parser/StringChecks");
/**
 * Represents a reference to a declaration.
 * @beta
 */
class DeclarationReference {
    constructor(source, navigation, symbol) {
        this._source = source;
        this._navigation = navigation;
        this._symbol = symbol;
    }
    get source() {
        return this._source;
    }
    get navigation() {
        if (!this._source || !this._symbol) {
            return undefined;
        }
        if (this._source === GlobalSource.instance) {
            return Navigation.Locals;
        }
        if (this._navigation === undefined) {
            return Navigation.Exports;
        }
        return this._navigation;
    }
    get symbol() {
        return this._symbol;
    }
    get isEmpty() {
        return this.source === undefined && this.symbol === undefined;
    }
    static parse(text) {
        const parser = new Parser(text);
        const reference = parser.parseDeclarationReference();
        if (parser.errors.length) {
            throw new SyntaxError(`Invalid DeclarationReference '${text}':\n  ${parser.errors.join('\n  ')}`);
        }
        if (!parser.eof) {
            throw new SyntaxError(`Invalid DeclarationReference '${text}'`);
        }
        return reference;
    }
    static parseComponent(text) {
        if (text[0] === '[') {
            return ComponentReference.parse(text);
        }
        else {
            return new ComponentString(text, true);
        }
    }
    /**
     * Determines whether the provided string is a well-formed symbol navigation component string.
     */
    static isWellFormedComponentString(text) {
        const scanner = new Scanner(text);
        return scanner.scan() === Token.String
            ? scanner.scan() === Token.EofToken
            : scanner.token() === Token.Text
                ? scanner.scan() === Token.EofToken
                : scanner.token() === Token.EofToken;
    }
    /**
     * Escapes a string for use as a symbol navigation component. If the string contains any of `!.#~:,"{}()@` or starts
     * with `[`, it is enclosed in quotes.
     */
    static escapeComponentString(text) {
        if (text.length === 0) {
            return '""';
        }
        const ch = text.charAt(0);
        if (ch === '[' || ch === '"' || !this.isWellFormedComponentString(text)) {
            return JSON.stringify(text);
        }
        return text;
    }
    /**
     * Unescapes a string used as a symbol navigation component.
     */
    static unescapeComponentString(text) {
        if (text.length >= 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
            try {
                return JSON.parse(text);
            }
            catch (_a) {
                throw new SyntaxError(`Invalid Component '${text}'`);
            }
        }
        if (!this.isWellFormedComponentString(text)) {
            throw new SyntaxError(`Invalid Component '${text}'`);
        }
        return text;
    }
    /**
     * Determines whether the provided string is a well-formed module source string. The string may not
     * have a trailing `!` character.
     */
    static isWellFormedModuleSourceString(text) {
        const scanner = new Scanner(text + '!');
        return (scanner.rescanModuleSource() === Token.ModuleSource &&
            !scanner.stringIsUnterminated &&
            scanner.scan() === Token.ExclamationToken &&
            scanner.scan() === Token.EofToken);
    }
    /**
     * Escapes a string for use as a module source. If the string contains any of `!"` it is enclosed in quotes.
     */
    static escapeModuleSourceString(text) {
        if (text.length === 0) {
            return '""';
        }
        const ch = text.charAt(0);
        if (ch === '"' || !this.isWellFormedModuleSourceString(text)) {
            return JSON.stringify(text);
        }
        return text;
    }
    /**
     * Unescapes a string used as a module source. The string may not have a trailing `!` character.
     */
    static unescapeModuleSourceString(text) {
        if (text.length >= 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
            try {
                return JSON.parse(text);
            }
            catch (_a) {
                throw new SyntaxError(`Invalid Module source '${text}'`);
            }
        }
        if (!this.isWellFormedModuleSourceString(text)) {
            throw new SyntaxError(`Invalid Module source '${text}'`);
        }
        return text;
    }
    static empty() {
        return new DeclarationReference();
    }
    static package(packageName, importPath) {
        return new DeclarationReference(ModuleSource.fromPackage(packageName, importPath));
    }
    static module(path, userEscaped) {
        return new DeclarationReference(new ModuleSource(path, userEscaped));
    }
    static global() {
        return new DeclarationReference(GlobalSource.instance);
    }
    static from(base) {
        return base || this.empty();
    }
    withSource(source) {
        return this._source === source ? this : new DeclarationReference(source, this._navigation, this._symbol);
    }
    withNavigation(navigation) {
        return this._navigation === navigation
            ? this
            : new DeclarationReference(this._source, navigation, this._symbol);
    }
    withSymbol(symbol) {
        return this._symbol === symbol ? this : new DeclarationReference(this._source, this._navigation, symbol);
    }
    withComponentPath(componentPath) {
        return this.withSymbol(this.symbol ? this.symbol.withComponentPath(componentPath) : new SymbolReference(componentPath));
    }
    withMeaning(meaning) {
        if (!this.symbol) {
            if (meaning === undefined) {
                return this;
            }
            return this.withSymbol(SymbolReference.empty().withMeaning(meaning));
        }
        return this.withSymbol(this.symbol.withMeaning(meaning));
    }
    withOverloadIndex(overloadIndex) {
        if (!this.symbol) {
            if (overloadIndex === undefined) {
                return this;
            }
            return this.withSymbol(SymbolReference.empty().withOverloadIndex(overloadIndex));
        }
        return this.withSymbol(this.symbol.withOverloadIndex(overloadIndex));
    }
    addNavigationStep(navigation, component) {
        if (this.symbol) {
            return this.withSymbol(this.symbol.addNavigationStep(navigation, component));
        }
        if (navigation === Navigation.Members) {
            navigation = Navigation.Exports;
        }
        const symbol = new SymbolReference(new ComponentRoot(Component.from(component)));
        return new DeclarationReference(this.source, navigation, symbol);
    }
    toString() {
        const navigation = this._source instanceof ModuleSource && this._symbol && this.navigation === Navigation.Locals
            ? '~'
            : '';
        return `${this.source || ''}${navigation}${this.symbol || ''}`;
    }
}
exports.DeclarationReference = DeclarationReference;
/**
 * Indicates the symbol table from which to resolve the next symbol component.
 * @beta
 */
var Navigation;
(function (Navigation) {
    Navigation["Exports"] = ".";
    Navigation["Members"] = "#";
    Navigation["Locals"] = "~";
})(Navigation || (exports.Navigation = Navigation = {}));
/**
 * Represents a module.
 * @beta
 */
class ModuleSource {
    constructor(path, userEscaped = true) {
        this.escapedPath =
            this instanceof ParsedModuleSource ? path : escapeModuleSourceIfNeeded(path, userEscaped);
    }
    get path() {
        return this._path || (this._path = DeclarationReference.unescapeModuleSourceString(this.escapedPath));
    }
    get packageName() {
        return this._getOrParsePathComponents().packageName;
    }
    get scopeName() {
        const scopeName = this._getOrParsePathComponents().scopeName;
        return scopeName ? '@' + scopeName : '';
    }
    get unscopedPackageName() {
        return this._getOrParsePathComponents().unscopedPackageName;
    }
    get importPath() {
        return this._getOrParsePathComponents().importPath || '';
    }
    static fromScopedPackage(scopeName, unscopedPackageName, importPath) {
        let packageName = unscopedPackageName;
        if (scopeName) {
            if (scopeName.charAt(0) === '@') {
                scopeName = scopeName.slice(1);
            }
            packageName = `@${scopeName}/${unscopedPackageName}`;
        }
        const parsed = { packageName, scopeName: scopeName || '', unscopedPackageName };
        return this._fromPackageName(parsed, packageName, importPath);
    }
    static fromPackage(packageName, importPath) {
        return this._fromPackageName(parsePackageName(packageName), packageName, importPath);
    }
    static _fromPackageName(parsed, packageName, importPath) {
        if (!parsed) {
            throw new Error('Parsed package must be provided.');
        }
        const packageNameError = StringChecks_1.StringChecks.explainIfInvalidPackageName(packageName);
        if (packageNameError) {
            throw new SyntaxError(`Invalid NPM package name: ${packageNameError}`);
        }
        let path = packageName;
        if (importPath) {
            if (invalidImportPathRegExp.test(importPath)) {
                throw new SyntaxError(`Invalid import path '${importPath}`);
            }
            path += '/' + importPath;
            parsed.importPath = importPath;
        }
        const source = new ModuleSource(path);
        source._pathComponents = parsed;
        return source;
    }
    toString() {
        return `${this.escapedPath}!`;
    }
    _getOrParsePathComponents() {
        if (!this._pathComponents) {
            const path = this.path;
            const parsed = parsePackageName(path);
            if (parsed && !StringChecks_1.StringChecks.explainIfInvalidPackageName(parsed.packageName)) {
                this._pathComponents = parsed;
            }
            else {
                this._pathComponents = {
                    packageName: '',
                    scopeName: '',
                    unscopedPackageName: '',
                    importPath: path
                };
            }
        }
        return this._pathComponents;
    }
}
exports.ModuleSource = ModuleSource;
class ParsedModuleSource extends ModuleSource {
}
// matches the following:
//   'foo'            -> ["foo", "foo", undefined, "foo", undefined]
//   'foo/bar'        -> ["foo/bar", "foo", undefined, "foo", "bar"]
//   '@scope/foo'     -> ["@scope/foo", "@scope/foo", "scope", "foo", undefined]
//   '@scope/foo/bar' -> ["@scope/foo/bar", "@scope/foo", "scope", "foo", "bar"]
// does not match:
//   '/'
//   '@/'
//   '@scope/'
// capture groups:
//   1. The package name (including scope)
//   2. The scope name (excluding the leading '@')
//   3. The unscoped package name
//   4. The package-relative import path
const packageNameRegExp = /^((?:@([^/]+?)\/)?([^/]+?))(?:\/(.+))?$/;
// no leading './' or '.\'
// no leading '../' or '..\'
// no leading '/' or '\'
// not '.' or '..'
const invalidImportPathRegExp = /^(\.\.?([\\/]|$)|[\\/])/;
// eslint-disable-next-line @rushstack/no-new-null
function parsePackageName(text) {
    const match = packageNameRegExp.exec(text);
    if (!match) {
        return match;
    }
    const [, packageName = '', scopeName = '', unscopedPackageName = '', importPath] = match;
    return { packageName, scopeName, unscopedPackageName, importPath };
}
/**
 * Represents the global scope.
 * @beta
 */
class GlobalSource {
    constructor() { }
    toString() {
        return '!';
    }
}
exports.GlobalSource = GlobalSource;
GlobalSource.instance = new GlobalSource();
/**
 * @beta
 */
// eslint-disable-next-line @typescript-eslint/no-namespace,@typescript-eslint/no-redeclare
var Component;
(function (Component) {
    function from(value) {
        if (typeof value === 'string') {
            return new ComponentString(value);
        }
        if (value instanceof DeclarationReference) {
            return new ComponentReference(value);
        }
        return value;
    }
    Component.from = from;
})(Component || (exports.Component = Component = {}));
/**
 * @beta
 */
class ComponentString {
    constructor(text, userEscaped) {
        this.text = this instanceof ParsedComponentString ? text : escapeComponentIfNeeded(text, userEscaped);
    }
    toString() {
        return this.text;
    }
}
exports.ComponentString = ComponentString;
class ParsedComponentString extends ComponentString {
}
/**
 * @beta
 */
class ComponentReference {
    constructor(reference) {
        this.reference = reference;
    }
    static parse(text) {
        if (text.length > 2 && text.charAt(0) === '[' && text.charAt(text.length - 1) === ']') {
            return new ComponentReference(DeclarationReference.parse(text.slice(1, -1)));
        }
        throw new SyntaxError(`Invalid component reference: '${text}'`);
    }
    withReference(reference) {
        return this.reference === reference ? this : new ComponentReference(reference);
    }
    toString() {
        return `[${this.reference}]`;
    }
}
exports.ComponentReference = ComponentReference;
/**
 * @beta
 */
class ComponentPathBase {
    constructor(component) {
        this.component = component;
    }
    addNavigationStep(navigation, component) {
        // tslint:disable-next-line:no-use-before-declare
        return new ComponentNavigation(this, navigation, Component.from(component));
    }
}
exports.ComponentPathBase = ComponentPathBase;
/**
 * @beta
 */
class ComponentRoot extends ComponentPathBase {
    withComponent(component) {
        return this.component === component ? this : new ComponentRoot(Component.from(component));
    }
    toString() {
        return this.component.toString();
    }
}
exports.ComponentRoot = ComponentRoot;
/**
 * @beta
 */
class ComponentNavigation extends ComponentPathBase {
    constructor(parent, navigation, component) {
        super(component);
        this.parent = parent;
        this.navigation = navigation;
    }
    withParent(parent) {
        return this.parent === parent ? this : new ComponentNavigation(parent, this.navigation, this.component);
    }
    withNavigation(navigation) {
        return this.navigation === navigation
            ? this
            : new ComponentNavigation(this.parent, navigation, this.component);
    }
    withComponent(component) {
        return this.component === component
            ? this
            : new ComponentNavigation(this.parent, this.navigation, Component.from(component));
    }
    toString() {
        return `${this.parent}${formatNavigation(this.navigation)}${this.component}`;
    }
}
exports.ComponentNavigation = ComponentNavigation;
/**
 * @beta
 */
var Meaning;
(function (Meaning) {
    Meaning["Class"] = "class";
    Meaning["Interface"] = "interface";
    Meaning["TypeAlias"] = "type";
    Meaning["Enum"] = "enum";
    Meaning["Namespace"] = "namespace";
    Meaning["Function"] = "function";
    Meaning["Variable"] = "var";
    Meaning["Constructor"] = "constructor";
    Meaning["Member"] = "member";
    Meaning["Event"] = "event";
    Meaning["CallSignature"] = "call";
    Meaning["ConstructSignature"] = "new";
    Meaning["IndexSignature"] = "index";
    Meaning["ComplexType"] = "complex"; // Any complex type
})(Meaning || (exports.Meaning = Meaning = {}));
/**
 * Represents a reference to a TypeScript symbol.
 * @beta
 */
class SymbolReference {
    constructor(component, { meaning, overloadIndex } = {}) {
        this.componentPath = component;
        this.overloadIndex = overloadIndex;
        this.meaning = meaning;
    }
    static empty() {
        return new SymbolReference(/*component*/ undefined);
    }
    withComponentPath(componentPath) {
        return this.componentPath === componentPath
            ? this
            : new SymbolReference(componentPath, {
                meaning: this.meaning,
                overloadIndex: this.overloadIndex
            });
    }
    withMeaning(meaning) {
        return this.meaning === meaning
            ? this
            : new SymbolReference(this.componentPath, {
                meaning,
                overloadIndex: this.overloadIndex
            });
    }
    withOverloadIndex(overloadIndex) {
        return this.overloadIndex === overloadIndex
            ? this
            : new SymbolReference(this.componentPath, {
                meaning: this.meaning,
                overloadIndex
            });
    }
    addNavigationStep(navigation, component) {
        if (!this.componentPath) {
            throw new Error('Cannot add a navigation step to an empty symbol reference.');
        }
        return new SymbolReference(this.componentPath.addNavigationStep(navigation, component));
    }
    toString() {
        let result = `${this.componentPath || ''}`;
        if (this.meaning && this.overloadIndex !== undefined) {
            result += `:${this.meaning}(${this.overloadIndex})`;
        }
        else if (this.meaning) {
            result += `:${this.meaning}`;
        }
        else if (this.overloadIndex !== undefined) {
            result += `:${this.overloadIndex}`;
        }
        return result;
    }
}
exports.SymbolReference = SymbolReference;
var Token;
(function (Token) {
    Token[Token["None"] = 0] = "None";
    Token[Token["EofToken"] = 1] = "EofToken";
    // Punctuator
    Token[Token["OpenBraceToken"] = 2] = "OpenBraceToken";
    Token[Token["CloseBraceToken"] = 3] = "CloseBraceToken";
    Token[Token["OpenParenToken"] = 4] = "OpenParenToken";
    Token[Token["CloseParenToken"] = 5] = "CloseParenToken";
    Token[Token["OpenBracketToken"] = 6] = "OpenBracketToken";
    Token[Token["CloseBracketToken"] = 7] = "CloseBracketToken";
    Token[Token["ExclamationToken"] = 8] = "ExclamationToken";
    Token[Token["DotToken"] = 9] = "DotToken";
    Token[Token["HashToken"] = 10] = "HashToken";
    Token[Token["TildeToken"] = 11] = "TildeToken";
    Token[Token["ColonToken"] = 12] = "ColonToken";
    Token[Token["CommaToken"] = 13] = "CommaToken";
    Token[Token["AtToken"] = 14] = "AtToken";
    Token[Token["DecimalDigits"] = 15] = "DecimalDigits";
    Token[Token["String"] = 16] = "String";
    Token[Token["Text"] = 17] = "Text";
    // eslint-disable-next-line @typescript-eslint/no-shadow
    Token[Token["ModuleSource"] = 18] = "ModuleSource";
    // Keywords
    Token[Token["ClassKeyword"] = 19] = "ClassKeyword";
    Token[Token["InterfaceKeyword"] = 20] = "InterfaceKeyword";
    Token[Token["TypeKeyword"] = 21] = "TypeKeyword";
    Token[Token["EnumKeyword"] = 22] = "EnumKeyword";
    Token[Token["NamespaceKeyword"] = 23] = "NamespaceKeyword";
    Token[Token["FunctionKeyword"] = 24] = "FunctionKeyword";
    Token[Token["VarKeyword"] = 25] = "VarKeyword";
    Token[Token["ConstructorKeyword"] = 26] = "ConstructorKeyword";
    Token[Token["MemberKeyword"] = 27] = "MemberKeyword";
    Token[Token["EventKeyword"] = 28] = "EventKeyword";
    Token[Token["CallKeyword"] = 29] = "CallKeyword";
    Token[Token["NewKeyword"] = 30] = "NewKeyword";
    Token[Token["IndexKeyword"] = 31] = "IndexKeyword";
    Token[Token["ComplexKeyword"] = 32] = "ComplexKeyword"; // 'complex'
})(Token || (Token = {}));
function tokenToString(token) {
    switch (token) {
        case Token.OpenBraceToken:
            return '{';
        case Token.CloseBraceToken:
            return '}';
        case Token.OpenParenToken:
            return '(';
        case Token.CloseParenToken:
            return ')';
        case Token.OpenBracketToken:
            return '[';
        case Token.CloseBracketToken:
            return ']';
        case Token.ExclamationToken:
            return '!';
        case Token.DotToken:
            return '.';
        case Token.HashToken:
            return '#';
        case Token.TildeToken:
            return '~';
        case Token.ColonToken:
            return ':';
        case Token.CommaToken:
            return ',';
        case Token.AtToken:
            return '@';
        case Token.ClassKeyword:
            return 'class';
        case Token.InterfaceKeyword:
            return 'interface';
        case Token.TypeKeyword:
            return 'type';
        case Token.EnumKeyword:
            return 'enum';
        case Token.NamespaceKeyword:
            return 'namespace';
        case Token.FunctionKeyword:
            return 'function';
        case Token.VarKeyword:
            return 'var';
        case Token.ConstructorKeyword:
            return 'constructor';
        case Token.MemberKeyword:
            return 'member';
        case Token.EventKeyword:
            return 'event';
        case Token.CallKeyword:
            return 'call';
        case Token.NewKeyword:
            return 'new';
        case Token.IndexKeyword:
            return 'index';
        case Token.ComplexKeyword:
            return 'complex';
        case Token.None:
            return '<none>';
        case Token.EofToken:
            return '<eof>';
        case Token.DecimalDigits:
            return '<decimal digits>';
        case Token.String:
            return '<string>';
        case Token.Text:
            return '<text>';
        case Token.ModuleSource:
            return '<module source>';
    }
}
class Scanner {
    constructor(text) {
        this._pos = 0;
        this._tokenPos = 0;
        this._stringIsUnterminated = false;
        this._token = Token.None;
        this._text = text;
    }
    get stringIsUnterminated() {
        return this._stringIsUnterminated;
    }
    get text() {
        return this._text;
    }
    get tokenText() {
        return this._text.slice(this._tokenPos, this._pos);
    }
    get eof() {
        return this._pos >= this._text.length;
    }
    token() {
        return this._token;
    }
    speculate(cb) {
        const tokenPos = this._tokenPos;
        const pos = this._pos;
        const text = this._text;
        const token = this._token;
        const stringIsUnterminated = this._stringIsUnterminated;
        let accepted = false;
        try {
            const accept = () => {
                accepted = true;
            };
            return cb(accept);
        }
        finally {
            if (!accepted) {
                this._tokenPos = tokenPos;
                this._pos = pos;
                this._text = text;
                this._token = token;
                this._stringIsUnterminated = stringIsUnterminated;
            }
        }
    }
    scan() {
        if (!this.eof) {
            this._tokenPos = this._pos;
            this._stringIsUnterminated = false;
            while (!this.eof) {
                const ch = this._text.charAt(this._pos++);
                switch (ch) {
                    case '{':
                        return (this._token = Token.OpenBraceToken);
                    case '}':
                        return (this._token = Token.CloseBraceToken);
                    case '(':
                        return (this._token = Token.OpenParenToken);
                    case ')':
                        return (this._token = Token.CloseParenToken);
                    case '[':
                        return (this._token = Token.OpenBracketToken);
                    case ']':
                        return (this._token = Token.CloseBracketToken);
                    case '!':
                        return (this._token = Token.ExclamationToken);
                    case '.':
                        return (this._token = Token.DotToken);
                    case '#':
                        return (this._token = Token.HashToken);
                    case '~':
                        return (this._token = Token.TildeToken);
                    case ':':
                        return (this._token = Token.ColonToken);
                    case ',':
                        return (this._token = Token.CommaToken);
                    case '@':
                        return (this._token = Token.AtToken);
                    case '"':
                        this.scanString();
                        return (this._token = Token.String);
                    default:
                        this.scanText();
                        return (this._token = Token.Text);
                }
            }
        }
        return (this._token = Token.EofToken);
    }
    rescanModuleSource() {
        switch (this._token) {
            case Token.ModuleSource:
            case Token.ExclamationToken:
            case Token.EofToken:
                return this._token;
        }
        return this.speculate((accept) => {
            if (!this.eof) {
                this._pos = this._tokenPos;
                this._stringIsUnterminated = false;
                let scanned = 'none';
                while (!this.eof) {
                    const ch = this._text[this._pos];
                    if (ch === '!') {
                        if (scanned === 'none') {
                            return this._token;
                        }
                        accept();
                        return (this._token = Token.ModuleSource);
                    }
                    this._pos++;
                    if (ch === '"') {
                        if (scanned === 'other') {
                            // strings not allowed after scanning any other characters
                            return this._token;
                        }
                        scanned = 'string';
                        this.scanString();
                    }
                    else {
                        if (scanned === 'string') {
                            // no other tokens allowed after string
                            return this._token;
                        }
                        scanned = 'other';
                        if (!isPunctuator(ch)) {
                            this.scanText();
                        }
                    }
                }
            }
            return this._token;
        });
    }
    rescanMeaning() {
        if (this._token === Token.Text) {
            const tokenText = this.tokenText;
            switch (tokenText) {
                case 'class':
                    return (this._token = Token.ClassKeyword);
                case 'interface':
                    return (this._token = Token.InterfaceKeyword);
                case 'type':
                    return (this._token = Token.TypeKeyword);
                case 'enum':
                    return (this._token = Token.EnumKeyword);
                case 'namespace':
                    return (this._token = Token.NamespaceKeyword);
                case 'function':
                    return (this._token = Token.FunctionKeyword);
                case 'var':
                    return (this._token = Token.VarKeyword);
                case 'constructor':
                    return (this._token = Token.ConstructorKeyword);
                case 'member':
                    return (this._token = Token.MemberKeyword);
                case 'event':
                    return (this._token = Token.EventKeyword);
                case 'call':
                    return (this._token = Token.CallKeyword);
                case 'new':
                    return (this._token = Token.NewKeyword);
                case 'index':
                    return (this._token = Token.IndexKeyword);
                case 'complex':
                    return (this._token = Token.ComplexKeyword);
            }
        }
        return this._token;
    }
    rescanDecimalDigits() {
        if (this._token === Token.Text) {
            const tokenText = this.tokenText;
            if (/^\d+$/.test(tokenText)) {
                return (this._token = Token.DecimalDigits);
            }
        }
        return this._token;
    }
    scanString() {
        while (!this.eof) {
            const ch = this._text.charAt(this._pos++);
            switch (ch) {
                case '"':
                    return;
                case '\\':
                    this.scanEscapeSequence();
                    break;
                default:
                    if (isLineTerminator(ch)) {
                        this._stringIsUnterminated = true;
                        return;
                    }
            }
        }
        this._stringIsUnterminated = true;
    }
    scanEscapeSequence() {
        if (this.eof) {
            this._stringIsUnterminated = true;
            return;
        }
        const ch = this._text.charAt(this._pos);
        // EscapeSequence:: CharacterEscapeSequence
        if (isCharacterEscapeSequence(ch)) {
            this._pos++;
            return;
        }
        // EscapeSequence:: `0` [lookahead != DecimalDigit]
        if (ch === '0' &&
            (this._pos + 1 === this._text.length || !isDecimalDigit(this._text.charAt(this._pos + 1)))) {
            this._pos++;
            return;
        }
        // EscapeSequence:: HexEscapeSequence
        if (ch === 'x' &&
            this._pos + 3 <= this._text.length &&
            isHexDigit(this._text.charAt(this._pos + 1)) &&
            isHexDigit(this._text.charAt(this._pos + 2))) {
            this._pos += 3;
            return;
        }
        // EscapeSequence:: UnicodeEscapeSequence
        // UnicodeEscapeSequence:: `u` Hex4Digits
        if (ch === 'u' &&
            this._pos + 5 <= this._text.length &&
            isHexDigit(this._text.charAt(this._pos + 1)) &&
            isHexDigit(this._text.charAt(this._pos + 2)) &&
            isHexDigit(this._text.charAt(this._pos + 3)) &&
            isHexDigit(this._text.charAt(this._pos + 4))) {
            this._pos += 5;
            return;
        }
        // EscapeSequence:: UnicodeEscapeSequence
        // UnicodeEscapeSequence:: `u` `{` CodePoint `}`
        if (ch === 'u' && this._pos + 4 <= this._text.length && this._text.charAt(this._pos + 1) === '{') {
            let hexDigits = this._text.charAt(this._pos + 2);
            if (isHexDigit(hexDigits)) {
                for (let i = this._pos + 3; i < this._text.length; i++) {
                    const ch2 = this._text.charAt(i);
                    if (ch2 === '}') {
                        const mv = parseInt(hexDigits, 16);
                        if (mv <= 0x10ffff) {
                            this._pos = i + 1;
                            return;
                        }
                        break;
                    }
                    if (!isHexDigit(ch2)) {
                        hexDigits += ch2;
                        break;
                    }
                }
            }
        }
        this._stringIsUnterminated = true;
    }
    scanText() {
        while (this._pos < this._text.length) {
            const ch = this._text.charAt(this._pos);
            if (isPunctuator(ch) || ch === '"') {
                return;
            }
            this._pos++;
        }
    }
}
class Parser {
    constructor(text) {
        this._errors = [];
        this._scanner = new Scanner(text);
        this._scanner.scan();
    }
    get eof() {
        return this.token() === Token.EofToken;
    }
    get errors() {
        return this._errors;
    }
    parseDeclarationReference() {
        let source;
        let navigation;
        let symbol;
        if (this.optionalToken(Token.ExclamationToken)) {
            // Reference to global symbol
            source = GlobalSource.instance;
        }
        else if (this._scanner.rescanModuleSource() === Token.ModuleSource) {
            source = this.parseModuleSource();
            // Check for optional `~` navigation token.
            if (this.optionalToken(Token.TildeToken)) {
                navigation = Navigation.Locals;
            }
        }
        if (this.isStartOfComponent()) {
            symbol = this.parseSymbol();
        }
        else if (this.token() === Token.ColonToken) {
            symbol = this.parseSymbolRest(new ComponentRoot(new ComponentString('', /*userEscaped*/ true)));
        }
        return new DeclarationReference(source, navigation, symbol);
    }
    parseModuleSourceString() {
        this._scanner.rescanModuleSource();
        return this.parseTokenString(Token.ModuleSource, 'Module source');
    }
    parseComponentString() {
        switch (this._scanner.token()) {
            case Token.String:
                return this.parseString();
            default:
                return this.parseComponentCharacters();
        }
    }
    token() {
        return this._scanner.token();
    }
    parseModuleSource() {
        const source = this.parseModuleSourceString();
        this.expectToken(Token.ExclamationToken);
        return new ParsedModuleSource(source, /*userEscaped*/ true);
    }
    parseSymbol() {
        const component = this.parseComponentRest(this.parseRootComponent());
        return this.parseSymbolRest(component);
    }
    parseSymbolRest(component) {
        let meaning;
        let overloadIndex;
        if (this.optionalToken(Token.ColonToken)) {
            meaning = this.tryParseMeaning();
            overloadIndex = this.tryParseOverloadIndex(!!meaning);
        }
        return new SymbolReference(component, { meaning, overloadIndex });
    }
    parseRootComponent() {
        if (!this.isStartOfComponent()) {
            return this.fail('Component expected', new ComponentRoot(new ComponentString('', /*userEscaped*/ true)));
        }
        const component = this.parseComponent();
        return new ComponentRoot(component);
    }
    parseComponentRest(component) {
        for (;;) {
            switch (this.token()) {
                case Token.DotToken:
                case Token.HashToken:
                case Token.TildeToken:
                    const navigation = this.parseNavigation();
                    const right = this.parseComponent();
                    component = new ComponentNavigation(component, navigation, right);
                    break;
                default:
                    return component;
            }
        }
    }
    parseNavigation() {
        switch (this._scanner.token()) {
            case Token.DotToken: {
                this._scanner.scan();
                return Navigation.Exports;
            }
            case Token.HashToken: {
                this._scanner.scan();
                return Navigation.Members;
            }
            case Token.TildeToken: {
                this._scanner.scan();
                return Navigation.Locals;
            }
            default: {
                return this.fail("Expected '.', '#', or '~'", Navigation.Exports);
            }
        }
    }
    tryParseMeaning() {
        switch (this._scanner.rescanMeaning()) {
            case Token.ClassKeyword: {
                this._scanner.scan();
                return Meaning.Class;
            }
            case Token.InterfaceKeyword: {
                this._scanner.scan();
                return Meaning.Interface;
            }
            case Token.TypeKeyword: {
                this._scanner.scan();
                return Meaning.TypeAlias;
            }
            case Token.EnumKeyword: {
                this._scanner.scan();
                return Meaning.Enum;
            }
            case Token.NamespaceKeyword: {
                this._scanner.scan();
                return Meaning.Namespace;
            }
            case Token.FunctionKeyword: {
                this._scanner.scan();
                return Meaning.Function;
            }
            case Token.VarKeyword: {
                this._scanner.scan();
                return Meaning.Variable;
            }
            case Token.ConstructorKeyword: {
                this._scanner.scan();
                return Meaning.Constructor;
            }
            case Token.MemberKeyword: {
                this._scanner.scan();
                return Meaning.Member;
            }
            case Token.EventKeyword: {
                this._scanner.scan();
                return Meaning.Event;
            }
            case Token.CallKeyword: {
                this._scanner.scan();
                return Meaning.CallSignature;
            }
            case Token.NewKeyword: {
                this._scanner.scan();
                return Meaning.ConstructSignature;
            }
            case Token.IndexKeyword: {
                this._scanner.scan();
                return Meaning.IndexSignature;
            }
            case Token.ComplexKeyword: {
                this._scanner.scan();
                return Meaning.ComplexType;
            }
        }
    }
    tryParseOverloadIndex(hasMeaning) {
        if (this.optionalToken(Token.OpenParenToken)) {
            const overloadIndex = this.parseDecimalDigits();
            this.expectToken(Token.CloseParenToken);
            return overloadIndex;
        }
        else if (!hasMeaning) {
            return this.parseDecimalDigits();
        }
        return undefined;
    }
    parseDecimalDigits() {
        switch (this._scanner.rescanDecimalDigits()) {
            case Token.DecimalDigits:
                const value = +this._scanner.tokenText;
                this._scanner.scan();
                return value;
            default:
                return this.fail('Decimal digit expected', 0);
        }
    }
    isStartOfComponent() {
        switch (this.token()) {
            case Token.Text:
            case Token.String:
            case Token.OpenBracketToken:
                return true;
            default:
                return false;
        }
    }
    parseComponentCharacters() {
        let text = '';
        for (;;) {
            switch (this._scanner.token()) {
                case Token.Text:
                    text += this.parseText();
                    break;
                default:
                    return text;
            }
        }
    }
    parseTokenString(token, tokenString) {
        if (this._scanner.token() === token) {
            const text = this._scanner.tokenText;
            const stringIsUnterminated = this._scanner.stringIsUnterminated;
            this._scanner.scan();
            if (stringIsUnterminated) {
                return this.fail(`${tokenString || tokenToString(token)} is unterminated`, text);
            }
            return text;
        }
        return this.fail(`${tokenString || tokenToString(token)} expected`, '');
    }
    parseText() {
        return this.parseTokenString(Token.Text, 'Text');
    }
    parseString() {
        return this.parseTokenString(Token.String, 'String');
    }
    parseComponent() {
        switch (this._scanner.token()) {
            case Token.OpenBracketToken:
                return this.parseBracketedComponent();
            default:
                return new ParsedComponentString(this.parseComponentString(), /*userEscaped*/ true);
        }
    }
    parseBracketedComponent() {
        this.expectToken(Token.OpenBracketToken);
        const reference = this.parseDeclarationReference();
        this.expectToken(Token.CloseBracketToken);
        return new ComponentReference(reference);
    }
    optionalToken(token) {
        if (this._scanner.token() === token) {
            this._scanner.scan();
            return true;
        }
        return false;
    }
    expectToken(token, message) {
        if (this._scanner.token() !== token) {
            const expected = tokenToString(token);
            const actual = tokenToString(this._scanner.token());
            return this.fail(message || `Expected token '${expected}', received '${actual}' instead.`, undefined);
        }
        this._scanner.scan();
    }
    fail(message, fallback) {
        this._errors.push(message);
        return fallback;
    }
}
function formatNavigation(navigation) {
    switch (navigation) {
        case Navigation.Exports:
            return '.';
        case Navigation.Members:
            return '#';
        case Navigation.Locals:
            return '~';
        default:
            return '';
    }
}
function isCharacterEscapeSequence(ch) {
    return isSingleEscapeCharacter(ch) || isNonEscapeCharacter(ch);
}
function isSingleEscapeCharacter(ch) {
    switch (ch) {
        case "'":
        case '"':
        case '\\':
        case 'b':
        case 'f':
        case 'n':
        case 'r':
        case 't':
        case 'v':
            return true;
        default:
            return false;
    }
}
function isNonEscapeCharacter(ch) {
    return !isEscapeCharacter(ch) && !isLineTerminator(ch);
}
function isEscapeCharacter(ch) {
    switch (ch) {
        case 'x':
        case 'u':
            return true;
        default:
            return isSingleEscapeCharacter(ch) || isDecimalDigit(ch);
    }
}
function isLineTerminator(ch) {
    switch (ch) {
        case '\r':
        case '\n':
            // TODO: <LS>, <PS>
            return true;
        default:
            return false;
    }
}
function isDecimalDigit(ch) {
    switch (ch) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            return true;
        default:
            return false;
    }
}
function isHexDigit(ch) {
    switch (ch) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
            return true;
        default:
            return isDecimalDigit(ch);
    }
}
function isPunctuator(ch) {
    switch (ch) {
        case '{':
        case '}':
        case '(':
        case ')':
        case '[':
        case ']':
        case '!':
        case '.':
        case '#':
        case '~':
        case ':':
        case ',':
        case '@':
            return true;
        default:
            return false;
    }
}
function escapeComponentIfNeeded(text, userEscaped) {
    if (userEscaped) {
        if (!DeclarationReference.isWellFormedComponentString(text)) {
            throw new SyntaxError(`Invalid Component '${text}'`);
        }
        return text;
    }
    return DeclarationReference.escapeComponentString(text);
}
function escapeModuleSourceIfNeeded(text, userEscaped) {
    if (userEscaped) {
        if (!DeclarationReference.isWellFormedModuleSourceString(text)) {
            throw new SyntaxError(`Invalid Module source '${text}'`);
        }
        return text;
    }
    return DeclarationReference.escapeModuleSourceString(text);
}
//# sourceMappingURL=DeclarationReference.js.map