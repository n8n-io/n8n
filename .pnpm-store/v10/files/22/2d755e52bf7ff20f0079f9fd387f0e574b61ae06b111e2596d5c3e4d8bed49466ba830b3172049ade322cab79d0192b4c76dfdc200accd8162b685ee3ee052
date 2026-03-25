let assert = require('assert');
let h = require('./helpers');
let exec = require('child_process').execSync;

const PROJECT_DIR = process.env.PROJECT_DIR;
const JAKE_CMD = `${PROJECT_DIR}/bin/cli.js`;

suite('taskBase', function () {

  this.timeout(7000);

  test('default task', function () {
    let out;
    out = exec(`${JAKE_CMD} -q`).toString().trim();
    assert.equal(out, 'default task');
    out = exec(`${JAKE_CMD} -q default`).toString().trim();
    assert.equal(out, 'default task');
  });

  test('task with no action', function () {
    let out = exec(`${JAKE_CMD} -q noAction`).toString().trim();
    assert.equal(out, 'default task');
  });

  test('a task with no action and no prereqs', function () {
    exec(`${JAKE_CMD} noActionNoPrereqs`);
  });

  test('a task that exists at the top-level, and not in the specified namespace, should error', function () {
    let res = require('child_process').spawnSync(`${JAKE_CMD}`,
      ['asdfasdfasdf:zerbofrangazoomy']);
    let err = res.stderr.toString();
    assert.ok(err.indexOf('Unknown task' > -1));
  });

  test('passing args to a task', function () {
    let out = exec(`${JAKE_CMD} -q argsEnvVars[foo,bar]`).toString().trim();
    let parsed = h.parse(out);
    let args = parsed.args;
    assert.equal(args[0], 'foo');
    assert.equal(args[1], 'bar');
  });

  test('a task with environment vars', function () {
    let out = exec(`${JAKE_CMD} -q argsEnvVars foo=bar baz=qux`).toString().trim();
    let parsed = h.parse(out);
    let env = parsed.env;
    assert.equal(env.foo, 'bar');
    assert.equal(env.baz, 'qux');
  });

  test('passing args and using environment vars', function () {
    let out = exec(`${JAKE_CMD} -q argsEnvVars[foo,bar] foo=bar baz=qux`).toString().trim();
    let parsed = h.parse(out);
    let args = parsed.args;
    let env = parsed.env;
    assert.equal(args[0], 'foo');
    assert.equal(args[1], 'bar');
    assert.equal(env.foo, 'bar');
    assert.equal(env.baz, 'qux');
  });

  test('a simple prereq', function () {
    let out = exec(`${JAKE_CMD} -q foo:baz`).toString().trim();
    assert.equal(out, 'foo:bar task\nfoo:baz task');
  });

  test('a duplicate prereq only runs once', function () {
    let out = exec(`${JAKE_CMD} -q foo:asdf`).toString().trim();
    assert.equal(out, 'foo:bar task\nfoo:baz task\nfoo:asdf task');
  });

  test('a prereq with command-line args', function () {
    let out = exec(`${JAKE_CMD} -q foo:qux`).toString().trim();
    assert.equal(out, 'foo:bar[asdf,qwer] task\nfoo:qux task');
  });

  test('a prereq with args via invoke', function () {
    let out = exec(`${JAKE_CMD} -q foo:frang[zxcv,uiop]`).toString().trim();
    assert.equal(out, 'foo:bar[zxcv,uiop] task\nfoo:frang task');
  });

  test('a prereq with args via execute', function () {
    let out = exec(`${JAKE_CMD} -q foo:zerb[zxcv,uiop]`).toString().trim();
    assert.equal(out, 'foo:bar[zxcv,uiop] task\nfoo:zerb task');
  });

  test('repeating the task via execute', function () {
    let out = exec(`${JAKE_CMD} -q foo:voom`).toString().trim();
    assert.equal(out, 'foo:bar task\nfoo:bar task\ncomplete\ncomplete');
  });

  test('prereq execution-order', function () {
    let out = exec(`${JAKE_CMD} -q hoge:fuga`).toString().trim();
    assert.equal(out, 'hoge:hoge task\nhoge:piyo task\nhoge:fuga task');
  });

  test('basic async task', function () {
    let out = exec(`${JAKE_CMD} -q bar:bar`).toString().trim();
    assert.equal(out, 'bar:foo task\nbar:bar task');
  });

  test('promise async task', function () {
    let out = exec(`${JAKE_CMD} -q bar:dependOnpromise`).toString().trim();
    assert.equal(out, 'bar:promise task\nbar:dependOnpromise task saw value 123654');
  });

  test('failing promise async task', function () {
    try {
      exec(`${JAKE_CMD} -q bar:brokenPromise`);
    }
    catch(e) {
      assert(e.message.indexOf('Command failed') > -1);
    }
  });

  test('that current-prereq index gets reset', function () {
    let out = exec(`${JAKE_CMD} -q hoge:kira`).toString().trim();
    assert.equal(out, 'hoge:hoge task\nhoge:piyo task\nhoge:fuga task\n' +
        'hoge:charan task\nhoge:gero task\nhoge:kira task');
  });

  test('modifying a task by adding prereq during execution', function () {
    let out = exec(`${JAKE_CMD} -q voom`).toString().trim();
    assert.equal(out, 2);
  });

  test('listening for task error-event', function () {
    try {
      exec(`${JAKE_CMD} -q vronk:groo`).toString().trim();
    }
    catch(e) {
      assert(e.message.indexOf('OMFGZONG') > -1);
    }
  });

  test('listening for jake error-event', function () {
    let out = exec(`${JAKE_CMD} -q throwy`).toString().trim();
    assert(out.indexOf('Emitted\nError: I am bad') > -1);
  });

  test('listening for jake unhandledRejection-event', function () {
    let out = exec(`${JAKE_CMD} -q promiseRejecter`).toString().trim();
    assert.equal(out, '<promise rejected on purpose>');
  });

  test('large number of same prereqs', function () {
    let out = exec(`${JAKE_CMD} -q large:same`).toString().trim();
    assert.equal(out, 'large:leaf\nlarge:same');
  });

  test('large number of different prereqs', function () {
    let out = exec(`${JAKE_CMD} -q large:different`).toString().trim();
    assert.equal(out, 'leaf-12\nleaf-123\nlarge:different');
  });

  test('large number of different prereqs', function () {
    let out = exec(`${JAKE_CMD} -q usingRequire:test`).toString().trim();
    assert.equal(out, 'howdy test');
  });

  test('modifying a namespace by adding a new task', function () {
    let out = exec(`${JAKE_CMD} -q one:two`).toString().trim();
    assert.equal('one:one\none:two', out);
  });

});
