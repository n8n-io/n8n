'use strict';
var common = require("../common");
var type_1 = require("../type");
function isHexCode(c) {
    return ((0x30 <= c) && (c <= 0x39)) ||
        ((0x41 <= c) && (c <= 0x46)) ||
        ((0x61 <= c) && (c <= 0x66));
}
function isOctCode(c) {
    return ((0x30 <= c) && (c <= 0x37));
}
function isDecCode(c) {
    return ((0x30 <= c) && (c <= 0x39));
}
function resolveYamlInteger(data) {
    if (null === data) {
        return false;
    }
    var max = data.length, index = 0, hasDigits = false, ch;
    if (!max) {
        return false;
    }
    ch = data[index];
    if (ch === '-' || ch === '+') {
        ch = data[++index];
    }
    if (ch === '0') {
        if (index + 1 === max) {
            return true;
        }
        ch = data[++index];
        if (ch === 'b') {
            index++;
            for (; index < max; index++) {
                ch = data[index];
                if (ch === '_') {
                    continue;
                }
                if (ch !== '0' && ch !== '1') {
                    return false;
                }
                hasDigits = true;
            }
            return hasDigits;
        }
        if (ch === 'x') {
            index++;
            for (; index < max; index++) {
                ch = data[index];
                if (ch === '_') {
                    continue;
                }
                if (!isHexCode(data.charCodeAt(index))) {
                    return false;
                }
                hasDigits = true;
            }
            return hasDigits;
        }
        for (; index < max; index++) {
            ch = data[index];
            if (ch === '_') {
                continue;
            }
            if (!isOctCode(data.charCodeAt(index))) {
                return false;
            }
            hasDigits = true;
        }
        return hasDigits;
    }
    for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') {
            continue;
        }
        if (ch === ':') {
            break;
        }
        if (!isDecCode(data.charCodeAt(index))) {
            return false;
        }
        hasDigits = true;
    }
    if (!hasDigits) {
        return false;
    }
    if (ch !== ':') {
        return true;
    }
    return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
}
function constructYamlInteger(data) {
    var value = data, sign = 1, ch, base, digits = [];
    if (value.indexOf('_') !== -1) {
        value = value.replace(/_/g, '');
    }
    ch = value[0];
    if (ch === '-' || ch === '+') {
        if (ch === '-') {
            sign = -1;
        }
        value = value.slice(1);
        ch = value[0];
    }
    if ('0' === value) {
        return 0;
    }
    if (ch === '0') {
        if (value[1] === 'b') {
            return sign * parseInt(value.slice(2), 2);
        }
        if (value[1] === 'x') {
            return sign * parseInt(value, 16);
        }
        return sign * parseInt(value, 8);
    }
    if (value.indexOf(':') !== -1) {
        value.split(':').forEach(function (v) {
            digits.unshift(parseInt(v, 10));
        });
        value = 0;
        base = 1;
        digits.forEach(function (d) {
            value += (d * base);
            base *= 60;
        });
        return sign * value;
    }
    return sign * parseInt(value, 10);
}
function isInteger(object) {
    return ('[object Number]' === Object.prototype.toString.call(object)) &&
        (0 === object % 1 && !common.isNegativeZero(object));
}
module.exports = new type_1.Type('tag:yaml.org,2002:int', {
    kind: 'scalar',
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
        binary: function (object) { return '0b' + object.toString(2); },
        octal: function (object) { return '0' + object.toString(8); },
        decimal: function (object) { return object.toString(10); },
        hexadecimal: function (object) { return '0x' + object.toString(16).toUpperCase(); }
    },
    defaultStyle: 'decimal',
    styleAliases: {
        binary: [2, 'bin'],
        octal: [8, 'oct'],
        decimal: [10, 'dec'],
        hexadecimal: [16, 'hex']
    }
});
//# sourceMappingURL=int.js.map