/**
 * Prime number generation API.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2014 Digital Bazaar, Inc.
 */
var forge = require('./forge');
require('./util');
require('./jsbn');
require('./random');

(function() {

// forge.prime already defined
if(forge.prime) {
  module.exports = forge.prime;
  return;
}

/* PRIME API */
var prime = module.exports = forge.prime = forge.prime || {};

var BigInteger = forge.jsbn.BigInteger;

// primes are 30k+i for i = 1, 7, 11, 13, 17, 19, 23, 29
var GCD_30_DELTA = [6, 4, 2, 4, 2, 4, 6, 2];
var THIRTY = new BigInteger(null);
THIRTY.fromInt(30);
var op_or = function(x, y) {return x|y;};

/**
 * Generates a random probable prime with the given number of bits.
 *
 * Alternative algorithms can be specified by name as a string or as an
 * object with custom options like so:
 *
 * {
 *   name: 'PRIMEINC',
 *   options: {
 *     maxBlockTime: <the maximum amount of time to block the main
 *       thread before allowing I/O other JS to run>,
 *     millerRabinTests: <the number of miller-rabin tests to run>,
 *     workerScript: <the worker script URL>,
 *     workers: <the number of web workers (if supported) to use,
 *       -1 to use estimated cores minus one>.
 *     workLoad: the size of the work load, ie: number of possible prime
 *       numbers for each web worker to check per work assignment,
 *       (default: 100).
 *   }
 * }
 *
 * @param bits the number of bits for the prime number.
 * @param options the options to use.
 *          [algorithm] the algorithm to use (default: 'PRIMEINC').
 *          [prng] a custom crypto-secure pseudo-random number generator to use,
 *            that must define "getBytesSync".
 *
 * @return callback(err, num) called once the operation completes.
 */
prime.generateProbablePrime = function(bits, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // default to PRIMEINC algorithm
  var algorithm = options.algorithm || 'PRIMEINC';
  if(typeof algorithm === 'string') {
    algorithm = {name: algorithm};
  }
  algorithm.options = algorithm.options || {};

  // create prng with api that matches BigInteger secure random
  var prng = options.prng || forge.random;
  var rng = {
    // x is an array to fill with bytes
    nextBytes: function(x) {
      var b = prng.getBytesSync(x.length);
      for(var i = 0; i < x.length; ++i) {
        x[i] = b.charCodeAt(i);
      }
    }
  };

  if(algorithm.name === 'PRIMEINC') {
    return primeincFindPrime(bits, rng, algorithm.options, callback);
  }

  throw new Error('Invalid prime generation algorithm: ' + algorithm.name);
};

function primeincFindPrime(bits, rng, options, callback) {
  if('workers' in options) {
    return primeincFindPrimeWithWorkers(bits, rng, options, callback);
  }
  return primeincFindPrimeWithoutWorkers(bits, rng, options, callback);
}

function primeincFindPrimeWithoutWorkers(bits, rng, options, callback) {
  // initialize random number
  var num = generateRandom(bits, rng);

  /* Note: All primes are of the form 30k+i for i < 30 and gcd(30, i)=1. The
  number we are given is always aligned at 30k + 1. Each time the number is
  determined not to be prime we add to get to the next 'i', eg: if the number
  was at 30k + 1 we add 6. */
  var deltaIdx = 0;

  // get required number of MR tests
  var mrTests = getMillerRabinTests(num.bitLength());
  if('millerRabinTests' in options) {
    mrTests = options.millerRabinTests;
  }

  // find prime nearest to 'num' for maxBlockTime ms
  // 10 ms gives 5ms of leeway for other calculations before dropping
  // below 60fps (1000/60 == 16.67), but in reality, the number will
  // likely be higher due to an 'atomic' big int modPow
  var maxBlockTime = 10;
  if('maxBlockTime' in options) {
    maxBlockTime = options.maxBlockTime;
  }

  _primeinc(num, bits, rng, deltaIdx, mrTests, maxBlockTime, callback);
}

function _primeinc(num, bits, rng, deltaIdx, mrTests, maxBlockTime, callback) {
  var start = +new Date();
  do {
    // overflow, regenerate random number
    if(num.bitLength() > bits) {
      num = generateRandom(bits, rng);
    }
    // do primality test
    if(num.isProbablePrime(mrTests)) {
      return callback(null, num);
    }
    // get next potential prime
    num.dAddOffset(GCD_30_DELTA[deltaIdx++ % 8], 0);
  } while(maxBlockTime < 0 || (+new Date() - start < maxBlockTime));

  // keep trying later
  forge.util.setImmediate(function() {
    _primeinc(num, bits, rng, deltaIdx, mrTests, maxBlockTime, callback);
  });
}

// NOTE: This algorithm is indeterminate in nature because workers
// run in parallel looking at different segments of numbers. Even if this
// algorithm is run twice with the same input from a predictable RNG, it
// may produce different outputs.
function primeincFindPrimeWithWorkers(bits, rng, options, callback) {
  // web workers unavailable
  if(typeof Worker === 'undefined') {
    return primeincFindPrimeWithoutWorkers(bits, rng, options, callback);
  }

  // initialize random number
  var num = generateRandom(bits, rng);

  // use web workers to generate keys
  var numWorkers = options.workers;
  var workLoad = options.workLoad || 100;
  var range = workLoad * 30 / 8;
  var workerScript = options.workerScript || 'forge/prime.worker.js';
  if(numWorkers === -1) {
    return forge.util.estimateCores(function(err, cores) {
      if(err) {
        // default to 2
        cores = 2;
      }
      numWorkers = cores - 1;
      generate();
    });
  }
  generate();

  function generate() {
    // require at least 1 worker
    numWorkers = Math.max(1, numWorkers);

    // TODO: consider optimizing by starting workers outside getPrime() ...
    // note that in order to clean up they will have to be made internally
    // asynchronous which may actually be slower

    // start workers immediately
    var workers = [];
    for(var i = 0; i < numWorkers; ++i) {
      // FIXME: fix path or use blob URLs
      workers[i] = new Worker(workerScript);
    }
    var running = numWorkers;

    // listen for requests from workers and assign ranges to find prime
    for(var i = 0; i < numWorkers; ++i) {
      workers[i].addEventListener('message', workerMessage);
    }

    /* Note: The distribution of random numbers is unknown. Therefore, each
    web worker is continuously allocated a range of numbers to check for a
    random number until one is found.

    Every 30 numbers will be checked just 8 times, because prime numbers
    have the form:

    30k+i, for i < 30 and gcd(30, i)=1 (there are 8 values of i for this)

    Therefore, if we want a web worker to run N checks before asking for
    a new range of numbers, each range must contain N*30/8 numbers.

    For 100 checks (workLoad), this is a range of 375. */

    var found = false;
    function workerMessage(e) {
      // ignore message, prime already found
      if(found) {
        return;
      }

      --running;
      var data = e.data;
      if(data.found) {
        // terminate all workers
        for(var i = 0; i < workers.length; ++i) {
          workers[i].terminate();
        }
        found = true;
        return callback(null, new BigInteger(data.prime, 16));
      }

      // overflow, regenerate random number
      if(num.bitLength() > bits) {
        num = generateRandom(bits, rng);
      }

      // assign new range to check
      var hex = num.toString(16);

      // start prime search
      e.target.postMessage({
        hex: hex,
        workLoad: workLoad
      });

      num.dAddOffset(range, 0);
    }
  }
}

/**
 * Generates a random number using the given number of bits and RNG.
 *
 * @param bits the number of bits for the number.
 * @param rng the random number generator to use.
 *
 * @return the random number.
 */
function generateRandom(bits, rng) {
  var num = new BigInteger(bits, rng);
  // force MSB set
  var bits1 = bits - 1;
  if(!num.testBit(bits1)) {
    num.bitwiseTo(BigInteger.ONE.shiftLeft(bits1), op_or, num);
  }
  // align number on 30k+1 boundary
  num.dAddOffset(31 - num.mod(THIRTY).byteValue(), 0);
  return num;
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
function getMillerRabinTests(bits) {
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

})();
