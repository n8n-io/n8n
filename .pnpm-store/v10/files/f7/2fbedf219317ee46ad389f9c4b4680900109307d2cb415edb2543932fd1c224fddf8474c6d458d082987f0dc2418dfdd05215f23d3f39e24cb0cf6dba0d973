{
  "name": "express",
  "description": "Fast, unopinionated, minimalist web framework",
  "version": "5.1.0",
  "author": "TJ Holowaychuk <tj@vision-media.ca>",
  "contributors": [
    "Aaron Heckmann <aaron.heckmann+github@gmail.com>",
    "Ciaran Jessup <ciaranj@gmail.com>",
    "Douglas Christopher Wilson <doug@somethingdoug.com>",
    "Guillermo Rauch <rauchg@gmail.com>",
    "Jonathan Ong <me@jongleberry.com>",
    "Roman Shtylman <shtylman+expressjs@gmail.com>",
    "Young Jae Sim <hanul@hanul.me>"
  ],
  "license": "MIT",
  "repository": "expressjs/express",
  "homepage": "https://expressjs.com/",
  "funding": {
    "type": "opencollective",
    "url": "https://opencollective.com/express"
  },
  "keywords": [
    "express",
    "framework",
    "sinatra",
    "web",
    "http",
    "rest",
    "restful",
    "router",
    "app",
    "api"
  ],
  "dependencies": {
    "accepts": "^2.0.0",
    "body-parser": "^2.2.0",
    "content-disposition": "^1.0.0",
    "content-type": "^1.0.5",
    "cookie": "^0.7.1",
    "cookie-signature": "^1.2.1",
    "debug": "^4.4.0",
    "encodeurl": "^2.0.0",
    "escape-html": "^1.0.3",
    "etag": "^1.8.1",
    "finalhandler": "^2.1.0",
    "fresh": "^2.0.0",
    "http-errors": "^2.0.0",
    "merge-descriptors": "^2.0.0",
    "mime-types": "^3.0.0",
    "on-finished": "^2.4.1",
    "once": "^1.4.0",
    "parseurl": "^1.3.3",
    "proxy-addr": "^2.0.7",
    "qs": "^6.14.0",
    "range-parser": "^1.2.1",
    "router": "^2.2.0",
    "send": "^1.1.0",
    "serve-static": "^2.2.0",
    "statuses": "^2.0.1",
    "type-is": "^2.0.1",
    "vary": "^1.1.2"
  },
  "devDependencies": {
    "after": "0.8.2",
    "connect-redis": "^8.0.1",
    "cookie-parser": "1.4.7",
    "cookie-session": "2.1.0",
    "ejs": "^3.1.10",
    "eslint": "8.47.0",
    "express-session": "^1.18.1",
    "hbs": "4.2.0",
    "marked": "^15.0.3",
    "method-override": "3.0.0",
    "mocha": "^10.7.3",
    "morgan": "1.10.0",
    "nyc": "^17.1.0",
    "pbkdf2-password": "1.2.1",
    "supertest": "^6.3.0",
    "vhost": "~3.0.2"
  },
  "engines": {
    "node": ">= 18"
  },
  "files": [
    "LICENSE",
    "History.md",
    "Readme.md",
    "index.js",
    "lib/"
  ],
  "scripts": {
    "lint": "eslint .",
    "test": "mocha --require test/support/env --reporter spec --check-leaks test/ test/acceptance/",
    "test-ci": "nyc --exclude examples --exclude test --exclude benchmarks --reporter=lcovonly --reporter=text npm test",
    "test-cov": "nyc --exclude examples --exclude test --exclude benchmarks --reporter=html --reporter=text npm test",
    "test-tap": "mocha --require test/support/env --reporter tap --check-leaks test/ test/acceptance/"
  }
}
