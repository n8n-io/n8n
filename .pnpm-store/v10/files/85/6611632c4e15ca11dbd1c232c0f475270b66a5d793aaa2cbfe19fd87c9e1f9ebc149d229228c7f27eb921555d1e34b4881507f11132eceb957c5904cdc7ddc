// vendored from https://github.com/amasad/sane/blob/64ff3a870c42e84f744086884bf55a4f9c22d376/src/node_watcher.js

'use strict';

const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const platform = require('os').platform();
const path = require('path');
const common = require('./common');

/**
 * Constants
 */

const DEFAULT_DELAY = common.DEFAULT_DELAY;
const CHANGE_EVENT = common.CHANGE_EVENT;
const DELETE_EVENT = common.DELETE_EVENT;
const ADD_EVENT = common.ADD_EVENT;
const ALL_EVENT = common.ALL_EVENT;

/**
 * Export `NodeWatcher` class.
 * Watches `dir`.
 *
 * @class NodeWatcher
 * @param {String} dir
 * @param {Object} opts
 * @public
 */

module.exports = class NodeWatcher extends EventEmitter {
  constructor(dir, opts) {
    super();
    common.assignOptions(this, opts);
    this.watched = Object.create(null);
    this.changeTimers = Object.create(null);
    this.dirRegistery = Object.create(null);
    this.root = path.resolve(dir);
    this.watchdir = this.watchdir.bind(this);
    this.register = this.register.bind(this);
    this.checkedEmitError = this.checkedEmitError.bind(this);
    this.watchdir(this.root);
    common.recReaddir(
      this.root,
      this.watchdir,
      this.register,
      this.emit.bind(this, 'ready'),
      this.checkedEmitError,
      this.ignored
    );
  }

  /**
   * Register files that matches our globs to know what to type of event to
   * emit in the future.
   *
   * Registery looks like the following:
   *
   *  dirRegister => Map {
   *    dirpath => Map {
   *       filename => true
   *    }
   *  }
   *
   * @param {string} filepath
   * @return {boolean} whether or not we have registered the file.
   * @private
   */

  register(filepath) {
    const relativePath = path.relative(this.root, filepath);
    if (
      !common.isFileIncluded(this.globs, this.dot, this.doIgnore, relativePath)
    ) {
      return false;
    }
    const dir = path.dirname(filepath);
    if (!this.dirRegistery[dir]) {
      this.dirRegistery[dir] = Object.create(null);
    }
    const filename = path.basename(filepath);
    this.dirRegistery[dir][filename] = true;
    return true;
  }

  /**
   * Removes a file from the registery.
   *
   * @param {string} filepath
   * @private
   */

  unregister(filepath) {
    const dir = path.dirname(filepath);
    if (this.dirRegistery[dir]) {
      const filename = path.basename(filepath);
      delete this.dirRegistery[dir][filename];
    }
  }

  /**
   * Removes a dir from the registery.
   *
   * @param {string} dirpath
   * @private
   */

  unregisterDir(dirpath) {
    if (this.dirRegistery[dirpath]) {
      delete this.dirRegistery[dirpath];
    }
  }

  /**
   * Checks if a file or directory exists in the registery.
   *
   * @param {string} fullpath
   * @return {boolean}
   * @private
   */

  registered(fullpath) {
    const dir = path.dirname(fullpath);
    return (
      this.dirRegistery[fullpath] ||
      (this.dirRegistery[dir] &&
        this.dirRegistery[dir][path.basename(fullpath)])
    );
  }

  /**
   * Emit "error" event if it's not an ignorable event
   *
   * @param error
   * @private
   */
  checkedEmitError(error) {
    if (!isIgnorableFileError(error)) {
      this.emit('error', error);
    }
  }

  /**
   * Watch a directory.
   *
   * @param {string} dir
   * @private
   */

  watchdir(dir) {
    if (this.watched[dir]) {
      return;
    }
    const watcher = fs.watch(
      dir,
      {
        persistent: true
      },
      this.normalizeChange.bind(this, dir)
    );
    this.watched[dir] = watcher;
    watcher.on('error', this.checkedEmitError);
    if (this.root !== dir) {
      this.register(dir);
    }
  }

  /**
   * Stop watching a directory.
   *
   * @param {string} dir
   * @private
   */

  stopWatching(dir) {
    if (this.watched[dir]) {
      this.watched[dir].close();
      delete this.watched[dir];
    }
  }

  /**
   * End watching.
   *
   * @public
   */

  close() {
    Object.keys(this.watched).forEach(this.stopWatching, this);
    this.removeAllListeners();
    return Promise.resolve();
  }

  /**
   * On some platforms, as pointed out on the fs docs (most likely just win32)
   * the file argument might be missing from the fs event. Try to detect what
   * change by detecting if something was deleted or the most recent file change.
   *
   * @param {string} dir
   * @param {string} event
   * @param {string} file
   * @public
   */

  detectChangedFile(dir, event, callback) {
    if (!this.dirRegistery[dir]) {
      return;
    }
    let found = false;
    let closest = {
      mtime: 0
    };
    let c = 0;
    Object.keys(this.dirRegistery[dir]).forEach(function (file, i, arr) {
      fs.lstat(path.join(dir, file), (error, stat) => {
        if (found) {
          return;
        }
        if (error) {
          if (isIgnorableFileError(error)) {
            found = true;
            callback(file);
          } else {
            this.emit('error', error);
          }
        } else {
          if (stat.mtime > closest.mtime) {
            stat.file = file;
            closest = stat;
          }
          if (arr.length === ++c) {
            callback(closest.file);
          }
        }
      });
    }, this);
  }

  /**
   * Normalize fs events and pass it on to be processed.
   *
   * @param {string} dir
   * @param {string} event
   * @param {string} file
   * @public
   */

  normalizeChange(dir, event, file) {
    if (!file) {
      this.detectChangedFile(dir, event, actualFile => {
        if (actualFile) {
          this.processChange(dir, event, actualFile);
        }
      });
    } else {
      this.processChange(dir, event, path.normalize(file));
    }
  }

  /**
   * Process changes.
   *
   * @param {string} dir
   * @param {string} event
   * @param {string} file
   * @public
   */

  processChange(dir, event, file) {
    const fullPath = path.join(dir, file);
    const relativePath = path.join(path.relative(this.root, dir), file);
    fs.lstat(fullPath, (error, stat) => {
      if (error && error.code !== 'ENOENT') {
        this.emit('error', error);
      } else if (!error && stat.isDirectory()) {
        // win32 emits usless change events on dirs.
        if (event !== 'change') {
          this.watchdir(fullPath);
          if (
            common.isFileIncluded(
              this.globs,
              this.dot,
              this.doIgnore,
              relativePath
            )
          ) {
            this.emitEvent(ADD_EVENT, relativePath, stat);
          }
        }
      } else {
        const registered = this.registered(fullPath);
        if (error && error.code === 'ENOENT') {
          this.unregister(fullPath);
          this.stopWatching(fullPath);
          this.unregisterDir(fullPath);
          if (registered) {
            this.emitEvent(DELETE_EVENT, relativePath);
          }
        } else if (registered) {
          this.emitEvent(CHANGE_EVENT, relativePath, stat);
        } else {
          if (this.register(fullPath)) {
            this.emitEvent(ADD_EVENT, relativePath, stat);
          }
        }
      }
    });
  }

  /**
   * Triggers a 'change' event after debounding it to take care of duplicate
   * events on os x.
   *
   * @private
   */

  emitEvent(type, file, stat) {
    const key = `${type}-${file}`;
    const addKey = `${ADD_EVENT}-${file}`;
    if (type === CHANGE_EVENT && this.changeTimers[addKey]) {
      // Ignore the change event that is immediately fired after an add event.
      // (This happens on Linux).
      return;
    }
    clearTimeout(this.changeTimers[key]);
    this.changeTimers[key] = setTimeout(() => {
      delete this.changeTimers[key];
      if (type === ADD_EVENT && stat.isDirectory()) {
        // Recursively emit add events and watch for sub-files/folders
        common.recReaddir(
          path.resolve(this.root, file),
          function emitAddDir(dir, stats) {
            this.watchdir(dir);
            this.rawEmitEvent(ADD_EVENT, path.relative(this.root, dir), stats);
          }.bind(this),
          function emitAddFile(file, stats) {
            this.register(file);
            this.rawEmitEvent(ADD_EVENT, path.relative(this.root, file), stats);
          }.bind(this),
          function endCallback() {},
          this.checkedEmitError,
          this.ignored
        );
      } else {
        this.rawEmitEvent(type, file, stat);
      }
    }, DEFAULT_DELAY);
  }

  /**
   * Actually emit the events
   */
  rawEmitEvent(type, file, stat) {
    this.emit(type, file, this.root, stat);
    this.emit(ALL_EVENT, type, file, this.root, stat);
  }
};
/**
 * Determine if a given FS error can be ignored
 *
 * @private
 */
function isIgnorableFileError(error) {
  return (
    error.code === 'ENOENT' ||
    // Workaround Windows node issue #4337.
    (error.code === 'EPERM' && platform === 'win32')
  );
}
