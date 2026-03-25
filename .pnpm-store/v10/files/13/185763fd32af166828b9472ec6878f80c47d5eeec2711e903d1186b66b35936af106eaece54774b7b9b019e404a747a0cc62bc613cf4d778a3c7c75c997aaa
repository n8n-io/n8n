
class DumpException extends Error

    constructor: (@message, @parsedLine, @snippet) ->

    toString: ->
        if @parsedLine? and @snippet?
            return '<DumpException> ' + @message + ' (line ' + @parsedLine + ': \'' + @snippet + '\')'
        else
            return '<DumpException> ' + @message

module.exports = DumpException
