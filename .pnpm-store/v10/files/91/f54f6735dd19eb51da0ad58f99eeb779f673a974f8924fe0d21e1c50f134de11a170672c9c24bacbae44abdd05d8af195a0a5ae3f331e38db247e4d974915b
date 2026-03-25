/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert, requireNonNull } from '../assert';

import { DateTimeBuilder } from './DateTimeBuilder';
import { EnumMap } from './EnumMap';

import { IsoChronology } from '../chrono/IsoChronology';
import { Temporal } from '../temporal/Temporal';
import { TemporalQueries } from '../temporal/TemporalQueries';

/**
 * @private
 */
export class DateTimeParseContext{

    constructor(){
        if(arguments.length === 1){
            if(arguments[0] instanceof DateTimeParseContext){
                this._constructorSelf.apply(this, arguments);
                return;
            } else {
                this._constructorFormatter.apply(this, arguments);
            }
        } else {
            this._constructorParam.apply(this, arguments);
        }

        this._caseSensitive = true;
        this._strict = true;
        this._parsed = [new Parsed(this)];
    }

    _constructorParam(locale, symbols, chronology){
        this._locale = locale;
        this._symbols = symbols;
        this._overrideChronology = chronology;
    }

    _constructorFormatter(formatter){
        this._locale = formatter.locale();
        this._symbols = formatter.decimalStyle();
        this._overrideChronology = formatter.chronology();
    }


    _constructorSelf(other) {
        this._locale = other._locale;
        this._symbols = other._symbols;
        this._overrideChronology = other._overrideChronology;
        this._overrideZone = other._overrideZone;
        this._caseSensitive = other._caseSensitive;
        this._strict = other._strict;
        this._parsed = [new Parsed(this)];
    }

    /**
     * Creates a copy of this context.
     */
    copy() {
        return new DateTimeParseContext(this);
    }

    symbols(){
        return this._symbols;
    }

    isStrict(){
        return this._strict;
    }

    setStrict(strict){
        this._strict = strict;
    }

    locale() {
        return this._locale;
    }

    setLocale(locale) {
        this._locale = locale;
    }
    //-----------------------------------------------------------------------
    /**
     * Starts the parsing of an optional segment of the input.
     */
    startOptional() {
        this._parsed.push(this.currentParsed().copy());
    }

    /**
     * Ends the parsing of an optional segment of the input.
     *
     * @param {boolean} successful  whether the optional segment was successfully parsed
     */
    endOptional(successful) {
        if (successful) {
            this._parsed.splice(this._parsed.length - 2, 1);
        } else {
            this._parsed.splice(this._parsed.length - 1, 1);
        }
    }

    /**
     * Checks if parsing is case sensitive.
     *
     * @return true if parsing is case sensitive, false if case insensitive
     */
    isCaseSensitive() {
        return this._caseSensitive;
    }

    /**
     * Sets whether the parsing is case sensitive or not.
     *
     * @param caseSensitive  changes the parsing to be case sensitive or not from now on
     */
    setCaseSensitive(caseSensitive) {
        this._caseSensitive = caseSensitive;
    }

    /**
     * Helper to compare two {@link CharSequence} instances.
     * This uses {@link isCaseSensitive}.
     *
     * @param cs1  the first character sequence, not null
     * @param offset1  the offset into the first sequence, valid
     * @param cs2  the second character sequence, not null
     * @param offset2  the offset into the second sequence, valid
     * @param length  the length to check, valid
     * @return true if equal
     */
    subSequenceEquals(cs1, offset1, cs2, offset2, length) {
        if (offset1 + length > cs1.length || offset2 + length > cs2.length) {
            return false;
        }
        if (! this.isCaseSensitive()) {
            cs1 = cs1.toLowerCase();
            cs2 = cs2.toLowerCase();
        }
        for (let i = 0; i < length; i++) {
            const ch1 = cs1[offset1 + i];
            const ch2 = cs2[offset2 + i];
            if (ch1 !== ch2) {
                return false;
            }
        }
        return true;
    }

    /**
     * Helper to compare two `char`.
     * This uses {@link isCaseSensitive}.
     *
     * @param ch1  the first character
     * @param ch2  the second character
     * @return true if equal
     */
    charEquals(ch1, ch2) {
        if (this.isCaseSensitive()) {
            return ch1 === ch2;
        }
        return this.charEqualsIgnoreCase(ch1, ch2);
    }

    /**
     * Compares two characters ignoring case.
     *
     * @param c1  the first
     * @param c2  the second
     * @return true if equal
     */
    charEqualsIgnoreCase(c1, c2) {
        return c1 === c2 ||
                c1.toLowerCase() === c2.toLowerCase();
    }

    setParsedField(field, value, errorPos, successPos){
        const currentParsedFieldValues = this.currentParsed().fieldValues;
        const old = currentParsedFieldValues.get(field);
        currentParsedFieldValues.set(field, value);
        return (old != null && old !== value) ? ~errorPos : successPos;
    }

    /**
     * Stores the parsed zone.
     *
     * This stores the zone that has been parsed.
     * No validation is performed other than ensuring it is not null.
     *
     * @param {ZoneId} zone  the parsed zone, not null
     */
    setParsedZone(zone) {
        requireNonNull(zone, 'zone');
        this.currentParsed().zone = zone;
    }

    getParsed(field) {
        return this.currentParsed().fieldValues.get(field);
    }

    toParsed() {
        return this.currentParsed();
    }

    currentParsed() {
        return this._parsed[this._parsed.length - 1];
    }

    /**
     * Stores the leap second.
     */
    setParsedLeapSecond() {
        this.currentParsed().leapSecond = true;
    }

    /**
     * Gets the effective chronology during parsing.
     *
     * @return the effective parsing chronology, not null
     */
    getEffectiveChronology() {
        let chrono = this.currentParsed().chrono;
        if (chrono == null) {
            chrono = this._overrideChronology;
            if (chrono == null) {
                chrono = IsoChronology.INSTANCE;
            }
        }
        return chrono;
    }


}

class Parsed extends Temporal {
    constructor(dateTimeParseContext){
        super();
        this.chrono = null;
        this.zone = null;
        this.fieldValues = new EnumMap();
        this.leapSecond = false;
        this.dateTimeParseContext = dateTimeParseContext;
    }

    copy() {
        const cloned = new Parsed();
        cloned.chrono = this.chrono;
        cloned.zone = this.zone;
        cloned.fieldValues.putAll(this.fieldValues);
        cloned.leapSecond = this.leapSecond;
        cloned.dateTimeParseContext = this.dateTimeParseContext;
        return cloned;
    }

    toString() {
        return `${this.fieldValues}, ${this.chrono}, ${this.zone}`;
    }

    isSupported(field) {
        return this.fieldValues.containsKey(field);
    }

    get(field) {
        const val = this.fieldValues.get(field);
        assert(val != null);
        return val;
    }

    query(query) {
        if (query === TemporalQueries.chronology()) {
            return this.chrono;
        }
        if (query === TemporalQueries.zoneId() || query === TemporalQueries.zone()) {
            return this.zone;
        }
        return super.query(query);
    }

    toBuilder() {
        const builder = new DateTimeBuilder();
        builder.fieldValues.putAll(this.fieldValues);
        builder.chrono = this.dateTimeParseContext.getEffectiveChronology();
        if (this.zone != null) {
            builder.zone = this.zone;
        } else {
            builder.zone = this.overrideZone;
        }
        builder.leapSecond = this.leapSecond;
        builder.excessDays = this.excessDays;
        return builder;
    }
}
