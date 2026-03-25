/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

/*
  The most important regular expressions and data as used by the library,
  isolated here to help with possible edge cases during integration.
*/

module.exports = {
    // Searches for all Named Parameters, supporting any of the following syntax:
    // ${propName}, $(propName), $[propName], $/propName/, $<propName>
    // Nested property names are also supported: ${propName.abc}
    namedParameters: /\$(?:({)|(\()|(<)|(\[)|(\/))\s*[a-zA-Z0-9$_.]+(\^|~|#|:raw|:alias|:name|:json|:csv|:list|:value)?\s*(?:(?=\2)(?=\3)(?=\4)(?=\5)}|(?=\1)(?=\3)(?=\4)(?=\5)\)|(?=\1)(?=\2)(?=\4)(?=\5)>|(?=\1)(?=\2)(?=\3)(?=\5)]|(?=\1)(?=\2)(?=\3)(?=\4)\/)/g,

    // Searches for all variables $1, $2, ...$100000, and while it will find greater than $100000
    // variables, the formatting engine is expected to throw an error for those.
    multipleValues: /\$([1-9][0-9]{0,16}(?![0-9])(\^|~|#|:raw|:alias|:name|:json|:csv|:list|:value)?)/g,

    // Searches for all occurrences of variable $1
    singleValue: /\$1(?![0-9])(\^|~|#|:raw|:alias|:name|:json|:csv|:list|:value)?/g,

    // Matches a valid column name for the Column type parser, according to the following rules:
    // - can contain: any combination of a-z, A-Z, 0-9, $ or _
    // - can contain ? at the start
    // - can contain one of the supported filters/modifiers
    validColumn: /\??[a-zA-Z0-9$_]+(\^|~|#|:raw|:alias|:name|:json|:csv|:list|:value)?/,

    // Matches a valid open-name JavaScript variable, according to the following rules:
    // - can contain: any combination of a-z, A-Z, 0-9, $ or _
    validVariable: /[a-zA-Z0-9$_]+/,

    // Matches a valid modifier in a column/property:
    hasValidModifier: /\^|~|#|:raw|:alias|:name|:json|:csv|:list|:value/,

    // List of all supported formatting modifiers:
    validModifiers: ['^', '~', '#', ':raw', ':alias', ':name', ':json', ':csv', ':list', ':value']
};
