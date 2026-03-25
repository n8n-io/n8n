/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { MAX_SAFE_INTEGER, MIN_SAFE_INTEGER } from '../MathUtil';

import { ChronoUnit } from './ChronoUnit';
import { TemporalField } from './TemporalField';
import { ValueRange } from './ValueRange';
import { YearConstants } from '../YearConstants';

/**
 * A standard set of fields.
 *
 * This set of fields provide field-based access to manipulate a date, time or date-time.
 * The standard set of fields can be extended by implementing {@link TemporalField}.
 *
 * These fields are intended to be applicable in multiple calendar systems.
 * For example, most non-ISO calendar systems define dates as a year, month and day,
 * just with slightly different rules.
 * The documentation of each field explains how it operates.
 *
 * ### Static properties:
 *
 * - `ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH`: This represents concept of the count of
 * days within the period of a week where the weeks are aligned to the start of the month.
 * This field is typically used with `ALIGNED_WEEK_OF_MONTH`.
 * 
 * - `ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR`: This represents concept of the count of days
 * within the period of a week where the weeks are aligned to the start of the year.
 * This field is typically used with `ALIGNED_WEEK_OF_YEAR`.
 * 
 * - `ChronoField.ALIGNED_WEEK_OF_MONTH`: This represents concept of the count of weeks within
 * the period of a month where the weeks are aligned to the start of the month. This field
 * is typically used with `ALIGNED_DAY_OF_WEEK_IN_MONTH`.
 * 
 * - `ChronoField.ALIGNED_WEEK_OF_YEAR`: This represents concept of the count of weeks within
 * the period of a year where the weeks are aligned to the start of the year. This field
 * is typically used with `ALIGNED_DAY_OF_WEEK_IN_YEAR`.
 * 
 * - `ChronoField.AMPM_OF_DAY`: This counts the AM/PM within the day, from 0 (AM) to 1 (PM).
 * 
 * - `ChronoField.CLOCK_HOUR_OF_AMPM`: This counts the hour within the AM/PM, from 1 to 12.
 * This is the hour that would be observed on a standard 12-hour analog wall clock.
 * 
 * - `ChronoField.CLOCK_HOUR_OF_DAY`: This counts the hour within the AM/PM, from 1 to 24.
 * This is the hour that would be observed on a 24-hour analog wall clock.
 * 
 * - `ChronoField.DAY_OF_MONTH`: This represents the concept of the day within the month.
 * In the default ISO calendar system, this has values from 1 to 31 in most months.
 * April, June, September, November have days from 1 to 30, while February has days from
 * 1 to 28, or 29 in a leap year.
 * 
 * - `ChronoField.DAY_OF_WEEK`: This represents the standard concept of the day of the week.
 * In the default ISO calendar system, this has values from Monday (1) to Sunday (7).
 * The {@link DayOfWeek} class can be used to interpret the result.
 * 
 * - `ChronoField.DAY_OF_YEAR`: This represents the concept of the day within the year.
 * In the default ISO calendar system, this has values from 1 to 365 in standard years and
 * 1 to 366 in leap years.
 * 
 * - `ChronoField.EPOCH_DAY`: This field is the sequential count of days where
 * 1970-01-01 (ISO) is zero. Note that this uses the local time-line, ignoring offset and
 * time-zone.
 * 
 * - `ChronoField.ERA`: This represents the concept of the era, which is the largest
 * division of the time-line. This field is typically used with `YEAR_OF_ERA`.
 * 
 *     In the default ISO calendar system, there are two eras defined, 'BCE' and 'CE'. The era
 * 'CE' is the one currently in use and year-of-era runs from 1 to the maximum value.
 * The era 'BCE' is the previous era, and the year-of-era runs backwards.
 * 
 * - `ChronoField.HOUR_OF_AMPM`: This counts the hour within the AM/PM, from 0 to 11.
 * This is the hour that would be observed on a standard 12-hour digital clock.
 * 
 * - `ChronoField.HOUR_OF_DAY`: This counts the hour within the day, from 0 to 23. This is
 * the hour that would be observed on a standard 24-hour digital clock.
 * 
 * - `ChronoField.INSTANT_SECONDS`: This represents the concept of the sequential count of
 * seconds where 1970-01-01T00:00Z (ISO) is zero. This field may be used with `NANO_OF_DAY`
 * to represent the fraction of the day.
 * 
 *     An Instant represents an instantaneous point on the time-line. On their own they have
 * no elements which allow a local date-time to be obtained. Only when paired with an offset
 * or time-zone can the local date or time be found. This field allows the seconds part of
 * the instant to be queried.
 * 
 * - `ChronoField.MICRO_OF_DAY`: This counts the microsecond within the day, from 0 to
 * (24 * 60 * 60 * 1,000,000) - 1.
 * 
 *     This field is used to represent the micro-of-day handling any fraction of the second.
 * Implementations of {@link TemporalAccessor} should provide a value for this field if they
 * can return a value for `SECOND_OF_DAY` filling unknown precision with zero.
 * 
 *     When this field is used for setting a value, it should behave in the same way as
 * setting `NANO_OF_DAY` with the value multiplied by 1,000.
 * 
 * - `ChronoField.MICRO_OF_SECOND`: This counts the microsecond within the second, from 0
 * to 999,999.
 * 
 *     This field is used to represent the micro-of-second handling any fraction of the second.
 * Implementations of {@link TemporalAccessor} should provide a value for this field if they
 * can return a value for `SECOND_OF_MINUTE`, `SECOND_OF_DAY` or `INSTANT_SECONDS` filling
 * unknown precision with zero.
 * 
 * - `ChronoField.MILLI_OF_DAY`: This counts the millisecond within the day, from 0 to
 * (24 * 60 * 60 * 1,000) - 1.
 * 
 *     This field is used to represent the milli-of-day handling any fraction of the second.
 * Implementations of {@link TemporalAccessor} should provide a value for this field if they
 * can return a value for `SECOND_OF_DAY` filling unknown precision with zero.
 * 
 *     When this field is used for setting a value, it should behave in the same way as
 * setting `NANO_OF_DAY` with the value multiplied by 1,000,000.
 * 
 * - `ChronoField.MILLI_OF_SECOND`: This counts the millisecond within the second, from 0 to
 * 999.
 * 
 *     This field is used to represent the milli-of-second handling any fraction of the second.
 * Implementations of {@link TemporalAccessor} should provide a value for this field if they can
 * return a value for `SECOND_OF_MINUTE`, `SECOND_OF_DAY` or `INSTANT_SECONDS` filling unknown
 * precision with zero.
 * 
 *     When this field is used for setting a value, it should behave in the same way as
 * setting `NANO_OF_SECOND` with the value multiplied by 1,000,000.
 * 
 * - `ChronoField.MINUTE_OF_DAY`: This counts the minute within the day, from 0 to (24 * 60) - 1.
 * 
 * - `ChronoField.MINUTE_OF_HOUR`: This counts the minute within the hour, from 0 to 59.
 * 
 * - `ChronoField.MONTH_OF_YEAR`: The month-of-year, such as March. This represents the concept
 * of the month within the year. In the default ISO calendar system, this has values from
 * January (1) to December (12).
 * 
 * - `ChronoField.NANO_OF_DAY`: This counts the nanosecond within the day, from 0 to
 * (24 * 60 * 60 * 1,000,000,000) - 1.
 * 
 *     This field is used to represent the nano-of-day handling any fraction of the second.
 * Implementations of {@link TemporalAccessor} should provide a value for this field if they
 * can return a value for `SECOND_OF_DAY` filling unknown precision with zero.
 * 
 * - `ChronoField.NANO_OF_SECOND`: This counts the nanosecond within the second, from 0
 * to 999,999,999.
 * 
 *     This field is used to represent the nano-of-second handling any fraction of the second.
 * Implementations of {@link TemporalAccessor} should provide a value for this field if they
 * can return a value for `SECOND_OF_MINUTE`, `SECOND_OF_DAY` or `INSTANT_SECONDS` filling
 * unknown precision with zero.
 * 
 *     When this field is used for setting a value, it should set as much precision as the
 * object stores, using integer division to remove excess precision. For example, if the
 * {@link TemporalAccessor} stores time to millisecond precision, then the nano-of-second must
 * be divided by 1,000,000 before replacing the milli-of-second.
 * 
 * - `ChronoField.OFFSET_SECONDS`: This represents the concept of the offset in seconds of
 * local time from UTC/Greenwich.
 * 
 *     A {@link ZoneOffset} represents the period of time that local time differs from
 * UTC/Greenwich. This is usually a fixed number of hours and minutes. It is equivalent to
 * the total amount of the offset in seconds. For example, during the winter Paris has an
 * offset of +01:00, which is 3600 seconds.
 * 
 * - `ChronoField.PROLEPTIC_MONTH`: The proleptic-month, which counts months sequentially
 * from year 0.
 * 
 *     The first month in year zero has the value zero. The value increase for later months
 * and decrease for earlier ones. Note that this uses the local time-line, ignoring offset
 * and time-zone.
 * 
 * - `ChronoField.SECOND_OF_DAY`: This counts the second within the day, from 0 to
 * (24 * 60 * 60) - 1.
 * 
 * - `ChronoField.SECOND_OF_MINUTE`: This counts the second within the minute, from 0 to 59.
 * 
 * - `ChronoField.YEAR`: The proleptic year, such as 2012. This represents the concept of
 * the year, counting sequentially and using negative numbers. The proleptic year is not
 * interpreted in terms of the era.
 * 
 *     The standard mental model for a date is based on three concepts - year, month and day.
 * These map onto the `YEAR`, `MONTH_OF_YEAR` and `DAY_OF_MONTH` fields. Note that there is no
 * reference to eras. The full model for a date requires four concepts - era, year, month and
 * day. These map onto the `ERA`, `YEAR_OF_ERA`, `MONTH_OF_YEAR` and `DAY_OF_MONTH` fields.
 * Whether this field or `YEAR_OF_ERA` is used depends on which mental model is being used.
 * 
 * - `ChronoField.YEAR_OF_ERA`: This represents the concept of the year within the era. This
 * field is typically used with `ERA`. The standard mental model for a date is based on three
 * concepts - year, month and day. These map onto the `YEAR`, `MONTH_OF_YEAR` and
 * `DAY_OF_MONTH` fields. Note that there is no reference to eras. The full model for a date
 * requires four concepts - era, year, month and day. These map onto the `ERA`, `YEAR_OF_ERA`,
 * `MONTH_OF_YEAR` and `DAY_OF_MONTH` fields. Whether this field or `YEAR` is used depends on
 * which mental model is being used.
 * 
 *     In the default ISO calendar system, there are two eras defined, 'BCE' and 'CE'.
 * The era 'CE' is the one currently in use and year-of-era runs from 1 to the maximum value.
 * The era 'BCE' is the previous era, and the year-of-era runs backwards.
 * 
 *     For example, subtracting a year each time yield the following:
 *    - year-proleptic 2 = 'CE' year-of-era 2
 *    - year-proleptic 1 = 'CE' year-of-era 1
 *    - year-proleptic 0 = 'BCE' year-of-era 1
 *    - year-proleptic -1 = 'BCE' year-of-era 2
 * 
 *     Note that the ISO-8601 standard does not actually define eras. Note also that the
 * ISO eras do not align with the well-known AD/BC eras due to the change between the Julian
 * and Gregorian calendar systems.
 */
export class ChronoField extends TemporalField {

    /**
     * helper function to get one of the static ChronoField defines by name, needed to resolve ChronoField from EnumMap
     *
     * @param {String} fieldName
     * @return {ChronoField | null}
     * @private
     */
    static byName(fieldName) {
        for (const prop in ChronoField) {
            if (ChronoField[prop]) {
                if ((ChronoField[prop] instanceof ChronoField) && ChronoField[prop].name() === fieldName) {
                    return ChronoField[prop];
                }
            }
        }
    }

    /**
     *
     * @param {!string} name
     * @param {!TemporalUnit} baseUnit
     * @param {!TemporalUnit} rangeUnit
     * @param {!ValueRange} range
     * @private
     */
    constructor(name, baseUnit, rangeUnit, range) {
        super();
        this._name = name;
        this._baseUnit = baseUnit;
        this._rangeUnit = rangeUnit;
        this._range = range;
    }

    /**
     * @return {string}
     */
    name(){
        return this._name;
    }

    /**
     * @return {TemporalUnit} the period unit defining the base unit of the field.
     */
    baseUnit(){
        return this._baseUnit;
    }

    /**
     * @return {TemporalUnit} the period unit defining the range of the field.
     */
    rangeUnit(){
        return this._rangeUnit;
    }

    /**
     * @return {ValueRange} the range of valid values for the field.
     */
    range(){
        return this._range;
    }

    /**
     * @returns {string}
     */
    displayName(){
        return this.toString();
    }

    /**
     * Checks that the specified value is valid for this field.
     *
     * This validates that the value is within the outer range of valid values
     * returned by {@link range}.
     *
     * This method checks against the range of the field in the ISO-8601 calendar system.
     *
     * @param {!number} value the value to check.
     * @returns {number} the value that was passed in.
     */
    checkValidValue(value) {
        return this.range().checkValidValue(value, this);
    }

    /**
     * Checks that the specified value is valid and fits in an `int`.
     *
     * This validates that the value is within the outer range of valid values
     * returned by {@link range}.
     * It also checks that all valid values are within the bounds of an `int`.
     *
     * This method checks against the range of the field in the ISO-8601 calendar system.
     *
     * @param {number} value the value to check.
     * @return {number} the value that was passed in.
     */
    checkValidIntValue(value) {
        return this.range().checkValidIntValue(value, this);
    }

    /**
     * @return {boolean} `true` if it is a component of a date, `false` otherwise.
     */
    isDateBased() {
        const dateBased =
            this === ChronoField.DAY_OF_WEEK ||
            this === ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH ||
            this === ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR ||
            this === ChronoField.DAY_OF_MONTH ||
            this === ChronoField.DAY_OF_YEAR ||
            this === ChronoField.EPOCH_DAY ||
            this === ChronoField.ALIGNED_WEEK_OF_MONTH ||
            this === ChronoField.ALIGNED_WEEK_OF_YEAR ||
            this === ChronoField.MONTH_OF_YEAR ||
            this === ChronoField.PROLEPTIC_MONTH ||
            this === ChronoField.YEAR_OF_ERA ||
            this === ChronoField.YEAR ||
            this === ChronoField.ERA;
        return dateBased;
    }

    /**
     * @return {boolean} `true` if it is a component of a time, `false` otherwise.
     */
    isTimeBased() {
        const timeBased =
            this === ChronoField.NANO_OF_SECOND     ||
            this === ChronoField.NANO_OF_DAY        ||
            this === ChronoField.MICRO_OF_SECOND    ||
            this === ChronoField.MICRO_OF_DAY       ||
            this === ChronoField.MILLI_OF_SECOND    ||
            this === ChronoField.MILLI_OF_DAY       ||
            this === ChronoField.SECOND_OF_MINUTE   ||
            this === ChronoField.SECOND_OF_DAY      ||
            this === ChronoField.MINUTE_OF_HOUR     ||
            this === ChronoField.MINUTE_OF_DAY      ||
            this === ChronoField.HOUR_OF_AMPM       ||
            this === ChronoField.CLOCK_HOUR_OF_AMPM ||
            this === ChronoField.HOUR_OF_DAY        ||
            this === ChronoField.CLOCK_HOUR_OF_DAY  ||
            this === ChronoField.AMPM_OF_DAY;
        return timeBased;
    }

    /**
     * @param {!TemporalAccessor} temporal the temporal object used to refine the result.
     * @return {ValueRange} the range of valid values for this field.
     * @throws {DateTimeException} if the range for the field cannot be obtained.
     */
    rangeRefinedBy(temporal) {
        return temporal.range(this);
    }

    

    /**
     * @param {!TemporalAccesor} temporal the temporal object to query.
     * @return {number} the value of this field.
     * @throws {DateTimeException} if a value for the field cannot be obtained.
     */
    getFrom(temporal) {
        return temporal.getLong(this);
    }

    /**
     * @returns {string}
     */
    toString(){
        return this.name();
    }

    /**
     * @param {*} other
     * @returns {boolean}
     */
    equals(other){
        return this === other;
    }

    /**
     * @param {!Temporal} temporal the temporal object to adjust.
     * @param {!number} newValue the new value of the field.
     * @return {Temporal} the adjusted temporal object.
     * @throws {DateTimeException} if the field cannot be set.
     */
    adjustInto(temporal, newValue) {
        return temporal.with(this, newValue);
    }

    /**
     * @param {!TemporalAccesor} temporal the temporal object to query.
     * @return {boolean} `true` if the date-time can be queried for this field, `false` if not.
     */
    isSupportedBy(temporal) {
        return temporal.isSupported(this);
    }
}

export function _init() {

    ChronoField.NANO_OF_SECOND = new ChronoField('NanoOfSecond', ChronoUnit.NANOS, ChronoUnit.SECONDS, ValueRange.of(0, 999999999));

    ChronoField.NANO_OF_DAY = new ChronoField('NanoOfDay', ChronoUnit.NANOS, ChronoUnit.DAYS, ValueRange.of(0, 86400 * 1000000000 - 1));

    ChronoField.MICRO_OF_SECOND = new ChronoField('MicroOfSecond', ChronoUnit.MICROS, ChronoUnit.SECONDS, ValueRange.of(0, 999999));

    ChronoField.MICRO_OF_DAY = new ChronoField('MicroOfDay', ChronoUnit.MICROS, ChronoUnit.DAYS, ValueRange.of(0, 86400 * 1000000 - 1));

    ChronoField.MILLI_OF_SECOND = new ChronoField('MilliOfSecond', ChronoUnit.MILLIS, ChronoUnit.SECONDS, ValueRange.of(0, 999));

    ChronoField.MILLI_OF_DAY = new ChronoField('MilliOfDay', ChronoUnit.MILLIS, ChronoUnit.DAYS, ValueRange.of(0, 86400 * 1000 - 1));

    ChronoField.SECOND_OF_MINUTE = new ChronoField('SecondOfMinute', ChronoUnit.SECONDS, ChronoUnit.MINUTES, ValueRange.of(0, 59));

    ChronoField.SECOND_OF_DAY = new ChronoField('SecondOfDay', ChronoUnit.SECONDS, ChronoUnit.DAYS, ValueRange.of(0, 86400 - 1));

    ChronoField.MINUTE_OF_HOUR = new ChronoField('MinuteOfHour', ChronoUnit.MINUTES, ChronoUnit.HOURS, ValueRange.of(0, 59));

    ChronoField.MINUTE_OF_DAY = new ChronoField('MinuteOfDay', ChronoUnit.MINUTES, ChronoUnit.DAYS, ValueRange.of(0, (24 * 60) - 1));

    ChronoField.HOUR_OF_AMPM = new ChronoField('HourOfAmPm', ChronoUnit.HOURS, ChronoUnit.HALF_DAYS, ValueRange.of(0, 11));

    ChronoField.CLOCK_HOUR_OF_AMPM = new ChronoField('ClockHourOfAmPm', ChronoUnit.HOURS, ChronoUnit.HALF_DAYS, ValueRange.of(1, 12));

    ChronoField.HOUR_OF_DAY = new ChronoField('HourOfDay', ChronoUnit.HOURS, ChronoUnit.DAYS, ValueRange.of(0, 23));

    ChronoField.CLOCK_HOUR_OF_DAY = new ChronoField('ClockHourOfDay', ChronoUnit.HOURS, ChronoUnit.DAYS, ValueRange.of(1, 24));

    ChronoField.AMPM_OF_DAY = new ChronoField('AmPmOfDay', ChronoUnit.HALF_DAYS, ChronoUnit.DAYS, ValueRange.of(0, 1));

    ChronoField.DAY_OF_WEEK = new ChronoField('DayOfWeek', ChronoUnit.DAYS, ChronoUnit.WEEKS, ValueRange.of(1, 7));

    ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH = new ChronoField('AlignedDayOfWeekInMonth', ChronoUnit.DAYS, ChronoUnit.WEEKS, ValueRange.of(1, 7));

    ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR = new ChronoField('AlignedDayOfWeekInYear', ChronoUnit.DAYS, ChronoUnit.WEEKS, ValueRange.of(1, 7));

    ChronoField.DAY_OF_MONTH = new ChronoField('DayOfMonth', ChronoUnit.DAYS, ChronoUnit.MONTHS, ValueRange.of(1, 28, 31), 'day');

    ChronoField.DAY_OF_YEAR = new ChronoField('DayOfYear', ChronoUnit.DAYS, ChronoUnit.YEARS, ValueRange.of(1, 365, 366));

    ChronoField.EPOCH_DAY = new ChronoField('EpochDay', ChronoUnit.DAYS, ChronoUnit.FOREVER, ValueRange.of(-365961662, 364522971)); // [LocalDate.MIN.toEpochDay() .. LocalDate.MAX.toEpochDay()]

    ChronoField.ALIGNED_WEEK_OF_MONTH = new ChronoField('AlignedWeekOfMonth', ChronoUnit.WEEKS, ChronoUnit.MONTHS, ValueRange.of(1, 4, 5));

    ChronoField.ALIGNED_WEEK_OF_YEAR = new ChronoField('AlignedWeekOfYear', ChronoUnit.WEEKS, ChronoUnit.YEARS, ValueRange.of(1, 53));

    ChronoField.MONTH_OF_YEAR = new ChronoField('MonthOfYear', ChronoUnit.MONTHS, ChronoUnit.YEARS, ValueRange.of(1, 12), 'month');

    ChronoField.PROLEPTIC_MONTH = new ChronoField('ProlepticMonth', ChronoUnit.MONTHS, ChronoUnit.FOREVER, ValueRange.of(YearConstants.MIN_VALUE * 12, YearConstants.MAX_VALUE * 12 + 11));

    ChronoField.YEAR_OF_ERA = new ChronoField('YearOfEra', ChronoUnit.YEARS, ChronoUnit.FOREVER, ValueRange.of(1, YearConstants.MAX_VALUE, YearConstants.MAX_VALUE + 1));

    ChronoField.YEAR = new ChronoField('Year', ChronoUnit.YEARS, ChronoUnit.FOREVER, ValueRange.of(YearConstants.MIN_VALUE, YearConstants.MAX_VALUE), 'year');

    ChronoField.ERA = new ChronoField('Era', ChronoUnit.ERAS, ChronoUnit.FOREVER, ValueRange.of(0, 1));

    ChronoField.INSTANT_SECONDS = new ChronoField('InstantSeconds', ChronoUnit.SECONDS, ChronoUnit.FOREVER, ValueRange.of(MIN_SAFE_INTEGER, MAX_SAFE_INTEGER));

    ChronoField.OFFSET_SECONDS = new ChronoField('OffsetSeconds', ChronoUnit.SECONDS, ChronoUnit.FOREVER, ValueRange.of(-18 * 3600, 18 * 3600));

}
