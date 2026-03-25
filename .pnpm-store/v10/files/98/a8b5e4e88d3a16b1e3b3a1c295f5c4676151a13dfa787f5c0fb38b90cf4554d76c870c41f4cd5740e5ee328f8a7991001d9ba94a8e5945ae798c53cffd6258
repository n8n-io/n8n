/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from '../assert';
import { DateTimeException } from '../errors';
import { MathUtil } from '../MathUtil';

import { EnumMap } from './EnumMap';
import { ResolverStyle } from './ResolverStyle';

import { IsoChronology } from '../chrono/IsoChronology';
import { ChronoLocalDate } from '../chrono/ChronoLocalDate';
import { ChronoField } from '../temporal/ChronoField';
import { TemporalAccessor } from '../temporal/TemporalAccessor';
import { TemporalQueries } from '../temporal/TemporalQueries';

import { LocalTime } from '../LocalTime';
import { LocalDate } from '../LocalDate';
import { Period } from '../Period';

import { ZoneOffset } from '../ZoneOffset';

/**
 * Builder that can holds date and time fields and related date and time objects.
 *
 * The builder is used to hold onto different elements of date and time.
 * It is designed as two separate maps:
 *
 * * from {@link TemporalField} to `long` value, where the value may be
 *   outside the valid range for the field
 * * from {@link Class} to {@link TemporalAccessor}, holding larger scale objects
 *   like {@link LocalDateTime}.
 *
 *   @private
 */
export class DateTimeBuilder extends TemporalAccessor {

    /**
     * Creates a new instance of the builder with a single field-value.
     *
     * This is equivalent to using {@link addFieldValue} on an empty builder.
     *
     * @param {TemporalField} field - the field to add, not null
     * @param {number} value - the value to add, not null
     * @return {DateTimeBuilder}
     */
    static create(field, value) {
        const dtb = new DateTimeBuilder();
        dtb._addFieldValue(field, value);
        return dtb;
    }


    constructor(){
        super();

        /**
         * The map of other fields.
         */
        this.fieldValues = new EnumMap();
        /**
         * The chronology.
         */
        this.chrono = null;
        /**
         * The zone.
         */
        this.zone = null;
        /**
         * The date.
         */
        this.date = null;
        /**
         * The time.
         */
        this.time = null;
        /**
         * The leap second flag.
         */
        this.leapSecond = false;
        /**
         * The excess days.
         */
        this.excessDays = null;
    }

    /**
     *
     * @param {TemporalField} field
     * @return {Number} field value
     */
    getFieldValue0(field) {
        return this.fieldValues.get(field);
    }

    /**
     * Adds a field-value pair to the builder.
     *
     * This adds a field to the builder.
     * If the field is not already present, then the field-value pair is added to the map.
     * If the field is already present and it has the same value as that specified, no action occurs.
     * If the field is already present and it has a different value to that specified, then
     * an exception is thrown.
     *
     * @param {TemporalField} field - the field to add, not null
     * @param {Number} value - the value to add, not null
     * @return {DateTimeBuilder}, this for method chaining
     * @throws DateTimeException if the field is already present with a different value
     */
    _addFieldValue(field, value) {
        requireNonNull(field, 'field');
        const old = this.getFieldValue0(field);  // check first for better error message
        if (old != null && old !== value) {
            throw new DateTimeException(`Conflict found: ${field} ${old} differs from ${field} ${value}: ${this}`);
        }
        return this._putFieldValue0(field, value);
    }

    /**
     * @param {TemporalField} field
     * @param {Number} value
     * @return {DateTimeBuilder}, this for method chaining
     */
    _putFieldValue0(field, value) {
        this.fieldValues.put(field, value);
        return this;
    }

    /**
     * Resolves the builder, evaluating the date and time.
     *
     * This examines the contents of the build.er and resolves it to produce the best
     * available date and time, throwing an exception if a problem occurs.
     * Calling this method changes the state of the builder.
     *
     * @param {ResolverStyle} resolverStyle - how to resolve
     * @param {TemporalField[]} resolverFields
     * @return {DateTimeBuilder} this, for method chaining
     */
    resolve(resolverStyle, resolverFields) {
        if (resolverFields != null) {
            this.fieldValues.retainAll(resolverFields);
        }
        // handle standard fields
        // this._mergeInstantFields();
        this._mergeDate(resolverStyle);
        this._mergeTime(resolverStyle);
        //if (resolveFields(resolverStyle)) {
        //    mergeInstantFields();
        //    mergeDate(resolverStyle);
        //    mergeTime(resolverStyle);
        //}
        this._resolveTimeInferZeroes(resolverStyle);
        //this._crossCheck();
        if (this.excessDays != null && this.excessDays.isZero() === false && this.date != null && this.time != null) {
            this.date = this.date.plus(this.excessDays);
            this.excessDays = Period.ZERO;
        }
        //resolveFractional();
        this._resolveInstant();
        return this;
    }

    /**
     *
     * @param {ResolverStyle} resolverStyle
     * @private
     */
    _mergeDate(resolverStyle) {
        //if (this.chrono instanceof IsoChronology) {
        this._checkDate(IsoChronology.INSTANCE.resolveDate(this.fieldValues, resolverStyle));
        //} else {
        //    if (this.fieldValues.containsKey(ChronoField.EPOCH_DAY)) {
        //        this._checkDate(LocalDate.ofEpochDay(this.fieldValues.remove(ChronoField.EPOCH_DAY)));
        //        return;
        //    }
        //}
    }

    /**
     *
     * @param {LocalDate} date
     * @private
     */
    _checkDate(date) {
        if (date != null) {
            this._addObject(date);
            for (const fieldName in this.fieldValues.keySet()) {
                const field = ChronoField.byName(fieldName);
                if (field) {
                    if (this.fieldValues.get(field) !== undefined) { // undefined if "removed" in EnumMap
                        if (field.isDateBased()) {
                            let val1;
                            try {
                                val1 = date.getLong(field);
                            } catch (ex) {
                                if (ex instanceof DateTimeException) {
                                    continue;
                                } else {
                                    throw ex;
                                }
                            }
                            const val2 = this.fieldValues.get(field);
                            if (val1 !== val2) {
                                throw new DateTimeException(`Conflict found: Field ${field} ${val1} differs from ${field} ${val2} derived from ${date}`);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     *
     * @param {ResolverStyle} resolverStyle
     * @private
     */
    _mergeTime(resolverStyle) {
        if (this.fieldValues.containsKey(ChronoField.CLOCK_HOUR_OF_DAY)) {
            const ch = this.fieldValues.remove(ChronoField.CLOCK_HOUR_OF_DAY);
            if (resolverStyle !== ResolverStyle.LENIENT) {
                if (resolverStyle === ResolverStyle.SMART && ch === 0) {
                    // ok
                } else {
                    ChronoField.CLOCK_HOUR_OF_DAY.checkValidValue(ch);
                }
            }
            this._addFieldValue(ChronoField.HOUR_OF_DAY, ch === 24 ? 0 : ch);
        }
        if (this.fieldValues.containsKey(ChronoField.CLOCK_HOUR_OF_AMPM)) {
            const ch = this.fieldValues.remove(ChronoField.CLOCK_HOUR_OF_AMPM);
            if (resolverStyle !== ResolverStyle.LENIENT) {
                if (resolverStyle === ResolverStyle.SMART && ch === 0) {
                    // ok
                } else {
                    ChronoField.CLOCK_HOUR_OF_AMPM.checkValidValue(ch);
                }
            }
            this._addFieldValue(ChronoField.HOUR_OF_AMPM, ch === 12 ? 0 : ch);
        }
        if (resolverStyle !== ResolverStyle.LENIENT) {
            if (this.fieldValues.containsKey(ChronoField.AMPM_OF_DAY)) {
                ChronoField.AMPM_OF_DAY.checkValidValue(this.fieldValues.get(ChronoField.AMPM_OF_DAY));
            }
            if (this.fieldValues.containsKey(ChronoField.HOUR_OF_AMPM)) {
                ChronoField.HOUR_OF_AMPM.checkValidValue(this.fieldValues.get(ChronoField.HOUR_OF_AMPM));
            }
        }
        if (this.fieldValues.containsKey(ChronoField.AMPM_OF_DAY) && this.fieldValues.containsKey(ChronoField.HOUR_OF_AMPM)) {
            const ap = this.fieldValues.remove(ChronoField.AMPM_OF_DAY);
            const hap = this.fieldValues.remove(ChronoField.HOUR_OF_AMPM);
            this._addFieldValue(ChronoField.HOUR_OF_DAY, ap * 12 + hap);
        }
        //        if (timeFields.containsKey(HOUR_OF_DAY) && timeFields.containsKey(MINUTE_OF_HOUR)) {
        //            const hod = timeFields.remove(HOUR_OF_DAY);
        //            const moh = timeFields.remove(MINUTE_OF_HOUR);
        //            this._addFieldValue(MINUTE_OF_DAY, hod * 60 + moh);
        //        }
        //        if (timeFields.containsKey(MINUTE_OF_DAY) && timeFields.containsKey(SECOND_OF_MINUTE)) {
        //            const mod = timeFields.remove(MINUTE_OF_DAY);
        //            const som = timeFields.remove(SECOND_OF_MINUTE);
        //            this._addFieldValue(SECOND_OF_DAY, mod * 60 + som);
        //        }
        if (this.fieldValues.containsKey(ChronoField.NANO_OF_DAY)) {
            const nod = this.fieldValues.remove(ChronoField.NANO_OF_DAY);
            if (resolverStyle !== ResolverStyle.LENIENT) {
                ChronoField.NANO_OF_DAY.checkValidValue(nod);
            }
            this._addFieldValue(ChronoField.SECOND_OF_DAY, MathUtil.intDiv(nod, 1000000000));
            this._addFieldValue(ChronoField.NANO_OF_SECOND, MathUtil.intMod(nod, 1000000000));
        }
        if (this.fieldValues.containsKey(ChronoField.MICRO_OF_DAY)) {
            const cod = this.fieldValues.remove(ChronoField.MICRO_OF_DAY);
            if (resolverStyle !== ResolverStyle.LENIENT) {
                ChronoField.MICRO_OF_DAY.checkValidValue(cod);
            }
            this._addFieldValue(ChronoField.SECOND_OF_DAY, MathUtil.intDiv(cod, 1000000));
            this._addFieldValue(ChronoField.MICRO_OF_SECOND, MathUtil.intMod(cod, 1000000));
        }
        if (this.fieldValues.containsKey(ChronoField.MILLI_OF_DAY)) {
            const lod = this.fieldValues.remove(ChronoField.MILLI_OF_DAY);
            if (resolverStyle !== ResolverStyle.LENIENT) {
                ChronoField.MILLI_OF_DAY.checkValidValue(lod);
            }
            this._addFieldValue(ChronoField.SECOND_OF_DAY, MathUtil.intDiv(lod, 1000));
            this._addFieldValue(ChronoField.MILLI_OF_SECOND, MathUtil.intMod(lod, 1000));
        }
        if (this.fieldValues.containsKey(ChronoField.SECOND_OF_DAY)) {
            const sod = this.fieldValues.remove(ChronoField.SECOND_OF_DAY);
            if (resolverStyle !== ResolverStyle.LENIENT) {
                ChronoField.SECOND_OF_DAY.checkValidValue(sod);
            }
            this._addFieldValue(ChronoField.HOUR_OF_DAY, MathUtil.intDiv(sod, 3600));
            this._addFieldValue(ChronoField.MINUTE_OF_HOUR, MathUtil.intMod(MathUtil.intDiv(sod, 60), 60));
            this._addFieldValue(ChronoField.SECOND_OF_MINUTE, MathUtil.intMod(sod, 60));
        }
        if (this.fieldValues.containsKey(ChronoField.MINUTE_OF_DAY)) {
            const mod = this.fieldValues.remove(ChronoField.MINUTE_OF_DAY);
            if (resolverStyle !== ResolverStyle.LENIENT) {
                ChronoField.MINUTE_OF_DAY.checkValidValue(mod);
            }
            this._addFieldValue(ChronoField.HOUR_OF_DAY, MathUtil.intDiv(mod, 60));
            this._addFieldValue(ChronoField.MINUTE_OF_HOUR, MathUtil.intMod(mod, 60));
        }

        //            const sod = MathUtil.intDiv(nod, 1000000000L);
        //            this._addFieldValue(HOUR_OF_DAY, MathUtil.intDiv(sod, 3600));
        //            this._addFieldValue(MINUTE_OF_HOUR, MathUtil.intMod(MathUtil.intDiv(sod, 60), 60));
        //            this._addFieldValue(SECOND_OF_MINUTE, MathUtil.intMod(sod, 60));
        //            this._addFieldValue(NANO_OF_SECOND, MathUtil.intMod(nod, 1000000000L));
        if (resolverStyle !== ResolverStyle.LENIENT) {
            if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND)) {
                ChronoField.MILLI_OF_SECOND.checkValidValue(this.fieldValues.get(ChronoField.MILLI_OF_SECOND));
            }
            if (this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND)) {
                ChronoField.MICRO_OF_SECOND.checkValidValue(this.fieldValues.get(ChronoField.MICRO_OF_SECOND));
            }
        }
        if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND) && this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND)) {
            const los = this.fieldValues.remove(ChronoField.MILLI_OF_SECOND);
            const cos = this.fieldValues.get(ChronoField.MICRO_OF_SECOND);
            this._putFieldValue0(ChronoField.MICRO_OF_SECOND, los * 1000 + (MathUtil.intMod(cos, 1000)));
        }
        if (this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND) && this.fieldValues.containsKey(ChronoField.NANO_OF_SECOND)) {
            const nos = this.fieldValues.get(ChronoField.NANO_OF_SECOND);
            this._putFieldValue0(ChronoField.MICRO_OF_SECOND, MathUtil.intDiv(nos, 1000));
            this.fieldValues.remove(ChronoField.MICRO_OF_SECOND);
        }
        if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND) && this.fieldValues.containsKey(ChronoField.NANO_OF_SECOND)) {
            const nos = this.fieldValues.get(ChronoField.NANO_OF_SECOND);
            this._putFieldValue0(ChronoField.MILLI_OF_SECOND, MathUtil.intDiv(nos, 1000000));
            this.fieldValues.remove(ChronoField.MILLI_OF_SECOND);
        }
        if (this.fieldValues.containsKey(ChronoField.MICRO_OF_SECOND)) {
            const cos = this.fieldValues.remove(ChronoField.MICRO_OF_SECOND);
            this._putFieldValue0(ChronoField.NANO_OF_SECOND, cos * 1000);
        } else if (this.fieldValues.containsKey(ChronoField.MILLI_OF_SECOND)) {
            const los = this.fieldValues.remove(ChronoField.MILLI_OF_SECOND);
            this._putFieldValue0(ChronoField.NANO_OF_SECOND, los * 1000000);
        }
    }

    /**
     *
     * @param {ResolverStyle} resolverStyle
     * @private
     */
    _resolveTimeInferZeroes(resolverStyle) {
        let hod =  this.fieldValues.get(ChronoField.HOUR_OF_DAY);
        const moh =  this.fieldValues.get(ChronoField.MINUTE_OF_HOUR);
        const som =  this.fieldValues.get(ChronoField.SECOND_OF_MINUTE);
        let nos =  this.fieldValues.get(ChronoField.NANO_OF_SECOND);
        if (hod == null) {
            return;
        }
        if (moh == null && (som != null || nos != null)) {
            return;
        }
        if (moh != null && som == null && nos != null) {
            return;
        }
        if (resolverStyle !== ResolverStyle.LENIENT) {
            if (hod != null) {
                if (resolverStyle === ResolverStyle.SMART &&
                                hod === 24 &&
                                (moh == null || moh === 0) &&
                                (som == null || som === 0) &&
                                (nos == null || nos === 0)) {
                    hod = 0;
                    this.excessDays = Period.ofDays(1);
                }
                const hodVal = ChronoField.HOUR_OF_DAY.checkValidIntValue(hod);
                if (moh != null) {
                    const mohVal = ChronoField.MINUTE_OF_HOUR.checkValidIntValue(moh);
                    if (som != null) {
                        const somVal = ChronoField.SECOND_OF_MINUTE.checkValidIntValue(som);
                        if (nos != null) {
                            const nosVal = ChronoField.NANO_OF_SECOND.checkValidIntValue(nos);
                            this._addObject(LocalTime.of(hodVal, mohVal, somVal, nosVal));
                        } else {
                            this._addObject(LocalTime.of(hodVal, mohVal, somVal));
                        }
                    } else {
                        if (nos == null) {
                            this._addObject(LocalTime.of(hodVal, mohVal));
                        }
                    }
                } else {
                    if (som == null && nos == null) {
                        this._addObject(LocalTime.of(hodVal, 0));
                    }
                }
            }
        } else {
            if (hod != null) {
                let hodVal = hod;
                if (moh != null) {
                    if (som != null) {
                        if (nos == null) {
                            nos = 0;
                        }
                        let totalNanos = MathUtil.safeMultiply(hodVal, 3600000000000);
                        totalNanos = MathUtil.safeAdd(totalNanos, MathUtil.safeMultiply(moh, 60000000000));
                        totalNanos = MathUtil.safeAdd(totalNanos, MathUtil.safeMultiply(som, 1000000000));
                        totalNanos = MathUtil.safeAdd(totalNanos, nos);
                        const excessDays =  MathUtil.floorDiv(totalNanos, 86400000000000);  // safe int cast
                        const nod = MathUtil.floorMod(totalNanos, 86400000000000);
                        this._addObject(LocalTime.ofNanoOfDay(nod));
                        this.excessDays = Period.ofDays(excessDays);
                    } else {
                        let totalSecs = MathUtil.safeMultiply(hodVal, 3600);
                        totalSecs = MathUtil.safeAdd(totalSecs, MathUtil.safeMultiply(moh, 60));
                        const excessDays =  MathUtil.floorDiv(totalSecs, 86400);  // safe int cast
                        const sod = MathUtil.floorMod(totalSecs, 86400);
                        this._addObject(LocalTime.ofSecondOfDay(sod));
                        this.excessDays = Period.ofDays(excessDays);
                    }
                } else {
                    const excessDays = MathUtil.safeToInt(MathUtil.floorDiv(hodVal, 24));
                    hodVal = MathUtil.floorMod(hodVal, 24);
                    this._addObject(LocalTime.of(hodVal, 0));
                    this.excessDays = Period.ofDays(excessDays);
                }
            }
        }
        this.fieldValues.remove(ChronoField.HOUR_OF_DAY);
        this.fieldValues.remove(ChronoField.MINUTE_OF_HOUR);
        this.fieldValues.remove(ChronoField.SECOND_OF_MINUTE);
        this.fieldValues.remove(ChronoField.NANO_OF_SECOND);
    }

    /**
     *
     * @param {ChronoLocalDate|LocalTime} dateOrTime
     * @private
     */
    _addObject(dateOrTime) {
        if (dateOrTime instanceof ChronoLocalDate){
            this.date = dateOrTime;
        } else if (dateOrTime instanceof LocalTime){
            this.time = dateOrTime;
        }
    }

    _resolveInstant() {
        if (this.date != null && this.time != null) {
            const offsetSecs = this.fieldValues.get(ChronoField.OFFSET_SECONDS);
            if (offsetSecs != null) {
                const offset = ZoneOffset.ofTotalSeconds(offsetSecs);
                const instant = this.date.atTime(this.time).atZone(offset).getLong(ChronoField.INSTANT_SECONDS);
                this.fieldValues.put(ChronoField.INSTANT_SECONDS, instant);
            } else if (this.zone != null) {
                const instant = this.date.atTime(this.time).atZone(this.zone).getLong(ChronoField.INSTANT_SECONDS);
                this.fieldValues.put(ChronoField.INSTANT_SECONDS, instant);
            }
        }
    }

    /**
     * Builds the specified type from the values in this builder.
     *
     * This attempts to build the specified type from this builder.
     * If the builder cannot return the type, an exception is thrown.
     *
     * @param {!TemporalQuery} type - the type to invoke `from` on, not null
     * @return {*} the extracted value, not null
     * @throws DateTimeException if an error occurs
     */
    build(type) {
        return type.queryFrom(this);
    }

    /**
     *
     * @param {TemporalField} field
     * @returns {number}
     */
    isSupported(field) {
        if (field == null) {
            return false;
        }
        return (this.fieldValues.containsKey(field) && this.fieldValues.get(field) !== undefined) ||
                (this.date != null && this.date.isSupported(field)) ||
                (this.time != null && this.time.isSupported(field));
    }

    /**
     *
     * @param {TemporalField} field
     * @returns {number}
     */
    getLong(field) {
        requireNonNull(field, 'field');
        const value = this.getFieldValue0(field);
        if (value == null) {
            if (this.date != null && this.date.isSupported(field)) {
                return this.date.getLong(field);
            }
            if (this.time != null && this.time.isSupported(field)) {
                return this.time.getLong(field);
            }
            throw new DateTimeException(`Field not found: ${field}`);
        }
        return value;
    }

    /**
     *
     * @param {!TemporalQuery} query
     * @returns {*}
     */
    query(query) {
        if (query === TemporalQueries.zoneId()) {
            return this.zone;
        } else if (query === TemporalQueries.chronology()) {
            return this.chrono;
        } else if (query === TemporalQueries.localDate()) {
            return this.date != null ? LocalDate.from(this.date) : null;
        } else if (query === TemporalQueries.localTime()) {
            return this.time;
        } else if (query === TemporalQueries.zone() || query === TemporalQueries.offset()) {
            return query.queryFrom(this);
        } else if (query === TemporalQueries.precision()) {
            return null;  // not a complete date/time
        }
        // inline TemporalAccessor.super.query(query) as an optimization
        // non-JDK classes are not permitted to make this optimization
        return query.queryFrom(this);
    }

}
