var Buffer = require('buffer').Buffer;
var semver = require('semver');

if (semver.gte(process.version, '6.0.0')) {
    function allocateAsciiBuffer(length) {
        return Buffer.alloc(length, 'ascii');
    }
} else {
    function allocateAsciiBuffer(length) {
        return new Buffer(length, 'ascii');
    }
}

function encode(str) {
    var b = allocateAsciiBuffer(str.length * 2);
    for (var i = 0, bi = 0; i < str.length; i++) {
        // Note that we can't simply convert a UTF-8 string to Base64 because
        // UTF-8 uses a different encoding. In modified UTF-7, all characters
        // are represented by their two byte Unicode ID.
        var c = str.charCodeAt(i);
        // Upper 8 bits shifted into lower 8 bits so that they fit into 1 byte.
        b[bi++] = c >> 8;
        // Lower 8 bits. Cut off the upper 8 bits so that they fit into 1 byte.
        b[bi++] = c & 0xFF;
    }
    // Modified Base64 uses , instead of / and omits trailing =.
    return b.toString('base64').replace(/=+$/, '');
}

if (semver.gte(process.version, '6.0.0')) {
    function allocateBase64Buffer(str) {
        return Buffer.from(str, 'base64');
    }
} else {
    function allocateBase64Buffer(str) {
        return new Buffer(str, 'base64');
    }
}

function decode(str) {
    var b = allocateBase64Buffer(str);
    var r = [];
    for (var i = 0; i < b.length;) {
        // Calculate charcode from two adjacent bytes.
        r.push(String.fromCharCode(b[i++] << 8 | b[i++]));
    }
    return r.join('');
}

// Escape RegEx from http://simonwillison.net/2006/Jan/20/escape/
function escape(chars) {
    return chars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Character classes defined by RFC 2152.
var setD = "A-Za-z0-9" + escape("'(),-./:?");
var setO = escape("!\"#$%&*;<=>@[]^_'{|}");
var setW = escape(" \r\n\t");

// Stores compiled regexes for various replacement pattern.
var regexes = {};
var regexAll = new RegExp("[^" + setW + setD + setO + "]+", 'g');

exports.imap = {};

// RFC 2152 UTF-7 encoding.
exports.encode = function(str, mask) {
    // Generate a RegExp object from the string of mask characters.
    if (!mask) {
        mask = '';
    }
    if (!regexes[mask]) {
        regexes[mask] = new RegExp("[^" + setD + escape(mask) + "]+", 'g');
    }

    // We replace subsequent disallowed chars with their escape sequence.
    return str.replace(regexes[mask], function(chunk) {
        // + is represented by an empty sequence +-, otherwise call encode().
        return '+' + (chunk === '+' ? '' : encode(chunk)) + '-';
    });
};

// RFC 2152 UTF-7 encoding with all optionals.
exports.encodeAll = function(str) {
    // We replace subsequent disallowed chars with their escape sequence.
    return str.replace(regexAll, function(chunk) {
        // + is represented by an empty sequence +-, otherwise call encode().
        return '+' + (chunk === '+' ? '' : encode(chunk)) + '-';
    });
};

// RFC 3501, section 5.1.3 UTF-7 encoding.
exports.imap.encode = function(str) {
    // All printable ASCII chars except for & must be represented by themselves.
    // We replace subsequent non-representable chars with their escape sequence.
    return str.replace(/&/g, '&-').replace(/[^\x20-\x7e]+/g, function(chunk) {
        // & is represented by an empty sequence &-, otherwise call encode().
        chunk = (chunk === '&' ? '' : encode(chunk)).replace(/\//g, ',');
        return '&' + chunk + '-';
    });
};

// RFC 2152 UTF-7 decoding.
exports.decode = function(str) {
    return str.replace(/\+([A-Za-z0-9\/]*)-?/gi, function(_, chunk) {
        // &- represents &.
        if (chunk === '') return '+';
        return decode(chunk);
    });
};

// RFC 3501, section 5.1.3 UTF-7 decoding.
exports.imap.decode = function(str) {
    return str.replace(/&([^-]*)-/g, function(_, chunk) {
        // &- represents &.
        if (chunk === '') return '&';
        return decode(chunk.replace(/,/g, '/'));
    });
};
