/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from '../../assert';
import { IllegalArgumentException } from '../../errors';
import { MathUtil } from '../../MathUtil';

/**
 * TODO optimize FractionPrinterParser, fix documentation
 *
 * Prints and parses a numeric date-time field with optional padding.
 * @private
 */
export class FractionPrinterParser {

    /**
     * Constructor.
     *
     * @param {TemporalField} field  the field to output, not null
     * @param {Number} minWidth  the minimum width to output, from 0 to 9
     * @param {Number} maxWidth  the maximum width to output, from 0 to 9
     * @param {boolean} decimalPoint  whether to output the localized decimal point symbol
     */
    constructor(field, minWidth, maxWidth, decimalPoint) {
        requireNonNull(field, 'field');
        if (field.range().isFixed() === false) {
            throw new IllegalArgumentException(`Field must have a fixed set of values: ${field}`);
        }
        if (minWidth < 0 || minWidth > 9) {
            throw new IllegalArgumentException(`Minimum width must be from 0 to 9 inclusive but was ${minWidth}`);
        }
        if (maxWidth < 1 || maxWidth > 9) {
            throw new IllegalArgumentException(`Maximum width must be from 1 to 9 inclusive but was ${maxWidth}`);
        }
        if (maxWidth < minWidth) {
            throw new IllegalArgumentException(`Maximum width must exceed or equal the minimum width but ${ 
                maxWidth} < ${minWidth}`);
        }
        this.field = field;
        this.minWidth = minWidth;
        this.maxWidth = maxWidth;
        this.decimalPoint = decimalPoint;
    }

    print(context, buf) {
        const value = context.getValue(this.field);
        if (value === null) {
            return false;
        }
        const symbols = context.symbols();
        if (value === 0) {  // scale is zero if value is zero
            if (this.minWidth > 0) {
                if (this.decimalPoint) {
                    buf.append(symbols.decimalSeparator());
                }
                for (let i = 0; i < this.minWidth; i++) {
                    buf.append(symbols.zeroDigit());
                }
            }
        } else {
            let fraction = this.convertToFraction(value, symbols.zeroDigit());
            const outputScale = Math.min(Math.max(fraction.length, this.minWidth), this.maxWidth);
            fraction = fraction.substr(0, outputScale);
            if(fraction * 1 > 0 ) {
                while (fraction.length > this.minWidth && fraction[fraction.length - 1] === '0') {
                    fraction = fraction.substr(0, fraction.length - 1);
                }
            }
            let str = fraction;
            str = symbols.convertNumberToI18N(str);
            if (this.decimalPoint) {
                buf.append(symbols.decimalSeparator());
            }
            buf.append(str);
        }
        return true;
    }

    parse(context, text, position) {
        const effectiveMin = (context.isStrict() ? this.minWidth : 0);
        const effectiveMax = (context.isStrict() ? this.maxWidth : 9);
        const length = text.length;
        if (position === length) {
            // valid if whole field is optional, invalid if minimum width
            return (effectiveMin > 0 ? ~position : position);
        }
        if (this.decimalPoint) {
            if (text[position] !== context.symbols().decimalSeparator()) {
                // valid if whole field is optional, invalid if minimum width
                return (effectiveMin > 0 ? ~position : position);
            }
            position++;
        }
        const minEndPos = position + effectiveMin;
        if (minEndPos > length) {
            return ~position;  // need at least min width digits
        }
        const maxEndPos = Math.min(position + effectiveMax, length);
        let total = 0;  // can use int because we are only parsing up to 9 digits
        let pos = position;
        while (pos < maxEndPos) {
            const ch = text.charAt(pos++);
            const digit = context.symbols().convertToDigit(ch);
            if (digit < 0) {
                if (pos < minEndPos) {
                    return ~position;  // need at least min width digits
                }
                pos--;
                break;
            }
            total = total * 10 + digit;
        }
        const moveLeft = pos - position;
        const scale = Math.pow(10, moveLeft);
        const value = this.convertFromFraction(total, scale);
        return context.setParsedField(this.field, value, position, pos);
    }

    /**
     *
     * @param {Number} value  the value to convert, must be valid for this rule
     * @param {String} zeroDigit  the character for zero
     * @return {String} the value as a fraction within the range, from 0 to 1, not null
     */
    convertToFraction(value, zeroDigit) {
        const range = this.field.range();
        range.checkValidValue(value, this.field);
        const _min = range.minimum();
        const _range = range.maximum() - _min + 1;
        const _value = value - _min;
        const _scaled = MathUtil.intDiv((_value * 1000000000),  _range);
        let fraction = `${_scaled}`;
        while(fraction.length < 9){
            fraction = zeroDigit + fraction;
        }
        return fraction;
    }

    /**
     *
     * @param {Number} total  the fraction to convert, not null
     * @param {Number} scale  the scale, not null
     * @return {Number} the value of the field, valid for this rule
     * @throws DateTimeException if the value cannot be converted
     */
    convertFromFraction(total, scale) {
        const range = this.field.range();
        const _min = range.minimum();
        const _range = range.maximum() - _min + 1;
        const _value = MathUtil.intDiv((total * _range), scale);
        return _value;
    }

    toString() {
        const decimal = (this.decimalPoint ? ',DecimalPoint' : '');
        return `Fraction(${this.field},${this.minWidth},${this.maxWidth}${decimal})`;
    }
}

