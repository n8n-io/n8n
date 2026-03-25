/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

/* All error messages used in the module */

const streamVersion = require('../package.json')
    .devDependencies['pg-query-stream'];

module.exports = {
    nativeError: 'Failed to initialize Native Bindings.',

    /* Database errors */
    queryDisconnected: 'Cannot execute a query on a disconnected client.',
    invalidQuery: 'Invalid query format.',
    invalidFunction: 'Invalid function name.',
    invalidProc: 'Invalid procedure name.',
    invalidMask: 'Invalid Query Result Mask specified.',
    looseQuery: 'Querying against a released or lost connection.',

    /* result errors */
    notEmpty: 'No return data was expected.',
    noData: 'No data returned from the query.',
    multiple: 'Multiple rows were not expected.',

    /* streaming support */
    nativeStreaming: 'Streaming doesn\'t work with Native Bindings.',
    invalidStream: `Invalid or missing stream object: pg-query-stream >= v${streamVersion} was expected`,
    invalidStreamState: 'Invalid stream state.',
    invalidStreamCB: 'Invalid or missing stream initialization callback.',

    /* connection errors */
    poolDestroyed: 'Connection pool of the database object has been destroyed.',
    clientEnd: 'Abnormal client.end() call, due to invalid code or failed server connection.'
};
