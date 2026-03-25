let assert = require('assert');
let exec = require('child_process').execSync;

const PROJECT_DIR = process.env.PROJECT_DIR;
const JAKE_CMD = `${PROJECT_DIR}/bin/cli.js`;

suite('selfDep', function () {

  this.timeout(7000);

  let origStderrWrite;

  setup(function () {
    origStderrWrite = process.stderr.write;
    process.stderr.write = function () {};
  });

  teardown(function () {
    process.stderr.write = origStderrWrite;
  });

  test('self dep const', function () {
    try {
      exec(`${JAKE_CMD} selfdepconst`);
    }
    catch(e) {
      assert(e.message.indexOf('dependency of itself') > -1)
    }
  });

  test('self dep dyn', function () {
    try {
      exec(`${JAKE_CMD} selfdepdyn`);
    }
    catch(e) {
      assert(e.message.indexOf('dependency of itself') > -1)
    }
  });

});


