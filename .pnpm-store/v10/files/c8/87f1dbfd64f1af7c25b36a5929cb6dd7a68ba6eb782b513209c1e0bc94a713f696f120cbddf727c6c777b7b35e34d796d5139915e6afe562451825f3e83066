/**
 * @copyright (c) 2016-present, Philipp Thürwächter & Pattrick Hüper  & js-joda contributors
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { Temporal } from './temporal/Temporal';
import { Clock } from './Clock';
import { DateTimeException, UnsupportedTemporalTypeException } from './errors';
import { DateTimeFormatter } from './format/DateTimeFormatter';
import { Instant, LocalTime } from './js-joda';
import { MathUtil } from './MathUtil';
import { OffsetDateTime } from './OffsetDateTime';
import { TemporalQueries } from './temporal/TemporalQueries';
import { ZoneId } from './ZoneId';
import { ZoneOffset } from './ZoneOffset';

import { createTemporalQuery } from './temporal/TemporalQuery';
import { requireInstance, requireNonNull } from './assert';

/**
 * A time with an offset from UTC/Greenwich in the ISO-8601 calendar system, such as 10:15:30+01:00.
 */
export class OffsetTime extends Temporal {
    /**
     * @param {!TemporalAccessor} temporal
     * @return {OffsetTime}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        if (temporal instanceof OffsetTime) {
            return temporal;
        } else if (temporal instanceof OffsetDateTime) {
            return temporal.toOffsetTime();
        }
        try {
            const time = LocalTime.from(temporal);
            const offset = ZoneOffset.from(temporal);
            return new OffsetTime(time, offset);
        } catch(ex) {
            throw new DateTimeException(`Unable to obtain OffsetTime TemporalAccessor: ${temporal}, type ${temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
    }

    /**
     * @param {Clock|ZoneId} clockOrZone
     * @return {OffsetTime}
     */
    static now(clockOrZone) {
        if (arguments.length === 0){
            return OffsetTime._now(Clock.systemDefaultZone());
        } else if (clockOrZone instanceof Clock){
            return OffsetTime._now(clockOrZone);
        } else {
            return OffsetTime._now(Clock.system(clockOrZone));
        }
    }

    /**
     * @param {Clock} clock - the clock to use, defaults to Clock.systemDefaultZone()
     * @return {OffsetTime} the current offset date-time, not null
     */
    static _now(clock) {
        requireNonNull(clock, 'clock');
        const now = clock.instant();
        return OffsetTime.ofInstant(now, clock.zone().rules().offset(now));
    }

    /**
     * @return {OffsetTime}
     */
    static of(){
        if (arguments.length <= 2) {
            return OffsetTime.ofTimeAndOffset.apply(this, arguments);
        } else {
            return OffsetTime.ofNumbers.apply(this, arguments);
        }
    }

    /**
     * @param {int} hour
     * @param {int} minute
     * @param {int} second
     * @param {int} nanoOfSecond
     * @param {ZoneOffset} offset
     * @return {OffsetTime}
     */
    static ofNumbers(hour, minute, second, nanoOfSecond, offset) {
        const time = LocalTime.of(hour, minute, second, nanoOfSecond);
        return new OffsetTime(time, offset);
    }

    /**
     * @param {LocalTime} time
     * @param {ZoneOffset} offset
     * @return {OffsetTime}
     */
    static ofTimeAndOffset(time, offset) {
        return new OffsetTime(time, offset);
    }

    /**
     * @param {!Instant} instant
     * @param {!ZoneId} zone
     * @return {!OffsetTime}
     */
    static ofInstant( instant,  zone){
        requireNonNull(instant, 'instant');
        requireInstance(instant, Instant, 'instant');
        requireNonNull(zone, 'zone');
        requireInstance(zone, ZoneId, 'zone');

        const rules = zone.rules();
        const offset = rules.offset(instant);
        let secsOfDay = instant.epochSecond() % LocalTime.SECONDS_PER_DAY;
        secsOfDay = (secsOfDay + offset.totalSeconds()) % LocalTime.SECONDS_PER_DAY;
        if (secsOfDay < 0) {
            secsOfDay += LocalTime.SECONDS_PER_DAY;
        }
        const time = LocalTime.ofSecondOfDay(secsOfDay, instant.nano());
        return new OffsetTime(time, offset);
    }

    /**
     * @param {string} text
     * @param {DateTimeFormatter} formatter
     * @return {OffsetTime}
     */
    static parse(text, formatter= DateTimeFormatter.ISO_OFFSET_TIME) {
        requireNonNull(formatter, 'formatter');
        return formatter.parse(text, OffsetTime.FROM);
    }
    //-----------------------------------------------------------------------

    /**
     * @param {LocalTime} time
     * @param {ZoneOffset} offset
     * @private
     */
    constructor(time, offset) {
        super();
        requireNonNull(time, 'time');
        requireInstance(time, LocalTime, 'time');
        requireNonNull(offset, 'offset');
        requireInstance(offset, ZoneOffset, 'offset');
        this._time = time;
        this._offset = offset;
    }


    /**
     * @param {TemporalAdjuster} temporal - the target object to be adjusted, not null
     * @return {Temporal} the adjusted object, not null
     * @throws {DateTimeException} if unable to make the adjustment
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    adjustInto(temporal) {
        return temporal
            .with(ChronoField.NANO_OF_DAY, this._time.toNanoOfDay())
            .with(ChronoField.OFFSET_SECONDS, this.offset().totalSeconds());
    }

    /**
     * @param {LocalDate} date - the date to combine with, not null
     * @return {OffsetDateTime} the offset date-time formed from this time and the specified date, not null
     */
    atDate(date) {
        return OffsetDateTime.of(date, this._time, this._offset);
    }

    /**
     * @param {DateTimeFormatter} formatter - the formatter to use, not null
     * @return {string} the formatted time string, not null
     * @throws {DateTimeException} if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        return formatter.format(this, OffsetTime.FROM);
    }


    /**
     * @param {TemporalField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws {DateTimeException} if a value for the field cannot be obtained
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    get(field) {
        return super.get(field);
    }

    /**
     * @param {TemporalField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws {DateTimeException} if a value for the field cannot be obtained
     * @trhows {UnsupportedTemporalTypeException}
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    getLong(field) {
        if (field instanceof ChronoField) {
            if (field === ChronoField.OFFSET_SECONDS) {
                return this._offset.totalSeconds();
            }
            return this._time.getLong(field);
        }
        return field.getFrom(this);
    }

    /**
     * @return {int}
     */
    hour() {
        return this._time.hour();
    }

    /**
     * @return {int}
     */
    minute() {
        return this._time.minute();
    }

    /**
     * @return {int}
     */
    second() {
        return this._time.second();
    }

    /**
     * @return {int}
     */
    nano() {
        return this._time.nano();
    }

    /**
     * @return {ZoneOffset}
     */
    offset() {
        return this._offset;
    }

    /**
     * @param {OffsetTime} other - the other time to compare to, not null
     * @return {boolean} true if this is after the specified time
     * @throws {NullPointerException} if `other` is null
     */
    isAfter(other) {
        requireNonNull(other, 'other');
        return this._toEpochNano() > other._toEpochNano();
    }

    /**
     * @param {OffsetTime} other - the other time to compare to, not null
     * @return {boolean} true if this point is before the specified time
     * @throws {NullPointerException} if `other` is null
     */
    isBefore(other) {
        requireNonNull(other, 'other');
        return this._toEpochNano() < other._toEpochNano();
    }

    /**
     * @param {OffsetTime} other - the other time to compare to, not null
     * @return {boolean}
     * @throws {NullPointerException} if `other` is null
     */
    isEqual(other) {
        requireNonNull(other, 'other');
        return this._toEpochNano() === other._toEpochNano();
    }

    /**
     * @param {TemporalField|TemporalUnit} fieldOrUnit - the field to check, null returns false
     * @return {boolean} true if the field is supported on this time, false if not
     */
    isSupported(fieldOrUnit) {
        if (fieldOrUnit instanceof ChronoField) {
            return fieldOrUnit.isTimeBased() || fieldOrUnit === ChronoField.OFFSET_SECONDS;
        } else if (fieldOrUnit instanceof ChronoUnit) {
            return fieldOrUnit.isTimeBased();
        }
        return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
    }

    /**
     * @param {number} hours
     * @return {OffsetTime}
     */
    minusHours(hours) {
        return this._withLocalTimeOffset(this._time.minusHours(hours), this._offset);
    }

    /**
     * @param {number} minutes
     * @return {OffsetTime}
     */
    minusMinutes(minutes) {
        return this._withLocalTimeOffset(this._time.minusMinutes(minutes), this._offset);
    }

    /**
     * @param {number} seconds
     * @return {OffsetTime}
     */
    minusSeconds(seconds) {
        return this._withLocalTimeOffset(this._time.minusSeconds(seconds), this._offset);
    }

    /**
     * @param {number} nanos
     * @return {OffsetTime}
     */
    minusNanos(nanos) {
        return this._withLocalTimeOffset(this._time.minusNanos(nanos), this._offset);
    }

    _minusAmount(amount) {
        requireNonNull(amount);
        return amount.subtractFrom(this);
    }

    _minusUnit(amountToSubtract, unit) {
        return this.plus(-1 * amountToSubtract, unit);
    }

    _plusAmount(amount) {
        requireNonNull(amount);
        return amount.addTo(this);
    }

    /**
     *
     * @param amountToAdd
     * @param unit
     * @return {Temporal}
     */
    _plusUnit(amountToAdd, unit) {
        if (unit instanceof ChronoUnit) {
            return this._withLocalTimeOffset(this._time.plus(amountToAdd, unit), this._offset);
        }
        return unit.addTo(this, amountToAdd);
    }

    /**
     * @param {int} hours
     * @return {OffsetTime}
     */
    plusHours(hours) {
        return this._withLocalTimeOffset(this._time.plusHours(hours), this._offset);
    }

    /**
     * @param {int} minutes
     * @return {OffsetTime}
     */
    plusMinutes(minutes) {
        return this._withLocalTimeOffset(this._time.plusMinutes(minutes), this._offset);
    }

    /**
     * @param {int} seconds
     * @return {OffsetTime}
     */
    plusSeconds(seconds) {
        return this._withLocalTimeOffset(this._time.plusSeconds(seconds), this._offset);
    }

    /**
     * @param {int} nanos
     * @return {OffsetTime}
     */
    plusNanos(nanos) {
        return this._withLocalTimeOffset(this._time.plusNanos(nanos), this._offset);
    }

    /**
     * @param {TemporalQuery} query - the query to invoke, not null
     * @return {*} the query result, null may be returned (defined by the query)
     * @throws {DateTimeException} if unable to query (defined by the query)
     * @throws {ArithmeticException} if numeric overflow occurs (defined by the query)
     */
    query(query) {
        requireNonNull(query, 'query');
        if (query === TemporalQueries.precision()) {
            return ChronoUnit.NANOS;
        } else if (query === TemporalQueries.offset() || query === TemporalQueries.zone()) {
            return this.offset();
        } else if (query === TemporalQueries.localTime()) {
            return this._time;
        } else if (query === TemporalQueries.chronology() || query === TemporalQueries.localDate() || query === TemporalQueries.zoneId()) {
            return null;
        }
        return super.query(query);
    }

    /**
     * @param {TemporalField} field - the field to query the range for, not null
     * @return {ValueRange} the range of valid values for the field, not null
     * @throws {DateTimeException} if the range for the field cannot be obtained
     */
    range(field) {
        if (field instanceof ChronoField) {
            if (field === ChronoField.OFFSET_SECONDS) {
                return field.range();
            }
            return this._time.range(field);
        }
        return field.rangeRefinedBy(this);
    }

    /**
     * @return {LocalTime}
     */
    toLocalTime() {
        return this._time;
    }

    /**
     * @param {TemporalUnit} unit - the unit to truncate to, not null
     * @return {OffsetTime} a {@link LocalTime} based on this time with the time truncated, not null
     * @throws {DateTimeException} if unable to truncate
     */
    truncatedTo(unit) {
        return this._withLocalTimeOffset(this._time.truncatedTo(unit), this._offset);
    }

    /**
    * @param {Temporal} endExclusive - the end time, which is converted to a {@link LocalTime}, not null
    * @param {TemporalUnit} unit - the unit to measure the period in, not null
    * @return {number} the amount of the period between this time and the end time
    * @throws {DateTimeException} if the period cannot be calculated
    * @throws {ArithmeticException} if numeric overflow occurs
    */
    until(endExclusive, unit) {
        requireNonNull(endExclusive, 'endExclusive');
        requireNonNull(unit, 'unit');
        const end = OffsetTime.from(endExclusive);
        if (unit instanceof ChronoUnit) {
            const nanosUntil = end._toEpochNano() - this._toEpochNano(); // no overflow
            switch (unit) {
                case ChronoUnit.NANOS: return nanosUntil;
                case ChronoUnit.MICROS: return MathUtil.intDiv(nanosUntil, 1000);
                case ChronoUnit.MILLIS: return MathUtil.intDiv(nanosUntil, 1000000);
                case ChronoUnit.SECONDS: return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_SECOND);
                case ChronoUnit.MINUTES: return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_MINUTE);
                case ChronoUnit.HOURS: return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_HOUR);
                case ChronoUnit.HALF_DAYS: return MathUtil.intDiv(nanosUntil, (12 * LocalTime.NANOS_PER_HOUR));
            }
            throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
        }
        return unit.between(this, end);
    }

    /**
     * @param {int} hour
     * @return {OffsetTime}
     */
    withHour(hour) {
        return this._withLocalTimeOffset(this._time.withHour(hour), this._offset);
    }

    /**
     * @param {int} minute
     * @return {OffsetTime}
     */
    withMinute(minute) {
        return this._withLocalTimeOffset(this._time.withMinute(minute), this._offset);
    }

    /**
     * @param {int} second
     * @return {OffsetTime}
     */
    withSecond(second) {
        return this._withLocalTimeOffset(this._time.withSecond(second), this._offset);
    }

    /**
     * @param {int} nano
     * @return {OffsetTime}
     */
    withNano(nano) {
        return this._withLocalTimeOffset(this._time.withNano(nano), this._offset);
    }

    /**
     * @param {ZoneOffset} offset
     * @return {OffsetTime}
     */
    withOffsetSameInstant(offset) {
        requireNonNull(offset, 'offset');
        if (offset.equals(this._offset)) {
            return this;
        }
        const difference = offset.totalSeconds() - this._offset.totalSeconds();
        const adjusted = this._time.plusSeconds(difference);
        return new OffsetTime(adjusted, offset);
    }

    /**
     * @param {ZoneOffset} offset
     * @return {OffsetTime}
     */
    withOffsetSameLocal(offset) {
        return offset != null && offset.equals(this._offset) ? this : new OffsetTime(this._time, offset);
    }

    _toEpochNano() {
        const nod = this._time.toNanoOfDay();
        const offsetNanos = this._offset.totalSeconds() * LocalTime.NANOS_PER_SECOND;
        return nod - offsetNanos;
    }

    _withAdjuster(adjuster) {
        requireNonNull(adjuster, 'adjuster');
        // optimizations
        if (adjuster instanceof LocalTime) {
            return this._withLocalTimeOffset(adjuster, this._offset);
        } else if (adjuster instanceof ZoneOffset) {
            return this._withLocalTimeOffset(this._time, adjuster);
        } else if (adjuster instanceof OffsetTime) {
            return adjuster;
        }
        return adjuster.adjustInto(this);
    }

    _withField(field, newValue) {
        requireNonNull(field, 'field');
        if (field instanceof ChronoField) {
            if (field === ChronoField.OFFSET_SECONDS) {
                return this._withLocalTimeOffset(this._time, ZoneOffset.ofTotalSeconds(field.checkValidIntValue(newValue)));
            }
            return this._withLocalTimeOffset(this._time.with(field, newValue), this._offset);
        }
        return field.adjustInto(this, newValue);
    }

    /**
     * @private
     * @param {LocalTime} time
     * @param {ZoneOffset} offset
     * @return {OffsetTime}
     */
    _withLocalTimeOffset(time, offset) {
        if (this._time === time && this._offset.equals(offset)) {
            return this;
        }
        return new OffsetTime(time, offset);
    }

    //---------------------------------

    /**
     * @param {OffsetTime} other - the other time to compare to, not null
     * @return {int} the comparator value, negative if less, positive if greater
     * @throws {NullPointerException} if `other` is null
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, OffsetTime, 'other');
        if (this._offset.equals(other._offset)) {
            return this._time.compareTo(other._time);
        }
        const compare = MathUtil.compareNumbers(this._toEpochNano(), other._toEpochNano());
        if (compare === 0) {
            return this._time.compareTo(other._time);
        }
        return compare;
    }

    /**
     * @param {*} other - the object to check, null returns false
     * @return {boolean} true if this is equal to the other time
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof OffsetTime) {
            return this._time.equals(other._time) && this._offset.equals(other._offset);
        }
        return false;
    }

    /**
     * @return {number}
     */
    hashCode() {
        return this._time.hashCode() ^ this._offset.hashCode();
    }

    /**
     * @return {string}
     */
    toString() {
        return this._time.toString() + this._offset.toString();
    }

    /**
     *
     * @return {string} same as {@link LocalDateTime.toString}
     */
    toJSON() {
        return this.toString();
    }
}


export function _init() {
    OffsetTime.MIN = OffsetTime.ofNumbers(0, 0, 0,0, ZoneOffset.MAX);

    OffsetTime.MAX = OffsetTime.ofNumbers(23, 59, 59,999999999, ZoneOffset.MIN);

    OffsetTime.FROM = createTemporalQuery('OffsetTime.FROM', (temporal) => {
        return OffsetTime.from(temporal);
    });
}
