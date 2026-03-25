/**
 * @copyright (c) 2016-present, Philipp Thürwächter & Pattrick Hüper  & js-joda contributors
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { Temporal } from './temporal/Temporal';
import { Clock } from './Clock';
import { DateTimeFormatter } from './format/DateTimeFormatter';
import { Instant } from './Instant';
import { IsoChronology } from './chrono/IsoChronology';
import { LocalDateTime } from './LocalDateTime';
import { LocalDate } from './LocalDate';
import { LocalTime } from './LocalTime';
import { MathUtil } from './MathUtil';
import { OffsetTime } from './OffsetTime';
import { TemporalQueries } from './temporal/TemporalQueries';
import { ZonedDateTime } from './ZonedDateTime';
import { ZoneId } from './ZoneId';
import { ZoneOffset } from './ZoneOffset';
import { DateTimeException, IllegalArgumentException } from './errors';

import { createTemporalQuery } from './temporal/TemporalQuery';
import { requireInstance, requireNonNull } from './assert';

/**
 * A date-time with an offset from UTC/Greenwich in the ISO-8601 calendar system,
 * such as 2007-12-23T10:15:30+01:00.
 */
export class OffsetDateTime extends Temporal {
    /**
     * @param {TemporaroAccessor} temporal
     * @return {OffsetDateTime}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        if (temporal instanceof OffsetDateTime) {
            return temporal;
        }
        try {
            const offset = ZoneOffset.from(temporal);
            try {
                const ldt = LocalDateTime.from(temporal);
                return OffsetDateTime.of(ldt, offset);
            } catch (_) {
                const instant = Instant.from(temporal);
                return OffsetDateTime.ofInstant(instant, offset);
            }
        } catch (ex) {
            throw new DateTimeException(`Unable to obtain OffsetDateTime TemporalAccessor: ${temporal}, type ${temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
    }

    /**
     * @param {Clock|ZoneId|null} clockOrZone
     * @return {OffsetDateTime}
     */
    static now(clockOrZone) {
        if (arguments.length === 0) {
            return OffsetDateTime.now(Clock.systemDefaultZone());
        } else {
            requireNonNull(clockOrZone, 'clockOrZone');
            if (clockOrZone instanceof ZoneId) {
                return OffsetDateTime.now(Clock.system(clockOrZone));
            } else if (clockOrZone instanceof Clock) {
                const now = clockOrZone.instant(); // called once
                return OffsetDateTime.ofInstant(now, clockOrZone.zone().rules().offset(now));
            } else {
                throw new IllegalArgumentException('clockOrZone must be an instance of ZoneId or Clock');
            }
        }
    }

    /**
     * @return {OffsetDateTime}
     */
    static of() {
        if (arguments.length <= 2) {
            return OffsetDateTime.ofDateTime.apply(this, arguments);
        } else if (arguments.length === 3) {
            return OffsetDateTime.ofDateAndTime.apply(this, arguments);
        } else {
            return OffsetDateTime.ofNumbers.apply(this, arguments);
        }
    }

    static ofDateTime(dateTime, offset) {
        return new OffsetDateTime(dateTime, offset);
    }

    static ofDateAndTime(date, time, offset) {
        const dt = LocalDateTime.of(date, time);
        return new OffsetDateTime(dt, offset);
    }

    static ofNumbers(year, month, dayOfMonth, hour=0, minute=0, second=0, nanoOfSecond=0, offset) {
        const dt = LocalDateTime.of(year, month, dayOfMonth, hour, minute, second, nanoOfSecond);
        return new OffsetDateTime(dt, offset);
    }

    /**
     * @param {Instant} instant
     * @param {ZoneId} zone
     * @return {OffsetDateTime}
     */
    static ofInstant(instant,  zone){
        requireNonNull(instant, 'instant');
        requireNonNull(zone, 'zone');
        const rules = zone.rules();
        const offset = rules.offset(instant);
        const ldt = LocalDateTime.ofEpochSecond(instant.epochSecond(), instant.nano(), offset);
        return new OffsetDateTime(ldt, offset);
    }

    /**
     * @param {string} text
     * @param {DateTimeFormatter|undefined} formatter
     * @return {OffsetTime}
     */
    static parse(text, formatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME){
        requireNonNull(formatter, 'formatter');
        return formatter.parse(text, OffsetDateTime.FROM);
    }

    // TODO: Need java.util.Comparater interface.
    // static timeLineOrder() {
    //
    // }

    //-----------------------------------------------------------------------


    /**
     * @param {LocalDateTime} dateTime
     * @param {ZoneOffset} offset
     * @private
     */
    constructor(dateTime, offset) {
        super();
        requireNonNull(dateTime, 'dateTime');
        requireInstance(dateTime, LocalDateTime, 'dateTime');
        requireNonNull(offset, 'offset');
        requireInstance(offset, ZoneOffset, 'offset');
        this._dateTime = dateTime;
        this._offset = offset;
    }

    /**
     *
     * @param {Temporal} temporal
     * @return {Temporal}
     */
    adjustInto(temporal) {
        return temporal
            .with(ChronoField.EPOCH_DAY, this.toLocalDate().toEpochDay())
            .with(ChronoField.NANO_OF_DAY, this.toLocalTime().toNanoOfDay())
            .with(ChronoField.OFFSET_SECONDS, this.offset().totalSeconds());
    }

    until(endExclusive, unit) {
        let end = OffsetDateTime.from(endExclusive);
        if (unit instanceof ChronoUnit) {
            end = end.withOffsetSameInstant(this._offset);
            return this._dateTime.until(end._dateTime, unit);
        }
        return unit.between(this, end);
    }

    /**
     * @param {ZoneId} zone
     * @return {ZonedDateTime}
     */
    atZoneSameInstant(zone) {
        return ZonedDateTime.ofInstant(this._dateTime, this._offset, zone);
    }

    /**
     * @param {ZoneId} zone
     * @return {ZonedDateTime}
     */
    atZoneSimilarLocal(zone) {
        return ZonedDateTime.ofLocal(this._dateTime, zone, this._offset);
    }

    query(query) {
        requireNonNull(query, 'query');
        if (query === TemporalQueries.chronology()) {
            return IsoChronology.INSTANCE;
        } else if (query === TemporalQueries.precision()) {
            return ChronoUnit.NANOS;
        } else if (query === TemporalQueries.offset() || query === TemporalQueries.zone()) {
            return this.offset();
        } else if (query === TemporalQueries.localDate()) {
            return this.toLocalDate();
        } else if (query === TemporalQueries.localTime()) {
            return this.toLocalTime();
        } else if (query === TemporalQueries.zoneId()) {
            return null;
        }
        return super.query(query);
    }

    get(field) {
        if (field instanceof ChronoField) {
            switch (field) {
                case ChronoField.INSTANT_SECONDS: throw new DateTimeException(`Field too large for an int: ${field}`);
                case ChronoField.OFFSET_SECONDS: return this.offset().totalSeconds();
            }
            return this._dateTime.get(field);
        }
        return super.get(field);
    }

    getLong(field) {
        if (field instanceof ChronoField) {
            switch (field) {
                case ChronoField.INSTANT_SECONDS: return this.toEpochSecond();
                case ChronoField.OFFSET_SECONDS: return this.offset().totalSeconds();
            }
            return this._dateTime.getLong(field);
        }
        return field.getFrom(this);
    }

    /**
     * @return {ZoneOffset}
     */
    offset() {
        return this._offset;
    }

    /**
     * @return {number} the year, from MIN_YEAR to MAX_YEAR
     */
    year() {
        return this._dateTime.year();
    }

    /**
     * @return {number} the month-of-year, from 1 to 12
     * @see #month()
     */
    monthValue() {
        return this._dateTime.monthValue();
    }

    /**
     * @return {{number} }the month-of-year, not null
     * @see #monthValue()
     */
    month() {
        return this._dateTime.month();
    }

    /**
     * @return {number} the day-of-month, from 1 to 31
     */
    dayOfMonth() {
        return this._dateTime.dayOfMonth();
    }

    /**
     * @return {number} the day-of-year, from 1 to 365, or 366 in a leap year
     */
    dayOfYear() {
        return this._dateTime.dayOfYear();
    }

    /**
     * @return {number} the day-of-week, not null
     */
    dayOfWeek() {
        return this._dateTime.dayOfWeek();
    }

    /**
     * @return {number} the hour-of-day, from 0 to 23
     */
    hour() {
        return this._dateTime.hour();
    }

    /**
     * @return {number} the minute-of-hour, from 0 to 59
     */
    minute() {
        return this._dateTime.minute();
    }

    /**
     * @return {number} the second-of-minute, from 0 to 59
     */
    second() {
        return this._dateTime.second();
    }

    /**
     * @return {number} the nano-of-second, from 0 to 999,999,999
     */
    nano() {
        return this._dateTime.nano();
    }

    //-----------------------------------------------------------------------
    /**
     * @return {LocalDateTime}the local date-time part of this date-time, not null
     */
    toLocalDateTime() {
        return this._dateTime;
    }

    /**
     * @return {LocalDate} the date part of this date-time, not null
     */
    toLocalDate() {
        return this._dateTime.toLocalDate();
    }

    /**
     * @return {LocalTime} the time part of this date-time, not null
     */
    toLocalTime() {
        return this._dateTime.toLocalTime();
    }

    /**
     * @return {OffsetTime} an OffsetTime representing the time and offset, not null
     */
    toOffsetTime() {
        return OffsetTime.of(this._dateTime.toLocalTime(), this._offset);
    }

    /**
     * @return {ZonedDateTime}a zoned date-time representing the same local date-time and offset, not null
     */
    toZonedDateTime() {
        return ZonedDateTime.of(this._dateTime, this._offset);
    }

    /**
     * @return {Instant} an {@code Instant} representing the same instant, not null
     */
    toInstant() {
        return this._dateTime.toInstant(this._offset);
    }

    /**
     * @return {number} the number of seconds from the epoch of 1970-01-01T00:00:00Z
     */
    toEpochSecond() {
        return this._dateTime.toEpochSecond(this._offset);
    }

    isSupported(fieldOrUnit) {
        if (fieldOrUnit instanceof ChronoField) {
            return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
        }
        if (fieldOrUnit instanceof ChronoUnit) {
            return fieldOrUnit.isDateBased() || fieldOrUnit.isTimeBased();
        }
        return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
    }

    range(field) {
        if (field instanceof ChronoField) {
            if (field === ChronoField.INSTANT_SECONDS || field === ChronoField.OFFSET_SECONDS) {
                return field.range();
            }
            return this._dateTime.range(field);
        }
        return field.rangeRefinedBy(this);
    }

    _withAdjuster(adjuster) {
        requireNonNull(adjuster);
        // optimizations
        if (adjuster instanceof LocalDate || adjuster instanceof LocalTime || adjuster instanceof LocalDateTime) {
            return this._withDateTimeOffset(this._dateTime.with(adjuster), this._offset);
        } else if (adjuster instanceof Instant) {
            return OffsetDateTime.ofInstant(adjuster, this._offset);
        } else if (adjuster instanceof ZoneOffset) {
            return this._withDateTimeOffset(this._dateTime, adjuster);
        } else if (adjuster instanceof OffsetDateTime) {
            return adjuster;
        }
        return adjuster.adjustInto(this);
    }

    _withField(field, newValue) {
        requireNonNull(field);
        if (field instanceof ChronoField) {
            const f = field;
            switch (f) {
                case ChronoField.INSTANT_SECONDS: return OffsetDateTime.ofInstant(Instant.ofEpochSecond(newValue, this.nano()), this._offset);
                case ChronoField.OFFSET_SECONDS: {
                    return this._withDateTimeOffset(this._dateTime, ZoneOffset.ofTotalSeconds(f.checkValidIntValue(newValue)));
                }
            }
            return this._withDateTimeOffset(this._dateTime.with(field, newValue), this._offset);
        }
        return field.adjustInto(this, newValue);
    }

    _withDateTimeOffset(dateTime, offset) {
        if (this._dateTime === dateTime && this._offset.equals(offset)) {
            return this;
        }
        return new OffsetDateTime(dateTime, offset);
    }

    /**
     * @param {int} year
     * @return {OffsetDateTime}
     */
    withYear(year) {
        return this._withDateTimeOffset(this._dateTime.withYear(year), this._offset);
    }

    /**
     * @param {int} month
     * @return {OffsetDateTime}
     */
    withMonth(month) {
        return this._withDateTimeOffset(this._dateTime.withMonth(month), this._offset);
    }

    /**
     * @param {int} dayOfMonth
     * @return {OffsetDateTime}
     */
    withDayOfMonth(dayOfMonth) {
        return this._withDateTimeOffset(this._dateTime.withDayOfMonth(dayOfMonth), this._offset);
    }

    /**
     * @param {int} dayOfYear
     * @return {OffsetDateTime}
     */
    withDayOfYear(dayOfYear) {
        return this._withDateTimeOffset(this._dateTime.withDayOfYear(dayOfYear), this._offset);
    }

    /**
     * @param {int} hour
     * @return {OffsetDateTime}
     */
    withHour(hour) {
        return this._withDateTimeOffset(this._dateTime.withHour(hour), this._offset);
    }

    /**
     * @param {int} minute
     * @return {OffsetDateTime}
     */
    withMinute(minute) {
        return this._withDateTimeOffset(this._dateTime.withMinute(minute), this._offset);
    }

    /**
     * @param {int} second
     * @return {OffsetDateTime}
     */
    withSecond(second) {
        return this._withDateTimeOffset(this._dateTime.withSecond(second), this._offset);
    }

    /**
     * @param {int} nanoOfSecond
     * @return {OffsetDateTime}
     */
    withNano(nanoOfSecond) {
        return this._withDateTimeOffset(this._dateTime.withNano(nanoOfSecond), this._offset);
    }

    /**
     * @param {ZoneOffset} offset
     * @return {OffsetDateTime}
     */
    withOffsetSameLocal(offset) {
        requireNonNull(offset, 'offset');
        return this._withDateTimeOffset(this._dateTime, offset);
    }

    /**
     * @param {ZoneOffset} offset
     * @return {OffsetDateTime}
     */
    withOffsetSameInstant(offset) {
        requireNonNull(offset, 'offset');
        if (offset.equals(this._offset)) {
            return this;
        }
        const difference = offset.totalSeconds() - this._offset.totalSeconds();
        const adjusted = this._dateTime.plusSeconds(difference);
        return new OffsetDateTime(adjusted, offset);
    }

    /**
     * @param {TemporalUnit} unit
     * @return {OffsetDateTime}
     */
    truncatedTo(unit) {
        return this._withDateTimeOffset(this._dateTime.truncatedTo(unit), this._offset);
    }

    _plusAmount(amount) {
        requireNonNull(amount, 'amount');
        return amount.addTo(this);
    }

    _plusUnit(amountToAdd, unit) {
        if (unit instanceof ChronoUnit) {
            return this._withDateTimeOffset(this._dateTime.plus(amountToAdd, unit), this._offset);
        }
        return unit.addTo(this, amountToAdd);
    }

    /**
     * @param {int} years
     * @return {OffsetTime}
     */
    plusYears(years) {
        return this._withDateTimeOffset(this._dateTime.plusYears(years), this._offset);
    }

    /**
     * @param {int} months
     * @return {OffsetTime}
     */
    plusMonths(months) {
        return this._withDateTimeOffset(this._dateTime.plusMonths(months), this._offset);
    }

    /**
     * @param {int} weeks
     * @return {OffsetTime}
     */
    plusWeeks(weeks) {
        return this._withDateTimeOffset(this._dateTime.plusWeeks(weeks), this._offset);
    }

    /**
     * @param {int} days
     * @return {OffsetTime}
     */
    plusDays(days) {
        return this._withDateTimeOffset(this._dateTime.plusDays(days), this._offset);
    }

    /**
     * @param {int} hours
     * @return {OffsetTime}
     */
    plusHours(hours) {
        return this._withDateTimeOffset(this._dateTime.plusHours(hours), this._offset);
    }

    /**
     * @param {int} minutes
     * @return {OffsetTime}
     */
    plusMinutes(minutes) {
        return this._withDateTimeOffset(this._dateTime.plusMinutes(minutes), this._offset);
    }

    /**
     * @param {int} seconds
     * @return {OffsetTime}
     */
    plusSeconds(seconds) {
        return this._withDateTimeOffset(this._dateTime.plusSeconds(seconds), this._offset);
    }

    /**
     * @param {int} nanos
     * @return {OffsetTime}
     */
    plusNanos(nanos) {
        return this._withDateTimeOffset(this._dateTime.plusNanos(nanos), this._offset);
    }

    _minusAmount(amount) {
        requireNonNull(amount);
        return amount.subtractFrom(this);
    }

    _minusUnit(amountToSubtract, unit) {
        return this.plus(-1 * amountToSubtract, unit);
    }

    /**
     * @param {int} years
     * @return {OffsetTime}
     */
    minusYears(years) {
        return this._withDateTimeOffset(this._dateTime.minusYears(years), this._offset);
    }

    /**
     * @param {int} months
     * @return {OffsetTime}
     */
    minusMonths(months) {
        return this._withDateTimeOffset(this._dateTime.minusMonths(months), this._offset);
    }

    /**
     * @param {int} weeks
     * @return {OffsetTime}
     */
    minusWeeks(weeks) {
        return this._withDateTimeOffset(this._dateTime.minusWeeks(weeks), this._offset);
    }

    /**
     * @param {int} days
     * @return {OffsetTime}
     */
    minusDays(days) {
        return this._withDateTimeOffset(this._dateTime.minusDays(days), this._offset);
    }

    /**
     * @param {int} hours
     * @return {OffsetTime}
     */
    minusHours(hours) {
        return this._withDateTimeOffset(this._dateTime.minusHours(hours), this._offset);
    }

    /**
     * @param {int} minutes
     * @return {OffsetTime}
     */
    minusMinutes(minutes) {
        return this._withDateTimeOffset(this._dateTime.minusMinutes(minutes), this._offset);
    }

    /**
     * @param {int} seconds
     * @return {OffsetTime}
     */
    minusSeconds(seconds) {
        return this._withDateTimeOffset(this._dateTime.minusSeconds(seconds), this._offset);
    }

    /**
     * @param {int} nanos
     * @return {OffsetTime}
     */
    minusNanos(nanos) {
        return this._withDateTimeOffset(this._dateTime.minusNanos(nanos), this._offset);
    }

    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, OffsetDateTime, 'other');
        if (this.offset().equals(other.offset())) {
            return this.toLocalDateTime().compareTo(other.toLocalDateTime());
        }
        let cmp = MathUtil.compareNumbers(this.toEpochSecond(), other.toEpochSecond());
        if (cmp === 0) {
            cmp = this.toLocalTime().nano() - other.toLocalTime().nano();
            if (cmp === 0) {
                cmp = this.toLocalDateTime().compareTo(other.toLocalDateTime());
            }
        }
        return cmp;
    }

    /**
     * @param {OffsetDateTime} other
     * @return {boolean}
     */
    isAfter(other) {
        requireNonNull(other, 'other');
        const thisEpochSec = this.toEpochSecond();
        const otherEpochSec = other.toEpochSecond();
        return thisEpochSec > otherEpochSec || (thisEpochSec === otherEpochSec && this.toLocalTime().nano() > other.toLocalTime().nano());
    }

    /**
     * @param {OffsetDateTime} other
     * @return {boolean}
     */
    isBefore(other) {
        requireNonNull(other, 'other');
        const thisEpochSec = this.toEpochSecond();
        const otherEpochSec = other.toEpochSecond();
        return thisEpochSec < otherEpochSec || (thisEpochSec === otherEpochSec && this.toLocalTime().nano() < other.toLocalTime().nano());
    }

    /**
     * @param {OffsetDateTime} other
     * @return {boolean}
     */
    isEqual(other) {
        requireNonNull(other, 'other');
        return this.toEpochSecond() === other.toEpochSecond() && this.toLocalTime().nano() === other.toLocalTime().nano();
    }

    //-----------------------------------------------------------------------
    /**
     * @param other
     * @return {boolean}
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof OffsetDateTime) {
            return this._dateTime.equals(other._dateTime) && this._offset.equals(other._offset);
        }
        return false;
    }

    /**
     * @return {number}
     */
    hashCode() {
        return this._dateTime.hashCode() ^ this._offset.hashCode();
    }

    toString() {
        return this._dateTime.toString() + this._offset.toString();
    }

    /**
     *
     * @return {string} same as {@link LocalDateTime.toString}
     */
    toJSON() {
        return this.toString();
    }

    /**
     * @param {DateTimeFormatter} formatter
     * @return {string}
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        return formatter.format(this);
    }
}


export function _init() {
    OffsetDateTime.MIN = LocalDateTime.MIN.atOffset(ZoneOffset.MAX);

    OffsetDateTime.MAX = LocalDateTime.MAX.atOffset(ZoneOffset.MIN);

    OffsetDateTime.FROM = createTemporalQuery('OffsetDateTime.FROM', (temporal) => {
        return OffsetDateTime.from(temporal);
    });
}
