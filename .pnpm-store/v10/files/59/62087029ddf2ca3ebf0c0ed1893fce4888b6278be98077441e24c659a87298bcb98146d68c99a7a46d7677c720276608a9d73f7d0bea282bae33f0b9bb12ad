{
  "name": "async",
  "description": "Higher-order functions and common patterns for asynchronous code",
  "version": "3.2.6",
  "main": "dist/async.js",
  "author": "Caolan McMahon",
  "homepage": "https://caolan.github.io/async/",
  "repository": {
    "type": "git",
    "url": "https://github.com/caolan/async.git"
  },
  "bugs": {
    "url": "https://github.com/caolan/async/issues"
  },
  "keywords": [
    "async",
    "callback",
    "module",
    "utility"
  ],
  "devDependencies": {
    "@babel/eslint-parser": "^7.16.5",
    "@babel/core": "7.25.2",
    "babel-minify": "^0.5.0",
    "babel-plugin-add-module-exports": "^1.0.4",
    "babel-plugin-istanbul": "^7.0.0",
    "babel-plugin-syntax-async-generators": "^6.13.0",
    "babel-plugin-transform-es2015-modules-commonjs": "^6.26.2",
    "babel-preset-es2015": "^6.3.13",
    "babel-preset-es2017": "^6.22.0",
    "babel-register": "^6.26.0",
    "babelify": "^10.0.0",
    "benchmark": "^2.1.1",
    "bluebird": "^3.4.6",
    "browserify": "^17.0.0",
    "chai": "^4.2.0",
    "cheerio": "^0.22.0",
    "es6-promise": "^4.2.8",
    "eslint": "^8.6.0",
    "eslint-plugin-prefer-arrow": "^1.2.3",
    "fs-extra": "^11.1.1",
    "jsdoc": "^4.0.3",
    "karma": "^6.3.12",
    "karma-browserify": "^8.1.0",
    "karma-firefox-launcher": "^2.1.2",
    "karma-mocha": "^2.0.1",
    "karma-mocha-reporter": "^2.2.0",
    "karma-safari-launcher": "^1.0.0",
    "mocha": "^6.1.4",
    "native-promise-only": "^0.8.0-a",
    "nyc": "^17.0.0",
    "rollup": "^4.2.0",
    "rollup-plugin-node-resolve": "^5.2.0",
    "rollup-plugin-npm": "^2.0.0",
    "rsvp": "^4.8.5",
    "semver": "^7.3.5",
    "yargs": "^17.3.1"
  },
  "scripts": {
    "coverage": "nyc npm run mocha-node-test -- --grep @nycinvalid --invert",
    "jsdoc": "jsdoc -c ./support/jsdoc/jsdoc.json && node support/jsdoc/jsdoc-fix-html.js",
    "lint": "eslint --fix .",
    "mocha-browser-test": "karma start",
    "mocha-node-test": "mocha",
    "mocha-test": "npm run mocha-node-test && npm run mocha-browser-test",
    "test": "npm run lint && npm run mocha-node-test"
  },
  "license": "MIT",
  "nyc": {
    "exclude": [
      "test"
    ]
  },
  "module": "dist/async.mjs"
}