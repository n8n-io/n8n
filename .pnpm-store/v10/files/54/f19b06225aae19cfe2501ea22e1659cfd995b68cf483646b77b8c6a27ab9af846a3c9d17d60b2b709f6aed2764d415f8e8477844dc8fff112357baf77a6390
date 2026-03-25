/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { abstractMethodFail, requireNonNull } from './assert';
import { Instant } from './Instant';
import { ZoneId } from './ZoneId';
import { ZoneOffset } from './ZoneOffset';

/**
 * A clock providing access to the current instant, date and time using a time-zone.
 *
 * Instances of this class are used to find the current instant, which can be
 * interpreted using the stored time-zone to find the current date and time.
 * As such, a clock can be used instead of {@link System#currentTimeMillis}
 * and {@link TimeZone#getDefault}.
 *
 * Use of a {@link Clock} is optional. All key date-time classes also have a
 * `now()` factory method that uses the system clock in the default time zone.
 * The primary purpose of this abstraction is to allow alternate clocks to be
 * plugged in as and when required. Applications use an object to obtain the
 * current time rather than a static method. This can simplify testing.
 *
 * Best practice for applications is to pass a {@link Clock} into any method
 * that requires the current instant.
 *
 * This approach allows an alternate clock, such as {@link fixed}
 * or {@link offset} to be used during testing.
 *
 * The {@link system} factory methods provide clocks based on the best available
 * system clock This may use {@link System#currentTimeMillis}, or a higher
 * resolution clock if one is available.
 *
 * The javascript Clock implementation differs from the openjdk.
 *
 * Javascript only provides the UTC millis of epoch and the ZoneOffset in minutes of the system default time.
 * Javascript do not provide the system default ZoneId.
 *
 * the system default ZoneId is only guessable by the ZoneOffset, like moment-timezone does by returning one ZoneId
 * with the same ZoneOffset.
 *
 * Therefore we are doing a shortcut here, by defining a SystemUTCClock and a SystemDefaultClock, the Clock itself
 * is returning the ZoneOffset and not the ZoneRules as in the jdk. We should change it, when introducing the iana
 * timezone database and implementing the timezone domains.
 *
 */

export class Clock {
    /**
     * Obtains a clock that returns the current instant using the
     * system clock, converting to date and time using the Date.getTime() UTC millis.
     *
     * This clock, rather than {@link systemDefaultZone}, should be used when
     * you need the current instant without the date or time.
     *
     * @return {Clock} a clock that uses the system clock in the UTC zone, not null
     */
    static systemUTC() {
        return new SystemClock(ZoneOffset.UTC);
    }

    /**
     * Obtains a clock that returns the current instant using the best available
     * system clock, converting to date and time using the default time-zone.
     *
     * This clock is based on the available system clock using the Date.getTime() UTC millis
     *
     * Using this method hard codes a dependency to the default time-zone into your application.
     *
     * The UTC clock (see {@link systemUTC}) should be used when you need the current instant
     * without the date or time.
     *
     *
     * @return {Clock} a clock that uses the system clock in the default zone, not null
     * @see ZoneId#systemDefault()
     */
    static systemDefaultZone() {
        return new SystemClock(ZoneId.systemDefault());
    }

    /**
     *
     * @param {ZoneId} zone
     * @return {Clock} a clock that uses the specified time zone
     */
    static system(zone){
        return new SystemClock(zone);
    }

    /**
     * Obtains a clock that always returns the same instant.
     *
     * This clock simply returns the specified instant.
     * As such, it is not a clock in the conventional sense.
     * The main use case for this is in testing, where the fixed clock ensures
     * tests are not dependent on the current clock.
     *
     * @param {Instant} fixedInstant  the instant to use as the clock, not null
     * @param {ZoneId} zoneId  the zoneOffset to use as zone Offset, not null
     * @return {Clock} a clock that always returns the same instant, not null
     */
    static fixed(fixedInstant, zoneId) {
        return new FixedClock(fixedInstant, zoneId);
    }
    
    /**
     * Obtains a clock that returns instants from the specified clock with the
     * specified duration added
     * <p>
     * This clock wraps another clock, returning instants that are later by the
     * specified duration. If the duration is negative, the instants will be
     * earlier than the current date and time.
     * The main use case for this is to simulate running in the future or in the past.
     * <p>
     * A duration of zero would have no offsetting effect.
     * Passing zero will return the underlying clock.
     * <p>
     * The returned implementation is immutable, thread-safe and {@code Serializable}
     * providing that the base clock is.
     *
     * @param baseClock  the base clock to add the duration to, not null
     * @param duration  the duration to add, not null
     * @return a clock based on the base clock with the duration added, not null
     */
    static offset(baseClock, duration) {
        return new OffsetClock(baseClock, duration);   
    }

    /**
      * Gets the current millisecond instant of the clock.
      *
      * This returns the millisecond-based instant, measured from 1970-01-01T00:00Z (UTC).
      * This is equivalent to the definition of {@link Date#getTime}.
      *
      * Most applications should avoid this method and use {@link Instant} to represent
      * an instant on the time-line rather than a raw millisecond value.
      * This method is provided to allow the use of the clock in high performance use cases
      * where the creation of an object would be unacceptable.
      *
      * The default implementation currently calls {@link instant}.
      *
      * @return the current millisecond instant from this clock, measured from
      *  the Java epoch of 1970-01-01T00:00Z (UTC), not null
      */
    millis(){
        abstractMethodFail('Clock.millis');
    }

    /**
     * Gets the current instant of the clock.
     *
     * This returns an instant representing the current instant as defined by the clock.
     *
     * @return {Instant} the current instant from this clock, not null
     */
    instant(){
        abstractMethodFail('Clock.instant');
    }

    zone(){
        abstractMethodFail('Clock.zone');
    }
    
    /**
     * Returns a copy of this clock with a different time-zone.
     * <p>
     * A clock will typically obtain the current instant and then convert that
     * to a date or time using a time-zone. This method returns a clock with
     * similar properties but using a different time-zone.
     *
     * @return a clock based on this clock with the specified time-zone, not null
     */
    withZone(){
        abstractMethodFail('Clock.withZone');
    }
}

/**
 * Implementation of a clock that always returns the latest time from
 * {@link Date#getTime}.
 *
 * @private
 */
class SystemClock extends Clock {
    /**
     *
     * @param {!ZoneId} zone
     */
    constructor(zone){
        requireNonNull(zone, 'zone');
        super();
        this._zone = zone;
    }

    /**
     *
     * @returns {!ZoneId}
     */
    zone() {
        return this._zone;
    }

    /**
     *
     * @returns {number}
     */
    millis() {
        return new Date().getTime();
    }

    /**
     *
     * @returns {Instant}
     */
    instant() {
        return Instant.ofEpochMilli(this.millis());
    }
    
    equals(obj) {    
        if (obj instanceof SystemClock) {            
            return this._zone.equals(obj._zone);
        }
        return false;    
    }  
      
    withZone(zone) {
        if (zone.equals(this._zone)) {  // intentional NPE
            return this;
        }
        return new SystemClock(zone);
    }      

    /**
     *
     * @returns {string}
     */
    toString(){
        return `SystemClock[${this._zone.toString()}]`;
    }

}

/**
 * Implementation of a clock that always returns the same instant.
 * This is typically used for testing.
 * @private
 */
class FixedClock extends Clock{
    constructor(fixedInstant, zoneId) {
        super();
        this._instant = fixedInstant;
        this._zoneId = zoneId;
    }

    instant() {
        return this._instant;
    }

    millis(){
        return this._instant.toEpochMilli();
    }

    zone() {
        return this._zoneId;
    }

    toString(){
        return 'FixedClock[]';
    }
    
    equals(obj) {    
        if (obj instanceof FixedClock) {            
            return this._instant.equals(obj._instant) && this._zoneId.equals(obj._zoneId);
        }
        return false;    
    }

    withZone(zone) {
        if (zone.equals(this._zoneId)) {  // intentional NPE
            return this;
        }
        return new FixedClock(this._instant, zone);
    }      
    
}


/**
 * Implementation of a clock that adds an offset to an underlying clock.
 */
class OffsetClock extends Clock {
    constructor(baseClock, offset) {
        super();
        this._baseClock = baseClock;
        this._offset = offset;
    }
   
    zone() {
        return this._baseClock.zone();
    }
        
    withZone(zone) {
        if (zone.equals(this._baseClock.zone())) {  // intentional NPE
            return this;
        }
        return new OffsetClock(this._baseClock.withZone(zone), this._offset);
    }
    
    millis() {
        return this._baseClock.millis() + this._offset.toMillis();
    }
    
    instant() {
        return this._baseClock.instant().plus(this._offset);
    }
        
    equals(obj) {
        if (obj instanceof OffsetClock) {            
            return this._baseClock.equals(obj._baseClock) && this._offset.equals(obj._offset);
        }
        return false;
    }
    
    toString() {
        return `OffsetClock[${this._baseClock},${this._offset}]`;
    }
}
