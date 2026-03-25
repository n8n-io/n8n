import { abstractMethodFail } from '../assert';

/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

/**
 * A field of date-time, such as month-of-year or hour-of-minute.
 *
 * Date and time is expressed using fields which partition the time-line into something
 * meaningful for humans. Implementations of this interface represent those fields.
 *
 * The most commonly used units are defined in {@link ChronoField}.
 * Further fields are supplied in {@link IsoFields}, {@link WeekFields} and {@link JulianFields}.
 * Fields can also be written by application code by implementing this interface.
 *
 * The field works using double dispatch. Client code calls methods on a date-time like
 * {@link LocalDateTime} which check if the field is a {@link ChronoField}.
 * If it is, then the date-time must handle it.
 * Otherwise, the method call is re-dispatched to the matching method in this interface.
 *
 * @interface
 */
export class TemporalField {
    /**
     * Checks if this field represents a component of a date.
     *
     * @return {boolean} `true` if it is a component of a date, `false` otherwise.
     */
    isDateBased() {
        abstractMethodFail('isDateBased');
    }

    /**
     * Checks if this field represents a component of a time.
     *
     * @return {boolean} `true` if it is a component of a time, `false` otherwise.
     */
    isTimeBased() {
        abstractMethodFail('isTimeBased');
    }

    /**
     * Gets the unit that the field is measured in.
     *
     * The unit of the field is the period that varies within the range.
     * For example, in the field 'MonthOfYear', the unit is 'Months'.
     * See also {@link rangeUnit}.
     *
     * @return {TemporalUnit} the period unit defining the base unit of the field.
     */
    baseUnit() {
        abstractMethodFail('baseUnit');
    }

    /**
     * Gets the range that the field is bound by.
     * 
     * The range of the field is the period that the field varies within.
     * For example, in the field 'MonthOfYear', the range is 'Years'.
     * See also {@link baseUnit}.
     * 
     * The range is never null. For example, the 'Year' field is shorthand for
     * 'YearOfForever'. It therefore has a unit of 'Years' and a range of 'Forever'.
     *
     * @return {TemporalUnit} the period unit defining the range of the field.
     */
    rangeUnit() {
        abstractMethodFail('rangeUnit');
    }

    /**
     * Gets the range of valid values for the field.
     *
     * All fields can be expressed as an integer.
     * This method returns an object that describes the valid range for that value.
     * This method is generally only applicable to the ISO-8601 calendar system.
     *
     * Note that the result only describes the minimum and maximum valid values
     * and it is important not to read too much into them. For example, there
     * could be values within the range that are invalid for the field.
     *
     * @return {ValueRange} the range of valid values for the field.
     */
    range() {
        abstractMethodFail('range');
    }

    /**
     * Get the range of valid values for this field using the temporal object to
     * refine the result.
     *
     * This uses the temporal object to find the range of valid values for the field.
     * This is similar to {@link range}, however this method refines the result
     * using the temporal. For example, if the field is {@link DAY_OF_MONTH} the
     * {@link range} method is not accurate as there are four possible month lengths,
     * 28, 29, 30 and 31 days. Using this method with a date allows the range to be
     * accurate, returning just one of those four options.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link TemporalAccessor#range}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisField.rangeRefinedBy(temporal);
     *   temporal = temporal.range(thisField);
     * </pre>
     * It is recommended to use the second approach, {@link range},
     * as it is a lot clearer to read in code.
     *
     * Implementations should perform any queries or calculations using the fields
     * available in {@link ChronoField}.
     * If the field is not supported a {@link DateTimeException} must be thrown.
     *
     * @param {!TemporalAccessor} temporal the temporal object used to refine the result.
     * @return {ValueRange} the range of valid values for this field.
     * @throws {DateTimeException} if the range for the field cannot be obtained.
     * 
     */
    // eslint-disable-next-line no-unused-vars
    rangeRefinedBy(temporal) {
        abstractMethodFail('rangeRefinedBy');
    }

    /**
     * Gets the value of this field from the specified temporal object.
     *
     * This queries the temporal object for the value of this field.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link TemporalAccessor#get}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisField.getFrom(temporal);
     *   temporal = temporal.get(thisField);
     * </pre>
     * It is recommended to use the second approach, as it is a lot clearer to read in code.
     *
     * Implementations should perform any queries or calculations using the fields
     * available in {@link ChronoField}.
     * If the field is not supported a {@link DateTimeException} must be thrown.
     *
     * @param {!TemporalAccesor} temporal the temporal object to query.
     * @return {number} the value of this field.
     * @throws {DateTimeException} if a value for the field cannot be obtained.
     */
    // eslint-disable-next-line no-unused-vars
    getFrom(temporal) {
        abstractMethodFail('getFrom');
    }

    /**
     * Returns a copy of the specified temporal object with the value of this field set.
     *
     * This returns a new temporal object based on the specified one with the value for
     * this field changed. For example, on a {@link LocalDate}, this could be used to
     * set the year, month or day-of-month.
     * The returned object has the same observable type as the specified object.
     *
     * In some cases, changing a field is not fully defined. For example, if the target object is
     * a date representing the 31st January, then changing the month to February would be unclear.
     * In cases like this, the implementation is responsible for resolving the result.
     * Typically it will choose the previous valid date, which would be the last valid
     * day of February in this example.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link Temporal#with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisField.adjustInto(temporal);
     *   temporal = temporal.with(thisField);
     * </pre>
     * It is recommended to use the second approach, `with(temporal)`,
     * as it is a lot clearer to read in code.
     *
     * Implementations should perform any queries or calculations using the fields
     * available in {@link ChronoField}.
     * If the field is not supported a {@link DateTimeException} must be thrown.
     *
     * Implementations must not alter the specified temporal object.
     * Instead, an adjusted copy of the original must be returned.
     * This provides equivalent, safe behavior for immutable and mutable implementations.
     *
     * @param {!Temporal} temporal the temporal object to adjust.
     * @param {!number} newValue the new value of the field.
     * @return {Temporal} the adjusted temporal object.
     * @throws {DateTimeException} if the field cannot be set.
     */
    // eslint-disable-next-line no-unused-vars
    adjustInto(temporal, newValue) {
        abstractMethodFail('adjustInto');
    }

    /**
     * Checks if this field is supported by the temporal object.
     *
     * This determines whether the temporal accessor supports this field.
     * If this returns false, the the temporal cannot be queried for this field.
     *
     * There are two equivalent ways of using this method.
     * The first is to invoke this method directly.
     * The second is to use {@link TemporalAccessor#isSupported}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisField.isSupportedBy(temporal);
     *   temporal = temporal.isSupported(thisField);
     * </pre>
     * It is recommended to use the second approach, `isSupported(temporal)`,
     * as it is a lot clearer to read in code.
     *
     * Implementations should determine whether they are supported using the fields
     * available in {@link ChronoField}.
     *
     * @param {!TemporalAccesor} temporal the temporal object to query.
     * @return {boolean} `true` if the date-time can be queried for this field, `false` if not.
     */
    // eslint-disable-next-line no-unused-vars
    isSupportedBy(temporal) {
        abstractMethodFail('isSupportedBy');
    }

    /**
     * @return {string}
     */
    displayName(/* TODO: locale */) {
        abstractMethodFail('displayName');
    }

    /**
    * @param {*} other
    * @returns {boolean}
    */
    // eslint-disable-next-line no-unused-vars
    equals(other) {
        abstractMethodFail('equals');
    }

    /**
     * @returns {string}
     */
    name() {
        abstractMethodFail('name');
    }
}
