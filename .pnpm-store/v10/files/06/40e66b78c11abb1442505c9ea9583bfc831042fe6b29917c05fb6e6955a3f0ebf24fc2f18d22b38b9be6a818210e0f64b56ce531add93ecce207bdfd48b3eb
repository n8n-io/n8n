{
  "$schema": "https://json.schemastore.org/package.json",
  "name": "@azure/msal-node",
  "version": "3.8.4",
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
  "description": "Microsoft Authentication Library for Node",
  "keywords": [
    "js",
    "ts",
    "node",
    "AAD",
    "msal",
    "oauth"
  ],
  "type": "module",
  "main": "lib/msal-node.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./lib/types/index.d.ts",
        "default": "./lib/msal-node.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "lib",
    "src"
  ],
  "scripts": {
    "build": "npm run clean && rollup -c --strictDeprecations --bundleConfigAsCjs",
    "build:watch": "rollup -c --watch --strictDeprecations --bundleConfigAsCjs",
    "clean": "shx rm -rf dist lib",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "npm run lint -- --fix",
    "build:all": "cd ../.. && npm run build --workspace=@azure/msal-common --workspace=@azure/msal-node",
    "prepack": "npm run build:all",
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
    "@microsoft/api-extractor": "^7.43.4",
    "@rollup/plugin-node-resolve": "^15.0.1",
    "@rollup/plugin-typescript": "^11.0.0",
    "@types/jest": "^29.5.0",
    "@types/jsonwebtoken": "^9.0.1",
    "@types/node": "^20.3.1",
    "@types/uuid": "^7.0.0",
    "eslint-config-msal": "file:../../shared-configs/eslint-config-msal",
    "jest": "^29.5.0",
    "jest-junit": "^16.0.0",
    "prettier": "2.8.7",
    "rollup": "^4.22.4",
    "rollup-msal": "file:../../shared-configs/rollup-msal",
    "ts-jest": "^29.1.0",
    "tslib": "^1.10.0",
    "typescript": "^4.9.5",
    "yargs": "^17.3.1"
  },
  "dependencies": {
    "@azure/msal-common": "15.13.3",
    "jsonwebtoken": "^9.0.0",
    "uuid": "^8.3.0"
  },
  "engines": {
    "node": ">=16"
  }
}
