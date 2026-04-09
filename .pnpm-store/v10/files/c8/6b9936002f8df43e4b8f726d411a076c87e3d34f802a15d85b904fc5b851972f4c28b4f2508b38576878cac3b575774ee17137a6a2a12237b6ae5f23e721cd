{
  "name": "q",
  "version": "1.5.1",
  "description": "A library for promises (CommonJS/Promises/A,B,D)",
  "homepage": "https://github.com/kriskowal/q",
  "author": "Kris Kowal <kris@cixar.com> (https://github.com/kriskowal)",
  "keywords": [
    "q",
    "promise",
    "promises",
    "promises-a",
    "promises-aplus",
    "deferred",
    "future",
    "async",
    "flow control",
    "fluent",
    "browser",
    "node"
  ],
  "contributors": [
    "Kris Kowal <kris@cixar.com> (https://github.com/kriskowal)",
    "Irakli Gozalishvili <rfobic@gmail.com> (http://jeditoolkit.com)",
    "Domenic Denicola <domenic@domenicdenicola.com> (http://domenicdenicola.com)"
  ],
  "bugs": {
    "mail": "kris@cixar.com",
    "url": "http://github.com/kriskowal/q/issues"
  },
  "license": "MIT",
  "main": "q.js",
  "files": [
    "LICENSE",
    "q.js",
    "queue.js"
  ],
  "repository": {
    "type": "git",
    "url": "git://github.com/kriskowal/q.git"
  },
  "engines": {
    "node": ">=0.6.0",
    "teleport": ">=0.2.0"
  },
  "dependencies": {},
  "devDependencies": {
    "cover": "*",
    "grunt": "~0.4.1",
    "grunt-cli": "~0.1.9",
    "grunt-contrib-uglify": "~0.9.1",
    "jasmine-node": "1.11.0",
    "jshint": "~2.1.9",
    "matcha": "~0.2.0",
    "opener": "*",
    "promises-aplus-tests": "1.x"
  },
  "scripts": {
    "test": "npm ls -s && jasmine-node spec && promises-aplus-tests spec/aplus-adapter && npm run -s lint",
    "test-browser": "opener spec/q-spec.html",
    "benchmark": "matcha",
    "lint": "jshint q.js",
    "cover": "cover run jasmine-node spec && cover report html && opener cover_html/index.html",
    "minify": "grunt",
    "prepublish": "grunt"
  },
  "overlay": {
    "teleport": {
      "dependencies": {
        "system": ">=0.0.4"
      }
    }
  },
  "directories": {
    "test": "./spec"
  }
}
