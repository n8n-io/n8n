var Type = require('./');

// Type.of(arg) and Type(one_argument) return constructor of type
console.log(Type.of('hi there ok'));  // [Function: String]
console.log(Type.of(342));            // [Function: Number]
console.log(Type.of({}));             // [Function: Object]
console.log(Type.of([1, 2, 3]));      // [Function: Array]
console.log(Type.of(null));           // null
console.log(Type.of(undefined));      // undefined
console.log(Type(true));              // [Function: Boolean]
console.log(Type(function () {}));    // [Function: Function]
console.log(Type(/abcd/));            // [Function: RegExp]
console.log(Type(new Date()));        // [Function: Date]
console.log(Type(new Error()));       // { [Function: Error] stackTraceLimit: 10 }

// Type.string(arg) returns the string name of constructor
console.log(Type.string('hi there ok'));  // "String"
console.log(Type.string(342));            // "Number"
console.log(Type.string({}));             // "Object"
console.log(Type.string([1, 2, 3]));      // "Array"
console.log(Type.string(null));           // "null"
console.log(Type.string(undefined));      // "undefined"
console.log(Type.string(true));           // "Boolean"
console.log(Type.string(function () {})); // "Function"
console.log(Type.string(/abcd/));         // "RegExp"
console.log(Type.string(new Date()));     // "Date"
console.log(Type.string(new Error()));    // "Error"

// Type.is(object, type) and Type(object, type) tests object type
console.log(Type.is(true, Boolean));      // true
console.log(Type.is("1231", Number));     // false
console.log(Type.is("1231", String));     // true
console.log(Type.is("1231", "String"));   // true
console.log(Type.is("1231", Object));     // false
console.log(Type([], Object));            // false
console.log(Type({}, Object));            // true
console.log(Type([], Array));             // true
console.log(Type(new Date(), Date));      // true
console.log(Type(new Date(), Object));    // false

var s = "hihihi";
var Stringy = Type.of(s);
var t = new Stringy("hihihi");
console.log((s == t));                    // true
console.log((s === t));                   // false


// User defined objects should be instances of Objects but also can get actual constructor type
function Person (name) {
  this.name = name;
}
Person.prototype.barf = function () {
  return this.name + " just barfed!";
};

var ralph = new Person('Ralph');

console.log(Type.of(ralph));                 // [Function: Person]
console.log(Type.is(ralph, Person));         // true
console.log(Type.is(ralph, Object));         // false
console.log(Type.instance(ralph, Person));   // true
console.log(Type.instance(ralph, Object));   // true


// arguments is weird edge case, there's no Arguments global but typeof arguments is "arguments"
// type returned is Object, but not sure what would be preferable
(function () {
  console.log(Type.of(arguments));          // [Function: Object]
})();


// other built-ins
console.log(Type.of(Infinity));    // [Function: Number]
console.log(Type.of(-Infinity));   // [Function: Number]
console.log(Type.of(NaN));         // [Function: Number]
console.log(Type.of(Math));        // [Function: Object]
console.log(Type.of(JSON));        // [Function: Object]


// Returning constructor as type allows it to be used to create new objects i.e.
var s = "s";
var t = new Type.of(s)("t");
console.log(t.toUpperCase());   // "T"

// Type.any(obj, [Array, Of, Types]) and Type(obj, [Array, Of, Types]) should test whether
// the object is any of the passed in types
var str = 'hihihi';
console.log(Type.any(str, [String, Number, Array])); // true
console.log(Type(str, [Array, RegExp]));             // false
