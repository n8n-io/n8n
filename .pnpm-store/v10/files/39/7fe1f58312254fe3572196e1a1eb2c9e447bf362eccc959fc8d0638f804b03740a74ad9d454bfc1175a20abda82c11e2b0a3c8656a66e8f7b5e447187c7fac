'use strict';
/**
 * @license
 * Copyright 2020 Balena Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ------------------------------------------------------------------------
 *
 * Copyright 2018 Zeit, Inc.
 * Licensed under the MIT License. See file LICENSE.md for a full copy.
 *
 * ------------------------------------------------------------------------
 */

/**
 * This module implements the [dockerignore
 * spec](https://docs.docker.com/engine/reference/builder/#dockerignore-file),
 * closely following Docker's (Moby) Golang implementation:
 * https://github.com/moby/moby/blob/v19.03.8/builder/dockerignore/dockerignore.go
 * https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go
 * https://github.com/moby/moby/blob/v19.03.8/pkg/archive/archive.go#L825
 *
 * Something the spec is not clear about, but we discovered by reading source code
 * and testing against the "docker build" command, is the handling of backslashes and
 * forward slashes as path separators and escape characters in the .dockerignore file
 * across platforms including Windows, Linux and macOS:
 *
 * * On Linux and macOS, only forward slashes can be used as path separators in the
 *   .dockerignore file, and the backslash works as an escape character.
 * * On Windows, both forward slashes and backslashes are allowed as path separators
 *   in the .dockerignore file, and the backslash is not used as an escape character.
 *
 * This is consistent with how Windows works generally: both forward slashes and
 * backslashes are accepted as path separators by the cmd.exe Command Prompt or
 * PowerShell, and by library functions like the Golang filepath.Clean or the
 * Node.js path.normalize.
 *
 * Similarly, path strings provided to the IgnoreBase.ignores() and IgnoreBase.filter()
 * methods can use either forward slashes or backslashes as path separators on Windows,
 * but only forward slashes are accepted as path separators on Linux and macOS.
 */

const path = require('path');

const factory = options => new IgnoreBase(options); // https://github.com/kaelzhang/node-ignore/blob/5.1.4/index.js#L538-L539
// Fixes typescript module import


factory.default = factory;
module.exports = factory;

function make_array(subject) {
  return Array.isArray(subject) ? subject : [subject];
}

const REGEX_TRAILING_SLASH = /(?<=.)\/$/;
const REGEX_TRAILING_BACKSLASH = /(?<=.)\\$/;
const REGEX_TRAILING_PATH_SEP = path.sep === '\\' ? REGEX_TRAILING_BACKSLASH : REGEX_TRAILING_SLASH;
const KEY_IGNORE = typeof Symbol !== 'undefined' ? Symbol.for('dockerignore') : 'dockerignore'; // An implementation of Go's filepath.Clean
// https://golang.org/pkg/path/filepath/#Clean
// https://github.com/golang/go/blob/master/src/path/filepath/path.go
// Note that, like Go, on Windows this function converts forward slashes
// to backslashes.

function cleanPath(file) {
  return path.normalize(file).replace(REGEX_TRAILING_PATH_SEP, '');
} // Javascript port of Golang's filepath.ToSlash
// https://golang.org/pkg/path/filepath/#ToSlash
// https://github.com/golang/go/blob/master/src/path/filepath/path.go
// Convert any OS-specific path separator to '/'. Backslash is converted
// to forward slash on Windows, but not on Linux/macOS.
// Note that both forward slashes and backslashes are valid path separators on
// Windows. As a result, code such as `pattern.split(path.sep).join('/')` fails
// on Windows when forward slashes are used as path separators.


function toSlash(file) {
  if (path.sep === '/') {
    return file;
  }

  return file.replace(/\\/g, '/');
} // Javascript port of Golang's filepath.FromSlash
// https://github.com/golang/go/blob/master/src/path/filepath/path.go


function fromSlash(file) {
  if (path.sep === '/') {
    return file;
  }

  return file.replace(/\//g, path.sep);
}

class IgnoreBase {
  constructor({
    // https://github.com/kaelzhang/node-ignore/blob/5.1.4/index.js#L372
    ignorecase = true
  } = {}) {
    this._rules = [];
    this._ignorecase = ignorecase;
    this[KEY_IGNORE] = true;

    this._initCache();
  }

  _initCache() {
    this._cache = {};
  } // @param {Array.<string>|string|Ignore} pattern


  add(pattern) {
    this._added = false;

    if (typeof pattern === 'string') {
      pattern = pattern.split(/\r?\n/g);
    }

    make_array(pattern).forEach(this._addPattern, this); // Some rules have just added to the ignore,
    // making the behavior changed.

    if (this._added) {
      this._initCache();
    }

    return this;
  } // legacy


  addPattern(pattern) {
    return this.add(pattern);
  }

  _addPattern(pattern) {
    // https://github.com/kaelzhang/node-ignore/issues/32
    if (pattern && pattern[KEY_IGNORE]) {
      this._rules = this._rules.concat(pattern._rules);
      this._added = true;
      return;
    }

    if (this._checkPattern(pattern)) {
      const rule = this._createRule(pattern.trim());

      if (rule !== null) {
        this._added = true;

        this._rules.push(rule);
      }
    }
  }

  _checkPattern(pattern) {
    // https://github.com/moby/moby/blob/v19.03.8/builder/dockerignore/dockerignore.go#L34-L40
    return pattern && typeof pattern === 'string' && pattern.indexOf('#') !== 0 && pattern.trim() !== "";
  }

  filter(paths) {
    return make_array(paths).filter(path => this._filter(path));
  }

  createFilter() {
    return path => this._filter(path);
  }

  ignores(path) {
    return !this._filter(path);
  } // https://github.com/moby/moby/blob/v19.03.8/builder/dockerignore/dockerignore.go#L41-L53
  // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L29-L55


  _createRule(pattern) {
    const origin = pattern;
    let negative = false; // > An optional prefix "!" which negates the pattern;
    // https://github.com/moby/moby/blob/v19.03.8/builder/dockerignore/dockerignore.go#L43-L46

    if (pattern[0] === '!') {
      negative = true;
      pattern = pattern.substring(1).trim();
    } // https://github.com/moby/moby/blob/v19.03.8/builder/dockerignore/dockerignore.go#L47-L53


    if (pattern.length > 0) {
      pattern = cleanPath(pattern);
      pattern = toSlash(pattern);

      if (pattern.length > 1 && pattern[0] === '/') {
        pattern = pattern.slice(1);
      }
    } // https://github.com/moby/moby/blob/v19.03.8/builder/dockerignore/dockerignore.go#L54-L55


    if (negative) {
      pattern = '!' + pattern;
    } // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L30


    pattern = pattern.trim();

    if (pattern === "") {
      return null;
    } // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L34
    // convert forward slashes to backslashes on Windows


    pattern = cleanPath(pattern); // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L36-L42

    if (pattern[0] === '!') {
      if (pattern.length === 1) {
        return null;
      }

      negative = true;
      pattern = pattern.substring(1);
    } else {
      negative = false;
    }

    return {
      origin,
      pattern,
      // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L54
      dirs: pattern.split(path.sep),
      negative
    };
  } // @returns `Boolean` true if the `path` is NOT ignored


  _filter(path) {
    if (!path) {
      return false;
    }

    if (path in this._cache) {
      return this._cache[path];
    }

    return this._cache[path] = this._test(path);
  } // @returns {Boolean} true if a file is NOT ignored
  // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L62


  _test(file) {
    file = fromSlash(file); // equivalent to golang filepath.Dir() https://golang.org/src/path/filepath/path.go

    const parentPath = cleanPath(path.dirname(file));
    const parentPathDirs = parentPath.split(path.sep);
    let matched = false;

    this._rules.forEach(rule => {
      let match = this._match(file, rule); // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L80


      if (!match && parentPath !== ".") {
        // Check to see if the pattern matches one of our parent dirs.
        if (rule.dirs.includes('**')) {
          // Ah shucks! We have to test every possible parent path that has 
          // a number of dirs _n_ where 
          // `rule.dirs.filter(doubleStar).length <= _n_ <= parentPathDirs.length`
          // since the ** can imply any number of directories including 0
          for (let i = rule.dirs.filter(x => x !== '**').length; i <= parentPathDirs.length; i++) {
            match = match || this._match(parentPathDirs.slice(0, i).join(path.sep), rule);
          }
        } else if (rule.dirs.length <= parentPathDirs.length) {
          // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L83
          match = this._match(parentPathDirs.slice(0, rule.dirs.length).join(path.sep), rule);
        }
      }

      if (match) {
        matched = !rule.negative;
      }
    });

    return !matched;
  } // @returns {Boolean} true if a file is matched by a rule


  _match(file, rule) {
    return this._compile(rule).regexp.test(file);
  } // https://github.com/moby/moby/blob/v19.03.8/pkg/fileutils/fileutils.go#L139


  _compile(rule) {
    if (rule.regexp) {
      return rule;
    }

    let regStr = '^'; // Go through the pattern and convert it to a regexp.

    let escapedSlash = path.sep === '\\' ? '\\\\' : path.sep;

    for (let i = 0; i < rule.pattern.length; i++) {
      const ch = rule.pattern[i];

      if (ch === '*') {
        if (rule.pattern[i + 1] === '*') {
          // is some flavor of "**"
          i++; // Treat **/ as ** so eat the "/"

          if (rule.pattern[i + 1] === path.sep) {
            i++;
          }

          if (rule.pattern[i + 1] === undefined) {
            // is "**EOF" - to align with .gitignore just accept all
            regStr += ".*";
          } else {
            // is "**"
            // Note that this allows for any # of /'s (even 0) because
            // the .* will eat everything, even /'s
            regStr += `(.*${escapedSlash})?`;
          }
        } else {
          // is "*" so map it to anything but "/"
          regStr += `[^${escapedSlash}]*`;
        }
      } else if (ch === '?') {
        // "?" is any char except "/"
        regStr += `[^${escapedSlash}]`;
      } else if (ch === '.' || ch === '$') {
        // Escape some regexp special chars that have no meaning
        // in golang's filepath.Match
        regStr += `\\${ch}`;
      } else if (ch === '\\') {
        // escape next char. Note that a trailing \ in the pattern
        // will be left alone (but need to escape it)
        if (path.sep === '\\') {
          // On windows map "\" to "\\", meaning an escaped backslash,
          // and then just continue because filepath.Match on
          // Windows doesn't allow escaping at all
          regStr += escapedSlash;
          continue;
        }

        if (rule.pattern[i + 1] !== undefined) {
          regStr += '\\' + rule.pattern[i + 1];
          i++;
        } else {
          regStr += '\\';
        }
      } else {
        regStr += ch;
      }
    }

    regStr += "$";
    rule.regexp = new RegExp(regStr, this._ignorecase ? 'i' : '');
    return rule;
  }

}
