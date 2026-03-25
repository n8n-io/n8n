var subarg = require('../');
var test = require('tape');

test('spaced multi sub-args', function (t) {
    t.plan(2);
    
    t.deepEqual(
        subarg('beep -t [ boop -o a.txt -o b.txt -q ] -v'.split(/\s+/)),
        {
            _: [ 'beep'],
            t: {
                _: [ 'boop' ],
                o: [ 'a.txt', 'b.txt' ],
                q: true
            },
            v: true
        }
    );
    t.deepEqual(
        subarg('beep -t [boop -o a.txt -o b.txt -q] -v'.split(/\s+/)),
        {
            _: [ 'beep'],
            t: {
                _: [ 'boop' ],
                o: [ 'a.txt', 'b.txt' ],
                q: true
            },
            v: true
        }
    );
});
