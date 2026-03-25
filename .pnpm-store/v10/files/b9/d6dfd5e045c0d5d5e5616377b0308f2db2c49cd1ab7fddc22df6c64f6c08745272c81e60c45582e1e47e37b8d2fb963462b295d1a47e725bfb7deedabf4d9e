{
  "name": "denque",
  "version": "2.1.0",
  "description": "The fastest javascript implementation of a double-ended queue. Used by the official Redis, MongoDB, MariaDB & MySQL libraries for Node.js and many other libraries. Maintains compatability with deque.",
  "main": "index.js",
  "engines": {
    "node": ">=0.10"
  },
  "keywords": [
    "data-structure",
    "data-structures",
    "queue",
    "double",
    "end",
    "ended",
    "deque",
    "denque",
    "double-ended-queue"
  ],
  "scripts": {
    "test": "istanbul cover --report lcov _mocha && npm run typescript",
    "coveralls": "cat ./coverage/lcov.info | coveralls",
    "typescript": "tsc --project ./test/type/tsconfig.json",
    "benchmark_thousand": "node benchmark/thousand",
    "benchmark_2mil": "node benchmark/two_million",
    "benchmark_splice": "node benchmark/splice",
    "benchmark_remove": "node benchmark/remove",
    "benchmark_removeOne": "node benchmark/removeOne",
    "benchmark_growth": "node benchmark/growth",
    "benchmark_toArray": "node benchmark/toArray",
    "benchmark_fromArray": "node benchmark/fromArray"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/invertase/denque.git"
  },
  "license": "Apache-2.0",
  "author": {
    "name": "Invertase",
    "email": "oss@invertase.io",
    "url": "http://github.com/invertase/"
  },
  "contributors": [
    "Mike Diarmid (Salakar) <mike@invertase.io>"
  ],
  "bugs": {
    "url": "https://github.com/invertase/denque/issues"
  },
  "homepage": "https://docs.page/invertase/denque",
  "devDependencies": {
    "benchmark": "^2.1.4",
    "codecov": "^3.8.3",
    "double-ended-queue": "^2.1.0-0",
    "istanbul": "^0.4.5",
    "mocha": "^3.5.3",
    "typescript": "^3.4.1"
  }
}
