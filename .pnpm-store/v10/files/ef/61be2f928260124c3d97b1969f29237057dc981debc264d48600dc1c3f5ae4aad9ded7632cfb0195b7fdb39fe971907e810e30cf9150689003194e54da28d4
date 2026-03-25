import {bodyRegExps, namedReferences} from './named-references';
import {numericUnicodeMap} from './numeric-unicode-map';
import {fromCodePoint, getCodePoint} from './surrogate-pairs';

const allNamedReferences = {
    ...namedReferences,
    all: namedReferences.html5
};

function replaceUsingRegExp(macroText: string, macroRegExp: RegExp, macroReplacer: (input: string) => string): string {
    macroRegExp.lastIndex = 0;
    let replaceMatch = macroRegExp.exec(macroText);
    let replaceResult;
    if (replaceMatch) {
        replaceResult = '';
        let replaceLastIndex = 0;
        do {
            if (replaceLastIndex !== replaceMatch.index) {
                replaceResult += macroText.substring(replaceLastIndex, replaceMatch.index);
            }
            const replaceInput = replaceMatch[0];
            replaceResult += macroReplacer(replaceInput);
            replaceLastIndex = replaceMatch.index + replaceInput.length;
        } while ((replaceMatch = macroRegExp.exec(macroText)));

        if (replaceLastIndex !== macroText.length) {
            replaceResult += macroText.substring(replaceLastIndex);
        }
    } else {
        replaceResult = macroText;
    }
    return replaceResult;
}

export type Level = 'xml' | 'html4' | 'html5' | 'all';

interface CommonOptions {
    level?: Level;
}

export type EncodeMode = 'specialChars' | 'nonAscii' | 'nonAsciiPrintable' | 'nonAsciiPrintableOnly' | 'extensive';

export interface EncodeOptions extends CommonOptions {
    mode?: EncodeMode;
    numeric?: 'decimal' | 'hexadecimal';
}

export type DecodeScope = 'strict' | 'body' | 'attribute';

export interface DecodeOptions extends CommonOptions {
    scope?: DecodeScope;
}

const encodeRegExps: Record<EncodeMode, RegExp> = {
    specialChars: /[<>'"&]/g,
    nonAscii: /[<>'"&\u0080-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g,
    nonAsciiPrintable: /[<>'"&\x01-\x08\x11-\x15\x17-\x1F\x7f-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g,
    nonAsciiPrintableOnly: /[\x01-\x08\x11-\x15\x17-\x1F\x7f-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g,
    extensive: /[\x01-\x0c\x0e-\x1f\x21-\x2c\x2e-\x2f\x3a-\x40\x5b-\x60\x7b-\x7d\x7f-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g
};

const defaultEncodeOptions: EncodeOptions = {
    mode: 'specialChars',
    level: 'all',
    numeric: 'decimal'
};

/** Encodes all the necessary (specified by `level`) characters in the text */
export function encode(
    text: string | undefined | null,
    {mode = 'specialChars', numeric = 'decimal', level = 'all'}: EncodeOptions = defaultEncodeOptions
) {
    if (!text) {
        return '';
    }

    const encodeRegExp = encodeRegExps[mode];
    const references = allNamedReferences[level].characters;
    const isHex = numeric === 'hexadecimal';

    return replaceUsingRegExp(text, encodeRegExp, (input) => {
        let result = references[input];
        if (!result) {
            const code = input.length > 1 ? getCodePoint(input, 0)! : input.charCodeAt(0);
            result = (isHex ? '&#x' + code.toString(16) : '&#' + code) + ';';
        }
        return result;
    });
}

const defaultDecodeOptions: DecodeOptions = {
    scope: 'body',
    level: 'all'
};

const strict = /&(?:#\d+|#[xX][\da-fA-F]+|[0-9a-zA-Z]+);/g;
const attribute = /&(?:#\d+|#[xX][\da-fA-F]+|[0-9a-zA-Z]+)[;=]?/g;

const baseDecodeRegExps: Record<Exclude<Level, 'all'>, Record<DecodeScope, RegExp>> = {
    xml: {
        strict,
        attribute,
        body: bodyRegExps.xml
    },
    html4: {
        strict,
        attribute,
        body: bodyRegExps.html4
    },
    html5: {
        strict,
        attribute,
        body: bodyRegExps.html5
    }
};

const decodeRegExps: Record<Level, Record<DecodeScope, RegExp>> = {
    ...baseDecodeRegExps,
    all: baseDecodeRegExps.html5
};

const fromCharCode = String.fromCharCode;
const outOfBoundsChar = fromCharCode(65533);

const defaultDecodeEntityOptions: CommonOptions = {
    level: 'all'
};

function getDecodedEntity(
    entity: string,
    references: Record<string, string>,
    isAttribute: boolean,
    isStrict: boolean
): string {
    let decodeResult = entity;
    const decodeEntityLastChar = entity[entity.length - 1];
    if (isAttribute && decodeEntityLastChar === '=') {
        decodeResult = entity;
    } else if (isStrict && decodeEntityLastChar !== ';') {
        decodeResult = entity;
    } else {
        const decodeResultByReference = references[entity];
        if (decodeResultByReference) {
            decodeResult = decodeResultByReference;
        } else if (entity[0] === '&' && entity[1] === '#') {
            const decodeSecondChar = entity[2];
            const decodeCode =
                decodeSecondChar == 'x' || decodeSecondChar == 'X'
                    ? parseInt(entity.substr(3), 16)
                    : parseInt(entity.substr(2));

            decodeResult =
                decodeCode >= 0x10ffff
                    ? outOfBoundsChar
                    : decodeCode > 65535
                    ? fromCodePoint(decodeCode)
                    : fromCharCode(numericUnicodeMap[decodeCode] || decodeCode);
        }
    }
    return decodeResult;
}

/** Decodes a single entity */
export function decodeEntity(
    entity: string | undefined | null,
    {level = 'all'}: CommonOptions = defaultDecodeEntityOptions
): string {
    if (!entity) {
        return '';
    }
    return getDecodedEntity(entity, allNamedReferences[level].entities, false, false);
}

/** Decodes all entities in the text */
export function decode(
    text: string | undefined | null,
    {level = 'all', scope = level === 'xml' ? 'strict' : 'body'}: DecodeOptions = defaultDecodeOptions
) {
    if (!text) {
        return '';
    }

    const decodeRegExp = decodeRegExps[level][scope];
    const references = allNamedReferences[level].entities;
    const isAttribute = scope === 'attribute';
    const isStrict = scope === 'strict';

    return replaceUsingRegExp(text, decodeRegExp, (entity) =>
        getDecodedEntity(entity, references, isAttribute, isStrict)
    );
}
