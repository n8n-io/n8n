/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert, requireNonNull, requireInstance } from './assert';

import { MathUtil } from './MathUtil';
import { DateTimeException, UnsupportedTemporalTypeException, NullPointerException, IllegalArgumentException } from './errors';

import { IsoChronology } from './chrono/IsoChronology';
import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { ChronoLocalDate } from './chrono/ChronoLocalDate';
import { TemporalQueries } from './temporal/TemporalQueries';
import { createTemporalQuery } from './temporal/TemporalQuery';
import { ValueRange } from './temporal/ValueRange';
import { DateTimeFormatter } from './format/DateTimeFormatter';

import { Clock } from './Clock';
import { DayOfWeek } from './DayOfWeek';
import { OffsetDateTime } from './OffsetDateTime';
import { OffsetTime } from './OffsetTime';
import { Month } from './Month';
import { Period } from './Period';
import { YearConstants } from './YearConstants';
import { LocalTime } from './LocalTime';
import { LocalDateTime } from './LocalDateTime';
import { Year } from './Year';
import { ZoneId } from './ZoneId';
import { ZoneOffset } from './ZoneOffset';
import { ZonedDateTime } from './ZonedDateTime';

/**
 * The number of days in a 400 year cycle.
 */
const  DAYS_PER_CYCLE = 146097;

/**
* The number of days from year zero to year 1970.
* There are five 400 year cycles from year zero to 2000.
* There are 7 leap years from 1970 to 2000.
*/
const  DAYS_0000_TO_1970 = (DAYS_PER_CYCLE * 5) - (30 * 365 + 7);

/**
 * A date without a time-zone in the ISO-8601 calendar system,
 * such as 2007-12-03.
 *
 * LocalDate is an immutable date-time object that represents a date,
 * often viewed as year-month-day. Other date fields, such as day-of-year,
 * day-of-week and week-of-year, can also be accessed.
 * For example, the value "2nd October 2007" can be stored in a LocalDate.
 *
 * This class does not store or represent a time or time-zone.
 * Instead, it is a description of the date, as used for birthdays.
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
 * ### Static properties of Class {@link LocalDate}
 *
 * LocalDate.MIN = LocalDate.of(Year.MIN_VALUE, 1, 1);
 *
 * The minimum supported {@link LocalDate}
 * This could be used by an application as a "far past" date.
 *
 * LocalDate.MAX = LocalDate.of(Year.MAX_VALUE, 12, 31);
 *
 * The maximum supported {@link LocalDate}
 * This could be used by an application as a "far future" date.
 *
 * LocalDate.EPOCH_0
 *
 * The date at epoch day 0, that is 1970-01-01.
 */

export class LocalDate extends ChronoLocalDate{

    /**
     * Obtains the current date from the system clock in the default time-zone or
     * if specified, the current date from the specified clock or
     * if argument is a ZoneId this will query a clock with the specified ZoneId.
     *
     * This will query the specified clock to obtain the current date - today.
     * Using this method allows the use of an alternate clock for testing.
     *
     * @param {Clock|ZoneId} [clockOrZone=Clock.systemDefaultZone()] - the clock or zone to use,
     * if null, the system clock and default time-zone is used.
     * @return {LocalDate} the current date, not null
     */
    static now(clockOrZone) {
        let clock;
        if(clockOrZone == null){
            clock = Clock.systemDefaultZone();
        } else if(clockOrZone instanceof ZoneId){
            clock = Clock.system(clockOrZone);
        } else {
            clock = clockOrZone;
        }
        return LocalDate.ofInstant(clock.instant(), clock.zone());
    }

    /**
     * obtain a LocalDate from an Instant in the specified time-zone or, if null
     * in the system default time-zone
     *
     * @param {!Instant} instant
     * @param {ZoneId} [zone=ZoneId.systemDefault()], defaults to ZoneId.systemDefault()
     * @returns {LocalDate} the current date, not null
     */
    static ofInstant(instant, zone=ZoneId.systemDefault()){
        requireNonNull(instant, 'instant');
        const offset = zone.rules().offset(instant);
        const epochSec = instant.epochSecond() + offset.totalSeconds();
        const epochDay = MathUtil.floorDiv(epochSec, LocalTime.SECONDS_PER_DAY);
        return LocalDate.ofEpochDay(epochDay);
    }

    /**
     * Obtains an instance of {@link LocalDate} from a year, month and day.
     *
     * This returns a {@link LocalDate} with the specified year, month and day-of-month.
     * The day must be valid for the year and month, otherwise an exception will be thrown.
     *
     * @param {!number} year - the year to represent, from {@link Year.MIN_VALUE} to {@link Year.MAX_VALUE}
     * @param {!(Month|Number)} month - the month-of-year to represent, from 1 (January) to 12 (December)
     * @param {!number} dayOfMonth - the day-of-month to represent, from 1 to 31
     * @return {LocalDate} the local date, not null
     * @throws {DateTimeException} if the value of any field is out of range,
     *  or if the day-of-month is invalid for the month-year
     */
    static of(year, month, dayOfMonth) {
        return new LocalDate(year, month, dayOfMonth);
    }

    /**
     * Obtains an instance of {@link LocalDate} from a year and day-of-year.
     *
     * This returns a {@link LocalDate} with the specified year and day-of-year.
     * The day-of-year must be valid for the year, otherwise an exception will be thrown.
     *
     * @param {!number} year - the year to represent, from {@link Year.MIN_VALUE} to {@link Year.MAX_VALUE}
     * @param {!number} dayOfYear - the day-of-year to represent, from 1 to 366
     * @return {LocalDate} the local date, not null
     * @throws {DateTimeException} if the value of any field is out of range,
     *  or if the day-of-year is invalid for the year
     */
    static ofYearDay(year, dayOfYear) {
        ChronoField.YEAR.checkValidValue(year);
        //TODO: ChronoField.DAY_OF_YEAR.checkValidValue(dayOfYear);
        const leap = IsoChronology.isLeapYear(year);
        if (dayOfYear === 366 && leap === false) {
            assert(false, `Invalid date 'DayOfYear 366' as '${year}' is not a leap year`, DateTimeException);
        }
        let moy = Month.of(Math.floor((dayOfYear - 1) / 31 + 1));
        const monthEnd = moy.firstDayOfYear(leap) + moy.length(leap) - 1;
        if (dayOfYear > monthEnd) {
            moy = moy.plus(1);
        }
        const dom = dayOfYear - moy.firstDayOfYear(leap) + 1;
        return new LocalDate(year, moy.value(), dom);
    }

    /**
     * Obtains an instance of LocalDate from the epoch day count.
     *
     * This returns a LocalDate with the specified epoch-day.
     * The {@link ChronoField.EPOCH_DAY} is a simple incrementing count
     * of days where day 0 is 1970-01-01. Negative numbers represent earlier days.
     *
     * @param {number} [epochDay=0] - the Epoch Day to convert, based on the epoch 1970-01-01
     * @return {LocalDate} the local date, not null
     * @throws {AssertionError} if the epoch days exceeds the supported date range
     */
    static ofEpochDay(epochDay=0) {
        let adjust, adjustCycles, doyEst, yearEst, zeroDay;
        zeroDay = epochDay + DAYS_0000_TO_1970;
        zeroDay -= 60;
        adjust = 0;
        if (zeroDay < 0) {
            adjustCycles = MathUtil.intDiv(zeroDay + 1, DAYS_PER_CYCLE) - 1;
            adjust = adjustCycles * 400;
            zeroDay += -adjustCycles * DAYS_PER_CYCLE;
        }
        yearEst = MathUtil.intDiv(400 * zeroDay + 591, DAYS_PER_CYCLE);
        doyEst = zeroDay - (365 * yearEst + MathUtil.intDiv(yearEst, 4) - MathUtil.intDiv(yearEst, 100) + MathUtil.intDiv(yearEst, 400));
        if (doyEst < 0) {
            yearEst--;
            doyEst = zeroDay - (365 * yearEst + MathUtil.intDiv(yearEst, 4) - MathUtil.intDiv(yearEst, 100) + MathUtil.intDiv(yearEst, 400));
        }
        yearEst += adjust;
        const marchDoy0 = doyEst;
        const marchMonth0 = MathUtil.intDiv(marchDoy0 * 5 + 2, 153);
        const month = (marchMonth0 + 2) % 12 + 1;
        const dom = marchDoy0 - MathUtil.intDiv(marchMonth0 * 306 + 5, 10) + 1;
        yearEst += MathUtil.intDiv(marchMonth0, 10);
        const year = yearEst;
        return new LocalDate(year, month, dom);
    }

    /**
     * Obtains an instance of {@link LocalDate} from a temporal object.
     *
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link LocalDate}.
     *
     * The conversion uses the {@link TemporalQueries.localDate} query, which relies
     * on extracting the {@link ChronoField.EPOCH_DAY} field.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used as a query via method reference, {@link LocalDate::from}.
     *
     * @param {!TemporalAccessor} temporal - the temporal object to convert, not null
     * @return {LocalDate} the local date, not null
     * @throws {DateTimeException} if unable to convert to a {@link LocalDate}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        const date = temporal.query(TemporalQueries.localDate());
        if (date == null) {
            throw new DateTimeException(
                `Unable to obtain LocalDate from TemporalAccessor: ${temporal}, type ${temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
        return date;
    }

    /**
     * Obtains an instance of {@link LocalDate} from a text string using a specific formatter.
     *
     * The text is parsed using the formatter, returning a date.
     *
     * @param {!string} text - the text to parse, not null
     * @param {DateTimeFormatter} [formatter=DateTimeFormatter.ISO_LOCAL_DATE] - the formatter to use, default is
     * {@link DateTimeFormatter.ISO_LOCAL_DATE}
     * @return {LocalDate} the parsed local date, not null
     * @throws {DateTimeParseException} if the text cannot be parsed
     */
    static parse(text, formatter = DateTimeFormatter.ISO_LOCAL_DATE){
        assert(formatter != null, 'formatter', NullPointerException);
        return formatter.parse(text, LocalDate.FROM);
    }

    /**
     * Resolves the date, resolving days past the end of month.
     *
     * @param {!number} year - the year to represent, validated from {@link Year.MIN_VALUE} to {@link Year.MAX_VALUE}
     * @param {!number} month - the month-of-year to represent, validated from 1 to 12
     * @param {!number} day - the day-of-month to represent, validated from 1 to 31
     * @return {LocalDate} resolved date, not null
     */
    static _resolvePreviousValid(year, month, day) {
        switch (month) {
            case 2:
                day = Math.min(day, IsoChronology.isLeapYear(year) ? 29 : 28);
                break;
            case 4:
            case 6:
            case 9:
            case 11:
                day = Math.min(day, 30);
                break;
        }
        return LocalDate.of(year, month, day);
    }

    /**
     * Do not call the constructor directly, use the of*() factories instead like {@link LocalDate.of}
     *
     * @param {!number} year
     * @param {!(Month|number)} month
     * @param {!number} dayOfMonth
     * @private
     */
    constructor(year, month, dayOfMonth){
        super();
        requireNonNull(year, 'year');
        requireNonNull(month, 'month');
        requireNonNull(dayOfMonth, 'dayOfMonth');

        if (month instanceof Month) {
            month = month.value();
        }
        this._year = MathUtil.safeToInt(year);
        this._month = MathUtil.safeToInt(month);
        this._day = MathUtil.safeToInt(dayOfMonth);
        LocalDate._validate(this._year, this._month, this._day);
    }


    /**
     *
     * @param {!number} year
     * @param {!number} month
     * @param {!number} dayOfMonth
     * @throws {DateTimeException} if date values are invalid
     * @private
     */
    static _validate(year, month, dayOfMonth) {
        let dom;
        ChronoField.YEAR.checkValidValue(year);
        ChronoField.MONTH_OF_YEAR.checkValidValue(month);
        ChronoField.DAY_OF_MONTH.checkValidValue(dayOfMonth);

        if (dayOfMonth > 28) {
            dom = 31;
            switch (month) {
                case 2:
                    dom = IsoChronology.isLeapYear(year) ? 29 : 28;
                    break;
                case 4:
                case 6:
                case 9:
                case 11:
                    dom = 30;
            }
            if (dayOfMonth > dom) {
                if (dayOfMonth === 29) {
                    assert(false, `Invalid date 'February 29' as '${year}' is not a leap year`, DateTimeException);
                } else {
                    assert(false, `Invalid date '${year}' '${month}' '${dayOfMonth}'`, DateTimeException);
                }
            }
        }
    }

    /**
     * Checks if the specified field is supported.
     *
     * This checks if this date can be queried for the specified field.
     * If false, then calling the {@link LocalDate.range} range and
     * {@link LocalDate.get} get methods will throw an exception.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The {@link LocalDate.isSupported} supported fields will return valid
     * values based on this date-time.
     * The supported fields are:
     *
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
     * passing this as the argument.
     * Whether the field is supported is determined by the field.
     *
     * @param {TemporalField} field  the field to check, null returns false
     * @return {boolean} true if the field is supported on this date, false if not
     */
    isSupported(field) {
        return super.isSupported(field);
    }

    /**
     * Gets the range of valid values for the specified field.
     *
     * The range object expresses the minimum and maximum valid values for a field.
     * This date is used to enhance the accuracy of the returned range.
     * If it is not possible to return the range, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The {@link LocalDate.isSupported} supported fields will return
     * appropriate range instances.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.rangeRefinedBy}
     * passing this as the argument.
     * Whether the range can be obtained is determined by the field.
     *
     * @param {TemporalField} field  the field to query the range for, not null
     * @return {ValueRange} the range of valid values for the field, not null
     * @throws {DateTimeException} if the range for the field cannot be obtained
     */
    range(field) {
        if (field instanceof ChronoField) {
            if (field.isDateBased()) {
                switch (field) {
                    case ChronoField.DAY_OF_MONTH: return ValueRange.of(1, this.lengthOfMonth());
                    case ChronoField.DAY_OF_YEAR: return ValueRange.of(1, this.lengthOfYear());
                    case ChronoField.ALIGNED_WEEK_OF_MONTH: return ValueRange.of(1, this.month() === Month.FEBRUARY && this.isLeapYear() === false ? 4 : 5);
                    case ChronoField.YEAR_OF_ERA:
                        return (this._year <= 0 ? ValueRange.of(1, Year.MAX_VALUE + 1) : ValueRange.of(1, Year.MAX_VALUE));
                }
                return field.range();
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.rangeRefinedBy(this);
    }

    /**
     * Gets the value of the specified field from this date as an `int`.
     *
     * This queries this date for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The {@link LocalDate.isSupported} supported fields will return valid
     * values based on this date, except {@link ChronoField.EPOCH_DAY} and {@link ChronoField.EPOCH_MONTH}
     * which are too large to fit in an `int` and throw a {@link DateTimeException}.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing this as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {!TemporalField} field  the field to get, not null
     * @return the value for the field
     * @throws {DateTimeException} if a value for the field cannot be obtained
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    get(field) {
        return this.getLong(field);
    }

    /**
     * see {LocalDate.get}, get and getLong are identical in javascript, because we are only limited by
     * {@link MathUtil.MIN_SAFE_INTEGER}/ {@link MathUtil.MAX_SAFE_INTEGER}
     *
     * @param {!TemporalField} field
     * @returns {*}
     */
    getLong(field) {
        assert(field != null, '', NullPointerException);
        if (field instanceof ChronoField) {
            return this._get0(field);
        }
        return field.getFrom(this);
    }

    /**
     * TODO tests are missing for the ALIGNED_* ChronoFields
     *
     * @param {!TemporalField} field
     * @returns {*}
     * @private
     */
    _get0(field) {
        switch (field) {
            case ChronoField.DAY_OF_WEEK: return this.dayOfWeek().value();
            case ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH: return MathUtil.intMod((this._day - 1), 7) + 1;
            case ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR: return MathUtil.intMod((this.dayOfYear() - 1), 7) + 1;
            case ChronoField.DAY_OF_MONTH: return this._day;
            case ChronoField.DAY_OF_YEAR: return this.dayOfYear();
            case ChronoField.EPOCH_DAY: return this.toEpochDay();
            case ChronoField.ALIGNED_WEEK_OF_MONTH: return MathUtil.intDiv((this._day - 1), 7) + 1;
            case ChronoField.ALIGNED_WEEK_OF_YEAR: return MathUtil.intDiv((this.dayOfYear() - 1), 7) + 1;
            case ChronoField.MONTH_OF_YEAR: return this._month;
            case ChronoField.PROLEPTIC_MONTH: return this._prolepticMonth();
            case ChronoField.YEAR_OF_ERA: return (this._year >= 1 ? this._year : 1 - this._year);
            case ChronoField.YEAR: return this._year;
            case ChronoField.ERA: return (this._year >= 1 ? 1 : 0);
        }
        throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
    }

    /**
     *
     * @return {number}
     * @private
     */
    _prolepticMonth() {
        return (this._year * 12) + (this._month - 1);
    }

    /**
     * Gets the chronology of this date, which is the ISO calendar system.
     *
     * The {@link Chronology} represents the calendar system in use.
     * The ISO-8601 calendar system is the modern civil calendar system used today
     * in most of the world. It is equivalent to the proleptic Gregorian calendar
     * system, in which today's rules for leap years are applied for all time.
     *
     * @return {Chronology} the ISO chronology, not null
     */
    chronology() {
        return IsoChronology.INSTANCE;
    }

    /**
     *
     * @return {number} gets the year
     */
    year() {
        return this._year;
    }

    /**
     *
     * @return {number} gets the month value
     */
    monthValue() {
        return this._month;
    }

    /**
     *
     * @returns {Month} month
     */
    month() {
        return Month.of(this._month);
    }

    /**
     *
     * @return {number} gets the day of month
     */
    dayOfMonth() {
        return this._day;
    }

    /**
      * Gets the day-of-year field.
      *
      * This method returns the primitive int value for the day-of-year.
      *
      * @return {number} the day-of-year, from 1 to 365, or 366 in a leap year
      */
    dayOfYear() {
        return this.month().firstDayOfYear(this.isLeapYear()) + this._day - 1;
    }

    /**
     * Gets the day-of-week field, which is an enum {@link DayOfWeek}.
     *
     * This method returns the enum {@link DayOfWeek} for the day-of-week.
     * This avoids confusion as to what `int` values mean.
     * If you need access to the primitive `int` value then the enum
     * provides the {@link DayOfWeek.value} int value.
     *
     * Additional information can be obtained from the {@link DayOfWeek}.
     * This includes textual names of the values.
     *
     * @return {DayOfWeek} the day-of-week, not null
     */
    dayOfWeek() {
        const dow0 = MathUtil.floorMod(this.toEpochDay() + 3, 7);
        return DayOfWeek.of(dow0 + 1);
    }

    /**
     * Checks if the year is a leap year, according to the ISO proleptic
     * calendar system rules.
     *
     * This method applies the current rules for leap years across the whole time-line.
     * In general, a year is a leap year if it is divisible by four without
     * remainder. However, years divisible by 100, are not leap years, with
     * the exception of years divisible by 400 which are.
     *
     * For example, 1904 is a leap year it is divisible by 4.
     * 1900 was not a leap year as it is divisible by 100, however 2000 was a
     * leap year as it is divisible by 400.
     *
     * The calculation is proleptic - applying the same rules into the far future and far past.
     * This is historically inaccurate, but is correct for the ISO-8601 standard.
     *
     * @return {boolean} true if the year is leap, false otherwise
     */
    isLeapYear() {
        return IsoChronology.isLeapYear(this._year);
    }

    /**
     * Returns the length of the month represented by this date.
     *
     * This returns the length of the month in days.
     * For example, a date in January would return 31.
     *
     * @return {number} the length of the month in days
     */
    lengthOfMonth() {
        switch (this._month) {
            case 2:
                return (this.isLeapYear() ? 29 : 28);
            case 4:
            case 6:
            case 9:
            case 11:
                return 30;
            default:
                return 31;
        }
    }

    /**
     * Returns the length of the year represented by this date.
     *
     * This returns the length of the year in days, either 365 or 366.
     *
     * @return {number} 366 if the year is leap, 365 otherwise
     */
    lengthOfYear() {
        return (this.isLeapYear() ? 366 : 365);
    }

    /**
     * Returns an adjusted copy of this date.
     *
     * This returns a new {@link LocalDate}, based on this one, with the date adjusted.
     * The adjustment takes place using the specified adjuster strategy object.
     * Read the documentation of the adjuster to understand what adjustment will be made.
     *
     * A simple adjuster might simply set the one of the fields, such as the year field.
     * A more complex adjuster might set the date to the last day of the month.
     * A selection of common adjustments is provided in {@link TemporalAdjusters}.
     * These include finding the "last day of the month" and "next Wednesday".
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
     *  result = localDate.with(JULY).with(lastDayOfMonth());
     * </pre>
     *
     * The result of this method is obtained by invoking the
     * {@link TemporalAdjuster.adjustInto} method on the
     * specified adjuster passing `this` as the argument.
     *
     * @param {!TemporalAdjuster} adjuster - the adjuster to use, not null
     * @return {LocalDate} a {@link LocalDate} based on `this` with the adjustment made, not null
     * @throws {DateTimeException} if the adjustment cannot be made
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    _withAdjuster(adjuster) {
        requireNonNull(adjuster, 'adjuster');
        // optimizations
        if (adjuster instanceof LocalDate) {
            return adjuster;
        }
        return super._withAdjuster(adjuster);
    }

    /**
     * Returns a copy of this date with the specified field set to a new value.
     *
     * This returns a new {@link LocalDate}, based on this one, with the value
     * for the specified field changed.
     * This can be used to change any supported field, such as the year, month or day-of-month.
     * If it is not possible to set the value, because the field is not supported or for
     * some other reason, an exception is thrown.
     *
     * In some cases, changing the specified field can cause the resulting date to become invalid,
     * such as changing the month from 31st January to February would make the day-of-month invalid.
     * In cases like this, the field is responsible for resolving the date. Typically it will choose
     * the previous valid date, which would be the last valid day of February in this example.
     *
     * If the field is a {@link ChronoField} then the adjustment is implemented here.
     * The supported fields behave as follows:
     *
     * * {@link DAY_OF_WEEK} -
     *   Returns a {@link LocalDate} with the specified day-of-week.
     *   The date is adjusted up to 6 days forward or backward within the boundary
     *   of a Monday to Sunday week.
     * * {@link ALIGNED_DAY_OF_WEEK_IN_MONTH} -
     *   Returns a {@link LocalDate} with the specified aligned-day-of-week.
     *   The date is adjusted to the specified month-based aligned-day-of-week.
     *   Aligned weeks are counted such that the first week of a given month starts
     *   on the first day of that month.
     *   This may cause the date to be moved up to 6 days into the following month.
     * * {@link ALIGNED_DAY_OF_WEEK_IN_YEAR} -
     *   Returns a {@link LocalDate} with the specified aligned-day-of-week.
     *   The date is adjusted to the specified year-based aligned-day-of-week.
     *   Aligned weeks are counted such that the first week of a given year starts
     *   on the first day of that year.
     *   This may cause the date to be moved up to 6 days into the following year.
     * * {@link DAY_OF_MONTH} -
     *   Returns a {@link LocalDate} with the specified day-of-month.
     *   The month and year will be unchanged. If the day-of-month is invalid for the
     *   year and month, then a {@link DateTimeException} is thrown.
     * * {@link DAY_OF_YEAR} -
     *   Returns a {@link LocalDate} with the specified day-of-year.
     *   The year will be unchanged. If the day-of-year is invalid for the
     *   year, then a {@link DateTimeException} is thrown.
     * * {@link EPOCH_DAY} -
     *   Returns a {@link LocalDate} with the specified epoch-day.
     *   This completely replaces the date and is equivalent to {@link ofEpochDay}.
     * * {@link ALIGNED_WEEK_OF_MONTH} -
     *   Returns a {@link LocalDate} with the specified aligned-week-of-month.
     *   Aligned weeks are counted such that the first week of a given month starts
     *   on the first day of that month.
     *   This adjustment moves the date in whole week chunks to match the specified week.
     *   The result will have the same day-of-week as this date.
     *   This may cause the date to be moved into the following month.
     * * {@link ALIGNED_WEEK_OF_YEAR} -
     *   Returns a {@link LocalDate} with the specified aligned-week-of-year.
     *   Aligned weeks are counted such that the first week of a given year starts
     *   on the first day of that year.
     *   This adjustment moves the date in whole week chunks to match the specified week.
     *   The result will have the same day-of-week as this date.
     *   This may cause the date to be moved into the following year.
     * * {@link MONTH_OF_YEAR} -
     *   Returns a {@link LocalDate} with the specified month-of-year.
     *   The year will be unchanged. The day-of-month will also be unchanged,
     *   unless it would be invalid for the new month and year. In that case, the
     *   day-of-month is adjusted to the maximum valid value for the new month and year.
     * * {@link PROLEPTIC_MONTH} -
     *   Returns a {@link LocalDate} with the specified proleptic-month.
     *   The day-of-month will be unchanged, unless it would be invalid for the new month
     *   and year. In that case, the day-of-month is adjusted to the maximum valid value
     *   for the new month and year.
     * * {@link YEAR_OF_ERA} -
     *   Returns a {@link LocalDate} with the specified year-of-era.
     *   The era and month will be unchanged. The day-of-month will also be unchanged,
     *   unless it would be invalid for the new month and year. In that case, the
     *   day-of-month is adjusted to the maximum valid value for the new month and year.
     * * {@link YEAR} -
     *   Returns a {@link LocalDate} with the specified year.
     *   The month will be unchanged. The day-of-month will also be unchanged,
     *   unless it would be invalid for the new month and year. In that case, the
     *   day-of-month is adjusted to the maximum valid value for the new month and year.
     * * {@link ERA} -
     *   Returns a {@link LocalDate} with the specified era.
     *   The year-of-era and month will be unchanged. The day-of-month will also be unchanged,
     *   unless it would be invalid for the new month and year. In that case, the
     *   day-of-month is adjusted to the maximum valid value for the new month and year.
     *
     * In all cases, if the new value is outside the valid range of values for the field
     * then a {@link DateTimeException} will be thrown.
     *
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.adjustInto}
     * passing `this` as the argument. In this case, the field determines
     * whether and how to adjust the instant.
     *
     * @param {TemporalField} field - the field to set in the result, not null
     * @param {number} newValue - the new value of the field in the result
     * @return {LocalDate} a {@link LocalDate} based on `this` with the specified field set, not null
     * @throws {DateTimeException} if the field cannot be set
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    _withField(field, newValue) {
        assert(field != null, 'field', NullPointerException);
        if (field instanceof ChronoField) {
            const f = field;
            f.checkValidValue(newValue);
            switch (f) {
                case ChronoField.DAY_OF_WEEK: return this.plusDays(newValue - this.dayOfWeek().value());
                case ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH: return this.plusDays(newValue - this.getLong(ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH));
                case ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR: return this.plusDays(newValue - this.getLong(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR));
                case ChronoField.DAY_OF_MONTH: return this.withDayOfMonth(newValue);
                case ChronoField.DAY_OF_YEAR: return this.withDayOfYear(newValue);
                case ChronoField.EPOCH_DAY: return LocalDate.ofEpochDay(newValue);
                case ChronoField.ALIGNED_WEEK_OF_MONTH: return this.plusWeeks(newValue - this.getLong(ChronoField.ALIGNED_WEEK_OF_MONTH));
                case ChronoField.ALIGNED_WEEK_OF_YEAR: return this.plusWeeks(newValue - this.getLong(ChronoField.ALIGNED_WEEK_OF_YEAR));
                case ChronoField.MONTH_OF_YEAR: return this.withMonth(newValue);
                case ChronoField.PROLEPTIC_MONTH: return this.plusMonths(newValue - this.getLong(ChronoField.PROLEPTIC_MONTH));
                case ChronoField.YEAR_OF_ERA: return this.withYear((this._year >= 1 ? newValue : 1 - newValue));
                case ChronoField.YEAR: return this.withYear(newValue);
                case ChronoField.ERA: return (this.getLong(ChronoField.ERA) === newValue ? this : this.withYear(1 - this._year));
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.adjustInto(this, newValue);
    }

    /**
     * Returns a copy of this date with the year altered.
     * If the day-of-month is invalid for the year, it will be changed to the last valid day of the month.
     *
     * @param {!number} year  the year to set in the result, from {@link Year.MIN_VALUE} to {@link Year.MAX_VALUE}
     * @return {LocalDate} a {@link LocalDate} based on this date with the requested year, not null
     * @throws {DateTimeException} if the year value is invalid
     */
    withYear(year) {
        if (this._year === year) {
            return this;
        }
        ChronoField.YEAR.checkValidValue(year);
        return LocalDate._resolvePreviousValid(year, this._month, this._day);
    }

    /**
     * Returns a copy of this date with the month-of-year altered.
     * If the day-of-month is invalid for the year, it will be changed to the last valid day of the month.
     *
     * @param {!(Month|number)} month - the month-of-year to set in the result, from 1 (January) to 12 (December)
     * @return {LocalDate} a {@link LocalDate} based on this date with the requested month, not null
     * @throws {DateTimeException} if the month-of-year value is invalid
     */
    withMonth(month) {
        const m = (month instanceof Month) ? month.value() : month;
        if (this._month === m) {
            return this;
        }
        ChronoField.MONTH_OF_YEAR.checkValidValue(m);
        return LocalDate._resolvePreviousValid(this._year, m, this._day);
    }

    /**
     * Returns a copy of this {@link LocalDate} with the day-of-month altered.
     *
     * If the resulting date is invalid, an exception is thrown.
     *
     * @param {!number} dayOfMonth - the day-of-month to set in the result, from 1 to 28-31
     * @return {LocalDate} based on this date with the requested day, not null
     * @throws {DateTimeException} if the day-of-month value is invalid,
     *  or if the day-of-month is invalid for the month-year
     */
    withDayOfMonth(dayOfMonth) {
        if (this._day === dayOfMonth) {
            return this;
        }
        return LocalDate.of(this._year, this._month, dayOfMonth);
    }

    /**
     * Returns a copy of this date with the day-of-year altered.
     * If the resulting date is invalid, an exception is thrown.
     *
     * @param dayOfYear  the day-of-year to set in the result, from 1 to 365-366
     * @return {LocalDate} a {@link LocalDate} based on this date with the requested day, not null
     * @throws {DateTimeException} if the day-of-year value is invalid
     * @throws {DateTimeException} if the day-of-year is invalid for the year
     */
    withDayOfYear(dayOfYear) {
        if (this.dayOfYear() === dayOfYear) {
            return this;
        }
        return LocalDate.ofYearDay(this._year, dayOfYear);
    }

    /**
     * Returns a copy of this date with the specified period added.
     *
     * This method returns a new date based on this date with the specified period added.
     * This can be used to add any period that is defined by a unit, for example to add years, months or days.
     * The unit is responsible for the details of the calculation, including the resolution
     * of any edge cases in the calculation.
     *
     * @param {!number} amountToAdd - the amount of the unit to add to the result, may be negative
     * @param {!TemporalUnit} unit - the unit of the period to add, not null
     * @return {LocalDate} a {@link LocalDate} based on this date with the specified period added, not null
     * @throws {DateTimeException} if the unit cannot be added to this type
     */
    _plusUnit(amountToAdd, unit) {
        requireNonNull(amountToAdd, 'amountToAdd');
        requireNonNull(unit, 'unit');
        if (unit instanceof ChronoUnit) {
            switch (unit) {
                case ChronoUnit.DAYS: return this.plusDays(amountToAdd);
                case ChronoUnit.WEEKS: return this.plusWeeks(amountToAdd);
                case ChronoUnit.MONTHS: return this.plusMonths(amountToAdd);
                case ChronoUnit.YEARS: return this.plusYears(amountToAdd);
                case ChronoUnit.DECADES: return this.plusYears(MathUtil.safeMultiply(amountToAdd, 10));
                case ChronoUnit.CENTURIES: return this.plusYears(MathUtil.safeMultiply(amountToAdd, 100));
                case ChronoUnit.MILLENNIA: return this.plusYears(MathUtil.safeMultiply(amountToAdd, 1000));
                case ChronoUnit.ERAS: return this.with(ChronoField.ERA, MathUtil.safeAdd(this.getLong(ChronoField.ERA), amountToAdd));
            }
            throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
        }
        return unit.addTo(this, amountToAdd);
    }

    /**
     * Returns a copy of this {@link LocalDate} with the specified period in years added.
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
     * @param {!number} yearsToAdd - the years to add, may be negative
     * @return {LocalDate} a {@link LocalDate} based on this date with the years added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusYears(yearsToAdd) {
        if (yearsToAdd === 0) {
            return this;
        }
        const newYear = ChronoField.YEAR.checkValidIntValue(this._year + yearsToAdd);  // safe overflow
        return LocalDate._resolvePreviousValid(newYear, this._month, this._day);
    }

    /**
     * Returns a copy of this {@link LocalDate} with the specified period in months added.
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
     * @param {number} monthsToAdd - the months to add, may be negative
     * @return {LocalDate} a {@link LocalDate} based on this date with the months added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusMonths(monthsToAdd) {
        if (monthsToAdd === 0) {
            return this;
        }
        const monthCount = this._year * 12 + (this._month - 1);
        const calcMonths = monthCount + monthsToAdd;  // safe overflow
        const newYear = ChronoField.YEAR.checkValidIntValue(MathUtil.floorDiv(calcMonths, 12));
        const newMonth = MathUtil.floorMod(calcMonths, 12) + 1;
        return LocalDate._resolvePreviousValid(newYear, newMonth, this._day);
    }

    /**
     * Returns a copy of this {@link LocalDate} with the specified period in weeks added.
     *
     * This method adds the specified amount in weeks to the days field incrementing
     * the month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2008-12-31 plus one week would result in 2009-01-07.
     *
     * @param {!number} weeksToAdd - the weeks to add, may be negative
     * @return {LocalDate} a {@link LocalDate} based on this date with the weeks added, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    plusWeeks(weeksToAdd) {
        return this.plusDays(MathUtil.safeMultiply(weeksToAdd, 7));
    }


    /**
     * Returns a copy of this LocalDate with the specified number of days added.
     *
     * This method adds the specified amount to the days field incrementing the
     * month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2008-12-31 plus one day would result in 2009-01-01.
     *
     * @param {number} daysToAdd - the days to add, may be negative
     * @return {LocalDate} a LocalDate based on this date with the days added, not null
     * @throws AssertionError if the result exceeds the supported date range
     */
    plusDays(daysToAdd) {
        if (daysToAdd === 0) {
            return this;
        }
        const mjDay = MathUtil.safeAdd(this.toEpochDay(), daysToAdd);
        return LocalDate.ofEpochDay(mjDay);
    }

    /**
     * Returns a copy of this date with the specified period subtracted.
     *
     * This method returns a new date based on this date with the specified period subtracted.
     * This can be used to subtract any period that is defined by a unit, for example to subtract years, months or days.
     * The unit is responsible for the details of the calculation, including the resolution
     * of any edge cases in the calculation.
     *
     * @param {!number} amountToSubtract - the amount of the unit to subtract from the result, may be negative
     * @param {!TemporalUnit} unit  the unit of the period to subtract, not null
     * @return {LocalDate} a {@link LocalDate} based on this date with the specified period subtracted, not null
     * @throws {DateTimeException} if the unit cannot be added to this type
     */
    _minusUnit(amountToSubtract, unit) {
        requireNonNull(amountToSubtract, 'amountToSubtract');
        requireNonNull(unit, 'unit');
        return this._plusUnit(-1 * amountToSubtract, unit);
    }

    /**
     * Returns a copy of this {@link LocalDate} with the specified period in years subtracted.
     *
     * This method subtracts the specified amount from the years field in three steps:
     *
     * 1. Subtract the input years to the year field
     * 2. Check if the resulting date would be invalid
     * 3. Adjust the day-of-month to the last valid day if necessary
     *
     * For example, 2008-02-29 (leap year) minus one year would result in the
     * invalid date 2007-02-29 (standard year). Instead of returning an invalid
     * result, the last valid day of the month, 2007-02-28, is selected instead.
     *
     * @param {!number} yearsToSubtract - the years to subtract, may be negative
     * @return {LocalDate} a {@link LocalDate} based on this date with the years subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusYears(yearsToSubtract) {
        return this.plusYears(yearsToSubtract * -1);
    }

    /**
     * Returns a copy of this {@link LocalDate} with the specified period in months subtracted.
     *
     * This method subtracts the specified amount from the months field in three steps:
     *
     * 1. Subtract the input months to the month-of-year field
     * 2. Check if the resulting date would be invalid
     * 3. Adjust the day-of-month to the last valid day if necessary
     *
     * For example, 2007-03-31 minus one month would result in the invalid date
     * 2007-02-31. Instead of returning an invalid result, the last valid day
     * of the month, 2007-02-28, is selected instead.
     *
     * @param {!number} monthsToSubtract - the months to subtract, may be negative
     * @return {LocalDate} a {@link LocalDate} based on this date with the months subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusMonths(monthsToSubtract) {
        return this.plusMonths(monthsToSubtract * -1);
    }

    /**
     * Returns a copy of this {@link LocalDate} with the specified period in weeks subtracted.
     *
     * This method subtracts the specified amount in weeks from the days field decrementing
     * the month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2009-01-07 minus one week would result in 2008-12-31.
     *
     * @param {!number} weeksToSubtract - the weeks to subtract, may be negative
     * @return {LocalDate} a {@link LocalDate} based on this date with the weeks subtracted, not null
     * @throws {DateTimeException} if the result exceeds the supported date range
     */
    minusWeeks(weeksToSubtract) {
        return this.plusWeeks(weeksToSubtract * -1);
    }

    /*
     * Returns a copy of this LocalDate with the specified number of days subtracted.
     *
     * This method subtracts the specified amount from the days field decrementing the
     * month and year fields as necessary to ensure the result remains valid.
     * The result is only invalid if the maximum/minimum year is exceeded.
     *
     * For example, 2009-01-01 minus one day would result in 2008-12-31.
     *
     * @param {number} daysToSubtract - the days to subtract, may be negative
     * @return {LocalDate} a LocalDate based on this date with the days subtracted, not null
     * @throws AssertionError if the result exceeds the supported date range
     */
    minusDays(daysToSubtract) {
        return this.plusDays(daysToSubtract * -1);
    }

    /**
     * Queries this date using the specified query.
     *
     * This queries this date using the specified query strategy object.
     * The {@link TemporalQuery} object defines the logic to be used to
     * obtain the result. Read the documentation of the query to understand
     * what the result of this method will be.
     *
     * The result of this method is obtained by invoking the
     * {@link TemporalQuery#queryFrom} method on the
     * specified query passing `this` as the argument.
     *
     * @param {TemporalQuery} query - the query to invoke, not null
     * @return the query result, null may be returned (defined by the query)
     * @throws {DateTimeException} if unable to query (defined by the query)
     * @throws {ArithmeticException} if numeric overflow occurs (defined by the query)
     */
    query(query) {
        requireNonNull(query, 'query');
        if (query === TemporalQueries.localDate()) {
            return this;
        }
        return super.query(query);
    }

    /**
     * Adjusts the specified temporal object to have the same date as this object.
     *
     * This returns a temporal object of the same observable type as the input
     * with the date changed to be the same as this.
     *
     * The adjustment is equivalent to using {@link Temporal#with}
     * passing {@link ChronoField.EPOCH_DAY} as the field.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisLocalDate.adjustInto(temporal);
     *   temporal = temporal.with(thisLocalDate);
     * </pre>
     *
     * @param {!TemporalAdjuster} temporal - the target object to be adjusted, not null
     * @return the adjusted object, not null
     * @throws {DateTimeException} if unable to make the adjustment
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    adjustInto(temporal) {
        return super.adjustInto(temporal);
    }

    /**
     * function overloading for {@link LocalDate.until}
     *
     * called with 1 (or less) arguments {{@link LocalDate.until1}} is called
     * otherwise {@link LocalDate.until2}
     *
     * @param {!TemporalAccessor} p1
     * @param {TemporalUnit} p2 - not null if called with 2 arguments
     * @return {number|Period}
     */
    until(p1, p2){
        if(arguments.length < 2){
            return this.until1(p1);
        } else {
            return this.until2(p1, p2);
        }
    }

    /**
     * Calculates the period between this date and another date in
     * terms of the specified unit.
     *
     * This calculates the period between two dates in terms of a single unit.
     * The start and end points are `this` and the specified date.
     * The result will be negative if the end is before the start.
     * The {@link Temporal} passed to this method must be a {@link LocalDate}.
     * For example, the period in days between two dates can be calculated
     * using {@link startDate.until}.
     *
     * The calculation returns a whole number, representing the number of
     * complete units between the two dates.
     * For example, the period in months between 2012-06-15 and 2012-08-14
     * will only be one month as it is one day short of two months.
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
     * The units {@link DAYS}, {@link WEEKS}, {@link MONTHS}, {@link YEARS},
     * {@link DECADES}, {@link CENTURIES}, {@link MILLENNIA} and {@link ERAS}
     * are supported. Other {@link ChronoUnit} values will throw an exception.
     *
     * If the unit is not a {@link ChronoUnit}, then the result of this method
     * is obtained by invoking {@link TemporalUnit.between}
     * passing `this` as the first argument and the input temporal as
     * the second argument.
     *
     * @param {!TemporalAccessor} endExclusive - the end date, which is converted to a {@link LocalDate}, not null
     * @param {!TemporalUnit} unit - the unit to measure the period in, not null
     * @return {number} the amount of the period between this date and the end date
     * @throws {DateTimeException} if the period cannot be calculated
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    until2(endExclusive, unit) {
        const end = LocalDate.from(endExclusive);
        if (unit instanceof ChronoUnit) {
            switch (unit) {
                case ChronoUnit.DAYS: return this.daysUntil(end);
                case ChronoUnit.WEEKS: return MathUtil.intDiv(this.daysUntil(end), 7);
                case ChronoUnit.MONTHS: return this._monthsUntil(end);
                case ChronoUnit.YEARS: return MathUtil.intDiv(this._monthsUntil(end), 12);
                case ChronoUnit.DECADES: return MathUtil.intDiv(this._monthsUntil(end), 120);
                case ChronoUnit.CENTURIES: return MathUtil.intDiv(this._monthsUntil(end), 1200);
                case ChronoUnit.MILLENNIA: return MathUtil.intDiv(this._monthsUntil(end), 12000);
                case ChronoUnit.ERAS: return end.getLong(ChronoField.ERA) - this.getLong(ChronoField.ERA);
            }
            throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
        }
        return unit.between(this, end);
    }

    /**
     *
     * @param {!LocalDate} end
     * @returns {number}
     * @protected
     */
    daysUntil(end) {
        return end.toEpochDay() - this.toEpochDay();  // no overflow
    }

    /**
     *
     * @param {!LocalDate} end
     * @returns {number}
     * @private
     */
    _monthsUntil(end) {
        const packed1 = this._prolepticMonth() * 32 + this.dayOfMonth();  // no overflow
        const packed2 = end._prolepticMonth() * 32 + end.dayOfMonth();  // no overflow
        return MathUtil.intDiv((packed2 - packed1), 32);
    }

    /**
     * Calculates the period between this date and another date as a {@link Period}.
     *
     * This calculates the period between two dates in terms of years, months and days.
     * The start and end points are `this` and the specified date.
     * The result will be negative if the end is before the start.
     *
     * The calculation is performed using the ISO calendar system.
     * If necessary, the input date will be converted to ISO.
     *
     * The start date is included, but the end date is not.
     * The period is calculated by removing complete months, then calculating
     * the remaining number of days, adjusting to ensure that both have the same sign.
     * The number of months is then normalized into years and months based on a 12 month year.
     * A month is considered to be complete if the end day-of-month is greater
     * than or equal to the start day-of-month.
     * For example, from `2010-01-15` to `2011-03-18` is "1 year, 2 months and 3 days".
     *
     * The result of this method can be a negative period if the end is before the start.
     * The negative sign will be the same in each of year, month and day.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method.
     * The second is to use {@link Period#between}:
     * <pre>
     *   // these two lines are equivalent
     *   period = start.until(end);
     *   period = Period.between(start, end);
     * </pre>
     * The choice should be made based on which makes the code more readable.
     *
     * @param {!TemporalAccessor} endDate - the end date, exclusive, which may be in any chronology, not null
     * @return {Period} the period between this date and the end date, not null
     */
    until1(endDate) {
        const end = LocalDate.from(endDate);
        let totalMonths = end._prolepticMonth() - this._prolepticMonth();  // safe
        let days = end._day - this._day;
        if (totalMonths > 0 && days < 0) {
            totalMonths--;
            const calcDate = this.plusMonths(totalMonths);
            days = (end.toEpochDay() - calcDate.toEpochDay());  // safe
        } else if (totalMonths < 0 && days > 0) {
            totalMonths++;
            days -= end.lengthOfMonth();
        }
        const years = MathUtil.intDiv(totalMonths, 12);  // safe
        const months = MathUtil.intMod(totalMonths, 12);  // safe
        return Period.of(years, months, days);
    }


    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link LocalDate.atTime}
     *
     * if called with 1 argument {@link LocalDate.atTime1} is called
     * otherwise {@link LocalDate.atTime4}
     *
     * @return {LocalDateTime|OffsetDateTime} the local date-time formed from this date and the specified params
     */
    atTime(){
        if(arguments.length===1){
            return this.atTime1.apply(this, arguments);
        } else {
            return this.atTime4.apply(this, arguments);
        }
    }

    /**
     * Combines this date with a time to create a {@link LocalDateTime}.
     *
     * This returns a {@link LocalDateTime} formed from this date at the specified time.
     * All possible combinations of date and time are valid.
     *
     * @param {LocalTime} time - the time to combine with, not null
     * @return {LocalDateTime|OffsetDateTime} the date-time formed from this date and the specified time, not null
     */
    atTime1(time) {
        requireNonNull(time, 'time');
        if (time instanceof LocalTime) {
            return LocalDateTime.of(this, time);
        } else if (time instanceof OffsetTime) {
            return this._atTimeOffsetTime(time);
        } else {
            throw new IllegalArgumentException(`time must be an instance of LocalTime or OffsetTime${ 
                time && time.constructor && time.constructor.name ? `, but is ${time.constructor.name}` : ''}`);
        }
    }

    /**
     * Combines this date with a time to create a {@link LocalDateTime}.
     *
     * This returns a {@link LocalDateTime} formed from this date at the
     * specified hour, minute, second and nanosecond.
     * The individual time fields must be within their valid range.
     * All possible combinations of date and time are valid.
     *
     * @param {!number} hour - the hour-of-day to use, from 0 to 23
     * @param {!number} minute - the minute-of-hour to use, from 0 to 59
     * @param {number} [second=0] - the second-of-minute to represent, from 0 to 59
     * @param {number} [nanoOfSecond=0] - the nano-of-second to represent, from 0 to 999,999,999
     * @return {LocalDateTime} the local date-time formed from this date and the specified time, not null
     * @throws {DateTimeException} if the value of any field is out of range
     */
    atTime4(hour, minute, second=0, nanoOfSecond=0) {
        return this.atTime1(LocalTime.of(hour, minute, second, nanoOfSecond));
    }

    /**
     * Combines this date with an offset time to create an {@link OffsetDateTime}.
     *
     * This returns an {@link OffsetDateTime} formed from this date at the specified time.
     * All possible combinations of date and time are valid.
     *
     * @param {OffsetTime} time - the time to combine with, not null
     * @return {OffsetDateTime} the offset date-time formed from this date and the specified time, not null
     */
    _atTimeOffsetTime(time) { // atTime(offsetTime)
        return OffsetDateTime.of(LocalDateTime.of(this, time.toLocalTime()), time.offset());
    }

    /**
     * Combines this date with the time of midnight to create a {@link LocalDateTime}
     * at the start of this date.
     *
     * This returns a {@link LocalDateTime} formed from this date at the time of
     * midnight, 00:00, at the start of this date.
     *
     * If zone is not null, this returns a {@link ZonedDateTime} formed from this date at the
     * specified zone, with the time set to be the earliest valid time according
     * to the rules in the time-zone.
     *
     * Time-zone rules, such as daylight savings, mean that not every local date-time
     * is valid for the specified zone, thus the local date-time may not be midnight.
     *
     * In most cases, there is only one valid offset for a local date-time.
     * In the case of an overlap, there are two valid offsets, and the earlier one is used,
     * corresponding to the first occurrence of midnight on the date.
     * In the case of a gap, the zoned date-time will represent the instant just after the gap.
     *
     * If the zone ID is a {@link ZoneOffset}, then the result always has a time of midnight.
     *
     * To convert to a specific time in a given time-zone call {@link atTime}
     * followed by {@link LocalDateTime#atZone}.
     *
     * @param {ZoneId} zone - optional ZoneId or ZoneOffset
     * @return {LocalDateTime|ZonedDateTime} the local date-time of midnight at the start of this date, not null
     */
    atStartOfDay(zone) {
        if(zone != null){
            return this._atStartOfDayWithZone(zone);
        } else {
            return LocalDateTime.of(this, LocalTime.MIDNIGHT);
        }
    }

    /**
     * Combines this date with a time-zone to create a {@link ZonedDateTime}
     * at the start of the day
     *
     * This returns a {@link ZonedDateTime} formed from this date at the
     * specified zone, with the time set to be the earliest valid time according
     * to the rules in the time-zone.
     *
     * Time-zone rules, such as daylight savings, mean that not every local date-time
     * is valid for the specified zone, thus the local date-time may not be midnight.
     *
     * In most cases, there is only one valid offset for a local date-time.
     * In the case of an overlap, there are two valid offsets, and the earlier one is used,
     * corresponding to the first occurrence of midnight on the date.
     * In the case of a gap, the zoned date-time will represent the instant just after the gap.
     *
     * If the zone ID is a {@link ZoneOffset}, then the result always has a time of midnight.
     *
     * To convert to a specific time in a given time-zone call {@link atTime}
     * followed by {@link LocalDateTime#atZone}.
     *
     * @param {!ZoneId} zone - the zone ID to use, not null
     * @return {ZonedDateTime} the zoned date-time formed from this date and the earliest valid time for the zone, not null
     */
    _atStartOfDayWithZone(zone) {
        requireNonNull(zone, 'zone');
        let ldt = this.atTime(LocalTime.MIDNIGHT);
        // need to handle case where there is a gap from 11:30 to 00:30
        // standard ZDT factory would result in 01:00 rather than 00:30
        if (zone instanceof ZoneOffset === false) {
            const trans = zone.rules().transition(ldt);
            if (trans != null && trans.isGap()) {
                ldt = trans.dateTimeAfter();
            }
        }
        return ZonedDateTime.of(ldt, zone);
    }


    /**
     * Converts this date to the Epoch Day.
     *
     * The Epoch Day count is a simple incrementing count of days where day 0 is 1970-01-01 (ISO).
     * This definition is the same for all chronologies, enabling conversion.
     *
     * @return {number} the Epoch Day equivalent to this date
     */
    toEpochDay() {
        const y = this._year;
        const m = this._month;
        let total = 0;
        total += 365 * y;
        if (y >= 0) {
            total += MathUtil.intDiv(y + 3, 4) - MathUtil.intDiv(y + 99, 100) + MathUtil.intDiv(y + 399, 400);
        } else {
            total -= MathUtil.intDiv(y, -4) - MathUtil.intDiv(y, -100) + MathUtil.intDiv(y, -400);
        }
        total += MathUtil.intDiv(367 * m - 362, 12);
        total += this.dayOfMonth() - 1;
        if (m > 2) {
            total--;
            if (!IsoChronology.isLeapYear(y)) {
                total--;
            }
        }
        return total - DAYS_0000_TO_1970;
    }

    /**
     * Compares this date to another date.
     *
     * The comparison is primarily based on the date, from earliest to latest.
     * It is "consistent with equals", as defined by {@link Comparable}.
     *
     * If all the dates being compared are instances of {@link LocalDate},
     * then the comparison will be entirely based on the date.
     * If some dates being compared are in different chronologies, then the
     * chronology is also considered, see {@link ChronoLocalDate.compareTo}.
     *
     * @param {!LocalDate} other - the other date to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, LocalDate, 'other');
        return this._compareTo0(other);
        // return super.compareTo(other);  if not instanceof LocalDate
    }

    /**
     *
     * @param {!LocalDate} otherDate
     * @returns {number}
     * @private
     */
    _compareTo0(otherDate) {
        let cmp = (this._year - otherDate._year);
        if (cmp === 0) {
            cmp = (this._month - otherDate._month);
            if (cmp === 0) {
                cmp = (this._day - otherDate._day);
            }
        }
        return cmp;
    }

    /**
     * Checks if this date is after the specified date.
     *
     * This checks to see if this date represents a point on the
     * local time-line after the other date.
     * <pre>
     *   LocalDate a = LocalDate.of(2012, 6, 30);
     *   LocalDate b = LocalDate.of(2012, 7, 1);
     *   a.isAfter(b) == false
     *   a.isAfter(a) == false
     *   b.isAfter(a) == true
     * </pre>
     *
     * This method only considers the position of the two dates on the local time-line.
     * It does not take into account the chronology, or calendar system.
     * This is different from the comparison in {@link compareTo},
     * but is the same approach as {@link DATE_COMPARATOR}.
     *
     * @param {!LocalDate} other - the other date to compare to, not null
     * @return {boolean} true if this date is after the specified date
     */
    isAfter(other) {
        return this.compareTo(other) > 0;
        // return super.isAfter(other) if not instanceof LocalDate
    }

    /**
     * Checks if this date is before the specified date.
     *
     * This checks to see if this date represents a point on the
     * local time-line before the other date.
     * <pre>
     *   LocalDate a = LocalDate.of(2012, 6, 30);
     *   LocalDate b = LocalDate.of(2012, 7, 1);
     *   a.isBefore(b) == true
     *   a.isBefore(a) == false
     *   b.isBefore(a) == false
     * </pre>
     *
     * This method only considers the position of the two dates on the local time-line.
     * It does not take into account the chronology, or calendar system.
     * This is different from the comparison in {@link compareTo},
     * but is the same approach as {@link DATE_COMPARATOR}.
     *
     * @param {!LocalDate} other - the other date to compare to, not null
     * @return {boolean} true if this date is before the specified date
     */
    isBefore(other) {
        return this.compareTo(other) < 0;
        // return super.isBefore(other) if not instanceof LocalDate
    }

    /**
     * Checks if this date is equal to the specified date.
     *
     * This checks to see if this date represents the same point on the
     * local time-line as the other date.
     * <pre>
     *   LocalDate a = LocalDate.of(2012, 6, 30);
     *   LocalDate b = LocalDate.of(2012, 7, 1);
     *   a.isEqual(b) == false
     *   a.isEqual(a) == true
     *   b.isEqual(a) == false
     * </pre>
     *
     * This method only considers the position of the two dates on the local time-line.
     * It does not take into account the chronology, or calendar system.
     * This is different from the comparison in {@link compareTo}
     * but is the same approach as {@link DATE_COMPARATOR}.
     *
     * @param {!LocalDate} other - the other date to compare to, not null
     * @return {boolean} true if this date is equal to the specified date
     */
    isEqual(other) {
        return this.compareTo(other) === 0;
        // return super.isEqual(other) if not instanceof LocalDate
    }

    /**
     * Checks if this date is equal to another date.
     *
     * Compares this LocalDate with another ensuring that the date is the same.
     *
     * Only objects of type LocalDate are compared, other types return false.
     *
     * @param {*} other - the object to check, null returns false
     * @return {boolean} true if this is equal to the other date
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof LocalDate) {
            return this._compareTo0(other) === 0;
        }
        return false;
    }

    /**
     * A hash code for this date.
     *
     * @return {number} a suitable hash code
     */
    hashCode() {
        const yearValue = this._year;
        const monthValue = this._month;
        const dayValue = this._day;
        return MathUtil.hash((yearValue & 0xFFFFF800) ^ ((yearValue << 11) + (monthValue << 6) + (dayValue)));
    }

    /**
     * Outputs this date as a String, such as 2007-12-03.
     * The output will be in the ISO-8601 format uuuu-MM-dd.
     *
     * @return {string} a string representation of this date, not null
     */
    toString() {
        let dayString, monthString, yearString;

        const yearValue = this._year;
        const monthValue = this._month;
        const dayValue = this._day;

        const absYear = Math.abs(yearValue);

        if (absYear < 1000) {
            if (yearValue < 0) {
                yearString = `-${(`${yearValue - 10000}`).slice(-4)}`;
            } else {
                yearString = (`${yearValue + 10000}`).slice(-4);
            }
        } else {
            if (yearValue > 9999) {
                yearString = `+${yearValue}`;
            } else {
                yearString = `${yearValue}`;
            }
        }

        if (monthValue < 10) {
            monthString = `-0${monthValue}`;
        } else {
            monthString = `-${monthValue}`;
        }

        if (dayValue < 10) {
            dayString = `-0${dayValue}`;
        } else {
            dayString = `-${dayValue}`;
        }

        return yearString + monthString + dayString;
    }

    /**
     *
     * @return {string} same as {@link LocalDate.toString}
     */
    toJSON() {
        return this.toString();
    }

    /**
     * Outputs this date as a string using the formatter.
     *
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return {String} the formatted date string, not null
     * @throws DateTimeException if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        requireInstance(formatter, DateTimeFormatter, 'formatter');
        return super.format(formatter);
    }
}

export function _init() {
    /**
     * The minimum supported {@link LocalDate}
     * This could be used by an application as a "far past" date.
     */
    LocalDate.MIN = LocalDate.of(YearConstants.MIN_VALUE, 1, 1);
    /**
     * The maximum supported {@link LocalDate}
     * This could be used by an application as a "far future" date.
     */
    LocalDate.MAX = LocalDate.of(YearConstants.MAX_VALUE, 12, 31);
    /**
     * The date at epoch day 0, that is 1970-01-01.
     */
    LocalDate.EPOCH_0 = LocalDate.ofEpochDay(0);

    LocalDate.FROM = createTemporalQuery('LocalDate.FROM', (temporal) => {
        return LocalDate.from(temporal);
    });
}
