"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolReference = exports.Meaning = exports.ComponentNavigation = exports.ComponentRoot = exports.ComponentPathBase = exports.ComponentReference = exports.ComponentString = exports.Component = exports.GlobalSource = exports.ModuleSource = exports.Navigation = exports.DeclarationReference = void 0;
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/naming-convention */
// NOTE: See DeclarationReference.grammarkdown for information on the underlying grammar.
var StringChecks_1 = require("../parser/StringChecks");
/**
 * Represents a reference to a declaration.
 * @beta
 */
var DeclarationReference = /** @class */ (function () {
    function DeclarationReference(source, navigation, symbol) {
        this._source = source;
        this._navigation = navigation;
        this._symbol = symbol;
    }
    Object.defineProperty(DeclarationReference.prototype, "source", {
        get: function () {
            return this._source;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DeclarationReference.prototype, "navigation", {
        get: function () {
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
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DeclarationReference.prototype, "symbol", {
        get: function () {
            return this._symbol;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DeclarationReference.prototype, "isEmpty", {
        get: function () {
            return this.source === undefined && this.symbol === undefined;
        },
        enumerable: false,
        configurable: true
    });
    DeclarationReference.parse = function (text) {
        var parser = new Parser(text);
        var reference = parser.parseDeclarationReference();
        if (parser.errors.length) {
            throw new SyntaxError("Invalid DeclarationReference '".concat(text, "':\n  ").concat(parser.errors.join('\n  ')));
        }
        if (!parser.eof) {
            throw new SyntaxError("Invalid DeclarationReference '".concat(text, "'"));
        }
        return reference;
    };
    DeclarationReference.parseComponent = function (text) {
        if (text[0] === '[') {
            return ComponentReference.parse(text);
        }
        else {
            return new ComponentString(text, true);
        }
    };
    /**
     * Determines whether the provided string is a well-formed symbol navigation component string.
     */
    DeclarationReference.isWellFormedComponentString = function (text) {
        var scanner = new Scanner(text);
        return scanner.scan() === Token.String
            ? scanner.scan() === Token.EofToken
            : scanner.token() === Token.Text
                ? scanner.scan() === Token.EofToken
                : scanner.token() === Token.EofToken;
    };
    /**
     * Escapes a string for use as a symbol navigation component. If the string contains any of `!.#~:,"{}()@` or starts
     * with `[`, it is enclosed in quotes.
     */
    DeclarationReference.escapeComponentString = function (text) {
        if (text.length === 0) {
            return '""';
        }
        var ch = text.charAt(0);
        if (ch === '[' || ch === '"' || !this.isWellFormedComponentString(text)) {
            return JSON.stringify(text);
        }
        return text;
    };
    /**
     * Unescapes a string used as a symbol navigation component.
     */
    DeclarationReference.unescapeComponentString = function (text) {
        if (text.length >= 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
            try {
                return JSON.parse(text);
            }
            catch (_a) {
                throw new SyntaxError("Invalid Component '".concat(text, "'"));
            }
        }
        if (!this.isWellFormedComponentString(text)) {
            throw new SyntaxError("Invalid Component '".concat(text, "'"));
        }
        return text;
    };
    /**
     * Determines whether the provided string is a well-formed module source string. The string may not
     * have a trailing `!` character.
     */
    DeclarationReference.isWellFormedModuleSourceString = function (text) {
        var scanner = new Scanner(text + '!');
        return (scanner.rescanModuleSource() === Token.ModuleSource &&
            !scanner.stringIsUnterminated &&
            scanner.scan() === Token.ExclamationToken &&
            scanner.scan() === Token.EofToken);
    };
    /**
     * Escapes a string for use as a module source. If the string contains any of `!"` it is enclosed in quotes.
     */
    DeclarationReference.escapeModuleSourceString = function (text) {
        if (text.length === 0) {
            return '""';
        }
        var ch = text.charAt(0);
        if (ch === '"' || !this.isWellFormedModuleSourceString(text)) {
            return JSON.stringify(text);
        }
        return text;
    };
    /**
     * Unescapes a string used as a module source. The string may not have a trailing `!` character.
     */
    DeclarationReference.unescapeModuleSourceString = function (text) {
        if (text.length >= 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
            try {
                return JSON.parse(text);
            }
            catch (_a) {
                throw new SyntaxError("Invalid Module source '".concat(text, "'"));
            }
        }
        if (!this.isWellFormedModuleSourceString(text)) {
            throw new SyntaxError("Invalid Module source '".concat(text, "'"));
        }
        return text;
    };
    DeclarationReference.empty = function () {
        return new DeclarationReference();
    };
    DeclarationReference.package = function (packageName, importPath) {
        return new DeclarationReference(ModuleSource.fromPackage(packageName, importPath));
    };
    DeclarationReference.module = function (path, userEscaped) {
        return new DeclarationReference(new ModuleSource(path, userEscaped));
    };
    DeclarationReference.global = function () {
        return new DeclarationReference(GlobalSource.instance);
    };
    DeclarationReference.from = function (base) {
        return base || this.empty();
    };
    DeclarationReference.prototype.withSource = function (source) {
        return this._source === source ? this : new DeclarationReference(source, this._navigation, this._symbol);
    };
    DeclarationReference.prototype.withNavigation = function (navigation) {
        return this._navigation === navigation
            ? this
            : new DeclarationReference(this._source, navigation, this._symbol);
    };
    DeclarationReference.prototype.withSymbol = function (symbol) {
        return this._symbol === symbol ? this : new DeclarationReference(this._source, this._navigation, symbol);
    };
    DeclarationReference.prototype.withComponentPath = function (componentPath) {
        return this.withSymbol(this.symbol ? this.symbol.withComponentPath(componentPath) : new SymbolReference(componentPath));
    };
    DeclarationReference.prototype.withMeaning = function (meaning) {
        if (!this.symbol) {
            if (meaning === undefined) {
                return this;
            }
            return this.withSymbol(SymbolReference.empty().withMeaning(meaning));
        }
        return this.withSymbol(this.symbol.withMeaning(meaning));
    };
    DeclarationReference.prototype.withOverloadIndex = function (overloadIndex) {
        if (!this.symbol) {
            if (overloadIndex === undefined) {
                return this;
            }
            return this.withSymbol(SymbolReference.empty().withOverloadIndex(overloadIndex));
        }
        return this.withSymbol(this.symbol.withOverloadIndex(overloadIndex));
    };
    DeclarationReference.prototype.addNavigationStep = function (navigation, component) {
        if (this.symbol) {
            return this.withSymbol(this.symbol.addNavigationStep(navigation, component));
        }
        if (navigation === Navigation.Members) {
            navigation = Navigation.Exports;
        }
        var symbol = new SymbolReference(new ComponentRoot(Component.from(component)));
        return new DeclarationReference(this.source, navigation, symbol);
    };
    DeclarationReference.prototype.toString = function () {
        var navigation = this._source instanceof ModuleSource && this._symbol && this.navigation === Navigation.Locals
            ? '~'
            : '';
        return "".concat(this.source || '').concat(navigation).concat(this.symbol || '');
    };
    return DeclarationReference;
}());
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
var ModuleSource = /** @class */ (function () {
    function ModuleSource(path, userEscaped) {
        if (userEscaped === void 0) { userEscaped = true; }
        this.escapedPath =
            this instanceof ParsedModuleSource ? path : escapeModuleSourceIfNeeded(path, userEscaped);
    }
    Object.defineProperty(ModuleSource.prototype, "path", {
        get: function () {
            return this._path || (this._path = DeclarationReference.unescapeModuleSourceString(this.escapedPath));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ModuleSource.prototype, "packageName", {
        get: function () {
            return this._getOrParsePathComponents().packageName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ModuleSource.prototype, "scopeName", {
        get: function () {
            var scopeName = this._getOrParsePathComponents().scopeName;
            return scopeName ? '@' + scopeName : '';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ModuleSource.prototype, "unscopedPackageName", {
        get: function () {
            return this._getOrParsePathComponents().unscopedPackageName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ModuleSource.prototype, "importPath", {
        get: function () {
            return this._getOrParsePathComponents().importPath || '';
        },
        enumerable: false,
        configurable: true
    });
    ModuleSource.fromScopedPackage = function (scopeName, unscopedPackageName, importPath) {
        var packageName = unscopedPackageName;
        if (scopeName) {
            if (scopeName.charAt(0) === '@') {
                scopeName = scopeName.slice(1);
            }
            packageName = "@".concat(scopeName, "/").concat(unscopedPackageName);
        }
        var parsed = { packageName: packageName, scopeName: scopeName || '', unscopedPackageName: unscopedPackageName };
        return this._fromPackageName(parsed, packageName, importPath);
    };
    ModuleSource.fromPackage = function (packageName, importPath) {
        return this._fromPackageName(parsePackageName(packageName), packageName, importPath);
    };
    ModuleSource._fromPackageName = function (parsed, packageName, importPath) {
        if (!parsed) {
            throw new Error('Parsed package must be provided.');
        }
        var packageNameError = StringChecks_1.StringChecks.explainIfInvalidPackageName(packageName);
        if (packageNameError) {
            throw new SyntaxError("Invalid NPM package name: ".concat(packageNameError));
        }
        var path = packageName;
        if (importPath) {
            if (invalidImportPathRegExp.test(importPath)) {
                throw new SyntaxError("Invalid import path '".concat(importPath));
            }
            path += '/' + importPath;
            parsed.importPath = importPath;
        }
        var source = new ModuleSource(path);
        source._pathComponents = parsed;
        return source;
    };
    ModuleSource.prototype.toString = function () {
        return "".concat(this.escapedPath, "!");
    };
    ModuleSource.prototype._getOrParsePathComponents = function () {
        if (!this._pathComponents) {
            var path = this.path;
            var parsed = parsePackageName(path);
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
    };
    return ModuleSource;
}());
exports.ModuleSource = ModuleSource;
var ParsedModuleSource = /** @class */ (function (_super) {
    __extends(ParsedModuleSource, _super);
    function ParsedModuleSource() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ParsedModuleSource;
}(ModuleSource));
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
var packageNameRegExp = /^((?:@([^/]+?)\/)?([^/]+?))(?:\/(.+))?$/;
// no leading './' or '.\'
// no leading '../' or '..\'
// no leading '/' or '\'
// not '.' or '..'
var invalidImportPathRegExp = /^(\.\.?([\\/]|$)|[\\/])/;
// eslint-disable-next-line @rushstack/no-new-null
function parsePackageName(text) {
    var match = packageNameRegExp.exec(text);
    if (!match) {
        return match;
    }
    var _a = match[1], packageName = _a === void 0 ? '' : _a, _b = match[2], scopeName = _b === void 0 ? '' : _b, _c = match[3], unscopedPackageName = _c === void 0 ? '' : _c, importPath = match[4];
    return { packageName: packageName, scopeName: scopeName, unscopedPackageName: unscopedPackageName, importPath: importPath };
}
/**
 * Represents the global scope.
 * @beta
 */
var GlobalSource = /** @class */ (function () {
    function GlobalSource() {
    }
    GlobalSource.prototype.toString = function () {
        return '!';
    };
    GlobalSource.instance = new GlobalSource();
    return GlobalSource;
}());
exports.GlobalSource = GlobalSource;
/**
 * @beta
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
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
var ComponentString = /** @class */ (function () {
    function ComponentString(text, userEscaped) {
        this.text = this instanceof ParsedComponentString ? text : escapeComponentIfNeeded(text, userEscaped);
    }
    ComponentString.prototype.toString = function () {
        return this.text;
    };
    return ComponentString;
}());
exports.ComponentString = ComponentString;
var ParsedComponentString = /** @class */ (function (_super) {
    __extends(ParsedComponentString, _super);
    function ParsedComponentString() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ParsedComponentString;
}(ComponentString));
/**
 * @beta
 */
var ComponentReference = /** @class */ (function () {
    function ComponentReference(reference) {
        this.reference = reference;
    }
    ComponentReference.parse = function (text) {
        if (text.length > 2 && text.charAt(0) === '[' && text.charAt(text.length - 1) === ']') {
            return new ComponentReference(DeclarationReference.parse(text.slice(1, -1)));
        }
        throw new SyntaxError("Invalid component reference: '".concat(text, "'"));
    };
    ComponentReference.prototype.withReference = function (reference) {
        return this.reference === reference ? this : new ComponentReference(reference);
    };
    ComponentReference.prototype.toString = function () {
        return "[".concat(this.reference, "]");
    };
    return ComponentReference;
}());
exports.ComponentReference = ComponentReference;
/**
 * @beta
 */
var ComponentPathBase = /** @class */ (function () {
    function ComponentPathBase(component) {
        this.component = component;
    }
    ComponentPathBase.prototype.addNavigationStep = function (navigation, component) {
        // tslint:disable-next-line:no-use-before-declare
        return new ComponentNavigation(this, navigation, Component.from(component));
    };
    return ComponentPathBase;
}());
exports.ComponentPathBase = ComponentPathBase;
/**
 * @beta
 */
var ComponentRoot = /** @class */ (function (_super) {
    __extends(ComponentRoot, _super);
    function ComponentRoot() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ComponentRoot.prototype.withComponent = function (component) {
        return this.component === component ? this : new ComponentRoot(Component.from(component));
    };
    ComponentRoot.prototype.toString = function () {
        return this.component.toString();
    };
    return ComponentRoot;
}(ComponentPathBase));
exports.ComponentRoot = ComponentRoot;
/**
 * @beta
 */
var ComponentNavigation = /** @class */ (function (_super) {
    __extends(ComponentNavigation, _super);
    function ComponentNavigation(parent, navigation, component) {
        var _this = _super.call(this, component) || this;
        _this.parent = parent;
        _this.navigation = navigation;
        return _this;
    }
    ComponentNavigation.prototype.withParent = function (parent) {
        return this.parent === parent ? this : new ComponentNavigation(parent, this.navigation, this.component);
    };
    ComponentNavigation.prototype.withNavigation = function (navigation) {
        return this.navigation === navigation
            ? this
            : new ComponentNavigation(this.parent, navigation, this.component);
    };
    ComponentNavigation.prototype.withComponent = function (component) {
        return this.component === component
            ? this
            : new ComponentNavigation(this.parent, this.navigation, Component.from(component));
    };
    ComponentNavigation.prototype.toString = function () {
        return "".concat(this.parent).concat(formatNavigation(this.navigation)).concat(this.component);
    };
    return ComponentNavigation;
}(ComponentPathBase));
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
var SymbolReference = /** @class */ (function () {
    function SymbolReference(component, _a) {
        var _b = _a === void 0 ? {} : _a, meaning = _b.meaning, overloadIndex = _b.overloadIndex;
        this.componentPath = component;
        this.overloadIndex = overloadIndex;
        this.meaning = meaning;
    }
    SymbolReference.empty = function () {
        return new SymbolReference(/*component*/ undefined);
    };
    SymbolReference.prototype.withComponentPath = function (componentPath) {
        return this.componentPath === componentPath
            ? this
            : new SymbolReference(componentPath, {
                meaning: this.meaning,
                overloadIndex: this.overloadIndex
            });
    };
    SymbolReference.prototype.withMeaning = function (meaning) {
        return this.meaning === meaning
            ? this
            : new SymbolReference(this.componentPath, {
                meaning: meaning,
                overloadIndex: this.overloadIndex
            });
    };
    SymbolReference.prototype.withOverloadIndex = function (overloadIndex) {
        return this.overloadIndex === overloadIndex
            ? this
            : new SymbolReference(this.componentPath, {
                meaning: this.meaning,
                overloadIndex: overloadIndex
            });
    };
    SymbolReference.prototype.addNavigationStep = function (navigation, component) {
        if (!this.componentPath) {
            throw new Error('Cannot add a navigation step to an empty symbol reference.');
        }
        return new SymbolReference(this.componentPath.addNavigationStep(navigation, component));
    };
    SymbolReference.prototype.toString = function () {
        var result = "".concat(this.componentPath || '');
        if (this.meaning && this.overloadIndex !== undefined) {
            result += ":".concat(this.meaning, "(").concat(this.overloadIndex, ")");
        }
        else if (this.meaning) {
            result += ":".concat(this.meaning);
        }
        else if (this.overloadIndex !== undefined) {
            result += ":".concat(this.overloadIndex);
        }
        return result;
    };
    return SymbolReference;
}());
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
var Scanner = /** @class */ (function () {
    function Scanner(text) {
        this._pos = 0;
        this._tokenPos = 0;
        this._stringIsUnterminated = false;
        this._token = Token.None;
        this._text = text;
    }
    Object.defineProperty(Scanner.prototype, "stringIsUnterminated", {
        get: function () {
            return this._stringIsUnterminated;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Scanner.prototype, "text", {
        get: function () {
            return this._text;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Scanner.prototype, "tokenText", {
        get: function () {
            return this._text.slice(this._tokenPos, this._pos);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Scanner.prototype, "eof", {
        get: function () {
            return this._pos >= this._text.length;
        },
        enumerable: false,
        configurable: true
    });
    Scanner.prototype.token = function () {
        return this._token;
    };
    Scanner.prototype.speculate = function (cb) {
        var tokenPos = this._tokenPos;
        var pos = this._pos;
        var text = this._text;
        var token = this._token;
        var stringIsUnterminated = this._stringIsUnterminated;
        var accepted = false;
        try {
            var accept = function () {
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
    };
    Scanner.prototype.scan = function () {
        if (!this.eof) {
            this._tokenPos = this._pos;
            this._stringIsUnterminated = false;
            while (!this.eof) {
                var ch = this._text.charAt(this._pos++);
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
    };
    Scanner.prototype.rescanModuleSource = function () {
        var _this = this;
        switch (this._token) {
            case Token.ModuleSource:
            case Token.ExclamationToken:
            case Token.EofToken:
                return this._token;
        }
        return this.speculate(function (accept) {
            if (!_this.eof) {
                _this._pos = _this._tokenPos;
                _this._stringIsUnterminated = false;
                var scanned = 'none';
                while (!_this.eof) {
                    var ch = _this._text[_this._pos];
                    if (ch === '!') {
                        if (scanned === 'none') {
                            return _this._token;
                        }
                        accept();
                        return (_this._token = Token.ModuleSource);
                    }
                    _this._pos++;
                    if (ch === '"') {
                        if (scanned === 'other') {
                            // strings not allowed after scanning any other characters
                            return _this._token;
                        }
                        scanned = 'string';
                        _this.scanString();
                    }
                    else {
                        if (scanned === 'string') {
                            // no other tokens allowed after string
                            return _this._token;
                        }
                        scanned = 'other';
                        if (!isPunctuator(ch)) {
                            _this.scanText();
                        }
                    }
                }
            }
            return _this._token;
        });
    };
    Scanner.prototype.rescanMeaning = function () {
        if (this._token === Token.Text) {
            var tokenText = this.tokenText;
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
    };
    Scanner.prototype.rescanDecimalDigits = function () {
        if (this._token === Token.Text) {
            var tokenText = this.tokenText;
            if (/^\d+$/.test(tokenText)) {
                return (this._token = Token.DecimalDigits);
            }
        }
        return this._token;
    };
    Scanner.prototype.scanString = function () {
        while (!this.eof) {
            var ch = this._text.charAt(this._pos++);
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
    };
    Scanner.prototype.scanEscapeSequence = function () {
        if (this.eof) {
            this._stringIsUnterminated = true;
            return;
        }
        var ch = this._text.charAt(this._pos);
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
            var hexDigits = this._text.charAt(this._pos + 2);
            if (isHexDigit(hexDigits)) {
                for (var i = this._pos + 3; i < this._text.length; i++) {
                    var ch2 = this._text.charAt(i);
                    if (ch2 === '}') {
                        var mv = parseInt(hexDigits, 16);
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
    };
    Scanner.prototype.scanText = function () {
        while (this._pos < this._text.length) {
            var ch = this._text.charAt(this._pos);
            if (isPunctuator(ch) || ch === '"') {
                return;
            }
            this._pos++;
        }
    };
    return Scanner;
}());
var Parser = /** @class */ (function () {
    function Parser(text) {
        this._errors = [];
        this._scanner = new Scanner(text);
        this._scanner.scan();
    }
    Object.defineProperty(Parser.prototype, "eof", {
        get: function () {
            return this.token() === Token.EofToken;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Parser.prototype, "errors", {
        get: function () {
            return this._errors;
        },
        enumerable: false,
        configurable: true
    });
    Parser.prototype.parseDeclarationReference = function () {
        var source;
        var navigation;
        var symbol;
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
    };
    Parser.prototype.parseModuleSourceString = function () {
        this._scanner.rescanModuleSource();
        return this.parseTokenString(Token.ModuleSource, 'Module source');
    };
    Parser.prototype.parseComponentString = function () {
        switch (this._scanner.token()) {
            case Token.String:
                return this.parseString();
            default:
                return this.parseComponentCharacters();
        }
    };
    Parser.prototype.token = function () {
        return this._scanner.token();
    };
    Parser.prototype.parseModuleSource = function () {
        var source = this.parseModuleSourceString();
        this.expectToken(Token.ExclamationToken);
        return new ParsedModuleSource(source, /*userEscaped*/ true);
    };
    Parser.prototype.parseSymbol = function () {
        var component = this.parseComponentRest(this.parseRootComponent());
        return this.parseSymbolRest(component);
    };
    Parser.prototype.parseSymbolRest = function (component) {
        var meaning;
        var overloadIndex;
        if (this.optionalToken(Token.ColonToken)) {
            meaning = this.tryParseMeaning();
            overloadIndex = this.tryParseOverloadIndex(!!meaning);
        }
        return new SymbolReference(component, { meaning: meaning, overloadIndex: overloadIndex });
    };
    Parser.prototype.parseRootComponent = function () {
        if (!this.isStartOfComponent()) {
            return this.fail('Component expected', new ComponentRoot(new ComponentString('', /*userEscaped*/ true)));
        }
        var component = this.parseComponent();
        return new ComponentRoot(component);
    };
    Parser.prototype.parseComponentRest = function (component) {
        for (;;) {
            switch (this.token()) {
                case Token.DotToken:
                case Token.HashToken:
                case Token.TildeToken:
                    var navigation = this.parseNavigation();
                    var right = this.parseComponent();
                    component = new ComponentNavigation(component, navigation, right);
                    break;
                default:
                    return component;
            }
        }
    };
    Parser.prototype.parseNavigation = function () {
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
    };
    Parser.prototype.tryParseMeaning = function () {
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
    };
    Parser.prototype.tryParseOverloadIndex = function (hasMeaning) {
        if (this.optionalToken(Token.OpenParenToken)) {
            var overloadIndex = this.parseDecimalDigits();
            this.expectToken(Token.CloseParenToken);
            return overloadIndex;
        }
        else if (!hasMeaning) {
            return this.parseDecimalDigits();
        }
        return undefined;
    };
    Parser.prototype.parseDecimalDigits = function () {
        switch (this._scanner.rescanDecimalDigits()) {
            case Token.DecimalDigits:
                var value = +this._scanner.tokenText;
                this._scanner.scan();
                return value;
            default:
                return this.fail('Decimal digit expected', 0);
        }
    };
    Parser.prototype.isStartOfComponent = function () {
        switch (this.token()) {
            case Token.Text:
            case Token.String:
            case Token.OpenBracketToken:
                return true;
            default:
                return false;
        }
    };
    Parser.prototype.parseComponentCharacters = function () {
        var text = '';
        for (;;) {
            switch (this._scanner.token()) {
                case Token.Text:
                    text += this.parseText();
                    break;
                default:
                    return text;
            }
        }
    };
    Parser.prototype.parseTokenString = function (token, tokenString) {
        if (this._scanner.token() === token) {
            var text = this._scanner.tokenText;
            var stringIsUnterminated = this._scanner.stringIsUnterminated;
            this._scanner.scan();
            if (stringIsUnterminated) {
                return this.fail("".concat(tokenString || tokenToString(token), " is unterminated"), text);
            }
            return text;
        }
        return this.fail("".concat(tokenString || tokenToString(token), " expected"), '');
    };
    Parser.prototype.parseText = function () {
        return this.parseTokenString(Token.Text, 'Text');
    };
    Parser.prototype.parseString = function () {
        return this.parseTokenString(Token.String, 'String');
    };
    Parser.prototype.parseComponent = function () {
        switch (this._scanner.token()) {
            case Token.OpenBracketToken:
                return this.parseBracketedComponent();
            default:
                return new ParsedComponentString(this.parseComponentString(), /*userEscaped*/ true);
        }
    };
    Parser.prototype.parseBracketedComponent = function () {
        this.expectToken(Token.OpenBracketToken);
        var reference = this.parseDeclarationReference();
        this.expectToken(Token.CloseBracketToken);
        return new ComponentReference(reference);
    };
    Parser.prototype.optionalToken = function (token) {
        if (this._scanner.token() === token) {
            this._scanner.scan();
            return true;
        }
        return false;
    };
    Parser.prototype.expectToken = function (token, message) {
        if (this._scanner.token() !== token) {
            var expected = tokenToString(token);
            var actual = tokenToString(this._scanner.token());
            return this.fail(message || "Expected token '".concat(expected, "', received '").concat(actual, "' instead."), undefined);
        }
        this._scanner.scan();
    };
    Parser.prototype.fail = function (message, fallback) {
        this._errors.push(message);
        return fallback;
    };
    return Parser;
}());
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
            throw new SyntaxError("Invalid Component '".concat(text, "'"));
        }
        return text;
    }
    return DeclarationReference.escapeComponentString(text);
}
function escapeModuleSourceIfNeeded(text, userEscaped) {
    if (userEscaped) {
        if (!DeclarationReference.isWellFormedModuleSourceString(text)) {
            throw new SyntaxError("Invalid Module source '".concat(text, "'"));
        }
        return text;
    }
    return DeclarationReference.escapeModuleSourceString(text);
}
//# sourceMappingURL=DeclarationReference.js.map