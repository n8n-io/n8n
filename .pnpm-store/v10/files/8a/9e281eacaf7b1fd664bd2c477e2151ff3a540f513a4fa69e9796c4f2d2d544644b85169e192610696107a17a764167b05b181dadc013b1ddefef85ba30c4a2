// Copyright 2017 Lovell Fuller and others.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const fs = require('fs');

/**
 * The path where we can find the ldd
 */
const LDD_PATH = '/usr/bin/ldd';

/**
 * Read the content of a file synchronous
 *
 * @param {string} path
 * @returns {string}
 */
const readFileSync = (path) => fs.readFileSync(path, 'utf-8');

/**
 * Read the content of a file
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
const readFile = (path) => new Promise((resolve, reject) => {
  fs.readFile(path, 'utf-8', (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});

module.exports = {
  LDD_PATH,
  readFileSync,
  readFile
};
