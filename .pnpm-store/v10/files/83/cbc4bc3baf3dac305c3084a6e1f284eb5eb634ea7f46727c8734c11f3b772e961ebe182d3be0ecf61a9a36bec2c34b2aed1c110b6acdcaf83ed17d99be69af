/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { DateTimeException, UnsupportedTemporalTypeException } from './errors';
import { requireNonNull, requireInstance } from './assert';
import { MathUtil } from './MathUtil';

import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { Clock } from './Clock';
import { DateTimeFormatter } from './format/DateTimeFormatter';
import { DateTimeFormatterBuilder } from './format/DateTimeFormatterBuilder';
import { IsoChronology } from './chrono/IsoChronology';
import { LocalDate } from './LocalDate';
import { Month } from './Month';
import { MonthDay } from './MonthDay';
import { SignStyle } from './format/SignStyle';
import { Temporal } from './temporal/Temporal';
import { TemporalAccessor } from './temporal/TemporalAccessor';
import { TemporalField } from './temporal/TemporalField';
import { TemporalQueries } from './temporal/TemporalQueries';
import { TemporalQuery, createTemporalQuery } from './temporal/TemporalQuery';
import { TemporalUnit } from './temporal/TemporalUnit';
import { YearConstants } from './YearConstants';
import { YearMonth } from './YearMonth';
import { ZoneId } from './ZoneId';


/**
 * A year in the ISO-8601 calendar system, such as `2007`.
 *
 * {@link Year} is an immutable date-time object that represents a year.
 * Any field that can be derived from a year can be obtained.
 *
 * **Note that years in the ISO chronology only align with years in the
 * Gregorian-Julian system for modern years. Parts of Russia did not switch to the
 * modern Gregorian/ISO rules until 1920.
 * As such, historical years must be treated with caution.**
 *
 * This class does not store or represent a month, day, time or time-zone.
 * For example, the value "2007" can be stored in a {@link Year}.
 *
 * Years represented by this class follow the ISO-8601 standard and use
 * the proleptic numbering system. Year 1 is preceded by year 0, then by year -1.
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
 * Year.MIN_VALUE = -999.999;
 *
 * The minimum supported year. Theoretically the minimum could be -28.542.4812 years in javascript.
 * approx LocalDateTime.ofEpochSecond(Number.MIN_SAFE_INTEGER, 0, ZoneOffset.UTC).year()
 *
 * Year.MAX_VALUE = 999.999;
 *
 * The maximum supported year. Theoretically the maximum could be 285.428.751 years in javascript.
 * approx LocalDateTime.ofEpochSecond(Number.MAX_SAFE_INTEGER, 0, ZoneOffset.UTC).year()
 *
 */
export class Year extends Temporal {

    /**
     *
     * @param {number} value
     * @private
     */
    constructor(value) {
        super();
        this._year = MathUtil.safeToInt(value);
    }

    /**
     *
     * @return {number} gets the value
     */
    value() {
        return this._year;
    }

    /**
     * function overloading for {@link Year.now}
     *
     * if called without arguments, then {@link Year.now0} is executed.

     * if called with 1 arguments and first argument is an instance of ZoneId, then {@link Year.nowZoneId} is executed.
     *
     * Otherwise {@link Year.nowClock} is executed.
     *
     * @param {!(ZoneId|Clock)} zoneIdOrClock
     * @returns {Year}
     */
    static now(zoneIdOrClock = undefined) {
        if (zoneIdOrClock === undefined) {
            return Year.now0();
        } else if (zoneIdOrClock instanceof ZoneId) {
            return Year.nowZoneId(zoneIdOrClock);
        } else {
            return Year.nowClock(zoneIdOrClock);
        }
    }

    /**
     * Obtains the current year from the system clock in the default time-zone.
     *
     * This will query the system clock (see {@link Clock#systemDefaultZone}) in the default
     * time-zone to obtain the current year.
     *
     * Using this method will prevent the ability to use an alternate clock for testing
     * because the clock is hard-coded.
     *
     * @return {Year} the current year using the system clock and default time-zone, not null
     */
    static now0() {
        return Year.nowClock(Clock.systemDefaultZone());
    }

    /**
     * Obtains the current year from the system clock in the specified time-zone.
     *
     * This will query the system clock (see {@link Clock#system}) to obtain the current year.
     * Specifying the time-zone avoids dependence on the default time-zone.
     *
     * Using this method will prevent the ability to use an alternate clock for testing
     * because the clock is hard-coded.
     *
     * @param {ZoneId} zone  the zone ID to use, not null
     * @return {Year} the current year using the system clock, not null
     */
    static nowZoneId(zone) {
        requireNonNull(zone, 'zone');
        requireInstance(zone, ZoneId, 'zone');
        return Year.nowClock(Clock.system(zone));
    }

    /**
     * Obtains the current year from the specified clock.
     *
     * This will query the specified clock to obtain the current year.
     * Using this method allows the use of an alternate clock for testing.
     * The alternate clock may be introduced using dependency injection.
     *
     * @param {Clock} clock  the clock to use, not null
     * @return {Year} the current year, not null
     */
    static nowClock(clock) {
        requireNonNull(clock, 'clock');
        requireInstance(clock, Clock, 'clock');
        const now = LocalDate.now(clock);  // called once
        return Year.of(now.year());
    }
    /**
     * Obtains an instance of {@link Year}.
     *
     * This method accepts a year value from the proleptic ISO calendar system.
     *
     * * The year 2AD/CE is represented by 2.
     * * The year 1AD/CE is represented by 1.
     * * The year 1BC/BCE is represented by 0.
     * * The year 2BC/BCE is represented by -1.
     *
     * @param {Number} isoYear  the ISO proleptic year to represent, from {@link MIN_VALUE} to {@link MAX_VALUE}
     * @return {Year} the year, not null
     * @throws DateTimeException if the field is invalid
     */
    static of(isoYear) {
        requireNonNull(isoYear, 'isoYear');
        ChronoField.YEAR.checkValidValue(isoYear);
        return new Year(isoYear);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@link Year} from a temporal object.
     *
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link Year}.
     *
     * The conversion extracts the {@link ChronoField#YEAR} field.
     * The extraction is only permitted if the temporal object has an ISO
     * chronology, or can be converted to a {@link LocalDate}.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used in queries via method reference, {@link Year::from}.
     *
     * @param {TemporalAccessor} temporal  the temporal object to convert, not null
     * @return {Year} the year, not null
     * @throws DateTimeException if unable to convert to a {@link Year}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        requireInstance(temporal, TemporalAccessor, 'temporal');
        if (temporal instanceof Year) {
            return temporal;
        }
        try {
            /* TODO: we support only ISO for now
            if (IsoChronology.INSTANCE.equals(Chronology.from(temporal)) == false) {
                temporal = LocalDate.from(temporal);
            }*/
            return Year.of(temporal.get(ChronoField.YEAR));
        } catch (ex) {
            throw new DateTimeException(`Unable to obtain Year from TemporalAccessor: ${ 
                temporal}, type ${temporal && temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
    }
    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link Year.parse}
     *
     * if called with 1 argument, then {@link Year.parseText} is executed.
     *
     * Otherwise {@link Year.parseTextFormatter} is executed.
     *
     * @param {!(String)} text
     * @param {?DateTimeFormatter} formatter
     * @returns {Year}
     */
    static parse(text, formatter) {
        if (arguments.length <= 1) {
            return Year.parseText(text);
        } else {
            return Year.parseTextFormatter(text, formatter);
        }
    }

    /**
     * Obtains an instance of {@link Year} from a text string such as `2007`.
     *
     * The string must represent a valid year.
     * Years outside the range 0000 to 9999 must be prefixed by the plus or minus symbol.
     *
     * @param {String} text  the text to parse such as "2007", not null
     * @return {Year} the parsed year, not null
     * @throws DateTimeParseException if the text cannot be parsed
     */
    static parseText(text) {
        requireNonNull(text, 'text');
        return Year.parse(text, PARSER);
    }

    /**
     * Obtains an instance of {@link Year} from a text string using a specific formatter.
     *
     * The text is parsed using the formatter, returning a year.
     *
     * @param {String} text  the text to parse, not null
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return {Year} the parsed year, not null
     * @throws DateTimeParseException if the text cannot be parsed
     */
    static parseTextFormatter(text, formatter = PARSER) {
        requireNonNull(text, 'text');
        requireNonNull(formatter, 'formatter');
        requireInstance(formatter, DateTimeFormatter, 'formatter');
        return formatter.parse(text, Year.FROM);
    }

    //-------------------------------------------------------------------------
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
     * @param {number} year  the year to check
     * @return {boolean} true if the year is leap, false otherwise
     */
    static isLeap(year) {
        return ((MathUtil.intMod(year, 4) === 0) && ((MathUtil.intMod(year, 100) !== 0) || (MathUtil.intMod(year, 400) === 0)));
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
     * This checks if this year can be queried for the specified field.
     * If false, then calling {@link range} and {@link get} will throw an exception.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this date-time.
     * The supported fields are:
     *
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
     * @return {boolean} true if the field is supported on this year, false if not
     */
    isSupportedField(field) {
        if (field instanceof ChronoField) {
            return field === ChronoField.YEAR || field === ChronoField.YEAR_OF_ERA || field === ChronoField.ERA;
        }
        return field != null && field.isSupportedBy(this);
    }

    isSupportedUnit(unit) {
        if (unit instanceof ChronoUnit) {
            return unit === ChronoUnit.YEARS || unit === ChronoUnit.DECADES || unit === ChronoUnit.CENTURIES || unit === ChronoUnit.MILLENNIA || unit === ChronoUnit.ERAS;
        }
        return unit != null && unit.isSupportedBy(this);
    }

    /**
     * Gets the range of valid values for the specified field.
     *
     * The range object expresses the minimum and maximum valid values for a field.
     * This year is used to enhance the accuracy of the returned range.
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
        if (this.isSupported(field)) {
            return field.range();
        } else if (field instanceof ChronoField) {
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return super.range(field);
    }

    /**
     * Gets the value of the specified field from this year as an `int`.
     *
     * This queries this year for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this year.
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
     * Gets the value of the specified field from this year as a `long`.
     *
     * This queries this year for the value for the specified field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this year.
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
                case ChronoField.YEAR_OF_ERA: return (this._year < 1 ? 1 - this._year : this._year);
                case ChronoField.YEAR: return this._year;
                case ChronoField.ERA: return (this._year < 1 ? 0 : 1);
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.getFrom(this);
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
    isLeap() {
        return Year.isLeap(this._year);
    }

    //-----------------------------------------------------------------------

    /**
     * Returns a copy of this year with the specified field set to a new value.
     *
     * This returns a new {@link Year}, based on this one, with the value
     * for the specified field changed.
     * If it is not possible to set the value, because the field is not supported or for
     * some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the adjustment is implemented here.
     * The supported fields behave as follows:
     *
     * * {@link YEAR_OF_ERA} -
     *   Returns a {@link Year} with the specified year-of-era
     *   The era will be unchanged.
     * * {@link YEAR} -
     *   Returns a {@link Year} with the specified year.
     *   This completely replaces the date and is equivalent to {@link of}.
     * * {@link ERA} -
     *   Returns a {@link Year} with the specified era.
     *   The year-of-era will be unchanged.
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
     * @returns {Year} based on `this` with the specified field set, not null
     * @throws DateTimeException if the field cannot be set
     * @throws ArithmeticException if numeric overflow occurs
     */
    _withField(field, newValue) {
        requireNonNull(field, 'field');
        requireInstance(field, TemporalField, 'field');
        if (field instanceof ChronoField) {
            field.checkValidValue(newValue);
            switch (field) {
                case ChronoField.YEAR_OF_ERA:
                    return Year.of((this._year < 1 ? 1 - newValue : newValue));
                case ChronoField.YEAR:
                    return Year.of(newValue);
                case ChronoField.ERA:
                    return (this.getLong(ChronoField.ERA) === newValue ? this : Year.of(1 - this._year));
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.adjustInto(this, newValue);
    }

    /**
     * @param {number} amountToAdd
     * @param {TemporalUnit} unit
     * @return {Year} based on this year with the addition made, not null
     * @throws DateTimeException if the addition cannot be made
     * @throws ArithmeticException if numeric overflow occurs
     */
    _plusUnit(amountToAdd, unit) {
        requireNonNull(amountToAdd, 'amountToAdd');
        requireNonNull(unit, 'unit');
        requireInstance(unit, TemporalUnit, 'unit');
        if (unit instanceof ChronoUnit) {
            switch (unit) {
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
     * Returns a copy of this year with the specified number of years added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} yearsToAdd  the years to add, may be negative
     * @return {Year} based on this year with the period added, not null
     * @throws DateTimeException if the result exceeds the supported year range
     */
    plusYears(yearsToAdd) {
        if (yearsToAdd === 0) {
            return this;
        }
        return Year.of(ChronoField.YEAR.checkValidIntValue(MathUtil.safeAdd(this._year, yearsToAdd)));
    }

    //-----------------------------------------------------------------------

    /**
     * Returns a copy of this year with the specified number of years subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} yearsToSubtract  the years to subtract, may be negative
     * @return {Year} based on this year with the period subtracted, not null
     * @throws DateTimeException if the result exceeds the supported year range
     */
    minusYears(yearsToSubtract) {
        return (yearsToSubtract === MathUtil.MIN_SAFE_INTEGER ? this.plusYears(MathUtil.MAX_SAFE_INTEGER).plusYears(1) : this.plusYears(-yearsToSubtract));
    }

    /**
     * Adjusts the specified temporal object to have this year.
     *
     * This returns a temporal object of the same observable type as the input
     * with the year changed to be the same as this.
     *
     * The adjustment is equivalent to using {@link Temporal#with}
     * passing {@link ChronoField#YEAR} as the field.
     * If the specified temporal object does not use the ISO calendar system then
     * a {@link DateTimeException} is thrown.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisYear.adjustInto(temporal);
     *   temporal = temporal.with(thisYear);
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
        return temporal.with(ChronoField.YEAR, this._year);
    }

    /**
     * Checks if the month-day is valid for this year.
     *
     * This method checks whether this year and the input month and day form
     * a valid date.
     *
     * @param {MonthDay} monthDay  the month-day to validate, null returns false
     * @return {boolean} true if the month and day are valid for this year
     */
    isValidMonthDay(monthDay) {
        return monthDay != null && monthDay.isValidYear(this._year);
    }

    /**
     * Gets the length of this year in days.
     *
     * @return {number} the length of this year in days, 365 or 366
     */
    length() {
        return this.isLeap() ? 366 : 365;
    }

    //-----------------------------------------------------------------------
    /**
     * Combines this year with a day-of-year to create a {@link LocalDate}.
     *
     * This returns a {@link LocalDate} formed from this year and the specified day-of-year.
     *
     * The day-of-year value 366 is only valid in a leap year.
     *
     * @param {number} dayOfYear  the day-of-year to use, not null
     * @return {LocalDate} the local date formed from this year and the specified date of year, not null
     * @throws DateTimeException if the day of year is zero or less, 366 or greater or equal
     *  to 366 and this is not a leap year
     */
    atDay(dayOfYear) {
        return LocalDate.ofYearDay(this._year, dayOfYear);
    }

    /**
     * function overloading for {@link Year.atMonth}
     *
     * if called with 1 arguments and first argument is instance of Month, then {@link Year.atMonthMonth} is executed.
     *
     * Otherwise {@link Year.atMonthNumber} is executed.
     *
     * @param {Month|number} monthOrNumber
     * @returns {YearMonth}
     */
    atMonth(monthOrNumber) {
        if (arguments.length === 1 && monthOrNumber instanceof Month) {
            return this.atMonthMonth(monthOrNumber);
        } else {
            return this.atMonthNumber(monthOrNumber);
        }
    }

    /**
     * Combines this year with a month to create a {@link YearMonth}.
     *
     * This returns a {@link YearMonth} formed from this year and the specified month.
     * All possible combinations of year and month are valid.
     *
     * This method can be used as part of a chain to produce a date:
     * <pre>
     *  LocalDate date = year.atMonth(month).atDay(day);
     * </pre>
     *
     * @param {Month} month  the month-of-year to use, not null
     * @return {YearMonth} the year-month formed from this year and the specified month, not null
     */
    atMonthMonth(month) {
        requireNonNull(month, 'month');
        requireInstance(month, Month, 'month');
        return YearMonth.of(this._year, month);
    }

    /**
     * Combines this year with a month to create a {@link YearMonth}.
     *
     * This returns a {@link YearMonth} formed from this year and the specified month.
     * All possible combinations of year and month are valid.
     *
     * This method can be used as part of a chain to produce a date:
     * <pre>
     *  LocalDate date = year.atMonth(month).atDay(day);
     * </pre>
     *
     * @param {number} month  the month-of-year to use, from 1 (January) to 12 (December)
     * @return {YearMonth} the year-month formed from this year and the specified month, not null
     * @throws DateTimeException if the month is invalid
     */
    atMonthNumber(month) {
        requireNonNull(month, 'month');
        return YearMonth.of(this._year, month);
    }

    /**
     * Combines this year with a month-day to create a {@link LocalDate}.
     *
     * This returns a {@link LocalDate} formed from this year and the specified month-day.
     *
     * A month-day of February 29th will be adjusted to February 28th in the resulting
     * date if the year is not a leap year.
     *
     * @param {MonthDay} monthDay  the month-day to use, not null
     * @return {LocalDate} the local date formed from this year and the specified month-day, not null
     */
    atMonthDay(monthDay) {
        requireNonNull(monthDay, 'monthDay');
        requireInstance(monthDay, MonthDay, 'monthDay');
        return monthDay.atYear(this._year);
    }


    //-----------------------------------------------------------------------
    /**
     * Queries this year using the specified query.
     *
     * This queries this year using the specified query strategy object.
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
        requireNonNull(query, 'query()');
        requireInstance(query, TemporalQuery, 'query()');
        if (query === TemporalQueries.chronology()) {
            return IsoChronology.INSTANCE;
        } else if (query === TemporalQueries.precision()) {
            return ChronoUnit.YEARS;
        } else if (query === TemporalQueries.localDate() || query === TemporalQueries.localTime() ||
                query === TemporalQueries.zone() || query === TemporalQueries.zoneId() || query === TemporalQueries.offset()) {
            return null;
        }
        return super.query(query);
    }
    //-----------------------------------------------------------------------
    /**
     * Compares this year to another year.
     *
     * The comparison is based on the value of the year.
     * It is "consistent with equals", as defined by {@link Comparable}.
     *
     * @param {Year} other  the other year to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, Year, 'other');
        return this._year - other._year;
    }

    /**
     * Is this year after the specified year.
     *
     * @param {Year} other  the other year to compare to, not null
     * @return {boolean} true if this is after the specified year
     */
    isAfter(other) {
        requireNonNull(other, 'other');
        requireInstance(other, Year, 'other');
        return this._year > other._year;
    }

    /**
     * Is this year before the specified year.
     *
     * @param {Year} other  the other year to compare to, not null
     * @return {boolean} true if this point is before the specified year
     */
    isBefore(other) {
        requireNonNull(other, 'other');
        requireInstance(other, Year, 'other');
        return this._year < other._year;
    }
    /**
     * Outputs this year as a string using the formatter.
     *
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return {String} the formatted year string, not null
     * @throws DateTimeException if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        requireInstance(formatter, DateTimeFormatter, 'formatter');
        return formatter.format(this);
    }

    /**
     * Checks if this year is equal to the specified {@link Year}.
     *
     * The comparison is based on the value
     *
     * @param {*} other - the other year, null returns false
     * @return {boolean} true if the other duration is equal to this one
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof Year) {
            return this.value() === other.value();
        }
        return false;
    }
    /**
     * Outputs this year as a string.
     *
     * @return {String} a string representation of this year, not null
     */
    toString() {
        return `${this._year}`;
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
     * Calculates the amount of time until another temporal in terms of the specified unit.
     * This calculates the amount of time between two temporal objects in terms of a single {@link TemporalUnit}. The start and end points are this and the specified temporal. The end point is converted to be of the same type as the start point if different. The result will be negative if the end is before the start. For example, the amount in hours between two temporal objects can be calculated using `startTime.until(endTime, HOURS)`.
     *
     * The calculation returns a whole number, representing the number of complete units between the two temporals. For example, the amount in hours between the times 11:30 and 13:29 will only be one hour as it is one minute short of two hours.
     *
     * There are two equivalent ways of using this method. The first is to invoke this method directly. The second is to use `TemporalUnit.between(Temporal, Temporal)`:
     *
     * <pre>
     *    // these two lines are equivalent
     *    temporal = start.until(end, unit);
     *    temporal = unit.between(start, end);
     * </pre>
     *
     * The choice should be made based on which makes the code more readable.
     * For example, this method allows the number of days between two dates to be calculated:
     *
     * <pre>
     *   daysBetween = start.until(end, DAYS);
     *   // or alternatively
     *   daysBetween = DAYS.between(start, end);
     * </pre>
     *
     * ### Implementation Requirements:
     * Implementations must begin by checking to ensure that the input temporal object is of the same observable type as the implementation. They must then perform the calculation for all instances of {@link ChronoUnit}. An {@link UnsupportedTemporalTypeException} must be thrown for {@link ChronoUnit} instances that are unsupported.
     * If the unit is not a {@link ChronoUnit}, then the result of this method is obtained by invoking `TemporalUnit.between(Temporal, Temporal)` passing this as the first argument and the converted input temporal as the second argument.
     *
     * In summary, implementations must behave in a manner equivalent to this pseudo-code:
     *
     * <pre>
     *   // convert the end temporal to the same type as this class
     *   if (unit instanceof ChronoUnit) {
     *     // if unit is supported, then calculate and return result
     *     // else throw UnsupportedTemporalTypeException for unsupported units
     *   }
     *   return unit.between(this, convertedEndTemporal);
     * </pre>
     *
     * Note that the unit's between method must only be invoked if the two temporal objects have exactly the same type evaluated by `getClass()`.
     *
     * Implementations must ensure that no observable state is altered when this read-only method is invoked.
     *
     * @param {Temporal} endExclusive - the end temporal, exclusive, converted to be of the same type as this object, not null
     * @param {TemporalUnit} unit - the unit to measure the amount in, not null
     * @return {number} the amount of time between this temporal object and the specified one in terms of the unit; positive if the specified object is later than this one, negative if it is earlier than this one
     * @throws DateTimeException - if the amount cannot be calculated, or the end temporal cannot be converted to the same type as this temporal
     * @throws UnsupportedTemporalTypeException - if the unit is not supported
     * @throws ArithmeticException - if numeric overflow occurs
     */
    until(endExclusive, unit) {
        const end = Year.from(endExclusive);

        if (unit instanceof ChronoUnit) {
            const yearsUntil = end.value() - this.value();
            switch (unit) {
                case ChronoUnit.YEARS:
                    return yearsUntil;
                case ChronoUnit.DECADES:
                    return MathUtil.intDiv(yearsUntil, 10);
                case ChronoUnit.CENTURIES:
                    return MathUtil.intDiv(yearsUntil, 100);
                case ChronoUnit.MILLENNIA:
                    return MathUtil.intDiv(yearsUntil, 1000);
                case ChronoUnit.ERAS:
                    return end.getLong(ChronoField.ERA) - this.getLong(ChronoField.ERA);
            }
            throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
        }
        return unit.between(this, end);
    }
}

let PARSER;

export function _init() {

    Year.MIN_VALUE = YearConstants.MIN_VALUE;
    Year.MAX_VALUE = YearConstants.MAX_VALUE;

    PARSER = new DateTimeFormatterBuilder()
        .appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD)
        .toFormatter();

    Year.FROM = createTemporalQuery('Year.FROM', (temporal) => {
        return Year.from(temporal);
    });
}
