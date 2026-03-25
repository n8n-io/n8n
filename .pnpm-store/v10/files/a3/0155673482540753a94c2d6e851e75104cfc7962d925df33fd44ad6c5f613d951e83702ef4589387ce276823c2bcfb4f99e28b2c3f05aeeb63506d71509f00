/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert } from '../assert';
import { DateTimeException, IllegalArgumentException } from '../errors';
import { MathUtil } from '../MathUtil';

/**
 * The range of valid values for a date-time field.
 *
 * All TemporalField instances have a valid range of values.
 * For example, the ISO day-of-month runs from 1 to somewhere between 28 and 31.
 * This class captures that valid range.
 *
 * It is important to be aware of the limitations of this class.
 * Only the minimum and maximum values are provided.
 * It is possible for there to be invalid values within the outer range.
 * For example, a weird field may have valid values of 1, 2, 4, 6, 7, thus
 * have a range of '1 - 7', despite that fact that values 3 and 5 are invalid.
 *
 * Instances of this class are not tied to a specific field.
 */
export class ValueRange {

    /**
     *
     * @param {!number} minSmallest
     * @param {!number} minLargest
     * @param {!number} maxSmallest
     * @param {!number} maxLargest
     * @private
     */
    constructor(minSmallest, minLargest, maxSmallest, maxLargest) {
        assert(!(minSmallest > minLargest), `Smallest minimum value '${minSmallest 
        }' must be less than largest minimum value '${minLargest}'`, IllegalArgumentException);
        assert(!(maxSmallest > maxLargest), `Smallest maximum value '${maxSmallest 
        }' must be less than largest maximum value '${maxLargest}'`, IllegalArgumentException);
        assert(!(minLargest > maxLargest), `Minimum value '${minLargest 
        }' must be less than maximum value '${maxLargest}'`, IllegalArgumentException);

        this._minSmallest = minSmallest;
        this._minLargest = minLargest;
        this._maxLargest = maxLargest;
        this._maxSmallest = maxSmallest;
    }

    /**
     * Is the value range fixed and fully known.
     *
     * For example, the ISO day-of-month runs from 1 to between 28 and 31.
     * Since there is uncertainty about the maximum value, the range is not fixed.
     * However, for the month of January, the range is always 1 to 31, thus it is fixed.
     *
     * @return {boolean} true if the set of values is fixed
     */
    isFixed() {
        return this._minSmallest === this._minLargest && this._maxSmallest === this._maxLargest;
    }

    /**
     *
     * @returns {number}
     */
    minimum(){
        return this._minSmallest;
    }

    /**
     *
     * @returns {number}
     */
    largestMinimum(){
        return this._minLargest;
    }

    /**
     *
     * @returns {number}
     */
    maximum(){
        return this._maxLargest;
    }

    /**
     *
     * @returns {number}
     */
    smallestMaximum(){
        return this._maxSmallest;
    }

    /**
     *
     * @returns {boolean}
     */
    isValidValue(value) {
        return (this.minimum() <= value && value <= this.maximum());
    }

    /**
     *
     * @param {number} value
     * @param {TemporalField} field
     */
    checkValidValue(value, field) {
        let msg;
        if (!this.isValidValue(value)) {
            if (field != null) {
                msg = `Invalid value for ${field} (valid values ${this.toString()}): ${value}`;
            } else {
                msg = `Invalid value (valid values ${this.toString()}): ${value}`;
            }
            return assert(false, msg, DateTimeException);
        }
        return value;
    }

    /**
     * Checks that the specified value is valid and fits in an `int`.
     *
     * This validates that the value is within the valid range of values and that
     * all valid values are within the bounds of an `int`.
     * The field is only used to improve the error message.
     *
     * @param {number} value - the value to check
     * @param {TemporalField} field - the field being checked, may be null
     * @return {number} the value that was passed in
     * @see #isValidIntValue(long)
     */
    checkValidIntValue(value, field) {
        if (this.isValidIntValue(value) === false) {
            throw new DateTimeException(`Invalid int value for ${field}: ${value}`);
        }
        return value;
    }

    /**
     * Checks if the value is within the valid range and that all values
     * in the range fit in an `int`.
     *
     * This method combines {@link isIntValue} and {@link isValidValue}.
     *
     * @param {number} value - the value to check
     * @return true if the value is valid and fits in an `int`
     */
    isValidIntValue(value) {
        return this.isIntValue() && this.isValidValue(value);
    }

    /**
     * Checks if all values in the range fit in an `int`.
     *
     * This checks that all valid values are within the bounds of an `int`.
     *
     * For example, the ISO month-of-year has values from 1 to 12, which fits in an `int`.
     * By comparison, ISO nano-of-day runs from 1 to 86,400,000,000,000 which does not fit in an `int`.
     *
     * This implementation uses {@link getMinimum} and {@link getMaximum}.
     *
     * @return boolean if a valid value always fits in an `int`
     */
    isIntValue() { // should be isSafeIntegerValue
        return this.minimum() >= MathUtil.MIN_SAFE_INTEGER && this.maximum() <= MathUtil.MAX_SAFE_INTEGER;
    }

    /**
     * Checks if this range is equal to another range.
     *
     * The comparison is based on the four values, minimum, largest minimum,
     * smallest maximum and maximum.
     * Only objects of type {@link ValueRange} are compared, other types return false.
     *
     * @param {*} other - the object to check, null returns false
     * @return {boolean} true if this is equal to the other range
     */
    equals(other) {
        if (other === this) {
            return true;
        }
        if (other instanceof ValueRange) {
            return this._minSmallest === other._minSmallest && this._minLargest === other._minLargest &&
                this._maxSmallest === other._maxSmallest && this._maxLargest === other._maxLargest;
        }
        return false;
    }

    /**
     * A hash code for this range.
     *
     * @return {number} a suitable hash code
     */
    hashCode() {
        return MathUtil.hashCode(this._minSmallest, this._minLargest, this._maxSmallest, this._maxLargest);
    }

    /*
     * Outputs this range as a String.
     *
     * The format will be '{min}/{largestMin} - {smallestMax}/{max}',
     * where the largestMin or smallestMax sections may be omitted, together
     * with associated slash, if they are the same as the min or max.
     *
     * @return {string} a string representation of this range, not null
     */
    toString() {
        let str = this.minimum() + (this.minimum() !== this.largestMinimum() ? `/${this.largestMinimum()}` : '');
        str += ' - ';
        str += this.smallestMaximum() + (this.smallestMaximum() !== this.maximum() ? `/${this.maximum()}` : '');
        return str;
    }

    /*
     * called with 2 params: Obtains a fixed value range.
     *
     * This factory obtains a range where the minimum and maximum values are fixed.
     * For example, the ISO month-of-year always runs from 1 to 12.
     *
     * @param min  the minimum value
     * @param max  the maximum value
     * @return the ValueRange for min, max, not null

     * called with 3 params: Obtains a variable value range.
     *
     * This factory obtains a range where the minimum value is fixed and the maximum value may vary.
     * For example, the ISO day-of-month always starts at 1, but ends between 28 and 31.
     *
     * @param min  the minimum value
     * @param maxSmallest  the smallest maximum value
     * @param maxLargest  the largest maximum value
     * @return the ValueRange for min, smallest max, largest max, not null

     * called with 4 params: Obtains a fully variable value range.
     *
     * This factory obtains a range where both the minimum and maximum value may vary.
     *
     * @param minSmallest  the smallest minimum value
     * @param minLargest  the largest minimum value
     * @param maxSmallest  the smallest maximum value
     * @param maxLargest  the largest maximum value
     *
     * @return {ValueRange} the ValueRange for smallest min, largest min, smallest max, largest max, not null
     */
    static of() {
        if (arguments.length === 2) {
            return new ValueRange(arguments[0], arguments[0], arguments[1], arguments[1]);
        } else if (arguments.length === 3) {
            return new ValueRange(arguments[0], arguments[0], arguments[1], arguments[2]);
        } else if (arguments.length === 4) {
            return new ValueRange(arguments[0], arguments[1], arguments[2], arguments[3]);
        } else {
            return assert(false, `Invalid number of arguments ${arguments.length}`, IllegalArgumentException);
        }
    }
}
