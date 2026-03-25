'use strict';
var NodeBuffer = require('buffer').Buffer;
var type_1 = require("../type");
var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';
function resolveYamlBinary(data) {
    if (null === data) {
        return false;
    }
    var code, idx, bitlen = 0, len = 0, max = data.length, map = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));
        if (code > 64) {
            continue;
        }
        if (code < 0) {
            return false;
        }
        bitlen += 6;
    }
    return (bitlen % 8) === 0;
}
function constructYamlBinary(data) {
    var code, idx, tailbits, input = data.replace(/[\r\n=]/g, ''), max = input.length, map = BASE64_MAP, bits = 0, result = [];
    for (idx = 0; idx < max; idx++) {
        if ((idx % 4 === 0) && idx) {
            result.push((bits >> 16) & 0xFF);
            result.push((bits >> 8) & 0xFF);
            result.push(bits & 0xFF);
        }
        bits = (bits << 6) | map.indexOf(input.charAt(idx));
    }
    tailbits = (max % 4) * 6;
    if (tailbits === 0) {
        result.push((bits >> 16) & 0xFF);
        result.push((bits >> 8) & 0xFF);
        result.push(bits & 0xFF);
    }
    else if (tailbits === 18) {
        result.push((bits >> 10) & 0xFF);
        result.push((bits >> 2) & 0xFF);
    }
    else if (tailbits === 12) {
        result.push((bits >> 4) & 0xFF);
    }
    if (NodeBuffer) {
        return new NodeBuffer(result);
    }
    return result;
}
function representYamlBinary(object) {
    var result = '', bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
        if ((idx % 3 === 0) && idx) {
            result += map[(bits >> 18) & 0x3F];
            result += map[(bits >> 12) & 0x3F];
            result += map[(bits >> 6) & 0x3F];
            result += map[bits & 0x3F];
        }
        bits = (bits << 8) + object[idx];
    }
    tail = max % 3;
    if (tail === 0) {
        result += map[(bits >> 18) & 0x3F];
        result += map[(bits >> 12) & 0x3F];
        result += map[(bits >> 6) & 0x3F];
        result += map[bits & 0x3F];
    }
    else if (tail === 2) {
        result += map[(bits >> 10) & 0x3F];
        result += map[(bits >> 4) & 0x3F];
        result += map[(bits << 2) & 0x3F];
        result += map[64];
    }
    else if (tail === 1) {
        result += map[(bits >> 2) & 0x3F];
        result += map[(bits << 4) & 0x3F];
        result += map[64];
        result += map[64];
    }
    return result;
}
function isBinary(object) {
    return NodeBuffer && NodeBuffer.isBuffer(object);
}
module.exports = new type_1.Type('tag:yaml.org,2002:binary', {
    kind: 'scalar',
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
});
//# sourceMappingURL=binary.js.map