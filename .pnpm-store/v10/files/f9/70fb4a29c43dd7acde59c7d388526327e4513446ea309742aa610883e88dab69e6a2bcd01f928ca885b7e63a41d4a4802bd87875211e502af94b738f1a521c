{
  _arrayCmp,
  getCloseMatches,
  _countLeading,
  IS_LINE_JUNK,
  IS_CHARACTER_JUNK,
  _formatRangeUnified,
  unifiedDiff,
  _formatRangeContext,
  contextDiff,
  ndiff,
  restore
} = require '..'

suite 'global'

test '._arrayCmp', ->
  _arrayCmp([1, 2], [1, 2]).should.eql 0
  _arrayCmp([1, 2, 3], [1, 2, 4]).should.below 0
  _arrayCmp([1], [1, 2]).should.below 0
  _arrayCmp([2, 1], [1, 2]).should.above 0
  _arrayCmp([2, 0, 0], [2, 3]).should.below 0
  _arrayCmp([], [1]).should.below 0
  _arrayCmp([1], []).should.above 0
  _arrayCmp([], []).should.eql 0

test '.getCloseMatches', ->
 getCloseMatches('appel', ['ape', 'apple', 'peach', 'puppy'])
   .should.eql ['apple', 'ape']
 
 # KEYWORDS = require('coffeescript').RESERVED # -- no longer available
 KEYWORDS = ['case', 'default', 'function', 'var', 'void', 'with', 'const', 'let', 'enum', 'export', 'import', 'native', '__hasProp', '__extends', '__slice', '__bind', '__indexOf', 'implements', 'else', 'interface', 'package', 'private', 'protected', 'public', 'static', 'yield', 'true', 'false', 'null', 'this', 'new', 'delete', 'typeof', 'in', 'arguments', 'eval', 'instanceof', 'return', 'throw', 'break', 'continue', 'debugger', 'if', 'else', 'switch', 'for', 'while', 'do', 'try', 'catch', 'finally', 'class', 'extends', 'super', 'undefined', 'then', 'unless', 'until', 'loop', 'of', 'by', 'when', 'and', 'or', 'is', 'isnt', 'not', 'yes', 'no', 'on', 'off']
 getCloseMatches('wheel', KEYWORDS).should.eql ['when', 'while']
 getCloseMatches('accost', KEYWORDS).should.eql ['const']

test '._countLeading', ->
  _countLeading('   abc', ' ').should.eql 3

test '.IS_LINE_JUNK', ->
  IS_LINE_JUNK('\n').should.be.true
  IS_LINE_JUNK('  #   \n').should.be.true
  IS_LINE_JUNK('hello\n').should.be.false

test '.IS_CHARACTER_JUNK', ->
  IS_CHARACTER_JUNK(' ').should.be.true
  IS_CHARACTER_JUNK('\t').should.be.true
  IS_CHARACTER_JUNK('\n').should.be.false
  IS_CHARACTER_JUNK('x').should.be.false

test '._formatRangeUnified', ->
  _formatRangeUnified(1, 2).should.eql '2'
  _formatRangeUnified(1, 3).should.eql '2,2'
  _formatRangeUnified(1, 4).should.eql '2,3'

test '.unifiedDiff', ->
  unifiedDiff('one two three four'.split(' '),
              'zero one tree four'.split(' '), {
                fromfile: 'Original'
                tofile: 'Current',
                fromfiledate: '2005-01-26 23:30:50',
                tofiledate: '2010-04-02 10:20:52',
                lineterm: ''
              }).should.eql [
    '--- Original\t2005-01-26 23:30:50',
    '+++ Current\t2010-04-02 10:20:52',
    '@@ -1,4 +1,4 @@',
    '+zero',
    ' one',
    '-two',
    '-three',
    '+tree',
    ' four'
  ]

test '._formatRangeContext', ->
  _formatRangeContext(1, 2).should.eql '2'
  _formatRangeContext(1, 3).should.eql '2,3'
  _formatRangeContext(1, 4).should.eql '2,4'

test '.contextDiff', ->
  a = ['one\n', 'two\n', 'three\n', 'four\n']
  b = ['zero\n', 'one\n', 'tree\n', 'four\n']
  contextDiff(a, b, {fromfile: 'Original', tofile: 'Current'}).should.eql [
    '*** Original\n',
    '--- Current\n',
    '***************\n',
    '*** 1,4 ****\n',
    '  one\n',
    '! two\n',
    '! three\n',
    '  four\n',
    '--- 1,4 ----\n',
    '+ zero\n',
    '  one\n',
    '! tree\n',
    '  four\n'
  ]

test 'ndiff', ->
  a = ['one\n', 'two\n', 'three\n']
  b = ['ore\n', 'tree\n', 'emu\n']
  ndiff(a, b).should.eql [
    '- one\n',
    '?  ^\n',
    '+ ore\n',
    '?  ^\n',
    '- two\n',
    '- three\n',
    '?  -\n',
    '+ tree\n',
    '+ emu\n'
  ]

test 'restore', ->
  a = ['one\n', 'two\n', 'three\n']
  b = ['ore\n', 'tree\n', 'emu\n']
  diff = ndiff(a, b)
  restore(diff, 1).should.eql [
    'one\n',
    'two\n',
    'three\n'
  ]
  restore(diff, 2).should.eql [
    'ore\n',
    'tree\n',
    'emu\n'
  ]
  (->
    restore(diff, 3)
  ).should.throw()
