var Utils = require("../util"),
    Constants = Utils.Constants;

/* The central directory file header */
module.exports = function () {
    var _verMade = 20, // v2.0
        _version = 10, // v1.0
        _flags = 0,
        _method = 0,
        _time = 0,
        _crc = 0,
        _compressedSize = 0,
        _size = 0,
        _fnameLen = 0,
        _extraLen = 0,
        _comLen = 0,
        _diskStart = 0,
        _inattr = 0,
        _attr = 0,
        _offset = 0;

    _verMade |= Utils.isWin ? 0x0a00 : 0x0300;

    // Set EFS flag since filename and comment fields are all by default encoded using UTF-8.
    // Without it file names may be corrupted for other apps when file names use unicode chars
    _flags |= Constants.FLG_EFS;

    var _dataHeader = {};

    function setTime(val) {
        val = new Date(val);
        _time =
            (((val.getFullYear() - 1980) & 0x7f) << 25) | // b09-16 years from 1980
            ((val.getMonth() + 1) << 21) | // b05-08 month
            (val.getDate() << 16) | // b00-04 hour
            // 2 bytes time
            (val.getHours() << 11) | // b11-15 hour
            (val.getMinutes() << 5) | // b05-10 minute
            (val.getSeconds() >> 1); // b00-04 seconds divided by 2
    }

    setTime(+new Date());

    return {
        get made() {
            return _verMade;
        },
        set made(val) {
            _verMade = val;
        },

        get version() {
            return _version;
        },
        set version(val) {
            _version = val;
        },

        get flags() {
            return _flags;
        },
        set flags(val) {
            _flags = val;
        },

        get method() {
            return _method;
        },
        set method(val) {
            switch (val) {
                case Constants.STORED:
                    this.version = 10;
                case Constants.DEFLATED:
                default:
                    this.version = 20;
            }
            _method = val;
        },

        get time() {
            return new Date(((_time >> 25) & 0x7f) + 1980, ((_time >> 21) & 0x0f) - 1, (_time >> 16) & 0x1f, (_time >> 11) & 0x1f, (_time >> 5) & 0x3f, (_time & 0x1f) << 1);
        },
        set time(val) {
            setTime(val);
        },

        get crc() {
            return _crc;
        },
        set crc(val) {
            _crc = Math.max(0, val) >>> 0;
        },

        get compressedSize() {
            return _compressedSize;
        },
        set compressedSize(val) {
            _compressedSize = Math.max(0, val) >>> 0;
        },

        get size() {
            return _size;
        },
        set size(val) {
            _size = Math.max(0, val) >>> 0;
        },

        get fileNameLength() {
            return _fnameLen;
        },
        set fileNameLength(val) {
            _fnameLen = val;
        },

        get extraLength() {
            return _extraLen;
        },
        set extraLength(val) {
            _extraLen = val;
        },

        get commentLength() {
            return _comLen;
        },
        set commentLength(val) {
            _comLen = val;
        },

        get diskNumStart() {
            return _diskStart;
        },
        set diskNumStart(val) {
            _diskStart = Math.max(0, val) >>> 0;
        },

        get inAttr() {
            return _inattr;
        },
        set inAttr(val) {
            _inattr = Math.max(0, val) >>> 0;
        },

        get attr() {
            return _attr;
        },
        set attr(val) {
            _attr = Math.max(0, val) >>> 0;
        },

        // get Unix file permissions
        get fileAttr() {
            return _attr ? (((_attr >>> 0) | 0) >> 16) & 0xfff : 0;
        },

        get offset() {
            return _offset;
        },
        set offset(val) {
            _offset = Math.max(0, val) >>> 0;
        },

        get encripted() {
            return (_flags & 1) === 1;
        },

        get entryHeaderSize() {
            return Constants.CENHDR + _fnameLen + _extraLen + _comLen;
        },

        get realDataOffset() {
            return _offset + Constants.LOCHDR + _dataHeader.fnameLen + _dataHeader.extraLen;
        },

        get dataHeader() {
            return _dataHeader;
        },

        loadDataHeaderFromBinary: function (/*Buffer*/ input) {
            var data = input.slice(_offset, _offset + Constants.LOCHDR);
            // 30 bytes and should start with "PK\003\004"
            if (data.readUInt32LE(0) !== Constants.LOCSIG) {
                throw new Error(Utils.Errors.INVALID_LOC);
            }
            _dataHeader = {
                // version needed to extract
                version: data.readUInt16LE(Constants.LOCVER),
                // general purpose bit flag
                flags: data.readUInt16LE(Constants.LOCFLG),
                // compression method
                method: data.readUInt16LE(Constants.LOCHOW),
                // modification time (2 bytes time, 2 bytes date)
                time: data.readUInt32LE(Constants.LOCTIM),
                // uncompressed file crc-32 value
                crc: data.readUInt32LE(Constants.LOCCRC),
                // compressed size
                compressedSize: data.readUInt32LE(Constants.LOCSIZ),
                // uncompressed size
                size: data.readUInt32LE(Constants.LOCLEN),
                // filename length
                fnameLen: data.readUInt16LE(Constants.LOCNAM),
                // extra field length
                extraLen: data.readUInt16LE(Constants.LOCEXT)
            };
        },

        loadFromBinary: function (/*Buffer*/ data) {
            // data should be 46 bytes and start with "PK 01 02"
            if (data.length !== Constants.CENHDR || data.readUInt32LE(0) !== Constants.CENSIG) {
                throw new Error(Utils.Errors.INVALID_CEN);
            }
            // version made by
            _verMade = data.readUInt16LE(Constants.CENVEM);
            // version needed to extract
            _version = data.readUInt16LE(Constants.CENVER);
            // encrypt, decrypt flags
            _flags = data.readUInt16LE(Constants.CENFLG);
            // compression method
            _method = data.readUInt16LE(Constants.CENHOW);
            // modification time (2 bytes time, 2 bytes date)
            _time = data.readUInt32LE(Constants.CENTIM);
            // uncompressed file crc-32 value
            _crc = data.readUInt32LE(Constants.CENCRC);
            // compressed size
            _compressedSize = data.readUInt32LE(Constants.CENSIZ);
            // uncompressed size
            _size = data.readUInt32LE(Constants.CENLEN);
            // filename length
            _fnameLen = data.readUInt16LE(Constants.CENNAM);
            // extra field length
            _extraLen = data.readUInt16LE(Constants.CENEXT);
            // file comment length
            _comLen = data.readUInt16LE(Constants.CENCOM);
            // volume number start
            _diskStart = data.readUInt16LE(Constants.CENDSK);
            // internal file attributes
            _inattr = data.readUInt16LE(Constants.CENATT);
            // external file attributes
            _attr = data.readUInt32LE(Constants.CENATX);
            // LOC header offset
            _offset = data.readUInt32LE(Constants.CENOFF);
        },

        dataHeaderToBinary: function () {
            // LOC header size (30 bytes)
            var data = Buffer.alloc(Constants.LOCHDR);
            // "PK\003\004"
            data.writeUInt32LE(Constants.LOCSIG, 0);
            // version needed to extract
            data.writeUInt16LE(_version, Constants.LOCVER);
            // general purpose bit flag
            data.writeUInt16LE(_flags, Constants.LOCFLG);
            // compression method
            data.writeUInt16LE(_method, Constants.LOCHOW);
            // modification time (2 bytes time, 2 bytes date)
            data.writeUInt32LE(_time, Constants.LOCTIM);
            // uncompressed file crc-32 value
            data.writeUInt32LE(_crc, Constants.LOCCRC);
            // compressed size
            data.writeUInt32LE(_compressedSize, Constants.LOCSIZ);
            // uncompressed size
            data.writeUInt32LE(_size, Constants.LOCLEN);
            // filename length
            data.writeUInt16LE(_fnameLen, Constants.LOCNAM);
            // extra field length
            data.writeUInt16LE(_extraLen, Constants.LOCEXT);
            return data;
        },

        entryHeaderToBinary: function () {
            // CEN header size (46 bytes)
            var data = Buffer.alloc(Constants.CENHDR + _fnameLen + _extraLen + _comLen);
            // "PK\001\002"
            data.writeUInt32LE(Constants.CENSIG, 0);
            // version made by
            data.writeUInt16LE(_verMade, Constants.CENVEM);
            // version needed to extract
            data.writeUInt16LE(_version, Constants.CENVER);
            // encrypt, decrypt flags
            data.writeUInt16LE(_flags, Constants.CENFLG);
            // compression method
            data.writeUInt16LE(_method, Constants.CENHOW);
            // modification time (2 bytes time, 2 bytes date)
            data.writeUInt32LE(_time, Constants.CENTIM);
            // uncompressed file crc-32 value
            data.writeUInt32LE(_crc, Constants.CENCRC);
            // compressed size
            data.writeUInt32LE(_compressedSize, Constants.CENSIZ);
            // uncompressed size
            data.writeUInt32LE(_size, Constants.CENLEN);
            // filename length
            data.writeUInt16LE(_fnameLen, Constants.CENNAM);
            // extra field length
            data.writeUInt16LE(_extraLen, Constants.CENEXT);
            // file comment length
            data.writeUInt16LE(_comLen, Constants.CENCOM);
            // volume number start
            data.writeUInt16LE(_diskStart, Constants.CENDSK);
            // internal file attributes
            data.writeUInt16LE(_inattr, Constants.CENATT);
            // external file attributes
            data.writeUInt32LE(_attr, Constants.CENATX);
            // LOC header offset
            data.writeUInt32LE(_offset, Constants.CENOFF);
            // fill all with
            data.fill(0x00, Constants.CENHDR);
            return data;
        },

        toJSON: function () {
            const bytes = function (nr) {
                return nr + " bytes";
            };

            return {
                made: _verMade,
                version: _version,
                flags: _flags,
                method: Utils.methodToString(_method),
                time: this.time,
                crc: "0x" + _crc.toString(16).toUpperCase(),
                compressedSize: bytes(_compressedSize),
                size: bytes(_size),
                fileNameLength: bytes(_fnameLen),
                extraLength: bytes(_extraLen),
                commentLength: bytes(_comLen),
                diskNumStart: _diskStart,
                inAttr: _inattr,
                attr: _attr,
                offset: _offset,
                entryHeaderSize: bytes(Constants.CENHDR + _fnameLen + _extraLen + _comLen)
            };
        },

        toString: function () {
            return JSON.stringify(this.toJSON(), null, "\t");
        }
    };
};
