module.exports = require('./core')(Object.assign({
    Buffer: require('buffer').Buffer,
    isLittleEndian: typeof Uint8Array !== undefined
        ? new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x78
        : true,
    is64bit: typeof navigator !== undefined
        ? /WOW64|Win64|arm64|ia64|x64;|Mac OS X/i.test(navigator.userAgent)
        : true,
}, require('./long_packers.js')));