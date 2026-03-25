/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { abstractMethodFail } from '../assert';
import { Enum } from '../Enum';


/**
 * Strategy for querying a temporal object.
 *
 * Queries are a key tool for extracting information from temporal objects.
 * They exist to externalize the process of querying, permitting different
 * approaches, as per the strategy design pattern.
 * Examples might be a query that checks if the date is the day before February 29th
 * in a leap year, or calculates the number of days to your next birthday.
 *
 * The {@link TemporalField} interface provides another mechanism for querying
 * temporal objects. That interface is limited to returning a `long`.
 * By contrast, queries can return any type.
 *
 * There are two equivalent ways of using a {@link TemporalQuery}.
 * The first is to invoke the method on this interface directly.
 * The second is to use {@link TemporalAccessor#query}:
 * <pre>
 *   // these two lines are equivalent, but the second approach is recommended
 *   temporal = thisQuery.queryFrom(temporal);
 *   temporal = temporal.query(thisQuery);
 * </pre>
 * It is recommended to use the second approach, {@link query},
 * as it is a lot clearer to read in code.
 *
 * The most common implementations are method references, such as
 * {@link LocalDate::from} and {@link ZoneId::from}.
 * Further implementations are on {@link TemporalQueries}.
 * Queries may also be defined by applications.
 *
 * ### Specification for implementors
 *
 * This interface places no restrictions on the mutability of implementations,
 * however immutability is strongly recommended.
 *
 * @interface
 */
export class TemporalQuery  extends Enum {
    /**
     * Queries the specified temporal object.
     *
     * This queries the specified temporal object to return an object using the logic
     * encapsulated in the implementing class.
     * Examples might be a query that checks if the date is the day before February 29th
     * in a leap year, or calculates the number of days to your next birthday.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link TemporalAccessor#query}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisQuery.queryFrom(temporal);
     *   temporal = temporal.query(thisQuery);
     * </pre>
     * It is recommended to use the second approach, {@link query},
     * as it is a lot clearer to read in code.
     *
     * ### Specification for implementors
     *
     * The implementation must take the input object and query it.
     * The implementation defines the logic of the query and is responsible for
     * documenting that logic.
     * It may use any method on {@link TemporalAccessor} to determine the result.
     * The input object must not be altered.
     *
     * The input temporal object may be in a calendar system other than ISO.
     * Implementations may choose to document compatibility with other calendar systems,
     * or reject non-ISO temporal objects by querying the chronology (see {@link TemporalQueries#chronology}).
     *
     * This method may be called from multiple threads in parallel.
     * It must be thread-safe when invoked.
     *
     * @param {TemporalAccessor} temporal  the temporal object to query, not null
     * @return the queried value, may return null to indicate not found
     * @throws DateTimeException if unable to query
     * @throws ArithmeticException if numeric overflow occurs
     */
    // eslint-disable-next-line no-unused-vars
    queryFrom(temporal){
        abstractMethodFail('queryFrom');
    }

}

/**
 * @private
 *
 * Factory to create something similar to the JSR-310 {TemporalQuery} interface, takes a function and returns a new TemporalQuery object that presents that function
 * as the queryFrom() function.
 * @param name for the underlying Enum
 * @param queryFromFunction
 */
export function createTemporalQuery(name, queryFromFunction) {
    class ExtendedTemporalQuery extends TemporalQuery {

    }

    ExtendedTemporalQuery.prototype.queryFrom = queryFromFunction;
    return new ExtendedTemporalQuery(name);
}
