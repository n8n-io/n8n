const Long = require('long');

const UNPACK_UINT64_LE = (data, pos) => Long.fromBits(data.readInt32LE(pos), data.readInt32LE(pos + 4), true);
const UNPACK_UINT64_BE = (data, pos) => Long.fromBits(data.readInt32BE(pos + 4), data.readInt32BE(pos), true);
const UNPACK_INT64_LE = (data, pos) => Long.fromBits(data.readInt32LE(pos), data.readInt32LE(pos + 4), false);
const UNPACK_INT64_BE = (data, pos) => Long.fromBits(data.readInt32BE(pos + 4), data.readInt32BE(pos), false);

const PACK_INT64_LE = (data, pack, pos) => {
    if (!(data instanceof Long)) {
        if (typeof data === 'number')
            data = Long.fromNumber(data);
        else data = Long.fromString(data || '');
    }
    pack.writeInt32LE(data.getLowBits(), pos, true);
    pack.writeInt32LE(data.getHighBits(), pos + 4, true);
};

const PACK_INT64_BE = (data, pack, pos) => {
    if (!(data instanceof Long)) {
        if (typeof data === 'number')
            data = Long.fromNumber(data);
        else data = Long.fromString(data || '');
    }
    pack.writeInt32BE(data.getHighBits(), pos, true);
    pack.writeInt32BE(data.getLowBits(), pos + 4, true);
};

module.exports = {
    unpackUInt64LE: UNPACK_UINT64_LE,
    unpackUInt64BE: UNPACK_UINT64_BE,
    unpackInt64LE: UNPACK_INT64_LE,
    unpackInt64BE: UNPACK_INT64_BE,
    packUInt64LE: PACK_INT64_LE,
    packUInt64BE: PACK_INT64_BE,
    packInt64LE: PACK_INT64_LE,
    packInt64BE: PACK_INT64_BE,
};