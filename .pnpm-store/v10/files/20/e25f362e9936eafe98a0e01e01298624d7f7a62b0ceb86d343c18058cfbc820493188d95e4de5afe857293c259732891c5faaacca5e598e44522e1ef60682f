# Description

Sensible / unsurprising JavaScript type detection and comparison using a combination of ({}).toString and constructors.


### Built in objects / primitives

| obj                       | Type.of(obj)  | Type.is(...) === true         |
| ------------------------- |:-------------:| ----------------------------- |
| ```{ x : 2 }```           | Object        | ```Type.is(obj, Object)```    |
| ```function () {}```      | Function      | ```Type.is(obj, Function)```  |
| ```[1, 2, 3]```           | Array         | ```Type.is(obj, Array)```     |
| ```"barf"```              | String        | ```Type.is(obj, String)```    |
| ```true```                | Boolean       | ```Type.is(obj, Boolean)```   |
| ```10```                  | Number        | ```Type.is(obj, Number)```    |
| ```new Date()```          | Date          | ```Type.is(obj, Date)```      |
| ```/abc/```               | RegExp        | ```Type.is(obj, RegExp)```    |
| ```new Error("barf!")```  | Error         | ```Type.is(obj, Error)```     |


### Objects created via new

```javascript
function Person (name) {
  this.name = name;
}
Person.prototype.barf = function () {
  return this.name + " just barfed!";
};

var ralph = new Person('Ralph');

Type.of(ralph);                  // [Function: Person]
Type.is(ralph, Person);          // true
Type.is(ralph, Object);          // false
Type.instance(ralph, Person);    // true
Type.instance(ralph, Object);    // true
```


# Latest Version

3.4.0


# Installation

```
npm install type-of-is
```

or in package.json

```json
{
  ...
  "dependencies": {
    "type-of-is": "~3.4.0"
  }
}
```


# Usage

```javascript
var Type = require('type-of-is');

Type.of(obj);              // returns constructor type of an object
Type.string(obj);          // provides type as String
Type.is(obj, type);        // tests whether obj is of type (constructor or String)
Type.instance(obj, type);  // wrapper of "obj instanceof type"
Type.extension(SomeCoffeeScriptClassThatExtendsBarf, SomeCoffeeScriptClassNamedBarf)

// The top level Type export delegates to Type.of or Type.is based on argument count

Type(obj) === Type.of(obj);
Type(obj, type) === Type.is(obj, type);
```


# More examples

```javascript
var Type = require('type-of-is');

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
console.log(Type(new Error()));       // [Function: Error]

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

// multi-frame dom
var iFrame = document.createElement('IFRAME');
document.body.appendChild(iFrame);
var IFrameArray = window.frames[0].Array;
var array = new IFrameArray();

console.log(array instanceof Array);        //false
console.log(array instanceof IFrameArray);  //true;
console.log(Type.of(array));                // Array
console.log(Type.is(array, Array));         // false
console.log(Type.is(array, "Array"));       // true

```


# Rationale

Try to iron over some of the surprises in JavaScript type detection

1. typeof is unreliable / surprising in multiple cases (Array -> object, null -> object, etc.)

2. constructor checking is unreliable in multi-frame dom environments

3. type comparison using strings whose string case / formatting differs from constructor names introduces unnecessary complexity

4. ({}).toString returns "[object Object]" for objects created via new rather than constructor name called with new


# Links

http://ecma262-5.com/ELS5_HTML.htm

http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/

http://skilldrick.co.uk/2011/09/understanding-typeof-instanceof-and-constructor-in-javascript/

http://javascriptweblog.wordpress.com/2010/09/27/the-secret-life-of-javascript-primitives/

http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/

http://www.2ality.com/2011/11/improving-typeof.html


# TODO

check back on https://github.com/ariya/phantomjs/issues/11722

#Build status

[![build status](https://secure.travis-ci.org/stephenhandley/type-of-is.png)](http://travis-ci.org/stephenhandley/type-of-is)
