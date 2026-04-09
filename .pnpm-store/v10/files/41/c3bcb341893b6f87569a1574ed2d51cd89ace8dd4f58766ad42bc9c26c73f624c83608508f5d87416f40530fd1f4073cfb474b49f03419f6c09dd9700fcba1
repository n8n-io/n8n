{
  "name": "gcp-metadata",
  "version": "6.1.1",
  "description": "Get the metadata from a Google Cloud Platform environment",
  "repository": "googleapis/gcp-metadata",
  "main": "./build/src/index.js",
  "types": "./build/src/index.d.ts",
  "files": [
    "build/src"
  ],
  "scripts": {
    "compile": "cross-env NODE_OPTIONS=--max-old-space-size=8192 tsc -p .",
    "fix": "gts fix",
    "pretest": "npm run compile",
    "prepare": "npm run compile",
    "samples-test": "npm link && cd samples/ && npm link ../ && npm test && cd ../",
    "presystem-test": "npm run compile",
    "system-test": "mocha build/system-test --timeout 600000",
    "test": "c8 mocha --timeout=5000 build/test",
    "docs": "jsdoc -c .jsdoc.js",
    "lint": "gts check",
    "docs-test": "linkinator docs",
    "predocs-test": "npm run docs",
    "prelint": "cd samples; npm link ../; npm install",
    "clean": "gts clean",
    "precompile": "gts clean"
  },
  "keywords": [
    "google cloud platform",
    "google cloud",
    "google",
    "app engine",
    "compute engine",
    "metadata server",
    "metadata"
  ],
  "author": "Google LLC",
  "license": "Apache-2.0",
  "dependencies": {
    "gaxios": "^6.1.1",
    "google-logging-utils": "^0.0.2",
    "json-bigint": "^1.0.0"
  },
  "devDependencies": {
    "@google-cloud/functions": "^3.0.0",
    "@types/json-bigint": "^1.0.0",
    "@types/mocha": "^9.0.0",
    "@types/ncp": "^2.0.1",
    "@types/node": "^20.0.0",
    "@types/sinon": "^17.0.0",
    "@types/tmp": "0.2.6",
    "@types/uuid": "^9.0.0",
    "c8": "^9.0.0",
    "cross-env": "^7.0.3",
    "gcbuild": "^1.3.4",
    "gcx": "^1.0.0",
    "gts": "^5.0.0",
    "linkinator": "^3.0.0",
    "jsdoc": "^4.0.0",
    "jsdoc-fresh": "^3.0.0",
    "jsdoc-region-tag": "^3.0.0",
    "mocha": "^8.0.0",
    "ncp": "^2.0.0",
    "nock": "^13.0.0",
    "sinon": "^17.0.0",
    "tmp": "^0.2.0",
    "typescript": "^5.1.6",
    "uuid": "^9.0.0"
  },
  "engines": {
    "node": ">=14"
  }
}
