const npm = {
    stream: require('stream'),
    util: require('util')
};

/////////////////////////////////////
// Checks if the value is a promise;
function isPromise(value) {
    return value && typeof value.then === 'function';
}

////////////////////////////////////////////
// Checks object for being a readable stream;
function isReadableStream(obj) {
    return obj instanceof npm.stream.Stream &&
        typeof obj._read === 'function' &&
        typeof obj._readableState === 'object';
}

////////////////////////////////////////////////////////////
// Sets an object property as read-only and non-enumerable.
function extend(obj, name, value) {
    Object.defineProperty(obj, name, {
        value: value,
        configurable: false,
        enumerable: false,
        writable: false
    });
}

///////////////////////////////////////////
// Returns a space gap for console output;
function messageGap(level) {
    return ' '.repeat(level * 4);
}

function formatError(error, level) {
    const names = ['BatchError', 'PageError', 'SequenceError'];
    let msg = npm.util.inspect(error);
    if (error instanceof Error) {
        if (names.indexOf(error.name) === -1) {
            const gap = messageGap(level);
            msg = msg.split('\n').map((line, index) => {
                return (index ? gap : '') + line;
            }).join('\n');
        } else {
            msg = error.toString(level);
        }
    }
    return msg;
}

////////////////////////////////////////////////////////
// Adds prototype inspection, with support of the newer
// Custom Inspection, which was added in Node.js 6.x
function addInspection(type, cb) {
    // istanbul ignore next;
    if (npm.util.inspect.custom) {
        // Custom inspection is supported:
        type.prototype[npm.util.inspect.custom] = cb;
    } else {
        // Use classic inspection:
        type.prototype.inspect = cb;
    }
}

module.exports = {
    addInspection: addInspection,
    formatError: formatError,
    isPromise: isPromise,
    isReadableStream: isReadableStream,
    messageGap: messageGap,
    extend: extend
};
