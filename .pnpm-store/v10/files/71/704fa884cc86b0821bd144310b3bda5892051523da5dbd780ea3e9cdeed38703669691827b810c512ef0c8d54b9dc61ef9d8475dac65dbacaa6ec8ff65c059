/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE.md in the root directory of this source tree)
 */

import { requireNonNull, requireInstance } from './assert';
import { DateTimeException, UnsupportedTemporalTypeException } from './errors';
import { MathUtil } from './MathUtil';

import { ChronoField } from './temporal/ChronoField';
import { Clock } from './Clock';
import { DateTimeFormatter } from './format/DateTimeFormatter';
import { DateTimeFormatterBuilder } from './format/DateTimeFormatterBuilder';
import { IsoChronology } from './chrono/IsoChronology';
import { LocalDate } from './LocalDate';
import { Month } from './Month';
import { TemporalAccessor } from './temporal/TemporalAccessor';
import { TemporalQuery, createTemporalQuery } from './temporal/TemporalQuery';
import { TemporalQueries } from './temporal/TemporalQueries';
import { ValueRange } from './temporal/ValueRange';
import { Year } from './Year';
import { ZoneId } from './ZoneId';

/**
 * A month-day in the ISO-8601 calendar system, such as `--12-03`.
 *
 * {@link MonthDay} is an immutable date-time object that represents the combination
 * of a year and month. Any field that can be derived from a month and day, such as
 * quarter-of-year, can be obtained.
 *
 * This class does not store or represent a year, time or time-zone.
 * For example, the value "December 3rd" can be stored in a {@link MonthDay}.
 *
 * Since a {@link MonthDay} does not possess a year, the leap day of
 * February 29th is considered valid.
 *
 * This class implements {@link TemporalAccessor} rather than {@link Temporal}.
 * This is because it is not possible to define whether February 29th is valid or not
 * without external information, preventing the implementation of plus/minus.
 * Related to this, {@link MonthDay} only provides access to query and set the fields
 * {@link MONTH_OF_YEAR} and {@link DAY_OF_MONTH}.
 *
 * The ISO-8601 calendar system is the modern civil calendar system used today
 * in most of the world. It is equivalent to the proleptic Gregorian calendar
 * system, in which today's rules for leap years are applied for all time.
 * For most applications written today, the ISO-8601 rules are entirely suitable.
 * However, any application that makes use of historical dates, and requires them
 * to be accurate will find the ISO-8601 approach unsuitable.
 *
 * ### Specification for implementors
 *
 * This class is immutable and thread-safe.
 */
export class MonthDay extends TemporalAccessor {
    /**
     * function overloading for {@link MonthDay.now}
     *
     * if called with 0 argument {@link MonthDay.now0} is executed,
     *
     * if called with 1 argument and first argument is an instance of ZoneId, then {@link MonthDay.nowZoneId} is executed,
     *
     * otherwise {@link MonthDay.nowClock} is executed
     *
     * @param {?(ZoneId|Clock)} zoneIdOrClock
     * @returns {MonthDay}
     */
    static now(zoneIdOrClock) {
        if (arguments.length === 0) {
            return MonthDay.now0();
        } else if (arguments.length === 1 && zoneIdOrClock instanceof ZoneId) {
            return MonthDay.nowZoneId(zoneIdOrClock);
        } else {
            return MonthDay.nowClock(zoneIdOrClock);
        }
    }
    /**
     * Obtains the current month-day from the system clock in the default time-zone.
     *
     * This will query the system clock (see {@link Clock#systemDefaultZone}) in the default
     * time-zone to obtain the current month-day.
     *
     * Using this method will prevent the ability to use an alternate clock for testing
     * because the clock is hard-coded.
     *
     * @return {MonthDay} the current month-day using the system clock and default time-zone, not null
     */
    static now0() {
        return this.nowClock(Clock.systemDefaultZone());
    }

    /**
     * Obtains the current month-day from the system clock in the specified time-zone.
     *
     * This will query the system clock (see {@link Clock#system}) to obtain the current month-day.
     * Specifying the time-zone avoids dependence on the default time-zone.
     *
     * Using this method will prevent the ability to use an alternate clock for testing
     * because the clock is hard-coded.
     *
     * @param {ZoneId} zone  the zone ID to use, not null
     * @return {MonthDay} the current month-day using the system clock, not null
     */
    static nowZoneId(zone) {
        requireNonNull(zone, 'zone');
        return this.nowClock(Clock.system(zone));
    }

    /**
     * Obtains the current month-day from the specified clock.
     *
     * This will query the specified clock to obtain the current month-day.
     * Using this method allows the use of an alternate clock for testing.
     * The alternate clock may be introduced using dependency injection (see {@link Clock}).
     *
     * @param {Clock} clock  the clock to use, not null
     * @return {MonthDay} the current month-day, not null
     */
    static nowClock(clock) {
        requireNonNull(clock, 'clock');
        const now = LocalDate.now(clock);  // called once
        return MonthDay.of(now.month(), now.dayOfMonth());
    }
    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link MonthDay.of}
     *
     * if called with 2 argument and first argument is an instance of Month, then {@link MonthDay.ofMonthNumber} is executed,
     *
     * otherwise {@link MonthDay.ofNumberNumber} is executed
     *
     * @param {!(Month|number)} monthOrNumber
     * @param {?number} number
     * @returns {MonthDay}
     */
    static of(monthOrNumber, number) {
        if (arguments.length === 2 && monthOrNumber instanceof Month) {
            return MonthDay.ofMonthNumber(monthOrNumber, number);
        } else {
            return MonthDay.ofNumberNumber(monthOrNumber, number);
        }
    }
    /**
     * Obtains an instance of {@link MonthDay}.
     *
     * The day-of-month must be valid for the month within a leap year.
     * Hence, for February, day 29 is valid.
     *
     * For example, passing in April and day 31 will throw an exception, as
     * there can never be April 31st in any year. By contrast, passing in
     * February 29th is permitted, as that month-day can sometimes be valid.
     *
     * @param {Month} month  the month-of-year to represent, not null
     * @param {number} dayOfMonth  the day-of-month to represent, from 1 to 31
     * @return {MonthDay} the month-day, not null
     * @throws DateTimeException if the value of any field is out of range
     * @throws DateTimeException if the day-of-month is invalid for the month
     */
    static ofMonthNumber(month, dayOfMonth) {
        requireNonNull(month, 'month');
        ChronoField.DAY_OF_MONTH.checkValidValue(dayOfMonth);
        if (dayOfMonth > month.maxLength()) {
            throw new DateTimeException(`Illegal value for DayOfMonth field, value ${dayOfMonth 
            } is not valid for month ${month.toString()}`);
        }
        return new MonthDay(month.value(), dayOfMonth);
    }

    /**
     * Obtains an instance of {@link MonthDay}.
     *
     * The day-of-month must be valid for the month within a leap year.
     * Hence, for month 2 (February), day 29 is valid.
     *
     * For example, passing in month 4 (April) and day 31 will throw an exception, as
     * there can never be April 31st in any year. By contrast, passing in
     * February 29th is permitted, as that month-day can sometimes be valid.
     *
     * @param {number} month  the month-of-year to represent, from 1 (January) to 12 (December)
     * @param {number} dayOfMonth  the day-of-month to represent, from 1 to 31
     * @return {MonthDay} the month-day, not null
     * @throws DateTimeException if the value of any field is out of range
     * @throws DateTimeException if the day-of-month is invalid for the month
     */
    static ofNumberNumber(month, dayOfMonth) {
        requireNonNull(month, 'month');
        requireNonNull(dayOfMonth, 'dayOfMonth');
        return MonthDay.of(Month.of(month), dayOfMonth);
    }
    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@link MonthDay} from a temporal object.
     *
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link MonthDay}.
     *
     * The conversion extracts the MONTH_OF_YEAR (see {@link ChronoField#MONTH_OF_YEAR}) and
     * DAY_OF_MONTH (see {@link ChronoField#DAY_OF_MONTH}) fields.
     * The extraction is only permitted if the date-time has an ISO chronology.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used in queries via method reference, {@link MonthDay::from}.
     *
     * @param {TemporalAccessor} temporal  the temporal object to convert, not null
     * @return {MonthDay} the month-day, not null
     * @throws DateTimeException if unable to convert to a {@link MonthDay}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        requireInstance(temporal, TemporalAccessor, 'temporal');
        if (temporal instanceof MonthDay) {
            return temporal;
        }
        try {
            /* TODO: only IsoChronology for now
            if (IsoChronology.INSTANCE.equals(Chronology.from(temporal)) == false) {
                temporal = LocalDate.from(temporal);
            }*/
            return MonthDay.of(temporal.get(ChronoField.MONTH_OF_YEAR), temporal.get(ChronoField.DAY_OF_MONTH));
        } catch (ex) {
            throw new DateTimeException(`Unable to obtain MonthDay from TemporalAccessor: ${ 
                temporal}, type ${temporal && temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
    }
    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link MonthDay.parse}
     *
     * if called with 1 argument, then {@link MonthDay.parseString} is executed,
     *
     * otherwise {@link MonthDay.parseStringFormatter} is executed
     *
     * @param {!(String)} text
     * @param {?DateTimeFormatter} formatter
     * @returns {MonthDay}
     */
    static parse(text, formatter) {
        if (arguments.length === 1) {
            return MonthDay.parseString(text);
        } else {
            return MonthDay.parseStringFormatter(text, formatter);
        }
    }

    /**
     * Obtains an instance of {@link MonthDay} from a text string such as `--12-03`.
     *
     * The string must represent a valid month-day.
     * The format is `--MM-dd`.
     *
     * @param {String} text  the text to parse such as "--12-03", not null
     * @return {MonthDay} the parsed month-day, not null
     * @throws DateTimeParseException if the text cannot be parsed
     */
    static parseString(text) {
        return MonthDay.parseStringFormatter(text, PARSER);
    }

    /**
     * Obtains an instance of {@link MonthDay} from a text string using a specific formatter.
     *
     * The text is parsed using the formatter, returning a month-day.
     *
     * @param {String} text  the text to parse, not null
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return {MonthDay} the parsed month-day, not null
     * @throws DateTimeParseException if the text cannot be parsed
     */
    static parseStringFormatter(text, formatter) {
        requireNonNull(text, 'text');
        requireNonNull(formatter, 'formatter');
        requireInstance(formatter, DateTimeFormatter, 'formatter');
        return formatter.parse(text, MonthDay.FROM);
    }

    //-----------------------------------------------------------------------
    /**
     * Constructor, previously validated.
     *
     * @param {number} month  the month-of-year to represent, validated from 1 to 12
     * @param {number} dayOfMonth  the day-of-month to represent, validated from 1 to 29-31
     * @private
     */
    constructor(month, dayOfMonth) {
        super();
        this._month = MathUtil.safeToInt(month);
        this._day = MathUtil.safeToInt(dayOfMonth);
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the month-of-year field from 1 to 12.
     *
     * This method returns the month as an `int` from 1 to 12.
     * Application code is frequently clearer if the enum {@link Month}
     * is used by calling {@link getMonth}.
     *
     * @return {number} the month-of-year, from 1 to 12
     * @see #month()
     */
    monthValue() {
        return this._month;
    }

    /**
     * Gets the month-of-year field using the {@link Month} enum.
     *
     * This method returns the enum {@link Month} for the month.
     * This avoids confusion as to what `int` values mean.
     * If you need access to the primitive `int` value then the enum
     * provides the int value (see {@link Month#getValue}).
     *
     * @return {Month} the month-of-year, not null
     * @see #getMonthValue()
     */
    month() {
        return Month.of(this._month);
    }

    /**
     * Gets the day-of-month field.
     *
     * This method returns the primitive `int` value for the day-of-month.
     *
     * @return {number} the day-of-month, from 1 to 31
     */
    dayOfMonth() {
        return this._day;
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if the specified field is supported.
     *
     * This checks if this month-day can be queried for the specified field.
     * If false, then calling the range (see {@link range}) and
     * get (see {@link get}) methods will throw an exception.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this date-time.
     * The supported fields are:
     *
     * * {@link MONTH_OF_YEAR}
     * * {@link YEAR}
     *
     * All other {@link ChronoField} instances will return false.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.isSupportedBy}
     * passing `this` as the argument.
     * Whether the field is supported is determined by the field.
     *
     * @param {TemporalField} field  the field to check, null returns false
     * @return {boolean} true if the field is supported on this month-day, false if not
     */
    isSupported(field) {
        if (field instanceof ChronoField) {
            return field === ChronoField.MONTH_OF_YEAR || field === ChronoField.DAY_OF_MONTH;
        }
        return field != null && field.isSupportedBy(this);
    }

    /**
     * Gets the range of valid values for the specified field.
     *
     * The range object expresses the minimum and maximum valid values for a field.
     * This month-day is used to enhance the accuracy of the returned range.
     * If it is not possible to return the range, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return
     * appropriate range instances.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.rangeRefinedBy}
     * passing `this` as the argument.
     * Whether the range can be obtained is determined by the field.
     *
     * @param {TemporalField} field  the field to query the range for, not null
     * @return {ValueRange} the range of valid values for the field, not null
     * @throws DateTimeException if the range for the field cannot be obtained
     */
    range(field) {
        if (field === ChronoField.MONTH_OF_YEAR) {
            return field.range();
        } else if (field === ChronoField.DAY_OF_MONTH) {
            return ValueRange.of(1, this.month().minLength(), this.month().maxLength());
        }
        return super.range(field);
    }

    /**
     * Gets the value of the specified field from this month-day as an `int`.
     *
     * This queries this month-day for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this month-day.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {TemporalField} field  the field to get, not null
     * @return {number} the value for the field
     * @throws DateTimeException if a value for the field cannot be obtained
     * @throws ArithmeticException if numeric overflow occurs
     */
    get(field) {
        return this.range(field).checkValidIntValue(this.getLong(field), field);
    }

    /**
     * Gets the value of the specified field from this month-day as a `long`.
     *
     * This queries this month-day for the value for the specified field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this month-day.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {TemporalField} field  the field to get, not null
     * @return {number} the value for the field
     * @throws DateTimeException if a value for the field cannot be obtained
     * @throws ArithmeticException if numeric overflow occurs
     */
    getLong(field) {
        requireNonNull(field, 'field');
        if (field instanceof ChronoField) {
            switch (field) {
                // alignedDOW and alignedWOM not supported because they cannot be set in with()
                case ChronoField.DAY_OF_MONTH: return this._day;
                case ChronoField.MONTH_OF_YEAR: return this._month;
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.getFrom(this);
    }
    //-----------------------------------------------------------------------
    /**
     * Checks if the year is valid for this month-day.
     *
     * This method checks whether this month and day and the input year form
     * a valid date. This can only return false for February 29th.
     *
     * @param {number} year  the year to validate, an out of range value returns false
     * @return {boolean} true if the year is valid for this month-day
     * @see Year#isValidMonthDay(MonthDay)
     */
    isValidYear(year) {
        return (this._day === 29 && this._month === 2 && Year.isLeap(year) === false) === false;
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link MonthDay} with the month-of-year altered.
     *
     * This returns a month-day with the specified month.
     * If the day-of-month is invalid for the specified month, the day will
     * be adjusted to the last valid day-of-month.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} month  the month-of-year to set in the returned month-day, from 1 (January) to 12 (December)
     * @return {MonthDay} based on this month-day with the requested month, not null
     * @throws DateTimeException if the month-of-year value is invalid
     */
    withMonth(month) {
        return this.with(Month.of(month));
    }

    /**
    * Returns a copy of this {@link MonthDay} with the month-of-year altered.
    *
    * This returns a month-day with the specified month.
    * If the day-of-month is invalid for the specified month, the day will
    * be adjusted to the last valid day-of-month.
    *
    * This instance is immutable and unaffected by this method call.
    *
    * @param {Month} month  the month-of-year to set in the returned month-day, not null
    * @return {MonthDay} based on this month-day with the requested month, not null
    */
    with(month) {
        requireNonNull(month, 'month');
        if (month.value() === this._month) {
            return this;
        }
        const day = Math.min(this._day, month.maxLength());
        return new MonthDay(month.value(), day);
    }

    /**
     * Returns a copy of this {@link MonthDay} with the day-of-month altered.
     *
     * This returns a month-day with the specified day-of-month.
     * If the day-of-month is invalid for the month, an exception is thrown.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} dayOfMonth  the day-of-month to set in the return month-day, from 1 to 31
     * @return {MonthDay} based on this month-day with the requested day, not null
     * @throws DateTimeException if the day-of-month value is invalid
     * @throws DateTimeException if the day-of-month is invalid for the month
     */
    withDayOfMonth(dayOfMonth) {
        if (dayOfMonth === this._day) {
            return this;
        }
        return MonthDay.of(this._month, dayOfMonth);
    }

    //-----------------------------------------------------------------------
    /**
     * Queries this month-day using the specified query.
     *
     * This queries this month-day using the specified query strategy object.
     * The {@link TemporalQuery} object defines the logic to be used to
     * obtain the result. Read the documentation of the query to understand
     * what the result of this method will be.
     *
     * The result of this method is obtained by invoking the
     * {@link TemporalQuery#queryFrom} method on the
     * specified query passing `this` as the argument.
     *
     * @param {TemporalQuery} query  the query to invoke, not null
     * @return {*} the query result, null may be returned (defined by the query)
     * @throws DateTimeException if unable to query (defined by the query)
     * @throws ArithmeticException if numeric overflow occurs (defined by the query)
     */
    query(query) {
        requireNonNull(query, 'query');
        requireInstance(query, TemporalQuery, 'query');
        if (query === TemporalQueries.chronology()) {
            return IsoChronology.INSTANCE;
        }
        return super.query(query);
    }

    /**
     * Adjusts the specified temporal object to have this month-day.
     *
     * This returns a temporal object of the same observable type as the input
     * with the month and day-of-month changed to be the same as this.
     *
     * The adjustment is equivalent to using {@link Temporal#with}
     * twice, passing {@link ChronoField#MONTH_OF_YEAR} and
     * {@link ChronoField#DAY_OF_MONTH} as the fields.
     * If the specified temporal object does not use the ISO calendar system then
     * a {@link DateTimeException} is thrown.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisMonthDay.adjustInto(temporal);
     *   temporal = temporal.with(thisMonthDay);
     * </pre>
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {Temporal} temporal  the target object to be adjusted, not null
     * @return {Temporal} the adjusted object, not null
     * @throws DateTimeException if unable to make the adjustment
     * @throws ArithmeticException if numeric overflow occurs
     */
    adjustInto(temporal) {
        requireNonNull(temporal, 'temporal');
        /* TODO: only IsoChronology for now
        if (Chronology.from(temporal).equals(IsoChronology.INSTANCE) == false) {
            throw new DateTimeException("Adjustment only supported on ISO date-time");
        }*/
        temporal = temporal.with(ChronoField.MONTH_OF_YEAR, this._month);
        return temporal.with(ChronoField.DAY_OF_MONTH, Math.min(temporal.range(ChronoField.DAY_OF_MONTH).maximum(), this._day));
    }

    //-----------------------------------------------------------------------
    /**
     * Combines this month-day with a year to create a {@link LocalDate}.
     *
     * This returns a {@link LocalDate} formed from this month-day and the specified year.
     *
     * A month-day of February 29th will be adjusted to February 28th in the resulting
     * date if the year is not a leap year.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} year  the year to use, from MIN_YEAR to MAX_YEAR
     * @return {LocalDate} the local date formed from this month-day and the specified year, not null
     * @throws DateTimeException if the year is outside the valid range of years
     */
    atYear(year) {
        return LocalDate.of(year, this._month, this.isValidYear(year) ? this._day : 28);
    }
    //-----------------------------------------------------------------------
    /**
     * Compares this month-day to another month-day.
     *
     * The comparison is based first on value of the month, then on the value of the day.
     * It is "consistent with equals", as defined by {@link Comparable}.
     *
     * @param {MonthDay} other  the other month-day to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, MonthDay, 'other');
        let cmp = (this._month - other.monthValue());
        if (cmp === 0) {
            cmp = (this._day - other.dayOfMonth());
        }
        return cmp;
    }

    /**
     * Is this month-day after the specified month-day.
     *
     * @param {MonthDay} other  the other month-day to compare to, not null
     * @return {boolean} true if this is after the specified month-day
     */
    isAfter(other) {
        requireNonNull(other, 'other');
        requireInstance(other, MonthDay, 'other');
        return this.compareTo(other) > 0;
    }

    /**
     * Is this month-day before the specified month-day.
     *
     * @param {MonthDay} other  the other month-day to compare to, not null
     * @return {boolean} true if this point is before the specified month-day
     */
    isBefore(other) {
        requireNonNull(other, 'other');
        requireInstance(other, MonthDay, 'other');
        return this.compareTo(other) < 0;
    }


    //-----------------------------------------------------------------------
    /**
     * Checks if this month-day is equal to another month-day.
     *
     * The comparison is based on the time-line position of the month-day within a year.
     *
     * @param {*} obj  the object to check, null returns false
     * @return {boolean} true if this is equal to the other month-day
     */
    equals(obj) {
        if (this === obj) {
            return true;
        }
        if (obj instanceof MonthDay) {
            const other = obj;
            return this.monthValue() === other.monthValue() && this.dayOfMonth() === other.dayOfMonth();
        }
        return false;
    }
    //-----------------------------------------------------------------------
    /**
     * Outputs this month-day as a string, such as `--12-03`.
     *
     * The output will be in the format `--MM-dd`:
     *
     * @return {String} a string representation of this month-day, not null
     */
    toString() {
        return `--${
            this._month < 10 ? '0' : ''}${this._month
        }${this._day < 10 ? '-0' : '-'}${this._day}`;
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
     * Outputs this month-day as a string using the formatter.
     *
     * This month-day will be passed to the formatter
     * print method (see {@link DateTimeFormatter#format}).
     *
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return {String} the formatted month-day string, not null
     * @throws DateTimeException if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        requireInstance(formatter, DateTimeFormatter, 'formatter');
        return formatter.format(this);
    }

}

let PARSER;

export function _init() {
    PARSER = new DateTimeFormatterBuilder()
        .appendLiteral('--')
        .appendValue(ChronoField.MONTH_OF_YEAR, 2)
        .appendLiteral('-')
        .appendValue(ChronoField.DAY_OF_MONTH, 2)
        .toFormatter();

    MonthDay.FROM = createTemporalQuery('MonthDay.FROM', (temporal) => {
        return MonthDay.from(temporal);
    });
}
