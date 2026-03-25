/*!
  * message-compiler v11.1.10
  * (c) 2025 kazuya kawaguchi
  * Released under the MIT License.
  */
import { format, assign, join, isString } from '@intlify/shared';
import { SourceMapGenerator } from 'source-map-js';

const LOCATION_STUB = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 }
};
function createPosition(line, column, offset) {
    return { line, column, offset };
}
function createLocation(start, end, source) {
    const loc = { start, end };
    if (source != null) {
        loc.source = source;
    }
    return loc;
}

const CompileErrorCodes = {
    // tokenizer error codes
    EXPECTED_TOKEN: 1,
    INVALID_TOKEN_IN_PLACEHOLDER: 2,
    UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER: 3,
    UNKNOWN_ESCAPE_SEQUENCE: 4,
    INVALID_UNICODE_ESCAPE_SEQUENCE: 5,
    UNBALANCED_CLOSING_BRACE: 6,
    UNTERMINATED_CLOSING_BRACE: 7,
    EMPTY_PLACEHOLDER: 8,
    NOT_ALLOW_NEST_PLACEHOLDER: 9,
    INVALID_LINKED_FORMAT: 10,
    // parser error codes
    MUST_HAVE_MESSAGES_IN_PLURAL: 11,
    UNEXPECTED_EMPTY_LINKED_MODIFIER: 12,
    UNEXPECTED_EMPTY_LINKED_KEY: 13,
    UNEXPECTED_LEXICAL_ANALYSIS: 14,
    // generator error codes
    UNHANDLED_CODEGEN_NODE_TYPE: 15,
    // minifier error codes
    UNHANDLED_MINIFIER_NODE_TYPE: 16
};
// Special value for higher-order compilers to pick up the last code
// to avoid collision of error codes.
// This should always be kept as the last item.
const COMPILE_ERROR_CODES_EXTEND_POINT = 17;
/** @internal */
const errorMessages = {
    // tokenizer error messages
    [CompileErrorCodes.EXPECTED_TOKEN]: `Expected token: '{0}'`,
    [CompileErrorCodes.INVALID_TOKEN_IN_PLACEHOLDER]: `Invalid token in placeholder: '{0}'`,
    [CompileErrorCodes.UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER]: `Unterminated single quote in placeholder`,
    [CompileErrorCodes.UNKNOWN_ESCAPE_SEQUENCE]: `Unknown escape sequence: \\{0}`,
    [CompileErrorCodes.INVALID_UNICODE_ESCAPE_SEQUENCE]: `Invalid unicode escape sequence: {0}`,
    [CompileErrorCodes.UNBALANCED_CLOSING_BRACE]: `Unbalanced closing brace`,
    [CompileErrorCodes.UNTERMINATED_CLOSING_BRACE]: `Unterminated closing brace`,
    [CompileErrorCodes.EMPTY_PLACEHOLDER]: `Empty placeholder`,
    [CompileErrorCodes.NOT_ALLOW_NEST_PLACEHOLDER]: `Not allowed nest placeholder`,
    [CompileErrorCodes.INVALID_LINKED_FORMAT]: `Invalid linked format`,
    // parser error messages
    [CompileErrorCodes.MUST_HAVE_MESSAGES_IN_PLURAL]: `Plural must have messages`,
    [CompileErrorCodes.UNEXPECTED_EMPTY_LINKED_MODIFIER]: `Unexpected empty linked modifier`,
    [CompileErrorCodes.UNEXPECTED_EMPTY_LINKED_KEY]: `Unexpected empty linked key`,
    [CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS]: `Unexpected lexical analysis in token: '{0}'`,
    // generator error messages
    [CompileErrorCodes.UNHANDLED_CODEGEN_NODE_TYPE]: `unhandled codegen node type: '{0}'`,
    // minimizer error messages
    [CompileErrorCodes.UNHANDLED_MINIFIER_NODE_TYPE]: `unhandled mimifier node type: '{0}'`
};
function createCompileError(code, loc, options = {}) {
    const { domain, messages, args } = options;
    const msg = (process.env.NODE_ENV !== 'production')
        ? format((messages || errorMessages)[code] || '', ...(args || []))
        : code;
    const error = new SyntaxError(String(msg));
    error.code = code;
    if (loc) {
        error.location = loc;
    }
    error.domain = domain;
    return error;
}
/** @internal */
function defaultOnError(error) {
    throw error;
}

// eslint-disable-next-line no-useless-escape
const RE_HTML_TAG = /<\/?[\w\s="/.':;#-\/]+>/;
const detectHtmlTag = (source) => RE_HTML_TAG.test(source);

const CHAR_SP = ' ';
const CHAR_CR = '\r';
const CHAR_LF = '\n';
const CHAR_LS = String.fromCharCode(0x2028);
const CHAR_PS = String.fromCharCode(0x2029);
function createScanner(str) {
    const _buf = str;
    let _index = 0;
    let _line = 1;
    let _column = 1;
    let _peekOffset = 0;
    const isCRLF = (index) => _buf[index] === CHAR_CR && _buf[index + 1] === CHAR_LF;
    const isLF = (index) => _buf[index] === CHAR_LF;
    const isPS = (index) => _buf[index] === CHAR_PS;
    const isLS = (index) => _buf[index] === CHAR_LS;
    const isLineEnd = (index) => isCRLF(index) || isLF(index) || isPS(index) || isLS(index);
    const index = () => _index;
    const line = () => _line;
    const column = () => _column;
    const peekOffset = () => _peekOffset;
    const charAt = (offset) => isCRLF(offset) || isPS(offset) || isLS(offset) ? CHAR_LF : _buf[offset];
    const currentChar = () => charAt(_index);
    const currentPeek = () => charAt(_index + _peekOffset);
    function next() {
        _peekOffset = 0;
        if (isLineEnd(_index)) {
            _line++;
            _column = 0;
        }
        if (isCRLF(_index)) {
            _index++;
        }
        _index++;
        _column++;
        return _buf[_index];
    }
    function peek() {
        if (isCRLF(_index + _peekOffset)) {
            _peekOffset++;
        }
        _peekOffset++;
        return _buf[_index + _peekOffset];
    }
    function reset() {
        _index = 0;
        _line = 1;
        _column = 1;
        _peekOffset = 0;
    }
    function resetPeek(offset = 0) {
        _peekOffset = offset;
    }
    function skipToPeek() {
        const target = _index + _peekOffset;
        while (target !== _index) {
            next();
        }
        _peekOffset = 0;
    }
    return {
        index,
        line,
        column,
        peekOffset,
        charAt,
        currentChar,
        currentPeek,
        next,
        peek,
        reset,
        resetPeek,
        skipToPeek
    };
}

const EOF = undefined;
const DOT = '.';
const LITERAL_DELIMITER = "'";
const ERROR_DOMAIN$3 = 'tokenizer';
function createTokenizer(source, options = {}) {
    const location = options.location !== false;
    const _scnr = createScanner(source);
    const currentOffset = () => _scnr.index();
    const currentPosition = () => createPosition(_scnr.line(), _scnr.column(), _scnr.index());
    const _initLoc = currentPosition();
    const _initOffset = currentOffset();
    const _context = {
        currentType: 13 /* TokenTypes.EOF */,
        offset: _initOffset,
        startLoc: _initLoc,
        endLoc: _initLoc,
        lastType: 13 /* TokenTypes.EOF */,
        lastOffset: _initOffset,
        lastStartLoc: _initLoc,
        lastEndLoc: _initLoc,
        braceNest: 0,
        inLinked: false,
        text: ''
    };
    const context = () => _context;
    const { onError } = options;
    function emitError(code, pos, offset, ...args) {
        const ctx = context();
        pos.column += offset;
        pos.offset += offset;
        if (onError) {
            const loc = location ? createLocation(ctx.startLoc, pos) : null;
            const err = createCompileError(code, loc, {
                domain: ERROR_DOMAIN$3,
                args
            });
            onError(err);
        }
    }
    function getToken(context, type, value) {
        context.endLoc = currentPosition();
        context.currentType = type;
        const token = { type };
        if (location) {
            token.loc = createLocation(context.startLoc, context.endLoc);
        }
        if (value != null) {
            token.value = value;
        }
        return token;
    }
    const getEndToken = (context) => getToken(context, 13 /* TokenTypes.EOF */);
    function eat(scnr, ch) {
        if (scnr.currentChar() === ch) {
            scnr.next();
            return ch;
        }
        else {
            emitError(CompileErrorCodes.EXPECTED_TOKEN, currentPosition(), 0, ch);
            return '';
        }
    }
    function peekSpaces(scnr) {
        let buf = '';
        while (scnr.currentPeek() === CHAR_SP || scnr.currentPeek() === CHAR_LF) {
            buf += scnr.currentPeek();
            scnr.peek();
        }
        return buf;
    }
    function skipSpaces(scnr) {
        const buf = peekSpaces(scnr);
        scnr.skipToPeek();
        return buf;
    }
    function isIdentifierStart(ch) {
        if (ch === EOF) {
            return false;
        }
        const cc = ch.charCodeAt(0);
        return ((cc >= 97 && cc <= 122) || // a-z
            (cc >= 65 && cc <= 90) || // A-Z
            cc === 95 // _
        );
    }
    function isNumberStart(ch) {
        if (ch === EOF) {
            return false;
        }
        const cc = ch.charCodeAt(0);
        return cc >= 48 && cc <= 57; // 0-9
    }
    function isNamedIdentifierStart(scnr, context) {
        const { currentType } = context;
        if (currentType !== 2 /* TokenTypes.BraceLeft */) {
            return false;
        }
        peekSpaces(scnr);
        const ret = isIdentifierStart(scnr.currentPeek());
        scnr.resetPeek();
        return ret;
    }
    function isListIdentifierStart(scnr, context) {
        const { currentType } = context;
        if (currentType !== 2 /* TokenTypes.BraceLeft */) {
            return false;
        }
        peekSpaces(scnr);
        const ch = scnr.currentPeek() === '-' ? scnr.peek() : scnr.currentPeek();
        const ret = isNumberStart(ch);
        scnr.resetPeek();
        return ret;
    }
    function isLiteralStart(scnr, context) {
        const { currentType } = context;
        if (currentType !== 2 /* TokenTypes.BraceLeft */) {
            return false;
        }
        peekSpaces(scnr);
        const ret = scnr.currentPeek() === LITERAL_DELIMITER;
        scnr.resetPeek();
        return ret;
    }
    function isLinkedDotStart(scnr, context) {
        const { currentType } = context;
        if (currentType !== 7 /* TokenTypes.LinkedAlias */) {
            return false;
        }
        peekSpaces(scnr);
        const ret = scnr.currentPeek() === "." /* TokenChars.LinkedDot */;
        scnr.resetPeek();
        return ret;
    }
    function isLinkedModifierStart(scnr, context) {
        const { currentType } = context;
        if (currentType !== 8 /* TokenTypes.LinkedDot */) {
            return false;
        }
        peekSpaces(scnr);
        const ret = isIdentifierStart(scnr.currentPeek());
        scnr.resetPeek();
        return ret;
    }
    function isLinkedDelimiterStart(scnr, context) {
        const { currentType } = context;
        if (!(currentType === 7 /* TokenTypes.LinkedAlias */ ||
            currentType === 11 /* TokenTypes.LinkedModifier */)) {
            return false;
        }
        peekSpaces(scnr);
        const ret = scnr.currentPeek() === ":" /* TokenChars.LinkedDelimiter */;
        scnr.resetPeek();
        return ret;
    }
    function isLinkedReferStart(scnr, context) {
        const { currentType } = context;
        if (currentType !== 9 /* TokenTypes.LinkedDelimiter */) {
            return false;
        }
        const fn = () => {
            const ch = scnr.currentPeek();
            if (ch === "{" /* TokenChars.BraceLeft */) {
                return isIdentifierStart(scnr.peek());
            }
            else if (ch === "@" /* TokenChars.LinkedAlias */ ||
                ch === "|" /* TokenChars.Pipe */ ||
                ch === ":" /* TokenChars.LinkedDelimiter */ ||
                ch === "." /* TokenChars.LinkedDot */ ||
                ch === CHAR_SP ||
                !ch) {
                return false;
            }
            else if (ch === CHAR_LF) {
                scnr.peek();
                return fn();
            }
            else {
                // other characters
                return isTextStart(scnr, false);
            }
        };
        const ret = fn();
        scnr.resetPeek();
        return ret;
    }
    function isPluralStart(scnr) {
        peekSpaces(scnr);
        const ret = scnr.currentPeek() === "|" /* TokenChars.Pipe */;
        scnr.resetPeek();
        return ret;
    }
    function isTextStart(scnr, reset = true) {
        const fn = (hasSpace = false, prev = '') => {
            const ch = scnr.currentPeek();
            if (ch === "{" /* TokenChars.BraceLeft */) {
                return hasSpace;
            }
            else if (ch === "@" /* TokenChars.LinkedAlias */ || !ch) {
                return hasSpace;
            }
            else if (ch === "|" /* TokenChars.Pipe */) {
                return !(prev === CHAR_SP || prev === CHAR_LF);
            }
            else if (ch === CHAR_SP) {
                scnr.peek();
                return fn(true, CHAR_SP);
            }
            else if (ch === CHAR_LF) {
                scnr.peek();
                return fn(true, CHAR_LF);
            }
            else {
                return true;
            }
        };
        const ret = fn();
        reset && scnr.resetPeek();
        return ret;
    }
    function takeChar(scnr, fn) {
        const ch = scnr.currentChar();
        if (ch === EOF) {
            return EOF;
        }
        if (fn(ch)) {
            scnr.next();
            return ch;
        }
        return null;
    }
    function isIdentifier(ch) {
        const cc = ch.charCodeAt(0);
        return ((cc >= 97 && cc <= 122) || // a-z
            (cc >= 65 && cc <= 90) || // A-Z
            (cc >= 48 && cc <= 57) || // 0-9
            cc === 95 || // _
            cc === 36 // $
        );
    }
    function takeIdentifierChar(scnr) {
        return takeChar(scnr, isIdentifier);
    }
    function isNamedIdentifier(ch) {
        const cc = ch.charCodeAt(0);
        return ((cc >= 97 && cc <= 122) || // a-z
            (cc >= 65 && cc <= 90) || // A-Z
            (cc >= 48 && cc <= 57) || // 0-9
            cc === 95 || // _
            cc === 36 || // $
            cc === 45 // -
        );
    }
    function takeNamedIdentifierChar(scnr) {
        return takeChar(scnr, isNamedIdentifier);
    }
    function isDigit(ch) {
        const cc = ch.charCodeAt(0);
        return cc >= 48 && cc <= 57; // 0-9
    }
    function takeDigit(scnr) {
        return takeChar(scnr, isDigit);
    }
    function isHexDigit(ch) {
        const cc = ch.charCodeAt(0);
        return ((cc >= 48 && cc <= 57) || // 0-9
            (cc >= 65 && cc <= 70) || // A-F
            (cc >= 97 && cc <= 102)); // a-f
    }
    function takeHexDigit(scnr) {
        return takeChar(scnr, isHexDigit);
    }
    function getDigits(scnr) {
        let ch = '';
        let num = '';
        while ((ch = takeDigit(scnr))) {
            num += ch;
        }
        return num;
    }
    function readText(scnr) {
        let buf = '';
        while (true) {
            const ch = scnr.currentChar();
            if (ch === "{" /* TokenChars.BraceLeft */ ||
                ch === "}" /* TokenChars.BraceRight */ ||
                ch === "@" /* TokenChars.LinkedAlias */ ||
                ch === "|" /* TokenChars.Pipe */ ||
                !ch) {
                break;
            }
            else if (ch === CHAR_SP || ch === CHAR_LF) {
                if (isTextStart(scnr)) {
                    buf += ch;
                    scnr.next();
                }
                else if (isPluralStart(scnr)) {
                    break;
                }
                else {
                    buf += ch;
                    scnr.next();
                }
            }
            else {
                buf += ch;
                scnr.next();
            }
        }
        return buf;
    }
    function readNamedIdentifier(scnr) {
        skipSpaces(scnr);
        let ch = '';
        let name = '';
        while ((ch = takeNamedIdentifierChar(scnr))) {
            name += ch;
        }
        if (scnr.currentChar() === EOF) {
            emitError(CompileErrorCodes.UNTERMINATED_CLOSING_BRACE, currentPosition(), 0);
        }
        return name;
    }
    function readListIdentifier(scnr) {
        skipSpaces(scnr);
        let value = '';
        if (scnr.currentChar() === '-') {
            scnr.next();
            value += `-${getDigits(scnr)}`;
        }
        else {
            value += getDigits(scnr);
        }
        if (scnr.currentChar() === EOF) {
            emitError(CompileErrorCodes.UNTERMINATED_CLOSING_BRACE, currentPosition(), 0);
        }
        return value;
    }
    function isLiteral(ch) {
        return ch !== LITERAL_DELIMITER && ch !== CHAR_LF;
    }
    function readLiteral(scnr) {
        skipSpaces(scnr);
        // eslint-disable-next-line no-useless-escape
        eat(scnr, `\'`);
        let ch = '';
        let literal = '';
        while ((ch = takeChar(scnr, isLiteral))) {
            if (ch === '\\') {
                literal += readEscapeSequence(scnr);
            }
            else {
                literal += ch;
            }
        }
        const current = scnr.currentChar();
        if (current === CHAR_LF || current === EOF) {
            emitError(CompileErrorCodes.UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER, currentPosition(), 0);
            // TODO: Is it correct really?
            if (current === CHAR_LF) {
                scnr.next();
                // eslint-disable-next-line no-useless-escape
                eat(scnr, `\'`);
            }
            return literal;
        }
        // eslint-disable-next-line no-useless-escape
        eat(scnr, `\'`);
        return literal;
    }
    function readEscapeSequence(scnr) {
        const ch = scnr.currentChar();
        switch (ch) {
            case '\\':
            case `\'`: // eslint-disable-line no-useless-escape
                scnr.next();
                return `\\${ch}`;
            case 'u':
                return readUnicodeEscapeSequence(scnr, ch, 4);
            case 'U':
                return readUnicodeEscapeSequence(scnr, ch, 6);
            default:
                emitError(CompileErrorCodes.UNKNOWN_ESCAPE_SEQUENCE, currentPosition(), 0, ch);
                return '';
        }
    }
    function readUnicodeEscapeSequence(scnr, unicode, digits) {
        eat(scnr, unicode);
        let sequence = '';
        for (let i = 0; i < digits; i++) {
            const ch = takeHexDigit(scnr);
            if (!ch) {
                emitError(CompileErrorCodes.INVALID_UNICODE_ESCAPE_SEQUENCE, currentPosition(), 0, `\\${unicode}${sequence}${scnr.currentChar()}`);
                break;
            }
            sequence += ch;
        }
        return `\\${unicode}${sequence}`;
    }
    function isInvalidIdentifier(ch) {
        return (ch !== "{" /* TokenChars.BraceLeft */ &&
            ch !== "}" /* TokenChars.BraceRight */ &&
            ch !== CHAR_SP &&
            ch !== CHAR_LF);
    }
    function readInvalidIdentifier(scnr) {
        skipSpaces(scnr);
        let ch = '';
        let identifiers = '';
        while ((ch = takeChar(scnr, isInvalidIdentifier))) {
            identifiers += ch;
        }
        return identifiers;
    }
    function readLinkedModifier(scnr) {
        let ch = '';
        let name = '';
        while ((ch = takeIdentifierChar(scnr))) {
            name += ch;
        }
        return name;
    }
    function readLinkedRefer(scnr) {
        const fn = (buf) => {
            const ch = scnr.currentChar();
            if (ch === "{" /* TokenChars.BraceLeft */ ||
                ch === "@" /* TokenChars.LinkedAlias */ ||
                ch === "|" /* TokenChars.Pipe */ ||
                ch === "(" /* TokenChars.ParenLeft */ ||
                ch === ")" /* TokenChars.ParenRight */ ||
                !ch) {
                return buf;
            }
            else if (ch === CHAR_SP) {
                return buf;
            }
            else if (ch === CHAR_LF || ch === DOT) {
                buf += ch;
                scnr.next();
                return fn(buf);
            }
            else {
                buf += ch;
                scnr.next();
                return fn(buf);
            }
        };
        return fn('');
    }
    function readPlural(scnr) {
        skipSpaces(scnr);
        const plural = eat(scnr, "|" /* TokenChars.Pipe */);
        skipSpaces(scnr);
        return plural;
    }
    // TODO: We need refactoring of token parsing ...
    function readTokenInPlaceholder(scnr, context) {
        let token = null;
        const ch = scnr.currentChar();
        switch (ch) {
            case "{" /* TokenChars.BraceLeft */:
                if (context.braceNest >= 1) {
                    emitError(CompileErrorCodes.NOT_ALLOW_NEST_PLACEHOLDER, currentPosition(), 0);
                }
                scnr.next();
                token = getToken(context, 2 /* TokenTypes.BraceLeft */, "{" /* TokenChars.BraceLeft */);
                skipSpaces(scnr);
                context.braceNest++;
                return token;
            case "}" /* TokenChars.BraceRight */:
                if (context.braceNest > 0 &&
                    context.currentType === 2 /* TokenTypes.BraceLeft */) {
                    emitError(CompileErrorCodes.EMPTY_PLACEHOLDER, currentPosition(), 0);
                }
                scnr.next();
                token = getToken(context, 3 /* TokenTypes.BraceRight */, "}" /* TokenChars.BraceRight */);
                context.braceNest--;
                context.braceNest > 0 && skipSpaces(scnr);
                if (context.inLinked && context.braceNest === 0) {
                    context.inLinked = false;
                }
                return token;
            case "@" /* TokenChars.LinkedAlias */:
                if (context.braceNest > 0) {
                    emitError(CompileErrorCodes.UNTERMINATED_CLOSING_BRACE, currentPosition(), 0);
                }
                token = readTokenInLinked(scnr, context) || getEndToken(context);
                context.braceNest = 0;
                return token;
            default: {
                let validNamedIdentifier = true;
                let validListIdentifier = true;
                let validLiteral = true;
                if (isPluralStart(scnr)) {
                    if (context.braceNest > 0) {
                        emitError(CompileErrorCodes.UNTERMINATED_CLOSING_BRACE, currentPosition(), 0);
                    }
                    token = getToken(context, 1 /* TokenTypes.Pipe */, readPlural(scnr));
                    // reset
                    context.braceNest = 0;
                    context.inLinked = false;
                    return token;
                }
                if (context.braceNest > 0 &&
                    (context.currentType === 4 /* TokenTypes.Named */ ||
                        context.currentType === 5 /* TokenTypes.List */ ||
                        context.currentType === 6 /* TokenTypes.Literal */)) {
                    emitError(CompileErrorCodes.UNTERMINATED_CLOSING_BRACE, currentPosition(), 0);
                    context.braceNest = 0;
                    return readToken(scnr, context);
                }
                if ((validNamedIdentifier = isNamedIdentifierStart(scnr, context))) {
                    token = getToken(context, 4 /* TokenTypes.Named */, readNamedIdentifier(scnr));
                    skipSpaces(scnr);
                    return token;
                }
                if ((validListIdentifier = isListIdentifierStart(scnr, context))) {
                    token = getToken(context, 5 /* TokenTypes.List */, readListIdentifier(scnr));
                    skipSpaces(scnr);
                    return token;
                }
                if ((validLiteral = isLiteralStart(scnr, context))) {
                    token = getToken(context, 6 /* TokenTypes.Literal */, readLiteral(scnr));
                    skipSpaces(scnr);
                    return token;
                }
                if (!validNamedIdentifier && !validListIdentifier && !validLiteral) {
                    // TODO: we should be re-designed invalid cases, when we will extend message syntax near the future ...
                    token = getToken(context, 12 /* TokenTypes.InvalidPlace */, readInvalidIdentifier(scnr));
                    emitError(CompileErrorCodes.INVALID_TOKEN_IN_PLACEHOLDER, currentPosition(), 0, token.value);
                    skipSpaces(scnr);
                    return token;
                }
                break;
            }
        }
        return token;
    }
    // TODO: We need refactoring of token parsing ...
    function readTokenInLinked(scnr, context) {
        const { currentType } = context;
        let token = null;
        const ch = scnr.currentChar();
        if ((currentType === 7 /* TokenTypes.LinkedAlias */ ||
            currentType === 8 /* TokenTypes.LinkedDot */ ||
            currentType === 11 /* TokenTypes.LinkedModifier */ ||
            currentType === 9 /* TokenTypes.LinkedDelimiter */) &&
            (ch === CHAR_LF || ch === CHAR_SP)) {
            emitError(CompileErrorCodes.INVALID_LINKED_FORMAT, currentPosition(), 0);
        }
        switch (ch) {
            case "@" /* TokenChars.LinkedAlias */:
                scnr.next();
                token = getToken(context, 7 /* TokenTypes.LinkedAlias */, "@" /* TokenChars.LinkedAlias */);
                context.inLinked = true;
                return token;
            case "." /* TokenChars.LinkedDot */:
                skipSpaces(scnr);
                scnr.next();
                return getToken(context, 8 /* TokenTypes.LinkedDot */, "." /* TokenChars.LinkedDot */);
            case ":" /* TokenChars.LinkedDelimiter */:
                skipSpaces(scnr);
                scnr.next();
                return getToken(context, 9 /* TokenTypes.LinkedDelimiter */, ":" /* TokenChars.LinkedDelimiter */);
            default:
                if (isPluralStart(scnr)) {
                    token = getToken(context, 1 /* TokenTypes.Pipe */, readPlural(scnr));
                    // reset
                    context.braceNest = 0;
                    context.inLinked = false;
                    return token;
                }
                if (isLinkedDotStart(scnr, context) ||
                    isLinkedDelimiterStart(scnr, context)) {
                    skipSpaces(scnr);
                    return readTokenInLinked(scnr, context);
                }
                if (isLinkedModifierStart(scnr, context)) {
                    skipSpaces(scnr);
                    return getToken(context, 11 /* TokenTypes.LinkedModifier */, readLinkedModifier(scnr));
                }
                if (isLinkedReferStart(scnr, context)) {
                    skipSpaces(scnr);
                    if (ch === "{" /* TokenChars.BraceLeft */) {
                        // scan the placeholder
                        return readTokenInPlaceholder(scnr, context) || token;
                    }
                    else {
                        return getToken(context, 10 /* TokenTypes.LinkedKey */, readLinkedRefer(scnr));
                    }
                }
                if (currentType === 7 /* TokenTypes.LinkedAlias */) {
                    emitError(CompileErrorCodes.INVALID_LINKED_FORMAT, currentPosition(), 0);
                }
                context.braceNest = 0;
                context.inLinked = false;
                return readToken(scnr, context);
        }
    }
    // TODO: We need refactoring of token parsing ...
    function readToken(scnr, context) {
        let token = { type: 13 /* TokenTypes.EOF */ };
        if (context.braceNest > 0) {
            return readTokenInPlaceholder(scnr, context) || getEndToken(context);
        }
        if (context.inLinked) {
            return readTokenInLinked(scnr, context) || getEndToken(context);
        }
        const ch = scnr.currentChar();
        switch (ch) {
            case "{" /* TokenChars.BraceLeft */:
                return readTokenInPlaceholder(scnr, context) || getEndToken(context);
            case "}" /* TokenChars.BraceRight */:
                emitError(CompileErrorCodes.UNBALANCED_CLOSING_BRACE, currentPosition(), 0);
                scnr.next();
                return getToken(context, 3 /* TokenTypes.BraceRight */, "}" /* TokenChars.BraceRight */);
            case "@" /* TokenChars.LinkedAlias */:
                return readTokenInLinked(scnr, context) || getEndToken(context);
            default: {
                if (isPluralStart(scnr)) {
                    token = getToken(context, 1 /* TokenTypes.Pipe */, readPlural(scnr));
                    // reset
                    context.braceNest = 0;
                    context.inLinked = false;
                    return token;
                }
                if (isTextStart(scnr)) {
                    return getToken(context, 0 /* TokenTypes.Text */, readText(scnr));
                }
                break;
            }
        }
        return token;
    }
    function nextToken() {
        const { currentType, offset, startLoc, endLoc } = _context;
        _context.lastType = currentType;
        _context.lastOffset = offset;
        _context.lastStartLoc = startLoc;
        _context.lastEndLoc = endLoc;
        _context.offset = currentOffset();
        _context.startLoc = currentPosition();
        if (_scnr.currentChar() === EOF) {
            return getToken(_context, 13 /* TokenTypes.EOF */);
        }
        return readToken(_scnr, _context);
    }
    return {
        nextToken,
        currentOffset,
        currentPosition,
        context
    };
}

const ERROR_DOMAIN$2 = 'parser';
// Backslash backslash, backslash quote, uHHHH, UHHHHHH.
const KNOWN_ESCAPES = /(?:\\\\|\\'|\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{6}))/g;
function fromEscapeSequence(match, codePoint4, codePoint6) {
    switch (match) {
        case `\\\\`:
            return `\\`;
        // eslint-disable-next-line no-useless-escape
        case `\\\'`:
            // eslint-disable-next-line no-useless-escape
            return `\'`;
        default: {
            const codePoint = parseInt(codePoint4 || codePoint6, 16);
            if (codePoint <= 0xd7ff || codePoint >= 0xe000) {
                return String.fromCodePoint(codePoint);
            }
            // invalid ...
            // Replace them with U+FFFD REPLACEMENT CHARACTER.
            return '�';
        }
    }
}
function createParser(options = {}) {
    const location = options.location !== false;
    const { onError } = options;
    function emitError(tokenzer, code, start, offset, ...args) {
        const end = tokenzer.currentPosition();
        end.offset += offset;
        end.column += offset;
        if (onError) {
            const loc = location ? createLocation(start, end) : null;
            const err = createCompileError(code, loc, {
                domain: ERROR_DOMAIN$2,
                args
            });
            onError(err);
        }
    }
    function startNode(type, offset, loc) {
        const node = { type };
        if (location) {
            node.start = offset;
            node.end = offset;
            node.loc = { start: loc, end: loc };
        }
        return node;
    }
    function endNode(node, offset, pos, type) {
        if (location) {
            node.end = offset;
            if (node.loc) {
                node.loc.end = pos;
            }
        }
    }
    function parseText(tokenizer, value) {
        const context = tokenizer.context();
        const node = startNode(3 /* NodeTypes.Text */, context.offset, context.startLoc);
        node.value = value;
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return node;
    }
    function parseList(tokenizer, index) {
        const context = tokenizer.context();
        const { lastOffset: offset, lastStartLoc: loc } = context; // get brace left loc
        const node = startNode(5 /* NodeTypes.List */, offset, loc);
        node.index = parseInt(index, 10);
        tokenizer.nextToken(); // skip brach right
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return node;
    }
    function parseNamed(tokenizer, key) {
        const context = tokenizer.context();
        const { lastOffset: offset, lastStartLoc: loc } = context; // get brace left loc
        const node = startNode(4 /* NodeTypes.Named */, offset, loc);
        node.key = key;
        tokenizer.nextToken(); // skip brach right
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return node;
    }
    function parseLiteral(tokenizer, value) {
        const context = tokenizer.context();
        const { lastOffset: offset, lastStartLoc: loc } = context; // get brace left loc
        const node = startNode(9 /* NodeTypes.Literal */, offset, loc);
        node.value = value.replace(KNOWN_ESCAPES, fromEscapeSequence);
        tokenizer.nextToken(); // skip brach right
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return node;
    }
    function parseLinkedModifier(tokenizer) {
        const token = tokenizer.nextToken();
        const context = tokenizer.context();
        const { lastOffset: offset, lastStartLoc: loc } = context; // get linked dot loc
        const node = startNode(8 /* NodeTypes.LinkedModifier */, offset, loc);
        if (token.type !== 11 /* TokenTypes.LinkedModifier */) {
            // empty modifier
            emitError(tokenizer, CompileErrorCodes.UNEXPECTED_EMPTY_LINKED_MODIFIER, context.lastStartLoc, 0);
            node.value = '';
            endNode(node, offset, loc);
            return {
                nextConsumeToken: token,
                node
            };
        }
        // check token
        if (token.value == null) {
            emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
        }
        node.value = token.value || '';
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return {
            node
        };
    }
    function parseLinkedKey(tokenizer, value) {
        const context = tokenizer.context();
        const node = startNode(7 /* NodeTypes.LinkedKey */, context.offset, context.startLoc);
        node.value = value;
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return node;
    }
    function parseLinked(tokenizer) {
        const context = tokenizer.context();
        const linkedNode = startNode(6 /* NodeTypes.Linked */, context.offset, context.startLoc);
        let token = tokenizer.nextToken();
        if (token.type === 8 /* TokenTypes.LinkedDot */) {
            const parsed = parseLinkedModifier(tokenizer);
            linkedNode.modifier = parsed.node;
            token = parsed.nextConsumeToken || tokenizer.nextToken();
        }
        // asset check token
        if (token.type !== 9 /* TokenTypes.LinkedDelimiter */) {
            emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
        }
        token = tokenizer.nextToken();
        // skip brace left
        if (token.type === 2 /* TokenTypes.BraceLeft */) {
            token = tokenizer.nextToken();
        }
        switch (token.type) {
            case 10 /* TokenTypes.LinkedKey */:
                if (token.value == null) {
                    emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                }
                linkedNode.key = parseLinkedKey(tokenizer, token.value || '');
                break;
            case 4 /* TokenTypes.Named */:
                if (token.value == null) {
                    emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                }
                linkedNode.key = parseNamed(tokenizer, token.value || '');
                break;
            case 5 /* TokenTypes.List */:
                if (token.value == null) {
                    emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                }
                linkedNode.key = parseList(tokenizer, token.value || '');
                break;
            case 6 /* TokenTypes.Literal */:
                if (token.value == null) {
                    emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                }
                linkedNode.key = parseLiteral(tokenizer, token.value || '');
                break;
            default: {
                // empty key
                emitError(tokenizer, CompileErrorCodes.UNEXPECTED_EMPTY_LINKED_KEY, context.lastStartLoc, 0);
                const nextContext = tokenizer.context();
                const emptyLinkedKeyNode = startNode(7 /* NodeTypes.LinkedKey */, nextContext.offset, nextContext.startLoc);
                emptyLinkedKeyNode.value = '';
                endNode(emptyLinkedKeyNode, nextContext.offset, nextContext.startLoc);
                linkedNode.key = emptyLinkedKeyNode;
                endNode(linkedNode, nextContext.offset, nextContext.startLoc);
                return {
                    nextConsumeToken: token,
                    node: linkedNode
                };
            }
        }
        endNode(linkedNode, tokenizer.currentOffset(), tokenizer.currentPosition());
        return {
            node: linkedNode
        };
    }
    function parseMessage(tokenizer) {
        const context = tokenizer.context();
        const startOffset = context.currentType === 1 /* TokenTypes.Pipe */
            ? tokenizer.currentOffset()
            : context.offset;
        const startLoc = context.currentType === 1 /* TokenTypes.Pipe */
            ? context.endLoc
            : context.startLoc;
        const node = startNode(2 /* NodeTypes.Message */, startOffset, startLoc);
        node.items = [];
        let nextToken = null;
        do {
            const token = nextToken || tokenizer.nextToken();
            nextToken = null;
            switch (token.type) {
                case 0 /* TokenTypes.Text */:
                    if (token.value == null) {
                        emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                    }
                    node.items.push(parseText(tokenizer, token.value || ''));
                    break;
                case 5 /* TokenTypes.List */:
                    if (token.value == null) {
                        emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                    }
                    node.items.push(parseList(tokenizer, token.value || ''));
                    break;
                case 4 /* TokenTypes.Named */:
                    if (token.value == null) {
                        emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                    }
                    node.items.push(parseNamed(tokenizer, token.value || ''));
                    break;
                case 6 /* TokenTypes.Literal */:
                    if (token.value == null) {
                        emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, getTokenCaption(token));
                    }
                    node.items.push(parseLiteral(tokenizer, token.value || ''));
                    break;
                case 7 /* TokenTypes.LinkedAlias */: {
                    const parsed = parseLinked(tokenizer);
                    node.items.push(parsed.node);
                    nextToken = parsed.nextConsumeToken || null;
                    break;
                }
            }
        } while (context.currentType !== 13 /* TokenTypes.EOF */ &&
            context.currentType !== 1 /* TokenTypes.Pipe */);
        // adjust message node loc
        const endOffset = context.currentType === 1 /* TokenTypes.Pipe */
            ? context.lastOffset
            : tokenizer.currentOffset();
        const endLoc = context.currentType === 1 /* TokenTypes.Pipe */
            ? context.lastEndLoc
            : tokenizer.currentPosition();
        endNode(node, endOffset, endLoc);
        return node;
    }
    function parsePlural(tokenizer, offset, loc, msgNode) {
        const context = tokenizer.context();
        let hasEmptyMessage = msgNode.items.length === 0;
        const node = startNode(1 /* NodeTypes.Plural */, offset, loc);
        node.cases = [];
        node.cases.push(msgNode);
        do {
            const msg = parseMessage(tokenizer);
            if (!hasEmptyMessage) {
                hasEmptyMessage = msg.items.length === 0;
            }
            node.cases.push(msg);
        } while (context.currentType !== 13 /* TokenTypes.EOF */);
        if (hasEmptyMessage) {
            emitError(tokenizer, CompileErrorCodes.MUST_HAVE_MESSAGES_IN_PLURAL, loc, 0);
        }
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return node;
    }
    function parseResource(tokenizer) {
        const context = tokenizer.context();
        const { offset, startLoc } = context;
        const msgNode = parseMessage(tokenizer);
        if (context.currentType === 13 /* TokenTypes.EOF */) {
            return msgNode;
        }
        else {
            return parsePlural(tokenizer, offset, startLoc, msgNode);
        }
    }
    function parse(source) {
        const tokenizer = createTokenizer(source, assign({}, options));
        const context = tokenizer.context();
        const node = startNode(0 /* NodeTypes.Resource */, context.offset, context.startLoc);
        if (location && node.loc) {
            node.loc.source = source;
        }
        node.body = parseResource(tokenizer);
        if (options.onCacheKey) {
            node.cacheKey = options.onCacheKey(source);
        }
        // assert whether achieved to EOF
        if (context.currentType !== 13 /* TokenTypes.EOF */) {
            emitError(tokenizer, CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS, context.lastStartLoc, 0, source[context.offset] || '');
        }
        endNode(node, tokenizer.currentOffset(), tokenizer.currentPosition());
        return node;
    }
    return { parse };
}
function getTokenCaption(token) {
    if (token.type === 13 /* TokenTypes.EOF */) {
        return 'EOF';
    }
    const name = (token.value || '').replace(/\r?\n/gu, '\\n');
    return name.length > 10 ? name.slice(0, 9) + '…' : name;
}

function createTransformer(ast, options = {} // eslint-disable-line
) {
    const _context = {
        ast,
        helpers: new Set()
    };
    const context = () => _context;
    const helper = (name) => {
        _context.helpers.add(name);
        return name;
    };
    return { context, helper };
}
function traverseNodes(nodes, transformer) {
    for (let i = 0; i < nodes.length; i++) {
        traverseNode(nodes[i], transformer);
    }
}
function traverseNode(node, transformer) {
    // TODO: if we need pre-hook of transform, should be implemented to here
    switch (node.type) {
        case 1 /* NodeTypes.Plural */:
            traverseNodes(node.cases, transformer);
            transformer.helper("plural" /* HelperNameMap.PLURAL */);
            break;
        case 2 /* NodeTypes.Message */:
            traverseNodes(node.items, transformer);
            break;
        case 6 /* NodeTypes.Linked */: {
            const linked = node;
            traverseNode(linked.key, transformer);
            transformer.helper("linked" /* HelperNameMap.LINKED */);
            transformer.helper("type" /* HelperNameMap.TYPE */);
            break;
        }
        case 5 /* NodeTypes.List */:
            transformer.helper("interpolate" /* HelperNameMap.INTERPOLATE */);
            transformer.helper("list" /* HelperNameMap.LIST */);
            break;
        case 4 /* NodeTypes.Named */:
            transformer.helper("interpolate" /* HelperNameMap.INTERPOLATE */);
            transformer.helper("named" /* HelperNameMap.NAMED */);
            break;
    }
    // TODO: if we need post-hook of transform, should be implemented to here
}
// transform AST
function transform(ast, options = {} // eslint-disable-line
) {
    const transformer = createTransformer(ast);
    transformer.helper("normalize" /* HelperNameMap.NORMALIZE */);
    // traverse
    ast.body && traverseNode(ast.body, transformer);
    // set meta information
    const context = transformer.context();
    ast.helpers = Array.from(context.helpers);
}

function optimize(ast) {
    const body = ast.body;
    if (body.type === 2 /* NodeTypes.Message */) {
        optimizeMessageNode(body);
    }
    else {
        body.cases.forEach(c => optimizeMessageNode(c));
    }
    return ast;
}
function optimizeMessageNode(message) {
    if (message.items.length === 1) {
        const item = message.items[0];
        if (item.type === 3 /* NodeTypes.Text */ || item.type === 9 /* NodeTypes.Literal */) {
            message.static = item.value;
            delete item.value; // optimization for size
        }
    }
    else {
        const values = [];
        for (let i = 0; i < message.items.length; i++) {
            const item = message.items[i];
            if (!(item.type === 3 /* NodeTypes.Text */ || item.type === 9 /* NodeTypes.Literal */)) {
                break;
            }
            if (item.value == null) {
                break;
            }
            values.push(item.value);
        }
        if (values.length === message.items.length) {
            message.static = join(values);
            for (let i = 0; i < message.items.length; i++) {
                const item = message.items[i];
                if (item.type === 3 /* NodeTypes.Text */ || item.type === 9 /* NodeTypes.Literal */) {
                    delete item.value; // optimization for size
                }
            }
        }
    }
}

const ERROR_DOMAIN$1 = 'minifier';
/* eslint-disable @typescript-eslint/no-explicit-any */
function minify(node) {
    node.t = node.type;
    switch (node.type) {
        case 0 /* NodeTypes.Resource */: {
            const resource = node;
            minify(resource.body);
            resource.b = resource.body;
            delete resource.body;
            break;
        }
        case 1 /* NodeTypes.Plural */: {
            const plural = node;
            const cases = plural.cases;
            for (let i = 0; i < cases.length; i++) {
                minify(cases[i]);
            }
            plural.c = cases;
            delete plural.cases;
            break;
        }
        case 2 /* NodeTypes.Message */: {
            const message = node;
            const items = message.items;
            for (let i = 0; i < items.length; i++) {
                minify(items[i]);
            }
            message.i = items;
            delete message.items;
            if (message.static) {
                message.s = message.static;
                delete message.static;
            }
            break;
        }
        case 3 /* NodeTypes.Text */:
        case 9 /* NodeTypes.Literal */:
        case 8 /* NodeTypes.LinkedModifier */:
        case 7 /* NodeTypes.LinkedKey */: {
            const valueNode = node;
            if (valueNode.value) {
                valueNode.v = valueNode.value;
                delete valueNode.value;
            }
            break;
        }
        case 6 /* NodeTypes.Linked */: {
            const linked = node;
            minify(linked.key);
            linked.k = linked.key;
            delete linked.key;
            if (linked.modifier) {
                minify(linked.modifier);
                linked.m = linked.modifier;
                delete linked.modifier;
            }
            break;
        }
        case 5 /* NodeTypes.List */: {
            const list = node;
            list.i = list.index;
            delete list.index;
            break;
        }
        case 4 /* NodeTypes.Named */: {
            const named = node;
            named.k = named.key;
            delete named.key;
            break;
        }
        default:
            if ((process.env.NODE_ENV !== 'production')) {
                throw createCompileError(CompileErrorCodes.UNHANDLED_MINIFIER_NODE_TYPE, null, {
                    domain: ERROR_DOMAIN$1,
                    args: [node.type]
                });
            }
    }
    delete node.type;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="source-map-js" />
const ERROR_DOMAIN = 'parser';
function createCodeGenerator(ast, options) {
    const { sourceMap, filename, breakLineCode, needIndent: _needIndent } = options;
    const location = options.location !== false;
    const _context = {
        filename,
        code: '',
        column: 1,
        line: 1,
        offset: 0,
        map: undefined,
        breakLineCode,
        needIndent: _needIndent,
        indentLevel: 0
    };
    if (location && ast.loc) {
        _context.source = ast.loc.source;
    }
    const context = () => _context;
    function push(code, node) {
        _context.code += code;
        if (_context.map) {
            if (node && node.loc && node.loc !== LOCATION_STUB) {
                addMapping(node.loc.start, getMappingName(node));
            }
            advancePositionWithSource(_context, code);
        }
    }
    function _newline(n, withBreakLine = true) {
        const _breakLineCode = withBreakLine ? breakLineCode : '';
        push(_needIndent ? _breakLineCode + `  `.repeat(n) : _breakLineCode);
    }
    function indent(withNewLine = true) {
        const level = ++_context.indentLevel;
        withNewLine && _newline(level);
    }
    function deindent(withNewLine = true) {
        const level = --_context.indentLevel;
        withNewLine && _newline(level);
    }
    function newline() {
        _newline(_context.indentLevel);
    }
    const helper = (key) => `_${key}`;
    const needIndent = () => _context.needIndent;
    function addMapping(loc, name) {
        _context.map.addMapping({
            name,
            source: _context.filename,
            original: {
                line: loc.line,
                column: loc.column - 1
            },
            generated: {
                line: _context.line,
                column: _context.column - 1
            }
        });
    }
    if (location && sourceMap) {
        _context.map = new SourceMapGenerator();
        _context.map.setSourceContent(filename, _context.source);
    }
    return {
        context,
        push,
        indent,
        deindent,
        newline,
        helper,
        needIndent
    };
}
function generateLinkedNode(generator, node) {
    const { helper } = generator;
    generator.push(`${helper("linked" /* HelperNameMap.LINKED */)}(`);
    generateNode(generator, node.key);
    if (node.modifier) {
        generator.push(`, `);
        generateNode(generator, node.modifier);
        generator.push(`, _type`);
    }
    else {
        generator.push(`, undefined, _type`);
    }
    generator.push(`)`);
}
function generateMessageNode(generator, node) {
    const { helper, needIndent } = generator;
    generator.push(`${helper("normalize" /* HelperNameMap.NORMALIZE */)}([`);
    generator.indent(needIndent());
    const length = node.items.length;
    for (let i = 0; i < length; i++) {
        generateNode(generator, node.items[i]);
        if (i === length - 1) {
            break;
        }
        generator.push(', ');
    }
    generator.deindent(needIndent());
    generator.push('])');
}
function generatePluralNode(generator, node) {
    const { helper, needIndent } = generator;
    if (node.cases.length > 1) {
        generator.push(`${helper("plural" /* HelperNameMap.PLURAL */)}([`);
        generator.indent(needIndent());
        const length = node.cases.length;
        for (let i = 0; i < length; i++) {
            generateNode(generator, node.cases[i]);
            if (i === length - 1) {
                break;
            }
            generator.push(', ');
        }
        generator.deindent(needIndent());
        generator.push(`])`);
    }
}
function generateResource(generator, node) {
    if (node.body) {
        generateNode(generator, node.body);
    }
    else {
        generator.push('null');
    }
}
function generateNode(generator, node) {
    const { helper } = generator;
    switch (node.type) {
        case 0 /* NodeTypes.Resource */:
            generateResource(generator, node);
            break;
        case 1 /* NodeTypes.Plural */:
            generatePluralNode(generator, node);
            break;
        case 2 /* NodeTypes.Message */:
            generateMessageNode(generator, node);
            break;
        case 6 /* NodeTypes.Linked */:
            generateLinkedNode(generator, node);
            break;
        case 8 /* NodeTypes.LinkedModifier */:
            generator.push(JSON.stringify(node.value), node);
            break;
        case 7 /* NodeTypes.LinkedKey */:
            generator.push(JSON.stringify(node.value), node);
            break;
        case 5 /* NodeTypes.List */:
            generator.push(`${helper("interpolate" /* HelperNameMap.INTERPOLATE */)}(${helper("list" /* HelperNameMap.LIST */)}(${node.index}))`, node);
            break;
        case 4 /* NodeTypes.Named */:
            generator.push(`${helper("interpolate" /* HelperNameMap.INTERPOLATE */)}(${helper("named" /* HelperNameMap.NAMED */)}(${JSON.stringify(node.key)}))`, node);
            break;
        case 9 /* NodeTypes.Literal */:
            generator.push(JSON.stringify(node.value), node);
            break;
        case 3 /* NodeTypes.Text */:
            generator.push(JSON.stringify(node.value), node);
            break;
        default:
            if ((process.env.NODE_ENV !== 'production')) {
                throw createCompileError(CompileErrorCodes.UNHANDLED_CODEGEN_NODE_TYPE, null, {
                    domain: ERROR_DOMAIN,
                    args: [node.type]
                });
            }
    }
}
// generate code from AST
const generate = (ast, options = {}) => {
    const mode = isString(options.mode) ? options.mode : 'normal';
    const filename = isString(options.filename)
        ? options.filename
        : 'message.intl';
    const sourceMap = !!options.sourceMap;
    // prettier-ignore
    const breakLineCode = options.breakLineCode != null
        ? options.breakLineCode
        : mode === 'arrow'
            ? ';'
            : '\n';
    const needIndent = options.needIndent ? options.needIndent : mode !== 'arrow';
    const helpers = ast.helpers || [];
    const generator = createCodeGenerator(ast, {
        mode,
        filename,
        sourceMap,
        breakLineCode,
        needIndent
    });
    generator.push(mode === 'normal' ? `function __msg__ (ctx) {` : `(ctx) => {`);
    generator.indent(needIndent);
    if (helpers.length > 0) {
        generator.push(`const { ${join(helpers.map(s => `${s}: _${s}`), ', ')} } = ctx`);
        generator.newline();
    }
    generator.push(`return `);
    generateNode(generator, ast);
    generator.deindent(needIndent);
    generator.push(`}`);
    delete ast.helpers;
    const { code, map } = generator.context();
    return {
        ast,
        code,
        map: map ? map.toJSON() : undefined // eslint-disable-line @typescript-eslint/no-explicit-any
    };
};
function getMappingName(node) {
    switch (node.type) {
        case 3 /* NodeTypes.Text */:
        case 9 /* NodeTypes.Literal */:
        case 8 /* NodeTypes.LinkedModifier */:
        case 7 /* NodeTypes.LinkedKey */:
            return node.value;
        case 5 /* NodeTypes.List */:
            return node.index.toString();
        case 4 /* NodeTypes.Named */:
            return node.key;
        default:
            return undefined;
    }
}
function advancePositionWithSource(pos, source, numberOfCharacters = source.length) {
    let linesCount = 0;
    let lastNewLinePos = -1;
    for (let i = 0; i < numberOfCharacters; i++) {
        if (source.charCodeAt(i) === 10 /* newline char code */) {
            linesCount++;
            lastNewLinePos = i;
        }
    }
    pos.offset += numberOfCharacters;
    pos.line += linesCount;
    pos.column =
        lastNewLinePos === -1
            ? pos.column + numberOfCharacters
            : numberOfCharacters - lastNewLinePos;
    return pos;
}

function baseCompile(source, options = {}) {
    const assignedOptions = assign({}, options);
    const jit = !!assignedOptions.jit;
    const enalbeMinify = !!assignedOptions.minify;
    const enambeOptimize = assignedOptions.optimize == null ? true : assignedOptions.optimize;
    // parse source codes
    const parser = createParser(assignedOptions);
    const ast = parser.parse(source);
    if (!jit) {
        // transform ASTs
        transform(ast, assignedOptions);
        // generate javascript codes
        return generate(ast, assignedOptions);
    }
    else {
        // optimize ASTs
        enambeOptimize && optimize(ast);
        // minimize ASTs
        enalbeMinify && minify(ast);
        // In JIT mode, no ast transform, no code generation.
        return { ast, code: '' };
    }
}

export { COMPILE_ERROR_CODES_EXTEND_POINT, CompileErrorCodes, ERROR_DOMAIN$2 as ERROR_DOMAIN, LOCATION_STUB, baseCompile, createCompileError, createLocation, createParser, createPosition, defaultOnError, detectHtmlTag, errorMessages };
