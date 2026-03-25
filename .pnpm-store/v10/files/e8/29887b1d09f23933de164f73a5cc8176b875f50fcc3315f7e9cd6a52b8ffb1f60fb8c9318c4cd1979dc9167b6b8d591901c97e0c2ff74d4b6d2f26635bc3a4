
Utils   = require './Utils'
Inline  = require './Inline'

# Dumper dumps JavaScript variables to YAML strings.
#
class Dumper

    # The amount of spaces to use for indentation of nested nodes.
    @indentation:   4


    # Dumps a JavaScript value to YAML.
    #
    # @param [Object]   input                   The JavaScript value
    # @param [Integer]  inline                  The level where you switch to inline YAML
    # @param [Integer]  indent                  The level of indentation (used internally)
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types (a JavaScript resource or object), false otherwise
    # @param [Function] objectEncoder           A function to serialize custom objects, null otherwise
    #
    # @return [String]  The YAML representation of the JavaScript value
    #
    dump: (input, inline = 0, indent = 0, exceptionOnInvalidType = false, objectEncoder = null) ->
        output = ''
        prefix = (if indent then Utils.strRepeat(' ', indent) else '')

        if inline <= 0 or typeof(input) isnt 'object' or input instanceof Date or Utils.isEmpty(input)
            output += prefix + Inline.dump(input, exceptionOnInvalidType, objectEncoder)
        
        else
            if input instanceof Array
                for value in input
                    willBeInlined = (inline - 1 <= 0 or typeof(value) isnt 'object' or Utils.isEmpty(value))

                    output +=
                        prefix +
                        '-' +
                        (if willBeInlined then ' ' else "\n") +
                        @dump(value, inline - 1, (if willBeInlined then 0 else indent + @indentation), exceptionOnInvalidType, objectEncoder) +
                        (if willBeInlined then "\n" else '')

            else
                for key, value of input
                    willBeInlined = (inline - 1 <= 0 or typeof(value) isnt 'object' or Utils.isEmpty(value))

                    output +=
                        prefix +
                        Inline.dump(key, exceptionOnInvalidType, objectEncoder) + ':' +
                        (if willBeInlined then ' ' else "\n") +
                        @dump(value, inline - 1, (if willBeInlined then 0 else indent + @indentation), exceptionOnInvalidType, objectEncoder) +
                        (if willBeInlined then "\n" else '')

        return output


module.exports = Dumper
