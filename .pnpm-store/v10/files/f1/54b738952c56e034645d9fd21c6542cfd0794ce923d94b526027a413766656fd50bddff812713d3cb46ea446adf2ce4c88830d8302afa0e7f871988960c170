// Test for _at least_ GH Issues #345, #379, #392, #411

var assert = require('assert'),
    net = require('net'),
    crypto = require('crypto'),
    Imap = require('../lib/Connection');

var result = [],
    body = [],
    bodyInfo = [];

var CRLF = '\r\n';

// generate data larger than highWaterMark
var bytes = crypto.pseudoRandomBytes(10240).toString('hex');

var RESPONSES = [
  ['* CAPABILITY IMAP4rev1 UNSELECT IDLE NAMESPACE QUOTA CHILDREN',
   'A0 OK Thats all she wrote!',
   ''
  ].join(CRLF),
  ['* CAPABILITY IMAP4rev1 UNSELECT IDLE NAMESPACE QUOTA CHILDREN UIDPLUS MOVE',
   'A1 OK authenticated (Success)',
   ''
  ].join(CRLF),
  ['* NAMESPACE (("" "/")) NIL NIL',
   'A2 OK Success',
   ''
  ].join(CRLF),
  ['* LIST (\\Noselect) "/" "/"',
   'A3 OK Success',
   ''
  ].join(CRLF),
  ['* FLAGS (\\Answered \\Flagged \\Draft \\Deleted \\Seen)',
   '* OK [PERMANENTFLAGS ()] Flags permitted.',
   '* OK [UIDVALIDITY 2] UIDs valid.',
   '* 685 EXISTS',
   '* 0 RECENT',
   '* OK [UIDNEXT 4422] Predicted next UID.',
   'A4 OK [READ-ONLY] INBOX selected. (Success)',
   ''
  ].join(CRLF),
  '* 1 FETCH (UID 1000 FLAGS (\\Seen) INTERNALDATE "05-Sep-2004 00:38:03 +0000" BODY[TEXT] {'
    + bytes.length
    + '}'
    + CRLF
    + bytes.substring(0, 20000),
  ['* BYE LOGOUT Requested',
   'A6 OK good day (Success)',
   ''
  ].join(CRLF)
];
var EXPECTED = [
  'A0 CAPABILITY',
  'A1 LOGIN "foo" "bar"',
  'A2 NAMESPACE',
  'A3 LIST "" ""',
  'A4 EXAMINE "INBOX"',
  'A5 FETCH 1,2 (UID FLAGS INTERNALDATE BODY.PEEK[TEXT])',
  'A6 LOGOUT'
];

var exp = -1,
    res = -1;

var srv = net.createServer(function(sock) {
  sock.write('* OK asdf\r\n');
  var buf = '', lines;
  sock.on('data', function(data) {
    buf += data.toString('utf8');
    if (buf.indexOf(CRLF) > -1) {
      lines = buf.split(CRLF);
      buf = lines.pop();
      lines.forEach(function(l) {
        assert(l === EXPECTED[++exp], 'Unexpected client request: ' + l);
        assert(RESPONSES[++res], 'No response for client request: ' + l);
        sock.write(RESPONSES[res]);
      });
    }
  });
});
srv.listen(0, '127.0.0.1', function() {
  var port = srv.address().port;
  var imap = new Imap({
    user: 'foo',
    password: 'bar',
    host: '127.0.0.1',
    port: port,
    keepalive: false
  });
  imap.on('ready', function() {
    srv.close();
    imap.openBox('INBOX', true, function() {
      var f = imap.seq.fetch([1,2], { bodies: ['TEXT'] });
      var nbody = -1;
      f.on('message', function(m) {
        m.on('body', function(stream, info) {
          ++nbody;
          bodyInfo.push(info);
          body[nbody] = '';
          if (nbody === 0) {
            // first allow body.push() to return false in parser.js
            setTimeout(function() {
              stream.on('data', function(chunk) {
                body[nbody] += chunk.toString('binary');
              });
              setTimeout(function() {
                var oldRead = stream._read,
                    readCalled = false;
                stream._read = function(n) {
                  readCalled = true;
                  stream._read = oldRead;
                  imap._sock.push(bytes.substring(100, 200)
                                  + ')'
                                  + CRLF
                                  + 'A5 OK Success'
                                  + CRLF);
                  imap._parser._tryread();
                };
                imap._sock.push(bytes.substring(20000)
                                + ')'
                                + CRLF
                                + '* 2 FETCH (UID 1001 FLAGS (\\Seen) INTERNALDATE "05-Sep-2004 00:38:13 +0000" BODY[TEXT] {200}'
                                + CRLF
                                + bytes.substring(0, 100));

                // if we got this far, then we didn't get an exception and we
                // are running with the bug fix in place
                if (!readCalled) {
                  imap._sock.push(bytes.substring(100, 200)
                                  + ')'
                                  + CRLF
                                  + 'A5 OK Success'
                                  + CRLF);
                }
              }, 100);
            }, 100);
          } else {
            stream.on('data', function(chunk) {
              body[nbody] += chunk.toString('binary');
            });
          }
        });
        m.on('attributes', function(attrs) {
          result.push(attrs);
        });
      });
      f.on('end', function() {
        imap.end();
      });
    });
  });
  imap.connect();
});

process.once('exit', function() {
  assert.deepEqual(result, [{
    uid: 1000,
    date: new Date('05-Sep-2004 00:38:03 +0000'),
    flags: [ '\\Seen' ]
  }, {
    uid: 1001,
    date: new Date('05-Sep-2004 00:38:13 +0000'),
    flags: [ '\\Seen' ]
  }]);
  assert.deepEqual(body, [bytes, bytes.substring(0, 200)]);
  assert.deepEqual(bodyInfo, [{
    seqno: 1,
    which: 'TEXT',
    size: bytes.length
  }, {
    seqno: 2,
    which: 'TEXT',
    size: 200
  }]);
});