var parseExpr = require('../lib/Parser').parseExpr,
    parseEnvelopeAddresses = require('../lib/Parser').parseEnvelopeAddresses;

var assert = require('assert'),
    inspect = require('util').inspect;

[
  { source: '("Terry Gray" NIL "gray" "cac.washington.edu")',
    expected: [ { name: 'Terry Gray',
                  mailbox: 'gray',
                  host: 'cac.washington.edu'
                }
              ],
    what: 'RFC3501 example #1'
  },
  { source: '(NIL NIL "imap" "cac.washington.edu")',
    expected: [ { name: null,
                  mailbox: 'imap',
                  host: 'cac.washington.edu'
                }
              ],
    what: 'RFC3501 example #2'
  },
  { source: '("=?utf-8?Q?=C2=A9=C2=AEAZ=C2=A5?=" NIL "crazy" "example.org")',
    expected: [ { name: '©®AZ¥',
                  mailbox: 'crazy',
                  host: 'example.org'
                }
              ],
    what: 'Name with encoded word(s)'
  },
  { source: '(NIL NIL "imap" NIL)'
            + '(NIL NIL NIL NIL)',
    expected: [ { group: 'imap',
                  addresses: []
                }
              ],
    what: 'Zero-length group'
  },
  { source: '(NIL NIL "imap" NIL)'
            + '("Terry Gray" NIL "gray" "cac.washington.edu")'
            + '(NIL NIL NIL NIL)',
    expected: [ { group: 'imap',
                  addresses: [
                    { name: 'Terry Gray',
                      mailbox: 'gray',
                      host: 'cac.washington.edu'
                    }
                  ]
                }
              ],
    what: 'One-length group'
  },
  { source: '(NIL NIL "imap" NIL)'
            + '("Terry Gray" NIL "gray" "cac.washington.edu")'
            + '(NIL NIL NIL NIL)'
            + '(NIL NIL "imap" "cac.washington.edu")',
    expected: [ { group: 'imap',
                  addresses: [
                    { name: 'Terry Gray',
                      mailbox: 'gray',
                      host: 'cac.washington.edu'
                    }
                  ]
                },
                { name: null,
                  mailbox: 'imap',
                  host: 'cac.washington.edu'
                }
              ],
    what: 'One-length group and address'
  },
  { source: '(NIL NIL "imap" NIL)'
            + '("Terry Gray" NIL "gray" "cac.washington.edu")',
    expected: [ { group: 'imap',
                  addresses: [
                    { name: 'Terry Gray',
                      mailbox: 'gray',
                      host: 'cac.washington.edu'
                    }
                  ]
                }
              ],
    what: 'Implicit group end'
  },
  { source: '("Terry Gray" NIL "gray" "cac.washington.edu")'
            + '(NIL NIL NIL NIL)',
    expected: [ { name: 'Terry Gray',
                  mailbox: 'gray',
                  host: 'cac.washington.edu'
                }
              ],
    what: 'Group end without start'
  },
].forEach(function(v) {
  var result;

  try {
    result = parseEnvelopeAddresses(parseExpr(v.source));
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