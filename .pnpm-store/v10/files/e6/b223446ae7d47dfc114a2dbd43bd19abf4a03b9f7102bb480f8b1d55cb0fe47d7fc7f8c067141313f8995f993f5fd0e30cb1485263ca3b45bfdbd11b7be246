var util = require('./util');

/**
 * Represents an network
 * @param {Object} modem docker-modem
 * @param {String} id  Network's id
 */
var Network = function(modem, id) {
  this.modem = modem;
  this.id = id;
};

Network.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Inspect
 * @param  {Function} callback Callback, if specified Docker will be queried.
 * @return {Object}            Id only if callback isn't specified.
 */
Network.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var opts = {
    path: '/networks/' + this.id + '?',
    method: 'GET',
    statusCodes: {
      200: true,
      404: 'no such network',
      500: 'server error'
    },
    options: args.opts
  };

  if(args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(opts, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  } else {
    this.modem.dial(opts, function(err, data) {
      args.callback(err, data);
    });
  }
};

/**
 * Removes the network
 * @param  {[Object]}   opts     Remove options (optional)
 * @param  {Function} callback Callback
 */
Network.prototype.remove = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/networks/' + this.id,
    method: 'DELETE',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      204: true,
      404: 'no such network',
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

/**
 * Connects a container to a network
 * @param  {[Object]}   opts     Connect options (optional)
 * @param  {Function} callback Callback
 */
Network.prototype.connect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/networks/' + this.id + '/connect',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      201: true,
      404: 'network or container is not found',
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


/**
 * Disconnects a container from a network
 * @param  {[Object]}   opts     Disconnect options (optional)
 * @param  {Function} callback Callback
 */
Network.prototype.disconnect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/networks/' + this.id + '/disconnect',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      201: true,
      404: 'network or container is not found',
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




module.exports = Network;
