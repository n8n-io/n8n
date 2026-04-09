{
  "name": "cors",
  "description": "Node.js CORS middleware",
  "version": "2.8.6",
  "author": "Troy Goode <troygoode@gmail.com> (https://github.com/troygoode/)",
  "license": "MIT",
  "keywords": [
    "cors",
    "express",
    "connect",
    "middleware"
  ],
  "repository": "expressjs/cors",
  "funding": {
    "type": "opencollective",
    "url": "https://opencollective.com/express"
  },
  "main": "./lib/index.js",
  "dependencies": {
    "object-assign": "^4",
    "vary": "^1"
  },
  "devDependencies": {
    "after": "0.8.2",
    "eslint": "7.30.0",
    "express": "4.21.2",
    "mocha": "9.2.2",
    "nyc": "15.1.0",
    "supertest": "6.1.3"
  },
  "files": [
    "lib/index.js"
  ],
  "engines": {
    "node": ">= 0.10"
  },
  "scripts": {
    "test": "npm run lint && npm run test-ci",
    "test-ci": "nyc --reporter=lcov --reporter=text mocha --require test/support/env",
    "lint": "eslint lib test"
  }
}
