/*
 * Jake JavaScript build tool
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/
var fs = require('fs')
, path = require('path')
, minimatch = require('minimatch')
, escapeRegExpChars
, merge
, basedir
, _readDir
, readdirR
, globSync;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var hasOwn = function (obj, key) { return hasOwnProperty.apply(obj, [key]); };

  /**
    @name escapeRegExpChars
    @function
    @return {String} A string of escaped characters
    @description Escapes regex control-characters in strings
                 used to build regexes dynamically
    @param {String} string The string of chars to escape
  */
  escapeRegExpChars = (function () {
    var specials = [ '^', '$', '/', '.', '*', '+', '?', '|', '(', ')',
        '[', ']', '{', '}', '\\' ];
    var sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
    return function (string) {
      var str = string || '';
      str = String(str);
      return str.replace(sRE, '\\$1');
    };
  })();

  /**
    @name merge
    @function
    @return {Object} Returns the merged object
    @description Merge merges `otherObject` into `object` and takes care of deep
                 merging of objects
    @param {Object} object Object to merge into
    @param {Object} otherObject Object to read from
  */
  merge = function (object, otherObject) {
    var obj = object || {}
      , otherObj = otherObject || {}
      , key, value;

    for (key in otherObj) {

      if (!hasOwn(otherObj, key)) {
        continue;
      }
      if (key === '__proto__' || key === 'constructor') {
        continue;
      }

      value = otherObj[key];
      // Check if a value is an Object, if so recursively add it's key/values
      if (typeof value === 'object' && !(value instanceof Array)) {
        // Update value of object to the one from otherObj
        obj[key] = merge(obj[key], value);
      }
      // Value is anything other than an Object, so just add it
      else {
        obj[key] = value;
      }
    }

    return obj;
  };
  /**
    Given a patern, return the base directory of it (ie. the folder
    that will contain all the files matching the path).
    eg. file.basedir('/test/**') => '/test/'
    Path ending by '/' are considerd as folder while other are considerd
    as files, eg.:
        file.basedir('/test/a/') => '/test/a'
        file.basedir('/test/a') => '/test'
    The returned path always end with a '/' so we have:
        file.basedir(file.basedir(x)) == file.basedir(x)
  */
  basedir = function (pathParam) {
    var bd = ''
      , parts
      , part
      , pos = 0
      , p = pathParam || '';

    // If the path has a leading asterisk, basedir is the current dir
    if (p.indexOf('*') == 0 || p.indexOf('**') == 0) {
      return '.';
    }

    // always consider .. at the end as a folder and not a filename
    if (/(?:^|\/|\\)\.\.$/.test(p.slice(-3))) {
      p += '/';
    }

    parts = p.split(/\\|\//);
    for (var i = 0, l = parts.length - 1; i < l; i++) {
      part = parts[i];
      if (part.indexOf('*') > -1 || part.indexOf('**') > -1) {
        break;
      }
      pos += part.length + 1;
      bd += part + p[pos - 1];
    }
    if (!bd) {
      bd = '.';
    }
    // Strip trailing slashes
    if (!(bd == '\\' || bd == '/')) {
      bd = bd.replace(/\\$|\/$/, '');
    }
    return bd;

  };

  // Return the contents of a given directory
  _readDir = function (dirPath) {
    var dir = path.normalize(dirPath)
      , paths = []
      , ret = [dir]
      , msg;

    try {
      paths = fs.readdirSync(dir);
    }
    catch (e) {
      msg = 'Could not read path ' + dir + '\n';
      if (e.stack) {
        msg += e.stack;
      }
      throw new Error(msg);
    }

    paths.forEach(function (p) {
      var curr = path.join(dir, p);
      var stat = fs.statSync(curr);
      if (stat.isDirectory()) {
        ret = ret.concat(_readDir(curr));
      }
      else {
        ret.push(curr);
      }
    });

    return ret;
  };

  /**
    @name file#readdirR
    @function
    @return {Array} Returns the contents as an Array, can be configured via opts.format
    @description Reads the given directory returning it's contents
    @param {String} dir The directory to read
    @param {Object} opts Options to use
      @param {String} [opts.format] Set the format to return(Default: Array)
  */
  readdirR = function (dir, opts) {
    var options = opts || {}
      , format = options.format || 'array'
      , ret;
    ret = _readDir(dir);
    return format == 'string' ? ret.join('\n') : ret;
  };


globSync = function (pat, opts) {
  var dirname = basedir(pat)
    , files
    , matches;

  try {
    files = readdirR(dirname).map(function(file){
      return file.replace(/\\/g, '/');
    });
  }
  // Bail if path doesn't exist -- assume no files
  catch(e) {
    if (FileList.verbose) console.error(e.message);
  }

  if (files) {
    pat = path.normalize(pat);
    matches = minimatch.match(files, pat, opts || {});
  }
  return matches || [];
};

// Constants
// ---------------
// List of all the builtin Array methods we want to override
var ARRAY_METHODS = Object.getOwnPropertyNames(Array.prototype)
// Array methods that return a copy instead of affecting the original
  , SPECIAL_RETURN = {
      'concat': true
    , 'slice': true
    , 'filter': true
    , 'map': true
    }
// Default file-patterns we want to ignore
  , DEFAULT_IGNORE_PATTERNS = [
      /(^|[\/\\])CVS([\/\\]|$)/
    , /(^|[\/\\])\.svn([\/\\]|$)/
    , /(^|[\/\\])\.git([\/\\]|$)/
    , /\.bak$/
    , /~$/
    ]
// Ignore core files
  , DEFAULT_IGNORE_FUNCS = [
      function (name) {
        var isDir = false
          , stats;
        try {
          stats = fs.statSync(name);
          isDir = stats.isDirectory();
        }
        catch(e) {}
        return (/(^|[\/\\])core$/).test(name) && !isDir;
      }
    ];

var FileList = function () {
  var self = this
    , wrap;

  // List of glob-patterns or specific filenames
  this.pendingAdd = [];
  // Switched to false after lazy-eval of files
  this.pending = true;
  // Used to calculate exclusions from the list of files
  this.excludes = {
    pats: DEFAULT_IGNORE_PATTERNS.slice()
  , funcs: DEFAULT_IGNORE_FUNCS.slice()
  , regex: null
  };
  this.items = [];

  // Wrap the array methods with the delegates
  wrap = function (prop) {
    var arr;
    self[prop] = function () {
      if (self.pending) {
        self.resolve();
      }
      if (typeof self.items[prop] == 'function') {
        // Special method that return a copy
        if (SPECIAL_RETURN[prop]) {
          arr = self.items[prop].apply(self.items, arguments);
          return FileList.clone(self, arr);
        }
        else {
          return self.items[prop].apply(self.items, arguments);
        }
      }
      else {
        return self.items[prop];
      }
    };
  };
  for (var i = 0, ii = ARRAY_METHODS.length; i < ii; i++) {
    wrap(ARRAY_METHODS[i]);
  }

  // Include whatever files got passed to the constructor
  this.include.apply(this, arguments);

  // Fix constructor linkage
  this.constructor = FileList;
};

FileList.prototype = new (function () {
  var globPattern = /[*?\[\{]/;

  var _addMatching = function (item) {
        var matches = globSync(item.path, item.options);
        this.items = this.items.concat(matches);
      }

    , _resolveAdd = function (item) {
        if (globPattern.test(item.path)) {
          _addMatching.call(this, item);
        }
        else {
          this.push(item.path);
        }
      }

    , _calculateExcludeRe = function () {
        var pats = this.excludes.pats
          , pat
          , excl = []
          , matches = [];

        for (var i = 0, ii = pats.length; i < ii; i++) {
          pat = pats[i];
          if (typeof pat == 'string') {
            // Glob, look up files
            if (/[*?]/.test(pat)) {
              matches = globSync(pat);
              matches = matches.map(function (m) {
                return escapeRegExpChars(m);
              });
              excl = excl.concat(matches);
            }
            // String for regex
            else {
              excl.push(escapeRegExpChars(pat));
            }
          }
          // Regex, grab the string-representation
          else if (pat instanceof RegExp) {
            excl.push(pat.toString().replace(/^\/|\/$/g, ''));
          }
        }
        if (excl.length) {
          this.excludes.regex = new RegExp('(' + excl.join(')|(') + ')');
        }
        else {
          this.excludes.regex = /^$/;
        }
      }

    , _resolveExclude = function () {
        var self = this;
        _calculateExcludeRe.call(this);
        // No `reject` method, so use reverse-filter
        this.items = this.items.filter(function (name) {
          return !self.shouldExclude(name);
        });
      };

  /**
   * Includes file-patterns in the FileList. Should be called with one or more
   * pattern for finding file to include in the list. Arguments should be strings
   * for either a glob-pattern or a specific file-name, or an array of them
   */
  this.include = function () {
    var args = Array.prototype.slice.call(arguments)
        , arg
        , includes = { items: [], options: {} };

    for (var i = 0, ilen = args.length; i < ilen; i++) {
      arg = args[i];

      if (typeof arg === 'object' && !Array.isArray(arg)) {
        merge(includes.options, arg);
      } else {
        includes.items = includes.items.concat(arg).filter(function (item) {
          return !!item;
        });
      }
    }

    var items = includes.items.map(function(item) {
      return { path: item, options: includes.options };
    });

    this.pendingAdd = this.pendingAdd.concat(items);

    return this;
  };

  /**
   * Indicates whether a particular file would be filtered out by the current
   * exclusion rules for this FileList.
   * @param {String} name The filename to check
   * @return {Boolean} Whether or not the file should be excluded
   */
  this.shouldExclude = function (name) {
    if (!this.excludes.regex) {
      _calculateExcludeRe.call(this);
    }
    var excl = this.excludes;
    return excl.regex.test(name) || excl.funcs.some(function (f) {
      return !!f(name);
    });
  };

  /**
   * Excludes file-patterns from the FileList. Should be called with one or more
   * pattern for finding file to include in the list. Arguments can be:
   * 1. Strings for either a glob-pattern or a specific file-name
   * 2. Regular expression literals
   * 3. Functions to be run on the filename that return a true/false
   */
  this.exclude = function () {
    var args = Array.isArray(arguments[0]) ? arguments[0] : arguments
      , arg;
    for (var i = 0, ii = args.length; i < ii; i++) {
      arg = args[i];
      if (typeof arg == 'function' && !(arg instanceof RegExp)) {
        this.excludes.funcs.push(arg);
      }
      else {
        this.excludes.pats.push(arg);
      }
    }
    if (!this.pending) {
      _resolveExclude.call(this);
    }
    return this;
  };

  /**
   * Populates the FileList from the include/exclude rules with a list of
   * actual files
   */
  this.resolve = function () {
    var item
      , uniqueFunc = function (p, c) {
          if (p.indexOf(c) < 0) {
            p.push(c);
          }
          return p;
        };
    if (this.pending) {
      this.pending = false;
      while ((item = this.pendingAdd.shift())) {
        _resolveAdd.call(this, item);
      }
      // Reduce to a unique list
      this.items = this.items.reduce(uniqueFunc, []);
      // Remove exclusions
      _resolveExclude.call(this);
    }
    return this;
  };

  /**
   * Convert to a plain-jane array
   */
  this.toArray = function () {
    // Call slice to ensure lazy-resolution before slicing items
    var ret = this.slice().items.slice();
    return ret;
  };

  /**
   * Clear any pending items -- only useful before
   * calling `resolve`
   */
  this.clearInclusions = function () {
    this.pendingAdd = [];
    return this;
  };

  /**
   * Clear any current exclusion rules
   */
  this.clearExclusions = function () {
    this.excludes = {
      pats: []
    , funcs: []
    , regex: null
    };
    return this;
  };

})();

// Static method, used to create copy returned by special
// array methods
FileList.clone = function (list, items) {
  var clone = new FileList();
  if (items) {
    clone.items = items;
  }
  clone.pendingAdd = list.pendingAdd;
  clone.pending = list.pending;
  for (var p in list.excludes) {
    clone.excludes[p] = list.excludes[p];
  }
  return clone;
};

FileList.verbose = true

exports.FileList = FileList;
