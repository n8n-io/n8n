/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { abstractMethodFail } from '../assert';

/**
 * Strategy for adjusting a temporal object.
 *
 * Adjusters are a key tool for modifying temporal objects.
 * They exist to externalize the process of adjustment, permitting different
 * approaches, as per the strategy design pattern.
 * Examples might be an adjuster that sets the date avoiding weekends, or one that
 * sets the date to the last day of the month.
 *
 * There are two equivalent ways of using a {@link TemporalAdjuster}.
 * The first is to invoke the method on this interface directly.
 * The second is to use {@link Temporal#with}:
 * <pre>
 *   // these two lines are equivalent, but the second approach is recommended
 *   temporal = thisAdjuster.adjustInto(temporal);
 *   temporal = temporal.with(thisAdjuster);
 * </pre>
 * It is recommended to use the second approach, {@link with},
 * as it is a lot clearer to read in code.
 *
 * See {@link TemporalAdjusters} for a standard set of adjusters, including finding the
 * last day of the month.
 * Adjusters may also be defined by applications.
 *
 * ### Specification for implementors
 *
 * This interface places no restrictions on the mutability of implementations,
 * however immutability is strongly recommended.
 *
 * @interface
 */
export class TemporalAdjuster {

    /**
     * Adjusts the specified temporal object.
     *
     * This adjusts the specified temporal object using the logic
     * encapsulated in the implementing class.
     * Examples might be an adjuster that sets the date avoiding weekends, or one that
     * sets the date to the last day of the month.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisAdjuster.adjustInto(temporal);
     *   temporal = temporal.with(thisAdjuster);
     * </pre>
     * It is recommended to use the second approach, {@link with},
     * as it is a lot clearer to read in code.
     *
     * ### Specification for implementors
     *
     * The implementation must take the input object and adjust it.
     * The implementation defines the logic of the adjustment and is responsible for
     * documenting that logic. It may use any method on {@link Temporal} to
     * query the temporal object and perform the adjustment.
     * The returned object must have the same observable type as the input object
     *
     * The input object must not be altered.
     * Instead, an adjusted copy of the original must be returned.
     * This provides equivalent, safe behavior for immutable and mutable temporal objects.
     *
     * The input temporal object may be in a calendar system other than ISO.
     * Implementations may choose to document compatibility with other calendar systems,
     * or reject non-ISO temporal objects by querying the chronology (see {@link TemporalQueries#chronology}).
     *
     * This method may be called from multiple threads in parallel.
     * It must be thread-safe when invoked.
     *
     * @param {Temporal} temporal  the temporal object to adjust, not null
     * @return {Temporal} an object of the same observable type with the adjustment made, not null
     * @throws DateTimeException if unable to make the adjustment
     * @throws ArithmeticException if numeric overflow occurs
     *
     * @abstract
     */
    // eslint-disable-next-line no-unused-vars
    adjustInto(temporal){
        abstractMethodFail('adjustInto');
    }

}
