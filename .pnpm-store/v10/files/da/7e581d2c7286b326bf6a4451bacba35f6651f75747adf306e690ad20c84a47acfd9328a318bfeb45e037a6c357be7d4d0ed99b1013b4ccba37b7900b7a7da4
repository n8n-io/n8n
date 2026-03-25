var util = require('./util');

/**
 * Represents an Task
 * @param {Object} modem docker-modem
 * @param {String} id    Task's ID
 */
var Task = function(modem, id) {
  this.modem = modem;
  this.id = id;

  this.defaultOptions = {
    log: {}
  };
};

Task.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Query Docker for Task details.
 *
 * @param {Object}   opts     Options (optional)
 * @param {function} callback
 */
Task.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/tasks/' + this.id,
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'unknown task',
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
      args.callback(err, data);
    });
  }
};

/**
 * Task logs
 * @param  {Object}   opts     Logs options. (optional)
 * @param  {Function} callback Callback with data
 */
Task.prototype.logs = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback, this.defaultOptions.log);

  var optsf = {
    path: '/tasks/' + this.id + '/logs?',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    isStream: args.opts.follow || false,
    statusCodes: {
      101: true,
      200: true,
      404: 'no such container',
      500: 'server error',
      503: 'node is not part of a swarm'
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
      args.callback(err, data);
    });
  }
};


module.exports = Task;
