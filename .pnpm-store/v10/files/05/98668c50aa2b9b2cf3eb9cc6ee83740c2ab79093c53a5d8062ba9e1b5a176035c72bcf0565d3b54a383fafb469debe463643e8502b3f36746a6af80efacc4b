const { createHash } = require('crypto');
const { name } = require('../package.json');
// TODO: increment this version if there are schema changes
// that are not backwards compatible:
const VERSION = '4';

const SHA = 'sha1';
module.exports = {
    SHA,
    MAGIC_KEY: '_coverageSchema',
    MAGIC_VALUE: createHash(SHA)
        .update(name + '@' + VERSION)
        .digest('hex')
};
