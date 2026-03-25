
Pattern = require './Pattern'

# A bunch of utility methods
#
class Utils

    @REGEX_LEFT_TRIM_BY_CHAR:   {}
    @REGEX_RIGHT_TRIM_BY_CHAR:  {}
    @REGEX_SPACES:              /\s+/g
    @REGEX_DIGITS:              /^\d+$/
    @REGEX_OCTAL:               /[^0-7]/gi
    @REGEX_HEXADECIMAL:         /[^a-f0-9]/gi

    # Precompiled date pattern
    @PATTERN_DATE:              new Pattern '^'+
            '(?<year>[0-9][0-9][0-9][0-9])'+
            '-(?<month>[0-9][0-9]?)'+
            '-(?<day>[0-9][0-9]?)'+
            '(?:(?:[Tt]|[ \t]+)'+
            '(?<hour>[0-9][0-9]?)'+
            ':(?<minute>[0-9][0-9])'+
            ':(?<second>[0-9][0-9])'+
            '(?:\.(?<fraction>[0-9]*))?'+
            '(?:[ \t]*(?<tz>Z|(?<tz_sign>[-+])(?<tz_hour>[0-9][0-9]?)'+
            '(?::(?<tz_minute>[0-9][0-9]))?))?)?'+
            '$', 'i'

    # Local timezone offset in ms
    @LOCAL_TIMEZONE_OFFSET:     new Date().getTimezoneOffset() * 60 * 1000

    # Trims the given string on both sides
    #
    # @param [String] str The string to trim
    # @param [String] _char The character to use for trimming (default: '\\s')
    #
    # @return [String] A trimmed string
    #
    @trim: (str, _char = '\\s') ->
        regexLeft = @REGEX_LEFT_TRIM_BY_CHAR[_char]
        unless regexLeft?
            @REGEX_LEFT_TRIM_BY_CHAR[_char] = regexLeft = new RegExp '^'+_char+''+_char+'*'
        regexLeft.lastIndex = 0
        regexRight = @REGEX_RIGHT_TRIM_BY_CHAR[_char]
        unless regexRight?
            @REGEX_RIGHT_TRIM_BY_CHAR[_char] = regexRight = new RegExp _char+''+_char+'*$'
        regexRight.lastIndex = 0
        return str.replace(regexLeft, '').replace(regexRight, '')


    # Trims the given string on the left side
    #
    # @param [String] str The string to trim
    # @param [String] _char The character to use for trimming (default: '\\s')
    #
    # @return [String] A trimmed string
    #
    @ltrim: (str, _char = '\\s') ->
        regexLeft = @REGEX_LEFT_TRIM_BY_CHAR[_char]
        unless regexLeft?
            @REGEX_LEFT_TRIM_BY_CHAR[_char] = regexLeft = new RegExp '^'+_char+''+_char+'*'
        regexLeft.lastIndex = 0
        return str.replace(regexLeft, '')


    # Trims the given string on the right side
    #
    # @param [String] str The string to trim
    # @param [String] _char The character to use for trimming (default: '\\s')
    #
    # @return [String] A trimmed string
    #
    @rtrim: (str, _char = '\\s') ->
        regexRight = @REGEX_RIGHT_TRIM_BY_CHAR[_char]
        unless regexRight?
            @REGEX_RIGHT_TRIM_BY_CHAR[_char] = regexRight = new RegExp _char+''+_char+'*$'
        regexRight.lastIndex = 0
        return str.replace(regexRight, '')


    # Checks if the given value is empty (null, undefined, empty string, string '0', empty Array, empty Object)
    #
    # @param [Object] value The value to check
    #
    # @return [Boolean] true if the value is empty
    #
    @isEmpty: (value) ->
        return not(value) or value is '' or value is '0' or (value instanceof Array and value.length is 0) or @isEmptyObject(value)

    # Checks if the given value is an empty object
    #
    # @param [Object] value The value to check
    #
    # @return [Boolean] true if the value is empty and is an object
    #
    @isEmptyObject: (value) ->
        return value instanceof Object and (k for own k of value).length is 0

    # Counts the number of occurences of subString inside string
    #
    # @param [String] string The string where to count occurences
    # @param [String] subString The subString to count
    # @param [Integer] start The start index
    # @param [Integer] length The string length until where to count
    #
    # @return [Integer] The number of occurences
    #
    @subStrCount: (string, subString, start, length) ->
        c = 0

        string = '' + string
        subString = '' + subString

        if start?
            string = string[start..]
        if length?
            string = string[0...length]

        len = string.length
        sublen = subString.length
        for i in [0...len]
            if subString is string[i...sublen]
                c++
                i += sublen - 1

        return c


    # Returns true if input is only composed of digits
    #
    # @param [Object] input The value to test
    #
    # @return [Boolean] true if input is only composed of digits
    #
    @isDigits: (input) ->
        @REGEX_DIGITS.lastIndex = 0
        return @REGEX_DIGITS.test input


    # Decode octal value
    #
    # @param [String] input The value to decode
    #
    # @return [Integer] The decoded value
    #
    @octDec: (input) ->
        @REGEX_OCTAL.lastIndex = 0
        return parseInt((input+'').replace(@REGEX_OCTAL, ''), 8)


    # Decode hexadecimal value
    #
    # @param [String] input The value to decode
    #
    # @return [Integer] The decoded value
    #
    @hexDec: (input) ->
        @REGEX_HEXADECIMAL.lastIndex = 0
        input = @trim(input)
        if (input+'')[0...2] is '0x' then input = (input+'')[2..]
        return parseInt((input+'').replace(@REGEX_HEXADECIMAL, ''), 16)


    # Get the UTF-8 character for the given code point.
    #
    # @param [Integer] c The unicode code point
    #
    # @return [String] The corresponding UTF-8 character
    #
    @utf8chr: (c) ->
        ch = String.fromCharCode
        if 0x80 > (c %= 0x200000)
            return ch(c)
        if 0x800 > c
            return ch(0xC0 | c>>6) + ch(0x80 | c & 0x3F)
        if 0x10000 > c
            return ch(0xE0 | c>>12) + ch(0x80 | c>>6 & 0x3F) + ch(0x80 | c & 0x3F)

        return ch(0xF0 | c>>18) + ch(0x80 | c>>12 & 0x3F) + ch(0x80 | c>>6 & 0x3F) + ch(0x80 | c & 0x3F)


    # Returns the boolean value equivalent to the given input
    #
    # @param [String|Object]    input       The input value
    # @param [Boolean]          strict      If set to false, accept 'yes' and 'no' as boolean values
    #
    # @return [Boolean]         the boolean value
    #
    @parseBoolean: (input, strict = true) ->
        if typeof(input) is 'string'
            lowerInput = input.toLowerCase()
            if not strict
                if lowerInput is 'no' then return false
            if lowerInput is '0' then return false
            if lowerInput is 'false' then return false
            if lowerInput is '' then return false
            return true
        return !!input



    # Returns true if input is numeric
    #
    # @param [Object] input The value to test
    #
    # @return [Boolean] true if input is numeric
    #
    @isNumeric: (input) ->
        @REGEX_SPACES.lastIndex = 0
        return typeof(input) is 'number' or typeof(input) is 'string' and !isNaN(input) and input.replace(@REGEX_SPACES, '') isnt ''


    # Returns a parsed date from the given string
    #
    # @param [String] str The date string to parse
    #
    # @return [Date] The parsed date or null if parsing failed
    #
    @stringToDate: (str) ->
        unless str?.length
            return null

        # Perform regular expression pattern
        info = @PATTERN_DATE.exec str
        unless info
            return null

        # Extract year, month, day
        year = parseInt info.year, 10
        month = parseInt(info.month, 10) - 1 # In javascript, january is 0, february 1, etc...
        day = parseInt info.day, 10

        # If no hour is given, return a date with day precision
        unless info.hour?
            date = new Date Date.UTC(year, month, day)
            return date

        # Extract hour, minute, second
        hour = parseInt info.hour, 10
        minute = parseInt info.minute, 10
        second = parseInt info.second, 10

        # Extract fraction, if given
        if info.fraction?
            fraction = info.fraction[0...3]
            while fraction.length < 3
                fraction += '0'
            fraction = parseInt fraction, 10
        else
            fraction = 0

        # Compute timezone offset if given
        if info.tz?
            tz_hour = parseInt info.tz_hour, 10
            if info.tz_minute?
                tz_minute = parseInt info.tz_minute, 10
            else
                tz_minute = 0

            # Compute timezone delta in ms
            tz_offset = (tz_hour * 60 + tz_minute) * 60000
            if '-' is info.tz_sign
                tz_offset *= -1

        # Compute date
        date = new Date Date.UTC(year, month, day, hour, minute, second, fraction)
        if tz_offset
            date.setTime date.getTime() - tz_offset

        return date


    # Repeats the given string a number of times
    #
    # @param [String]   str     The string to repeat
    # @param [Integer]  number  The number of times to repeat the string
    #
    # @return [String]  The repeated string
    #
    @strRepeat: (str, number) ->
        res = ''
        i = 0
        while i < number
            res += str
            i++
        return res


    # Reads the data from the given file path and returns the result as string
    #
    # @param [String]   path        The path to the file
    # @param [Function] callback    A callback to read file asynchronously (optional)
    #
    # @return [String]  The resulting data as string
    #
    @getStringFromFile: (path, callback = null) ->
        xhr = null
        if window?
            if window.XMLHttpRequest
                xhr = new XMLHttpRequest()
            else if window.ActiveXObject
                for name in ["Msxml2.XMLHTTP.6.0", "Msxml2.XMLHTTP.3.0", "Msxml2.XMLHTTP", "Microsoft.XMLHTTP"]
                    try
                        xhr = new ActiveXObject(name)

        if xhr?
            # Browser
            if callback?
                # Async
                xhr.onreadystatechange = ->
                    if xhr.readyState is 4
                        if xhr.status is 200 or xhr.status is 0
                            callback(xhr.responseText)
                        else
                            callback(null)
                xhr.open 'GET', path, true
                xhr.send null

            else
                # Sync
                xhr.open 'GET', path, false
                xhr.send null

                if xhr.status is 200 or xhr.status == 0
                    return xhr.responseText

                return null
        else
            # Node.js-like
            req = require
            fs = req('fs') # Prevent browserify from trying to load 'fs' module
            if callback?
                # Async
                fs.readFile path, (err, data) ->
                    if err
                        callback null
                    else
                        callback String(data)

            else
                # Sync
                data = fs.readFileSync path
                if data?
                    return String(data)
                return null



module.exports = Utils
