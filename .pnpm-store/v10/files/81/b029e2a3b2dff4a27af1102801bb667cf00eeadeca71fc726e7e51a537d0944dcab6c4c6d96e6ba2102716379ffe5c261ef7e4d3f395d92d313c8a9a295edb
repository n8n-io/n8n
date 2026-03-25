var treeify = require('../treeify'),
   vows = require('vows'),
   assert = require('assert'),
   events = require('events');

// - helper functions -----------------

function treeifyByLineGuts(args) {
   var emitter = new events.EventEmitter(),
       lineNum = 0;
   args.push(function(line) {
      emitter.emit('success', line);
      emitter.emit('line ' + (++lineNum), line);
   });
   treeify.asLines.apply(this, args);
   return emitter;
}

function treeifyByLine(obj) {
   return function(showValues) {
      var arguments = [ obj, showValues ];
      return treeifyByLineGuts(arguments);
   };
}

function treeifyByLineWithHideFunctionsArgument(obj) {
   return function(showValues, hideFunctions) {
      var arguments = [ obj, showValues, hideFunctions ];
      return treeifyByLineGuts(arguments);
   };
}

function treeifyEntirely(obj) {
   return function(showValues, hideFunctions) {
      return treeify.asTree(obj, showValues, hideFunctions);
   };
}

function withValuesShown(showValues) {
   return function(func){ return func(showValues, false) };
}

function withValuesShownFunctionsHidden() {
  return function(func){ return func(true, true) };

}

function is(content, arrayIndex) {
   return function(lines) {
      var toCheck = lines;
      if (arrayIndex !== undefined) {
         toCheck = lines[arrayIndex];
      }
      assert.strictEqual(toCheck, content, 'should be "' + content + '" but was "' + toCheck + '"');
   };
}

function checkLines(/* ... */) {
   var ret = {}, entry;
   for (var line = 1; line <= arguments.length; line++) {
      if ( ! arguments[line - 1])
         continue;
      entry = {};
      entry['branches correctly on line '+line] = is(arguments[line - 1]);
      ret['line '+line] = entry;
   }
   return ret;
}

// - the beautiful test suite ---------

vows.describe('tree-test').addBatch({

   'A tree created from an empty object': {
      topic: {},

      'when returned as a whole tree': {
         topic: treeifyEntirely,

         'with values hidden': {
            topic: withValuesShown(false),
            'is an empty string': is('')
         },
         'with values shown': {
            topic: withValuesShown(true),
            'is an empty string': is('')
         }
      }
   },

   'A tree created from a single-level object': {
      topic: {
         apples: 'gala',      //  ├─ apples: gala
         oranges: 'mandarin'  //  └─ oranges: mandarin
      },

      'when returned line-by-line': {
         topic: treeifyByLine,

         'with values hidden': {
            topic: withValuesShown(false),

            'is two lines long': function(err, line) {
               this.expect(2);
            },
            on: checkLines('├─ apples',
                           '└─ oranges')
         },
         'with values shown': {
            topic: withValuesShown(true),

            'is two lines long': function(err, line) {
               this.expect(2);
            },
            on: checkLines('├─ apples: gala',
                           '└─ oranges: mandarin')
         }
      },

      'when returned as a whole tree': {
         topic: treeifyEntirely,

         'with values hidden': {
            topic: withValuesShown(false),

            'is not empty': function(tree) {
               assert.notEqual(tree, '', 'should not be empty');
            },
            'contains 2 line breaks': function(tree) {
               assert.strictEqual(tree.match(/\n/g).length, 2, 'should contain 2 x \n');
            },
            '(split into an array of lines)': {
               topic: function(tree) { return tree.split(/\n/g) },
               'has a correct first line':  is('├─ apples', 0),
               'has a correct second line': is('└─ oranges', 1),
               'has nothing at the end':    is('', 2)
            }
         },
         'with values shown': {
            topic: withValuesShown(true),

            'is not empty': function(tree) {
               assert.notEqual(tree, '', 'should not be empty');
            },
            'contains 2 line breaks': function(tree) {
               assert.strictEqual(tree.match(/\n/g).length, 2, 'should contain 2 x \n');
            },
            '(split into an array of lines)': {
               topic: function(tree) { return tree.split(/\n/g) },
               'has a correct first line':  is('├─ apples: gala', 0),
               'has a correct second line': is('└─ oranges: mandarin', 1),
               'has nothing at the end':    is('', 2)
            }
         }
      }
   },

   'A tree created from a multi-level object': {
      topic: {
         oranges: {                  //  ├─ oranges
            'mandarin': {            //  │  └─ mandarin
               clementine: null,     //  │     ├─ clementine
               tangerine:            //  │     └─ tangerine
                  'so cheap and juicy!'
            }
         },
         apples: {                   //  └─ apples
            'gala': null,            //     ├─ gala
            'pink lady': null        //     └─ pink lady
         }
      },

      'when returned line-by-line': {
         topic: treeifyByLine,

         'with values hidden': {
            topic: withValuesShown(false),

            'is seven lines long': function(err, line) {
               this.expect(7);
            },
            on: checkLines('├─ oranges',
                           '│  └─ mandarin',
                           '│     ├─ clementine',
                           '│     └─ tangerine',
                           '└─ apples',
                           '   ├─ gala',
                           '   └─ pink lady')
         },
         'with values shown': {
            topic: withValuesShown(true),
            on: checkLines(null, null, null,
                           '│     └─ tangerine: so cheap and juicy!')
         }
      },

      'when returned as a whole tree': {
         topic: treeifyEntirely,

         'with values shown': {
            topic: withValuesShown(true),

            '(split into an array of lines)': {
               topic: function(tree) { return tree.split(/\n/g) },
               'has a correct first line': is('├─ oranges', 0),
               'has a correct third line': is('│     └─ tangerine: so cheap and juicy!', 3),
               'has nothing at the end':   is('', 7)
            }
         }
      }
   },

   'A tree created from an object with not so circular references': {
      topic: function() {
         var obj = { one: 'one', two: { four: 'four' } };
         obj['three'] = obj.two;
         return obj;
      },

      'when returned line-by-line': {
         topic: treeifyByLine,

         'with values shown': {
            topic: withValuesShown(true),
            on: checkLines('├─ one: one',
                           '├─ two',
                           '│  └─ four: four',
                           '└─ three',
                           '   └─ four: four')
         }
      }
   },

   'A tree created from an object with circular references': {
      topic: function() {
         var obj = { one: 'one', two: 'two' };
         obj['three'] = obj;
         return obj;
      },

      'when returned line-by-line': {
         topic: treeifyByLine,

         'with values shown': {
            topic: withValuesShown(true),
            on: checkLines('├─ one: one',
                           '├─ two: two',
                           '└─ three (circular ref.)')
         }
      }
   },

   'A tree created from an object containing various types': {
      topic: {
         array: [ 'one', 'two' ],
         numeric: 42,
         decimal: 42.24,
         bool: false,
         nil: null,
         undef: undefined,
         date: new Date(2018,0,1)
      },

      'when returned line-by-line': {
         topic: treeifyByLine,

         'with values shown': {
            topic: withValuesShown(true),
            on: checkLines('├─ array',
                           '│  ├─ 0: one',
                           '│  └─ 1: two',
                           '├─ numeric: 42',
                           '├─ decimal: 42.24',
                           '├─ bool: false',
                           '├─ nil',
                           '├─ undef: undefined',
                           '└─ date: Mon Jan 01 2018 00:00:00 GMT+0000 (UTC)')
         }
      }
   },

   'A tree created from an object with prototyped functions': {
      topic: function() {
         var func = function(){
            this.Friendly = 'stuff';
         }
         func.prototype.Nasty = function(){}
         return new func();
      },

      'when returned as a whole tree': {
         topic: treeifyEntirely,

         'with values shown': {
            topic: withValuesShown(true),

            'and split into an array of lines': {
               topic: function(tree) { return tree.split(/\n/g) },
               'is a one liner output (with a following blank line)': function(lines) {
                  assert.equal(lines.length, 2);
               },
               'has a correct first line': is('└─ Friendly: stuff', 0)
            }
         }
      }
   },
   'A tree with functions': {
      topic: {
        func:function(){},
        Friendly:"stuff",
        Another:"stuff"
      },

      'when returned line-by-line': {
         topic: treeifyByLineWithHideFunctionsArgument,

         'with values shown, but functions hidden': {
            topic: withValuesShownFunctionsHidden(),

            'is two lines long': function(err, line) {
               this.expect(2);
            },
            on: checkLines('├─ Friendly: stuff',
                           '└─ Another: stuff')
         }
      },

      'when returned as a whole tree': {
         topic: treeifyEntirely,

         'with values shown, but functions hidden': {
            topic: withValuesShownFunctionsHidden(),

            'and split into an array of lines': {
               topic: function(tree) {
                 console.error(tree);
                 return tree.split(/\n/g) },
               'is a one liner output (with a following blank line)': function(lines) {
                  assert.equal(lines.length, 3);
               },
               'has a correct first line': is('├─ Friendly: stuff', 0)
            }
         }
      }
   }

}).export(module);
