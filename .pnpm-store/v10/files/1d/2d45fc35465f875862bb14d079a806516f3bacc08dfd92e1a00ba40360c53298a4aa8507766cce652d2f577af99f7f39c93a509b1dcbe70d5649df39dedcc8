const { callbackify } = require('util');

const callbackSupport = (client) => {
  const getSigningKey = client.getSigningKey.bind(client);

  return (kid, cb) => {
    if (cb) {
      const callbackFunc = callbackify(getSigningKey);
      return callbackFunc(kid, cb);
    }

    return getSigningKey(kid);
  };
};

module.exports.default = callbackSupport;
