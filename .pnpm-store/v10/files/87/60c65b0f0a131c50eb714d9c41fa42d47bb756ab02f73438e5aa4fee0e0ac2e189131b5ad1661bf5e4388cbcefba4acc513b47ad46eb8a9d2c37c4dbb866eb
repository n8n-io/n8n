const retrieveSigningKeys = require('../utils').retrieveSigningKeys;

/**
 * Uses getKeysInterceptor to allow users to retrieve keys from a file,
 * external cache, or provided object before falling back to the jwksUri endpoint
 */
function getKeysInterceptor(client, { getKeysInterceptor }) {
  const getSigningKey = client.getSigningKey.bind(client);

  return async (kid) => {
    const keys = await getKeysInterceptor();

    let signingKeys;
    if (keys && keys.length) {
      signingKeys = await retrieveSigningKeys(keys);
    }

    if (signingKeys && signingKeys.length) {
      const key = signingKeys.find(k => !kid || k.kid === kid);

      if (key) {
        return key;
      }
    }

    return getSigningKey(kid);
  };
}

module.exports.default = getKeysInterceptor;
