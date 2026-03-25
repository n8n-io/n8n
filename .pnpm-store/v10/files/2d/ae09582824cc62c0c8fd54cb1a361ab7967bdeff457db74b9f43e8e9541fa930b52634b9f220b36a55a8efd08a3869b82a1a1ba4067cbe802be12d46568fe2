# CHANGELOG

### 4.5.0 (2022/02/05)

- [#81] Memory leak fix: do not wait for `process.nextTick` to clear callbacks
- [#87, #82, #67] Update dependencies, CI config, and linter config

### 4.4.1 (2021/12/14)

- [#44] Add handleRejections to types.
- [#60] Exclude unnecessary files from npm package
- [#45] [#58] Update dependencies.

### 4.4.0 (2018/12/23)

- [#41] Support handleRejections option.
- [#42] Expose LegacyTransportStream from the base module.
- Update dependencies.

### 4.3.0 (2018/12/23)

- [#30] Precompile before publishing to `npm`.
- [#32] Add new option to increase default `highWaterMark` value.

### 4.2.0 (2018/06/11)

- [#26] Do not use copy-by-value for `this.level`.
- [#25] Wrap calls to `format.transform` with try / catch.
- [#24] Use `readable-stream` package to get the _final semantics across all versions of Node.

### 4.1.0 (2018/05/31)

- [#23] Revert to prototypal-based syntax for backwards compatibility.

### 4.0.0 (2018/05/24)

- **BREAKING** Update transports to use ES6 classes. Creation of
`TransportStream` and `LegacyTransportStream` now requires the `new` keyword.

**No longer works**
``` js
const Transport = require('winston-transport');
const transport = Transport({
  log: (info, callback) => { /* log something */ }
});
```

**Do this instead**
``` js
const Transport = require('winston-transport');
const transport = new Transport({
  log: (info, callback) => { /* log something */ }
});
```

### 3.3.0 (2018/05/24)
**Unpublished:** overlooked that 26f816e introduced a breaking change.

- [#21] Do not log when there is no info object.
- [#20] Add silent options to typings.
- [#19] Refactor test fixtures to use es6-classes.
- [#18] Use triple-beam for info object constants.
- [#17] Add linting and Node v10 to the travis build of the project.

### 3.2.1 (2018/04/25)

- [#16] Reorder in TS defs: namespace must come after class in order for delcaration merging to work as expected.

### 3.2.0 (2018/04/22)

- [#13] Add silent support to LegacyTransportStream. Fixes [#8].
- [#14] Ensure that if a Transport-specific format is provided it is invoked on each chunk before passing it to `.log`. Fixes [#12]. 
- [#11] Revice `d.ts`
- Add `.travis.yml`.
- Documentation updates:
  - [#5] Update deprecated link.
  - [#7] Correct `this` reference in `README.md` by using an arrow function.

### 3.1.0 (2018/04/06)

- [#10] Add `silent` option to `TransportStream`. Still needs to be implemented
  for `LegacyTransportStream`.
- Bump `mocha` to `^5.0.5`.
- Bump `nyc` to `^11.6.0`.

### 3.0.1 (2017/10/01)

- [#4] Use ES6-class for defining Transport in `README.md`.
- [#4] Do not overwrite prototypal methods unless they are provided in the options.

### 3.0.0 (2017/09/29)

- Use `Symbol.for('level')` to lookup immutable `level` on `info` objects.

### 2.1.1 (2017/09/29)

- Properly interact with the `{ format }`, if provided.

### 2.1.0 (2017/09/27)

- If a format is defined use it to mutate the info.

### 2.0.0 (2017/04/11)

- [#2] Final semantics for `winston-transport` base implementations:
  - `TransportStream`: the new `objectMode` Writable stream which should be the base for all future Transports after `winston >= 3`.
  - `LegacyTransportStream`: the backwards compatible wrap to Transports written for `winston < 3`. There isn't all that much different for those implementors except that `log(level, message, meta, callback)` is now `log(info, callback)` where `info` is the object being plumbed along the objectMode pipe-chain. This was absolutely critical to not "break the ecosystem" and give [the over 500 Transport package authors](https://www.npmjs.com/search?q=winston) an upgrade path.
  - Along with all the code coverage & `WritableStream` goodies:
    - 100% code coverage for `TransportStream`
    - 100% code coverage for `LegacyTransportStream`
    - Implementation of `_writev` for  `TransportStream`
    - Implementation of `_writev` for  `LegacyTransportStream`

### 1.0.2 (2015/11/30)

- Pass the write stream callback so that we can communicate backpressure up the chain of streams.

### 1.0.1 (2015/11/22)

- First `require`-able version.

### 1.0.0 (2015/11/22)

- Initial version.

[#2]: https://github.com/winstonjs/winston-transport/pull/2
