module.exports = function (config) {

  var browsers,
    customLaunchers = []

  if (process.env.BROWSERSTACK) {
    customLaunchers = require('./browsers')
    browsers = Object.keys(customLaunchers)
    browsers.forEach(function (browser) { customLaunchers[browser].base = 'BrowserStack' })
  } else {
    browsers = ['PhantomJS']
  }

  config.set({
    basePath: '',
    frameworks: ['mocha'],
    plugins: [
      'karma-mocha',
      'karma-coverage',
      'karma-browserstack-launcher',
      'karma-phantomjs-launcher'
    ],

    files: [
      '../node_modules/expect.js/index.js',
      '../dist/tmpl.js',
      'specs/core.specs.js',
      'specs/brackets.specs.js'
    ],

    browsers: browsers,

    customLaunchers: customLaunchers,

    reporters: ['progress', 'coverage'],
    preprocessors: {
      '../dist/tmpl.js': ['coverage']
    },
    coverageReporter: {
      dir: '../coverage/',
      reporters: [{
        type: 'lcov',
        subdir: 'report-lcov'
      }]
    },
    singleRun: true
  })
}
