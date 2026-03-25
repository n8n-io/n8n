/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert } from '../../assert';

/**
 * Prints or parses a string literal.
 * @private
 */
export class StringLiteralPrinterParser {

    constructor(literal) {
        this._literal = literal;
    }

    print(context, buf) {
        buf.append(this._literal);
        return true;
    }

    parse(context, text, position) {
        const length = text.length;
        assert(!(position > length || position < 0));

        if (context.subSequenceEquals(text, position, this._literal, 0, this._literal.length) === false) {
            return ~position;
        }
        return position + this._literal.length;
    }

    toString() {
        const converted = this._literal.replace("'", "''");
        return `'${converted}'`;
    }
}

