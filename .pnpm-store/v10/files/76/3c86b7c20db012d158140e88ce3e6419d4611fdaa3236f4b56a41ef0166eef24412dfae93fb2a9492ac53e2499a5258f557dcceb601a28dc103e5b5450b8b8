'use strict';

const fs = require('fs');
const child_process = require('child_process');

const {
  PerformanceObserver,
  constants: {
    NODE_PERFORMANCE_GC_INCREMENTAL,
    NODE_PERFORMANCE_GC_MAJOR,
    NODE_PERFORMANCE_GC_MINOR
  }
} = require('perf_hooks');

const { Connection } = require('tedious');

// The `Benchmark` class is taken from Node.js - see
// https://github.com/nodejs/node/blob/0f96dc266fd0cd8c1baa82ce7eb951c11b29a331/benchmark/common.js
// Copyright Node.js contributors. All rights reserved.
function Benchmark(fn, configs, options) {
  // Use the file name as the name of the benchmark
  this.name = require.main.filename.slice(__dirname.length + 1);
  // Parse job-specific configuration from the command line arguments
  const parsed_args = this._parseArgs(process.argv.slice(2), configs);
  this.options = parsed_args.cli;
  this.extra_options = parsed_args.extra;
  // The configuration list as a queue of jobs
  this.queue = this._queue(this.options);
  // The configuration of the current job, head of the queue
  this.config = this.queue[0];
  // Execution arguments i.e. flags used to run the jobs
  this.flags = [];
  if (options && options.flags) {
    this.flags = this.flags.concat(options.flags);
  }
  if (process.env.NODE_BENCHMARK_FLAGS) {
    const flags = process.env.NODE_BENCHMARK_FLAGS.split(/\s+/);
    this.flags = this.flags.concat(flags);
  }
  // Holds process.hrtime value
  this._time = [0, 0];
  // Used to make sure a benchmark only start a timer once
  this._started = false;

  this._gcStats = {
    [NODE_PERFORMANCE_GC_INCREMENTAL]: {
      count: 0,
      totalDuration: 0
    },
    [NODE_PERFORMANCE_GC_MINOR]: {
      count: 0,
      totalDuration: 0
    },
    [NODE_PERFORMANCE_GC_MAJOR]: {
      count: 0,
      totalDuration: 0
    }
  };

  this._observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const length = entries.length;

    for (let i = 0; i < length; i++) {
      const entry = entries[i];
      const stats = this._gcStats[entry.detail.kind];

      if (stats) {
        stats.count += 1;
        stats.totalDuration += entry.duration;
      }
    }
  });

  // this._run will use fork() to create a new process for each configuration
  // combination.
  if (process.env.hasOwnProperty('NODE_RUN_BENCHMARK_FN')) {
    process.nextTick(() => fn(this.config));
  } else {
    process.nextTick(() => this._run());
  }
}

Benchmark.prototype._parseArgs = function(argv, configs) {
  const cliOptions = {};
  const extraOptions = {};
  const validArgRE = /^(.+?)=([\s\S]*)$/;
  // Parse configuration arguments
  for (const arg of argv) {
    const match = arg.match(validArgRE);
    if (!match) {
      console.error(`bad argument: ${arg}`);
      process.exit(1);
    }
    const config = match[1];

    if (configs[config]) {
      // Infer the type from the config object and parse accordingly
      const isNumber = typeof configs[config][0] === 'number';
      const value = isNumber ? +match[2] : match[2];
      if (!cliOptions[config])
        cliOptions[config] = [];
      cliOptions[config].push(value);
    } else {
      extraOptions[config] = match[2];
    }
  }
  return { cli: Object.assign({}, configs, cliOptions), extra: extraOptions };
};

Benchmark.prototype._queue = function(options) {
  const queue = [];
  const keys = Object.keys(options);

  // Perform a depth-first walk though all options to generate a
  // configuration list that contains all combinations.
  function recursive(keyIndex, prevConfig) {
    const key = keys[keyIndex];
    const values = options[key];
    const type = typeof values[0];

    for (const value of values) {
      if (typeof value !== 'number' && typeof value !== 'string') {
        throw new TypeError(`configuration "${key}" had type ${typeof value}`);
      }
      if (typeof value !== type) {
        // This is a requirement for being able to consistently and predictably
        // parse CLI provided configuration values.
        throw new TypeError(`configuration "${key}" has mixed types`);
      }

      const currConfig = Object.assign({ [key]: value }, prevConfig);

      if (keyIndex + 1 < keys.length) {
        recursive(keyIndex + 1, currConfig);
      } else {
        queue.push(currConfig);
      }
    }
  }

  if (keys.length > 0) {
    recursive(0, {});
  } else {
    queue.push({});
  }

  return queue;
};

Benchmark.prototype._run = function() {
  const self = this;
  // If forked, report to the parent.
  if (process.send) {
    process.send({
      type: 'config',
      name: this.name,
      queueLength: this.queue.length,
    });
  }

  (function recursive(queueIndex) {
    const config = self.queue[queueIndex];

    // Set NODE_RUN_BENCHMARK_FN to indicate that the child shouldn't construct
    // a configuration queue, but just execute the benchmark function.
    const childEnv = Object.assign({}, process.env);
    childEnv.NODE_RUN_BENCHMARK_FN = '';

    // Create configuration arguments
    const childArgs = [];
    for (const key of Object.keys(config)) {
      childArgs.push(`${key}=${config[key]}`);
    }
    for (const key of Object.keys(self.extra_options)) {
      childArgs.push(`${key}=${self.extra_options[key]}`);
    }

    const child = child_process.fork(require.main.filename, childArgs, {
      env: childEnv,
      execArgv: self.flags.concat(process.execArgv),
    });
    child.on('message', sendResult);
    child.on('close', (code) => {
      if (code) {
        process.exit(code);
      }

      if (queueIndex + 1 < self.queue.length) {
        recursive(queueIndex + 1);
      }
    });
  })(0);
};

Benchmark.prototype.start = function() {
  if (this._started) {
    throw new Error('Called start more than once in a single benchmark');
  }
  this._started = true;
  this._observer.observe({ entryTypes: ['gc'], buffered: false });

  this._time = process.hrtime();
};

Benchmark.prototype.end = function(operations) {
  // Get elapsed time now and do error checking later for accuracy.
  const elapsed = process.hrtime(this._time);

  if (!this._started) {
    throw new Error('called end without start');
  }
  if (typeof operations !== 'number') {
    throw new Error('called end() without specifying operation count');
  }
  if (!process.env.NODEJS_BENCHMARK_ZERO_ALLOWED && operations <= 0) {
    throw new Error('called end() with operation count <= 0');
  }
  if (elapsed[0] === 0 && elapsed[1] === 0) {
    if (!process.env.NODEJS_BENCHMARK_ZERO_ALLOWED)
      throw new Error('insufficient clock precision for short benchmark');
    // Avoid dividing by zero
    elapsed[1] = 1;
  }

  this._observer.disconnect();

  const time = elapsed[0] + elapsed[1] / 1e9;
  const rate = operations / time;
  this.report(rate, elapsed);
};

function formatResult(data) {
  // Construct configuration string, " A=a, B=b, ..."
  let conf = '';
  for (const key of Object.keys(data.conf)) {
    conf += ` ${key}=${JSON.stringify(data.conf[key])}`;
  }

  var rate = data.rate.toString().split('.');
  rate[0] = rate[0].replace(/(\d)(?=(?:\d\d\d)+(?!\d))/g, '$1,');
  rate = (rate[1] ? rate.join('.') : rate[0]);

  var gcInfo;
  gcInfo = `(minor: ${data.gcStats[NODE_PERFORMANCE_GC_MINOR].count} - ${data.gcStats[NODE_PERFORMANCE_GC_MINOR].totalDuration}ms,`;
  gcInfo += ` major: ${data.gcStats[NODE_PERFORMANCE_GC_MAJOR].count} - ${data.gcStats[NODE_PERFORMANCE_GC_MAJOR].totalDuration}ms,`;
  gcInfo += ` incremental: ${data.gcStats[NODE_PERFORMANCE_GC_INCREMENTAL].count} - ${data.gcStats[NODE_PERFORMANCE_GC_INCREMENTAL].totalDuration}ms)`;

  return `${data.name}${conf}: ${rate} ${gcInfo}`;
}

function sendResult(data) {
  if (process.send) {
    // If forked, report by process send
    process.send(data);
  } else {
    // Otherwise report by stdout
    console.log(formatResult(data));
  }
}

Benchmark.prototype.report = function(rate, elapsed) {
  sendResult({
    name: this.name,
    conf: this.config,
    rate: rate,
    time: elapsed[0] + elapsed[1] / 1e9,
    type: 'report',
    gcStats: this._gcStats
  });
};

function createBenchmark(fn, configs, options) {
  return new Benchmark(fn, configs, options);
}

function createConnection(cb) {
  var config = JSON.parse(fs.readFileSync(require('os').homedir() + '/.tedious/test-connection.json', 'utf8')).config;

  var connection = new Connection(config);
  connection.connect(function() {
    cb(connection);
  });
}

module.exports.createBenchmark = createBenchmark;
module.exports.createConnection = createConnection;
