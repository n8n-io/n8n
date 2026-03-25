let util = require('util');

let logger = new (function () {
  let _output = function (type, out) {
    let quiet = typeof jake != 'undefined' && jake.program &&
        jake.program.opts && jake.program.opts.quiet;
    let msg;
    if (!quiet) {
      msg = typeof out == 'string' ? out : util.inspect(out);
      console[type](msg);
    }
  };

  this.log = function (out) {
    _output('log', out);
  };

  this.error = function (out) {
    _output('error', out);
  };

})();

module.exports = logger;
