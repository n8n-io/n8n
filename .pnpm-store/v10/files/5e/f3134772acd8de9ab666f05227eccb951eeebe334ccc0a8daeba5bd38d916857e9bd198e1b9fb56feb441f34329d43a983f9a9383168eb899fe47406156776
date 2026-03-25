'use strict';

const { Buffer } = require('node:buffer');
const stream = require('node:stream');
const Transform = stream.Transform;

/**
 * Encodes a Buffer into a base64 encoded string
 *
 * @param {Buffer} buffer Buffer to convert
 * @returns {String} base64 encoded string
 */
function encode(buffer) {
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer, 'utf-8');
    }

    return buffer.toString('base64');
}

/**
 * Decodes a base64 encoded string to a Buffer object
 *
 * @param {String} str base64 encoded string
 * @returns {Buffer} Decoded value
 */
function decode(str) {
    str = str || '';
    return Buffer.from(str, 'base64');
}

/**
 * Adds soft line breaks to a base64 string
 *
 * @param {String} str base64 encoded string that might need line wrapping
 * @param {Number} [lineLength=76] Maximum allowed length for a line
 * @returns {String} Soft-wrapped base64 encoded string
 */
function wrap(str, lineLength) {
    str = (str || '').toString();
    lineLength = lineLength || 76;

    if (str.length <= lineLength) {
        return str;
    }

    let result = [];
    let pos = 0;
    let chunkLength = lineLength * 1024;
    while (pos < str.length) {
        let wrappedLines = str
            .substr(pos, chunkLength)
            .replace(new RegExp('.{' + lineLength + '}', 'g'), '$&\r\n')
            .trim();
        result.push(wrappedLines);
        pos += chunkLength;
    }

    return result.join('\r\n').trim();
}

/**
 * Creates a transform stream for encoding data to base64 encoding
 *
 * @constructor
 * @param {Object} options Stream options
 * @param {Number} [options.lineLength=76] Maximum lenght for lines, set to false to disable wrapping
 */
class Encoder extends Transform {
    constructor(options) {
        super();
        // init Transform
        this.options = options || {};

        if (this.options.lineLength !== false) {
            this.options.lineLength = Number(this.options.lineLength) || 76;
        }

        this.skipStartBytes = Number(this.options.skipStartBytes) || 0;
        this.limitOutbutBytes = Number(this.options.limitOutbutBytes) || 0;

        // startPadding can be used together with skipStartBytes
        this._curLine = this.options.startPadding || '';
        this._remainingBytes = false;

        this.inputBytes = 0;
        this.outputBytes = 0;
    }

    _writeChunk(chunk /*, isFinal */) {
        if (this.skipStartBytes) {
            if (chunk.length <= this.skipStartBytes) {
                this.skipStartBytes -= chunk.length;
                return;
            }

            chunk = chunk.slice(this.skipStartBytes);
            this.skipStartBytes = 0;
        }

        if (this.limitOutbutBytes) {
            if (this.outputBytes + chunk.length <= this.limitOutbutBytes) {
                // ignore, can use entire chunk
            } else if (this.outputBytes >= this.limitOutbutBytes) {
                // chunks already processed
                return;
            } else {
                // use partial chunk
                chunk = chunk.slice(0, this.limitOutbutBytes - this.outputBytes);
            }
        }

        this.outputBytes += chunk.length;
        this.push(chunk);
    }

    _getWrapped(str, isFinal) {
        str = wrap(str, this.options.lineLength);
        if (!isFinal && str.length === this.options.lineLength) {
            str += '\r\n';
        }
        return str;
    }

    _transform(chunk, encoding, done) {
        if (encoding !== 'buffer') {
            chunk = Buffer.from(chunk, encoding);
        }

        if (!chunk || !chunk.length) {
            return setImmediate(done);
        }

        this.inputBytes += chunk.length;

        if (this._remainingBytes && this._remainingBytes.length) {
            chunk = Buffer.concat([this._remainingBytes, chunk], this._remainingBytes.length + chunk.length);
            this._remainingBytes = false;
        }

        if (chunk.length % 3) {
            this._remainingBytes = chunk.slice(chunk.length - (chunk.length % 3));
            chunk = chunk.slice(0, chunk.length - (chunk.length % 3));
        } else {
            this._remainingBytes = false;
        }

        let b64 = this._curLine + encode(chunk);

        if (this.options.lineLength) {
            b64 = this._getWrapped(b64);

            // remove last line as it is still most probably incomplete
            let lastLF = b64.lastIndexOf('\n');
            if (lastLF < 0) {
                this._curLine = b64;
                b64 = '';
            } else if (lastLF === b64.length - 1) {
                this._curLine = '';
            } else {
                this._curLine = b64.substr(lastLF + 1);
                b64 = b64.substr(0, lastLF + 1);
            }
        }

        if (b64) {
            this._writeChunk(Buffer.from(b64, 'ascii'), false);
        }

        setImmediate(done);
    }

    _flush(done) {
        if (this._remainingBytes && this._remainingBytes.length) {
            this._curLine += encode(this._remainingBytes);
        }

        if (this._curLine) {
            this._curLine = this._getWrapped(this._curLine, true);
            this._writeChunk(Buffer.from(this._curLine, 'ascii'), true);
            this._curLine = '';
        }
        done();
    }
}

/**
 * Creates a transform stream for decoding base64 encoded strings
 *
 * @constructor
 * @param {Object} options Stream options
 */
class Decoder extends Transform {
    constructor(options) {
        super();
        // init Transform
        this.options = options || {};
        this._curLine = '';

        this.inputBytes = 0;
        this.outputBytes = 0;
    }

    _transform(chunk, encoding, done) {
        if (!chunk || !chunk.length) {
            return setImmediate(done);
        }

        this.inputBytes += chunk.length;

        let b64 = this._curLine + chunk.toString('ascii');
        this._curLine = '';

        if (/[^a-zA-Z0-9+/=]/.test(b64)) {
            b64 = b64.replace(/[^a-zA-Z0-9+/=]/g, '');
        }

        if (b64.length < 4) {
            this._curLine = b64;
            b64 = '';
        } else if (b64.length % 4) {
            this._curLine = b64.substr(-b64.length % 4);
            b64 = b64.substr(0, b64.length - this._curLine.length);
        }

        if (b64) {
            let buf = decode(b64);
            this.outputBytes += buf.length;
            this.push(buf);
        }

        setImmediate(done);
    }

    _flush(done) {
        if (this._curLine) {
            let buf = decode(this._curLine);
            this.outputBytes += buf.length;
            this.push(buf);
            this._curLine = '';
        }
        setImmediate(done);
    }
}

// expose to the world
module.exports = {
    encode,
    decode,
    wrap,
    Encoder,
    Decoder
};
