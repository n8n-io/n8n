/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from '../assert';
import { Instant } from '../Instant';
import { LocalDate } from '../LocalDate';
import { MathUtil } from '../MathUtil';

import { ChronoUnit } from '../temporal/ChronoUnit';
import { Temporal } from '../temporal/Temporal';
import { TemporalQueries } from '../temporal/TemporalQueries';

export class ChronoZonedDateTime extends Temporal {
    query(query) {
        if (query === TemporalQueries.zoneId() || query === TemporalQueries.zone()) {
            return this.zone();
        } else if (query === TemporalQueries.chronology()) {
            return this.toLocalDate().chronology();
        } else if (query === TemporalQueries.precision()) {
            return ChronoUnit.NANOS;
        } else if (query === TemporalQueries.offset()) {
            return this.offset();
        } else if (query === TemporalQueries.localDate()) {
            return LocalDate.ofEpochDay(this.toLocalDate().toEpochDay());
        } else if (query === TemporalQueries.localTime()) {
            return this.toLocalTime();
        }
        return super.query(query);
    }

    /**
     * Outputs this date-time as a string using the formatter.
     *
     * @param {DateTimeFormatter} formatter - the formatter to use, not null
     * @return {string} the formatted date-time string, not null
     * @throws DateTimeException if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        return formatter.format(this);
    }

    /**
     * Converts this date-time to an {@link Instant}.
     *
     * This returns an {@link Instant} representing the same point on the
     * time-line as this date-time. The calculation combines the
     * local date-time (see {@link toLocalDateTime}) and
     * offset (see {@link getOffset}).
     *
     * @return {Instant} an {@link Instant} representing the same instant, not null
     */
    toInstant() {
        return Instant.ofEpochSecond(this.toEpochSecond(), this.toLocalTime().nano());
    }

    /**
     * Converts this date-time to the number of seconds from the epoch
     * of 1970-01-01T00:00:00Z.
     *
     * This uses the local date-time (see {@link toLocalDateTime}) and
     * offset (see {@link getOffset}) to calculate the epoch-second value,
     * which is the number of elapsed seconds from 1970-01-01T00:00:00Z.
     * Instants on the time-line after the epoch are positive, earlier are negative.
     *
     * @return {number} the number of seconds from the epoch of 1970-01-01T00:00:00Z
     */
    toEpochSecond() {
        const epochDay = this.toLocalDate().toEpochDay();
        let secs = epochDay * 86400 + this.toLocalTime().toSecondOfDay();
        secs -= this.offset().totalSeconds();
        return secs;
    }

    /**
      * Compares this date-time to another date-time, including the chronology.
      *
      * The comparison is based first on the instant, then on the local date-time,
      * then on the zone ID, then on the chronology.
      * It is "consistent with equals", as defined by {@link Comparable}.
      *
      * If all the date-time objects being compared are in the same chronology, then the
      * additional chronology stage is not required.
      *
      * @param {ChronoZonedDateTime} other - the other date-time to compare to, not null
      * @return {number} the comparator value, negative if less, positive if greater
      */
    compareTo(other) {
        requireNonNull(other, 'other');
        let cmp = MathUtil.compareNumbers(this.toEpochSecond(), other.toEpochSecond());
        if (cmp === 0) {
            cmp = this.toLocalTime().nano() - other.toLocalTime().nano();
            if (cmp === 0) {
                cmp = this.toLocalDateTime().compareTo(other.toLocalDateTime());
                if (cmp === 0) {
                    cmp = strcmp(this.zone().id(), other.zone().id());
                    // we only support iso for now
                    //if (cmp === 0) {
                    //    cmp = toLocalDate().getChronology().compareTo(other.toLocalDate().getChronology());
                    //}
                }
            }
        }
        return cmp;
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if the instant of this date-time is after that of the specified date-time.
     *
     * This method differs from the comparison in {@link compareTo} in that it
     * only compares the instant of the date-time. This is equivalent to using
     * `dateTime1.toInstant().isAfter(dateTime2.toInstant())`.
     *
     * @param {!ChronoZonedDateTime} other - the other date-time to compare to, not null
     * @return {boolean} true if this is after the specified date-time
     */
    isAfter(other) {
        requireNonNull(other, 'other');
        const thisEpochSec = this.toEpochSecond();
        const otherEpochSec = other.toEpochSecond();
        return thisEpochSec > otherEpochSec ||
            (thisEpochSec === otherEpochSec && this.toLocalTime().nano() > other.toLocalTime().nano());
    }

    /**
     * Checks if the instant of this date-time is before that of the specified date-time.
     *
     * This method differs from the comparison in {@link compareTo} in that it
     * only compares the instant of the date-time. This is equivalent to using
     * `dateTime1.toInstant().isBefore(dateTime2.toInstant())`.
     *
     * @param {!ChronoZonedDateTime} other - the other date-time to compare to, not null
     * @return {boolean} true if this point is before the specified date-time
     */
    isBefore(other) {
        requireNonNull(other, 'other');
        const thisEpochSec = this.toEpochSecond();
        const otherEpochSec = other.toEpochSecond();
        return thisEpochSec < otherEpochSec ||
            (thisEpochSec === otherEpochSec && this.toLocalTime().nano() < other.toLocalTime().nano());
    }

    /**
     * Checks if the instant of this date-time is equal to that of the specified date-time.
     *
     * This method differs from the comparison in {@link compareTo} and {@link equals}
     * in that it only compares the instant of the date-time. This is equivalent to using
     * `dateTime1.toInstant().equals(dateTime2.toInstant())`.
     *
     * @param {!ChronoZonedDateTime} other - the other date-time to compare to, not null
     * @return {boolean} true if the instant equals the instant of the specified date-time
     */
    isEqual(other) {
        requireNonNull(other, 'other');
        return this.toEpochSecond() === other.toEpochSecond() &&
                this.toLocalTime().nano() === other.toLocalTime().nano();
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if this date-time is equal to another date-time.
     *
     * The comparison is based on the offset date-time and the zone.
     * To compare for the same instant on the time-line, use {@link compareTo}.
     * Only objects of type {@link ChronoZoneDateTime} are compared, other types return false.
     *
     * @param {*} other  the object to check, null returns false
     * @return {boolean} true if this is equal to the other date-time
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof ChronoZonedDateTime) {
            return this.compareTo(other) === 0;
        }
        return false;
    }

}

function strcmp(a, b){
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}
