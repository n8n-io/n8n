{
  "name": "@azure/logger",
  "sdk-type": "client",
  "version": "1.3.0",
  "description": "Microsoft Azure SDK for JavaScript - Logger",
  "type": "module",
  "main": "./dist/commonjs/index.js",
  "types": "./dist/commonjs/index.d.ts",
  "browser": "./dist/browser/index.js",
  "react-native": "./dist/react-native/index.js",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "browser": {
        "types": "./dist/browser/index.d.ts",
        "default": "./dist/browser/index.js"
      },
      "react-native": {
        "types": "./dist/react-native/index.d.ts",
        "default": "./dist/react-native/index.js"
      },
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
  "engines": {
    "node": ">=20.0.0"
  },
  "files": [
    "dist/",
    "!dist/**/*.d.*ts.map",
    "README.md",
    "LICENSE"
  ],
  "repository": "github:Azure/azure-sdk-for-js",
  "keywords": [
    "azure",
    "log",
    "logger",
    "logging",
    "node.js",
    "typescript",
    "javascript",
    "browser",
    "cloud"
  ],
  "author": "Microsoft Corporation",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/Azure/azure-sdk-for-js/issues"
  },
  "homepage": "https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/core/logger/README.md",
  "sideEffects": false,
  "scripts": {
    "build": "npm run clean && dev-tool run build-package && dev-tool run extract-api",
    "build:samples": "echo Obsolete",
    "check-format": "dev-tool run vendored prettier --list-different --config ../../../.prettierrc.json --ignore-path ../../../.prettierignore \"src/**/*.{ts,cts,mts}\" \"test/**/*.{ts,cts,mts}\" \"*.{js,cjs,mjs,json}\"",
    "clean": "dev-tool run vendored rimraf --glob dist dist-* temp *.tgz *.log",
    "execute:samples": "echo skipped",
    "extract-api": "dev-tool run build-package && dev-tool run extract-api",
    "format": "dev-tool run vendored prettier --write --config ../../../.prettierrc.json --ignore-path ../../../.prettierignore \"src/**/*.{ts,cts,mts}\" \"test/**/*.{ts,cts,mts}\" \"*.{js,cjs,mjs,json}\"",
    "lint": "eslint package.json src test",
    "lint:fix": "eslint package.json src test --fix --fix-type [problem,suggestion]",
    "pack": "npm pack 2>&1",
    "test": "npm run test:node && npm run test:browser",
    "test:browser": "npm run clean && dev-tool run build-package && dev-tool run build-test && dev-tool run test:vitest --no-test-proxy --browser",
    "test:node": "dev-tool run test:vitest --no-test-proxy",
    "test:node:esm": "dev-tool run test:vitest --esm --no-test-proxy",
    "update-snippets": "dev-tool run update-snippets"
  },
  "dependencies": {
    "@typespec/ts-http-runtime": "^0.3.0",
    "tslib": "^2.6.2"
  },
  "devDependencies": {
    "@azure/dev-tool": "^1.0.0",
    "@azure/eslint-plugin-azure-sdk": "^3.0.0",
    "@types/node": "^20.0.0",
    "@vitest/browser": "^3.0.9",
    "@vitest/coverage-istanbul": "^3.0.9",
    "dotenv": "^16.3.1",
    "eslint": "^9.9.0",
    "playwright": "^1.41.2",
    "typescript": "~5.8.2",
    "vitest": "^3.0.9"
  },
  "//metadata": {
    "migrationDate": "2023-03-08T18:36:03.000Z"
  },
  "tshy": {
    "exports": {
      "./package.json": "./package.json",
      ".": "./src/index.ts"
    },
    "dialects": [
      "esm",
      "commonjs"
    ],
    "esmDialects": [
      "browser",
      "react-native"
    ],
    "selfLink": false,
    "project": "./tsconfig.src.json"
  },
  "module": "./dist/esm/index.js"
}
