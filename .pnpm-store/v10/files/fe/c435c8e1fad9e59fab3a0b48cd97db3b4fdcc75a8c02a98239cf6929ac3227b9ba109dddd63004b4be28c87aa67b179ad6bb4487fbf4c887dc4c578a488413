"use strict";

/**
 * Is true when the environment causes an error to be thrown for accessing the
 * __proto__ property.
 * This is necessary in order to support `node --disable-proto=throw`.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto
 * @type {boolean}
 */
let throwsOnProto;
try {
    const object = {};
    // eslint-disable-next-line no-proto, no-unused-expressions
    object.__proto__;
    throwsOnProto = false;
} catch (_) {
    // This branch is covered when tests are run with `--disable-proto=throw`,
    // however we can test both branches at the same time, so this is ignored
    /* istanbul ignore next */
    throwsOnProto = true;
}

module.exports = throwsOnProto;
