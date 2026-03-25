/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull, requireInstance } from './assert';
import { DateTimeException, UnsupportedTemporalTypeException } from './errors';

import { Clock } from './Clock';
import { LocalTime } from './LocalTime';
import { ZonedDateTime } from './ZonedDateTime';
import { MathUtil } from './MathUtil';
import { OffsetDateTime } from './OffsetDateTime';

import { Temporal } from './temporal/Temporal';
import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { TemporalQueries } from './temporal/TemporalQueries';
import { TemporalUnit } from './temporal/TemporalUnit';
import { createTemporalQuery } from './temporal/TemporalQuery';
import { DateTimeFormatter } from './format/DateTimeFormatter';

const NANOS_PER_MILLI = 1000000;

/**
 * An instantaneous point on the time-line.
 *
 * This class models a single instantaneous point on the time-line.
 * This might be used to record event time-stamps in the application.
 *
 * Time-scale
 *
 * The length of the solar day is the standard way that humans measure time.
 * This has traditionally been subdivided into 24 hours of 60 minutes of 60 seconds,
 * forming a 86400 second day.
 *
 * Modern timekeeping is based on atomic clocks which precisely define an SI second
 * relative to the transitions of a Caesium atom. The length of an SI second was defined
 * to be very close to the 86400th fraction of a day.
 *
 * Unfortunately, as the Earth rotates the length of the day varies.
 * In addition, over time the average length of the day is getting longer as the Earth slows.
 * As a result, the length of a solar day in 2012 is slightly longer than 86400 SI seconds.
 * The actual length of any given day and the amount by which the Earth is slowing
 * are not predictable and can only be determined by measurement.
 * The UT1 time-scale captures the accurate length of day, but is only available some
 * time after the day has completed.
 *
 * The UTC time-scale is a standard approach to bundle up all the additional fractions
 * of a second from UT1 into whole seconds, known as *leap-seconds*.
 * A leap-second may be added or removed depending on the Earth's rotational changes.
 * As such, UTC permits a day to have 86399 SI seconds or 86401 SI seconds where
 * necessary in order to keep the day aligned with the Sun.
 *
 * The modern UTC time-scale was introduced in 1972, introducing the concept of whole leap-seconds.
 * Between 1958 and 1972, the definition of UTC was complex, with minor sub-second leaps and
 * alterations to the length of the notional second. As of 2012, discussions are underway
 * to change the definition of UTC again, with the potential to remove leap seconds or
 * introduce other changes.
 *
 * Given the complexity of accurate timekeeping described above, this Java API defines
 * its own time-scale, the *Java Time-Scale*.
 *
 * The Java Time-Scale divides each calendar day into exactly 86400
 * subdivisions, known as seconds.  These seconds may differ from the
 * SI second.  It closely matches the de facto international civil time
 * scale, the definition of which changes from time to time.
 *
 * The Java Time-Scale has slightly different definitions for different
 * segments of the time-line, each based on the consensus international
 * time scale that is used as the basis for civil time. Whenever the
 * internationally-agreed time scale is modified or replaced, a new
 * segment of the Java Time-Scale must be defined for it.  Each segment
 * must meet these requirements:
 *
 * * the Java Time-Scale shall closely match the underlying international
 *   civil time scale;
 * * the Java Time-Scale shall exactly match the international civil
 *   time scale at noon each day;
 * * the Java Time-Scale shall have a precisely-defined relationship to
 *   the international civil time scale.
 *
 * There are currently, as of 2013, two segments in the Java time-scale.
 *
 * For the segment from 1972-11-03 (exact boundary discussed below) until
 * further notice, the consensus international time scale is UTC (with
 * leap seconds).  In this segment, the Java Time-Scale is identical to
 * [UTC-SLS](http://www.cl.cam.ac.uk/~mgk25/time/utc-sls/).
 * This is identical to UTC on days that do not have a leap second.
 * On days that do have a leap second, the leap second is spread equally
 * over the last 1000 seconds of the day, maintaining the appearance of
 * exactly 86400 seconds per day.
 *
 * For the segment prior to 1972-11-03, extending back arbitrarily far,
 * the consensus international time scale is defined to be UT1, applied
 * proleptically, which is equivalent to the (mean) solar time on the
 * prime meridian (Greenwich). In this segment, the Java Time-Scale is
 * identical to the consensus international time scale. The exact
 * boundary between the two segments is the instant where UT1 = UTC
 * between 1972-11-03T00:00 and 1972-11-04T12:00.
 *
 * Implementations of the Java time-scale using the JSR-310 API are not
 * required to provide any clock that is sub-second accurate, or that
 * progresses monotonically or smoothly. Implementations are therefore
 * not required to actually perform the UTC-SLS slew or to otherwise be
 * aware of leap seconds. JSR-310 does, however, require that
 * implementations must document the approach they use when defining a
 * clock representing the current instant.
 * See {@link Clock} for details on the available clocks.
 *
 * The Java time-scale is used for all date-time classes.
 * This includes {@link Instant}, {@link LocalDate}, {@link LocalTime}, {@link OffsetDateTime},
 * {@link ZonedDateTime} and {@link Duration}.
 *
 * ### Static properties of Class {@link Instant}
 *
 * Instant.EPOCH
 *
 * Instant.MIN
 *
 * Instant.MAX
 *
 * Instant.MIN_SECONDS
 *
 * Instant.MAX_SECONDS
 *
 */
export class Instant extends Temporal {

    /**
     * Obtains the current instant from the system clock, or if specified
     * the current instant from the specified clock.
     *
     * This will query the specified clock to obtain the current time.
     *
     * @param {Clock} [clock=Clock.systemUTC()] - the clock to use, defaults to the system clock
     * @return {Instant} the current instant, not null
     */
    static now(clock = Clock.systemUTC()){
        return clock.instant();
    }

    /**
     * Obtains an instance of {@link Instant} using seconds from the
     * epoch of 1970-01-01T00:00:00Z.
     *
     * @param {number} epochSecond - the number of seconds from 1970-01-01T00:00:00Z
     * @param {number} nanoAdjustment nanoseconds start from the start of epochSecond, if null the nanosecond field is set to zero.
     * @return {Instant} an instant, not null
     * @throws DateTimeException if the instant exceeds the maximum or minimum instant
     */
    static ofEpochSecond(epochSecond, nanoAdjustment=0){
        const secs = epochSecond + MathUtil.floorDiv(nanoAdjustment, LocalTime.NANOS_PER_SECOND);
        const nos = MathUtil.floorMod(nanoAdjustment, LocalTime.NANOS_PER_SECOND);
        return Instant._create(secs, nos);
    }

    /**
     * Obtains an instance of {@link Instant} using milliseconds from the
     * epoch of 1970-01-01T00:00:00Z.
     *
     * The seconds and nanoseconds are extracted from the specified milliseconds.
     *
     * @param {number} epochMilli - the number of milliseconds from 1970-01-01T00:00:00Z
     * @return {Instant} an instant, not null
     * @throws DateTimeException if the instant exceeds the maximum or minimum instant
     */
    static ofEpochMilli(epochMilli) {
        const secs = MathUtil.floorDiv(epochMilli, 1000);
        const mos = MathUtil.floorMod(epochMilli, 1000);
        return Instant._create(secs, mos * 1000000);
    }

    /**
     * Obtains an instance of {@link Instant} using microseconds from the
     * epoch of 1970-01-01T00:00:00Z.
     *
     * @param {number} epochMicro - the number of microseconds from 1970-01-01T00:00:00Z
     * @return {Instant} an instant, not null
     * @throws DateTimeException if the instant exceeds the maximum or minimum instant
     */
    static ofEpochMicro(epochMicro) {
        const secs = MathUtil.floorDiv(epochMicro, 1000000);
        const mos = MathUtil.floorMod(epochMicro, 1000000);
        return Instant._create(secs, mos * 1000);
    }

    /**
     * Obtains an instance of {@link Instant} from a temporal object.
     *
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link Instant}.
     *
     * The conversion extracts the {@link ChronoField#INSTANT_SECONDS}
     * and {@link ChronoField#NANO_OF_SECOND} fields.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used as a query via method reference, {@link Instant::from}.
     *
     * @param {TemporalAccessor} temporal - the temporal object to convert, not null
     * @return {Instant} the instant, not null
     * @throws DateTimeException if unable to convert to an {@link Instant}
     */
    static from(temporal) {
        try {
            const instantSecs = temporal.getLong(ChronoField.INSTANT_SECONDS);
            const nanoOfSecond = temporal.get(ChronoField.NANO_OF_SECOND);
            return Instant.ofEpochSecond(instantSecs, nanoOfSecond);
        } catch (ex) {
            throw new DateTimeException(`Unable to obtain Instant from TemporalAccessor: ${ 
                temporal}, type ${typeof temporal}`, ex);
        }
    }

    /**
     * Obtains an instance of {@link Instant} from a text string such as
     * `2007-12-03T10:15:30.000Z`.
     *
     * The string must represent a valid instant in UTC and is parsed using
     * {@link DateTimeFormatter#ISO_INSTANT}.
     *
     * @param {string} text - the text to parse, not null
     * @return {Instant} the parsed instant, not null
     * @throws DateTimeParseException if the text cannot be parsed
     */
    static parse(text) {
        return DateTimeFormatter.ISO_INSTANT.parse(text, Instant.FROM);
    }

    /**
     *
     * @param {number} seconds
     * @param {number} nanoOfSecond
     * @returns {Instant}
     * @private
     */
    static _create(seconds, nanoOfSecond){
        if(seconds === 0 && nanoOfSecond === 0){
            return Instant.EPOCH;
        }
        return new Instant(seconds, nanoOfSecond);
    }

    /**
     *
     * @param {number} seconds
     * @param {number} nanoOfSecond
     * @private
     */
    static _validate(seconds, nanoOfSecond){
        if (seconds < Instant.MIN_SECONDS || seconds > Instant.MAX_SECONDS) {
            throw new DateTimeException('Instant exceeds minimum or maximum instant');
        }
        if (nanoOfSecond < 0 || nanoOfSecond > LocalTime.NANOS_PER_SECOND) {
            throw new DateTimeException('Instant exceeds minimum or maximum instant');
        }
    }

    /**
     *
     * @param {number} seconds
     * @param {number} nanoOfSecond
     * @private
     */
    constructor(seconds, nanoOfSecond){
        super();
        Instant._validate(seconds, nanoOfSecond);
        this._seconds = MathUtil.safeToInt(seconds);
        this._nanos = MathUtil.safeToInt(nanoOfSecond);
    }

    /**
     * Checks if the specified field is supported.
     *
     * This checks if this instant can be queried for the specified field.
     * If false, then calling {@link range} and {@link get} will throw an exception.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields are:
     *
     * * {@link NANO_OF_SECOND}
     * * {@link MICRO_OF_SECOND}
     * * {@link MILLI_OF_SECOND}
     * * {@link INSTANT_SECONDS}
     *
     * All other {@link ChronoField} instances will return false.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.isSupportedBy}
     * passing `this` as the argument.
     * Whether the field is supported is determined by the field.
     *
     * @param {TemporalField|TemporalUnit} fieldOrUnit - the field to check, null returns false
     * @return {boolean} true if the field is supported on this instant, false if not
     */
    isSupported(fieldOrUnit) {
        if (fieldOrUnit instanceof ChronoField) {
            return fieldOrUnit === ChronoField.INSTANT_SECONDS || fieldOrUnit === ChronoField.NANO_OF_SECOND || fieldOrUnit === ChronoField.MICRO_OF_SECOND || fieldOrUnit === ChronoField.MILLI_OF_SECOND;
        }
        if (fieldOrUnit instanceof ChronoUnit) {
            return fieldOrUnit.isTimeBased() || fieldOrUnit === ChronoUnit.DAYS;
        }
        return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
    }

    /**
     * Gets the range of valid values for the specified field.
     *
     * The range object expresses the minimum and maximum valid values for a field.
     * This instant is used to enhance the accuracy of the returned range.
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
     * @param {TemporalField} field - the field to query the range for, not null
     * @return {ValueRange} the range of valid values for the field, not null
     * @throws DateTimeException if the range for the field cannot be obtained
     */
    range(field) {
        return super.range(field);
    }

    /**
     * Gets the value of the specified field from this instant as an `int`.
     *
     * This queries this instant for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this date-time, except {@link INSTANT_SECONDS} which is too
     * large to fit in an `int` and throws a {@link DateTimeException}.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {TemporalField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws DateTimeException if a value for the field cannot be obtained
     * @throws ArithmeticException if numeric overflow occurs
     */
    get(field) {
        return this.getLong(field);
    }

    /**
     * Gets the value of the specified field from this instant as a `long`.
     *
     * This queries this instant for the value for the specified field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields (see {@link isSupported}) will return valid
     * values based on this date-time.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {TemporalField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws DateTimeException if a value for the field cannot be obtained
     * @throws ArithmeticException if numeric overflow occurs
     */
    getLong(field) {
        if (field instanceof ChronoField) {
            switch (field) {
                case ChronoField.NANO_OF_SECOND: return this._nanos;
                case ChronoField.MICRO_OF_SECOND: return MathUtil.intDiv(this._nanos, 1000);
                case ChronoField.MILLI_OF_SECOND: return MathUtil.intDiv(this._nanos, NANOS_PER_MILLI);
                case ChronoField.INSTANT_SECONDS: return this._seconds;
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.getFrom(this);
    }

    /**
     * Gets the number of seconds from the Java epoch of 1970-01-01T00:00:00Z.
     *
     * The epoch second count is a simple incrementing count of seconds where
     * second 0 is 1970-01-01T00:00:00Z.
     * The nanosecond part of the day is returned by {@link getNanosOfSecond}.
     *
     * @return {number} the seconds from the epoch of 1970-01-01T00:00:00Z
     */
    epochSecond(){
        return this._seconds;
    }

    /**
     * Gets the number of nanoseconds, later along the time-line, from the start
     * of the second.
     *
     * The nanosecond-of-second value measures the total number of nanoseconds from
     * the second returned by {@link getEpochSecond}.
     *
     * @return {number} the nanoseconds within the second, always positive, never exceeds 999,999,999
     */
    nano(){
        return this._nanos;
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this instant with the specified field set to a new value.
     *
     * This returns a new {@link Instant}, based on this one, with the value
     * for the specified field changed.
     * If it is not possible to set the value, because the field is not supported or for
     * some other reason, an exception is thrown.
     *
     * If the field is a {@link ChronoField} then the adjustment is implemented here.
     * The supported fields behave as follows:
     *
     * * {@link NANO_OF_SECOND} -
     *  Returns an {@link Instant} with the specified nano-of-second.
     *  The epoch-second will be unchanged.
     * * {@link MICRO_OF_SECOND} -
     *  Returns an {@link Instant} with the nano-of-second replaced by the specified
     *  micro-of-second multiplied by 1,000. The epoch-second will be unchanged.
     * * {@link MILLI_OF_SECOND} -
     *  Returns an {@link Instant} with the nano-of-second replaced by the specified
     *  milli-of-second multiplied by 1,000,000. The epoch-second will be unchanged.
     * * {@link INSTANT_SECONDS} -
     *  Returns an {@link Instant} with the specified epoch-second.
     *  The nano-of-second will be unchanged.
     *
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
     * @param {TemporalField} field - the field to set in the result, not null
     * @param {number} newValue - the new value of the field in the result
     * @return {Instant} an {@link Instant} based on `this` with the specified field set, not null
     * @throws DateTimeException if the field cannot be set
     * @throws ArithmeticException if numeric overflow occurs
     */
    _withField(field, newValue) {
        requireNonNull(field, 'field');
        if (field instanceof ChronoField) {
            field.checkValidValue(newValue);
            switch (field) {
                case ChronoField.MILLI_OF_SECOND: {
                    const nval = newValue * NANOS_PER_MILLI;
                    return (nval !== this._nanos? Instant._create(this._seconds, nval) : this);
                }
                case ChronoField.MICRO_OF_SECOND: {
                    const nval = newValue * 1000;
                    return (nval !== this._nanos? Instant._create(this._seconds, nval) : this);
                }
                case ChronoField.NANO_OF_SECOND: return (newValue !== this._nanos? Instant._create(this._seconds, newValue) : this);
                case ChronoField.INSTANT_SECONDS: return (newValue !== this._seconds ? Instant._create(newValue, this._nanos) : this);
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.adjustInto(this, newValue);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link Instant} truncated to the specified unit.
     *
     * Truncating the instant returns a copy of the original with fields
     * smaller than the specified unit set to zero.
     * The fields are calculated on the basis of using a UTC offset as seen
     * in {@link toString}.
     * For example, truncating with {@link ChronoUnit#MINUTES} will
     * round down to the nearest minute, setting the seconds and nanoseconds to zero.
     *
     * The unit must have a duration (see {@link TemporalUnit#getDuration})
     * that divides into the length of a standard day without remainder.
     * This includes all supplied time units on {@link ChronoUnit} and
     * {@link ChronoUnit#DAYS}. Other units throw an exception.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {!TemporalUnit} unit - the unit to truncate to, not null
     * @return {Instant} an {@link Instant} based on this instant with the time truncated, not null
     * @throws DateTimeException if the unit is invalid for truncation
     */
    truncatedTo(unit) {
        requireNonNull(unit, 'unit');
        if (unit === ChronoUnit.NANOS) {
            return this;
        }
        const unitDur = unit.duration();
        if (unitDur.seconds() > LocalTime.SECONDS_PER_DAY) {
            throw new DateTimeException('Unit is too large to be used for truncation');
        }
        const dur = unitDur.toNanos();
        if (MathUtil.intMod(LocalTime.NANOS_PER_DAY, dur) !== 0) {
            throw new DateTimeException('Unit must divide into a standard day without remainder');
        }
        const nod = MathUtil.intMod(this._seconds, LocalTime.SECONDS_PER_DAY) * LocalTime.NANOS_PER_SECOND + this._nanos;
        const result = MathUtil.intDiv(nod, dur) * dur;
        return this.plusNanos(result - nod);
    }

    //-----------------------------------------------------------------------
    /**
     * @param {!number} amountToAdd
     * @param {!TemporalUnit} unit
     * @return {Instant}
     * @throws DateTimeException
     * @throws ArithmeticException
     */
    _plusUnit(amountToAdd, unit) {
        requireNonNull(amountToAdd, 'amountToAdd');
        requireNonNull(unit, 'unit');
        requireInstance(unit, TemporalUnit);
        if (unit instanceof ChronoUnit) {
            switch (unit) {
                case ChronoUnit.NANOS: return this.plusNanos(amountToAdd);
                case ChronoUnit.MICROS: return this.plusMicros(amountToAdd);
                case ChronoUnit.MILLIS: return this.plusMillis(amountToAdd);
                case ChronoUnit.SECONDS: return this.plusSeconds(amountToAdd);
                case ChronoUnit.MINUTES: return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_MINUTE));
                case ChronoUnit.HOURS: return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_HOUR));
                case ChronoUnit.HALF_DAYS: return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_DAY / 2));
                case ChronoUnit.DAYS: return this.plusSeconds(MathUtil.safeMultiply(amountToAdd, LocalTime.SECONDS_PER_DAY));
            }
            throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
        }
        return unit.addTo(this, amountToAdd);
    }

    /**
     * Returns a copy of this instant with the specified duration in seconds added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} secondsToAdd  the seconds to add, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified seconds added, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     */
    plusSeconds(secondsToAdd) {
        return this._plus(secondsToAdd, 0);
    }

    /**
     * Returns a copy of this instant with the specified duration in milliseconds added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} millisToAdd - the milliseconds to add, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified milliseconds added, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     * @throws ArithmeticException if numeric overflow occurs
     */
    plusMillis(millisToAdd) {
        return this._plus(MathUtil.intDiv(millisToAdd, 1000), MathUtil.intMod(millisToAdd, 1000) * NANOS_PER_MILLI);
    }

    /**
     * Returns a copy of this instant with the specified duration in nanoseconds added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} nanosToAdd - the nanoseconds to add, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified nanoseconds added, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     */
    plusNanos(nanosToAdd) {
        return this._plus(0, nanosToAdd);
    }

    /**
     * Returns a copy of this instant with the specified duration in microseconds added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} microsToAdd - the microseconds to add, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified microseconds added, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     */
    plusMicros(microsToAdd) {
        return this._plus(MathUtil.intDiv(microsToAdd, 1000000), MathUtil.intMod(microsToAdd, 1000000) * 1000);
    }

    /**
     * Returns a copy of this instant with the specified duration added.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} secondsToAdd - the seconds to add, positive or negative
     * @param {number} nanosToAdd - the nanos to add, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified seconds added, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     */
    _plus(secondsToAdd, nanosToAdd) {
        if (secondsToAdd === 0 && nanosToAdd === 0) {
            return this;
        }
        let epochSec = this._seconds + secondsToAdd;
        epochSec = epochSec + MathUtil.intDiv(nanosToAdd, LocalTime.NANOS_PER_SECOND);
        const nanoAdjustment = this._nanos + nanosToAdd % LocalTime.NANOS_PER_SECOND;
        return Instant.ofEpochSecond(epochSec, nanoAdjustment);
    }

    //-----------------------------------------------------------------------

    /**
     * @param {!number} amountToSubtract
     * @param {!TemporalUnit} unit
     * @return {Instant}
     * @throws DateTimeException
     * @throws ArithmeticException
     */
    _minusUnit(amountToSubtract, unit) {
        return this._plusUnit(-1 * amountToSubtract, unit);
    }

    /**
     * Returns a copy of this instant with the specified duration in seconds subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} secondsToSubtract - the seconds to subtract, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified seconds subtracted, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     */
    minusSeconds(secondsToSubtract) {
        return this.plusSeconds(secondsToSubtract * -1);
    }

    /**
     * Returns a copy of this instant with the specified duration in milliseconds subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} millisToSubtract - the milliseconds to subtract, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified milliseconds subtracted, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     * @throws ArithmeticException if numeric overflow occurs
     */
    minusMillis(millisToSubtract) {
        return this.plusMillis(-1 * millisToSubtract);
    }

    /**
     * Returns a copy of this instant with the specified duration in nanoseconds subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} nanosToSubtract  the nanoseconds to subtract, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified nanoseconds subtracted, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     * @throws ArithmeticException if numeric overflow occurs
     */
    minusNanos(nanosToSubtract) {
        return this.plusNanos(-1 * nanosToSubtract);
    }

    /**
     * Returns a copy of this instant with the specified duration in microseconds subtracted.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} microsToSubtract  the microseconds to subtract, positive or negative
     * @return {Instant} an {@link Instant} based on this instant with the specified microseconds subtracted, not null
     * @throws DateTimeException if the result exceeds the maximum or minimum instant
     * @throws ArithmeticException if numeric overflow occurs
     */
    minusMicros(microsToSubtract) {
        return this.plusMicros(-1 * microsToSubtract);
    }

    //-------------------------------------------------------------------------
    /**
     * Queries this instant using the specified query.
     *
     * This queries this instant using the specified query strategy object.
     * The {@link TemporalQuery} object defines the logic to be used to
     * obtain the result. Read the documentation of the query to understand
     * what the result of this method will be.
     *
     * The result of this method is obtained by invoking the
     * {@link TemporalQuery#queryFrom} method on the
     * specified query passing `this` as the argument.
     *
     * @param {!TemporalQuery} query - the query to invoke, not null
     * @return {*} the query result, null may be returned (defined by the query)
     * @throws DateTimeException if unable to query (defined by the query)
     * @throws ArithmeticException if numeric overflow occurs (defined by the query)
     */
    query(query) {
        requireNonNull(query, 'query');
        if (query === TemporalQueries.precision()) {
            return ChronoUnit.NANOS;
        }
        // inline TemporalAccessor.super.query(query) as an optimization
        if (query === TemporalQueries.localDate() || query === TemporalQueries.localTime() ||
                query === TemporalQueries.chronology() || query === TemporalQueries.zoneId() ||
                query === TemporalQueries.zone() || query === TemporalQueries.offset()) {
            return null;
        }
        return query.queryFrom(this);
    }

    /**
     * Adjusts the specified temporal object to have this instant.
     *
     * This returns a temporal object of the same observable type as the input
     * with the instant changed to be the same as this.
     *
     * The adjustment is equivalent to using {@link Temporal#with}
     * twice, passing {@link ChronoField#INSTANT_SECONDS} and
     * {@link ChronoField#NANO_OF_SECOND} as the fields.
     *
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisInstant.adjustInto(temporal);
     *   temporal = temporal.with(thisInstant);
     * </pre>
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {!Temporal} temporal - the target object to be adjusted, not null
     * @return {Temporal} the adjusted object, not null
     * @throws DateTimeException if unable to make the adjustment
     * @throws ArithmeticException if numeric overflow occurs
     */
    adjustInto(temporal) {
        requireNonNull(temporal, 'temporal');
        return temporal.with(ChronoField.INSTANT_SECONDS, this._seconds).with(ChronoField.NANO_OF_SECOND, this._nanos);
    }

    /**
     * Calculates the period between this instant and another instant in
     * terms of the specified unit.
     *
     * This calculates the period between two instants in terms of a single unit.
     * The start and end points are `this` and the specified instant.
     * The result will be negative if the end is before the start.
     * The calculation returns a whole number, representing the number of
     * complete units between the two instants.
     * The {@link Temporal} passed to this method is converted to a
     * {@link Instant} using {@link from}.
     * For example, the period in days between two dates can be calculated
     * using `startInstant.until(endInstant, SECONDS)`.
     *
     * This method operates in association with {@link TemporalUnit#between}.
     * The result of this method is a `long` representing the amount of
     * the specified unit. By contrast, the result of {@link between} is an
     * object that can be used directly in addition/subtraction:
     * <pre>
     *   long period = start.until(end, SECONDS);   // this method
     *   dateTime.plus(SECONDS.between(start, end));      // use in plus/minus
     * </pre>
     *
     * The calculation is implemented in this method for {@link ChronoUnit}.
     * The units {@link NANOS}, {@link MICROS}, {@link MILLIS}, {@link SECONDS},
     * {@link MINUTES}, {@link HOURS}, {@link HALF_DAYS} and {@link DAYS}
     * are supported. Other {@link ChronoUnit} values will throw an exception.
     *
     * If the unit is not a {@link ChronoUnit}, then the result of this method
     * is obtained by invoking {@link TemporalUnit.between}
     * passing `this` as the first argument and the input temporal as
     * the second argument.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param {Temporal} endExclusive - the end date, which is converted to an {@link Instant}, not null
     * @param {TemporalUnit} unit - the unit to measure the period in, not null
     * @return {number} the amount of the period between this date and the end date
     * @throws DateTimeException if the period cannot be calculated
     * @throws ArithmeticException if numeric overflow occurs
     */
    until(endExclusive, unit) {
        requireNonNull(endExclusive, 'endExclusive');
        requireNonNull(unit, 'unit');
        const end = Instant.from(endExclusive);
        if (unit instanceof ChronoUnit) {
            switch (unit) {
                case ChronoUnit.NANOS: return this._nanosUntil(end);
                case ChronoUnit.MICROS: return this._microsUntil(end);
                case ChronoUnit.MILLIS: return MathUtil.safeSubtract(end.toEpochMilli(), this.toEpochMilli());
                case ChronoUnit.SECONDS: return this._secondsUntil(end);
                case ChronoUnit.MINUTES: return MathUtil.intDiv(this._secondsUntil(end), LocalTime.SECONDS_PER_MINUTE);
                case ChronoUnit.HOURS: return MathUtil.intDiv(this._secondsUntil(end), LocalTime.SECONDS_PER_HOUR);
                case ChronoUnit.HALF_DAYS: return MathUtil.intDiv(this._secondsUntil(end), (12 * LocalTime.SECONDS_PER_HOUR));
                case ChronoUnit.DAYS: return MathUtil.intDiv(this._secondsUntil(end), LocalTime.SECONDS_PER_DAY);
            }
            throw new UnsupportedTemporalTypeException(`Unsupported unit: ${unit}`);
        }
        return unit.between(this, end);
    }

    /**
     *
     * @param {Temporal} end
     * @returns {number}
     * @private
     */
    _microsUntil(end) {
        const secsDiff = MathUtil.safeSubtract(end.epochSecond(), this.epochSecond());
        const totalMicros = MathUtil.safeMultiply(secsDiff, 1000000);
        return MathUtil.safeAdd(totalMicros, MathUtil.intDiv(end.nano() - this.nano(), 1000));
    }

    /**
     *
     * @param {Temporal} end
     * @returns {number}
     * @private
     */
    _nanosUntil(end) {
        const secsDiff = MathUtil.safeSubtract(end.epochSecond(), this.epochSecond());
        const totalNanos = MathUtil.safeMultiply(secsDiff, LocalTime.NANOS_PER_SECOND);
        return MathUtil.safeAdd(totalNanos, end.nano() - this.nano());
    }

    /**
     *
     * @param {Temporal} end
     * @returns {number}
     * @private
     */
    _secondsUntil(end) {
        let secsDiff = MathUtil.safeSubtract(end.epochSecond(), this.epochSecond());
        const nanosDiff = end.nano() - this.nano();
        if (secsDiff > 0 && nanosDiff < 0) {
            secsDiff--;
        } else if (secsDiff < 0 && nanosDiff > 0) {
            secsDiff++;
        }
        return secsDiff;
    }

    //-----------------------------------------------------------------------
    /**
     * Combines this instant with an offset to create an {@link OffsetDateTime}.
     *
     * This returns an {@link OffsetDateTime} formed from this instant at the
     * specified offset from UTC/Greenwich. An exception will be thrown if the
     * instant is too large to fit into an offset date-time.
     *
     * This method is equivalent to {@link OffsetDateTime#ofInstant}.
     *
     * @param {ZoneOffset} offset - the offset to combine with, not null
     * @return {OffsetDateTime} the offset date-time formed from this instant and the specified offset, not null
     * @throws DateTimeException if the result exceeds the supported range
     */
    atOffset(offset) {
        return OffsetDateTime.ofInstant(this, offset);
    }

    /**
     * Combines this instant with a time-zone to create a {@link ZonedDateTime}.
     *
     * This returns an {@link ZonedDateTime} formed from this instant at the
     * specified time-zone. An exception will be thrown if the instant is too
     * large to fit into a zoned date-time.
     *
     * This method is equivalent to {@link ZonedDateTime#ofInstant}.
     *
     * @param {ZoneId} zone - the zone to combine with, not null
     * @return {ZonedDateTime} the zoned date-time formed from this instant and the specified zone, not null
     * @throws DateTimeException if the result exceeds the supported range
     */
    atZone(zone) {
        return ZonedDateTime.ofInstant(this, zone);
    }

    //-----------------------------------------------------------------------
    /**
     * Converts this instant to the number of milliseconds from the epoch
     * of 1970-01-01T00:00:00Z.
     *
     * If this instant represents a point on the time-line too far in the future
     * or past to fit in a `long` milliseconds, then an exception is thrown.
     *
     * If this instant has greater than millisecond precision, then the conversion
     * will drop any excess precision information as though the amount in nanoseconds
     * was subject to integer division by one million.
     *
     * @return {number} the number of milliseconds since the epoch of 1970-01-01T00:00:00Z
     * @throws ArithmeticException if numeric overflow occurs
     */
    toEpochMilli() {
        const millis = MathUtil.safeMultiply(this._seconds, 1000);
        return millis + MathUtil.intDiv(this._nanos, NANOS_PER_MILLI);
    }

    //-----------------------------------------------------------------------
    /**
     * Compares this instant to the specified instant.
     *
     * The comparison is based on the time-line position of the instants.
     * It is "consistent with equals", as defined by {@link Comparable}.
     *
     * @param {Instant} otherInstant  the other instant to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     * @throws NullPointerException if otherInstant is null
     */
    compareTo(otherInstant) {
        requireNonNull(otherInstant, 'otherInstant');
        requireInstance(otherInstant, Instant, 'otherInstant');
        const cmp = MathUtil.compareNumbers(this._seconds, otherInstant._seconds);
        if (cmp !== 0) {
            return cmp;
        }
        return this._nanos - otherInstant._nanos;
    }

    /**
     * Checks if this instant is after the specified instant.
     *
     * The comparison is based on the time-line position of the instants.
     *
     * @param {Instant} otherInstant  the other instant to compare to, not null
     * @return {boolean} true if this instant is after the specified instant
     * @throws NullPointerException if otherInstant is null
     */
    isAfter(otherInstant) {
        return this.compareTo(otherInstant) > 0;
    }

    /**
     * Checks if this instant is before the specified instant.
     *
     * The comparison is based on the time-line position of the instants.
     *
     * @param {Instant} otherInstant  the other instant to compare to, not null
     * @return {boolean} true if this instant is before the specified instant
     * @throws NullPointerException if otherInstant is null
     */
    isBefore(otherInstant) {
        return this.compareTo(otherInstant) < 0;
    }

    /**
     * Checks if this instant is equal to the specified instant.
     *
     * The comparison is based on the time-line position of the instants.
     *
     * @param {*} other - the other instant, null/ undefined returns false
     * @return {boolean} true if the other instant is equal to this one
     */
    equals(other) {
        if(this === other){
            return true;
        }
        if(other instanceof Instant){
            return this.epochSecond() === other.epochSecond() &&
                this.nano() === other.nano();
        }
        return false;
    }

    /**
     * Returns a hash code for this instant.
     *
     * @return {number} a suitable hash code
     */
    hashCode() {
        return MathUtil.hashCode(this._seconds, this._nanos);
    }

    /**
     * A string representation of this instant using ISO-8601 representation.
     *
     * The format used is the same as {@link DateTimeFormatter#ISO_INSTANT}.
     *
     * @return {string} an ISO-8601 representation of this instant, not null
     */
    toString(){
        return DateTimeFormatter.ISO_INSTANT.format(this);
    }

    /**
     *
     * @return {string} same as {@link LocalDate.toString}
     */
    toJSON() {
        return this.toString();
    }
}

export function _init() {
    Instant.MIN_SECONDS = -31619119219200; // -1000000-01-01T00:00:00Z
    Instant.MAX_SECONDS = 31494816403199; // +1000000-12-31T23:59:59.999999999Z
    Instant.EPOCH = new Instant(0, 0);
    Instant.MIN = Instant.ofEpochSecond(Instant.MIN_SECONDS, 0);
    Instant.MAX = Instant.ofEpochSecond(Instant.MAX_SECONDS, 999999999);
    Instant.FROM = createTemporalQuery('Instant.FROM', (temporal) => {
        return Instant.from(temporal);
    });
}
