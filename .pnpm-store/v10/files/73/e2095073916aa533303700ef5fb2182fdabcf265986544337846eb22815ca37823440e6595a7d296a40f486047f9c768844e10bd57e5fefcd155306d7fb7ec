'use strict';

var assert = require('assert');
var ba = require('../');

// HEXFLIFY
// One letter
assert.equal(ba.hexlify('A'), '41');

// String
assert.equal(ba.hexlify('Pamietamy 44'), '50616d696574616d79203434');

// Binary data
assert.equal(ba.hexlify('7z¼¯\'\u001c'), '377abcaf271c');

// UNHEXLIFY
// Reverse hexlify
assert.equal(ba.unhexlify(ba.hexlify('A')), 'A');
assert.equal(ba.unhexlify('50616d696574616d79203434'), 'Pamietamy 44');

// Binary data
assert.equal(ba.unhexlify('377abcaf271c'), '7z¼¯\'\u001c');

// Aliases
assert(ba.unhexlify === ba.a2b_hex);
assert(ba.hexlify === ba.b2a_hex);

// Ensure single-digit codes are correctly padded
assert.equal(ba.hexlify('\n'), '0a');
