'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var leac = require('leac');
var p = require('peberminta');

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var p__namespace = /*#__PURE__*/_interopNamespace(p);

var ast = /*#__PURE__*/Object.freeze({
    __proto__: null
});

const ws = `(?:[ \\t\\r\\n\\f]*)`;
const nl = `(?:\\n|\\r\\n|\\r|\\f)`;
const nonascii = `[^\\x00-\\x7F]`;
const unicode = `(?:\\\\[0-9a-f]{1,6}(?:\\r\\n|[ \\n\\r\\t\\f])?)`;
const escape = `(?:\\\\[^\\n\\r\\f0-9a-f])`;
const nmstart = `(?:[_a-z]|${nonascii}|${unicode}|${escape})`;
const nmchar = `(?:[_a-z0-9-]|${nonascii}|${unicode}|${escape})`;
const name = `(?:${nmchar}+)`;
const ident = `(?:[-]?${nmstart}${nmchar}*)`;
const string1 = `'([^\\n\\r\\f\\\\']|\\\\${nl}|${nonascii}|${unicode}|${escape})*'`;
const string2 = `"([^\\n\\r\\f\\\\"]|\\\\${nl}|${nonascii}|${unicode}|${escape})*"`;
const lexSelector = leac.createLexer([
    { name: 'ws', regex: new RegExp(ws) },
    { name: 'hash', regex: new RegExp(`#${name}`, 'i') },
    { name: 'ident', regex: new RegExp(ident, 'i') },
    { name: 'str1', regex: new RegExp(string1, 'i') },
    { name: 'str2', regex: new RegExp(string2, 'i') },
    { name: '*' },
    { name: '.' },
    { name: ',' },
    { name: '[' },
    { name: ']' },
    { name: '=' },
    { name: '>' },
    { name: '|' },
    { name: '+' },
    { name: '~' },
    { name: '^' },
    { name: '$' },
]);
const lexEscapedString = leac.createLexer([
    { name: 'unicode', regex: new RegExp(unicode, 'i') },
    { name: 'escape', regex: new RegExp(escape, 'i') },
    { name: 'any', regex: new RegExp('[\\s\\S]', 'i') }
]);
function sumSpec([a0, a1, a2], [b0, b1, b2]) {
    return [a0 + b0, a1 + b1, a2 + b2];
}
function sumAllSpec(ss) {
    return ss.reduce(sumSpec, [0, 0, 0]);
}
const unicodeEscapedSequence_ = p__namespace.token((t) => t.name === 'unicode' ? String.fromCodePoint(parseInt(t.text.slice(1), 16)) : undefined);
const escapedSequence_ = p__namespace.token((t) => t.name === 'escape' ? t.text.slice(1) : undefined);
const anyChar_ = p__namespace.token((t) => t.name === 'any' ? t.text : undefined);
const escapedString_ = p__namespace.map(p__namespace.many(p__namespace.or(unicodeEscapedSequence_, escapedSequence_, anyChar_)), (cs) => cs.join(''));
function unescape(escapedString) {
    const lexerResult = lexEscapedString(escapedString);
    const result = escapedString_({ tokens: lexerResult.tokens, options: undefined }, 0);
    return result.value;
}
function literal(name) {
    return p__namespace.token((t) => t.name === name ? true : undefined);
}
const whitespace_ = p__namespace.token((t) => t.name === 'ws' ? null : undefined);
const optionalWhitespace_ = p__namespace.option(whitespace_, null);
function optionallySpaced(parser) {
    return p__namespace.middle(optionalWhitespace_, parser, optionalWhitespace_);
}
const identifier_ = p__namespace.token((t) => t.name === 'ident' ? unescape(t.text) : undefined);
const hashId_ = p__namespace.token((t) => t.name === 'hash' ? unescape(t.text.slice(1)) : undefined);
const string_ = p__namespace.token((t) => t.name.startsWith('str') ? unescape(t.text.slice(1, -1)) : undefined);
const namespace_ = p__namespace.left(p__namespace.option(identifier_, ''), literal('|'));
const qualifiedName_ = p__namespace.eitherOr(p__namespace.ab(namespace_, identifier_, (ns, name) => ({ name: name, namespace: ns })), p__namespace.map(identifier_, (name) => ({ name: name, namespace: null })));
const uniSelector_ = p__namespace.eitherOr(p__namespace.ab(namespace_, literal('*'), (ns) => ({ type: 'universal', namespace: ns, specificity: [0, 0, 0] })), p__namespace.map(literal('*'), () => ({ type: 'universal', namespace: null, specificity: [0, 0, 0] })));
const tagSelector_ = p__namespace.map(qualifiedName_, ({ name, namespace }) => ({
    type: 'tag',
    name: name,
    namespace: namespace,
    specificity: [0, 0, 1]
}));
const classSelector_ = p__namespace.ab(literal('.'), identifier_, (fullstop, name) => ({
    type: 'class',
    name: name,
    specificity: [0, 1, 0]
}));
const idSelector_ = p__namespace.map(hashId_, (name) => ({
    type: 'id',
    name: name,
    specificity: [1, 0, 0]
}));
const attrModifier_ = p__namespace.token((t) => {
    if (t.name === 'ident') {
        if (t.text === 'i' || t.text === 'I') {
            return 'i';
        }
        if (t.text === 's' || t.text === 'S') {
            return 's';
        }
    }
    return undefined;
});
const attrValue_ = p__namespace.eitherOr(p__namespace.ab(string_, p__namespace.option(p__namespace.right(optionalWhitespace_, attrModifier_), null), (v, mod) => ({ value: v, modifier: mod })), p__namespace.ab(identifier_, p__namespace.option(p__namespace.right(whitespace_, attrModifier_), null), (v, mod) => ({ value: v, modifier: mod })));
const attrMatcher_ = p__namespace.choice(p__namespace.map(literal('='), () => '='), p__namespace.ab(literal('~'), literal('='), () => '~='), p__namespace.ab(literal('|'), literal('='), () => '|='), p__namespace.ab(literal('^'), literal('='), () => '^='), p__namespace.ab(literal('$'), literal('='), () => '$='), p__namespace.ab(literal('*'), literal('='), () => '*='));
const attrPresenceSelector_ = p__namespace.abc(literal('['), optionallySpaced(qualifiedName_), literal(']'), (lbr, { name, namespace }) => ({
    type: 'attrPresence',
    name: name,
    namespace: namespace,
    specificity: [0, 1, 0]
}));
const attrValueSelector_ = p__namespace.middle(literal('['), p__namespace.abc(optionallySpaced(qualifiedName_), attrMatcher_, optionallySpaced(attrValue_), ({ name, namespace }, matcher, { value, modifier }) => ({
    type: 'attrValue',
    name: name,
    namespace: namespace,
    matcher: matcher,
    value: value,
    modifier: modifier,
    specificity: [0, 1, 0]
})), literal(']'));
const attrSelector_ = p__namespace.eitherOr(attrPresenceSelector_, attrValueSelector_);
const typeSelector_ = p__namespace.eitherOr(uniSelector_, tagSelector_);
const subclassSelector_ = p__namespace.choice(idSelector_, classSelector_, attrSelector_);
const compoundSelector_ = p__namespace.map(p__namespace.eitherOr(p__namespace.flatten(typeSelector_, p__namespace.many(subclassSelector_)), p__namespace.many1(subclassSelector_)), (ss) => {
    return {
        type: 'compound',
        list: ss,
        specificity: sumAllSpec(ss.map(s => s.specificity))
    };
});
const combinator_ = p__namespace.choice(p__namespace.map(literal('>'), () => '>'), p__namespace.map(literal('+'), () => '+'), p__namespace.map(literal('~'), () => '~'), p__namespace.ab(literal('|'), literal('|'), () => '||'));
const combinatorSeparator_ = p__namespace.eitherOr(optionallySpaced(combinator_), p__namespace.map(whitespace_, () => ' '));
const complexSelector_ = p__namespace.leftAssoc2(compoundSelector_, p__namespace.map(combinatorSeparator_, (c) => (left, right) => ({
    type: 'compound',
    list: [...right.list, { type: 'combinator', combinator: c, left: left, specificity: left.specificity }],
    specificity: sumSpec(left.specificity, right.specificity)
})), compoundSelector_);
const listSelector_ = p__namespace.leftAssoc2(p__namespace.map(complexSelector_, (s) => ({ type: 'list', list: [s] })), p__namespace.map(optionallySpaced(literal(',')), () => (acc, next) => ({ type: 'list', list: [...acc.list, next] })), complexSelector_);
function parse_(parser, str) {
    if (!(typeof str === 'string' || str instanceof String)) {
        throw new Error('Expected a selector string. Actual input is not a string!');
    }
    const lexerResult = lexSelector(str);
    if (!lexerResult.complete) {
        throw new Error(`The input "${str}" was only partially tokenized, stopped at offset ${lexerResult.offset}!\n` +
            prettyPrintPosition(str, lexerResult.offset));
    }
    const result = optionallySpaced(parser)({ tokens: lexerResult.tokens, options: undefined }, 0);
    if (!result.matched) {
        throw new Error(`No match for "${str}" input!`);
    }
    if (result.position < lexerResult.tokens.length) {
        const token = lexerResult.tokens[result.position];
        throw new Error(`The input "${str}" was only partially parsed, stopped at offset ${token.offset}!\n` +
            prettyPrintPosition(str, token.offset, token.len));
    }
    return result.value;
}
function prettyPrintPosition(str, offset, len = 1) {
    return `${str.replace(/(\t)|(\r)|(\n)/g, (m, t, r) => t ? '\u2409' : r ? '\u240d' : '\u240a')}\n${''.padEnd(offset)}${'^'.repeat(len)}`;
}
function parse(str) {
    return parse_(listSelector_, str);
}
function parse1(str) {
    return parse_(complexSelector_, str);
}

function serialize(selector) {
    if (!selector.type) {
        throw new Error('This is not an AST node.');
    }
    switch (selector.type) {
        case 'universal':
            return _serNs(selector.namespace) + '*';
        case 'tag':
            return _serNs(selector.namespace) + _serIdent(selector.name);
        case 'class':
            return '.' + _serIdent(selector.name);
        case 'id':
            return '#' + _serIdent(selector.name);
        case 'attrPresence':
            return `[${_serNs(selector.namespace)}${_serIdent(selector.name)}]`;
        case 'attrValue':
            return `[${_serNs(selector.namespace)}${_serIdent(selector.name)}${selector.matcher}"${_serStr(selector.value)}"${(selector.modifier ? selector.modifier : '')}]`;
        case 'combinator':
            return serialize(selector.left) + selector.combinator;
        case 'compound':
            return selector.list.reduce((acc, node) => {
                if (node.type === 'combinator') {
                    return serialize(node) + acc;
                }
                else {
                    return acc + serialize(node);
                }
            }, '');
        case 'list':
            return selector.list.map(serialize).join(',');
    }
}
function _serNs(ns) {
    return (ns || ns === '')
        ? _serIdent(ns) + '|'
        : '';
}
function _codePoint(char) {
    return `\\${char.codePointAt(0).toString(16)} `;
}
function _serIdent(str) {
    return str.replace(
    /(^[0-9])|(^-[0-9])|(^-$)|([-0-9a-zA-Z_]|[^\x00-\x7F])|(\x00)|([\x01-\x1f]|\x7f)|([\s\S])/g, (m, d1, d2, hy, safe, nl, ctrl, other) => d1 ? _codePoint(d1) :
        d2 ? '-' + _codePoint(d2.slice(1)) :
            hy ? '\\-' :
                safe ? safe :
                    nl ? '\ufffd' :
                        ctrl ? _codePoint(ctrl) :
                            '\\' + other);
}
function _serStr(str) {
    return str.replace(
    /(")|(\\)|(\x00)|([\x01-\x1f]|\x7f)/g, (m, dq, bs, nl, ctrl) => dq ? '\\"' :
        bs ? '\\\\' :
            nl ? '\ufffd' :
                _codePoint(ctrl));
}
function normalize(selector) {
    if (!selector.type) {
        throw new Error('This is not an AST node.');
    }
    switch (selector.type) {
        case 'compound': {
            selector.list.forEach(normalize);
            selector.list.sort((a, b) => _compareArrays(_getSelectorPriority(a), _getSelectorPriority(b)));
            break;
        }
        case 'combinator': {
            normalize(selector.left);
            break;
        }
        case 'list': {
            selector.list.forEach(normalize);
            selector.list.sort((a, b) => (serialize(a) < serialize(b)) ? -1 : 1);
            break;
        }
    }
    return selector;
}
function _getSelectorPriority(selector) {
    switch (selector.type) {
        case 'universal':
            return [1];
        case 'tag':
            return [1];
        case 'id':
            return [2];
        case 'class':
            return [3, selector.name];
        case 'attrPresence':
            return [4, serialize(selector)];
        case 'attrValue':
            return [5, serialize(selector)];
        case 'combinator':
            return [15, serialize(selector)];
    }
}
function compareSelectors(a, b) {
    return _compareArrays(a.specificity, b.specificity);
}
function compareSpecificity(a, b) {
    return _compareArrays(a, b);
}
function _compareArrays(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new Error('Arguments must be arrays.');
    }
    const shorter = (a.length < b.length) ? a.length : b.length;
    for (let i = 0; i < shorter; i++) {
        if (a[i] === b[i]) {
            continue;
        }
        return (a[i] < b[i]) ? -1 : 1;
    }
    return a.length - b.length;
}

exports.Ast = ast;
exports.compareSelectors = compareSelectors;
exports.compareSpecificity = compareSpecificity;
exports.normalize = normalize;
exports.parse = parse;
exports.parse1 = parse1;
exports.serialize = serialize;
