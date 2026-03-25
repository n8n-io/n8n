# collect-v8-coverage

Use this module to start and stop the V8 inspector manually and collect precise coverage.

```js
const {CoverageInstrumenter} = require('collect-v8-coverage');

const instrumenter = new CoverageInstrumenter();

await instrumenter.startInstrumenting();

// require some modules, run some code

const coverage = await instrumenter.stopInstrumenting();
```
