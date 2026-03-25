/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { MathUtil } from './MathUtil';
import { requireNonNull, requireInstance } from './assert';
import { DateTimeException, UnsupportedTemporalTypeException } from './errors';

import { Clock } from './Clock';
import { Instant } from './Instant';
import { LocalDate } from './LocalDate';
import { LocalTime } from './LocalTime';
import { OffsetDateTime } from './OffsetDateTime';
import { ZonedDateTime } from './ZonedDateTime';
import { ZoneId } from './ZoneId';
import { ZoneOffset } from './ZoneOffset';


import { DateTimeFormatter } from './format/DateTimeFormatter';
import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { TemporalQueries } from './temporal/TemporalQueries';
import { createTemporalQuery } from './temporal/TemporalQuery';

import { ChronoLocalDateTime } from './chrono/ChronoLocalDateTime';

/**
 * A date-time without a time-zone in the ISO-8601 calendar system,
 * such as `2007-12-03T10:15:30`.
 *
 * {@link LocalDateTime} is an immutable date-time object that represents a date-time,
 * often viewed as year-month-day-hour-minute-second. Other date and time fields,
 * such as day-of-year, day-of-week and week-of-year, can also be accessed.
 * Time is represented to nanosecond precision.
 * For example, the value '2nd October 2007 at 13:45.30.123456789' can be
 * stored in a {@link LocalDateTime}.
 *
 * This class does not store or represent a time-zone.
 * Instead, it is a description of the date, as used for birthdays, combined with
 * the local time as seen on a wall clock.
 * It cannot represent an instant on the time-line without additional information
 * such as an offset or time-zone.
 *
 * The ISO-8601 calendar system is the modern civil calendar system used today
 * in most of the world. It is equivalent to the proleptic Gregorian calendar
 * system, in which today's rules for leap years are applied for all time.
 * For most applications written today, the ISO-8601 rules are entirely suitable.
 * However, any application that makes use of historical dates, and requires them
 * to be accurate will find the ISO-8601 approach unsuitable.
 *
 * ### Static properties of Class {@link LocalTime}
 *
 * LocalDateTime.MIN
 *
 * The minimum supported {@link LocalDateTime}, '-999999999-01-01T00:00:00'.
 * This is the local date-time of midnight at the start of the minimum date.
 * This combines {@link LocalDate#MIN} and {@link LocalTime#MIN}.
 * This could be used by an application as a 'far past' date-time.
 *
 * LocalDateTime.MAX
 *
 * The maximum supported {@link LocalDateTime}, '+999999999-12-31T23:59:59.999999999'.
 * This is the local date-time just before midnight at the end of the maximum date.
 * This combines {@link LocalDate#MAX} and {@link LocalTime#MAX}.
 * This could be used by an application as a 'far future' date-time.
 *
 */
export class LocalDateTime extends ChronoLocalDateTime
/** extends ChronoLocalDateTime<LocalDate>
implements Temporal, TemporalAdjuster, Serializable */ {


    /**
     * Obtains the current date-time from from the specified clock or the system clock in the specified time-zone.
     *
     * If the argument is an instance of Clock this will query the specified clock to obtain the current date-time.
     * Using this method allows the use of an alternate clock for testing.
     * The alternate clock may be introduced using dependency injection.
     *
     * If the argument is an instance of ZoneId this will query the system clock (see {@link Clock#system}) to obtain the current date-time.
     * Specifying the time-zone avoids dependence on the default time-zone.
     *
     * If nor argument is applied, the system default time zone is used to obtain the current date-time.
     *
     * Using this method will prevent the ability to use an alternate clock for testing
     * because the clock is hard-coded.
     *
     * @param {Clock|ZoneId} clockOrZone - the zone ID or clock to use, if null Clock.systemDefaultZone() is used.
     * @return {LocalDateTime} the current date-time using the system clock, not null
     */
    static now(clockOrZone) {
        if (clockOrZone == null){
            return LocalDateTime._now(Clock.systemDefaultZone());
        } else if (clockOrZone instanceof Clock){
            return LocalDateTime._now(clockOrZone);
        } else {
            return LocalDateTime._now(Clock.system(clockOrZone));
        }
    }

    /**
     * Obtains the current date-time from the specified clock.
     *
     * This will query the specified clock to obtain the current date-time.
     * Using this method allows the use of an alternate clock for testing.
     * The alternate clock may be introduced using dependency injection.
     *
     * @param {Clock} clock - the clock to use, defaults to Clock.systemDefaultZone()
     * @return {LocalDateTime} the current date-time, not null
     */
    static _now(clock) {
        requireNonNull(clock, 'clock');
        return LocalDateTime.ofInstant(clock.instant(), clock.zone());

        // this is an alternative implementation with better performance.
        // const epochMilli = clock.millis();
        // const offset = clock.zone().rules().offsetOfEpochMilli(epochMilli);
        // return LocalDateTime._ofEpochMillis(epochMilli, offset);

    }

    /**
     * @see comment at {LocalDateTime._now}
     * @param {number} epochMilli
     * @param {ZoneOffset} offset
     * @return {LocalDateTime} the  date-time, not null
     *
     */
    static _ofEpochMillis(epochMilli, offset){
        const localSecond = MathUtil.floorDiv(epochMilli, 1000) + offset.totalSeconds();
        const localEpochDay = MathUtil.floorDiv(localSecond, LocalTime.SECONDS_PER_DAY);
        const secsOfDay = MathUtil.floorMod(localSecond, LocalTime.SECONDS_PER_DAY);
        const nanoOfSecond = MathUtil.floorMod(epochMilli, 1000) * 1000000;
        const date = LocalDate.ofEpochDay(localEpochDay);
        const time = LocalTime.ofSecondOfDay(secsOfDay, nanoOfSecond);
        return new LocalDateTime(date, time);

    }

    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link LocalDateTime.of}
     *
     * if called with 2 arguments and first argument is an instance of LocalDate and second is an
     * instance of LocalTime, then {@link LocalDateTime.ofDateAndTime} is executed.
     *
     * Otherwise {@link LocalDateTime.ofNumbers} is executed.
     *
     * @returns {LocalDateTime}
     */
    static of(){
        if (arguments.length <= 2){
            return LocalDateTime.ofDateAndTime.apply(this, arguments);
        } else {
            return LocalDateTime.ofNumbers.apply(this, arguments);
        }
    }
    /**
     * Obtains an instance of {@link LocalDateTime} from year, month,
     * day, hour, minute, second and nanosecond.
     *
     * The day must be valid for the year and month, otherwise an exception will be thrown.
     *
     * @param {number} [year] - the year to represent, from MIN_YEAR to MAX_YEAR
     * @param {number} [month] - the month-of-year to represent, from 1 to 12 or from a Month
     * @param {number} [dayOfMonth] - the day-of-month to represent, from 1 to 31
     * @param {number} [hour=0] - the hour-of-day to represent, from 0 to 23
     * @param {number} [minute=0] - the minute-of-hour to represent, from 0 to 59
     * @param {number} [second=0] - the second-of-minute to represent, from 0 to 59
     * @param {number} [nanoOfSecond=0] - the nano-of-second to represent, from 0 to 999,999,999
     * @return {LocalDateTime} the local date-time, not null
     * @throws {DateTimeException} if the value of any field is out of range
     * @throws {DateTimeException} if the day-of-month is invalid for the month-year
     */
    static ofNumbers(year, month, dayOfMonth, hour=0, minute=0, second=0, nanoOfSecond=0) {
        const date = LocalDate.of(year, month, dayOfMonth);
        const time = LocalTime.of(hour, minute, second, nanoOfSecond);
        return new LocalDateTime(date, time);
    }

    /**
     * Obtains an instance of {@link LocalDateTime} from a date and time.
     *
     * @param {!LocalDate} date - the local date, not null
     * @param {!LocalTime} time - the local time, not null
     * @return {LocalDateTime} the local date-time, not null
     */
    static ofDateAndTime(date, time) {
        requireNonNull(date, 'date');
        requireNonNull(time, 'time');
        return new LocalDateTime(date, time);
    }

    //-------------------------------------------------------------------------
    /**
     * Obtains an instance of {@link LocalDateTime} from an {@link Instant} and zone ID.
     *
     * This creates a local date-time based on the specified instant.
     * First, the offset from UTC/Greenwich is obtained using the zone ID and instant,
     * which is simple as there is only one valid offset for each instant.
     * Then, the instant and offset are used to calculate the local date-time.
     *
     * @param {!Instant} instant  the instant to create the date-time from, not null
     * @param {!ZoneId} [zone=ZoneId.systemDefault()]  the time-zone, which may be an offset, defaults to ZoneId.systemDefault()
     * @return {LocalDateTime} the local date-time, not null
     * @throws {DateTimeException} if the result exceeds the supported range
     */
    static ofInstant(instant, zone=ZoneId.systemDefault()) {
        requireNonNull(instant, 'instant');
        requireInstance(instant, Instant, 'instant');
        requireNonNull(zone, 'zone');
        const offset = zone.rules().offset(instant);
        return LocalDateTime.ofEpochSecond(instant.epochSecond(), instant.nano(), offset);
    }

    /**
     * Obtains an instance of {@link LocalDateTime} using seconds from the
     * epoch of 1970-01-01T00:00:00Z.
     *
     * This allows the {@link ChronoField.INSTANT_SECONDS} epoch-second field
     * to be converted to a local date-time. This is primarily intended for
     * low-level conversions rather than general application usage.
     *
     * @param {number} epochSecond - the number of seconds from the epoch of 1970-01-01T00:00:00Z
     * @param {number|!ZoneOffset} nanoOfSecond - the nanosecond within the second, from 0 to 999,999,999
     * @param {ZoneOffset} offset - the zone offset, not null if called with 3 arguments
     * @return {LocalDateTime} the local date-time, not null
     * @throws {DateTimeException} if the result exceeds the supported range
     */
    static ofEpochSecond(epochSecond=0, nanoOfSecond=0, offset) {
        if(arguments.length === 2 && nanoOfSecond instanceof ZoneOffset){
            offset = nanoOfSecond;
            nanoOfSecond = 0;
        }
        requireNonNull(offset, 'offset');
        const localSecond = epochSecond + offset.totalSeconds();  // overflow caught later
        const localEpochDay = MathUtil.floorDiv(localSecond, LocalTime.SECONDS_PER_DAY);
        const secsOfDay = MathUtil.floorMod(localSecond, LocalTime.SECONDS_PER_DAY);
        const date = LocalDate.ofEpochDay(localEpochDay);
        const time = LocalTime.ofSecondOfDay(secsOfDay, nanoOfSecond);
        return new LocalDateTime(date, time);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@link LocalDateTime} from a temporal object.
     *
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link LocalDateTime}.
     *
     * The conversion extracts and combines {@link LocalDate} and {@link LocalTime}.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used as a query via method reference, {@link LocalDateTime::from}.
     *
     * @param {!TemporalAccessor} temporal - the temporal object to convert, not null
     * @return {LocalDateTime} {LocalDateTime} the local date-time, not null
     * @throws {DateTimeException} if unable to convert to a {@link LocalDateTime}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        if (temporal instanceof LocalDateTime) {
            return temporal;
        } else if (temporal instanceof ZonedDateTime) {
            return temporal.toLocalDateTime();
        }
        try {
            const date = LocalDate.from(temporal);
            const time = LocalTime.from(temporal);
            return new LocalDateTime(date, time);
        } catch (ex) {
            throw new DateTimeException(`Unable to obtain LocalDateTime TemporalAccessor: ${temporal}, type ${temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@link LocalDateTime} from a text string using a specific formatter.
     *
     * The text is parsed using the formatter, returning a date-time.
     *
     * @param {!string} text - the text to parse, not null
     * @param {DateTimeFormatter} [formatter=DateTimeFormatter.ISO_LOCAL_DATE_TIME] - the formatter to use,
     * defaults to DateTimeFormatter.ISO_LOCAL_DATE_TIME
     * @return {LocalDateTime} the parsed local date-time, not null
     * @throws {DateTimeParseException} if the text cannot be parsed
     */
    static parse(text, formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME) {
        requireNonNull(formatter, 'formatter');
        return formatter.parse(text, LocalDateTime.FROM);
    }

    //-----------------------------------------------------------------------
    /**
     * Constructor.
     *
     * @param {LocalDate} date - the date part of the date-time, validated not null
     * @param {LocalTime} time - the time part of the date-time, validated not null
     * @private
     */
    constructor(date, time) {
        super();
        requireInstance(date, LocalDate, 'date');
        requireInstance(time, LocalTime, 'time');
        this._date = date;
        this._time = time;
    }

    /**
     * Returns a copy of this date-time with the new date and time, checking
     * to see if a new object is in fact required.
     *
     * @param {LocalDate} newDate - the date of the new date-time, not null
     * @param {LocalTime} newTime - the time of the new date-time, not null
     * @return {LocalDateTime} the date-time, not null
     */
    _withDateTime(newDate, newTime) {
        if (this._date.equals(newDate) && this._time.equals(newTime)) {
            return this;
        }
        return new LocalDateTime(newDate, newTime);
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if the specified field is supported.
     *
     * This checks if this date-time can be queried for the specified field.
     * If false, then calling the {@link LocalDateTime.range} range and
     * {@link LocalDateTime.get} get methods will throw an exception.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields are:
     *
     * * {@link ChronoField.NANO_OF_SECOND}
     * * {@link ChronoField.NANO_OF_DAY}
     * * {@link ChronoField.MICRO_OF_SECOND}
     * * {@link ChronoField.MICRO_OF_DAY}
     * * {@link ChronoField.MILLI_OF_SECOND}
     * * {@link ChronoField.MILLI_OF_DAY}
     * * {@link ChronoField.SECOND_OF_MINUTE}
     * * {@link ChronoField.SECOND_OF_DAY}
     * * {@link ChronoField.MINUTE_OF_HOUR}
     * * {@link ChronoField.MINUTE_OF_DAY}
     * * {@link ChronoField.HOUR_OF_AMPM}
     * * {@link ChronoField.CLOCK_HOUR_OF_AMPM}
     * * {@link ChronoField.HOUR_OF_DAY}
     * * {@link ChronoField.CLOCK_HOUR_OF_DAY}
     * * {@link ChronoField.AMPM_OF_DAY}
     * * {@link ChronoField.DAY_OF_WEEK}
     * * {@link ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH}
     * * {@link ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR}
     * * {@link ChronoField.DAY_OF_MONTH}
     * * {@link ChronoField.DAY_OF_YEAR}
     * * {@link ChronoField.EPOCH_DAY}
     * * {@link ChronoField.ALIGNED_WEEK_OF_MONTH}
     * * {@link ChronoField.ALIGNED_WEEK_OF_YEAR}
     * * {@link ChronoField.MONTH_OF_YEAR}
     * * {@link ChronoField.EPOCH_MONTH}
     * * {@link ChronoField.YEAR_OF_ERA}
     * * {@link ChronoField.YEAR}
     * * {@link ChronoField.ERA}
     *
     * All other {@link ChronoField} instances will return false.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.isSupportedBy}
     * passing `this` as the argument.
     * Whether the field is supported is determined by the field.
     *
     * @param {TemporalField|TemporalUnit} fieldOrUnit - the field to check, null returns false
     * @return {boolean} true if the field is supported on this date-time, false if not
     */
    isSupported(fieldOrUnit) {
        if (fieldOrUnit instanceof ChronoField) {
            return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
        } else if (fieldOrUnit instanceof ChronoUnit) {
            return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
        }
        return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
    }

    /**
     * Gets the range of valid values for the specified field.
     *
     * The range object expresses the minimum and maximum valid values for a field.
     * This date-time is used to enhance the accuracy of the returned range.
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
     * @param {!TemporalField} field - the field to query the range for, not null
     * @return {ValueRange} the range of valid values for the field, not null
     * @throws {DateTimeException} if the range for the field cannot be obtained
     */
    range(field) {
        if (field instanceof ChronoField) {
            return (field.isTimeBased() ? this._time.range(field) : this._date.range(field));
        }
        return field.rangeRefinedBy(this);
    }

    /**
     * Gets the value of the specified field from this date-time as an `int`.
     *
     * This queries this date-time for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this date-time, except {@link NANO_OF_DAY}, {@link MICRO_OF_DAY},
     * {@link EPOCH_DAY} and {@link EPOCH_MONTH} which are too large to fit in
     * an `int` and throw a {@link DateTimeException}.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {!TemporalField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws {DateTimeException} if a value for the field cannot be obtained
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    get(field) {
        if (field instanceof ChronoField) {
            return (field.isTimeBased() ? this._time.get(field) : this._date.get(field));
        }
        return super.get(field);
    }

    /**
     * Gets the value of the specified field from this date-time as a `long`.
     *
     * This queries this date-time for the value for the specified field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this date-time.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {!TemporalField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws {DateTimeException} if a value for the field cannot be obtained
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    getLong(field) {
        requireNonNull(field, 'field');
        if (field instanceof ChronoField) {
            return (field.isTimeBased() ? this._time.getLong(field) : this._date.getLong(field));
        }
        return field.getFrom(this);
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the year field.
     *
     * This method returns the primitive `int` value for the year.
     *
     * The year returned by this method is proleptic as per `get(YEAR)`.
     * To obtain the year-of-era, use `get(YEAR_OF_ERA)`.
     *
     * @return {number} the year, from MIN_YEAR to MAX_YEAR
     */
    year() {
        return this._date.year();
    }

    /**
     * Gets the month-of-year field from 1 to 12.
     *
     * This method returns the month as an `int` from 1 to 12.
     * Application code is frequently clearer if the enum {@link Month}
     * is used by calling {@link getMonth}.
     *
     * @return {number} the month-of-year, from 1 to 12
     * @see #getMonth()
     */
    monthValue() {
        return this._date.monthValue();
    }

    /**
     * Gets the month-of-year field using the {@link Month} enum.
     *
     * This method returns the enum {@link Month} for the month.
     * This avoids confusion as to what `int` values mean.
     * If you need access to the primitive `int` value, use
     * {@link Month#getValue}.
     *
     * @return {Month} the month-of-year, not null
     * @see #getMonthValue()
     */
    month() {
        return this._date.month();
    }

    /**
     * Gets the day-of-month field.
     *
     * This method returns the primitive `int` value for the day-of-month.
     *
     * @return {number} the day-of-month, from 1 to 31
     */
    dayOfMonth() {
        return this._date.dayOfMonth();
    }

    /**
     * Gets the day-of-year field.
     *
     * This method returns the primitive `int` value for the day-of-year.
     *
     * @return {number} the day-of-year, from 1 to 365, or 366 in a leap year
     */
    dayOfYear() {
        return this._date.dayOfYear();
    }

    /**
     * Gets the day-of-week field, which is an enum {@link DayOfWeek}.
     *
     * This method returns the enum {@link DayOfWeek} for the day-of-week.
     * This avoids confusion as to what `int` values mean.
     * If you need access to the primitive `int` value, use
     * {@link DayOfWeek#getValue}.
     *
     * Additional information can be obtained from the {@link DayOfWeek}.
     * This includes textual names of the values.
     *
     * @return {DayOfWeek} the day-of-week, not null
     */
    dayOfWeek() {
        return this._date.dayOfWeek();
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the hour-of-day field.
     *
     * @return {number} the hour-of-day, from 0 to 23
     */
    hour() {
        return this._time.hour();
    }

    /**
     * Gets the minute-of-hour field.
     *
     * @return {number} the minute-of-hour, from 0 to 59
     */
    minute() {
        return this._time.minute();
    }

    /**
     * Gets the second-of-minute field.
     *
     * @return {number} the second-of-minute, from 0 to 59
     */
    second() {
        return this._time.second();
    }

    /**
     * Gets the nano-of-second field.
     *
     * @return {number} the nano-of-second, from 0 to 999,999,999
     */
    nano() {
        return this._time.nano();
    }

    //-----------------------------------------------------------------------

    /**
     * Returns an adjusted copy of this date-time.
     *
     * This returns a new {@link LocalDateTime}, based on this one, with the date-time adjusted.
     * The adjustment takes place using the specified adjuster strategy object.
     * Read the documentation of the adjuster to understand what adjustment will be made.
     *
     * A simple adjuster might simply set the one of the fields, such as the year field.
     * A more complex adjuster might set the date to the last day of the month.
     * A selection of common adjustments is provided in {@link TemporalAdjusters}.
     * These include finding the 'last day of the month' and 'next Wednesday'.
     * Key date-time classes also implement the {@link TemporalAdjuster} interface,
     * such as {@link Month} and {@link MonthDay}.
     * The adjuster is responsible for handling special cases, such as the varying
     * lengths of month and leap years.
     *
     * For example this code returns a date on the last day of July:
     * <pre>
     *  import static org.threeten.bp.Month.*;
     *  import static org.threeten.bp.temporal.Adjusters.*;
     *
     *  result = localDateTime.with(JULY).with(lastDayOfMonth());
     * </pre>
     *
     * The classes {@link LocalDate} and {@link LocalTime} implement {@link TemporalAdjuster},
     * thus this method can be used to change the date, time or offset:
     * <pre>
     *  result = localDateTime.with(date);
     *  result = localDateTime.with(time);
     * </pre>
     *
     * The result of this method is obtained by invoking the
     * {@link TemporalAdjuster#adjustInto} method on the
     * specified adjuster passing `this` as the argument.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAdjuster} adjuster the adjuster to use, not null
     * @return {LocalDateTime} a {@link LocalDateTime} based on `this` with the adjustment made, not null
     * @throws {DateTimeException} if the adjustment cannot be made
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    _withAdjuster(adjuster) {
        requireNonNull(adjuster, 'adjuster');
        // optimizations
        if (adjuster instanceof LocalDate) {
            return this._withDateTime(adjuster, this._time);
        } else if (adjuster instanceof LocalTime) {
            return this._withDateTime(this._date, adjuster);
        } else if (adjuster instanceof LocalDateTime) {
            return adjuster;
        }
        return super._withAdjuster(adjuster);
    }

    /**
     * Returns a copy of this date-time with the specified field set to a new value.
     *
     * This returns a new {@link LocalDateTime}, based on this one, with the value
     * for the specified field changed.
     * This can be used to change any supported field, such as the year, month or day-of-month.
     * If it is not possible to set the value, because the field is not supported or for
     * some other reason, an exception is thrown.
     *
     * In some cases, changing the specified field can cause the resulting date-time to become invalid,
     * such as changing the month from 31st January to February would make the day-of-month invalid.
     * In cases like this, the field is responsible for resolving the date. Typically it will choose
     * the previous valid date, which would be the last valid day of February in this example.
     *
     * If the field is a {@link ChronoField} then the adjustment is implemented here.
     * The supported fields (see {@link isSupported}) will behave as in
     * {@link LocalDate#with} or {@link LocalTime#with}.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.adjustInto}
     * passing `this` as the argument. In this case, the field determines
     * whether and how to adjust the instant.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalField} field - the field to set in the result, not null
     * @param {number} newValue - the new value of the field in the result
     * @return {LocalDateTime} a {@link LocalDateTime} based on `this` with the specified field set, not null
     * @throws {DateTimeException} if the field cannot be set
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    _withField(field, newValue) {
        requireNonNull(field, 'field');
        if (field instanceof ChronoField) {
            if (field.isTimeBased()) {
                return this._withDateTime(this._date, this._time.with(field, newValue));
            } else {
                return this._withDateTime(this._date.with(field, newValue), this._time);
            }
        }
        return field.adjustInto(this, newValue);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the year altered.
     * The time does not affect the calculation and will be the same in the result.
     * If the day-of-month is invalid for the year, it will be changed to the last valid day of the month.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} year - the year to set in the result, from MIN_YEAR to MAX_YEAR
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the requested year, not null
     * @throws {DateTimeException} if the year value is invalid
     */
    withYear(year) {
        return this._withDateTime(this._date.withYear(year), this._time);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the month-of-year altered.
     * The time does not affect the calculation and will be the same in the result.
     * If the day-of-month is invalid for the year, it will be changed to the last valid day of the month.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {!(number|Month)} month - the month-of-year to set in the result, from 1 (January) to 12 (December)
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the requested month, not null
     * @throws {DateTimeException} if the month-of-year value is invalid
     */
    withMonth(month) {
        return this._withDateTime(this._date.withMonth(month), this._time);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the day-of-month altered.
     * If the resulting {@link LocalDateTime} is invalid, an exception is thrown.
     * The time does not affect the calculation and will be the same in the result.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} dayOfMonth - the day-of-month to set in the result, from 1 to 28-31
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the requested day, not null
     * @throws {DateTimeException} if the day-of-month value is invalid
     * @throws {DateTimeException} if the day-of-month is invalid for the month-year
     */
    withDayOfMonth(dayOfMonth) {
        return this._withDateTime(this._date.withDayOfMonth(dayOfMonth), this._time);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the day-of-year altered.
     * If the resulting {@link LocalDateTime} is invalid, an exception is thrown.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} dayOfYear - the day-of-year to set in the result, from 1 to 365-366
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date with the requested day, not null
     * @throws {DateTimeException} if the day-of-year value is invalid
     * @throws {DateTimeException} if the day-of-year is invalid for the year
     */
    withDayOfYear(dayOfYear) {
        return this._withDateTime(this._date.withDayOfYear(dayOfYear), this._time);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the hour-of-day value altered.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} hour - the hour-of-day to set in the result, from 0 to 23
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the requested hour, not null
     * @throws {DateTimeException} if the hour value is invalid
     */
    withHour(hour) {
        const newTime = this._time.withHour(hour);
        return this._withDateTime(this._date, newTime);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the minute-of-hour value altered.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} minute - the minute-of-hour to set in the result, from 0 to 59
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the requested minute, not null
     * @throws {DateTimeException} if the minute value is invalid
     */
    withMinute(minute) {
        const newTime = this._time.withMinute(minute);
        return this._withDateTime(this._date, newTime);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the second-of-minute value altered.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} second - the second-of-minute to set in the result, from 0 to 59
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the requested second, not null
     * @throws {DateTimeException} if the second value is invalid
     */
    withSecond(second) {
        const newTime = this._time.withSecond(second);
        return this._withDateTime(this._date, newTime);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the nano-of-second value altered.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} nanoOfSecond - the nano-of-second to set in the result, from 0 to 999,999,999
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the requested nanosecond, not null
     * @throws {DateTimeException} if the nano value is invalid
     */
    withNano(nanoOfSecond) {
        const newTime = this._time.withNano(nanoOfSecond);
        return this._withDateTime(this._date, newTime);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the time truncated.
     *
     * Truncation returns a copy of the original date-time with fields
     * smaller than the specified unit set to zero.
     * For example, truncating with {@link ChronoUnit#MINUTES}
     * will set the second-of-minute and nano-of-second field to zero.
     *
     * The unit must have a duration (see {@link TemporalUnit#getDuration})
     * that divides into the length of a standard day without remainder.
     * This includes all supplied time units on {@link ChronoUnit} and
     * {@link ChronoUnit#DAYS}. Other units throw an exception.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalUnit} unit - the unit to truncate to, not null
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the time truncated, not null
     * @throws {DateTimeException} if unable to truncate
     */
    truncatedTo(unit) {
        return this._withDateTime(this._date, this._time.truncatedTo(unit));
    }

    //-----------------------------------------------------------------------

    /**
     * Returns a copy of this date-time with the specified period added.
     *
     * This method returns a new date-time based on this date-time with the specified period added.
     * This can be used to add any period that is defined by a unit, for example to add years, months or days.
     * The unit is responsible for the details of the calculation, including the resolution
     * of any edge cases in the calculation.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} amountToAdd - the amount of the unit to add to the result, may be negative
     * @param {!TemporalUnit} unit - the unit of the period to add, not null
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the specified period added, not null
     * @throws {DateTimeException} if the unit cannot be added to this type
     */
    _plusUnit(amountToAdd, unit) {
        requireNonNull(unit, 'unit');
        if (unit instanceof ChronoUnit) {
            switch (unit) {
                case ChronoUnit.NANOS: return this.plusNanos(amountToAdd);
                case ChronoUnit.MICROS: return this.plusDays(MathUtil.intDiv(amountToAdd, LocalTime.MICROS_PER_DAY)).plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MICROS_PER_DAY) * 1000);
                case ChronoUnit.MILLIS: return this.plusDays(MathUtil.intDiv(amountToAdd, LocalTime.MILLIS_PER_DAY)).plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MILLIS_PER_DAY) * 1000000);
                case ChronoUnit.SECONDS: return this.plusSeconds(amountToAdd);
                case ChronoUnit.MINUTES: return this.plusMinutes(amountToAdd);
                case ChronoUnit.HOURS: return this.plusHours(amountToAdd);
                case ChronoUnit.HALF_DAYS: return this.plusDays(MathUtil.intDiv(amountToAdd, 256)).plusHours(MathUtil.intMod(amountToAdd, 256) * 12);  // no overflow (256 is multiple of 2)
            }
            return this._withDateTime(this._date.plus(amountToAdd, unit), this._time);
        }
        return unit.addTo(this, amountToAdd);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in years added.
     *
     * This method adds the specified amount to the years field in three steps:
     *
     * 1. Add the input years to the year field
     * 2. Check if the resulting date would be invalid
     * 3. Adjust the day-of-month to the last valid day if necessary
     *
     * For example, 2008-02-29 (leap year) plus one year would result in the
     * invalid date 2009-02-29 (standard year). Instead of returning an invalid
     * result, the last valid day of the month, 2009-02-28, is selected instead.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} years - the years to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the years added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusYears(years) {
        const newDate = this._date.plusYears(years);
        return this._withDateTime(newDate, this._time);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in months added.
     *
     * This method adds the specified amount to the months field in three steps:
     *
     * 1. Add the input months to the month-of-year field
     * 2. Check if the resulting date would be invalid
     * 3. Adjust the day-of-month to the last valid day if necessary
     *
     * For example, 2007-03-31 plus one month would result in the invalid date
     * 2007-04-31. Instead of returning an invalid result, the last valid day
     * of the month, 2007-04-30, is selected instead.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} months - the months to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the months added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusMonths(months) {
        const newDate = this._date.plusMonths(months);
        return this._withDateTime(newDate, this._time);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in weeks added.
     *
     * This method adds the specified amount in weeks to the days field incrementing
     * the month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2008-12-31 plus one week would result in 2009-01-07.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} weeks - the weeks to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the weeks added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusWeeks(weeks) {
        const newDate = this._date.plusWeeks(weeks);
        return this._withDateTime(newDate, this._time);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in days added.
     *
     * This method adds the specified amount to the days field incrementing the
     * month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2008-12-31 plus one day would result in 2009-01-01.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} days - the days to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the days added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusDays(days) {
        const newDate = this._date.plusDays(days);
        return this._withDateTime(newDate, this._time);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in hours added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} hours - the hours to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the hours added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusHours(hours) {
        return this._plusWithOverflow(this._date, hours, 0, 0, 0, 1);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in minutes added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} minutes - the minutes to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the minutes added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusMinutes(minutes) {
        return this._plusWithOverflow(this._date, 0, minutes, 0, 0, 1);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in seconds added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} seconds - the seconds to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the seconds added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusSeconds(seconds) {
        return this._plusWithOverflow(this._date, 0, 0, seconds, 0, 1);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in nanoseconds added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} nanos - the nanos to add, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the nanoseconds added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusNanos(nanos) {
        return this._plusWithOverflow(this._date, 0, 0, 0, nanos, 1);
    }

    //-----------------------------------------------------------------------

    /**
     * Returns a copy of this date-time with the specified period subtracted.
     *
     * This method returns a new date-time based on this date-time with the specified period subtracted.
     * This can be used to subtract any period that is defined by a unit, for example to subtract years, months or days.
     * The unit is responsible for the details of the calculation, including the resolution
     * of any edge cases in the calculation.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} amountToSubtract - the amount of the unit to subtract from the result, may be negative
     * @param {TemporalUnit} unit - the unit of the period to subtract, not null
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the specified period subtracted, not null
     * @throws {DateTimeException} if the unit cannot be added to this type
     */
    _minusUnit(amountToSubtract, unit) {
        requireNonNull(unit, 'unit');
        return this._plusUnit(-1 * amountToSubtract, unit);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in years subtracted.
     *
     * This method subtracts the specified amount from the years field in three steps:
     *
     * 1. Subtract the input years from the year field
     * 2. Check if the resulting date would be invalid
     * 3. Adjust the day-of-month to the last valid day if necessary
     *
     * For example, 2008-02-29 (leap year) minus one year would result in the
     * invalid date 2009-02-29 (standard year). Instead of returning an invalid
     * result, the last valid day of the month, 2009-02-28, is selected instead.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} years - the years to subtract, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the years subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusYears(years) {
        return this.plusYears(-1 * years);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in months subtracted.
     *
     * This method subtracts the specified amount from the months field in three steps:
     *
     * 1. Subtract the input months from the month-of-year field
     * 2. Check if the resulting date would be invalid
     * 3. Adjust the day-of-month to the last valid day if necessary
     *
     * For example, 2007-03-31 minus one month would result in the invalid date
     * 2007-04-31. Instead of returning an invalid result, the last valid day
     * of the month, 2007-04-30, is selected instead.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} months - the months to subtract, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the months subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusMonths(months) {
        return this.plusMonths(-1 * months);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in weeks subtracted.
     *
     * This method subtracts the specified amount in weeks from the days field decrementing
     * the month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2009-01-07 minus one week would result in 2008-12-31.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} weeks - the weeks to subtract, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the weeks subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusWeeks(weeks) {
        return this.plusWeeks(-1 * weeks);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in days subtracted.
     *
     * This method subtracts the specified amount from the days field incrementing the
     * month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2009-01-01 minus one day would result in 2008-12-31.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} days - the days to subtract, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the days subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusDays(days) {
        return this.plusDays(-1 * days);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in hours subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} hours - the hours to subtract, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the hours subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusHours(hours) {
        return this._plusWithOverflow(this._date, hours, 0, 0, 0, -1);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in minutes subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} minutes - the minutes to subtract, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the minutes subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusMinutes(minutes) {
        return this._plusWithOverflow(this._date, 0, minutes, 0, 0, -1);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in seconds subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} seconds - the seconds to subtract, may be negative
     * @return {LocalDateTime} a {@link LocalDateTime} based on this date-time with the seconds subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusSeconds(seconds) {
        return this._plusWithOverflow(this._date, 0, 0, seconds, 0, -1);
    }

    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period in nanoseconds subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {Number} nanos - the nanos to subtract, may be negative
     * @return {LocalDateTime} based on this date-time with the nanoseconds subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusNanos(nanos) {
        return this._plusWithOverflow(this._date, 0, 0, 0, nanos, -1);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalDateTime} with the specified period added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {LocalDate} newDate  the new date to base the calculation on, not null
     * @param {Number} hours - the hours to add, may be negative
     * @param {Number} minutes - the minutes to add, may be negative
     * @param {Number} seconds - the seconds to add, may be negative
     * @param {Number} nanos - the nanos to add, may be negative
     * @param {Number} sign - the sign to determine add or subtract
     * @return {LocalDateTime} the combined result, not null
     */
    _plusWithOverflow(newDate, hours, minutes, seconds, nanos, sign) {
        // 9223372036854775808 long, 2147483648 int
        if (hours === 0 && minutes === 0 && seconds === 0 && nanos === 0) {
            return this._withDateTime(newDate, this._time);
        }
        let totDays = MathUtil.intDiv(nanos, LocalTime.NANOS_PER_DAY) +             //   max/24*60*60*1B
                MathUtil.intDiv(seconds, LocalTime.SECONDS_PER_DAY) +                //   max/24*60*60
                MathUtil.intDiv(minutes, LocalTime.MINUTES_PER_DAY) +                //   max/24*60
                MathUtil.intDiv(hours, LocalTime.HOURS_PER_DAY);                     //   max/24
        totDays *= sign;                                   // total max*0.4237...
        let totNanos = MathUtil.intMod(nanos, LocalTime.NANOS_PER_DAY) +                    //   max  86400000000000
                (MathUtil.intMod(seconds, LocalTime.SECONDS_PER_DAY)) * LocalTime.NANOS_PER_SECOND +   //   max  86400000000000
                (MathUtil.intMod(minutes, LocalTime.MINUTES_PER_DAY)) * LocalTime.NANOS_PER_MINUTE +   //   max  86400000000000
                (MathUtil.intMod(hours, LocalTime.HOURS_PER_DAY)) * LocalTime.NANOS_PER_HOUR;          //   max  86400000000000
        const curNoD = this._time.toNanoOfDay();                       //   max  86400000000000
        totNanos = totNanos * sign + curNoD;                    // total 432000000000000
        totDays += MathUtil.floorDiv(totNanos, LocalTime.NANOS_PER_DAY);
        const newNoD = MathUtil.floorMod(totNanos, LocalTime.NANOS_PER_DAY);
        const newTime = (newNoD === curNoD ? this._time : LocalTime.ofNanoOfDay(newNoD));
        return this._withDateTime(newDate.plusDays(totDays), newTime);
    }

    //-----------------------------------------------------------------------
    /**
     * Queries this date-time using the specified query.
     *
     * This queries this date-time using the specified query strategy object.
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
     * @throws {DateTimeException} if unable to query (defined by the query)
     * @throws {ArithmeticException} if numeric overflow occurs (defined by the query)
     */
    query(query) {
        requireNonNull(query, 'query');
        if (query === TemporalQueries.localDate()) {
            return this.toLocalDate();
        }
        return super.query(query);
    }

    /**
     * Adjusts the specified temporal object to have the same date and time as this object.
     *
     * This returns a temporal object of the same observable type as the input
     * with the date and time changed to be the same as this.
     *
     * The adjustment is equivalent to using {@link Temporal#with}
     * twice, passing {@link ChronoField#EPOCH_DAY} and
     * {@link ChronoField#NANO_OF_DAY} as the fields.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisLocalDateTime.adjustInto(temporal);
     *   temporal = temporal.with(thisLocalDateTime);
     * </pre>
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAdjuster} temporal - the target object to be adjusted, not null
     * @return {LocalDateTime} the adjusted object, not null
     * @throws {DateTimeException} if unable to make the adjustment
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    adjustInto(temporal) {
        return super.adjustInto(temporal);
    }

    /**
     * Calculates the period between this date-time and another date-time in
     * terms of the specified unit.
     *
     * This calculates the period between two date-times in terms of a single unit.
     * The start and end points are `this` and the specified date-time.
     * The result will be negative if the end is before the start.
     * The {@link Temporal} passed to this method must be a {@link LocalDateTime}.
     * For example, the period in days between two date-times can be calculated
     * using `startDateTime.until(endDateTime, DAYS)`.
     *
     * The calculation returns a whole number, representing the number of
     * complete units between the two date-times.
     * For example, the period in months between 2012-06-15T00:00 and 2012-08-14T23:59
     * will only be one month as it is one minute short of two months.
     *
     * This method operates in association with {@link TemporalUnit#between}.
     * The result of this method is a `long` representing the amount of
     * the specified unit. By contrast, the result of {@link between} is an
     * object that can be used directly in addition/subtraction:
     * <pre>
     *   long period = start.until(end, MONTHS);   // this method
     *   dateTime.plus(MONTHS.between(start, end));      // use in plus/minus
     * </pre>
     *
     * The calculation is implemented in this method for {@link ChronoUnit}.
     * The units {@link NANOS}, {@link MICROS}, {@link MILLIS}, {@link SECONDS},
     * {@link MINUTES}, {@link HOURS} and {@link HALF_DAYS}, {@link DAYS},
     * {@link WEEKS}, {@link MONTHS}, {@link YEARS}, {@link DECADES},
     * {@link CENTURIES}, {@link MILLENNIA} and {@link ERAS} are supported.
     * Other {@link ChronoUnit} values will throw an exception.
     *
     * If the unit is not a {@link ChronoUnit}, then the result of this method
     * is obtained by invoking {@link TemporalUnit.between}
     * passing `this` as the first argument and the input temporal as
     * the second argument.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {Temporal} endExclusive - the end date-time, which is converted to a {@link LocalDateTime}, not null
     * @param {TemporalUnit} unit - the unit to measure the period in, not null
     * @return {number} the amount of the period between this date-time and the end date-time
     * @throws {DateTimeException} if the period cannot be calculated
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    until(endExclusive, unit) {
        requireNonNull(endExclusive, 'endExclusive');
        requireNonNull(unit, 'unit');
        const end = LocalDateTime.from(endExclusive);
        if (unit instanceof ChronoUnit) {
            if (unit.isTimeBased()) {
                let daysUntil = this._date.daysUntil(end._date);
                let timeUntil = end._time.toNanoOfDay() - this._time.toNanoOfDay();
                if (daysUntil > 0 && timeUntil < 0) {
                    daysUntil--;
                    timeUntil += LocalTime.NANOS_PER_DAY;
                } else if (daysUntil < 0 && timeUntil > 0) {
                    daysUntil++;
                    timeUntil -= LocalTime.NANOS_PER_DAY;
                }
                let amount = daysUntil;
                switch (unit) {
                    case ChronoUnit.NANOS:
                        amount = MathUtil.safeMultiply(amount, LocalTime.NANOS_PER_DAY);
                        return MathUtil.safeAdd(amount, timeUntil);
                    case ChronoUnit.MICROS:
                        amount = MathUtil.safeMultiply(amount, LocalTime.MICROS_PER_DAY);
                        return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, 1000));
                    case ChronoUnit.MILLIS:
                        amount = MathUtil.safeMultiply(amount, LocalTime.MILLIS_PER_DAY);
                        return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, 1000000));
                    case ChronoUnit.SECONDS:
                        amount = MathUtil.safeMultiply(amount, LocalTime.SECONDS_PER_DAY);
                        return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, LocalTime.NANOS_PER_SECOND));
                    case ChronoUnit.MINUTES:
                        amount = MathUtil.safeMultiply(amount, LocalTime.MINUTES_PER_DAY);
                        return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, LocalTime.NANOS_PER_MINUTE));
                    case ChronoUnit.HOURS:
                        amount = MathUtil.safeMultiply(amount, LocalTime.HOURS_PER_DAY);
                        return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, LocalTime.NANOS_PER_HOUR));
                    case ChronoUnit.HALF_DAYS:
                        amount = MathUtil.safeMultiply(amount, 2);
                        return MathUtil.safeAdd(amount, MathUtil.intDiv(timeUntil, (LocalTime.NANOS_PER_HOUR * 12)));
                }
                throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
            }
            let endDate = end._date;
            const endTime = end._time;
            if (endDate.isAfter(this._date) && endTime.isBefore(this._time)) {
                endDate = endDate.minusDays(1);
            } else if (endDate.isBefore(this._date) && endTime.isAfter(this._time)) {
                endDate = endDate.plusDays(1);
            }
            return this._date.until(endDate, unit);
        }
        return unit.between(this, end);
    }

    //-----------------------------------------------------------------------
    /**
     * Combines this date-time with an offset to create an {@link OffsetDateTime}.
     *
     * This returns an {@link OffsetDateTime} formed from this date-time at the specified offset.
     * All possible combinations of date-time and offset are valid.
     *
     * @param {ZoneOffset} offset  the offset to combine with, not null
     * @return {OffsetDateTime} the offset date-time formed from this date-time and the specified offset, not null
     */
    atOffset(offset) {
        return OffsetDateTime.of(this, offset);
    }

    /**
     * Combines this date-time with a time-zone to create a {@link ZonedDateTime}.
     *
     * This returns a {@link ZonedDateTime} formed from this date-time at the
     * specified time-zone. The result will match this date-time as closely as possible.
     * Time-zone rules, such as daylight savings, mean that not every local date-time
     * is valid for the specified zone, thus the local date-time may be adjusted.
     *
     * The local date-time is resolved to a single instant on the time-line.
     * This is achieved by finding a valid offset from UTC/Greenwich for the local
     * date-time as defined by the {@link ZoneRules} of the zone ID.
     *
     * In most cases, there is only one valid offset for a local date-time.
     * In the case of an overlap, where clocks are set back, there are two valid offsets.
     * This method uses the earlier offset typically corresponding to 'summer'.
     *
     * In the case of a gap, where clocks jump forward, there is no valid offset.
     * Instead, the local date-time is adjusted to be later by the length of the gap.
     * For a typical one hour daylight savings change, the local date-time will be
     * moved one hour later into the offset typically corresponding to 'summer'.
     *
     * To obtain the later offset during an overlap, call
     * {@link ZonedDateTime#withLaterOffsetAtOverlap} on the result of this method.
     * To throw an exception when there is a gap or overlap, use
     * {@link ZonedDateTime#ofStrict}.
     *
     * @param {ZoneId} zone  the time-zone to use, not null
     * @return {ZonedDateTime} the zoned date-time formed from this date-time, not null
     */
    atZone(zone) {
        return ZonedDateTime.of(this, zone);
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the {@link LocalDate} part of this date-time.
     *
     * This returns a {@link LocalDate} with the same year, month and day
     * as this date-time.
     *
     * @return {LocalDate} the date part of this date-time, not null
     */
    toLocalDate() {
        return this._date;
    }

    /**
     * Gets the {@link LocalTime} part of this date-time.
     *
     * This returns a {@link LocalTime} with the same hour, minute, second and
     * nanosecond as this date-time.
     *
     * @return {LocalTime} the time part of this date-time, not null
     */
    toLocalTime() {
        return this._time;
    }

    //-----------------------------------------------------------------------
    /**
     * Compares this date-time to another date-time.
     *
     * The comparison is primarily based on the date-time, from earliest to latest.
     * It is 'consistent with equals', as defined by {@link Comparable}.
     *
     * If all the date-times being compared are instances of {@link LocalDateTime},
     * then the comparison will be entirely based on the date-time.
     * If some dates being compared are in different chronologies, then the
     * chronology is also considered, see {@link ChronoLocalDateTime#compareTo}.
     *
     * @param {!LocalDateTime} other - the other date-time to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, LocalDateTime, 'other');
        return this._compareTo0(other);
        // return super.compareTo(other); if not instance of  LocalDateTime
    }

    /**
     *
     * @param {!LocalDateTime} other
     * @returns {number}
     * @private
     */
    _compareTo0(other) {
        let cmp = this._date.compareTo(other.toLocalDate());
        if (cmp === 0) {
            cmp = this._time.compareTo(other.toLocalTime());
        }
        return cmp;
    }

    /**
     * Checks if this date-time is after the specified date-time.
     *
     * This checks to see if this date-time represents a point on the
     * local time-line after the other date-time.
     * <pre>
     *   LocalDate a = LocalDateTime.of(2012, 6, 30, 12, 00);
     *   LocalDate b = LocalDateTime.of(2012, 7, 1, 12, 00);
     *   a.isAfter(b) == false
     *   a.isAfter(a) == false
     *   b.isAfter(a) == true
     * </pre>
     *
     * This method only considers the position of the two date-times on the local time-line.
     * It does not take into account the chronology, or calendar system.
     * This is different from the comparison in {@link compareTo},
     * but is the same approach as {@link DATE_TIME_COMPARATOR}.
     *
     * @param {LocalDateTime} other - the other date-time to compare to, not null
     * @return {boolean} true if this date-time is after the specified date-time
     */
    isAfter(other) {
        return this.compareTo(other) > 0;
        // return super.isAfter(other);  if not instance of LocalDateTime
    }

    /**
     * Checks if this date-time is before the specified date-time.
     *
     * This checks to see if this date-time represents a point on the
     * local time-line before the other date-time.
     * <pre>
     *   LocalDate a = LocalDateTime.of(2012, 6, 30, 12, 00);
     *   LocalDate b = LocalDateTime.of(2012, 7, 1, 12, 00);
     *   a.isBefore(b) == true
     *   a.isBefore(a) == false
     *   b.isBefore(a) == false
     * </pre>
     *
     * This method only considers the position of the two date-times on the local time-line.
     * It does not take into account the chronology, or calendar system.
     * This is different from the comparison in {@link compareTo},
     * but is the same approach as {@link DATE_TIME_COMPARATOR}.
     *
     * @param {LocalDateTime} other - the other date-time to compare to, not null
     * @return {boolean} true if this date-time is before the specified date-time
     */
    isBefore(other) {
        return this.compareTo(other) < 0;
        // return super.isBefore(other);  if not instance of LocalDateTime
    }

    /**
     * Checks if this date-time is equal to the specified date-time.
     *
     * This checks to see if this date-time represents the same point on the
     * local time-line as the other date-time.
     * <pre>
     *   LocalDate a = LocalDateTime.of(2012, 6, 30, 12, 00);
     *   LocalDate b = LocalDateTime.of(2012, 7, 1, 12, 00);
     *   a.isEqual(b) == false
     *   a.isEqual(a) == true
     *   b.isEqual(a) == false
     * </pre>
     *
     * This method only considers the position of the two date-times on the local time-line.
     * It does not take into account the chronology, or calendar system.
     * This is different from the comparison in {@link compareTo},
     * but is the same approach as {@link DATE_TIME_COMPARATOR}.
     *
     * @param {LocalDateTime} other - the other date-time to compare to, not null
     * @return {boolean} true if this date-time is equal to the specified date-time
     */
    isEqual(other) {
        return this.compareTo(other) === 0;
        // return super.isEqual(other); if not instance of LocalDateTime
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if this date-time is equal to another date-time.
     *
     * Compares this {@link LocalDateTime} with another ensuring that the date-time is the same.
     * Only objects of type {@link LocalDateTime} are compared, other types return false.
     *
     * @param {*} other - the object to check, null returns false
     * @return {boolean} true if this is equal to the other date-time
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof LocalDateTime) {
            return this._date.equals(other._date) && this._time.equals(other._time);
        }
        return false;
    }

    /**
     * A hash code for this date-time.
     *
     * @return {number} a suitable hash code
     */
    hashCode() {
        return this._date.hashCode() ^ this._time.hashCode();
    }

    //-----------------------------------------------------------------------
    /**
     * Outputs this date-time as a string, such as `2007-12-03T10:15:30`.
     *
     * The output will be one of the following ISO-8601 formats:
     *
     * * `yyyy-MM-dd'T'HH:mm`
     * * `yyyy-MM-dd'T'HH:mm:ss`
     * * `yyyy-MM-dd'T'HH:mm:ss.SSS`
     * * `yyyy-MM-dd'T'HH:mm:ss.SSSSSS`
     * * `yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS`
     *
     * The format used will be the shortest that outputs the full value of
     * the time where the omitted parts are implied to be zero.
     *
     * @return {string} a string representation of this date-time, not null
     */
    toString() {
        return `${this._date.toString()}T${this._time.toString()}`;
    }

    /**
     *
     * @return {string} same as {@link LocalDateTime.toString}
     */
    toJSON() {
        return this.toString();
    }

    /**
     * Outputs this date-time as a string using the formatter.
     *
     * @param {!DateTimeFormatter} formatter  the formatter to use, not null
     * @return {String} the formatted date-time string, not null
     * @throws {DateTimeException} if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        return formatter.format(this);
    }

}

export function _init(){
    /**
     * The minimum supported {@link LocalDateTime}, '-999999999-01-01T00:00:00'.
     * This is the local date-time of midnight at the start of the minimum date.
     * This combines {@link LocalDate#MIN} and {@link LocalTime#MIN}.
     * This could be used by an application as a 'far past' date-time.
     */
    LocalDateTime.MIN = LocalDateTime.of(LocalDate.MIN, LocalTime.MIN);

    /**
     * The maximum supported {@link LocalDateTime}, '+999999999-12-31T23:59:59.999999999'.
     * This is the local date-time just before midnight at the end of the maximum date.
     * This combines {@link LocalDate#MAX} and {@link LocalTime#MAX}.
     * This could be used by an application as a 'far future' date-time.
     */
    LocalDateTime.MAX = LocalDateTime.of(LocalDate.MAX, LocalTime.MAX);

    LocalDateTime.FROM = createTemporalQuery('LocalDateTime.FROM', (temporal) => {
        return LocalDateTime.from(temporal);
    });
}
