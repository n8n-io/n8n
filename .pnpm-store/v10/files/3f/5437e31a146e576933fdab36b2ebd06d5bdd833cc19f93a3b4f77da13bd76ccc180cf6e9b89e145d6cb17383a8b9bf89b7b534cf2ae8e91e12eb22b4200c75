/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

export class DecimalStyle {
    /**
     *
     * @param zeroChar
     * @param positiveSignChar
     * @param negativeSignChar
     * @param decimalPointChar
     * @private
     */
    constructor(zeroChar, positiveSignChar, negativeSignChar, decimalPointChar) {
        this._zeroDigit = zeroChar;
        this._zeroDigitCharCode = zeroChar.charCodeAt(0);
        this._positiveSign = positiveSignChar;
        this._negativeSign = negativeSignChar;
        this._decimalSeparator = decimalPointChar;
    }

    positiveSign(){
        return this._positiveSign;
    }

    withPositiveSign(positiveSign) {
        if (positiveSign === this._positiveSign) {
            return this;
        }
        return new DecimalStyle(this._zeroDigit, positiveSign, this._negativeSign, this._decimalSeparator);
    }

    negativeSign(){
        return this._negativeSign;
    }

    withNegativeSign(negativeSign) {
        if (negativeSign === this._negativeSign) {
            return this;
        }
        return new DecimalStyle(this._zeroDigit, this._positiveSign, negativeSign, this._decimalSeparator);
    }

    zeroDigit(){
        return this._zeroDigit;
    }

    withZeroDigit(zeroDigit) {
        if (zeroDigit === this._zeroDigit) {
            return this;
        }
        return new DecimalStyle(zeroDigit, this._positiveSign, this._negativeSign, this._decimalSeparator);
    }

    decimalSeparator(){
        return this._decimalSeparator;
    }

    withDecimalSeparator(decimalSeparator) {
        if (decimalSeparator === this._decimalSeparator) {
            return this;
        }
        return new DecimalStyle(this._zeroDigit, this._positiveSign, this._negativeSign, decimalSeparator);
    }

    convertToDigit(char){
        const val = char.charCodeAt(0) - this._zeroDigitCharCode;
        return (val >= 0 && val <= 9) ? val : -1;
    }

    convertNumberToI18N(numericText) {
        if (this._zeroDigit === '0') {
            return numericText;
        }
        const diff = this._zeroDigitCharCode - '0'.charCodeAt(0);
        let convertedText = '';
        for (let i = 0; i < numericText.length; i++) {
            convertedText += String.fromCharCode(numericText.charCodeAt(i) + diff);
        }
        return convertedText;
    }

    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof DecimalStyle) {
            return (this._zeroDigit === other._zeroDigit && this._positiveSign === other._positiveSign &&
                this._negativeSign === other._negativeSign && this._decimalSeparator === other._decimalSeparator);
        }
        return false;
    }

    hashCode() {
        return this._zeroDigit + this._positiveSign + this._negativeSign + this._decimalSeparator;
    }

    toString() {
        return `DecimalStyle[${this._zeroDigit}${this._positiveSign}${this._negativeSign}${this._decimalSeparator}]`;
    }

    static of(){
        throw new Error('not yet supported');
    }
    static availableLocales(){
        throw new Error('not yet supported');
    }

}

DecimalStyle.STANDARD = new DecimalStyle('0', '+', '-', '.');
