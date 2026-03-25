module.exports = {
    pkcs1: require('./pkcs1'),
    pkcs1_oaep: require('./oaep'),
    pss: require('./pss'),

    /**
     * Check if scheme has padding methods
     * @param scheme {string}
     * @returns {Boolean}
     */
    isEncryption: function (scheme) {
        return module.exports[scheme] && module.exports[scheme].isEncryption;
    },

    /**
     * Check if scheme has sign/verify methods
     * @param scheme {string}
     * @returns {Boolean}
     */
    isSignature: function (scheme) {
        return module.exports[scheme] && module.exports[scheme].isSignature;
    }
};