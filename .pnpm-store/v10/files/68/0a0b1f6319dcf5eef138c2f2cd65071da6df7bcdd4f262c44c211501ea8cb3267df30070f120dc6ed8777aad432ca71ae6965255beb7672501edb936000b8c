{
  "name": "@azure/msal-common",
  "author": {
    "name": "Microsoft",
    "email": "nugetaad@microsoft.com",
    "url": "https://www.microsoft.com"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/AzureAD/microsoft-authentication-library-for-js.git"
  },
  "version": "15.13.3",
  "description": "Microsoft Authentication Library for js",
  "keywords": [
    "implicit",
    "authorization code",
    "PKCE",
    "js",
    "AAD",
    "msal",
    "oauth"
  ],
  "sideEffects": false,
  "type": "module",
  "main": "./lib/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    "./browser": {
      "import": {
        "types": "./dist/index-browser.d.ts",
        "default": "./dist/index-browser.mjs"
      },
      "require": {
        "types": "./lib/types/index-browser.d.ts",
        "default": "./lib/index-browser.cjs"
      }
    },
    "./node": {
      "import": {
        "types": "./dist/index-node.d.ts",
        "default": "./dist/index-node.mjs"
      },
      "require": {
        "types": "./lib/types/index-node.d.ts",
        "default": "./lib/index-node.cjs"
      }
    },
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./lib/types/index.d.ts",
        "default": "./lib/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "engines": {
    "node": ">=0.8.0"
  },
  "directories": {
    "test": "test"
  },
  "files": [
    "dist",
    "lib",
    "src",
    "node",
    "browser"
  ],
  "scripts": {
    "clean": "shx rm -rf dist lib",
    "clean:coverage": "rimraf ../../.nyc_output/*",
    "lint": "eslint src --ext .ts",
    "lint:fix": "npm run lint -- --fix",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:coverage:only": "npm run clean:coverage && npm run test:coverage",
    "build:modules": "rollup -c --strictDeprecations --bundleConfigAsCjs",
    "build:modules:watch": "rollup -cw --bundleConfigAsCjs",
    "build": "npm run clean && npm run build:modules",
    "build:all": "npm run build",
    "prepack": "npm run build",
    "metadata:check": "ts-node scripts/metadata.ts",
    "format:check": "prettier --ignore-path .gitignore --check src test",
    "format:fix": "prettier --ignore-path .gitignore --write src test",
    "apiExtractor": "api-extractor run"
  },
  "beachball": {
    "disallowedChangeTypes": [
      "major"
    ]
  },
  "devDependencies": {
    "@babel/core": "^7.7.2",
    "@babel/plugin-proposal-class-properties": "^7.7.0",
    "@babel/plugin-proposal-object-rest-spread": "^7.6.2",
    "@babel/preset-env": "^7.7.1",
    "@babel/preset-typescript": "^7.7.2",
    "@microsoft/api-extractor": "^7.43.4",
    "@rollup/plugin-typescript": "^11.0.0",
    "@types/debug": "^4.1.5",
    "@types/jest": "^29.5.0",
    "@types/lodash": "^4.14.182",
    "@types/node": "^20.3.1",
    "eslint-config-msal": "file:../../shared-configs/eslint-config-msal",
    "jest": "^29.5.0",
    "jest-junit": "^16.0.0",
    "lodash": "^4.17.21",
    "msal-test-utils": "file:../../shared-test-utils",
    "prettier": "2.8.7",
    "rimraf": "^3.0.2",
    "rollup": "^4.22.4",
    "rollup-msal": "file:../../shared-configs/rollup-msal",
    "shx": "^0.3.2",
    "ts-jest": "^29.1.0",
    "ts-jest-resolver": "^2.0.1",
    "ts-node": "^10.9.1",
    "tslib": "^1.10.0",
    "typescript": "^4.9.5",
    "yargs": "^17.5.1"
  }
}
