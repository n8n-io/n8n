/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE.md in the root directory of this source tree)
 */

import { requireNonNull, requireInstance } from './assert';
import { DateTimeException, UnsupportedTemporalTypeException } from './errors';
import { MathUtil } from './MathUtil';

import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { Clock } from './Clock';
import { DateTimeFormatterBuilder } from './format/DateTimeFormatterBuilder';
import { IsoChronology } from './chrono/IsoChronology';
import { LocalDate } from './LocalDate';
import { Month } from './Month';
import { SignStyle } from './format/SignStyle';
import { Temporal } from './temporal/Temporal';
import { TemporalField } from './temporal/TemporalField';
import { TemporalQueries } from './temporal/TemporalQueries';
import { TemporalQuery } from './temporal/TemporalQuery';
import { TemporalUnit } from './temporal/TemporalUnit';
import { createTemporalQuery } from './temporal/TemporalQuery';
import { ValueRange } from './temporal/ValueRange';
import { Year } from './Year';
import { ZoneId } from './ZoneId';

/**
 * A year-month in the ISO-8601 calendar system, such as `2007-12`.
 *
 * {@link YearMonth} is an immutable date-time object that represents the combination
 * of a year and month. Any field that can be derived from a year and month, such as
 * quarter-of-year, can be obtained.
 *
 * This class does not store or represent a day, time or time-zone.
 * For example, the value "October 2007" can be stored in a {@link YearMonth}.
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
export class YearMonth extends Temporal {
    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link YearMonth.now}
     *
     * if called with 0 argument {@link YearMonth.now0} is executed,
     *
     * if called with 1 argument and first argument is an instance of ZoneId, then {@link YearMonth.nowZoneId} is executed,
     *
     * otherwise {@link YearMonth.nowClock} is executed
     *
     * @param {?(ZoneId|Clock)} zoneIdOrClock
     * @returns {YearMonth}
     */
    static now(zoneIdOrClock) {
        if (arguments.length === 0) {
            return YearMonth.now0();
        } else if (arguments.length === 1 && zoneIdOrClock instanceof ZoneId) {
            return YearMonth.nowZoneId(zoneIdOrClock);
        } else {
            return YearMonth.nowClock(zoneIdOrClock);
        }
    }

    /**
     * Obtains the current year-month from the system clock in the default time-zone.
     *
     * This will query the system clock (see {@link Clock#systemDefaultZone}) in the default
     * time-zone to obtain the current year-month.
     * The zone and offset will be set based on the time-zone in the clock.
     *
     * Using this method will prevent the ability to use an alternate clock for testing
     * because the clock is hard-coded.
     *
     * @return {YearMonth} the current year-month using the system clock and default time-zone, not null
     */
    static now0() {
        return YearMonth.nowClock(Clock.systemDefaultZone());
    }

    /**
     * Obtains the current year-month from the system clock in the specified time-zone.
     *
     * This will query the system clock (see {@link Clock#system}) to obtain the current year-month.
     * Specifying the time-zone avoids dependence on the default time-zone.
     *
     * Using this method will prevent the ability to use an alternate clock for testing
     * because the clock is hard-coded.
     *
     * @param {ZoneId} zone  the zone ID to use, not null
     * @return {YearMonth} the current year-month using the system clock, not null
     */
    static nowZoneId(zone) {
        return YearMonth.nowClock(Clock.system(zone));
    }

    /**
     * Obtains the current year-month from the specified clock.
     *
     * This will query the specified clock to obtain the current year-month.
     * Using this method allows the use of an alternate clock for testing.
     * The alternate clock may be introduced using dependency injection.
     *
     * @param {Clock} clock  the clock to use, not null
     * @return {YearMonth} the current year-month, not null
     */
    static nowClock(clock) {
        const now = LocalDate.now(clock);
        return YearMonth.of(now.year(), now.month());
    }

    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link YearMonth.of}
     *
     * if called with 2 argument and first argument is an instance of Month, then {@link YearMonth.ofNumberMonth} is executed,
     *
     * otherwise {@link YearMonth.ofNumberNumber} is executed
     *
     * @param {!number} year
     * @param {!(Month|number)} monthOrNumber
     * @returns {YearMonth}
     */
    static of(year, monthOrNumber) {
        if (arguments.length === 2 && monthOrNumber instanceof Month) {
            return YearMonth.ofNumberMonth(year, monthOrNumber);
        } else {
            return YearMonth.ofNumberNumber(year, monthOrNumber);
        }
    }

    /**
     * Obtains an instance of {@link YearMonth} from a year and month.
     *
     * @param {number} year  the year to represent, from MIN_YEAR to MAX_YEAR
     * @param {Month} month  the month-of-year to represent, not null
     * @return {YearMonth} the year-month, not null
     * @throws DateTimeException if the year value is invalid
     */
    static ofNumberMonth(year, month) {
        requireNonNull(month, 'month');
        requireInstance(month, Month, 'month');
        return YearMonth.ofNumberNumber(year, month.value());
    }

    /**
     * Obtains an instance of {@link YearMonth} from a year and month.
     *
     * @param {number} year  the year to represent, from MIN_YEAR to MAX_YEAR
     * @param {number} month  the month-of-year to represent, from 1 (January) to 12 (December)
     * @return {YearMonth} the year-month, not null
     * @throws DateTimeException if either field value is invalid
     */
    static ofNumberNumber(year, month) {
        requireNonNull(year, 'year');
        requireNonNull(month, 'month');
        ChronoField.YEAR.checkValidValue(year);
        ChronoField.MONTH_OF_YEAR.checkValidValue(month);
        return new YearMonth(year, month);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@link YearMonth} from a temporal object.
     *
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link YearMonth}.
     *
     * The conversion extracts the {@link ChronoField#YEAR} and
     * {@link ChronoField#MONTH_OF_YEAR} fields.
     * The extraction is only permitted if the temporal object has an ISO
     * chronology, or can be converted to a {@link LocalDate}.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used in queries via method reference, {@link YearMonth::from}.
     *
     * @param {TemporalAccessor} temporal  the temporal object to convert, not null
     * @return {YearMonth} the year-month, not null
     * @throws DateTimeException if unable to convert to a {@link YearMonth}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        if (temporal instanceof YearMonth) {
            return temporal;
        }
        try {
            /* TODO: only IsoChronology for now
            if (IsoChronology.INSTANCE.equals(Chronology.from(temporal)) == false) {
                temporal = LocalDate.from(temporal);
            }*/
            return YearMonth.of(temporal.get(ChronoField.YEAR), temporal.get(ChronoField.MONTH_OF_YEAR));
        } catch (ex) {
            throw new DateTimeException(`Unable to obtain YearMonth from TemporalAccessor: ${ 
                temporal}, type ${temporal && temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
    }
    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link YearMonth.parse}
     *
     * if called with 2 argument and first argument is an instance of Month, then {@link YearMonth.parseString} is executed,
     *
     * otherwise {@link YearMonth.parseStringFormatter} is executed
     *
     * @param {!(String)} text
     * @param {?DateTimeFormatter} formatter
     * @returns {YearMonth}
     */
    static parse(text, formatter) {
        if (arguments.length === 1) {
            return YearMonth.parseString(text);
        } else {
            return YearMonth.parseStringFormatter(text, formatter);
        }
    }

    /**
     * Obtains an instance of {@link YearMonth} from a text string such as `2007-12`.
     *
     * The string must represent a valid year-month.
     * The format must be {@link yyyy-MM}.
     * Years outside the range 0000 to 9999 must be prefixed by the plus or minus symbol.
     *
     * @param {String} text  the text to parse such as "2007-12", not null
     * @return {YearMonth} the parsed year-month, not null
     * @throws DateTimeParseException if the text cannot be parsed
     */
    static parseString(text) {
        return YearMonth.parseStringFormatter(text, PARSER);
    }

    /**
     * Obtains an instance of {@link YearMonth} from a text string using a specific formatter.
     *
     * The text is parsed using the formatter, returning a year-month.
     *
     * @param {String} text  the text to parse, not null
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return the parsed year-month, not null
     * @throws DateTimeParseException if the text cannot be parsed
     */
    static parseStringFormatter(text, formatter) {
        requireNonNull(formatter, 'formatter');
        return formatter.parse(text, YearMonth.FROM);
    }


    /**
     * Constructor.
     *
     * @param {number} year  the year to represent, validated from MIN_YEAR to MAX_YEAR
     * @param {number} month  the month-of-year to represent, validated from 1 (January) to 12 (December)
     * @private
     */
    constructor(year, month) {
        super();
        this._year = MathUtil.safeToInt(year);
        this._month = MathUtil.safeToInt(month);
    }

    /**
     * function overloading for {@link YearMonth.isSupported}
     *
     * if called with 1 argument and first argument is an instance of TemporalField, then {@link YearMonth.isSupportedField} is executed,
     *
     * otherwise {@link YearMonth.isSupportedUnit} is executed
     *
     * @param {!(TemporalField|ChronoUnit)} fieldOrUnit
     * @returns {boolean}
     */
    isSupported(fieldOrUnit) {
        if (arguments.length === 1 && fieldOrUnit instanceof TemporalField) {
            return this.isSupportedField(fieldOrUnit);
        } else {
            return this.isSupportedUnit(fieldOrUnit);
        }
    }

    /**
     * Checks if the specified field is supported.
     *
     * This checks if this year-month can be queried for the specified field.
     * If false, then calling {@link range} and {@link get} will throw an exception.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this date-time.
     * The supported fields are:
     *
     * * {@link MONTH_OF_YEAR}
     * * {@link EPOCH_MONTH}
     * * {@link YEAR_OF_ERA}
     * * {@link YEAR}
     * * {@link ERA}
     *
     * All other {@link ChronoField} instances will return false.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.isSupportedBy}
     * passing `this` as the argument.
     * Whether the field is supported is determined by the field.
     *
     * @param {TemporalField} field  the field to check, null returns false
     * @return {boolean} true if the field is supported on this year-month, false if not
     */
    isSupportedField(field) {
        if (field instanceof ChronoField) {
            return field === ChronoField.YEAR || field === ChronoField.MONTH_OF_YEAR ||
                    field === ChronoField.PROLEPTIC_MONTH || field === ChronoField.YEAR_OF_ERA || field === ChronoField.ERA;
        }
        return field != null && field.isSupportedBy(this);
    }

    isSupportedUnit(unit) {
        if (unit instanceof ChronoUnit) {
            return unit === ChronoUnit.MONTHS || unit === ChronoUnit.YEARS || unit === ChronoUnit.DECADES || unit === ChronoUnit.CENTURIES || unit === ChronoUnit.MILLENNIA || unit === ChronoUnit.ERAS;
        }
        return unit != null && unit.isSupportedBy(this);
    }

    /**
     * Gets the range of valid values for the specified field.
     *
     * The range object expresses the minimum and maximum valid values for a field.
     * This year-month is used to enhance the accuracy of the returned range.
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
        if (field === ChronoField.YEAR_OF_ERA) {
            return (this.year() <= 0 ? ValueRange.of(1, Year.MAX_VALUE + 1) : ValueRange.of(1, Year.MAX_VALUE));
        }
        return super.range(field);
    }

    /**
     * Gets the value of the specified field from this year-month as an `int`.
     *
     * This queries this year-month for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this year-month, except {@link EPOCH_MONTH} which is too
     * large to fit in an `int` and throw a {@link DateTimeException}.
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
        requireNonNull(field, 'field');
        requireInstance(field, TemporalField, 'field');
        return this.range(field).checkValidIntValue(this.getLong(field), field);
    }

    /**
     * Gets the value of the specified field from this year-month as a `long`.
     *
     * This queries this year-month for the value for the specified field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this year-month.
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
        requireInstance(field, TemporalField, 'field');
        if (field instanceof ChronoField) {
            switch (field) {
                case ChronoField.MONTH_OF_YEAR: return this._month;
                case ChronoField.PROLEPTIC_MONTH: return this._getProlepticMonth();
                case ChronoField.YEAR_OF_ERA: return (this._year < 1 ? 1 - this._year : this._year);
                case ChronoField.YEAR: return this._year;
                case ChronoField.ERA: return (this._year < 1 ? 0 : 1);
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.getFrom(this);
    }

    _getProlepticMonth() {
        return MathUtil.safeAdd(MathUtil.safeMultiply(this._year, 12), (this._month - 1));
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the year field.
     *
     * This method returns the primitive `int` value for the year.
     *
     * The year returned by this method is proleptic as per {@link get}.
     *
     * @return {number} the year, from MIN_YEAR to MAX_YEAR
     */
    year() {
        return this._year;
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
        return this._month;
    }

    /**
     * Gets the month-of-year field using the {@link Month} enum.
     *
     * This method returns the enum {@link Month} for the month.
     * This avoids confusion as to what `int` values mean.
     * If you need access to the primitive `int` value, use {@link Month#getValue}.
     *
     * @return {Month} the month-of-year, not null
     */
    month() {
        return Month.of(this._month);
    }

    //-----------------------------------------------------------------------
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
     * Checks if the day-of-month is valid for this year-month.
     *
     * This method checks whether this year and month and the input day form
     * a valid date.
     *
     * @param {number} dayOfMonth  the day-of-month to validate, from 1 to 31, invalid value returns false
     * @return {boolean} true if the day is valid for this year-month
     */
    isValidDay(dayOfMonth) {
        return dayOfMonth >= 1 && dayOfMonth <= this.lengthOfMonth();
    }

    /**
     * Returns the length of the month, taking account of the year.
     *
     * This returns the length of the month in days.
     * For example, a date in January would return 31.
     *
     * @return {number} the length of the month in days, from 28 to 31
     */
    lengthOfMonth() {
        return this.month().length(this.isLeapYear());
    }

    /**
     * Returns the length of the year.
     *
     * This returns the length of the year in days, either 365 or 366.
     *
     * @return {number} 366 if the year is leap, 365 otherwise
     */
    lengthOfYear() {
        return (this.isLeapYear() ? 366 : 365);
    }

    /**
     * function overloading for {@link YearMonth.with}
     *
     * if called with 1 argument, then {@link YearMonth.withAdjuster} is executed,
     * otherwise {@link YearMonth.withFieldValue} is executed.
     *
     * @param {!(TemporalAdjuster|TemporalField)} adjusterOrField
     * @param {?number} value nullable only of first argument is an instance of TemporalAdjuster
     * @returns {YearMonth}
     */
    with(adjusterOrField, value) {
        if (arguments.length === 1) {
            return this._withAdjuster(adjusterOrField);
        } else {
            return this._withField(adjusterOrField, value);
        }
    }

    /**
     * Returns a copy of this year-month with the specified field set to a new value.
     *
     * This returns a new {@link YearMonth}, based on this one, with the value
     * for the specified field changed.
     * This can be used to change any supported field, such as the year or month.
     * If it is not possible to set the value, because the field is not supported or for
     * some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the adjustment is implemented here.
     * The supported fields behave as follows:
     *
     * * {@link MONTH_OF_YEAR} -
     *   Returns a {@link YearMonth} with the specified month-of-year.
     *   The year will be unchanged.
     * * {@link PROLEPTIC_MONTH} -
     *   Returns a {@link YearMonth} with the specified proleptic-month.
     *   This completely replaces the year and month of this object.
     * * {@link YEAR_OF_ERA} -
     *   Returns a {@link YearMonth} with the specified year-of-era
     *   The month and era will be unchanged.
     * * {@link YEAR} -
     *   Returns a {@link YearMonth} with the specified year.
     *   The month will be unchanged.
     * * {@link ERA} -
     *   Returns a {@link YearMonth} with the specified era.
     *   The month and year-of-era will be unchanged.
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
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalField} field  the field to set in the result, not null
     * @param {number} newValue  the new value of the field in the result
     * @return a {@link YearMonth} based on `this` with the specified field set, not null
     * @throws DateTimeException if the field cannot be set
     * @throws ArithmeticException if numeric overflow occurs
     */
    _withField(field, newValue) {
        requireNonNull(field, 'field');
        requireInstance(field, TemporalField, 'field');
        if (field instanceof ChronoField) {
            const f = field;
            f.checkValidValue(newValue);
            switch (f) {
                case ChronoField.MONTH_OF_YEAR: return this.withMonth(newValue);
                case ChronoField.PROLEPTIC_MONTH: return this.plusMonths(newValue - this.getLong(ChronoField.PROLEPTIC_MONTH));
                case ChronoField.YEAR_OF_ERA: return this.withYear((this._year < 1 ? 1 - newValue : newValue));
                case ChronoField.YEAR: return this.withYear(newValue);
                case ChronoField.ERA: return (this.getLong(ChronoField.ERA) === newValue ? this : this.withYear(1 - this._year));
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.adjustInto(this, newValue);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link YearMonth} with the year altered.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} year  the year to set in the returned year-month, from MIN_YEAR to MAX_YEAR
     * @return {YearMonth} based on this year-month with the requested year, not null
     * @throws DateTimeException if the year value is invalid
     */
    withYear(year) {
        ChronoField.YEAR.checkValidValue(year);
        return new YearMonth(year, this._month);
    }

    /**
     * Returns a copy of this {@link YearMonth} with the month-of-year altered.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} month  the month-of-year to set in the returned year-month, from 1 (January) to 12 (December)
     * @return {YearMonth} based on this year-month with the requested month, not null
     * @throws DateTimeException if the month-of-year value is invalid
     */
    withMonth(month) {
        ChronoField.MONTH_OF_YEAR.checkValidValue(month);
        return new YearMonth(this._year, month);
    }

    //-----------------------------------------------------------------------

    /**
     * @param {number} amountToAdd
     * @param {TemporalUnit} unit
     * @return {YearMonth} based on this year-month with the addition made, not null
     * @throws DateTimeException if the addition cannot be made
     * @throws ArithmeticException if numeric overflow occurs
     */
    _plusUnit(amountToAdd, unit) {
        requireNonNull(unit, 'unit');
        requireInstance(unit, TemporalUnit, 'unit');
        if (unit instanceof ChronoUnit) {
            switch (unit) {
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
     * Returns a copy of this year-month with the specified period in years added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} yearsToAdd  the years to add, may be negative
     * @return {YearMonth} based on this year-month with the years added, not null
     * @throws DateTimeException if the result exceeds the supported range
     */
    plusYears(yearsToAdd) {
        if (yearsToAdd === 0) {
            return this;
        }
        const newYear = ChronoField.YEAR.checkValidIntValue(this._year + yearsToAdd);  // safe overflow
        return this.withYear(newYear);
    }

    /**
     * Returns a copy of this year-month with the specified period in months added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} monthsToAdd  the months to add, may be negative
     * @return {YearMonth} based on this year-month with the months added, not null
     * @throws DateTimeException if the result exceeds the supported range
     */
    plusMonths(monthsToAdd) {
        if (monthsToAdd === 0) {
            return this;
        }
        const monthCount = (this._year * 12) + (this._month - 1);
        const calcMonths = monthCount + monthsToAdd;
        const newYear = ChronoField.YEAR.checkValidIntValue(MathUtil.floorDiv(calcMonths, 12));
        const newMonth = MathUtil.floorMod(calcMonths, 12) + 1;
        return new YearMonth(newYear, newMonth);
    }

    //-----------------------------------------------------------------------

    /**
     * Returns a copy of this year-month with the specified period in years subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} yearsToSubtract  the years to subtract, may be negative
     * @return {YearMonth} based on this year-month with the years subtracted, not null
     * @throws DateTimeException if the result exceeds the supported range
     */
    minusYears(yearsToSubtract) {
        return (yearsToSubtract === MathUtil.MIN_SAFE_INTEGER ? this.plusYears(MathUtil.MIN_SAFE_INTEGER).plusYears(1) : this.plusYears(-yearsToSubtract));
    }

    /**
     * Returns a copy of this year-month with the specified period in months subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} monthsToSubtract  the months to subtract, may be negative
     * @return {YearMonth} based on this year-month with the months subtracted, not null
     * @throws DateTimeException if the result exceeds the supported range
     */
    minusMonths(monthsToSubtract) {
        return (monthsToSubtract === MathUtil.MIN_SAFE_INTEGER ? this.plusMonths(Math.MAX_SAFE_INTEGER).plusMonths(1) : this.plusMonths(-monthsToSubtract));
    }

    //-----------------------------------------------------------------------
    /**
     * Queries this year-month using the specified query.
     *
     * This queries this year-month using the specified query strategy object.
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
        } else if (query === TemporalQueries.precision()) {
            return ChronoUnit.MONTHS;
        } else if (query === TemporalQueries.localDate() || query === TemporalQueries.localTime() ||
                query === TemporalQueries.zone() || query === TemporalQueries.zoneId() || query === TemporalQueries.offset()) {
            return null;
        }
        return super.query(query);
    }

    /**
     * Adjusts the specified temporal object to have this year-month.
     *
     * This returns a temporal object of the same observable type as the input
     * with the year and month changed to be the same as this.
     *
     * The adjustment is equivalent to using {@link Temporal#with}
     * passing {@link ChronoField#PROLEPTIC_MONTH} as the field.
     * If the specified temporal object does not use the ISO calendar system then
     * a {@link DateTimeException} is thrown.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisYearMonth.adjustInto(temporal);
     *   temporal = temporal.with(thisYearMonth);
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
        requireInstance(temporal, Temporal, 'temporal');
        /* TODO: only IsoChronology for now
        if (Chronology.from(temporal).equals(IsoChronology.INSTANCE) == false) {
            throw new DateTimeException("Adjustment only supported on ISO date-time");
        }*/
        return temporal.with(ChronoField.PROLEPTIC_MONTH, this._getProlepticMonth());
    }

    /**
     * Calculates the period between this year-month and another year-month in
     * terms of the specified unit.
     *
     * This calculates the period between two year-months in terms of a single unit.
     * The start and end points are `this` and the specified year-month.
     * The result will be negative if the end is before the start.
     * The {@link Temporal} passed to this method must be a {@link YearMonth}.
     * For example, the period in years between two year-months can be calculated
     * using {@link startYearMonth.until}.
     *
     * The calculation returns a whole number, representing the number of
     * complete units between the two year-months.
     * For example, the period in decades between 2012-06 and 2032-05
     * will only be one decade as it is one month short of two decades.
     *
     * This method operates in association with {@link TemporalUnit#between}.
     * The result of this method is a `long` representing the amount of
     * the specified unit. By contrast, the result of {@link between} is an
     * object that can be used directly in addition/subtraction:
     * <pre>
     *   long period = start.until(end, YEARS);   // this method
     *   dateTime.plus(YEARS.between(start, end));      // use in plus/minus
     * </pre>
     *
     * The calculation is implemented in this method for {@link ChronoUnit}.
     * The units {@link MONTHS}, {@link YEARS}, {@link DECADES},
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
     * @param {Temporal} endExclusive  the end year-month, which is converted to a {@link YearMonth}, not null
     * @param {TemporalUnit} unit  the unit to measure the period in, not null
     * @return {number} the amount of the period between this year-month and the end year-month
     * @throws DateTimeException if the period cannot be calculated
     * @throws ArithmeticException if numeric overflow occurs
     */
    until(endExclusive, unit) {
        requireNonNull(endExclusive, 'endExclusive');
        requireNonNull(unit, 'unit');
        requireInstance(endExclusive, Temporal, 'endExclusive');
        requireInstance(unit, TemporalUnit, 'unit');

        const end = YearMonth.from(endExclusive);
        if (unit instanceof ChronoUnit) {
            const monthsUntil = end._getProlepticMonth() - this._getProlepticMonth();  // no overflow
            switch (unit) {
                case ChronoUnit.MONTHS: return monthsUntil;
                case ChronoUnit.YEARS: return MathUtil.intDiv(monthsUntil, 12);
                case ChronoUnit.DECADES: return MathUtil.intDiv(monthsUntil, 120);
                case ChronoUnit.CENTURIES: return MathUtil.intDiv(monthsUntil, 1200);
                case ChronoUnit.MILLENNIA: return MathUtil.intDiv(monthsUntil, 12000);
                case ChronoUnit.ERAS: return end.getLong(ChronoField.ERA) - this.getLong(ChronoField.ERA);
            }
            throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
        }
        return unit.between(this, end);
    }

    //-----------------------------------------------------------------------
    /**
     * Combines this year-month with a day-of-month to create a {@link LocalDate}.
     *
     * This returns a {@link LocalDate} formed from this year-month and the specified day-of-month.
     *
     * The day-of-month value must be valid for the year-month.
     *
     * This method can be used as part of a chain to produce a date:
     * <pre>
     *  LocalDate date = year.atMonth(month).atDay(day);
     * </pre>
     *
     * @param {number} dayOfMonth  the day-of-month to use, from 1 to 31
     * @return {LocalDate} the date formed from this year-month and the specified day, not null
     * @throws DateTimeException if the day is invalid for the year-month
     * @see #isValidDay(int)
     */
    atDay(dayOfMonth) {
        requireNonNull(dayOfMonth, 'dayOfMonth');
        return LocalDate.of(this._year, this._month, dayOfMonth);
    }

    /**
     * Returns a {@link LocalDate} at the end of the month.
     *
     * This returns a {@link LocalDate} based on this year-month.
     * The day-of-month is set to the last valid day of the month, taking
     * into account leap years.
     *
     * This method can be used as part of a chain to produce a date:
     * <pre>
     *  LocalDate date = year.atMonth(month).atEndOfMonth();
     * </pre>
     *
     * @return {LocalDate} the last valid date of this year-month, not null
     */
    atEndOfMonth() {
        return LocalDate.of(this._year, this._month, this.lengthOfMonth());
    }

    //-----------------------------------------------------------------------
    /**
     * Compares this year-month to another year-month.
     *
     * The comparison is based first on the value of the year, then on the value of the month.
     * It is "consistent with equals", as defined by {@link Comparable}.
     *
     * @param {YearMonth} other  the other year-month to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, YearMonth, 'other');
        let cmp = (this._year - other.year());
        if (cmp === 0) {
            cmp = (this._month - other.monthValue());
        }
        return cmp;
    }

    /**
     * Is this year-month after the specified year-month.
     *
     * @param {YearMonth} other  the other year-month to compare to, not null
     * @return {boolean} true if this is after the specified year-month
     */
    isAfter(other) {
        return this.compareTo(other) > 0;
    }

    /**
     * Is this year-month before the specified year-month.
     *
     * @param {YearMonth} other  the other year-month to compare to, not null
     * @return {boolean} true if this point is before the specified year-month
     */
    isBefore(other) {
        return this.compareTo(other) < 0;
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if this year-month is equal to another year-month.
     *
     * The comparison is based on the time-line position of the year-months.
     *
     * @param {*} obj  the object to check, null returns false
     * @return {boolean} true if this is equal to the other year-month
     */
    equals(obj) {
        if (this === obj) {
            return true;
        }
        if (obj instanceof YearMonth) {
            const other = obj;
            return this.year() === other.year() && this.monthValue() === other.monthValue();
        }
        return false;
    }

    //-----------------------------------------------------------------------
    /**
     * Outputs this year-month as a string, such as `2007-12`.
     *
     * The output will be in the format {@link yyyy-MM}:
     *
     * @return {String} a string representation of this year-month, not null
     */
    toString() {
        return PARSER.format(this);
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
     * Outputs this year-month as a string using the formatter.
     *
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return {String} the formatted year-month string, not null
     * @throws DateTimeException if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        return formatter.format(this);
    }

}

let PARSER;

export function _init() {

    PARSER = new DateTimeFormatterBuilder()
        .appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD)
        .appendLiteral('-')
        .appendValue(ChronoField.MONTH_OF_YEAR, 2)
        .toFormatter();

    YearMonth.FROM = createTemporalQuery('YearMonth.FROM', (temporal) => {
        return YearMonth.from(temporal);
    });
}
