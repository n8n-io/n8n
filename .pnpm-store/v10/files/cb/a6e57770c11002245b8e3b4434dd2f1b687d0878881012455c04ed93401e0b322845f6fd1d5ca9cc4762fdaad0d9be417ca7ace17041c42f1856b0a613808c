/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from '../../assert';
import { IllegalArgumentException } from '../../errors';
import { MathUtil } from '../../MathUtil';

import { ChronoField } from '../../temporal/ChronoField';

//-----------------------------------------------------------------------
const PATTERNS = [
    '+HH', '+HHmm', '+HH:mm', '+HHMM', '+HH:MM', '+HHMMss', '+HH:MM:ss', '+HHMMSS', '+HH:MM:SS'
];
/**
 * Prints or parses an offset ID.
 * @private
 */
export class OffsetIdPrinterParser  {

    /**
     * Constructor.
     *
     * @param {string} noOffsetText  the text to use for UTC, not null
     * @param {string} pattern  the pattern
     */
    constructor(noOffsetText, pattern) {
        requireNonNull(noOffsetText, 'noOffsetText');
        requireNonNull(pattern, 'pattern');
        this.noOffsetText = noOffsetText;
        this.type = this._checkPattern(pattern);
    }

    /**
     * @param {String} pattern
     * @return {number}
     */
    _checkPattern(pattern) {
        for (let i = 0; i < PATTERNS.length; i++) {
            if (PATTERNS[i] === pattern) {
                return i;
            }
        }
        throw new IllegalArgumentException(`Invalid zone offset pattern: ${pattern}`);
    }

    /**
     * @param {DateTimePrintContext} context
     * @param {StringBuilder} buf
     * @return {boolean}
     */
    print(context, buf) {
        const offsetSecs = context.getValue(ChronoField.OFFSET_SECONDS);
        if (offsetSecs == null) {
            return false;
        }
        const totalSecs = MathUtil.safeToInt(offsetSecs);
        if (totalSecs === 0) {
            buf.append(this.noOffsetText);
        } else {
            const absHours = Math.abs(MathUtil.intMod(MathUtil.intDiv(totalSecs, 3600), 100));  // anything larger than 99 silently dropped
            const absMinutes = Math.abs(MathUtil.intMod(MathUtil.intDiv(totalSecs, 60), 60));
            const absSeconds = Math.abs(MathUtil.intMod(totalSecs, 60));
            const bufPos = buf.length();
            let output = absHours;
            buf.append(totalSecs < 0 ? '-' : '+')
                .appendChar((`${MathUtil.intDiv(absHours, 10)}0`)).appendChar(`${MathUtil.intMod(absHours, 10)}0`);
            if (this.type >= 3 || (this.type >= 1 && absMinutes > 0)) {
                buf.append((this.type % 2) === 0 ? ':' : '')
                    .appendChar((`${MathUtil.intDiv(absMinutes, 10)}0`)).appendChar((`${absMinutes % 10}0`));
                output += absMinutes;
                if (this.type >= 7 || (this.type >= 5 && absSeconds > 0)) {
                    buf.append((this.type % 2) === 0 ? ':' : '')
                        .appendChar((`${MathUtil.intDiv(absSeconds, 10)}0`)).appendChar((`${absSeconds % 10}0`));
                    output += absSeconds;
                }
            }
            if (output === 0) {
                buf.setLength(bufPos);
                buf.append(this.noOffsetText);
            }
        }
        return true;
    }

    /**
     * @param {DateTimeParseContext} context
     * @param {String} text
     * @param {number} position
     * @return {number}
     */
    parse(context, text, position) {
        const length = text.length;
        const noOffsetLen = this.noOffsetText.length;
        if (noOffsetLen === 0) {
            if (position === length) {
                return context.setParsedField(ChronoField.OFFSET_SECONDS, 0, position, position);
            }
        } else {
            if (position === length) {
                return ~position;
            }
            if (context.subSequenceEquals(text, position, this.noOffsetText, 0, noOffsetLen)) {
                return context.setParsedField(ChronoField.OFFSET_SECONDS, 0, position, position + noOffsetLen);
            }
        }

        // parse normal plus/minus offset
        const sign = text[position];  // IOOBE if invalid position
        if (sign === '+' || sign === '-') {
            // starts
            const negative = (sign === '-' ? -1 : 1);
            const array = [0,0,0,0];
            array[0] = position + 1;
            if ((this._parseNumber(array, 1, text, true) ||
                this._parseNumber(array, 2, text, this.type >=3) ||
                this._parseNumber(array, 3, text, false)) === false) {
                // success
                const offsetSecs = MathUtil.safeZero(negative * (array[1] * 3600 + array[2] * 60 + array[3]));
                return context.setParsedField(ChronoField.OFFSET_SECONDS, offsetSecs, position, array[0]);
            }
        }
        // handle special case of empty no offset text
        if (noOffsetLen === 0) {
            return context.setParsedField(ChronoField.OFFSET_SECONDS, 0, position, position + noOffsetLen);
        }
        return ~position;
    }

    /**
     * Parse a two digit zero-prefixed number.
     *
     * @param {number[]} array  the array of parsed data, 0=pos,1=hours,2=mins,3=secs, not null
     * @param {number} arrayIndex  the index to parse the value into
     * @param {string} parseText  the offset ID, not null
     * @param {boolean} required  whether this number is required
     * @return {boolean} true if an error occurred
     */
    _parseNumber(array, arrayIndex, parseText, required) {
        if ((this.type + 3) / 2 < arrayIndex) {
            return false;  // ignore seconds/minutes
        }
        let pos = array[0];
        if ((this.type % 2) === 0 && arrayIndex > 1) {
            if (pos + 1 > parseText.length || parseText[pos] !== ':') {
                return required;
            }
            pos++;
        }
        if (pos + 2 > parseText.length) {
            return required;
        }
        const ch1 = parseText[pos++];
        const ch2 = parseText[pos++];
        if (ch1 < '0' || ch1 > '9' || ch2 < '0' || ch2 > '9') {
            return required;
        }
        const value = (ch1.charCodeAt(0) - 48) * 10 + (ch2.charCodeAt(0) - 48);
        if (value < 0 || value > 59) {
            return required;
        }
        array[arrayIndex] = value;
        array[0] = pos;
        return false;
    }


    toString() {
        const converted = this.noOffsetText.replace('\'', '\'\'');
        return `Offset(${PATTERNS[this.type]},'${converted}')`;
    }
}
OffsetIdPrinterParser.INSTANCE_ID = new OffsetIdPrinterParser('Z', '+HH:MM:ss');
OffsetIdPrinterParser.PATTERNS = PATTERNS;

