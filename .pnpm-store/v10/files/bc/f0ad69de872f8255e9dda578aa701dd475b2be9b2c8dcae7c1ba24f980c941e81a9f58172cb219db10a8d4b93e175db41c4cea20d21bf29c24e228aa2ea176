const {assertOptions} = require('assert-options');

// this to allow override options-related errors globally (for pg-promise)
global.pgPromiseAssert = assertOptions;

module.exports = {
    assert() {
        return global.pgPromiseAssert.apply(null, [...arguments]);
    }
};
