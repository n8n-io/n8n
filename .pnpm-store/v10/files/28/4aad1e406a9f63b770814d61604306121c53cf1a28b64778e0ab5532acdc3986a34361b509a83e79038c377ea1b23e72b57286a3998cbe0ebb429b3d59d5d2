var path = require('path'),
    assert = require('assert'),
    assertCalled = require('assert-called'),
    spawnCommand = require('../');

var win32 = (process.platform === 'win32'),
    newln = win32 ? '\r\n' : '\n',
    grep = win32 ? 'findstr' : 'grep',
    child = spawnCommand(grep + ' commit < ' + path.join(__dirname, 'fixtures', 'commit')),
    stderr = '',
    stdout = '',
    exited = false;

child.stdout.on('data', function (chunk) {
  stdout += chunk;
});

child.stderr.on('data', function (chunk) {
  stderr += chunk;
});

child.on('exit', assertCalled(function (exitCode) {
  assert.equal(exitCode, 0);
  assert.equal(stdout, 'commit 26b11915b1c16440468a4b5f4b07d2409b98c68c' + newln);
  assert.equal(stderr, '');
}));
