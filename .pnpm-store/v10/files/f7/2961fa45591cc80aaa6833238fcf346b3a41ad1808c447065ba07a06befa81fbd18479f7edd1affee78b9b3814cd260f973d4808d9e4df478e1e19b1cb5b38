/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { abstractMethodFail } from '../assert';

/**
 * Framework-level interface defining an amount of time, such as
 * "6 hours", "8 days" or "2 years and 3 months".
 *
 * This is the base interface type for amounts of time.
 * An amount is distinct from a date or time-of-day in that it is not tied
 * to any specific point on the time-line.
 *
 * The amount can be thought of as a {@link Map} of {@link TemporalUnit} to
 * `long`, exposed via {@link getUnits} and {@link get}.
 * A simple case might have a single unit-value pair, such as "6 hours".
 * A more complex case may have multiple unit-value pairs, such as
 * "7 years, 3 months and 5 days".
 *
 * There are two common implementations.
 * {@link Period} is a date-based implementation, storing years, months and days.
 * {@link Duration} is a time-based implementation, storing seconds and nanoseconds,
 * but providing some access using other duration based units such as minutes,
 * hours and fixed 24-hour days.
 *
 * This interface is a framework-level interface that should not be widely
 * used in application code. Instead, applications should create and pass
 * around instances of concrete types, such as {@link Period} and {@link Duration}.
 *
 * @interface
 */
export class TemporalAmount {
    /**
     * Returns the value of the requested unit.
     * The units returned from {@link getUnits} uniquely define the
     * value of the {@link TemporalAmount}.  A value must be returned
     * for each unit listed in {@link getUnits}.
     *
     * @implSpec
     * Implementations may declare support for units not listed by {@link getUnits}.
     * Typically, the implementation would define additional units
     * as conversions for the convenience of developers.
     *
     * @param {TemporalUnit} unit - the {@link TemporalUnit} for which to return the value
     * @return {number} the long value of the unit
     * @throws DateTimeException if a value for the unit cannot be obtained
     * @throws UnsupportedTemporalTypeException if the {@link unit} is not supported
     */
    // eslint-disable-next-line no-unused-vars
    get(unit) {
        abstractMethodFail('get');
    }
    
    /**
     * Returns the list of units uniquely defining the value of this TemporalAmount.
     * The list of {@link TemporalUnits} is defined by the implementation class.
     * The list is a snapshot of the units at the time {@link getUnits}
     * is called and is not mutable.
     * The units are ordered from longest duration to the shortest duration
     * of the unit.
     *
     * @implSpec
     * The list of units completely and uniquely represents the
     * state of the object without omissions, overlaps or duplication.
     * The units are in order from longest duration to shortest.
     *
     * @return {TemporalUnit[]} the List of {@link TemporalUnits}; not null
     */
    units() {
        abstractMethodFail('units');
    }
    
    /**
     * Adds to the specified temporal object.
     *
     * Adds the amount to the specified temporal object using the logic
     * encapsulated in the implementing class.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link Temporal#plus}:
     * <pre>
     *   // These two lines are equivalent, but the second approach is recommended
     *   dateTime = amount.addTo(dateTime);
     *   dateTime = dateTime.plus(adder);
     * </pre>
     * It is recommended to use the second approach, {@link plus},
     * as it is a lot clearer to read in code.
     *
     * @implSpec
     * The implementation must take the input object and add to it.
     * The implementation defines the logic of the addition and is responsible for
     * documenting that logic. It may use any method on {@link Temporal} to
     * query the temporal object and perform the addition.
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
     * @param {Temporal} temporal - the temporal object to add the amount to, not null
     * @return {Temporal} an object of the same observable type with the addition made, not null
     * @throws DateTimeException if unable to add
     * @throws ArithmeticException if numeric overflow occurs
     */
    // eslint-disable-next-line no-unused-vars
    addTo(temporal) {
        abstractMethodFail('addTo');
    }
    
    /**
     * Subtracts this object from the specified temporal object.
     *
     * Subtracts the amount from the specified temporal object using the logic
     * encapsulated in the implementing class.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link Temporal#minus}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   dateTime = amount.subtractFrom(dateTime);
     *   dateTime = dateTime.minus(amount);
     * </pre>
     * It is recommended to use the second approach, {@link minus},
     * as it is a lot clearer to read in code.
     *
     * @implSpec
     * The implementation must take the input object and subtract from it.
     * The implementation defines the logic of the subtraction and is responsible for
     * documenting that logic. It may use any method on {@link Temporal} to
     * query the temporal object and perform the subtraction.
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
     * @param {Temporal} temporal - the temporal object to subtract the amount from, not null
     * @return {Temporal} an object of the same observable type with the subtraction made, not null
     * @throws DateTimeException if unable to subtract
     * @throws ArithmeticException if numeric overflow occurs
     */
    // eslint-disable-next-line no-unused-vars
    subtractFrom(temporal) {
        abstractMethodFail('subtractFrom');
    }
    
}

if (typeof Symbol !== 'undefined' && Symbol.toPrimitive) {
    TemporalAmount.prototype[Symbol.toPrimitive] = function (hint) {
        // hint could be 'number', 'string' or 'default'. Only 'number'
        // should throw and 'default' is treated as 'string'.
        if (hint !== 'number') {
            return this.toString();
        }

        throw new TypeError(
            'A conversion from TemporalAmount to a number is not allowed. ' +
            'To compare use the methods .equals(), .compareTo(), .isBefore() ' +
            'or one that is more suitable to your use case.'
        );
    };
}
