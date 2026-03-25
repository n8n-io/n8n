{
  "name": "@azure/core-auth",
  "version": "1.10.1",
  "description": "Provides low-level interfaces and helper methods for authentication in Azure SDK",
  "sdk-type": "client",
  "type": "module",
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
  "main": "./dist/commonjs/index.js",
  "types": "./dist/commonjs/index.d.ts",
  "browser": "./dist/browser/index.js",
  "react-native": "./dist/react-native/index.js",
  "files": [
    "dist/",
    "!dist/**/*.d.*ts.map",
    "README.md",
    "LICENSE"
  ],
  "repository": "github:Azure/azure-sdk-for-js",
  "keywords": [
    "azure",
    "authentication",
    "cloud"
  ],
  "author": "Microsoft Corporation",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/Azure/azure-sdk-for-js/issues"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "homepage": "https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/core/core-auth/README.md",
  "sideEffects": false,
  "dependencies": {
    "@azure/abort-controller": "^2.1.2",
    "@azure/core-util": "^1.13.0",
    "tslib": "^2.6.2"
  },
  "devDependencies": {
    "@types/node": "^20.19.0",
    "@vitest/browser": "^3.2.3",
    "@vitest/coverage-istanbul": "^3.2.3",
    "eslint": "^9.33.0",
    "playwright": "^1.50.1",
    "typescript": "~5.8.3",
    "vitest": "^3.2.3",
    "@azure/dev-tool": "^1.0.0",
    "@azure/eslint-plugin-azure-sdk": "^3.0.0"
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
    "project": "../../../tsconfig.src.build.json"
  },
  "module": "./dist/esm/index.js",
  "scripts": {
    "build": "npm run clean && dev-tool run build-package && dev-tool run extract-api",
    "build:samples": "echo Skipped.",
    "check-format": "prettier --list-different --config ../../../.prettierrc.json --ignore-path ../../../.prettierignore \"src/**/*.{ts,cts,mts}\" \"test/**/*.{ts,cts,mts}\" \"*.{js,cjs,mjs,json}\"",
    "clean": "rimraf --glob dist dist-* temp types *.tgz *.log",
    "execute:samples": "echo skipped",
    "extract-api": "dev-tool run build-package && dev-tool run extract-api",
    "format": "prettier --write --config ../../../.prettierrc.json --ignore-path ../../../.prettierignore \"src/**/*.{ts,cts,mts}\" \"test/**/*.{ts,cts,mts}\" \"*.{js,cjs,mjs,json}\"",
    "lint": "eslint package.json src test",
    "lint:fix": "eslint package.json src test --fix --fix-type [problem,suggestion]",
    "pack": "pnpm pack 2>&1",
    "test": "npm run test:node && npm run test:browser",
    "test:browser": "npm run clean && dev-tool run build-package && dev-tool run build-test && dev-tool run test:vitest --no-test-proxy --browser",
    "test:node": "dev-tool run build-test --no-browser-test && dev-tool run test:vitest --no-test-proxy",
    "update-snippets": "dev-tool run update-snippets"
  }
}