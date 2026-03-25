{
  "name": "@jridgewell/trace-mapping",
  "version": "0.3.9",
  "description": "Trace the original position through a source map",
  "keywords": [
    "source",
    "map"
  ],
  "main": "dist/trace-mapping.umd.js",
  "module": "dist/trace-mapping.mjs",
  "typings": "dist/types/trace-mapping.d.ts",
  "files": [
    "dist"
  ],
  "exports": {
    ".": {
      "browser": "./dist/trace-mapping.umd.js",
      "require": "./dist/trace-mapping.umd.js",
      "import": "./dist/trace-mapping.mjs"
    },
    "./package.json": "./package.json"
  },
  "author": "Justin Ridgewell <justin@ridgewell.name>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/jridgewell/trace-mapping.git"
  },
  "license": "MIT",
  "scripts": {
    "benchmark": "run-s build:rollup benchmark:*",
    "benchmark:install": "cd benchmark && npm install",
    "benchmark:only": "node benchmark/index.mjs",
    "build": "run-s -n build:*",
    "build:rollup": "rollup -c rollup.config.js",
    "build:ts": "tsc --project tsconfig.build.json",
    "lint": "run-s -n lint:*",
    "lint:prettier": "npm run test:lint:prettier -- --write",
    "lint:ts": "npm run test:lint:ts -- --fix",
    "prebuild": "rm -rf dist",
    "prepublishOnly": "npm run preversion",
    "preversion": "run-s test build",
    "test": "run-s -n test:lint test:only",
    "test:debug": "ava debug",
    "test:lint": "run-s -n test:lint:*",
    "test:lint:prettier": "prettier --check '{src,test}/**/*.ts' '**/*.md'",
    "test:lint:ts": "eslint '{src,test}/**/*.ts'",
    "test:only": "c8 ava",
    "test:watch": "ava --watch"
  },
  "devDependencies": {
    "@rollup/plugin-typescript": "8.3.0",
    "@typescript-eslint/eslint-plugin": "5.10.0",
    "@typescript-eslint/parser": "5.10.0",
    "ava": "4.0.1",
    "benchmark": "2.1.4",
    "c8": "7.11.0",
    "esbuild": "0.14.14",
    "esbuild-node-loader": "0.6.4",
    "eslint": "8.7.0",
    "eslint-config-prettier": "8.3.0",
    "npm-run-all": "4.1.5",
    "prettier": "2.5.1",
    "rollup": "2.64.0",
    "typescript": "4.5.4"
  },
  "dependencies": {
    "@jridgewell/resolve-uri": "^3.0.3",
    "@jridgewell/sourcemap-codec": "^1.4.10"
  }
}
