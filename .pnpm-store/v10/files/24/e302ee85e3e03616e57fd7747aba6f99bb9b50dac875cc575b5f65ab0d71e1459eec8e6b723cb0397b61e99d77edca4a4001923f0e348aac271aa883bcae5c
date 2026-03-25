var _ = require("../utils")._;
var utils = require("../utils");
var BigInteger = require("../libs/jsbn");

const PRIVATE_OPENING_BOUNDARY = "-----BEGIN OPENSSH PRIVATE KEY-----";
const PRIVATE_CLOSING_BOUNDARY = "-----END OPENSSH PRIVATE KEY-----";

module.exports = {
    privateExport: function (key, options) {
        const nbuf = key.n.toBuffer();

        let ebuf = Buffer.alloc(4)
        ebuf.writeUInt32BE(key.e, 0);
        //Slice leading zeroes
        while (ebuf[0] === 0) ebuf = ebuf.slice(1);

        const dbuf = key.d.toBuffer();
        const coeffbuf = key.coeff.toBuffer();
        const pbuf = key.p.toBuffer();
        const qbuf = key.q.toBuffer();
        let commentbuf;
        if (typeof key.sshcomment !== "undefined") {
            commentbuf = Buffer.from(key.sshcomment);
        } else {
            commentbuf = Buffer.from([]);
        }

        const pubkeyLength =
            11 + // 32bit length, 'ssh-rsa'
            4 + ebuf.byteLength +
            4 + nbuf.byteLength;

        const privateKeyLength =
            8 + //64bit unused checksum
            11 + // 32bit length, 'ssh-rsa'
            4 + nbuf.byteLength +
            4 + ebuf.byteLength +
            4 + dbuf.byteLength +
            4 + coeffbuf.byteLength +
            4 + pbuf.byteLength +
            4 + qbuf.byteLength +
            4 + commentbuf.byteLength;

        let length =
            15 + //openssh-key-v1,0x00,
            16 + // 2*(32bit length, 'none')
            4 + // 32bit length, empty string
            4 + // 32bit number of keys
            4 + // 32bit pubkey length
            pubkeyLength +
            4 + //32bit private+checksum+comment+padding length
            privateKeyLength;

        const paddingLength = Math.ceil(privateKeyLength / 8) * 8 - privateKeyLength;
        length += paddingLength;

        const buf = Buffer.alloc(length);
        const writer = {buf: buf, off: 0};
        buf.write("openssh-key-v1", "utf8");
        buf.writeUInt8(0, 14);
        writer.off += 15;

        writeOpenSSHKeyString(writer, Buffer.from("none"));
        writeOpenSSHKeyString(writer, Buffer.from("none"));
        writeOpenSSHKeyString(writer, Buffer.from(""));

        writer.off = writer.buf.writeUInt32BE(1, writer.off);
        writer.off = writer.buf.writeUInt32BE(pubkeyLength, writer.off);

        writeOpenSSHKeyString(writer, Buffer.from("ssh-rsa"));
        writeOpenSSHKeyString(writer, ebuf);
        writeOpenSSHKeyString(writer, nbuf);

        writer.off = writer.buf.writeUInt32BE(
            length - 47 - pubkeyLength,
            writer.off
        );
        writer.off += 8;

        writeOpenSSHKeyString(writer, Buffer.from("ssh-rsa"));
        writeOpenSSHKeyString(writer, nbuf);
        writeOpenSSHKeyString(writer, ebuf);
        writeOpenSSHKeyString(writer, dbuf);
        writeOpenSSHKeyString(writer, coeffbuf);
        writeOpenSSHKeyString(writer, pbuf);
        writeOpenSSHKeyString(writer, qbuf);
        writeOpenSSHKeyString(writer, commentbuf);

        let pad = 0x01;
        while (writer.off < length) {
            writer.off = writer.buf.writeUInt8(pad++, writer.off);
        }

        if (options.type === "der") {
            return writer.buf
        } else {
            return PRIVATE_OPENING_BOUNDARY + "\n" + utils.linebrk(buf.toString("base64"), 70) + "\n" + PRIVATE_CLOSING_BOUNDARY + "\n";
        }
    },

    privateImport: function (key, data, options) {
        options = options || {};
        var buffer;

        if (options.type !== "der") {
            if (Buffer.isBuffer(data)) {
                data = data.toString("utf8");
            }

            if (_.isString(data)) {
                var pem = utils.trimSurroundingText(data, PRIVATE_OPENING_BOUNDARY, PRIVATE_CLOSING_BOUNDARY)
                    .replace(/\s+|\n\r|\n|\r$/gm, "");
                buffer = Buffer.from(pem, "base64");
            } else {
                throw Error("Unsupported key format");
            }
        } else if (Buffer.isBuffer(data)) {
            buffer = data;
        } else {
            throw Error("Unsupported key format");
        }

        const reader = {buf: buffer, off: 0};

        if (buffer.slice(0, 14).toString("ascii") !== "openssh-key-v1")
            throw "Invalid file format.";

        reader.off += 15;

        //ciphername
        if (readOpenSSHKeyString(reader).toString("ascii") !== "none")
            throw Error("Unsupported key type");
        //kdfname
        if (readOpenSSHKeyString(reader).toString("ascii") !== "none")
            throw Error("Unsupported key type");
        //kdf
        if (readOpenSSHKeyString(reader).toString("ascii") !== "")
            throw Error("Unsupported key type");
        //keynum
        reader.off += 4;

        //sshpublength
        reader.off += 4;

        //keytype
        if (readOpenSSHKeyString(reader).toString("ascii") !== "ssh-rsa")
            throw Error("Unsupported key type");
        readOpenSSHKeyString(reader);
        readOpenSSHKeyString(reader);

        reader.off += 12;
        if (readOpenSSHKeyString(reader).toString("ascii") !== "ssh-rsa")
            throw Error("Unsupported key type");

        const n = readOpenSSHKeyString(reader);
        const e = readOpenSSHKeyString(reader);
        const d = readOpenSSHKeyString(reader);
        const coeff = readOpenSSHKeyString(reader);
        const p = readOpenSSHKeyString(reader);
        const q = readOpenSSHKeyString(reader);

        //Calculate missing values
        const dint = new BigInteger(d);
        const qint = new BigInteger(q);
        const pint = new BigInteger(p);
        const dp = dint.mod(pint.subtract(BigInteger.ONE));
        const dq = dint.mod(qint.subtract(BigInteger.ONE));

        key.setPrivate(
            n,  // modulus
            e,  // publicExponent
            d,  // privateExponent
            p,  // prime1
            q,  // prime2
            dp.toBuffer(),  // exponent1 -- d mod (p1)
            dq.toBuffer(),  // exponent2 -- d mod (q-1)
            coeff  // coefficient -- (inverse of q) mod p
        );

        key.sshcomment = readOpenSSHKeyString(reader).toString("ascii");
    },

    publicExport: function (key, options) {
        let ebuf = Buffer.alloc(4)
        ebuf.writeUInt32BE(key.e, 0);
        //Slice leading zeroes
        while (ebuf[0] === 0) ebuf = ebuf.slice(1);
        const nbuf = key.n.toBuffer();
        const buf = Buffer.alloc(
            ebuf.byteLength + 4 +
            nbuf.byteLength + 4 +
            "ssh-rsa".length + 4
        );

        const writer = {buf: buf, off: 0};
        writeOpenSSHKeyString(writer, Buffer.from("ssh-rsa"));
        writeOpenSSHKeyString(writer, ebuf);
        writeOpenSSHKeyString(writer, nbuf);

        let comment = key.sshcomment || "";

        if (options.type === "der") {
            return writer.buf
        } else {
            return "ssh-rsa " + buf.toString("base64") + " " + comment + "\n";
        }
    },

    publicImport: function (key, data, options) {
        options = options || {};
        var buffer;

        if (options.type !== "der") {
            if (Buffer.isBuffer(data)) {
                data = data.toString("utf8");
            }

            if (_.isString(data)) {
                if (data.substring(0, 8) !== "ssh-rsa ")
                    throw Error("Unsupported key format");
                let pemEnd = data.indexOf(" ", 8);

                //Handle keys with no comment
                if (pemEnd === -1) {
                    pemEnd = data.length;
                } else {
                    key.sshcomment = data.substring(pemEnd + 1)
                        .replace(/\s+|\n\r|\n|\r$/gm, "");
                }

                const pem = data.substring(8, pemEnd)
                    .replace(/\s+|\n\r|\n|\r$/gm, "");
                buffer = Buffer.from(pem, "base64");
            } else {
                throw Error("Unsupported key format");
            }
        } else if (Buffer.isBuffer(data)) {
            buffer = data;
        } else {
            throw Error("Unsupported key format");
        }

        const reader = {buf: buffer, off: 0};

        const type = readOpenSSHKeyString(reader).toString("ascii");

        if (type !== "ssh-rsa")
            throw Error("Invalid key type: " + type);

        const e = readOpenSSHKeyString(reader);
        const n = readOpenSSHKeyString(reader);

        key.setPublic(
            n,
            e
        );
    },

    /**
     * Trying autodetect and import key
     * @param key
     * @param data
     */
    autoImport: function (key, data) {
        // [\S\s]* matches zero or more of any character
        if (/^[\S\s]*-----BEGIN OPENSSH PRIVATE KEY-----\s*(?=(([A-Za-z0-9+/=]+\s*)+))\1-----END OPENSSH PRIVATE KEY-----[\S\s]*$/g.test(data)) {
            module.exports.privateImport(key, data);
            return true;
        }

        if (/^[\S\s]*ssh-rsa \s*(?=(([A-Za-z0-9+/=]+\s*)+))\1[\S\s]*$/g.test(data)) {
            module.exports.publicImport(key, data);
            return true;
        }

        return false;
    }
};

function readOpenSSHKeyString(reader) {
    const len = reader.buf.readInt32BE(reader.off);
    reader.off += 4;
    const res = reader.buf.slice(reader.off, reader.off + len);
    reader.off += len;
    return res;
}

function writeOpenSSHKeyString(writer, data) {
    writer.buf.writeInt32BE(data.byteLength, writer.off);
    writer.off += 4;
    writer.off += data.copy(writer.buf, writer.off);
}