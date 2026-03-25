/**
 * @license Fraction.js v4.3.7 31/08/2023
 * https://www.xarg.org/2014/03/rational-numbers-in-javascript/
 *
 * Copyright (c) 2023, Robert Eisele (robert@raw.org)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 **/


/**
 *
 * This class offers the possibility to calculate fractions.
 * You can pass a fraction in different formats. Either as array, as double, as string or as an integer.
 *
 * Array/Object form
 * [ 0 => <numerator>, 1 => <denominator> ]
 * [ n => <numerator>, d => <denominator> ]
 *
 * Integer form
 * - Single integer value
 *
 * Double form
 * - Single double value
 *
 * String form
 * 123.456 - a simple double
 * 123/456 - a string fraction
 * 123.'456' - a double with repeating decimal places
 * 123.(456) - synonym
 * 123.45'6' - a double with repeating last place
 * 123.45(6) - synonym
 *
 * Example:
 *
 * var f = new Fraction("9.4'31'");
 * f.mul([-4, 3]).div(4.9);
 *
 */


// Maximum search depth for cyclic rational numbers. 2000 should be more than enough.
// Example: 1/7 = 0.(142857) has 6 repeating decimal places.
// If MAX_CYCLE_LEN gets reduced, long cycles will not be detected and toString() only gets the first 10 digits
var MAX_CYCLE_LEN = 2000;

// Parsed data to avoid calling "new" all the time
var P = {
  "s": 1,
  "n": 0,
  "d": 1
};

function assign(n, s) {

  if (isNaN(n = parseInt(n, 10))) {
    throw InvalidParameter();
  }
  return n * s;
}

// Creates a new Fraction internally without the need of the bulky constructor
function newFraction(n, d) {

  if (d === 0) {
    throw DivisionByZero();
  }

  var f = Object.create(Fraction.prototype);
  f["s"] = n < 0 ? -1 : 1;

  n = n < 0 ? -n : n;

  var a = gcd(n, d);

  f["n"] = n / a;
  f["d"] = d / a;
  return f;
}

function factorize(num) {

  var factors = {};

  var n = num;
  var i = 2;
  var s = 4;

  while (s <= n) {

    while (n % i === 0) {
      n/= i;
      factors[i] = (factors[i] || 0) + 1;
    }
    s+= 1 + 2 * i++;
  }

  if (n !== num) {
    if (n > 1)
      factors[n] = (factors[n] || 0) + 1;
  } else {
    factors[num] = (factors[num] || 0) + 1;
  }
  return factors;
}

var parse = function(p1, p2) {

  var n = 0, d = 1, s = 1;
  var v = 0, w = 0, x = 0, y = 1, z = 1;

  var A = 0, B = 1;
  var C = 1, D = 1;

  var N = 10000000;
  var M;

  if (p1 === undefined || p1 === null) {
    /* void */
  } else if (p2 !== undefined) {
    n = p1;
    d = p2;
    s = n * d;

    if (n % 1 !== 0 || d % 1 !== 0) {
      throw NonIntegerParameter();
    }

  } else
    switch (typeof p1) {

      case "object":
        {
          if ("d" in p1 && "n" in p1) {
            n = p1["n"];
            d = p1["d"];
            if ("s" in p1)
              n*= p1["s"];
          } else if (0 in p1) {
            n = p1[0];
            if (1 in p1)
              d = p1[1];
          } else {
            throw InvalidParameter();
          }
          s = n * d;
          break;
        }
      case "number":
        {
          if (p1 < 0) {
            s = p1;
            p1 = -p1;
          }

          if (p1 % 1 === 0) {
            n = p1;
          } else if (p1 > 0) { // check for != 0, scale would become NaN (log(0)), which converges really slow

            if (p1 >= 1) {
              z = Math.pow(10, Math.floor(1 + Math.log(p1) / Math.LN10));
              p1/= z;
            }

            // Using Farey Sequences
            // http://www.johndcook.com/blog/2010/10/20/best-rational-approximation/

            while (B <= N && D <= N) {
              M = (A + C) / (B + D);

              if (p1 === M) {
                if (B + D <= N) {
                  n = A + C;
                  d = B + D;
                } else if (D > B) {
                  n = C;
                  d = D;
                } else {
                  n = A;
                  d = B;
                }
                break;

              } else {

                if (p1 > M) {
                  A+= C;
                  B+= D;
                } else {
                  C+= A;
                  D+= B;
                }

                if (B > N) {
                  n = C;
                  d = D;
                } else {
                  n = A;
                  d = B;
                }
              }
            }
            n*= z;
          } else if (isNaN(p1) || isNaN(p2)) {
            d = n = NaN;
          }
          break;
        }
      case "string":
        {
          B = p1.match(/\d+|./g);

          if (B === null)
            throw InvalidParameter();

          if (B[A] === '-') {// Check for minus sign at the beginning
            s = -1;
            A++;
          } else if (B[A] === '+') {// Check for plus sign at the beginning
            A++;
          }

          if (B.length === A + 1) { // Check if it's just a simple number "1234"
            w = assign(B[A++], s);
          } else if (B[A + 1] === '.' || B[A] === '.') { // Check if it's a decimal number

            if (B[A] !== '.') { // Handle 0.5 and .5
              v = assign(B[A++], s);
            }
            A++;

            // Check for decimal places
            if (A + 1 === B.length || B[A + 1] === '(' && B[A + 3] === ')' || B[A + 1] === "'" && B[A + 3] === "'") {
              w = assign(B[A], s);
              y = Math.pow(10, B[A].length);
              A++;
            }

            // Check for repeating places
            if (B[A] === '(' && B[A + 2] === ')' || B[A] === "'" && B[A + 2] === "'") {
              x = assign(B[A + 1], s);
              z = Math.pow(10, B[A + 1].length) - 1;
              A+= 3;
            }

          } else if (B[A + 1] === '/' || B[A + 1] === ':') { // Check for a simple fraction "123/456" or "123:456"
            w = assign(B[A], s);
            y = assign(B[A + 2], 1);
            A+= 3;
          } else if (B[A + 3] === '/' && B[A + 1] === ' ') { // Check for a complex fraction "123 1/2"
            v = assign(B[A], s);
            w = assign(B[A + 2], s);
            y = assign(B[A + 4], 1);
            A+= 5;
          }

          if (B.length <= A) { // Check for more tokens on the stack
            d = y * z;
            s = /* void */
            n = x + d * v + z * w;
            break;
          }

          /* Fall through on error */
        }
      default:
        throw InvalidParameter();
    }

  if (d === 0) {
    throw DivisionByZero();
  }

  P["s"] = s < 0 ? -1 : 1;
  P["n"] = Math.abs(n);
  P["d"] = Math.abs(d);
};

function modpow(b, e, m) {

  var r = 1;
  for (; e > 0; b = (b * b) % m, e >>= 1) {

    if (e & 1) {
      r = (r * b) % m;
    }
  }
  return r;
}


function cycleLen(n, d) {

  for (; d % 2 === 0;
    d/= 2) {
  }

  for (; d % 5 === 0;
    d/= 5) {
  }

  if (d === 1) // Catch non-cyclic numbers
    return 0;

  // If we would like to compute really large numbers quicker, we could make use of Fermat's little theorem:
  // 10^(d-1) % d == 1
  // However, we don't need such large numbers and MAX_CYCLE_LEN should be the capstone,
  // as we want to translate the numbers to strings.

  var rem = 10 % d;
  var t = 1;

  for (; rem !== 1; t++) {
    rem = rem * 10 % d;

    if (t > MAX_CYCLE_LEN)
      return 0; // Returning 0 here means that we don't print it as a cyclic number. It's likely that the answer is `d-1`
  }
  return t;
}


function cycleStart(n, d, len) {

  var rem1 = 1;
  var rem2 = modpow(10, len, d);

  for (var t = 0; t < 300; t++) { // s < ~log10(Number.MAX_VALUE)
    // Solve 10^s == 10^(s+t) (mod d)

    if (rem1 === rem2)
      return t;

    rem1 = rem1 * 10 % d;
    rem2 = rem2 * 10 % d;
  }
  return 0;
}

function gcd(a, b) {

  if (!a)
    return b;
  if (!b)
    return a;

  while (1) {
    a%= b;
    if (!a)
      return b;
    b%= a;
    if (!b)
      return a;
  }
};

/**
 * Module constructor
 *
 * @constructor
 * @param {number|Fraction=} a
 * @param {number=} b
 */
export default function Fraction(a, b) {

  parse(a, b);

  if (this instanceof Fraction) {
    a = gcd(P["d"], P["n"]); // Abuse variable a
    this["s"] = P["s"];
    this["n"] = P["n"] / a;
    this["d"] = P["d"] / a;
  } else {
    return newFraction(P['s'] * P['n'], P['d']);
  }
}

var DivisionByZero = function() { return new Error("Division by Zero"); };
var InvalidParameter = function() { return new Error("Invalid argument"); };
var NonIntegerParameter = function() { return new Error("Parameters must be integer"); };

Fraction.prototype = {

  "s": 1,
  "n": 0,
  "d": 1,

  /**
   * Calculates the absolute value
   *
   * Ex: new Fraction(-4).abs() => 4
   **/
  "abs": function() {

    return newFraction(this["n"], this["d"]);
  },

  /**
   * Inverts the sign of the current fraction
   *
   * Ex: new Fraction(-4).neg() => 4
   **/
  "neg": function() {

    return newFraction(-this["s"] * this["n"], this["d"]);
  },

  /**
   * Adds two rational numbers
   *
   * Ex: new Fraction({n: 2, d: 3}).add("14.9") => 467 / 30
   **/
  "add": function(a, b) {

    parse(a, b);
    return newFraction(
      this["s"] * this["n"] * P["d"] + P["s"] * this["d"] * P["n"],
      this["d"] * P["d"]
    );
  },

  /**
   * Subtracts two rational numbers
   *
   * Ex: new Fraction({n: 2, d: 3}).add("14.9") => -427 / 30
   **/
  "sub": function(a, b) {

    parse(a, b);
    return newFraction(
      this["s"] * this["n"] * P["d"] - P["s"] * this["d"] * P["n"],
      this["d"] * P["d"]
    );
  },

  /**
   * Multiplies two rational numbers
   *
   * Ex: new Fraction("-17.(345)").mul(3) => 5776 / 111
   **/
  "mul": function(a, b) {

    parse(a, b);
    return newFraction(
      this["s"] * P["s"] * this["n"] * P["n"],
      this["d"] * P["d"]
    );
  },

  /**
   * Divides two rational numbers
   *
   * Ex: new Fraction("-17.(345)").inverse().div(3)
   **/
  "div": function(a, b) {

    parse(a, b);
    return newFraction(
      this["s"] * P["s"] * this["n"] * P["d"],
      this["d"] * P["n"]
    );
  },

  /**
   * Clones the actual object
   *
   * Ex: new Fraction("-17.(345)").clone()
   **/
  "clone": function() {
    return newFraction(this['s'] * this['n'], this['d']);
  },

  /**
   * Calculates the modulo of two rational numbers - a more precise fmod
   *
   * Ex: new Fraction('4.(3)').mod([7, 8]) => (13/3) % (7/8) = (5/6)
   **/
  "mod": function(a, b) {

    if (isNaN(this['n']) || isNaN(this['d'])) {
      return new Fraction(NaN);
    }

    if (a === undefined) {
      return newFraction(this["s"] * this["n"] % this["d"], 1);
    }

    parse(a, b);
    if (0 === P["n"] && 0 === this["d"]) {
      throw DivisionByZero();
    }

    /*
     * First silly attempt, kinda slow
     *
     return that["sub"]({
     "n": num["n"] * Math.floor((this.n / this.d) / (num.n / num.d)),
     "d": num["d"],
     "s": this["s"]
     });*/

    /*
     * New attempt: a1 / b1 = a2 / b2 * q + r
     * => b2 * a1 = a2 * b1 * q + b1 * b2 * r
     * => (b2 * a1 % a2 * b1) / (b1 * b2)
     */
    return newFraction(
      this["s"] * (P["d"] * this["n"]) % (P["n"] * this["d"]),
      P["d"] * this["d"]
    );
  },

  /**
   * Calculates the fractional gcd of two rational numbers
   *
   * Ex: new Fraction(5,8).gcd(3,7) => 1/56
   */
  "gcd": function(a, b) {

    parse(a, b);

    // gcd(a / b, c / d) = gcd(a, c) / lcm(b, d)

    return newFraction(gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]), P["d"] * this["d"]);
  },

  /**
   * Calculates the fractional lcm of two rational numbers
   *
   * Ex: new Fraction(5,8).lcm(3,7) => 15
   */
  "lcm": function(a, b) {

    parse(a, b);

    // lcm(a / b, c / d) = lcm(a, c) / gcd(b, d)

    if (P["n"] === 0 && this["n"] === 0) {
      return newFraction(0, 1);
    }
    return newFraction(P["n"] * this["n"], gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]));
  },

  /**
   * Calculates the ceil of a rational number
   *
   * Ex: new Fraction('4.(3)').ceil() => (5 / 1)
   **/
  "ceil": function(places) {

    places = Math.pow(10, places || 0);

    if (isNaN(this["n"]) || isNaN(this["d"])) {
      return new Fraction(NaN);
    }
    return newFraction(Math.ceil(places * this["s"] * this["n"] / this["d"]), places);
  },

  /**
   * Calculates the floor of a rational number
   *
   * Ex: new Fraction('4.(3)').floor() => (4 / 1)
   **/
  "floor": function(places) {

    places = Math.pow(10, places || 0);

    if (isNaN(this["n"]) || isNaN(this["d"])) {
      return new Fraction(NaN);
    }
    return newFraction(Math.floor(places * this["s"] * this["n"] / this["d"]), places);
  },

  /**
   * Rounds a rational number
   *
   * Ex: new Fraction('4.(3)').round() => (4 / 1)
   **/
  "round": function(places) {

    places = Math.pow(10, places || 0);

    if (isNaN(this["n"]) || isNaN(this["d"])) {
      return new Fraction(NaN);
    }
    return newFraction(Math.round(places * this["s"] * this["n"] / this["d"]), places);
  },

  /**
   * Rounds a rational number to a multiple of another rational number
   *
   * Ex: new Fraction('0.9').roundTo("1/8") => 7 / 8
   **/
  "roundTo": function(a, b) {

    /*
    k * x/y ≤ a/b < (k+1) * x/y
    ⇔ k ≤ a/b / (x/y) < (k+1)
    ⇔ k = floor(a/b * y/x)
    */

    parse(a, b);

    return newFraction(this['s'] * Math.round(this['n'] * P['d'] / (this['d'] * P['n'])) * P['n'], P['d']);
  },

  /**
   * Gets the inverse of the fraction, means numerator and denominator are exchanged
   *
   * Ex: new Fraction([-3, 4]).inverse() => -4 / 3
   **/
  "inverse": function() {

    return newFraction(this["s"] * this["d"], this["n"]);
  },

  /**
   * Calculates the fraction to some rational exponent, if possible
   *
   * Ex: new Fraction(-1,2).pow(-3) => -8
   */
  "pow": function(a, b) {

    parse(a, b);

    // Trivial case when exp is an integer

    if (P['d'] === 1) {

      if (P['s'] < 0) {
        return newFraction(Math.pow(this['s'] * this["d"], P['n']), Math.pow(this["n"], P['n']));
      } else {
        return newFraction(Math.pow(this['s'] * this["n"], P['n']), Math.pow(this["d"], P['n']));
      }
    }

    // Negative roots become complex
    //     (-a/b)^(c/d) = x
    // <=> (-1)^(c/d) * (a/b)^(c/d) = x
    // <=> (cos(pi) + i*sin(pi))^(c/d) * (a/b)^(c/d) = x         # rotate 1 by 180°
    // <=> (cos(c*pi/d) + i*sin(c*pi/d)) * (a/b)^(c/d) = x       # DeMoivre's formula in Q ( https://proofwiki.org/wiki/De_Moivre%27s_Formula/Rational_Index )
    // From which follows that only for c=0 the root is non-complex. c/d is a reduced fraction, so that sin(c/dpi)=0 occurs for d=1, which is handled by our trivial case.
    if (this['s'] < 0) return null;

    // Now prime factor n and d
    var N = factorize(this['n']);
    var D = factorize(this['d']);

    // Exponentiate and take root for n and d individually
    var n = 1;
    var d = 1;
    for (var k in N) {
      if (k === '1') continue;
      if (k === '0') {
        n = 0;
        break;
      }
      N[k]*= P['n'];

      if (N[k] % P['d'] === 0) {
        N[k]/= P['d'];
      } else return null;
      n*= Math.pow(k, N[k]);
    }

    for (var k in D) {
      if (k === '1') continue;
      D[k]*= P['n'];

      if (D[k] % P['d'] === 0) {
        D[k]/= P['d'];
      } else return null;
      d*= Math.pow(k, D[k]);
    }

    if (P['s'] < 0) {
      return newFraction(d, n);
    }
    return newFraction(n, d);
  },

  /**
   * Check if two rational numbers are the same
   *
   * Ex: new Fraction(19.6).equals([98, 5]);
   **/
  "equals": function(a, b) {

    parse(a, b);
    return this["s"] * this["n"] * P["d"] === P["s"] * P["n"] * this["d"]; // Same as compare() === 0
  },

  /**
   * Check if two rational numbers are the same
   *
   * Ex: new Fraction(19.6).equals([98, 5]);
   **/
  "compare": function(a, b) {

    parse(a, b);
    var t = (this["s"] * this["n"] * P["d"] - P["s"] * P["n"] * this["d"]);
    return (0 < t) - (t < 0);
  },

  "simplify": function(eps) {

    if (isNaN(this['n']) || isNaN(this['d'])) {
      return this;
    }

    eps = eps || 0.001;

    var thisABS = this['abs']();
    var cont = thisABS['toContinued']();

    for (var i = 1; i < cont.length; i++) {

      var s = newFraction(cont[i - 1], 1);
      for (var k = i - 2; k >= 0; k--) {
        s = s['inverse']()['add'](cont[k]);
      }

      if (Math.abs(s['sub'](thisABS).valueOf()) < eps) {
        return s['mul'](this['s']);
      }
    }
    return this;
  },

  /**
   * Check if two rational numbers are divisible
   *
   * Ex: new Fraction(19.6).divisible(1.5);
   */
  "divisible": function(a, b) {

    parse(a, b);
    return !(!(P["n"] * this["d"]) || ((this["n"] * P["d"]) % (P["n"] * this["d"])));
  },

  /**
   * Returns a decimal representation of the fraction
   *
   * Ex: new Fraction("100.'91823'").valueOf() => 100.91823918239183
   **/
  'valueOf': function() {

    return this["s"] * this["n"] / this["d"];
  },

  /**
   * Returns a string-fraction representation of a Fraction object
   *
   * Ex: new Fraction("1.'3'").toFraction(true) => "4 1/3"
   **/
  'toFraction': function(excludeWhole) {

    var whole, str = "";
    var n = this["n"];
    var d = this["d"];
    if (this["s"] < 0) {
      str+= '-';
    }

    if (d === 1) {
      str+= n;
    } else {

      if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
        str+= whole;
        str+= " ";
        n%= d;
      }

      str+= n;
      str+= '/';
      str+= d;
    }
    return str;
  },

  /**
   * Returns a latex representation of a Fraction object
   *
   * Ex: new Fraction("1.'3'").toLatex() => "\frac{4}{3}"
   **/
  'toLatex': function(excludeWhole) {

    var whole, str = "";
    var n = this["n"];
    var d = this["d"];
    if (this["s"] < 0) {
      str+= '-';
    }

    if (d === 1) {
      str+= n;
    } else {

      if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
        str+= whole;
        n%= d;
      }

      str+= "\\frac{";
      str+= n;
      str+= '}{';
      str+= d;
      str+= '}';
    }
    return str;
  },

  /**
   * Returns an array of continued fraction elements
   *
   * Ex: new Fraction("7/8").toContinued() => [0,1,7]
   */
  'toContinued': function() {

    var t;
    var a = this['n'];
    var b = this['d'];
    var res = [];

    if (isNaN(a) || isNaN(b)) {
      return res;
    }

    do {
      res.push(Math.floor(a / b));
      t = a % b;
      a = b;
      b = t;
    } while (a !== 1);

    return res;
  },

  /**
   * Creates a string representation of a fraction with all digits
   *
   * Ex: new Fraction("100.'91823'").toString() => "100.(91823)"
   **/
  'toString': function(dec) {

    var N = this["n"];
    var D = this["d"];

    if (isNaN(N) || isNaN(D)) {
      return "NaN";
    }

    dec = dec || 15; // 15 = decimal places when no repetation

    var cycLen = cycleLen(N, D); // Cycle length
    var cycOff = cycleStart(N, D, cycLen); // Cycle start

    var str = this['s'] < 0 ? "-" : "";

    str+= N / D | 0;

    N%= D;
    N*= 10;

    if (N)
      str+= ".";

    if (cycLen) {

      for (var i = cycOff; i--;) {
        str+= N / D | 0;
        N%= D;
        N*= 10;
      }
      str+= "(";
      for (var i = cycLen; i--;) {
        str+= N / D | 0;
        N%= D;
        N*= 10;
      }
      str+= ")";
    } else {
      for (var i = dec; N && i--;) {
        str+= N / D | 0;
        N%= D;
        N*= 10;
      }
    }
    return str;
  }
};
