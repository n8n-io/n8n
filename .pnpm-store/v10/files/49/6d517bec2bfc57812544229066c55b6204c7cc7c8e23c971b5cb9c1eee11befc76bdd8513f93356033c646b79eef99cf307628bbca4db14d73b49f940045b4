/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { Enum } from '../Enum';
import { requireNonNull } from '../assert';
import { DateTimeException } from '../errors';
import { MathUtil } from '../MathUtil';

import { DayOfWeek } from '../DayOfWeek';
import { LocalDate } from '../LocalDate';
import { Month } from '../Month';
import { Year } from '../Year';

import { ChronoField } from '../temporal/ChronoField';
import { ResolverStyle } from '../format/ResolverStyle';
import { TemporalAdjusters } from '../temporal/TemporalAdjusters';

export class IsoChronology extends Enum{
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
     * @param {number} prolepticYear - the ISO proleptic year to check
     * @return {boolean} true if the year is leap, false otherwise
     */
    static isLeapYear(prolepticYear) {
        return ((prolepticYear & 3) === 0) && ((prolepticYear % 100) !== 0 || (prolepticYear % 400) === 0);
    }

    /**
     * Updates the map of field-values during resolution.
     *
     * @param {EnumMap} fieldValues  the fieldValues map to update, not null
     * @param {ChronoField} field  the field to update, not null
     * @param {number} value  the value to update, not null
     * @throws DateTimeException if a conflict occurs
     */
    _updateResolveMap(fieldValues, field, value) {
        // TODO: this function is in Chronology in threetenbp, maybe needs to be moved?
        requireNonNull(fieldValues, 'fieldValues');
        requireNonNull(field, 'field');
        const current = fieldValues.get(field);
        if (current != null && current !== value) {
            throw new DateTimeException(`Invalid state, field: ${field} ${current} conflicts with ${field} ${value}`);
        }
        fieldValues.put(field, value);
    }

    resolveDate(fieldValues, resolverStyle) {
        if (fieldValues.containsKey(ChronoField.EPOCH_DAY)) {
            return LocalDate.ofEpochDay(fieldValues.remove(ChronoField.EPOCH_DAY));
        }

        // normalize fields
        const prolepticMonth = fieldValues.remove(ChronoField.PROLEPTIC_MONTH);
        if (prolepticMonth != null) {
            if (resolverStyle !== ResolverStyle.LENIENT) {
                ChronoField.PROLEPTIC_MONTH.checkValidValue(prolepticMonth);
            }
            this._updateResolveMap(fieldValues, ChronoField.MONTH_OF_YEAR, MathUtil.floorMod(prolepticMonth, 12) + 1);
            this._updateResolveMap(fieldValues, ChronoField.YEAR, MathUtil.floorDiv(prolepticMonth, 12));
        }

        // eras
        const yoeLong = fieldValues.remove(ChronoField.YEAR_OF_ERA);
        if (yoeLong != null) {
            if (resolverStyle !== ResolverStyle.LENIENT) {
                ChronoField.YEAR_OF_ERA.checkValidValue(yoeLong);
            }
            const era = fieldValues.remove(ChronoField.ERA);
            if (era == null) {
                const year = fieldValues.get(ChronoField.YEAR);
                if (resolverStyle === ResolverStyle.STRICT) {
                    // do not invent era if strict, but do cross-check with year
                    if (year != null) {
                        this._updateResolveMap(fieldValues, ChronoField.YEAR, (year > 0 ? yoeLong: MathUtil.safeSubtract(1, yoeLong)));
                    } else {
                        // reinstate the field removed earlier, no cross-check issues
                        fieldValues.put(ChronoField.YEAR_OF_ERA, yoeLong);
                    }
                } else {
                    // invent era
                    this._updateResolveMap(fieldValues, ChronoField.YEAR, (year == null || year > 0 ? yoeLong: MathUtil.safeSubtract(1, yoeLong)));
                }
            } else if (era === 1) {
                this._updateResolveMap(fieldValues, ChronoField.YEAR, yoeLong);
            } else if (era === 0) {
                this._updateResolveMap(fieldValues, ChronoField.YEAR, MathUtil.safeSubtract(1, yoeLong));
            } else {
                throw new DateTimeException(`Invalid value for era: ${era}`);
            }
        } else if (fieldValues.containsKey(ChronoField.ERA)) {
            ChronoField.ERA.checkValidValue(fieldValues.get(ChronoField.ERA));  // always validated
        }

        // build date
        if (fieldValues.containsKey(ChronoField.YEAR)) {
            if (fieldValues.containsKey(ChronoField.MONTH_OF_YEAR)) {
                if (fieldValues.containsKey(ChronoField.DAY_OF_MONTH)) {
                    const y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
                    const moy = fieldValues.remove(ChronoField.MONTH_OF_YEAR);
                    let dom = fieldValues.remove(ChronoField.DAY_OF_MONTH);
                    if (resolverStyle === ResolverStyle.LENIENT) {
                        const months = moy - 1;
                        const days = dom - 1;
                        return LocalDate.of(y, 1, 1).plusMonths(months).plusDays(days);
                    } else if (resolverStyle === ResolverStyle.SMART){
                        ChronoField.DAY_OF_MONTH.checkValidValue(dom);
                        if (moy === 4 || moy === 6 || moy === 9 || moy === 11) {
                            dom = Math.min(dom, 30);
                        } else if (moy === 2) {
                            dom = Math.min(dom, Month.FEBRUARY.length(Year.isLeap(y)));
                        }
                        return LocalDate.of(y, moy, dom);
                    } else {
                        return LocalDate.of(y, moy, dom);
                    }
                }
                /*
                if (fieldValues.containsKey(ALIGNED_WEEK_OF_MONTH)) {
                    if (fieldValues.containsKey(ALIGNED_DAY_OF_WEEK_IN_MONTH)) {
                        int y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
                        if (resolverStyle == ResolverStyle.LENIENT) {
                            long months = Jdk8Methods.safeSubtract(fieldValues.remove(ChronoField.MONTH_OF_YEAR), 1);
                            long weeks = Jdk8Methods.safeSubtract(fieldValues.remove(ALIGNED_WEEK_OF_MONTH), 1);
                            long days = Jdk8Methods.safeSubtract(fieldValues.remove(ALIGNED_DAY_OF_WEEK_IN_MONTH), 1);
                            return LocalDate.of(y, 1, 1).plusMonths(months).plusWeeks(weeks).plusDays(days);
                        }
                        int moy = ChronoField.MONTH_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.MONTH_OF_YEAR));
                        int aw = ALIGNED_WEEK_OF_MONTH.checkValidIntValue(fieldValues.remove(ALIGNED_WEEK_OF_MONTH));
                        int ad = ALIGNED_DAY_OF_WEEK_IN_MONTH.checkValidIntValue(fieldValues.remove(ALIGNED_DAY_OF_WEEK_IN_MONTH));
                        LocalDate date = LocalDate.of(y, moy, 1).plusDays((aw - 1) * 7 + (ad - 1));
                        if (resolverStyle == ResolverStyle.STRICT && date.get(ChronoField.MONTH_OF_YEAR) != moy) {
                            throw new DateTimeException("Strict mode rejected date parsed to a different month");
                        }
                        return date;
                    }
                    if (fieldValues.containsKey(DAY_OF_WEEK)) {
                        int y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
                        if (resolverStyle == ResolverStyle.LENIENT) {
                            long months = Jdk8Methods.safeSubtract(fieldValues.remove(ChronoField.MONTH_OF_YEAR), 1);
                            long weeks = Jdk8Methods.safeSubtract(fieldValues.remove(ALIGNED_WEEK_OF_MONTH), 1);
                            long days = Jdk8Methods.safeSubtract(fieldValues.remove(DAY_OF_WEEK), 1);
                            return LocalDate.of(y, 1, 1).plusMonths(months).plusWeeks(weeks).plusDays(days);
                        }
                        int moy = ChronoField.MONTH_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.MONTH_OF_YEAR));
                        int aw = ALIGNED_WEEK_OF_MONTH.checkValidIntValue(fieldValues.remove(ALIGNED_WEEK_OF_MONTH));
                        int dow = DAY_OF_WEEK.checkValidIntValue(fieldValues.remove(DAY_OF_WEEK));
                        LocalDate date = LocalDate.of(y, moy, 1).plusWeeks(aw - 1).with(nextOrSame(DayOfWeek.of(dow)));
                        if (resolverStyle == ResolverStyle.STRICT && date.get(ChronoField.MONTH_OF_YEAR) != moy) {
                            throw new DateTimeException("Strict mode rejected date parsed to a different month");
                        }
                        return date;
                    }
                }
*/
            }
            if (fieldValues.containsKey(ChronoField.DAY_OF_YEAR)) {
                const y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
                if (resolverStyle === ResolverStyle.LENIENT) {
                    const days = MathUtil.safeSubtract(fieldValues.remove(ChronoField.DAY_OF_YEAR), 1);
                    return LocalDate.ofYearDay(y, 1).plusDays(days);
                }
                const doy = ChronoField.DAY_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.DAY_OF_YEAR));
                return LocalDate.ofYearDay(y, doy);
            }
            if (fieldValues.containsKey(ChronoField.ALIGNED_WEEK_OF_YEAR)) {
                if (fieldValues.containsKey(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR)) {
                    const y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
                    if (resolverStyle === ResolverStyle.LENIENT) {
                        const weeks = MathUtil.safeSubtract(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR), 1);
                        const days = MathUtil.safeSubtract(fieldValues.remove(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR), 1);
                        return LocalDate.of(y, 1, 1).plusWeeks(weeks).plusDays(days);
                    }
                    const aw = ChronoField.ALIGNED_WEEK_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR));
                    const ad = ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.ALIGNED_DAY_OF_WEEK_IN_YEAR));
                    const date = LocalDate.of(y, 1, 1).plusDays((aw - 1) * 7 + (ad - 1));
                    if (resolverStyle === ResolverStyle.STRICT && date.get(ChronoField.YEAR) !== y) {
                        throw new DateTimeException('Strict mode rejected date parsed to a different year');
                    }
                    return date;
                }
                if (fieldValues.containsKey(ChronoField.DAY_OF_WEEK)) {
                    const y = ChronoField.YEAR.checkValidIntValue(fieldValues.remove(ChronoField.YEAR));
                    if (resolverStyle === ResolverStyle.LENIENT) {
                        const weeks = MathUtil.safeSubtract(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR), 1);
                        const days = MathUtil.safeSubtract(fieldValues.remove(ChronoField.DAY_OF_WEEK), 1);
                        return LocalDate.of(y, 1, 1).plusWeeks(weeks).plusDays(days);
                    }
                    const aw = ChronoField.ALIGNED_WEEK_OF_YEAR.checkValidIntValue(fieldValues.remove(ChronoField.ALIGNED_WEEK_OF_YEAR));
                    const dow = ChronoField.DAY_OF_WEEK.checkValidIntValue(fieldValues.remove(ChronoField.DAY_OF_WEEK));
                    const date = LocalDate.of(y, 1, 1).plusWeeks(aw - 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.of(dow)));
                    if (resolverStyle === ResolverStyle.STRICT && date.get(ChronoField.YEAR) !== y) {
                        throw new DateTimeException('Strict mode rejected date parsed to a different month');
                    }
                    return date;
                }
            }
        }
        return null;
    }

    /**
     * Obtains an ISO local date from another date-time object.
     * <p>
     * This is equivalent to {@link LocalDate#from(TemporalAccessor)}.
     *
     * @param temporal  the date-time object to convert, not null
     * @return the ISO local date, not null
     * @throws DateTimeException if unable to create the date
     */
    date(temporal) {
        return LocalDate.from(temporal);
    }

}

export function _init() {
    IsoChronology.INSTANCE = new IsoChronology('IsoChronology');
}
