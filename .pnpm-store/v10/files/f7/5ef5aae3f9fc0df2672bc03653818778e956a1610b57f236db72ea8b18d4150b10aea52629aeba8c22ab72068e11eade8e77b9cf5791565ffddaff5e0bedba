/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from '../assert';
import { IllegalArgumentException } from '../errors';

import { Duration } from '../Duration';
import { LocalDateTime } from '../LocalDateTime';

/**
 * A transition between two offsets caused by a discontinuity in the local time-line.
 *
 * A transition between two offsets is normally the result of a daylight savings cutover.
 * The discontinuity is normally a gap in spring and an overlap in autumn.
 * {@link ZoneOffsetTransition} models the transition between the two offsets.
 *
 * Gaps occur where there are local date-times that simply do not not exist.
 * An example would be when the offset changes from `+03:00` to `+04:00`.
 * This might be described as 'the clocks will move forward one hour tonight at 1am'.
 *
 * Overlaps occur where there are local date-times that exist twice.
 * An example would be when the offset changes from `+04:00` to `+03:00`.
 * This might be described as 'the clocks will move back one hour tonight at 2am'.
 *
 */
export class ZoneOffsetTransition {

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance defining a transition between two offsets.
     *
     * Applications should normally obtain an instance from {@link ZoneRules}.
     * This factory is only intended for use when creating {@link ZoneRules}.
     *
     * @param {LocalDateTime} transition - the transition date-time at the transition, which never
     *  actually occurs, expressed local to the before offset, not null
     * @param {ZoneOffset} offsetBefore - the offset before the transition, not null
     * @param {ZoneOffset} offsetAfter - the offset at and after the transition, not null
     * @return {ZoneOffsetTransition} the transition, not null
     * @throws IllegalArgumentException if {@link offsetBefore} and {@link offsetAfter}
     *         are equal, or {@link transition.getNano} returns non-zero value
     */
    static of(transition, offsetBefore, offsetAfter) {
        return new ZoneOffsetTransition(transition, offsetBefore, offsetAfter);
    }

    /**
     * Creates an instance defining a transition between two offsets.
     * Creates an instance from epoch-second if transition is not a LocalDateTimeInstance
     *
     * @param {(LocalDateTime \ number)} transition - the transition date-time with the offset before the transition, not null
     * @param {ZoneOffset} offsetBefore - the offset before the transition, not null
     * @param {ZoneOffset} offsetAfter - the offset at and after the transition, not null
     * @private
     */
    constructor(transition, offsetBefore, offsetAfter) {
        requireNonNull(transition, 'transition');
        requireNonNull(offsetBefore, 'offsetBefore');
        requireNonNull(offsetAfter, 'offsetAfter');
        if (offsetBefore.equals(offsetAfter)) {
            throw new IllegalArgumentException('Offsets must not be equal');
        }
        if (transition.nano() !== 0) {
            throw new IllegalArgumentException('Nano-of-second must be zero');
        }
        if(transition instanceof LocalDateTime) {
            this._transition = transition;
        } else {
            this._transition = LocalDateTime.ofEpochSecond(transition, 0, offsetBefore);
        }
        this._offsetBefore = offsetBefore;
        this._offsetAfter = offsetAfter;
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the transition instant.
     *
     * This is the instant of the discontinuity, which is defined as the first
     * instant that the 'after' offset applies.
     *
     * The methods {@link getInstant}, {@link getDateTimeBefore} and {@link getDateTimeAfter}
     * all represent the same instant.
     *
     * @return {Instant} the transition instant, not null
     */
    instant() {
        return this._transition.toInstant(this._offsetBefore);
    }

    /**
     * Gets the transition instant as an epoch second.
     *
     * @return {number} the transition epoch second
     */
    toEpochSecond() {
        return this._transition.toEpochSecond(this._offsetBefore);
    }

    //-------------------------------------------------------------------------
    /**
     * Gets the local transition date-time, as would be expressed with the 'before' offset.
     *
     * This is the date-time where the discontinuity begins expressed with the 'before' offset.
     * At this instant, the 'after' offset is actually used, therefore the combination of this
     * date-time and the 'before' offset will never occur.
     *
     * The combination of the 'before' date-time and offset represents the same instant
     * as the 'after' date-time and offset.
     *
     * @return {LocalDateTime} the transition date-time expressed with the before offset, not null
     */
    dateTimeBefore(){
        return this._transition;
    }

    /**
     * Gets the local transition date-time, as would be expressed with the 'after' offset.
     *
     * This is the first date-time after the discontinuity, when the new offset applies.
     *
     * The combination of the 'before' date-time and offset represents the same instant
     * as the 'after' date-time and offset.
     *
     * @return {LocalDateTime} the transition date-time expressed with the after offset, not null
     */
    dateTimeAfter() {
        return this._transition.plusSeconds(this.durationSeconds());
    }

    /**
     * Gets the offset before the transition.
     *
     * This is the offset in use before the instant of the transition.
     *
     * @return {ZoneOffset} the offset before the transition, not null
     */
    offsetBefore() {
        return this._offsetBefore;
    }

    /**
     * Gets the offset after the transition.
     *
     * This is the offset in use on and after the instant of the transition.
     *
     * @return {ZoneOffset} the offset after the transition, not null
     */
    offsetAfter() {
        return this._offsetAfter;
    }

    /**
     * Gets the duration of the transition.
     *
     * In most cases, the transition duration is one hour, however this is not always the case.
     * The duration will be positive for a gap and negative for an overlap.
     * Time-zones are second-based, so the nanosecond part of the duration will be zero.
     *
     * @return {Duration} the duration of the transition, positive for gaps, negative for overlaps
     */
    duration() {
        return Duration.ofSeconds(this.durationSeconds());
    }

    /**
     * Gets the duration of the transition in seconds.
     *
     * @return {number} the duration in seconds
     */
    durationSeconds() {
        return this._offsetAfter.totalSeconds() - this._offsetBefore.totalSeconds();
    }

    /**
     * Does this transition represent a gap in the local time-line.
     *
     * Gaps occur where there are local date-times that simply do not not exist.
     * An example would be when the offset changes from `+01:00` to `+02:00`.
     * This might be described as 'the clocks will move forward one hour tonight at 1am'.
     *
     * @return {boolean} true if this transition is a gap, false if it is an overlap
     */
    isGap() {
        return this._offsetAfter.totalSeconds() > this._offsetBefore.totalSeconds();
    }

    /**
     * Does this transition represent a gap in the local time-line.
     *
     * Overlaps occur where there are local date-times that exist twice.
     * An example would be when the offset changes from `+02:00` to `+01:00`.
     * This might be described as 'the clocks will move back one hour tonight at 2am'.
     *
     * @return {boolean} true if this transition is an overlap, false if it is a gap
     */
    isOverlap() {
        return this._offsetAfter.totalSeconds() < this._offsetBefore.totalSeconds();
    }

    /**
     * Checks if the specified offset is valid during this transition.
     *
     * This checks to see if the given offset will be valid at some point in the transition.
     * A gap will always return false.
     * An overlap will return true if the offset is either the before or after offset.
     *
     * @param {ZoneOffset} offset - the offset to check, null returns false
     * @return {boolean} true if the offset is valid during the transition
     */
    isValidOffset(offset) {
        return this.isGap() ? false : (this._offsetBefore.equals(offset) || this._offsetAfter.equals(offset));
    }

    /**
     * Gets the valid offsets during this transition.
     *
     * A gap will return an empty list, while an overlap will return both offsets.
     *
     * @return {ZoneOffset[]} the list of valid offsets
     */
    validOffsets() {
        if (this.isGap()){
            return [];
        } else {
            return [this._offsetBefore, this._offsetAfter];
        }
    }

    //-----------------------------------------------------------------------
    /**
     * Compares this transition to another based on the transition instant.
     *
     * This compares the instants of each transition.
     * The offsets are ignored, making this order inconsistent with equals.
     *
     * @param {ZoneOffsetTransition} transition - the transition to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     */
    compareTo(transition) {
        return this.instant().compareTo(transition.instant());
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if this object equals another.
     *
     * The entire state of the object is compared.
     *
     * @param {*} other - the other object to compare to, null returns false
     * @return true if equal
     */
    equals(other) {
        if (other === this) {
            return true;
        }
        if (other instanceof ZoneOffsetTransition) {
            const d = other;
            return this._transition.equals(d._transition) &&
                this._offsetBefore.equals(d.offsetBefore()) && this._offsetAfter.equals(d.offsetAfter());
        }
        return false;
    }

    /**
     * Returns a suitable hash code.
     *
     * @return {number} the hash code
     */
    hashCode() {
        return this._transition.hashCode() ^ this._offsetBefore.hashCode() ^ (this._offsetAfter.hashCode()>>>16);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a string describing this object.
     *
     * @return {string} a string for debugging, not null
     */
    toString() {
        return `Transition[${this.isGap() ? 'Gap' : 'Overlap' 
        } at ${this._transition.toString()}${this._offsetBefore.toString() 
        } to ${this._offsetAfter}]`;
    }

}
