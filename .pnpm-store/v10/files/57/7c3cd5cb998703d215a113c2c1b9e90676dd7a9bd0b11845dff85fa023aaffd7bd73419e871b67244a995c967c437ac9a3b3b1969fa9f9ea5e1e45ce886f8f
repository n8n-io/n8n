var assert = require('assert'),
    net = require('net'),
    Imap = require('../lib/Connection'),
    result;

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
   '* 1 FETCH (FLAGS (\\Seen))',
   'A5 OK Success',
   ''
  ].join(CRLF),
  ['* BYE LOGOUT Requested',
   'A6 OK good day (Success)',
   ''
  ].join(CRLF)
];

var srv = net.createServer(function(sock) {
  sock.write('* OK asdf\r\n');
  var buf = '', lines;
  sock.on('data', function(data) {
    buf += data.toString('utf8');
    if (buf.indexOf(CRLF) > -1) {
      lines = buf.split(CRLF);
      buf = lines.pop();
      lines.forEach(function() {
        sock.write(RESPONSES.shift());
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
    imap.openBox('INBOX', true, function() {
      var f = imap.seq.fetch(1);
      f.on('message', function(m) {
        m.once('attributes', function(attrs) {
          result = attrs;
        });
      });
      f.on('end', function() {
        srv.close();
        imap.end();
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
});