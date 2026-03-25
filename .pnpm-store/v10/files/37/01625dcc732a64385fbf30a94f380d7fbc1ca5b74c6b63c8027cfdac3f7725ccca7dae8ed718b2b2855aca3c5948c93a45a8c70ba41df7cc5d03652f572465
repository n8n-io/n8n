{SequenceMatcher} = require '..'

suite 'SequenceMatcher'

test '#setSeqs', ->
  s = new SequenceMatcher()
  s.setSeqs('abcd', 'bcde')
  s.ratio().should.eql 0.75

test '#setSeq1', ->
  s = new SequenceMatcher(null, 'abcd', 'bcde')
  s.ratio().should.eql 0.75
  s.setSeq1('bcde')
  s.ratio().should.eql 1.0

test '#setSeq2', ->
  s = new SequenceMatcher(null, 'abcd', 'bcde')
  s.ratio().should.eql 0.75
  s.setSeq2('abcd')
  s.ratio().should.eql 1.0

test '#stringsAndIntsAreDifferent', ->
  opcodes = new SequenceMatcher(null, ['1','b','c','d'], [1, 'b','c','d']).getOpcodes()
  opcodes.should.eql [ [ 'replace', 0, 1, 0, 1 ], [ 'equal', 1, 4, 1, 4 ] ]

test '#findLongestMatch', ->
  isjunk = (x) -> x is ' '
  s = new SequenceMatcher(isjunk, ' abcd', 'abcd abcd')
  m = s.findLongestMatch(0, 5, 0, 9)
  m.should.eql [1, 0, 4]

  s = new SequenceMatcher(null, 'ab', 'c')
  m = s.findLongestMatch(0, 2, 0, 1)
  m.should.eql [0, 0, 0]

test '#getMatchingBlocks', ->
  s = new SequenceMatcher(null, 'abxcd', 'abcd')
  ms = s.getMatchingBlocks()
  ms.should.eql [[0, 0, 2], [3, 2, 2], [5, 4, 0]]

  isjunk = (x) -> x is ' '
  s = new SequenceMatcher(isjunk,
                          'private Thread currentThread;',
                          'private volatile Thread currentThread;')
  s.getMatchingBlocks().should.eql [ [0, 0, 8], [8, 17, 21], [29, 38, 0] ]

test '#getOpcodes', ->
  s = new SequenceMatcher(null, 'qabxcd', 'abycdf')
  s.getOpcodes().should.eql [
     [ 'delete'  , 0 , 1 , 0 , 0 ] ,
     [ 'equal'   , 1 , 3 , 0 , 2 ] ,
     [ 'replace' , 3 , 4 , 2 , 3 ] ,
     [ 'equal'   , 4 , 6 , 3 , 5 ] ,
     [ 'insert'  , 6 , 6 , 5 , 6 ]
  ]

  isjunk = (x) -> x is ' '
  s = new SequenceMatcher(isjunk,
                          'private Thread currentThread;',
                          'private volatile Thread currentThread;')

  s.getOpcodes().should.eql [
    ['equal', 0, 8, 0, 8],
    ['insert', 8, 8, 8, 17],
    ['equal', 8, 29, 17, 38]
  ]

test '#getGroupedOpcodes', ->
  a = [1...40].map(String)
  b = a.slice()
  b[8...8] = 'i'
  b[20] += 'x'
  b[23...28] = []
  b[30] += 'y'
  s = new SequenceMatcher(null, a, b)
  s.getGroupedOpcodes().should.eql [
    [
      [ 'equal'  , 5 , 8  , 5 , 8 ],
      [ 'insert' , 8 , 8  , 8 , 9 ],
      [ 'equal'  , 8 , 11 , 9 , 12 ]
    ],
    [
      [ 'equal'   , 16 , 19 , 17 , 20 ],
      [ 'replace' , 19 , 20 , 20 , 21 ],
      [ 'equal'   , 20 , 22 , 21 , 23 ],
      [ 'delete'  , 22 , 27 , 23 , 23 ],
      [ 'equal'   , 27 , 30 , 23 , 26 ]
    ],
    [
      [ 'equal'   , 31 , 34 , 27 , 30 ],
      [ 'replace' , 34 , 35 , 30 , 31 ],
      [ 'equal'   , 35 , 38 , 31 , 34 ]
    ]
  ]

test '#ratio', ->
  s = new SequenceMatcher(null, 'abcd', 'bcde')
  s.ratio().should.equal 0.75

  isjunk = (x) -> x is ' '
  s = new SequenceMatcher(isjunk,
                          'private Thread currentThread;',
                          'private volatile Thread currentThread;')
  s.ratio().toPrecision(3).should.eql '0.866'

test '#quickRatio', ->
  s = new SequenceMatcher(null, 'abcd', 'bcde')
  s.quickRatio().should.equal 0.75

test '#realQuickRatio', ->
  s = new SequenceMatcher(null, 'abcd', 'bcde')
  s.realQuickRatio().should.equal 1.0
