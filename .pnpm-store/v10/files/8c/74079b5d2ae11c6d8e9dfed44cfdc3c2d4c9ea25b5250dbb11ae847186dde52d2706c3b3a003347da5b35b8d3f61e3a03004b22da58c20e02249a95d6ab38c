'use strict';

const MESSAGE_HANDLERS = new Array(256);
[
  require('./kex.js').HANDLERS,
  require('./handlers.misc.js'),
].forEach((handlers) => {
  // eslint-disable-next-line prefer-const
  for (let [type, handler] of Object.entries(handlers)) {
    type = +type;
    if (isFinite(type) && type >= 0 && type < MESSAGE_HANDLERS.length)
      MESSAGE_HANDLERS[type] = handler;
  }
});

module.exports = MESSAGE_HANDLERS;
