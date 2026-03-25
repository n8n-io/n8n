'use strict';
module.exports = config => {
  config.set({
    basePath: '../',
    frameworks: ['jasmine-jquery', 'jasmine'],
    files: [
      'node_modules/jquery/dist/jquery.min.js',
      'dist/!(*.es6|*.min).js',
      'test/specs/configuration.js',
      'test/specs/basic/done.js',
      'test/specs/basic/each.js',
      'test/specs/basic/no-match.js',
      'test/specs/basic/debug.js',
      'test/specs/basic/main.js',
      'test/specs/basic/unmark.js',
      'test/specs/basic/context-array.js',
      'test/specs/basic/context-nodelist.js',
      'test/specs/basic/context-direct.js',
      'test/specs/basic/context-string.js',
      'test/specs/basic/array-keyword.js',
      'test/specs/basic/custom-element-class.js',
      'test/specs/basic/!(accuracy|no-options|case-sensitive|ignore-joiners|ignore-punctuation|wildcards)*.js',
      // depends on diacritics, separateWordSearch or synonyms:
      'test/specs/basic/accuracy*.js',
      'test/specs/basic/case-sensitive*.js',
      'test/specs/basic/ignore-joiners*.js',
      'test/specs/basic/ignore-punctuation*.js',
      'test/specs/basic/wildcards*.js',
      'test/specs/iframes/main.js',
      'test/specs/iframes/unmark.js',
      'test/specs/**/!(no-options).js', {
        pattern: 'test/fixtures/**/*.html',
        included: false,
        served: true
      },
      'test/specs/basic/no-options.js'
    ],
    exclude: [],
    reporters: ['spec', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    failOnEmptyTestSuite: false,
    plugins: [
      'karma-jasmine',
      'karma-jasmine-jquery',
      'karma-phantomjs-launcher',
      'karma-spec-reporter',
      'karma-coverage'
    ],
    browsers: ['PhantomJS'],
    captureTimeout: 30000,
    browserNoActivityTimeout: 60000, // 60 sec
    singleRun: true,
    preprocessors: {
      'dist/mark.js': ['coverage']
    },
    coverageReporter: {
      dir: './build/coverage/',
      reporters: [{
        type: 'html'
      }, {
        type: 'text'
      }]
    }
  });
};
