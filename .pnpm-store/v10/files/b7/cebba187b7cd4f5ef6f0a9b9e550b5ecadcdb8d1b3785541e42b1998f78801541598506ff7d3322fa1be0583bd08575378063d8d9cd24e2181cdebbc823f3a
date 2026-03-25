{
  "name": "long",
  "version": "5.3.2",
  "author": "Daniel Wirtz <dcode@dcode.io>",
  "description": "A Long class for representing a 64-bit two's-complement integer value.",
  "repository": {
    "type": "git",
    "url": "https://github.com/dcodeIO/long.js.git"
  },
  "bugs": {
    "url": "https://github.com/dcodeIO/long.js/issues"
  },
  "keywords": [
    "math",
    "long",
    "int64"
  ],
  "license": "Apache-2.0",
  "type": "module",
  "main": "umd/index.js",
  "types": "umd/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./index.d.ts",
        "default": "./index.js"
      },
      "require": {
        "types": "./umd/index.d.ts",
        "default": "./umd/index.js"
      }
    }
  },
  "scripts": {
    "build": "node scripts/build.js",
    "lint": "prettier --check .",
    "format": "prettier --write .",
    "test": "npm run test:unit && npm run test:typescript",
    "test:unit": "node tests",
    "test:typescript": "tsc --project tests/typescript/tsconfig.esnext.json && tsc --project tests/typescript/tsconfig.nodenext.json && tsc --project tests/typescript/tsconfig.commonjs.json && tsc --project tests/typescript/tsconfig.global.json"
  },
  "files": [
    "index.js",
    "index.d.ts",
    "types.d.ts",
    "umd/index.js",
    "umd/index.d.ts",
    "umd/types.d.ts",
    "umd/package.json",
    "LICENSE",
    "README.md"
  ],
  "devDependencies": {
    "esm2umd": "^0.3.1",
    "prettier": "^3.5.0",
    "typescript": "^5.7.3"
  }
}
