{
  "name": "tr46",
  "version": "5.0.0",
  "engines": {
    "node": ">=18"
  },
  "description": "An implementation of the Unicode UTS #46: Unicode IDNA Compatibility Processing",
  "main": "index.js",
  "files": [
    "index.js",
    "lib/"
  ],
  "scripts": {
    "test": "node --test",
    "lint": "eslint .",
    "pretest": "node scripts/getLatestTests.js",
    "prepublish": "node scripts/generateMappingTable.js && node scripts/generateRegexes.js"
  },
  "repository": "https://github.com/jsdom/tr46",
  "keywords": [
    "unicode",
    "tr46",
    "uts46",
    "punycode",
    "url",
    "whatwg"
  ],
  "author": "Sebastian Mayr <npm@smayr.name>",
  "contributors": [
    "Timothy Gu <timothygu99@gmail.com>"
  ],
  "license": "MIT",
  "dependencies": {
    "punycode": "^2.3.1"
  },
  "devDependencies": {
    "@domenic/eslint-config": "^3.0.0",
    "@unicode/unicode-15.1.0": "^1.5.2",
    "eslint": "^8.53.0",
    "regenerate": "^1.4.2"
  },
  "unicodeVersion": "15.1.0"
}
