
Parser = require './Parser'
Dumper = require './Dumper'
Utils  = require './Utils'

# Yaml offers convenience methods to load and dump YAML.
#
class Yaml

    # Parses YAML into a JavaScript object.
    #
    # The parse method, when supplied with a YAML string,
    # will do its best to convert YAML in a file into a JavaScript object.
    #
    #  Usage:
    #     myObject = Yaml.parse('some: yaml');
    #     console.log(myObject);
    #
    # @param [String]   input                   A string containing YAML
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types, false otherwise
    # @param [Function] objectDecoder           A function to deserialize custom objects, null otherwise
    #
    # @return [Object]  The YAML converted to a JavaScript object
    #
    # @throw [ParseException] If the YAML is not valid
    #
    @parse: (input, exceptionOnInvalidType = false, objectDecoder = null) ->
        return new Parser().parse(input, exceptionOnInvalidType, objectDecoder)


    # Parses YAML from file path into a JavaScript object.
    #
    # The parseFile method, when supplied with a YAML file,
    # will do its best to convert YAML in a file into a JavaScript object.
    #
    #  Usage:
    #     myObject = Yaml.parseFile('config.yml');
    #     console.log(myObject);
    #
    # @param [String]   path                    A file path pointing to a valid YAML file
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types, false otherwise
    # @param [Function] objectDecoder           A function to deserialize custom objects, null otherwise
    #
    # @return [Object]  The YAML converted to a JavaScript object or null if the file doesn't exist.
    #
    # @throw [ParseException] If the YAML is not valid
    #
    @parseFile: (path, callback = null, exceptionOnInvalidType = false, objectDecoder = null) ->
        if callback?
            # Async
            Utils.getStringFromFile path, (input) =>
                result = null
                if input?
                    result = @parse input, exceptionOnInvalidType, objectDecoder
                callback result
                return
        else
            # Sync
            input = Utils.getStringFromFile path
            if input?
                return @parse input, exceptionOnInvalidType, objectDecoder
            return null


    # Dumps a JavaScript object to a YAML string.
    #
    # The dump method, when supplied with an object, will do its best
    # to convert the object into friendly YAML.
    #
    # @param [Object]   input                   JavaScript object
    # @param [Integer]  inline                  The level where you switch to inline YAML
    # @param [Integer]  indent                  The amount of spaces to use for indentation of nested nodes.
    # @param [Boolean]  exceptionOnInvalidType  true if an exception must be thrown on invalid types (a JavaScript resource or object), false otherwise
    # @param [Function] objectEncoder           A function to serialize custom objects, null otherwise
    #
    # @return [String]  A YAML string representing the original JavaScript object
    #
    @dump: (input, inline = 2, indent = 4, exceptionOnInvalidType = false, objectEncoder = null) ->
        yaml = new Dumper()
        yaml.indentation = indent

        return yaml.dump(input, inline, 0, exceptionOnInvalidType, objectEncoder)


    # Alias of dump() method for compatibility reasons.
    #
    @stringify: (input, inline, indent, exceptionOnInvalidType, objectEncoder) ->
        return @dump input, inline, indent, exceptionOnInvalidType, objectEncoder


    # Alias of parseFile() method for compatibility reasons.
    #
    @load: (path, callback, exceptionOnInvalidType, objectDecoder) ->
        return @parseFile path, callback, exceptionOnInvalidType, objectDecoder


# Expose YAML namespace to browser
window?.YAML = Yaml

# Not in the browser?
unless window?
    @YAML = Yaml

module.exports = Yaml
