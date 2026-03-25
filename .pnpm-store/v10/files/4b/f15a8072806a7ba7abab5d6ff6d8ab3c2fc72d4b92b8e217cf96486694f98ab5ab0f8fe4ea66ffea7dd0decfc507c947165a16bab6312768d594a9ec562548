var util = require('./util');

/**
 * Represents a config
 * @param {Object} modem docker-modem
 * @param {String} id  Config's id
 */
var Config = function(modem, id) {
  this.modem = modem;
  this.id = id;
};

Config.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Inspect
 *
 * @param  {Object}   opts     Options (optional)
 * @param  {Function} callback Callback, if specified Docker will be queried.
 * @return {Object}            Name only if callback isn't specified.
 */
Config.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/configs/' + this.id,
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'config not found',
      500: 'server error',
      503: 'node is not part of a swarm'
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
 * Update a config.
 *
 * @param {object} opts
 * @param {function} callback
 */
Config.prototype.update = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/configs/' + this.id + '/update?',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'config not found',
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


/**
 * Removes the config
 * @param  {[Object]}   opts     Remove options (optional)
 * @param  {Function} callback Callback
 */
Config.prototype.remove = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/configs/' + this.id,
    method: 'DELETE',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      204: true,
      404: 'config not found',
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



module.exports = Config;
