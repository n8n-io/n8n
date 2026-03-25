var EventEmitter = require('events').EventEmitter,
  Modem = require('docker-modem'),
  Container = require('./container'),
  Image = require('./image'),
  Volume = require('./volume'),
  Network = require('./network'),
  Service = require('./service'),
  Plugin = require('./plugin'),
  Secret = require('./secret'),
  Config = require('./config'),
  Task = require('./task'),
  Node = require('./node'),
  Exec = require('./exec'),
  util = require('./util'),
  withSession = require('./session'),
  extend = util.extend;

var Docker = function(opts) {
  if (!(this instanceof Docker)) return new Docker(opts);

  var plibrary = global.Promise;

  if (opts && opts.Promise) {
    plibrary = opts.Promise;

    if (Object.keys(opts).length === 1) {
      opts = undefined;
    }
  }

  if (opts && opts.modem) {
    this.modem = opts.modem;
  } else {
    this.modem = new Modem(opts);
  }
  this.modem.Promise = plibrary;
};

/**
 * Creates a new container
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Docker.prototype.createContainer = function(opts, callback) {
  var self = this;
  var optsf = {
    path: '/containers/create?',
    method: 'POST',
    options: opts,
    authconfig: opts.authconfig,
    abortSignal: opts.abortSignal,
    statusCodes: {
      200: true, // unofficial, but proxies may return it
      201: true,
      400: 'bad parameter',
      404: 'no such container',
      406: 'impossible to attach',
      500: 'server error'
    }
  };

  delete opts.authconfig;

  if (callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(self.getContainer(data.Id));
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return callback(err, data);
      callback(err, self.getContainer(data.Id));
    });
  }
};

/**
 * Creates a new image
 * @param {Object}   auth     Authentication (optional)
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Docker.prototype.createImage = function(auth, opts, callback) {
  var self = this;
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = auth;
    auth = opts.authconfig || undefined;
  } else if (!callback && !opts) {
    opts = auth;
    auth = opts.authconfig;
  }

  var optsf = {
    path: '/images/create?',
    method: 'POST',
    options: opts,
    authconfig: auth,
    abortSignal: opts.abortSignal,
    isStream: true,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (callback === undefined) {
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
 * Load image
 * @param {String}   file     File
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.loadImage = function(file, opts, callback) {
  var self = this;
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = null;
  }

  var optsf = {
    path: '/images/load?',
    method: 'POST',
    options: opts,
    file: file,
    abortSignal: opts && opts.abortSignal,
    isStream: true,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (callback === undefined) {
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
 * Import image from a tar archive
 * @param {String}   file     File
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.importImage = function(file, opts, callback) {
  var self = this;
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = undefined;
  }

  if (!opts)
    opts = {};

  opts.fromSrc = '-';

  var optsf = {
    path: '/images/create?',
    method: 'POST',
    options: opts,
    file: file,
    abortSignal: opts.abortSignal,
    isStream: true,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (callback === undefined) {
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
 * Verifies auth
 * @param {Object}   opts     Options
 * @param {Function} callback Callback
 */
Docker.prototype.checkAuth = function(opts, callback) {
  var self = this;
  var optsf = {
    path: '/auth',
    method: 'POST',
    options: opts,
    abortSignal: opts.abortSignal,
    statusCodes: {
      200: true,
      204: true,
      500: 'server error'
    }
  };

  if (callback === undefined) {
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
 * Builds an image
 * @param {String}   file     File
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.buildImage = function(file, opts, callback) {
  var self = this;

  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = null;
  }

  var optsf = {
    path: '/build?',
    method: 'POST',
    file: undefined,
    options: opts,
    abortSignal: opts && opts.abortSignal,
    isStream: true,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (opts) {
    if (opts.registryconfig) {
      optsf.registryconfig = optsf.options.registryconfig;
      delete optsf.options.registryconfig;
    }

    //undocumented?
    if (opts.authconfig) {
      optsf.authconfig = optsf.options.authconfig;
      delete optsf.options.authconfig;
    }

    if (opts.cachefrom && Array.isArray(opts.cachefrom)) {
      optsf.options.cachefrom = JSON.stringify(opts.cachefrom);
    }
  }

  function dial(callback) {
    util.prepareBuildContext(file, (ctx) => {
      optsf.file = ctx;
      self.modem.dial(optsf, callback);
    });
  }

  function dialWithSession(callback) {
    if (opts?.version === "2") {
      withSession(self, optsf.authconfig,(err, sessionId, done) => {
        if (err) {
          return callback(err);
        }

        optsf.options.session = sessionId;

        dial((err, data) => {
          callback(err, data);

          if (data) {
            data.on("end", done);
          }
        });
      });
    } else {
      dial(callback);
    }
  }

  if (callback === undefined) {
    return new self.modem.Promise(function (resolve, reject) {
      dialWithSession(function (err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  } else {
    dialWithSession(callback);
  }
};

/**
 * Fetches a Container by ID
 * @param {String} id Container's ID
 */
Docker.prototype.getContainer = function(id) {
  return new Container(this.modem, id);
};

/**
 * Fetches an Image by name
 * @param {String} name Image's name
 */
Docker.prototype.getImage = function(name) {
  return new Image(this.modem, name);
};

/**
 * Fetches a Volume by name
 * @param {String} name Volume's name
 */
Docker.prototype.getVolume = function(name) {
  return new Volume(this.modem, name);
};

/**
 * Fetches a Plugin by name
 * @param {String} name Volume's name
 */
Docker.prototype.getPlugin = function(name, remote) {
  return new Plugin(this.modem, name, remote);
};

/**
 * Fetches a Service by id
 * @param {String} id Services's id
 */
Docker.prototype.getService = function(id) {
  return new Service(this.modem, id);
};

/**
 * Fetches a Task by id
 * @param {String} id Task's id
 */
Docker.prototype.getTask = function(id) {
  return new Task(this.modem, id);
};

/**
 * Fetches Node by id
 * @param {String} id Node's id
 */
Docker.prototype.getNode = function(id) {
  return new Node(this.modem, id);
};

/**
 * Fetches a Network by id
 * @param {String} id network's id
 */
Docker.prototype.getNetwork = function(id) {
  return new Network(this.modem, id);
};

/**
 * Fetches a Secret by id
 * @param {String} id network's id
 */
Docker.prototype.getSecret = function(id) {
  return new Secret(this.modem, id);
};

/**
 * Fetches a Config by id
 * @param {String} id network's id
 */
Docker.prototype.getConfig = function(id) {
  return new Config(this.modem, id);
};

/**
 * Fetches an Exec instance by ID
 * @param {String} id Exec instance's ID
 */
Docker.prototype.getExec = function(id) {
  return new Exec(this.modem, id);
};

/**
 * Lists containers
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.listContainers = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/containers/json?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Lists images
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.listImages = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/images/json?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Get images
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.getImages = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/images/get?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    isStream: true,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Lists Services
 * @param {Object} opts
 * @param {Function} callback Callback
 */
Docker.prototype.listServices = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/services?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Lists Nodes
 * @param {Object} opts
 * @param {Function} callback Callback
 */
Docker.prototype.listNodes = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/nodes?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      404: 'no such node',
      500: 'server error',
      503: 'node is not part of a swarm',
    }
  };

  if (args.callback === undefined) {
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
 * Lists Tasks
 * @param {Object} opts
 * @param {Function} callback Callback
 */
Docker.prototype.listTasks = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/tasks?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Creates a new secret
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Docker.prototype.createSecret = function(opts, callback) {
  var args = util.processArgs(opts, callback);
  var self = this;
  var optsf = {
    path: '/secrets/create?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true, // unofficial, but proxies may return it
      201: true,
      406: 'server error or node is not part of a swarm',
      409: 'name conflicts with an existing object',
      500: 'server error'
    }
  };


  if (args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(self.getSecret(data.ID));
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, self.getSecret(data.ID));
    });
  }
};


/**
 * Creates a new config
 * @param {Object}   opts     Config options
 * @param {Function} callback Callback
 */
Docker.prototype.createConfig = function(opts, callback) {
  var args = util.processArgs(opts, callback);
  var self = this;
  var optsf = {
    path: '/configs/create?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true, // unofficial, but proxies may return it
      201: true,
      406: 'server error or node is not part of a swarm',
      409: 'name conflicts with an existing object',
      500: 'server error'
    }
  };


  if (args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(self.getConfig(data.ID));
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, self.getConfig(data.ID));
    });
  }
};


/**
 * Lists secrets
 * @param {Object} opts
 * @param {Function} callback Callback
 */
Docker.prototype.listSecrets = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/secrets?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Lists configs
 * @param {Object} opts
 * @param {Function} callback Callback
 */
Docker.prototype.listConfigs = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/configs?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Creates a new plugin
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Docker.prototype.createPlugin = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);
  var optsf = {
    path: '/plugins/create?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true, // unofficial, but proxies may return it
      204: true,
      500: 'server error'
    }
  };


  if (args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(self.getPlugin(args.opts.name));
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, self.getPlugin(args.opts.name));
    });
  }
};


/**
 * Lists plugins
 * @param {Object} opts
 * @param {Function} callback Callback
 */
Docker.prototype.listPlugins = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/plugins?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Prune images
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.pruneImages = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/images/prune?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Prune builder
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.pruneBuilder = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/build/prune',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Prune containers
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.pruneContainers = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/containers/prune?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Prune volumes
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.pruneVolumes = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/volumes/prune?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Prune networks
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.pruneNetworks = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/networks/prune?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Creates a new volume
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Docker.prototype.createVolume = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);
  var optsf = {
    path: '/volumes/create?',
    method: 'POST',
    allowEmpty: true,
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true, // unofficial, but proxies may return it
      201: true,
      500: 'server error'
    }
  };


  if (args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(self.getVolume(data.Name));
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, self.getVolume(data.Name));
    });
  }
};

/**
 * Creates a new service
 * @param {Object}   auth
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Docker.prototype.createService = function(auth, opts, callback) {
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = auth;
    auth = opts.authconfig || undefined;
  } else if (!opts && !callback) {
    opts = auth;
  }


  var self = this;
  var optsf = {
    path: '/services/create',
    method: 'POST',
    options: opts,
    authconfig: auth,
    abortSignal: opts && opts.abortSignal,
    statusCodes: {
      200: true,
      201: true,
      500: 'server error'
    }
  };


  if (callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(self.getService(data.ID || data.Id));
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return callback(err, data);
      callback(err, self.getService(data.ID || data.Id));
    });
  }
};

/**
 * Lists volumes
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.listVolumes = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/volumes?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Creates a new network
 * @param {Object}   opts     Create options
 * @param {Function} callback Callback
 */
Docker.prototype.createNetwork = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);
  var optsf = {
    path: '/networks/create?',
    method: 'POST',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true, // unofficial, but proxies may return it
      201: true,
      404: 'driver not found',
      500: 'server error'
    }
  };


  if (args.callback === undefined) {
    return new this.modem.Promise(function(resolve, reject) {
      self.modem.dial(optsf, function(err, data) {
        if (err) {
          return reject(err);
        }
        resolve(self.getNetwork(data.Id));
      });
    });
  } else {
    this.modem.dial(optsf, function(err, data) {
      if (err) return args.callback(err, data);
      args.callback(err, self.getNetwork(data.Id));
    });
  }
};

/**
 * Lists networks
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.listNetworks = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/networks?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Search images
 * @param {Object}   opts     Options
 * @param {Function} callback Callback
 */
Docker.prototype.searchImages = function(opts, callback) {
  var self = this;
  var optsf = {
    path: '/images/search?',
    method: 'GET',
    options: opts,
    authconfig: opts.authconfig,
    abortSignal: opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (callback === undefined) {
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
 * Info
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback with info
 */
Docker.prototype.info = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var opts = {
    path: '/info',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };


  if (args.callback === undefined) {
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
 * Version
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.version = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var opts = {
    path: '/version',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Ping
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.ping = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/_ping',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * SystemDf 	equivalent to system/df API Engine
 *		get usage data information
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.df = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/system/df',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Events
 * @param {Object}   opts     Events options, like 'since' (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.getEvents = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/events?',
    method: 'GET',
    options: args.opts,
    abortSignal: args.opts.abortSignal,
    isStream: true,
    statusCodes: {
      200: true,
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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
 * Pull is a wrapper around createImage, parsing image's tags.
 * @param  {String}   repoTag  Repository tag
 * @param  {Object}   opts     Options (optional)
 * @param  {Function} callback Callback
 * @param  {Object}   auth     Authentication (optional)
 * @return {Object}            Image
 */
Docker.prototype.pull = function(repoTag, opts, callback, auth) {
  var args = util.processArgs(opts, callback);

  var imageSrc = util.parseRepositoryTag(repoTag);
  args.opts.fromImage = imageSrc.repository;
  args.opts.tag = imageSrc.tag || 'latest';

  var argsf = [args.opts, args.callback];
  if (auth) {
    argsf = [auth, args.opts, args.callback];
  }
  return this.createImage.apply(this, argsf);
};

/**
 * PullAll is a wrapper around createImage, to pull all image tags of an image.
 * @param  {String}   repoTag  Repository tag
 * @param  {Object}   opts     Options (optional)
 * @param  {Function} callback Callback
 * @param  {Object}   auth     Authentication (optional)
 * @return {Object}            Image
 */
Docker.prototype.pullAll = function(repoTag, opts, callback, auth) {
  var args = util.processArgs(opts, callback);

  var imageSrc = util.parseRepositoryTag(repoTag);
  args.opts.fromImage = imageSrc.repository;

  var argsf = [args.opts, args.callback];
  if (auth) {
    argsf = [auth, args.opts, args.callback];
  }
  return this.createImage.apply(this, argsf);
};

/**
 * Like run command from Docker's CLI
 * @param  {String}   image         Image name to be used.
 * @param  {Array}   cmd           Command to run in array format.
 * @param  {Object}   streamo       Output stream
 * @param  {Object}   createOptions Container create options (optional)
 * @param  {Object}   startOptions  Container start options (optional)
 * @param  {Function} callback      Callback
 * @return {Object}                 EventEmitter
 */
Docker.prototype.run = function(image, cmd, streamo, createOptions, startOptions, callback) {
  if (typeof arguments[arguments.length - 1] === 'function') {
    return this.runCallback(image, cmd, streamo, createOptions, startOptions, callback);
  } else {
    return this.runPromise(image, cmd, streamo, createOptions, startOptions);
  }
};


Docker.prototype.runCallback = function(image, cmd, streamo, createOptions, startOptions, callback) {
  if (!callback && typeof createOptions === 'function') {
    callback = createOptions;
    createOptions = {};
    startOptions = {};
  } else if (!callback && typeof startOptions === 'function') {
    callback = startOptions;
    startOptions = {};
  }

  var hub = new EventEmitter();

  function handler(err, container) {
    if (err) return callback(err, null, container);

    hub.emit('container', container);

    container.attach({
      stream: true,
      stdout: true,
      stderr: true
    }, function handler(err, stream) {
      if (err) return callback(err, null, container);

      hub.emit('stream', stream);

      if (streamo) {
        if (streamo instanceof Array) {
          stream.on('end', function() {
            try {
              streamo[0].end();
            } catch (e) {}
            try {
              streamo[1].end();
            } catch (e) {}
          });
          container.modem.demuxStream(stream, streamo[0], streamo[1]);
        } else {
          stream.setEncoding('utf8');
          stream.pipe(streamo, {
            end: true
          });
        }
      }

      container.start(startOptions, function(err, data) {
        if (err) return callback(err, data, container);
        hub.emit('start', container);

        container.wait(function(err, data) {
          hub.emit('data', data);
          callback(err, data, container);
        });
      });
    });
  }

  var optsc = {
    'Hostname': '',
    'User': '',
    'AttachStdin': false,
    'AttachStdout': true,
    'AttachStderr': true,
    'Tty': true,
    'OpenStdin': false,
    'StdinOnce': false,
    'Env': null,
    'Cmd': cmd,
    'Image': image,
    'Volumes': {},
    'VolumesFrom': []
  };

  extend(optsc, createOptions);

  this.createContainer(optsc, handler);

  return hub;
};

Docker.prototype.runPromise = function(image, cmd, streamo, createOptions, startOptions) {
  var self = this;

  createOptions = createOptions || {};
  startOptions = startOptions || {};

  var optsc = {
    'Hostname': '',
    'User': '',
    'AttachStdin': false,
    'AttachStdout': true,
    'AttachStderr': true,
    'Tty': true,
    'OpenStdin': false,
    'StdinOnce': false,
    'Env': null,
    'Cmd': cmd,
    'Image': image,
    'Volumes': {},
    'VolumesFrom': []
  };

  extend(optsc, createOptions);

  var containero;

  return new this.modem.Promise(function(resolve, reject) {
    self.createContainer(optsc).then(function(container) {
      containero = container;
      return container.attach({
        stream: true,
        stdout: true,
        stderr: true
      });
    }).then(function(stream) {
      if (streamo) {
        if (streamo instanceof Array) {
          stream.on('end', function() {
            try {
              streamo[0].end();
            } catch (e) {}
            try {
              streamo[1].end();
            } catch (e) {}
          });
          containero.modem.demuxStream(stream, streamo[0], streamo[1]);
        } else {
          stream.setEncoding('utf8');
          stream.pipe(streamo, {
            end: true
          });
        }
      }
      return containero.start(startOptions);
    }).then(function(data) {
      return containero.wait();
    }).then(function(data) {
      resolve([data, containero]);
    }).catch(function(err) {
      reject(err);
    });
  });
};

/**
 * Init swarm.
 *
 * @param {object} opts
 * @param {function} callback
 */
Docker.prototype.swarmInit = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/swarm/init',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      406: 'node is already part of a Swarm'
    },
    options: args.opts
  };

  if (args.callback === undefined) {
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
 * Join swarm.
 *
 * @param {object} opts
 * @param {function} callback
 */
Docker.prototype.swarmJoin = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/swarm/join',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      406: 'node is already part of a Swarm'
    },
    options: args.opts
  };

  if (args.callback === undefined) {
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
 * Leave swarm.
 *
 * @param {object} opts
 * @param {function} callback
 */
Docker.prototype.swarmLeave = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/swarm/leave?',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      406: 'node is not part of a Swarm'
    },
    options: args.opts
  };

  if (args.callback === undefined) {
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
 * Update swarm.
 *
 * @param {object} opts
 * @param {function} callback
 */
Docker.prototype.swarmUpdate = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/swarm/update?',
    method: 'POST',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      400: 'bad parameter',
      406: 'node is already part of a Swarm'
    },
    options: args.opts
  };

  if (args.callback === undefined) {
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
 * Inspect a Swarm.
 * Warning: This method is not documented in the API
 *
 * @param {Object}   opts     Options (optional)
 * @param {Function} callback Callback
 */
Docker.prototype.swarmInspect = function(opts, callback) {
  var self = this;
  var args = util.processArgs(opts, callback);

  var optsf = {
    path: '/swarm',
    method: 'GET',
    abortSignal: args.opts.abortSignal,
    statusCodes: {
      200: true,
      406: 'This node is not a swarm manager',
      500: 'server error'
    }
  };

  if (args.callback === undefined) {
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

Docker.Container = Container;
Docker.Image = Image;
Docker.Volume = Volume;
Docker.Network = Network;
Docker.Service = Service;
Docker.Plugin = Plugin;
Docker.Secret = Secret;
Docker.Task = Task;
Docker.Node = Node;
Docker.Exec = Exec;

module.exports = Docker;
