/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { MathUtil } from './MathUtil';
import { requireNonNull, requireInstance } from './assert';
import { DateTimeException, UnsupportedTemporalTypeException, ArithmeticException, DateTimeParseException } from './errors';

import { IsoChronology } from './chrono/IsoChronology';

import { ChronoUnit } from './temporal/ChronoUnit';
import { TemporalAmount } from './temporal/TemporalAmount';

import { LocalDate } from './LocalDate';

/**
 * The pattern for parsing.
 */
const PATTERN = /([-+]?)P(?:([-+]?[0-9]+)Y)?(?:([-+]?[0-9]+)M)?(?:([-+]?[0-9]+)W)?(?:([-+]?[0-9]+)D)?/;

/**
 * A date-based amount of time, such as '2 years, 3 months and 4 days'.
 *
 * This class models a quantity or amount of time in terms of years, months and days.
 * See {@link Duration} for the time-based equivalent to this class.
 *
 * Durations and period differ in their treatment of daylight savings time
 * when added to {@link ZonedDateTime}. A {@link Duration} will add an exact
 * number of seconds, thus a duration of one day is always exactly 24 hours.
 * By contrast, a {@link Period} will add a conceptual day, trying to maintain
 * the local time.
 *
 * For example, consider adding a period of one day and a duration of one day to
 * 18:00 on the evening before a daylight savings gap. The {@link Period} will add
 * the conceptual day and result in a {@link ZonedDateTime} at 18:00 the following day.
 * By contrast, the {@link Duration} will add exactly 24 hours, resulting in a
 * {@link ZonedDateTime} at 19:00 the following day (assuming a one hour DST gap).
 *
 * The supported units of a period are {@link ChronoUnit#YEARS},
 * {@link ChronoUnit#MONTHS} and {@link ChronoUnit#DAYS}.
 * All three fields are always present, but may be set to zero.
 *
 * The period may be used with any calendar system.
 * The meaning of a 'year' or 'month' is only applied when the object is added to a date.
 *
 * The period is modeled as a directed amount of time, meaning that individual parts of the
 * period may be negative.
 *
 * The months and years fields may be normalized (see {@link normalized}).
 * The normalization assumes a 12 month year, so is not appropriate for all calendar systems.
 *
 * ### Static properties of Class {@link Period}
 *
 * Period.ZERO
 *
 * A constant for a period of zero.
 *
 */
export class Period extends TemporalAmount /* extends ChronoPeriod */ {

    /**
     * do not call the constructor directly
     * use a factory method instead
     *
     * @param {number} years
     * @param {number} months
     * @param {number} days
     * @private
     */
    constructor(years, months, days){
        super();
        
        const _years = MathUtil.safeToInt(years);
        const _months =  MathUtil.safeToInt(months);
        const _days = MathUtil.safeToInt(days);

        if( _years === 0 && _months === 0 && _days === 0 ){
            if (!Period.ZERO) {
                this._years = _years;
                this._months =  _months;
                this._days = _days;
                Period.ZERO = this;
            }
            return Period.ZERO;
        }
        
        /**
         * The number of years.
         */
        this._years = _years;
        /**
         * The number of months.
         */
        this._months =  _months;
        /**
         * The number of days.
         */
        this._days = _days;
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains a {@link Period} representing a number of years.
     *
     * The resulting period will have the specified years.
     * The months and days units will be zero.
     *
     * @param {number} years - the number of years, positive or negative
     * @return {Period} the period of years, not null
     */
    static ofYears(years) {
        return Period.create(years, 0, 0);
    }

    /**
     * Obtains a {@link Period} representing a number of months.
     *
     * The resulting period will have the specified months.
     * The years and days units will be zero.
     *
     * @param {number} months - the number of months, positive or negative
     * @return {Period} the period of months, not null
     */
    static ofMonths(months) {
        return Period.create(0, months, 0);
    }

    /**
     * Obtains a {@link Period} representing a number of weeks.
     *
     * The resulting period will have days equal to the weeks multiplied by seven.
     * The years and months units will be zero.
     *
     * @param {number} weeks - the number of weeks, positive or negative
     * @return {Period} the period of days, not null
     */
    static ofWeeks(weeks) {
        return Period.create(0, 0, MathUtil.safeMultiply(weeks, 7));
    }

    /**
     * Obtains a {@link Period} representing a number of days.
     *
     * The resulting period will have the specified days.
     * The years and months units will be zero.
     *
     * @param {number} days - the number of days, positive or negative
     * @return {Period} the period of days, not null
     */
    static ofDays(days) {
        return Period.create(0, 0, days);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains a {@link Period} representing a number of years, months and days.
     *
     * This creates an instance based on years, months and days.
     *
     * @param {!number} years - the amount of years, may be negative
     * @param {!number} months - the amount of months, may be negative
     * @param {!number} days - the amount of days, may be negative
     * @return {Period} the period of years, months and days, not null
     */
    static of(years, months, days) {
        return Period.create(years, months, days);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@link Period} from a temporal amount.
     *
     * This obtains a period based on the specified amount.
     * A {@link TemporalAmount} represents an - amount of time, which may be
     * date-based or time-based, which this factory extracts to a {@link Period}.
     *
     * The conversion loops around the set of units from the amount and uses
     * the {@link ChronoUnit#YEARS}, {@link ChronoUnit#MONTHS}
     * and {@link ChronoUnit#DAYS} units to create a period.
     * If any other units are found then an exception is thrown.
     *
     * If the amount is a {@link ChronoPeriod} then it must use the ISO chronology.
     *
     * @param {TemporalAmount} amount - the temporal amount to convert, not null
     * @return {Period} the equivalent period, not null
     * @throws DateTimeException if unable to convert to a {@link Period}
     * @throws ArithmeticException if the amount of years, months or days exceeds an int
     */
    static from(amount) {
        if (amount instanceof Period) {
            return amount;
        }
        /*
        if (amount instanceof ChronoPeriod) {
            if (IsoChronology.INSTANCE !== amount.chronology()) {
                throw new DateTimeException('Period requires ISO chronology: ' + amount);
            }
        }
*/
        requireNonNull(amount, 'amount');
        let years = 0;
        let months = 0;
        let days = 0;
        const units = amount.units();
        for (let i=0; i<units.length; i++) {
            const unit = units[i];
            const unitAmount = amount.get(unit);
            if (unit === ChronoUnit.YEARS) {
                years = MathUtil.safeToInt(unitAmount);
            } else if (unit === ChronoUnit.MONTHS) {
                months = MathUtil.safeToInt(unitAmount);
            } else if (unit === ChronoUnit.DAYS) {
                days = MathUtil.safeToInt(unitAmount);
            } else {
                throw new DateTimeException(`Unit must be Years, Months or Days, but was ${unit}`);
            }
        }
        return Period.create(years, months, days);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains a {@link Period} consisting of the number of years, months,
     * and days between two dates.
     *
     * The start date is included, but the end date is not.
     * The period is calculated by removing complete months, then calculating
     * the remaining number of days, adjusting to ensure that both have the same sign.
     * The number of months is then split into years and months based on a 12 month year.
     * A month is considered if the end day-of-month is greater than or equal to the start day-of-month.
     * For example, from `2010-01-15` to `2011-03-18` is one year, two months and three days.
     *
     * The result of this method can be a negative period if the end is before the start.
     * The negative sign will be the same in each of year, month and day.

     * see {@link ChronoLocalDate.until}
     *
     * @param {LocalDate} startDate - the start date, inclusive, not null
     * @param {LocalDate} endDate - the end date, exclusive, not null
     * @return {Period} the period between this date and the end date, not null
     */
    static between(startDate, endDate) {
        requireNonNull(startDate, 'startDate');
        requireNonNull(endDate, 'endDate');
        requireInstance(startDate, LocalDate, 'startDate');
        requireInstance(endDate, LocalDate, 'endDate');
        return startDate.until(endDate);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains a {@link Period} from a text string such as {@link PnYnMnD}.
     *
     * This will parse the string produced by {@link toString} which is
     * based on the ISO-8601 period formats {@link PnYnMnD} and {@link PnW}.
     *
     * The string starts with an optional sign, denoted by the ASCII negative
     * or positive symbol. If negative, the whole period is negated.
     * The ASCII letter 'P' is next in upper or lower case.
     * There are then four sections, each consisting of a number and a suffix.
     * At least one of the four sections must be present.
     * The sections have suffixes in ASCII of 'Y', 'M', 'W' and 'D' for
     * years, months, weeks and days, accepted in upper or lower case.
     * The suffixes must occur in order.
     * The number part of each section must consist of ASCII digits.
     * The number may be prefixed by the ASCII negative or positive symbol.
     * The number must parse to an `int`.
     *
     * The leading plus/minus sign, and negative values for other units are
     * not part of the ISO-8601 standard. In addition, ISO-8601 does not
     * permit mixing between the {@link PnYnMnD} and {@link PnW} formats.
     * Any week-based input is multiplied by 7 and treated as a number of days.
     *
     * For example, the following are valid inputs:
     * <pre>
     *   'P2Y'             -- Period.ofYears(2)
     *   'P3M'             -- Period.ofMonths(3)
     *   'P4W'             -- Period.ofWeeks(4)
     *   'P5D'             -- Period.ofDays(5)
     *   'P1Y2M3D'         -- Period.of(1, 2, 3)
     *   'P1Y2M3W4D'       -- Period.of(1, 2, 25)
     *   'P-1Y2M'          -- Period.of(-1, 2, 0)
     *   '-P1Y2M'          -- Period.of(-1, -2, 0)
     * </pre>
     *
     * @param {string} text - the text to parse, not null
     * @return {Period} the parsed period, not null
     * @throws DateTimeParseException if the text cannot be parsed to a period
     */
    static parse(text) {
        requireNonNull(text, 'text');
        try {
            return Period._parse(text);
        } catch (ex){
            if(ex instanceof ArithmeticException){
                throw new DateTimeParseException('Text cannot be parsed to a Period', text, 0, ex);
            } else {
                throw ex;
            }
        }
    }

    /**
     * because functions that containing a try/ catch block cant be optimized,
     * we put the code in a sub function.
     */
    static _parse(text){
        const matches = PATTERN.exec(text);
        if (matches != null) {
            const negate = '-' === matches[1] ? -1 : 1;
            const yearMatch = matches[2];
            const monthMatch = matches[3];
            const weekMatch = matches[4];
            const dayMatch = matches[5];
            if (yearMatch != null || monthMatch != null || weekMatch != null || dayMatch != null) {
                const years = Period._parseNumber(text, yearMatch, negate);
                const months = Period._parseNumber(text, monthMatch, negate);
                const weeks = Period._parseNumber(text, weekMatch, negate);
                let days = Period._parseNumber(text, dayMatch, negate);
                days = MathUtil.safeAdd(days, MathUtil.safeMultiply(weeks, 7));
                return Period.create(years, months, days);
            }
        }
        throw new DateTimeParseException('Text cannot be parsed to a Period', text, 0);
    }

    static _parseNumber(text, str, negate) {
        if (str == null) {
            return 0;
        }
        const val = MathUtil.parseInt(str);
        return MathUtil.safeMultiply(val, negate);
    }

    //-----------------------------------------------------------------------
    /**
     * Creates an instance.
     *
     * @param {number} years - the amount
     * @param {number} months - the amount
     * @param {number} days - the amount
     * @return {Duration}
     */
    static create(years, months, days) {
        return new Period(years, months, days);
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the list of units, from largest to smallest, that fully define this amount.
     *
     * @returns {ChronoUnit[]} list of units
     */
    units() {
        return [ChronoUnit.YEARS, ChronoUnit.MONTHS, ChronoUnit.DAYS];
    }

    /**
     * Gets the chronology that defines the meaning of the supported units.
     *
     * The period is defined by the chronology.
     * It controls the supported units and restricts addition/subtraction
     * to {@link ChronoLocalDate} instances of the same chronology.
     *
     * @return {IsoChronology} the chronology defining the period, not null
     */
    chronology() {
        return IsoChronology.INSTANCE;
    }

    /**
     * Gets the value of the requested unit.
     *
     * The supported units are chronology specific.
     * They will typically be {@link ChronoUnit#YEARS},
     * {@link ChronoUnit#MONTHS} and {@link ChronoUnit#DAYS}.
     * Requesting an unsupported unit will throw an exception.
     *
     * @param {TemporalUnit} unit the {@link TemporalUnit} for which to return the value
     * @return {number} the long value of the unit
     * @throws DateTimeException if the unit is not supported
     * @throws UnsupportedTemporalTypeException if the unit is not supported
     */
    get(unit) {
        if (unit === ChronoUnit.YEARS) {
            return this._years;
        }
        if (unit === ChronoUnit.MONTHS) {
            return this._months;
        }
        if (unit === ChronoUnit.DAYS) {
            return this._days;
        }
        throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if all three units of this period are zero.
     *
     * A zero period has the value zero for the years, months and days units.
     *
     * @return {boolean} true if this period is zero-length
     */
    isZero() {
        return (this === Period.ZERO);
    }

    /**
     * Checks if any of the three units of this period are negative.
     *
     * This checks whether the years, months or days units are less than zero.
     *
     * @return {boolean} true if any unit of this period is negative
     */
    isNegative() {
        return this._years < 0 || this._months < 0 || this._days < 0;
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the amount of years of this period.
     *
     * This returns the years unit.
     *
     * The months unit is not normalized with the years unit.
     * This means that a period of '15 months' is different to a period
     * of '1 year and 3 months'.
     *
     * @return {number} the amount of years of this period, may be negative
     */
    years() {
        return this._years;
    }

    /**
     * Gets the amount of months of this period.
     *
     * This returns the months unit.
     *
     * The months unit is not normalized with the years unit.
     * This means that a period of '15 months' is different to a period
     * of '1 year and 3 months'.
     *
     * @return {number} the amount of months of this period, may be negative
     */
    months() {
        return this._months;
    }

    /**
     * Gets the amount of days of this period.
     *
     * This returns the days unit.
     *
     * @return {number} the amount of days of this period, may be negative
     */
    days() {
        return this._days;
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this period with the specified amount of years.
     *
     * This sets the amount of the years unit in a copy of this period.
     * The months and days units are unaffected.
     *
     * The months unit is not normalized with the years unit.
     * This means that a period of '15 months' is different to a period
     * of '1 year and 3 months'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} years - the years to represent, may be negative
     * @return {Period} a {@link Period} based on this period with the requested years, not null
     */
    withYears(years) {
        if (years === this._years) {
            return this;
        }
        return Period.create(years, this._months, this._days);
    }

    /**
     * Returns a copy of this period with the specified amount of months.
     *
     * This sets the amount of the months unit in a copy of this period.
     * The years and days units are unaffected.
     *
     * The months unit is not normalized with the years unit.
     * This means that a period of '15 months' is different to a period
     * of '1 year and 3 months'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} months - the months to represent, may be negative
     * @return {Period} a {@link Period} based on this period with the requested months, not null
     */
    withMonths(months) {
        if (months === this._months) {
            return this;
        }
        return Period.create(this._years, months, this._days);
    }

    /**
     * Returns a copy of this period with the specified amount of days.
     *
     * This sets the amount of the days unit in a copy of this period.
     * The years and months units are unaffected.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} days - the days to represent, may be negative
     * @return {Period} a {@link Period} based on this period with the requested days, not null
     */
    withDays(days) {
        if (days === this._days) {
            return this;
        }
        return Period.create(this._years, this._months, days);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this period with the specified amount added.
     *
     * This input amount is converted to a {@link Period} using {@link from}.
     * This operates separately on the years, months and days.
     *
     * For example, '1 year, 6 months and 3 days' plus '2 years, 2 months and 2 days'
     * returns '3 years, 8 months and 5 days'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAmount} amountToAdd - the period to add, not null
     * @return {Period} a {@link Period} based on this period with the requested period added, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    plus(amountToAdd) {
        const amount = Period.from(amountToAdd);
        return Period.create(
            MathUtil.safeAdd(this._years, amount._years),
            MathUtil.safeAdd(this._months, amount._months),
            MathUtil.safeAdd(this._days, amount._days));
    }

    /**
     * Returns a copy of this period with the specified years added.
     *
     * This adds the amount to the years unit in a copy of this period.
     * The months and days units are unaffected.
     * For example, '1 year, 6 months and 3 days' plus 2 years returns '3 years, 6 months and 3 days'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} yearsToAdd - the years to add, positive or negative
     * @return {Period} a {@link Period} based on this period with the specified years added, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    plusYears(yearsToAdd) {
        if (yearsToAdd === 0) {
            return this;
        }
        return Period.create(MathUtil.safeToInt(MathUtil.safeAdd(this._years, yearsToAdd)), this._months, this._days);
    }

    /**
     * Returns a copy of this period with the specified months added.
     *
     * This adds the amount to the months unit in a copy of this period.
     * The years and days units are unaffected.
     * For example, '1 year, 6 months and 3 days' plus 2 months returns '1 year, 8 months and 3 days'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} monthsToAdd - the months to add, positive or negative
     * @return {Period} a {@link Period} based on this period with the specified months added, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    plusMonths(monthsToAdd) {
        if (monthsToAdd === 0) {
            return this;
        }
        return Period.create(this._years, MathUtil.safeToInt(MathUtil.safeAdd(this._months, monthsToAdd)), this._days);
    }

    /**
     * Returns a copy of this period with the specified days added.
     *
     * This adds the amount to the days unit in a copy of this period.
     * The years and months units are unaffected.
     * For example, '1 year, 6 months and 3 days' plus 2 days returns '1 year, 6 months and 5 days'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} daysToAdd - the days to add, positive or negative
     * @return {Period} a {@link Period} based on this period with the specified days added, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    plusDays(daysToAdd) {
        if (daysToAdd === 0) {
            return this;
        }
        return Period.create(this._years, this._months, MathUtil.safeToInt(MathUtil.safeAdd(this._days, daysToAdd)));
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this period with the specified amount subtracted.
     *
     * This input amount is converted to a {@link Period} using {@link from}.
     * This operates separately on the years, months and days.
     *
     * For example, '1 year, 6 months and 3 days' minus '2 years, 2 months and 2 days'
     * returns '-1 years, 4 months and 1 day'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAmount} amountToSubtract - the period to subtract, not null
     * @return {Period} a {@link Period} based on this period with the requested period subtracted, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    minus(amountToSubtract) {
        const amount = Period.from(amountToSubtract);
        return Period.create(
            MathUtil.safeSubtract(this._years, amount._years),
            MathUtil.safeSubtract(this._months, amount._months),
            MathUtil.safeSubtract(this._days, amount._days));
    }

    /**
     * Returns a copy of this period with the specified years subtracted.
     *
     * This subtracts the amount from the years unit in a copy of this period.
     * The months and days units are unaffected.
     * For example, '1 year, 6 months and 3 days' minus 2 years returns '-1 years, 6 months and 3 days'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} yearsToSubtract - the years to subtract, positive or negative
     * @return {Period} a {@link Period} based on this period with the specified years subtracted, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    minusYears(yearsToSubtract) {
        return this.plusYears(-1 * yearsToSubtract);
    }

    /**
     * Returns a copy of this period with the specified months subtracted.
     *
     * This subtracts the amount from the months unit in a copy of this period.
     * The years and days units are unaffected.
     * For example, '1 year, 6 months and 3 days' minus 2 months returns '1 year, 4 months and 3 days'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} monthsToSubtract - the years to subtract, positive or negative
     * @return {Period} a {@link Period} based on this period with the specified months subtracted, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    minusMonths(monthsToSubtract) {
        return this.plusMonths(-1 * monthsToSubtract);
    }

    /**
     * Returns a copy of this period with the specified days subtracted.
     *
     * This subtracts the amount from the days unit in a copy of this period.
     * The years and months units are unaffected.
     * For example, '1 year, 6 months and 3 days' minus 2 days returns '1 year, 6 months and 1 day'.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} daysToSubtract - the months to subtract, positive or negative
     * @return {Period} a {@link Period} based on this period with the specified days subtracted, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    minusDays(daysToSubtract) {
        return this.plusDays(-1 * daysToSubtract);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a new instance with each element in this period multiplied
     * by the specified scalar.
     *
     * This simply multiplies each field, years, months, days and normalized time,
     * by the scalar. No normalization is performed.
     *
     * @param {number} scalar - the scalar to multiply by, not null
     * @return {Period} a {@link Period} based on this period with the amounts multiplied by the scalar, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    multipliedBy(scalar) {
        if (this === Period.ZERO || scalar === 1) {
            return this;
        }
        return Period.create(
            MathUtil.safeMultiply(this._years, scalar),
            MathUtil.safeMultiply(this._months, scalar),
            MathUtil.safeMultiply(this._days, scalar));
    }

    /**
     * Returns a new instance with each amount in this period negated.
     *
     * @return {Period} a {@link Period} based on this period with the amounts negated, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    negated() {
        return this.multipliedBy(-1);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this period with the years and months normalized
     * using a 12 month year.
     *
     * This normalizes the years and months units, leaving the days unit unchanged.
     * The months unit is adjusted to have an absolute value less than 11,
     * with the years unit being adjusted to compensate. For example, a period of
     * '1 Year and 15 months' will be normalized to '2 years and 3 months'.
     *
     * The sign of the years and months units will be the same after normalization.
     * For example, a period of '1 year and -25 months' will be normalized to
     * '-1 year and -1 month'.
     *
     * This normalization uses a 12 month year which is not valid for all calendar systems.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @return {Period} a {@link Period} based on this period with excess months normalized to years, not null
     * @throws ArithmeticException if numeric overflow occurs
     */
    normalized() {
        const totalMonths = this.toTotalMonths();
        const splitYears = MathUtil.intDiv(totalMonths, 12);
        const splitMonths = MathUtil.intMod(totalMonths, 12);  // no overflow
        if (splitYears === this._years && splitMonths === this._months) {
            return this;
        }
        return Period.create(MathUtil.safeToInt(splitYears), splitMonths, this._days);
    }

    /**
     * Gets the total number of months in this period using a 12 month year.
     *
     * This returns the total number of months in the period by multiplying the
     * number of years by 12 and adding the number of months.
     *
     * This uses a 12 month year which is not valid for all calendar systems.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @return {number} the total number of months in the period, may be negative
     */
    toTotalMonths() {
        return this._years * 12 + this._months;  // no overflow
    }

    //-------------------------------------------------------------------------
    /**
     * Adds this period to the specified temporal object.
     *
     * This returns a temporal object of the same observable type as the input
     * with this period added.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#plus}.
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   dateTime = thisPeriod.addTo(dateTime);
     *   dateTime = dateTime.plus(thisPeriod);
     * </pre>
     *
     * The calculation will add the years, then months, then days.
     * Only non-zero amounts will be added.
     * If the date-time has a calendar system with a fixed number of months in a
     * year, then the years and months will be combined before being added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {Temporal} temporal - the temporal object to adjust, not null
     * @return {Temporal} an object of the same type with the adjustment made, not null
     * @throws DateTimeException if unable to add
     * @throws ArithmeticException if numeric overflow occurs
     */
    addTo(temporal) {
        requireNonNull(temporal, 'temporal');
        if (this._years !== 0) {
            if (this._months !== 0) {
                temporal = temporal.plus(this.toTotalMonths(), ChronoUnit.MONTHS);
            } else {
                temporal = temporal.plus(this._years, ChronoUnit.YEARS);
            }
        } else if (this._months !== 0) {
            temporal = temporal.plus(this._months, ChronoUnit.MONTHS);
        }
        if (this._days !== 0) {
            temporal = temporal.plus(this._days, ChronoUnit.DAYS);
        }
        return temporal;
    }

    /**
     * Subtracts this period from the specified temporal object.
     *
     * This returns a temporal object of the same observable type as the input
     * with this period subtracted.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#minus}.
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   dateTime = thisPeriod.subtractFrom(dateTime);
     *   dateTime = dateTime.minus(thisPeriod);
     * </pre>
     *
     * The calculation operates as follows.
     * First, the chronology of the temporal is checked to ensure it is ISO chronology or null.
     * Second, if the months are zero, the years are added if non-zero, otherwise
     * the combination of years and months is added if non-zero.
     * Finally, any days are added.
     *
     * The calculation will subtract the years, then months, then days.
     * Only non-zero amounts will be subtracted.
     * If the date-time has a calendar system with a fixed number of months in a
     * year, then the years and months will be combined before being subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {Temporal} temporal - the temporal object to adjust, not null
     * @return {Temporal} an object of the same type with the adjustment made, not null
     * @throws DateTimeException if unable to subtract
     * @throws ArithmeticException if numeric overflow occurs
     */
    subtractFrom(temporal) {
        requireNonNull(temporal, 'temporal');
        if (this._years !== 0) {
            if (this._months !== 0) {
                temporal = temporal.minus(this.toTotalMonths(), ChronoUnit.MONTHS);
            } else {
                temporal = temporal.minus(this._years, ChronoUnit.YEARS);
            }
        } else if (this._months !== 0) {
            temporal = temporal.minus(this._months, ChronoUnit.MONTHS);
        }
        if (this._days !== 0) {
            temporal = temporal.minus(this._days, ChronoUnit.DAYS);
        }
        return temporal;
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if this period is equal to another period.
     *
     * The comparison is based on the amounts held in the period.
     * To be equal, the years, months and days units must be individually equal.
     * Note that this means that a period of '15 Months' is not equal to a period
     * of '1 Year and 3 Months'.
     *
     * @param {*} obj - the object to check, null returns false
     * @return {boolean} true if this is equal to the other period
     */
    equals(obj) {
        if (this === obj) {
            return true;
        }
        if (obj instanceof Period) {
            const other = obj;
            return this._years === other._years &&
                this._months === other._months &&
                this._days === other._days;
        }
        return false;
    }

    /**
     * A hash code for this period.
     *
     * @return {number} a suitable hash code
     */
    hashCode() {
        return MathUtil.hashCode(this._years, this._months, this._days);
    }

    //-----------------------------------------------------------------------
    /**
     * Outputs this period as a string, such as {@link P6Y3M1D}.
     *
     * The output will be in the ISO-8601 period format.
     * A zero period will be represented as zero days, 'P0D'.
     *
     * @return {string} a string representation of this period, not null
     */
    toString() {
        if (this === Period.ZERO) {
            return 'P0D';
        } else {
            let buf = 'P';
            if (this._years !== 0) {
                buf += `${this._years}Y`;
            }
            if (this._months !== 0) {
                buf += `${this._months}M`;
            }
            if (this._days !== 0) {
                buf += `${this._days}D`;
            }
            return buf;
        }
    }

    /**
     *
     * @return {string} same as {@link Period.toString}
     */
    toJSON() {
        return this.toString();
    }
}

export function _init() {
    /**
     * A constant for a period of zero.
     */
    Period.ofDays(0);
}
