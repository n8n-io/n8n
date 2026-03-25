var parseBodyStructure = require('../lib/Parser').parseBodyStructure;

var assert = require('assert'),
    inspect = require('util').inspect;

[
  { source: '("TEXT" "PLAIN" ("CHARSET" "US-ASCII") NIL NIL "7BIT" 1152 23)'
            + '("TEXT" "PLAIN" ("CHARSET" "US-ASCII" "NAME" "cc.diff")'
            + ' "<960723163407.20117h@cac.washington.edu>" "Compiler diff"'
            + ' "BASE64" 4554 73)'
            + '"MIXED"',
    expected: [ { type: 'mixed' },
                [ { partID: '1',
                    type: 'text',
                    subtype: 'plain',
                    params: { charset: 'US-ASCII' },
                    id: null,
                    description: null,
                    encoding: '7BIT',
                    size: 1152,
                    lines: 23
                  }
                ],
                [ { partID: '2',
                    type: 'text',
                    subtype: 'plain',
                    params: { charset: 'US-ASCII', name: 'cc.diff' },
                    id: '<960723163407.20117h@cac.washington.edu>',
                    description: 'Compiler diff',
                    encoding: 'BASE64',
                    size: 4554,
                    lines: 73
                  }
                ]
              ],
    what: 'RFC3501 example #1'
  },
  { source: 'NIL NIL ("CHARSET" "GB2312") NIL NIL NIL 176 NIL NIL NIL',
    expected: [ { type: null,
                  params: null,
                  disposition: null,
                  language: [ 'CHARSET', 'GB2312' ],
                  location: null,
                  extensions: null
                }
              ],
    what: 'Issue 477'
  },
  { source: '"TEXT" "PLAIN" ("CHARSET" "US-ASCII") NIL NIL "7BIT" 3028 92',
    expected: [ { partID: '1',
                  type: 'text',
                  subtype: 'plain',
                  params: { charset: 'US-ASCII' },
                  id: null,
                  description: null,
                  encoding: '7BIT',
                  size: 3028,
                  lines: 92
                }
              ],
    what: 'RFC3501 example #2'
  },
].forEach(function(v) {
  var result;
  try {
    result = parseBodyStructure(v.source);
  } catch (e) {
    console.log(makeMsg(v.what, 'JS Exception: ' + e.stack));
    return;
  }
  assert.deepEqual(result,
                   v.expected,
                   makeMsg(v.what,
                           'Result mismatch:'
                           + '\nParsed: ' + inspect(result, false, 10)
                           + '\nExpected: ' + inspect(v.expected, false, 10)
                   )
                  );
});

function makeMsg(what, msg) {
  return '[' + what + ']: ' + msg;
}