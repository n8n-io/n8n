"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readableToAsyncIterable = readableToAsyncIterable;
let nodejsInternalsCompatibilityCheckedOnce = false;
/**
 * Exactly once check that an object has Node.js readable stream internal object looks roughly like we expect.
 */
function nodejsInternalsAccessible(obj) {
    if (nodejsInternalsCompatibilityCheckedOnce) {
        return true;
    }
    const safe = obj &&
        typeof obj === 'object' &&
        'errored' in obj &&
        'errorEmitted' in obj &&
        'endEmitted' in obj &&
        'closeEmitted' in obj &&
        typeof obj.errorEmitted === 'boolean' &&
        typeof obj.endEmitted === 'boolean' &&
        typeof obj.closeEmitted === 'boolean';
    nodejsInternalsCompatibilityCheckedOnce = safe;
    return safe;
}
/**
 * This is a copy of NodeJS createAsyncIterator(stream), with removed stream
 * destruction.
 *
 * https://github.com/nodejs/node/blob/v15.8.0/lib/internal/streams/readable.js#L1079
 *
 * @internal
 */
async function* readableToAsyncIterable(stream) {
    let callback = nop;
    function next(resolve) {
        if (this === stream) {
            callback();
            callback = nop;
        }
        else {
            callback = resolve;
        }
    }
    const state = stream._readableState;
    if (!nodejsInternalsAccessible(state)) {
        throw new Error('nice-grpc: _readableState members incompatible');
    }
    let error = state.errored;
    let errorEmitted = state.errorEmitted;
    let endEmitted = state.endEmitted;
    let closeEmitted = state.closeEmitted;
    stream
        .on('readable', next)
        .on('error', function (err) {
        error = err;
        errorEmitted = true;
        next.call(this);
    })
        .on('end', function () {
        endEmitted = true;
        next.call(this);
    })
        .on('close', function () {
        closeEmitted = true;
        next.call(this);
    });
    while (true) {
        const chunk = stream.destroyed ? null : stream.read();
        if (chunk !== null) {
            yield chunk;
        }
        else if (errorEmitted) {
            throw error;
        }
        else if (endEmitted) {
            break;
        }
        else if (closeEmitted) {
            break;
        }
        else {
            await new Promise(next);
        }
    }
}
const nop = () => { };
//# sourceMappingURL=readableToAsyncIterable.js.map