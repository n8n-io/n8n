{
  "name": "async-mutex",
  "version": "0.5.0",
  "description": "A mutex for guarding async workflows",
  "scripts": {
    "lint": "eslint src/**/*.ts test/**/*.ts",
    "build": "tsc && tsc -p tsconfig.es6.json && tsc -p tsconfig.mjs.json && rollup -o index.mjs mjs/index.js",
    "prepublishOnly": "yarn test && yarn build",
    "test": "yarn lint && nyc --reporter=text --reporter=html --reporter=lcov mocha test/*.ts",
    "coveralls": "cat ./coverage/lcov.info | coveralls"
  },
  "author": "Christian Speckner <cnspeckn@googlemail.com> (https://github.com/DirtyHairy/)",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/DirtyHairy/async-mutex"
  },
  "prettier": {
    "printWidth": 120,
    "tabWidth": 4,
    "singleQuote": true,
    "parser": "typescript"
  },
  "importSort": {
    ".js, .jsx, .ts, .tsx": {
      "style": "eslint",
      "parser": "typescript"
    }
  },
  "eslintConfig": {
    "root": true,
    "parser": "@typescript-eslint/parser",
    "plugins": [
      "@typescript-eslint"
    ],
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
      "eqeqeq": "error",
      "@typescript-eslint/no-namespace": "off",
      "no-async-promise-executor": "off"
    }
  },
  "keywords": [
    "mutex",
    "async"
  ],
  "files": [
    "lib",
    "es6",
    "index.mjs"
  ],
  "devDependencies": {
    "@sinonjs/fake-timers": "^11.2.2",
    "@types/mocha": "^10.0.6",
    "@types/node": "^20.11.25",
    "@types/sinonjs__fake-timers": "^8.1.2",
    "@typescript-eslint/eslint-plugin": "^7.2.0",
    "@typescript-eslint/parser": "^7.2.0",
    "coveralls": "^3.1.1",
    "eslint": "^8.57.0",
    "import-sort-style-eslint": "^6.0.0",
    "mocha": "^10.3.0",
    "nyc": "^15.1.0",
    "prettier": "^3.2.5",
    "prettier-plugin-import-sort": "^0.0.7",
    "rollup": "^4.12.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.4.2"
  },
  "main": "lib/index.js",
  "module": "es6/index.js",
  "types": "lib/index.d.ts",
  "exports": {
    ".": {
      "import": "./index.mjs",
      "require": "./lib/index.js",
      "default": "./lib/index.js"
    },
    "./package.json": "./package.json"
  },
  "dependencies": {
    "tslib": "^2.4.0"
  }
}
