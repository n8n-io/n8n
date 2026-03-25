'use strict';
const { Client } = require('ssh2');
const fs = require('node:fs');
const concat = require('concat-stream');
const { join, parse } = require('node:path');
const {
  globalListener,
  addTempListeners,
  removeTempListeners,
  haveConnection,
  normalizeRemotePath,
  localExists,
  haveLocalAccess,
  haveLocalCreate,
  partition,
} = require('./utils');
const { errorCode } = require('./constants');

class SftpClient {
  constructor(
    clientName = 'sftp',
    callbacks = {
      error: (err) => console.error(`Global error listener: ${err.message}`),
      end: () => console.log('Global end listener: end event raised'),
      close: () => console.log('Global close listener: close event raised'),
    },
  ) {
    this.version = '12.0.1';
    this.client = new Client();
    this.sftp = undefined;
    this.clientName = clientName;
    this.endCalled = false;
    this.errorHandled = false;
    this.closeHandled = false;
    this.endHandled = false;
    this.remotePlatform = 'unix';
    this.debug = undefined;
    this.promiseLimit = 10;
    this.eventCallbacks = callbacks;
    this.client.on('close', globalListener(this, 'close', this.eventCallbacks));
    this.client.on('end', globalListener(this, 'end', this.eventCallbacks));
    this.client.on('error', globalListener(this, 'error', this.eventCallbacks));
  }

  debugMsg(msg, obj) {
    if (this.debug) {
      if (obj) {
        this.debug(
          `CLIENT[${this.clientName}]: ${msg} ${JSON.stringify(obj, null, ' ')}`,
        );
      } else {
        this.debug(`CLIENT[${this.clientName}]: ${msg}`);
      }
    }
  }

  fmtError(err, name = 'sftp', eCode, retryCount) {
    let msg = '';
    let code = '';

    if (err === undefined) {
      msg = `${name}: Undefined error - probably a bug!`;
      code = errorCode.generic;
    } else if (typeof err === 'string') {
      msg = `${name}: ${err}`;
      code = eCode || errorCode.generic;
    } else if (err.custom) {
      msg = `${name}->${err.message}`;
      code = err.code;
    } else {
      switch (err.code) {
        case 'ENOTFOUND': {
          msg = `${name}: Address lookup failed for host`;
          break;
        }
        case 'ECONNREFUSED': {
          msg = `${name}: Remote host refused connection`;
          break;
        }
        case 'ECONNRESET': {
          msg = `${name}: Remote host has reset the connection: ${err.message}`;
          break;
        }
        default: {
          msg = `${name}: ${err.message}`;
        }
      }
      code = err.code || errorCode.generic;
    }
    const newError = new Error(msg);
    newError.code = code;
    newError.custom = true;
    this.debugMsg(`${newError.message} (${newError.code})`);
    return newError;
  }

  /**
   * Add a listner to the client object. This is rarely necessary and can be
   * the source of errors. It is the client's responsibility to remove the
   * listeners when no longer required. Failure to do so can result in memory
   * leaks.
   *
   * @param {string} eventType - one of the supported event types
   * @param {function} callback - function called when event triggers
   */
  on(eventType, callback) {
    this.client.prependListener(eventType, callback);
  }

  removeListener(eventType, callback) {
    this.client.removeListener(eventType, callback);
  }

  _resetEventFlags() {
    this.closeHandled = false;
    this.endHandled = false;
    this.errorHandled = false;
  }

  /**
   *
   * Create a new SFTP connection to a remote SFTP server.
   * The connection options are the same as those offered
   * by the underlying SSH2 module.
   *
   * @param {Object} config - an SFTP configuration object
   *
   * @return {Promise<Object>} which will resolve to an sftp client object
   */
  connect(config) {
    let doReady, listeners;
    return new Promise((resolve, reject) => {
      listeners = addTempListeners(this, 'getConnection', reject);
      if (config.debug) {
        this.debug = config.debug;
        this.debugMsg('connect: Debugging turned on');
        this.debugMsg(`ssh2-sftp-client Version: ${this.version} `, process.versions);
      }
      this.promiseLimit = config.promiseLimit ?? 10;

      doReady = () => {
        this.client.sftp((err, sftp) => {
          if (err) {
            reject(this.fmtError(err));
          } else {
            this.sftp = sftp;
            resolve(sftp);
          }
        });
      };
      this.on('ready', doReady);

      try {
        if (this.sftp) {
          reject(
            this.fmtError(
              'An existing SFTP connection is already defined',
              'connect',
              errorCode.connect,
            ),
          );
        } else {
          this.client.connect(config);
        }
      } catch (err) {
        this.end();
        reject(err);
      }
    }).finally(() => {
      this.removeListener('ready', doReady);
      removeTempListeners(this, listeners, 'getConnection');
      this._resetEventFlags();
    });
  }

  /**
   * @async
   *
   * Returns the real absolute path on the remote server. Is able to handle
   * both '.' and '..' in path names, but not '~'. If the path is relative
   * then the current working directory is prepended to create an absolute path.
   * Returns undefined if the path does not exists.
   *
   * @param {String} remotePath - remote path, may be relative
   * @param {Boolean} addListeners - (Optional) add event listeners. Default = true
   * @returns {Promise<String>} - remote absolute path or ''
   */
  realPath(remotePath, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, 'realPath', reject);
      }
      this.sftp.realpath(remotePath, (err, absPath) => {
        if (err) {
          if (err.code === 2) {
            resolve('');
          } else {
            reject(this.fmtError(`${err.message} ${remotePath}`, 'realPath', err.code));
          }
        }
        resolve(absPath);
      });
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, 'realPath');
        this._resetEventFlags();
      }
    });
  }

  /**
   * @async
   *
   * Return the current workding directory path
   *
   * @returns {Promise<String>} - current remote working directory
   */
  cwd() {
    return this.realPath('.');
  }

  /**
   * Retrieves attributes for path using cmd, which is either
   * this.sftp.stat or this.sftp.lstat
   *
   * @param {Function} cmd - either this.sftp.stat or this.sftp.lstat
   * @param {String} remotePath - a string containing the path to a file
   * @param {Boolean} addListeners - (Optional) if true add event listeners. Default true.
   * @return {Promise<Object>} stats - attributes info
   */
  _xstat(cmd, aPath, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      const cb = (err, stats) => {
        if (err) {
          if (err.code === 2 || err.code === 4) {
            reject(this.fmtError(`No such file: ${aPath}`, '_xstat', errorCode.notexist));
          } else {
            reject(this.fmtError(`${err.message} ${aPath}`, '_xstat', err.code));
          }
        } else {
          const result = {
            mode: stats.mode,
            uid: stats.uid,
            gid: stats.gid,
            size: stats.size,
            accessTime: stats.atime * 1000,
            modifyTime: stats.mtime * 1000,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            isBlockDevice: stats.isBlockDevice(),
            isCharacterDevice: stats.isCharacterDevice(),
            isSymbolicLink: stats.isSymbolicLink(),
            isFIFO: stats.isFIFO(),
            isSocket: stats.isSocket(),
          };
          resolve(result);
        }
      };
      if (addListeners) {
        listeners = addTempListeners(this, '_xstat', reject);
      }
      if (cmd === 'stat') {
        this.sftp.stat(aPath, cb);
      } else {
        this.sftp.lstat(aPath, cb);
      }
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, '_xstat');
        this._resetEventFlags();
      }
    });
  }

  /*
   * Use the stat command to obtain attributes associated with a remote path.
   * THe difference between stat and lstat is that stat, in the case of symbolic
   * links, will return the attributes associated with the target of the link. With
   * lstat, attributes associated with the symbolic link rather than the target are
   * returned.
   *
   * @param {String} remotePath - path to an object on the remote server
   * @return {Promise<Object>} stats - attributes info
   */
  async stat(remotePath) {
    try {
      haveConnection(this, 'stat');
      return await this._xstat('stat', remotePath);
    } catch (err) {
      throw err.custom ? err : this.fmtError(err, 'stat', err.code);
    }
  }

  /*
   * Use the lstat command to obtain attributes associated with a remote path.
   * THe difference between stat and lstat is that stat, in the case of symbolic
   * links, will return the attributes associated with the target of the link. With
   * lstat, attributes associated with the symbolic link rather than the target are
   * returned.
   *
   * @param {String} remotePath - path to an object on the remote server
   * @return {Promise<Object>} stats - attributes info
   */
  async lstat(remotePath) {
    try {
      haveConnection(this, 'lstat');
      return await this._xstat('lstat', remotePath);
    } catch (err) {
      throw err.custom ? err : this.fmtError(err, 'lstat', err.code);
    }
  }

  /**
   * @async
   *
   * Tests to see if an object exists. If it does, return the type of that object
   * (in the format returned by list). If it does not exist, return false.
   *
   * @param {string} remotePath - path to the object on the sftp server.
   *
   * @return {Promise<Boolean|String>} returns false if object does not exist. Returns type of
   *                   object if it does
   */
  async exists(remotePath) {
    try {
      if (remotePath === '.') {
        return 'd';
      }
      const info = await this.lstat(remotePath);
      if (info.isDirectory) {
        return 'd';
      } else if (info.isSymbolicLink) {
        return 'l';
      } else if (info.isFile) {
        return '-';
      } else {
        return false;
      }
    } catch (err) {
      if (err.code === errorCode.notexist) {
        return false;
      }
      throw err.custom ? err : this.fmtError(err.message, 'exists', err.code);
    }
  }

  /**
   * @async
   *
   * List contents of a remote directory. If a pattern is provided,
   * filter the results to only include files with names that match
   * the supplied pattern. Return value is an array of file entry
   * objects that include properties for type, name, size, modifyTime,
   * accessTime, rights {user, group other}, owner and group.
   *
   * @param {String} remotePath - path to remote directory
   * @param {function} filter - a filter function used to select return entries
   * @param {Boolean} addListeners - (Optional) if true, add listeners. Default true
   * @returns {Promise<Array>} array of file description objects
   */
  list(remotePath, filter, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, 'list', reject);
      }
      if (haveConnection(this, 'list', reject)) {
        this.sftp.readdir(remotePath, (err, fileList) => {
          if (err) {
            reject(this.fmtError(`${err.message} ${remotePath}`, 'list', err.code));
          } else {
            const reg = /-/gi;
            const newList = fileList.map((item) => {
              return {
                type: item.longname.slice(0, 1),
                name: item.filename,
                size: item.attrs.size,
                modifyTime: item.attrs.mtime * 1000,
                accessTime: item.attrs.atime * 1000,
                rights: {
                  user: item.longname.slice(1, 4).replaceAll(reg, ''),
                  group: item.longname.slice(4, 7).replaceAll(reg, ''),
                  other: item.longname.slice(7, 10).replaceAll(reg, ''),
                },
                owner: item.attrs.uid,
                group: item.attrs.gid,
                longname: item.longname,
              };
            });
            if (filter) {
              resolve(newList.filter((item) => filter(item)));
            } else {
              resolve(newList);
            }
          }
        });
      }
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, 'list');
        this._resetEventFlags();
      }
    });
  }

  /**
   * get file
   *
   * If a dst argument is provided, it must be either a string, representing the
   * local path to where the data will be put, a stream, in which case data is
   * piped into the stream or undefined, in which case the data is returned as
   * a Buffer object.
   *
   * @param {String} remotePath - remote file path
   * @param {string|stream|undefined} dst - data destination
   * @param {Object} options - options object with supported properties of readStreamOptions,
   *                          writeStreamOptions and pipeOptions.
   * @param {Boolean} addListeners - (Optional) if true, add listeners. Default true
   *
   * *Important Note*: The ability to set ''autoClose' on read/write streams and 'end' on pipe() calls
   * is no longer supported. New methods 'createReadStream()' and 'createWriteStream()' have been
   * added to support low-level access to stream objects.
   *
   * @return {Promise<String|Stream|Buffer>}
   */
  get(remotePath, dst, options, addListeners = true) {
    let listeners, rdr, wtr;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, 'get', reject);
      }
      if (haveConnection(this, 'get', reject)) {
        options = {
          readStreamOptions: { ...options?.readStreamOptions, autoClose: true },
          writeStreamOptions: {
            ...options?.writeStreamOptions,
            autoClose: true,
          },
          pipeOptions: { ...options?.pipeOptions, end: true },
        };
        rdr = this.sftp.createReadStream(remotePath, options.readStreamOptions);
        rdr.on('error', (err) => {
          if (dst && typeof dst === 'string' && wtr && !wtr.destroyed) {
            wtr.destroy();
          }
          reject(this.fmtError(`${err.message} ${remotePath}`, 'get', err.code));
        });
        if (dst === undefined) {
          // no dst specified, return buffer of data
          wtr = concat((buff) => {
            resolve(buff);
          });
        } else if (typeof dst === 'string') {
          // dst local file path
          const localCheck = haveLocalCreate(dst);
          if (localCheck.status) {
            wtr = fs.createWriteStream(dst, options.writeStreamOptions);
          } else {
            reject(
              this.fmtError(
                `Bad path: ${dst}: ${localCheck.details}`,
                'get',
                localCheck.code,
              ),
            );
          }
        } else {
          wtr = dst;
        }
        wtr.on('error', (err) => {
          reject(
            this.fmtError(
              `${err.message} ${typeof dst === 'string' ? dst : '<stream>'}`,
              'get',
              err.code,
            ),
          );
        });
        rdr.once('end', () => {
          if (typeof dst === 'string') {
            resolve(dst);
          } else if (dst !== undefined) {
            resolve(wtr);
          }
        });
        rdr.pipe(wtr, options.pipeOptions);
      }
    }).finally(() => {
      if (rdr && !rdr.destroyed) {
        rdr.destroy();
      }
      if (addListeners) {
        removeTempListeners(this, listeners, 'get');
        this._resetEventFlags();
      }
    });
  }

  /**
   * Use SSH2 fastGet for downloading the file.
   * Downloads a file at remotePath to localPath using parallel reads
   * for faster throughput.
   *
   * WARNING: The functionality of fastGet is heavily dependent on the capabilities
   * of the remote SFTP server. Not all sftp server support or fully support this
   * functionality. See the Platform Quirks & Warnings section of the README.
   *
   * @param {String} remotePath
   * @param {String} localPath
   * @param {Object} options
   * @return {Promise<String>} the result of downloading the file
   */
  _fastGet(rPath, lPath, opts, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, '_fastGet', reject);
      }
      if (haveConnection(this, '_fastGet', reject)) {
        this.sftp.fastGet(rPath, lPath, opts, (err) => {
          if (err) {
            reject(this.fmtError(`${err.message} Remote: ${rPath} Local: ${lPath}`));
          }
          resolve(`${rPath} was successfully download to ${lPath}!`);
        });
      }
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, '_fastGet');
        this._resetEventFlags();
      }
    });
  }

  async fastGet(remotePath, localPath, options) {
    try {
      const ftype = await this.exists(remotePath);
      if (ftype !== '-') {
        const msg = `${ftype ? 'Not a regular file' : 'No such file '} ${remotePath}`;
        throw this.fmtError(msg, 'fastGet', errorCode.badPath);
      }
      const localCheck = haveLocalCreate(localPath);
      if (!localCheck.status) {
        throw this.fmtError(
          `Bad path: ${localPath}: ${localCheck.details}`,
          'fastGet',
          errorCode.badPath,
        );
      }
      return await this._fastGet(remotePath, localPath, options);
    } catch (err) {
      throw this.fmtError(err, 'fastGet');
    }
  }

  /**
   * Use SSH2 fastPut for uploading the file.
   * Uploads a file from localPath to remotePath using parallel reads
   * for faster throughput.
   *
   * See 'fastPut' at
   * https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
   *
   * WARNING: The fastPut functionality is heavily dependent on the capabilities of
   * the remote sftp server. Many sftp servers do not support or do not fully support this
   * functionality. See the Platform Quirks & Warnings section of the README for more details.
   *
   * @param {String} localPath - path to local file to put
   * @param {String} remotePath - destination path for put file
   * @param {Object} options - additonal fastPut options
   * @param {Boolean} addListeners - (Optional) if true, add listeners. Default true.
   * @return {Promise<String>} the result of downloading the file
   */
  _fastPut(lPath, rPath, opts, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, '_fastPut', reject);
      }
      if (haveConnection(this, '_fastPut', reject)) {
        this.sftp.fastPut(lPath, rPath, opts, (err) => {
          if (err) {
            reject(
              this.fmtError(
                `${err.message} Local: ${lPath} Remote: ${rPath}`,
                'fastPut',
                err.code,
              ),
            );
          }
          resolve(`${lPath} was successfully uploaded to ${rPath}!`);
        });
      }
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, '_fastPut');
        this._resetEventFlags();
      }
    });
  }

  async fastPut(localPath, remotePath, options) {
    try {
      const localCheck = haveLocalAccess(localPath);
      if (!localCheck.status) {
        throw this.fmtError(
          `Bad path: ${localPath}: ${localCheck.details}`,
          'fastPut',
          localCheck.code,
        );
      } else if (localCheck.status && localExists(localPath) === 'd') {
        throw this.fmtError(
          `Bad path: ${localPath} not a regular file`,
          'fastgPut',
          errorCode.badPath,
        );
      }
      return await this._fastPut(localPath, remotePath, options);
    } catch (e) {
      throw e.custom ? e : this.fmtError(e.message, 'fastPut', e.code);
    }
  }

  /**
   * Create a file on the remote server. The 'src' argument
   * can be a buffer, string or read stream. If 'src' is a string, it
   * should be the path to a local file.
   *
   * @param  {String|Buffer|stream} localSrc - source data to use
   * @param  {String} remotePath - path to remote file
   * @param  {Object} options - options used for read, write stream and pipe configuration
   *                            value supported by node. Allowed properties are readStreamOptions,
   *                            writeStreamOptions and pipeOptions.
   *
   * *Important Note*: The ability to set ''autoClose' on read/write streams and 'end' on pipe() calls
   * is no longer supported. New methods 'createReadStream()' and 'createWriteStream()' have been
   * added to support low-level access to stream objects.
   *
   * @return {Promise<String>}
   */
  _put(lPath, rPath, opts, addListeners = true) {
    let listeners, wtr, rdr;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, '_put', reject);
      }
      opts = {
        readStreamOptions: { ...opts?.readStreamOptions, autoClose: true },
        writeStreamOptions: { ...opts?.writeStreamOptions, autoClose: true },
        pipeOptions: { ...opts?.pipeOptions, end: true },
      };
      if (haveConnection(this, '_put', reject)) {
        wtr = this.sftp.createWriteStream(rPath, opts.writeStreamOptions);
        wtr.on('error', (err) => {
          if (typeof lPath === 'string' && rdr && !rdr.destroyed) {
            rdr.destroy();
          }
          reject(
            this.fmtError(
              `Write stream error: ${err.message} ${rPath}`,
              '_put',
              err.code,
            ),
          );
        });
        wtr.once('close', () => {
          resolve(`Uploaded data stream to ${rPath}`);
        });
        if (lPath instanceof Buffer) {
          wtr.end(lPath);
        } else {
          if (typeof lPath === 'string') {
            rdr = fs.createReadStream(lPath, opts.readStreamOptions);
          } else {
            rdr = lPath;
          }
          rdr.on('error', (err) => {
            reject(
              this.fmtError(
                `Read stream error: ${err.message} ${
                  typeof lPath === 'string' ? lPath : '<stream>'
                }`,
                '_put',
                err.code,
              ),
            );
          });
          rdr.pipe(wtr, opts.pipeOptions);
        }
      }
    }).finally(() => {
      if (wtr && !wtr.destroyed) {
        wtr.destroy();
      }
      if (addListeners) {
        removeTempListeners(this, listeners, '_put');
        this._resetEventFlags();
      }
    });
  }

  async put(localSrc, remotePath, options) {
    try {
      if (typeof localSrc === 'string') {
        const localCheck = haveLocalAccess(localSrc);
        if (!localCheck.status) {
          throw this.fmtError(
            `Bad path: ${localSrc} ${localCheck.details}`,
            'put',
            localCheck.code,
          );
        }
      }
      return await this._put(localSrc, remotePath, options);
    } catch (e) {
      throw e.custom ? e : this.fmtError(`Re-thrown: ${e.message}`, 'put', e.code);
    }
  }

  /**
   * Append to an existing remote file
   *
   * @param  {Buffer|stream} input
   * @param  {String} remotePath
   * @param  {Object} options
   * @return {Promise<String>}
   */
  _append(input, rPath, opts, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, '_append', reject);
      }
      if (haveConnection(this, '_append', reject)) {
        opts.flags = 'a';
        const stream = this.sftp.createWriteStream(rPath, opts);
        stream.on('error', (err) => {
          reject(this.fmtError(`${err.message} ${rPath}`, 'append', err.code));
        });
        stream.on('close', () => {
          resolve(`Appended data to ${rPath}`);
        });
        if (input instanceof Buffer) {
          stream.write(input);
          stream.end();
        } else {
          input.pipe(stream);
        }
      }
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, '_append');
        this._resetEventFlags();
      }
    });
  }

  async append(input, remotePath, options = {}) {
    try {
      if (typeof input === 'string') {
        throw this.fmtError(
          'Cannot append one file to another',
          'append',
          errorCode.badPath,
        );
      }
      const fileType = await this.exists(remotePath);
      if (fileType && fileType === 'd') {
        throw this.fmtError(
          `Bad path: ${remotePath}: cannot append to a directory`,
          'append',
          errorCode.badPath,
        );
      }
      return await this._append(input, remotePath, options);
    } catch (e) {
      throw e.custom ? e : this.fmtError(e.message, 'append', e.code);
    }
  }

  /**
   * @async
   *
   * Make a directory on remote server
   *
   * @param {string} remotePath - remote directory path.
   * @param {boolean} recursive - if true, recursively create directories
   * @return {Promise<String>}
   */
  _doMkdir(p, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, '_doMkdir', reject);
      }
      this.sftp.mkdir(p, (err) => {
        if (err) {
          if (err.code === 4) {
            //fix for windows dodgy error messages
            reject(
              this.fmtError(
                `Bad path: ${p} permission denied`,
                '_doMkdir',
                errorCode.badPath,
              ),
            );
          } else if (err.code === 2) {
            reject(
              this.fmtError(
                `Bad path: ${p} parent not a directory or not exist`,
                '_doMkdir',
                errorCode.badPath,
              ),
            );
          } else {
            reject(this.fmtError(`${err.message} ${p}`, '_doMkdir', err.code));
          }
        } else {
          resolve(`${p} directory created`);
        }
      });
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, '_doMkdir');
        this._resetEventFlags();
      }
    });
  }

  async _mkdir(remotePath, recursive) {
    try {
      const rPath = await normalizeRemotePath(this, remotePath);
      const targetExists = await this.exists(rPath);
      if (targetExists && targetExists !== 'd') {
        throw this.fmtError(
          `Bad path: ${rPath} already exists as a file`,
          '_mkdir',
          errorCode.badPath,
        );
      } else if (targetExists) {
        return `${rPath} already exists`;
      }
      if (!recursive) {
        return await this._doMkdir(rPath);
      }
      const dir = parse(rPath).dir;
      if (dir) {
        const dirExists = await this.exists(dir);
        if (!dirExists) {
          await this._mkdir(dir, true);
        } else if (dirExists !== 'd') {
          throw this.fmtError(
            `Bad path: ${dir} not a directory`,
            '_mkdir',
            errorCode.badPath,
          );
        }
      }
      return await this._doMkdir(rPath);
    } catch (err) {
      throw err.custom
        ? err
        : this.fmtError(`${err.message} ${remotePath}`, '_mkdir', err.code);
    }
  }

  async mkdir(remotePath, recursive = false) {
    try {
      haveConnection(this, 'mkdir');
      return await this._mkdir(remotePath, recursive);
    } catch (err) {
      throw this.fmtError(`${err.message}`, 'mkdir', err.code);
    }
  }

  /**
   * @async
   *
   * Remove directory on remote server
   *
   * @param {string} remotePath - path to directory to be removed
   * @param {boolean} recursive - if true, remove directories/files in target
   *                             directory
   * @return {Promise<String>}
   */
  async rmdir(remoteDir, recursive = false) {
    const _rmdir = (dir) => {
      let listeners;
      return new Promise((resolve, reject) => {
        listeners = addTempListeners(this, '_rmdir', reject);
        this.sftp.rmdir(dir, (err) => {
          if (err) {
            reject(this.fmtError(`${err.message} ${dir}`, 'rmdir', err.code));
          }
          resolve('Successfully removed directory');
        });
      }).finally(() => {
        removeTempListeners(this, listeners, '_rmdir');
        this._resetEventFlags();
      });
    };

    const _delFiles = (path, fileList) => {
      let listeners;
      return new Promise((resolve, reject) => {
        listeners = addTempListeners(this, '_delFiles', reject);
        const pList = [];
        for (const f of fileList) {
          pList.push(this.delete(`${path}/${f.name}`, true, false));
        }
        resolve(pList);
      })
        .then((p) => {
          return Promise.all(p);
        })
        .finally(() => {
          removeTempListeners(this, listeners, '_delFiles');
        });
    };

    try {
      const absPath = await normalizeRemotePath(this, remoteDir);
      const existStatus = await this.exists(absPath);
      if (!existStatus) {
        throw this.fmtError(
          `Bad Path: ${remoteDir}: No such directory`,
          'rmdir',
          errorCode.badPath,
        );
      }
      if (existStatus !== 'd') {
        throw this.fmtError(
          `Bad Path: ${remoteDir}: Not a directory`,
          'rmdir',
          errorCode.badPath,
        );
      }
      if (!recursive) {
        return await _rmdir(absPath);
      }
      const listing = await this.list(absPath);
      if (!listing.length) {
        return await _rmdir(absPath);
      }
      const fileList = listing.filter((i) => i.type !== 'd');
      const dirList = listing.filter((i) => i.type === 'd');
      await _delFiles(absPath, fileList);
      for (const d of dirList) {
        await this.rmdir(`${absPath}/${d.name}`, true);
      }
      await _rmdir(absPath);
      return 'Successfully removed directory';
    } catch (err) {
      throw err.custom
        ? err
        : this.fmtError(`${err.message} ${remoteDir}`, 'rmdir', err.code);
    }
  }

  /**
   * @async
   *
   * Delete a file on the remote SFTP server
   *
   * @param {string} remotePath - path to the file to delete
   * @param {boolean} notFoundOK - if true, ignore errors for missing target.
   *                               Default is false.
   * @return {Promise<String>} with string 'Successfully deleted file' once resolved
   */
  delete(remotePath, notFoundOK = false, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, 'delete', reject);
      }
      this.sftp.unlink(remotePath, (err) => {
        if (err) {
          if (notFoundOK && err.code === 2) {
            resolve(`Successfully deleted ${remotePath}`);
          } else {
            reject(this.fmtError(`${err.message} ${remotePath}`, 'delete', err.code));
          }
        }
        resolve(`Successfully deleted ${remotePath}`);
      });
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, 'delete');
        this._resetEventFlags();
      }
    });
  }

  /**
   * @async
   *
   * Rename a file on the remote SFTP repository
   *
   * @param {string} fromPath - path to the file to be renamed.
   * @param {string} toPath - path to the new name.
   * @param {Boolean} addListeners - (Optional) if true, add listeners. Default true
   *
   * @return {Promise<String>}
   */
  rename(fPath, tPath, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, 'rename', reject);
      }
      if (haveConnection(this, 'rename', reject)) {
        this.sftp.rename(fPath, tPath, (err) => {
          if (err) {
            reject(
              this.fmtError(
                `${err.message} From: ${fPath} To: ${tPath}`,
                '_rename',
                err.code,
              ),
            );
          }
          resolve(`Successfully renamed ${fPath} to ${tPath}`);
        });
      }
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, 'rename');
        this._resetEventFlags();
      }
    });
  }

  /**
   * @async
   *
   * Rename a file on the remote SFTP repository using the SSH extension
   * posix-rename@openssh.com using POSIX atomic rename. (Introduced in SSH 4.8)
   *
   * @param {string} fromPath - path to the file to be renamed.
   * @param {string} toPath - path  the new name.
   * @param {Boolean} addListeners - (Optional) if true, add listeners. Default true
   *
   * @return {Promise<String>}
   */
  posixRename(fPath, tPath, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, 'posixRename', reject);
      }
      if (haveConnection(this, 'posixRename', reject)) {
        this.sftp.ext_openssh_rename(fPath, tPath, (err) => {
          if (err) {
            reject(
              this.fmtError(
                `${err.message} From: ${fPath} To: ${tPath}`,
                '_posixRename',
                err.code,
              ),
            );
          }
          resolve(`Successful POSIX rename ${fPath} to ${tPath}`);
        });
      }
    }).finally(() => {
      removeTempListeners(this, listeners, 'posixRename');
      this._resetEventFlags();
    });
  }

  /**
   * @async
   *
   * Change the mode of a remote file on the SFTP repository
   *
   * @param {string} remotePath - path to the remote target object.
   * @param {number | string} mode - the new octal mode to set
   * @param {boolean} addListeners - (Optional) if true, add listeners. Default true.
   *
   * @return {Promise<String>}
   */
  chmod(rPath, mode, addListeners = true) {
    let listeners;
    return new Promise((resolve, reject) => {
      if (addListeners) {
        listeners = addTempListeners(this, 'chmod', reject);
      }
      if (haveConnection(this, 'chmod', reject)) {
        this.sftp.chmod(rPath, mode, (err) => {
          if (err) {
            reject(this.fmtError(`${err.message} ${rPath}`, '_chmod', err.code));
          }
          resolve('Successfully change file mode');
        });
      }
    }).finally(() => {
      if (addListeners) {
        removeTempListeners(this, listeners, 'chmod');
        this._resetEventFlags();
      }
    });
  }

  /**
   * @async
   *
   * Upload the specified source directory to the specified destination
   * directory. All regular files and sub-directories are uploaded to the remote
   * server.
   * @param {String} srcDir - local source directory
   * @param {String} dstDir - remote destination directory
   * @param {Object} options - (Optional) An object with 2 supported properties,
   * 'filter' and 'useFastput'. Filter is a function of two arguments.
   * The first argument is the full path of a directory entry from the directory
   * to be uploaded and the second argument is a boolean, which will be true if
   * the target path is for a directory. If the function returns true, this item
   * will be uploaded and excluded when it returns false. The 'useFastput' property is a
   * boolean value. When true, the 'fastPut()' method will be used to upload files. Default
   * is to use the slower, but more supported 'put()' method.
   *
   * @returns {Promise<Array>}
   */
  async uploadDir(srcDir, dstDir, options) {
    const getRemoteStatus = async (dstDir) => {
      const absDstDir = await normalizeRemotePath(this, dstDir);
      const status = await this.exists(absDstDir);
      if (status && status !== 'd') {
        throw this.fmtError(
          `Bad path ${absDstDir} Not a directory`,
          'getRemoteStatus',
          errorCode.badPath,
        );
      }
      return { remoteDir: absDstDir, remoteStatus: status };
    };

    const checkLocalStatus = (srcDir) => {
      const srcType = localExists(srcDir);
      if (!srcType) {
        throw this.fmtError(
          `Bad path: ${srcDir} not exist`,
          'getLocalStatus',
          errorCode.badPath,
        );
      }
      if (srcType !== 'd') {
        throw this.fmtError(
          `Bad path: ${srcDir}: not a directory`,
          'getLocalStatus',
          errorCode.badPath,
        );
      }
      return srcType;
    };

    const uploadFiles = async (srcDir, dstDir, fileList, useFastput) => {
      let listeners = addTempListeners(this, 'uploadFiles');

      try {
        const uploadList = [];
        for (const f of fileList) {
          const src = join(srcDir, f.name);
          const dst = `${dstDir}/${f.name}`;
          uploadList.push([src, dst]);
        }
        const uploadGroups = partition(uploadList, this.promiseLimit);
        const func = useFastput ? this._fastPut.bind(this) : this._put.bind(this);
        const uploadResults = [];
        for (const group of uploadGroups) {
          const pList = [];
          for (const [src, dst] of group) {
            pList.push(func(src, dst, null, false));
            this.client.emit('upload', { source: src, destination: dst });
          }
          const groupResults = await Promise.all(pList);
          for (const r of groupResults) {
            uploadResults.push(r);
          }
        }
        return uploadResults;
      } catch (e) {
        throw this.fmtError(`${e.message} ${srcDir} to ${dstDir}`, 'uploadFiles', e.code);
      } finally {
        removeTempListeners(this, listeners, uploadFiles);
        this._resetEventFlags();
      }
    };

    try {
      haveConnection(this, 'uploadDir');
      const { remoteDir, remoteStatus } = await getRemoteStatus(dstDir);
      checkLocalStatus(srcDir);
      if (!remoteStatus) {
        await this._mkdir(remoteDir, true);
      }
      let dirEntries = fs.readdirSync(srcDir, {
        encoding: 'utf8',
        withFileTypes: true,
      });
      if (options?.filter) {
        dirEntries = dirEntries.filter((item) =>
          options.filter(join(srcDir, item.name), item.isDirectory()),
        );
      }
      const dirUploads = dirEntries.filter((item) => item.isDirectory());
      const fileUploads = dirEntries.filter((item) => !item.isDirectory());
      await uploadFiles(srcDir, remoteDir, fileUploads, options?.useFastput);
      for (const d of dirUploads) {
        const src = join(srcDir, d.name);
        const dst = `${remoteDir}/${d.name}`;
        await this.uploadDir(src, dst, options);
      }
      return `${srcDir} uploaded to ${dstDir}`;
    } catch (err) {
      throw err.custom
        ? err
        : this.fmtError(`${err.message} ${srcDir}`, 'uploadDir', err.code);
    }
  }

  /**
   * @async
   *
   * Download the specified source directory to the specified destination
   * directory. All regular files and sub-directories are downloaded to the local
   * file system.
   * @param {String} srcDir - remote source directory
   * @param {String} dstDir - local destination directory
   * @param {Object} options - (Optional) Object with 2 supported properties,
   * 'filter' and 'useFastget'. The filter property is a function of two
   * arguments. The first argument is the full path of the item to be downloaded
   * and the second argument is a boolean, which will be true if the target path
   * is for a directory. If the function returns true, the item will be
   * downloaded and excluded if teh function returns false.
   *
   * @returns {Promise<Array>}
   */
  async downloadDir(srcDir, dstDir, options = { filter: null, useFastget: false }) {
    const getDownloadList = async (srcDir, filter) => {
      try {
        const listing = await this.list(srcDir);
        if (filter) {
          return listing.filter((item) =>
            filter(`${srcDir}/${item.name}`, item.type === 'd'),
          );
        }
        return listing;
      } catch (err) {
        throw err.custom ? err : this.fmtError(err.message, '_getDownloadList', err.code);
      }
    };

    const prepareDestination = (dst) => {
      try {
        const localCheck = haveLocalCreate(dst);
        if (!localCheck.status && localCheck.details === 'permission denied') {
          throw this.fmtError(
            `Bad path: ${dst}: ${localCheck.details}`,
            'prepareDestination',
            localCheck.code,
          );
        } else if (localCheck.status && !localCheck.type) {
          fs.mkdirSync(dst, { recursive: true });
        } else if (localCheck.status && localCheck.type !== 'd') {
          throw this.fmtError(
            `Bad path: ${dstDir}: not a directory`,
            '_prepareDestination',
            errorCode.badPath,
          );
        }
      } catch (err) {
        throw err.custom
          ? err
          : this.fmtError(err.message, '_prepareDestination', err.code);
      }
    };

    const downloadFiles = async (remotePath, localPath, fileList, useFastget) => {
      let listeners = addTempListeners(this, 'downloadFIles');

      try {
        const downloadList = [];
        for (const f of fileList) {
          const src = `${remotePath}/${f.name}`;
          const dst = join(localPath, f.name);
          downloadList.push([src, dst]);
        }
        const downloadGroups = partition(downloadList, this.promiseLimit);
        const func = useFastget ? this._fastGet.bind(this) : this.get.bind(this);
        const downloadResults = [];
        for (const group of downloadGroups) {
          const pList = [];
          for (const [src, dst] of group) {
            pList.push(func(src, dst, null, false));
            this.client.emit('download', { source: src, destination: dst });
          }
          const groupResults = await Promise.all(pList);
          for (const r of groupResults) {
            downloadResults.push(r);
          }
        }
        return downloadResults;
      } catch (e) {
        throw this.fmtError(
          `${e.message} ${srcDir} to ${dstDir}`,
          'downloadFiles',
          e.code,
        );
      } finally {
        removeTempListeners(this, listeners, 'downloadFiles');
        this._resetEventFlags();
      }
    };

    try {
      haveConnection(this, 'downloadDir');
      const downloadList = await getDownloadList(srcDir, options.filter);
      prepareDestination(dstDir);
      const fileDownloads = downloadList.filter((i) => i.type !== 'd');
      if (fileDownloads.length) {
        await downloadFiles(srcDir, dstDir, fileDownloads, options.useFastget);
      }
      const dirDownloads = downloadList.filter((i) => i.type === 'd');
      for (const d of dirDownloads) {
        const src = `${srcDir}/${d.name}`;
        const dst = join(dstDir, d.name);
        await this.downloadDir(src, dst, options);
      }
      return `${srcDir} downloaded to ${dstDir}`;
    } catch (err) {
      throw err.custom
        ? err
        : this.fmtError(`${err.message}: ${srcDir}`, 'downloadDir', err.code);
    }
  }

  /**
   * Returns a read stream object. This is a low level method which will return a read stream
   * connected to the remote file object specified as an argument. Client code is fully responsible
   * for managing this stream object i.e. adding any necessary listeners and disposing of the object etc.
   * See the SSH2 sftp documentation for details on possible options which can be used.
   *
   * @param {String} remotePath - path to remote file to attach stream to
   * @param {Object} options - options to pass to the create stream process
   *
   * @returns {Object} a read stream object
   */
  createReadStream(remotePath, options) {
    let listeners;
    try {
      listeners = addTempListeners(this, 'createReadStream');
      haveConnection(this, 'createReadStream');
      const stream = this.sftp.createReadStream(remotePath, options);
      return stream;
    } catch (err) {
      throw err.custom ? err : this.fmtError(err.message, 'createReadStream', err.code);
    } finally {
      removeTempListeners(this, listeners, 'createReadStream');
      this._resetEventFlags();
    }
  }

  /**
   * Create a write stream object connected to a file on the remote sftp server.
   * This is a low level method which will return a write stream for the remote file specified
   * in the 'remotePath' argument. Client code to responsible for managing this object once created.
   * This includes disposing of file handles, setting up any necessary event listeners etc.
   *
   * @param {String} remotePath - path to the remote file on the sftp server
   * @param (Object} options - options to pass to the create write stream process)
   *
   * @returns {Object} a stream object
   */
  createWriteStream(remotePath, options) {
    let listeners;
    try {
      listeners = addTempListeners(this, 'createWriteStream');
      haveConnection(this, 'createWriteStream');
      const stream = this.sftp.createWriteStream(remotePath, options);
      return stream;
    } catch (err) {
      throw err.custom ? err : this.fmtError(err.message, 'createWriteStream', err.code);
    } finally {
      removeTempListeners(this, listeners, 'createWriteStream');
      this._resetEventFlags();
    }
  }

  /**
   * @async
   *
   * Make a remote copy of a remote file. Create a copy of a remote file on the remote
   * server. It is assumed the directory where the copy will be placed already exists.
   * The destination file must not already exist.
   *
   * @param {String} srcPath - path to the remote file to be copied
   * @param {String} dstPath - destination path for the copy.
   *
   * @returns {String}.
   */
  _rcopy(srcPath, dstPath) {
    return new Promise((resolve, reject) => {
      const ws = this.sftp.createWriteStream(dstPath);
      const rs = this.sftp.createReadStream(srcPath);
      ws.on('error', (err) => {
        reject(this.fmtError(`${err.message} ${dstPath}`, '_rcopy'));
      });
      rs.on('error', (err) => {
        reject(this.fmtError(`${err.message} ${srcPath}`, '_rcopy'));
      });
      ws.on('close', () => {
        resolve(`${srcPath} copied to ${dstPath}`);
      });
      rs.pipe(ws);
    });
  }

  async rcopy(src, dst) {
    let listeners;
    try {
      listeners = addTempListeners(this, 'rcopy');
      haveConnection(this, 'rcopy');
      const srcPath = await normalizeRemotePath(this, src);
      const srcExists = await this.exists(srcPath);
      if (!srcExists) {
        throw this.fmtError(
          `Source does not exist ${srcPath}`,
          'rcopy',
          errorCode.badPath,
        );
      }
      if (srcExists !== '-') {
        throw this.fmtError(`Source not a file ${srcPath}`, 'rcopy', errorCode.badPath);
      }
      const dstPath = await normalizeRemotePath(this, dst);
      const dstExists = await this.exists(dstPath);
      if (dstExists) {
        throw this.fmtError(
          `Destination already exists ${dstPath}`,
          'rcopy',
          errorCode.badPath,
        );
      }
      return this._rcopy(srcPath, dstPath);
    } catch (err) {
      throw err.custom ? err : this.fmtError(err, 'rcopy');
    } finally {
      removeTempListeners(this, listeners, 'rcopy');
      this._resetEventFlags();
    }
  }
  /**
   * @async
   *
   * End the SFTP connection
   *
   * @returns {Promise<Boolean>}
   */
  end() {
    let endCloseHandler, listeners;
    return new Promise((resolve, reject) => {
      listeners = addTempListeners(this, 'end', reject);
      this.endCalled = true;
      endCloseHandler = () => {
        this.sftp = undefined;
        this.debugMsg('end: Connection closed');
        resolve(true);
      };
      this.on('close', endCloseHandler);
      if (this.sftp) {
        this.debugMsg('end: Ending SFTP connection');
        this.client.end();
      } else {
        // no actual connection exists - just resolve
        this.debugMsg('end: Called when no connection active');
        resolve(true);
      }
    }).finally(() => {
      removeTempListeners(this, listeners, 'end');
      this.removeListener('close', endCloseHandler);
      this._resetEventFlags();
    });
  }
}

module.exports = SftpClient;
