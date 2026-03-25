var ber = require('asn1').Ber;
var _ = require('../utils')._;
var PUBLIC_RSA_OID = '1.2.840.113549.1.1.1';
var utils = require('../utils');

const PRIVATE_OPENING_BOUNDARY = '-----BEGIN PRIVATE KEY-----';
const PRIVATE_CLOSING_BOUNDARY = '-----END PRIVATE KEY-----';

const PUBLIC_OPENING_BOUNDARY = '-----BEGIN PUBLIC KEY-----';
const PUBLIC_CLOSING_BOUNDARY = '-----END PUBLIC KEY-----';

module.exports = {
    privateExport: function (key, options) {
        options = options || {};

        var n = key.n.toBuffer();
        var d = key.d.toBuffer();
        var p = key.p.toBuffer();
        var q = key.q.toBuffer();
        var dmp1 = key.dmp1.toBuffer();
        var dmq1 = key.dmq1.toBuffer();
        var coeff = key.coeff.toBuffer();

        var length = n.length + d.length + p.length + q.length + dmp1.length + dmq1.length + coeff.length + 512; // magic
        var bodyWriter = new ber.Writer({size: length});

        bodyWriter.startSequence();
        bodyWriter.writeInt(0);
        bodyWriter.writeBuffer(n, 2);
        bodyWriter.writeInt(key.e);
        bodyWriter.writeBuffer(d, 2);
        bodyWriter.writeBuffer(p, 2);
        bodyWriter.writeBuffer(q, 2);
        bodyWriter.writeBuffer(dmp1, 2);
        bodyWriter.writeBuffer(dmq1, 2);
        bodyWriter.writeBuffer(coeff, 2);
        bodyWriter.endSequence();

        var writer = new ber.Writer({size: length});
        writer.startSequence();
        writer.writeInt(0);
        writer.startSequence();
        writer.writeOID(PUBLIC_RSA_OID);
        writer.writeNull();
        writer.endSequence();
        writer.writeBuffer(bodyWriter.buffer, 4);
        writer.endSequence();

        if (options.type === 'der') {
            return writer.buffer;
        } else {
            return PRIVATE_OPENING_BOUNDARY + '\n' + utils.linebrk(writer.buffer.toString('base64'), 64) + '\n' + PRIVATE_CLOSING_BOUNDARY;
        }
    },

    privateImport: function (key, data, options) {
        options = options || {};
        var buffer;

        if (options.type !== 'der') {
            if (Buffer.isBuffer(data)) {
                data = data.toString('utf8');
            }

            if (_.isString(data)) {
                var pem = utils.trimSurroundingText(data, PRIVATE_OPENING_BOUNDARY, PRIVATE_CLOSING_BOUNDARY)
                    .replace('-----END PRIVATE KEY-----', '')
                    .replace(/\s+|\n\r|\n|\r$/gm, '');
                buffer = Buffer.from(pem, 'base64');
            } else {
                throw Error('Unsupported key format');
            }
        } else if (Buffer.isBuffer(data)) {
            buffer = data;
        } else {
            throw Error('Unsupported key format');
        }

        var reader = new ber.Reader(buffer);
        reader.readSequence();
        reader.readInt(0);
        var header = new ber.Reader(reader.readString(0x30, true));

        if (header.readOID(0x06, true) !== PUBLIC_RSA_OID) {
            throw Error('Invalid Public key format');
        }

        var body = new ber.Reader(reader.readString(0x04, true));
        body.readSequence();
        body.readString(2, true); // just zero
        key.setPrivate(
            body.readString(2, true),  // modulus
            body.readString(2, true),  // publicExponent
            body.readString(2, true),  // privateExponent
            body.readString(2, true),  // prime1
            body.readString(2, true),  // prime2
            body.readString(2, true),  // exponent1 -- d mod (p1)
            body.readString(2, true),  // exponent2 -- d mod (q-1)
            body.readString(2, true)   // coefficient -- (inverse of q) mod p
        );
    },

    publicExport: function (key, options) {
        options = options || {};

        var n = key.n.toBuffer();
        var length = n.length + 512; // magic

        var bodyWriter = new ber.Writer({size: length});
        bodyWriter.writeByte(0);
        bodyWriter.startSequence();
        bodyWriter.writeBuffer(n, 2);
        bodyWriter.writeInt(key.e);
        bodyWriter.endSequence();

        var writer = new ber.Writer({size: length});
        writer.startSequence();
        writer.startSequence();
        writer.writeOID(PUBLIC_RSA_OID);
        writer.writeNull();
        writer.endSequence();
        writer.writeBuffer(bodyWriter.buffer, 3);
        writer.endSequence();

        if (options.type === 'der') {
            return writer.buffer;
        } else {
            return PUBLIC_OPENING_BOUNDARY + '\n' + utils.linebrk(writer.buffer.toString('base64'), 64) + '\n' + PUBLIC_CLOSING_BOUNDARY;
        }
    },

    publicImport: function (key, data, options) {
        options = options || {};
        var buffer;

        if (options.type !== 'der') {
            if (Buffer.isBuffer(data)) {
                data = data.toString('utf8');
            }

            if (_.isString(data)) {
                var pem = utils.trimSurroundingText(data, PUBLIC_OPENING_BOUNDARY, PUBLIC_CLOSING_BOUNDARY)
                    .replace(/\s+|\n\r|\n|\r$/gm, '');
                buffer = Buffer.from(pem, 'base64');
            }
        } else if (Buffer.isBuffer(data)) {
            buffer = data;
        } else {
            throw Error('Unsupported key format');
        }

        var reader = new ber.Reader(buffer);
        reader.readSequence();
        var header = new ber.Reader(reader.readString(0x30, true));

        if (header.readOID(0x06, true) !== PUBLIC_RSA_OID) {
            throw Error('Invalid Public key format');
        }

        var body = new ber.Reader(reader.readString(0x03, true));
        body.readByte();
        body.readSequence();
        key.setPublic(
            body.readString(0x02, true), // modulus
            body.readString(0x02, true)  // publicExponent
        );
    },

    /**
     * Trying autodetect and import key
     * @param key
     * @param data
     */
    autoImport: function (key, data) {
        if (/^[\S\s]*-----BEGIN PRIVATE KEY-----\s*(?=(([A-Za-z0-9+/=]+\s*)+))\1-----END PRIVATE KEY-----[\S\s]*$/g.test(data)) {
            module.exports.privateImport(key, data);
            return true;
        }

        if (/^[\S\s]*-----BEGIN PUBLIC KEY-----\s*(?=(([A-Za-z0-9+/=]+\s*)+))\1-----END PUBLIC KEY-----[\S\s]*$/g.test(data)) {
            module.exports.publicImport(key, data);
            return true;
        }

        return false;
    }
};
