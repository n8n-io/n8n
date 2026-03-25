var util = require('./util');

/**
 * Represents an Service
 * @param {Object} modem docker-modem
 * @param {String} id    Service's ID
 */
var Service = function(modem, id) {
  this.modem = modem;
  this.id = id;
};

Service.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Query Docker for service details.
 *
 * @param {Object}   opts     Options (optional)
 * @param {function} callback
 */
Service.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/services/' + this.id,
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'no such service',
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
 * Delete Service
 *
 * @param {Object}   opts     Options (optional)
 * @param {function} callback
 */
Service.prototype.remove = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/services/' + this.id,
    method: 'DELETE',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      204: true,
      404: 'no such service',
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
 * Update service
 *
 * @param {object} auth
 * @param {object} opts
 * @param {function} callback
 */
Service.prototype.update = function(auth, opts, callback) {
  var self = this;
  if (!callback) {
    var t = typeof opts;
    if(t === 'function'){
      callback = opts;
      opts = auth;
      auth = opts.authconfig || undefined;
    } else if (t === 'undefined'){
      opts = auth;
      auth = opts.authconfig || undefined;
    }
  }

  var optsf = {
    path: '/services/' + this.id + '/update?',
    method: 'POST',
    abortSignal: opts && opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'no such service',
      500: 'server error'
    },
    authconfig: auth,
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
 * Service logs
 * @param  {Object}   opts     Logs options. (optional)
 * @param  {Function} callback Callback with data
 */
Service.prototype.logs = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback, {});

  var optsf = {
    path: '/services/' + this.id + '/logs?',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    isStream: args.opts.follow || false,
    statusCodes: {
      200: true,
      404: 'no such service',
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



module.exports = Service;
