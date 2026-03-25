/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert, abstractMethodFail, requireInstance, requireNonNull } from '../assert';
import { IllegalArgumentException } from '../errors';
import { TemporalAccessor } from './TemporalAccessor';
import { TemporalAmount } from './TemporalAmount';
import { TemporalUnit } from './TemporalUnit';

/**
 * Framework-level interface defining read-write access to a temporal object,
 * such as a date, time, offset or some combination of these.
 *
 * This is the base interface type for date, time and offset objects that
 * are complete enough to be manipulated using plus and minus.
 * It is implemented by those classes that can provide and manipulate information
 * as fields (see {@link TemporalField}) or queries (see {@link TemporalQuery}).
 * See {@link TemporalAccessor} for the read-only version of this interface.
 *
 * Most date and time information can be represented as a number.
 * These are modeled using {@link TemporalField} with the number held using
 * a `long` to handle large values. Year, month and day-of-month are
 * simple examples of fields, but they also include instant and offsets.
 * See {@link ChronoField} for the standard set of fields.
 *
 * Two pieces of date/time information cannot be represented by numbers,
 * the {@link Chronology} and the {@link ZoneId}.
 * These can be accessed using the static methods defined on {@link TemporalQueries}.
 *
 * This interface is a framework-level interface that should not be widely
 * used in application code. Instead, applications should create and pass
 * around instances of concrete types, such as {@link LocalDate}.
 * There are many reasons for this, part of which is that implementations
 * of this interface may be in calendar systems other than ISO.
 * See {@link ChronoLocalDate} for a fuller discussion of the issues.
 *
 * ### When to implement
 *
 * A class should implement this interface if it meets three criteria:
 *
 * * it provides access to date/time/offset information, as per {@link TemporalAccessor}
 * * the set of fields are contiguous from the largest to the smallest
 * * the set of fields are complete, such that no other field is needed to define the
 *   valid range of values for the fields that are represented
 *
 * Four examples make this clear:
 *
 * * {@link LocalDate} implements this interface as it represents a set of fields
 *   that are contiguous from days to forever and require no external information to determine
 *   the validity of each date. It is therefore able to implement plus/minus correctly.
 * * {@link LocalTime} implements this interface as it represents a set of fields
 *   that are contiguous from nanos to within days and require no external information to determine
 *   validity. It is able to implement plus/minus correctly, by wrapping around the day.
 * * {@link MonthDay}, the combination of month-of-year and day-of-month, does not implement
 *   this interface.  While the combination is contiguous, from days to months within years,
 *   the combination does not have sufficient information to define the valid range of values
 *   for day-of-month.  As such, it is unable to implement plus/minus correctly.
 * * The combination day-of-week and day-of-month ("Friday the 13th") should not implement
 *   this interface. It does not represent a contiguous set of fields, as days to weeks overlaps
 *   days to months.
 *
 * @interface
 */
export class Temporal extends TemporalAccessor {
    /**
     * Checks if the specified unit is supported.
     * This checks if the date-time can be queried for the specified unit. If false, then calling the plus and minus methods will throw an exception.

     * ### Specification for implementors
     * Implementations must check and handle all fields defined in {@link ChronoUnit}. If the field is supported, then true is returned, otherwise false
     * If the field is not a {@link ChronoUnit}, then the result of this method is obtained by invoking `TemporalUnit.isSupportedBy(Temporal)` passing this as the argument.

     * Implementations must not alter this object.

     * @param {TemporalUnit} fieldOrUnit - the unit to check, null returns false
     * @return {boolean} true if this date-time can be queried for the unit, false if not
     */
    // eslint-disable-next-line no-unused-vars
    isSupported(fieldOrUnit) {
        abstractMethodFail('isSupported');
    }

    /**
     * function overloading for {@link Temporal.plus}
     *
     * Called with 1 (or less) arguments, p1 is expected to be a {@link TemporalAmount} and {@link Temporal.minusAmount} is called.
     *
     * Otherwise {@link Temporal.minusAmountUnit} is called.
     *
     * @param {!(TemporalAmount|number)} amount
     * @param {TemporalUnit} unit
     * @return {Temporal}
     */
    minus(amount, unit) {
        if (arguments.length < 2) {
            return this._minusAmount(amount);
        } else {
            return this._minusUnit(amount, unit);
        }
    }

    /**
     * Returns an object of the same type as this object with an amount subtracted.
     * This adjusts this temporal, subtracting according to the rules of the specified amount. The
     * amount is typically a {@link Period} but may be any other type implementing the {@link TemporalAmount} interface, such as Duration.
     *
     * Some example code indicating how and why this method is used:
     *
     * <pre>
     *   date = date.minus(period);                  // subtract a Period instance
     *   date = date.minus(duration);                // subtract a Duration instance
     *   date = date.minus(workingDays(6));          // example user-written workingDays method
     * </pre>
     *
     * Note that calling plus followed by minus is not guaranteed to return the same date-time.
     *
     * ### Specification for implementors
     * Implementations must not alter either this object. Instead, an adjusted copy of the original
     * must be returned. This provides equivalent, safe behavior for immutable and mutable
     * implementations.
     *
     * @param {TemporalAmount} amount - the amount to subtract, not null
     * @return {Temporal} an object of the same type with the specified adjustment made, not null
     * @throws DateTimeException - if the subtraction cannot be made
     * @throws ArithmeticException - if numeric overflow occurs
     */
    _minusAmount(amount) {
        requireNonNull(amount, 'amount');
        requireInstance(amount, TemporalAmount, 'amount');
        return amount.subtractFrom(this);
    }

    /**
     * Returns an object of the same type as this object with the specified period subtracted.
     * This method returns a new object based on this one with the specified period subtracted. For example, on a {@link LocalDate}, this could be used to subtract a number of years, months or days. The returned object will have the same observable type as this object.
     *
     * In some cases, changing a field is not fully defined. For example, if the target object is a date representing the 31st March, then subtracting one month would be unclear. In cases like this, the field is responsible for resolving the result. Typically it will choose the previous valid date, which would be the last valid day of February in this example.
     *
     * If the implementation represents a date-time that has boundaries, such {@link as} LocalTime, then the permitted units must include the boundary unit, but no multiples of the boundary unit. For example, {@link LocalTime} must accept `DAYS` but not `WEEKS` or `MONTHS`.
     *
     * ### Specification for implementors
     * Implementations must behave in a manor equivalent to the default method behavior.
     * Implementations must not alter either this object or the specified temporal object. Instead, an adjusted copy of the original must be returned. This provides equivalent, safe behavior for immutable and mutable implementations.
     *
     * @param {number} amountToSubtract - the amount of the specified unit to subtract, may be negative
     * @param {TemporalUnit} unit - the unit of the period to subtract, not null
     * @return {Temporal} an object of the same type with the specified period subtracted, not null
     * @throws DateTimeException - if the unit cannot be subtracted
     * @throws ArithmeticException - if numeric overflow occurs
     */
    _minusUnit(amountToSubtract, unit) {
        requireNonNull(amountToSubtract, 'amountToSubtract');
        requireNonNull(unit, 'unit');
        requireInstance(unit, TemporalUnit, 'unit');
        return this._plusUnit(-amountToSubtract, unit);
    }

    /**
     * function overloading for {@link Temporal.plus}
     *
     * Called with 1 (or less) arguments, p1 is expected to be a {@link TemporalAmount} and {@link Temporal.plusAmount} is called.
     *
     * Otherwise {@link Temporal.plusAmountUnit} is called.
     *
     * @param {!(TemporalAmount|number)} amount
     * @param {TemporalUnit} unit
     * @return {Temporal}
     */
    plus(amount, unit) {
        if (arguments.length < 2) {
            return this._plusAmount(amount);
        } else {
            return this._plusUnit(amount, unit);
        }
    }

    /**
     * Returns an object of the same type as this object with an amount added.
     * This adjusts this temporal, adding according to the rules of the specified amount. The amount is typically a {@link Period} but may be any other type implementing the {@link TemporalAmount} interface, such as {@link Duration}.
     *
     * Some example code indicating how and why this method is used:
     *
     * <pre>
     *   date = date.plus(period);                  // add a Period instance
     *   date = date.plus(duration);                // add a Duration instance
     *   date = date.plus(workingDays(6));          // example user-written workingDays method
     * </pre>
     *
     * Note that calling plus followed by minus is not guaranteed to return the same date-time.
     *
     * ### Specification for implementors
     * Implementations must not alter either this object. Instead, an adjusted copy of the original must be returned. This provides equivalent, safe behavior for immutable and mutable implementations.
     *
     * @param {TemporalAmount} amount - the amount to add, not null
     * @return {Temporal} an object of the same type with the specified adjustment made, not null
     * @throws DateTimeException - if the addition cannot be made
     * @throws ArithmeticException - if numeric overflow occurs
     */
    _plusAmount(amount) {
        requireNonNull(amount, 'amount');
        requireInstance(amount, TemporalAmount, 'amount');
        return amount.addTo(this);
    }

    /**
     * Returns an object of the same type as this object with the specified period added.
     * This method returns a new object based on this one with the specified period added. For example, on a {@link LocalDate}, this could be used to add a number of years, months or days. The returned object will have the same observable type as this object.
     *
     * In some cases, changing a field is not fully defined. For example, if the target object is a date representing the 31st January, then adding one month would be unclear. In cases like this, the field is responsible for resolving the result. Typically it will choose the previous valid date, which would be the last valid day of February in this example.
     *
     * If the implementation represents a date-time that has boundaries, such as {@link LocalTime}, then the permitted units must include the boundary unit, but no multiples of the boundary unit. For example, {@link LocalTime} must accept `DAYS` but not `WEEKS` or `MONTHS`.
     *
     * ### Specification for implementors
     * Implementations must check and handle all units defined in {@link ChronoUnit}. If the unit is supported, then the addition must be performed. If unsupported, then a {@link DateTimeException} must be thrown.
     * If the unit is not a {@link ChronoUnit}, then the result of this method is obtained by invoking `TemporalUnit.addTo(Temporal, long)` passing this as the first argument.
     *
     * Implementations must not alter either this object or the specified temporal object. Instead, an adjusted copy of the original must be returned. This provides equivalent, safe behavior for immutable and mutable implementations.
     *
     * @param {number} amountToAdd - the amount of the specified unit to add, may be negative
     * @param {TemporalUnit} unit - the unit of the period to add, not null
     * @return {Temporal} an object of the same type with the specified period added, not null
     * @throws DateTimeException - if the unit cannot be added
     * @throws ArithmeticException - if numeric overflow occurs
     */
    // eslint-disable-next-line no-unused-vars
    _plusUnit(amountToAdd, unit) {
        abstractMethodFail('_plusUnit');
    }

    /**
     * Calculates the period between this temporal and another temporal in terms of the specified unit.
     * This calculates the period between two temporals in terms of a single unit. The start and end points are this and the specified temporal. The result will be negative if the end is before the start. For example, the period in hours between two temporal objects can be calculated using `startTime.until(endTime, HOURS)`.
     *
     * The calculation returns a whole number, representing the number of complete units between the two temporals. For example, the period in hours between the times 11:30 and 13:29 will only be one hour as it is one minute short of two hours.
     *
     * There are two equivalent ways of using this method. The first is to invoke this method directly. The second is to use `TemporalUnit.between(Temporal, Temporal)`:
     *
     * <pre>
     *    // these two lines are equivalent
     *    between = thisUnit.between(start, end);
     *    between = start.until(end, thisUnit);
     * </pre>
     *
     * The choice should be made based on which makes the code more readable.
     * For example, this method allows the number of days between two dates to be calculated:
     *
     * <pre>
     *    long daysBetween = DAYS.between(start, end);
     *    // or alternatively
     *    long daysBetween = start.until(end, DAYS);
     * </pre>
     *
     * ### Specification for implementors
     * Implementations must begin by checking to ensure that the input temporal object is of the same observable type as the implementation. They must then perform the calculation for all instances of {@link ChronoUnit}. A {@link DateTimeException} must be thrown for {@link ChronoUnit} instances that are unsupported.
     * If the unit is not a {@link ChronoUnit}, then the result of this method is obtained by invoking `TemporalUnit.between(Temporal, Temporal)` passing this as the first argument and the input temporal as the second argument.
     *
     * In summary, implementations must behave in a manner equivalent to this code:
     *
     * <pre>
     *   // check input temporal is the same type as this class
     *   if (unit instanceof ChronoUnit) {
     *     // if unit is supported, then calculate and return result
     *     // else throw DateTimeException for unsupported units
     *   }
     *   return unit.between(this, endTemporal);
     * </pre>
     *
     * The target object must not be altered by this method.
     *
     * @param {Temporal} endTemporal - the end temporal, of the same type as this object, not null
     * @param {TemporalUnit} unit - the unit to measure the period in, not null
     * @return {number} the amount of the period between this and the end
     * @throws DateTimeException - if the period cannot be calculated
     * @throws ArithmeticException - if numeric overflow occurs
     */
    // eslint-disable-next-line no-unused-vars
    until(endTemporal, unit) {
        abstractMethodFail('until');
    }

    /**
     * function overloading for {@link Temporal.with}
     *
     * Called with 1 (or less) arguments, p1 is expected to be a {@link TemporalAdjuster} and {@link Temporal.withAdjuster} is called.
     *
     * Otherwise {@link Temporal.withFieldValue} is called.
     *
     * @param {!(TemporalAdjuster|TemporalField)} adjusterOrField
     * @param {number} newValue
     * @return {Temporal}
     */
    with(adjusterOrField, newValue) {
        if (arguments.length < 2) {
            return this._withAdjuster(adjusterOrField);
        } else {
            return this._withField(adjusterOrField, newValue);
        }
    }

    /**
     * Returns an adjusted object of the same type as this object with the adjustment made.
     * This adjusts this date-time according to the rules of the specified adjuster. A simple adjuster might simply set the one of the fields, such as the year field. A more complex adjuster might set the date to the last day of the month. A selection of common adjustments is provided in {@link TemporalAdjusters}. These include finding the "last day of the month" and "next Wednesday". The adjuster is responsible for handling special cases, such as the varying lengths of month and leap years.
     *
     * Some example code indicating how and why this method is used:
     *
     * <pre>
     *   date = date.with(Month.JULY);        // most key classes implement TemporalAdjuster
     *   date = date.with(lastDayOfMonth());  // static import from TemporalAdjusters
     *   date = date.with(next(WEDNESDAY));   // static import from TemporalAdjusters and DayOfWeek
     * </pre>
     *
     * ### Specification for implementors
     * Implementations must not alter either this object. Instead, an adjusted copy of the original must be returned. This provides equivalent, safe behavior for immutable and mutable implementations.
     *
     * @param {TemporalAdjuster} adjuster - the adjuster to use, not null
     * @return {Temporal} an object of the same type with the specified adjustment made, not null
     * @throws DateTimeException - if unable to make the adjustment
     * @throws ArithmeticException - if numeric overflow occurs
     */
    _withAdjuster(adjuster) {
        requireNonNull(adjuster, 'adjuster');
        assert(typeof adjuster.adjustInto === 'function',
            'adjuster must be a TemporalAdjuster',
            IllegalArgumentException);
        return adjuster.adjustInto(this);
    }

    /**
     * Returns an object of the same type as this object with the specified field altered.
     * This returns a new object based on this one with the value for the specified field changed. For example, on a {@link LocalDate}, this could be used to set the year, month or day-of-month. The returned object will have the same observable type as this object.
     *
     * In some cases, changing a field is not fully defined. For example, if the target object is a date representing the 31st January, then changing the month to February would be unclear. In cases like this, the field is responsible for resolving the result. Typically it will choose the previous valid date, which would be the last valid day of February in this example.
     *
     * ### Specification for implementors
     * Implementations must check and handle all fields defined in {@link ChronoField}. If the field is supported, then the adjustment must be performed. If unsupported, then a {@link DateTimeException} must be thrown.
     * If the field is not a {@link ChronoField}, then the result of this method is obtained by invoking `TemporalField.adjustInto(Temporal, long)` passing this as the first argument.
     *
     * Implementations must not alter either this object or the specified temporal object. Instead, an adjusted copy of the original must be returned. This provides equivalent, safe behavior for immutable and mutable implementations.
     *
     * @param {TemporalField} field - the field to set in the result, not null
     * @param {number} newValue - the new value of the field in the result
     * @return {Temporal} an object of the same type with the specified field set, not null
     * @throws DateTimeException - if the field cannot be set
     * @throws ArithmeticException - if numeric overflow occurs
     */
    // eslint-disable-next-line no-unused-vars
    _withField(field, newValue) {
        abstractMethodFail('_withField');
    }
}

if (typeof Symbol !== 'undefined' && Symbol.toPrimitive) {
    Temporal.prototype[Symbol.toPrimitive] = function (hint) {
        // hint could be 'number', 'string' or 'default'. Only 'number'
        // should throw and 'default' is treated as 'string'.
        if (hint !== 'number') {
            return this.toString();
        }

        throw new TypeError(
            'A conversion from Temporal to a number is not allowed. ' +
            'To compare use the methods .equals(), .compareTo(), .isBefore() ' +
            'or one that is more suitable to your use case.'
        );
    };
}
