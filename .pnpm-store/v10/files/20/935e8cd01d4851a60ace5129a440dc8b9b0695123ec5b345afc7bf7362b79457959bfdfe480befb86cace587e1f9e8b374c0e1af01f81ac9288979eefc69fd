var util = require('./util');

/**
 * Represents a plugin
 * @param {Object} modem docker-modem
 * @param {String} name  Plugin's name
 */
var Plugin = function(modem, name, remote) {
  this.modem = modem;
  this.name = name;
  this.remote = remote || name;
};

Plugin.prototype[require('util').inspect.custom] = function() { return this; };

/**
 * Inspect
 *
 * @param  {Object}   opts     Options (optional)
 * @param  {Function} callback Callback, if specified Docker will be queried.
 * @return {Object}            Name only if callback isn't specified.
 */
Plugin.prototype.inspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins/' + this.name + '/json',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'plugin is not installed',
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
 * Removes the plugin
 * @param  {[Object]}   opts     Remove options (optional)
 * @param  {Function} callback Callback
 */
Plugin.prototype.remove = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins/' + this.name + '?',
    method: 'DELETE',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'plugin is not installed',
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
      if (err) return args.callback(err, data);
      args.callback(err, data);
    });
  }
};

/**
 * get privileges
 * @param  {Object}   opts     Options (optional)
 * @param  {Function} callback Callback
 * @return {Object}            Name only if callback isn't specified.
 */
Plugin.prototype.privileges = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins/privileges?',
    method: 'GET',
    options: {
      'remote': this.remote
    },
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
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
 * Installs a new plugin
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Plugin.prototype.pull = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  if(args.opts._query && !args.opts._query.name) {
    args.opts._query.name = this.name;
  }
  if(args.opts._query && !args.opts._query.remote) {
    args.opts._query.remote = this.remote;
  }

  var optsf = {
    path: '/plugins/pull?',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    isStream: true,
    options: args.opts,
    statusCodes: {
      200: true, // unofficial, but proxies may return it
      204: true,
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
 * Enable
 * @param  {Object}   opts     Plugin enable options (optional)
 * @param  {Function} callback Callback
 */
Plugin.prototype.enable = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins/' + this.name + '/enable?',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
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
 * Disable
 * @param  {Object}   opts     Plugin disable options (optional)
 * @param  {Function} callback Callback
 */
Plugin.prototype.disable = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins/' + this.name + '/disable',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
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
 * Push
 * @param  {Object}   opts     Plugin push options (optional)
 * @param  {Function} callback Callback
 */
Plugin.prototype.push = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins/' + this.name + '/push',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      404: 'plugin not installed',
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
 * COnfigure
 * @param  {Object}   opts     Plugin configure options (optional)
 * @param  {Function} callback Callback
 */
Plugin.prototype.configure = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins/' + this.name + '/set',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      204: true,
      404: 'plugin not installed',
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
 * Upgrade plugin
 *
 * @param {object} auth
 * @param {object} opts
 * @param {function} callback
 */
Plugin.prototype.upgrade = function(auth, opts, callback) {
  var self = this;
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = auth;
    auth = opts.authconfig || undefined;
  }

  var optsf = {
    path: '/plugins/' + this.name + '/upgrade?',
    method: 'POST',
    abortSignal: opts && opts.abortSignal,
    statusCodes: {
      200: true,
      204: true,
      404: 'plugin not installed',
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


module.exports = Plugin;
