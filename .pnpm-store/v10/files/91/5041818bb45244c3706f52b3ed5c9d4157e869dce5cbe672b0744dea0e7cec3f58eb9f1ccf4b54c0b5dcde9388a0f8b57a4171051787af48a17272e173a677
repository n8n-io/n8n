/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert, requireNonNull } from '../assert';

import { DateTimeParseException, NullPointerException } from '../errors';

import { Period } from '../Period';

import { ParsePosition } from './ParsePosition';
import { DateTimeBuilder } from './DateTimeBuilder';
import { DateTimeParseContext } from './DateTimeParseContext';
import { DateTimePrintContext } from './DateTimePrintContext';
import { DateTimeFormatterBuilder } from './DateTimeFormatterBuilder';
import { SignStyle } from './SignStyle';
import { StringBuilder } from './StringBuilder';
import { ResolverStyle } from './ResolverStyle';

import { IsoChronology } from '../chrono/IsoChronology';
import { ChronoField } from '../temporal/ChronoField';
import { createTemporalQuery } from '../temporal/TemporalQuery';

/**
 *
 * ### Static properties of Class {@link DateTimeFormatter}
 *
 * DateTimeFormatter.ISO_LOCAL_DATE
 *
 * DateTimeFormatter.ISO_LOCAL_TIME
 *
 * DateTimeFormatter.ISO_LOCAL_DATE_TIME
 *
 */
export class DateTimeFormatter {

    //-----------------------------------------------------------------------
    /**
     * A query that provides access to the excess days that were parsed.
     *
     * This returns a singleton {@link TemporalQuery} that provides
     * access to additional information from the parse. The query always returns
     * a non-null period, with a zero period returned instead of null.
     *
     * There are two situations where this query may return a non-zero period.
     *
     * * If the {@link ResolverStyle} is {@link LENIENT} and a time is parsed
     *   without a date, then the complete result of the parse consists of a
     *   {@link LocalTime} and an excess {@link Period} in days.
     * * If the {@link ResolverStyle} is {@link SMART} and a time is parsed
     *   without a date where the time is 24:00:00, then the complete result of
     *   the parse consists of a {@link LocalTime} of 00:00:00 and an excess
     *   {@link Period} of one day.
     *
     * In both cases, if a complete {@link ChronoLocalDateTime} or {@link Instant}
     * is parsed, then the excess days are added to the date part.
     * As a result, this query will return a zero period.
     *
     * The {@link SMART} behaviour handles the common "end of day" 24:00 value.
     * Processing in {@link LENIENT} mode also produces the same result:
     * <pre>
     *  Text to parse        Parsed object                         Excess days
     *  "2012-12-03T00:00"   LocalDateTime.of(2012, 12, 3, 0, 0)   ZERO
     *  "2012-12-03T24:00"   LocalDateTime.of(2012, 12, 4, 0, 0)   ZERO
     *  "00:00"              LocalTime.of(0, 0)                    ZERO
     *  "24:00"              LocalTime.of(0, 0)                    Period.ofDays(1)
     * </pre>
     * The query can be used as follows:
     * <pre>
     *  TemporalAccessor parsed = formatter.parse(str);
     *  LocalTime time = parsed.query(LocalTime.FROM);
     *  Period extraDays = parsed.query(DateTimeFormatter.parsedExcessDays());
     * </pre>
     * @return {TemporalQuery} a query that provides access to the excess days that were parsed
     */
    static parsedExcessDays() {
        return DateTimeFormatter.PARSED_EXCESS_DAYS;
    }

    /**
     * A query that provides access to whether a leap-second was parsed.
     *
     * This returns a singleton {@link TemporalQuery} that provides
     * access to additional information from the parse. The query always returns
     * a non-null boolean, true if parsing saw a leap-second, false if not.
     *
     * Instant parsing handles the special "leap second" time of '23:59:60'.
     * Leap seconds occur at '23:59:60' in the UTC time-zone, but at other
     * local times in different time-zones. To avoid this potential ambiguity,
     * the handling of leap-seconds is limited to
     * {@link DateTimeFormatterBuilder#appendInstant}, as that method
     * always parses the instant with the UTC zone offset.
     *
     * If the time '23:59:60' is received, then a simple conversion is applied,
     * replacing the second-of-minute of 60 with 59. This query can be used
     * on the parse result to determine if the leap-second adjustment was made.
     * The query will return one second of excess if it did adjust to remove
     * the leap-second, and zero if not. Note that applying a leap-second
     * smoothing mechanism, such as UTC-SLS, is the responsibility of the
     * application, as follows:
     * <pre>
     *  TemporalAccessor parsed = formatter.parse(str);
     *  Instant instant = parsed.query(Instant::from);
     *  if (parsed.query(DateTimeFormatter.parsedLeapSecond())) {
     *    // validate leap-second is correct and apply correct smoothing
     *  }
     * </pre>
     * @return a query that provides access to whether a leap-second was parsed
     */
    static parsedLeapSecond() {
        return DateTimeFormatter.PARSED_LEAP_SECOND;
    }

    /**
     * Creates a formatter using the specified pattern.
     *
     * This method will create a formatter based on a simple pattern of letters and symbols.
     *
     * The returned formatter will use the default locale, but this can be changed
     * using {@link DateTimeFormatter.withLocale}.
     *
     * All letters 'A' to 'Z' and 'a' to 'z' are reserved as pattern letters.
     * The following pattern letters are defined:
     * <pre>
     *  |Symbol  |Meaning                     |Presentation      |Examples
     *  |--------|----------------------------|------------------|----------------------------------------------------
     *  | G      | era                        | number/text      | 1; 01; AD; Anno Domini
     *  | u      | year                       | year             | 2004; 04
     *  | y      | year-of-era                | year             | 2004; 04
     *  | D      | day-of-year                | number           | 189
     *  | M      | month-of-year              | number/text      | 7; 07; Jul; July; J
     *  | d      | day-of-month               | number           | 10
     *  |        |                            |                  |
     *  | Q      | quarter-of-year            | number/text      | 3; 03; Q3
     *  | Y      | week-based-year            | year             | 1996; 96
     *  | w      | week-of-year               | number           | 27
     *  | W      | week-of-month              | number           | 27
     *  | e      | localized day-of-week      | number           | 2; Tue; Tuesday; T
     *  | E      | day-of-week                | number/text      | 2; Tue; Tuesday; T
     *  | F      | week-of-month              | number           | 3
     *  |        |                            |                  |
     *  | a      | am-pm-of-day               | text             | PM
     *  | h      | clock-hour-of-am-pm (1-12) | number           | 12
     *  | K      | hour-of-am-pm (0-11)       | number           | 0
     *  | k      | clock-hour-of-am-pm (1-24) | number           | 0
     *  |        |                            |                  |
     *  | H      | hour-of-day (0-23)         | number           | 0
     *  | m      | minute-of-hour             | number           | 30
     *  | s      | second-of-minute           | number           | 55
     *  | S      | fraction-of-second         | fraction         | 978
     *  | A      | milli-of-day               | number           | 1234
     *  | n      | nano-of-second             | number           | 987654321
     *  | N      | nano-of-day                | number           | 1234000000
     *  |        |                            |                  |
     *  | V      | time-zone ID               | zone-id          | America/Los_Angeles; Z; -08:30
     *  | z      | time-zone name             | zone-name        | Pacific Standard Time; PST
     *  | X      | zone-offset 'Z' for zero   | offset-X         | Z; -08; -0830; -08:30; -083015; -08:30:15;
     *  | x      | zone-offset                | offset-x         | +0000; -08; -0830; -08:30; -083015; -08:30:15;
     *  | Z      | zone-offset                | offset-Z         | +0000; -0800; -08:00;
     *  |        |                            |                  |
     *  | p      | pad next                   | pad modifier     | 1
     *  |        |                            |                  |
     *  | '      | escape for text            | delimiter        |
     *  | ''     | single quote               | literal          | '
     *  | [      | optional section start     |                  |
     *  | ]      | optional section end       |                  |
     *  | {}     | reserved for future use    |                  |
     * </pre>
     *
     * The count of pattern letters determine the format.
     *
     * **Text**: The text style is determined based on the number of pattern letters used.
     * Less than 4 pattern letters will use the short form `TextStyle.SHORT`.
     * Exactly 4 pattern letters will use the full form `TextStyle.FULL`.
     * Exactly 5 pattern letters will use the narrow form `TextStyle.NARROW`.
     *
     * **NOTE**: since text styles require locale support, they are currently not supported in js-joda!
     *
     * **Number**: If the count of letters is one, then the value is printed using the minimum number
     * of digits and without padding as per {@link DateTimeFormatterBuilder.appendValue}.
     * Otherwise, the count of digits is used as the width of the output field as per
     * {@link DateTimeFormatterBuilder.appendValue}.
     *
     * **Number/Text**: If the count of pattern letters is 3 or greater, use the Text rules above.
     * Otherwise use the Number rules above.
     *
     * **Fraction**: Outputs the nano-of-second field as a fraction-of-second.
     * The nano-of-second value has nine digits, thus the count of pattern letters is from 1 to 9.
     * If it is less than 9, then the nano-of-second value is truncated, with only the most
     * significant digits being output.
     * When parsing in strict mode, the number of parsed digits must match the count of pattern letters.
     * When parsing in lenient mode, the number of parsed digits must be at least the count of pattern
     * letters, up to 9 digits.
     *
     * **Year**: The count of letters determines the minimum field width below which padding is used.
     * If the count of letters is two, then a {@link DateTimeFormatterBuilder.appendValueReduced}
     * two digit form is used.
     * For printing, this outputs the rightmost two digits. For parsing, this will parse using the
     * base value of 2000, resulting in a year within the range 2000 to 2099 inclusive.
     * If the count of letters is less than four (but not two), then the sign is only output for negative
     * years as per `SignStyle.NORMAL`.
     * Otherwise, the sign is output if the pad width is exceeded, as per `SignStyle.EXCEEDS_PAD`
     *
     * **ZoneId**: This outputs the time-zone ID, such as 'Europe/Paris'.
     * If the count of letters is two, then the time-zone ID is output.
     * Any other count of letters throws `IllegalArgumentException`.
     *
     * **Zone names**: This outputs the display name of the time-zone ID.
     * If the count of letters is one, two or three, then the short name is output.
     * If the count of letters is four, then the full name is output.
     * Five or more letters throws `IllegalArgumentException`.
     *
     * **NOTE**: since zone ids and name require the iana tzdb, they are currently not supported in js-joda!
     *
     * **Offset X and x**: This formats the offset based on the number of pattern letters.
     * One letter outputs just the hour', such as '+01', unless the minute is non-zero
     * in which case the minute is also output, such as '+0130'.
     * Two letters outputs the hour and minute, without a colon, such as '+0130'.
     * Three letters outputs the hour and minute, with a colon, such as '+01:30'.
     * Four letters outputs the hour and minute and optional second, without a colon, such as '+013015'.
     * Five letters outputs the hour and minute and optional second, with a colon, such as '+01:30:15'.
     * Six or more letters throws `IllegalArgumentException`.
     * Pattern letter 'X' (upper case) will output 'Z' when the offset to be output would be zero,
     * whereas pattern letter 'x' (lower case) will output '+00', '+0000', or '+00:00'.
     *
     * **Offset Z**: This formats the offset based on the number of pattern letters.
     * One, two or three letters outputs the hour and minute, without a colon, such as '+0130'.
     * Four or more letters throws `IllegalArgumentException`.
     * The output will be '+0000' when the offset is zero.
     *
     * **Optional section**: The optional section markers work exactly like calling
     * {@link DateTimeFormatterBuilder.optionalStart} and {@link DateTimeFormatterBuilder.optionalEnd}.
     *
     * **Pad modifier**: Modifies the pattern that immediately follows to be padded with spaces.
     * The pad width is determined by the number of pattern letters.
     * This is the same as calling {@link DateTimeFormatterBuilder.padNext}.
     *
     * For example, 'ppH' outputs the hour-of-day padded on the left with spaces to a width of 2.
     *
     * Any unrecognized letter is an error.
     * Any non-letter character, other than '[', ']', '{', '}' and the single quote will be output directly.
     * Despite this, it is recommended to use single quotes around all characters that you want to
     * output directly to ensure that future changes do not break your application.
     *
     * @param {String} pattern  the pattern to use, not null
     * @return {DateTimeFormatter} the formatter based on the pattern, not null
     * @throws IllegalArgumentException if the pattern is invalid
     * @see DateTimeFormatterBuilder#appendPattern(String)
     * @example
     * var s = LocalDate.parse('2016-04-01').format(DateTimeFormatter.ofPattern('d MM yyyy'));
     * console.log(s); // '1 04 2016'
     *
     */
    static ofPattern(pattern) {
        return new DateTimeFormatterBuilder().appendPattern(pattern).toFormatter();
    }


    //-----------------------------------------------------------------------
    /**
     * Constructor.
     *
     * @param printerParser  the printer/parser to use, not null
     * @param locale  the locale to use, not null
     * @param decimalStyle  the decimal style to use, not null
     * @param resolverStyle  the resolver style to use, not null
     * @param resolverFields  the fields to use during resolving, null for all fields
     * @param chrono  the chronology to use, null for no override
     * @param zone  the zone to use, null for no override
     * @private
     */
    constructor(printerParser, locale, decimalStyle, resolverStyle, resolverFields, chrono=IsoChronology.INSTANCE, zone) {
        assert(printerParser != null);
        assert(decimalStyle != null);
        assert(resolverStyle != null);
        /**
         * The printer and/or parser to use, not null.
         */
        this._printerParser = printerParser;
        /**
         * The locale to use for formatting. // nyi
         */
        this._locale = locale;
        /**
         * The symbols to use for formatting, not null.
         */
        this._decimalStyle = decimalStyle;
        /**
         * The resolver style to use, not null.
         */
        this._resolverStyle = resolverStyle;
        /**
         * The fields to use in resolving, null for all fields.
         */
        this._resolverFields = resolverFields;
        /**
         * The chronology to use for formatting, null for no override.
         */
        this._chrono = chrono;
        /**
         * The zone to use for formatting, null for no override. // nyi
         */
        this._zone = zone;
    }

    locale() {
        return this._locale;
    }

    decimalStyle() {
        return this._decimalStyle;
    }

    chronology() {
        return this._chrono;
    }

    /**
     * Returns a copy of this formatter with a new override chronology.
     *
     * This returns a formatter with similar state to this formatter but
     * with the override chronology set.
     * By default, a formatter has no override chronology, returning null.
     *
     * If an override is added, then any date that is printed or parsed will be affected.
     *
     * When printing, if the {@link Temporal} object contains a date then it will
     * be converted to a date in the override chronology.
     * Any time or zone will be retained unless overridden.
     * The converted result will behave in a manner equivalent to an implementation
     * of {@link ChronoLocalDate},{@link ChronoLocalDateTime} or {@link ChronoZonedDateTime}.
     *
     * When parsing, the override chronology will be used to interpret the
     * {@link ChronoField} into a date unless the
     * formatter directly parses a valid chronology.
     *
     * This instance is immutable and unaffected by this method call.
     *
     * @param chrono  the new chronology, not null
     * @return a formatter based on this formatter with the requested override chronology, not null
     */
    withChronology(chrono) {
        if (this._chrono != null && this._chrono.equals(chrono)) {
            return this;
        }
        return new DateTimeFormatter(this._printerParser, this._locale, this._decimalStyle,
            this._resolverStyle, this._resolverFields, chrono, this._zone);
    }

    /**
     * not yet supported
     * @returns {DateTimeFormatter}
     */
    withLocale(){
        return this;
    }

    /**
     * Returns a copy of this formatter with a new resolver style.
     * <p>
     * This returns a formatter with similar state to this formatter but
     * with the resolver style set. By default, a formatter has the
     * {@link ResolverStyle#SMART SMART} resolver style.
     * <p>
     * Changing the resolver style only has an effect during parsing.
     * Parsing a text string occurs in two phases.
     * Phase 1 is a basic text parse according to the fields added to the builder.
     * Phase 2 resolves the parsed field-value pairs into date and/or time objects.
     * The resolver style is used to control how phase 2, resolving, happens.
     * See {@link ResolverStyle} for more information on the options available.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {ResolverStyle} resolverStyle  the new resolver style, not null
     * @return {DateTimeFormatter} a formatter based on this formatter with the requested resolver style, not null
     */
    withResolverStyle(resolverStyle) {
        requireNonNull(resolverStyle, 'resolverStyle');
        if (resolverStyle.equals(this._resolverStyle)) {
            return this;
        }
        return new DateTimeFormatter(this._printerParser, this._locale, this._decimalStyle, resolverStyle, this._resolverFields, this._chrono, this._zone);
    }
    //-----------------------------------------------------------------------
    /**
     * Formats a date-time object using this formatter.
     *
     * This formats the date-time to a String using the rules of the formatter.
     *
     * @param {TemporalAccessor} temporal  the temporal object to print, not null
     * @return {String} the printed string, not null
     * @throws DateTimeException if an error occurs during formatting
     */
    format(temporal) {
        const buf = new StringBuilder(32);
        this._formatTo(temporal, buf);
        return buf.toString();
    }

    //-----------------------------------------------------------------------
    /**
     * Formats a date-time object to an {@link Appendable} using this formatter.
     *
     * This formats the date-time to the specified destination.
     * {@link Appendable} is a general purpose interface that is implemented by all
     * key character output classes including {@link StringBuffer}, {@link StringBuilder},
     * {@link PrintStream} and {@link Writer}.
     *
     * Although {@link Appendable} methods throw an {@link IOException}, this method does not.
     * Instead, any {@link IOException} is wrapped in a runtime exception.
     *
     * @param {TemporalAccessor} temporal - the temporal object to print, not null
     * @param {StringBuilder} appendable - the appendable to print to, not null
     * @throws DateTimeException if an error occurs during formatting
     */
    _formatTo(temporal, appendable) {
        requireNonNull(temporal, 'temporal');
        requireNonNull(appendable, 'appendable');
        const context = new DateTimePrintContext(temporal, this);
        this._printerParser.print(context, appendable);
    }

    /**
     * function overloading for {@link DateTimeFormatter.parse}
     *
     * if called with one arg {@link DateTimeFormatter.parse1} is called
     * otherwise {@link DateTimeFormatter.parse2}
     *
     * @param {string} text
     * @param {TemporalQuery} type
     * @return {TemporalAccessor}
     */
    parse(text, type){
        if(arguments.length === 1){
            return this.parse1(text);
        } else {
            return this.parse2(text, type);
        }
    }

    /**
     * Fully parses the text producing a temporal object.
     *
     * This parses the entire text producing a temporal object.
     * It is typically more useful to use {@link parse}.
     * The result of this method is {@link TemporalAccessor} which has been resolved,
     * applying basic validation checks to help ensure a valid date-time.
     *
     * If the parse completes without reading the entire length of the text,
     * or a problem occurs during parsing or merging, then an exception is thrown.
     *
     * @param {String} text  the text to parse, not null
     * @return {TemporalAccessor} the parsed temporal object, not null
     * @throws DateTimeParseException if unable to parse the requested result
     */
    parse1(text) {
        requireNonNull(text, 'text');
        try {
            return this._parseToBuilder(text, null).resolve(this._resolverStyle, this._resolverFields);
        } catch (ex) {
            if(ex instanceof DateTimeParseException){
                throw ex;
            } else {
                throw this._createError(text, ex);
            }
        }
    }

    /**
     * Fully parses the text producing a temporal object.
     *
     * This parses the entire text producing a temporal object.
     * It is typically more useful to use {@link parse}.
     * The result of this method is {@link TemporalAccessor} which has been resolved,
     * applying basic validation checks to help ensure a valid date-time.
     *
     * If the parse completes without reading the entire length of the text,
     * or a problem occurs during parsing or merging, then an exception is thrown.
     *
     * @param text  the text to parse, not null
     * @param type the type to extract, not null
 * @return the parsed temporal object, not null
     * @throws DateTimeParseException if unable to parse the requested result
     */
    parse2(text, type) {
        requireNonNull(text, 'text');
        requireNonNull(type, 'type');
        try {
            const builder = this._parseToBuilder(text, null).resolve(this._resolverStyle, this._resolverFields);
            return builder.build(type);
        } catch (ex) {
            if(ex instanceof DateTimeParseException){
                throw ex;
            } else {
                throw this._createError(text, ex);
            }
        }
    }

    _createError(text, ex) {
        let abbr = '';
        if (text.length > 64) {
            abbr = `${text.substring(0, 64)}...`;
        } else {
            abbr = text;
        }
        return new DateTimeParseException(`Text '${abbr}' could not be parsed: ${ex.message}`, text, 0, ex);
    }


    /**
     * Parses the text to a builder.
     *
     * This parses to a {@link DateTimeBuilder} ensuring that the text is fully parsed.
     * This method throws {@link DateTimeParseException} if unable to parse, or
     * some other {@link DateTimeException} if another date/time problem occurs.
     *
     * @param text  the text to parse, not null
     * @param position  the position to parse from, updated with length parsed
     *  and the index of any error, null if parsing whole string
     * @return the engine representing the result of the parse, not null
     * @throws DateTimeParseException if the parse fails
     */
    _parseToBuilder(text, position) {
        const pos = (position != null ? position : new ParsePosition(0));
        const result = this._parseUnresolved0(text, pos);
        if (result == null || pos.getErrorIndex() >= 0 || (position == null && pos.getIndex() < text.length)) {
            let abbr = '';
            if (text.length > 64) {
                abbr = `${text.substr(0, 64).toString()}...`;
            } else {
                abbr = text;
            }
            if (pos.getErrorIndex() >= 0) {
                throw new DateTimeParseException(`Text '${abbr}' could not be parsed at index ${ 
                    pos.getErrorIndex()}`, text, pos.getErrorIndex());
            } else {
                throw new DateTimeParseException(`Text '${abbr}' could not be parsed, unparsed text found at index ${ 
                    pos.getIndex()}`, text, pos.getIndex());
            }
        }
        return result.toBuilder();
    }

    /**
     * Parses the text using this formatter, without resolving the result, intended
     * for advanced use cases.
     *
     * Parsing is implemented as a two-phase operation.
     * First, the text is parsed using the layout defined by the formatter, producing
     * a {@link Map} of field to value, a {@link ZoneId} and a {@link Chronology}.
     * Second, the parsed data is *resolved*, by validating, combining and
     * simplifying the various fields into more useful ones.
     * This method performs the parsing stage but not the resolving stage.
     *
     * The result of this method is {@link TemporalAccessor} which represents the
     * data as seen in the input. Values are not validated, thus parsing a date string
     * of '2012-00-65' would result in a temporal with three fields - year of '2012',
     * month of '0' and day-of-month of '65'.
     *
     * The text will be parsed from the specified start {@link ParsePosition}.
     * The entire length of the text does not have to be parsed, the {@link ParsePosition}
     * will be updated with the index at the end of parsing.
     *
     * Errors are returned using the error index field of the {@link ParsePosition}
     * instead of {@link DateTimeParseException}.
     * The returned error index will be set to an index indicative of the error.
     * Callers must check for errors before using the context.
     *
     * If the formatter parses the same field more than once with different values,
     * the result will be an error.
     *
     * This method is intended for advanced use cases that need access to the
     * internal state during parsing. Typical application code should use
     * {@link parse} or the parse method on the target type.
     *
     * @param text  the text to parse, not null
     * @param position  the position to parse from, updated with length parsed
     *  and the index of any error, not null
     * @return the parsed text, null if the parse results in an error
     * @throws DateTimeException if some problem occurs during parsing
     * @throws IndexOutOfBoundsException if the position is invalid
     */
    parseUnresolved(text, position) {
        return this._parseUnresolved0(text, position);
    }

    _parseUnresolved0(text, position) {
        assert(text != null, 'text', NullPointerException);
        assert(position != null, 'position', NullPointerException);
        const context = new DateTimeParseContext(this);
        let pos = position.getIndex();
        pos = this._printerParser.parse(context, text, pos);
        if (pos < 0) {
            position.setErrorIndex(~pos);  // index not updated from input
            return null;
        }
        position.setIndex(pos);  // errorIndex not updated from input
        return context.toParsed();
    }

    /**
     * Returns the formatter as a composite printer parser.
     *
     * @param {boolean} optional  whether the printer/parser should be optional
     * @return {CompositePrinterParser} the printer/parser, not null
     */
    _toPrinterParser(optional) {
        return this._printerParser.withOptional(optional);
    }

    /**
     *
     * @returns {string}
     */
    toString() {
        const pattern = this._printerParser.toString();
        return pattern.indexOf('[') === 0 ? pattern : pattern.substring(1, pattern.length - 1);
    }

}

export function _init() {

    DateTimeFormatter.ISO_LOCAL_DATE = new DateTimeFormatterBuilder()
        .appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD)
        .appendLiteral('-')
        .appendValue(ChronoField.MONTH_OF_YEAR, 2)
        .appendLiteral('-')
        .appendValue(ChronoField.DAY_OF_MONTH, 2)
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.ISO_LOCAL_TIME = new DateTimeFormatterBuilder()
        .appendValue(ChronoField.HOUR_OF_DAY, 2)
        .appendLiteral(':')
        .appendValue(ChronoField.MINUTE_OF_HOUR, 2)
        .optionalStart()
        .appendLiteral(':')
        .appendValue(ChronoField.SECOND_OF_MINUTE, 2)
        .optionalStart()
        .appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true)
        .toFormatter(ResolverStyle.STRICT);

    DateTimeFormatter.ISO_LOCAL_DATE_TIME = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .append(DateTimeFormatter.ISO_LOCAL_DATE)
        .appendLiteral('T')
        .append(DateTimeFormatter.ISO_LOCAL_TIME)
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.ISO_INSTANT = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .appendInstant()
        .toFormatter(ResolverStyle.STRICT);

    DateTimeFormatter.ISO_OFFSET_DATE_TIME = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .append(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        .appendOffsetId()
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.ISO_ZONED_DATE_TIME = new DateTimeFormatterBuilder()
        .append(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        .optionalStart()
        .appendLiteral('[')
        .parseCaseSensitive()
        .appendZoneId()
        // .appendZoneRegionId()
        .appendLiteral(']')
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.BASIC_ISO_DATE = new DateTimeFormatterBuilder()
        .appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD)
        .appendValue(ChronoField.MONTH_OF_YEAR, 2)
        .appendValue(ChronoField.DAY_OF_MONTH, 2)
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.ISO_OFFSET_DATE = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .append(DateTimeFormatter.ISO_LOCAL_DATE)
        .appendOffsetId()
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.ISO_OFFSET_TIME = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .append(DateTimeFormatter.ISO_LOCAL_TIME)
        .appendOffsetId()
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.ISO_ORDINAL_DATE = new DateTimeFormatterBuilder()
        .appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD)
        .appendLiteral('-')
        .appendValue(ChronoField.DAY_OF_YEAR)
        .toFormatter(ResolverStyle.STRICT);

    DateTimeFormatter.ISO_WEEK_DATE = new DateTimeFormatterBuilder()
        .appendValue(ChronoField.YEAR, 4, 10, SignStyle.EXCEEDS_PAD)
        .appendLiteral('-W')
        .appendValue(ChronoField.ALIGNED_WEEK_OF_YEAR)
        .appendLiteral('-')
        .appendValue(ChronoField.DAY_OF_WEEK)
        .toFormatter(ResolverStyle.STRICT);

    DateTimeFormatter.ISO_DATE = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .append(DateTimeFormatter.ISO_LOCAL_DATE)
        .optionalStart()
        .appendOffsetId()
        .optionalEnd()
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    DateTimeFormatter.ISO_TIME = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .append(DateTimeFormatter.ISO_LOCAL_TIME)
        .optionalStart()
        .appendOffsetId()
        .optionalEnd()
        .toFormatter(ResolverStyle.STRICT);

    DateTimeFormatter.ISO_DATE_TIME = new DateTimeFormatterBuilder()
        .append(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        .optionalStart()
        .appendOffsetId()
        .optionalEnd()
        .toFormatter(ResolverStyle.STRICT).withChronology(IsoChronology.INSTANCE);

    // TODO:
    //  RFC_1123_DATE_TIME - https://www.threeten.org/threetenbp/apidocs/org/threeten/bp/format/DateTimeFormatter.html#RFC_1123_DATE_TIME

    DateTimeFormatter.PARSED_EXCESS_DAYS = createTemporalQuery('PARSED_EXCESS_DAYS', (temporal) => {
        if (temporal instanceof DateTimeBuilder) {
            return temporal.excessDays;
        } else {
            return Period.ZERO;
        }
    });

    DateTimeFormatter.PARSED_LEAP_SECOND = createTemporalQuery('PARSED_LEAP_SECOND', (temporal) => {
        if (temporal instanceof DateTimeBuilder) {
            return temporal.leapSecond;
        } else {
            return false;
        }
    });


}
