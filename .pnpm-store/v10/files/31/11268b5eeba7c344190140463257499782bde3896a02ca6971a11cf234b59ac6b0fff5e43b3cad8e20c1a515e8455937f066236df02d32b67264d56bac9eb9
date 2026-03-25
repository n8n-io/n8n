{
  "name": "camelcase-css",
  "description": "Convert a kebab-cased CSS property into a camelCased DOM property.",
  "version": "2.0.1",
  "license": "MIT",
  "author": "Steven Vachon <contact@svachon.com> (https://www.svachon.com/)",
  "repository": "stevenvachon/camelcase-css",
  "browser": "index-es5.js",
  "devDependencies": {
    "babel-cli": "^6.26.0",
    "babel-core": "^6.26.3",
    "babel-plugin-optimize-starts-with": "^1.0.1",
    "babel-preset-env": "^1.7.0",
    "chai": "^4.1.2",
    "mocha": "^5.2.0"
  },
  "engines": {
    "node": ">= 6"
  },
  "scripts": {
    "pretest": "babel index.js --out-file=index-es5.js --presets=env --plugins=optimize-starts-with",
    "test": "mocha test.js --check-leaks --bail"
  },
  "files": [
    "index.js",
    "index-es5.js"
  ],
  "keywords": [
    "camelcase",
    "case",
    "css",
    "dom"
  ]
}
