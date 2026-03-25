/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert } from '../../assert';
import { ArithmeticException, DateTimeException, IllegalArgumentException } from '../../errors';
import { MathUtil } from '../../MathUtil';

import { IsoChronology } from '../../chrono/IsoChronology';

import { SignStyle } from '../SignStyle';


const MAX_WIDTH = 15; // can't parse all numbers with more then 15 digits in javascript

const EXCEED_POINTS = [
    0,
    10,
    100,
    1000,
    10000,
    100000,
    1000000,
    10000000,
    100000000,
    1000000000
];

/**
 * @private
 */
export class NumberPrinterParser {

    /**
     * Constructor.
     *
     * @param field  the field to print, not null
     * @param minWidth  the minimum field width, from 1 to 19
     * @param maxWidth  the maximum field width, from minWidth to 19
     * @param signStyle  the positive/negative sign style, not null
     * @param subsequentWidth  the width of subsequent non-negative numbers, 0 or greater,
     *  -1 if fixed width due to active adjacent parsing
     */
    constructor(field, minWidth, maxWidth, signStyle, subsequentWidth=0){
        this._field = field;
        this._minWidth = minWidth;
        this._maxWidth = maxWidth;
        this._signStyle = signStyle;
        this._subsequentWidth = subsequentWidth;
    }

    field(){ return this._field;}
    minWidth(){ return this._minWidth;}
    maxWidth(){ return this._maxWidth;}
    signStyle(){ return this._signStyle;}

    withFixedWidth() {
        if (this._subsequentWidth === -1) {
            return this;
        }
        return new NumberPrinterParser(this._field, this._minWidth, this._maxWidth, this._signStyle, -1);
    }

    withSubsequentWidth(subsequentWidth) {
        return new NumberPrinterParser(this._field, this._minWidth, this._maxWidth, this._signStyle, this._subsequentWidth + subsequentWidth);
    }

    _isFixedWidth() {
        return this._subsequentWidth === -1 ||
            (this._subsequentWidth > 0 && this._minWidth === this._maxWidth && this._signStyle === SignStyle.NOT_NEGATIVE);
    }

    print(context, buf) {
        const contextValue = context.getValue(this._field);
        if (contextValue == null) {
            return false;
        }
        const value = this._getValue(context, contextValue);
        const symbols = context.symbols();
        let str = `${Math.abs(value)}`;
        if (str.length > this._maxWidth) {
            throw new DateTimeException(`Field ${this._field 
            } cannot be printed as the value ${value 
            } exceeds the maximum print width of ${this._maxWidth}`);
        }
        str = symbols.convertNumberToI18N(str);

        if (value >= 0) {
            switch (this._signStyle) {
                case SignStyle.EXCEEDS_PAD:
                    if (this._minWidth < MAX_WIDTH && value >= EXCEED_POINTS[this._minWidth]) {
                        buf.append(symbols.positiveSign());
                    }
                    break;
                case SignStyle.ALWAYS:
                    buf.append(symbols.positiveSign());
                    break;
            }
        } else {
            switch (this._signStyle) {
                case SignStyle.NORMAL:
                case SignStyle.EXCEEDS_PAD:
                case SignStyle.ALWAYS:
                    buf.append(symbols.negativeSign());
                    break;
                case SignStyle.NOT_NEGATIVE:
                    throw new DateTimeException(`Field ${this._field 
                    } cannot be printed as the value ${value 
                    } cannot be negative according to the SignStyle`);
            }
        }
        for (let i = 0; i < this._minWidth - str.length; i++) {
            buf.append(symbols.zeroDigit());
        }
        buf.append(str);
        return true;
    }

    parse(context, text, position){
        const length = text.length;
        if (position === length) {
            return ~position;
        }
        assert(position>=0 && position<length);
        const sign = text.charAt(position);  // IOOBE if invalid position
        let negative = false;
        let positive = false;
        if (sign === context.symbols().positiveSign()) {
            if (this._signStyle.parse(true, context.isStrict(), this._minWidth === this._maxWidth) === false) {
                return ~position;
            }
            positive = true;
            position++;
        } else if (sign === context.symbols().negativeSign()) {
            if (this._signStyle.parse(false, context.isStrict(), this._minWidth === this._maxWidth) === false) {
                return ~position;
            }
            negative = true;
            position++;
        } else {
            if (this._signStyle === SignStyle.ALWAYS && context.isStrict()) {
                return ~position;
            }
        }
        const effMinWidth = (context.isStrict() || this._isFixedWidth() ? this._minWidth : 1);
        const minEndPos = position + effMinWidth;
        if (minEndPos > length) {
            return ~position;
        }
        let effMaxWidth = (context.isStrict() || this._isFixedWidth() ? this._maxWidth : 9) + Math.max(this._subsequentWidth, 0);
        let total = 0;
        let pos = position;
        for (let pass = 0; pass < 2; pass++) {
            const maxEndPos = Math.min(pos + effMaxWidth, length);
            while (pos < maxEndPos) {
                const ch = text.charAt(pos++);
                const digit = context.symbols().convertToDigit(ch);
                if (digit < 0) {
                    pos--;
                    if (pos < minEndPos) {
                        return ~position;  // need at least min width digits
                    }
                    break;
                }
                if ((pos - position) > MAX_WIDTH) {
                    throw new ArithmeticException('number text exceeds length');
                } else {
                    total = total * 10 + digit;
                }
            }
            if (this._subsequentWidth > 0 && pass === 0) {
                // re-parse now we know the correct width
                const parseLen = pos - position;
                effMaxWidth = Math.max(effMinWidth, parseLen - this._subsequentWidth);
                pos = position;
                total = 0;
            } else {
                break;
            }
        }
        if (negative) {
            if (total === 0 && context.isStrict()) {
                return ~(position - 1);  // minus zero not allowed
            }
            if(total !== 0) {
                total = -total;
            }
        } else if (this._signStyle === SignStyle.EXCEEDS_PAD && context.isStrict()) {
            const parseLen = pos - position;
            if (positive) {
                if (parseLen <= this._minWidth) {
                    return ~(position - 1);  // '+' only parsed if minWidth exceeded
                }
            } else {
                if (parseLen > this._minWidth) {
                    return ~position;  // '+' must be parsed if minWidth exceeded
                }
            }
        }
        return this._setValue(context, total, position, pos);
    }

    /**
     * Gets the value to output.
     * (This is needed to allow e.g. ReducedPrinterParser to override this and change the value!
     *
     * @param context  the context
     * @param value  the value of the field, not null
     * @return the value
     * @private
     */
    _getValue(context, value) {
        return value;
    }

    /**
     * Stores the value.
     *
     * @param context  the context to store into, not null
     * @param value  the value
     * @param errorPos  the position of the field being parsed
     * @param successPos  the position after the field being parsed
     * @return the new position
     */
    _setValue(context, value, errorPos, successPos) {
        return context.setParsedField(this._field, value, errorPos, successPos);
    }

    toString() {
        if (this._minWidth === 1 && this._maxWidth === MAX_WIDTH && this._signStyle === SignStyle.NORMAL) {
            return `Value(${this._field})`;
        }
        if (this._minWidth === this._maxWidth && this._signStyle === SignStyle.NOT_NEGATIVE) {
            return `Value(${this._field},${this._minWidth})`;
        }
        return `Value(${this._field},${this._minWidth},${this._maxWidth},${this._signStyle})`;
    }

}
//-----------------------------------------------------------------------
/**
 * Prints and parses a reduced numeric date-time field.
 * @private
 */
export class ReducedPrinterParser extends NumberPrinterParser {

    /**
     * Constructor.
     *
     * @param {TemporalField} field  the field to print, validated not null
     * @param {number} width  the field width, from 1 to 10
     * @param {number} maxWidth  the field max width, from 1 to 10
     * @param {number} baseValue  the base value
     * @param {ChronoLocalDate} baseDate  the base date
     */
    constructor(field, width, maxWidth, baseValue, baseDate) {
        super(field, width, maxWidth, SignStyle.NOT_NEGATIVE);
        if (width < 1 || width > 10) {
            throw new IllegalArgumentException(`The width must be from 1 to 10 inclusive but was ${width}`);
        }
        if (maxWidth < 1 || maxWidth > 10) {
            throw new IllegalArgumentException(`The maxWidth must be from 1 to 10 inclusive but was ${maxWidth}`);
        }
        if (maxWidth < width) {
            throw new IllegalArgumentException('The maxWidth must be greater than the width');
        }
        if (baseDate === null) {
            if (field.range().isValidValue(baseValue) === false) {
                throw new IllegalArgumentException('The base value must be within the range of the field');
            }
            if ((baseValue + EXCEED_POINTS[width]) > MathUtil.MAX_SAFE_INTEGER) {
                throw new DateTimeException('Unable to add printer-parser as the range exceeds the capacity of an int');
            }
        }
        this._baseValue = baseValue;
        this._baseDate = baseDate;
    }

    /**
     *
     * @param {DateTimePrintContext} context
     * @param {number} value
     */
    _getValue(context, value) {
        const absValue = Math.abs(value);
        let baseValue = this._baseValue;
        if (this._baseDate !== null) {
            // TODO: in threetenbp the following line is used, but we dont have Chronology yet,
            // let chrono = Chronology.from(context.getTemporal());
            // so let's use IsoChronology for now
            context.temporal();
            const chrono = IsoChronology.INSTANCE;
            baseValue = chrono.date(this._baseDate).get(this._field);
        }
        if (value >= baseValue && value < baseValue + EXCEED_POINTS[this._minWidth]) {
            return absValue % EXCEED_POINTS[this._minWidth];
        }
        return absValue % EXCEED_POINTS[this._maxWidth];
    }

    /**
     *
     * @param {DateTimeParseContext} context
     * @param {number} value
     * @param {number} errorPos
     * @param {number} successPos
     */
    _setValue(context, value, errorPos, successPos) {
        let baseValue = this._baseValue;
        if (this._baseDate != null) {
            const chrono = context.getEffectiveChronology();
            baseValue = chrono.date(this._baseDate).get(this._field);
            // TODO: not implemented??
            // context.addChronologyChangedParser(this, value, errorPos, successPos);
        }
        const parseLen = successPos - errorPos;
        if (parseLen === this._minWidth && value >= 0) {
            const range = EXCEED_POINTS[this._minWidth];
            const lastPart = baseValue % range;
            const basePart = baseValue - lastPart;
            if (baseValue > 0) {
                value = basePart + value;
            } else {
                value = basePart - value;
            }
            if (value < baseValue) {
                value += range;
            }
        }
        return context.setParsedField(this._field, value, errorPos, successPos);
    }

    withFixedWidth() {
        if (this._subsequentWidth === -1) {
            return this;
        }
        return new ReducedPrinterParser(this._field, this._minWidth, this._maxWidth, this._baseValue, this._baseDate, -1);
    }

    /**
     *
     * @param {number} subsequentWidth
     * @returns {ReducedPrinterParser}
     */
    withSubsequentWidth(subsequentWidth) {
        return new ReducedPrinterParser(this._field, this._minWidth, this._maxWidth, this._baseValue, this._baseDate,
            this._subsequentWidth + subsequentWidth);
    }

    /**
     *
     * @param {DateTimeParseContext} context
     */
    isFixedWidth(context) {
        if (context.isStrict() === false) {
            return false;
        }
        return super.isFixedWidth(context);
    }

    toString() {
        return `ReducedValue(${this._field},${this._minWidth},${this._maxWidth},${this._baseDate != null ? this._baseDate : this._baseValue})`;
    }
}

