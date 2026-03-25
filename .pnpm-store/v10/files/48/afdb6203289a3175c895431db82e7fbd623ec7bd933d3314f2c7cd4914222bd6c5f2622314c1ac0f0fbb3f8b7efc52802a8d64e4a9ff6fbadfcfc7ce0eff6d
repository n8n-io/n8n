var test = require('tape');
var vm = require('../');

test('vmRunInNewContext', function (t) {
    t.plan(6);
    
    t.equal(vm.runInNewContext('a + 5', { a : 100 }), 105);
    
    (function () {
        var vars = { x : 10 };
        t.equal(vm.runInNewContext('x++', vars), 10);
        t.equal(vars.x, 11);
    })();
    
    (function () {
        var vars = { x : 10 };
        t.equal(vm.runInNewContext('var y = 3; y + x++', vars), 13);
        t.equal(vars.x, 11);
        t.equal(vars.y, 3);
    })();
    
    t.end();
});

test('vmRunInContext', function (t) {
    t.plan(2);

    var context = vm.createContext({ foo: 1 });

    vm.runInContext('var x = 1', context);
    t.deepEqual(context, { foo: 1, x: 1 });

    vm.runInContext('var y = 1', context);
    t.deepEqual(context, { foo: 1, x: 1, y: 1 });
});
