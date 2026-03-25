var subarg = require('../');
var test = require('tape');

test('recursive', function (t) {
    t.plan(1);
    
    t.deepEqual(
        subarg('-a [ -b [ -c [ -d 5 ] ] ] -e 3'.split(/\s+/)),
        {
            _: [],
            a: {
                _: [],
                b: {
                    _: [],
                    c: {
                        _: [],
                        d: 5
                    }
                }
            },
            e: 3
        }
    );
});
