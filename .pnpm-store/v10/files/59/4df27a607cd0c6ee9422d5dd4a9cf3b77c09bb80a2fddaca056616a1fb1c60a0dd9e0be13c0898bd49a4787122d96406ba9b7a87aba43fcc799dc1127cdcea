
class ParseMore extends Error

    constructor: (@message, @parsedLine, @snippet) ->

    toString: ->
        if @parsedLine? and @snippet?
            return '<ParseMore> ' + @message + ' (line ' + @parsedLine + ': \'' + @snippet + '\')'
        else
            return '<ParseMore> ' + @message

module.exports = ParseMore
