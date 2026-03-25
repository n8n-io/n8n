/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from './assert';
import { DateTimeException, IllegalArgumentException } from './errors';
import { StringUtil } from './StringUtil';

import { ZoneOffset } from './ZoneOffset';
import { ZoneRegion } from './ZoneRegion';
import { ZoneId } from './ZoneId';

import { TemporalQueries } from './temporal/TemporalQueries';
import { SystemDefaultZoneId } from './zone/SystemDefaultZoneId';
import { ZoneRulesProvider } from './zone/ZoneRulesProvider';

/**
 * @see {@link ZoneId}
 *
 * Helper class to avoid dependency cycles.
 * Static methods of the class ZoneIdFactory are added automatically to class ZoneId.
 * @private
 */
export class ZoneIdFactory {

    /**
     * Gets the system default time-zone.
     *
     *
     * @return {ZoneId} the zone ID, not null
     */
    static systemDefault() {
        return SYSTEM_DEFAULT_ZONE_ID_INSTANCE;
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
        return ZoneRulesProvider.getAvailableZoneIds();
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
        requireNonNull(zoneId, 'zoneId');
        if (zoneId === 'Z') {
            return ZoneOffset.UTC;
        }
        if (zoneId.length === 1) {
            throw new DateTimeException(`Invalid zone: ${zoneId}`);
        }
        if (StringUtil.startsWith(zoneId, '+') || StringUtil.startsWith(zoneId, '-')) {
            return ZoneOffset.of(zoneId);
        }
        if (zoneId === 'UTC' || zoneId === 'GMT' || zoneId === 'GMT0' || zoneId === 'UT') {
            return new ZoneRegion(zoneId, ZoneOffset.UTC.rules());
        }
        if (StringUtil.startsWith(zoneId, 'UTC+') || StringUtil.startsWith(zoneId, 'GMT+') ||
                StringUtil.startsWith(zoneId, 'UTC-') || StringUtil.startsWith(zoneId, 'GMT-')) {
            const offset = ZoneOffset.of(zoneId.substring(3));
            if (offset.totalSeconds() === 0) {
                return new ZoneRegion(zoneId.substring(0, 3), offset.rules());
            }
            return new ZoneRegion(zoneId.substring(0, 3) + offset.id(), offset.rules());
        }
        if (StringUtil.startsWith(zoneId, 'UT+') || StringUtil.startsWith(zoneId, 'UT-')) {
            const offset = ZoneOffset.of(zoneId.substring(2));
            if (offset.totalSeconds() === 0) {
                return new ZoneRegion('UT', offset.rules());
            }
            return new ZoneRegion(`UT${offset.id()}`, offset.rules());
        }
        // javascript special case
        if(zoneId === 'SYSTEM'){
            return ZoneId.systemDefault();
        }
        return ZoneRegion.ofId(zoneId);
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
        requireNonNull(prefix, 'prefix');
        requireNonNull(offset, 'offset');
        if (prefix.length === 0) {
            return offset;
        }
        if (prefix === 'GMT' || prefix === 'UTC' || prefix === 'UT') {
            if (offset.totalSeconds() === 0) {
                return new ZoneRegion(prefix, offset.rules());
            }
            return new ZoneRegion(prefix + offset.id(), offset.rules());
        }
        throw new IllegalArgumentException(`Invalid prefix, must be GMT, UTC or UT: ${prefix}`);
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
        requireNonNull(temporal, 'temporal');
        const obj = temporal.query(TemporalQueries.zone());
        if (obj == null) {
            throw new DateTimeException(`Unable to obtain ZoneId from TemporalAccessor: ${ 
                temporal}, type ${temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
        return obj;
    }
}

let SYSTEM_DEFAULT_ZONE_ID_INSTANCE = null;

export function _init(){
    SYSTEM_DEFAULT_ZONE_ID_INSTANCE = new SystemDefaultZoneId();

    // a bit magic to stay a bit more to the threeten bp impl.
    ZoneId.systemDefault = ZoneIdFactory.systemDefault;
    ZoneId.getAvailableZoneIds = ZoneIdFactory.getAvailableZoneIds;
    ZoneId.of = ZoneIdFactory.of;
    ZoneId.ofOffset = ZoneIdFactory.ofOffset;
    ZoneId.from = ZoneIdFactory.from;
    ZoneOffset.from = ZoneIdFactory.from;

    // short cut
    ZoneId.SYSTEM = SYSTEM_DEFAULT_ZONE_ID_INSTANCE;
    ZoneId.UTC = ZoneOffset.ofTotalSeconds(0);
}
