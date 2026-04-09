{
  "name": "logform",
  "version": "2.7.0",
  "description": "An mutable object-based log format designed for chaining & objectMode streams.",
  "main": "index.js",
  "browser": "dist/browser.js",
  "scripts": {
    "lint": "eslint *.js test/*.js examples/*.js --resolve-plugins-relative-to ./node_modules/@dabh/eslint-config-populist",
    "pretest": "npm run lint && npm run build",
    "test": "nyc mocha test/*.test.js",
    "build": "rimraf dist && babel *.js -d ./dist",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/winstonjs/logform.git"
  },
  "keywords": [
    "winston",
    "logging",
    "format",
    "winstonjs"
  ],
  "author": "Charlie Robbins <charlie.robbins@gmail.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/winstonjs/logform/issues"
  },
  "homepage": "https://github.com/winstonjs/logform#readme",
  "dependencies": {
    "@colors/colors": "1.6.0",
    "@types/triple-beam": "^1.3.2",
    "fecha": "^4.2.0",
    "ms": "^2.1.1",
    "safe-stable-stringify": "^2.3.1",
    "triple-beam": "^1.3.0"
  },
  "devDependencies": {
    "@babel/cli": "^7.10.3",
    "@babel/core": "^7.10.3",
    "@babel/preset-env": "^7.10.3",
    "@dabh/eslint-config-populist": "^5.0.0",
    "assume": "^2.2.0",
    "eslint": "^8.8.0",
    "mocha": "^10.0.0",
    "nyc": "^17.1.0",
    "rimraf": "^5.0.5"
  },
  "types": "./index.d.ts",
  "engines": {
    "node": ">= 12.0.0"
  }
}
