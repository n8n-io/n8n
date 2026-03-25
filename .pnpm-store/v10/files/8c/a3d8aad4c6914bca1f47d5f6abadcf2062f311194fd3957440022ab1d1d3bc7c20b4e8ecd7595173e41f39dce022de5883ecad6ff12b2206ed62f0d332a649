/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert } from '../../assert';

import { DateTimeException } from '../../errors';

/**
 * Pads the output to a fixed width.
 * @private
 */
export class PadPrinterParserDecorator {

    /**
     * Constructor.
     *
     * @param printerParser  the printer, not null
     * @param padWidth  the width to pad to, 1 or greater
     * @param padChar  the pad character
     */
    constructor(printerParser, padWidth, padChar) {
        // input checked by DateTimeFormatterBuilder
        this._printerParser = printerParser;
        this._padWidth = padWidth;
        this._padChar = padChar;
    }

    print(context, buf) {
        const preLen = buf.length();
        if (this._printerParser.print(context, buf) === false) {
            return false;
        }
        const len = buf.length() - preLen;
        if (len > this._padWidth) {
            throw new DateTimeException(
                `Cannot print as output of ${len} characters exceeds pad width of ${this._padWidth}`);
        }
        for (let i = 0; i < this._padWidth - len; i++) {
            buf.insert(preLen, this._padChar);
        }
        return true;
    }

    parse(context, text, position) {
        // cache context before changed by decorated parser
        const strict = context.isStrict();
        const caseSensitive = context.isCaseSensitive();
        // parse
        assert(!(position > text.length));
        assert(position >= 0);
        if (position === text.length) {
            return ~position;  // no more characters in the string
        }
        let endPos = position + this._padWidth;
        if (endPos > text.length) {
            if (strict) {
                return ~position;  // not enough characters in the string to meet the parse width
            }
            endPos = text.length;
        }
        let pos = position;
        while (pos < endPos &&
        (caseSensitive ? text[pos] === this._padChar : context.charEquals(text[pos], this._padChar))) {
            pos++;
        }
        text = text.substring(0, endPos);
        const resultPos = this._printerParser.parse(context, text, pos);
        if (resultPos !== endPos && strict) {
            return ~(position + pos);  // parse of decorated field didn't parse to the end
        }
        return resultPos;
    }

    toString() {
        return `Pad(${this._printerParser},${this._padWidth}${(this._padChar === ' ' ? ')' : `,'${this._padChar}')`)}`;
    }
}

