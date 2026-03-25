
Inline          = require './Inline'
Pattern         = require './Pattern'
Utils           = require './Utils'
ParseException  = require './Exception/ParseException'
ParseMore       = require './Exception/ParseMore'

# Parser parses YAML strings to convert them to JavaScript objects.
#
class Parser

    # Pre-compiled patterns
    #
    PATTERN_FOLDED_SCALAR_ALL:              new Pattern '^(?:(?<type>![^\\|>]*)\\s+)?(?<separator>\\||>)(?<modifiers>\\+|\\-|\\d+|\\+\\d+|\\-\\d+|\\d+\\+|\\d+\\-)?(?<comments> +#.*)?$'
    PATTERN_FOLDED_SCALAR_END:              new Pattern '(?<separator>\\||>)(?<modifiers>\\+|\\-|\\d+|\\+\\d+|\\-\\d+|\\d+\\+|\\d+\\-)?(?<comments> +#.*)?$'
    PATTERN_SEQUENCE_ITEM:                  new Pattern '^\\-((?<leadspaces>\\s+)(?<value>.+?))?\\s*$'
    PATTERN_ANCHOR_VALUE:                   new Pattern '^&(?<ref>[^ ]+) *(?<value>.*)'
    PATTERN_COMPACT_NOTATION:               new Pattern '^(?<key>'+Inline.REGEX_QUOTED_STRING+'|[^ \'"\\{\\[].*?) *\\:(\\s+(?<value>.+?))?\\s*$'
    PATTERN_MAPPING_ITEM:                   new Pattern '^(?<key>'+Inline.REGEX_QUOTED_STRING+'|[^ \'"\\[\\{].*?) *\\:(\\s+(?<value>.+?))?\\s*$'
    PATTERN_DECIMAL:                        new Pattern '\\d+'
    PATTERN_INDENT_SPACES:                  new Pattern '^ +'
    PATTERN_TRAILING_LINES:                 new Pattern '(\n*)$'
    PATTERN_YAML_HEADER:                    new Pattern '^\\%YAML[: ][\\d\\.]+.*\n', 'm'
    PATTERN_LEADING_COMMENTS:               new Pattern '^(\\#.*?\n)+', 'm'
    PATTERN_DOCUMENT_MARKER_START:          new Pattern '^\\-\\-\\-.*?\n', 'm'
    PATTERN_DOCUMENT_MARKER_END:            new Pattern '^\\.\\.\\.\\s*$', 'm'
    PATTERN_FOLDED_SCALAR_BY_INDENTATION:   {}

    # Context types
    #
    CONTEXT_NONE:       0
    CONTEXT_SEQUENCE:   1
    CONTEXT_MAPPING:    2


    # Constructor
    #
    # @param [Integer]  offset  The offset of YAML document (used for line numbers in error messages)
    #
    constructor: (@offset = 0) ->
        @lines          = []
        @currentLineNb  = -1
        @currentLine    = ''
        @refs           = {}


    # Parses a YAML string to a JavaScript value.
    #
    # @param [String]   value                   A YAML string
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types (a JavaScript resource or object), false otherwise
    # @param [Function] objectDecoder           A function to deserialize custom objects, null otherwise
    #
    # @return [Object]  A JavaScript value
    #
    # @throw [ParseException] If the YAML is not valid
    #
    parse: (value, exceptionOnInvalidType = false, objectDecoder = null) ->
        @currentLineNb = -1
        @currentLine = ''
        @lines = @cleanup(value).split "\n"

        data = null
        context = @CONTEXT_NONE
        allowOverwrite = false
        while @moveToNextLine()
            if @isCurrentLineEmpty()
                continue

            # Tab?
            if "\t" is @currentLine[0]
                throw new ParseException 'A YAML file cannot contain tabs as indentation.', @getRealCurrentLineNb() + 1, @currentLine

            isRef = mergeNode = false
            if values = @PATTERN_SEQUENCE_ITEM.exec @currentLine
                if @CONTEXT_MAPPING is context
                    throw new ParseException 'You cannot define a sequence item when in a mapping'
                context = @CONTEXT_SEQUENCE
                data ?= []

                if values.value? and matches = @PATTERN_ANCHOR_VALUE.exec values.value
                    isRef = matches.ref
                    values.value = matches.value

                # Array
                if not(values.value?) or '' is Utils.trim(values.value, ' ') or Utils.ltrim(values.value, ' ').indexOf('#') is 0
                    if @currentLineNb < @lines.length - 1 and not @isNextLineUnIndentedCollection()
                        c = @getRealCurrentLineNb() + 1
                        parser = new Parser c
                        parser.refs = @refs
                        data.push parser.parse(@getNextEmbedBlock(null, true), exceptionOnInvalidType, objectDecoder)
                    else
                        data.push null

                else
                    if values.leadspaces?.length and matches = @PATTERN_COMPACT_NOTATION.exec values.value

                        # This is a compact notation element, add to next block and parse
                        c = @getRealCurrentLineNb()
                        parser = new Parser c
                        parser.refs = @refs

                        block = values.value
                        indent = @getCurrentLineIndentation()
                        if @isNextLineIndented(false)
                            block += "\n"+@getNextEmbedBlock(indent + values.leadspaces.length + 1, true)

                        data.push parser.parse block, exceptionOnInvalidType, objectDecoder

                    else
                        data.push @parseValue values.value, exceptionOnInvalidType, objectDecoder

            else if (values = @PATTERN_MAPPING_ITEM.exec @currentLine) and values.key.indexOf(' #') is -1
                if @CONTEXT_SEQUENCE is context
                    throw new ParseException 'You cannot define a mapping item when in a sequence'
                context = @CONTEXT_MAPPING
                data ?= {}

                # Force correct settings
                Inline.configure exceptionOnInvalidType, objectDecoder
                try
                    key = Inline.parseScalar values.key
                catch e
                    e.parsedLine = @getRealCurrentLineNb() + 1
                    e.snippet = @currentLine

                    throw e

                if '<<' is key
                    mergeNode = true
                    allowOverwrite = true
                    if values.value?.indexOf('*') is 0
                        refName = values.value[1..]
                        unless @refs[refName]?
                            throw new ParseException 'Reference "'+refName+'" does not exist.', @getRealCurrentLineNb() + 1, @currentLine

                        refValue = @refs[refName]

                        if typeof refValue isnt 'object'
                            throw new ParseException 'YAML merge keys used with a scalar value instead of an object.', @getRealCurrentLineNb() + 1, @currentLine

                        if refValue instanceof Array
                            # Merge array with object
                            for value, i in refValue
                                data[String(i)] ?= value
                        else
                            # Merge objects
                            for key, value of refValue
                                data[key] ?= value

                    else
                        if values.value? and values.value isnt ''
                            value = values.value
                        else
                            value = @getNextEmbedBlock()

                        c = @getRealCurrentLineNb() + 1
                        parser = new Parser c
                        parser.refs = @refs
                        parsed = parser.parse value, exceptionOnInvalidType

                        unless typeof parsed is 'object'
                            throw new ParseException 'YAML merge keys used with a scalar value instead of an object.', @getRealCurrentLineNb() + 1, @currentLine

                        if parsed instanceof Array
                            # If the value associated with the merge key is a sequence, then this sequence is expected to contain mapping nodes
                            # and each of these nodes is merged in turn according to its order in the sequence. Keys in mapping nodes earlier
                            # in the sequence override keys specified in later mapping nodes.
                            for parsedItem in parsed
                                unless typeof parsedItem is 'object'
                                    throw new ParseException 'Merge items must be objects.', @getRealCurrentLineNb() + 1, parsedItem

                                if parsedItem instanceof Array
                                    # Merge array with object
                                    for value, i in parsedItem
                                        k = String(i)
                                        unless data.hasOwnProperty(k)
                                            data[k] = value
                                else
                                    # Merge objects
                                    for key, value of parsedItem
                                        unless data.hasOwnProperty(key)
                                            data[key] = value

                        else
                            # If the value associated with the key is a single mapping node, each of its key/value pairs is inserted into the
                            # current mapping, unless the key already exists in it.
                            for key, value of parsed
                                unless data.hasOwnProperty(key)
                                    data[key] = value

                else if values.value? and matches = @PATTERN_ANCHOR_VALUE.exec values.value
                    isRef = matches.ref
                    values.value = matches.value


                if mergeNode
                    # Merge keys
                else if not(values.value?) or '' is Utils.trim(values.value, ' ') or Utils.ltrim(values.value, ' ').indexOf('#') is 0
                    # Hash
                    # if next line is less indented or equal, then it means that the current value is null
                    if not(@isNextLineIndented()) and not(@isNextLineUnIndentedCollection())
                        # Spec: Keys MUST be unique; first one wins.
                        # But overwriting is allowed when a merge node is used in current block.
                        if allowOverwrite or data[key] is undefined
                            data[key] = null

                    else
                        c = @getRealCurrentLineNb() + 1
                        parser = new Parser c
                        parser.refs = @refs
                        val = parser.parse @getNextEmbedBlock(), exceptionOnInvalidType, objectDecoder

                        # Spec: Keys MUST be unique; first one wins.
                        # But overwriting is allowed when a merge node is used in current block.
                        if allowOverwrite or data[key] is undefined
                            data[key] = val

                else
                    val = @parseValue values.value, exceptionOnInvalidType, objectDecoder

                    # Spec: Keys MUST be unique; first one wins.
                    # But overwriting is allowed when a merge node is used in current block.
                    if allowOverwrite or data[key] is undefined
                        data[key] = val

            else
                # 1-liner optionally followed by newline
                lineCount = @lines.length
                if 1 is lineCount or (2 is lineCount and Utils.isEmpty(@lines[1]))
                    try
                        value = Inline.parse @lines[0], exceptionOnInvalidType, objectDecoder
                    catch e
                        e.parsedLine = @getRealCurrentLineNb() + 1
                        e.snippet = @currentLine

                        throw e

                    if typeof value is 'object'
                        if value instanceof Array
                            first = value[0]
                        else
                            for key of value
                                first = value[key]
                                break

                        if typeof first is 'string' and first.indexOf('*') is 0
                            data = []
                            for alias in value
                                data.push @refs[alias[1..]]
                            value = data

                    return value

                else if Utils.ltrim(value).charAt(0) in ['[', '{']
                    try
                        return Inline.parse value, exceptionOnInvalidType, objectDecoder
                    catch e
                        e.parsedLine = @getRealCurrentLineNb() + 1
                        e.snippet = @currentLine

                        throw e

                throw new ParseException 'Unable to parse.', @getRealCurrentLineNb() + 1, @currentLine

            if isRef
                if data instanceof Array
                    @refs[isRef] = data[data.length-1]
                else
                    lastKey = null
                    for key of data
                        lastKey = key
                    @refs[isRef] = data[lastKey]


        if Utils.isEmpty(data)
            return null
        else
            return data



    # Returns the current line number (takes the offset into account).
    #
    # @return [Integer]     The current line number
    #
    getRealCurrentLineNb: ->
        return @currentLineNb + @offset


    # Returns the current line indentation.
    #
    # @return [Integer]     The current line indentation
    #
    getCurrentLineIndentation: ->
        return @currentLine.length - Utils.ltrim(@currentLine, ' ').length


    # Returns the next embed block of YAML.
    #
    # @param [Integer]          indentation The indent level at which the block is to be read, or null for default
    #
    # @return [String]          A YAML string
    #
    # @throw [ParseException]   When indentation problem are detected
    #
    getNextEmbedBlock: (indentation = null, includeUnindentedCollection = false) ->
        @moveToNextLine()

        if not indentation?
            newIndent = @getCurrentLineIndentation()

            unindentedEmbedBlock = @isStringUnIndentedCollectionItem @currentLine

            if not(@isCurrentLineEmpty()) and 0 is newIndent and not(unindentedEmbedBlock)
                throw new ParseException 'Indentation problem.', @getRealCurrentLineNb() + 1, @currentLine

        else
            newIndent = indentation


        data = [@currentLine[newIndent..]]

        unless includeUnindentedCollection
            isItUnindentedCollection = @isStringUnIndentedCollectionItem @currentLine

        # Comments must not be removed inside a string block (ie. after a line ending with "|")
        # They must not be removed inside a sub-embedded block as well
        removeCommentsPattern = @PATTERN_FOLDED_SCALAR_END
        removeComments = not removeCommentsPattern.test @currentLine

        while @moveToNextLine()
            indent = @getCurrentLineIndentation()

            if indent is newIndent
                removeComments = not removeCommentsPattern.test @currentLine

            if removeComments and @isCurrentLineComment()
                continue

            if @isCurrentLineBlank()
                data.push @currentLine[newIndent..]
                continue

            if isItUnindentedCollection and not @isStringUnIndentedCollectionItem(@currentLine) and indent is newIndent
                @moveToPreviousLine()
                break

            if indent >= newIndent
                data.push @currentLine[newIndent..]
            else if Utils.ltrim(@currentLine).charAt(0) is '#'
                # Don't add line with comments
            else if 0 is indent
                @moveToPreviousLine()
                break
            else
                throw new ParseException 'Indentation problem.', @getRealCurrentLineNb() + 1, @currentLine


        return data.join "\n"


    # Moves the parser to the next line.
    #
    # @return [Boolean]
    #
    moveToNextLine: ->
        if @currentLineNb >= @lines.length - 1
            return false

        @currentLine = @lines[++@currentLineNb];

        return true


    # Moves the parser to the previous line.
    #
    moveToPreviousLine: ->
        @currentLine = @lines[--@currentLineNb]
        return


    # Parses a YAML value.
    #
    # @param [String]   value                   A YAML value
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types false otherwise
    # @param [Function] objectDecoder           A function to deserialize custom objects, null otherwise
    #
    # @return [Object] A JavaScript value
    #
    # @throw [ParseException] When reference does not exist
    #
    parseValue: (value, exceptionOnInvalidType, objectDecoder) ->
        if 0 is value.indexOf('*')
            pos = value.indexOf '#'
            if pos isnt -1
                value = value.substr(1, pos-2)
            else
                value = value[1..]

            if @refs[value] is undefined
                throw new ParseException 'Reference "'+value+'" does not exist.', @currentLine

            return @refs[value]


        if matches = @PATTERN_FOLDED_SCALAR_ALL.exec value
            modifiers = matches.modifiers ? ''

            foldedIndent = Math.abs(parseInt(modifiers))
            if isNaN(foldedIndent) then foldedIndent = 0
            val = @parseFoldedScalar matches.separator, @PATTERN_DECIMAL.replace(modifiers, ''), foldedIndent
            if matches.type?
                # Force correct settings
                Inline.configure exceptionOnInvalidType, objectDecoder
                return Inline.parseScalar matches.type+' '+val
            else
                return val

        # Value can be multiline compact sequence or mapping or string
        if value.charAt(0) in ['[', '{', '"', "'"]
            while true
                try
                    return Inline.parse value, exceptionOnInvalidType, objectDecoder
                catch e
                    if e instanceof ParseMore and @moveToNextLine()
                        value += "\n" + Utils.trim(@currentLine, ' ')
                    else
                        e.parsedLine = @getRealCurrentLineNb() + 1
                        e.snippet = @currentLine
                        throw e
        else
            if @isNextLineIndented()
                value += "\n" + @getNextEmbedBlock()
            return Inline.parse value, exceptionOnInvalidType, objectDecoder

        return


    # Parses a folded scalar.
    #
    # @param [String]       separator   The separator that was used to begin this folded scalar (| or >)
    # @param [String]       indicator   The indicator that was used to begin this folded scalar (+ or -)
    # @param [Integer]      indentation The indentation that was used to begin this folded scalar
    #
    # @return [String]      The text value
    #
    parseFoldedScalar: (separator, indicator = '', indentation = 0) ->
        notEOF = @moveToNextLine()
        if not notEOF
            return ''

        isCurrentLineBlank = @isCurrentLineBlank()
        text = ''

        # Leading blank lines are consumed before determining indentation
        while notEOF and isCurrentLineBlank
            # newline only if not EOF
            if notEOF = @moveToNextLine()
                text += "\n"
                isCurrentLineBlank = @isCurrentLineBlank()


        # Determine indentation if not specified
        if 0 is indentation
            if matches = @PATTERN_INDENT_SPACES.exec @currentLine
                indentation = matches[0].length


        if indentation > 0
            pattern = @PATTERN_FOLDED_SCALAR_BY_INDENTATION[indentation]
            unless pattern?
                pattern = new Pattern '^ {'+indentation+'}(.*)$'
                Parser::PATTERN_FOLDED_SCALAR_BY_INDENTATION[indentation] = pattern

            while notEOF and (isCurrentLineBlank or matches = pattern.exec @currentLine)
                if isCurrentLineBlank
                    text += @currentLine[indentation..]
                else
                    text += matches[1]

                # newline only if not EOF
                if notEOF = @moveToNextLine()
                    text += "\n"
                    isCurrentLineBlank = @isCurrentLineBlank()

        else if notEOF
            text += "\n"


        if notEOF
            @moveToPreviousLine()


        # Remove line breaks of each lines except the empty and more indented ones
        if '>' is separator
            newText = ''
            for line in text.split "\n"
                if line.length is 0 or line.charAt(0) is ' '
                    newText = Utils.rtrim(newText, ' ') + line + "\n"
                else
                    newText += line + ' '
            text = newText

        if '+' isnt indicator
            # Remove any extra space or new line as we are adding them after
            text = Utils.rtrim(text)

        # Deal with trailing newlines as indicated
        if '' is indicator
            text = @PATTERN_TRAILING_LINES.replace text, "\n"
        else if '-' is indicator
            text = @PATTERN_TRAILING_LINES.replace text, ''

        return text


    # Returns true if the next line is indented.
    #
    # @return [Boolean]     Returns true if the next line is indented, false otherwise
    #
    isNextLineIndented: (ignoreComments = true) ->
        currentIndentation = @getCurrentLineIndentation()
        EOF = not @moveToNextLine()

        if ignoreComments
            while not(EOF) and @isCurrentLineEmpty()
                EOF = not @moveToNextLine()
        else
            while not(EOF) and @isCurrentLineBlank()
                EOF = not @moveToNextLine()

        if EOF
            return false

        ret = false
        if @getCurrentLineIndentation() > currentIndentation
            ret = true

        @moveToPreviousLine()

        return ret


    # Returns true if the current line is blank or if it is a comment line.
    #
    # @return [Boolean]     Returns true if the current line is empty or if it is a comment line, false otherwise
    #
    isCurrentLineEmpty: ->
        trimmedLine = Utils.trim(@currentLine, ' ')
        return trimmedLine.length is 0 or trimmedLine.charAt(0) is '#'


    # Returns true if the current line is blank.
    #
    # @return [Boolean]     Returns true if the current line is blank, false otherwise
    #
    isCurrentLineBlank: ->
        return '' is Utils.trim(@currentLine, ' ')


    # Returns true if the current line is a comment line.
    #
    # @return [Boolean]     Returns true if the current line is a comment line, false otherwise
    #
    isCurrentLineComment: ->
        # Checking explicitly the first char of the trim is faster than loops or strpos
        ltrimmedLine = Utils.ltrim(@currentLine, ' ')

        return ltrimmedLine.charAt(0) is '#'


    # Cleanups a YAML string to be parsed.
    #
    # @param [String]   value The input YAML string
    #
    # @return [String]  A cleaned up YAML string
    #
    cleanup: (value) ->
        if value.indexOf("\r") isnt -1
            value = value.split("\r\n").join("\n").split("\r").join("\n")

        # Strip YAML header
        count = 0
        [value, count] = @PATTERN_YAML_HEADER.replaceAll value, ''
        @offset += count

        # Remove leading comments
        [trimmedValue, count] = @PATTERN_LEADING_COMMENTS.replaceAll value, '', 1
        if count is 1
            # Items have been removed, update the offset
            @offset += Utils.subStrCount(value, "\n") - Utils.subStrCount(trimmedValue, "\n")
            value = trimmedValue

        # Remove start of the document marker (---)
        [trimmedValue, count] = @PATTERN_DOCUMENT_MARKER_START.replaceAll value, '', 1
        if count is 1
            # Items have been removed, update the offset
            @offset += Utils.subStrCount(value, "\n") - Utils.subStrCount(trimmedValue, "\n")
            value = trimmedValue

            # Remove end of the document marker (...)
            value = @PATTERN_DOCUMENT_MARKER_END.replace value, ''

        # Ensure the block is not indented
        lines = value.split("\n")
        smallestIndent = -1
        for line in lines
            continue if Utils.trim(line, ' ').length == 0
            indent = line.length - Utils.ltrim(line).length
            if smallestIndent is -1 or indent < smallestIndent
                smallestIndent = indent
        if smallestIndent > 0
            for line, i in lines
                lines[i] = line[smallestIndent..]
            value = lines.join("\n")

        return value


    # Returns true if the next line starts unindented collection
    #
    # @return [Boolean]     Returns true if the next line starts unindented collection, false otherwise
    #
    isNextLineUnIndentedCollection: (currentIndentation = null) ->
        currentIndentation ?= @getCurrentLineIndentation()
        notEOF = @moveToNextLine()

        while notEOF and @isCurrentLineEmpty()
            notEOF = @moveToNextLine()

        if false is notEOF
            return false

        ret = false
        if @getCurrentLineIndentation() is currentIndentation and @isStringUnIndentedCollectionItem(@currentLine)
            ret = true

        @moveToPreviousLine()

        return ret


    # Returns true if the string is un-indented collection item
    #
    # @return [Boolean]     Returns true if the string is un-indented collection item, false otherwise
    #
    isStringUnIndentedCollectionItem: ->
        return @currentLine is '-' or @currentLine[0...2] is '- '


module.exports = Parser
