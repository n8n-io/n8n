/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { UnsupportedTemporalTypeException } from '../errors';
import { abstractMethodFail } from '../assert';

import { ChronoField } from './ChronoField';
import { TemporalQueries } from './TemporalQueries';

export class TemporalAccessor {
    /**
     * Queries this date-time.
     *
     * This queries this date-time using the specified query strategy object.
     *
     * Queries are a key tool for extracting information from date-times.
     * They exists to externalize the process of querying, permitting different
     * approaches, as per the strategy design pattern.
     * Examples might be a query that checks if the date is the day before February 29th
     * in a leap year, or calculates the number of days to your next birthday.
     *
     * The most common query implementations are method references, such as
     * {@link LocalDate::from} and {@link ZoneId::from}.
     * Further implementations are on {@link TemporalQueries}.
     * Queries may also be defined by applications.
     *
     * @implSpec
     * Implementations of this method must behave as follows:
     * <pre>
        if (query == TemporalQueries.zoneId()
            || query == TemporalQueries.chronology()
            || query == TemporalQueries.precision()) {
                return null;
        }
        return query.queryFrom(this);
     * </pre>
     *
     * @param {TemporalQuery} query  the query to invoke, not null
     * @return the query result, null may be returned (defined by the query)
     * @throws DateTimeException if unable to query
     * @throws ArithmeticException if numeric overflow occurs
     */
    query(query) {
        if (query === TemporalQueries.zoneId()
                || query === TemporalQueries.chronology()
                || query === TemporalQueries.precision()) {
            return null;
        }
        return query.queryFrom(this);
    }

    /**
     * Gets the value of the specified field as an `int`.
     *
     * This queries the date-time for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If the date-time cannot return the value, because the field is unsupported or for
     * some other reason, an exception will be thrown.
     *
     * ### Specification for implementors
     *
     * Implementations must check and handle all fields defined in {@link ChronoField}.
     * If the field is supported and has an `int` range, then the value of
     * the field must be returned.
     * If unsupported, then a {@link DateTimeException} must be thrown.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing `this` as the argument.
     *
     * Implementations must not alter either this object.
     *
     * @param {TemporalField} field - the field to get, not null
     * @return {number} the value for the field, within the valid range of values
     * @throws DateTimeException if a value for the field cannot be obtained
     * @throws DateTimeException if the range of valid values for the field exceeds an `int`
     * @throws DateTimeException if the value is outside the range of valid values for the field
     * @throws ArithmeticException if numeric overflow occurs
     */
    get(field) {
        return this.range(field).checkValidIntValue(this.getLong(field), field);
    }

    // eslint-disable-next-line no-unused-vars
    getLong(field) {
        abstractMethodFail('getLong');
    }

    /**
     * Gets the range of valid values for the specified field.
     *
     * All fields can be expressed as a `long` integer.
     * This method returns an object that describes the valid range for that value.
     * The value of this temporal object is used to enhance the accuracy of the returned range.
     * If the date-time cannot return the range, because the field is unsupported or for
     * some other reason, an exception will be thrown.
     *
     * Note that the result only describes the minimum and maximum valid values
     * and it is important not to read too much into them. For example, there
     * could be values within the range that are invalid for the field.
     *
     * ### Specification for implementors
     *
     * Implementations must check and handle all fields defined in {@link ChronoField}.
     * If the field is supported, then the range of the field must be returned.
     * If unsupported, then a {@link DateTimeException} must be thrown.
     *
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.rangeRefinedBy}
     * passing `this` as the argument.
     *
     * Implementations must not alter either this object.
     *
     * @param {TemporalField} field  the field to query the range for, not null
     * @return {ValueRange} the range of valid values for the field, not null
     * @throws DateTimeException if the range for the field cannot be obtained
     */
    range(field) {
        if (field instanceof ChronoField) {
            if (this.isSupported(field)) {
                return field.range();
            }
            throw new UnsupportedTemporalTypeException(`Unsupported field: ${field}`);
        }
        return field.rangeRefinedBy(this);
    }

    // eslint-disable-next-line no-unused-vars
    isSupported(field) {
        abstractMethodFail('isSupported');
    }
}
