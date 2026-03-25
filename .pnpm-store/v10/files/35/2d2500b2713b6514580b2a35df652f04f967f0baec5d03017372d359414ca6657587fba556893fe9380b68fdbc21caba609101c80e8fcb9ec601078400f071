// Node.js env
expect = require('expect.js');
md4 = require('../src/md4.js');
require('./test.js');

delete require.cache[require.resolve('../src/md4.js')]
delete require.cache[require.resolve('./test.js')]
md4 = null

// Webpack browser env
JS_MD4_NO_NODE_JS = true;
window = global;
md4 = require('../src/md4.js');
require('./test.js');

delete require.cache[require.resolve('../src/md4.js')];
delete require.cache[require.resolve('./test.js')];
md4 = null;

// browser env
JS_MD4_NO_NODE_JS = true;
JS_MD4_NO_COMMON_JS = true;
window = global;
require('../src/md4.js');
require('./test.js');

delete require.cache[require.resolve('../src/md4.js')];
delete require.cache[require.resolve('./test.js')];
md4 = null;

// browser env and no array buffer
JS_MD4_NO_NODE_JS = true;
JS_MD4_NO_COMMON_JS = true;
JS_MD4_NO_ARRAY_BUFFER = true;
window = global;
require('../src/md4.js');
require('./test.js');

delete require.cache[require.resolve('../src/md4.js')];
delete require.cache[require.resolve('./test.js')];
md4 = null;

// browser AMD
JS_MD4_NO_NODE_JS = true;
JS_MD4_NO_COMMON_JS = true;
JS_MD4_NO_ARRAY_BUFFER = undefined;
window = global;
define = function (func) {
  md4 = func();
  require('./test.js');
};
define.amd = true;

require('../src/md4.js');
