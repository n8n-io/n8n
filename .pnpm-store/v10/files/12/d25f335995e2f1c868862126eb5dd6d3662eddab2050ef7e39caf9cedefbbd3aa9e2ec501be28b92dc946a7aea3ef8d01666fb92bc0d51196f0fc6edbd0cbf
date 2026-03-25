var exec = require('child_process').exec;

var helpers = new (function () {
  var _tests;
  var _names = [];
  var _name;
  var _callback;
  var _runner = function () {
    if ((_name = _names.shift())) {
      console.log('Running ' + _name);
      _tests[_name]();
    }
    else {
      _callback();
    }
  };

  this.exec = function () {
    var args = Array.prototype.slice.call(arguments);
    var arg;
    var cmd = args.shift();
    var opts = {};
    var callback;
    // Optional opts/callback or callback/opts
    while ((arg = args.shift())) {
      if (typeof arg == 'function') {
        callback = arg;
      }
      else {
        opts = arg;
      }
    }

    cmd += ' --trace';
    var execOpts = opts.execOpts ? opts.execOpts : {};
    exec(cmd, execOpts, function (err, stdout, stderr) {
      var out = helpers.trim(stdout);
      if (err) {
        if (opts.breakOnError === false) {
          return callback(err);
        }
        else {
          throw err;
        }
      }
      if (stderr) {
        callback(stderr);
      }
      else {
        callback(out);
      }
    });
  };

  this.trim = function (s) {
    var str = s || '';
    return str.replace(/^\s*|\s*$/g, '');
  };

  this.parse = function (s) {
    var str = s || '';
    str = helpers.trim(str);
    str = str.replace(/'/g, '"');
    return JSON.parse(str);
  };

  this.run = function (tests, callback) {
    _tests = tests;
    _names = Object.keys(tests);
    _callback = callback;
    _runner();
  };

  this.next = function () {
    _runner();
  };

})();

module.exports = helpers;
