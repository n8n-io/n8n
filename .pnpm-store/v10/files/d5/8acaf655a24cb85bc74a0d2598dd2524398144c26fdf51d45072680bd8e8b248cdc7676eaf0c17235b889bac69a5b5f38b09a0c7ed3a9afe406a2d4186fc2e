var crypt = require('crypto');

module.exports = {
    getEngine: function (keyPair, options) {
        var engine = require('./js.js');
        if (options.environment === 'node') {
            if (typeof crypt.publicEncrypt === 'function' && typeof crypt.privateDecrypt === 'function') {
                if (typeof crypt.privateEncrypt === 'function' && typeof crypt.publicDecrypt === 'function') {
                    engine = require('./io.js');
                } else {
                    engine = require('./node12.js');
                }
            }
        }
        return engine(keyPair, options);
    }
};