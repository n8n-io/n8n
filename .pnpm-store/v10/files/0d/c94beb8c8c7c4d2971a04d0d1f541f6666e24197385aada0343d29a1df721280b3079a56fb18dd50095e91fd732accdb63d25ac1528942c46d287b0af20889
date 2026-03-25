var readInstalled = require('../read-installed.js');
var test = require('tap').test;
var path = require('path');

test('prerelease packages should not be marked invalid', function(t) {
  readInstalled(
    path.join(__dirname, 'fixtures/issue-40'),
    { log: console.error },
    function(err, map) {
      t.strictEqual(map.dependencies.fake.version, '0.1.0-2');
      t.notOk(map.dependencies.fake.invalid);
      t.end();
    }
  );
});
