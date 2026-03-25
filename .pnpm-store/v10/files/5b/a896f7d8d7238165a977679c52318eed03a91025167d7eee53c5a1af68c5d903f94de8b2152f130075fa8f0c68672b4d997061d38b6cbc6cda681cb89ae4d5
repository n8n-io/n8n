'use strict';
module.exports = config => {
  // Define Sauce Labs browsers
  var customLaunchers = {
    'SL_Win_Chrome_30': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 10',
      version: '30'
    },
    'SL_Win_Chrome_40': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 10',
      version: '40'
    },
    'SL_Win_Chrome_50': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 10',
      version: '50'
    },
    'SL_Win_Chrome_60': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 10',
      version: '60'
    },
    'SL_Win_Chrome_Latest': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 10',
      version: 'latest'
    },
    'SL_Win_Firefox_30': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'Windows 10',
      version: '30'
    },
    'SL_Win_Firefox_40': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'Windows 10',
      version: '40'
    },
    'SL_Win_Firefox_50': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'Windows 10',
      version: '50'
    },
    'SL_Win_Firefox_Latest': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'Windows 10',
      version: 'latest'
    },
    'SL_OS_X_Safari_8': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.10',
      version: '8.0'
    },
    'SL_OS_X_Safari_9': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.11',
      version: '9.0'
    },
    'SL_OS_X_Safari_10': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.11',
      version: '10.0'
    },
    'SL_macOS_Safari_11': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'macOS 10.13',
      version: '11.0'
    },
    'SL_Win_IE_9': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '9'
    },
    'SL_Win_IE_10': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '10'
    },
    'SL_Win_IE_11': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '11'
    },
    'SL_Win_Edge_13': {
      base: 'SauceLabs',
      browserName: 'microsoftedge',
      platform: 'Windows 10',
      version: '13.10586'
    },
    'SL_Win_Edge_Latest': {
      base: 'SauceLabs',
      browserName: 'microsoftedge',
      platform: 'Windows 10',
      version: 'latest'
    },
    'SL_iOS_8': {
      base: 'SauceLabs',
      browserName: 'iphone',
      version: '8.4'
    },
    'SL_iOS_9': {
      base: 'SauceLabs',
      browserName: 'iphone',
      version: '9.3'
    },
    'SL_iOS_10': {
      base: 'SauceLabs',
      browserName: 'iphone',
      version: '10.0'
    },
    'SL_iOS_11': {
      base: 'SauceLabs',
      browserName: 'iphone',
      version: '11.1'
    },
    'SL_Android_4': {
      base: 'SauceLabs',
      browserName: 'android',
      version: '4.4'
    },
    'SL_Android_5': {
      base: 'SauceLabs',
      browserName: 'android',
      version: '5.1'
    },
    'SL_Android_6': {
      base: 'SauceLabs',
      browserName: 'android',
      version: '6.0'
    },
  };
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
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    failOnEmptyTestSuite: false,
    plugins: [
      'karma-jasmine',
      'karma-jasmine-jquery',
      'karma-sauce-launcher',
      'karma-summary-reporter',
      'karma-coverage'
    ],
    sauceLabs: {
      testName: 'mark.js unit tests',
      recordVideo: true,
      recordScreenshots: true,
      connectOptions: {
        noSslBumpDomains: 'all'
      }
    },
    customLaunchers: customLaunchers,
    browsers: Object.keys(customLaunchers),
    reporters: ['summary', 'saucelabs', 'coverage'],
    // in case Sauce Labs or the browser is slow
    captureTimeout: 300000, // 5 min
    browserDisconnectTimeout: 180000, // 3 min
    browserNoActivityTimeout: 180000, // 3 min
    browserDisconnectTolerance: 15,
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
