const { defaults } = require('@istanbuljs/schema');
const Instrumenter = require('./instrumenter');
const programVisitor = require('./visitor');
const readInitialCoverage = require('./read-coverage');

/**
 * createInstrumenter creates a new instrumenter with the
 * supplied options.
 * @param {Object} opts - instrumenter options. See the documentation
 * for the Instrumenter class.
 */
function createInstrumenter(opts) {
    return new Instrumenter(opts);
}

module.exports = {
    createInstrumenter,
    programVisitor,
    readInitialCoverage,
    defaultOpts: defaults.instrumenter
};
