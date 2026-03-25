/*
 * Utilities: A classic collection of JavaScript utilities
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

let fs = require('fs');
let path = require('path');

/**
  @name file
  @namespace file
*/

let fileUtils = new (function () {

  // Recursively copy files and directories
  let _copyFile = function (fromPath, toPath, opts) {
    let from = path.normalize(fromPath)
    let to = path.normalize(toPath)
    let options = opts || {}
    let fromStat;
    let toStat;
    let destExists;
    let destDoesNotExistErr;
    let content;
    let filename;
    let dirContents;
    let targetDir;

    fromStat = fs.statSync(from);

    try {
      //console.dir(to + ' destExists');
      toStat = fs.statSync(to);
      destExists = true;
    }
    catch(e) {
      //console.dir(to + ' does not exist');
      destDoesNotExistErr = e;
      destExists = false;
    }
    // Destination dir or file exists, copy into (directory)
    // or overwrite (file)
    if (destExists) {

      // If there's a rename-via-copy file/dir name passed, use it.
      // Otherwise use the actual file/dir name
      filename = options.rename || path.basename(from);

      // Copying a directory
      if (fromStat.isDirectory()) {
        dirContents = fs.readdirSync(from);
        targetDir = path.join(to, filename);
        // We don't care if the target dir already exists
        try {
          fs.mkdirSync(targetDir, {mode: fromStat.mode & 0o777});
        }
        catch(e) {
          if (e.code !== 'EEXIST') {
            throw e;
          }
        }
        for (let i = 0, ii = dirContents.length; i < ii; i++) {
          _copyFile(path.join(from, dirContents[i]), targetDir, {preserveMode: options.preserveMode});
        }
      }
      // Copying a file
      else {
        content = fs.readFileSync(from);
        let mode = fromStat.mode & 0o777;
        let targetFile = to;

        if (toStat.isDirectory()) {
          targetFile = path.join(to, filename);
        }

        let fileExists = fs.existsSync(targetFile);
        fs.writeFileSync(targetFile, content);

        // If the file didn't already exist, use the original file mode.
        // Otherwise, only update the mode if preserverMode is true.
        if(!fileExists || options.preserveMode) {
          fs.chmodSync(targetFile, mode);
        }
      }
    }
    // Dest doesn't exist, can't create it
    else {
      throw destDoesNotExistErr;
    }
  };

  // Remove the given directory
  let _rmDir = function (dirPath) {
    let dir = path.normalize(dirPath);
    let paths = [];
    paths = fs.readdirSync(dir);
    paths.forEach(function (p) {
      let curr = path.join(dir, p);
      let stat = fs.lstatSync(curr);
      if (stat.isDirectory()) {
        _rmDir(curr);
      }
      else {
        try {
          fs.unlinkSync(curr);
        } catch(e) {
          if (e.code === 'EPERM') {
            fs.chmodSync(curr, parseInt(666, 8));
            fs.unlinkSync(curr);
          } else {
            throw e;
          }
        }
      }
    });
    fs.rmdirSync(dir);
  };

  /**
    @name file#cpR
    @public
    @function
    @description Copies a directory/file to a destination
    @param {String} fromPath The source path to copy from
    @param {String} toPath The destination path to copy to
    @param {Object} opts Options to use
      @param {Boolean} [opts.preserveMode] If target file already exists, this
        determines whether the original file's mode is copied over. The default of
        false mimics the behavior of the `cp` command line tool. (Default: false)
  */
  this.cpR = function (fromPath, toPath, options) {
    let from = path.normalize(fromPath);
    let to = path.normalize(toPath);
    let toStat;
    let doesNotExistErr;
    let filename;
    let opts = options || {};

    if (from == to) {
      throw new Error('Cannot copy ' + from + ' to itself.');
    }

    // Handle rename-via-copy
    try {
      toStat = fs.statSync(to);
    }
    catch(e) {
      doesNotExistErr = e;

      // Get abs path so it's possible to check parent dir
      if (!this.isAbsolute(to)) {
        to = path.join(process.cwd(), to);
      }

      // Save the file/dir name
      filename = path.basename(to);
      // See if a parent dir exists, so there's a place to put the
      /// renamed file/dir (resets the destination for the copy)
      to = path.dirname(to);
      try {
        toStat = fs.statSync(to);
      }
      catch(e) {}
      if (toStat && toStat.isDirectory()) {
        // Set the rename opt to pass to the copy func, will be used
        // as the new file/dir name
        opts.rename = filename;
        //console.log('filename ' + filename);
      }
      else {
        throw doesNotExistErr;
      }
    }

    _copyFile(from, to, opts);
  };

  /**
    @name file#mkdirP
    @public
    @function
    @description Create the given directory(ies) using the given mode permissions
    @param {String} dir The directory to create
    @param {Number} mode The mode to give the created directory(ies)(Default: 0755)
  */
  this.mkdirP = function (dir, mode) {
    let dirPath = path.normalize(dir);
    let paths = dirPath.split(/\/|\\/);
    let currPath = '';
    let next;

    if (paths[0] == '' || /^[A-Za-z]+:/.test(paths[0])) {
      currPath = paths.shift() || '/';
      currPath = path.join(currPath, paths.shift());
      //console.log('basedir');
    }
    while ((next = paths.shift())) {
      if (next == '..') {
        currPath = path.join(currPath, next);
        continue;
      }
      currPath = path.join(currPath, next);
      try {
        //console.log('making ' + currPath);
        fs.mkdirSync(currPath, mode || parseInt(755, 8));
      }
      catch(e) {
        if (e.code != 'EEXIST') {
          throw e;
        }
      }
    }
  };

  /**
    @name file#rmRf
    @public
    @function
    @description Deletes the given directory/file
    @param {String} p The path to delete, can be a directory or file
  */
  this.rmRf = function (p, options) {
    let stat;
    try {
      stat = fs.lstatSync(p);
      if (stat.isDirectory()) {
        _rmDir(p);
      }
      else {
        fs.unlinkSync(p);
      }
    }
    catch (e) {}
  };

  /**
    @name file#isAbsolute
    @public
    @function
    @return {Boolean/String} If it's absolute the first character is returned otherwise false
    @description Checks if a given path is absolute or relative
    @param {String} p Path to check
  */
  this.isAbsolute = function (p) {
    let match = /^[A-Za-z]+:\\|^\//.exec(p);
    if (match && match.length) {
      return match[0];
    }
    return false;
  };

  /**
    @name file#absolutize
    @public
    @function
    @return {String} Returns the absolute path for the given path
    @description Returns the absolute path for the given path
    @param {String} p The path to get the absolute path for
  */
  this.absolutize = function (p) {
    if (this.isAbsolute(p)) {
      return p;
    }
    else {
      return path.join(process.cwd(), p);
    }
  };

})();

module.exports = fileUtils;

