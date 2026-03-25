'use strict';

const invalidFunction = (message) => () => {
    throw new Error(message);
};

const invalidProvider = (message) => () => Promise.reject(message);

exports.invalidFunction = invalidFunction;
exports.invalidProvider = invalidProvider;
