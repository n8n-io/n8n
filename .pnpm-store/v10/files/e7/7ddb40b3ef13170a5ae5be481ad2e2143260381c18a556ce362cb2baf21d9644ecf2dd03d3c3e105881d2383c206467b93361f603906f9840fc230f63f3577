/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { DateTimeException } from '../errors';

import { DateTimeFormatter } from './DateTimeFormatter';

/**
 * @private
 */
export class DateTimePrintContext{
    /**
     *
     * @param {TemporalAccessor} temporal
     * @param {DateTimeFormatter|Locale} localeOrFormatter
     * @param {DecimalStyle} symbols
     */
    constructor(temporal, localeOrFormatter, symbols) {
        if(arguments.length === 2 && arguments[1] instanceof DateTimeFormatter){
            this._temporal = DateTimePrintContext.adjust(temporal, localeOrFormatter);
            this._locale = localeOrFormatter.locale();
            this._symbols = localeOrFormatter.decimalStyle();
        } else {
            this._temporal = temporal;
            this._locale = localeOrFormatter;
            this._symbols = symbols;
        }
        this._optional = 0;
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @param {DateTimeFormatter} formatter
     * @returns {TemporalAccessor}
     */
    // eslint-disable-next-line no-unused-vars
    static adjust(temporal, formatter) {
        // TODO implement
        return temporal;
    }


    symbols(){
        return this._symbols;
    }

    /**
     * Starts the printing of an optional segment of the input.
     */
    startOptional() {
        this._optional++;
    }

    /**
     * Ends the printing of an optional segment of the input.
     */
    endOptional() {
        this._optional--;
    }

    /**
     * Gets a value using a query.
     *
     * @param {TemporalQuery} query  the query to use, not null
     * @return {*} the result, null if not found and optional is true
     * @throws DateTimeException if the type is not available and the section is not optional
     */
    getValueQuery(query) {
        const result = this._temporal.query(query);
        if (result == null && this._optional === 0) {
            throw new DateTimeException(`Unable to extract value: ${this._temporal}`);
        }
        return result;
    }

    /**
     * Gets the value of the specified field.
     *
     * This will return the value for the specified field.
     *
     * @param field  the field to find, not null
     * @return the value, null if not found and optional is true
     * @throws DateTimeException if the field is not available and the section is not optional
     */
    getValue(field) {
        try {
            return this._temporal.getLong(field);
        } catch (ex) {
            if ((ex instanceof DateTimeException) && this._optional > 0) {
                return null;
            }
            throw ex;
        }
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the temporal object being output.
     *
     * @return {TemporalAccessor} the temporal object, not null
     */
    temporal() {
        return this._temporal;
    }

    /**
     * Gets the locale.
     * <p>
     * This locale is used to control localization in the print output except
     * where localization is controlled by the symbols.
     *
     * @return the locale, not null
     */
    locale() {
        return this._locale;
    }

    //-------------------------------------------------------------------------
    // for testing
    /**
     * Sets the date-time being output.
     *
     * @param temporal  the date-time object, not null
     */
    setDateTime(temporal) {
        this._temporal = temporal;
    }

    setLocale(locale) {
        this._locale = locale;
    }


}
