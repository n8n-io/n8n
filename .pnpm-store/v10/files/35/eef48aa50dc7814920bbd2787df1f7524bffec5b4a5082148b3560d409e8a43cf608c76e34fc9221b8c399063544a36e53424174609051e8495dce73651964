/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import {
    ArithmeticException,
    DateTimeException,
    DateTimeParseException,
    IllegalArgumentException,
    IllegalStateException,
    UnsupportedTemporalTypeException,
    NullPointerException
} from './errors';

import { Clock } from './Clock';
import { DayOfWeek } from './DayOfWeek';
import { Duration } from './Duration';
import { Instant } from './Instant';
import { LocalDate } from './LocalDate';
import { LocalTime } from './LocalTime';
import { LocalDateTime } from './LocalDateTime';
import { Month } from './Month';
import { MonthDay } from './MonthDay';
import { OffsetDateTime } from './OffsetDateTime';
import { OffsetTime } from './OffsetTime';
import { Period } from './Period';
import { Year } from './Year';
import { YearConstants } from './YearConstants';
import { YearMonth } from './YearMonth';
import { ZonedDateTime } from './ZonedDateTime';
import { ZoneOffset } from './ZoneOffset';
import { ZoneId } from './ZoneId';
import { ZoneRegion } from './ZoneRegion';

import { ZoneOffsetTransition } from './zone/ZoneOffsetTransition';
import { ZoneRules } from './zone/ZoneRules';
import { ZoneRulesProvider } from './zone/ZoneRulesProvider';

import { ChronoLocalDate } from './chrono/ChronoLocalDate';
import { ChronoLocalDateTime } from './chrono/ChronoLocalDateTime';
import { ChronoZonedDateTime } from './chrono/ChronoZonedDateTime';
import { IsoChronology } from './chrono/IsoChronology';

import { ChronoField } from './temporal/ChronoField';
import { ChronoUnit } from './temporal/ChronoUnit';
import { IsoFields } from './temporal/IsoFields';
import { Temporal } from './temporal/Temporal';
import { TemporalAccessor } from './temporal/TemporalAccessor';
import { TemporalAdjuster } from './temporal/TemporalAdjuster';
import { TemporalAdjusters } from './temporal/TemporalAdjusters';
import { TemporalAmount } from './temporal/TemporalAmount';
import { TemporalField } from './temporal/TemporalField';
import { TemporalQueries } from './temporal/TemporalQueries';
import { TemporalQuery } from './temporal/TemporalQuery';
import { TemporalUnit } from './temporal/TemporalUnit';
import { ValueRange } from './temporal/ValueRange';

import { DateTimeFormatter } from './format/DateTimeFormatter';
import { DateTimeFormatterBuilder } from './format/DateTimeFormatterBuilder';
import { DecimalStyle } from './format/DecimalStyle';
import { ParsePosition } from './format/ParsePosition';
import { ResolverStyle } from './format/ResolverStyle';
import { SignStyle } from './format/SignStyle';
import { TextStyle } from './format/TextStyle';

// init static properties
import './_init';

// private/internal exports, e.g. for use in plugins
import { MathUtil } from './MathUtil';
import { StringUtil } from './StringUtil';
import { DateTimeBuilder } from './format/DateTimeBuilder';
import { DateTimeParseContext } from './format/DateTimeParseContext';
import { DateTimePrintContext } from './format/DateTimePrintContext';
import { StringBuilder } from './format/StringBuilder';
import * as assert from './assert';

import { convert } from './convert';
import { nativeJs } from './nativeJs';
import { bindUse } from './use';

const _ = {
    assert,
    DateTimeBuilder,
    DateTimeParseContext,
    DateTimePrintContext,
    MathUtil,
    StringUtil,
    StringBuilder,
};

const jsJodaExports = {
    _,
    convert,
    nativeJs,
    ArithmeticException,
    DateTimeException,
    DateTimeParseException,
    IllegalArgumentException,
    IllegalStateException,
    UnsupportedTemporalTypeException,
    NullPointerException,
    Clock,
    DayOfWeek,
    Duration,
    Instant,
    LocalDate,
    LocalTime,
    LocalDateTime,
    OffsetTime,
    OffsetDateTime,
    Month,
    MonthDay,
    ParsePosition,
    Period,
    Year,
    YearConstants,
    YearMonth,
    ZonedDateTime,
    ZoneOffset,
    ZoneId,
    ZoneRegion,
    ZoneOffsetTransition,
    ZoneRules,
    ZoneRulesProvider,
    ChronoLocalDate,
    ChronoLocalDateTime,
    ChronoZonedDateTime,
    IsoChronology,
    ChronoField,
    ChronoUnit,
    IsoFields,
    Temporal,
    TemporalAccessor,
    TemporalAdjuster,
    TemporalAdjusters,
    TemporalAmount,
    TemporalField,
    TemporalQueries,
    TemporalQuery,
    TemporalUnit,
    ValueRange,
    DateTimeFormatter,
    DateTimeFormatterBuilder,
    DecimalStyle,
    ResolverStyle,
    SignStyle,
    TextStyle,
};

/**
 * @private
 *
 * @type { function(function(jsJoda: JsJoda) }
 */
const use = bindUse(jsJodaExports);
jsJodaExports.use = use;

export {
    _,
    use,
    convert,
    nativeJs,
    ArithmeticException,
    DateTimeException,
    DateTimeParseException,
    IllegalArgumentException,
    IllegalStateException,
    UnsupportedTemporalTypeException,
    NullPointerException,
    Clock,
    DayOfWeek,
    Duration,
    Instant,
    LocalDate,
    LocalTime,
    LocalDateTime,
    Month,
    MonthDay,
    OffsetTime,
    OffsetDateTime,
    Period,
    ParsePosition,
    Year,
    YearConstants,
    YearMonth,
    ZonedDateTime,
    ZoneOffset,
    ZoneId,
    ZoneRegion,
    ZoneOffsetTransition,
    ZoneRules,
    ZoneRulesProvider,
    ChronoLocalDate,
    ChronoLocalDateTime,
    ChronoZonedDateTime,
    IsoChronology,
    ChronoField,
    ChronoUnit,
    IsoFields,
    Temporal,
    TemporalAccessor,
    TemporalAdjuster,
    TemporalAdjusters,
    TemporalAmount,
    TemporalField,
    TemporalQueries,
    TemporalQuery,
    TemporalUnit,
    ValueRange,
    DateTimeFormatter,
    DateTimeFormatterBuilder,
    DecimalStyle,
    ResolverStyle,
    SignStyle,
    TextStyle,
};
