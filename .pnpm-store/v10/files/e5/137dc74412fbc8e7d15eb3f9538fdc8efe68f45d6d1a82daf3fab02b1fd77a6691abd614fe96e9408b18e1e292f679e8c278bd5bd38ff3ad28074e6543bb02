/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from '../assert';
import { IllegalStateException } from '../errors';

import { TemporalAdjuster } from './TemporalAdjuster';
import { ChronoField } from '../temporal/ChronoField';
import { ChronoUnit } from '../temporal/ChronoUnit';
import { MathUtil } from '../MathUtil';

/**
 * Common implementations of {@link TemporalAdjuster}.
 *
 * This class provides common implementations of {@link TemporalAdjuster}.
 * They are especially useful to document the intent of business logic and
 * often link well to requirements.
 * For example, these two pieces of code do the same thing, but the second
 * one is clearer (assuming that there is a static import of this class):
 * <pre>
 *  // direct manipulation
 *  date.withDayOfMonth(1).plusMonths(1).minusDays(1);
 *  // use of an adjuster from this class
 *  date.with(lastDayOfMonth());
 * </pre>
 * There are two equivalent ways of using a {@link TemporalAdjuster}.
 * The first is to invoke the method on the interface directly.
 * The second is to use {@link Temporal#with}:
 * <pre>
 *   // these two lines are equivalent, but the second approach is recommended
 *   dateTime = adjuster.adjustInto(dateTime);
 *   dateTime = dateTime.with(adjuster);
 * </pre>
 * It is recommended to use the second approach, {@link with},
 * as it is a lot clearer to read in code.
 *
 * ### Specification for implementors
 *
 * This is a thread-safe utility class.
 * All returned adjusters are immutable and thread-safe.
 *
 * The JDK 8 ofDateAdjuster(UnaryOperator) method is not backported.
 */
export class TemporalAdjusters {

    //-----------------------------------------------------------------------
    /**
     * Returns the 'first day of month' adjuster, which returns a new date set to
     * the first day of the current month.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 will return 2011-01-01.
     * * The input 2011-02-15 will return 2011-02-01.
     *
     * The behavior is suitable for use with most calendar systems.
     * It is equivalent to:
     * <pre>
     *  temporal.with(DAY_OF_MONTH, 1);
     * </pre>
     *
     * @return {TemporalAdjuster} the first day-of-month adjuster, not null
     */
    static firstDayOfMonth() {
        return Impl.FIRST_DAY_OF_MONTH;
    }

    /**
     * Returns the 'last day of month' adjuster, which returns a new date set to
     * the last day of the current month.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 will return 2011-01-31.
     * * The input 2011-02-15 will return 2011-02-28.
     * * The input 2012-02-15 will return 2012-02-29 (leap year).
     * * The input 2011-04-15 will return 2011-04-30.
     *
     * The behavior is suitable for use with most calendar systems.
     * It is equivalent to:
     * <pre>
     *  long lastDay = temporal.range(DAY_OF_MONTH).getMaximum();
     *  temporal.with(DAY_OF_MONTH, lastDay);
     * </pre>
     *
     * @return {TemporalAdjuster} the last day-of-month adjuster, not null
     */
    static lastDayOfMonth() {
        return Impl.LAST_DAY_OF_MONTH;
    }

    /**
     * Returns the 'first day of next month' adjuster, which returns a new date set to
     * the first day of the next month.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 will return 2011-02-01.
     * * The input 2011-02-15 will return 2011-03-01.
     *
     * The behavior is suitable for use with most calendar systems.
     * It is equivalent to:
     * <pre>
     *  temporal.with(DAY_OF_MONTH, 1).plus(1, MONTHS);
     * </pre>
     *
     * @return {TemporalAdjuster} the first day of next month adjuster, not null
     */
    static firstDayOfNextMonth() {
        return Impl.FIRST_DAY_OF_NEXT_MONTH;
    }

    //-----------------------------------------------------------------------
    /**
     * Returns the 'first day of year' adjuster, which returns a new date set to
     * the first day of the current year.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 will return 2011-01-01.
     * * The input 2011-02-15 will return 2011-01-01.
     *
     * The behavior is suitable for use with most calendar systems.
     * It is equivalent to:
     * <pre>
     *  temporal.with(DAY_OF_YEAR, 1);
     * </pre>
     *
     * @return {TemporalAdjuster} the first day-of-year adjuster, not null
     */
    static firstDayOfYear() {
        return Impl.FIRST_DAY_OF_YEAR;
    }

    /**
     * Returns the 'last day of year' adjuster, which returns a new date set to
     * the last day of the current year.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 will return 2011-12-31.
     * * The input 2011-02-15 will return 2011-12-31.
     *
     * The behavior is suitable for use with most calendar systems.
     * It is equivalent to:
     * <pre>
     *  long lastDay = temporal.range(DAY_OF_YEAR).getMaximum();
     *  temporal.with(DAY_OF_YEAR, lastDay);
     * </pre>
     *
     * @return {TemporalAdjuster} the last day-of-year adjuster, not null
     */
    static lastDayOfYear() {
        return Impl.LAST_DAY_OF_YEAR;
    }

    /**
     * Returns the 'first day of next year' adjuster, which returns a new date set to
     * the first day of the next year.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 will return 2012-01-01.
     *
     * The behavior is suitable for use with most calendar systems.
     * It is equivalent to:
     * <pre>
     *  temporal.with(DAY_OF_YEAR, 1).plus(1, YEARS);
     * </pre>
     *
     * @return {TemporalAdjuster} the first day of next month adjuster, not null
     */
    static firstDayOfNextYear() {
        return Impl.FIRST_DAY_OF_NEXT_YEAR;
    }

    //-----------------------------------------------------------------------
    /**
     * Returns the first in month adjuster, which returns a new date
     * in the same month with the first matching day-of-week.
     * This is used for expressions like 'first Tuesday in March'.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-12-15 for (MONDAY) will return 2011-12-05.
     * * The input 2011-12-15 for (FRIDAY) will return 2011-12-02.
     *
     * The behavior is suitable for use with most calendar systems.
     * It uses the {@link DAY_OF_WEEK} and {@link DAY_OF_MONTH} fields
     * and the {@link DAYS} unit, and assumes a seven day week.
     *
     * @param {DayOfWeek} dayOfWeek  the day-of-week, not null
     * @return {TemporalAdjuster} the first in month adjuster, not null
     */
    static firstInMonth(dayOfWeek) {
        requireNonNull(dayOfWeek, 'dayOfWeek');
        return new DayOfWeekInMonth(1, dayOfWeek);
    }

    /**
     * Returns the last in month adjuster, which returns a new date
     * in the same month with the last matching day-of-week.
     * This is used for expressions like 'last Tuesday in March'.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-12-15 for (MONDAY) will return 2011-12-26.
     * * The input 2011-12-15 for (FRIDAY) will return 2011-12-30.
     *
     * The behavior is suitable for use with most calendar systems.
     * It uses the {@link DAY_OF_WEEK} and {@link DAY_OF_MONTH} fields
     * and the {@link DAYS} unit, and assumes a seven day week.
     *
     * @param {DayOfWeek} dayOfWeek  the day-of-week, not null
     * @return {TemporalAdjuster} the first in month adjuster, not null
     */
    static lastInMonth(dayOfWeek) {
        requireNonNull(dayOfWeek, 'dayOfWeek');
        return new DayOfWeekInMonth(-1, dayOfWeek);
    }

    /**
     * Returns the day-of-week in month adjuster, which returns a new date
     * in the same month with the ordinal day-of-week.
     * This is used for expressions like the 'second Tuesday in March'.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-12-15 for (1,TUESDAY) will return 2011-12-06.
     * * The input 2011-12-15 for (2,TUESDAY) will return 2011-12-13.
     * * The input 2011-12-15 for (3,TUESDAY) will return 2011-12-20.
     * * The input 2011-12-15 for (4,TUESDAY) will return 2011-12-27.
     * * The input 2011-12-15 for (5,TUESDAY) will return 2012-01-03.
     * * The input 2011-12-15 for (-1,TUESDAY) will return 2011-12-27 (last in month).
     * * The input 2011-12-15 for (-4,TUESDAY) will return 2011-12-06 (3 weeks before last in month).
     * * The input 2011-12-15 for (-5,TUESDAY) will return 2011-11-29 (4 weeks before last in month).
     * * The input 2011-12-15 for (0,TUESDAY) will return 2011-11-29 (last in previous month).
     *
     * For a positive or zero ordinal, the algorithm is equivalent to finding the first
     * day-of-week that matches within the month and then adding a number of weeks to it.
     * For a negative ordinal, the algorithm is equivalent to finding the last
     * day-of-week that matches within the month and then subtracting a number of weeks to it.
     * The ordinal number of weeks is not validated and is interpreted leniently
     * according to this algorithm. This definition means that an ordinal of zero finds
     * the last matching day-of-week in the previous month.
     *
     * The behavior is suitable for use with most calendar systems.
     * It uses the {@link DAY_OF_WEEK} and {@link DAY_OF_MONTH} fields
     * and the {@link DAYS} unit, and assumes a seven day week.
     *
     * @param {Number} ordinal  the week within the month, unbounded but typically from -5 to 5
     * @param {DayOfWeek} dayOfWeek  the day-of-week, not null
     * @return {TemporalAdjuster} the day-of-week in month adjuster, not null
     */
    static dayOfWeekInMonth(ordinal, dayOfWeek) {
        requireNonNull(dayOfWeek, 'dayOfWeek');
        return new DayOfWeekInMonth(ordinal, dayOfWeek);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns the next day-of-week adjuster, which adjusts the date to the
     * first occurrence of the specified day-of-week after the date being adjusted.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-17 (two days later).
     * * The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-19 (four days later).
     * * The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-22 (seven days later).
     *
     * The behavior is suitable for use with most calendar systems.
     * It uses the {@link DAY_OF_WEEK} field and the {@link DAYS} unit,
     * and assumes a seven day week.
     *
     * @param {DayOfWeek} dayOfWeek  the day-of-week to move the date to, not null
     * @return {TemporalAdjuster} the next day-of-week adjuster, not null
     */
    static next(dayOfWeek) {
        return new RelativeDayOfWeek(2, dayOfWeek);
    }

    /**
     * Returns the next-or-same day-of-week adjuster, which adjusts the date to the
     * first occurrence of the specified day-of-week after the date being adjusted
     * unless it is already on that day in which case the same object is returned.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-17 (two days later).
     * * The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-19 (four days later).
     * * The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-15 (same as input).
     *
     * The behavior is suitable for use with most calendar systems.
     * It uses the {@link DAY_OF_WEEK} field and the {@link DAYS} unit,
     * and assumes a seven day week.
     *
     * @param {DayOfWeek} dayOfWeek  the day-of-week to check for or move the date to, not null
     * @return {TemporalAdjuster} the next-or-same day-of-week adjuster, not null
     */
    static nextOrSame(dayOfWeek) {
        return new RelativeDayOfWeek(0, dayOfWeek);
    }

    /**
     * Returns the previous day-of-week adjuster, which adjusts the date to the
     * first occurrence of the specified day-of-week before the date being adjusted.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-10 (five days earlier).
     * * The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-12 (three days earlier).
     * * The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-08 (seven days earlier).
     *
     * The behavior is suitable for use with most calendar systems.
     * It uses the {@link DAY_OF_WEEK} field and the {@link DAYS} unit,
     * and assumes a seven day week.
     *
     * @param {DayOfWeek} dayOfWeek  the day-of-week to move the date to, not null
     * @return {TemporalAdjuster} the previous day-of-week adjuster, not null
     */
    static previous(dayOfWeek) {
        return new RelativeDayOfWeek(3, dayOfWeek);
    }

    /**
     * Returns the previous-or-same day-of-week adjuster, which adjusts the date to the
     * first occurrence of the specified day-of-week before the date being adjusted
     * unless it is already on that day in which case the same object is returned.
     *
     * The ISO calendar system behaves as follows:
     *
     * * The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-10 (five days earlier).
     * * The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-12 (three days earlier).
     * * The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-15 (same as input).
     *
     * The behavior is suitable for use with most calendar systems.
     * It uses the {@link DAY_OF_WEEK} field and the {@link DAYS} unit,
     * and assumes a seven day week.
     *
     * @param {DayOfWeek} dayOfWeek the day-of-week to check for or move the date to, not null
     * @return {TemporalAdjuster} the previous-or-same day-of-week adjuster, not null
     */
    static previousOrSame(dayOfWeek) {
        return new RelativeDayOfWeek(1, dayOfWeek);
    }

}

//-----------------------------------------------------------------------
/**
 * Enum implementing the adjusters.
 */
class Impl extends TemporalAdjuster {

    /**
     *
     * @param ordinal
     * @private
     */
    constructor(ordinal) {
        super();
        this._ordinal = ordinal;
    }

    adjustInto(temporal) {
        switch (this._ordinal) {
            case 0: return temporal.with(ChronoField.DAY_OF_MONTH, 1);
            case 1: return temporal.with(ChronoField.DAY_OF_MONTH, temporal.range(ChronoField.DAY_OF_MONTH).maximum());
            case 2: return temporal.with(ChronoField.DAY_OF_MONTH, 1).plus(1, ChronoUnit.MONTHS);
            case 3: return temporal.with(ChronoField.DAY_OF_YEAR, 1);
            case 4: return temporal.with(ChronoField.DAY_OF_YEAR, temporal.range(ChronoField.DAY_OF_YEAR).maximum());
            case 5: return temporal.with(ChronoField.DAY_OF_YEAR, 1).plus(1, ChronoUnit.YEARS);
        }
        throw new IllegalStateException('Unreachable');
    }

}

/** First day of month adjuster. */
Impl.FIRST_DAY_OF_MONTH = new Impl(0);
/** Last day of month adjuster. */
Impl.LAST_DAY_OF_MONTH = new Impl(1);
/** First day of next month adjuster. */
Impl.FIRST_DAY_OF_NEXT_MONTH = new Impl(2);
/** First day of year adjuster. */
Impl.FIRST_DAY_OF_YEAR = new Impl(3);
/** Last day of year adjuster. */
Impl.LAST_DAY_OF_YEAR = new Impl(4);
/** First day of next month adjuster. */
Impl.FIRST_DAY_OF_NEXT_YEAR = new Impl(5);


/**
 * Class implementing day-of-week in month adjuster.
 */
class DayOfWeekInMonth extends TemporalAdjuster {

    /**
     *
     * @param ordinal
     * @param dow
     * @private
     */
    constructor(ordinal, dow) {
        super();
        this._ordinal = ordinal;
        this._dowValue = dow.value();
    }

    adjustInto(temporal) {
        if (this._ordinal >= 0) {
            const temp = temporal.with(ChronoField.DAY_OF_MONTH, 1);
            const curDow = temp.get(ChronoField.DAY_OF_WEEK);
            let dowDiff = MathUtil.intMod((this._dowValue - curDow + 7), 7);
            dowDiff += (this._ordinal - 1) * 7;  // safe from overflow
            return temp.plus(dowDiff, ChronoUnit.DAYS);
        } else {
            const temp = temporal.with(ChronoField.DAY_OF_MONTH, temporal.range(ChronoField.DAY_OF_MONTH).maximum());
            const curDow = temp.get(ChronoField.DAY_OF_WEEK);
            let daysDiff = this._dowValue - curDow;
            daysDiff = (daysDiff === 0 ? 0 : (daysDiff > 0 ? daysDiff - 7 : daysDiff));
            daysDiff -= (-this._ordinal - 1) * 7;  // safe from overflow
            return temp.plus(daysDiff, ChronoUnit.DAYS);
        }
    }
}

/**
 * Implementation of next, previous or current day-of-week.
 */
class RelativeDayOfWeek extends TemporalAdjuster {

    /**
     *
     * @param relative
     * @param dayOfWeek
     * @private
     */
    constructor(relative, dayOfWeek) {
        super();
        requireNonNull(dayOfWeek, 'dayOfWeek');
        /** Whether the current date is a valid answer. */
        this._relative = relative;
        /** The day-of-week value, from 1 to 7. */
        this._dowValue = dayOfWeek.value();
    }

    adjustInto(temporal) {
        const calDow = temporal.get(ChronoField.DAY_OF_WEEK);
        if (this._relative < 2 && calDow === this._dowValue) {
            return temporal;
        }
        if ((this._relative & 1) === 0) {
            const daysDiff = calDow - this._dowValue;
            return temporal.plus(daysDiff >= 0 ? 7 - daysDiff : -daysDiff, ChronoUnit.DAYS);
        } else {
            const daysDiff = this._dowValue - calDow;
            return temporal.minus(daysDiff >= 0 ? 7 - daysDiff : -daysDiff, ChronoUnit.DAYS);
        }
    }
}
