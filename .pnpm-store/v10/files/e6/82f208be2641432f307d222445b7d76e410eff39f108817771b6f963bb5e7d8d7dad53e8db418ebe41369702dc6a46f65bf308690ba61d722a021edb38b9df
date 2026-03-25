// Replacement for node's internal 'internal/options' module

exports.getOptionValue = getOptionValue;
function getOptionValue(opt) {
  parseOptions();
  return options[opt];
}

let options;
function parseOptions() {
  if (!options) {
    options = {
      '--preserve-symlinks': false,
      '--preserve-symlinks-main': false,
      '--input-type': undefined,
      '--experimental-specifier-resolution': 'explicit',
      '--experimental-policy': undefined,
      '--conditions': [],
      '--pending-deprecation': false,
      ...parseArgv(getNodeOptionsEnvArgv()),
      ...parseArgv(process.execArgv),
      ...getOptionValuesFromOtherEnvVars()
    }
  }
}

function parseArgv(argv) {
  return require('arg')({
    '--preserve-symlinks': Boolean,
    '--preserve-symlinks-main': Boolean,
    '--input-type': String,
    '--experimental-specifier-resolution': String,
    // Legacy alias for node versions prior to 12.16
    '--es-module-specifier-resolution': '--experimental-specifier-resolution',
    '--experimental-policy': String,
    '--conditions': [String],
    '--pending-deprecation': Boolean,
    '--experimental-json-modules': Boolean,
    '--experimental-wasm-modules': Boolean,
  }, {
    argv,
    permissive: true
  });
}

function getNodeOptionsEnvArgv() {
  const errors = [];
  const envArgv = ParseNodeOptionsEnvVar(process.env.NODE_OPTIONS || '', errors);
  if (errors.length !== 0) {
    // TODO: handle errors somehow
  }
  return envArgv;
}

// Direct JS port of C implementation: https://github.com/nodejs/node/blob/67ba825037b4082d5d16f922fb9ce54516b4a869/src/node_options.cc#L1024-L1063
function ParseNodeOptionsEnvVar(node_options, errors) {
  const env_argv = [];

  let is_in_string = false;
  let will_start_new_arg = true;
  for (let index = 0; index < node_options.length; ++index) {
      let c = node_options[index];

      // Backslashes escape the following character
      if (c === '\\' && is_in_string) {
          if (index + 1 === node_options.length) {
              errors.push("invalid value for NODE_OPTIONS " +
                  "(invalid escape)\n");
              return env_argv;
          } else {
              c = node_options[++index];
          }
      } else if (c === ' ' && !is_in_string) {
          will_start_new_arg = true;
          continue;
      } else if (c === '"') {
          is_in_string = !is_in_string;
          continue;
      }

      if (will_start_new_arg) {
          env_argv.push(c);
          will_start_new_arg = false;
      } else {
          env_argv[env_argv.length - 1] += c;
      }
  }

  if (is_in_string) {
      errors.push("invalid value for NODE_OPTIONS " +
          "(unterminated string)\n");
  }
  return env_argv;
}

// Get option values that can be specified via env vars besides NODE_OPTIONS
function getOptionValuesFromOtherEnvVars() {
  const options = {};
  if(process.env.NODE_PENDING_DEPRECATION === '1') {
    options['--pending-deprecation'] = true;
  }
  return options;
}
