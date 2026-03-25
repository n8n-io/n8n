/**
 * RSA Key Generation Worker.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2013 Digital Bazaar, Inc.
 */
// worker is built using CommonJS syntax to include all code in one worker file
//importScripts('jsbn.js');
var forge = require('./forge');
require('./jsbn');

// prime constants
var LOW_PRIMES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997];
var LP_LIMIT = (1 << 26) / LOW_PRIMES[LOW_PRIMES.length - 1];

var BigInteger = forge.jsbn.BigInteger;
var BIG_TWO = new BigInteger(null);
BIG_TWO.fromInt(2);

self.addEventListener('message', function(e) {
  var result = findPrime(e.data);
  self.postMessage(result);
});

// start receiving ranges to check
self.postMessage({found: false});

// primes are 30k+i for i = 1, 7, 11, 13, 17, 19, 23, 29
var GCD_30_DELTA = [6, 4, 2, 4, 2, 4, 6, 2];

function findPrime(data) {
  // TODO: abstract based on data.algorithm (PRIMEINC vs. others)

  // create BigInteger from given random bytes
  var num = new BigInteger(data.hex, 16);

  /* Note: All primes are of the form 30k+i for i < 30 and gcd(30, i)=1. The
    number we are given is always aligned at 30k + 1. Each time the number is
    determined not to be prime we add to get to the next 'i', eg: if the number
    was at 30k + 1 we add 6. */
  var deltaIdx = 0;

  // find nearest prime
  var workLoad = data.workLoad;
  for(var i = 0; i < workLoad; ++i) {
    // do primality test
    if(isProbablePrime(num)) {
      return {found: true, prime: num.toString(16)};
    }
    // get next potential prime
    num.dAddOffset(GCD_30_DELTA[deltaIdx++ % 8], 0);
  }

  return {found: false};
}

function isProbablePrime(n) {
  // divide by low primes, ignore even checks, etc (n already aligned properly)
  var i = 1;
  while(i < LOW_PRIMES.length) {
    var m = LOW_PRIMES[i];
    var j = i + 1;
    while(j < LOW_PRIMES.length && m < LP_LIMIT) {
      m *= LOW_PRIMES[j++];
    }
    m = n.modInt(m);
    while(i < j) {
      if(m % LOW_PRIMES[i++] === 0) {
        return false;
      }
    }
  }
  return runMillerRabin(n);
}

// HAC 4.24, Miller-Rabin
function runMillerRabin(n) {
  // n1 = n - 1
  var n1 = n.subtract(BigInteger.ONE);

  // get s and d such that n1 = 2^s * d
  var s = n1.getLowestSetBit();
  if(s <= 0) {
    return false;
  }
  var d = n1.shiftRight(s);

  var k = _getMillerRabinTests(n.bitLength());
  var prng = getPrng();
  var a;
  for(var i = 0; i < k; ++i) {
    // select witness 'a' at random from between 1 and n - 1
    do {
      a = new BigInteger(n.bitLength(), prng);
    } while(a.compareTo(BigInteger.ONE) <= 0 || a.compareTo(n1) >= 0);

    /* See if 'a' is a composite witness. */

    // x = a^d mod n
    var x = a.modPow(d, n);

    // probably prime
    if(x.compareTo(BigInteger.ONE) === 0 || x.compareTo(n1) === 0) {
      continue;
    }

    var j = s;
    while(--j) {
      // x = x^2 mod a
      x = x.modPowInt(2, n);

      // 'n' is composite because no previous x == -1 mod n
      if(x.compareTo(BigInteger.ONE) === 0) {
        return false;
      }
      // x == -1 mod n, so probably prime
      if(x.compareTo(n1) === 0) {
        break;
      }
    }

    // 'x' is first_x^(n1/2) and is not +/- 1, so 'n' is not prime
    if(j === 0) {
      return false;
    }
  }

  return true;
}

// get pseudo random number generator
function getPrng() {
  // create prng with api that matches BigInteger secure random
  return {
    // x is an array to fill with bytes
    nextBytes: function(x) {
      for(var i = 0; i < x.length; ++i) {
        x[i] = Math.floor(Math.random() * 0xFF);
      }
    }
  };
}

/**
 * Returns the required number of Miller-Rabin tests to generate a
 * prime with an error probability of (1/2)^80.
 *
 * See Handbook of Applied Cryptography Chapter 4, Table 4.4.
 *
 * @param bits the bit size.
 *
 * @return the required number of iterations.
 */
function _getMillerRabinTests(bits) {
  if(bits <= 100) return 27;
  if(bits <= 150) return 18;
  if(bits <= 200) return 15;
  if(bits <= 250) return 12;
  if(bits <= 300) return 9;
  if(bits <= 350) return 8;
  if(bits <= 400) return 7;
  if(bits <= 500) return 6;
  if(bits <= 600) return 5;
  if(bits <= 800) return 4;
  if(bits <= 1250) return 3;
  return 2;
}
