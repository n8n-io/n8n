var Parser = require('../lib/Parser').Parser;

var assert = require('assert'),
    crypto = require('crypto'),
    inspect = require('util').inspect;

var CR = '\r', LF = '\n', CRLF = CR + LF;

[
  { source: ['A1 OK LOGIN completed', CRLF],
    expected: [ { type: 'ok',
                  tagnum: 1,
                  textCode: undefined,
                  text: 'LOGIN completed'
                }
              ],
    what: 'Tagged OK'
  },
  { source: ['IDLE OK IDLE terminated', CRLF],
    expected: [ 'IDLE OK IDLE terminated' ],
    what: 'Unknown line'
  },
  { source: ['IDLE OK Idle completed (0.002 + 1.783 + 1.783 secs).', CRLF],
    expected: [ 'IDLE OK Idle completed (0.002 + 1.783 + 1.783 secs).' ],
    what: 'Unknown line with + char'
  },
  { source: ['+ idling', CRLF],
    expected: [ { textCode: undefined,
                  text: 'idling'
                }
              ],
    what: 'Continuation'
  },
  { source: ['+ [ALERT] idling', CRLF],
    expected: [ { textCode: 'ALERT',
                  text: 'idling'
                }
              ],
    what: 'Continuation with text code'
  },
  { source: ['+', CRLF],
    expected: [ { textCode: undefined,
                  text: undefined
                }
              ],
    what: 'Continuation (broken -- RFC violation) sent by AOL IMAP'
  },
  { source: ['* NAMESPACE ',
             '(("" "/")) ',
             '(("~" "/")) ',
             '(("#shared/" "/")("#public/" "/")("#ftp/" "/")("#news." "."))',
             CRLF],
    expected: [ { type: 'namespace',
                  num: undefined,
                  textCode: undefined,
                  text: {
                    personal: [
                      { prefix: '',
                        delimiter: '/',
                        extensions: undefined
                      }
                    ],
                    other: [
                      { prefix: '~',
                        delimiter: '/',
                        extensions: undefined
                      }
                    ],
                    shared: [
                      { prefix: '#shared/',
                        delimiter: '/',
                        extensions: undefined
                      },
                      { prefix: '#public/',
                        delimiter: '/',
                        extensions: undefined
                      },
                      { prefix: '#ftp/',
                        delimiter: '/',
                        extensions: undefined
                      },
                      { prefix: '#news.',
                        delimiter: '.',
                        extensions: undefined
                      }
                    ]
                  }
                }
              ],
    what: 'Multiple namespaces'
  },
  { source: ['* NAMESPACE ',
             '(("" "/" "X-PARAM" ("FLAG1" "FLAG2"))) ',
             'NIL ',
             'NIL',
             CRLF],
    expected: [ { type: 'namespace',
                  num: undefined,
                  textCode: undefined,
                  text: {
                    personal: [
                      { prefix: '',
                        delimiter: '/',
                        extensions: {
                          'X-PARAM': [ 'FLAG1', 'FLAG2' ]
                        }
                      }
                    ],
                    other: null,
                    shared: null
                  }
                }
              ],
    what: 'Multiple namespaces'
  },
  { source: ['* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)', CRLF],
    expected: [ { type: 'flags',
                  num: undefined,
                  textCode: undefined,
                  text: [
                    '\\Answered',
                    '\\Flagged',
                    '\\Deleted',
                    '\\Seen',
                    '\\Draft'
                  ]
                }
              ],
    what: 'Flags'
  },
  { source: ['* SEARCH 2 3 6', CRLF],
    expected: [ { type: 'search',
                  num: undefined,
                  textCode: undefined,
                  text: [ 2, 3, 6 ]
                }
              ],
    what: 'Search'
  },
  { source: ['* XLIST (\\Noselect) "/" ~/Mail/foo', CRLF],
    expected: [ { type: 'xlist',
                  num: undefined,
                  textCode: undefined,
                  text: {
                    flags: [ '\\Noselect' ],
                    delimiter: '/',
                    name: '~/Mail/foo'
                  }
                }
              ],
    what: 'XList'
  },
  { source: ['* LIST (\\Noselect) "/" ~/Mail/foo', CRLF],
    expected: [ { type: 'list',
                  num: undefined,
                  textCode: undefined,
                  text: {
                    flags: [ '\\Noselect' ],
                    delimiter: '/',
                    name: '~/Mail/foo'
                  }
                }
              ],
    what: 'List'
  },
  { source: ['* STATUS blurdybloop (MESSAGES 231 UIDNEXT 44292)', CRLF],
    expected: [ { type: 'status',
                  num: undefined,
                  textCode: undefined,
                  text: {
                    name: 'blurdybloop',
                    attrs: { messages: 231, uidnext: 44292 }
                  }
                }
              ],
    what: 'Status'
  },
  { source: ['* OK [UNSEEN 17] Message 17 is the first unseen message', CRLF],
    expected: [ { type: 'ok',
                  num: undefined,
                  textCode: {
                    key: 'UNSEEN',
                    val: 17
                  },
                  text: 'Message 17 is the first unseen message'
                }
              ],
    what: 'Untagged OK (with text code, with text)'
  },
  { source: ['* OK [PERMANENTFLAGS (\\Deleted \\Seen \\*)] Limited', CRLF],
    expected: [ { type: 'ok',
                  num: undefined,
                  textCode: {
                    key: 'PERMANENTFLAGS',
                    val: [ '\\Deleted', '\\Seen', '\\*' ]
                  },
                  text: 'Limited'
                }
              ],
    what: 'Untagged OK (with text code, with text)'
  },
  { source: ['* OK [UNSEEN 17]', CRLF],
    expected: [ { type: 'ok',
                  num: undefined,
                  textCode: {
                    key: 'UNSEEN',
                    val: 17
                  },
                  text: undefined
                }
              ],
    what: 'Untagged OK (no text code, with text) (RFC violation)'
  },
  { source: ['* OK IMAP4rev1 Service Ready', CRLF],
    expected: [ { type: 'ok',
                  num: undefined,
                  textCode: undefined,
                  text: 'IMAP4rev1 Service Ready'
                }
              ],
    what: 'Untagged OK (no text code, with text)'
  },
  { source: ['* OK', CRLF], // I have seen servers that send stuff like this ..
    expected: [ { type: 'ok',
                  num: undefined,
                  textCode: undefined,
                  text: undefined
                }
              ],
    what: 'Untagged OK (no text code, no text) (RFC violation)'
  },
  { source: ['* 18 EXISTS', CRLF],
    expected: [ { type: 'exists',
                  num: 18,
                  textCode: undefined,
                  text: undefined
                }
              ],
    what: 'Untagged EXISTS'
  },
  { source: ['* 2 RECENT', CRLF],
    expected: [ { type: 'recent',
                  num: 2,
                  textCode: undefined,
                  text: undefined
                }
              ],
    what: 'Untagged RECENT'
  },
  { source: ['* 12 FETCH (BODY[HEADER] {342}', CRLF,
             'Date: Wed, 17 Jul 1996 02:23:25 -0700 (PDT)', CRLF,
             'From: Terry Gray <gray@cac.washington.edu>', CRLF,
             'Subject: IMAP4rev1 WG mtg summary and minutes', CRLF,
             'To: imap@cac.washington.edu', CRLF,
             'cc: minutes@CNRI.Reston.VA.US, John Klensin <KLENSIN@MIT.EDU>', CRLF,
             'Message-Id: <B27397-0100000@cac.washington.edu>', CRLF,
             'MIME-Version: 1.0', CRLF,
             'Content-Type: TEXT/PLAIN; CHARSET=US-ASCII', CRLF, CRLF,
             ')', CRLF],
    expected: [ { seqno: 12,
                  which: 'HEADER',
                  size: 342
                },
                { type: 'fetch',
                  num: 12,
                  textCode: undefined,
                  text: {}
                }
              ],
    bodySHA1s: ['1f96faf50f6410f99237791f9e3b89454bf93fa7'],
    what: 'Untagged FETCH (body)'
  },
  { source: ['* 12 FETCH (BODY[TEXT] "IMAP is terrible")', CRLF],
    expected: [ { seqno: 12,
                  which: 'TEXT',
                  size: 16
                },
                { type: 'fetch',
                  num: 12,
                  textCode: undefined,
                  text: {}
                }
              ],
    bodySHA1s: ['bac8a1528c133787a6969a10a1ff453ebb9adfc8'],
    what: 'Untagged FETCH (quoted body)'
  },
  { source: ['* 12 FETCH (BODY[TEXT] "\\"IMAP\\" is terrible :\\\\")', CRLF],
    expected: [ { seqno: 12,
                  which: 'TEXT',
                  size: 21
                },
                { type: 'fetch',
                  num: 12,
                  textCode: undefined,
                  text: {}
                }
              ],
    bodySHA1s: ['7570c08150050a404603f63f60b65b42378d7d42'],
    what: 'Untagged FETCH (quoted body with escaped chars)'
  },
  { source: ['* 12 FETCH (INTERNALDATE {26}', CRLF,
             '17-Jul-1996 02:44:25 -0700)' + CRLF],
    expected: [ { type: 'fetch',
                  num: 12,
                  textCode: undefined,
                  text: {
                    internaldate: new Date('17-Jul-1996 02:44:25 -0700')
                  }
                }
              ],
    what: 'Untagged FETCH with non-body literal'
  },
  { source: ['* 12 FETCH (INTERNALDATE {2',
             '6}' + CRLF + '17-Jul-1996 02:44:25 -0700)' + CRLF],
    expected: [ { type: 'fetch',
                  num: 12,
                  textCode: undefined,
                  text: {
                    internaldate: new Date('17-Jul-1996 02:44:25 -0700')
                  }
                }
              ],
    what: 'Untagged FETCH with non-body literal (length split)'
  },
  { source: ['* 12 FETCH (INTERNALDATE {26}', CRLF,
             '17-Jul-1996 02:44:25 -0700)' + CR,
             LF],
    expected: [ { type: 'fetch',
                  num: 12,
                  textCode: undefined,
                  text: {
                    internaldate: new Date('17-Jul-1996 02:44:25 -0700')
                  }
                }
              ],
    what: 'Untagged FETCH with non-body literal (split CRLF)'
  },
  { source: ['* 12 FETCH (FLAGS (\\Seen)',
             ' INTERNALDATE "17-Jul-1996 02:44:25 -0700"',
             ' RFC822.SIZE 4286',
             ' ENVELOPE ("Wed, 17 Jul 1996 02:23:25 -0700 (PDT)"',
             ' "IMAP4rev1 WG mtg summary and minutes"',
             ' (("Terry Gray" NIL "gray" "cac.washington.edu"))',
             ' (("Terry Gray" NIL "gray" "cac.washington.edu"))',
             ' (("Terry Gray" NIL "gray" "cac.washington.edu"))',
             ' ((NIL NIL "imap" "cac.washington.edu"))',
             ' ((NIL NIL "minutes" "CNRI.Reston.VA.US")',
             '("John Klensin" NIL "KLENSIN" "MIT.EDU")) NIL NIL',
             ' "<B27397-0100000@cac.washington.edu>")',
             ' BODY ("TEXT" "PLAIN" ("CHARSET" "US-ASCII") NIL NIL "7BIT" 3028',
             ' 92))',
             CRLF],
    expected: [ { type: 'fetch',
                  num: 12,
                  textCode: undefined,
                  text: {
                    flags: [ '\\Seen' ],
                    internaldate: new Date('17-Jul-1996 02:44:25 -0700'),
                    'rfc822.size': 4286,
                    envelope: {
                      date: new Date('Wed, 17 Jul 1996 02:23:25 -0700 (PDT)'),
                      subject: 'IMAP4rev1 WG mtg summary and minutes',
                      from: [
                        { name: 'Terry Gray',
                          mailbox: 'gray',
                          host: 'cac.washington.edu'
                        }
                      ],
                      sender: [
                        { name: 'Terry Gray',
                          mailbox: 'gray',
                          host: 'cac.washington.edu'
                        }
                      ],
                      replyTo: [
                        { name: 'Terry Gray',
                          mailbox: 'gray',
                          host: 'cac.washington.edu'
                        }
                      ],
                      to: [
                        { name: null,
                          mailbox: 'imap',
                          host: 'cac.washington.edu'
                        }
                      ],
                      cc: [
                        { name: null,
                          mailbox: 'minutes',
                          host: 'CNRI.Reston.VA.US'
                        },
                        { name: 'John Klensin',
                          mailbox: 'KLENSIN',
                          host: 'MIT.EDU'
                        }
                      ],
                      bcc: null,
                      inReplyTo: null,
                      messageId: '<B27397-0100000@cac.washington.edu>'
                    },
                    body: [
                      { partID: '1',
                        type: 'text',
                        subtype: 'plain',
                        params: { charset: 'US-ASCII' },
                        id: null,
                        description: null,
                        encoding: '7BIT',
                        size: 3028,
                        lines: 92
                      }
                    ]
                  }
                }
              ],
    what: 'Untagged FETCH (flags, date, size, envelope, body[structure])'
  },
  // EXTENSIONS ================================================================
  { source: ['* ESEARCH (TAG "A285") UID MIN 7 MAX 3800', CRLF],
    expected: [ { type: 'esearch',
                  num: undefined,
                  textCode: undefined,
                  text: { min: 7, max: 3800 }
                }
              ],
    what: 'ESearch UID, 2 items'
  },
  { source: ['* ESEARCH (TAG "A284") MIN 4', CRLF],
    expected: [ { type: 'esearch',
                  num: undefined,
                  textCode: undefined,
                  text: { min: 4 }
                }
              ],
    what: 'ESearch 1 item'
  },
  { source: ['* ESEARCH (TAG "A283") ALL 2,10:11', CRLF],
    expected: [ { type: 'esearch',
                  num: undefined,
                  textCode: undefined,
                  text: { all: [ '2', '10:11' ] }
                }
              ],
    what: 'ESearch ALL list'
  },
  { source: ['* QUOTA "" (STORAGE 10 512)', CRLF],
    expected: [ { type: 'quota',
                  num: undefined,
                  textCode: undefined,
                  text: {
                    root: '',
                    resources: {
                      storage: { usage: 10, limit: 512 }
                    }
                  }
                }
              ],
    what: 'Quota'
  },
  { source: ['* QUOTAROOT INBOX ""', CRLF],
    expected: [ { type: 'quotaroot',
                  num: undefined,
                  textCode: undefined,
                  text: {
                    roots: [ '' ],
                    mailbox: 'INBOX'
                  }
                }
              ],
    what: 'QuotaRoot'
  },
  { source: ['A1 OK', CRLF], // some servers like ppops.net sends such response
    expected: [ { type: 'ok',
                  tagnum: 1,
                  textCode: undefined,
                  text: ''
                }
              ],
    what: 'Tagged OK (no text code, no text)'
  },
].forEach(function(v) {
  var ss = new require('stream').Readable(), p, result = [];
  ss._read = function(){};

  p = new Parser(ss);
  p.on('tagged', function(info) {
    result.push(info);
  });
  p.on('untagged', function(info) {
    result.push(info);
  });
  p.on('continue', function(info) {
    result.push(info);
  });
  p.on('other', function(line) {
    result.push(line);
  });
  p.on('body', function(stream, info) {
    result.push(info);
    if (Array.isArray(v.bodySHA1s)) {
      var hash = crypto.createHash('sha1');
      stream.on('data', function(d) {
        hash.update(d);
      });
      stream.on('end', function() {
        var calculated = hash.digest('hex'),
            expected = v.bodySHA1s.shift();
        assert.equal(calculated,
                     expected,
                     makeMsg(v.what,
                             'Body SHA1 mismatch:'
                             + '\nCalculated: ' + calculated
                             + '\nExpected: ' + expected
                     )
                    );
      });
    } else
      stream.resume();
  });

  try {
    v.source.forEach(function(chunk) {
      ss.push(chunk);
    });
  } catch (e) {
    console.log(makeMsg(v.what, 'JS Exception: ' + e.stack));
    return;
  }
  setImmediate(function() {
    assert.deepEqual(result,
                     v.expected,
                     makeMsg(v.what,
                             'Result mismatch:'
                             + '\nParsed: ' + inspect(result, false, 10)
                             + '\nExpected: ' + inspect(v.expected, false, 10)
                     )
                    );
  });
});

function makeMsg(what, msg) {
  return '[' + what + ']: ' + msg;
}
