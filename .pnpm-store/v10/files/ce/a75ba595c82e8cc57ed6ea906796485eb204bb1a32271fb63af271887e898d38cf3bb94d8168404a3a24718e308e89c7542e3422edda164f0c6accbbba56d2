/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */
import { ArithmeticException } from './errors';

export const MAX_SAFE_INTEGER = 9007199254740991;
export const MIN_SAFE_INTEGER = -9007199254740991;

/**
 * Math helper with static function for integer operations
 */
export class MathUtil {
    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static intDiv(x, y) {
        let r = x/y;
        r = MathUtil.roundDown(r);
        return MathUtil.safeZero(r);
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static intMod(x, y) {
        let r = x - MathUtil.intDiv(x, y) * y;
        r = MathUtil.roundDown(r);
        return MathUtil.safeZero(r);
    }

    /**
     *
     * @param {number} r
     * @returns {number}
     */
    static roundDown(r){
        if (r < 0) {
            return Math.ceil(r);
        } else {
            return Math.floor(r);
        }
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static floorDiv(x, y){
        const r = Math.floor(x / y);
        return MathUtil.safeZero(r);
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static floorMod(x, y){
        const r = x - MathUtil.floorDiv(x, y) * y;
        return MathUtil.safeZero(r);
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static safeAdd(x, y) {
        MathUtil.verifyInt(x);
        MathUtil.verifyInt(y);
        if (x === 0) {
            return MathUtil.safeZero(y);
        }
        if (y === 0) {
            return MathUtil.safeZero(x);
        }
        const r = MathUtil.safeToInt(x + y);
        if (r === x || r === y) {
            throw new ArithmeticException('Invalid addition beyond MAX_SAFE_INTEGER!');
        }
        return r;
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static safeSubtract(x, y) {
        MathUtil.verifyInt(x);
        MathUtil.verifyInt(y);
        if (x === 0 && y === 0) {
            return 0;
        } else if (x === 0) {
            return MathUtil.safeZero(-1 * y);
        } else if (y === 0) {
            return MathUtil.safeZero(x);
        }
        return MathUtil.safeToInt(x - y);
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static safeMultiply(x, y) {
        MathUtil.verifyInt(x);
        MathUtil.verifyInt(y);
        if (x === 1) {
            return MathUtil.safeZero(y);
        }
        if (y === 1) {
            return MathUtil.safeZero(x);
        }
        if (x === 0 || y === 0) {
            return 0;
        }
        const r = MathUtil.safeToInt(x * y);
        if (r / y !== x || (x === MIN_SAFE_INTEGER && y === -1) || (y === MIN_SAFE_INTEGER && x === -1)) {
            throw new ArithmeticException(`Multiplication overflows: ${x} * ${y}`);
        }
        return r;
    }

    /**
     *
     * @param {number} value
     * @returns {number}
     */
    static parseInt(value) {
        const r = parseInt(value);
        return MathUtil.safeToInt(r);
    }

    /**
     *
     * @param {number} value
     * @returns {number}
     */
    static safeToInt(value) {
        MathUtil.verifyInt(value);
        return MathUtil.safeZero(value);
    }

    /**
     *
     * @param {number} value
     */
    static verifyInt(value){
        if (value == null) {
            throw new ArithmeticException(`Invalid value: '${value}', using null or undefined as argument`);
        }
        if (isNaN(value)) {
            throw new ArithmeticException('Invalid int value, using NaN as argument');
        }
        if (Number.isInteger) {
            if (!Number.isInteger(Number(value))) {
                throw new ArithmeticException(`Invalid value: '${value}' is a float`);
            }
        } else if ((value % 1) !== 0) { // IE11 does not support Number.isInteger
            throw new ArithmeticException(`Invalid value: '${value}' is a float`);
        }
        if (value > MAX_SAFE_INTEGER || value < MIN_SAFE_INTEGER) {
            throw new ArithmeticException(`Calculation overflows an int: ${value}`);
        }
    }

    /**
     * convert -0 to 0 and int as string to a number ( '1' -> 1 )
     *
     * @param {number} value
     * @returns {number}
     */
    static safeZero(value){
        return value === 0 ? 0 : +value;
    }

    /**
     * Compares two Numbers.
     *
     * @param {number} a  the first value
     * @param {number} b  the second value
     * @return {number} the result
     */
    static compareNumbers(a, b) {
        if (a < b) {
            return -1;
        }
        if (a > b) {
            return 1;
        }
        return 0;
    }

    // convert to small integer for v8 optimisation
    static smi(int) {
        return ((int >>> 1) & 0x40000000) | (int & 0xBFFFFFFF);
    }

    // calculate 32 bit hash of a number and convert to SMI
    static hash(number) {
        if (number !== number || number === Infinity) {
            return 0;
        }
        let result = number;
        while (number > 0xFFFFFFFF) {
            number /= 0xFFFFFFFF;
            result ^= number;
        }
        return MathUtil.smi(result);
    }

    // default hashCode calculation for a number sequence as mentioned by Joshua Bloch
    static hashCode(...numbers) {
        let result = 17;
        for (const n of numbers) {
            result = (result << 5) - result + MathUtil.hash(n);
        }
        return MathUtil.hash(result);
    }
}

MathUtil.MAX_SAFE_INTEGER = MAX_SAFE_INTEGER;
MathUtil.MIN_SAFE_INTEGER = MIN_SAFE_INTEGER;

