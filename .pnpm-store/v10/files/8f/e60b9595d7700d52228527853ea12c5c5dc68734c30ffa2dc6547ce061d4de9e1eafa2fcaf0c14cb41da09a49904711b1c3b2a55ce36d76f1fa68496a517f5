assert = require 'assert'

parseOptionSpec = require('../lib/dreamopt').parseOptionSpec


o = (spec, result) ->
  describe "when given '#{spec}'", ->
    option = null
    before ->
      option = parseOptionSpec(spec, [])

    for key, value of result
      do (key, value) ->
        it "#{key} should be #{JSON.stringify(value)}", ->
          assert.deepEqual option[key], value, "#{key} must be #{JSON.stringify(value)}, got #{JSON.stringify(option[key])}"


describe 'dreamopt.parseOptionSpec', ->

  describe "basic usage", ->
    o "-c", shortOpt: '-c', longOpt: null, desc: "", tags: { flag: yes }, metavars: []
    o "--code", shortOpt: null, longOpt: '--code', desc: "", tags: { flag: yes }, metavars: []
    o "-c, --code", shortOpt: '-c', longOpt: '--code', desc: "", tags: { flag: yes }, metavars: []

  describe "uppercase metavar", ->
    o "-c FILE", shortOpt: '-c', longOpt: null, desc: "", tags: {}, metavars: ['FILE']
    o "--code FILE", shortOpt: null, longOpt: '--code', desc: "", tags: {}, metavars: ['FILE']
    o "-c, --code FILE", shortOpt: '-c', longOpt: '--code', desc: "", tags: {}, metavars: ['FILE']

  describe "angular-bracketed metavar", ->
    o "-c <file>", shortOpt: '-c', longOpt: null, desc: "", tags: {}, metavars: ['file']
    o "--code <file>", shortOpt: null, longOpt: '--code', desc: "", tags: {}, metavars: ['file']
    o "-c, --code <file>", shortOpt: '-c', longOpt: '--code', desc: "", tags: {}, metavars: ['file']

  describe "two metavars", ->
    o "-c SRC DST", shortOpt: '-c', longOpt: null, desc: "", tags: {}, metavars: ['SRC','DST']
    o "--code SRC DST", shortOpt: null, longOpt: '--code', desc: "", tags: {}, metavars: ['SRC','DST']
    o "--code SRC <dst>", shortOpt: null, longOpt: '--code', desc: "", tags: {}, metavars: ['SRC','dst']
    o "--code <src> <dst>", shortOpt: null, longOpt: '--code', desc: "", tags: {}, metavars: ['src','dst']
    o "-c, --code SRC DST", shortOpt: '-c', longOpt: '--code', desc: "", tags: {}, metavars: ['SRC','DST']

  describe "description", ->
    o "-c  Produce some codez", shortOpt: '-c', longOpt: null, desc: "Produce some codez", tags: { flag: yes }, metavars: []
    o "--code  Produce some codez", shortOpt: null, longOpt: '--code', desc: "Produce some codez", tags: { flag: yes }, metavars: []
    o "-c, --code  Produce some codez", shortOpt: '-c', longOpt: '--code', desc: "Produce some codez", tags: { flag: yes }, metavars: []

  describe "tag", ->
    o "-c, --code  Produce some codez #required", shortOpt: '-c', longOpt: '--code', desc: "Produce some codez", tags: {  flag: yes, required: yes }, metavars: []

  describe "multiple tags", ->
    o "-c, --code  Produce some codez #required #date #foo", shortOpt: '-c', longOpt: '--code', desc: "Produce some codez", tags: { required: yes, date: yes, foo: yes, flag: yes }, metavars: []

  describe "tag without description", ->
    o "-c  #required", shortOpt: '-c', longOpt: null, desc: "", tags: { flag: yes, required: yes }, metavars: []
    o "--code  #required", shortOpt: null, longOpt: '--code', desc: "", tags: { flag: yes, required: yes }, metavars: []
    o "-c, --code  #required", shortOpt: '-c', longOpt: '--code', desc: "", tags: { flag: yes, required: yes }, metavars: []

  describe "tag with value", ->
    o "-c, --code  Produce some codez #foo(bar)", desc: "Produce some codez", tags: { flag: yes, foo: 'bar' }, metavars: []

  describe "default value inside description", ->
    o "--widgets COUNT  Produce some codez (default is 10)", desc: "Produce some codez (default is 10)", defaultValue: "10", tags: {}

  describe "default value inside description, but too fancy", ->
    o "--widgets COUNT  Produce some codez (default is 5 multiplied by 2)", desc: "Produce some codez (default is 5 multiplied by 2)", defaultValue: undefined, tags: { fancydefault: yes }

  describe "default value as a tag", ->
    o "--widgets COUNT  Produce some codez #default(10)", desc: "Produce some codez", defaultValue: "10", tags: { default: '10' }

  describe "positional argument", ->
    o "SRCFILE  Source file", shortOpt: null, longOpt: null, desc: "Source file", tags: {}, metavars: ['SRCFILE']
    o "<srcfile>  Source file", shortOpt: null, longOpt: null, desc: "Source file", tags: {}, metavars: ['srcfile']

  describe "flag option", ->
    o "--[no-]code", shortOpt: null, longOpt: '--code', desc: "", tags: { flag: yes, acceptsno: yes }, metavars: []
    o "-c, --[no-]code", shortOpt: '-c', longOpt: '--code', desc: "", tags: { flag: yes, acceptsno: yes }, metavars: []
