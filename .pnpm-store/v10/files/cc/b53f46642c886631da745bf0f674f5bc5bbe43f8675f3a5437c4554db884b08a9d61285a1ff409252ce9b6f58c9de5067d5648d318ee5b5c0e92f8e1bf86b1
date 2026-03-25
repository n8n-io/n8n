const core = require('./core');

module.exports = core(
  {
    httpClientClass: require('./http/browser'),
    loggerClass: require('./logger/browser')
  });

// expose the module as a global variable
window.snowflake = module.exports;