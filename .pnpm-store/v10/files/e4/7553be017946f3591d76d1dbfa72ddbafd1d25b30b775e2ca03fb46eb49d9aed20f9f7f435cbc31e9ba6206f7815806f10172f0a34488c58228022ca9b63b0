/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

/**
 * Common implementations of {@link TemporalQuery}.
 *
 * This class provides common implementations of {@link TemporalQuery}.
 * These queries are primarily used as optimizations, allowing the internals
 * of other objects to be extracted effectively. Note that application code
 * can also use the {@link from} method on most temporal
 * objects as a method reference matching the query interface, such as
 * {@link LocalDate::from} and {@link ZoneId::from}.
 *
 * There are two equivalent ways of using a {@link TemporalQuery}.
 * The first is to invoke the method on the interface directly.
 * The second is to use {@link TemporalAccessor#query}:
 * <pre>
 *   // these two lines are equivalent, but the second approach is recommended
 *   dateTime = query.queryFrom(dateTime);
 *   dateTime = dateTime.query(query);
 * </pre>
 * It is recommended to use the second approach, {@link query},
 * as it is a lot clearer to read in code.
 *
 */
export class TemporalQueries {

    /**
     * A strict query for the {@link ZoneId}.
     *
     * This queries a {@link TemporalAccessor} for the zone.
     * The zone is only returned if the date-time conceptually contains a {@link ZoneId}.
     * It will not be returned if the date-time only conceptually has an {@link ZoneOffset}.
     * Thus a {@link ZonedDateTime} will return the result of
     * {@link getZone}, but an {@link OffsetDateTime} will
     * return null.
     *
     * In most cases, applications should use {@link ZONE} as this query is too strict.
     *
     * The result from JDK classes implementing {@link TemporalAccessor} is as follows:
     * * * {@link LocalDate} returns null
     * * {@link LocalTime} returns null
     * * {@link LocalDateTime} returns null
     * * {@link ZonedDateTime} returns the associated zone
     * * {@link OffsetTime} returns null
     * * {@link OffsetDateTime} returns null
     * * {@link ChronoLocalDate} returns null
     * * {@link ChronoLocalDateTime} returns null
     * * {@link ChronoZonedDateTime} returns the associated zone
     * * {@link Era} returns null
     * * {@link DayOfWeek} returns null
     * * {@link Month} returns null
     * * {@link Year} returns null
     * * {@link YearMonth} returns null
     * * {@link MonthDay} returns null
     * * {@link ZoneOffset} returns null
     * * {@link Instant} returns null
     *
     * @return a query that can obtain the zone ID of a temporal, not null
     */
    static zoneId() {
        return TemporalQueries.ZONE_ID;
    }

    /**
     * A query for the {@link Chronology}.
     *
     * This queries a {@link TemporalAccessor} for the chronology.
     * If the target {@link TemporalAccessor} represents a date, or part of a date,
     * then it should return the chronology that the date is expressed in.
     * As a result of this definition, objects only representing time, such as
     * {@link LocalTime}, will return null.
     *
     * The result from js-joda classes implementing {@link TemporalAccessor} is as follows:
     *
     * * {@link LocalDate} returns * {@link IsoChronology.INSTANCE}
     * * {@link LocalTime} returns null (does not represent a date)
     * * {@link LocalDateTime} returns * {@link IsoChronology.INSTANCE}
     * * {@link ZonedDateTime} returns * {@link IsoChronology.INSTANCE}
     * * {@link OffsetTime} returns null (does not represent a date)
     * * {@link OffsetDateTime} returns * {@link IsoChronology.INSTANCE}
     * * {@link ChronoLocalDate} returns the associated chronology
     * * {@link ChronoLocalDateTime} returns the associated chronology
     * * {@link ChronoZonedDateTime} returns the associated chronology
     * * {@link Era} returns the associated chronology
     * * {@link DayOfWeek} returns null (shared across chronologies)
     * * {@link Month} returns * {@link IsoChronology.INSTANCE}
     * * {@link Year} returns * {@link IsoChronology.INSTANCE}
     * * {@link YearMonth} returns * {@link IsoChronology.INSTANCE}
     * * {@link MonthDay} returns null * {@link IsoChronology.INSTANCE}
     * * {@link ZoneOffset} returns null (does not represent a date)
     * * {@link Instant} returns null (does not represent a date)
     *
     * The method {@link Chronology#from} can be used as a
     * {@link TemporalQuery}
     * That method is equivalent to this query, except that it throws an
     * exception if a chronology cannot be obtained.
     *
     * @return {TemporalQuery} a query that can obtain the chronology of a temporal, not null
     */
    static chronology() {
        return TemporalQueries.CHRONO;
    }

    /**
     * A query for the smallest supported unit.
     *
     * This queries a {@link TemporalAccessor} for the time precision.
     * If the target {@link TemporalAccessor} represents a consistent or complete date-time,
     * date or time then this must return the smallest precision actually supported.
     * Note that fields such as {@link NANO_OF_DAY} and {@link NANO_OF_SECOND}
     * are defined to always return ignoring the precision, thus this is the only
     * way to find the actual smallest supported unit.
     * For example, were {@link GregorianCalendar} to implement {@link TemporalAccessor}
     * it would return a precision of {@link MILLIS}.
     *
     * The result from js-joda classes implementing {@link TemporalAccessor} is as follows:
     *
     * {@link LocalDate} returns {@link DAYS}
     * {@link LocalTime} returns {@link NANOS}
     * {@link LocalDateTime} returns {@link NANOS}
     * {@link ZonedDateTime} returns {@link NANOS}
     * {@link OffsetTime} returns {@link NANOS}
     * {@link OffsetDateTime} returns {@link NANOS}
     * {@link ChronoLocalDate} returns {@link DAYS}
     * {@link ChronoLocalDateTime} returns {@link NANOS}
     * {@link ChronoZonedDateTime} returns {@link NANOS}
     * {@link Era} returns {@link ERAS}
     * {@link DayOfWeek} returns {@link DAYS}
     * {@link Month} returns {@link MONTHS}
     * {@link Year} returns {@link YEARS}
     * {@link YearMonth} returns {@link MONTHS}
     * {@link MonthDay} returns null (does not represent a complete date or time)
     * {@link ZoneOffset} returns null (does not represent a date or time)
     * {@link Instant} returns {@link NANOS}
     *
     * @return a query that can obtain the precision of a temporal, not null
     */
    static precision() {
        return TemporalQueries.PRECISION;
    }

    /**
     * A lenient query for the {@link ZoneId}, falling back to the {@link ZoneOffset}.
     *
     * This queries a {@link TemporalAccessor} for the zone.
     * It first tries to obtain the zone, using {@link zoneId}.
     * If that is not found it tries to obtain the {@link offset}.
     *
     * In most cases, applications should use this query rather than {@link zoneId}.
     *
     * This query examines the {@link ChronoField#OFFSET_SECONDS}
     * field and uses it to create a {@link ZoneOffset}.
     *
     * The method {@link ZoneId#from} can be used as a
     * {@link TemporalQuery} via a method reference, {@link ZoneId::from}.
     * That method is equivalent to this query, except that it throws an
     * exception if a zone cannot be obtained.
     *
     * @return a query that can obtain the zone ID or offset of a temporal, not null
     */
    static zone() {
        return TemporalQueries.ZONE;
    }

    /**
     * A query for {@link ZoneOffset} returning null if not found.
     *
     * This returns a {@link TemporalQuery} that can be used to query a temporal
     * object for the offset. The query will return null if the temporal
     * object cannot supply an offset.
     *
     * The query implementation examines the {@link ChronoField#OFFSET_SECONDS}
     * field and uses it to create a {@link ZoneOffset}.
     *
     * The method {@link java.time.ZoneOffset#from} can be used as a
     * {@link TemporalQuery} via a method reference, {@link ZoneOffset::from}.
     * This query and {@link ZoneOffset::from} will return the same result if the
     * temporal object contains an offset. If the temporal object does not contain
     * an offset, then the method reference will throw an exception, whereas this
     * query will return null.
     *
     * @return a query that can obtain the offset of a temporal, not null
     */
    static offset() {
        return TemporalQueries.OFFSET;
    }

    /**
     * A query for {@link LocalDate} returning null if not found.
     *
     * This returns a {@link TemporalQuery} that can be used to query a temporal
     * object for the local date. The query will return null if the temporal
     * object cannot supply a local date.
     *
     * The query implementation examines the {@link ChronoField#EPOCH_DAY}
     * field and uses it to create a {@link LocalDate}.
     *
     * @return a query that can obtain the date of a temporal, not null
     */
    static localDate() {
        return TemporalQueries.LOCAL_DATE;
    }

    /**
     * A query for {@link LocalTime} returning null if not found.
     *
     * This returns a {@link TemporalQuery} that can be used to query a temporal
     * object for the local time. The query will return null if the temporal
     * object cannot supply a local time.
     *
     * The query implementation examines the {@link ChronoField#NANO_OF_DAY}
     * field and uses it to create a {@link LocalTime}.
     *
     * @return a query that can obtain the time of a temporal, not null
     */
    static localTime() {
        return TemporalQueries.LOCAL_TIME;
    }
}
