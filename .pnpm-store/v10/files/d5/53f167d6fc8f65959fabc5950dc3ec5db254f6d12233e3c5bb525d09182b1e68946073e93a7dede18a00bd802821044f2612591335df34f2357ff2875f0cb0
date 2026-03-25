{
  "name": "jackspeak",
  "publishConfig": {
    "tag": "v3-legacy"
  },
  "version": "3.4.3",
  "description": "A very strict and proper argument parser.",
  "tshy": {
    "main": true,
    "exports": {
      "./package.json": "./package.json",
      ".": "./src/index.js"
    }
  },
  "main": "./dist/commonjs/index.js",
  "types": "./dist/commonjs/index.d.ts",
  "type": "module",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/commonjs/index.d.ts",
        "default": "./dist/commonjs/index.js"
      }
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build-examples": "for i in examples/*.js ; do node $i -h > ${i/.js/.txt}; done",
    "preversion": "npm test",
    "postversion": "npm publish",
    "prepublishOnly": "git push origin --follow-tags",
    "prepare": "tshy",
    "pretest": "npm run prepare",
    "presnap": "npm run prepare",
    "test": "tap",
    "snap": "tap",
    "format": "prettier --write . --log-level warn",
    "typedoc": "typedoc --tsconfig .tshy/esm.json ./src/*.ts"
  },
  "license": "BlueOak-1.0.0",
  "prettier": {
    "experimentalTernaries": true,
    "semi": false,
    "printWidth": 75,
    "tabWidth": 2,
    "useTabs": false,
    "singleQuote": true,
    "jsxSingleQuote": false,
    "bracketSameLine": true,
    "arrowParens": "avoid",
    "endOfLine": "lf"
  },
  "devDependencies": {
    "@types/node": "^20.7.0",
    "@types/pkgjs__parseargs": "^0.10.1",
    "prettier": "^3.2.5",
    "tap": "^18.8.0",
    "tshy": "^1.14.0",
    "typedoc": "^0.25.1",
    "typescript": "^5.2.2"
  },
  "dependencies": {
    "@isaacs/cliui": "^8.0.2"
  },
  "funding": {
    "url": "https://github.com/sponsors/isaacs"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/isaacs/jackspeak.git"
  },
  "keywords": [
    "argument",
    "parser",
    "args",
    "option",
    "flag",
    "cli",
    "command",
    "line",
    "parse",
    "parsing"
  ],
  "author": "Isaac Z. Schlueter <i@izs.me>",
  "optionalDependencies": {
    "@pkgjs/parseargs": "^0.11.0"
  }
}
