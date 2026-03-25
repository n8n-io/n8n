{
  "packageManager": "yarn@2.4.3",
  "name": "svgo",
  "version": "3.3.2",
  "description": "Nodejs-based tool for optimizing SVG vector graphics files",
  "license": "MIT",
  "keywords": [
    "svgo",
    "svg",
    "optimize",
    "minify"
  ],
  "homepage": "https://svgo.dev",
  "bugs": {
    "url": "https://github.com/svg/svgo/issues"
  },
  "author": {
    "name": "Kir Belevich",
    "email": "kir@belevi.ch",
    "url": "https://github.com/deepsweet"
  },
  "contributors": [
    {
      "name": "Sergey Belov",
      "email": "peimei@ya.ru",
      "url": "https://github.com/arikon"
    },
    {
      "name": "Lev Solntsev",
      "email": "lev.sun@ya.ru",
      "url": "https://github.com/GreLI"
    },
    {
      "name": "Bogdan Chadkin",
      "email": "trysound@yandex.ru",
      "url": "https://github.com/TrySound"
    },
    {
      "name": "Seth Falco",
      "email": "seth@falco.fun",
      "url": "https://falco.fun/"
    }
  ],
  "repository": {
    "type": "git",
    "url": "git://github.com/svg/svgo.git"
  },
  "funding": {
    "type": "opencollective",
    "url": "https://opencollective.com/svgo"
  },
  "main": "./lib/svgo-node.js",
  "bin": "./bin/svgo",
  "types": "./lib/svgo.d.ts",
  "files": [
    "bin",
    "lib",
    "plugins",
    "dist",
    "!**/*.test.js"
  ],
  "engines": {
    "node": ">=14.0.0"
  },
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest --maxWorkers=4 --coverage",
    "lint": "eslint --ignore-path .gitignore . && prettier --check . --ignore-path .gitignore",
    "fix": "eslint --ignore-path .gitignore --fix . && prettier --write . --ignore-path .gitignore",
    "typecheck": "tsc",
    "test-browser": "rollup -c && node ./test/browser.js",
    "test-regression": "node ./test/regression-extract.js && NO_DIFF=1 node ./test/regression.js",
    "prepublishOnly": "rm -rf dist && rollup -c",
    "qa": "yarn lint && yarn typecheck && yarn test && yarn test-browser && yarn test-regression"
  },
  "jest": {
    "coveragePathIgnorePatterns": [
      "fixtures"
    ]
  },
  "dependencies": {
    "@trysound/sax": "0.2.0",
    "commander": "^7.2.0",
    "css-select": "^5.1.0",
    "css-tree": "^2.3.1",
    "css-what": "^6.1.0",
    "csso": "^5.0.5",
    "picocolors": "^1.0.0"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^22.0.2",
    "@rollup/plugin-node-resolve": "^14.1.0",
    "@types/css-tree": "^2.3.4",
    "@types/csso": "^5.0.4",
    "@types/jest": "^29.5.5",
    "del": "^6.0.0",
    "eslint": "^8.55.0",
    "jest": "^29.5.5",
    "node-fetch": "^2.7.0",
    "pixelmatch": "^5.3.0",
    "playwright": "^1.40.1",
    "pngjs": "^7.0.0",
    "prettier": "^3.1.1",
    "rollup": "^2.79.1",
    "rollup-plugin-terser": "^7.0.2",
    "tar-stream": "^3.1.6",
    "typescript": "^5.3.3"
  }
}