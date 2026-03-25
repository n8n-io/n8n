var Utils = require("../util"),
    Constants = Utils.Constants;

/* The entries in the end of central directory */
module.exports = function () {
    var _volumeEntries = 0,
        _totalEntries = 0,
        _size = 0,
        _offset = 0,
        _commentLength = 0;

    return {
        get diskEntries() {
            return _volumeEntries;
        },
        set diskEntries(/*Number*/ val) {
            _volumeEntries = _totalEntries = val;
        },

        get totalEntries() {
            return _totalEntries;
        },
        set totalEntries(/*Number*/ val) {
            _totalEntries = _volumeEntries = val;
        },

        get size() {
            return _size;
        },
        set size(/*Number*/ val) {
            _size = val;
        },

        get offset() {
            return _offset;
        },
        set offset(/*Number*/ val) {
            _offset = val;
        },

        get commentLength() {
            return _commentLength;
        },
        set commentLength(/*Number*/ val) {
            _commentLength = val;
        },

        get mainHeaderSize() {
            return Constants.ENDHDR + _commentLength;
        },

        loadFromBinary: function (/*Buffer*/ data) {
            // data should be 22 bytes and start with "PK 05 06"
            // or be 56+ bytes and start with "PK 06 06" for Zip64
            if (
                (data.length !== Constants.ENDHDR || data.readUInt32LE(0) !== Constants.ENDSIG) &&
                (data.length < Constants.ZIP64HDR || data.readUInt32LE(0) !== Constants.ZIP64SIG)
            ) {
                throw new Error(Utils.Errors.INVALID_END);
            }

            if (data.readUInt32LE(0) === Constants.ENDSIG) {
                // number of entries on this volume
                _volumeEntries = data.readUInt16LE(Constants.ENDSUB);
                // total number of entries
                _totalEntries = data.readUInt16LE(Constants.ENDTOT);
                // central directory size in bytes
                _size = data.readUInt32LE(Constants.ENDSIZ);
                // offset of first CEN header
                _offset = data.readUInt32LE(Constants.ENDOFF);
                // zip file comment length
                _commentLength = data.readUInt16LE(Constants.ENDCOM);
            } else {
                // number of entries on this volume
                _volumeEntries = Utils.readBigUInt64LE(data, Constants.ZIP64SUB);
                // total number of entries
                _totalEntries = Utils.readBigUInt64LE(data, Constants.ZIP64TOT);
                // central directory size in bytes
                _size = Utils.readBigUInt64LE(data, Constants.ZIP64SIZE);
                // offset of first CEN header
                _offset = Utils.readBigUInt64LE(data, Constants.ZIP64OFF);

                _commentLength = 0;
            }
        },

        toBinary: function () {
            var b = Buffer.alloc(Constants.ENDHDR + _commentLength);
            // "PK 05 06" signature
            b.writeUInt32LE(Constants.ENDSIG, 0);
            b.writeUInt32LE(0, 4);
            // number of entries on this volume
            b.writeUInt16LE(_volumeEntries, Constants.ENDSUB);
            // total number of entries
            b.writeUInt16LE(_totalEntries, Constants.ENDTOT);
            // central directory size in bytes
            b.writeUInt32LE(_size, Constants.ENDSIZ);
            // offset of first CEN header
            b.writeUInt32LE(_offset, Constants.ENDOFF);
            // zip file comment length
            b.writeUInt16LE(_commentLength, Constants.ENDCOM);
            // fill comment memory with spaces so no garbage is left there
            b.fill(" ", Constants.ENDHDR);

            return b;
        },

        toJSON: function () {
            // creates 0x0000 style output
            const offset = function (nr, len) {
                let offs = nr.toString(16).toUpperCase();
                while (offs.length < len) offs = "0" + offs;
                return "0x" + offs;
            };

            return {
                diskEntries: _volumeEntries,
                totalEntries: _totalEntries,
                size: _size + " bytes",
                offset: offset(_offset, 4),
                commentLength: _commentLength
            };
        },

        toString: function () {
            return JSON.stringify(this.toJSON(), null, "\t");
        }
    };
};
 // Misspelled 