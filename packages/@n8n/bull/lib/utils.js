'use strict';
const errorObject = { value: null };
function tryCatch(fn, ctx, args) {
  try {
    return fn.apply(ctx, args);
  } catch (e) {
    errorObject.value = e;
    return errorObject;
  }
}

/**
 * Waits for a redis client to be ready.
 * @param {Redis} redis client
 */
function isRedisReady(client) {
  return new Promise((resolve, reject) => {
    if (client.status === 'ready') {
      resolve();
    } else {
      function handleReady() {
        client.removeListener('end', handleEnd);
        client.removeListener('error', handleError);
        resolve();
      }

      let lastError;
      function handleError(err) {
        lastError = err;
      }

      function handleEnd() {
        client.removeListener('ready', handleReady);
        client.removeListener('error', handleError);
        reject(lastError);
      }

      client.once('ready', handleReady);
      client.on('error', handleError);
      client.once('end', handleEnd);
    }
  });
}

module.exports.errorObject = errorObject;
module.exports.tryCatch = tryCatch;
module.exports.isRedisReady = isRedisReady;
module.exports.emitSafe = function(emitter, event, ...args) {
  try {
    return emitter.emit(event, ...args);
  } catch (err) {
    try {
      return emitter.emit('error', err);
    } catch (err) {
      // We give up if the error event also throws an exception.
      console.error(err);
    }
  }
};

module.exports.MetricsTime = {
  ONE_MINUTE: 1,
  FIVE_MINUTES: 5,
  FIFTEEN_MINUTES: 15,
  THIRTY_MINUTES: 30,
  ONE_HOUR: 60,
  ONE_WEEK: 60 * 24 * 7,
  TWO_WEEKS: 60 * 24 * 7 * 2,
  ONE_MONTH: 60 * 24 * 7 * 2 * 4
};
