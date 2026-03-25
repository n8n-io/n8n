var util = require('./util');

/**
 * Represents a volume
 * @param {Object} modem docker-modem
 * @param {String} name  Volume's name
 */
var Volume = function(modem, name) {
  this.modem = modem;
  this.name = name;
};

Volume.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Inspect
 * @param  {Object}   opts     Options (optional)
 * @param  {Function} callback Callback, if specified Docker will be queried.
 * @return {Object}            Name only if callback isn't specified.
 */
Volume.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/volumes/' + this.name,
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'no such volume',
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
 * Removes the volume
 * @param  {[Object]}   opts     Remove options (optional)
 * @param  {Function} callback Callback
 */
Volume.prototype.remove = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/volumes/' + this.name,
    method: 'DELETE',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      204: true,
      404: 'no such volume',
      409: 'conflict',
      500: 'server error'
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

module.exports = Volume;
