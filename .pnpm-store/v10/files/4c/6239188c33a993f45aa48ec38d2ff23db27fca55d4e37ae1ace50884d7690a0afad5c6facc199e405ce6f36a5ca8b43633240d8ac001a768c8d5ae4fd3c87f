/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert, requireNonNull, requireInstance } from './assert';
import { MathUtil } from './MathUtil';

import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { DateTimeException, IllegalArgumentException, UnsupportedTemporalTypeException } from './errors';
import { IsoChronology } from './chrono/IsoChronology';
import { TemporalAccessor } from './temporal/TemporalAccessor';
import { TemporalQueries } from './temporal/TemporalQueries';

/**
 * A month-of-year, such as 'July'.
 *
 * {@link Month} is representing the 12 months of the year -
 * January, February, March, April, May, June, July, August, September, October,
 * November and December.
 *
 * In addition to the textual name, each month-of-year has an `int` value.
 * The `int` value follows normal usage and the ISO-8601 standard,
 * from 1 (January) to 12 (December). It is recommended that applications use the static values defined by this class
 * rather than the `int` value to ensure code clarity.
 *
 * This class represents a common concept that is found in many calendar systems.
 * As such, this class may be used by any calendar system that has the month-of-year
 * concept defined exactly equivalent to the ISO-8601 calendar system.
 *
 * ### Static properties of Class {@link Month}
 *
 * Month.JANUARY, Month.FEBRUARY, Month.MARCH, Month.APRIL, Month.MAY, Month.JUNE,
 * Month.JULY, Month.AUGUST, Month.SEPTEMBER, Month.OCTOBER, Month.NOVEMBER, Month.DECEMBER
 *
 */
export class Month extends TemporalAccessor {

    /**
     *
     * @param {number} ordinal
     * @param {string} name
     * @private
     */
    constructor(value, name){
        super();
        this._value = MathUtil.safeToInt(value);
        this._name = name;
    }    

    /**
     *
     * @return {number} gets the value
     */
    value() {
        return this._value;
    }
    
    /**
     *
     * @returns {number}
     */
    ordinal(){
        return this._value - 1;
    }

    /**
     *
     * @returns {string}
     */
    name(){
        return this._name;
    }  

    /**
     * Gets the textual representation, such as 'Jan' or 'December'.
     *
     * This returns the textual name used to identify the month-of-year.
     * The parameters control the length of the returned text and the locale.
     *
     * If no textual mapping is found then the numeric value (see {@link getValue}) is returned.
     *
     * @param {TextStyle} style - the length of the text required, not null
     * @param {Locale} locale - the locale to use, not null
     * @return {string} the text value of the day-of-week, not null
     */
    // eslint-disable-next-line no-unused-vars
    displayName(style, locale) {
        // TODO:
        throw new IllegalArgumentException('Pattern using (localized) text not implemented yet!');
    }

    /**
     * Checks if the specified field is supported.
     *
     * This checks if this month-of-year can be queried for the specified field.
     * If false, then calling the range (see {@link range}) and
     * get (see {@link get}) methods will throw an exception.
     *
     * If the field is MONTH_OF_YEAR (see {@link ChronoField#MONTH_OF_YEAR}) then
     * this method returns true.
     * All other {@link ChronoField} instances will return false.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.isSupportedBy}
     * passing `this` as the argument.
     * Whether the field is supported is determined by the field.
     *
     * @param {TemporalField} field - the field to check, null returns false
     * @return {boolean} true if the field is supported on this month-of-year, false if not
     */
    isSupported(field) {
        if (null === field) {
            return false;
        }
        if (field instanceof ChronoField) {
            return field === ChronoField.MONTH_OF_YEAR;
        }
        return field != null && field.isSupportedBy(this);
    }

    /**
     * Gets the value of the specified field from this month-of-year as an `int`.
     *
     * This queries this month for the value of the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is MONTH_OF_YEAR (see {@link ChronoField#MONTH_OF_YEAR}) then the
     * value of the month-of-year, from 1 to 12, will be returned.
     * All other {@link ChronoField} instances will throw an {@link UnsupportedTemporalTypeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {TemporalField} field - the field to get, not null
     * @return {Number} the value for the field, within the valid range of values
     * @throws DateTimeException if a value for the field cannot be obtained or
     *         the value is outside the range of valid values for the field
     * @throws UnsupportedTemporalTypeException if the field is not supported or
     *         the range of values exceeds an `int`
     * @throws ArithmeticException if numeric overflow occurs
     */
    get(field) {
        if (field === ChronoField.MONTH_OF_YEAR) {
            return this.value();
        }
        return this.range(field).checkValidIntValue(this.getLong(field), field);
    }

    /**
     * Gets the value of the specified field from this month-of-year as a `long`.
     *
     * This queries this month for the value of the specified field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is MONTH_OF_YEAR (see {@link ChronoField#MONTH_OF_YEAR}) then the
     * value of the month-of-year, from 1 to 12, will be returned.
     * All other {@link ChronoField} instances will throw an {@link UnsupportedTemporalTypeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {TemporalField} field - the field to get, not null
     * @return {Number} the value for the field
     * @throws DateTimeException if a value for the field cannot be obtained
     * @throws UnsupportedTemporalTypeException if the field is not supported
     * @throws ArithmeticException if numeric overflow occurs
     */
    getLong(field) {
        if (field === ChronoField.MONTH_OF_YEAR) {
            return this.value();
        } else if (field instanceof ChronoField) {
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.getFrom(this);
    }

    /**
     * Returns the month-of-year that is the specified number of months after this one.
     *
     * The calculation rolls around the end of the year from December to January.
     * The specified period may be negative.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} months - the months to add, positive or negative
     * @return {Month} the resulting month, not null
     */
    plus(months) {
        const amount = MathUtil.intMod(months, 12) + 12; // + 12 to make sure negative arguments are positive, the total is "corrected" by the next % 12
        let newMonthVal = MathUtil.intMod((this.value() + amount), 12);
        /* December is 12, not 0, but 12 % 12 = 0 */
        newMonthVal = newMonthVal === 0 ? 12 : newMonthVal;
        return Month.of(newMonthVal);
    }

    /**
     * Returns the month-of-year that is the specified number of months before this one.
     *
     * The calculation rolls around the start of the year from January to December.
     * The specified period may be negative.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} months - the months to subtract, positive or negative
     * @return {Month} the resulting month, not null
     */
    minus(months) {
        return this.plus(-1 * MathUtil.intMod(months, 12));
    }

    /**
     * Gets the length of this month in days.
     *
     * This takes a flag to determine whether to return the length for a leap year or not.
     *
     * February has 28 days in a standard year and 29 days in a leap year.
     * April, June, September and November have 30 days.
     * All other months have 31 days.
     *
     * @param {boolean} leapYear - true if the length is required for a leap year
     * @return {number} the length of this month in days, from 28 to 31
     */
    length(leapYear) {
        switch (this) {
            case Month.FEBRUARY:
                return (leapYear ? 29 : 28);
            case Month.APRIL:
            case Month.JUNE:
            case Month.SEPTEMBER:
            case Month.NOVEMBER:
                return 30;
            default:
                return 31;
        }
    }

    /**
     * Gets the minimum length of this month in days.
     *
     * February has a minimum length of 28 days.
     * April, June, September and November have 30 days.
     * All other months have 31 days.
     *
     * @return {number} the minimum length of this month in days, from 28 to 31
     */
    minLength() {
        switch (this) {
            case Month.FEBRUARY:
                return 28;
            case Month.APRIL:
            case Month.JUNE:
            case Month.SEPTEMBER:
            case Month.NOVEMBER:
                return 30;
            default:
                return 31;
        }
    }

    /**
     * Gets the maximum length of this month in days.
     *
     * February has a maximum length of 29 days.
     * April, June, September and November have 30 days.
     * All other months have 31 days.
     *
     * @return {number} the maximum length of this month in days, from 29 to 31
     */
    maxLength() {
        switch (this) {
            case Month.FEBRUARY:
                return 29;
            case Month.APRIL:
            case Month.JUNE:
            case Month.SEPTEMBER:
            case Month.NOVEMBER:
                return 30;
            default:
                return 31;
        }
    }

    /**
     * Gets the day-of-year corresponding to the first day of this month.
     *
     * This returns the day-of-year that this month begins on, using the leap
     * year flag to determine the length of February.
     *
     * @param {boolean} leapYear - true if the length is required for a leap year
     * @return {number} the day of year corresponding to the first day of this month, from 1 to 336
     */
    firstDayOfYear(leapYear) {
        const leap = leapYear ? 1 : 0;
        switch (this) {
            case Month.JANUARY:
                return 1;
            case Month.FEBRUARY:
                return 32;
            case Month.MARCH:
                return 60 + leap;
            case Month.APRIL:
                return 91 + leap;
            case Month.MAY:
                return 121 + leap;
            case Month.JUNE:
                return 152 + leap;
            case Month.JULY:
                return 182 + leap;
            case Month.AUGUST:
                return 213 + leap;
            case Month.SEPTEMBER:
                return 244 + leap;
            case Month.OCTOBER:
                return 274 + leap;
            case Month.NOVEMBER:
                return 305 + leap;
            case Month.DECEMBER:
            default:
                return 335 + leap;
        }
    }

    /**
     * Gets the month corresponding to the first month of this quarter.
     *
     * The year can be divided into four quarters.
     * This method returns the first month of the quarter for the base month.
     * January, February and March return January.
     * April, May and June return April.
     * July, August and September return July.
     * October, November and December return October.
     *
     * @return {Month} the first month of the quarter corresponding to this month, not null
     */
    firstMonthOfQuarter() {
        switch (this) {
            case Month.JANUARY:
            case Month.FEBRUARY:
            case Month.MARCH:
                return Month.JANUARY;
            case Month.APRIL:
            case Month.MAY:
            case Month.JUNE:
                return Month.APRIL;
            case Month.JULY:
            case Month.AUGUST:
            case Month.SEPTEMBER:
                return Month.JULY;
            case Month.OCTOBER:
            case Month.NOVEMBER:
            case Month.DECEMBER:
            default:
                return Month.OCTOBER;
        }
    }

    /**
     * Queries this month-of-year using the specified query.
     *
     * This queries this month-of-year using the specified query strategy object.
     * The {@link TemporalQuery} object defines the logic to be used to
     * obtain the result. Read the documentation of the query to understand
     * what the result of this method will be.
     *
     * The result of this method is obtained by invoking the
     * {@link TemporalQuery#queryFrom} method on the
     * specified query passing `this` as the argument.
     *
     * @param {TemporalQuery} query - the query to invoke, not null
     * @return {*} the query result, null may be returned (defined by the query)
     * @throws DateTimeException if unable to query (defined by the query)
     * @throws ArithmeticException if numeric overflow occurs (defined by the query)
     */
    query(query) {
        assert(query != null, 'query() parameter must not be null', DateTimeException);
        if (query === TemporalQueries.chronology()) {
            return IsoChronology.INSTANCE;
        } else if (query === TemporalQueries.precision()) {
            return ChronoUnit.MONTHS;
        }
        return super.query(query);
    }



    /**
     * toString implementation... in JDK this is inherited from the Enum class
     *
     * @return {String}
     */
    toString() {
        switch (this) {
            case Month.JANUARY:
                return 'JANUARY';
            case Month.FEBRUARY:
                return 'FEBRUARY';
            case Month.MARCH:
                return 'MARCH';
            case Month.APRIL:
                return 'APRIL';
            case Month.MAY:
                return 'MAY';
            case Month.JUNE:
                return 'JUNE';
            case Month.JULY:
                return 'JULY';
            case Month.AUGUST:
                return 'AUGUST';
            case Month.SEPTEMBER:
                return 'SEPTEMBER';
            case Month.OCTOBER:
                return 'OCTOBER';
            case Month.NOVEMBER:
                return 'NOVEMBER';
            case Month.DECEMBER:
                return 'DECEMBER';
            default:
                return `unknown Month, value: ${this.value()}`;
        }
    }

    /**
     * toJSON() use by JSON.stringify
     * delegates to toString()
     *
     * @return {string}
     */
    toJSON() {
        return this.toString();
    }

    /**
     * Adjusts the specified temporal object to have this month-of-year.
     *
     * This returns a temporal object of the same observable type as the input
     * with the month-of-year changed to be the same as this.
     *
     * The adjustment is equivalent to using {@link Temporal#with}
     * passing {@link ChronoField#MONTH_OF_YEAR} as the field.
     * If the specified temporal object does not use the ISO calendar system then
     * a {@link DateTimeException} is thrown.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisMonth.adjustInto(temporal);
     *   temporal = temporal.with(thisMonth);
     * </pre>
     *
     * For example, given a date in May, the following are output:
     * <pre>
     *   dateInMay.with(JANUARY);    // four months earlier
     *   dateInMay.with(APRIL);      // one months earlier
     *   dateInMay.with(MAY);        // same date
     *   dateInMay.with(JUNE);       // one month later
     *   dateInMay.with(DECEMBER);   // seven months later
     * </pre>
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {Temporal} temporal - the target object to be adjusted, not null
     * @return {Temporal} the adjusted object, not null
     * @throws DateTimeException if unable to make the adjustment
     * @throws ArithmeticException if numeric overflow occurs
     */
    adjustInto(temporal) {
        /* we support only ISO for now
            if (Chronology.from(temporal).equals(IsoChronology.INSTANCE) === false) {
                throw new DateTimeException('Adjustment only supported on ISO date-time');
            }
        */
        return temporal.with(ChronoField.MONTH_OF_YEAR, this.value());
    }
    
    /**
     * Compares this Month to another Month.
     *
     * The comparison is based on the value of the Month.
     * It is "consistent with equals", as defined by {@link Comparable}.
     *
     * @param {Month} other  the other year to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     */    
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, Month, 'other');
        return this._value - other._value;
    }    
    
    /**
     *
     * @returns {boolean}
     */
    equals(other){    
        return this === other;
    }

    /**
     *
     * @param {string} name
     * @returns {Month}
     */
    static valueOf(name) {
        let ordinal = 0;
        for(ordinal; ordinal < MONTHS.length; ordinal++){
            if(MONTHS[ordinal].name() === name){
                break;
            }
        }
        return Month.of(ordinal+1);
    }
    

    /**
     * replacement for enum values
     * @return {Month[]}
     */
    static values(){
        return MONTHS.slice();
    }

    /**
     *
     * @param {number} month
     * @return {Month} not null
     **/
    static of(month) {
        if (month < 1 || month > 12) {
            assert(false, `Invalid value for MonthOfYear: ${month}`, DateTimeException);
        }
        return MONTHS[month-1];
    }

    /**
     * Obtains an instance of {@link Month} from a temporal object.
     *
     * This obtains a month based on the specified temporal.
     * A {@link TemporalAccessor} represents an arbitrary set of date and time information,
     * which this factory converts to an instance of {@link Month}.
     *
     * The conversion extracts the MONTH_OF_YEAR (see {@link ChronoField#MONTH_OF_YEAR}) field.
     * The extraction is only permitted if the temporal object has an ISO
     * chronology, or can be converted to a {@link LocalDate}.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used in queries via method reference, {@link Month::from}.
     *
     * @param {TemporalAccessor} temporal  the temporal object to convert, not null
     * @return {Month} the month-of-year, not null
     * @throws DateTimeException if unable to convert to a {@link Month}
     */
    static from(temporal) {
        if (temporal instanceof Month) {
            return temporal;
        }
        try {
            /* only ISO for now
            if (IsoChronology.INSTANCE.equals(Chronology.from(temporal)) == false) {
                temporal = LocalDate.from(temporal);
            }*/
            return Month.of(temporal.get(ChronoField.MONTH_OF_YEAR));
        } catch (ex) {
            throw new DateTimeException(`Unable to obtain Month from TemporalAccessor: ${ 
                temporal} of type ${temporal && temporal.constructor != null ? temporal.constructor.name : ''}`, ex);
        }
    }
}

let MONTHS;

export function _init() {
    Month.JANUARY = new Month(1, 'JANUARY');
    Month.FEBRUARY = new Month(2, 'FEBRUARY');
    Month.MARCH = new Month(3, 'MARCH');
    Month.APRIL = new Month(4, 'APRIL');
    Month.MAY = new Month(5, 'MAY');
    Month.JUNE = new Month(6, 'JUNE');
    Month.JULY = new Month(7, 'JULY');
    Month.AUGUST = new Month(8, 'AUGUST');
    Month.SEPTEMBER = new Month(9, 'SEPTEMBER');
    Month.OCTOBER = new Month(10, 'OCTOBER');
    Month.NOVEMBER = new Month(11, 'NOVEMBER');
    Month.DECEMBER = new Month(12, 'DECEMBER');

    MONTHS = [
        Month.JANUARY, Month.FEBRUARY, Month.MARCH, Month.APRIL, Month.MAY, Month.JUNE,
        Month.JULY, Month.AUGUST, Month.SEPTEMBER, Month.OCTOBER, Month.NOVEMBER, Month.DECEMBER
    ];
}
