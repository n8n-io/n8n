/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE.md in the root directory of this source tree)
 */

import { Enum } from '../Enum';

/**
 * Enumeration of the style of text formatting and parsing.
 *
 * Text styles define three sizes for the formatted text - 'full', 'short' and 'narrow'.
 * Each of these three sizes is available in both 'standard' and 'stand-alone' variations.
 *
 * The difference between the three sizes is obvious in most languages.
 * For example, in English the 'full' month is 'January', the 'short' month is 'Jan'
 * and the 'narrow' month is 'J'. Note that the narrow size is often not unique.
 * For example, 'January', 'June' and 'July' all have the 'narrow' text 'J'.
 *
 * The difference between the 'standard' and 'stand-alone' forms is trickier to describe
 * as there is no difference in English. However, in other languages there is a difference
 * in the word used when the text is used alone, as opposed to in a complete date.
 * For example, the word used for a month when used alone in a date picker is different
 * to the word used for month in association with a day and year in a date.
 *
 * ### Specification for implementors
 *
 * This is immutable and thread-safe enum.
 */
export class TextStyle extends Enum {
    /**
     * Checks if the style is stand-alone.
     *
     * @return {boolean} true if the style is stand-alone
     */
    isStandalone() {
        switch (this) {
            case TextStyle.FULL_STANDALONE:
            case TextStyle.SHORT_STANDALONE:
            case TextStyle.NARROW_STANDALONE:
                return true;
            default:
                return false;
        }
    }

    /**
     * Converts the style to the equivalent stand-alone style.
     *
     * @return {TextStyle} the matching stand-alone style
     */
    asStandalone() {
        switch (this) {
            case TextStyle.FULL:
                return TextStyle.FULL_STANDALONE;
            case TextStyle.SHORT:
                return TextStyle.SHORT_STANDALONE;
            case TextStyle.NARROW:
                return TextStyle.NARROW_STANDALONE;
            default:
                // all others are already standalone
                return this;
        }
    }

    /**
     * Converts the style to the equivalent normal style.
     *
     * @return {TextStyle} the matching normal style
     */
    asNormal() {
        switch (this) {
            case TextStyle.FULL_STANDALONE:
                return TextStyle.FULL;
            case TextStyle.SHORT_STANDALONE:
                return TextStyle.SHORT;
            case TextStyle.NARROW_STANDALONE:
                return TextStyle.NARROW;
            default:
                // all others are already normal
                return this;
        }
    }
}

/**
 * Full text, typically the full description.
 * For example, day-of-week Monday might output "Monday".
 */
TextStyle.FULL = new TextStyle('FULL');
/**
 * Full text for stand-alone use, typically the full description.
 * For example, day-of-week Monday might output "Monday".
 */
TextStyle.FULL_STANDALONE = new TextStyle('FULL_STANDALONE');
/**
 * Short text, typically an abbreviation.
 * For example, day-of-week Monday might output "Mon".
 */
TextStyle.SHORT = new TextStyle('SHORT');
/**
 * Short text for stand-alone use, typically an abbreviation.
 * For example, day-of-week Monday might output "Mon".
 */
TextStyle.SHORT_STANDALONE = new TextStyle('SHORT_STANDALONE');
/**
 * Narrow text, typically a single letter.
 * For example, day-of-week Monday might output "M".
 */
TextStyle.NARROW = new TextStyle('NARROW');
/**
 * Narrow text for stand-alone use, typically a single letter.
 * For example, day-of-week Monday might output "M".
 */
TextStyle.NARROW_STANDALONE = new TextStyle('NARROW_STANDALONE');
