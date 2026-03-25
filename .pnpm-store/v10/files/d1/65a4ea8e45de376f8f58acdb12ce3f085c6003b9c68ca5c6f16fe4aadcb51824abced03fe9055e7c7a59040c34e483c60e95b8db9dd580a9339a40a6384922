/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { ZoneRules } from './ZoneRules';
import { ZoneOffset } from '../ZoneOffset';
import { DateTimeException } from '../errors';

export class SystemDefaultZoneRules extends ZoneRules {

    isFixedOffset(){
        return false;
    }

    /**
     *
     * @param {Instant} instant
     * @returns {ZoneOffset}
     */
    offsetOfInstant(instant){
        const offsetInMinutes = new Date(instant.toEpochMilli()).getTimezoneOffset();
        return ZoneOffset.ofTotalMinutes(offsetInMinutes * -1);
    }

    /**
     *
     * @param {number} epochMilli
     * @returns {ZoneOffset}
     */
    offsetOfEpochMilli(epochMilli){
        const offsetInMinutes = new Date(epochMilli).getTimezoneOffset();
        return ZoneOffset.ofTotalMinutes(offsetInMinutes * -1);
    }

    /**
     * This implementation is NOT returning the best value in a gap or overlap situation
     * as specified at {@link ZoneRules.offsetOfLocalDateTime}.
     *
     * The calculated offset depends Date.prototype.getTimezoneOffset and its not specified
     * at the ECMA-262 specification how to handle daylight savings gaps/ overlaps.
     *
     * The Chrome Browser version 49 is returning the next transition offset in a gap/overlap situation,
     * other browsers/ engines might do it in the same way.
     *
     * @param {LocalDateTime} localDateTime
     * @returns {ZoneOffset}
     */
    offsetOfLocalDateTime(localDateTime){
        const epochMilli = localDateTime.toEpochSecond(ZoneOffset.UTC) * 1000;
        const offsetInMinutesBeforePossibleTransition = new Date(epochMilli).getTimezoneOffset();
        const epochMilliSystemZone = epochMilli + offsetInMinutesBeforePossibleTransition * 60000;
        const offsetInMinutesAfterPossibleTransition = new Date(epochMilliSystemZone).getTimezoneOffset();
        return ZoneOffset.ofTotalMinutes(offsetInMinutesAfterPossibleTransition * -1);
    }

    /**
     *
     * @param localDateTime
     * @return {ZoneOffset[]}
     */
    validOffsets(localDateTime){
        return [this.offsetOfLocalDateTime(localDateTime)];
    }

    /**
     * @return null, not supported
     */
    transition(){
        return null;
    }

    /**
     *
     * @param instant
     * @return {ZoneOffset}
     */
    standardOffset(instant){
        return this.offsetOfInstant(instant);
    }

    /**
     * @throws DateTimeException not supported
     */
    daylightSavings(){
        this._throwNotSupported();
    }

    /**
     * @throws DateTimeException not supported
     */
    isDaylightSavings(){
        this._throwNotSupported();
    }

    /**
     *
     * @param {LocalDateTime} dateTime
     * @param {ZoneOffset} offset
     * @return {boolean}
     */
    isValidOffset(dateTime, offset) {
        return this.offsetOfLocalDateTime(dateTime).equals(offset);
    }

    /**
     * @throws DateTimeException not supported
     */
    nextTransition(){
        this._throwNotSupported();
    }

    /**
     * @throws DateTimeException not supported
     */
    previousTransition(){
        this._throwNotSupported();
    }

    /**
     * @throws DateTimeException not supported
     */
    transitions(){
        this._throwNotSupported();
    }

    /**
     * @throws DateTimeException not supported
     */
    transitionRules(){
        this._throwNotSupported();
    }

    /**
     * @throws DateTimeException not supported
     */
    _throwNotSupported(){
        throw new DateTimeException('not supported operation');
    }
    //-----------------------------------------------------------------------
    /**
     *
     * @param {*} other
     * @returns {boolean}
     */
    equals(other) {
        if (this === other || other instanceof SystemDefaultZoneRules) {
            return true;
        } else {
            return false;
        }
    }

    /**
     *
     * @returns {string}
     */
    toString() {
        return 'SYSTEM';
    }

}
