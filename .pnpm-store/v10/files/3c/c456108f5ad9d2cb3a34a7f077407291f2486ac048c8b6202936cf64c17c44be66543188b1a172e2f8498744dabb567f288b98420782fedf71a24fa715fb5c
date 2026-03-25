/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { IllegalArgumentException } from '../../errors';

/**
 * Prints or parses a char literal.
 * @private
 */
export class CharLiteralPrinterParser {

    constructor(literal) {
        if (literal.length > 1) {
            throw new IllegalArgumentException(`invalid literal, too long: "${literal}"`);
        }
        this._literal = literal;
    }

    print(context, buf) {
        buf.append(this._literal);
        return true;
    }

    parse(context, text, position) {
        const length = text.length;
        if (position === length) {
            return ~position;
        }
        const ch = text.charAt(position);
        if (context.charEquals(this._literal, ch) === false) {
            return ~position;
        }
        return position + this._literal.length;
    }

    toString() {
        if (this._literal === '\'') {
            return "''";
        }
        return `'${this._literal}'`;
    }
}

