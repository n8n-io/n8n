
# Pattern is a zero-conflict wrapper extending RegExp features
# in order to make YAML parsing regex more expressive.
#
class Pattern

    # @property [RegExp] The RegExp instance
    regex:          null

    # @property [String] The raw regex string
    rawRegex:       null

    # @property [String] The cleaned regex string (used to create the RegExp instance)
    cleanedRegex:   null

    # @property [Object] The dictionary mapping names to capturing bracket numbers
    mapping:        null

    # Constructor
    #
    # @param [String] rawRegex The raw regex string defining the pattern
    #
    constructor: (rawRegex, modifiers = '') ->
        cleanedRegex = ''
        len = rawRegex.length
        mapping = null

        # Cleanup raw regex and compute mapping
        capturingBracketNumber = 0
        i = 0
        while i < len
            _char = rawRegex.charAt(i)
            if _char is '\\'
                # Ignore next character
                cleanedRegex += rawRegex[i..i+1]
                i++
            else if _char is '('
                # Increase bracket number, only if it is capturing
                if i < len - 2
                    part = rawRegex[i..i+2]
                    if part is '(?:'
                        # Non-capturing bracket
                        i += 2
                        cleanedRegex += part
                    else if part is '(?<'
                        # Capturing bracket with possibly a name
                        capturingBracketNumber++
                        i += 2
                        name = ''
                        while i + 1 < len
                            subChar = rawRegex.charAt(i + 1)
                            if subChar is '>'
                                cleanedRegex += '('
                                i++
                                if name.length > 0
                                    # Associate a name with a capturing bracket number
                                    mapping ?= {}
                                    mapping[name] = capturingBracketNumber
                                break
                            else
                                name += subChar

                            i++
                    else
                        cleanedRegex += _char
                        capturingBracketNumber++
                else
                    cleanedRegex += _char
            else
                cleanedRegex += _char

            i++

        @rawRegex = rawRegex
        @cleanedRegex = cleanedRegex
        @regex = new RegExp @cleanedRegex, 'g'+modifiers.replace('g', '')
        @mapping = mapping


    # Executes the pattern's regex and returns the matching values
    #
    # @param [String] str The string to use to execute the pattern
    #
    # @return [Array] The matching values extracted from capturing brackets or null if nothing matched
    #
    exec: (str) ->
        @regex.lastIndex = 0
        matches = @regex.exec str

        if not matches?
            return null

        if @mapping?
            for name, index of @mapping
                matches[name] = matches[index]

        return matches


    # Tests the pattern's regex
    #
    # @param [String] str The string to use to test the pattern
    #
    # @return [Boolean] true if the string matched
    #
    test: (str) ->
        @regex.lastIndex = 0
        return @regex.test str


    # Replaces occurences matching with the pattern's regex with replacement
    #
    # @param [String] str The source string to perform replacements
    # @param [String] replacement The string to use in place of each replaced occurence.
    #
    # @return [String] The replaced string
    #
    replace: (str, replacement) ->
        @regex.lastIndex = 0
        return str.replace @regex, replacement


    # Replaces occurences matching with the pattern's regex with replacement and
    # get both the replaced string and the number of replaced occurences in the string.
    #
    # @param [String] str The source string to perform replacements
    # @param [String] replacement The string to use in place of each replaced occurence.
    # @param [Integer] limit The maximum number of occurences to replace (0 means infinite number of occurences)
    #
    # @return [Array] A destructurable array containing the replaced string and the number of replaced occurences. For instance: ["my replaced string", 2]
    #
    replaceAll: (str, replacement, limit = 0) ->
        @regex.lastIndex = 0
        count = 0
        while @regex.test(str) and (limit is 0 or count < limit)
            @regex.lastIndex = 0
            str = str.replace @regex, replacement
            count++
        
        return [str, count]


module.exports = Pattern

