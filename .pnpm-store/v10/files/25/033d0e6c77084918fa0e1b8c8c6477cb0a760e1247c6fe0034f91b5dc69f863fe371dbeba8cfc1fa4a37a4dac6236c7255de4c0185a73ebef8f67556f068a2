/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { Enum } from '../Enum';

/**
 * Enumeration of different ways to resolve dates and times.
 * 
 * Parsing a text string occurs in two phases.
 * Phase 1 is a basic text parse according to the fields added to the builder.
 * Phase 2 resolves the parsed field-value pairs into date and/or time objects.
 * This style is used to control how phase 2, resolving, happens.
 *
 * ### Static properties of Class {@link DateTimeFormatter}
 *
 * ResolverStyle.STRICT = new ResolverStyle('STRICT');
 *
 * Style to resolve dates and times strictly.
 *
 * Using strict resolution will ensure that all parsed values are within
 * the outer range of valid values for the field. Individual fields may
 * be further processed for strictness.
 *
 * For example, resolving year-month and day-of-month in the ISO calendar
 * system using strict mode will ensure that the day-of-month is valid
 * for the year-month, rejecting invalid values.
 *
 * ResolverStyle.SMART = new ResolverStyle('SMART');
 *
 * Style to resolve dates and times in a smart, or intelligent, manner.
 *
 * Using smart resolution will perform the sensible default for each
 * field, which may be the same as strict, the same as lenient, or a third
 * behavior. Individual fields will interpret this differently.
 *
 * For example, resolving year-month and day-of-month in the ISO calendar
 * system using smart mode will ensure that the day-of-month is from
 * 1 to 31, converting any value beyond the last valid day-of-month to be
 * the last valid day-of-month.
 *
 * ResolverStyle.LENIENT = new ResolverStyle('LENIENT');
 *
 * Style to resolve dates and times leniently.
 *
 * Using lenient resolution will resolve the values in an appropriate
 * lenient manner. Individual fields will interpret this differently.
 *
 * For example, lenient mode allows the month in the ISO calendar system
 * to be outside the range 1 to 12.
 * For example, month 15 is treated as being 3 months after month 12.
 *
 */
export class ResolverStyle extends Enum {}

/**
 * Style to resolve dates and times strictly.
 * 
 * Using strict resolution will ensure that all parsed values are within
 * the outer range of valid values for the field. Individual fields may
 * be further processed for strictness.
 * 
 * For example, resolving year-month and day-of-month in the ISO calendar
 * system using strict mode will ensure that the day-of-month is valid
 * for the year-month, rejecting invalid values.
 */
ResolverStyle.STRICT = new ResolverStyle('STRICT');
/**
 * Style to resolve dates and times in a smart, or intelligent, manner.
 * 
 * Using smart resolution will perform the sensible default for each
 * field, which may be the same as strict, the same as lenient, or a third
 * behavior. Individual fields will interpret this differently.
 * 
 * For example, resolving year-month and day-of-month in the ISO calendar
 * system using smart mode will ensure that the day-of-month is from
 * 1 to 31, converting any value beyond the last valid day-of-month to be
 * the last valid day-of-month.
 */
ResolverStyle.SMART = new ResolverStyle('SMART');
/**
 * Style to resolve dates and times leniently.
 * 
 * Using lenient resolution will resolve the values in an appropriate
 * lenient manner. Individual fields will interpret this differently.
 * 
 * For example, lenient mode allows the month in the ISO calendar system
 * to be outside the range 1 to 12.
 * For example, month 15 is treated as being 3 months after month 12.
 */
ResolverStyle.LENIENT = new ResolverStyle('LENIENT');
