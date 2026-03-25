
Pattern         = require './Pattern'
Unescaper       = require './Unescaper'
Escaper         = require './Escaper'
Utils           = require './Utils'
ParseException  = require './Exception/ParseException'
ParseMore       = require './Exception/ParseMore'
DumpException   = require './Exception/DumpException'

# Inline YAML parsing and dumping
class Inline

    # Quoted string regular expression
    @REGEX_QUOTED_STRING:               '(?:"(?:[^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|\'(?:[^\']*(?:\'\'[^\']*)*)\')'

    # Pre-compiled patterns
    #
    @PATTERN_TRAILING_COMMENTS:         new Pattern '^\\s*#.*$'
    @PATTERN_QUOTED_SCALAR:             new Pattern '^'+@REGEX_QUOTED_STRING
    @PATTERN_THOUSAND_NUMERIC_SCALAR:   new Pattern '^(-|\\+)?[0-9,]+(\\.[0-9]+)?$'
    @PATTERN_SCALAR_BY_DELIMITERS:      {}

    # Settings
    @settings: {}


    # Configure YAML inline.
    #
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types (a JavaScript resource or object), false otherwise
    # @param [Function] objectDecoder           A function to deserialize custom objects, null otherwise
    #
    @configure: (exceptionOnInvalidType = null, objectDecoder = null) ->
        # Update settings
        @settings.exceptionOnInvalidType = exceptionOnInvalidType
        @settings.objectDecoder = objectDecoder
        return


    # Converts a YAML string to a JavaScript object.
    #
    # @param [String]   value                   A YAML string
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types (a JavaScript resource or object), false otherwise
    # @param [Function] objectDecoder           A function to deserialize custom objects, null otherwise
    #
    # @return [Object]  A JavaScript object representing the YAML string
    #
    # @throw [ParseException]
    #
    @parse: (value, exceptionOnInvalidType = false, objectDecoder = null) ->
        # Update settings from last call of Inline.parse()
        @settings.exceptionOnInvalidType = exceptionOnInvalidType
        @settings.objectDecoder = objectDecoder

        if not value?
            return ''

        value = Utils.trim value

        if 0 is value.length
            return ''

        # Keep a context object to pass through static methods
        context = {exceptionOnInvalidType, objectDecoder, i: 0}

        switch value.charAt(0)
            when '['
                result = @parseSequence value, context
                ++context.i
            when '{'
                result = @parseMapping value, context
                ++context.i
            else
                result = @parseScalar value, null, ['"', "'"], context

        # Some comments are allowed at the end
        if @PATTERN_TRAILING_COMMENTS.replace(value[context.i..], '') isnt ''
            throw new ParseException 'Unexpected characters near "'+value[context.i..]+'".'

        return result


    # Dumps a given JavaScript variable to a YAML string.
    #
    # @param [Object]   value                   The JavaScript variable to convert
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types (a JavaScript resource or object), false otherwise
    # @param [Function] objectEncoder           A function to serialize custom objects, null otherwise
    #
    # @return [String]  The YAML string representing the JavaScript object
    #
    # @throw [DumpException]
    #
    @dump: (value, exceptionOnInvalidType = false, objectEncoder = null) ->
        if not value?
            return 'null'
        type = typeof value
        if type is 'object'
            if value instanceof Date
                return value.toISOString()
            else if objectEncoder?
                result = objectEncoder value
                if typeof result is 'string' or result?
                    return result
            return @dumpObject value
        if type is 'boolean'
            return (if value then 'true' else 'false')
        if Utils.isDigits(value)
            return (if type is 'string' then "'"+value+"'" else String(parseInt(value)))
        if Utils.isNumeric(value)
            return (if type is 'string' then "'"+value+"'" else String(parseFloat(value)))
        if type is 'number'
            return (if value is Infinity then '.Inf' else (if value is -Infinity then '-.Inf' else (if isNaN(value) then '.NaN' else value)))
        if Escaper.requiresDoubleQuoting value
            return Escaper.escapeWithDoubleQuotes value
        if Escaper.requiresSingleQuoting value
            return Escaper.escapeWithSingleQuotes value
        if '' is value
            return '""'
        if Utils.PATTERN_DATE.test value
            return "'"+value+"'";
        if value.toLowerCase() in ['null','~','true','false']
            return "'"+value+"'"
        # Default
        return value;


    # Dumps a JavaScript object to a YAML string.
    #
    # @param [Object]   value                   The JavaScript object to dump
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types (a JavaScript resource or object), false otherwise
    # @param [Function] objectEncoder           A function do serialize custom objects, null otherwise
    #
    # @return string The YAML string representing the JavaScript object
    #
    @dumpObject: (value, exceptionOnInvalidType, objectSupport = null) ->
        # Array
        if value instanceof Array
            output = []
            for val in value
                output.push @dump val
            return '['+output.join(', ')+']'

        # Mapping
        else
            output = []
            for key, val of value
                output.push @dump(key)+': '+@dump(val)
            return '{'+output.join(', ')+'}'


    # Parses a scalar to a YAML string.
    #
    # @param [Object]   scalar
    # @param [Array]    delimiters
    # @param [Array]    stringDelimiters
    # @param [Object]   context
    # @param [Boolean]  evaluate
    #
    # @return [String]  A YAML string
    #
    # @throw [ParseException] When malformed inline YAML string is parsed
    #
    @parseScalar: (scalar, delimiters = null, stringDelimiters = ['"', "'"], context = null, evaluate = true) ->
        unless context?
            context = exceptionOnInvalidType: @settings.exceptionOnInvalidType, objectDecoder: @settings.objectDecoder, i: 0
        {i} = context

        if scalar.charAt(i) in stringDelimiters
            # Quoted scalar
            output = @parseQuotedScalar scalar, context
            {i} = context

            if delimiters?
                tmp = Utils.ltrim scalar[i..], ' '
                if not(tmp.charAt(0) in delimiters)
                    throw new ParseException 'Unexpected characters ('+scalar[i..]+').'

        else
            # "normal" string
            if not delimiters
                output = scalar[i..]
                i += output.length

                # Remove comments
                strpos = output.indexOf ' #'
                if strpos isnt -1
                    output = Utils.rtrim output[0...strpos]

            else
                joinedDelimiters = delimiters.join('|')
                pattern = @PATTERN_SCALAR_BY_DELIMITERS[joinedDelimiters]
                unless pattern?
                    pattern = new Pattern '^(.+?)('+joinedDelimiters+')'
                    @PATTERN_SCALAR_BY_DELIMITERS[joinedDelimiters] = pattern
                if match = pattern.exec scalar[i..]
                    output = match[1]
                    i += output.length
                else
                    throw new ParseException 'Malformed inline YAML string ('+scalar+').'


            if evaluate
                output = @evaluateScalar output, context

        context.i = i
        return output


    # Parses a quoted scalar to YAML.
    #
    # @param [String]   scalar
    # @param [Object]   context
    #
    # @return [String]  A YAML string
    #
    # @throw [ParseMore] When malformed inline YAML string is parsed
    #
    @parseQuotedScalar: (scalar, context) ->
        {i} = context

        unless match = @PATTERN_QUOTED_SCALAR.exec scalar[i..]
            throw new ParseMore 'Malformed inline YAML string ('+scalar[i..]+').'

        output = match[0].substr(1, match[0].length - 2)

        if '"' is scalar.charAt(i)
            output = Unescaper.unescapeDoubleQuotedString output
        else
            output = Unescaper.unescapeSingleQuotedString output

        i += match[0].length

        context.i = i
        return output


    # Parses a sequence to a YAML string.
    #
    # @param [String]   sequence
    # @param [Object]   context
    #
    # @return [String]  A YAML string
    #
    # @throw [ParseMore] When malformed inline YAML string is parsed
    #
    @parseSequence: (sequence, context) ->
        output = []
        len = sequence.length
        {i} = context
        i += 1

        # [foo, bar, ...]
        while i < len
            context.i = i
            switch sequence.charAt(i)
                when '['
                    # Nested sequence
                    output.push @parseSequence sequence, context
                    {i} = context
                when '{'
                    # Nested mapping
                    output.push @parseMapping sequence, context
                    {i} = context
                when ']'
                    return output
                when ',', ' ', "\n"
                    # Do nothing
                else
                    isQuoted = (sequence.charAt(i) in ['"', "'"])
                    value = @parseScalar sequence, [',', ']'], ['"', "'"], context
                    {i} = context

                    if not(isQuoted) and typeof(value) is 'string' and (value.indexOf(': ') isnt -1 or value.indexOf(":\n") isnt -1)
                        # Embedded mapping?
                        try
                            value = @parseMapping '{'+value+'}'
                        catch e
                            # No, it's not


                    output.push value

                    --i

            ++i

        throw new ParseMore 'Malformed inline YAML string '+sequence


    # Parses a mapping to a YAML string.
    #
    # @param [String]   mapping
    # @param [Object]   context
    #
    # @return [String]  A YAML string
    #
    # @throw [ParseMore] When malformed inline YAML string is parsed
    #
    @parseMapping: (mapping, context) ->
        output = {}
        len = mapping.length
        {i} = context
        i += 1

        # {foo: bar, bar:foo, ...}
        shouldContinueWhileLoop = false
        while i < len
            context.i = i
            switch mapping.charAt(i)
                when ' ', ',', "\n"
                    ++i
                    context.i = i
                    shouldContinueWhileLoop = true
                when '}'
                    return output

            if shouldContinueWhileLoop
                shouldContinueWhileLoop = false
                continue

            # Key
            key = @parseScalar mapping, [':', ' ', "\n"], ['"', "'"], context, false
            {i} = context

            # Value
            done = false

            while i < len
                context.i = i
                switch mapping.charAt(i)
                    when '['
                        # Nested sequence
                        value = @parseSequence mapping, context
                        {i} = context
                        # Spec: Keys MUST be unique; first one wins.
                        # Parser cannot abort this mapping earlier, since lines
                        # are processed sequentially.
                        if output[key] == undefined
                            output[key] = value
                        done = true
                    when '{'
                        # Nested mapping
                        value = @parseMapping mapping, context
                        {i} = context
                        # Spec: Keys MUST be unique; first one wins.
                        # Parser cannot abort this mapping earlier, since lines
                        # are processed sequentially.
                        if output[key] == undefined
                            output[key] = value
                        done = true
                    when ':', ' ', "\n"
                        # Do nothing
                    else
                        value = @parseScalar mapping, [',', '}'], ['"', "'"], context
                        {i} = context
                        # Spec: Keys MUST be unique; first one wins.
                        # Parser cannot abort this mapping earlier, since lines
                        # are processed sequentially.
                        if output[key] == undefined
                            output[key] = value
                        done = true
                        --i

                ++i

                if done
                    break

        throw new ParseMore 'Malformed inline YAML string '+mapping


    # Evaluates scalars and replaces magic values.
    #
    # @param [String]   scalar
    #
    # @return [String]  A YAML string
    #
    @evaluateScalar: (scalar, context) ->
        scalar = Utils.trim(scalar)
        scalarLower = scalar.toLowerCase()

        switch scalarLower
            when 'null', '', '~'
                return null
            when 'true'
                return true
            when 'false'
                return false
            when '.inf'
                return Infinity
            when '.nan'
                return NaN
            when '-.inf'
                return Infinity
            else
                firstChar = scalarLower.charAt(0)
                switch firstChar
                    when '!'
                        firstSpace = scalar.indexOf(' ')
                        if firstSpace is -1
                            firstWord = scalarLower
                        else
                            firstWord = scalarLower[0...firstSpace]
                        switch firstWord
                            when '!'
                                if firstSpace isnt -1
                                    return parseInt @parseScalar(scalar[2..])
                                return null
                            when '!str'
                                return Utils.ltrim scalar[4..]
                            when '!!str'
                                return Utils.ltrim scalar[5..]
                            when '!!int'
                                return parseInt(@parseScalar(scalar[5..]))
                            when '!!bool'
                                return Utils.parseBoolean(@parseScalar(scalar[6..]), false)
                            when '!!float'
                                return parseFloat(@parseScalar(scalar[7..]))
                            when '!!timestamp'
                                return Utils.stringToDate(Utils.ltrim(scalar[11..]))
                            else
                                unless context?
                                    context = exceptionOnInvalidType: @settings.exceptionOnInvalidType, objectDecoder: @settings.objectDecoder, i: 0
                                {objectDecoder, exceptionOnInvalidType} = context

                                if objectDecoder
                                    # If objectDecoder function is given, we can do custom decoding of custom types
                                    trimmedScalar = Utils.rtrim scalar
                                    firstSpace = trimmedScalar.indexOf(' ')
                                    if firstSpace is -1
                                        return objectDecoder trimmedScalar, null
                                    else
                                        subValue = Utils.ltrim trimmedScalar[firstSpace+1..]
                                        unless subValue.length > 0
                                            subValue = null
                                        return objectDecoder trimmedScalar[0...firstSpace], subValue

                                if exceptionOnInvalidType
                                    throw new ParseException 'Custom object support when parsing a YAML file has been disabled.'

                                return null
                    when '0'
                        if '0x' is scalar[0...2]
                            return Utils.hexDec scalar
                        else if Utils.isDigits scalar
                            return Utils.octDec scalar
                        else if Utils.isNumeric scalar
                            return parseFloat scalar
                        else
                            return scalar
                    when '+'
                        if Utils.isDigits scalar
                            raw = scalar
                            cast = parseInt(raw)
                            if raw is String(cast)
                                return cast
                            else
                                return raw
                        else if Utils.isNumeric scalar
                            return parseFloat scalar
                        else if @PATTERN_THOUSAND_NUMERIC_SCALAR.test scalar
                            return parseFloat(scalar.replace(',', ''))
                        return scalar
                    when '-'
                        if Utils.isDigits(scalar[1..])
                            if '0' is scalar.charAt(1)
                                return -Utils.octDec(scalar[1..])
                            else
                                raw = scalar[1..]
                                cast = parseInt(raw)
                                if raw is String(cast)
                                    return -cast
                                else
                                    return -raw
                        else if Utils.isNumeric scalar
                            return parseFloat scalar
                        else if @PATTERN_THOUSAND_NUMERIC_SCALAR.test scalar
                            return parseFloat(scalar.replace(',', ''))
                        return scalar
                    else
                        if date = Utils.stringToDate(scalar)
                            return date
                        else if Utils.isNumeric(scalar)
                            return parseFloat scalar
                        else if @PATTERN_THOUSAND_NUMERIC_SCALAR.test scalar
                            return parseFloat(scalar.replace(',', ''))
                        return scalar

module.exports = Inline
