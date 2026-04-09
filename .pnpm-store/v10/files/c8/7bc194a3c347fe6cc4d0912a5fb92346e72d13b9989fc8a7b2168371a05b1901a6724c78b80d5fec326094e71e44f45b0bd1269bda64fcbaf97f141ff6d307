// ----------------------------------------------------------------------------
//   TEMPORAL
// ----------------------------------------------------------------------------

/**
 * A field of date-time, such as month-of-year or hour-of-minute.
 *
 * Date and time is expressed using fields which partition the time-line into something meaningful
 * for humans. Implementations of this interface represent those fields.
 *
 * The most commonly used units are defined in `ChronoField`. Further fields are supplied in
 * `IsoFields`. Fields can also be written by application code by implementing this interface.
 */
export abstract class TemporalField {
    /** Checks if this field is supported by the temporal object. */
    abstract isSupportedBy(temporal: TemporalAccessor): boolean;
    /** Checks if this field represents a component of a date. */
    abstract isDateBased(): boolean;
    /** Checks if this field represents a component of a time. */
    abstract isTimeBased(): boolean;
    /** Gets the unit that the field is measured in. */
    abstract baseUnit(): TemporalUnit;
    /** Gets the range that the field is bound by. */
    abstract rangeUnit(): TemporalUnit;
    /** Gets the range of valid values for the field. */
    abstract range(): ValueRange;
    /**
     * Get the range of valid values for this field using the temporal object to
     * refine the result.
     */
    abstract rangeRefinedBy(temporal: TemporalAccessor): ValueRange;
    /** Gets the value of this field from the specified temporal object. */
    abstract getFrom(temporal: TemporalAccessor): number;
    /** Returns a copy of the specified temporal object with the value of this field set. */
    abstract adjustInto<R extends Temporal>(temporal: R, newValue: number): R;
    abstract name(): string;
    abstract displayName(/* TODO: locale */): string;
    abstract equals(other: any): boolean;
}

/**
 * A unit of date-time, such as Days or Hours.
 *
 * Measurement of time is built on units, such as years, months, days, hours, minutes and seconds.
 * Implementations of this interface represent those units.
 *
 * An instance of this interface represents the unit itself, rather than an amount of the unit.
 * See `Period` for a class that represents an amount in terms of the common units.
 *
 * The most commonly used units are defined in `ChronoUnit`. Further units are supplied in
 * `IsoFields`. Units can also be written by application code by implementing this interface.
 */
export abstract class TemporalUnit {
    /** Returns a copy of the specified temporal object with the specified period added. */
    abstract addTo<T extends Temporal>(temporal: T, amount: number): T;
    /**
     * Calculates the period in terms of this unit between two temporal objects of the same type.
     *
     * Returns the period between temporal1 and temporal2 in terms of this unit; a positive number
     * if `temporal2` is later than `temporal1`, negative if earlier.
     */
    abstract between(temporal1: Temporal, temporal2: Temporal): number;
    /** Gets the duration of this unit, which may be an estimate. */
    abstract duration(): Duration;
    /** Checks if this unit is date-based. */
    abstract isDateBased(): boolean;
    /** Checks if the duration of the unit is an estimate. */
    abstract isDurationEstimated(): boolean;
    /** Checks if this unit is supported by the specified temporal object. */
    abstract isSupportedBy(temporal: Temporal): boolean;
    /** Checks if this unit is time-based. */
    abstract isTimeBased(): boolean;
}

/**
 * The range of valid values for a date-time field.
 *
 * All TemporalField instances have a valid range of values. For example, the ISO day-of-month
 * runs from 1 to somewhere between 28 and 31. This class captures that valid range.
 *
 * It is important to be aware of the limitations of this class. Only the minimum and maximum
 * values are provided. It is possible for there to be invalid values within the outer range.
 * For example, a weird field may have valid values of 1, 2, 4, 6, 7, thus have a range of '1 - 7',
 * despite that fact that values 3 and 5 are invalid.
 *
 * Instances of this class are not tied to a specific field.
 */
export class ValueRange {
    static of(min: number, max: number): ValueRange;
    static of(min: number, maxSmallest: number, maxLargest: number): ValueRange;
    static of(minSmallest: number, minLargest: number, maxSmallest: number, maxLargest: number): ValueRange;

    private constructor();

    checkValidValue(value: number, field: TemporalField): number;
    checkValidIntValue(value: number, field: TemporalField): number;
    equals(other: any): boolean;
    hashCode(): number;
    isFixed(): boolean;
    isIntValue(): boolean;
    isValidIntValue(value: number): boolean;
    isValidValue(value: number): boolean;
    largestMinimum(): number;
    maximum(): number;
    minimum(): number;
    smallestMaximum(): number;
    toString(): string;
}

/**
 * Framework-level class defining an amount of time, such as "6 hours", "8 days" or
 * "2 years and 3 months".
 *
 * This is the base class type for amounts of time. An amount is distinct from a date or
 * time-of-day in that it is not tied to any specific point on the time-line.
 *
 * The amount can be thought of as a `Map` of `TemporalUnit` to `number`, exposed via
 * `units()` and `get()`. A simple case might have a single unit-value pair, such
 * as "6 hours". A more complex case may have multiple unit-value pairs, such as "7 years,
 * 3 months and 5 days".
 *
 * There are two common implementations. `Period` is a date-based implementation,
 * storing years, months and days. `Duration` is a time-based implementation, storing
 * seconds and nanoseconds, but providing some access using other duration based units such
 * as minutes, hours and fixed 24-hour days.
 *
 * This class is a framework-level class that should not be widely used in application code.
 * Instead, applications should create and pass around instances of concrete types, such as
 * `Period` and `Duration`.
 */
export abstract class TemporalAmount {
    /**
     * This adds to the specified temporal object using the logic encapsulated in the
     * implementing class.
     *
     * There are two equivalent ways of using this method. The first is to invoke this method
     * directly. The second is to use `Temporal.plus(TemporalAmount)`:
     *
     * ```
     * // these two lines are equivalent, but the second approach is recommended
     * dateTime = amount.addTo(dateTime);
     * dateTime = dateTime.plus(amount);
     * ```
     *
     * It is recommended to use the second approach, `plus(TemporalAmount)`, as it is a lot
     * clearer to read in code.
     */
    abstract addTo<T extends Temporal>(temporal: T): T;
    /** Gets the amount associated with the specified unit. */
    abstract get(unit: TemporalUnit): number;
    /** Gets the list of units, from largest to smallest, that fully define this amount. */
    abstract units(): TemporalUnit[];
    /**
     * This substract to the specified temporal object using the logic encapsulated in the
     * implementing class.
     *
     * There are two equivalent ways of using this method. The first is to invoke this method
     * directly. The second is to use `Temporal.minus(TemporalAmount)`:
     * ```
     * // these two lines are equivalent, but the second approach is recommended
     * dateTime = amount.substractFrom(dateTime);
     * dateTime = dateTime.minus(amount);
     * ```
     *
     * It is recommended to use the second approach, `minus(TemporalAmount)`, as it is a lot
     * clearer to read in code.
     */
    abstract subtractFrom<T extends Temporal>(temporal: T): T;
}

/**
 * Framework-level interface defining read-only access to a temporal object, such as a date, time,
 * offset or some combination of these.
 *
 * This is the base interface type for date, time and offset objects. It is implemented by those
 * classes that can provide information as fields or queries.
 *
 * Most date and time information can be represented as a number. These are modeled using
 * `TemporalField` with the number held using a long to handle large values. Year, month and
 * day-of-month are simple examples of fields, but they also include instant and offsets. See
 * `ChronoField` for the standard set of fields.
 *
 * Two pieces of date/time information cannot be represented by numbers, the chronology and the
 * time-zone. These can be accessed via queries using the static methods defined on
 * `TemporalQueries`.
 *
 * A sub-interface, `Temporal`, extends this definition to one that also supports adjustment and
 * manipulation on more complete temporal objects.
 *
 * This interface is a framework-level interface that should not be widely used in application code.
 * Instead, applications should create and pass around instances of concrete types, such as
 * `LocalDate`. There are many reasons for this, part of which is that implementations of this
 * interface may be in calendar systems other than ISO. See `ChronoLocalDate` for a fuller
 * discussion of the issues.
 */
export abstract class TemporalAccessor {
    /**
     * Gets the value of the specified field as an integer number.
     *
     * This queries the date-time for the value for the specified field. The returned value will
     * always be within the valid range of values for the field. If the date-time cannot return
     * the value, because the field is unsupported or for some other reason, an exception will
     * be thrown.
     */
    get(field: TemporalField): number;
    /**
     * Queries this date-time.
     *
     * This queries this date-time using the specified query strategy object.
     *
     * Queries are a key tool for extracting information from date-times. They exists to
     * externalize the process of querying, permitting different approaches, as per the strategy
     * design pattern. Examples might be a query that checks if the date is the day before
     * February 29th in a leap year, or calculates the number of days to your next birthday.
     *
     * The most common query implementations are method references, such as `LocalDate::FROM` and
     * `ZoneId::FROM`. Further implementations are on `TemporalQueries`. Queries may also be
     * defined by applications.
     */
    query<R>(query: TemporalQuery<R>): R | null;
    /**
     * Gets the range of valid values for the specified field.
     *
     * All fields can be expressed as an integer number. This method returns an object that
     * describes the valid range for that value. The value of this temporal object is used to
     * enhance the accuracy of the returned range. If the date-time cannot return the range,
     * because the field is unsupported or for some other reason, an exception will be thrown.
     *
     * Note that the result only describes the minimum and maximum valid values and it is
     * important not to read too much into them. For example, there could be values within the
     * range that are invalid for the field.
     */
    range(field: TemporalField): ValueRange;
    abstract getLong(field: TemporalField): number;
    /**
     * Checks if the specified field is supported.
     *
     * This checks if the date-time can be queried for the specified field. If false, then
     * calling the `range` and `get` methods will throw an exception.
     */
    abstract isSupported(field: TemporalField): boolean;
}

/**
 * Framework-level interface defining read-write access to a temporal object, such as a date, time,
 * offset or some combination of these.
 *
 * This is the base interface type for date, time and offset objects that are complete enough to be
 * manipulated using plus and minus. It is implemented by those classes that can provide and
 * manipulate information as fields or queries. See `TemporalAccessor` for the read-only version of
 * this interface.
 *
 * Most date and time information can be represented as a number. These are modeled using
 * `TemporalField` with the number held using a long to handle large values. Year, month and
 * day-of-month are simple examples of fields, but they also include instant and offsets. See
 * `ChronoField` for the standard set of fields.
 *
 * Two pieces of date/time information cannot be represented by numbers, the chronology and the
 * time-zone. These can be accessed via queries using the static methods defined on
 * `TemporalQueries`.
 *
 * This interface is a framework-level interface that should not be widely used in application code.
 * Instead, applications should create and pass around instances of concrete types, such as
 * `LocalDate`. There are many reasons for this, part of which is that implementations of this
 * interface may be in calendar systems other than ISO. See `ChronoLocalDate` for a fuller
 * discussion of the issues.
 */
export abstract class Temporal extends TemporalAccessor {
    minus(amountToSubtract: number, unit: TemporalUnit): Temporal;
    /**
     * Returns an object of the same type as this object with an amount subtracted.
     *
     * This adjusts this temporal, subtracting according to the rules of the specified amount.
     * The amount is typically a `Period` but may be any other type implementing `TemporalAmount`,
     * such as `Duration`.
     *
     * Some example code indicating how and why this method is used:
     * ```
     * date = date.minus(period);                  // subtract a Period instance
     * date = date.minus(duration);                // subtract a Duration instance
     * date = date.minus(workingDays(6));          // example user-written workingDays method
     * ```
     *
     * Note that calling plus followed by minus is not guaranteed to return the same date-time.
     */
    minus(amount: TemporalAmount): Temporal;
    plus(amountToAdd: number, unit: TemporalUnit): Temporal;
    /**
     * Returns an object of the same type as this object with an amount added.
     *
     * This adjusts this temporal, adding according to the rules of the specified amount. The
     * amount is typically a `Period` but may be any other type implementing `TemporalAmount`,
     * such as `Duration`.
     *
     * Some example code indicating how and why this method is used:
     * ```
     * date = date.plus(period);                  // add a Period instance
     * date = date.plus(duration);                // add a Duration instance
     * date = date.plus(workingDays(6));          // example user-written workingDays method
     * ```
     *
     * Note that calling plus followed by minus is not guaranteed to return the same date-time.
     */
    plus(amount: TemporalAmount): Temporal;
    /**
     * Returns an adjusted object of the same type as this object with the adjustment made.
     *
     * This adjusts this date-time according to the rules of the specified adjuster. A simple
     * adjuster might simply set the one of the fields, such as the year field. A more complex
     * adjuster might set the date to the last day of the month. A selection of common adjustments
     * is provided in `TemporalAdjusters`. These include finding the "last day of the month" and
     * "next Wednesday". The adjuster is responsible for handling special cases, such as the
     * varying lengths of month and leap years.
     *
     * Some example code indicating how and why this method is used:
     * ```
     * date = date.with(Month.JULY);        // most key classes implement TemporalAdjuster
     * date = date.with(lastDayOfMonth());  // static import from TemporalAdjusters
     * date = date.with(next(WEDNESDAY));   // static import from TemporalAdjusters and DayOfWeek
     * ```
     */
    with(adjuster: TemporalAdjuster): Temporal;
    /**
     * Returns an object of the same type as this object with the specified field altered.
     *
     * This returns a new object based on this one with the value for the specified field changed.
     * For example, on a `LocalDate`, this could be used to set the year, month or day-of-month.
     * The returned object will have the same observable type as this object.
     *
     * In some cases, changing a field is not fully defined. For example, if the target object is
     * a date representing the 31st January, then changing the month to February would be unclear.
     * In cases like this, the field is responsible for resolving the result. Typically it will
     * choose the previous valid date, which would be the last valid day of February in this
     * example.
     */
    with(field: TemporalField, newValue: number): Temporal;

    abstract isSupported(field: TemporalField): boolean;
    /**
     * Checks if the specified unit is supported.
     *
     * This checks if the date-time can be queried for the specified unit. If false, then calling
     * the plus and minus methods will throw an exception.
     */
    abstract isSupported(unit: TemporalUnit): boolean;

    /**
     * Calculates the period between this temporal and another temporal in terms of the
     * specified unit.
     *
     * This calculates the period between two temporals in terms of a single unit. The start
     * and end points are this and the specified temporal. The result will be negative if the
     * end is before the start. For example, the period in hours between two temporal objects
     * can be calculated using `startTime.until(endTime, HOURS)`.
     *
     * The calculation returns a whole number, representing the number of complete units between
     * the two temporals. For example, the period in hours between the times 11:30 and 13:29 will
     * only be one hour as it is one minute short of two hours.
     *
     * There are two equivalent ways of using this method. The first is to invoke this method
     * directly. The second is to use `TemporalUnit.between(Temporal, Temporal)`:
     * ```
     * // these two lines are equivalent
     * between = thisUnit.between(start, end);
     * between = start.until(end, thisUnit);
     * ```
     *
     * The choice should be made based on which makes the code more readable.
     *
     * For example, this method allows the number of days between two dates to be calculated:
     * ```
     * const daysBetween = DAYS.between(start, end);
     * // or alternatively
     * const daysBetween = start.until(end, DAYS);
     * ```
     */
    abstract until(endTemporal: Temporal, unit: TemporalUnit): number;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): Temporal;
    protected _minusAmount(amount: TemporalAmount): Temporal;
    protected _plusAmount(amount: TemporalAmount): Temporal;
    protected _withAdjuster(adjuster: TemporalAdjuster): Temporal;

    protected abstract _plusUnit(amountToAdd: number, unit: TemporalUnit): Temporal;
    protected abstract _withField(field: TemporalField, newValue: number): Temporal;
}

/**
 * Strategy for adjusting a temporal object.
 *
 * Adjusters are a key tool for modifying temporal objects. They exist to externalize the process
 * of adjustment, permitting different approaches, as per the strategy design pattern. Examples
 * might be an adjuster that sets the date avoiding weekends, or one that sets the date to the
 * last day of the month.
 *
 * There are two equivalent ways of using a `TemporalAdjuster`. The first is to invoke the method
 * on this interface directly. The second is to use `Temporal.with(TemporalAdjuster)`:
 *
 * ```
 * // these two lines are equivalent, but the second approach is recommended
 * temporal = thisAdjuster.adjustInto(temporal);
 * temporal = temporal.with(thisAdjuster);
 * ```
 *
 * It is recommended to use the second approach, `with(TemporalAdjuster)`, as it is a lot clearer
 * to read in code.
 *
 * See `TemporalAdjusters` for a standard set of adjusters, including finding the last day of
 * the month. Adjusters may also be defined by applications.
 */
export abstract class TemporalAdjuster {
    abstract adjustInto(temporal: Temporal): Temporal;
}

export abstract class TemporalQuery<R> {
    abstract queryFrom(temporal: TemporalAccessor): R;
}

/**
 A standard set of fields.
 *
 * This set of fields provide field-based access to manipulate a date, time or date-time.
 * The standard set of fields can be extended by implementing {@link TemporalField}.
 */
export class ChronoField extends TemporalField {
    /**
     * This represents concept of the count of
     * days within the period of a week where the weeks are aligned to the start of the month.
     * This field is typically used with `ALIGNED_WEEK_OF_MONTH`.
     */
    static ALIGNED_DAY_OF_WEEK_IN_MONTH: ChronoField;
    /**
     * This represents concept of the count of days
     * within the period of a week where the weeks are aligned to the start of the year.
     * This field is typically used with `ALIGNED_WEEK_OF_YEAR`.
     */
    static ALIGNED_DAY_OF_WEEK_IN_YEAR: ChronoField;
    /**
     * This represents concept of the count of weeks within
     * the period of a month where the weeks are aligned to the start of the month. This field
     * is typically used with `ALIGNED_DAY_OF_WEEK_IN_MONTH`.
     */
    static ALIGNED_WEEK_OF_MONTH: ChronoField;
    /**
     * his represents concept of the count of weeks within
     * the period of a year where the weeks are aligned to the start of the year. This field
     * is typically used with `ALIGNED_DAY_OF_WEEK_IN_YEAR`.
     */
    static ALIGNED_WEEK_OF_YEAR: ChronoField;
    /**
     * This counts the AM/PM within the day, from 0 (AM) to 1 (PM).
     */
    static AMPM_OF_DAY: ChronoField;
    /**
     * This counts the hour within the AM/PM, from 1 to 12.
     * This is the hour that would be observed on a standard 12-hour analog wall clock.
     */
    static CLOCK_HOUR_OF_AMPM: ChronoField;
    /**
     * This counts the hour within the AM/PM, from 1 to 24.
     * This is the hour that would be observed on a 24-hour analog wall clock.
     */
    static CLOCK_HOUR_OF_DAY: ChronoField;
    /**
     * This represents the concept of the day within the month.
     * In the default ISO calendar system, this has values from 1 to 31 in most months.
     * April, June, September, November have days from 1 to 30, while February has days from
     * 1 to 28, or 29 in a leap year.
     */
    static DAY_OF_MONTH: ChronoField;
    /**
     * This represents the standard concept of the day of the week.
     * In the default ISO calendar system, this has values from Monday (1) to Sunday (7).
     * The {@link DayOfWeek} class can be used to interpret the result.
     */
    static DAY_OF_WEEK: ChronoField;
    /**
     * This represents the concept of the day within the year.
     * In the default ISO calendar system, this has values from 1 to 365 in standard years and
     * 1 to 366 in leap years.
     */
    static DAY_OF_YEAR: ChronoField;
    /**
     * This field is the sequential count of days where
     * 1970-01-01 (ISO) is zero. Note that this uses the local time-line, ignoring offset and
     * time-zone.
     */
    static EPOCH_DAY: ChronoField;
    /**
     * This represents the concept of the era, which is the largest
     * division of the time-line. This field is typically used with `YEAR_OF_ERA`.
     *
     * In the default ISO calendar system, there are two eras defined, 'BCE' and 'CE'. The era
     * 'CE' is the one currently in use and year-of-era runs from 1 to the maximum value.
     * The era 'BCE' is the previous era, and the year-of-era runs backwards.
     */
    static ERA: ChronoField;
    /**
     * This counts the hour within the AM/PM, from 0 to 11.
     * This is the hour that would be observed on a standard 12-hour digital clock.
     */
    static HOUR_OF_AMPM: ChronoField;
    /**
     * This counts the hour within the day, from 0 to 23. This is
     * the hour that would be observed on a standard 24-hour digital clock.
     */
    static HOUR_OF_DAY: ChronoField;
    /**
     * This represents the concept of the sequential count of
     * seconds where `1970-01-01T00:00Z` (ISO) is zero. This field may be used with `NANO_OF_DAY`
     * to represent the fraction of the day.
     *
     * An Instant represents an instantaneous point on the time-line. On their own they have
     * no elements which allow a local date-time to be obtained. Only when paired with an offset
     * or time-zone can the local date or time be found. This field allows the seconds part of
     * the instant to be queried.
     */
    static INSTANT_SECONDS: ChronoField;
    /**
     * This counts the microsecond within the day, from `0` to
     * `(24 * 60 * 60 * 1_000_000) - 1`.
     *
     * This field is used to represent the micro-of-day handling any fraction of the second.
     * Implementations of {@link TemporalAccessor} should provide a value for this field if they
     * can return a value for `SECOND_OF_DAY` filling unknown precision with zero.
     *
     * When this field is used for setting a value, it should behave in the same way as
     * setting `NANO_OF_DAY` with the value multiplied by 1,000.
     */
    static MICRO_OF_DAY: ChronoField;
    /**
     * This counts the microsecond within the second, from 0 to 999,999.
     *
     * This field is used to represent the micro-of-second handling any fraction of the second.
     * Implementations of {@link TemporalAccessor} should provide a value for this field if they
     * can return a value for `SECOND_OF_MINUTE`, `SECOND_OF_DAY` or `INSTANT_SECONDS` filling
     * unknown precision with zero.
     */
    static MICRO_OF_SECOND: ChronoField;
    /**
     * This counts the millisecond within the day, from 0 to
     * `(24 * 60 * 60 * 1,000) - 1`.
     *
     * This field is used to represent the milli-of-day handling any fraction of the second.
     * Implementations of {@link TemporalAccessor} should provide a value for this field if they
     * can return a value for `SECOND_OF_DAY` filling unknown precision with zero.
     *
     * When this field is used for setting a value, it should behave in the same way as
     * setting `NANO_OF_DAY` with the value multiplied by 1,000,000.
     */
    static MILLI_OF_DAY: ChronoField;
    /**
     * This counts the millisecond within the second, from 0 to
     * 999.
     *
     * This field is used to represent the milli-of-second handling any fraction of the second.
     * Implementations of {@link TemporalAccessor} should provide a value for this field if they can
     * return a value for `SECOND_OF_MINUTE`, `SECOND_OF_DAY` or `INSTANT_SECONDS` filling unknown
     * precision with zero.
     *
     * When this field is used for setting a value, it should behave in the same way as
     * setting `NANO_OF_SECOND` with the value multiplied by 1,000,000.
     */
    static MILLI_OF_SECOND: ChronoField;
    /**
     * This counts the minute within the day, from 0 to `(24 * 60) - 1`.
     */
    static MINUTE_OF_DAY: ChronoField;
    /**
     * This counts the minute within the hour, from 0 to 59.
     */
    static MINUTE_OF_HOUR: ChronoField;
    /**
     * The month-of-year, such as March. This represents the concept
     * of the month within the year. In the default ISO calendar system, this has values from
     * January (1) to December (12).
     */
    static MONTH_OF_YEAR: ChronoField;
    /**
     * This counts the nanosecond within the day, from 0 to
     * `(24 * 60 * 60 * 1,000,000,000) - 1`.
     *
     * This field is used to represent the nano-of-day handling any fraction of the second.
     * Implementations of {@link TemporalAccessor} should provide a value for this field if they
     * can return a value for `SECOND_OF_DAY` filling unknown precision with zero.
     */
    static NANO_OF_DAY: ChronoField;
    /**
     * This counts the nanosecond within the second, from 0
     * to 999,999,999.
     *
     * This field is used to represent the nano-of-second handling any fraction of the second.
     * Implementations of {@link TemporalAccessor} should provide a value for this field if they
     * can return a value for `SECOND_OF_MINUTE`, `SECOND_OF_DAY` or `INSTANT_SECONDS` filling
     * unknown precision with zero.
     *
     * When this field is used for setting a value, it should set as much precision as the
     * object stores, using integer division to remove excess precision. For example, if the
     * {@link TemporalAccessor} stores time to millisecond precision, then the nano-of-second must
     * be divided by 1,000,000 before replacing the milli-of-second.
     */
    static NANO_OF_SECOND: ChronoField;
    /**
     * This represents the concept of the offset in seconds of
     * local time from UTC/Greenwich.
     *
     * A {@link ZoneOffset} represents the period of time that local time differs from
     * UTC/Greenwich. This is usually a fixed number of hours and minutes. It is equivalent to
     * the total amount of the offset in seconds. For example, during the winter Paris has an
     * offset of +01:00, which is 3600 seconds.
     */
    static OFFSET_SECONDS: ChronoField;
    /**
     * The proleptic-month, which counts months sequentially
     * from year 0.
     *
     * The first month in year zero has the value zero. The value increase for later months
     * and decrease for earlier ones. Note that this uses the local time-line, ignoring offset
     * and time-zone.
     */
    static PROLEPTIC_MONTH: ChronoField;
    /**
     * This counts the second within the day, from 0 to
     * (24 * 60 * 60) - 1.
     */
    static SECOND_OF_DAY: ChronoField;
    /**
     * This counts the second within the minute, from 0 to 59.
     */
    static SECOND_OF_MINUTE: ChronoField;
    /**
     * The proleptic year, such as 2012. This represents the concept of
     * the year, counting sequentially and using negative numbers. The proleptic year is not
     * interpreted in terms of the era.
     *
     * The standard mental model for a date is based on three concepts - year, month and day.
     * These map onto the `YEAR`, `MONTH_OF_YEAR` and `DAY_OF_MONTH` fields. Note that there is no
     * reference to eras. The full model for a date requires four concepts - era, year, month and
     * day. These map onto the `ERA`, `YEAR_OF_ERA`, `MONTH_OF_YEAR` and `DAY_OF_MONTH` fields.
     * Whether this field or `YEAR_OF_ERA` is used depends on which mental model is being used.
     */
    static YEAR: ChronoField;
    /**
     * This represents the concept of the year within the era. This
     * field is typically used with `ERA`. The standard mental model for a date is based on three
     * concepts - year, month and day. These map onto the `YEAR`, `MONTH_OF_YEAR` and
     * `DAY_OF_MONTH` fields. Note that there is no reference to eras. The full model for a date
     * requires four concepts - era, year, month and day. These map onto the `ERA`, `YEAR_OF_ERA`,
     * `MONTH_OF_YEAR` and `DAY_OF_MONTH` fields. Whether this field or `YEAR` is used depends on
     * which mental model is being used.
     *
     * In the default ISO calendar system, there are two eras defined, 'BCE' and 'CE'.
     * The era 'CE' is the one currently in use and year-of-era runs from 1 to the maximum value.
     * The era 'BCE' is the previous era, and the year-of-era runs backwards.
     *
     * For example, subtracting a year each time yield the following:
     * - year-proleptic 2 = 'CE' year-of-era 2
     * - year-proleptic 1 = 'CE' year-of-era 1
     * - year-proleptic 0 = 'BCE' year-of-era 1
     * - year-proleptic -1 = 'BCE' year-of-era 2
     *
     * Note that the ISO-8601 standard does not actually define eras. Note also that the
     * ISO eras do not align with the well-known AD/BC eras due to the change between the Julian
     * and Gregorian calendar systems.
     */
    static YEAR_OF_ERA: ChronoField;

    private constructor();

    isSupportedBy(temporal: TemporalAccessor): boolean;
    baseUnit(): TemporalUnit;
    /** Checks that the specified value is valid for this field. */
    checkValidValue(value: number): number;
    /**
     * Checks that the specified value is valid for this field and
     * is within the range of a safe integer.
     */
    checkValidIntValue(value: number): number;
    displayName(): string;
    equals(other: any): boolean;
    getFrom(temporal: TemporalAccessor): number;
    isDateBased(): boolean;
    isTimeBased(): boolean;
    name(): string;
    range(): ValueRange;
    rangeRefinedBy(temporal: TemporalAccessor): ValueRange;
    rangeUnit(): TemporalUnit;
    adjustInto<R extends Temporal>(temporal: R, newValue: number): R;
    toString(): string;
}

/**
 * A standard set of date periods units.
 *
 * This set of units provide unit-based access to manipulate a date, time or date-time.
 * The standard set of units can be extended by implementing TemporalUnit.
 */
export class ChronoUnit extends TemporalUnit {
    /**
     * Unit that represents the concept of a nanosecond, the smallest supported unit
     * of time. For the ISO calendar system, it is equal to the 1,000,000,000th part of the second unit.
     */
    static NANOS: ChronoUnit;
    /**
     * Unit that represents the concept of a microsecond. For the ISO calendar
     * system, it is equal to the 1,000,000th part of the second unit.
     */
    static MICROS: ChronoUnit;
    /**
     * Unit that represents the concept of a millisecond. For the ISO calendar
     * system, it is equal to the 1000th part of the second unit.
     */
    static MILLIS: ChronoUnit;
    /**
     * Unit that represents the concept of a second. For the ISO calendar system,
     * it is equal to the second in the SI system of units, except around a leap-second.
     */
    static SECONDS: ChronoUnit;
    /**
     * Unit that represents the concept of a minute. For the ISO calendar system,
     * it is equal to 60 seconds.
     */
    static MINUTES: ChronoUnit;
    /**
     * Unit that represents the concept of an hour. For the ISO calendar system,
     * it is equal to 60 minutes.
     */
    static HOURS: ChronoUnit;
    /**
     * Unit that represents the concept of half a day, as used in AM/PM. For
     * the ISO calendar system, it is equal to 12 hours.
     */
    static HALF_DAYS: ChronoUnit;
    /**
     * Unit that represents the concept of a day. For the ISO calendar system, it
     * is the standard day from midnight to midnight. The estimated duration of a day is 24 Hours.
     */
    static DAYS: ChronoUnit;
    /**
     * Unit that represents the concept of a week. For the ISO calendar system,
     * it is equal to 7 Days.
     */
    static WEEKS: ChronoUnit;
    /**
     * Unit that represents the concept of a month. For the ISO calendar system,
     * the length of the month varies by month-of-year. The estimated duration of a month is
     * one twelfth of 365.2425 Days.
     */
    static MONTHS: ChronoUnit;
    /**
     * Unit that represents the concept of a year. For the ISO calendar system, it
     * is equal to 12 months. The estimated duration of a year is 365.2425 Days.
     */
    static YEARS: ChronoUnit;
    /**
     * Unit that represents the concept of a decade. For the ISO calendar system,
     * it is equal to 10 years.
     */
    static DECADES: ChronoUnit;
    /**
     * Unit that represents the concept of a century. For the ISO calendar
     * system, it is equal to 100 years.
     */
    static CENTURIES: ChronoUnit;
    /**
     * Unit that represents the concept of a millennium. For the ISO calendar
     * system, it is equal to 1,000 years.
     */
    static MILLENNIA: ChronoUnit;
    /**
     * Unit that represents the concept of an era. The ISO calendar system doesn't
     * have eras thus it is impossible to add an era to a date or date-time. The estimated duration
     * of the era is artificially defined as 1,000,000,000 Years.
     */
    static ERAS: ChronoUnit;
    /**
     * Artificial unit that represents the concept of forever. This is primarily
     * used with {@link TemporalField} to represent unbounded fields such as the year or era. The
     * estimated duration of the era is artificially defined as the largest duration supported by
     * {@link Duration}.
     */
    static FOREVER: ChronoUnit;

    private constructor();

    addTo<T extends Temporal>(temporal: T, amount: number): T;
    between(temporal1: Temporal, temporal2: Temporal): number;
    /**
     * Compares this ChronoUnit to the specified {@link TemporalUnit}.
     * The comparison is based on the total length of the durations.
     */
    compareTo(other: TemporalUnit): number;
    duration(): Duration;
    isDateBased(): boolean;
    isDurationEstimated(): boolean;
    isSupportedBy(temporal: Temporal): boolean;
    isTimeBased(): boolean;
    toString(): string;
}

/**
 * Fields and units specific to the ISO-8601 calendar system,
 * including quarter-of-year and week-based-year.
 */
export namespace IsoFields {
    /**
     * This field allows the day-of-quarter value to be queried and set. The day-of-quarter has
     * values from 1 to 90 in Q1 of a standard year, from 1 to 91 in Q1 of a leap year, from
     * 1 to 91 in Q2 and from 1 to 92 in Q3 and Q4.
     *
     * The day-of-quarter can only be calculated if the day-of-year, month-of-year and year are available.
     *
     * When setting this field, the value is allowed to be partially lenient, taking any value from
     * 1 to 92. If the quarter has less than 92 days, then day 92, and potentially day 91, is in
     * the following quarter.
     */
    export const DAY_OF_QUARTER: TemporalField;
    /**
     * This field allows the quarter-of-year value to be queried and set. The quarter-of-year has
     * values from 1 to 4.
     *
     * The day-of-quarter can only be calculated if the month-of-year is available.
     */
    export const QUARTER_OF_YEAR: TemporalField;
    /**
     * The field that represents the week-of-week-based-year.
     */
    export const WEEK_OF_WEEK_BASED_YEAR: TemporalField;
    /**
     * The field that represents the week-based-year.
     */
    export const WEEK_BASED_YEAR: TemporalField;
    /**
     * The unit that represents week-based-years for the purpose of addition and subtraction.
     *
     * This allows a number of week-based-years to be added to, or subtracted from, a date.
     * The unit is equal to either 52 or 53 weeks. The estimated duration of a week-based-year is
     * the same as that of a standard ISO year at 365.2425 Days.
     *
     * The rules for addition add the number of week-based-years to the existing value for the
     * week-based-year field. If the resulting week-based-year only has 52 weeks, then the date
     * will be in week 1 of the following week-based-year.
     */
    export const WEEK_BASED_YEARS: TemporalUnit;
    /**
     * Unit that represents the concept of a quarter-year. For the ISO calendar system, it is equal
     * to 3 months. The estimated duration of a quarter-year is one quarter of 365.2425 days.
     */
    export const QUARTER_YEARS: TemporalUnit;
}

export namespace TemporalAdjusters {
    /**
     * Returns the day-of-week in month adjuster, which returns a new date in the same month with
     * the ordinal day-of-week. This is used for expressions like the 'second Tuesday in March'.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-12-15 for (1,TUESDAY) will return 2011-12-06.
     * - The input 2011-12-15 for (2,TUESDAY) will return 2011-12-13.
     * - The input 2011-12-15 for (3,TUESDAY) will return 2011-12-20.
     * - The input 2011-12-15 for (4,TUESDAY) will return 2011-12-27.
     * - The input 2011-12-15 for (5,TUESDAY) will return 2012-01-03.
     * - The input 2011-12-15 for (-1,TUESDAY) will return 2011-12-27 (last in month).
     * - The input 2011-12-15 for (-4,TUESDAY) will return 2011-12-06 (3 weeks before last in month).
     * - The input 2011-12-15 for (-5,TUESDAY) will return 2011-11-29 (4 weeks before last in month).
     * - The input 2011-12-15 for (0,TUESDAY) will return 2011-11-29 (last in previous month).
     *
     * For a positive or zero ordinal, the algorithm is equivalent to finding the first day-of-week
     * that matches within the month and then adding a number of weeks to it. For a negative
     * ordinal, the algorithm is equivalent to finding the last day-of-week that matches within the
     * month and then subtracting a number of weeks to it. The ordinal number of weeks is not
     * validated and is interpreted leniently according to this algorithm. This definition means
     * that an ordinal of zero finds the last matching day-of-week in the previous month.
     *
     * The behavior is suitable for use with most calendar systems. It uses the `DAY_OF_WEEK`
     * and `DAY_OF_MONTH` fields and the `DAYS` unit, and assumes a seven day week.
     */
    function dayOfWeekInMonth(ordinal: number, dayOfWeek: DayOfWeek): TemporalAdjuster;
    /**
     * Returns the "first day of month" adjuster, which returns a new date set to the first day
     * of the current month.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 will return 2011-01-01.
     * - The input 2011-02-15 will return 2011-02-01.
     *
     * The behavior is suitable for use with most calendar systems. It is equivalent to:
     * ```
     * temporal.with(DAY_OF_MONTH, 1);
     * ```
     */
    function firstDayOfMonth(): TemporalAdjuster;
    /**
     * Returns the "first day of next month" adjuster, which returns a new date set to the first
     * day of the next month.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 will return 2011-02-01.
     * - The input 2011-02-15 will return 2011-03-01.
     *
     * The behavior is suitable for use with most calendar systems. It is equivalent to:
     * ```
     * temporal.with(DAY_OF_MONTH, 1).plus(1, MONTHS);
     * ```
     */
    function firstDayOfNextMonth(): TemporalAdjuster;
    /**
     * Returns the "first day of next year" adjuster, which returns a new date set to the first
     * day of the next year.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 will return 2012-01-01.
     *
     * The behavior is suitable for use with most calendar systems. It is equivalent to:
     * ```
     * temporal.with(DAY_OF_YEAR, 1).plus(1, YEARS);
     * ```
     */
    function firstDayOfNextYear(): TemporalAdjuster;
    /**
     * Returns the "first day of year" adjuster, which returns a new date set to the first day
     * of the current year.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 will return 2011-01-01.
     * - The input 2011-02-15 will return 2011-01-01.
     *
     * The behavior is suitable for use with most calendar systems. It is equivalent to:
     * ```
     * temporal.with(DAY_OF_YEAR, 1);
     * ```
     */
    function firstDayOfYear(): TemporalAdjuster;
    /**
     * Returns the first in month adjuster, which returns a new date in the same month with the
     * first matching day-of-week. This is used for expressions like 'first Tuesday in March'.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-12-15 for (MONDAY) will return 2011-12-05.
     * - The input 2011-12-15 for (FRIDAY) will return 2011-12-02.
     *
     * The behavior is suitable for use with most calendar systems. It uses the `DAY_OF_WEEK`
     * and `DAY_OF_MONTH` fields and the `DAYS` unit, and assumes a seven day week.
     */
    function firstInMonth(dayOfWeek: DayOfWeek): TemporalAdjuster;
    /**
     * Returns the "last day of month" adjuster, which returns a new date set to the last day of
     * the current month.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 will return 2011-01-31.
     * - The input 2011-02-15 will return 2011-02-28.
     * - The input 2012-02-15 will return 2012-02-29 (leap year).
     * - The input 2011-04-15 will return 2011-04-30.
     *
     * The behavior is suitable for use with most calendar systems. It is equivalent to:
     * ```
     * const lastDay = temporal.range(DAY_OF_MONTH).getMaximum();
     * temporal.with(DAY_OF_MONTH, lastDay);
     * ```
     */
    function lastDayOfMonth(): TemporalAdjuster;
    /**
     * Returns the "last day of year" adjuster, which returns a new date set to the last day of
     * the current year.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 will return 2011-12-31.
     * - The input 2011-02-15 will return 2011-12-31.
     *
     * The behavior is suitable for use with most calendar systems. It is equivalent to:
     * ```
     * const lastDay = temporal.range(DAY_OF_YEAR).getMaximum();
     * temporal.with(DAY_OF_YEAR, lastDay);
     * ```
     */
    function lastDayOfYear(): TemporalAdjuster;
    /**
     * Returns the last in month adjuster, which returns a new date in the same month with the
     * last matching day-of-week. This is used for expressions like 'last Tuesday in March'.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-12-15 for (MONDAY) will return 2011-12-26.
     * - The input 2011-12-15 for (FRIDAY) will return 2011-12-30.
     *
     * The behavior is suitable for use with most calendar systems. It uses the `DAY_OF_WEEK`
     * and `DAY_OF_MONTH` fields and the `DAYS` unit, and assumes a seven day week.
     */
    function lastInMonth(dayOfWeek: DayOfWeek): TemporalAdjuster;
    /**
     * Returns the next day-of-week adjuster, which adjusts the date to the first occurrence of
     * the specified day-of-week after the date being adjusted.
     *
     * - The ISO calendar system behaves as follows:
     * - The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-17 (two
     * days later).
     * - The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-19 (four
     * days later).
     * - The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-22 (seven
     * days later).
     *
     * The behavior is suitable for use with most calendar systems. It uses the `DAY_OF_WEEK`
     * field and the `DAYS` unit, and assumes a seven day week.
     */
    function next(dayOfWeek: DayOfWeek): TemporalAdjuster;
    /**
     * Returns the next-or-same day-of-week adjuster, which adjusts the date to the first
     * occurrence of the specified day-of-week after the date being adjusted unless it is already
     * on that day in which case the same object is returned.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-17 (two
     * days later).
     * - The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-19 (four
     * days later).
     * - The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-15 (same
     * as input).
     *
     * The behavior is suitable for use with most calendar systems. It uses the `DAY_OF_WEEK`
     * field and the `DAYS` unit, and assumes a seven day week.
     */
    function nextOrSame(dayOfWeek: DayOfWeek): TemporalAdjuster;
    /**
     * Returns the previous day-of-week adjuster, which adjusts the date to the first occurrence
     * of the specified day-of-week before the date being adjusted.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-10 (five
     * days earlier).
     * - The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-12 (three
     * days earlier).
     * - The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-08 (seven
     * days earlier).
     *
     * The behavior is suitable for use with most calendar systems. It uses the `DAY_OF_WEEK` field
     * and the `DAYS` unit, and assumes a seven day week.
     */
    function previous(dayOfWeek: DayOfWeek): TemporalAdjuster;
    /**
     * Returns the previous-or-same day-of-week adjuster, which adjusts the date to the first
     * occurrence of the specified day-of-week before the date being adjusted unless it is already
     * on that day in which case the same object is returned.
     *
     * The ISO calendar system behaves as follows:
     * - The input 2011-01-15 (a Saturday) for parameter (MONDAY) will return 2011-01-10 (five
     * days earlier).
     * - The input 2011-01-15 (a Saturday) for parameter (WEDNESDAY) will return 2011-01-12 (three
     * days earlier).
     * - The input 2011-01-15 (a Saturday) for parameter (SATURDAY) will return 2011-01-15 (same
     * as input).
     *
     * The behavior is suitable for use with most calendar systems. It uses the `DAY_OF_WEEK`
     * field and the `DAYS` unit, and assumes a seven day week.
     */
    function previousOrSame(dayOfWeek: DayOfWeek): TemporalAdjuster;
}

export namespace TemporalQueries {
    function chronology(): TemporalQuery<Chronology | null>;
    function localDate(): TemporalQuery<LocalDate | null>;
    function localTime(): TemporalQuery<LocalTime | null>;
    function offset(): TemporalQuery<ZoneOffset | null>;
    function precision(): TemporalQuery<TemporalUnit | null>;
    function zone(): TemporalQuery<ZoneId | null>;
    function zoneId(): TemporalQuery<ZoneId | null>;
}

// ----------------------------------------------------------------------------
//   MAIN
// ----------------------------------------------------------------------------

export abstract class Clock {
    static fixed(fixedInstant: Instant, zoneId: ZoneId): Clock;
    static offset(baseClock: Clock, offsetDuration: Duration): Clock;
    static system(zone: ZoneId): Clock;
    static systemDefaultZone(): Clock;
    static systemUTC(): Clock;

    abstract equals(other: any): boolean;
    abstract instant(): Instant;
    abstract millis(): number;
    abstract withZone(zone: ZoneId): Clock;
    abstract zone(): ZoneId;
}

export class Duration extends TemporalAmount {
    static ZERO: Duration;

    static between(startInclusive: Temporal, endExclusive: Temporal): Duration;
    static from(amount: TemporalAmount): Duration;
    static of(amount: number, unit: TemporalUnit): Duration;
    static ofDays(days: number): Duration;
    static ofHours(hours: number): Duration;
    static ofMillis(millis: number): Duration;
    static ofMinutes(minutes: number): Duration;
    static ofNanos(nanos: number): Duration;
    static ofSeconds(seconds: number, nanoAdjustment?: number): Duration;
    static parse(text: string): Duration;

    private constructor();

    abs(): Duration;
    addTo<T extends Temporal>(temporal: T): T;
    compareTo(otherDuration: Duration): number;
    dividedBy(divisor: number): Duration;
    equals(other: any): boolean;
    get(unit: TemporalUnit): number;
    isNegative(): boolean;
    isZero(): boolean;
    minus(amount: number, unit: TemporalUnit): Duration;
    minus(duration: Duration): Duration;
    minusDays(daysToSubtract: number): Duration;
    minusHours(hoursToSubtract: number): Duration;
    minusMillis(millisToSubtract: number): Duration;
    minusMinutes(minutesToSubtract: number): Duration;
    minusNanos(nanosToSubtract: number): Duration;
    minusSeconds(secondsToSubtract: number): Duration;
    multipliedBy(multiplicand: number): Duration;
    nano(): number;
    negated(): Duration;
    plus(amount: number, unit: TemporalUnit): Duration;
    plus(duration: Duration): Duration;
    plusDays(daysToAdd: number): Duration;
    plusDuration(duration: Duration): Duration;
    plusHours(hoursToAdd: number): Duration;
    plusMillis(millisToAdd: number): Duration;
    plusMinutes(minutesToAdd: number): Duration;
    plusNanos(nanosToAdd: number): Duration;
    plusSeconds(secondsToAdd: number): Duration;
    plusSecondsNanos(secondsToAdd: number, nanosToAdd: number): Duration;
    seconds(): number;
    subtractFrom<T extends Temporal>(temporal: T): T;
    toDays(): number;
    toHours(): number;
    toJSON(): string;
    toMillis(): number;
    toMinutes(): number;
    toNanos(): number;
    toHoursPart(): number;
    toMinutesPart(): number;
    toSecondsPart(): number;
    toMillisPart(): number;
    toString(): string;
    units(): TemporalUnit[];
    withNanos(nanoOfSecond: number): Duration;
    withSeconds(seconds: number): Duration;
}

export class Instant extends Temporal implements TemporalAdjuster {
    static EPOCH: Instant;
    static MIN: Instant;
    static MAX: Instant;
    static MIN_SECONDS: Instant;
    static MAX_SECONDS: Instant;

    static FROM: TemporalQuery<Instant>;

    static from(temporal: TemporalAccessor): Instant;
    static now(clock?: Clock): Instant;
    static ofEpochMicro(epochMicro: number): Instant;
    static ofEpochMilli(epochMilli: number): Instant;
    static ofEpochSecond(epochSecond: number, nanoAdjustment?: number): Instant;
    static parse(text: string): Instant;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    atOffset(offset: ZoneOffset): OffsetDateTime;
    atZone(zone: ZoneId): ZonedDateTime;
    compareTo(otherInstant: Instant): number;
    epochSecond(): number;
    equals(other: any): boolean;
    getLong(field: TemporalField): number;
    hashCode(): number;
    isAfter(otherInstant: Instant): boolean;
    isBefore(otherInstant: Instant): boolean;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    minus(amountToSubtract: number, unit: TemporalUnit): Instant;
    minus(amount: TemporalAmount): Instant;
    minusMicros(microsToSubtract: number): Instant;
    minusMillis(millisToSubtract: number): Instant;
    minusNanos(nanosToSubtract: number): Instant;
    minusSeconds(secondsToSubtract: number): Instant;
    nano(): number;
    plus(amountToAdd: number, unit: TemporalUnit): Instant;
    plus(amount: TemporalAmount): Instant;
    plusMicros(microsToAdd: number): Instant;
    plusMillis(millisToAdd: number): Instant;
    plusNanos(nanosToAdd: number): Instant;
    plusSeconds(secondsToAdd: number): Instant;
    toEpochMilli(): number;
    toJSON(): string;
    toString(): string;
    truncatedTo(unit: TemporalUnit): Instant;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): Instant;
    with(field: TemporalField, newValue: number): Instant;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): Instant;
    protected _minusAmount(amount: TemporalAmount): Instant;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): Instant;
    protected _plusAmount(amount: TemporalAmount): Instant;
    protected _withAdjuster(adjuster: TemporalAdjuster): Instant;
    protected _withField(field: TemporalField, newValue: number): Instant;
}

export class LocalDate extends ChronoLocalDate implements TemporalAdjuster {
    static MIN: LocalDate;
    static MAX: LocalDate;
    static EPOCH_0: LocalDate;

    static FROM: TemporalQuery<LocalDate>;

    static from(temporal: TemporalAccessor): LocalDate;
    static now(clockOrZone?: Clock | ZoneId): LocalDate;
    static of(year: number, month: Month | number, dayOfMonth: number): LocalDate;
    static ofEpochDay(epochDay: number): LocalDate;
    static ofInstant(instant: Instant, zoneId?: ZoneId): LocalDate;
    static ofYearDay(year: number, dayOfYear: number): LocalDate;
    static parse(text: string, formatter?: DateTimeFormatter): LocalDate;

    private constructor();

    atStartOfDay(): LocalDateTime;
    atStartOfDay(zone: ZoneId): ZonedDateTime;
    atTime(hour: number, minute: number, second?: number, nanoOfSecond?: number): LocalDateTime;
    atTime(time: LocalTime): LocalDateTime;
    atTime(time: OffsetTime): OffsetDateTime;
    chronology(): Chronology;
    compareTo(other: LocalDate): number;
    dayOfMonth(): number;
    dayOfWeek(): DayOfWeek;
    dayOfYear(): number;
    equals(other: any): boolean;
    getLong(field: TemporalField): number;
    hashCode(): number;
    isAfter(other: LocalDate): boolean;
    isBefore(other: LocalDate): boolean;
    isEqual(other: LocalDate): boolean;
    isLeapYear(): boolean;
    isoWeekOfWeekyear(): number;
    isoWeekyear(): number;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    lengthOfMonth(): number;
    lengthOfYear(): number;
    minus(amountToSubtract: number, unit: TemporalUnit): LocalDate;
    minus(amount: TemporalAmount): LocalDate;
    minusDays(daysToSubtract: number): LocalDate;
    minusMonths(monthsToSubtract: number): LocalDate;
    minusWeeks(weeksToSubtract: number): LocalDate;
    minusYears(yearsToSubtract: number): LocalDate;
    month(): Month;
    monthValue(): number;
    plus(amountToAdd: number, unit: TemporalUnit): LocalDate;
    plus(amount: TemporalAmount): LocalDate;
    plusDays(daysToAdd: number): LocalDate;
    plusMonths(monthsToAdd: number): LocalDate;
    plusWeeks(weeksToAdd: number): LocalDate;
    plusYears(yearsToAdd: number): LocalDate;
    toEpochDay(): number;
    toJSON(): string;
    toString(): string;
    until(endDate: TemporalAccessor): Period;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): LocalDate;
    with(field: TemporalField, newValue: number): LocalDate;
    withDayOfMonth(dayOfMonth: number): LocalDate;
    withDayOfYear(dayOfYear: number): LocalDate;
    withMonth(month: Month | number): LocalDate;
    withYear(year: number): LocalDate;
    year(): number;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): LocalDate;
    protected _minusAmount(amount: TemporalAmount): LocalDate;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): LocalDate;
    protected _plusAmount(amount: TemporalAmount): LocalDate;
    protected _withAdjuster(adjuster: TemporalAdjuster): LocalDate;
    protected _withField(field: TemporalField, newValue: number): LocalDate;
}

export class LocalDateTime extends ChronoLocalDateTime implements TemporalAdjuster {
    static MIN: LocalDateTime;
    static MAX: LocalDateTime;

    static FROM: TemporalQuery<LocalDateTime>;

    static from(temporal: TemporalAccessor): LocalDateTime;
    static now(clockOrZone?: Clock | ZoneId): LocalDateTime;
    static of(date: LocalDate, time: LocalTime): LocalDateTime;
    static of(year: number, month: Month | number, dayOfMonth: number, hour?: number, minute?: number, second?: number, nanoSecond?: number): LocalDateTime;
    static ofEpochSecond(epochSecond: number, nanoOfSecond: number, offset: ZoneOffset): LocalDateTime;
    static ofEpochSecond(epochSecond: number, offset: ZoneOffset): LocalDateTime;
    static ofInstant(instant: Instant, zoneId?: ZoneId): LocalDateTime;
    static parse(text: string, formatter?: DateTimeFormatter): LocalDateTime;

    private constructor();

    atOffset(offset: ZoneOffset): OffsetDateTime;
    atZone(zone: ZoneId): ZonedDateTime;
    compareTo(other: LocalDateTime): number;
    dayOfMonth(): number;
    dayOfWeek(): DayOfWeek;
    dayOfYear(): number;
    equals(other: any): boolean;
    format(formatter: DateTimeFormatter): string;
    getLong(field: TemporalField): number;
    hashCode(): number;
    hour(): number;
    isAfter(other: LocalDateTime): boolean;
    isBefore(other: LocalDateTime): boolean;
    isEqual(other: LocalDateTime): boolean;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    minus(amountToSubtract: number, unit: TemporalUnit): LocalDateTime;
    minus(amount: TemporalAmount): LocalDateTime;
    minusDays(days: number): LocalDateTime;
    minusHours(hours: number): LocalDateTime;
    minusMinutes(minutes: number): LocalDateTime;
    minusMonths(months: number): LocalDateTime;
    minusNanos(nanos: number): LocalDateTime;
    minusSeconds(seconds: number): LocalDateTime;
    minusWeeks(weeks: number): LocalDateTime;
    minusYears(years: number): LocalDateTime;
    minute(): number;
    month(): Month;
    monthValue(): number;
    nano(): number;
    plus(amountToAdd: number, unit: TemporalUnit): LocalDateTime;
    plus(amount: TemporalAmount): LocalDateTime;
    plusDays(days: number): LocalDateTime;
    plusHours(hours: number): LocalDateTime;
    plusMinutes(minutes: number): LocalDateTime;
    plusMonths(months: number): LocalDateTime;
    plusNanos(nanos: number): LocalDateTime;
    plusSeconds(seconds: number): LocalDateTime;
    plusWeeks(weeks: number): LocalDateTime;
    plusYears(years: number): LocalDateTime;
    second(): number;
    toJSON(): string;
    toLocalDate(): LocalDate;
    toLocalTime(): LocalTime;
    toString(): string;
    truncatedTo(unit: TemporalUnit): LocalDateTime;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): LocalDateTime;
    with(field: TemporalField, newValue: number): LocalDateTime;
    withDayOfMonth(dayOfMonth: number): LocalDateTime;
    withDayOfYear(dayOfYear: number): LocalDateTime;
    withHour(hour: number): LocalDateTime;
    withMinute(minute: number): LocalDateTime;
    withMonth(month: number | Month): LocalDateTime;
    withNano(nanoOfSecond: number): LocalDateTime;
    withSecond(second: number): LocalDateTime;
    withYear(year: number): LocalDateTime;
    year(): number;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): LocalDateTime;
    protected _minusAmount(amount: TemporalAmount): LocalDateTime;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): LocalDateTime;
    protected _plusAmount(amount: TemporalAmount): LocalDateTime;
    protected _withAdjuster(adjuster: TemporalAdjuster): LocalDateTime;
    protected _withField(field: TemporalField, newValue: number): LocalDateTime;
}

export class LocalTime extends Temporal implements TemporalAdjuster {
    static MIN: LocalTime;
    static MAX: LocalTime;
    static MIDNIGHT: LocalTime;
    static NOON: LocalTime;
    static HOURS_PER_DAY: number;
    static MINUTES_PER_HOUR: number;
    static MINUTES_PER_DAY: number;
    static SECONDS_PER_MINUTE: number;
    static SECONDS_PER_HOUR: number;
    static SECONDS_PER_DAY: number;
    static MILLIS_PER_DAY: number;
    static MICROS_PER_DAY: number;
    static NANOS_PER_SECOND: number;
    static NANOS_PER_MINUTE: number;
    static NANOS_PER_HOUR: number;
    static NANOS_PER_DAY: number;

    static FROM: TemporalQuery<LocalTime>;

    static from(temporal: TemporalAccessor): LocalTime;
    static now(clockOrZone?: Clock | ZoneId): LocalTime;
    static of(hour?: number, minute?: number, second?: number, nanoOfSecond?: number): LocalTime;
    static ofInstant(instant: Instant, zone?: ZoneId): LocalTime;
    static ofNanoOfDay(nanoOfDay: number): LocalTime;
    static ofSecondOfDay(secondOfDay?: number, nanoOfSecond?: number): LocalTime;
    static parse(text: String, formatter?: DateTimeFormatter): LocalTime;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    atDate(date: LocalDate): LocalDateTime;
    atOffset(offset: ZoneOffset): OffsetTime;
    compareTo(other: LocalTime): number;
    equals(other: any): boolean;
    format(formatter: DateTimeFormatter): string;
    getLong(field: ChronoField): number;
    hashCode(): number;
    hour(): number;
    isAfter(other: LocalTime): boolean;
    isBefore(other: LocalTime): boolean;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    minus(amountToSubtract: number, unit: TemporalUnit): LocalTime;
    minus(amount: TemporalAmount): LocalTime;
    minusHours(hoursToSubtract: number): LocalTime;
    minusMinutes(minutesToSubtract: number): LocalTime;
    minusNanos(nanosToSubtract: number): LocalTime;
    minusSeconds(secondsToSubtract: number): LocalTime;
    minute(): number;
    nano(): number;
    plus(amountToAdd: number, unit: TemporalUnit): LocalTime;
    plus(amount: TemporalAmount): LocalTime;
    plusHours(hoursToAdd: number): LocalTime;
    plusMinutes(minutesToAdd: number): LocalTime;
    plusNanos(nanosToAdd: number): LocalTime;
    plusSeconds(secondstoAdd: number): LocalTime;
    second(): number;
    toJSON(): string;
    toNanoOfDay(): number;
    toSecondOfDay(): number;
    toString(): string;
    truncatedTo(unit: ChronoUnit): LocalTime;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): LocalTime;
    with(field: TemporalField, newValue: number): LocalTime;
    withHour(hour: number): LocalTime;
    withMinute(minute: number): LocalTime;
    withNano(nanoOfSecond: number): LocalTime;
    withSecond(second: number): LocalTime;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): LocalTime;
    protected _minusAmount(amount: TemporalAmount): LocalTime;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): LocalTime;
    protected _plusAmount(amount: TemporalAmount): LocalTime;
    protected _withAdjuster(adjuster: TemporalAdjuster): LocalTime;
    protected _withField(field: TemporalField, newValue: number): LocalTime;
}

export class MonthDay extends TemporalAccessor implements TemporalAdjuster {
    static FROM: TemporalQuery<MonthDay>;

    static from(temporal: TemporalAccessor): MonthDay;
    static now(zoneIdOrClock?: ZoneId | Clock): MonthDay;
    static of(month: Month | number, dayOfMonth: number): MonthDay;
    static parse(text: string, formatter?: DateTimeFormatter): MonthDay;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    atYear(year: number): LocalDate;
    compareTo(other: MonthDay): number;
    dayOfMonth(): number;
    equals(other: any): boolean;
    format(formatter: DateTimeFormatter): string;
    getLong(field: TemporalField): number;
    isAfter(other: MonthDay): boolean;
    isBefore(other: MonthDay): boolean;
    isSupported(field: TemporalField): boolean;
    isValidYear(year: number): boolean;
    month(): Month;
    monthValue(): number;
    toJSON(): string;
    toString(): string;
    with(month: Month): MonthDay;
    withDayOfMonth(dayOfMonth: number): MonthDay;
    withMonth(month: number): MonthDay;
}

export class Period extends TemporalAmount {
    static ZERO: Period;

    static between(startDate: LocalDate, endDate: LocalDate): Period;
    static from(amount: TemporalAmount): Period;
    static of(years: number, months: number, days: number): Period;
    static ofDays(days: number): Period;
    static ofMonths(months: number): Period;
    static ofWeeks(weeks: number): Period;
    static ofYears(years: number): Period;
    static parse(text: string): Period;

    private constructor();

    addTo<T extends Temporal>(temporal: T): T;
    chronology(): IsoChronology;
    days(): number;
    equals(other: any): boolean;
    get(unit: TemporalUnit): number;
    hashCode(): number;
    isNegative(): boolean;
    isZero(): boolean;
    minus(amountToSubtract: TemporalAmount): Period;
    minusDays(daysToSubtract: number): Period;
    minusMonths(monthsToSubtract: number): Period;
    minusYears(yearsToSubtract: number): Period;
    months(): number;
    multipliedBy(scalar: number): Period;
    negated(): Period;
    normalized(): Period;
    plus(amountToAdd: TemporalAmount): Period;
    plusDays(daysToAdd: number): Period;
    plusMonths(monthsToAdd: number): Period;
    plusYears(yearsToAdd: number): Period;
    subtractFrom<T extends Temporal>(temporal: T): T;
    toJSON(): string;
    toString(): string;
    toTotalMonths(): number;
    units(): TemporalUnit[];
    withDays(days: number): Period;
    withMonths(months: number): Period;
    withYears(years: number): Period;
    years(): number;
}

export class Year extends Temporal implements TemporalAdjuster {
    static MIN_VALUE: number;
    static MAX_VALUE: number;

    static FROM: TemporalQuery<Year>;

    static from(temporal: TemporalAccessor): Year;
    static isLeap(year: number): boolean;
    static now(zoneIdOrClock?: ZoneId | Clock): Year;
    static of(isoYear: number): Year;
    static parse(text: string, formatter?: DateTimeFormatter): Year;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    atDay(dayOfYear: number): LocalDate;
    atMonth(month: Month | number): YearMonth;
    atMonthDay(monthDay: MonthDay): LocalDate;
    compareTo(other: Year): number;
    equals(other: any): boolean;
    getLong(field: TemporalField): number;
    isAfter(other: Year): boolean;
    isBefore(other: Year): boolean;
    isLeap(): boolean;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    isValidMonthDay(monthDay: MonthDay): boolean;
    length(): number;
    minus(amountToSubtract: number, unit: TemporalUnit): Year;
    minus(amount: TemporalAmount): Year;
    minusYears(yearsToSubtract: number): Year;
    plus(amountToAdd: number, unit: TemporalUnit): Year;
    plus(amount: TemporalAmount): Year;
    plusYears(yearsToAdd: number): Year;
    toJSON(): string;
    toString(): string;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    value(): number;
    with(adjuster: TemporalAdjuster): Year;
    with(field: TemporalField, newValue: number): Year;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): Year;
    protected _minusAmount(amount: TemporalAmount): Year;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): Year;
    protected _plusAmount(amount: TemporalAmount): Year;
    protected _withAdjuster(adjuster: TemporalAdjuster): Year;
    protected _withField(field: TemporalField, newValue: number): Year;
}

export class YearMonth extends Temporal implements TemporalAdjuster {
    static FROM: TemporalQuery<YearMonth>;

    static from(temporal: TemporalAccessor): YearMonth;
    static now(zoneIdOrClock?: ZoneId | Clock): YearMonth;
    static of(year: number, monthOrNumber: Month | number): YearMonth;
    static parse(text: string, formatter?: DateTimeFormatter): YearMonth;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    atDay(dayOfMonth: number): LocalDate;
    atEndOfMonth(): LocalDate;
    compareTo(other: YearMonth): number;
    equals(other: any): boolean;
    format(formatter: DateTimeFormatter): string;
    getLong(field: TemporalField): number;
    isAfter(other: YearMonth): boolean;
    isBefore(other: YearMonth): boolean;
    isLeapYear(): boolean;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    isValidDay(dayOfMonth: number): boolean;
    lengthOfMonth(): number;
    lengthOfYear(): number;
    minus(amountToSubtract: number, unit: TemporalUnit): YearMonth;
    minus(amount: TemporalAmount): YearMonth;
    minusMonths(monthsToSubtract: number): YearMonth;
    minusYears(yearsToSubtract: number): YearMonth;
    month(): Month;
    monthValue(): number;
    plus(amountToAdd: number, unit: TemporalUnit): YearMonth;
    plus(amount: TemporalAmount): YearMonth;
    plusMonths(monthsToAdd: number): YearMonth;
    plusYears(yearsToAdd: number): YearMonth;
    toJSON(): string;
    toString(): string;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): YearMonth;
    with(field: TemporalField, newValue: number): YearMonth;
    withMonth(month: number): YearMonth;
    withYear(year: number): YearMonth;
    year(): number;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): YearMonth;
    protected _minusAmount(amount: TemporalAmount): YearMonth;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): YearMonth;
    protected _plusAmount(amount: TemporalAmount): YearMonth;
    protected _withAdjuster(adjuster: TemporalAdjuster): YearMonth;
    protected _withField(field: TemporalField, newValue: number): YearMonth;
}

/**
 * A date-time with an offset from UTC/Greenwich in the ISO-8601 calendar system, such as
 * `2007-12-03T10:15:30+01:00`.
 *
 * `OffsetDateTime` is an immutable representation of a date-time with an offset. This class stores
 * all date and time fields, to a precision of nanoseconds, as well as the offset from
 * UTC/Greenwich. For example, the value "2nd October 2007 at 13:45:30.123456789 +02:00" can be
 * stored in an `OffsetDateTime`.
 *
 * `OffsetDateTime`, `ZonedDateTime` and `Instant` all store an instant on the time-line to
 * nanosecond precision. `Instant` is the simplest, simply representing the instant. `OffsetDateTime`
 * adds to the instant the offset from UTC/Greenwich, which allows the local date-time to be obtained.
 * `ZonedDateTime` adds full time-zone rules.
 *
 * It is intended that `ZonedDateTime` or `Instant` is used to model data in simpler applications. This
 * class may be used when modeling date-time concepts in more detail, or when communicating to a
 * database or in a network protocol.
 *
 * This is a value-based class; use of identity-sensitive operations (including reference equality
 * (`==`), identity hash code, or synchronization) on instances of `OffsetDateTime` may have
 * unpredictable results and should be avoided. The `equals` method should be used for comparisons.
 */
export class OffsetDateTime extends Temporal implements TemporalAdjuster {
    static MIN: OffsetDateTime;
    static MAX: OffsetDateTime;
    static FROM: TemporalQuery<OffsetDateTime>;

    static from(temporal: TemporalAccessor): OffsetDateTime
    static now(clockOrZone?: Clock | ZoneId): OffsetDateTime;
    static of(dateTime: LocalDateTime, offset: ZoneOffset): OffsetDateTime;
    static of(date: LocalDate, time: LocalTime, offset: ZoneOffset): OffsetDateTime;
    static of(year: number, month: number, day: number, hour: number, minute: number, second: number, nanoOfSecond: number, offset: ZoneOffset): OffsetDateTime;
    static ofInstant(instant: Instant, zone: ZoneId): OffsetDateTime;
    static parse(text: string, formatter?: DateTimeFormatter): OffsetDateTime;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    atZoneSameInstant(zone: ZoneId): ZonedDateTime;
    atZoneSimilarLocal(zone: ZoneId): ZonedDateTime;
    compareTo(other: OffsetDateTime): number;
    dayOfMonth(): number;
    dayOfWeek(): DayOfWeek;
    dayOfYear(): number;
    equals(other: any): boolean;
    format(formatter: DateTimeFormatter): string;
    getLong(field: TemporalField): number;
    hashCode(): number;
    hour(): number;
    isAfter(other: OffsetDateTime): boolean;
    isBefore(other: OffsetDateTime): boolean;
    isEqual(other: OffsetDateTime): boolean;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    minus(amountToSubtract: number, unit: TemporalUnit): OffsetDateTime;
    minus(amount: TemporalAmount): OffsetDateTime;
    minusDays(days: number): OffsetDateTime;
    minusHours(hours: number): OffsetDateTime;
    minusMinutes(minutes: number): OffsetDateTime;
    minusMonths(months: number): OffsetDateTime;
    minusNanos(nanos: number): OffsetDateTime;
    minusSeconds(seconds: number): OffsetDateTime;
    minusWeeks(weeks: number): OffsetDateTime;
    minusYears(years: number): OffsetDateTime;
    minute(): number;
    month(): Month;
    monthValue(): number;
    nano(): number;
    offset(): ZoneOffset;
    plus(amountToAdd: number, unit: TemporalUnit): OffsetDateTime;
    plus(amount: TemporalAmount): OffsetDateTime;
    plusDays(days: number): OffsetDateTime;
    plusHours(hours: number): OffsetDateTime;
    plusMinutes(minutes: number): OffsetDateTime;
    plusMonths(months: number): OffsetDateTime;
    plusNanos(nanos: number): OffsetDateTime;
    plusSeconds(seconds: number): OffsetDateTime;
    plusWeeks(weeks: number): OffsetDateTime;
    plusYears(years: number): OffsetDateTime;
    second(): number;
    toEpochSecond(): number;
    toInstant(): Instant;
    toJSON(): string;
    toLocalDate(): LocalDate;
    toLocalDateTime(): LocalDateTime;
    toLocalTime(): LocalTime;
    toOffsetTime(): OffsetTime;
    toString(): string;
    truncatedTo(unit: TemporalUnit): OffsetDateTime;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): OffsetDateTime;
    with(field: TemporalField, newValue: number): OffsetDateTime;
    withDayOfMonth(dayOfMonth: number): OffsetDateTime;
    withDayOfYear(dayOfYear: number): OffsetDateTime;
    withHour(hour: number): OffsetDateTime;
    withMinute(minute: number): OffsetDateTime;
    withMonth(month: number): OffsetDateTime;
    withNano(nanoOfSecond: number): OffsetDateTime;
    withOffsetSameInstant(offset: ZoneOffset): OffsetDateTime;
    withOffsetSameLocal(offset: ZoneOffset): OffsetDateTime;
    withSecond(second: number): OffsetDateTime;
    withYear(year: number): OffsetDateTime;
    year(): number;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): OffsetDateTime;
    protected _minusAmount(amount: TemporalAmount): OffsetDateTime;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): OffsetDateTime;
    protected _plusAmount(amount: TemporalAmount): OffsetDateTime;
    protected _withAdjuster(adjuster: TemporalAdjuster): OffsetDateTime;
    protected _withField(field: TemporalField, newValue: number): OffsetDateTime;
}

/**
 * A time with an offset from UTC/Greenwich in the ISO-8601 calendar system, such as `10:15:30+01:00`.
 *
 * `OffsetTime` is an immutable date-time object that represents a time, often viewed as
 * hour-minute-second-offset. This class stores all time fields, to a precision of nanoseconds, as
 * well as a zone offset. For example, the value "13:45:30.123456789+02:00" can be stored in an
 * `OffsetTime`.
 *
 * This is a value-based class; use of identity-sensitive operations (including reference equality
 * (`==`), identity hash code, or synchronization) on instances of `OffsetTime` may have
 * unpredictable results and should be avoided. The `equals` method should be used for comparisons.
 */
export class OffsetTime extends Temporal implements TemporalAdjuster {
    static MIN: OffsetTime;
    static MAX: OffsetTime;
    static FROM: TemporalQuery<OffsetTime>;

    static from(temporal: TemporalAccessor): OffsetTime
    static now(clockOrZone?: Clock | ZoneId): OffsetTime;
    static of(time: LocalTime, offset: ZoneOffset): OffsetTime;
    static of(hour: number, minute: number, second: number, nanoOfSecond: number, offset: ZoneOffset): OffsetTime;
    static ofInstant(instant: Instant, zone: ZoneId): OffsetTime;
    static parse(text: string, formatter?: DateTimeFormatter): OffsetTime;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    atDate(date: LocalDate): OffsetDateTime;
    compareTo(other: OffsetTime): number;
    equals(other: any): boolean;
    format(formatter: DateTimeFormatter): string;
    getLong(field: TemporalField): number;
    hashCode(): number;
    hour(): number;
    isAfter(other: OffsetTime): boolean;
    isBefore(other: OffsetTime): boolean;
    isEqual(other: OffsetTime): boolean;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    minus(amountToSubtract: number, unit: TemporalUnit): OffsetTime;
    minus(amount: TemporalAmount): OffsetTime;
    minusHours(hours: number): OffsetTime;
    minusMinutes(minutes: number): OffsetTime;
    minusNanos(nanos: number): OffsetTime;
    minusSeconds(seconds: number): OffsetTime;
    minute(): number;
    nano(): number;
    offset(): ZoneOffset;
    plus(amountToAdd: number, unit: TemporalUnit): OffsetTime;
    plus(amount: TemporalAmount): OffsetTime;
    plusHours(hours: number): OffsetTime;
    plusMinutes(minutes: number): OffsetTime;
    plusNanos(nanos: number): OffsetTime;
    plusSeconds(seconds: number): OffsetTime;
    second(): number;
    toJSON(): string;
    toLocalTime(): LocalTime;
    toString(): string;
    truncatedTo(unit: TemporalUnit): OffsetTime;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): OffsetTime;
    with(field: TemporalField, newValue: number): OffsetTime;
    withHour(hour: number): OffsetTime;
    withMinute(minute: number): OffsetTime;
    withNano(nanoOfSecond: number): OffsetTime;
    withOffsetSameInstant(offset: ZoneOffset): OffsetTime;
    withOffsetSameLocal(offset: ZoneOffset): OffsetTime;
    withSecond(second: number): OffsetTime;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): OffsetTime;
    protected _minusAmount(amount: TemporalAmount): OffsetTime;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): OffsetTime;
    protected _plusAmount(amount: TemporalAmount): OffsetTime;
    protected _withAdjuster(adjuster: TemporalAdjuster): OffsetTime;
    protected _withField(field: TemporalField, newValue: number): OffsetTime;
}

/**
 * A date-time with a time-zone in the ISO-8601 calendar system, such as
 * `2007-12-23T10:15:30+01:00 Europe/Paris`.
 *
 * `ZonedDateTime` is an immutable representation of a date-time with a time-zone. This class
 * stores all date and time fields, to a precision of nanoseconds, and a time-zone, with a zone
 * offset used to handle ambiguous local date-times. For example, the value "2nd October 2007 at
 * 13:45.30.123456789 +02:00 in the Europe/Paris time-zone" can be stored in a `ZonedDateTime`.
 *
 * This class handles conversion from the local time-line of `LocalDateTime` to the instant
 * time-line of `Instant`. The difference between the two time-lines is the offset from
 * UTC/Greenwich, represented by a `ZoneOffset`.
 *
 * Converting between the two time-lines involves calculating the offset using the rules accessed
 * from the `ZoneId`. Obtaining the offset for an instant is simple, as there is exactly one valid
 * offset for each instant. By contrast, obtaining the offset for a local date-time is not
 * straightforward. There are three cases:
 * - Normal, with one valid offset. For the vast majority of the year, the normal case applies,
 * where there is a single valid offset for the local date-time.
 * - Gap, with zero valid offsets. This is when clocks jump forward typically due to the spring
 * daylight savings change from "winter" to "summer". In a gap there are local date-time values
 * with no valid offset.
 * - Overlap, with two valid offsets. This is when clocks are set back typically due to the autumn
 * daylight savings change from "summer" to "winter". In an overlap there are local date-time
 * values with two valid offsets.
 *
 * Any method that converts directly or implicitly from a local date-time to an instant by
 * obtaining the offset has the potential to be complicated.
 *
 * For Gaps, the general strategy is that if the local date-time falls in the middle of a Gap,
 * then the resulting zoned date-time will have a local date-time shifted forwards by the length
 * of the Gap, resulting in a date-time in the later offset, typically "summer" time.
 *
 * For Overlaps, the general strategy is that if the local date-time falls in the middle of an
 * Overlap, then the previous offset will be retained. If there is no previous offset, or the
 * previous offset is invalid, then the earlier offset is used, typically "summer" time. Two
 * additional methods, `withEarlierOffsetAtOverlap()` and `withLaterOffsetAtOverlap()`, help
 * manage the case of an overlap.
 */
export class ZonedDateTime extends ChronoZonedDateTime {
    static FROM: TemporalQuery<ZonedDateTime>;

    static from(temporal: TemporalAccessor): ZonedDateTime;
    static now(clockOrZone?: Clock | ZoneId): ZonedDateTime;
    static of(localDateTime: LocalDateTime, zone: ZoneId): ZonedDateTime;
    static of(date: LocalDate, time: LocalTime, zone: ZoneId): ZonedDateTime;
    static of(year: number, month: number, dayOfMonth: number, hour: number, minute: number, second: number, nanoOfSecond: number, zone: ZoneId): ZonedDateTime;
    /**
     * Obtains an instance of ZonedDateTime from an Instant.
     *
     * This creates a zoned date-time with the same instant as that specified. Calling
     * `ChronoZonedDateTime.toInstant()` will return an instant equal to the one used here.
     *
     * Converting an instant to a zoned date-time is simple as there is only one valid offset for
     * each instant.
     */
    static ofInstant(instant: Instant, zone: ZoneId): ZonedDateTime;
    /**
     * Obtains an instance of `ZonedDateTime` from the instant formed by combining the local
     * date-time and offset.
     *
     * This creates a zoned date-time by combining the `LocalDateTime` and `ZoneOffset`. This
     * combination uniquely specifies an instant without ambiguity.
     *
     * Converting an instant to a zoned date-time is simple as there is only one valid offset for
     * each instant. If the valid offset is different to the offset specified, the the date-time
     * and offset of the zoned date-time will differ from those specified.
     *
     * If the `ZoneId` to be used is a `ZoneOffset`, this method is equivalent to
     * `of(LocalDateTime, ZoneId)`.
     */
    static ofInstant(localDateTime: LocalDateTime, offset: ZoneOffset, zone: ZoneId): ZonedDateTime;
    /**
     * Obtains an instance of `ZonedDateTime` from a local date-time using the preferred offset
     * if possible.
     *
     * The local date-time is resolved to a single instant on the time-line. This is achieved by
     * finding a valid offset from UTC/Greenwich for the local date-time as defined by the rules
     * of the zone ID.
     *
     * In most cases, there is only one valid offset for a local date-time. In the case of an
     * overlap, where clocks are set back, there are two valid offsets. If the preferred offset
     * is one of the valid offsets then it is used. Otherwise the earlier valid offset is used,
     * typically corresponding to "summer".
     *
     * In the case of a gap, where clocks jump forward, there is no valid offset. Instead, the
     * local date-time is adjusted to be later by the length of the gap. For a typical one hour
     * daylight savings change, the local date-time will be moved one hour later into the offset
     * typically corresponding to "summer".
     */
    static ofLocal(localDateTime: LocalDateTime, zone: ZoneId, preferredOffset?: ZoneOffset | null): ZonedDateTime;
    /**
     * Obtains an instance of `ZonedDateTime` strictly validating the combination of local
     * date-time, offset and zone ID.
     *
     * This creates a zoned date-time ensuring that the offset is valid for the local date-time
     * according to the rules of the specified zone. If the offset is invalid, an exception is
     * thrown.
     */
    static ofStrict(localDateTime: LocalDateTime, offset: ZoneOffset, zone: ZoneId): ZonedDateTime;
    static parse(text: string, formatter?: DateTimeFormatter): ZonedDateTime;

    private constructor();

    dayOfMonth(): number;
    dayOfWeek(): DayOfWeek;
    dayOfYear(): number;
    equals(other: any): boolean;
    getLong(field: TemporalField): number;
    hashCode(): number;
    hour(): number;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
    minus(amountToSubtract: number, unit: TemporalUnit): ZonedDateTime;
    minus(amount: TemporalAmount): ZonedDateTime;
    minusDays(days: number): ZonedDateTime;
    minusHours(hours: number): ZonedDateTime;
    minusMinutes(minutes: number): ZonedDateTime;
    minusMonths(months: number): ZonedDateTime;
    minusNanos(nanos: number): ZonedDateTime;
    minusSeconds(seconds: number): ZonedDateTime;
    minusWeeks(weeks: number): ZonedDateTime;
    minusYears(years: number): ZonedDateTime;
    minute(): number;
    month(): Month;
    monthValue(): number;
    nano(): number;
    offset(): ZoneOffset;
    plus(amountToAdd: number, unit: TemporalUnit): ZonedDateTime;
    plus(amount: TemporalAmount): ZonedDateTime;
    plusDays(days: number): ZonedDateTime;
    plusHours(hours: number): ZonedDateTime;
    plusMinutes(minutes: number): ZonedDateTime;
    plusMonths(months: number): ZonedDateTime;
    plusNanos(nanos: number): ZonedDateTime;
    plusSeconds(seconds: number): ZonedDateTime;
    plusWeeks(weeks: number): ZonedDateTime;
    plusYears(years: number): ZonedDateTime;
    range(field: TemporalField): ValueRange;
    second(): number;
    toJSON(): string;
    toLocalDate(): LocalDate;
    toLocalDateTime(): LocalDateTime;
    toLocalTime(): LocalTime;
    toOffsetDateTime(): OffsetDateTime;
    toString(): string;
    truncatedTo(unit: TemporalUnit): ZonedDateTime;
    until(endExclusive: Temporal, unit: TemporalUnit): number;
    with(adjuster: TemporalAdjuster): ZonedDateTime;
    with(field: TemporalField, newValue: number): ZonedDateTime;
    withDayOfMonth(dayOfMonth: number): ZonedDateTime;
    withDayOfYear(dayOfYear: number): ZonedDateTime;
    /**
     * Returns a copy of this date-time changing the zone offset to the earlier of the two valid
     * offsets at a local time-line overlap.
     *
     * This method only has any effect when the local time-line overlaps, such as at an autumn
     * daylight savings cutover. In this scenario, there are two valid offsets for the local
     * date-time. Calling this method will return a zoned date-time with the earlier of the two
     * selected.
     *
     * If this method is called when it is not an overlap, `this` is returned.
     */
    withEarlierOffsetAtOverlap(): ZonedDateTime;
    /**
     * Returns a copy of this date-time with the zone ID set to the offset.
     *
     * This returns a zoned date-time where the zone ID is the same as `offset()`. The local
     * date-time, offset and instant of the result will be the same as in this date-time.
     *
     * Setting the date-time to a fixed single offset means that any future calculations, such as
     * addition or subtraction, have no complex edge cases due to time-zone rules. This might also
     * be useful when sending a zoned date-time across a network, as most protocols, such as
     * ISO-8601, only handle offsets, and not region-based zone IDs.
     */
    withFixedOffsetZone(): ZonedDateTime;
    withHour(hour: number): ZonedDateTime;
    /**
     * Returns a copy of this date-time changing the zone offset to the later of the two valid
     * offsets at a local time-line overlap.
     *
     * This method only has any effect when the local time-line overlaps, such as at an autumn
     * daylight savings cutover. In this scenario, there are two valid offsets for the local
     * date-time. Calling this method will return a zoned date-time with the later of the two
     * selected.
     *
     * If this method is called when it is not an overlap, `this` is returned.
     */
    withLaterOffsetAtOverlap(): ZonedDateTime;
    withMinute(minute: number): ZonedDateTime;
    withMonth(month: number): ZonedDateTime;
    withNano(nanoOfSecond: number): ZonedDateTime;
    withSecond(second: number): ZonedDateTime;
    withYear(year: number): ZonedDateTime;
    /**
     * Returns a copy of this date-time with a different time-zone, retaining the instant.
     *
     * This method changes the time-zone and retains the instant. This normally results in a
     * change to the local date-time.
     *
     * This method is based on retaining the same instant, thus gaps and overlaps in the local
     * time-line have no effect on the result.
     *
     * To change the offset while keeping the local time, use `withZoneSameLocal(ZoneId)`.
     */
    withZoneSameInstant(zone: ZoneId): ZonedDateTime;
    /**
     * Returns a copy of this date-time with a different time-zone, retaining the local date-time
     * if possible.
     *
     * This method changes the time-zone and retains the local date-time. The local date-time is
     * only changed if it is invalid for the new zone, determined using the same approach as
     * `ofLocal(LocalDateTime, ZoneId, ZoneOffset)`.
     *
     * To change the zone and adjust the local date-time, use `withZoneSameInstant(ZoneId)`.
     */
    withZoneSameLocal(zone: ZoneId): ZonedDateTime;
    year(): number;
    zone(): ZoneId;

    protected _minusUnit(amountToSubtract: number, unit: TemporalUnit): ZonedDateTime;
    protected _minusAmount(amount: TemporalAmount): ZonedDateTime;
    protected _plusUnit(amountToAdd: number, unit: TemporalUnit): ZonedDateTime;
    protected _plusAmount(amount: TemporalAmount): ZonedDateTime;
    protected _withAdjuster(adjuster: TemporalAdjuster): ZonedDateTime;
    protected _withField(field: TemporalField, newValue: number): ZonedDateTime;
}

export abstract class ZoneId {
    static SYSTEM: ZoneId;
    static UTC: ZoneId;

    static systemDefault(): ZoneId;
    static of(zoneId: string): ZoneId;
    static ofOffset(prefix: string, offset: ZoneOffset): ZoneId;
    static from(temporal: TemporalAccessor): ZoneId;

    static getAvailableZoneIds(): string[];

    equals(other: any): boolean;
    hashCode(): number;
    abstract id(): string;
    normalized(): ZoneId;
    abstract rules(): ZoneRules;
    toJSON(): string;
    toString(): string;
}

export class ZoneOffset extends ZoneId implements TemporalAdjuster {
    static MAX_SECONDS: ZoneOffset;
    static UTC: ZoneOffset;
    static MIN: ZoneOffset;
    static MAX: ZoneOffset;

    static of(offsetId: string): ZoneOffset;
    static ofHours(hours: number): ZoneOffset;
    static ofHoursMinutes(hours: number, minutes: number): ZoneOffset;
    static ofHoursMinutesSeconds(hours: number, minutes: number, seconds: number): ZoneOffset;
    static ofTotalMinutes(totalMinutes: number): ZoneOffset;
    static ofTotalSeconds(totalSeconds: number): ZoneOffset;

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    compareTo(other: ZoneOffset): number;
    equals(other: any): boolean;
    get(field: TemporalField): number;
    getLong(field: TemporalField): number;
    hashCode(): number;
    id(): string;
    rules(): ZoneRules;
    toString(): string;
    totalSeconds(): number;
}

export class ZoneRegion extends ZoneId {
    static ofId(zoneId: string): ZoneId;

    private constructor();

    id(): string;
    rules(): ZoneRules;
}

export class DayOfWeek extends TemporalAccessor implements TemporalAdjuster {
    static MONDAY: DayOfWeek;
    static TUESDAY: DayOfWeek;
    static WEDNESDAY: DayOfWeek;
    static THURSDAY: DayOfWeek;
    static FRIDAY: DayOfWeek;
    static SATURDAY: DayOfWeek;
    static SUNDAY: DayOfWeek;

    static FROM: TemporalQuery<DayOfWeek>;

    static from(temporal: TemporalAccessor): DayOfWeek;
    static of(dayOfWeek: number): DayOfWeek;
    static valueOf(name: string): DayOfWeek;
    static values(): DayOfWeek[];

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    compareTo(other: DayOfWeek): number;
    equals(other: any): boolean;
    getLong(field: TemporalField): number;
    isSupported(field: TemporalField): boolean;
    minus(days: number): DayOfWeek;
    name(): string;
    ordinal(): number;
    plus(days: number): DayOfWeek;
    toJSON(): string;
    toString(): string;
    value(): number;
}

export class Month extends TemporalAccessor implements TemporalAdjuster {
    static JANUARY: Month;
    static FEBRUARY: Month;
    static MARCH: Month;
    static APRIL: Month;
    static MAY: Month;
    static JUNE: Month;
    static JULY: Month;
    static AUGUST: Month;
    static SEPTEMBER: Month;
    static OCTOBER: Month;
    static NOVEMBER: Month;
    static DECEMBER: Month;

    static from(temporal: TemporalAccessor): Month;
    static of(month: number): Month;
    static valueOf(name: string): Month;
    static values(): Month[];

    private constructor();

    adjustInto(temporal: Temporal): Temporal;
    compareTo(other: Month): number;
    equals(other: any): boolean;
    firstDayOfYear(leapYear: boolean): number;
    firstMonthOfQuarter(): Month;
    getLong(field: TemporalField): number;
    isSupported(field: TemporalField): boolean;
    length(leapYear: boolean): number;
    maxLength(): number;
    minLength(): number;
    minus(months: number): Month;
    name(): string;
    ordinal(): number;
    plus(months: number): Month;
    toJSON(): string;
    toString(): string;
    value(): number;
}

// ----------------------------------------------------------------------------
//   FORMAT
// ----------------------------------------------------------------------------

export class DateTimeFormatter {
    static ISO_LOCAL_DATE: DateTimeFormatter;
    static ISO_LOCAL_TIME: DateTimeFormatter;
    static ISO_LOCAL_DATE_TIME: DateTimeFormatter;
    static ISO_INSTANT: DateTimeFormatter;
    static ISO_OFFSET_DATE_TIME: DateTimeFormatter;
    static ISO_OFFSET_TIME: DateTimeFormatter;
    static ISO_ZONED_DATE_TIME: DateTimeFormatter;
    static BASIC_ISO_DATE: DateTimeFormatter;
    static ISO_OFFSET_DATE: DateTimeFormatter;
    static ISO_ORDINAL_DATE: DateTimeFormatter;
    static ISO_WEEK_DATE: DateTimeFormatter;
    static ISO_DATE: DateTimeFormatter;
    static ISO_TIME: DateTimeFormatter;
    static ISO_DATE_TIME: DateTimeFormatter;

    static ofPattern(pattern: string): DateTimeFormatter;
    static parsedExcessDays(): TemporalQuery<Period>;
    static parsedLeapSecond(): TemporalQuery<boolean>;

    private constructor();

    chronology(): Chronology | null;
    decimalStyle(): DecimalStyle;
    format(temporal: TemporalAccessor): string;
    parse(text: string): TemporalAccessor;
    parse<T>(text: string, query: TemporalQuery<T>): T;
    parseUnresolved(text: string, position: ParsePosition): TemporalAccessor;
    toString(): string;
    withChronology(chrono: Chronology): DateTimeFormatter;
    withResolverStyle(resolverStyle: ResolverStyle): DateTimeFormatter;
}

export class DateTimeFormatterBuilder {
    constructor();

    append(formatter: DateTimeFormatter): DateTimeFormatterBuilder;
    appendFraction(field: TemporalField, minWidth: number, maxWidth: number, decimalPoint: boolean): DateTimeFormatterBuilder;
    appendInstant(fractionalDigits?: number): DateTimeFormatterBuilder;
    appendLiteral(literal: any): DateTimeFormatterBuilder;
    appendOffset(pattern: string, noOffsetText: string): DateTimeFormatterBuilder;
    appendOffsetId(): DateTimeFormatterBuilder;
    appendPattern(pattern: string): DateTimeFormatterBuilder;
    appendValue(field: TemporalField): DateTimeFormatterBuilder;
    appendValue(field: TemporalField, width: number): DateTimeFormatterBuilder;
    appendValue(field: TemporalField, minWidth: number, maxWidth: number, signStyle: SignStyle): DateTimeFormatterBuilder;
    appendValueReduced(field: TemporalField, width: number, maxWidth: number, base: ChronoLocalDate | number): DateTimeFormatterBuilder;
    appendZoneId(): DateTimeFormatterBuilder;
    optionalEnd(): DateTimeFormatterBuilder;
    optionalStart(): DateTimeFormatterBuilder;
    padNext(): DateTimeFormatterBuilder;
    parseCaseInsensitive(): DateTimeFormatterBuilder;
    parseCaseSensitive(): DateTimeFormatterBuilder;
    parseDefaulting(field: TemporalField, value: number): DateTimeFormatterBuilder;
    parseLenient(): DateTimeFormatterBuilder;
    parseStrict(): DateTimeFormatterBuilder;
    toFormatter(resolverStyle?: ResolverStyle): DateTimeFormatter;
}

export class DecimalStyle {
    private constructor();

    decimalSeparator(): string;
    equals(other: any): boolean;
    hashCode(): any;
    negativeSign(): string;
    positiveSign(): string;
    toString(): string;
    zeroDigit(): string;
}

export class ResolverStyle {
    static STRICT: ResolverStyle;
    static SMART: ResolverStyle;
    static LENIENT: ResolverStyle;

    private constructor();

    equals(other: any): boolean;
    toJSON(): string;
    toString(): string;
}

export class SignStyle {
    static NORMAL: SignStyle;
    static NEVER: SignStyle;
    static ALWAYS: SignStyle;
    static EXCEEDS_PAD: SignStyle;
    static NOT_NEGATIVE: SignStyle;

    private constructor();

    equals(other: any): boolean;
    toJSON(): string;
    toString(): string;
}

export class TextStyle {
    static FULL: TextStyle;
    static FULL_STANDALONE: TextStyle;
    static SHORT: TextStyle;
    static SHORT_STANDALONE: TextStyle;
    static NARROW: TextStyle;
    static NARROW_STANDALONE: TextStyle;

    private constructor();

    asNormal(): TextStyle;
    asStandalone(): TextStyle;
    isStandalone(): boolean;

    equals(other: any): boolean;
    toJSON(): string;
    toString(): string;
}

export class ParsePosition {
    constructor(index: number);

    getIndex(): number;
    setIndex(index: number): void;
    getErrorIndex(): number;
    setErrorIndex(errorIndex: number): void;
}

// ----------------------------------------------------------------------------
//   ZONE
// ----------------------------------------------------------------------------

export class ZoneOffsetTransition {
    static of(transition: LocalDateTime, offsetBefore: ZoneOffset, offsetAfter: ZoneOffset): ZoneOffsetTransition;

    private constructor();

    compareTo(transition: ZoneOffsetTransition): number;
    dateTimeAfter(): LocalDateTime;
    dateTimeBefore(): LocalDateTime;
    duration(): Duration;
    durationSeconds(): number;
    equals(other: any): boolean;
    hashCode(): number;
    instant(): Instant;
    isGap(): boolean;
    isOverlap(): boolean;
    isValidOffset(offset: ZoneOffset): boolean;
    offsetAfter(): ZoneOffset;
    offsetBefore(): ZoneOffset;
    toEpochSecond(): number;
    toString(): string;
    validOffsets(): ZoneOffset[];
}

export interface ZoneOffsetTransitionRule {
    // TODO: Not implemented yet
}

export abstract class ZoneRules {
    static of(offest: ZoneOffset): ZoneRules;

    /**
     * Gets the offset applicable at the specified instant in these rules.
     *
     * The mapping from an instant to an offset is simple, there is only one valid offset
     * for each instant. This method returns that offset.
     */
    offset(instant: Instant): ZoneOffset;
    /**
     * Gets a suitable offset for the specified local date-time in these rules.
     *
     * The mapping from a local date-time to an offset is not straightforward. There are
     * three cases:
     * - Normal, with one valid offset. For the vast majority of the year, the normal case
     * applies, where there is a single valid offset for the local date-time.
     * - Gap, with zero valid offsets. This is when clocks jump forward typically due to the
     * spring daylight savings change from "winter" to "summer". In a gap there are local
     * date-time values with no valid offset.
     * - Overlap, with two valid offsets. This is when clocks are set back typically due to
     * the autumn daylight savings change from "summer" to "winter". In an overlap there are
     * local date-time values with two valid offsets.
     *
     * Thus, for any given local date-time there can be zero, one or two valid offsets. This
     * method returns the single offset in the Normal case, and in the Gap or Overlap case it
     * returns the offset before the transition.
     *
     * Since, in the case of Gap and Overlap, the offset returned is a "best" value, rather
     * than the "correct" value, it should be treated with care. Applications that care about
     * the correct offset should use a combination of this method, `getValidOffsets` and
     * `getTransition`.
     */
    offset(localDateTime: LocalDateTime): ZoneOffset;
    toJSON(): string;
    abstract daylightSavings(instant: Instant): Duration;
    abstract isDaylightSavings(instant: Instant): boolean;
    abstract isFixedOffset(): boolean;
    /**
     * Checks if the offset date-time is valid for these rules.
     *
     * To be valid, the local date-time must not be in a gap and the offset must match the
     * valid offsets.
     */
    abstract isValidOffset(localDateTime: LocalDateTime, offset: ZoneOffset): boolean;
    abstract nextTransition(instant: Instant): ZoneOffsetTransition;
    abstract offsetOfEpochMilli(epochMilli: number): ZoneOffset;
    abstract offsetOfInstant(instant: Instant): ZoneOffset;
    abstract offsetOfLocalDateTime(localDateTime: LocalDateTime): ZoneOffset;
    abstract previousTransition(instant: Instant): ZoneOffsetTransition;
    abstract standardOffset(instant: Instant): ZoneOffset;
    abstract toString(): string;
    /**
     * Gets the offset transition applicable at the specified local date-time in these rules.
     *
     * The mapping from a local date-time to an offset is not straightforward. There are
     * three cases:
     * - Normal, with one valid offset. For the vast majority of the year, the normal case
     * applies, where there is a single valid offset for the local date-time.
     * - Gap, with zero valid offsets. This is when clocks jump forward typically due to the
     * spring daylight savings change from "winter" to "summer". In a gap there are local
     * date-time values with no valid offset.
     * - Overlap, with two valid offsets. This is when clocks are set back typically due to
     * the autumn daylight savings change from "summer" to "winter". In an overlap there are
     * local date-time values with two valid offsets.
     *
     * A transition is used to model the cases of a Gap or Overlap. The Normal case will return
     * `null`.
     *
     * There are various ways to handle the conversion from a `LocalDateTime`. One technique,
     * using this method, would be:
     * ```
     * const trans = rules.transition(localDT);
     * if (trans === null) {
     *     // Gap or Overlap: determine what to do from transition
     * } else {
     *     // Normal case: only one valid offset
     *     zoneOffset = rules.offset(localDT);
     * }
     * ```
     *
     * @returns the offset transition, `null` if the local date-time is not in transition.
     */
    abstract transition(localDateTime: LocalDateTime): ZoneOffsetTransition;
    abstract transitionRules(): ZoneOffsetTransitionRule[];
    abstract transitions(): ZoneOffsetTransition[];
    /**
     * Gets the offset applicable at the specified local date-time in these rules.
     *
     * The mapping from a local date-time to an offset is not straightforward. There are
     * three cases:
     * - Normal, with one valid offset. For the vast majority of the year, the normal case
     * applies, where there is a single valid offset for the local date-time.
     * - Gap, with zero valid offsets. This is when clocks jump forward typically due to the
     * spring daylight savings change from "winter" to "summer". In a gap there are local
     * date-time values with no valid offset.
     * - Overlap, with two valid offsets. This is when clocks are set back typically due to
     * the autumn daylight savings change from "summer" to "winter". In an overlap there are
     * local date-time values with two valid offsets.
     *
     * Thus, for any given local date-time there can be zero, one or two valid offsets. This
     * method returns that list of valid offsets, which is a list of size 0, 1 or 2. In the
     * case where there are two offsets, the earlier offset is returned at index 0 and the
     * later offset at index 1.
     *
     * There are various ways to handle the conversion from a `LocalDateTime`. One technique,
     * using this method, would be:
     * ```
     * const validOffsets = rules.getOffset(localDT);
     * if (validOffsets.length === 1) {
     *     // Normal case: only one valid offset
     *     zoneOffset = validOffsets[0];
     * } else {
     *     // Gap or Overlap: determine what to do from transition
     *     const trans = rules.transition(localDT);
     * }
     * ```
     *
     * In theory, it is possible for there to be more than two valid offsets. This would happen
     * if clocks to be put back more than once in quick succession. This has never happened in
     * the history of time-zones and thus has no special handling. However, if it were to
     * happen, then the list would return more than 2 entries.
     */
    abstract validOffsets(localDateTime: LocalDateTime): ZoneOffset[];
}

export class ZoneRulesProvider {
    static getRules(zoneId: string): ZoneRules;
    static getAvailableZoneIds(): string[];
}

// ----------------------------------------------------------------------------
//   CHRONO
// ----------------------------------------------------------------------------

// TODO: js-joda doesn't have Chronology yet. Methods like `LocalDate.chronology()`
// actually return an `IsoChronology` so Chronology is an alias type of that class
// for now. Change this if Chronology is added.
export type Chronology = IsoChronology;

export abstract class IsoChronology {
    static isLeapYear(prolepticYear: number): boolean;

    private constructor();

    equals(other: any): boolean;
    resolveDate(fieldValues: any, resolverStyle: any): any;
    toString(): string;
}

export abstract class ChronoLocalDate extends Temporal implements TemporalAdjuster {
    adjustInto(temporal: Temporal): Temporal;
    format(formatter: DateTimeFormatter): string;
    isSupported(fieldOrUnit: TemporalField | TemporalUnit): boolean;
}

export abstract class ChronoLocalDateTime extends Temporal implements TemporalAdjuster {
    adjustInto(temporal: Temporal): Temporal;
    chronology(): Chronology;
    toEpochSecond(offset: ZoneOffset): number;
    toInstant(offset: ZoneOffset): Instant;
}

export abstract class ChronoZonedDateTime extends Temporal {
    compareTo(other: ChronoZonedDateTime): number;
    equals(other: any): boolean;
    format(formatter: DateTimeFormatter): string;
    isAfter(other: ChronoZonedDateTime): boolean;
    isBefore(other: ChronoZonedDateTime): boolean;
    isEqual(other: ChronoZonedDateTime): boolean;
    toEpochSecond(): number;
    toInstant(): Instant;
}

// ----------------------------------------------------------------------------
//   SUPPORT
// ----------------------------------------------------------------------------

export function nativeJs(date: Date | any, zone?: ZoneId): ZonedDateTime;

export function convert(
    temporal: LocalDate | LocalDateTime | ZonedDateTime | Instant,
    zone?: ZoneId,
): {
    toDate: () => Date;
    toEpochMilli: () => number;
};

export function use(plugin: Function): any;

// ----------------------------------------------------------------------------
//   EXCEPTIONS
// ----------------------------------------------------------------------------

export class DateTimeException extends Error {
    constructor(message?: string, cause?: Error);
}

export class UnsupportedTemporalTypeException extends DateTimeException { }

export class DateTimeParseException extends Error {
    constructor(message?: string, text?: string, index?: number, cause?: Error);

    parsedString(): string;
    errorIndex(): number;
}

export class ArithmeticException extends Error { }
export class IllegalArgumentException extends Error { }
export class IllegalStateException extends Error { }
export class NullPointerException extends Error { }

export const __esModule: true;
export as namespace JSJoda;
