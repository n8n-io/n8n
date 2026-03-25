/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { UnsupportedTemporalTypeException, IllegalStateException } from '../errors';

import { DayOfWeek } from '../DayOfWeek';
import { Duration } from '../Duration';
import { MathUtil } from '../MathUtil';
import { LocalDate } from '../LocalDate';

import { ChronoField } from './ChronoField';
import { ChronoUnit } from './ChronoUnit';
import { TemporalField } from './TemporalField';
import { TemporalUnit } from './TemporalUnit';
import { ValueRange } from './ValueRange';

import { IsoChronology } from '../chrono/IsoChronology';

import { ResolverStyle } from '../format/ResolverStyle';

/**
 * Fields and units specific to the ISO-8601 calendar system,
 * including quarter-of-year and week-based-year.
 *
 * This class defines fields and units that are specific to the ISO calendar system.
 *
 * ### Quarter of year
 *
 * The ISO-8601 standard is based on the standard civic 12 month year.
 * This is commonly divided into four quarters, often abbreviated as Q1, Q2, Q3 and Q4.
 *
 * January, February and March are in Q1.
 * April, May and June are in Q2.
 * July, August and September are in Q3.
 * October, November and December are in Q4.
 *
 * The complete date is expressed using three fields:
 *
 * * `IsoFields.DAY_OF_QUARTER` - the day within the quarter, from 1 to 90, 91 or 92
 * * `QUARTER_OF_YEAR` - the week within the week-based-year
 * * `ChronoField.YEAR` - the standard ISO year (see {@link ChronoField})
 *
 * ### Week based years
 *
 * The ISO-8601 standard was originally intended as a data interchange format,
 * defining a string format for dates and times. However, it also defines an
 * alternate way of expressing the date, based on the concept of week-based-year.
 *
 * The date is expressed using three fields:
 *
 * * `ChronoField.DAY_OF_WEEK` - the standard field defining the
 *   day-of-week from Monday (1) to Sunday (7) (see {@link ChronoField})
 * * `WEEK_OF_WEEK_BASED_YEAR` - the week within the week-based-year
 * * `WEEK_BASED_YEAR` - the week-based-year 
 *
 * The week-based-year itself is defined relative to the standard ISO proleptic year.
 * It differs from the standard year in that it always starts on a Monday.
 *
 * The first week of a week-based-year is the first Monday-based week of the standard
 * ISO year that has at least 4 days in the new year.
 *
 * * If January 1st is Monday then week 1 starts on January 1st
 * * If January 1st is Tuesday then week 1 starts on December 31st of the previous standard year
 * * If January 1st is Wednesday then week 1 starts on December 30th of the previous standard year
 * * If January 1st is Thursday then week 1 starts on December 29th of the previous standard year
 * * If January 1st is Friday then week 1 starts on January 4th
 * * If January 1st is Saturday then week 1 starts on January 3rd
 * * If January 1st is Sunday then week 1 starts on January 2nd
 *
 * There are 52 weeks in most week-based years, however on occasion there are 53 weeks.
 *
 * For example:
 *
 * * Sunday, 2008-12-28: Week 52 of week-based-year 2008
 * * Monday, 2008-12-29: Week 1 of week-based-year 2009
 * * Wednesday, 2008-12-31: Week 1 of week-based-year 2009
 * * Thursday, 2009-01-01: Week 1 of week-based-year 2009
 * * Sunday, 2009-01-04: Week 1 of week-based-year 2009
 * * Monday, 2009-01-05: Week 2 of week-based-year 2009
 *
 * @property {TemporalField} DAY_OF_QUARTER The field that represents the day-of-quarter.
 *
 * This field allows the day-of-quarter value to be queried and set.
 * The day-of-quarter has values from 1 to 90 in Q1 of a standard year, from 1 to 91
 * in Q1 of a leap year, from 1 to 91 in Q2 and from 1 to 92 in Q3 and Q4.
 *
 * The day-of-quarter can only be calculated if the day-of-year, month-of-year and year
 * are available.
 *
 * When setting this field, the value is allowed to be partially lenient, taking any
 * value from 1 to 92. If the quarter has less than 92 days, then day 92, and
 * potentially day 91, is in the following quarter.
 *
 * @property {TemporalField} QUARTER_OF_YEAR The field that represents the quarter-of-year.
 *
 * This field allows the quarter-of-year value to be queried and set.
 * The quarter-of-year has values from 1 to 4.
 *
 * The day-of-quarter can only be calculated if the month-of-year is available.
 *
 * @property {TemporalField} WEEK_OF_WEEK_BASED_YEAR The field that represents the
 * week-of-week-based-year.
 *
 * This field allows the week of the week-based-year value to be queried and set.
 *
 * @property {TemporalField} WEEK_BASED_YEAR The field that represents the week-based-year.
 *
 * This field allows the week-based-year value to be queried and set.
 *
 * @property {TemporalField} WEEK_BASED_YEARS The unit that represents week-based-years for
 * the purpose of addition and subtraction.
 *
 * This allows a number of week-based-years to be added to, or subtracted from, a date.
 * The unit is equal to either 52 or 53 weeks.
 * The estimated duration of a week-based-year is the same as that of a standard ISO
 * year at 365.2425 days.
 *
 * The rules for addition add the number of week-based-years to the existing value
 * for the week-based-year field. If the resulting week-based-year only has 52 weeks,
 * then the date will be in week 1 of the following week-based-year.
 *
 * @property {TemporalField} QUARTER_YEARS Unit that represents the concept of a quarter-year.
 * For the ISO calendar system, it is equal to 3 months.
 * The estimated duration of a quarter-year is one quarter of 365.2425 days.
 * 
 * @typedef {Object} IsoFields
 * @type {Object}
 */
export const IsoFields = {};

//-----------------------------------------------------------------------

const QUARTER_DAYS = [0, 90, 181, 273, 0, 91, 182, 274];

/**
 * Implementation of the field.
 * @private
 */
class Field extends TemporalField{

    /**
     *
     * @returns {boolean}
     */
    isDateBased() {
        return true;
    }

    /**
     *
     * @returns {boolean}
     */
    isTimeBased() {
        return false;
    }

    /**
     *
     * @returns {boolean}
     */
    _isIso() {
        return true;
    }

    /**
     *
     * @param {LocalDate} date
     * @returns {ValueRange}
     */
    static _getWeekRangeByLocalDate(date) {
        const wby = Field._getWeekBasedYear(date);
        return ValueRange.of(1, Field._getWeekRangeByYear(wby));
    }

    /**
     *
     * @param {number} wby
     * @returns {number}
     */
    static _getWeekRangeByYear(wby) {
        const date = LocalDate.of(wby, 1, 1);
        // 53 weeks if standard year starts on Thursday, or Wed in a leap year
        if (date.dayOfWeek() === DayOfWeek.THURSDAY || (date.dayOfWeek() === DayOfWeek.WEDNESDAY && date.isLeapYear())) {
            return 53;
        }
        return 52;
    }

    /**
     *
     * @param {LocalDate} date
     * @returns {number}
     */
    static _getWeek(date) {
        const dow0 = date.dayOfWeek().ordinal();
        const doy0 = date.dayOfYear() - 1;
        const doyThu0 = doy0 + (3 - dow0);  // adjust to mid-week Thursday (which is 3 indexed from zero)
        const alignedWeek = MathUtil.intDiv(doyThu0, 7);
        const firstThuDoy0 = doyThu0 - (alignedWeek * 7);
        let firstMonDoy0 = firstThuDoy0 - 3;
        if (firstMonDoy0 < -3) {
            firstMonDoy0 += 7;
        }
        if (doy0 < firstMonDoy0) {
            return Field._getWeekRangeByLocalDate(date.withDayOfYear(180).minusYears(1)).maximum();
        }
        let week = MathUtil.intDiv((doy0 - firstMonDoy0), 7) + 1;
        if (week === 53) {
            if ((firstMonDoy0 === -3 || (firstMonDoy0 === -2 && date.isLeapYear())) === false) {
                week = 1;
            }
        }
        return week;
    }

    /**
     *
     * @param {LocalDate} date
     * @returns {number}
     */
    static _getWeekBasedYear(date) {
        let year = date.year();
        let doy = date.dayOfYear();
        if (doy <= 3) {
            const dow = date.dayOfWeek().ordinal();
            if (doy - dow < -2) {
                year--;
            }
        } else if (doy >= 363) {
            const dow = date.dayOfWeek().ordinal();
            doy = doy - 363 - (date.isLeapYear() ? 1 : 0);
            if (doy - dow >= 0) {
                year++;
            }
        }
        return year;
    }

    /**
     *
     * @returns {string}
     */
    displayName(/*locale*/) {
        return this.toString();
    }

    /**
     *
     * @returns {null}
     */
    resolve() {
        return null;
    }

    name(){
        return this.toString();
    }

}

/**
 * @private
 */
class DAY_OF_QUARTER_FIELD extends Field {

    /**
     *
     * @returns {string}
     */
    toString() {
        return 'DayOfQuarter';
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    baseUnit() {
        return ChronoUnit.DAYS;
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    rangeUnit() {
        return QUARTER_YEARS;
    }

    /**
     *
     * @returns {ValueRange}
     */
    range() {
        return ValueRange.of(1, 90, 92);
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {boolean}
     */
    isSupportedBy(temporal) {
        return temporal.isSupported(ChronoField.DAY_OF_YEAR) && temporal.isSupported(ChronoField.MONTH_OF_YEAR) &&
            temporal.isSupported(ChronoField.YEAR) && this._isIso(temporal);
    }


    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {ValueRange}
     */
    rangeRefinedBy(temporal) {
        if (temporal.isSupported(this) === false) {
            throw new UnsupportedTemporalTypeException('Unsupported field: DayOfQuarter');
        }
        const qoy = temporal.getLong(QUARTER_OF_YEAR);
        if (qoy === 1) {
            const year = temporal.getLong(ChronoField.YEAR);
            return (IsoChronology.isLeapYear(year) ? ValueRange.of(1, 91) : ValueRange.of(1, 90));
        } else if (qoy === 2) {
            return ValueRange.of(1, 91);
        } else if (qoy === 3 || qoy === 4) {
            return ValueRange.of(1, 92);
        } // else value not from 1 to 4, so drop through
        return this.range();
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {number}
     */
    getFrom(temporal) {
        if (temporal.isSupported(this) === false) {
            throw new UnsupportedTemporalTypeException('Unsupported field: DayOfQuarter');
        }
        const doy = temporal.get(ChronoField.DAY_OF_YEAR);
        const moy = temporal.get(ChronoField.MONTH_OF_YEAR);
        const year = temporal.getLong(ChronoField.YEAR);
        return doy - QUARTER_DAYS[MathUtil.intDiv((moy - 1), 3) + (IsoChronology.isLeapYear(year) ? 4 : 0)];
    }

    /**
     *
     * @param {Temporal} temporal
     * @param {number} newValue
     * @returns {temporal}
     */
    adjustInto(temporal, newValue) {
        const curValue = this.getFrom(temporal);
        this.range().checkValidValue(newValue, this);
        return temporal.with(ChronoField.DAY_OF_YEAR, temporal.getLong(ChronoField.DAY_OF_YEAR) + (newValue - curValue));
    }

    /**
     *
     * @param {Map<TemporalField, number>} fieldValues
     * @param {TemporalAccessor} partialTemporal
     * @param {ResolverStyle} resolverStyle
     * @returns {ValueRange}
     */
    resolve(fieldValues, partialTemporal, resolverStyle) {
        const yearLong = fieldValues.get(ChronoField.YEAR);
        const qoyLong = fieldValues.get(QUARTER_OF_YEAR);
        if (yearLong == null || qoyLong == null) {
            return null;
        }
        const y = ChronoField.YEAR.checkValidIntValue(yearLong);
        const doq = fieldValues.get(DAY_OF_QUARTER);
        let date;
        if (resolverStyle === ResolverStyle.LENIENT) {
            const qoy = qoyLong;
            date = LocalDate.of(y, 1, 1);
            date = date.plusMonths(MathUtil.safeMultiply(MathUtil.safeSubtract(qoy, 1), 3));
            date = date.plusDays(MathUtil.safeSubtract(doq, 1));
        } else {
            const qoy = QUARTER_OF_YEAR.range().checkValidIntValue(qoyLong, QUARTER_OF_YEAR);
            if (resolverStyle === ResolverStyle.STRICT) {
                let max = 92;
                if (qoy === 1) {
                    max = (IsoChronology.isLeapYear(y) ? 91 : 90);
                } else if (qoy === 2) {
                    max = 91;
                }
                ValueRange.of(1, max).checkValidValue(doq, this);
            } else {
                this.range().checkValidValue(doq, this);  // leniently check from 1 to 92
            }
            date = LocalDate.of(y, ((qoy - 1) * 3) + 1, 1).plusDays(doq - 1);
        }
        fieldValues.remove(this);
        fieldValues.remove(ChronoField.YEAR);
        fieldValues.remove(QUARTER_OF_YEAR);
        return date;
    }
}

/**
 * @private
 */
class QUARTER_OF_YEAR_FIELD extends Field {

    /**
     *
     * @returns {string}
     */
    toString() {
        return 'QuarterOfYear';
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    baseUnit() {
        return QUARTER_YEARS;
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    rangeUnit() {
        return ChronoUnit.YEARS;
    }

    /**
     *
     * @returns {ValueRange}
     */
    range() {
        return ValueRange.of(1, 4);
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {boolean}
     */
    isSupportedBy(temporal) {
        return temporal.isSupported(ChronoField.MONTH_OF_YEAR) && this._isIso(temporal);
    }


    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {ValueRange}
     */
    //eslint-disable-next-line no-unused-vars
    rangeRefinedBy(temporal) {
        return this.range();
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {number}
     */
    getFrom(temporal) {
        if (temporal.isSupported(this) === false) {
            throw new UnsupportedTemporalTypeException('Unsupported field: QuarterOfYear');
        }
        const moy = temporal.getLong(ChronoField.MONTH_OF_YEAR);
        return MathUtil.intDiv((moy + 2), 3);
    }

    /**
     *
     * @param {Temporal} temporal
     * @param {number} newValue
     * @returns {temporal}
     */
    adjustInto(temporal, newValue) {
        const curValue = this.getFrom(temporal);
        this.range().checkValidValue(newValue, this);
        return temporal.with(ChronoField.MONTH_OF_YEAR, temporal.getLong(ChronoField.MONTH_OF_YEAR) + (newValue - curValue) * 3);
    }

}

/**
 * @private
 */
class WEEK_OF_WEEK_BASED_YEAR_FIELD extends Field {

    /**
     *
     * @returns {string}
     */
    toString() {
        return 'WeekOfWeekBasedYear';
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    baseUnit() {
        return ChronoUnit.WEEKS;
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    rangeUnit() {
        return WEEK_BASED_YEARS;
    }

    /**
     *
     * @returns {ValueRange}
     */
    range() {
        return ValueRange.of(1, 52, 53);
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {boolean}
     */
    isSupportedBy(temporal) {
        return temporal.isSupported(ChronoField.EPOCH_DAY) && this._isIso(temporal);
    }


    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {ValueRange}
     */
    rangeRefinedBy(temporal) {
        if (temporal.isSupported(this) === false) {
            throw new UnsupportedTemporalTypeException('Unsupported field: WeekOfWeekBasedYear');
        }
        return Field._getWeekRangeByLocalDate(LocalDate.from(temporal));
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {number}
     */
    getFrom(temporal) {
        if (temporal.isSupported(this) === false) {
            throw new UnsupportedTemporalTypeException('Unsupported field: WeekOfWeekBasedYear');
        }
        return Field._getWeek(LocalDate.from(temporal));
    }

    /**
     *
     * @param {Temporal} temporal
     * @param {number} newValue
     * @returns {temporal}
     */
    adjustInto(temporal, newValue) {
        this.range().checkValidValue(newValue, this);
        return temporal.plus(MathUtil.safeSubtract(newValue, this.getFrom(temporal)), ChronoUnit.WEEKS);
    }

    /**
     *
     * @param {Map<TemporalField, number>} fieldValues
     * @param {TemporalAccessor} partialTemporal
     * @param {ResolverStyle} resolverStyle
     * @returns {ValueRange}
     */
    resolve(fieldValues, partialTemporal, resolverStyle) {
        const wbyLong = fieldValues.get(WEEK_BASED_YEAR);
        const dowLong = fieldValues.get(ChronoField.DAY_OF_WEEK);
        if (wbyLong == null || dowLong == null) {
            return null;
        }
        const wby = WEEK_BASED_YEAR.range().checkValidIntValue(wbyLong, WEEK_BASED_YEAR);
        const wowby = fieldValues.get(WEEK_OF_WEEK_BASED_YEAR);
        let date;
        if (resolverStyle === ResolverStyle.LENIENT) {
            let dow = dowLong;
            let weeks = 0;
            if (dow > 7) {
                weeks = MathUtil.intDiv((dow - 1), 7);
                dow = (MathUtil.intMod((dow - 1), 7) + 1);
            } else if (dow < 1) {
                weeks = MathUtil.intDiv(dow, 7) - 1;
                dow = MathUtil.intMod(dow, 7) + 7;
            }
            date = LocalDate.of(wby, 1, 4).plusWeeks(wowby - 1).plusWeeks(weeks).with(ChronoField.DAY_OF_WEEK, dow);
        } else {
            const dow = ChronoField.DAY_OF_WEEK.checkValidIntValue(dowLong);
            if (resolverStyle === ResolverStyle.STRICT) {
                const temp = LocalDate.of(wby, 1, 4);
                const range = Field._getWeekRangeByLocalDate(temp);
                range.checkValidValue(wowby, this);
            } else {
                this.range().checkValidValue(wowby, this);  // leniently check from 1 to 53
            }
            date = LocalDate.of(wby, 1, 4).plusWeeks(wowby - 1).with(ChronoField.DAY_OF_WEEK, dow);
        }
        fieldValues.remove(this);
        fieldValues.remove(WEEK_BASED_YEAR);
        fieldValues.remove(ChronoField.DAY_OF_WEEK);
        return date;
    }

    /**
     *
     * @returns {string}
     */
    displayName() {
        return 'Week';
    }

}

/**
 * @private
 */
class WEEK_BASED_YEAR_FIELD extends Field {

    /**
     *
     * @returns {string}
     */
    toString() {
        return 'WeekBasedYear';
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    baseUnit() {
        return WEEK_BASED_YEARS;
    }

    /**
     *
     * @returns {TemporalUnit}
     */
    rangeUnit() {
        return ChronoUnit.FOREVER;
    }

    /**
     *
     * @returns {ValueRange}
     */
    range() {
        return ChronoField.YEAR.range();
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {boolean}
     */
    isSupportedBy(temporal) {
        return temporal.isSupported(ChronoField.EPOCH_DAY) && this._isIso(temporal);
    }


    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {ValueRange}
     */
    //eslint-disable-next-line no-unused-vars
    rangeRefinedBy(temporal) {
        return ChronoField.YEAR.range();
    }

    /**
     *
     * @param {TemporalAccessor} temporal
     * @returns {number}
     */
    getFrom(temporal) {
        if (temporal.isSupported(this) === false) {
            throw new UnsupportedTemporalTypeException('Unsupported field: WeekBasedYear');
        }
        return Field._getWeekBasedYear(LocalDate.from(temporal));
    }

    /**
     *
     * @param {Temporal} temporal
     * @param {number} newValue
     * @returns {temporal}
     */
    adjustInto(temporal, newValue) {
        if (this.isSupportedBy(temporal) === false) {
            throw new UnsupportedTemporalTypeException('Unsupported field: WeekBasedYear');
        }
        const newWby = this.range().checkValidIntValue(newValue, WEEK_BASED_YEAR);  // strict check
        const date = LocalDate.from(temporal);
        const dow = date.get(ChronoField.DAY_OF_WEEK);
        let week = Field._getWeek(date);
        if (week === 53 && Field._getWeekRangeByYear(newWby) === 52) {
            week = 52;
        }
        let resolved = LocalDate.of(newWby, 1, 4);  // 4th is guaranteed to be in week one
        const days = (dow - resolved.get(ChronoField.DAY_OF_WEEK)) + ((week - 1) * 7);
        resolved = resolved.plusDays(days);
        return temporal.with(resolved);
    }

}

//-----------------------------------------------------------------------
/**
 * Implementation of the period unit.
 * @private
 */
class Unit extends TemporalUnit {

    /**
     *
     * @param {string} name
     * @param {Duration} estimatedDuration
     * @private
     */
    constructor(name, estimatedDuration) {
        super();
        this._name = name;
        this._duration = estimatedDuration;
    }

    /**
     *
     * @returns {Duration}
     */
    duration() {
        return this._duration;
    }

    /**
     *
     * @returns {boolean}
     */
    isDurationEstimated() {
        return true;
    }

    /**
     *
     * @returns {boolean}
     */
    isDateBased() {
        return true;
    }

    /**
     *
     * @returns {boolean}
     */
    isTimeBased() {
        return false;
    }

    /**
     *
     * @param {Temporal} temporal
     * @returns {boolean}
     */
    isSupportedBy(temporal) {
        return temporal.isSupported(ChronoField.EPOCH_DAY);
    }

    /**
     *
     * @param {Temporal} temporal
     * @param {number} periodToAdd
     * @returns {number}
     */
    addTo(temporal, periodToAdd) {
        switch(this) {
            case WEEK_BASED_YEARS: {
                const added = MathUtil.safeAdd(temporal.get(WEEK_BASED_YEAR), periodToAdd);
                return temporal.with(WEEK_BASED_YEAR, added);
            }
            case QUARTER_YEARS:
                // no overflow (256 is multiple of 4)
                return temporal.plus(MathUtil.intDiv(periodToAdd, 256), ChronoUnit.YEARS).plus(MathUtil.intMod(periodToAdd, 256) * 3, ChronoUnit.MONTHS);
            default:
                throw new IllegalStateException('Unreachable');
        }
    }

    /**
     *
     * @param {Temporal} temporal1
     * @param {Temporal} temporal2
     * @returns {number}
     */
    between(temporal1, temporal2) {
        switch(this) {
            case WEEK_BASED_YEARS:
                return MathUtil.safeSubtract(temporal2.getLong(WEEK_BASED_YEAR), temporal1.getLong(WEEK_BASED_YEAR));
            case QUARTER_YEARS:
                return MathUtil.intDiv(temporal1.until(temporal2, ChronoUnit.MONTHS), 3);
            default:
                throw new IllegalStateException('Unreachable');
        }
    }

    toString() {
        return this._name;
    }
}

let DAY_OF_QUARTER = null;
let QUARTER_OF_YEAR = null;
let WEEK_OF_WEEK_BASED_YEAR = null;
let WEEK_BASED_YEAR = null;
let WEEK_BASED_YEARS = null;
let QUARTER_YEARS = null;

export function _init() {
    DAY_OF_QUARTER = new DAY_OF_QUARTER_FIELD();
    QUARTER_OF_YEAR = new QUARTER_OF_YEAR_FIELD();
    WEEK_OF_WEEK_BASED_YEAR = new WEEK_OF_WEEK_BASED_YEAR_FIELD();
    WEEK_BASED_YEAR = new WEEK_BASED_YEAR_FIELD();

    WEEK_BASED_YEARS = new Unit('WeekBasedYears', Duration.ofSeconds(31556952));
    QUARTER_YEARS = new Unit('QuarterYears', Duration.ofSeconds(31556952 / 4));

    IsoFields.DAY_OF_QUARTER = DAY_OF_QUARTER;
    IsoFields.QUARTER_OF_YEAR = QUARTER_OF_YEAR;
    IsoFields.WEEK_OF_WEEK_BASED_YEAR = WEEK_OF_WEEK_BASED_YEAR;
    IsoFields.WEEK_BASED_YEAR = WEEK_BASED_YEAR;
    IsoFields.WEEK_BASED_YEARS = WEEK_BASED_YEARS;
    IsoFields.QUARTER_YEARS = QUARTER_YEARS;

    // this differs from threeten, but for ease of use we bring back good old joda time functionality
    /**
     * the week of the week based year as defined by the ISO8601 Standard with a Monday-based week
     *
     * @returns {number} the week a the week based year
     */
    LocalDate.prototype.isoWeekOfWeekyear = function () {
        return this.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
    };
    /**
     * the year of the week based year as defined by the ISO8601 Standard with a Monday-based week
     *
     * @returns {number} the year a the week based year
     */
    LocalDate.prototype.isoWeekyear = function () {
        return this.get(IsoFields.WEEK_BASED_YEAR);
    };
}
