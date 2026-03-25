/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { ChronoField } from './ChronoField';
import { createTemporalQuery } from './TemporalQuery';
import { TemporalQueries } from './TemporalQueries';

import { LocalDate } from '../LocalDate';
import { LocalTime } from '../LocalTime';
import { ZoneOffset } from '../ZoneOffset';


export function _init() {
    //-----------------------------------------------------------------------
    /**
     * A strict query for the {@link ZoneId}.
     */
    TemporalQueries.ZONE_ID = createTemporalQuery('ZONE_ID', (temporal) => {
        return temporal.query(TemporalQueries.ZONE_ID);
    });

    /**
     * A query for the {@link Chronology}.
     */
    TemporalQueries.CHRONO = createTemporalQuery('CHRONO', (temporal) => {
        return temporal.query(TemporalQueries.CHRONO);
    });

    /**
     * A query for the smallest supported unit.
     */
    TemporalQueries.PRECISION = createTemporalQuery('PRECISION', (temporal) => {
        return temporal.query(TemporalQueries.PRECISION);
    });

    //-----------------------------------------------------------------------
    /**
     * A query for {@link ZoneOffset} returning null if not found.
     */
    TemporalQueries.OFFSET = createTemporalQuery('OFFSET', (temporal) => {
        if (temporal.isSupported(ChronoField.OFFSET_SECONDS)) {
            return ZoneOffset.ofTotalSeconds(temporal.get(ChronoField.OFFSET_SECONDS));
        }
        return null;
    });

    /**
     * A lenient query for the {@link ZoneId}, falling back to the {@link ZoneOffset}.
     */
    TemporalQueries.ZONE = createTemporalQuery('ZONE', (temporal) => {
        const zone = temporal.query(TemporalQueries.ZONE_ID);
        return (zone != null ? zone : temporal.query(TemporalQueries.OFFSET));
    });

    /**
     * A query for {@link LocalDate} returning null if not found.
     */
    TemporalQueries.LOCAL_DATE = createTemporalQuery('LOCAL_DATE', (temporal) => {
        if (temporal.isSupported(ChronoField.EPOCH_DAY)) {
            return LocalDate.ofEpochDay(temporal.getLong(ChronoField.EPOCH_DAY));
        }
        return null;
    });

    /**
     * A query for {@link LocalTime} returning null if not found.
     */
    TemporalQueries.LOCAL_TIME = createTemporalQuery('LOCAL_TIME', (temporal) => {
        if (temporal.isSupported(ChronoField.NANO_OF_DAY)) {
            return LocalTime.ofNanoOfDay(temporal.getLong(ChronoField.NANO_OF_DAY));
        }
        return null;
    });
}
