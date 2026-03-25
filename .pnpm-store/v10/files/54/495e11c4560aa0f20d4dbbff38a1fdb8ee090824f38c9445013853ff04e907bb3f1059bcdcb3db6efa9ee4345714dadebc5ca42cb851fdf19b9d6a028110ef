
Utils   = require './Utils'
Pattern = require './Pattern'

# Unescaper encapsulates unescaping rules for single and double-quoted YAML strings.
#
class Unescaper

    # Regex fragment that matches an escaped character in
    # a double quoted string.
    @PATTERN_ESCAPED_CHARACTER:     new Pattern '\\\\([0abt\tnvfre "\\/\\\\N_LP]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})';


    # Unescapes a single quoted string.
    #
    # @param [String]       value A single quoted string.
    #
    # @return [String]      The unescaped string.
    #
    @unescapeSingleQuotedString: (value) ->
        return value.replace(/\'\'/g, '\'')


    # Unescapes a double quoted string.
    #
    # @param [String]       value A double quoted string.
    #
    # @return [String]      The unescaped string.
    #
    @unescapeDoubleQuotedString: (value) ->
        @_unescapeCallback ?= (str) =>
            return @unescapeCharacter(str)

        # Evaluate the string
        return @PATTERN_ESCAPED_CHARACTER.replace value, @_unescapeCallback


    # Unescapes a character that was found in a double-quoted string
    #
    # @param [String]       value An escaped character
    #
    # @return [String]      The unescaped character
    #
    @unescapeCharacter: (value) ->
        ch = String.fromCharCode
        switch value.charAt(1)
            when '0'
                return ch(0)
            when 'a'
                return ch(7)
            when 'b'
                return ch(8)
            when 't'
                return "\t"
            when "\t"
                return "\t"
            when 'n'
                return "\n"
            when 'v'
                return ch(11)
            when 'f'
                return ch(12)
            when 'r'
                return ch(13)
            when 'e'
                return ch(27)
            when ' '
                return ' '
            when '"'
                return '"'
            when '/'
                return '/'
            when '\\'
                return '\\'
            when 'N'
                # U+0085 NEXT LINE
                return ch(0x0085)
            when '_'
                # U+00A0 NO-BREAK SPACE
                return ch(0x00A0)
            when 'L'
                # U+2028 LINE SEPARATOR
                return ch(0x2028)
            when 'P'
                # U+2029 PARAGRAPH SEPARATOR
                return ch(0x2029)
            when 'x'
                return Utils.utf8chr(Utils.hexDec(value.substr(2, 2)))
            when 'u'
                return Utils.utf8chr(Utils.hexDec(value.substr(2, 4)))
            when 'U'
                return Utils.utf8chr(Utils.hexDec(value.substr(2, 8)))
            else
                return ''

module.exports = Unescaper
