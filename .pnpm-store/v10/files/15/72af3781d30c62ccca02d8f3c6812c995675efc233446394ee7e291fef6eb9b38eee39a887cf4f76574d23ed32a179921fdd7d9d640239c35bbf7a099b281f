{
  "name": "@tootallnate/once",
  "version": "2.0.0",
  "description": "Creates a Promise that waits for a single event",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/TooTallNate/once.git"
  },
  "keywords": [],
  "author": "Nathan Rajlich <nathan@tootallnate.net> (http://n8.io/)",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/TooTallNate/once/issues"
  },
  "devDependencies": {
    "@types/jest": "^27.0.2",
    "@types/node": "^12.12.11",
    "abort-controller": "^3.0.0",
    "jest": "^27.2.1",
    "rimraf": "^3.0.0",
    "ts-jest": "^27.0.5",
    "typescript": "^4.4.3"
  },
  "engines": {
    "node": ">= 10"
  },
  "jest": {
    "preset": "ts-jest",
    "globals": {
      "ts-jest": {
        "diagnostics": false,
        "isolatedModules": true
      }
    },
    "verbose": false,
    "testEnvironment": "node",
    "testMatch": [
      "<rootDir>/test/**/*.test.ts"
    ]
  }
}
