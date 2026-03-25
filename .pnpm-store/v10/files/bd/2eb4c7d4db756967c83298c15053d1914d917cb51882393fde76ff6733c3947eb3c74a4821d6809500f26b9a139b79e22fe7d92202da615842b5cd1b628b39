# istanbul-lib-report

[![Greenkeeper badge](https://badges.greenkeeper.io/istanbuljs/istanbul-lib-report.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/istanbuljs/istanbul-lib-report.svg?branch=master)](https://travis-ci.org/istanbuljs/istanbul-lib-report)

Core reporting utilities for istanbul.

## Example usage

```js
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

// coverageMap, for instance, obtained from istanbul-lib-coverage
const coverageMap;

const configWatermarks = {
  statements: [50, 80],
  functions: [50, 80],
  branches: [50, 80],
  lines: [50, 80]
};

// create a context for report generation
const context = libReport.createContext({
  dir: 'report/output/dir',
  // The summarizer to default to (may be overridden by some reports)
  // values can be nested/flat/pkg. Defaults to 'pkg'
  defaultSummarizer: 'nested',
  watermarks: configWatermarks,
  coverageMap,
})

// create an instance of the relevant report class, passing the
// report name e.g. json/html/html-spa/text
const report = reports.create('json', {
  skipEmpty: configSkipEmpty,
  skipFull: configSkipFull
})

// call execute to synchronously create and write the report to disk
report.execute(context)
```
