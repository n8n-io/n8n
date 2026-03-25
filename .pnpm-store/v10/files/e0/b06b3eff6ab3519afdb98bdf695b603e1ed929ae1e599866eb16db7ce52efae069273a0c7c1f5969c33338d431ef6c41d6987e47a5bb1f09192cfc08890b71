{Differ} = require '..'

suite 'Differ'

test '#_qformat', ->
  d = new Differ
  results = d._qformat('\tabcDefghiJkl\n', '\tabcdefGhijkl\n',
                       '  ^ ^  ^      ',   '  ^ ^  ^      ')
  results.should.eql [
    '- \tabcDefghiJkl\n',
    '? \t ^ ^  ^\n',
    '+ \tabcdefGhijkl\n',
    '? \t ^ ^  ^\n'
  ]

test '#_fancyReplace', ->
  d = new Differ
  d._fancyReplace(['abcDefghiJkl\n'], 0, 1,
                  ['abcdefGhijkl\n'], 0, 1).should.eql [
    '- abcDefghiJkl\n',
    '?    ^  ^  ^\n',
    '+ abcdefGhijkl\n',
    '?    ^  ^  ^\n'
  ]

test '#compare', ->
  d = new Differ
  d.compare(['one\n', 'two\n', 'three\n'],
            ['ore\n', 'tree\n', 'emu\n']).should.eql [
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

  text1 = [
    '1. Beautiful is better than ugly.\n',
    '2. Explicit is better than implicit.\n',
    '3. Simple is better than complex.\n',
    '4. Complex is better than complicated.\n'
  ]
  text2 = [
    '1. Beautiful is better than ugly.\n',
    '3.   Simple is better than complex.\n',
    '4. Complicated is better than complex.\n',
    '5. Flat is better than nested.\n'
  ]
  d = new Differ()
  d.compare(text1, text2).should.eql [
    '  1. Beautiful is better than ugly.\n',
    '- 2. Explicit is better than implicit.\n',
    '- 3. Simple is better than complex.\n',
    '+ 3.   Simple is better than complex.\n',
    '?   ++\n',
    '- 4. Complex is better than complicated.\n',
    '?          ^                     ---- ^\n',
    '+ 4. Complicated is better than complex.\n',
    '?         ++++ ^                      ^\n',
    '+ 5. Flat is better than nested.\n'
  ]
