var Path = require('path');
var Assert = require('assert');

var Type = require(Path.join(__dirname, '..'));

function Person (name) {
  this.name = name;
}
Person.prototype.barf = function () {
  return this.name + " just barfed!";
};

var BarfClasses = require('./BarfClasses');

module.exports = {
  "Type, Type.of, and Type.string should properly find types": function () {
    var of_expectations = [
      ["hi", String, "String"],
      [{}, Object, "Object"],
      [[], Array, "Array"],
      [null, null, "null"],
      [1, Number, "Number"],
      [true, Boolean, "Boolean"],
      [function() {}, Function, "Function"],
      [new Date(), Date, "Date"],
      [new Error(), Error, "Error"],
      [/blah|foo|bar/, RegExp, "RegExp"],
      [undefined, undefined, "undefined"],
      [new Person('ralph'), Person, "Person"]
    ];

    of_expectations.forEach(function(expectation) {
      Assert.strictEqual(Type(expectation[0]), expectation[1], "testing Type(" + expectation[0] + ")");
      Assert.strictEqual(Type.of(expectation[0]), expectation[1], "testing Type.of(" + expectation[0] + ")");
      Assert.strictEqual(Type.string(expectation[0]), expectation[2], "testing Type.string(" + expectation[0] + ")");
    });
  },

  "Type and Type.is should properly check built-in types": function () {
    var types = [
      String,
      Object,
      Array,
      null,
      Number,
      Boolean,
      Function,
      Date,
      Error,
      RegExp,
      undefined,
      Person
    ];

    var is_expectations = [
      [
        ["hi", "there", "1234"],     // values
        String,  // expect true
      ],
      [
        [{}, {one: 1, two: 2}],
        Object
      ],
      [
        [[], [1,2,3], ["string", 2, false]],
        Array
      ],
      [
        [null],
        null
      ],
      [
        [1, 20324, 2342.425],
        Number
      ],
      [
        [true, false],
        Boolean
      ],
      [
        [{}.toString, function() { return 1 + 2; }],
        Function
      ],
      [
        [new Date()],
        Date
      ],
      [
        [new Error("oh no"), (function () { try { throw new Error("blah"); } catch (e) { return e; }})()],
        Error
      ],
      [
        [/foo|bar/, /.*abc/],
        RegExp
      ],
      [
        [undefined],
        undefined
      ],
      [
        [new Person('ralph'), new Person('joe')],
        Person
      ]
    ];

    // for each group:
    // [0] are arg 1 / objects to test
    // [1] are arg 2 / types to compare against that should return true
    // [2] are arg 2 / types to compare against that should return false
    is_expectations.forEach(function(group) {
      group[0].forEach(function(obj) {
        var true_type = group[1];
        Assert(Type(obj, true_type), "testing " + obj + ' is ' + true_type);
        Assert(Type.is(obj, true_type), "testing " + obj + ' is ' + true_type);

        types.forEach(function(false_type) {
          if (group[1] !== false_type) {
            Assert.strictEqual(Type(obj, false_type), false, "testing " + obj + ' is ' + false_type);
            Assert.strictEqual(Type.is(obj, false_type), false, "testing " + obj + ' is ' + false_type);
          }
        });
      });
    });
  },

  "Type.instance should work (this is stupid to test)": function () {
    var ralph = new Person('ralph');
    Assert(Type.instance(ralph, Person));
    Assert(Type.instance(ralph, Object));
    Assert(!Type.instance(ralph, String));
  },

  "Type.any and Type(obj, <Array>) should check whether an array is one of many types": function () {
    var str = 'abcdefg';
    Assert(Type.any(str, [String]));
    Assert(Type.any(str, [Array, String]));
    Assert(!Type.any(str, [Array, Number]));
    Assert(Type(str, [String]));
    Assert(!Type(str, [Array, Number]));
    Assert.throws(function () {
      Type.any(str, String);
    }, /should be array/);
  },

  "Type.extension(ClassA, ClassB) should properly check CoffeeScript inheritance" : function () {
    var Grandparent = BarfClasses.Grandparent;
    var Parent      = BarfClasses.Parent;
    var Child       = BarfClasses.Child;
    var Derp        = BarfClasses.Derp;

    var da_expectations = {
      yes : [
        [Parent, Grandparent],
        [Child, Grandparent],
        [Child, Parent]
      ],

      no : [
        [Grandparent, Parent],
        [Grandparent, Child],
        [Child, Derp],
        [Derp, Child],
        [Child, Child],
        [Parent, Parent],
        [Grandparent, Grandparent]
      ]
    }

    for (var key in da_expectations) {
      if (da_expectations.hasOwnProperty(key)) {
        var expected = (key === 'yes');
        var expectations = da_expectations[key];

        expectations.forEach(function (expectation) {
          var child  = expectation[0];
          var parent = expectation[1];

          var actual = Type.extension(child, parent);
          var description = child.name + ' < ' + parent.name;
          Assert.equal(actual, expected, description);
        });
      }
    }
  }
};
