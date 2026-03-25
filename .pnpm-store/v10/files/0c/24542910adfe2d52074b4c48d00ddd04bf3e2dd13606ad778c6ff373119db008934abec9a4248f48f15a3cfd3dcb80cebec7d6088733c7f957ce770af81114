var test = require('tape');
var archy = require('../');

test('multi-line', function (t) {
    var s = archy({
      label : 'beep\none\ntwo',
      nodes : [
        'ity',
        {
          label : 'boop',
          nodes : [
            {
              label : 'o_O\nwheee',
              nodes : [
                {
                  label : 'oh',
                  nodes : [ 'hello', 'puny\nmeat' ]
                },
                'creature'
              ]
            },
            'party\ntime!'
          ]
        }
      ]
    });
    t.equal(s, [
        'beep',
        '│ one',
        '│ two',
        '├── ity',
        '└─┬ boop',
        '  ├─┬ o_O',
        '  │ │ wheee',
        '  │ ├─┬ oh',
        '  │ │ ├── hello',
        '  │ │ └── puny',
        '  │ │     meat',
        '  │ └── creature',
        '  └── party',
        '      time!',
        ''
    ].join('\n'));
    t.end();
});
