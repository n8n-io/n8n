var util = require('./util');

/**
 * Represents an Exec
 * @param {Object} modem docker-modem
 * @param {String} id    Exec's ID
 */
var Exec = function(modem, id) {
  this.modem = modem;
  this.id = id;
};

Exec.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Start the exec call that was setup.
 *
 * @param {object} opts
 * @param {function} callback
 */
Exec.prototype.start = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/exec/' + this.id + '/start',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    isStream: true,
    allowEmpty: true,
    hijack: args.opts.hijack,
    openStdin: args.opts.stdin,
    statusCodes: {
      200: true,
      204: true,
      404: 'no such exec',
      409: 'container stopped/paused',
      500: 'container not running'
    },
    options: args.opts
  };


  if(args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, data);
    });
  }
};

/**
 * Resize the exec call that was setup.
 *
 * @param {object} opts
 * @param {function} callback
 */
Exec.prototype.resize = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/exec/' + this.id + '/resize?',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'no such exec',
      500: 'container not running'
    },
    options: args.opts
  };

  if(args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, data);
    });
  }
};

/**
 * Get low-level information about the exec call.
 *
 * @param {Object}   opts     Options (optional)
 * @param {function} callback
 */
Exec.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/exec/' + this.id + '/json',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'no such exec',
      500: 'server error'
    }
  };

  if(args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, data);
    });
  }
};


module.exports = Exec;
