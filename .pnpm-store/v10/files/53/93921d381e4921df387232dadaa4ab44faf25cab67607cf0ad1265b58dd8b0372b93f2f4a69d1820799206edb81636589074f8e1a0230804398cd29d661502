var assert = require('assert'),
    net = require('net'),
    Imap = require('../lib/Connection');

var result, body = '', bodyInfo;

var CRLF = '\r\n';

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
  ['* 1 FETCH (UID 1)',
   '* 1 FETCH (INTERNALDATE "05-Sep-2004 00:38:03 +0000" UID 1000)',
   '* 1 FETCH (BODY[TEXT] "IMAP is terrible")',
   '* 1 FETCH (FLAGS (\\Seen))',
   'A5 OK Success',
   ''
  ].join(CRLF),
  ['* STATUS test (MESSAGES 231 RECENT 0 UNSEEN 0 UIDVALIDITY 123 UIDNEXT 442)',
   'A6 OK STATUS completed',
   ''
  ].join(CRLF),
  ['* BYE LOGOUT Requested',
   'A7 OK good day (Success)',
   ''
  ].join(CRLF)
];
var EXPECTED = [
  'A0 CAPABILITY',
  'A1 LOGIN "foo" "bar"',
  'A2 NAMESPACE',
  'A3 LIST "" ""',
  'A4 EXAMINE "INBOX"',
  'A5 FETCH 1 (UID FLAGS INTERNALDATE BODY.PEEK[TEXT])',
  'IDLE IDLE',
  'DONE',
  'A6 STATUS "test" (MESSAGES RECENT UNSEEN UIDVALIDITY UIDNEXT)',
  'A7 LOGOUT'
];

var exp = -1,
    res = -1,
    sentCont = false;

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
        if (l === 'DONE') {
          assert(sentCont, 'DONE seen before continuation sent');
          sock.write('IDLE ok\r\n');
        } else if (l === 'IDLE IDLE') {
          setTimeout(function() {
            sentCont = true;
            sock.write('+ idling\r\n');
          }, 100);
        } else {
          assert(RESPONSES[++res], 'No response for client request: ' + l);
          sock.write(RESPONSES[res]);
        }
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
    keepalive: true
  });
  imap.on('ready', function() {
    srv.close();
    imap.openBox('INBOX', true, function() {
      var f = imap.seq.fetch(1, { bodies: ['TEXT'] });
      f.on('message', function(m) {
        m.on('body', function(stream, info) {
          bodyInfo = info;
          stream.on('data', function(chunk) { body += chunk.toString('utf8'); });
        });
        m.on('attributes', function(attrs) {
          result = attrs;
        });
      });
      f.on('end', function() {
        imap.status('test', function(err, status) {
          imap.end();
        });
      });
    });
  });
  imap.connect();
});

process.once('exit', function() {
  assert.deepEqual(result, {
    uid: 1,
    date: new Date('05-Sep-2004 00:38:03 +0000'),
    flags: [ '\\Seen' ]
  });
  assert.equal(body, 'IMAP is terrible');
  assert.deepEqual(bodyInfo, {
    seqno: 1,
    which: 'TEXT',
    size: 16
  });
});