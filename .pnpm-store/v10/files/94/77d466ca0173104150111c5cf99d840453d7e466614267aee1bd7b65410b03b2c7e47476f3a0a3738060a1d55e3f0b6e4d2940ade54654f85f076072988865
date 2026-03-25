/* eslint-disable no-underscore-dangle */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

class PersistentFile extends EventEmitter {
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
    }, 1)
  }
}

export default PersistentFile;
