wordwrap = require 'wordwrap'

USAGE    = /^Usage:/
HEADER   = /^[^-].*:$/
OPTION   = /^\s+-/
COMMAND  = ///^  \s+  ([\w.-]+)  (?: \s{2,} (.*) )?  $///
TEXT     = /^\S/

ARGUMENT = ///
    ^\s+                                     # starts with at least one space
    (?:                                      # metavar:
        [A-Z._-][A-Z0-9._-]+                   # either an uppercase word
      |
        <
          [^\s>]+                              # or pretty much anything inside angular brackets
        >
    )
    (?: \s\s | $ )                           # ends with two spaces or end of line
  ///

# if only JavaScript had a sane split(), we'd skip some of these
OPTION_DESC         = ///^ (.*?)  \s{2,}  (.*) $///
OPTION_METAVARS     = ///^
    (                                        # group 1: options
      [^\s,]+                                  # a WORD like -f or --foo
      (?:
        ,\s* \S+                               # maybe followed by a comma and another word like --foo
      )?
    )
    (                                        # group 2: space-separated metavars
      (?:
        \s
        (?:                                    # metavar:
            [A-Z._-][A-Z0-9._-]+                 # either an uppercase word
          |
            <
              [^\s>]+                            # or pretty much anything inside angular brackets
            >
        )
      )*
    ) $///
OPTION_SHORT        = ///^ (-\S)  (?: , \s* (.*) )? $///
OPTION_LONG         = ///^ (--\S+) $///
OPTION_BOOL         = ///^ --\[no-\](.*) $///
OPTION_DESC_TAG     = ///^ (.*) \#(\w+) (?: \(  ([^()]*)  \) )? \s* $///
DUMMY               = /// \# ///   # make Sublime Text syntax highlighting happy
OPTION_DESC_DEFAULT = ///  \(  (?: default: | default\s+is | defaults\s+to )  \s+  ([^()]+)  \)  ///i

# more readable than a func that would compute these names
SUBSUBSUB = ['command', 'subcommand', 'subsubcommand', 'subsubsubcommand']


createError = (message) ->
  e = new Error(message)
  e.isCommandLineError = yes
  return e


DefaultHandlers =
  auto: (value) ->
    return value unless typeof value is 'string'
    return Number(value) if not isNaN(Number(value))
    return value

  string: (value) -> value

  int: (value) ->
    return value unless typeof value is 'string'
    if isNaN(parseInt(value, 10))
      throw createError("Integer value required: #{value}")
    return parseInt(value, 10)

  flag: (value, options, optionName, tagValue) ->
    return yes   if !value?
    return value if typeof value isnt 'string'
    return no    if value.toLowerCase() in ['0', 'false', 'no', 'off']
    return yes   if value.toLowerCase() in ['', '1', 'true', 'yes', 'on']
    throw new Error("Invalid flag value #{JSON.stringify(value)} for option #{optionName}")


alignment   = 24
indent      = "  "
separator   = "  "
width       = 100

wrapText        = require('wordwrap')(width)


formatUsageString = (left, right) ->
  overhead = indent.length + separator.length

  if left.length < alignment - overhead
    padding = new Array(alignment - overhead - left.length + 1).join(' ')
  else
    padding = ''

  actualAlignment   = overhead + left.length + padding.length
  descriptionWidth  = width - actualAlignment
  wrappedLineIndent = new Array(actualAlignment + 1).join(' ')

  [firstLine, otherLines...] = wordwrap(descriptionWidth)(right).trim().split('\n')
  right = [firstLine].concat(otherLines.map (line) -> wrappedLineIndent + line).join("\n")
  right += "\n" if otherLines.length

  return "  #{left}#{padding}  #{right}"


cleanUpMetaVarName = (name) ->
  if $ = name.match ///^ < (.*) > $///
    $[1]
  else
    name

formatMetaVar = (metavar) ->
  if metavar == metavar.toUpperCase()
    metavar
  else
    "<#{metavar}>"

cleanUpNameForUsingAsVarName = (name, isOption) ->
  unless isOption
    if name == name.toUpperCase()
      name = name.toLowerCase()
  name


class Option
  constructor: (@shortOpt, @longOpt, @desc, tagPairs, @metavars, @defaultValue) ->
    if @longOpt || @shortOpt
      @name = @longOpt && @longOpt.slice(2) || @shortOpt.slice(1)
    else if @metavars.length
      @name = @metavars[0]
      if $ = @name.match ///^ \[ (.*) \] $///
        @name = $[1]
      @name = cleanUpMetaVarName(@name)

    @metavars = (cleanUpMetaVarName(name) for name in @metavars)

    @var = cleanUpNameForUsingAsVarName(@name, @longOpt || @shortOpt)

    @tags = {}
    @tagsOrder = []
    for [tag, value] in tagPairs
      @tags[tag] = value
      @tagsOrder.push tag

      switch tag
        when 'default' then @defaultValue = value
        when 'var'     then @var = value

    @func = null


  leftUsageComponent: ->
    longOpt = @longOpt
    if longOpt && @tags.acceptsno
      longOpt = "--[no-]" + longOpt.slice(2)

    string = switch
      when @shortOpt and longOpt then "#{@shortOpt}, #{longOpt}"
      when @shortOpt             then @shortOpt
      when @longOpt              then "    #{longOpt}"
      else ''

    if @metavars
      string = string + (string && ' ' || '') + (formatMetaVar(mv) for mv in @metavars).join(' ')

    return string


  toUsageString: -> formatUsageString(@leftUsageComponent(), @desc)


  coerce: (value, options, syntax) ->
    any = no
    for tag in @tagsOrder
      if handler = (syntax.handlers[tag] || DefaultHandlers[tag])
        newValue = handler(value, options, @leftUsageComponent(), @tags[tag])
        unless typeof newValue is undefined
          value = newValue
        any = yes
    unless any
      value = DefaultHandlers.auto(value, options, syntax, @leftUsageComponent())
    return value


class Command
  constructor: (@name, @desc, @syntax) ->
    @func = null
    @desc or= @syntax.usage.firstPreambleLine()

  leftUsageComponent: -> @name

  toUsageString: -> formatUsageString(@leftUsageComponent(), @desc)


class UsageSection

  constructor: (@type, @header) ->
    @lines = []

  toUsageString: ->
    (if @header then "#{@header}\n" else '') + ("#{line}\n" for line in @lines).join('')


class Usage

  constructor: ->
    @sections = []
    @lastSection = null

    @implicitHeaders =
      preamble:  ""
      text:      ""
      options:   "Options:"
      arguments: "Arguments:"
      commands:  "Commands:"

    @startSectionType 'preamble'


  startSection: (type, header) ->
    @lastSection = new UsageSection(type, header)
    @sections.push @lastSection


  endSection: ->
    @lastSection = null


  startSectionType: (type) ->
    return if @lastSection?.type is type
    return if @lastSection and (type is '*')

    if @lastSection?.type is '*'
      @lastSection.type = type
    else
      @startSection type, @implicitHeaders[type]


  add: (sectionType, line) ->
    if (sectionType is 'text') and (@sections.length == 1) and (@sections[0].lines.length == 0)
      sectionType = 'preamble'
    @startSectionType sectionType
    @lastSection.lines.push line

  filtered: ->
    result = new Usage()
    result.sections = (section for section in @sections when !(section.type in ['preamble', 'commands']))
    return result

  firstPreambleLine: ->
    @sections[0].lines[0] || ''

  toUsageString: ->
    usageStrings = (section.toUsageString() for section in @sections)
    (s for s in usageStrings when s).join("\n")

  @toUsageString = (usages) ->
    usageStrings = (usage.toUsageString() for usage in usages)
    (s for s in usageStrings when s).join("\n")




class Syntax
  constructor: (@handlers, specs=[], @parent=null, @parentContext='') ->
    @usage     = new Usage()

    @options   = []
    @arguments = []
    @commands  = {}
    @commandsOrder = []

    if @parent
      @parentContexts = [@parentContext].concat(@parent.parentContexts)
    else
      @parentContexts = []

    @nestingLevel = (if @parent then @parent.nestingLevel + 1 else 0)

    @shortOptions = {}
    @longOptions  = {}

    if specs
      @add(specs)


  add: (specs, options={}) ->
    unless typeof specs is 'object'
      specs = [specs]
    specs = specs.slice(0)

    gotArray    = -> (typeof specs[0] is 'object') and (specs[0] instanceof Array)
    gotFunction = -> typeof specs[0] is 'function'

    while spec = specs.shift()
      if typeof spec != 'string'
        throw new Error("Expected string spec, found #{typeof spec}")

      if spec.match(HEADER)
        @usage.startSection '*', spec

      else if spec.match(USAGE)
        @usage.add 'usage', "#{spec}"

      else if spec.match(OPTION)
        @options.push (option = Option.parse(spec.trim()))

        @shortOptions[option.shortOpt.slice(1)] = option  if option.shortOpt
        @longOptions[option.longOpt.slice(2)]   = option  if option.longOpt

        if gotFunction()
          option.func = specs.shift()

        @usage.add 'options', option.toUsageString()

      else if !gotArray() and spec.match(ARGUMENT)
        @arguments.push (option = Option.parse(spec.trim()))

        if gotFunction()
          option.func = specs.shift()

        @usage.add 'arguments', option.toUsageString()

      else if $ = spec.match COMMAND
        [_, name, desc] = $
        desc = (desc || '').trim()

        func = if gotFunction() then specs.shift() else null

        if gotArray()
          subspecs = specs.shift()
        else if (subspecs = options.loadCommandSyntax?(@parentContexts.concat([name]).join(' ')))
          # cool
        else
          throw new Error("Array must follow a command spec: #{JSON.stringify(spec)}")
        subsyntax = new Syntax(@handlers, [], this, name)
        subsyntax.add(subspecs, options)

        command = new Command(name, desc, subsyntax)
        command.func = func
        @commands[name] = command
        @commandsOrder.push name

        @usage.add 'commands', command.toUsageString()

      else if spec.trim() is ''
        @usage.endSection()

      else if spec.match TEXT
        @usage.add 'text', "\n" + wrapText(spec.trim())

      else
        throw new Error("String spec invalid: #{JSON.stringify(spec)}")

    return this


  filteredUsages: ->
    [@usage.filtered()].concat(@parent?.filteredUsages() || [])

  toUsageString: ->
    Usage.toUsageString([@usage].concat(@parent?.filteredUsages() || []))


  parse: (argv, options) ->
    argv = argv.slice(0)

    result     = {}
    positional = []
    funcs      = []
    commands   = []
    syntax     = this

    executeHook = (option, value) =>
      if option.func
        if option.tags.delayfunc
          funcs.push [option.func, option, value]
        else
          newValue = option.func(value, result, syntax, option)
          if newValue?
            value = newValue
      return value

    processOption = (result, arg, option, value) =>
      switch option.metavars.length
        when 0
          value = true
        when 1
          value ?= argv.shift()
          if typeof value is 'undefined'
            throw createError("Option #{arg} requires an argument: #{option.leftUsageComponent()}")
        else
          value = []
          for metavar, index in option.metavars
            value.push (subvalue = argv.shift())
            if typeof subvalue is 'undefined'
              throw createError("Option #{arg} requires #{option.metavars.length} arguments: #{option.leftUsageComponent()}")
      return option.coerce(value, result, syntax)

    assignValue = (result, option, value) =>
      if option.tags.list
        if not result.hasOwnProperty(option.var)
          result[option.var] = []
        if value?
          result[option.var].push(value)
      else
        result[option.var] = value

    while arg = argv.shift()
      if arg is '--'
        while arg = argv.shift()
          positional.push arg
      else if arg is '-'
        positional.push arg
      else if arg.match(/^--no-/) && (option = syntax.lookupLongOption(arg.slice(5), result)) && option.tags.flag
        assignValue result, option, false
      else if $ = arg.match(///^  --  ([^=]+)  (?: = (.*) )?  $///)
        [_, name, value] = $
        if option = syntax.lookupLongOption(name, result)
          value = processOption(result, arg, option, value)
          value = executeHook(option, value)
          assignValue result, option, value
        else
          throw createError("Unknown long option: #{arg}")
      else if arg.match /^-/
        remainder = arg.slice(1)
        while remainder
          subarg    = remainder[0]
          remainder = remainder.slice(1)

          if option = syntax.lookupShortOption(subarg, result)
            if remainder && option.metavars.length > 0
              value = remainder
              remainder = ''
            else
              value = undefined
            value = processOption(result, arg, option, value)
            value = executeHook(option, value)
            assignValue result, option, value
          else
            if arg == "-#{subarg}"
              throw createError("Unknown short option #{arg}")
            else
              throw createError("Unknown short option -#{subarg} in #{arg}")

      else if (positional.length is 0) and (command = syntax.lookupCommand(arg, result))
        commands.push command

        if key = options.commandKeys[syntax.nestingLevel]
          result[key] = arg
        if key = options.compoundCommandKey
          result[key] = (c.name for c in commands).join(' ')

        syntax = command.syntax

      else
        positional.push arg


    # required command

    if syntax.commandsOrder.length > 0
      if positional.length is 0
        throw createError("No #{SUBSUBSUB[syntax.nestingLevel]} specified")
      else
        throw createError("Unknown #{SUBSUBSUB[syntax.nestingLevel]} '#{positional[0]}'")


    # required, default and other special options

    for option in syntax.allOptions()
      if !result.hasOwnProperty(option.var)
        if option.tags.required
          throw createError("Missing required option: #{option.leftUsageComponent()}")
        if option.defaultValue? or option.tags.fancydefault or option.tags.list
          if option.defaultValue?
            value = option.coerce(option.defaultValue, result, syntax)
          else
            value = null
          value = executeHook(option, value)
          assignValue result, option, value


    # positional args

    allArguments = syntax.allArguments()

    for arg, index in positional
      if option = allArguments[index]
        value = option.coerce(arg, result, syntax)
        value = executeHook(option, value)
        positional[index] = value
        if option.var
          assignValue result, option, value

    for option, index in allArguments
      if index >= positional.length
        if option.tags.required
          throw createError("Missing required argument \##{index + 1}: #{option.leftUsageComponent()}")
        if option.defaultValue? or option.tags.fancydefault
          if option.defaultValue?
            value = option.coerce(option.defaultValue, result, syntax)
          else
            value = null
          value = executeHook(option, value)

          if option.var
            assignValue result, option, value

          if index == positional.length
            positional.push value
          else if !option.var && !option.func
            throw new Error("Cannot apply default value to argument \##{index + 1} (#{option.leftUsageComponent()}) because no #var is specified, no func is provided and previous arguments don't have default values")

    result.argv = positional


    for [func, option, value] in funcs
      func(value, result, syntax, option)


    # run command functions
    for command in commands
      command.func?(result)

    return result


  lookupLongOption: (name, result) ->
    unless @longOptions.hasOwnProperty(name)
      if @parent and (option = @parent.lookupLongOption(name, result))
        return option
      @handlers.resolveLongOption?(name, result, this)

    if @longOptions.hasOwnProperty(name)
      @longOptions[name]
    else
      null

  lookupShortOption: (name, result) ->
    unless @shortOptions.hasOwnProperty(name)
      if @parent and (option = @parent.lookupShortOption(name, result))
        return option
      @handlers.resolveShortOption?(name, result, this)

    if @shortOptions.hasOwnProperty(name)
      @shortOptions[name]
    else
      null

  lookupCommand: (name, result) ->
    unless @commands.hasOwnProperty(name)
      if @parent and (command = @parent.lookupCommand(name, result))
        return command
      @handlers.resolveCommand?(name, result, this)

    if @commands.hasOwnProperty(name)
      @commands[name]
    else
      null

  allOptions: ->
    (@parent?.allOptions() || []).concat(@options)

  allArguments: ->
    (@parent?.allArguments() || []).concat(@arguments)

  allCommands: ->
    @commandsOrder


Option.parse = (spec) ->
  isOption = (' ' + spec).match(OPTION)

  [_, options, desc]     = spec.match(OPTION_DESC)     || [undefined, spec, ""]
  if isOption
    [_, options, metavars] = options.match(OPTION_METAVARS) || [undefined, options, ""]
    [_, shortOpt, options] = options.match(OPTION_SHORT) || [undefined, "", options]
    [_, longOpt, options]  = (options || '').match(OPTION_LONG)  || [undefined, "", options]
  else
    [metavars, options] = [options, ""]
  metavars = metavars && metavars.trim() && metavars.trim().split(/\s+/) || []

  tags = (([_, desc, tag, value] = $; [tag, value ? true]) while $ = desc.match(OPTION_DESC_TAG))
  tags.reverse()

  if longOpt && longOpt.match(OPTION_BOOL)
    tags.push ['acceptsno', true]
    longOpt = longOpt.replace('--[no-]', '--')

  if isOption && metavars.length == 0
    tags.push ['flag', true]

  if $ = desc.match(OPTION_DESC_DEFAULT)
    defaultValue = $[1]
    if defaultValue.match(/\s/)
      # the default is too fancy, don't use it verbatim, but call the user callback if any to obtain the default
      defaultValue = undefined
      tags.push ['fancydefault', true]


  if options
    throw new Error("Invalid option spec format (cannot parse #{JSON.stringify(options)}): #{JSON.stringify(spec)}")
  if isOption && !(shortOpt || longOpt)
    throw new Error("Invalid option spec format !(shortOpt || longOpt): #{JSON.stringify(spec)}")

  new Option(shortOpt || null, longOpt || null, desc.trim(), tags, metavars, defaultValue)


parse = (specs, options={}) ->
  options.handlers ?= {}
  options.argv     ?= process.argv.slice(2)

  options.error    ?= (e) ->
    process.stderr.write "#{e.message.trim()}. Run with --help for help.\n"
    process.exit 10

  options.help     ?= (text) ->
    process.stdout.write text.trim() + "\n"
    process.exit 0

  options.commandKeys ?= ['command', 'subcommand', 'subsubcommand', 'subsubsubcommand']
  options.compoundCommandKey = null

  syntax = new Syntax(options.handlers)
  syntax.add(specs, options)

  unless syntax.longOptions.help
    syntax.add ["  -h, --help  Display this usage information", (v, o, syntax) ->
      options.help(syntax.toUsageString())]

  try
    syntax.parse(options.argv, options)
  catch e
    if e.isCommandLineError
      options.error(e)
    else
      throw e


module.exports = parse

# for testing
module.exports.parseOptionSpec = Option.parse
module.exports.Syntax = Syntax
