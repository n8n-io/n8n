# Module Systems

## ES Modules (ESM)

```javascript
// Named exports
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}

export class Calculator {
  multiply(a, b) {
    return a * b;
  }
}

// Default export
export default class Database {
  async connect() {
    // implementation
  }
}

// Re-exports
export { add, multiply } from './math.js';
export * from './utils.js';
export * as helpers from './helpers.js';
```

## Import Patterns

```javascript
// Named imports
import { add, multiply } from './math.js';
import { add as addition } from './math.js';

// Default import
import Database from './database.js';

// Namespace import
import * as math from './math.js';
math.add(1, 2);

// Mixed imports
import Database, { connect, disconnect } from './database.js';

// Side-effect only import
import './polyfills.js';

// Type-only imports (for documentation)
/** @typedef {import('./types.js').User} User */
```

## Dynamic Imports

```javascript
// Basic dynamic import
const module = await import('./module.js');
module.default();

// Conditional loading
const loadFeature = async (feature) => {
  if (feature === 'advanced') {
    const { AdvancedFeature } = await import('./advanced.js');
    return new AdvancedFeature();
  }
  const { BasicFeature } = await import('./basic.js');
  return new BasicFeature();
};

// Code splitting by route
const router = {
  '/home': () => import('./pages/home.js'),
  '/about': () => import('./pages/about.js'),
  '/profile': () => import('./pages/profile.js')
};

const loadPage = async (route) => {
  const module = await router[route]();
  return module.default;
};

// Lazy loading with caching
const moduleCache = new Map();

const importWithCache = async (path) => {
  if (moduleCache.has(path)) {
    return moduleCache.get(path);
  }
  const module = await import(path);
  moduleCache.set(path, module);
  return module;
};
```

## Package.json Configuration

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    },
    "./package.json": "./package.json"
  },
  "imports": {
    "#utils": "./src/utils/index.js",
    "#constants": "./src/constants.js"
  }
}
```

## Conditional Exports

```javascript
// package.json with conditional exports
{
  "exports": {
    ".": {
      "node": "./dist/node.js",
      "browser": "./dist/browser.js",
      "default": "./dist/index.js"
    },
    "./feature": {
      "development": "./src/feature.dev.js",
      "production": "./dist/feature.prod.js"
    }
  }
}

// Usage in code
import api from 'my-package'; // Resolves based on environment
import feature from 'my-package/feature'; // Conditional based on NODE_ENV
```

## Import Maps (Browser)

```html
<!-- In HTML -->
<script type="importmap">
{
  "imports": {
    "lodash": "/node_modules/lodash-es/lodash.js",
    "react": "https://esm.sh/react@18",
    "utils/": "/src/utils/"
  }
}
</script>

<script type="module">
import _ from 'lodash';
import React from 'react';
import { helper } from 'utils/helper.js';
</script>
```

## CommonJS Compatibility

```javascript
// ESM consuming CommonJS
import cjsModule from './commonjs-module.cjs';
import { named } from './commonjs-module.cjs'; // May not work

// Use createRequire for CommonJS in ESM
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cjsModule = require('./commonjs-module.cjs');

// Access CommonJS metadata in ESM
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

## Module Resolution

```javascript
// Explicit file extensions required in ESM
import utils from './utils.js'; // Correct
import utils from './utils';    // Error in ESM

// Directory imports require index.js
import api from './api/index.js';

// Using import.meta
console.log(import.meta.url); // file:///path/to/module.js
console.log(import.meta.resolve('./other.js')); // Resolve relative path

// Detect if module is main
if (import.meta.url === `file://${process.argv[1]}`) {
  // This module was run directly
  main();
}
```

## Circular Dependencies

```javascript
// moduleA.js
import { b } from './moduleB.js';
export const a = 'A';
export function useB() {
  return b;
}

// moduleB.js
import { a } from './moduleA.js';
export const b = 'B';
export function useA() {
  return a; // Works because 'a' is hoisted
}

// Best practice: avoid circular deps, use dependency injection
// factory.js
export function createA(dependencies) {
  return {
    name: 'A',
    useB: () => dependencies.b
  };
}

export function createB(dependencies) {
  return {
    name: 'B',
    useA: () => dependencies.a
  };
}

// index.js
const a = createA({});
const b = createB({});
a.dependencies = { b };
b.dependencies = { a };
```

## Tree Shaking Optimization

```javascript
// Write side-effect-free code for tree shaking
// utils.js - Good: pure functions
export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b;
export const divide = (a, b) => a / b;

// Only used functions will be bundled
import { add } from './utils.js'; // Only 'add' bundled

// Bad: side effects prevent tree shaking
console.log('Module loaded'); // Side effect
export const add = (a, b) => a + b;

// Mark as side-effect-free in package.json
{
  "sideEffects": false,
  // OR specify files with side effects
  "sideEffects": ["*.css", "polyfills.js"]
}
```

## Module Patterns

```javascript
// Singleton pattern
// database.js
class Database {
  #connection = null;

  async connect() {
    if (!this.#connection) {
      this.#connection = await createConnection();
    }
    return this.#connection;
  }
}

export default new Database();

// Factory pattern
// loggerFactory.js
export function createLogger(level = 'info') {
  return {
    info: (msg) => level !== 'silent' && console.log(msg),
    error: (msg) => console.error(msg)
  };
}

// Facade pattern
// api.js
import { get, post, put, del } from './httpClient.js';
import { auth } from './auth.js';
import { cache } from './cache.js';

export const api = {
  async getUser(id) {
    const cached = cache.get(`user:${id}`);
    if (cached) return cached;

    const token = await auth.getToken();
    const user = await get(`/users/${id}`, { token });
    cache.set(`user:${id}`, user);
    return user;
  }
};
```

## Node.js ESM Specifics

```javascript
// package.json
{
  "type": "module" // All .js files are ESM
}

// Use .cjs for CommonJS files when type: "module"
// Use .mjs for ESM files when type: "commonjs" (default)

// Loading JSON in ESM
import data from './data.json' assert { type: 'json' };

// OR using fs
import { readFile } from 'fs/promises';
const data = JSON.parse(
  await readFile('./data.json', 'utf-8')
);

// Top-level await in Node.js ESM
const config = await fetch('/api/config').then(r => r.json());
export default config;
```

## Quick Reference

| Feature | ESM | CommonJS |
|---------|-----|----------|
| Syntax | `import`/`export` | `require()`/`module.exports` |
| Loading | Asynchronous | Synchronous |
| Tree shaking | Yes | No |
| Top-level await | Yes | No |
| Dynamic imports | `await import()` | `require()` |
| File extension | Required | Optional |
| `__dirname` | Use `import.meta.url` | Built-in |
| Browser support | Native | Needs bundler |
| Default mode | `"type": "module"` | No type field |
