module.exports = require('./core')(Object.assign({
    Buffer: Buffer,
    isLittleEndian: require('os').endianness() === 'LE',
    is64bit: process.arch === 'x64',
}, require('./long_packers.js')));