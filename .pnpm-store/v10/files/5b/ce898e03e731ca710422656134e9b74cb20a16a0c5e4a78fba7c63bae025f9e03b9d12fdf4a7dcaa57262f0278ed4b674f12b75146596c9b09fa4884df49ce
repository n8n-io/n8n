
Pattern = require './Pattern'

# Escaper encapsulates escaping rules for single
# and double-quoted YAML strings.
class Escaper

    # Mapping arrays for escaping a double quoted string. The backslash is
    # first to ensure proper escaping.
    @LIST_ESCAPEES:                 ['\\', '\\\\', '\\"', '"',
                                     "\x00",  "\x01",  "\x02",  "\x03",  "\x04",  "\x05",  "\x06",  "\x07",
                                     "\x08",  "\x09",  "\x0a",  "\x0b",  "\x0c",  "\x0d",  "\x0e",  "\x0f",
                                     "\x10",  "\x11",  "\x12",  "\x13",  "\x14",  "\x15",  "\x16",  "\x17",
                                     "\x18",  "\x19",  "\x1a",  "\x1b",  "\x1c",  "\x1d",  "\x1e",  "\x1f",
                                     (ch = String.fromCharCode)(0x0085), ch(0x00A0), ch(0x2028), ch(0x2029)]
    @LIST_ESCAPED:                  ['\\\\', '\\"', '\\"', '\\"',
                                     "\\0",   "\\x01", "\\x02", "\\x03", "\\x04", "\\x05", "\\x06", "\\a",
                                     "\\b",   "\\t",   "\\n",   "\\v",   "\\f",   "\\r",   "\\x0e", "\\x0f",
                                     "\\x10", "\\x11", "\\x12", "\\x13", "\\x14", "\\x15", "\\x16", "\\x17",
                                     "\\x18", "\\x19", "\\x1a", "\\e",   "\\x1c", "\\x1d", "\\x1e", "\\x1f",
                                     "\\N", "\\_", "\\L", "\\P"]

    @MAPPING_ESCAPEES_TO_ESCAPED:   do =>
        mapping = {}
        for i in [0...@LIST_ESCAPEES.length]
            mapping[@LIST_ESCAPEES[i]] = @LIST_ESCAPED[i]
        return mapping

    # Characters that would cause a dumped string to require double quoting.
    @PATTERN_CHARACTERS_TO_ESCAPE:  new Pattern '[\\x00-\\x1f]|\xc2\x85|\xc2\xa0|\xe2\x80\xa8|\xe2\x80\xa9'

    # Other precompiled patterns
    @PATTERN_MAPPING_ESCAPEES:      new Pattern @LIST_ESCAPEES.join('|').split('\\').join('\\\\')
    @PATTERN_SINGLE_QUOTING:        new Pattern '[\\s\'":{}[\\],&*#?]|^[-?|<>=!%@`]'



    # Determines if a JavaScript value would require double quoting in YAML.
    #
    # @param [String]   value   A JavaScript value value
    #
    # @return [Boolean] true    if the value would require double quotes.
    #
    @requiresDoubleQuoting: (value) ->
        return @PATTERN_CHARACTERS_TO_ESCAPE.test value


    # Escapes and surrounds a JavaScript value with double quotes.
    #
    # @param [String]   value   A JavaScript value
    #
    # @return [String]  The quoted, escaped string
    #
    @escapeWithDoubleQuotes: (value) ->
        result = @PATTERN_MAPPING_ESCAPEES.replace value, (str) =>
            return @MAPPING_ESCAPEES_TO_ESCAPED[str]
        return '"'+result+'"'


    # Determines if a JavaScript value would require single quoting in YAML.
    #
    # @param [String]   value   A JavaScript value
    #
    # @return [Boolean] true if the value would require single quotes.
    #
    @requiresSingleQuoting: (value) ->
        return @PATTERN_SINGLE_QUOTING.test value


    # Escapes and surrounds a JavaScript value with single quotes.
    #
    # @param [String]   value   A JavaScript value
    #
    # @return [String]  The quoted, escaped string
    #
    @escapeWithSingleQuotes: (value) ->
        return "'"+value.replace(/'/g, "''")+"'"


module.exports = Escaper
