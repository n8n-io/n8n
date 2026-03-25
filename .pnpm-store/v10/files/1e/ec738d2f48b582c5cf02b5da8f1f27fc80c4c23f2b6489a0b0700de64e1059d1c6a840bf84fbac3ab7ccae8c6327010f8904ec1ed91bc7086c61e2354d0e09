/*
 * readlineSync
 * https://github.com/anseki/readline-sync
 *
 * Copyright (c) 2019 anseki
 * Licensed under the MIT license.
 */

var cipher = require('crypto').createCipher(
      process.argv[2] /*algorithm*/, process.argv[3] /*password*/),
  stdin = process.stdin,
  stdout = process.stdout,
  crypted = '';

stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', function(d) {
  crypted += cipher.update(d, 'utf8', 'hex');
});
stdin.on('end', function() {
  stdout.write(crypted + cipher.final('hex'), 'binary', function() {
    process.exit(0);
  });
});
