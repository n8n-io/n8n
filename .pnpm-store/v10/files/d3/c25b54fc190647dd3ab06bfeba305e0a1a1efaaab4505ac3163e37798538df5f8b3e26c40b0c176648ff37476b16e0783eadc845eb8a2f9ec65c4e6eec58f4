/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { assert, requireNonNull, requireInstance } from '../assert';
import { IllegalArgumentException, IllegalStateException } from '../errors';
import { MathUtil } from '../MathUtil';

import { LocalDate } from '../LocalDate';
import { LocalDateTime } from '../LocalDateTime';
import { ZoneOffset } from '../ZoneOffset';
import { ChronoLocalDate } from '../chrono/ChronoLocalDate';
import { ChronoField } from '../temporal/ChronoField';
import { IsoFields } from '../temporal/IsoFields';
import { TemporalQueries } from '../temporal/TemporalQueries';

import { DateTimeFormatter } from './DateTimeFormatter';
import { DecimalStyle } from './DecimalStyle';
import { SignStyle } from './SignStyle';
import { TextStyle } from './TextStyle';
import { ResolverStyle } from './ResolverStyle';

import { CharLiteralPrinterParser } from './parser/CharLiteralPrinterParser';
import { CompositePrinterParser } from './parser/CompositePrinterParser';
import { FractionPrinterParser } from './parser/FractionPrinterParser';
import { NumberPrinterParser, ReducedPrinterParser } from './parser/NumberPrinterParser';
import { OffsetIdPrinterParser } from './parser/OffsetIdPrinterParser';
import { PadPrinterParserDecorator } from './parser/PadPrinterParserDecorator';
import { SettingsParser } from './parser/SettingsParser';
import { StringLiteralPrinterParser } from './parser/StringLiteralPrinterParser';
import { ZoneIdPrinterParser } from './parser/ZoneIdPrinterParser';

const MAX_WIDTH = 15; // can't parse all numbers with more then 15 digits in javascript

export class DateTimeFormatterBuilder {

    /**
     * Constructs a new instance of the builder.
     */
    constructor() {
        /**
         * The currently active builder, used by the outermost builder.
         */
        this._active = this;
        /**
         * The parent builder, null for the outermost builder.
         */
        this._parent = null;

        /**
         * The list of printers that will be used.
         */
        this._printerParsers = [];

        /**
         * Whether this builder produces an optional formatter.
         */
        this._optional = false;
        /**
         * The width to pad the next field to.
         */
        this._padNextWidth = 0;

        /**
         * The character to pad the next field with.
         */
        this._padNextChar = null;

        /**
         * The index of the last variable width value parser.
         */
        this._valueParserIndex = -1;
    }

    /**
     * Private static factory, replaces private threeten constructor
     * Returns a new instance of the builder.
     *
     * @param {DateTimeFormatterBuilder} parent  the parent builder, not null
     * @param {boolean} optional  whether the formatter is optional, not null
     * @return {DateTimeFormatterBuilder} new instance
     */
    static _of(parent, optional){
        requireNonNull(parent, 'parent');
        requireNonNull(optional, 'optional');

        const dtFormatterBuilder = new DateTimeFormatterBuilder();
        dtFormatterBuilder._parent = parent;
        dtFormatterBuilder._optional = optional;

        return dtFormatterBuilder;
    }

    /**
     * Changes the parse style to be case sensitive for the remainder of the formatter.
     *
     * Parsing can be case sensitive or insensitive - by default it is case sensitive.
     * This method allows the case sensitivity setting of parsing to be changed.
     *
     * Calling this method changes the state of the builder such that all
     * subsequent builder method calls will parse text in case sensitive mode.
     * See {@link parseCaseInsensitive} for the opposite setting.
     * The parse case sensitive/insensitive methods may be called at any point
     * in the builder, thus the parser can swap between case parsing modes
     * multiple times during the parse.
     *
     * Since the default is case sensitive, this method should only be used after
     * a previous call to {@link parseCaseInsensitive}.
     *
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    parseCaseSensitive() {
        this._appendInternalPrinterParser(SettingsParser.SENSITIVE);
        return this;
    }

    /**
     * Changes the parse style to be case insensitive for the remainder of the formatter.
     *
     * Parsing can be case sensitive or insensitive - by default it is case sensitive.
     * This method allows the case sensitivity setting of parsing to be changed.
     *
     * Calling this method changes the state of the builder such that all
     * subsequent builder method calls will parse text in case sensitive mode.
     * See {@link parseCaseSensitive} for the opposite setting.
     * The parse case sensitive/insensitive methods may be called at any point
     * in the builder, thus the parser can swap between case parsing modes
     * multiple times during the parse.
     *
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    parseCaseInsensitive() {
        this._appendInternalPrinterParser(SettingsParser.INSENSITIVE);
        return this;
    }

    //-----------------------------------------------------------------------
    /**
     * Changes the parse style to be strict for the remainder of the formatter.
     *
     * Parsing can be strict or lenient - by default its strict.
     * This controls the degree of flexibility in matching the text and sign styles.
     *
     * When used, this method changes the parsing to be strict from this point onwards.
     * As strict is the default, this is normally only needed after calling {@link parseLenient}.
     * The change will remain in force until the end of the formatter that is eventually
     * constructed or until {@link parseLenient} is called.
     *
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    parseStrict() {
        this._appendInternalPrinterParser(SettingsParser.STRICT);
        return this;
    }

    /**
     * Changes the parse style to be lenient for the remainder of the formatter.
     * Note that case sensitivity is set separately to this method.
     *
     * Parsing can be strict or lenient - by default its strict.
     * This controls the degree of flexibility in matching the text and sign styles.
     * Applications calling this method should typically also call {@link parseCaseInsensitive}.
     *
     * When used, this method changes the parsing to be strict from this point onwards.
     * The change will remain in force until the end of the formatter that is eventually
     * constructed or until {@link parseStrict} is called.
     *
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    parseLenient() {
        this._appendInternalPrinterParser(SettingsParser.LENIENT);
        return this;
    }

    /**
     * Appends a default value for a field to the formatter for use in parsing.
     * <p>
     * This appends an instruction to the builder to inject a default value
     * into the parsed result. This is especially useful in conjunction with
     * optional parts of the formatter.
     * <p>
     * For example, consider a formatter that parses the year, followed by
     * an optional month, with a further optional day-of-month. Using such a
     * formatter would require the calling code to check whether a full date,
     * year-month or just a year had been parsed. This method can be used to
     * default the month and day-of-month to a sensible value, such as the
     * first of the month, allowing the calling code to always get a date.
     * <p>
     * During formatting, this method has no effect.
     * <p>
     * During parsing, the current state of the parse is inspected.
     * If the specified field has no associated value, because it has not been
     * parsed successfully at that point, then the specified value is injected
     * into the parse result. Injection is immediate, thus the field-value pair
     * will be visible to any subsequent elements in the formatter.
     * As such, this method is normally called at the end of the builder.
     *
     * @param {TemporalField} field  the field to default the value of, not null
     * @param {number} value  the value to default the field to
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    parseDefaulting(field, value) {
        requireNonNull(field);
        this._appendInternal(new DefaultingParser(field, value));
        return this;
    }

    /**
     * appendValue function overloading
     */
    appendValue(){
        if(arguments.length === 1){
            return this._appendValue1.apply(this, arguments);
        } else if(arguments.length === 2){
            return this._appendValue2.apply(this, arguments);
        } else {
            return this._appendValue4.apply(this, arguments);
        }
    }

    /**
     * Appends the value of a date-time field to the formatter using a normal
     * output style.
     *
     * The value of the field will be output during a print.
     * If the value cannot be obtained then an exception will be thrown.
     *
     * The value will be printed as per the normal print of an integer value.
     * Only negative numbers will be signed. No padding will be added.
     *
     * The parser for a variable width value such as this normally behaves greedily,
     * requiring one digit, but accepting as many digits as possible.
     * This behavior can be affected by 'adjacent value parsing'.
     * See {@link appendValue} for full details.
     *
     * @param field  the field to append, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    _appendValue1(field) {
        requireNonNull(field);
        this._appendValuePrinterParser(new NumberPrinterParser(field, 1, MAX_WIDTH, SignStyle.NORMAL));
        return this;
    }

    /**
     * Appends the value of a date-time field to the formatter using a fixed
     * width, zero-padded approach.
     *
     * The value of the field will be output during a print.
     * If the value cannot be obtained then an exception will be thrown.
     *
     * The value will be zero-padded on the left. If the size of the value
     * means that it cannot be printed within the width then an exception is thrown.
     * If the value of the field is negative then an exception is thrown during printing.
     *
     * This method supports a special technique of parsing known as 'adjacent value parsing'.
     * This technique solves the problem where a variable length value is followed by one or more
     * fixed length values. The standard parser is greedy, and thus it would normally
     * steal the digits that are needed by the fixed width value parsers that follow the
     * variable width one.
     *
     * No action is required to initiate 'adjacent value parsing'.
     * When a call to {@link appendValue} with a variable width is made, the builder
     * enters adjacent value parsing setup mode. If the immediately subsequent method
     * call or calls on the same builder are to this method, then the parser will reserve
     * space so that the fixed width values can be parsed.
     *
     * For example, consider `builder.appendValue(YEAR).appendValue(MONTH_OF_YEAR, 2)`.
     * The year is a variable width parse of between 1 and 19 digits.
     * The month is a fixed width parse of 2 digits.
     * Because these were appended to the same builder immediately after one another,
     * the year parser will reserve two digits for the month to parse.
     * Thus, the text '201106' will correctly parse to a year of 2011 and a month of 6.
     * Without adjacent value parsing, the year would greedily parse all six digits and leave
     * nothing for the month.
     *
     * Adjacent value parsing applies to each set of fixed width not-negative values in the parser
     * that immediately follow any kind of variable width value.
     * Calling any other append method will end the setup of adjacent value parsing.
     * Thus, in the unlikely event that you need to avoid adjacent value parsing behavior,
     * simply add the `appendValue` to another {@link DateTimeFormatterBuilder}
     * and add that to this builder.
     *
     * If adjacent parsing is active, then parsing must match exactly the specified
     * number of digits in both strict and lenient modes.
     * In addition, no positive or negative sign is permitted.
     *
     * @param field  the field to append, not null
     * @param width  the width of the printed field, from 1 to 19
     * @return this, for chaining, not null
     * @throws IllegalArgumentException if the width is invalid
     */
    _appendValue2(field, width) {
        requireNonNull(field);
        if (width < 1 || width > MAX_WIDTH) {
            throw new IllegalArgumentException(`The width must be from 1 to ${MAX_WIDTH} inclusive but was ${width}`);
        }
        const pp = new NumberPrinterParser(field, width, width, SignStyle.NOT_NEGATIVE);
        this._appendValuePrinterParser(pp);
        return this;
    }

    /**
     * Appends the value of a date-time field to the formatter providing full
     * control over printing.
     *
     * The value of the field will be output during a print.
     * If the value cannot be obtained then an exception will be thrown.
     *
     * This method provides full control of the numeric formatting, including
     * zero-padding and the positive/negative sign.
     *
     * The parser for a variable width value such as this normally behaves greedily,
     * accepting as many digits as possible.
     * This behavior can be affected by 'adjacent value parsing'.
     * See {@link appendValue} for full details.
     *
     * In strict parsing mode, the minimum number of parsed digits is `minWidth`.
     * In lenient parsing mode, the minimum number of parsed digits is one.
     *
     * If this method is invoked with equal minimum and maximum widths and a sign style of
     * `NOT_NEGATIVE` then it delegates to `appendValue(TemporalField, int)`.
     * In this scenario, the printing and parsing behavior described there occur.
     *
     * @param field  the field to append, not null
     * @param minWidth  the minimum field width of the printed field, from 1 to 19
     * @param maxWidth  the maximum field width of the printed field, from 1 to 19
     * @param signStyle  the positive/negative output style, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalArgumentException if the widths are invalid
     */
    _appendValue4(field, minWidth, maxWidth, signStyle) {
        requireNonNull(field);
        requireNonNull(signStyle);
        if (minWidth === maxWidth && signStyle === SignStyle.NOT_NEGATIVE) {
            return this._appendValue2(field, maxWidth);
        }
        if (minWidth < 1 || minWidth > MAX_WIDTH) {
            throw new IllegalArgumentException(`The minimum width must be from 1 to ${MAX_WIDTH} inclusive but was ${minWidth}`);
        }
        if (maxWidth < 1 || maxWidth > MAX_WIDTH) {
            throw new IllegalArgumentException(`The minimum width must be from 1 to ${MAX_WIDTH} inclusive but was ${maxWidth}`);
        }
        if (maxWidth < minWidth) {
            throw new IllegalArgumentException(`The maximum width must exceed or equal the minimum width but ${maxWidth} < ${minWidth}`);
        }
        const pp = new NumberPrinterParser(field, minWidth, maxWidth, signStyle);
        this._appendValuePrinterParser(pp);
        return this;
    }

    /**
     * appendValueReduced function overloading
     */
    appendValueReduced() {
        if (arguments.length === 4 && arguments[3] instanceof ChronoLocalDate) {
            return this._appendValueReducedFieldWidthMaxWidthBaseDate.apply(this, arguments);
        } else {
            return this._appendValueReducedFieldWidthMaxWidthBaseValue.apply(this, arguments);
        }
    }

    /**
     * Appends the reduced value of a date-time field to the formatter.
     *
     * Since fields such as year vary by chronology, it is recommended to use the
     * {@link appendValueReduced} date}
     * variant of this method in most cases. This variant is suitable for
     * simple fields or working with only the ISO chronology.
     *
     * For formatting, the `width` and `maxWidth` are used to
     * determine the number of characters to format.
     * If they are equal then the format is fixed width.
     * If the value of the field is within the range of the `baseValue` using
     * `width` characters then the reduced value is formatted otherwise the value is
     * truncated to fit `maxWidth`.
     * The rightmost characters are output to match the width, left padding with zero.
     *
     * For strict parsing, the number of characters allowed by `width` to `maxWidth` are parsed.
     * For lenient parsing, the number of characters must be at least 1 and less than 10.
     * If the number of digits parsed is equal to `width` and the value is positive,
     * the value of the field is computed to be the first number greater than
     * or equal to the `baseValue` with the same least significant characters,
     * otherwise the value parsed is the field value.
     * This allows a reduced value to be entered for values in range of the baseValue
     * and width and absolute values can be entered for values outside the range.
     *
     * For example, a base value of `1980` and a width of `2` will have
     * valid values from `1980` to `2079`.
     * During parsing, the text `"12"` will result in the value `2012` as that
     * is the value within the range where the last two characters are "12".
     * By contrast, parsing the text `"1915"` will result in the value `1915`.
     *
     * @param {TemporalField} field  the field to append, not null
     * @param {number} width  the field width of the printed and parsed field, from 1 to 10
     * @param {number} maxWidth  the maximum field width of the printed field, from 1 to 10
     * @param {number} baseValue  the base value of the range of valid values
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalArgumentException if the width or base value is invalid
     */
    _appendValueReducedFieldWidthMaxWidthBaseValue(field, width, maxWidth, baseValue) {
        requireNonNull(field, 'field');
        const pp = new ReducedPrinterParser(field, width, maxWidth, baseValue, null);
        this._appendValuePrinterParser(pp);
        return this;
    }

    /**
     * Appends the reduced value of a date-time field to the formatter.
     *
     * This is typically used for formatting and parsing a two digit year.
     *
     * The base date is used to calculate the full value during parsing.
     * For example, if the base date is 1950-01-01 then parsed values for
     * a two digit year parse will be in the range 1950-01-01 to 2049-12-31.
     * Only the year would be extracted from the date, thus a base date of
     * 1950-08-25 would also parse to the range 1950-01-01 to 2049-12-31.
     * This behavior is necessary to support fields such as week-based-year
     * or other calendar systems where the parsed value does not align with
     * standard ISO years.
     *
     * The exact behavior is as follows. Parse the full set of fields and
     * determine the effective chronology using the last chronology if
     * it appears more than once. Then convert the base date to the
     * effective chronology. Then extract the specified field from the
     * chronology-specific base date and use it to determine the
     * `baseValue` used below.
     *
     * For formatting, the `width` and `maxWidth` are used to
     * determine the number of characters to format.
     * If they are equal then the format is fixed width.
     * If the value of the field is within the range of the `baseValue` using
     * `width` characters then the reduced value is formatted otherwise the value is
     * truncated to fit `maxWidth`.
     * The rightmost characters are output to match the width, left padding with zero.
     *
     * For strict parsing, the number of characters allowed by `width` to `maxWidth` are parsed.
     * For lenient parsing, the number of characters must be at least 1 and less than 10.
     * If the number of digits parsed is equal to `width` and the value is positive,
     * the value of the field is computed to be the first number greater than
     * or equal to the `baseValue` with the same least significant characters,
     * otherwise the value parsed is the field value.
     * This allows a reduced value to be entered for values in range of the baseValue
     * and width and absolute values can be entered for values outside the range.
     *
     * For example, a base value of `1980` and a width of `2` will have
     * valid values from `1980` to `2079`.
     * During parsing, the text `"12"` will result in the value `2012` as that
     * is the value within the range where the last two characters are "12".
     * By contrast, parsing the text `"1915"` will result in the value `1915`.
     *
     * @param {TemporalField} field  the field to append, not null
     * @param {number} width  the field width of the printed and parsed field, from 1 to 10
     * @param {number} maxWidth  the maximum field width of the printed field, from 1 to 10
     * @param {ChronoLocalDate} baseDate  the base date used to calculate the base value for the range
     *  of valid values in the parsed chronology, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalArgumentException if the width or base value is invalid
     */
    _appendValueReducedFieldWidthMaxWidthBaseDate(field, width, maxWidth, baseDate) {
        requireNonNull(field, 'field');
        requireNonNull(baseDate, 'baseDate');
        requireInstance(baseDate, ChronoLocalDate, 'baseDate');
        const pp = new ReducedPrinterParser(field, width, maxWidth, 0, baseDate);
        this._appendValuePrinterParser(pp);
        return this;
    }

    /**
     * Appends a fixed width printer-parser.
     *
     * @param pp  the printer-parser, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    _appendValuePrinterParser(pp) {
        assert(pp != null);
        if (this._active._valueParserIndex >= 0 &&
                this._active._printerParsers[this._active._valueParserIndex] instanceof NumberPrinterParser) {
            const activeValueParser = this._active._valueParserIndex;

            // adjacent parsing mode, update setting in previous parsers
            let basePP = this._active._printerParsers[activeValueParser];
            if (pp.minWidth() === pp.maxWidth() && pp.signStyle() === SignStyle.NOT_NEGATIVE) {
                // Append the width to the subsequentWidth of the active parser
                basePP = basePP.withSubsequentWidth(pp.maxWidth());
                // Append the new parser as a fixed width
                this._appendInternal(pp.withFixedWidth());
                // Retain the previous active parser
                this._active._valueParserIndex = activeValueParser;
            } else {
                // Modify the active parser to be fixed width
                basePP = basePP.withFixedWidth();
                // The new parser becomes the mew active parser
                this._active._valueParserIndex = this._appendInternal(pp);
            }
            // Replace the modified parser with the updated one
            this._active._printerParsers[activeValueParser] = basePP;
        } else {
            // The new Parser becomes the active parser
            this._active._valueParserIndex = this._appendInternal(pp);
        }
        return this;
    }

    //-----------------------------------------------------------------------
    /**
     * Appends the fractional value of a date-time field to the formatter.
     *
     * The fractional value of the field will be output including the
     * preceding decimal point. The preceding value is not output.
     * For example, the second-of-minute value of 15 would be output as `.25`.
     *
     * The width of the printed fraction can be controlled. Setting the
     * minimum width to zero will cause no output to be generated.
     * The printed fraction will have the minimum width necessary between
     * the minimum and maximum widths - trailing zeroes are omitted.
     * No rounding occurs due to the maximum width - digits are simply dropped.
     *
     * When parsing in strict mode, the number of parsed digits must be between
     * the minimum and maximum width. When parsing in lenient mode, the minimum
     * width is considered to be zero and the maximum is nine.
     *
     * If the value cannot be obtained then an exception will be thrown.
     * If the value is negative an exception will be thrown.
     * If the field does not have a fixed set of valid values then an
     * exception will be thrown.
     * If the field value in the date-time to be printed is invalid it
     * cannot be printed and an exception will be thrown.
     *
     * @param {TemporalField} field  the field to append, not null
     * @param {Number} minWidth  the minimum width of the field excluding the decimal point, from 0 to 9
     * @param {Number} maxWidth  the maximum width of the field excluding the decimal point, from 1 to 9
     * @param {boolean} decimalPoint  whether to output the localized decimal point symbol
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalArgumentException if the field has a variable set of valid values or
     *  either width is invalid
     */
    appendFraction(field, minWidth, maxWidth, decimalPoint) {
        this._appendInternal(new FractionPrinterParser(field, minWidth, maxWidth, decimalPoint));
        return this;
    }

    /**
     * Appends an instant using ISO-8601 to the formatter with control over
     * the number of fractional digits.
     *
     * Instants have a fixed output format, although this method provides some
     * control over the fractional digits. They are converted to a date-time
     * with a zone-offset of UTC and printed using the standard ISO-8601 format.
     * The localized decimal style is not used.
     *
     * The {@link this.fractionalDigits} parameter allows the output of the fractional
     * second to be controlled. Specifying zero will cause no fractional digits
     * to be output. From 1 to 9 will output an increasing number of digits, using
     * zero right-padding if necessary. The special value -1 is used to output as
     * many digits as necessary to avoid any trailing zeroes.
     *
     * When parsing in strict mode, the number of parsed digits must match the
     * fractional digits. When parsing in lenient mode, any number of fractional
     * digits from zero to nine are accepted.
     *
     * The instant is obtained using {@link ChronoField#INSTANT_SECONDS}
     * and optionally (@code NANO_OF_SECOND). The value of {@link INSTANT_SECONDS}
     * may be outside the maximum range of {@link LocalDateTime}.
     *
     * The {@link ResolverStyle} has no effect on instant parsing.
     * The end-of-day time of '24:00' is handled as midnight at the start of the following day.
     * The leap-second time of '23:59:59' is handled to some degree, see
     * {@link DateTimeFormatter#parsedLeapSecond} for full details.
     *
     * An alternative to this method is to format/parse the instant as a single
     * epoch-seconds value. That is achieved using `appendValue(INSTANT_SECONDS)`.
     *
     * @param {number} [fractionalDigits=-2] - the number of fractional second digits to format with,
     *  from 0 to 9, or -1 to use as many digits as necessary
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    appendInstant(fractionalDigits=-2) {
        if (fractionalDigits < -2 || fractionalDigits > 9) {
            throw new IllegalArgumentException(`Invalid fractional digits: ${fractionalDigits}`);
        }
        this._appendInternal(new InstantPrinterParser(fractionalDigits));
        return this;
    }


    /**
     * Appends the zone offset, such as '+01:00', to the formatter.
     *
     * This appends an instruction to print/parse the offset ID to the builder.
     * This is equivalent to calling `appendOffset("HH:MM:ss", "Z")`.
     *
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    appendOffsetId() {
        this._appendInternal(OffsetIdPrinterParser.INSTANCE_ID);
        return this;
    }

    /**
     * Appends the zone offset, such as '+01:00', to the formatter.
     *
     * This appends an instruction to print/parse the offset ID to the builder.
     *
     * During printing, the offset is obtained using a mechanism equivalent
     * to querying the temporal with {@link TemporalQueries#offset}.
     * It will be printed using the format defined below.
     * If the offset cannot be obtained then an exception is thrown unless the
     * section of the formatter is optional.
     *
     * During parsing, the offset is parsed using the format defined below.
     * If the offset cannot be parsed then an exception is thrown unless the
     * section of the formatter is optional.
     *
     * The format of the offset is controlled by a pattern which must be one
     * of the following:
     *
     * * `+HH` - hour only, ignoring minute and second
     * * `+HHmm` - hour, with minute if non-zero, ignoring second, no colon
     * * `+HH:mm` - hour, with minute if non-zero, ignoring second, with colon
     * * `+HHMM` - hour and minute, ignoring second, no colon
     * * `+HH:MM` - hour and minute, ignoring second, with colon
     * * `+HHMMss` - hour and minute, with second if non-zero, no colon
     * * `+HH:MM:ss` - hour and minute, with second if non-zero, with colon
     * * `+HHMMSS` - hour, minute and second, no colon
     * * `+HH:MM:SS` - hour, minute and second, with colon
     *
     * The "no offset" text controls what text is printed when the total amount of
     * the offset fields to be output is zero.
     * Example values would be 'Z', '+00:00', 'UTC' or 'GMT'.
     * Three formats are accepted for parsing UTC - the "no offset" text, and the
     * plus and minus versions of zero defined by the pattern.
     *
     * @param {String} pattern  the pattern to use, not null
     * @param {String} noOffsetText  the text to use when the offset is zero, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    appendOffset(pattern, noOffsetText) {
        this._appendInternalPrinterParser(new OffsetIdPrinterParser(noOffsetText, pattern));
        return this;
    }

    /**
      * Appends the time-zone ID, such as 'Europe/Paris' or '+02:00', to the formatter.
      *
      * This appends an instruction to print/parse the zone ID to the builder.
      * The zone ID is obtained in a strict manner suitable for {@link ZonedDateTime}.
      * By contrast, {@link OffsetDateTime} does not have a zone ID suitable
      * for use with this method, see {@link appendZoneOrOffsetId}.
      *
      * During printing, the zone is obtained using a mechanism equivalent
      * to querying the temporal with {@link TemporalQueries#zoneId}.
      * It will be printed using the result of {@link ZoneId#getId}.
      * If the zone cannot be obtained then an exception is thrown unless the
      * section of the formatter is optional.
      *
      * During parsing, the zone is parsed and must match a known zone or offset.
      * If the zone cannot be parsed then an exception is thrown unless the
      * section of the formatter is optional.
      *
      * @return {DateTimeFormatterBuilder} this, for chaining, not null
      * @see #appendZoneRegionId()
      */
    appendZoneId() {
        this._appendInternal(new ZoneIdPrinterParser(TemporalQueries.zoneId(), 'ZoneId()'));
        return this;
    }

    //-----------------------------------------------------------------------
    /**
     * Appends the elements defined by the specified pattern to the builder.
     *
     * All letters 'A' to 'Z' and 'a' to 'z' are reserved as pattern letters.
     * The characters '{' and '}' are reserved for future use.
     * The characters '[' and ']' indicate optional patterns.
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
     * Less than 4 pattern letters will use the short form (see {@link TextStyle#SHORT}).
     * Exactly 4 pattern letters will use the full form (see {@link TextStyle#FULL}).
     * Exactly 5 pattern letters will use the narrow form (see {@link TextStyle#NARROW}).
     *
     * **Number**: If the count of letters is one, then the value is printed using the minimum number
     * of digits and without padding as per {@link appendValue}. Otherwise, the
     * count of digits is used as the width of the output field as per {@link appendValue}.
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
     * If the count of letters is two, then a reduced (see {@link appendValueReduced}) two digit form is used.
     * For printing, this outputs the rightmost two digits. For parsing, this will parse using the
     * base value of 2000, resulting in a year within the range 2000 to 2099 inclusive.
     * If the count of letters is less than four (but not two), then the sign is only output for negative
     * years as per {@link SignStyle#NORMAL}.
     * Otherwise, the sign is output if the pad width is exceeded, as per {@link SignStyle#EXCEEDS_PAD}
     *
     * **ZoneId**: This outputs the time-zone ID, such as 'Europe/Paris'.
     * If the count of letters is two, then the time-zone ID is output.
     * Any other count of letters throws {@link IllegalArgumentException}.
     * <pre>
     *  Pattern     Equivalent builder methods
     *   VV          appendZoneId()
     * </pre>
     *
     * **Zone names**: This outputs the display name of the time-zone ID.
     * If the count of letters is one, two or three, then the short name is output.
     * If the count of letters is four, then the full name is output.
     * Five or more letters throws {@link IllegalArgumentException}.
     * <pre>
     *  Pattern     Equivalent builder methods
     *   z           appendZoneText(TextStyle.SHORT)
     *   zz          appendZoneText(TextStyle.SHORT)
     *   zzz         appendZoneText(TextStyle.SHORT)
     *   zzzz        appendZoneText(TextStyle.FULL)
     * </pre>
     *
     * **Offset X and x**: This formats the offset based on the number of pattern letters.
     * One letter outputs just the hour', such as '+01', unless the minute is non-zero
     * in which case the minute is also output, such as '+0130'.
     * Two letters outputs the hour and minute, without a colon, such as '+0130'.
     * Three letters outputs the hour and minute, with a colon, such as '+01:30'.
     * Four letters outputs the hour and minute and optional second, without a colon, such as '+013015'.
     * Five letters outputs the hour and minute and optional second, with a colon, such as '+01:30:15'.
     * Six or more letters throws {@link IllegalArgumentException}.
     * Pattern letter 'X' (upper case) will output 'Z' when the offset to be output would be zero,
     * whereas pattern letter 'x' (lower case) will output '+00', '+0000', or '+00:00'.
     * <pre>
     *  Pattern     Equivalent builder methods
     *   X           appendOffset("+HHmm","Z")
     *   XX          appendOffset("+HHMM","Z")
     *   XXX         appendOffset("+HH:MM","Z")
     *   XXXX        appendOffset("+HHMMss","Z")
     *   XXXXX       appendOffset("+HH:MM:ss","Z")
     *   x           appendOffset("+HHmm","+00")
     *   xx          appendOffset("+HHMM","+0000")
     *   xxx         appendOffset("+HH:MM","+00:00")
     *   xxxx        appendOffset("+HHMMss","+0000")
     *   xxxxx       appendOffset("+HH:MM:ss","+00:00")
     * </pre>
     *
     * **Offset Z**: This formats the offset based on the number of pattern letters.
     * One, two or three letters outputs the hour and minute, without a colon, such as '+0130'.
     * Four or more letters throws {@link IllegalArgumentException}.
     * The output will be '+0000' when the offset is zero.
     * <pre>
     *  Pattern     Equivalent builder methods
     *   Z           appendOffset("+HHMM","+0000")
     *   ZZ          appendOffset("+HHMM","+0000")
     *   ZZZ         appendOffset("+HHMM","+0000")
     * </pre>
     *
     * **Optional section**: The optional section markers work exactly like calling {@link optionalStart}
     * and {@link optionalEnd}.
     *
     * **Pad modifier**: Modifies the pattern that immediately follows to be padded with spaces.
     * The pad width is determined by the number of pattern letters.
     * This is the same as calling {@link padNext}.
     *
     * For example, 'ppH' outputs the hour-of-day padded on the left with spaces to a width of 2.
     *
     * Any unrecognized letter is an error.
     * Any non-letter character, other than '[', ']', '{', '}' and the single quote will be output directly.
     * Despite this, it is recommended to use single quotes around all characters that you want to
     * output directly to ensure that future changes do not break your application.
     *
     * Note that the pattern string is similar, but not identical, to
     * {@link java.text.SimpleDateFormat}.
     * The pattern string is also similar, but not identical, to that defined by the
     * Unicode Common Locale Data Repository (CLDR/LDML).
     * Pattern letters 'E' and 'u' are merged, which changes the meaning of "E" and "EE" to be numeric.
     * Pattern letters 'X' is aligned with Unicode CLDR/LDML, which affects pattern 'X'.
     * Pattern letter 'y' and 'Y' parse years of two digits and more than 4 digits differently.
     * Pattern letters 'n', 'A', 'N', 'I' and 'p' are added.
     * Number types will reject large numbers.
     *
     * @param {String} pattern  the pattern to add, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalArgumentException if the pattern is invalid
     */
    appendPattern(pattern) {
        requireNonNull(pattern, 'pattern');
        this._parsePattern(pattern);
        return this;
    }


    //-----------------------------------------------------------------------
    // empty implementations of locale functionality, be implemented/overridden by js-joda-locale

    appendZoneText() {
        throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
    }

    appendText() {
        throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
    }

    appendLocalizedOffset() {
        throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
    }

    appendWeekField() {
        throw new IllegalArgumentException('Pattern using (localized) text not implemented, use @js-joda/locale plugin!');
    }

    //-----------------------------------------------------------------------

    _parsePattern(pattern) {
        /** Map of letters to fields. */
        const FIELD_MAP = {
            'G': ChronoField.ERA,
            'y': ChronoField.YEAR_OF_ERA,
            'u': ChronoField.YEAR,
            'Q': IsoFields.QUARTER_OF_YEAR,
            'q': IsoFields.QUARTER_OF_YEAR,
            'M': ChronoField.MONTH_OF_YEAR,
            'L': ChronoField.MONTH_OF_YEAR,
            'D': ChronoField.DAY_OF_YEAR,
            'd': ChronoField.DAY_OF_MONTH,
            'F': ChronoField.ALIGNED_DAY_OF_WEEK_IN_MONTH,
            'E': ChronoField.DAY_OF_WEEK,
            'c': ChronoField.DAY_OF_WEEK,
            'e': ChronoField.DAY_OF_WEEK,
            'a': ChronoField.AMPM_OF_DAY,
            'H': ChronoField.HOUR_OF_DAY,
            'k': ChronoField.CLOCK_HOUR_OF_DAY,
            'K': ChronoField.HOUR_OF_AMPM,
            'h': ChronoField.CLOCK_HOUR_OF_AMPM,
            'm': ChronoField.MINUTE_OF_HOUR,
            's': ChronoField.SECOND_OF_MINUTE,
            'S': ChronoField.NANO_OF_SECOND,
            'A': ChronoField.MILLI_OF_DAY,
            'n': ChronoField.NANO_OF_SECOND,
            'N': ChronoField.NANO_OF_DAY
        };

        for (let pos = 0; pos < pattern.length; pos++) {
            let cur = pattern.charAt(pos);
            if ((cur >= 'A' && cur <= 'Z') || (cur >= 'a' && cur <= 'z')) {
                let start = pos++;
                for (; pos < pattern.length && pattern.charAt(pos) === cur; pos++);  // short loop
                let count = pos - start;
                // padding
                if (cur === 'p') {
                    let pad = 0;
                    if (pos < pattern.length) {
                        cur = pattern.charAt(pos);
                        if ((cur >= 'A' && cur <= 'Z') || (cur >= 'a' && cur <= 'z')) {
                            pad = count;
                            start = pos++;
                            for (; pos < pattern.length && pattern.charAt(pos) === cur; pos++);  // short loop
                            count = pos - start;
                        }
                    }
                    if (pad === 0) {
                        throw new IllegalArgumentException(
                            `Pad letter 'p' must be followed by valid pad pattern: ${pattern}`);
                    }
                    this.padNext(pad); // pad and continue parsing
                }
                // main rules
                const field = FIELD_MAP[cur];
                if (field != null) {
                    this._parseField(cur, count, field);
                } else if (cur === 'z') {
                    if (count > 4) {
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                    } else if (count === 4) {
                        this.appendZoneText(TextStyle.FULL);
                    } else {
                        this.appendZoneText(TextStyle.SHORT);
                    }
                } else if (cur === 'V') {
                    if (count !== 2) {
                        throw new IllegalArgumentException(`Pattern letter count must be 2: ${cur}`);
                    }
                    this.appendZoneId();
                } else if (cur === 'Z') {
                    if (count < 4) {
                        this.appendOffset('+HHMM', '+0000');
                    } else if (count === 4) {
                        this.appendLocalizedOffset(TextStyle.FULL);
                    } else if (count === 5) {
                        this.appendOffset('+HH:MM:ss', 'Z');
                    } else {
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                    }
                } else if (cur === 'O') {
                    if (count === 1) {
                        this.appendLocalizedOffset(TextStyle.SHORT);
                    } else if (count === 4) {
                        this.appendLocalizedOffset(TextStyle.FULL);
                    } else {
                        throw new IllegalArgumentException(`Pattern letter count must be 1 or 4: ${cur}`);
                    }
                } else if (cur === 'X') {
                    if (count > 5) {
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                    }
                    this.appendOffset(OffsetIdPrinterParser.PATTERNS[count + (count === 1 ? 0 : 1)], 'Z');
                } else if (cur === 'x') {
                    if (count > 5) {
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                    }
                    const zero = (count === 1 ? '+00' : (count % 2 === 0 ? '+0000' : '+00:00'));
                    this.appendOffset(OffsetIdPrinterParser.PATTERNS[count + (count === 1 ? 0 : 1)], zero);
                } else if (cur === 'W') {
                    if (count > 1) {
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                    }
                    this.appendWeekField('W', count);
                } else if (cur === 'w') {
                    if (count > 2) {
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                    }
                    this.appendWeekField('w', count);
                } else if (cur === 'Y') {
                    this.appendWeekField('Y', count);
                } else {
                    throw new IllegalArgumentException(`Unknown pattern letter: ${cur}`);
                }
                pos--;

            } else if (cur === '\'') {
                // parse literals
                const start = pos++;
                for (; pos < pattern.length; pos++) {
                    if (pattern.charAt(pos) === '\'') {
                        if (pos + 1 < pattern.length && pattern.charAt(pos + 1) === '\'') {
                            pos++;
                        } else {
                            break;  // end of literal
                        }
                    }
                }
                if (pos >= pattern.length) {
                    throw new IllegalArgumentException(`Pattern ends with an incomplete string literal: ${pattern}`);
                }
                const str = pattern.substring(start + 1, pos);
                if (str.length === 0) {
                    this.appendLiteral('\'');
                } else {
                    this.appendLiteral(str.replace('\'\'', '\''));
                }

            } else if (cur === '[') {
                this.optionalStart();

            } else if (cur === ']') {
                if (this._active._parent === null) {
                    throw new IllegalArgumentException('Pattern invalid as it contains ] without previous [');
                }
                this.optionalEnd();

            } else if (cur === '{' || cur === '}' || cur === '#') {
                throw new IllegalArgumentException(`Pattern includes reserved character: '${cur}'`);
            } else {
                this.appendLiteral(cur);
            }
        }
    }

    _parseField(cur, count, field) {
        switch (cur) {
            case 'u':
            case 'y':
                if (count === 2) {
                    this.appendValueReduced(field, 2, 2, ReducedPrinterParser.BASE_DATE);
                } else if (count < 4) {
                    this.appendValue(field, count, MAX_WIDTH, SignStyle.NORMAL);
                } else {
                    this.appendValue(field, count, MAX_WIDTH, SignStyle.EXCEEDS_PAD);
                }
                break;
            case 'M':
            case 'Q':
                switch (count) {
                    case 1:
                        this.appendValue(field);
                        break;
                    case 2:
                        this.appendValue(field, 2);
                        break;
                    case 3:
                        this.appendText(field, TextStyle.SHORT);
                        break;
                    case 4:
                        this.appendText(field, TextStyle.FULL);
                        break;
                    case 5:
                        this.appendText(field, TextStyle.NARROW);
                        break;
                    default:
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                break;
            case 'L':
            case 'q':
                switch (count) {
                    case 1:
                        this.appendValue(field);
                        break;
                    case 2:
                        this.appendValue(field, 2);
                        break;
                    case 3:
                        this.appendText(field, TextStyle.SHORT_STANDALONE);
                        break;
                    case 4:
                        this.appendText(field, TextStyle.FULL_STANDALONE);
                        break;
                    case 5:
                        this.appendText(field, TextStyle.NARROW_STANDALONE);
                        break;
                    default:
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                break;
            case 'e':
                switch (count) {
                    case 1:
                    case 2:
                        this.appendWeekField('e', count);
                        break;
                    case 3:
                        this.appendText(field, TextStyle.SHORT);
                        break;
                    case 4:
                        this.appendText(field, TextStyle.FULL);
                        break;
                    case 5:
                        this.appendText(field, TextStyle.NARROW);
                        break;
                    default:
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                // eslint-disable-next-line no-unreachable
                break;
            case 'c':
                switch (count) {
                    case 1:
                        this.appendWeekField('c', count);
                        break;
                    case 2:
                        throw new IllegalArgumentException(`Invalid number of pattern letters: ${cur}`);
                    case 3:
                        this.appendText(field, TextStyle.SHORT_STANDALONE);
                        break;
                    case 4:
                        this.appendText(field, TextStyle.FULL_STANDALONE);
                        break;
                    case 5:
                        this.appendText(field, TextStyle.NARROW_STANDALONE);
                        break;
                    default:
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                // eslint-disable-next-line no-unreachable
                break;
            case 'a':
                if (count === 1) {
                    this.appendText(field, TextStyle.SHORT);
                } else {
                    throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                // eslint-disable-next-line no-unreachable
                break;
            case 'E':
            case 'G':
                switch (count) {
                    case 1:
                    case 2:
                    case 3:
                        this.appendText(field, TextStyle.SHORT);
                        break;
                    case 4:
                        this.appendText(field, TextStyle.FULL);
                        break;
                    case 5:
                        this.appendText(field, TextStyle.NARROW);
                        break;
                    default:
                        throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                // eslint-disable-next-line no-unreachable
                break;
            case 'S':
                this.appendFraction(ChronoField.NANO_OF_SECOND, count, count, false);
                break;
            case 'F':
                if (count === 1) {
                    this.appendValue(field);
                } else {
                    throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                break;
            case 'd':
            case 'h':
            case 'H':
            case 'k':
            case 'K':
            case 'm':
            case 's':
                if (count === 1) {
                    this.appendValue(field);
                } else if (count === 2) {
                    this.appendValue(field, count);
                } else {
                    throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                break;
            case 'D':
                if (count === 1) {
                    this.appendValue(field);
                } else if (count <= 3) {
                    this.appendValue(field, count);
                } else {
                    throw new IllegalArgumentException(`Too many pattern letters: ${cur}`);
                }
                break;
            default:
                if (count === 1) {
                    this.appendValue(field);
                } else {
                    this.appendValue(field, count);
                }
                break;
        }
    }

    /**
     * padNext function overloading
     */
    padNext() {
        if (arguments.length === 1) {
            return this._padNext1.apply(this, arguments);
        } else {
            return this._padNext2.apply(this, arguments);
        }
    }

    /**
     * Causes the next added printer/parser to pad to a fixed width using a space.
     *
     * This padding will pad to a fixed width using spaces.
     *
     * During formatting, the decorated element will be output and then padded
     * to the specified width. An exception will be thrown during printing if
     * the pad width is exceeded.
     *
     * During parsing, the padding and decorated element are parsed.
     * If parsing is lenient, then the pad width is treated as a maximum.
     * If parsing is case insensitive, then the pad character is matched ignoring case.
     * The padding is parsed greedily. Thus, if the decorated element starts with
     * the pad character, it will not be parsed.
     *
     * @param {number} padWidth  the pad width, 1 or greater
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalArgumentException if pad width is too small
     */
    _padNext1(padWidth) {
        return this._padNext2(padWidth, ' ');
    }

    /**
     * Causes the next added printer/parser to pad to a fixed width.
     *
     * This padding is intended for padding other than zero-padding.
     * Zero-padding should be achieved using the appendValue methods.
     *
     * During formatting, the decorated element will be output and then padded
     * to the specified width. An exception will be thrown during printing if
     * the pad width is exceeded.
     *
     * During parsing, the padding and decorated element are parsed.
     * If parsing is lenient, then the pad width is treated as a maximum.
     * If parsing is case insensitive, then the pad character is matched ignoring case.
     * The padding is parsed greedily. Thus, if the decorated element starts with
     * the pad character, it will not be parsed.
     *
     * @param {number} padWidth  the pad width, 1 or greater
     * @param {String} padChar  the pad character
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalArgumentException if pad width is too small
     */
    _padNext2(padWidth, padChar) {
        if (padWidth < 1) {
            throw new IllegalArgumentException(`The pad width must be at least one but was ${padWidth}`);
        }
        this._active._padNextWidth = padWidth;
        this._active._padNextChar = padChar;
        this._active._valueParserIndex = -1;
        return this;
    }


    //-----------------------------------------------------------------------
    /**
     * Mark the start of an optional section.
     *
     * The output of printing can include optional sections, which may be nested.
     * An optional section is started by calling this method and ended by calling
     * {@link optionalEnd} or by ending the build process.
     *
     * All elements in the optional section are treated as optional.
     * During printing, the section is only output if data is available in the
     * {@link TemporalAccessor} for all the elements in the section.
     * During parsing, the whole section may be missing from the parsed string.
     *
     * For example, consider a builder setup as
     * `builder.appendValue(HOUR_OF_DAY,2).optionalStart().appendValue(MINUTE_OF_HOUR,2)`.
     * The optional section ends automatically at the end of the builder.
     * During printing, the minute will only be output if its value can be obtained from the date-time.
     * During parsing, the input will be successfully parsed whether the minute is present or not.
     *
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    optionalStart() {
        this._active._valueParserIndex = -1;
        this._active = DateTimeFormatterBuilder._of(this._active, true);
        return this;
    }

    /**
     * Ends an optional section.
     *
     * The output of printing can include optional sections, which may be nested.
     * An optional section is started by calling {@link optionalStart} and ended
     * using this method (or at the end of the builder).
     *
     * Calling this method without having previously called `optionalStart`
     * will throw an exception.
     * Calling this method immediately after calling `optionalStart` has no effect
     * on the formatter other than ending the (empty) optional section.
     *
     * All elements in the optional section are treated as optional.
     * During printing, the section is only output if data is available in the
     * {@link TemporalAccessor} for all the elements in the section.
     * During parsing, the whole section may be missing from the parsed string.
     *
     * For example, consider a builder setup as
     * `builder.appendValue(HOUR_OF_DAY,2).optionalStart().appendValue(MINUTE_OF_HOUR,2).optionalEnd()`.
     * During printing, the minute will only be output if its value can be obtained from the date-time.
     * During parsing, the input will be successfully parsed whether the minute is present or not.
     *
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     * @throws IllegalStateException if there was no previous call to `optionalStart`
     */
    optionalEnd() {
        if (this._active._parent == null) {
            throw new IllegalStateException('Cannot call optionalEnd() as there was no previous call to optionalStart()');
        }
        if (this._active._printerParsers.length > 0) {
            const cpp = new CompositePrinterParser(this._active._printerParsers, this._active._optional);
            this._active = this._active._parent;
            this._appendInternal(cpp);
        } else {
            this._active = this._active._parent;
        }
        return this;
    }

    /**
     * Appends a printer and/or parser to the internal list handling padding.
     *
     * @param pp  the printer-parser to add, not null
     * @return the index into the active parsers list
     */
    _appendInternal(pp) {
        assert(pp != null);
        if (this._active._padNextWidth > 0) {
            if (pp != null) {
                pp = new PadPrinterParserDecorator(pp, this._active._padNextWidth, this._active._padNextChar);
            }
            this._active._padNextWidth = 0;
            this._active._padNextChar = 0;
        }
        this._active._printerParsers.push(pp);
        this._active._valueParserIndex = -1;
        return this._active._printerParsers.length - 1;
    }

    /**
     * Appends a string literal to the formatter.
     *
     * This string will be output during a print.
     *
     * If the literal is empty, nothing is added to the formatter.
     *
     * @param literal  the literal to append, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    appendLiteral(literal) {
        assert(literal != null);
        if (literal.length > 0) {
            if (literal.length === 1) {
                this._appendInternalPrinterParser(new CharLiteralPrinterParser(literal.charAt(0)));
            } else {
                this._appendInternalPrinterParser(new StringLiteralPrinterParser(literal));
            }
        }
        return this;
    }

    /**
     * Appends a printer and/or parser to the internal list handling padding.
     *
     * @param pp  the printer-parser to add, not null
     * @return the index into the active parsers list
     */
    _appendInternalPrinterParser(pp) {
        assert(pp != null);
        if (this._active._padNextWidth > 0) {
            if (pp != null) {
                pp = new PadPrinterParserDecorator(pp, this._active._padNextWidth, this._active._padNextChar);
            }
            this._active._padNextWidth = 0;
            this._active._padNextChar = 0;
        }
        this._active._printerParsers.push(pp);
        this._active._valueParserIndex = -1;
        return this._active._printerParsers.length - 1;
    }

    //-----------------------------------------------------------------------
    /**
     * Appends all the elements of a formatter to the builder.
     *
     * This method has the same effect as appending each of the constituent
     * parts of the formatter directly to this builder.
     *
     * @param {DateTimeFormatter} formatter  the formatter to add, not null
     * @return {DateTimeFormatterBuilder} this, for chaining, not null
     */
    append(formatter) {
        requireNonNull(formatter, 'formatter');
        this._appendInternal(formatter._toPrinterParser(false));
        return this;
    }

    /**
     * Completes this builder by creating the DateTimeFormatter.
     *
     * This will create a formatter with the specified locale.
     * Numbers will be printed and parsed using the standard non-localized set of symbols.
     *
     * Calling this method will end any open optional sections by repeatedly
     * calling {@link optionalEnd} before creating the formatter.
     *
     * This builder can still be used after creating the formatter if desired,
     * although the state may have been changed by calls to `optionalEnd`.
     *
     * @param resolverStyle  the new resolver style
     * @return the created formatter, not null
     */
    toFormatter(resolverStyle=ResolverStyle.SMART) {
        while (this._active._parent != null) {
            this.optionalEnd();
        }
        const pp = new CompositePrinterParser(this._printerParsers, false);
        return new DateTimeFormatter(pp, null, DecimalStyle.STANDARD, resolverStyle, null, null, null);
    }

}

// days in a 400 year cycle = 146097
// days in a 10,000 year cycle = 146097 * 25
// seconds per day = 86400
const SECONDS_PER_10000_YEARS = 146097 * 25 * 86400;
const SECONDS_0000_TO_1970 = ((146097 * 5) - (30 * 365 + 7)) * 86400;

/**
 * Prints or parses an ISO-8601 instant.
 */
class InstantPrinterParser  {

    constructor(fractionalDigits) {
        this.fractionalDigits = fractionalDigits;
    }

    print(context, buf) {
        // use INSTANT_SECONDS, thus this code is not bound by Instant.MAX
        const inSecs = context.getValue(ChronoField.INSTANT_SECONDS);
        let inNanos = 0;
        if (context.temporal().isSupported(ChronoField.NANO_OF_SECOND)) {
            inNanos = context.temporal().getLong(ChronoField.NANO_OF_SECOND);
        }
        if (inSecs == null) {
            return false;
        }
        const inSec = inSecs;
        let inNano = ChronoField.NANO_OF_SECOND.checkValidIntValue(inNanos);
        if (inSec >= -SECONDS_0000_TO_1970) {
            // current era
            const zeroSecs = inSec - SECONDS_PER_10000_YEARS + SECONDS_0000_TO_1970;
            const hi = MathUtil.floorDiv(zeroSecs, SECONDS_PER_10000_YEARS) + 1;
            const lo = MathUtil.floorMod(zeroSecs, SECONDS_PER_10000_YEARS);
            const ldt = LocalDateTime.ofEpochSecond(lo - SECONDS_0000_TO_1970, 0, ZoneOffset.UTC);
            if (hi > 0) {
                buf.append('+').append(hi);
            }
            buf.append(ldt.toString());
            if (ldt.second() === 0) {
                buf.append(':00');
            }
        } else {
            // before current era
            const zeroSecs = inSec + SECONDS_0000_TO_1970;
            const hi = MathUtil.intDiv(zeroSecs, SECONDS_PER_10000_YEARS);
            const lo = MathUtil.intMod(zeroSecs, SECONDS_PER_10000_YEARS);
            const ldt = LocalDateTime.ofEpochSecond(lo - SECONDS_0000_TO_1970, 0, ZoneOffset.UTC);
            const pos = buf.length();
            buf.append(ldt.toString());
            if (ldt.second() === 0) {
                buf.append(':00');
            }
            if (hi < 0) {
                if (ldt.year() === -10000) {
                    buf.replace(pos, pos + 2, `${hi - 1}`);
                } else if (lo === 0) {
                    buf.insert(pos, hi);
                } else {
                    buf.insert(pos + 1, Math.abs(hi));
                }
            }
        }
        //fraction
        if (this.fractionalDigits === -2) {
            if (inNano !== 0) {
                buf.append('.');
                if (MathUtil.intMod(inNano, 1000000) === 0) {
                    buf.append((`${MathUtil.intDiv(inNano, 1000000) + 1000}`).substring(1));
                } else if (MathUtil.intMod(inNano, 1000) === 0) {
                    buf.append((`${MathUtil.intDiv(inNano, 1000) + 1000000}`).substring(1));
                } else {
                    buf.append((`${(inNano) + 1000000000}`).substring(1));
                }
            }
        } else if (this.fractionalDigits > 0 || (this.fractionalDigits === -1 && inNano > 0)) {
            buf.append('.');
            let div = 100000000;
            for (let i = 0; ((this.fractionalDigits === -1 && inNano > 0) || i < this.fractionalDigits); i++) {
                const digit = MathUtil.intDiv(inNano, div);
                buf.append(digit);
                inNano = inNano - (digit * div);
                div = MathUtil.intDiv(div, 10);
            }
        }
        buf.append('Z');
        return true;
    }

    parse(context, text, position) {
        // new context to avoid overwriting fields like year/month/day
        const newContext = context.copy();
        const minDigits = (this.fractionalDigits < 0 ? 0 : this.fractionalDigits);
        const maxDigits = (this.fractionalDigits < 0 ? 9 : this.fractionalDigits);
        const parser = new DateTimeFormatterBuilder()
            .append(DateTimeFormatter.ISO_LOCAL_DATE).appendLiteral('T')
            .appendValue(ChronoField.HOUR_OF_DAY, 2).appendLiteral(':').appendValue(ChronoField.MINUTE_OF_HOUR, 2).appendLiteral(':')
            .appendValue(ChronoField.SECOND_OF_MINUTE, 2).appendFraction(ChronoField.NANO_OF_SECOND, minDigits, maxDigits, true).appendLiteral('Z')
            .toFormatter()._toPrinterParser(false);
        const pos = parser.parse(newContext, text, position);
        if (pos < 0) {
            return pos;
        }
        // parser restricts most fields to 2 digits, so definitely int
        // correctly parsed nano is also guaranteed to be valid
        const yearParsed = newContext.getParsed(ChronoField.YEAR);
        const month = newContext.getParsed(ChronoField.MONTH_OF_YEAR);
        const day = newContext.getParsed(ChronoField.DAY_OF_MONTH);
        let hour = newContext.getParsed(ChronoField.HOUR_OF_DAY);
        const min = newContext.getParsed(ChronoField.MINUTE_OF_HOUR);
        const secVal = newContext.getParsed(ChronoField.SECOND_OF_MINUTE);
        const nanoVal = newContext.getParsed(ChronoField.NANO_OF_SECOND);
        let sec = (secVal != null ? secVal : 0);
        const nano = (nanoVal != null ? nanoVal : 0);
        const year = MathUtil.intMod(yearParsed, 10000);
        let days = 0;
        if (hour === 24 && min === 0 && sec === 0 && nano === 0) {
            hour = 0;
            days = 1;
        } else if (hour === 23 && min === 59 && sec === 60) {
            context.setParsedLeapSecond();
            sec = 59;
        }
        let instantSecs;
        try {
            const ldt = LocalDateTime.of(year, month, day, hour, min, sec, 0).plusDays(days);
            instantSecs = ldt.toEpochSecond(ZoneOffset.UTC);
            instantSecs += MathUtil.safeMultiply(MathUtil.intDiv(yearParsed, 10000), SECONDS_PER_10000_YEARS);
        } catch (ex) {
            return ~position;
        }
        let successPos = pos;
        successPos = context.setParsedField(ChronoField.INSTANT_SECONDS, instantSecs, position, successPos);
        return context.setParsedField(ChronoField.NANO_OF_SECOND, nano, position, successPos);
    }

    toString() {
        return 'Instant()';
    }
}

/**
 * Used by parseDefaulting().
 * @implements {DateTimePrinterParser}
 * @private
 */
class DefaultingParser {
    /**
     * @param {TemporalField} field 
     * @param {number} value 
     */
    constructor(field, value) {
        this._field = field;
        this._value = value;
    }

    /**
     * @param {DateTimePrintContext} context
     * @param {StringBuilder} buf
     * @return {boolean}
     */
    print() {
        return true;
    }


    /** 
     * @param {DateTimeParseContext} context 
     * @param {string} text
     * @param {number} position 
     * @returns {number}
     */
    parse(context, text, position) {
        if (context.getParsed(this._field) == null) {
            context.setParsedField(this._field, this._value, position, position);
        }
        return position;
    }
}

export function _init() {
    ReducedPrinterParser.BASE_DATE = LocalDate.of(2000, 1, 1);

    DateTimeFormatterBuilder.CompositePrinterParser = CompositePrinterParser;
    DateTimeFormatterBuilder.PadPrinterParserDecorator = PadPrinterParserDecorator;
    DateTimeFormatterBuilder.SettingsParser = SettingsParser;
    DateTimeFormatterBuilder.CharLiteralPrinterParser = StringLiteralPrinterParser;
    DateTimeFormatterBuilder.StringLiteralPrinterParser = StringLiteralPrinterParser;
    DateTimeFormatterBuilder.CharLiteralPrinterParser = CharLiteralPrinterParser;
    DateTimeFormatterBuilder.NumberPrinterParser = NumberPrinterParser;
    DateTimeFormatterBuilder.ReducedPrinterParser = ReducedPrinterParser;
    DateTimeFormatterBuilder.FractionPrinterParser = FractionPrinterParser;
    DateTimeFormatterBuilder.OffsetIdPrinterParser = OffsetIdPrinterParser;
    DateTimeFormatterBuilder.ZoneIdPrinterParser = ZoneIdPrinterParser;
}
