'use strict';

const crypto = require('crypto');
const Transform = require('stream').Transform;

class StreamHash extends Transform {
    constructor(attachment, algo) {
        super();
        this.attachment = attachment;
        this.algo = (algo || 'md5').toLowerCase();
        this.hash = crypto.createHash(algo);
        this.byteCount = 0;
    }

    _transform(chunk, encoding, done) {
        this.hash.update(chunk);
        this.byteCount += chunk.length;
        done(null, chunk);
    }

    _flush(done) {
        this.attachment.checksum = this.hash.digest('hex');
        this.attachment.size = this.byteCount;
        done();
    }
}

module.exports = StreamHash;
