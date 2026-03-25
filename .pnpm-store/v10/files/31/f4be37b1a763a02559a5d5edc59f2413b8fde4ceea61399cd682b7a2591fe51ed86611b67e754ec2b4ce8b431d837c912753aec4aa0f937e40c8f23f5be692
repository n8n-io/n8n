/*
 * Jake JavaScript build tool
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

const PROJECT_DIR = process.env.PROJECT_DIR;

let parseargs = require(`${PROJECT_DIR}/lib/parseargs`);
let assert = require('assert');
let optsReg = [
  { full: 'directory',
    abbr: 'C',
    preempts: false,
    expectValue: true
  },
  { full: 'jakefile',
    abbr: 'f',
    preempts: false,
    expectValue: true
  },
  { full: 'tasks',
    abbr: 'T',
    preempts: true
  },
  { full: 'tasks',
    abbr: 'ls',
    preempts: true
  },
  { full: 'trace',
    abbr: 't',
    preempts: false,
    expectValue: false
  },
  { full: 'help',
    abbr: 'h',
    preempts: true
  },
  { full: 'version',
    abbr: 'V',
    preempts: true
  }
];
let p = new parseargs.Parser(optsReg);
let z = function (s) { return s.split(' '); };
let res;

suite('parseargs', function () {

  test('long preemptive opt and val with equal-sign, ignore further opts', function () {
    res = p.parse(z('--tasks=foo --jakefile=asdf'));
    assert.equal('foo', res.opts.tasks);
    assert.equal(undefined, res.opts.jakefile);
  });

  test('long preemptive opt and val without equal-sign, ignore further opts', function () {
    res = p.parse(z('--tasks foo --jakefile=asdf'));
    assert.equal('foo', res.opts.tasks);
    assert.equal(undefined, res.opts.jakefile);
  });

  test('long preemptive opt and no val, ignore further opts', function () {
    res = p.parse(z('--tasks --jakefile=asdf'));
    assert.equal(true, res.opts.tasks);
    assert.equal(undefined, res.opts.jakefile);
  });

  test('preemptive opt with no val, should be true', function () {
    res = p.parse(z('-T'));
    assert.equal(true, res.opts.tasks);
  });

  test('preemptive opt with no val, should be true and ignore further opts', function () {
    res = p.parse(z('-T -f'));
    assert.equal(true, res.opts.tasks);
    assert.equal(undefined, res.opts.jakefile);
  });

  test('preemptive opt with val, should be val', function () {
    res = p.parse(z('-T zoobie -f foo/bar/baz'));
    assert.equal('zoobie', res.opts.tasks);
    assert.equal(undefined, res.opts.jakefile);
  });

  test('-f expects a value, -t does not (howdy is task-name)', function () {
    res = p.parse(z('-f zoobie -t howdy'));
    assert.equal('zoobie', res.opts.jakefile);
    assert.equal(true, res.opts.trace);
    assert.equal('howdy', res.taskNames[0]);
  });

  test('different order, -f expects a value, -t does not (howdy is task-name)', function () {
    res = p.parse(z('-f zoobie howdy -t'));
    assert.equal('zoobie', res.opts.jakefile);
    assert.equal(true, res.opts.trace);
    assert.equal('howdy', res.taskNames[0]);
  });

  test('-f expects a value, -t does not (foo=bar is env var)', function () {
    res = p.parse(z('-f zoobie -t foo=bar'));
    assert.equal('zoobie', res.opts.jakefile);
    assert.equal(true, res.opts.trace);
    assert.equal('bar', res.envVars.foo);
    assert.equal(undefined, res.taskNames[0]);
  });

  test('-f expects a value, -t does not (foo=bar is env-var, task-name follows)', function () {
    res = p.parse(z('-f zoobie -t howdy foo=bar'));
    assert.equal('zoobie', res.opts.jakefile);
    assert.equal(true, res.opts.trace);
    assert.equal('bar', res.envVars.foo);
    assert.equal('howdy', res.taskNames[0]);
  });

  test('-t does not expect a value, -f does (howdy is task-name)', function () {
    res = p.parse(z('-t howdy -f zoobie'));
    assert.equal(true, res.opts.trace);
    assert.equal('zoobie', res.opts.jakefile);
    assert.equal('howdy', res.taskNames[0]);
  });

  test('--trace does not expect a value, -f does (howdy is task-name)', function () {
    res = p.parse(z('--trace howdy --jakefile zoobie'));
    assert.equal(true, res.opts.trace);
    assert.equal('zoobie', res.opts.jakefile);
    assert.equal('howdy', res.taskNames[0]);
  });

  test('--trace does not expect a value (equal), -f does (throw howdy away)', function () {
    res = p.parse(z('--trace=howdy --jakefile=zoobie'));
    assert.equal(true, res.opts.trace);
    assert.equal('zoobie', res.opts.jakefile);
    assert.equal(undefined, res.taskNames[0]);
  });

  /*
, test('task-name with positional args', function () {
    res = p.parse(z('foo:bar[asdf,qwer]'));
    assert.equal('asdf', p.taskArgs[0]);
    assert.equal('qwer', p.taskArgs[1]);
  }

, test('opts, env vars, task-name with positional args', function () {
    res = p.parse(z('-f ./tests/Jakefile -t default[asdf,qwer] foo=bar'));
    assert.equal('./tests/Jakefile', res.opts.jakefile);
    assert.equal(true, res.opts.trace);
    assert.equal('bar', res.envVars.foo);
    assert.equal('default', res.taskName);
    assert.equal('asdf', p.taskArgs[0]);
    assert.equal('qwer', p.taskArgs[1]);
  }
*/


});


