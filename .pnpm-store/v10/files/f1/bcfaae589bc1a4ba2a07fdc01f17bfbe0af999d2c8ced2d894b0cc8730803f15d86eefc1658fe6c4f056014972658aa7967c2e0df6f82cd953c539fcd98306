
try {
  var url = require('is-url');
} catch (e) {
  var url = require('..');
}

var assert = require('assert');

describe('is-url', function () {
  describe('valid', function () {
    it('http://google.com', function () {
      assert(url('http://google.com'));
    });

    it('https://google.com', function () {
      assert(url('https://google.com'));
    });

    it('ftp://google.com', function () {
      assert(url('ftp://google.com'));
    });

    it('http://www.google.com', function () {
      assert(url('http://www.google.com'));
    });

    it('http://google.com/something', function () {
      assert(url('http://google.com/something'));
    });

    it('http://google.com?q=query', function () {
      assert(url('http://google.com?q=query'));
    });

    it('http://google.com#hash', function () {
      assert(url('http://google.com#hash'));
    });

    it('http://google.com/something?q=query#hash', function () {
      assert(url('http://google.com/something?q=query#hash'));
    });

    it('http://google.co.uk', function () {
      assert(url('http://google.co.uk'));
    });

    it('http://www.google.co.uk', function () {
      assert(url('http://www.google.co.uk'));
    });

    it('http://google.cat', function () {
      assert(url('http://google.cat'));
    });

    it('https://d1f4470da51b49289906b3d6cbd65074@app.getsentry.com/13176', function () {
      assert(url('https://d1f4470da51b49289906b3d6cbd65074@app.getsentry.com/13176'));
    });

    it('http://0.0.0.0', function () {
      assert(url('http://0.0.0.0'));
    });

    it('http://localhost', function () {
      assert(url('http://localhost'));
    });

    it('postgres://u:p@example.com:5702/db', function () {
      assert(url('postgres://u:p@example.com:5702/db'));
    });

    it('redis://:123@174.129.42.52:13271', function () {
      assert(url('redis://:123@174.129.42.52:13271'));
    });

    it('mongodb://u:p@example.com:10064/db', function () {
      assert(url('mongodb://u:p@example.com:10064/db'));
    });

    it('ws://chat.example.com/games', function () {
      assert(url('ws://chat.example.com/games'));
    });

    it('wss://secure.example.com/biz', function () {
      assert(url('wss://secure.example.com/biz'));
    });

    it('http://localhost:4000', function () {
      assert(url('http://localhost:4000'));
    });

    it('http://localhost:342/a/path', function () {
      assert(url('http://localhost:342/a/path'));
    });

    it('//google.com', function () {
      assert(url('//google.com'));
    });
  });

  describe('invalid', function () {
    it('http://', function () {
      assert(!url('http://'));
    });

    it('http://google', function () {
      assert(!url('http://google'));
    });

    it('http://google.', function () {
      assert(!url('http://google.'));
    });

    it('google', function () {
      assert(!url('google'));
    });

    it('google.com', function () {
      assert(!url('google.com'));
    });

    it('empty', function () {
      assert(!url(''));
    });

    it('undef', function () {
      assert(!url(undefined));
    });

    it('object', function () {
      assert(!url({}));
    });

    it('re', function () {
      assert(!url(/abc/));
    });
  });

  describe('redos', function () {
    it('redos exploit', function () {
      // Invalid. This should be discovered in under 1 second.
      var attackString = 'a://localhost' + '9'.repeat(100000) + '\t';
      var before = process.hrtime();
      assert(!url(attackString), 'attackString was valid');
      var elapsed = process.hrtime(before);
      assert(elapsed[0] < 1, 'attackString took ' + elapsed[0] + ' > 1 seconds');
    });
  });
});
