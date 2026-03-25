// Karma configuration
// Generated on Fri Oct 23 2015 14:00:27 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],
    reporters: ['dots'],
    // Temporarily removing safari because of https://github.com/karma-runner/karma-safari-launcher/issues/29
    browsers: [ 'Chrome', 'Firefox' ], //, 'Safari' ],
    preprocessors: {
      'test/**/*.js': ['webpack']
    },

    // list of files / patterns to load in the browser
    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'test/**/*.js'
    ],

    webpack: {
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
            }
          }
        ]
      }
    },

    logLevel: config.LOG_ERROR
  });
};
