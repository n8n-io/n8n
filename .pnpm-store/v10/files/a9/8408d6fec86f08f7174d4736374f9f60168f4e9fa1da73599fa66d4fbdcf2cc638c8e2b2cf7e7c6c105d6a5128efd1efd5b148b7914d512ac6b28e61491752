{
  "name": "commander",
  "version": "11.1.0",
  "description": "the complete solution for node.js command-line programs",
  "keywords": [
    "commander",
    "command",
    "option",
    "parser",
    "cli",
    "argument",
    "args",
    "argv"
  ],
  "author": "TJ Holowaychuk <tj@vision-media.ca>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tj/commander.js.git"
  },
  "scripts": {
    "lint": "npm run lint:javascript && npm run lint:typescript",
    "lint:javascript": "eslint index.js esm.mjs \"lib/*.js\" \"tests/**/*.js\"",
    "lint:typescript": "eslint typings/*.ts tests/*.ts",
    "test": "jest && npm run typecheck-ts",
    "test-esm": "node ./tests/esm-imports-test.mjs",
    "typecheck-ts": "tsd && tsc -p tsconfig.ts.json",
    "typecheck-js": "tsc -p tsconfig.js.json",
    "test-all": "npm run test && npm run lint && npm run typecheck-js && npm run test-esm"
  },
  "files": [
    "index.js",
    "lib/*.js",
    "esm.mjs",
    "typings/index.d.ts",
    "typings/esm.d.mts",
    "package-support.json"
  ],
  "type": "commonjs",
  "main": "./index.js",
  "exports": {
    ".": {
      "require": {
        "types": "./typings/index.d.ts",
        "default": "./index.js"
      },
      "import": {
        "types": "./typings/esm.d.mts",
        "default": "./esm.mjs"
      },
      "default": "./index.js"
    },
    "./esm.mjs": {
      "types": "./typings/esm.d.mts",
      "import": "./esm.mjs"
    }
  },
  "devDependencies": {
    "@types/jest": "^29.2.4",
    "@types/node": "^20.2.5",
    "@typescript-eslint/eslint-plugin": "^5.47.1",
    "@typescript-eslint/parser": "^5.47.1",
    "eslint": "^8.30.0",
    "eslint-config-standard": "^17.0.0",
    "eslint-config-standard-with-typescript": "^33.0.0",
    "eslint-plugin-import": "^2.26.0",
    "eslint-plugin-jest": "^27.1.7",
    "eslint-plugin-n": "^15.6.0",
    "eslint-plugin-promise": "^6.1.1",
    "jest": "^29.3.1",
    "ts-jest": "^29.0.3",
    "tsd": "^0.28.1",
    "typescript": "^5.0.4"
  },
  "types": "typings/index.d.ts",
  "engines": {
    "node": ">=16"
  },
  "support": true
}
