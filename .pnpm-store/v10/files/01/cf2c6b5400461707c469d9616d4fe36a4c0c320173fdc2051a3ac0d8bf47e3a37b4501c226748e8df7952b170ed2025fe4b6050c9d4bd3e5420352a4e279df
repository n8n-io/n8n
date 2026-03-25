/*
 * @copyright (c) 2015-present, Philipp Thürwächter, Pattrick Hüper & js-joda contributors
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull } from './assert';
import { IllegalArgumentException } from './errors';
import { Instant, ZoneId } from './js-joda';

/**
 * Creates ZonedDateTime from a javascript Date or a moment instance.
 * @param {!(Date|moment)} date - a javascript Date or a moment instance
 * @param {ZoneId} [zone = ZoneId.systemDefault()] - the zone of the returned ZonedDateTime, defaults to ZoneId.systemDefault()
 * @returns {ZonedDateTime}
 */
export function nativeJs(date, zone = ZoneId.systemDefault()) {
    requireNonNull(date, 'date');
    requireNonNull(zone, 'zone');
    if(date instanceof Date) {
        return Instant.ofEpochMilli(date.getTime()).atZone(zone);
    } else if(typeof date.toDate === 'function' &&  date.toDate() instanceof Date) {
        return Instant.ofEpochMilli(date.toDate().getTime()).atZone(zone);
    }
    throw new IllegalArgumentException('date must be a javascript Date or a moment instance');
}
