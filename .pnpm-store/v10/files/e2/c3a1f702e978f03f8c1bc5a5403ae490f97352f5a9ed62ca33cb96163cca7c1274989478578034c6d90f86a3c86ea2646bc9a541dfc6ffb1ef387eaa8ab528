# Fraction.js - ℚ in JavaScript

[![NPM Package](https://img.shields.io/npm/v/fraction.js.svg?style=flat)](https://npmjs.org/package/fraction.js "View this project on npm")
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)


Tired of inprecise numbers represented by doubles, which have to store rational and irrational numbers like PI or sqrt(2) the same way? Obviously the following problem is preventable:

```javascript
1 / 98 * 98 // = 0.9999999999999999
```

If you need more precision or just want a fraction as a result, just include *Fraction.js*:

```javascript
var Fraction = require('fraction.js');
// or
import Fraction from 'fraction.js';
```

and give it a trial:

```javascript
Fraction(1).div(98).mul(98) // = 1
```

Internally, numbers are represented as *numerator / denominator*, which adds just a little overhead. However, the library is written with performance and accuracy in mind, which makes it the perfect basis for [Polynomial.js](https://github.com/infusion/Polynomial.js) and [Math.js](https://github.com/josdejong/mathjs).

Convert decimal to fraction
===
The simplest job for fraction.js is to get a fraction out of a decimal:
```javascript
var x = new Fraction(1.88);
var res = x.toFraction(true); // String "1 22/25"
```

Examples / Motivation
===
A simple example might be

```javascript
var f = new Fraction("9.4'31'"); // 9.4313131313131...
f.mul([-4, 3]).mod("4.'8'"); // 4.88888888888888...
```
The result is

```javascript
console.log(f.toFraction()); // -4154 / 1485
```
You could of course also access the sign (s), numerator (n) and denominator (d) on your own:
```javascript
f.s * f.n / f.d = -1 * 4154 / 1485 = -2.797306...
```

If you would try to calculate it yourself, you would come up with something like:

```javascript
(9.4313131 * (-4 / 3)) % 4.888888 = -2.797308133...
```

Quite okay, but yea - not as accurate as it could be.


Laplace Probability
===
Simple example. What's the probability of throwing a 3, and 1 or 4, and 2 or 4 or 6 with a fair dice?

P({3}):
```javascript
var p = new Fraction([3].length, 6).toString(); // 0.1(6)
```

P({1, 4}):
```javascript
var p = new Fraction([1, 4].length, 6).toString(); // 0.(3)
```

P({2, 4, 6}):
```javascript
var p = new Fraction([2, 4, 6].length, 6).toString(); // 0.5
```

Convert degrees/minutes/seconds to precise rational representation:
===

57+45/60+17/3600
```javascript
var deg = 57; // 57°
var min = 45; // 45 Minutes
var sec = 17; // 17 Seconds

new Fraction(deg).add(min, 60).add(sec, 3600).toString() // -> 57.7547(2)
```


Rational approximation of irrational numbers
===

Now it's getting messy ;d To approximate a number like *sqrt(5) - 2* with a numerator and denominator, you can reformat the equation as follows: *pow(n / d + 2, 2) = 5*.

Then the following algorithm will generate the rational number besides the binary representation.

```javascript
var x = "/", s = "";

var a = new Fraction(0),
    b = new Fraction(1);
for (var n = 0; n <= 10; n++) {

  var c = a.add(b).div(2);

  console.log(n + "\t" + a + "\t" + b + "\t" + c + "\t" + x);

  if (c.add(2).pow(2) < 5) {
    a = c;
    x = "1";
  } else {
    b = c;
    x = "0";
  }
  s+= x;
}
console.log(s)
```

The result is

```
n   a[n]        b[n]        c[n]            x[n]
0   0/1         1/1         1/2             /
1   0/1         1/2         1/4             0
2   0/1         1/4         1/8             0
3   1/8         1/4         3/16            1
4   3/16        1/4         7/32            1
5   7/32        1/4         15/64           1
6   15/64       1/4         31/128          1
7   15/64       31/128      61/256          0
8   15/64       61/256      121/512         0
9   15/64       121/512     241/1024        0
10  241/1024    121/512     483/2048        1
```
Thus the approximation after 11 iterations of the bisection method is *483 / 2048* and the binary representation is 0.00111100011 (see [WolframAlpha](http://www.wolframalpha.com/input/?i=sqrt%285%29-2+binary))


I published another example on how to approximate PI with fraction.js on my [blog](http://www.xarg.org/2014/03/precise-calculations-in-javascript/) (Still not the best idea to approximate irrational numbers, but it illustrates the capabilities of Fraction.js perfectly).


Get the exact fractional part of a number
---
```javascript
var f = new Fraction("-6.(3416)");
console.log("" + f.mod(1).abs()); // 0.(3416)
```

Mathematical correct modulo
---
The behaviour on negative congruences is different to most modulo implementations in computer science. Even the *mod()* function of Fraction.js behaves in the typical way. To solve the problem of having the mathematical correct modulo with Fraction.js you could come up with this:

```javascript
var a = -1;
var b = 10.99;

console.log(new Fraction(a)
  .mod(b)); // Not correct, usual Modulo

console.log(new Fraction(a)
  .mod(b).add(b).mod(b)); // Correct! Mathematical Modulo
```

fmod() impreciseness circumvented
---
It turns out that Fraction.js outperforms almost any fmod() implementation, including JavaScript itself, [php.js](http://phpjs.org/functions/fmod/), C++, Python, Java and even Wolframalpha due to the fact that numbers like 0.05, 0.1, ... are infinite decimal in base 2.

The equation *fmod(4.55, 0.05)* gives *0.04999999999999957*, wolframalpha says *1/20*. The correct answer should be **zero**, as 0.05 divides 4.55 without any remainder.


Parser
===

Any function (see below) as well as the constructor of the *Fraction* class parses its input and reduce it to the smallest term.

You can pass either Arrays, Objects, Integers, Doubles or Strings.

Arrays / Objects
---
```javascript
new Fraction(numerator, denominator);
new Fraction([numerator, denominator]);
new Fraction({n: numerator, d: denominator});
```

Integers
---
```javascript
new Fraction(123);
```

Doubles
---
```javascript
new Fraction(55.4);
```

**Note:** If you pass a double as it is, Fraction.js will perform a number analysis based on Farey Sequences. If you concern performance, cache Fraction.js objects and pass arrays/objects.

The method is really precise, but too large exact numbers, like 1234567.9991829 will result in a wrong approximation. If you want to keep the number as it is, convert it to a string, as the string parser will not perform any further observations. If you have problems with the approximation, in the file `examples/approx.js` is a different approximation algorithm, which might work better in some more specific use-cases.


Strings
---
```javascript
new Fraction("123.45");
new Fraction("123/45"); // A rational number represented as two decimals, separated by a slash
new Fraction("123:45"); // A rational number represented as two decimals, separated by a colon
new Fraction("4 123/45"); // A rational number represented as a whole number and a fraction
new Fraction("123.'456'"); // Note the quotes, see below!
new Fraction("123.(456)"); // Note the brackets, see below!
new Fraction("123.45'6'"); // Note the quotes, see below!
new Fraction("123.45(6)"); // Note the brackets, see below!
```

Two arguments
---
```javascript
new Fraction(3, 2); // 3/2 = 1.5
```

Repeating decimal places
---
*Fraction.js* can easily handle repeating decimal places. For example *1/3* is *0.3333...*. There is only one repeating digit. As you can see in the examples above, you can pass a number like *1/3* as "0.'3'" or "0.(3)", which are synonym. There are no tests to parse something like 0.166666666 to 1/6! If you really want to handle this number, wrap around brackets on your own with the function below for example: 0.1(66666666)

Assume you want to divide 123.32 / 33.6(567). [WolframAlpha](http://www.wolframalpha.com/input/?i=123.32+%2F+%2812453%2F370%29) states that you'll get a period of 1776 digits. *Fraction.js* comes to the same result. Give it a try:

```javascript
var f = new Fraction("123.32");
console.log("Bam: " + f.div("33.6(567)"));
```

To automatically make a number like "0.123123123" to something more Fraction.js friendly like "0.(123)", I hacked this little brute force algorithm in a 10 minutes. Improvements are welcome...

```javascript
function formatDecimal(str) {

  var comma, pre, offset, pad, times, repeat;

  if (-1 === (comma = str.indexOf(".")))
    return str;

  pre = str.substr(0, comma + 1);
  str = str.substr(comma + 1);

  for (var i = 0; i < str.length; i++) {

    offset = str.substr(0, i);

    for (var j = 0; j < 5; j++) {

      pad = str.substr(i, j + 1);

      times = Math.ceil((str.length - offset.length) / pad.length);

      repeat = new Array(times + 1).join(pad); // Silly String.repeat hack

      if (0 === (offset + repeat).indexOf(str)) {
        return pre + offset + "(" + pad + ")";
      }
    }
  }
  return null;
}

var f, x = formatDecimal("13.0123123123"); // = 13.0(123)
if (x !== null) {
  f = new Fraction(x);
}
```

Attributes
===

The Fraction object allows direct access to the numerator, denominator and sign attributes. It is ensured that only the sign-attribute holds sign information so that a sign comparison is only necessary against this attribute.

```javascript
var f = new Fraction('-1/2');
console.log(f.n); // Numerator: 1
console.log(f.d); // Denominator: 2
console.log(f.s); // Sign: -1
```


Functions
===

Fraction abs()
---
Returns the actual number without any sign information

Fraction neg()
---
Returns the actual number with flipped sign in order to get the additive inverse

Fraction add(n)
---
Returns the sum of the actual number and the parameter n

Fraction sub(n)
---
Returns the difference of the actual number and the parameter n

Fraction mul(n)
---
Returns the product of the actual number and the parameter n

Fraction div(n)
---
Returns the quotient of the actual number and the parameter n

Fraction pow(exp)
---
Returns the power of the actual number, raised to an possible rational exponent. If the result becomes non-rational the function returns `null`.

Fraction mod(n)
---
Returns the modulus (rest of the division) of the actual object and n (this % n). It's a much more precise [fmod()](#fmod-impreciseness-circumvented) if you like. Please note that *mod()* is just like the modulo operator of most programming languages. If you want a mathematical correct modulo, see [here](#mathematical-correct-modulo).

Fraction mod()
---
Returns the modulus (rest of the division) of the actual object (numerator mod denominator)

Fraction gcd(n)
---
Returns the fractional greatest common divisor

Fraction lcm(n)
---
Returns the fractional least common multiple

Fraction ceil([places=0-16])
---
Returns the ceiling of a rational number with Math.ceil

Fraction floor([places=0-16])
---
Returns the floor of a rational number with Math.floor

Fraction round([places=0-16])
---
Returns the rational number rounded with Math.round

Fraction roundTo(multiple)
---
Rounds a fraction to the closest multiple of another fraction. 

Fraction inverse()
---
Returns the multiplicative inverse of the actual number (n / d becomes d / n) in order to get the reciprocal

Fraction simplify([eps=0.001])
---
Simplifies the rational number under a certain error threshold. Ex. `0.333` will be `1/3` with `eps=0.001`

boolean equals(n)
---
Check if two numbers are equal

int compare(n)
---
Compare two numbers.
```
result < 0: n is greater than actual number
result > 0: n is smaller than actual number
result = 0: n is equal to the actual number
```

boolean divisible(n)
---
Check if two numbers are divisible (n divides this)

double valueOf()
---
Returns a decimal representation of the fraction

String toString([decimalPlaces=15])
---
Generates an exact string representation of the actual object. For repeated decimal places all digits are collected within brackets, like `1/3 = "0.(3)"`. For all other numbers, up to `decimalPlaces` significant digits are collected - which includes trailing zeros if the number is getting truncated. However, `1/2 = "0.5"` without trailing zeros of course.

**Note:** As `valueOf()` and `toString()` are provided, `toString()` is only called implicitly in a real string context. Using the plus-operator like `"123" + new Fraction` will call valueOf(), because JavaScript tries to combine two primitives first and concatenates them later, as string will be the more dominant type. `alert(new Fraction)` or `String(new Fraction)` on the other hand will do what you expect. If you really want to have control, you should call `toString()` or `valueOf()` explicitly!

String toLatex(excludeWhole=false)
---
Generates an exact LaTeX representation of the actual object. You can see a [live demo](http://www.xarg.org/2014/03/precise-calculations-in-javascript/) on my blog.

The optional boolean parameter indicates if you want to exclude the whole part. "1 1/3" instead of "4/3"

String toFraction(excludeWhole=false)
---
Gets a string representation of the fraction

The optional boolean parameter indicates if you want to exclude the whole part. "1 1/3" instead of "4/3"

Array toContinued()
---
Gets an array of the fraction represented as a continued fraction. The first element always contains the whole part.

```javascript
var f = new Fraction('88/33');
var c = f.toContinued(); // [2, 1, 2]
```

Fraction clone()
---
Creates a copy of the actual Fraction object


Exceptions
===
If a really hard error occurs (parsing error, division by zero), *fraction.js* throws exceptions! Please make sure you handle them correctly.



Installation
===
Installing fraction.js is as easy as cloning this repo or use the following command:

```
npm install fraction.js
```

Using Fraction.js with the browser
===
```html
<script src="fraction.js"></script>
<script>
    console.log(Fraction("123/456"));
</script>
```

Using Fraction.js with TypeScript
===
```js
import Fraction from "fraction.js";
console.log(Fraction("123/456"));
```

Coding Style
===
As every library I publish, fraction.js is also built to be as small as possible after compressing it with Google Closure Compiler in advanced mode. Thus the coding style orientates a little on maxing-out the compression rate. Please make sure you keep this style if you plan to extend the library.


Precision
===
Fraction.js tries to circumvent floating point errors, by having an internal representation of numerator and denominator. As it relies on JavaScript, there is also a limit. The biggest number representable is `Number.MAX_SAFE_INTEGER / 1` and the smallest is `-1 / Number.MAX_SAFE_INTEGER`, with `Number.MAX_SAFE_INTEGER=9007199254740991`. If this is not enough, there is `bigfraction.js` shipped experimentally, which relies on `BigInt` and should become the new Fraction.js eventually. 

Testing
===
If you plan to enhance the library, make sure you add test cases and all the previous tests are passing. You can test the library with

```
npm test
```


Copyright and licensing
===
Copyright (c) 2023, [Robert Eisele](https://raw.org/)
Licensed under the MIT license.
