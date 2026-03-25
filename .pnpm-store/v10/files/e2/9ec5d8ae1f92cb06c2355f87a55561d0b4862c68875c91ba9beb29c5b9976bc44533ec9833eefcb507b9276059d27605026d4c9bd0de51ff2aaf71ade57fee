var parseExpr = require('../lib/Parser').parseExpr;

var assert = require('assert'),
    inspect = require('util').inspect;

[
  { source: '',
    expected: [],
    what: 'Empty value'
  },
  { source: '""',
    expected: [''],
    what: 'Empty quoted string'
  },
  { source: 'FLAGS NIL RFC822.SIZE 44827',
    expected: ['FLAGS', null, 'RFC822.SIZE', 44827],
    what: 'Simple, two key-value pairs with nil'
  },
  { source: 'FLAGS (\\Seen) RFC822.SIZE 44827',
    expected: ['FLAGS', ['\\Seen'], 'RFC822.SIZE', 44827],
    what: 'Simple, two key-value pairs with list'
  },
  { source: 'RFC822.SIZE 9007199254740993',
    expected: ['RFC822.SIZE', '9007199254740993'],
    what: 'Integer exceeding JavaScript max int size'
  },
  { source: 'FLAGS (\\Seen) INTERNALDATE "17-Jul-1996 02:44:25 -0700"',
    expected: ['FLAGS', ['\\Seen'], 'INTERNALDATE', '17-Jul-1996 02:44:25 -0700'],
    what: 'Quoted string'
  },
  { source: '("Foo")("Bar") ("Baz")',
    expected: [['Foo'], ['Bar'], ['Baz']],
    what: 'Lists with varying spacing'
  },
  { source: '"\\"IMAP\\" is terrible :\\\\"',
    expected: ['"IMAP" is terrible :\\'],
    what: 'Quoted string with escaped chars'
  },
  { source: '"\\\\"IMAP\\" is terrible :\\\\"',
    expected: ['\\"IMAP" is terrible :\\'],
    what: 'Quoted string with escaped chars #2'
  },
  { source: '"Who does not think \\"IMAP\\" is terrible\\\\bad?"',
    expected: ['Who does not think "IMAP" is terrible\\bad?'],
    what: 'Quoted string with escaped chars #3'
  },
  { source: '"Who does not think \\\\"IMAP\\" is terrible\\\\bad?"',
    expected: ['Who does not think \\"IMAP" is terrible\\bad?'],
    what: 'Quoted string with escaped chars #4'
  },
  { source: 'ENVELOPE ("Wed, 30 Mar 2014 02:38:23 +0100" "=?ISO-8859-1?Q?##ALLCAPS##123456## - ?= =?ISO-8859-1?Q?[ALERT][P3][ONE.TWO.FR] ?= =?ISO-8859-1?Q?Some Subject Line \\"D:\\\\\\"?=" (("Test Account (Rltvty L)" NIL "account" "test.com")) (("Test Account (Rltvty L)" NIL "account" "test.com")) ((NIL NIL "account" "test.com")) ((NIL NIL "one.two" "test.fr") (NIL NIL "two.three" "test.fr")) NIL NIL NIL "<message@test.eu>")',
    expected: [
      'ENVELOPE',
      [ 'Wed, 30 Mar 2014 02:38:23 +0100',
        '=?ISO-8859-1?Q?##ALLCAPS##123456## - ?= =?ISO-8859-1?Q?[ALERT][P3][ONE.TWO.FR] ?= =?ISO-8859-1?Q?Some Subject Line "D:\\"?=',
        [ [ 'Test Account (Rltvty L)', null, 'account', 'test.com' ] ],
        [ [ 'Test Account (Rltvty L)', null, 'account', 'test.com' ] ],
        [ [ null, null, 'account', 'test.com' ] ],
        [ [ null, null, 'one.two', 'test.fr' ],
          [ null, null, 'two.three', 'test.fr' ]
        ],
        null,
        null,
        null,
        '<message@test.eu>'
      ]
    ],
    what: 'Triple backslash in quoted string (GH Issue #345)'
  },
].forEach(function(v) {
  var result;

  try {
    result = parseExpr(v.source);
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