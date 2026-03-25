'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fs = require('node:fs');
var crypto = require('node:crypto');
var node_events = require('node:events');
var cuid2 = require('@paralleldrive/cuid2');
var dezalgo = require('dezalgo');
var fsPromises = require('node:fs/promises');
var os = require('node:os');
var path = require('node:path');
var node_string_decoder = require('node:string_decoder');
var once = require('once');
var node_stream = require('node:stream');

/* eslint-disable no-underscore-dangle */


class PersistentFile extends node_events.EventEmitter {
  constructor({ filepath, newFilename, originalFilename, mimetype, hashAlgorithm }) {
    super();

    this.lastModifiedDate = null;
    Object.assign(this, { filepath, newFilename, originalFilename, mimetype, hashAlgorithm });

    this.size = 0;
    this._writeStream = null;

    if (typeof this.hashAlgorithm === 'string') {
      this.hash = crypto.createHash(this.hashAlgorithm);
    } else {
      this.hash = null;
    }
  }

  open() {
    this._writeStream = fs.createWriteStream(this.filepath);
    this._writeStream.on('error', (err) => {
      this.emit('error', err);
    });
  }

  toJSON() {
    const json = {
      size: this.size,
      filepath: this.filepath,
      newFilename: this.newFilename,
      mimetype: this.mimetype,
      mtime: this.lastModifiedDate,
      length: this.length,
      originalFilename: this.originalFilename,
    };
    if (this.hash && this.hash !== '') {
      json.hash = this.hash;
    }
    return json;
  }

  toString() {
    return `PersistentFile: ${this.newFilename}, Original: ${this.originalFilename}, Path: ${this.filepath}`;
  }

  write(buffer, cb) {
    if (this.hash) {
      this.hash.update(buffer);
    }

    if (this._writeStream.closed) {
      cb();
      return;
    }

    this._writeStream.write(buffer, () => {
      this.lastModifiedDate = new Date();
      this.size += buffer.length;
      this.emit('progress', this.size);
      cb();
    });
  }

  end(cb) {
    if (this.hash) {
      this.hash = this.hash.digest('hex');
    }
    this._writeStream.end(() => {
      this.emit('end');
      cb();
    });
  }

  destroy() {
    this._writeStream.destroy();
    const filepath = this.filepath; 
    setTimeout(function () {
        fs.unlink(filepath, () => {});
    }, 1);
  }
}

/* eslint-disable no-underscore-dangle */


class VolatileFile extends node_events.EventEmitter {
  constructor({ filepath, newFilename, originalFilename, mimetype, hashAlgorithm, createFileWriteStream }) {
    super();

    this.lastModifiedDate = null;
    Object.assign(this, { filepath, newFilename, originalFilename, mimetype, hashAlgorithm, createFileWriteStream });

    this.size = 0;
    this._writeStream = null;

    if (typeof this.hashAlgorithm === 'string') {
      this.hash = crypto.createHash(this.hashAlgorithm);
    } else {
      this.hash = null;
    }
  }

  open() {
    this._writeStream = this.createFileWriteStream(this);
    this._writeStream.on('error', (err) => {
      this.emit('error', err);
    });
  }

  destroy() {
    this._writeStream.destroy();
  }

  toJSON() {
    const json = {
      size: this.size,
      newFilename: this.newFilename,
      length: this.length,
      originalFilename: this.originalFilename,
      mimetype: this.mimetype,
    };
    if (this.hash && this.hash !== '') {
      json.hash = this.hash;
    }
    return json;
  }

  toString() {
    return `VolatileFile: ${this.originalFilename}`;
  }

  write(buffer, cb) {
    if (this.hash) {
      this.hash.update(buffer);
    }

    if (this._writeStream.closed || this._writeStream.destroyed) {
      cb();
      return;
    }

    this._writeStream.write(buffer, () => {
      this.size += buffer.length;
      this.emit('progress', this.size);
      cb();
    });
  }

  end(cb) {
    if (this.hash) {
      this.hash = this.hash.digest('hex');
    }
    this._writeStream.end(() => {
      this.emit('end');
      cb();
    });
  }
}

const missingPlugin = 1000;
const pluginFunction = 1001;
const aborted = 1002;
const noParser = 1003;
const uninitializedParser = 1004;
const filenameNotString = 1005;
const maxFieldsSizeExceeded = 1006;
const maxFieldsExceeded = 1007;
const smallerThanMinFileSize = 1008;
const biggerThanTotalMaxFileSize = 1009;
const noEmptyFiles = 1010;
const missingContentType = 1011;
const malformedMultipart = 1012;
const missingMultipartBoundary = 1013;
const unknownTransferEncoding = 1014;
const maxFilesExceeded = 1015;
const biggerThanMaxFileSize = 1016;
const pluginFailed = 1017;
const cannotCreateDir = 1018;

const FormidableError = class extends Error {
  constructor(message, internalCode, httpCode = 500) {
    super(message);
    this.code = internalCode;
    this.httpCode = httpCode;
  }
};

var FormidableError$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  aborted: aborted,
  biggerThanMaxFileSize: biggerThanMaxFileSize,
  biggerThanTotalMaxFileSize: biggerThanTotalMaxFileSize,
  cannotCreateDir: cannotCreateDir,
  default: FormidableError,
  filenameNotString: filenameNotString,
  malformedMultipart: malformedMultipart,
  maxFieldsExceeded: maxFieldsExceeded,
  maxFieldsSizeExceeded: maxFieldsSizeExceeded,
  maxFilesExceeded: maxFilesExceeded,
  missingContentType: missingContentType,
  missingMultipartBoundary: missingMultipartBoundary,
  missingPlugin: missingPlugin,
  noEmptyFiles: noEmptyFiles,
  noParser: noParser,
  pluginFailed: pluginFailed,
  pluginFunction: pluginFunction,
  smallerThanMinFileSize: smallerThanMinFileSize,
  uninitializedParser: uninitializedParser,
  unknownTransferEncoding: unknownTransferEncoding
});

/* eslint-disable no-underscore-dangle */


class DummyParser extends node_stream.Transform {
  constructor(incomingForm, options = {}) {
    super();
    this.globalOptions = { ...options };
    this.incomingForm = incomingForm;
  }

  _flush(callback) {
    this.incomingForm.ended = true;
    this.incomingForm._maybeEnd();
    callback();
  }
}

/* eslint-disable no-fallthrough */
/* eslint-disable no-bitwise */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */


let s = 0;
const STATE = {
  PARSER_UNINITIALIZED: s++,
  START: s++,
  START_BOUNDARY: s++,
  HEADER_FIELD_START: s++,
  HEADER_FIELD: s++,
  HEADER_VALUE_START: s++,
  HEADER_VALUE: s++,
  HEADER_VALUE_ALMOST_DONE: s++,
  HEADERS_ALMOST_DONE: s++,
  PART_DATA_START: s++,
  PART_DATA: s++,
  PART_END: s++,
  END: s++,
};

let f = 1;
const FBOUNDARY = { PART_BOUNDARY: f, LAST_BOUNDARY: (f *= 2) };

const LF = 10;
const CR = 13;
const SPACE = 32;
const HYPHEN = 45;
const COLON = 58;
const A = 97;
const Z = 122;

function lower(c) {
  return c | 0x20;
}

const STATES = {};

Object.keys(STATE).forEach((stateName) => {
  STATES[stateName] = STATE[stateName];
});

class MultipartParser extends node_stream.Transform {
  constructor(options = {}) {
    super({ readableObjectMode: true });
    this.boundary = null;
    this.boundaryChars = null;
    this.lookbehind = null;
    this.bufferLength = 0;
    this.state = STATE.PARSER_UNINITIALIZED;

    this.globalOptions = { ...options };
    this.index = null;
    this.flags = 0;
  }

  _endUnexpected() {
    return new FormidableError(
      `MultipartParser.end(): stream ended unexpectedly: ${this.explain()}`,
      malformedMultipart,
      400,
    );
  }

  _flush(done) {
    if (
      (this.state === STATE.HEADER_FIELD_START && this.index === 0) ||
      (this.state === STATE.PART_DATA && this.index === this.boundary.length)
    ) {
      this._handleCallback('partEnd');
      this._handleCallback('end');
      done();
    } else if (this.state !== STATE.END) {
      done(this._endUnexpected());
    } else {
      done();
    }
  }

  initWithBoundary(str) {
    this.boundary = Buffer.from(`\r\n--${str}`);
    this.lookbehind = Buffer.alloc(this.boundary.length + 8);
    this.state = STATE.START;
    this.boundaryChars = {};

    for (let i = 0; i < this.boundary.length; i++) {
      this.boundaryChars[this.boundary[i]] = true;
    }
  }

  // eslint-disable-next-line max-params
  _handleCallback(name, buf, start, end) {
    if (start !== undefined && start === end) {
      return;
    }
    this.push({ name, buffer: buf, start, end });
  }

  // eslint-disable-next-line max-statements
  _transform(buffer, _, done) {
    let i = 0;
    let prevIndex = this.index;
    let { index, state, flags } = this;
    const { lookbehind, boundary, boundaryChars } = this;
    const boundaryLength = boundary.length;
    const boundaryEnd = boundaryLength - 1;
    this.bufferLength = buffer.length;
    let c = null;
    let cl = null;

    const setMark = (name, idx) => {
      this[`${name}Mark`] = typeof idx === 'number' ? idx : i;
    };

    const clearMarkSymbol = (name) => {
      delete this[`${name}Mark`];
    };

    const dataCallback = (name, shouldClear) => {
      const markSymbol = `${name}Mark`;
      if (!(markSymbol in this)) {
        return;
      }

      if (!shouldClear) {
        this._handleCallback(name, buffer, this[markSymbol], buffer.length);
        setMark(name, 0);
      } else {
        this._handleCallback(name, buffer, this[markSymbol], i);
        clearMarkSymbol(name);
      }
    };

    for (i = 0; i < this.bufferLength; i++) {
      c = buffer[i];
      switch (state) {
        case STATE.PARSER_UNINITIALIZED:
          done(this._endUnexpected());
          return;
        case STATE.START:
          index = 0;
          state = STATE.START_BOUNDARY;
        case STATE.START_BOUNDARY:
          if (index === boundary.length - 2) {
            if (c === HYPHEN) {
              flags |= FBOUNDARY.LAST_BOUNDARY;
            } else if (c !== CR) {
              done(this._endUnexpected());
              return;
            }
            index++;
            break;
          } else if (index - 1 === boundary.length - 2) {
            if (flags & FBOUNDARY.LAST_BOUNDARY && c === HYPHEN) {
              this._handleCallback('end');
              state = STATE.END;
              flags = 0;
            } else if (!(flags & FBOUNDARY.LAST_BOUNDARY) && c === LF) {
              index = 0;
              this._handleCallback('partBegin');
              state = STATE.HEADER_FIELD_START;
            } else {
              done(this._endUnexpected());
              return;
            }
            break;
          }

          if (c !== boundary[index + 2]) {
            index = -2;
          }
          if (c === boundary[index + 2]) {
            index++;
          }
          break;
        case STATE.HEADER_FIELD_START:
          state = STATE.HEADER_FIELD;
          setMark('headerField');
          index = 0;
        case STATE.HEADER_FIELD:
          if (c === CR) {
            clearMarkSymbol('headerField');
            state = STATE.HEADERS_ALMOST_DONE;
            break;
          }

          index++;
          if (c === HYPHEN) {
            break;
          }

          if (c === COLON) {
            if (index === 1) {
              // empty header field
              done(this._endUnexpected());
              return;
            }
            dataCallback('headerField', true);
            state = STATE.HEADER_VALUE_START;
            break;
          }

          cl = lower(c);
          if (cl < A || cl > Z) {
            done(this._endUnexpected());
            return;
          }
          break;
        case STATE.HEADER_VALUE_START:
          if (c === SPACE) {
            break;
          }

          setMark('headerValue');
          state = STATE.HEADER_VALUE;
        case STATE.HEADER_VALUE:
          if (c === CR) {
            dataCallback('headerValue', true);
            this._handleCallback('headerEnd');
            state = STATE.HEADER_VALUE_ALMOST_DONE;
          }
          break;
        case STATE.HEADER_VALUE_ALMOST_DONE:
          if (c !== LF) {
            done(this._endUnexpected());
return;
          }
          state = STATE.HEADER_FIELD_START;
          break;
        case STATE.HEADERS_ALMOST_DONE:
          if (c !== LF) {
            done(this._endUnexpected());
            return;
          }

          this._handleCallback('headersEnd');
          state = STATE.PART_DATA_START;
          break;
        case STATE.PART_DATA_START:
          state = STATE.PART_DATA;
          setMark('partData');
        case STATE.PART_DATA:
          prevIndex = index;

          if (index === 0) {
            // boyer-moore derived algorithm to safely skip non-boundary data
            i += boundaryEnd;
            while (i < this.bufferLength && !(buffer[i] in boundaryChars)) {
              i += boundaryLength;
            }
            i -= boundaryEnd;
            c = buffer[i];
          }

          if (index < boundary.length) {
            if (boundary[index] === c) {
              if (index === 0) {
                dataCallback('partData', true);
              }
              index++;
            } else {
              index = 0;
            }
          } else if (index === boundary.length) {
            index++;
            if (c === CR) {
              // CR = part boundary
              flags |= FBOUNDARY.PART_BOUNDARY;
            } else if (c === HYPHEN) {
              // HYPHEN = end boundary
              flags |= FBOUNDARY.LAST_BOUNDARY;
            } else {
              index = 0;
            }
          } else if (index - 1 === boundary.length) {
            if (flags & FBOUNDARY.PART_BOUNDARY) {
              index = 0;
              if (c === LF) {
                // unset the PART_BOUNDARY flag
                flags &= ~FBOUNDARY.PART_BOUNDARY;
                this._handleCallback('partEnd');
                this._handleCallback('partBegin');
                state = STATE.HEADER_FIELD_START;
                break;
              }
            } else if (flags & FBOUNDARY.LAST_BOUNDARY) {
              if (c === HYPHEN) {
                this._handleCallback('partEnd');
                this._handleCallback('end');
                state = STATE.END;
                flags = 0;
              } else {
                index = 0;
              }
            } else {
              index = 0;
            }
          }

          if (index > 0) {
            // when matching a possible boundary, keep a lookbehind reference
            // in case it turns out to be a false lead
            lookbehind[index - 1] = c;
          } else if (prevIndex > 0) {
            // if our boundary turned out to be rubbish, the captured lookbehind
            // belongs to partData
            this._handleCallback('partData', lookbehind, 0, prevIndex);
            prevIndex = 0;
            setMark('partData');

            // reconsider the current character even so it interrupted the sequence
            // it could be the beginning of a new sequence
            i--;
          }

          break;
        case STATE.END:
          break;
        default:
          done(this._endUnexpected());
          return;
      }
    }

    dataCallback('headerField');
    dataCallback('headerValue');
    dataCallback('partData');

    this.index = index;
    this.state = state;
    this.flags = flags;

    done();
    return this.bufferLength;
  }

  explain() {
    return `state = ${MultipartParser.stateToString(this.state)}`;
  }
}

// eslint-disable-next-line consistent-return
MultipartParser.stateToString = (stateNumber) => {
  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const stateName in STATE) {
    const number = STATE[stateName];
    if (number === stateNumber) return stateName;
  }
};

var MultipartParser$1 = Object.assign(MultipartParser, { STATES });

class OctetStreamParser extends node_stream.PassThrough {
  constructor(options = {}) {
    super();
    this.globalOptions = { ...options };
  }
}

/* eslint-disable no-underscore-dangle */


const octetStreamType = 'octet-stream';
// the `options` is also available through the `options` / `formidable.options`
async function plugin$3(formidable, options) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  if (/octet-stream/i.test(self.headers['content-type'])) {
    await init$2.call(self, self, options);
  }
  return self;
}

// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
async function init$2(_self, _opts) {
  this.type = octetStreamType;
  const originalFilename = this.headers['x-file-name'];
  const mimetype = this.headers['content-type'];

  const thisPart = {
    originalFilename,
    mimetype,
  };
  const newFilename = this._getNewName(thisPart);
  const filepath = this._joinDirectoryName(newFilename);
  const file = await this._newFile({
    newFilename,
    filepath,
    originalFilename,
    mimetype,
  });

  this.emit('fileBegin', originalFilename, file);
  file.open();
  this.openedFiles.push(file);
  this._flushing += 1;

  this._parser = new OctetStreamParser(this.options);

  // Keep track of writes that haven't finished so we don't emit the file before it's done being written
  let outstandingWrites = 0;

  this._parser.on('data', (buffer) => {
    this.pause();
    outstandingWrites += 1;

    file.write(buffer, () => {
      outstandingWrites -= 1;
      this.resume();

      if (this.ended) {
        this._parser.emit('doneWritingFile');
      }
    });
  });

  this._parser.on('end', () => {
    this._flushing -= 1;
    this.ended = true;

    const done = () => {
      file.end(() => {
        this.emit('file', 'file', file);
        this._maybeEnd();
      });
    };

    if (outstandingWrites === 0) {
      done();
    } else {
      this._parser.once('doneWritingFile', done);
    }
  });

  return this;
}

/* eslint-disable no-underscore-dangle */


// This is a buffering parser, have a look at StreamingQuerystring.js for a streaming parser
class QuerystringParser extends node_stream.Transform {
  constructor(options = {}) {
    super({ readableObjectMode: true });
    this.globalOptions = { ...options };
    this.buffer = '';
    this.bufferLength = 0;
  }

  _transform(buffer, encoding, callback) {
    this.buffer += buffer.toString('ascii');
    this.bufferLength = this.buffer.length;
    callback();
  }

  _flush(callback) {
    const fields = new URLSearchParams(this.buffer);
    for (const [key, value] of fields) {
      this.push({
        key,
        value,
      });
    }
    this.buffer = '';
    callback();
  }
}

/* eslint-disable no-underscore-dangle */


const querystringType = 'urlencoded';
// the `options` is also available through the `this.options` / `formidable.options`
function plugin$2(formidable, options) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  if (/urlencoded/i.test(self.headers['content-type'])) {
    init$1.call(self, self, options);
  }
  return self;
}
// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
function init$1(_self, _opts) {
  this.type = querystringType;

  const parser = new QuerystringParser(this.options);

  parser.on('data', ({ key, value }) => {
    this.emit('field', key, value);
  });

  parser.once('end', () => {
    this.ended = true;
    this._maybeEnd();
  });

  this._parser = parser;

  return this;
}

/* eslint-disable no-underscore-dangle */


const multipartType = 'multipart';
// the `options` is also available through the `options` / `formidable.options`
function plugin$1(formidable, options) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  // NOTE: we (currently) support both multipart/form-data and multipart/related
  const multipart = /multipart/i.test(self.headers['content-type']);

  if (multipart) {
    const m = self.headers['content-type'].match(
      /boundary=(?:"([^"]+)"|([^;]+))/i,
    );
    if (m) {
      const initMultipart = createInitMultipart(m[1] || m[2]);
      initMultipart.call(self, self, options); // lgtm [js/superfluous-trailing-arguments]
    } else {
      const err = new FormidableError(
        'bad content-type header, no multipart boundary',
        missingMultipartBoundary,
        400,
      );
      self._error(err);
    }
  }
  return self;
}

// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
function createInitMultipart(boundary) {
  return function initMultipart() {
    this.type = multipartType;

    const parser = new MultipartParser$1(this.options);
    let headerField;
    let headerValue;
    let part;

    parser.initWithBoundary(boundary);

    // eslint-disable-next-line max-statements, consistent-return
    parser.on('data', async ({ name, buffer, start, end }) => {
      if (name === 'partBegin') {
        part = new node_stream.Stream();
        part.readable = true;
        part.headers = {};
        part.name = null;
        part.originalFilename = null;
        part.mimetype = null;

        part.transferEncoding = this.options.encoding;
        part.transferBuffer = '';

        headerField = '';
        headerValue = '';
      } else if (name === 'headerField') {
        headerField += buffer.toString(this.options.encoding, start, end);
      } else if (name === 'headerValue') {
        headerValue += buffer.toString(this.options.encoding, start, end);
      } else if (name === 'headerEnd') {
        headerField = headerField.toLowerCase();
        part.headers[headerField] = headerValue;

        // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
        const m = headerValue.match(
          // eslint-disable-next-line no-useless-escape
          /\bname=("([^"]*)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))/i,
        );
        if (headerField === 'content-disposition') {
          if (m) {
            part.name = m[2] || m[3] || '';
          }

          part.originalFilename = this._getFileName(headerValue);
        } else if (headerField === 'content-type') {
          part.mimetype = headerValue;
        } else if (headerField === 'content-transfer-encoding') {
          part.transferEncoding = headerValue.toLowerCase();
        }

        headerField = '';
        headerValue = '';
      } else if (name === 'headersEnd') {
        switch (part.transferEncoding) {
          case 'binary':
          case '7bit':
          case '8bit':
          case 'utf-8': {
            const dataPropagation = (ctx) => {
              if (ctx.name === 'partData') {
                part.emit('data', ctx.buffer.slice(ctx.start, ctx.end));
              }
            };
            const dataStopPropagation = (ctx) => {
              if (ctx.name === 'partEnd') {
                part.emit('end');
                parser.off('data', dataPropagation);
                parser.off('data', dataStopPropagation);
              }
            };
            parser.on('data', dataPropagation);
            parser.on('data', dataStopPropagation);
            break;
          }
          case 'base64': {
            const dataPropagation = (ctx) => {
              if (ctx.name === 'partData') {
                part.transferBuffer += ctx.buffer
                  .slice(ctx.start, ctx.end)
                  .toString('ascii');

                /*
                  four bytes (chars) in base64 converts to three bytes in binary
                  encoding. So we should always work with a number of bytes that
                  can be divided by 4, it will result in a number of bytes that
                  can be divided vy 3.
                  */
                const offset = parseInt(part.transferBuffer.length / 4, 10) * 4;
                part.emit(
                  'data',
                  Buffer.from(
                    part.transferBuffer.substring(0, offset),
                    'base64',
                  ),
                );
                part.transferBuffer = part.transferBuffer.substring(offset);
              }
            };
            const dataStopPropagation = (ctx) => {
              if (ctx.name === 'partEnd') {
                part.emit('data', Buffer.from(part.transferBuffer, 'base64'));
                part.emit('end');
                parser.off('data', dataPropagation);
                parser.off('data', dataStopPropagation);
              }
            };
            parser.on('data', dataPropagation);
            parser.on('data', dataStopPropagation);
            break;
          }
          default:
            return this._error(
              new FormidableError(
                'unknown transfer-encoding',
                unknownTransferEncoding,
                501,
              ),
            );
        }
        this._parser.pause();
        await this.onPart(part);
        this._parser.resume();
      } else if (name === 'end') {
        this.ended = true;
        this._maybeEnd();
      }
    });

    this._parser = parser;
  };
}

/* eslint-disable no-underscore-dangle */


class JSONParser extends node_stream.Transform {
  constructor(options = {}) {
    super({ readableObjectMode: true });
    this.chunks = [];
    this.globalOptions = { ...options };
  }

  _transform(chunk, encoding, callback) {
    this.chunks.push(String(chunk)); // todo consider using a string decoder
    callback();
  }

  _flush(callback) {
    try {
      const fields = JSON.parse(this.chunks.join(''));
      this.push(fields);
    } catch (e) {
      callback(e);
      return;
    }
    this.chunks = null;
    callback();
  }
}

/* eslint-disable no-underscore-dangle */


const jsonType = 'json';
// the `options` is also available through the `this.options` / `formidable.options`
function plugin(formidable, options) {
  // the `this` context is always formidable, as the first argument of a plugin
  // but this allows us to customize/test each plugin

  /* istanbul ignore next */
  const self = this || formidable;

  if (/json/i.test(self.headers['content-type'])) {
    init.call(self, self, options);
  }

  return self;
}
// Note that it's a good practice (but it's up to you) to use the `this.options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `this.options`)
function init(_self, _opts) {
  this.type = jsonType;

  const parser = new JSONParser(this.options);

  parser.on('data', (fields) => {
    this.fields = fields;
  });

  parser.once('end', () => {
    this.ended = true;
    this._maybeEnd();
  });

  this._parser = parser;
}

/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */


const CUID2_FINGERPRINT = `${process.env.NODE_ENV}-${os.platform()}-${os.hostname()}`;
const createId = cuid2.init({ length: 25, fingerprint: CUID2_FINGERPRINT.toLowerCase() });

const DEFAULT_OPTIONS = {
  maxFields: 1000,
  maxFieldsSize: 20 * 1024 * 1024,
  maxFiles: Infinity,
  maxFileSize: 200 * 1024 * 1024,
  maxTotalFileSize: undefined,
  minFileSize: 1,
  allowEmptyFiles: false,
  createDirsFromUploads: false,
  keepExtensions: false,
  encoding: 'utf-8',
  hashAlgorithm: false,
  uploadDir: os.tmpdir(),
  enabledPlugins: [plugin$3, plugin$2, plugin$1, plugin],
  fileWriteStreamHandler: null,
  defaultInvalidName: 'invalid-name',
  filter(_part) {
    return true;
  },
  filename: undefined,
};

function hasOwnProp(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}


const decorateForceSequential = function (promiseCreator) {
  /* forces a function that returns a promise to be sequential
  useful for fs  for example */
  let lastPromise = Promise.resolve();
  return async function (...x) {
      const promiseWeAreWaitingFor = lastPromise;
      let currentPromise;
      let callback;
      // we need to change lastPromise before await anything,
      // otherwise 2 calls might wait the same thing
      lastPromise = new Promise(function (resolve) {
          callback = resolve;
      });
      await promiseWeAreWaitingFor;
      currentPromise = promiseCreator(...x);
      currentPromise.then(callback).catch(callback);
      return currentPromise;
  };
};

const createNecessaryDirectoriesAsync = decorateForceSequential(function (filePath) {
  const directoryname = path.dirname(filePath);
  return fsPromises.mkdir(directoryname, { recursive: true });
});

const invalidExtensionChar = (c) => {
  const code = c.charCodeAt(0);
  return !(
    code === 46 || // .
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  );
};

class IncomingForm extends node_events.EventEmitter {
  constructor(options = {}) {
    super();

    this.options = { ...DEFAULT_OPTIONS, ...options };
    if (!this.options.maxTotalFileSize) {
      this.options.maxTotalFileSize = this.options.maxFileSize;
    }

    const dir = path.resolve(
      this.options.uploadDir || this.options.uploaddir || os.tmpdir(),
    );

    this.uploaddir = dir;
    this.uploadDir = dir;

    // initialize with null
    [
      'error',
      'headers',
      'type',
      'bytesExpected',
      'bytesReceived',
      '_parser',
      'req',
    ].forEach((key) => {
      this[key] = null;
    });

    this._setUpRename();

    this._flushing = 0;
    this._fieldsSize = 0;
    this._totalFileSize = 0;
    this._plugins = [];
    this.openedFiles = [];

    this.options.enabledPlugins = []
      .concat(this.options.enabledPlugins)
      .filter(Boolean);

    if (this.options.enabledPlugins.length === 0) {
      throw new FormidableError(
        'expect at least 1 enabled builtin plugin, see options.enabledPlugins',
        missingPlugin,
      );
    }

    this.options.enabledPlugins.forEach((plugin) => {
      this.use(plugin);
    });

    this._setUpMaxFields();
    this._setUpMaxFiles();
    this.ended = undefined;
    this.type = undefined;
  }

  use(plugin) {
    if (typeof plugin !== 'function') {
      throw new FormidableError(
        '.use: expect `plugin` to be a function',
        pluginFunction,
      );
    }
    this._plugins.push(plugin.bind(this));
    return this;
  }

  pause () {
    try {
      this.req.pause();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }
    return true;
  }

  resume () {
    try {
      this.req.resume();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }

    return true;
  }

  // returns a promise if no callback is provided
  async parse(req, cb) {
    this.req = req;
    let promise;

    // Setup callback first, so we don't miss anything from data events emitted immediately.
    if (!cb) {
      let resolveRef;
      let rejectRef;
      promise = new Promise((resolve, reject) => {
        resolveRef = resolve;
        rejectRef = reject;
      });
      cb = (err, fields, files) => {
        if (err) {
          rejectRef(err);
        } else {
          resolveRef([fields, files]);
        }
      };
    }
    const callback = once(dezalgo(cb));
    this.fields = {};
    const files = {};

    this.on('field', (name, value) => {
      if (this.type === 'multipart' || this.type === 'urlencoded') {
        if (!hasOwnProp(this.fields, name)) {
          this.fields[name] = [value];
        } else {
          this.fields[name].push(value);
        }
      } else {
        this.fields[name] = value;
      }
    });
    this.on('file', (name, file) => {
      if (!hasOwnProp(files, name)) {
        files[name] = [file];
      } else {
        files[name].push(file);
      }
    });
    this.on('error', (err) => {
      callback(err, this.fields, files);
    });
    this.on('end', () => {
      callback(null, this.fields, files);
    });

    // Parse headers and setup the parser, ready to start listening for data.
    await this.writeHeaders(req.headers);

    // Start listening for data.
    req
      .on('error', (err) => {
        this._error(err);
      })
      .on('aborted', () => {
        this.emit('aborted');
        this._error(new FormidableError('Request aborted', aborted));
      })
      .on('data', (buffer) => {
        try {
          this.write(buffer);
        } catch (err) {
          this._error(err);
        }
      })
      .on('end', () => {
        if (this.error) {
          return;
        }
        if (this._parser) {
          this._parser.end();
        }
      });
    if (promise) {
      return promise;
    }
    return this;
  }

  async writeHeaders(headers) {
    this.headers = headers;
    this._parseContentLength();
    await this._parseContentType();

    if (!this._parser) {
      this._error(
        new FormidableError(
          'no parser found',
          noParser,
          415, // Unsupported Media Type
        ),
      );
      return;
    }

    this._parser.once('error', (error) => {
      this._error(error);
    });
  }

  write(buffer) {
    if (this.error) {
      return null;
    }
    if (!this._parser) {
      this._error(
        new FormidableError('uninitialized parser', uninitializedParser),
      );
      return null;
    }

    this.bytesReceived += buffer.length;
    this.emit('progress', this.bytesReceived, this.bytesExpected);

    this._parser.write(buffer);

    return this.bytesReceived;
  }

  onPart(part) {
    // this method can be overwritten by the user
    return this._handlePart(part);
  }

  async _handlePart(part) {
    if (part.originalFilename && typeof part.originalFilename !== 'string') {
      this._error(
        new FormidableError(
          `the part.originalFilename should be string when it exists`,
          filenameNotString,
        ),
      );
      return;
    }

    // This MUST check exactly for undefined. You can not change it to !part.originalFilename.

    // todo: uncomment when switch tests to Jest
    // console.log(part);

    // ? NOTE(@tunnckocore): no it can be any falsey value, it most probably depends on what's returned
    // from somewhere else. Where recently I changed the return statements
    // and such thing because code style
    // ? NOTE(@tunnckocore): or even better, if there is no mimetype, then it's for sure a field
    // ? NOTE(@tunnckocore): originalFilename is an empty string when a field?
    if (!part.mimetype) {
      let value = '';
      const decoder = new node_string_decoder.StringDecoder(
        part.transferEncoding || this.options.encoding,
      );

      part.on('data', (buffer) => {
        this._fieldsSize += buffer.length;
        if (this._fieldsSize > this.options.maxFieldsSize) {
          this._error(
            new FormidableError(
              `options.maxFieldsSize (${this.options.maxFieldsSize} bytes) exceeded, received ${this._fieldsSize} bytes of field data`,
              maxFieldsSizeExceeded,
              413, // Payload Too Large
            ),
          );
          return;
        }
        value += decoder.write(buffer);
      });

      part.on('end', () => {
        this.emit('field', part.name, value);
      });
      return;
    }

    if (!this.options.filter(part)) {
      return;
    }

    this._flushing += 1;

    let fileSize = 0;
    const newFilename = this._getNewName(part);
    const filepath = this._joinDirectoryName(newFilename);
    const file = await this._newFile({
      newFilename,
      filepath,
      originalFilename: part.originalFilename,
      mimetype: part.mimetype,
    });
    file.on('error', (err) => {
      this._error(err);
    });
    this.emit('fileBegin', part.name, file);

    file.open();
    this.openedFiles.push(file);

    part.on('data', (buffer) => {
      this._totalFileSize += buffer.length;
      fileSize += buffer.length;

      if (this._totalFileSize > this.options.maxTotalFileSize) {
        this._error(
          new FormidableError(
            `options.maxTotalFileSize (${this.options.maxTotalFileSize} bytes) exceeded, received ${this._totalFileSize} bytes of file data`,
            biggerThanTotalMaxFileSize,
            413,
          ),
        );
        return;
      }
      if (buffer.length === 0) {
        return;
      }
      this.pause();
      file.write(buffer, () => {
        this.resume();
      });
    });

    part.on('end', () => {
      if (!this.options.allowEmptyFiles && fileSize === 0) {
        this._error(
          new FormidableError(
            `options.allowEmptyFiles is false, file size should be greater than 0`,
            noEmptyFiles,
            400,
          ),
        );
        return;
      }
      if (fileSize < this.options.minFileSize) {
        this._error(
          new FormidableError(
            `options.minFileSize (${this.options.minFileSize} bytes) inferior, received ${fileSize} bytes of file data`,
            smallerThanMinFileSize,
            400,
          ),
        );
        return;
      }
      if (fileSize > this.options.maxFileSize) {
        this._error(
          new FormidableError(
            `options.maxFileSize (${this.options.maxFileSize} bytes), received ${fileSize} bytes of file data`,
            biggerThanMaxFileSize,
            413,
          ),
        );
        return;
      }

      file.end(() => {
        this._flushing -= 1;
        this.emit('file', part.name, file);
        this._maybeEnd();
      });
    });
  }

  // eslint-disable-next-line max-statements
  async _parseContentType() {
    if (this.bytesExpected === 0) {
      this._parser = new DummyParser(this, this.options);
      return;
    }

    if (!this.headers['content-type']) {
      this._error(
        new FormidableError(
          'bad content-type header, no content-type',
          missingContentType,
          400,
        ),
      );
      return;
    }


    new DummyParser(this, this.options);

    const results = [];
    await Promise.all(this._plugins.map(async (plugin, idx) => {
      let pluginReturn = null;
      try {
        pluginReturn = await plugin(this, this.options) || this;
      } catch (err) {
        // directly throw from the `form.parse` method;
        // there is no other better way, except a handle through options
        const error = new FormidableError(
          `plugin on index ${idx} failed with: ${err.message}`,
          pluginFailed,
          500,
        );
        error.idx = idx;
        throw error;
      }
      Object.assign(this, pluginReturn);

      // todo: use Set/Map and pass plugin name instead of the `idx` index
      this.emit('plugin', idx, pluginReturn);
    }));
    this.emit('pluginsResults', results);
  }

  _error(err, eventName = 'error') {
    if (this.error || this.ended) {
      return;
    }

    this.req = null;
    this.error = err;
    this.emit(eventName, err);

    this.openedFiles.forEach((file) => {
      file.destroy();
    });
  }

  _parseContentLength() {
    this.bytesReceived = 0;
    if (this.headers['content-length']) {
      this.bytesExpected = parseInt(this.headers['content-length'], 10);
    } else if (this.headers['transfer-encoding'] === undefined) {
      this.bytesExpected = 0;
    }

    if (this.bytesExpected !== null) {
      this.emit('progress', this.bytesReceived, this.bytesExpected);
    }
  }

  _newParser() {
    return new MultipartParser$1(this.options);
  }

  async _newFile({ filepath, originalFilename, mimetype, newFilename }) {
    if (this.options.fileWriteStreamHandler) {
      return new VolatileFile({
        newFilename,
        filepath,
        originalFilename,
        mimetype,
        createFileWriteStream: this.options.fileWriteStreamHandler,
        hashAlgorithm: this.options.hashAlgorithm,
      });
    }
    if (this.options.createDirsFromUploads) {
      try {
        await createNecessaryDirectoriesAsync(filepath);
      } catch (errorCreatingDir) {
        this._error(new FormidableError(
          `cannot create directory`,
          cannotCreateDir,
          409,
        ));
      }
    }
    return new PersistentFile({
      newFilename,
      filepath,
      originalFilename,
      mimetype,
      hashAlgorithm: this.options.hashAlgorithm,
    });
  }

  _getFileName(headerValue) {
    // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
    const m = headerValue.match(
      /\bfilename=("(.*?)"|([^()<>{}[\]@,;:"?=\s/\t]+))($|;\s)/i,
    );
    if (!m) return null;

    const match = m[2] || m[3] || '';
    let originalFilename = match.substr(match.lastIndexOf('\\') + 1);
    originalFilename = originalFilename.replace(/%22/g, '"');
    originalFilename = originalFilename.replace(/&#([\d]{4});/g, (_, code) =>
      String.fromCharCode(code),
    );

    return originalFilename;
  }

  // able to get composed extension with multiple dots
  // "a.b.c" -> ".b.c"
  // as opposed to path.extname -> ".c"
  _getExtension(str) {
    if (!str) {
      return '';
    }

    const basename = path.basename(str);
    const firstDot = basename.indexOf('.');
    const lastDot = basename.lastIndexOf('.');
    let rawExtname = path.extname(basename);

    if (firstDot !== lastDot) {
      rawExtname =  basename.slice(firstDot);
    }

    let filtered;
    const firstInvalidIndex = Array.from(rawExtname).findIndex(invalidExtensionChar);
    if (firstInvalidIndex === -1) {
      filtered = rawExtname;
    } else {
      filtered = rawExtname.substring(0, firstInvalidIndex);
    }
    if (filtered === '.') {
      return '';
    }
    return filtered;
  }

  _joinDirectoryName(name) {
    const newPath = path.join(this.uploadDir, name);

    // prevent directory traversal attacks
    if (!newPath.startsWith(this.uploadDir)) {
      return path.join(this.uploadDir, this.options.defaultInvalidName);
    }

    return newPath;
  }

  _setUpRename() {
    const hasRename = typeof this.options.filename === 'function';
    if (hasRename) {
      this._getNewName = (part) => {
        let ext = '';
        let name = this.options.defaultInvalidName;
        if (part.originalFilename) {
          // can be null
          ({ ext, name } = path.parse(part.originalFilename));
          if (this.options.keepExtensions !== true) {
            ext = '';
          }
        }
        return this.options.filename.call(this, name, ext, part, this);
      };
    } else {
      this._getNewName = (part) => {
        const name = createId();

        if (part && this.options.keepExtensions) {
          const originalFilename =
            typeof part === 'string' ? part : part.originalFilename;
          return `${name}${this._getExtension(originalFilename)}`;
        }

        return name;
      };
    }
  }

  _setUpMaxFields() {
    if (this.options.maxFields !== Infinity) {
      let fieldsCount = 0;
      this.on('field', () => {
        fieldsCount += 1;
        if (fieldsCount > this.options.maxFields) {
          this._error(
            new FormidableError(
              `options.maxFields (${this.options.maxFields}) exceeded`,
              maxFieldsExceeded,
              413,
            ),
          );
        }
      });
    }
  }

  _setUpMaxFiles() {
    if (this.options.maxFiles !== Infinity) {
      let fileCount = 0;
      this.on('fileBegin', () => {
        fileCount += 1;
        if (fileCount > this.options.maxFiles) {
          this._error(
            new FormidableError(
              `options.maxFiles (${this.options.maxFiles}) exceeded`,
              maxFilesExceeded,
              413,
            ),
          );
        }
      });
    }
  }

  _maybeEnd() {
    if (!this.ended || this._flushing || this.error) {
      return;
    }
    this.req = null;
    this.emit('end');
  }
}

// make it available without requiring the `new` keyword
// if you want it access `const formidable.IncomingForm` as v1
const formidable = (...args) => new IncomingForm(...args);
const {enabledPlugins} = DEFAULT_OPTIONS;

exports.DummyParser = DummyParser;
exports.File = PersistentFile;
exports.Formidable = IncomingForm;
exports.IncomingForm = IncomingForm;
exports.JSONParser = JSONParser;
exports.MultipartParser = MultipartParser$1;
exports.OctetStreamParser = OctetStreamParser;
exports.OctetstreamParser = OctetStreamParser;
exports.PersistentFile = PersistentFile;
exports.QueryStringParser = QuerystringParser;
exports.QuerystringParser = QuerystringParser;
exports.VolatileFile = VolatileFile;
exports.default = formidable;
exports.defaultOptions = DEFAULT_OPTIONS;
exports.enabledPlugins = enabledPlugins;
exports.errors = FormidableError$1;
exports.formidable = formidable;
exports.json = plugin;
exports.multipart = plugin$1;
exports.octetstream = plugin$3;
exports.querystring = plugin$2;
