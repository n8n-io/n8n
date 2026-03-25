let fs = require('fs');
let Q = require('q');

desc('The default t.');
task('default', function () {
  console.log('default task');
});

desc('No action.');
task({'noAction': ['default']});

desc('No action, no prereqs.');
task('noActionNoPrereqs');

desc('Top-level zerbofrangazoomy task');
task('zerbofrangazoomy', function () {
  console.log('Whaaaaaaaa? Ran the zerbofrangazoomy task!')
});

desc('Task that throws');
task('throwy', function () {
  let errorListener = function (err) {
    console.log('Emitted');
    console.log(err.toString());

    jake.removeListener('error', errorListener);
  };

  jake.on('error', errorListener);

  throw new Error('I am bad');
});

desc('Task that rejects a Promise');
task('promiseRejecter', function () {
  const originalOption = jake.program.opts['allow-rejection'];

  const errorListener = function (err) {
    console.log(err.toString());
    jake.removeListener('error', errorListener);
    jake.program.opts['allow-rejection'] = originalOption; // Restore original 'allow-rejection' option
  };
  jake.on('error', errorListener);

  jake.program.opts['allow-rejection'] = false; // Do not allow rejection so the rejection is passed to error handlers

  Promise.reject('<promise rejected on purpose>');
});

desc('Accepts args and env vars.');
task('argsEnvVars', function () {
  let res = {
    args: arguments
    , env: {
      foo: process.env.foo
      , baz: process.env.baz
    }
  };
  console.log(JSON.stringify(res));
});

namespace('foo', function () {
  desc('The foo:bar t.');
  task('bar', function () {
    if (arguments.length) {
      console.log('foo:bar[' +
          Array.prototype.join.call(arguments, ',') +
          '] task');
    }
    else {
      console.log('foo:bar task');
    }
  });

  desc('The foo:baz task, calls foo:bar as a prerequisite.');
  task('baz', ['foo:bar'], function () {
    console.log('foo:baz task');
  });

  desc('The foo:qux task, calls foo:bar with cmdline args as a prerequisite.');
  task('qux', ['foo:bar[asdf,qwer]'], function () {
    console.log('foo:qux task');
  });

  desc('The foo:frang task,`invokes` foo:bar with passed args as a prerequisite.');
  task('frang', function () {
    let t = jake.Task['foo:bar'];
    // Do args pass-through
    t.invoke.apply(t, arguments);
    t.on('complete', () => {
      console.log('foo:frang task');
    });
  });

  desc('The foo:zerb task, `executes` foo:bar with passed args as a prerequisite.');
  task('zerb', function () {
    let t = jake.Task['foo:bar'];
    // Do args pass-through
    t.execute.apply(t, arguments);
    t.on('complete', () => {
      console.log('foo:zerb task');
    });
  });

  desc('The foo:zoobie task, has no prerequisites.');
  task('zoobie', function () {
    console.log('foo:zoobie task');
  });

  desc('The foo:voom task, run the foo:zoobie task repeatedly.');
  task('voom', function () {
    let t = jake.Task['foo:bar'];
    t.on('complete', function () {
      console.log('complete');
    });
    t.execute.apply(t);
    t.execute.apply(t);
  });

  desc('The foo:asdf task, has the same prereq twice.');
  task('asdf', ['foo:bar', 'foo:baz'], function () {
    console.log('foo:asdf task');
  });

});

namespace('bar', function () {
  desc('The bar:foo task, has no prerequisites, is async, returns Promise which resolves.');
  task('foo', async function () {
    return new Promise((resolve, reject) => {
      console.log('bar:foo task');
      resolve();
    });
  });

  desc('The bar:promise task has no prerequisites, is async, returns Q-based promise.');
  task('promise', function () {
    return Q()
      .then(function () {
        console.log('bar:promise task');
        return 123654;
      });
  });

  desc('The bar:dependOnpromise task waits for a promise based async test');
  task('dependOnpromise', ['promise'], function () {
    console.log('bar:dependOnpromise task saw value', jake.Task["bar:promise"].value);
  });

  desc('The bar:brokenPromise task is a failing Q-promise based async task.');
  task('brokenPromise', function () {
    return Q()
      .then(function () {
        throw new Error("nom nom nom");
      });
  });

  desc('The bar:bar task, has the async bar:foo task as a prerequisite.');
  task('bar', ['bar:foo'], function () {
    console.log('bar:bar task');
  });

});

namespace('hoge', function () {
  desc('The hoge:hoge task, has no prerequisites.');
  task('hoge', function () {
    console.log('hoge:hoge task');
  });

  desc('The hoge:piyo task, has no prerequisites.');
  task('piyo', function () {
    console.log('hoge:piyo task');
  });

  desc('The hoge:fuga task, has hoge:hoge and hoge:piyo as prerequisites.');
  task('fuga', ['hoge:hoge', 'hoge:piyo'], function () {
    console.log('hoge:fuga task');
  });

  desc('The hoge:charan task, has hoge:fuga as a prerequisite.');
  task('charan', ['hoge:fuga'], function () {
    console.log('hoge:charan task');
  });

  desc('The hoge:gero task, has hoge:fuga as a prerequisite.');
  task('gero', ['hoge:fuga'], function () {
    console.log('hoge:gero task');
  });

  desc('The hoge:kira task, has hoge:charan and hoge:gero as prerequisites.');
  task('kira', ['hoge:charan', 'hoge:gero'], function () {
    console.log('hoge:kira task');
  });

});

namespace('fileTest', function () {
  directory('foo');

  desc('File task, concatenating two files together');
  file('foo/concat.txt', ['fileTest:foo', 'fileTest:foo/src1.txt', 'fileTest:foo/src2.txt'], function () {
    console.log('fileTest:foo/concat.txt task');
    let data1 = fs.readFileSync('foo/src1.txt');
    let data2 = fs.readFileSync('foo/src2.txt');
    fs.writeFileSync('foo/concat.txt', data1 + data2);
  });

  desc('File task, async creation with writeFile');
  file('foo/src1.txt', function () {
    return new Promise(function (resolve, reject) {
      fs.writeFile('foo/src1.txt', 'src1', function (err) {
        if (err) {
          reject(err);
        }
        else {
          console.log('fileTest:foo/src1.txt task');
          resolve();
        }
      });
    });
  });

  desc('File task, sync creation with writeFileSync');
  file('foo/src2.txt', ['default'], function () {
    fs.writeFileSync('foo/src2.txt', 'src2');
    console.log('fileTest:foo/src2.txt task');
  });

  desc('File task, do not run unless the prereq file changes');
  file('foo/from-src1.txt', ['fileTest:foo', 'fileTest:foo/src1.txt'], function () {
    let data = fs.readFileSync('foo/src1.txt').toString();
    fs.writeFileSync('foo/from-src1.txt', data);
    console.log('fileTest:foo/from-src1.txt task');
  });

  desc('File task, run if the prereq file changes');
  task('touch-prereq', function () {
    fs.writeFileSync('foo/prereq.txt', 'UPDATED');
  })

  desc('File task, has a preexisting file (with no associated task) as a prereq');
  file('foo/from-prereq.txt', ['fileTest:foo', 'foo/prereq.txt'], function () {
    let data = fs.readFileSync('foo/prereq.txt');
    fs.writeFileSync('foo/from-prereq.txt', data);
    console.log('fileTest:foo/from-prereq.txt task');
  });

  directory('foo/bar/baz');

  desc('Write a file in a nested subdirectory');
  file('foo/bar/baz/bamf.txt', ['foo/bar/baz'], function () {
    fs.writeFileSync('foo/bar/baz/bamf.txt', 'w00t');
  });

});

task('blammo');
// Define task
task('voom', ['blammo'], function () {
  console.log(this.prereqs.length);
});

// Modify, add a prereq
task('voom', ['noActionNoPrereqs']);

namespace('vronk', function () {
  task('groo', function () {
    let t = jake.Task['vronk:zong'];
    t.addListener('error', function (e) {
      console.log(e.message);
    });
    t.invoke();
  });
  task('zong', function () {
    throw new Error('OMFGZONG');
  });
});

// define namespace
namespace('one', function () {
  task('one', function () {
    console.log('one:one');
  });
});

// modify namespace (add task)
namespace('one', function () {
  task('two', ['one:one'], function () {
    console.log('one:two');
  });
});

task('selfdepconst', [], function () {
  task('selfdep', ['selfdep'], function () {
    console.log("I made a task that depends on itself");
  });
});
task('selfdepdyn', function () {
  task('selfdeppar', [], {concurrency: 2}, function () {
    console.log("I will depend on myself and will fail at runtime");
  });
  task('selfdeppar', ['selfdeppar']);
  jake.Task['selfdeppar'].invoke();
});

namespace("large", function () {
  task("leaf", function () {
    console.log("large:leaf");
  });

  const same = [];
  for (let i = 0; i < 2000; i++) {
    same.push("leaf");
  }

  desc("Task with a large number of same prereqs");
  task("same", same, { concurrency: 2 }, function () {
    console.log("large:same");
  });

  const different = [];
  for (let i = 0; i < 2000; i++) {
    const name = "leaf-" + i;
    task(name, function () {
      if (name === "leaf-12" || name === "leaf-123") {
        console.log(name);
      }
    });
    different.push(name);
  }

  desc("Task with a large number of different prereqs");
  task("different", different, { concurrency: 2 } , function () {
    console.log("large:different")
  })
});
