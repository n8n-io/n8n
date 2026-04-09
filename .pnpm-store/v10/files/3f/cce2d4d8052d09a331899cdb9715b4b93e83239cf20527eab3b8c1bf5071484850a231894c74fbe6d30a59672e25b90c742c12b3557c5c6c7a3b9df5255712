{
  "name": "@azure/core-lro",
  "author": "Microsoft Corporation",
  "sdk-type": "client",
  "type": "module",
  "version": "2.7.2",
  "description": "Isomorphic client library for supporting long-running operations in node.js and browser.",
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
  "files": [
    "dist/",
    "LICENSE",
    "README.md"
  ],
  "main": "./dist/commonjs/index.js",
  "types": "./dist/commonjs/index.d.ts",
  "browser": "./dist/browser/index.js",
  "tags": [
    "isomorphic",
    "browser",
    "javascript",
    "node",
    "microsoft",
    "lro",
    "polling"
  ],
  "keywords": [
    "isomorphic",
    "browser",
    "javascript",
    "node",
    "microsoft",
    "lro",
    "polling",
    "azure",
    "cloud"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT",
  "homepage": "https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/core/core-lro/README.md",
  "repository": "github:Azure/azure-sdk-for-js",
  "bugs": {
    "url": "https://github.com/Azure/azure-sdk-for-js/issues"
  },
  "sideEffects": false,
  "scripts": {
    "build:samples": "echo Obsolete",
    "build:test": "npm run clean && tshy && dev-tool run build-test",
    "build": "npm run clean && tshy && api-extractor run --local",
    "check-format": "dev-tool run vendored prettier --list-different --config ../../../.prettierrc.json --ignore-path ../../../.prettierignore \"src/**/*.{ts,cts,mts}\" \"test/**/*.{ts,cts,mts}\" \"*.{js,cjs,mjs,json}\"",
    "clean": "rimraf --glob dist dist-* types *.log browser statistics.html coverage src/**/*.js test/**/*.js",
    "execute:samples": "echo skipped",
    "extract-api": "tshy && api-extractor run --local",
    "format": "dev-tool run vendored prettier --write --config ../../../.prettierrc.json --ignore-path ../../../.prettierignore \"src/**/*.{ts,cts,mts}\" \"test/**/*.{ts,cts,mts}\" \"*.{js,cjs,mjs,json}\"",
    "integration-test:browser": "echo skipped",
    "integration-test:node": "echo skipped",
    "integration-test": "npm run integration-test:node && npm run integration-test:browser",
    "lint:fix": "eslint package.json api-extractor.json src test --ext .ts --ext .cts --ext .mts --fix --fix-type [problem,suggestion]",
    "lint": "eslint package.json api-extractor.json src test  --ext .ts --ext .cts --ext .mts",
    "pack": "npm pack 2>&1",
    "test:browser": "npm run build:test && npm run unit-test:browser && npm run integration-test:browser",
    "test:node": "npm run build:test && npm run unit-test:node && npm run integration-test:node",
    "test": "npm run build:test && npm run unit-test",
    "unit-test:browser": "npm run build:test && dev-tool run test:vitest --no-test-proxy --browser",
    "unit-test:node": "dev-tool run test:vitest --no-test-proxy",
    "unit-test": "npm run unit-test:node && npm run unit-test:browser"
  },
  "dependencies": {
    "@azure/abort-controller": "^2.0.0",
    "@azure/core-util": "^1.2.0",
    "@azure/logger": "^1.0.0",
    "tslib": "^2.6.2"
  },
  "devDependencies": {
    "@azure/core-rest-pipeline": "^1.1.0",
    "@azure/eslint-plugin-azure-sdk": "^3.0.0",
    "@azure/dev-tool": "^1.0.0",
    "@microsoft/api-extractor": "^7.40.3",
    "@types/node": "^18.0.0",
    "@vitest/browser": "^1.3.1",
    "@vitest/coverage-istanbul": "^1.3.1",
    "eslint": "^8.56.0",
    "playwright": "^1.41.2",
    "prettier": "^3.2.5",
    "rimraf": "^5.0.5",
    "tshy": "^1.13.0",
    "typescript": "~5.3.3",
    "vitest": "^1.3.1"
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
    "selfLink": false
  }
}
