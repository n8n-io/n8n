'use strict';

var python$1 = require('@lezer/python');
var language = require('@codemirror/language');
var common = require('@lezer/common');
var autocomplete = require('@codemirror/autocomplete');

const cache = new common.NodeWeakMap();
const ScopeNodes = new Set([
    "Script", "Body",
    "FunctionDefinition", "ClassDefinition", "LambdaExpression",
    "ForStatement", "MatchClause"
]);
function defID(type) {
    return (node, def, outer) => {
        if (outer)
            return false;
        let id = node.node.getChild("VariableName");
        if (id)
            def(id, type);
        return true;
    };
}
const gatherCompletions = {
    FunctionDefinition: defID("function"),
    ClassDefinition: defID("class"),
    ForStatement(node, def, outer) {
        if (outer)
            for (let child = node.node.firstChild; child; child = child.nextSibling) {
                if (child.name == "VariableName")
                    def(child, "variable");
                else if (child.name == "in")
                    break;
            }
    },
    ImportStatement(_node, def) {
        var _a, _b;
        let { node } = _node;
        let isFrom = ((_a = node.firstChild) === null || _a === void 0 ? void 0 : _a.name) == "from";
        for (let ch = node.getChild("import"); ch; ch = ch.nextSibling) {
            if (ch.name == "VariableName" && ((_b = ch.nextSibling) === null || _b === void 0 ? void 0 : _b.name) != "as")
                def(ch, isFrom ? "variable" : "namespace");
        }
    },
    AssignStatement(node, def) {
        for (let child = node.node.firstChild; child; child = child.nextSibling) {
            if (child.name == "VariableName")
                def(child, "variable");
            else if (child.name == ":" || child.name == "AssignOp")
                break;
        }
    },
    ParamList(node, def) {
        for (let prev = null, child = node.node.firstChild; child; child = child.nextSibling) {
            if (child.name == "VariableName" && (!prev || !/\*|AssignOp/.test(prev.name)))
                def(child, "variable");
            prev = child;
        }
    },
    CapturePattern: defID("variable"),
    AsPattern: defID("variable"),
    __proto__: null
};
function getScope(doc, node) {
    let cached = cache.get(node);
    if (cached)
        return cached;
    let completions = [], top = true;
    function def(node, type) {
        let name = doc.sliceString(node.from, node.to);
        completions.push({ label: name, type });
    }
    node.cursor(common.IterMode.IncludeAnonymous).iterate(node => {
        if (node.name) {
            let gather = gatherCompletions[node.name];
            if (gather && gather(node, def, top) || !top && ScopeNodes.has(node.name))
                return false;
            top = false;
        }
        else if (node.to - node.from > 8192) {
            // Allow caching for bigger internal nodes
            for (let c of getScope(doc, node.node))
                completions.push(c);
            return false;
        }
    });
    cache.set(node, completions);
    return completions;
}
const Identifier = /^[\w\xa1-\uffff][\w\d\xa1-\uffff]*$/;
const dontComplete = ["String", "FormatString", "Comment", "PropertyName"];
/**
Completion source that looks up locally defined names in
Python code.
*/
function localCompletionSource(context) {
    let inner = language.syntaxTree(context.state).resolveInner(context.pos, -1);
    if (dontComplete.indexOf(inner.name) > -1)
        return null;
    let isWord = inner.name == "VariableName" ||
        inner.to - inner.from < 20 && Identifier.test(context.state.sliceDoc(inner.from, inner.to));
    if (!isWord && !context.explicit)
        return null;
    let options = [];
    for (let pos = inner; pos; pos = pos.parent) {
        if (ScopeNodes.has(pos.name))
            options = options.concat(getScope(context.state.doc, pos));
    }
    return {
        options,
        from: isWord ? inner.from : context.pos,
        validFor: Identifier
    };
}
const globals = [
    "__annotations__", "__builtins__", "__debug__", "__doc__", "__import__", "__name__",
    "__loader__", "__package__", "__spec__",
    "False", "None", "True"
].map(n => ({ label: n, type: "constant" })).concat([
    "ArithmeticError", "AssertionError", "AttributeError", "BaseException", "BlockingIOError",
    "BrokenPipeError", "BufferError", "BytesWarning", "ChildProcessError", "ConnectionAbortedError",
    "ConnectionError", "ConnectionRefusedError", "ConnectionResetError", "DeprecationWarning",
    "EOFError", "Ellipsis", "EncodingWarning", "EnvironmentError", "Exception", "FileExistsError",
    "FileNotFoundError", "FloatingPointError", "FutureWarning", "GeneratorExit", "IOError",
    "ImportError", "ImportWarning", "IndentationError", "IndexError", "InterruptedError",
    "IsADirectoryError", "KeyError", "KeyboardInterrupt", "LookupError", "MemoryError",
    "ModuleNotFoundError", "NameError", "NotADirectoryError", "NotImplemented", "NotImplementedError",
    "OSError", "OverflowError", "PendingDeprecationWarning", "PermissionError", "ProcessLookupError",
    "RecursionError", "ReferenceError", "ResourceWarning", "RuntimeError", "RuntimeWarning",
    "StopAsyncIteration", "StopIteration", "SyntaxError", "SyntaxWarning", "SystemError",
    "SystemExit", "TabError", "TimeoutError", "TypeError", "UnboundLocalError", "UnicodeDecodeError",
    "UnicodeEncodeError", "UnicodeError", "UnicodeTranslateError", "UnicodeWarning", "UserWarning",
    "ValueError", "Warning", "ZeroDivisionError"
].map(n => ({ label: n, type: "type" }))).concat([
    "bool", "bytearray", "bytes", "classmethod", "complex", "float", "frozenset", "int", "list",
    "map", "memoryview", "object", "range", "set", "staticmethod", "str", "super", "tuple", "type"
].map(n => ({ label: n, type: "class" }))).concat([
    "abs", "aiter", "all", "anext", "any", "ascii", "bin", "breakpoint", "callable", "chr",
    "compile", "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec", "exit", "filter",
    "format", "getattr", "globals", "hasattr", "hash", "help", "hex", "id", "input", "isinstance",
    "issubclass", "iter", "len", "license", "locals", "max", "min", "next", "oct", "open",
    "ord", "pow", "print", "property", "quit", "repr", "reversed", "round", "setattr", "slice",
    "sorted", "sum", "vars", "zip"
].map(n => ({ label: n, type: "function" })));
const snippets = [
    autocomplete.snippetCompletion("def ${name}(${params}):\n\t${}", {
        label: "def",
        detail: "function",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("for ${name} in ${collection}:\n\t${}", {
        label: "for",
        detail: "loop",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("while ${}:\n\t${}", {
        label: "while",
        detail: "loop",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("try:\n\t${}\nexcept ${error}:\n\t${}", {
        label: "try",
        detail: "/ except block",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("if ${}:\n\t\n", {
        label: "if",
        detail: "block",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("if ${}:\n\t${}\nelse:\n\t${}", {
        label: "if",
        detail: "/ else block",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("class ${name}:\n\tdef __init__(self, ${params}):\n\t\t\t${}", {
        label: "class",
        detail: "definition",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("import ${module}", {
        label: "import",
        detail: "statement",
        type: "keyword"
    }),
    autocomplete.snippetCompletion("from ${module} import ${names}", {
        label: "from",
        detail: "import",
        type: "keyword"
    })
];
/**
Autocompletion for built-in Python globals and keywords.
*/
const globalCompletion = autocomplete.ifNotIn(dontComplete, autocomplete.completeFromList(globals.concat(snippets)));

function innerBody(context) {
    let { node, pos } = context;
    let lineIndent = context.lineIndent(pos, -1);
    let found = null;
    for (;;) {
        let before = node.childBefore(pos);
        if (!before) {
            break;
        }
        else if (before.name == "Comment") {
            pos = before.from;
        }
        else if (before.name == "Body" || before.name == "MatchBody") {
            if (context.baseIndentFor(before) + context.unit <= lineIndent)
                found = before;
            node = before;
        }
        else if (before.name == "MatchClause") {
            node = before;
        }
        else if (before.type.is("Statement")) {
            node = before;
        }
        else {
            break;
        }
    }
    return found;
}
function indentBody(context, node) {
    let base = context.baseIndentFor(node);
    let line = context.lineAt(context.pos, -1), to = line.from + line.text.length;
    // Don't consider blank, deindented lines at the end of the
    // block part of the block
    if (/^\s*($|#)/.test(line.text) &&
        context.node.to < to + 100 &&
        !/\S/.test(context.state.sliceDoc(to, context.node.to)) &&
        context.lineIndent(context.pos, -1) <= base)
        return null;
    // A normally deindenting keyword that appears at a higher
    // indentation than the block should probably be handled by the next
    // level
    if (/^\s*(else:|elif |except |finally:|case\s+[^=:]+:)/.test(context.textAfter) && context.lineIndent(context.pos, -1) > base)
        return null;
    return base + context.unit;
}
/**
A language provider based on the [Lezer Python
parser](https://github.com/lezer-parser/python), extended with
highlighting and indentation information.
*/
const pythonLanguage = language.LRLanguage.define({
    name: "python",
    parser: python$1.parser.configure({
        props: [
            language.indentNodeProp.add({
                Body: context => {
                    var _a;
                    let body = /^\s*(#|$)/.test(context.textAfter) && innerBody(context) || context.node;
                    return (_a = indentBody(context, body)) !== null && _a !== void 0 ? _a : context.continue();
                },
                MatchBody: context => {
                    var _a;
                    let inner = innerBody(context);
                    return (_a = indentBody(context, inner || context.node)) !== null && _a !== void 0 ? _a : context.continue();
                },
                IfStatement: cx => /^\s*(else:|elif )/.test(cx.textAfter) ? cx.baseIndent : cx.continue(),
                "ForStatement WhileStatement": cx => /^\s*else:/.test(cx.textAfter) ? cx.baseIndent : cx.continue(),
                TryStatement: cx => /^\s*(except[ :]|finally:|else:)/.test(cx.textAfter) ? cx.baseIndent : cx.continue(),
                MatchStatement: cx => {
                    if (/^\s*case /.test(cx.textAfter))
                        return cx.baseIndent + cx.unit;
                    return cx.continue();
                },
                "TupleExpression ComprehensionExpression ParamList ArgList ParenthesizedExpression": language.delimitedIndent({ closing: ")" }),
                "DictionaryExpression DictionaryComprehensionExpression SetExpression SetComprehensionExpression": language.delimitedIndent({ closing: "}" }),
                "ArrayExpression ArrayComprehensionExpression": language.delimitedIndent({ closing: "]" }),
                MemberExpression: cx => cx.baseIndent + cx.unit,
                "String FormatString": () => null,
                Script: context => {
                    var _a;
                    let inner = innerBody(context);
                    return (_a = (inner && indentBody(context, inner))) !== null && _a !== void 0 ? _a : context.continue();
                },
            }),
            language.foldNodeProp.add({
                "ArrayExpression DictionaryExpression SetExpression TupleExpression": language.foldInside,
                Body: (node, state) => ({ from: node.from + 1, to: node.to - (node.to == state.doc.length ? 0 : 1) }),
                "String FormatString": (node, state) => ({ from: state.doc.lineAt(node.from).to, to: node.to })
            })
        ],
    }),
    languageData: {
        closeBrackets: {
            brackets: ["(", "[", "{", "'", '"', "'''", '"""'],
            stringPrefixes: ["f", "fr", "rf", "r", "u", "b", "br", "rb",
                "F", "FR", "RF", "R", "U", "B", "BR", "RB"]
        },
        commentTokens: { line: "#" },
        // Indent logic logic are triggered upon below input patterns
        indentOnInput: /^\s*([\}\]\)]|else:|elif |except |finally:|case\s+[^:]*:?)$/,
    }
});
/**
Python language support.
*/
function python() {
    return new language.LanguageSupport(pythonLanguage, [
        pythonLanguage.data.of({ autocomplete: localCompletionSource }),
        pythonLanguage.data.of({ autocomplete: globalCompletion }),
    ]);
}

exports.globalCompletion = globalCompletion;
exports.localCompletionSource = localCompletionSource;
exports.python = python;
exports.pythonLanguage = pythonLanguage;
