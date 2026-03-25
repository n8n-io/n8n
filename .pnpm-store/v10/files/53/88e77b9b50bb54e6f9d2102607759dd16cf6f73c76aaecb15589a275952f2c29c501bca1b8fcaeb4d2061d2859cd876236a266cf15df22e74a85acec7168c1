assert = require 'assert'

dreamopt = require '../lib/dreamopt'


GIT_SYNTAX = [
  "  remote", [
    "Manage set of tracked repositories."
    "  add", [
      "Adds a remote named <name> for the repository at <url>."
      "Usage: git remote add <name> <url>"
      "  <name>  name of remote ref"
      "  <url>  repository url"
    ]
    "  rename", [
      "Rename the remote named <old> to <new>."
      "Usage: git remote rename <old> <new>"
      "  <old>  old remote ref name"
      "  <new>  new remote ref name"
    ]
    "  rm", [
      "Remove the remote named <name>."
      "Usage: git remote rm <name>"
      "  <name>  remote ref name"
    ]
  ]
  "  push", [
    "Update remote refs along with associated objects.",
    "Usage: git push <repository> <refspec>"
    "  <repository>  The 'remote' repository that is destination of a push operation."
    "  <refspec>  Used to specify with what <src> object the <dst> ref is to be updated."
  ],

  "Global options:"
]


o = (syntax, argv, expected) ->
  expected.argv ||= []

  describe "when given #{JSON.stringify(argv)}", ->
    _actual = null
    before ->
      _actual = dreamopt(syntax, argv: argv, error: (e) -> throw e)

    for own k, v of expected
      do (k, v) ->
        it "value of #{k} should be #{JSON.stringify(v)}", ->
          assert.deepEqual _actual[k], v, "#{k} is #{JSON.stringify(_actual[k])}, expected #{JSON.stringify(v)}, actual = #{JSON.stringify(_actual)}"

    it "should not return any other option keys", ->
      keys = {}
      for own k, v of _actual
        keys[k] = true
      for own k, v of expected
        delete keys[k]

      assert.deepEqual keys, [], "Extra keys found in expected: #{Object.keys(keys).join(', ')}, actual = #{JSON.stringify(_actual)}, expected = #{JSON.stringify(expected)}"


oo = (syntax, argv, errorRegexp) ->
  describe "when given #{JSON.stringify(argv)}", ->
    _actual = null
    _err = null
    before ->
      try
        _actual = dreamopt(syntax, argv: argv, error: (e) -> throw e)
      catch e
        _err = e

    it "should throw an error matching #{errorRegexp}", ->
      assert.ok !!_err, "Expected error matching #{errorRegexp}, no error thrown, actual = #{JSON.stringify(_actual)}"
      assert.ok _err.message.match(errorRegexp), "Expected error matching #{errorRegexp}, got error #{_err.message}"


ooo = (syntax, expectedUsage, argv=[]) ->
  doit = ->
    it "should display correct usage info", ->
      _usage = null
      captureUsage = (usage) ->
        _usage = usage
        throw new Error("bail out of captureUsage")

      try
        dreamopt syntax, argv: argv.concat(['--help']), help: captureUsage, error: (e) -> throw e
      catch e
        throw e unless e.message is "bail out of captureUsage"

      assert.equal _usage.trim(), expectedUsage.trim(), "Usage mismatch, actual:\n#{_usage.trim()}\n\nExpected:\n#{expectedUsage.trim()}\n"

  if argv.length > 0
    describe "when given #{argv.concat(['--help']).join(' ')}", doit
  else
    doit()



describe 'dreamopt', ->

  describe "with a syntax as simple as -a/--AAA, -b/--BBB COUNT, -c/--ccc", ->

    syntax = [
        "  -a, --AAA  Simple option"
        "  -b, --BBB COUNT  Option with value"
        "  -c, --[no-]ccc  Flag option"
        "  -d, --ddd <value>  Another option with value"
    ]

    o syntax, [''], {}

    o syntax, ['-a'],            { AAA: true }
    o syntax, ['-b', '10'],      { BBB: 10 }
    o syntax, ['-b10'],          { BBB: 10 }
    o syntax, ['-ac'],           { AAA: true, ccc: true }
    o syntax, ['-ab', '10'],     { AAA: true, BBB: 10 }
    o syntax, ['-ab10'],         { AAA: true, BBB: 10 }

    oo syntax, ['-z'],           /Unknown short option/
    oo syntax, ['-azc'],         /Unknown short option/
    oo syntax, ['-b'],           /requires an argument/
    oo syntax, ['-ab'],          /requires an argument/
    oo syntax, ['-a', '-b'],     /requires an argument/

    o syntax, ['--AAA'],         { AAA: true }
    o syntax, ['--no-AAA'],      { AAA: false }
    o syntax, ['--ccc'],         { ccc: true }
    o syntax, ['--no-ccc'],      { ccc: false }
    o syntax, ['--BBB', '10'],   { BBB: 10 }
    o syntax, ['--BBB=10'],      { BBB: 10 }

    oo syntax, ['--zzz'],        /Unknown long option/
    oo syntax, ['--BBB'],        /requires an argument/


    ooo syntax, """
      Options:
        -a, --AAA             Simple option
        -b, --BBB COUNT       Option with value
        -c, --[no-]ccc        Flag option
        -d, --ddd <value>     Another option with value
        -h, --help            Display this usage information
    """


  describe "with a syntax that has two positional arguments and one option (-v/--verbose)", ->

    syntax = [
        "  -v, --verbose  Be verbose"
        "  <first>  First positional arg"
        "  <second>  Second positional arg"
    ]

    o syntax, [],                      {}
    o syntax, ['-v'],                  { verbose: true }
    o syntax, ['foo'],                 { argv: ['foo'], first: 'foo' }
    o syntax, ['foo', 'bar'],          { argv: ['foo', 'bar'], first: 'foo', second: 'bar' }
    o syntax, ['-v', 'foo'],           { argv: ['foo'], first: 'foo', verbose: true }
    o syntax, ['foo', '-v'],           { argv: ['foo'], first: 'foo', verbose: true }
    o syntax, ['-v', 'foo', 'bar'],    { argv: ['foo', 'bar'], first: 'foo', second: 'bar', verbose: true }


  describe "with a syntax that has two positional arguments, both of which have default values", ->

    syntax = [
        "  FIRST  First positional arg (default: 10)"
        "  SECOND  Second positional arg (default: 20)"
    ]

    o syntax, [],                      { argv: [10, 20], first: 10, second: 20 }
    o syntax, ['foo'],                 { argv: ['foo', 20], first: 'foo', second: 20 }
    o syntax, ['foo', 'bar'],          { argv: ['foo', 'bar'], first: 'foo', second: 'bar' }


  describe "with a syntax that has two positional arguments, one of which is required", ->

    syntax = [
        "  <first>  First positional arg  #required"
        "  <second>  Second positional arg (default: 20)"
    ]

    oo syntax, [],                     /required/
    o syntax, ['foo'],                 { argv: ['foo', 20], first: 'foo', second: 20 }
    o syntax, ['foo', 'bar'],          { argv: ['foo', 'bar'], first: 'foo', second: 'bar' }


  describe "with a syntax that has a required option", ->

    syntax = [
        "  --src FILE  Source file  #required"
        "  <first>  First positional arg"
    ]

    oo syntax, [],                     /required/
    oo syntax, ['foo'],                /required/
    oo syntax, ['--src'],              /requires an argument/
    o syntax, ['--src', 'xxx'],        { src: 'xxx' }
    o syntax, ['--src', 'xxx', 'zzz'], { src: 'xxx', first: 'zzz', argv: ['zzz'] }
    o syntax, ['zzz', '--src', 'xxx'], { src: 'xxx', first: 'zzz', argv: ['zzz'] }


  describe "with a syntax that has a list option", ->

    syntax = [
        "  --src FILE  Source file  #list"
    ]

    o syntax, [],                                 { src: [], argv: [] }
    o syntax, ['--src', 'xxx'],                   { src: ['xxx'], argv: [] }
    o syntax, ['--src', 'xxx', '--src', 'yyy'],   { src: ['xxx', 'yyy'], argv: [] }


  describe "with a syntax that has two subcommands", ->

    barHandler = (result) ->
      result.bbbar = 42

    syntax = [
      "  foo  Do something", []
      "  bar  Do something else", barHandler, []
    ]

    oo syntax, [],                                 /no command specified/i
    o syntax, ['foo'],                             { argv: [], command: 'foo' }
    o syntax, ['bar'],                             { argv: [], command: 'bar', bbbar: 42 }


  describe "with a syntax that has a subcommand with local options", ->

    syntax = [
      "  foo  Do something", []
      "  bar  Do something else", [
        "  --boz  Enable boz"
      ],

      "  -v, --verbose  Verbose"
    ]

    oo syntax, [],                                 /no command specified/i
    o syntax, ['foo'],                             { argv: [], command: 'foo' }
    o syntax, ['-v', 'foo'],                       { argv: [], command: 'foo', verbose: yes }
    o syntax, ['foo', '-v'],                       { argv: [], command: 'foo', verbose: yes }
    oo syntax, ['foo', '--boz'],                   /unknown long option/i
    o syntax, ['bar'],                             { argv: [], command: 'bar' }
    o syntax, ['bar', '--boz'],                    { argv: [], command: 'bar', boz: yes }
    o syntax, ['-v', 'bar', '--boz'],              { argv: [], command: 'bar', boz: yes, verbose: yes }
    o syntax, ['bar', '--boz', '-v'],              { argv: [], command: 'bar', boz: yes, verbose: yes }


  describe "with a git-style syntax", ->
    oo GIT_SYNTAX, [],                                 /no command specified/i
    o GIT_SYNTAX, ['push'],                            { argv: [], command: 'push' }

    ooo GIT_SYNTAX, """
      Commands:
        remote                Manage set of tracked repositories.
        push                  Update remote refs along with associated objects.

      Global options:
        -h, --help            Display this usage information
    """

    ooo GIT_SYNTAX, """
      Update remote refs along with associated objects.

      Usage: git push <repository> <refspec>

      Arguments:
        <repository>          The 'remote' repository that is destination of a push operation.
        <refspec>             Used to specify with what <src> object the <dst> ref is to be updated.

      Global options:
        -h, --help            Display this usage information
    """, ['push']

    ooo GIT_SYNTAX, """
      Manage set of tracked repositories.

      Commands:
        add                   Adds a remote named <name> for the repository at <url>.
        rename                Rename the remote named <old> to <new>.
        rm                    Remove the remote named <name>.

      Global options:
        -h, --help            Display this usage information
    """, ['remote']

    ooo GIT_SYNTAX, """
      Adds a remote named <name> for the repository at <url>.

      Usage: git remote add <name> <url>

      Arguments:
        <name>                name of remote ref
        <url>                 repository url

      Global options:
        -h, --help            Display this usage information
    """, ['remote', 'add']


setTimeout (->), 2000
