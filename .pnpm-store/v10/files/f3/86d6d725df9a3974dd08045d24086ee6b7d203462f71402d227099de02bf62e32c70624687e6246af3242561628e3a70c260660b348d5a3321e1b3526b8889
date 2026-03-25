var raw_connect = require('./lib/connect').connect;
var CallbackModel = require('./lib/callback_model').CallbackModel;

// Supports three shapes:
// connect(url, options, callback)
// connect(url, callback)
// connect(callback)
function connect(url, options, cb) {
  if (typeof url === 'function')
    cb = url, url = false, options = false;
  else if (typeof options === 'function')
    cb = options, options = false;

  raw_connect(url, options, function(err, c) {
    if (err === null) cb(null, new CallbackModel(c));
    else cb(err);
  });
};

module.exports.connect = connect;
module.exports.credentials = require('./lib/credentials');
module.exports.IllegalOperationError = require('./lib/error').IllegalOperationError;
