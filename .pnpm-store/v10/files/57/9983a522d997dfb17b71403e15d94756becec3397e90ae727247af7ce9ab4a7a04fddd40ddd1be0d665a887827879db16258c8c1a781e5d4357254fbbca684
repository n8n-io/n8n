{
  "name": "@dabh/diagnostics",
  "version": "2.0.3",
  "description": "Tools for debugging your node.js modules and event loop",
  "main": "./node",
  "browser": "./browser",
  "scripts": {
    "test:basic": "mocha --require test/mock.js test/*.test.js",
    "test:node": "mocha --require test/mock test/node.js",
    "test:browser": "mocha --require test/mock test/browser.js",
    "test:runner": "npm run test:basic && npm run test:node && npm run test:browser",
    "webpack:node:prod": "webpack --mode=production node/index.js -o /dev/null --json | webpack-bundle-size-analyzer",
    "webpack:node:dev": "webpack --mode=development node/index.js -o /dev/null --json | webpack-bundle-size-analyzer",
    "webpack:browser:prod": "webpack --mode=production browser/index.js -o /dev/null --json | webpack-bundle-size-analyzer",
    "webpack:browser:dev": "webpack --mode=development browser/index.js -o /dev/null --json | webpack-bundle-size-analyzer",
    "test": "nyc --reporter=text --reporter=lcov npm run test:runner"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/3rd-Eden/diagnostics.git"
  },
  "keywords": [
    "debug",
    "debugger",
    "debugging",
    "diagnostic",
    "diagnostics",
    "event",
    "loop",
    "metrics",
    "stats"
  ],
  "author": "Arnout Kazemier",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/3rd-Eden/diagnostics/issues"
  },
  "homepage": "https://github.com/3rd-Eden/diagnostics",
  "devDependencies": {
    "assume": "2.3.x",
    "asyncstorageapi": "^1.0.2",
    "mocha": "9.2.x",
    "nyc": "^15.1.0",
    "objstorage": "^1.0.0",
    "pre-commit": "1.2.x",
    "require-poisoning": "^2.0.0",
    "webpack": "4.x",
    "webpack-bundle-size-analyzer": "^3.0.0",
    "webpack-cli": "3.x"
  },
  "dependencies": {
    "colorspace": "1.1.x",
    "enabled": "2.0.x",
    "kuler": "^2.0.0"
  },
  "contributors": [
    "Martijn Swaagman (https://github.com/swaagie)",
    "Jarrett Cruger (https://github.com/jcrugzz)",
    "Sevastos (https://github.com/sevastos)"
  ],
  "directories": {
    "test": "test"
  }
}
