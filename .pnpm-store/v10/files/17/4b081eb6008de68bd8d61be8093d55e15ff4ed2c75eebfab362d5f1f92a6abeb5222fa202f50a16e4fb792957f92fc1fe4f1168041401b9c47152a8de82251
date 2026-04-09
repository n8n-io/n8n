const PROJECT_DIR = process.env.PROJECT_DIR;
const JAKE_CMD = `${PROJECT_DIR}/bin/cli.js`;

let assert = require('assert');
let proc = require('child_process');

suite('listTasks', function () {
  test('execute "jake -T" without any errors', function () {
    let message = 'cannot run "jake -T" command';
    let listTasks = function () {
      proc.execFileSync(JAKE_CMD, ['-T']);
    };
    assert.doesNotThrow(listTasks, TypeError, message);
  });
});
