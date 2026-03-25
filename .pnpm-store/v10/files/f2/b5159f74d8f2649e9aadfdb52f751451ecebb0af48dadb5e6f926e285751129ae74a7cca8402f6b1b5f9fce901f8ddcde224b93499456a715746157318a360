/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { abstractMethodFail } from './assert';
import { DateTimeException } from './errors';

import { StringUtil } from './StringUtil';

import { Instant } from './Instant';

export class ZoneId {
    /**
     * Gets the system default time-zone.
     *
     * @return {ZoneId} the zone ID, not null
     */
    static systemDefault() {
        // Find implementation at {@link ZoneIdFactory}
        throw new DateTimeException('not supported operation');
    }

    /**
     * Gets the set of available zone IDs.
     *
     * This set includes the string form of all available region-based IDs.
     * Offset-based zone IDs are not included in the returned set.
     * The ID can be passed to {@link of} to create a {@link ZoneId}.
     *
     * The set of zone IDs can increase over time, although in a typical application
     * the set of IDs is fixed. Each call to this method is thread-safe.
     *
     * @return {string[]} a modifiable copy of the set of zone IDs, not null
     */
    static getAvailableZoneIds() {
        // Find implementation at {@link ZoneIdFactory}
        throw new DateTimeException('not supported operation');
    }

    /**
     * Obtains an instance of {@link ZoneId} from an ID ensuring that the
     * ID is valid and available for use.
     *
     * This method parses the ID producing a {@link ZoneId} or {@link ZoneOffset}.
     * A {@link ZoneOffset} is returned if the ID is 'Z', or starts with '+' or '-'.
     * The result will always be a valid ID for which {@link ZoneRules} can be obtained.
     *
     * Parsing matches the zone ID step by step as follows.
     *
     * * If the zone ID equals 'Z', the result is {@link ZoneOffset.UTC}.
     * * If the zone ID consists of a single letter, the zone ID is invalid
     *   and {@link DateTimeException} is thrown.
     * * If the zone ID starts with '+' or '-', the ID is parsed as a
     *   {@link ZoneOffset} using {@link ZoneOffset#of}.
     * * If the zone ID equals 'GMT', 'UTC' or 'UT' then the result is a {@link ZoneId}
     *   with the same ID and rules equivalent to {@link ZoneOffset.UTC}.
     * * If the zone ID starts with 'UTC+', 'UTC-', 'GMT+', 'GMT-', 'UT+' or 'UT-'
     *   then the ID is a prefixed offset-based ID. The ID is split in two, with
     *   a two or three letter prefix and a suffix starting with the sign.
     *   The suffix is parsed as a {@link ZoneOffset}.
     *   The result will be a {@link ZoneId} with the specified UTC/GMT/UT prefix
     *   and the normalized offset ID as per {@link ZoneOffset#getId}.
     *   The rules of the returned {@link ZoneId} will be equivalent to the
     *   parsed {@link ZoneOffset}.
     * * All other IDs are parsed as region-based zone IDs. Region IDs must
     *   match the regular expression `[A-Za-z][A-Za-z0-9~/._+-]+`,
     *   otherwise a {@link DateTimeException} is thrown. If the zone ID is not
     *   in the configured set of IDs, {@link ZoneRulesException} is thrown.
     *   The detailed format of the region ID depends on the group supplying the data.
     *   The default set of data is supplied by the IANA Time Zone Database (TZDB).
     *   This has region IDs of the form '{area}/{city}', such as 'Europe/Paris' or 'America/New_York'.
     *   This is compatible with most IDs from {@link java.util.TimeZone}.
     *
     * @param {string} zoneId  the time-zone ID, not null
     * @return {ZoneId} the zone ID, not null
     * @throws DateTimeException if the zone ID has an invalid format
     * @throws ZoneRulesException if the zone ID is a region ID that cannot be found
     */
    static of(zoneId) {
        // Find implementation at {@link ZoneIdFactory}
        throw new DateTimeException(`not supported operation${zoneId}`);
    }

    /**
     * Obtains an instance of {@link ZoneId} wrapping an offset.
     *
     * If the prefix is 'GMT', 'UTC', or 'UT' a {@link ZoneId}
     * with the prefix and the non-zero offset is returned.
     * If the prefix is empty `''` the {@link ZoneOffset} is returned.
     *
     * @param {string} prefix  the time-zone ID, not null
     * @param {ZoneOffset} offset  the offset, not null
     * @return {ZoneId} the zone ID, not null
     * @throws IllegalArgumentException if the prefix is not one of
     *     'GMT', 'UTC', or 'UT', or ''
     */
    static ofOffset(prefix, offset) {
        // Find implementation at {@link ZoneIdFactory}
        throw new DateTimeException(`not supported operation${prefix}${offset}`);
    }


    /**
     * Obtains an instance of {@link ZoneId} from a temporal object.
     *
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link ZoneId}.
     *
     * The conversion will try to obtain the zone in a way that favours region-based
     * zones over offset-based zones using {@link TemporalQueries#zone}.
     *
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used in queries via method reference, {@link ZoneId::from}.
     *
     * @param {!TemporalAccessor} temporal - the temporal object to convert, not null
     * @return {ZoneId} the zone ID, not null
     * @throws DateTimeException if unable to convert to a {@link ZoneId}
     */
    static from(temporal) {
        // Find implementation at {@link ZoneIdFactory}
        throw new DateTimeException(`not supported operation${temporal}`);
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the unique time-zone ID.
     *
     * This ID uniquely defines this object.
     * The format of an offset based ID is defined by {@link ZoneOffset#getId}.
     *
     * @return {String} the time-zone unique ID, not null
     */
    id(){
        abstractMethodFail('ZoneId.id');
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the time-zone rules for this ID allowing calculations to be performed.
     *
     * The rules provide the functionality associated with a time-zone,
     * such as finding the offset for a given instant or local date-time.
     *
     * A time-zone can be invalid if it is deserialized in a Java Runtime which
     * does not have the same rules loaded as the Java Runtime that stored it.
     * In this case, calling this method will throw a {@link ZoneRulesException}.
     *
     * The rules are supplied by {@link ZoneRulesProvider}. An advanced provider may
     * support dynamic updates to the rules without restarting the Java Runtime.
     * If so, then the result of this method may change over time.
     * Each individual call will be still remain thread-safe.
     *
     * {@link ZoneOffset} will always return a set of rules where the offset never changes.
     *
     * @return {!ZoneRules} the rules, not null
     * @throws ZoneRulesException if no rules are available for this ID
     */
    rules(){
        abstractMethodFail('ZoneId.rules');
    }

    /**
      * Normalizes the time-zone ID, returning a {@link ZoneOffset} where possible.
      *
      * The returns a normalized {@link ZoneId} that can be used in place of this ID.
      * The result will have {@link ZoneRules} equivalent to those returned by this object,
      * however the ID returned by {@link getId} may be different.
      *
      * The normalization checks if the rules of this {@link ZoneId} have a fixed offset.
      * If they do, then the {@link ZoneOffset} equal to that offset is returned.
      * Otherwise `this` is returned.
      *
      * @return {ZoneId} the time-zone unique ID, not null
      */
    normalized() {
        const rules = this.rules();
        if (rules.isFixedOffset()) {
            return rules.offset(Instant.EPOCH);
        }
        //try {
        //} catch (ZoneRulesException ex) {
        //    // ignore invalid objects
        //}
        return this;
    }

    //-----------------------------------------------------------------------
    /**
      * Checks if this time-zone ID is equal to another time-zone ID.
      *
      * The comparison is based on the ID.
      *
      * @param {*} other  the object to check, null returns false
      * @return {boolean} true if this is equal to the other time-zone ID
      */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof ZoneId) {
            return this.id() === other.id();
        }
        return false;
    }

    /**
      * A hash code for this time-zone ID.
      *
      * @return {number} a suitable hash code
      */
    hashCode() {
        return StringUtil.hashCode(this.id());
    }

    //-----------------------------------------------------------------------
    /**
      * Outputs this zone as a string, using the ID.
      *
      * @return {string} a string representation of this time-zone ID, not null
      */
    toString() {
        return this.id();
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
