/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { requireNonNull, requireInstance } from '../assert';

import { ChronoField } from '../temporal/ChronoField';
import { ChronoUnit } from '../temporal/ChronoUnit';
import { DateTimeFormatter } from '../format/DateTimeFormatter';
import { TemporalQueries } from '../temporal/TemporalQueries';
import { Temporal } from '../temporal/Temporal';

import { LocalDate } from '../LocalDate';

/**
 * A date without time-of-day or time-zone in an arbitrary chronology, intended
 * for advanced globalization use cases.
 *
 * **Most applications should declare method signatures, fields and variables
 * as {@link LocalDate}, not this interface.**
 *
 * A {@link ChronoLocalDate} is the abstract representation of a date where the
 * {@link Chronology}, or calendar system, is pluggable.
 * The date is defined in terms of fields expressed by {@link TemporalField},
 * where most common implementations are defined in {@link ChronoField}.
 * The chronology defines how the calendar system operates and the meaning of
 * the standard fields.
 *
 * #### When to use this interface
 *
 * The design of the API encourages the use of {@link LocalDate} rather than this
 * interface, even in the case where the application needs to deal with multiple
 * calendar systems. The rationale for this is explored in the following documentation.
 *
 * The primary use case where this interface should be used is where the generic
 * type parameter `C` is fully defined as a specific chronology.
 * In that case, the assumptions of that chronology are known at development
 * time and specified in the code.
 *
 * When the chronology is defined in the generic type parameter as ? or otherwise
 * unknown at development time, the rest of the discussion below applies.
 *
 * To emphasize the point, declaring a method signature, field or variable as this
 * interface type can initially seem like the sensible way to globalize an application,
 * however it is usually the wrong approach.
 * As such, it should be considered an application-wide architectural decision to choose
 * to use this interface as opposed to {@link LocalDate}.
 *
 * #### Architectural issues to consider
 *
 * These are some of the points that must be considered before using this interface
 * throughout an application.
 *
 * 1) Applications using this interface, as opposed to using just {@link LocalDate},
 * face a significantly higher probability of bugs. This is because the calendar system
 * in use is not known at development time. A key cause of bugs is where the developer
 * applies assumptions from their day-to-day knowledge of the ISO calendar system
 * to code that is intended to deal with any arbitrary calendar system.
 * The section below outlines how those assumptions can cause problems
 * The primary mechanism for reducing this increased risk of bugs is a strong code review process.
 * This should also be considered a extra cost in maintenance for the lifetime of the code.
 *
 * 2) This interface does not enforce immutability of implementations.
 * While the implementation notes indicate that all implementations must be immutable
 * there is nothing in the code or type system to enforce this. Any method declared
 * to accept a {@link ChronoLocalDate} could therefore be passed a poorly or
 * maliciously written mutable implementation.
 *
 * 3) Applications using this interface  must consider the impact of eras.
 * {@link LocalDate} shields users from the concept of eras, by ensuring that `getYear()`
 * returns the proleptic year. That decision ensures that developers can think of
 * {@link LocalDate} instances as consisting of three fields - year, month-of-year and day-of-month.
 * By contrast, users of this interface must think of dates as consisting of four fields -
 * era, year-of-era, month-of-year and day-of-month. The extra era field is frequently
 * forgotten, yet it is of vital importance to dates in an arbitrary calendar system.
 * For example, in the Japanese calendar system, the era represents the reign of an Emperor.
 * Whenever one reign ends and another starts, the year-of-era is reset to one.
 *
 * 4) The only agreed international standard for passing a date between two systems
 * is the ISO-8601 standard which requires the ISO calendar system. Using this interface
 * throughout the application will inevitably lead to the requirement to pass the date
 * across a network or component boundary, requiring an application specific protocol or format.
 *
 * 5) Long term persistence, such as a database, will almost always only accept dates in the
 * ISO-8601 calendar system (or the related Julian-Gregorian). Passing around dates in other
 * calendar systems increases the complications of interacting with persistence.
 *
 * 6) Most of the time, passing a {@link ChronoLocalDate} throughout an application
 * is unnecessary, as discussed in the last section below.
 *
 * #### False assumptions causing bugs in multi-calendar system code
 *
 * As indicated above, there are many issues to consider when try to use and manipulate a
 * date in an arbitrary calendar system. These are some of the key issues.
 *
 * Code that queries the day-of-month and assumes that the value will never be more than
 * 31 is invalid. Some calendar systems have more than 31 days in some months.
 *
 * Code that adds 12 months to a date and assumes that a year has been added is invalid.
 * Some calendar systems have a different number of months, such as 13 in the Coptic or Ethiopic.
 *
 * Code that adds one month to a date and assumes that the month-of-year value will increase
 * by one or wrap to the next year is invalid. Some calendar systems have a variable number
 * of months in a year, such as the Hebrew.
 *
 * Code that adds one month, then adds a second one month and assumes that the day-of-month
 * will remain close to its original value is invalid. Some calendar systems have a large difference
 * between the length of the longest month and the length of the shortest month.
 * For example, the Coptic or Ethiopic have 12 months of 30 days and 1 month of 5 days.
 *
 * Code that adds seven days and assumes that a week has been added is invalid.
 * Some calendar systems have weeks of other than seven days, such as the French Revolutionary.
 *
 * Code that assumes that because the year of `date1` is greater than the year of `date2`
 * then `date1` is after `date2` is invalid. This is invalid for all calendar systems
 * when referring to the year-of-era, and especially untrue of the Japanese calendar system
 * where the year-of-era restarts with the reign of every new Emperor.
 *
 * Code that treats month-of-year one and day-of-month one as the start of the year is invalid.
 * Not all calendar systems start the year when the month value is one.
 *
 * In general, manipulating a date, and even querying a date, is wide open to bugs when the
 * calendar system is unknown at development time. This is why it is essential that code using
 * this interface is subjected to additional code reviews. It is also why an architectural
 * decision to avoid this interface type is usually the correct one.
 *
 * #### Using LocalDate instead
 *
 * The primary alternative to using this interface throughout your application is as follows.
 *
 * * Declare all method signatures referring to dates in terms of {@link LocalDate}.
 * * Either store the chronology (calendar system) in the user profile or lookup the chronology
 *   from the user locale.
 * * Convert the ISO {@link LocalDate} to and from the user's preferred calendar system during
 *   printing and parsing.
 *
 * This approach treats the problem of globalized calendar systems as a localization issue
 * and confines it to the UI layer. This approach is in keeping with other localization
 * issues in the java platform.
 *
 * As discussed above, performing calculations on a date where the rules of the calendar system
 * are pluggable requires skill and is not recommended.
 * Fortunately, the need to perform calculations on a date in an arbitrary calendar system
 * is extremely rare. For example, it is highly unlikely that the business rules of a library
 * book rental scheme will allow rentals to be for one month, where meaning of the month
 * is dependent on the user's preferred calendar system.
 *
 * A key use case for calculations on a date in an arbitrary calendar system is producing
 * a month-by-month calendar for display and user interaction. Again, this is a UI issue,
 * and use of this interface solely within a few methods of the UI layer may be justified.
 *
 * In any other part of the system, where a date must be manipulated in a calendar system
 * other than ISO, the use case will generally specify the calendar system to use.
 * For example, an application may need to calculate the next Islamic or Hebrew holiday
 * which may require manipulating the date.
 * This kind of use case can be handled as follows:
 *
 * * start from the ISO {@link LocalDate} being passed to the method
 * * convert the date to the alternate calendar system, which for this use case is known
 *   rather than arbitrary
 * * perform the calculation
 * * convert back to {@link LocalDate}
 *
 * Developers writing low-level frameworks or libraries should also avoid this interface.
 * Instead, one of the two general purpose access interfaces should be used.
 * Use {@link TemporalAccessor} if read-only access is required, or use {@link Temporal}
 * if read-write access is required.
 *
 * ### Specification for implementors
 *
 * This interface must be implemented with care to ensure other classes operate correctly.
 * All implementations that can be instantiated must be final, immutable and thread-safe.
 * Subclasses should be Serializable wherever possible.
 *
 * Additional calendar systems may be added to the system.
 * See {@link Chronology} for more details.
 *
 * In JDK 8, this is an interface with default methods.
 * Since there are no default methods in JDK 7, an abstract class is used.
 */
export class ChronoLocalDate extends Temporal {

    isSupported(fieldOrUnit) {
        if (fieldOrUnit instanceof ChronoField) {
            return fieldOrUnit.isDateBased();
        } else if (fieldOrUnit instanceof ChronoUnit) {
            return fieldOrUnit.isDateBased();
        }
        return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
    }

    query(query) {
        if (query === TemporalQueries.chronology()) {
            return this.chronology();
        } else if (query === TemporalQueries.precision()) {
            return ChronoUnit.DAYS;
        } else if (query === TemporalQueries.localDate()) {
            return LocalDate.ofEpochDay(this.toEpochDay());
        } else if (query === TemporalQueries.localTime() || query === TemporalQueries.zone() ||
                query === TemporalQueries.zoneId() || query === TemporalQueries.offset()) {
            return null;
        }
        return super.query(query);
    }

    adjustInto(temporal) {
        return temporal.with(ChronoField.EPOCH_DAY, this.toEpochDay());
    }
    /**
     * Formats this date using the specified formatter.
     *
     * This date will be passed to the formatter to produce a string.
     *
     * The default implementation must behave as follows:
     * <pre>
     *  return formatter.format(this);
     * </pre>
     *
     * @param {DateTimeFormatter} formatter  the formatter to use, not null
     * @return {String} the formatted date string, not null
     * @throws DateTimeException if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        requireInstance(formatter, DateTimeFormatter, 'formatter');
        return formatter.format(this);
    }
}
