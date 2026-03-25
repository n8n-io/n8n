var util = require('./util');

/**
 * Represents a secret
 * @param {Object} modem docker-modem
 * @param {String} id  Secret's id
 */
var Secret = function(modem, id) {
  this.modem = modem;
  this.id = id;
};

Secret.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Inspect
 * @param  {Object}   opts     Options (optional)
 * @param  {Function} callback Callback, if specified Docker will be queried.
 * @return {Object}            Name only if callback isn't specified.
 */
Secret.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/secrets/' + this.id,
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'secret not found',
      406: 'node is not part of a swarm',
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
 * Update a secret.
 *
 * @param {object} opts
 * @param {function} callback
 */
Secret.prototype.update = function(opts, callback) {
  var self = this;
  if (!callback && typeof opts === 'function') {
    callback = opts;
  }

  var optsf = {
    path: '/secrets/' + this.id + '/update?',
    method: 'POST',
    abortSignal: opts && opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'secret not found',
      500: 'server error'
    },
    options: opts
  };

  if(callback === undefined) {
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
      callback(err, data);
    });
  }
};


/**
 * Removes the secret
 * @param  {[Object]}   opts     Remove options (optional)
 * @param  {Function} callback Callback
 */
Secret.prototype.remove = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/secrets/' + this.id,
    method: 'DELETE',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      204: true,
      404: 'secret not found',
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



module.exports = Secret;
