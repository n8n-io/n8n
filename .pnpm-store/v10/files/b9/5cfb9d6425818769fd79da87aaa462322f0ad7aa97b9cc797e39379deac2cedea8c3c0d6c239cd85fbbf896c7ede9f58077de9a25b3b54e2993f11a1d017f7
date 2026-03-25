/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull, abstractMethodFail } from '../assert';

import { Duration } from '../Duration';
import { Instant } from '../Instant';

export class ZoneRules {

    /**
     * Obtains an instance of {@link ZoneRules} that always uses the same offset.
     *
     * The returned rules always have the same offset.
     *
     * @param {ZoneOffset} offset - the offset, not null
     * @return {ZoneRules} the zone rules, not null
     */
    static of(offset) {
        requireNonNull(offset, 'offset');
        return new Fixed(offset);
    }


    //-----------------------------------------------------------------------
    /**
     * Checks of the zone rules are fixed, such that the offset never varies.
     *
     * @return {boolean} true if the time-zone is fixed and the offset never changes
     */
    isFixedOffset(){
        abstractMethodFail('ZoneRules.isFixedOffset');
    }

    //-----------------------------------------------------------------------

    /**
     *
     * @param instantOrLocalDateTime
     * @returns {ZoneOffset}
     */
    offset(instantOrLocalDateTime){
        if(instantOrLocalDateTime instanceof Instant){
            return this.offsetOfInstant(instantOrLocalDateTime);
        } else {
            return this.offsetOfLocalDateTime(instantOrLocalDateTime);
        }
    }

    /**
     * Gets the offset applicable at the specified instant in these rules.
     *
     * The mapping from an instant to an offset is simple, there is only
     * one valid offset for each instant.
     * This method returns that offset.
     *
     * @param {Instant} instant - the instant to find the offset for, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffset} the offset, not null
     */
    // eslint-disable-next-line no-unused-vars
    offsetOfInstant(instant){
        abstractMethodFail('ZoneRules.offsetInstant');
    }

    /**
     * Gets the offset applicable at the specified epochMilli in these rules.
     *
     * The method is for javascript performance optimisation.
     *
     * @param {number} epochMilli - the epoch millisecond to find the offset for, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffset} the offset, not null
     */
    // eslint-disable-next-line no-unused-vars
    offsetOfEpochMilli(epochMilli){
        abstractMethodFail('ZoneRules.offsetOfEpochMilli');
    }


    /**
     * Gets a suitable offset for the specified local date-time in these rules.
     *
     * The mapping from a local date-time to an offset is not straightforward.
     * There are three cases:
     *
     * * Normal, with one valid offset. For the vast majority of the year, the normal
     *   case applies, where there is a single valid offset for the local date-time.
     * * Gap, with zero valid offsets. This is when clocks jump forward typically
     *   due to the spring daylight savings change from "winter" to "summer".
     *   In a gap there are local date-time values with no valid offset.
     * * Overlap, with two valid offsets. This is when clocks are set back typically
     *   due to the autumn daylight savings change from "summer" to "winter".
     *   In an overlap there are local date-time values with two valid offsets.
     *
     * Thus, for any given local date-time there can be zero, one or two valid offsets.
     * This method returns the single offset in the Normal case, and in the Gap or Overlap
     * case it returns the offset before the transition.
     *
     * Since, in the case of Gap and Overlap, the offset returned is a "best" value, rather
     * than the "correct" value, it should be treated with care. Applications that care
     * about the correct offset should use a combination of this method,
     * {@link getValidOffsets} and {@link getTransition}.
     *
     * @param {LocalDateTime} localDateTime - the local date-time to query, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffset} the best available offset for the local date-time, not null
     */
    // eslint-disable-next-line no-unused-vars
    offsetOfLocalDateTime(localDateTime){
        abstractMethodFail('ZoneRules.offsetLocalDateTime');
    }

    /**
     * Gets the offset applicable at the specified local date-time in these rules.
     *
     * The mapping from a local date-time to an offset is not straightforward.
     * There are three cases:
     *
     * * Normal, with one valid offset. For the vast majority of the year, the normal
     *   case applies, where there is a single valid offset for the local date-time.
     * * Gap, with zero valid offsets. This is when clocks jump forward typically
     *   due to the spring daylight savings change from "winter" to "summer".
     *   In a gap there are local date-time values with no valid offset.
     * * Overlap, with two valid offsets. This is when clocks are set back typically
     *   due to the autumn daylight savings change from "summer" to "winter".
     *   In an overlap there are local date-time values with two valid offsets.
     *
     * Thus, for any given local date-time there can be zero, one or two valid offsets.
     * This method returns that list of valid offsets, which is a list of size 0, 1 or 2.
     * In the case where there are two offsets, the earlier offset is returned at index 0
     * and the later offset at index 1.
     *
     * There are various ways to handle the conversion from a {@link LocalDateTime}.
     * One technique, using this method, would be:
     * <pre>
     *  List<ZoneOffset> validOffsets = rules.getOffset(localDT);
     *  if (validOffsets.size() == 1) {
     *    // Normal case: only one valid offset
     *    zoneOffset = validOffsets.get(0);
     *  } else {
     *    // Gap or Overlap: determine what to do from transition (which will be non-null)
     *    ZoneOffsetTransition trans = rules.getTransition(localDT);
     *  }
     * </pre>
     *
     * In theory, it is possible for there to be more than two valid offsets.
     * This would happen if clocks to be put back more than once in quick succession.
     * This has never happened in the history of time-zones and thus has no special handling.
     * However, if it were to happen, then the list would return more than 2 entries.
     *
     * @param {LocalDateTime} localDateTime - the local date-time to query for valid offsets, not null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffset[]} the list of valid offsets, may be immutable, not null
     */
    // eslint-disable-next-line no-unused-vars
    validOffsets(localDateTime){
        abstractMethodFail('ZoneRules.validOffsets');
    }

    /**
     * Gets the offset transition applicable at the specified local date-time in these rules.
     *
     * The mapping from a local date-time to an offset is not straightforward.
     * There are three cases:
     *
     * * Normal, with one valid offset. For the vast majority of the year, the normal
     *   case applies, where there is a single valid offset for the local date-time.
     * * Gap, with zero valid offsets. This is when clocks jump forward typically
     *   due to the spring daylight savings change from "winter" to "summer".
     *   In a gap there are local date-time values with no valid offset.
     * * Overlap, with two valid offsets. This is when clocks are set back typically
     *   due to the autumn daylight savings change from "summer" to "winter".
     *   In an overlap there are local date-time values with two valid offsets.
     *
     * A transition is used to model the cases of a Gap or Overlap.
     * The Normal case will return null.
     *
     * There are various ways to handle the conversion from a {@link LocalDateTime}.
     * One technique, using this method, would be:
     * <pre>
     *  ZoneOffsetTransition trans = rules.getTransition(localDT);
     *  if (trans != null) {
     *    // Gap or Overlap: determine what to do from transition
     *  } else {
     *    // Normal case: only one valid offset
     *    zoneOffset = rule.getOffset(localDT);
     *  }
     * </pre>
     *
     * @param {LocalDateTime} localDateTime  the local date-time to query for offset transition, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffsetTransition} the offset transition, null if the local date-time is not in transition
     */
    // eslint-disable-next-line no-unused-vars
    transition(localDateTime){
        abstractMethodFail('ZoneRules.transition');
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the standard offset for the specified instant in this zone.
     *
     * This provides access to historic information on how the standard offset
     * has changed over time.
     * The standard offset is the offset before any daylight saving time is applied.
     * This is typically the offset applicable during winter.
     *
     * @param {Instant} instant - the instant to find the offset information for, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffset} the standard offset, not null
     */
    // eslint-disable-next-line no-unused-vars
    standardOffset(instant){
        abstractMethodFail('ZoneRules.standardOffset');
    }

    /**
     * Gets the amount of daylight savings in use for the specified instant in this zone.
     *
     * This provides access to historic information on how the amount of daylight
     * savings has changed over time.
     * This is the difference between the standard offset and the actual offset.
     * Typically the amount is zero during winter and one hour during summer.
     * Time-zones are second-based, so the nanosecond part of the duration will be zero.
     *
     * @param {Instant} instant - the instant to find the daylight savings for, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {Duration} the difference between the standard and actual offset, not null
     */
    // eslint-disable-next-line no-unused-vars
    daylightSavings(instant){
        abstractMethodFail('ZoneRules.daylightSavings');
        //    default {
        //        ZoneOffset standardOffset = getStandardOffset(instant);
        //        ZoneOffset actualOffset = getOffset(instant);
        //        return actualOffset.toDuration().minus(standardOffset.toDuration()).normalized();
        //    }
    }

    /**
     * Checks if the specified instant is in daylight savings.
     *
     * This checks if the standard and actual offsets are the same at the specified instant.
     *
     * @param {Instant} instant - the instant to find the offset information for, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {boolean} the standard offset, not null
     */
    // eslint-disable-next-line no-unused-vars
    isDaylightSavings(instant) {
        abstractMethodFail('ZoneRules.isDaylightSavings');
        //    default {
        //        return (getStandardOffset(instant).equals(getOffset(instant)) == false);
        //    }
    }

    /**
     * Checks if the offset date-time is valid for these rules.
     *
     * To be valid, the local date-time must not be in a gap and the offset
     * must match the valid offsets.
     *
     * @param {LocalDateTime} localDateTime - the date-time to check, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @param {ZoneOffset} offset - the offset to check, null returns false
     * @return {boolean} true if the offset date-time is valid for these rules
     */
    // eslint-disable-next-line no-unused-vars
    isValidOffset(localDateTime, offset){
        abstractMethodFail('ZoneRules.isValidOffset');
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the next transition after the specified instant.
     *
     * This returns details of the next transition after the specified instant.
     * For example, if the instant represents a point where "Summer" daylight savings time
     * applies, then the method will return the transition to the next "Winter" time.
     *
     * @param {Instant} instant - the instant to get the next transition after, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffsetTransition} the next transition after the specified instant, null if this is after the last transition
     */
    // eslint-disable-next-line no-unused-vars
    nextTransition(instant){
        abstractMethodFail('ZoneRules.nextTransition');
    }

    /**
     * Gets the previous transition before the specified instant.
     *
     * This returns details of the previous transition after the specified instant.
     * For example, if the instant represents a point where "summer" daylight saving time
     * applies, then the method will return the transition from the previous "winter" time.
     *
     * @param {Instant} instant - the instant to get the previous transition after, not null, but null
     *  may be ignored if the rules have a single offset for all instants
     * @return {ZoneOffsetTransition} the previous transition after the specified instant, null if this is before the first transition
     */
    // eslint-disable-next-line no-unused-vars
    previousTransition(instant){
        abstractMethodFail('ZoneRules.previousTransition');
    }

    /**
     * Gets the complete list of fully defined transitions.
     *
     * The complete set of transitions for this rules instance is defined by this method
     * and {@link getTransitionRules}. This method returns those transitions that have
     * been fully defined. These are typically historical, but may be in the future.
     *
     * The list will be empty for fixed offset rules and for any time-zone where there has
     * only ever been a single offset. The list will also be empty if the transition rules are unknown.
     *
     * @return {ZoneOffsetTransition[]} an immutable list of fully defined transitions, not null
     */
    transitions(){
        abstractMethodFail('ZoneRules.transitions');
    }

    /**
     * Gets the list of transition rules for years beyond those defined in the transition list.
     *
     * The complete set of transitions for this rules instance is defined by this method
     * and {@link getTransitions}. This method returns instances of {@link ZoneOffsetTransitionRule}
     * that define an algorithm for when transitions will occur.
     *
     * For any given {@link ZoneRules}, this list contains the transition rules for years
     * beyond those years that have been fully defined. These rules typically refer to future
     * daylight saving time rule changes.
     *
     * If the zone defines daylight savings into the future, then the list will normally
     * be of size two and hold information about entering and exiting daylight savings.
     * If the zone does not have daylight savings, or information about future changes
     * is uncertain, then the list will be empty.
     *
     * The list will be empty for fixed offset rules and for any time-zone where there is no
     * daylight saving time. The list will also be empty if the transition rules are unknown.
     *
     * @return {ZoneOffsetTransitionRule[]} an immutable list of transition rules, not null
     */
    transitionRules(){
        abstractMethodFail('ZoneRules.transitionRules');
    }

    toString(){
        abstractMethodFail('ZoneRules.toString');
    }

    /**
     * toJSON() use by JSON.stringify
     * delegates to toString()
     *
     * @return {string}
     */
    toJSON() {
        return this.toString();
    }
}


class Fixed extends ZoneRules{
    /**
     *
     * @param {ZoneOffset} offset
     * @private
     */
    constructor(offset){
        super();
        this._offset = offset;
    }

    isFixedOffset(){
        return true;
    }

    offsetOfInstant(){
        return this._offset;
    }

    offsetOfEpochMilli(){
        return this._offset;
    }

    offsetOfLocalDateTime(){
        return this._offset;
    }

    validOffsets(){
        return [this._offset];
    }

    transition(){
        return null;
    }

    standardOffset(){
        return this._offset;
    }

    daylightSavings(){
        return Duration.ZERO;
    }

    isDaylightSavings(){
        return false;
    }

    /**
     *
     * @param {LocalDateTime} localDateTime
     * @param {ZoneOffset} offset
     * @return {boolean}
     */
    isValidOffset(localDateTime, offset) {
        return this._offset.equals(offset);
    }

    nextTransition(){
        return null;
    }

    previousTransition(){
        return null;
    }

    transitions(){
        return [];
    }

    transitionRules(){
        return [];
    }

    //-----------------------------------------------------------------------
    /**
     *
     * @param {*} other
     * @returns {boolean}
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof Fixed) {
            return this._offset.equals(other._offset);
        }
        return false;
    }

    /**
     *
     * @returns {string}
     */
    toString() {
        return `FixedRules:${this._offset.toString()}`;
    }

}
