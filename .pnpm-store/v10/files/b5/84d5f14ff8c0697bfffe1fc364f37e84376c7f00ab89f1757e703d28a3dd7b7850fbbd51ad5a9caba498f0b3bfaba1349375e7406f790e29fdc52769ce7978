/**
 * @license Fraction.js v4.2.1 20/08/2023
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
 * let f = new Fraction("9.4'31'");
 * f.mul([-4, 3]).div(4.9);
 *
 */

(function(root) {

  "use strict";

  // Set Identity function to downgrade BigInt to Number if needed
  if (typeof BigInt === 'undefined') BigInt = function(n) { if (isNaN(n)) throw new Error(""); return n; };

  const C_ONE = BigInt(1);
  const C_ZERO = BigInt(0);
  const C_TEN = BigInt(10);
  const C_TWO = BigInt(2);
  const C_FIVE = BigInt(5);

  // Maximum search depth for cyclic rational numbers. 2000 should be more than enough.
  // Example: 1/7 = 0.(142857) has 6 repeating decimal places.
  // If MAX_CYCLE_LEN gets reduced, long cycles will not be detected and toString() only gets the first 10 digits
  const MAX_CYCLE_LEN = 2000;

  // Parsed data to avoid calling "new" all the time
  const P = {
    "s": C_ONE,
    "n": C_ZERO,
    "d": C_ONE
  };

  function assign(n, s) {

    try {
      n = BigInt(n);
    } catch (e) {
      throw InvalidParameter();
    }
    return n * s;
  }

  // Creates a new Fraction internally without the need of the bulky constructor
  function newFraction(n, d) {

    if (d === C_ZERO) {
      throw DivisionByZero();
    }

    const f = Object.create(Fraction.prototype);
    f["s"] = n < C_ZERO ? -C_ONE : C_ONE;

    n = n < C_ZERO ? -n : n;

    const a = gcd(n, d);

    f["n"] = n / a;
    f["d"] = d / a;
    return f;
  }

  function factorize(num) {

    const factors = {};

    let n = num;
    let i = C_TWO;
    let s = C_FIVE - C_ONE;

    while (s <= n) {

      while (n % i === C_ZERO) {
        n/= i;
        factors[i] = (factors[i] || C_ZERO) + C_ONE;
      }
      s+= C_ONE + C_TWO * i++;
    }

    if (n !== num) {
      if (n > 1)
        factors[n] = (factors[n] || C_ZERO) + C_ONE;
    } else {
      factors[num] = (factors[num] || C_ZERO) + C_ONE;
    }
    return factors;
  }

  const parse = function(p1, p2) {

    let n = C_ZERO, d = C_ONE, s = C_ONE;

    if (p1 === undefined || p1 === null) {
      /* void */
    } else if (p2 !== undefined) {
      n = BigInt(p1);
      d = BigInt(p2);
      s = n * d;

      if (n % C_ONE !== C_ZERO || d % C_ONE !== C_ZERO) {
        throw NonIntegerParameter();
      }

    } else if (typeof p1 === "object") {
      if ("d" in p1 && "n" in p1) {
        n = BigInt(p1["n"]);
        d = BigInt(p1["d"]);
        if ("s" in p1)
          n*= BigInt(p1["s"]);
      } else if (0 in p1) {
        n = BigInt(p1[0]);
        if (1 in p1)
          d = BigInt(p1[1]);
      } else if (p1 instanceof BigInt) {
        n = BigInt(p1);
      } else {
        throw InvalidParameter();
      }
      s = n * d;
    } else if (typeof p1 === "bigint") {
      n = p1;
      s = p1;
      d = C_ONE;
    } else if (typeof p1 === "number") {

      if (isNaN(p1)) {
        throw InvalidParameter();
      }

      if (p1 < 0) {
        s = -C_ONE;
        p1 = -p1;
      }

      if (p1 % 1 === 0) {
        n = BigInt(p1);
      } else if (p1 > 0) { // check for != 0, scale would become NaN (log(0)), which converges really slow

        let z = 1;

        let A = 0, B = 1;
        let C = 1, D = 1;

        let N = 10000000;

        if (p1 >= 1) {
          z = 10 ** Math.floor(1 + Math.log10(p1));
          p1/= z;
        }

        // Using Farey Sequences

        while (B <= N && D <= N) {
          let M = (A + C) / (B + D);

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
        n = BigInt(n) * BigInt(z);
        d = BigInt(d);

      }

    } else if (typeof p1 === "string") {

      let ndx = 0;

      let v = C_ZERO, w = C_ZERO, x = C_ZERO, y = C_ONE, z = C_ONE;

      let match = p1.match(/\d+|./g);

      if (match === null)
        throw InvalidParameter();

      if (match[ndx] === '-') {// Check for minus sign at the beginning
        s = -C_ONE;
        ndx++;
      } else if (match[ndx] === '+') {// Check for plus sign at the beginning
        ndx++;
      }

      if (match.length === ndx + 1) { // Check if it's just a simple number "1234"
        w = assign(match[ndx++], s);
      } else if (match[ndx + 1] === '.' || match[ndx] === '.') { // Check if it's a decimal number

        if (match[ndx] !== '.') { // Handle 0.5 and .5
          v = assign(match[ndx++], s);
        }
        ndx++;

        // Check for decimal places
        if (ndx + 1 === match.length || match[ndx + 1] === '(' && match[ndx + 3] === ')' || match[ndx + 1] === "'" && match[ndx + 3] === "'") {
          w = assign(match[ndx], s);
          y = C_TEN ** BigInt(match[ndx].length);
          ndx++;
        }

        // Check for repeating places
        if (match[ndx] === '(' && match[ndx + 2] === ')' || match[ndx] === "'" && match[ndx + 2] === "'") {
          x = assign(match[ndx + 1], s);
          z = C_TEN ** BigInt(match[ndx + 1].length) - C_ONE;
          ndx+= 3;
        }

      } else if (match[ndx + 1] === '/' || match[ndx + 1] === ':') { // Check for a simple fraction "123/456" or "123:456"
        w = assign(match[ndx], s);
        y = assign(match[ndx + 2], C_ONE);
        ndx+= 3;
      } else if (match[ndx + 3] === '/' && match[ndx + 1] === ' ') { // Check for a complex fraction "123 1/2"
        v = assign(match[ndx], s);
        w = assign(match[ndx + 2], s);
        y = assign(match[ndx + 4], C_ONE);
        ndx+= 5;
      }

      if (match.length <= ndx) { // Check for more tokens on the stack
        d = y * z;
        s = /* void */
        n = x + d * v + z * w;
      } else {
        throw InvalidParameter();
      }

    } else {
      throw InvalidParameter();
    }

    if (d === C_ZERO) {
      throw DivisionByZero();
    }

    P["s"] = s < C_ZERO ? -C_ONE : C_ONE;
    P["n"] = n < C_ZERO ? -n : n;
    P["d"] = d < C_ZERO ? -d : d;
  };

  function modpow(b, e, m) {

    let r = C_ONE;
    for (; e > C_ZERO; b = (b * b) % m, e >>= C_ONE) {

      if (e & C_ONE) {
        r = (r * b) % m;
      }
    }
    return r;
  }

  function cycleLen(n, d) {

    for (; d % C_TWO === C_ZERO;
      d/= C_TWO) {
    }

    for (; d % C_FIVE === C_ZERO;
      d/= C_FIVE) {
    }

    if (d === C_ONE) // Catch non-cyclic numbers
      return C_ZERO;

    // If we would like to compute really large numbers quicker, we could make use of Fermat's little theorem:
    // 10^(d-1) % d == 1
    // However, we don't need such large numbers and MAX_CYCLE_LEN should be the capstone,
    // as we want to translate the numbers to strings.

    let rem = C_TEN % d;
    let t = 1;

    for (; rem !== C_ONE; t++) {
      rem = rem * C_TEN % d;

      if (t > MAX_CYCLE_LEN)
        return C_ZERO; // Returning 0 here means that we don't print it as a cyclic number. It's likely that the answer is `d-1`
    }
    return BigInt(t);
  }

  function cycleStart(n, d, len) {

    let rem1 = C_ONE;
    let rem2 = modpow(C_TEN, len, d);

    for (let t = 0; t < 300; t++) { // s < ~log10(Number.MAX_VALUE)
      // Solve 10^s == 10^(s+t) (mod d)

      if (rem1 === rem2)
        return BigInt(t);

      rem1 = rem1 * C_TEN % d;
      rem2 = rem2 * C_TEN % d;
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
  }

  /**
   * Module constructor
   *
   * @constructor
   * @param {number|Fraction=} a
   * @param {number=} b
   */
  function Fraction(a, b) {

    parse(a, b);

    if (this instanceof Fraction) {
      a = gcd(P["d"], P["n"]); // Abuse a
      this["s"] = P["s"];
      this["n"] = P["n"] / a;
      this["d"] = P["d"] / a;
    } else {
      return newFraction(P['s'] * P['n'], P['d']);
    }
  }

  var DivisionByZero = function() {return new Error("Division by Zero");};
  var InvalidParameter = function() {return new Error("Invalid argument");};
  var NonIntegerParameter = function() {return new Error("Parameters must be integer");};

  Fraction.prototype = {

    "s": C_ONE,
    "n": C_ZERO,
    "d": C_ONE,

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

      if (a === undefined) {
        return newFraction(this["s"] * this["n"] % this["d"], C_ONE);
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

      if (P["n"] === C_ZERO && this["n"] === C_ZERO) {
        return newFraction(C_ZERO, C_ONE);
      }
      return newFraction(P["n"] * this["n"], gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]));
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
     * Calculates the fraction to some integer exponent
     *
     * Ex: new Fraction(-1,2).pow(-3) => -8
     */
    "pow": function(a, b) {

      parse(a, b);

      // Trivial case when exp is an integer

      if (P['d'] === C_ONE) {

        if (P['s'] < C_ZERO) {
          return newFraction((this['s'] * this["d"]) ** P['n'], this["n"] ** P['n']);
        } else {
          return newFraction((this['s'] * this["n"]) ** P['n'], this["d"] ** P['n']);
        }
      }

      // Negative roots become complex
      //     (-a/b)^(c/d) = x
      // <=> (-1)^(c/d) * (a/b)^(c/d) = x
      // <=> (cos(pi) + i*sin(pi))^(c/d) * (a/b)^(c/d) = x
      // <=> (cos(c*pi/d) + i*sin(c*pi/d)) * (a/b)^(c/d) = x       # DeMoivre's formula
      // From which follows that only for c=0 the root is non-complex
      if (this['s'] < C_ZERO) return null;

      // Now prime factor n and d
      let N = factorize(this['n']);
      let D = factorize(this['d']);

      // Exponentiate and take root for n and d individually
      let n = C_ONE;
      let d = C_ONE;
      for (let k in N) {
        if (k === '1') continue;
        if (k === '0') {
          n = C_ZERO;
          break;
        }
        N[k]*= P['n'];

        if (N[k] % P['d'] === C_ZERO) {
          N[k]/= P['d'];
        } else return null;
        n*= BigInt(k) ** N[k];
      }

      for (let k in D) {
        if (k === '1') continue;
        D[k]*= P['n'];

        if (D[k] % P['d'] === C_ZERO) {
          D[k]/= P['d'];
        } else return null;
        d*= BigInt(k) ** D[k];
      }

      if (P['s'] < C_ZERO) {
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
      let t = (this["s"] * this["n"] * P["d"] - P["s"] * P["n"] * this["d"]);

      return (C_ZERO < t) - (t < C_ZERO);
    },

    /**
     * Calculates the ceil of a rational number
     *
     * Ex: new Fraction('4.(3)').ceil() => (5 / 1)
     **/
    "ceil": function(places) {

      places = C_TEN ** BigInt(places || 0);

      return newFraction(this["s"] * places * this["n"] / this["d"] +
        (places * this["n"] % this["d"] > C_ZERO && this["s"] >= C_ZERO ? C_ONE : C_ZERO),
        places);
    },

    /**
     * Calculates the floor of a rational number
     *
     * Ex: new Fraction('4.(3)').floor() => (4 / 1)
     **/
    "floor": function(places) {

      places = C_TEN ** BigInt(places || 0);

      return newFraction(this["s"] * places * this["n"] / this["d"] -
        (places * this["n"] % this["d"] > C_ZERO && this["s"] < C_ZERO ? C_ONE : C_ZERO),
        places);
    },

    /**
     * Rounds a rational numbers
     *
     * Ex: new Fraction('4.(3)').round() => (4 / 1)
     **/
    "round": function(places) {

      places = C_TEN ** BigInt(places || 0);

      /* Derivation:

      s >= 0:
        round(n / d) = trunc(n / d) + (n % d) / d >= 0.5 ? 1 : 0
                     = trunc(n / d) + 2(n % d) >= d ? 1 : 0
      s < 0:
        round(n / d) =-trunc(n / d) - (n % d) / d > 0.5 ? 1 : 0
                     =-trunc(n / d) - 2(n % d) > d ? 1 : 0

      =>:

      round(s * n / d) = s * trunc(n / d) + s * (C + 2(n % d) > d ? 1 : 0)
          where C = s >= 0 ? 1 : 0, to fix the >= for the positve case.
      */

      return newFraction(this["s"] * places * this["n"] / this["d"] +
        this["s"] * ((this["s"] >= C_ZERO ? C_ONE : C_ZERO) + C_TWO * (places * this["n"] % this["d"]) > this["d"] ? C_ONE : C_ZERO),
        places);
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
      // Best we can do so far
      return Number(this["s"] * this["n"]) / Number(this["d"]);
    },

    /**
     * Creates a string representation of a fraction with all digits
     *
     * Ex: new Fraction("100.'91823'").toString() => "100.(91823)"
     **/
    'toString': function(dec) {

      let N = this["n"];
      let D = this["d"];

      function trunc(x) {
          return typeof x === 'bigint' ? x : Math.floor(x);
      }

      dec = dec || 15; // 15 = decimal places when no repetition

      let cycLen = cycleLen(N, D); // Cycle length
      let cycOff = cycleStart(N, D, cycLen); // Cycle start

      let str = this['s'] < C_ZERO ? "-" : "";

      // Append integer part
      str+= trunc(N / D);

      N%= D;
      N*= C_TEN;

      if (N)
        str+= ".";

      if (cycLen) {

        for (let i = cycOff; i--;) {
          str+= trunc(N / D);
          N%= D;
          N*= C_TEN;
        }
        str+= "(";
        for (let i = cycLen; i--;) {
          str+= trunc(N / D);
          N%= D;
          N*= C_TEN;
        }
        str+= ")";
      } else {
        for (let i = dec; N && i--;) {
          str+= trunc(N / D);
          N%= D;
          N*= C_TEN;
        }
      }
      return str;
    },

    /**
     * Returns a string-fraction representation of a Fraction object
     *
     * Ex: new Fraction("1.'3'").toFraction() => "4 1/3"
     **/
    'toFraction': function(excludeWhole) {

      let n = this["n"];
      let d = this["d"];
      let str = this['s'] < C_ZERO ? "-" : "";

      if (d === C_ONE) {
        str+= n;
      } else {
        let whole = n / d;
        if (excludeWhole && whole > C_ZERO) {
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

      let n = this["n"];
      let d = this["d"];
      let str = this['s'] < C_ZERO ? "-" : "";

      if (d === C_ONE) {
        str+= n;
      } else {
        let whole = n / d;
        if (excludeWhole && whole > C_ZERO) {
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

      let a = this['n'];
      let b = this['d'];
      let res = [];

      do {
        res.push(a / b);
        let t = a % b;
        a = b;
        b = t;
      } while (a !== C_ONE);

      return res;
    },

    "simplify": function(eps) {

      eps = eps || 0.001;

      const thisABS = this['abs']();
      const cont = thisABS['toContinued']();

      for (let i = 1; i < cont.length; i++) {

        let s = newFraction(cont[i - 1], C_ONE);
        for (let k = i - 2; k >= 0; k--) {
          s = s['inverse']()['add'](cont[k]);
        }

        if (Math.abs(s['sub'](thisABS).valueOf()) < eps) {
          return s['mul'](this['s']);
        }
      }
      return this;
    }
  };

  if (typeof define === "function" && define["amd"]) {
    define([], function() {
      return Fraction;
    });
  } else if (typeof exports === "object") {
    Object.defineProperty(exports, "__esModule", { 'value': true });
    Fraction['default'] = Fraction;
    Fraction['Fraction'] = Fraction;
    module['exports'] = Fraction;
  } else {
    root['Fraction'] = Fraction;
  }

})(this);
