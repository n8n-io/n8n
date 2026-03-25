'use strict';

var fs = require('fs');
var parse = require('parse-passwd');

function homedir() {
  // The following logic is from looking at logic used in the different platform
  // versions of the uv_os_homedir function found in https://github.com/libuv/libuv
  // This is the function used in modern versions of node.js

  if (process.platform === 'win32') {
    // check the USERPROFILE first
    if (process.env.USERPROFILE) {
      return process.env.USERPROFILE;
    }

    // check HOMEDRIVE and HOMEPATH
    if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
      return process.env.HOMEDRIVE + process.env.HOMEPATH;
    }

    // fallback to HOME
    if (process.env.HOME) {
      return process.env.HOME;
    }

    return null;
  }

  // check HOME environment variable first
  if (process.env.HOME) {
    return process.env.HOME;
  }

  // on linux platforms (including OSX) find the current user and get their homedir from the /etc/passwd file
  var passwd = tryReadFileSync('/etc/passwd');
  var home = find(parse(passwd), getuid());
  if (home) {
    return home;
  }

  // fallback to using user environment variables
  var user = process.env.LOGNAME || process.env.USER || process.env.LNAME || process.env.USERNAME;

  if (!user) {
    return null;
  }

  if (process.platform === 'darwin') {
    return '/Users/' + user;
  }

  return '/home/' + user;
}

function find(arr, uid) {
  var len = arr.length;
  for (var i = 0; i < len; i++) {
    if (+arr[i].uid === uid) {
      return arr[i].homedir;
    }
  }
}

function getuid() {
  if (typeof process.geteuid === 'function') {
    return process.geteuid();
  }
  return process.getuid();
}

function tryReadFileSync(fp) {
  try {
    return fs.readFileSync(fp, 'utf8');
  } catch (err) {
    return '';
  }
}

module.exports = homedir;

