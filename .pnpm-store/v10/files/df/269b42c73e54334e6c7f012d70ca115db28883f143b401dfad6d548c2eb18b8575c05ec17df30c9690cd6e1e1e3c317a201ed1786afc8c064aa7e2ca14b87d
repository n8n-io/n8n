## [7.8.2](https://github.com/reactivex/rxjs/compare/7.8.1...7.8.2) (2025-02-22)

### Bug Fixes

- **animationFrameScheduler:** some tasks are never flushed and sometimes it breaks completely ([#7444](https://github.com/reactivex/rxjs/issues/7444)) ([8bbfa4e](https://github.com/reactivex/rxjs/commit/8bbfa4efd15f6572316d5b2b05b2f49ded69a3ca))
- **mergeWith:** works correctly with an Array ([#7281](https://github.com/reactivex/rxjs/issues/7281)) ([27855c6](https://github.com/reactivex/rxjs/commit/27855c635ca74107352ae3336944433a328c0b41))
- **subscriber:** strict type signature for next method ([#7172](https://github.com/reactivex/rxjs/issues/7172)) ([0e2ef5e](https://github.com/reactivex/rxjs/commit/0e2ef5e1142699b028bc3624aae9b24c3e3aaccf))

## [7.8.1](https://github.com/reactivex/rxjs/compare/7.8.0...7.8.1) (2023-04-26)

### Bug Fixes

- **asapScheduler:** No longer stops after scheduling twice during flush ([#7198](https://github.com/reactivex/rxjs/issues/7198)) ([1b52405](https://github.com/reactivex/rxjs/commit/1b524057b4db157814bfd04ad7d10c999afdccfa)), closes [ReactiveX#7196](https://github.com/ReactiveX/issues/7196)
- **throttle:** properly handle default ThrottleConfig values ([#7176](https://github.com/reactivex/rxjs/issues/7176)) ([ceb821c](https://github.com/reactivex/rxjs/commit/ceb821cfd81ca29b0d764b86a03f1e9f1eaa0999))

# [7.8.0](https://github.com/reactivex/rxjs/compare/7.7.0...7.8.0) (2022-12-15)

### Features

- **buffer:** `closingNotifier` now supports any `ObservableInput` ([#7073](https://github.com/reactivex/rxjs/issues/7073)) ([61b877a](https://github.com/reactivex/rxjs/commit/61b877a50c2557196a45e12622305c5a84fc3f0a))
- **delayWhen:** `delayWhen`'s `delayDurationSelector` now supports any `ObservableInput` ([#7049](https://github.com/reactivex/rxjs/issues/7049)) ([dfd95db](https://github.com/reactivex/rxjs/commit/dfd95db952a6772d35d11bdd1974f2c4b4d68b25))
- **sequenceEqual:** `compareTo` now supports any `ObservableInput` ([#7102](https://github.com/reactivex/rxjs/issues/7102)) ([d501961](https://github.com/reactivex/rxjs/commit/d50196187710c7a0cad50703b2071fc3f2cabd3c))
- **share:** `ShareConfig` factory properties now supports any `ObservableInput` ([#7093](https://github.com/reactivex/rxjs/issues/7093)) ([cc3995a](https://github.com/reactivex/rxjs/commit/cc3995a6f6baf9456ec11f749fe89bf61b9e2d62))
- **skipUntil:** `notifier` now supports any `ObservableInput` ([#7091](https://github.com/reactivex/rxjs/issues/7091)) ([60d6c40](https://github.com/reactivex/rxjs/commit/60d6c40fb484903286feca2bbfa9fcb2cde720e2))
- **window:** `windowBoundaries` now supports any `ObservableInput` ([#7088](https://github.com/reactivex/rxjs/issues/7088)) ([8c4347c](https://github.com/reactivex/rxjs/commit/8c4347c48f2432d7399c911d329fa74e0d6c6e8d))

# [7.7.0](https://github.com/reactivex/rxjs/compare/7.6.0...7.7.0) (2022-12-15)

### Features

- **distinct:** `flush` argument now supports any `ObservableInput` ([#7081](https://github.com/reactivex/rxjs/issues/7081)) ([74c9ebd](https://github.com/reactivex/rxjs/commit/74c9ebd818113f9f25f1fb2b9fee4a0eac121ae0))
- **repeatWhen:** `notifier` supports `ObservableInput` ([#7103](https://github.com/reactivex/rxjs/issues/7103)) ([8f1b976](https://github.com/reactivex/rxjs/commit/8f1b976125c55a5e884317c2b463fd019662e6af))
- **retryWhen:** `notifier` now supports any `ObservableInput` ([#7105](https://github.com/reactivex/rxjs/issues/7105)) ([794f806](https://github.com/reactivex/rxjs/commit/794f8064cf8fe754e9dfebeee0ffef0ac1562252))
- **sample:** `notifier` now supports any `ObservableInput` ([#7104](https://github.com/reactivex/rxjs/issues/7104)) ([b18c2eb](https://github.com/reactivex/rxjs/commit/b18c2eb2bc8dc1a717c927f998028316eec83937))

# [7.6.0](https://github.com/reactivex/rxjs/compare/7.5.7...7.6.0) (2022-12-03)

### Bug Fixes

- **schedulers:** no longer cause TypeScript build failures when Node types aren't included ([c1a07b7](https://github.com/reactivex/rxjs/commit/c1a07b71ac050ab36b371ff7f18dc9a924fffc9f))
- **types:** Improved subscribe and tap type overloads ([#6718](https://github.com/reactivex/rxjs/issues/6718)) ([af1a9f4](https://github.com/reactivex/rxjs/commit/af1a9f446a860883abaa36ace21345dc923e7e53)), closes [#6717](https://github.com/reactivex/rxjs/issues/6717)

### Features

- **onErrorResumeNextWith:** renamed `onErrorResumeNext` and exported from the top level. (`onErrorResumeNext` operator is stil available, but deprecated) ([#6755](https://github.com/reactivex/rxjs/issues/6755)) ([51e3b2c](https://github.com/reactivex/rxjs/commit/51e3b2c8ec28b5d30bca4c63ad69ce6942c2cdcc))

## [7.5.7](https://github.com/reactivex/rxjs/compare/7.5.6...7.5.7) (2022-09-25)

### Bug Fixes

- **schedulers:** improve performance of animationFrameScheduler and asapScheduler ([#7059](https://github.com/reactivex/rxjs/issues/7059)) ([c93aa60](https://github.com/reactivex/rxjs/commit/c93aa60e9f073297d959fa1fff9323e48872d47e)), closes [#7017](https://github.com/reactivex/rxjs/issues/7017), related to [#7018](https://github.com/reactivex/rxjs/issues/7018) and [#6674](https://github.com/reactivex/rxjs/issues/6674)

### Performance Improvements

- **animationFrames:** uses fewer Subscription instances ([#7060](https://github.com/reactivex/rxjs/issues/7060)) ([2d57b38](https://github.com/reactivex/rxjs/commit/2d57b38ec9f7ada838ee130ab75cd795b156c182)), closes [#7018](https://github.com/reactivex/rxjs/issues/7018)

## [7.5.6](https://github.com/reactivex/rxjs/compare/7.5.5...7.5.6) (2022-07-11)

### Bug Fixes

- **share:** No longer results in a bad-state observable in an edge case where a synchronous source was shared and refCounted, and the result is subscribed to twice in a row synchronously. ([#7005](https://github.com/reactivex/rxjs/issues/7005)) ([5d4c1d9](https://github.com/reactivex/rxjs/commit/5d4c1d9a37b1347217223adb0d9e166fd85f67a9))
- **share & connect:** `share` and `connect` no longer bundle scheduling code by default ([#6873](https://github.com/reactivex/rxjs/issues/6873)) ([9948dc2](https://github.com/reactivex/rxjs/commit/9948dc2f5577eaa4013de234f3552508918518c7)), closes [#6872](https://github.com/reactivex/rxjs/issues/6872)
- **exhaustAll:** Result will now complete properly when flattening all synchronous observables. ([#6911](https://github.com/reactivex/rxjs/issues/6911)) ([3c1c6b8](https://github.com/reactivex/rxjs/commit/3c1c6b8303028eebc7af31cfc5e5bad42a5b2da4)), closes [#6910](https://github.com/reactivex/rxjs/issues/6910)
- **TypeScript:** Now compatible with TypeScript 4.6 type checks ([#6895](https://github.com/reactivex/rxjs/issues/6895)) ([fce9aa1](https://github.com/reactivex/rxjs/commit/fce9aa12931796892673581761bba1f7ceafabff))

## [7.5.5](https://github.com/reactivex/rxjs/compare/7.5.4...7.5.5) (2022-03-08)

### Bug Fixes

- **package:** add types to exports ([#6802](https://github.com/reactivex/rxjs/issues/6802)) ([3750f75](https://github.com/reactivex/rxjs/commit/3750f75104bb82d870c53c0605c942e41245d79c))
- **package:** add `require` export condition ([#6821](https://github.com/reactivex/rxjs/issues/6821)) ([c8955e4](https://github.com/reactivex/rxjs/commit/c8955e4c6a972135030fdfddc18a7a48337ae9c7))
- **timeout:** no longer will timeout when receiving the first value synchronously ([#6865](https://github.com/reactivex/rxjs/issues/6865)) ([2330c96](https://github.com/reactivex/rxjs/commit/2330c9660b20f2e0cda0c4eeb36bb582b4a85186)), closes [#6862](https://github.com/reactivex/rxjs/issues/6862)

### Performance Improvements

- Don't clone observers unless you have to ([#6842](https://github.com/reactivex/rxjs/issues/6842)) ([3289d20](https://github.com/reactivex/rxjs/commit/3289d20ddc3a84d2aede8e3ab9962a8ef5d43c83))

## [7.5.4](https://github.com/reactivex/rxjs/compare/7.5.3...7.5.4) (2022-02-09)

### Performance Improvements

- removed code that would `bind` functions passed with observers to `subscribe`. ([#6815](https://github.com/reactivex/rxjs/issues/6815)) ([fb375a0](https://github.com/reactivex/rxjs/commit/fb375a0c5befd6852cd63d3c310448e42fa9580e)), closes [#6783](https://github.com/reactivex/rxjs/issues/6783)

## [7.5.3](https://github.com/reactivex/rxjs/compare/7.5.2...7.5.3) (2022-02-08)

### Bug Fixes

- **subscribe:** allow interop with Monio and other libraries that patch function bind ([0ab91eb](https://github.com/reactivex/rxjs/commit/0ab91eb4c1da914efbf03a2732629914cd3398dc)), closes [#6783](https://github.com/reactivex/rxjs/issues/6783)

## [7.5.2](https://github.com/reactivex/rxjs/compare/7.5.1...7.5.2) (2022-01-11)

### Bug Fixes

- operators that ignore input values now use `unknown` rather than `any`, which should resolve issues with eslint no-unsafe-argument ([#6738](https://github.com/reactivex/rxjs/issues/6738)) ([67cb317](https://github.com/reactivex/rxjs/commit/67cb317a7a6b9fdbd3d2e8fdbc2ac9ac7e57179c)), closes [#6536](https://github.com/reactivex/rxjs/issues/6536)
- **ajax:** crossDomain flag deprecated and properly reported to consumers ([#6710](https://github.com/reactivex/rxjs/issues/6710)) ([7fd0575](https://github.com/reactivex/rxjs/commit/7fd05756c595dddb288b732b00a90fcfb2a9080a)), closes [#6663](https://github.com/reactivex/rxjs/issues/6663)

## [7.5.1](https://github.com/reactivex/rxjs/compare/7.5.0...7.5.1) (2021-12-28)

### Bug Fixes

- export supporting interfaces from top-level `rxjs` site. ([#6733](https://github.com/reactivex/rxjs/issues/6733)) ([299a1e1](https://github.com/reactivex/rxjs/commit/299a1e16f725edfc2e333c430e3a7dfc75dd94e7))

# [7.5.0](https://github.com/reactivex/rxjs/compare/7.4.0...7.5.0) (2021-12-27)

### Bug Fixes

- **takeWhile:** Now returns proper types when passed a `Boolean` constructor. ([#6633](https://github.com/reactivex/rxjs/issues/6633)) ([081ca2b](https://github.com/reactivex/rxjs/commit/081ca2ba7290aa3084c1477a6d4bcc573bf478f6))
- **forEach:** properly unsubs after error in next handler ([#6677](https://github.com/reactivex/rxjs/issues/6677)) ([b9ab67d](https://github.com/reactivex/rxjs/commit/b9ab67d21ca9d227fcd1123bf80ab87ca9296af9)), closes [#6676](https://github.com/reactivex/rxjs/issues/6676)
- **WebSocketSubject:** handle slow WebSocket close ([#6708](https://github.com/reactivex/rxjs/issues/6708)) ([8cb201c](https://github.com/reactivex/rxjs/commit/8cb201cd42dd751b4185b94fe2d36c6bfda02fe2)), closes [#4650](https://github.com/reactivex/rxjs/issues/4650) [#3935](https://github.com/reactivex/rxjs/issues/3935)
- RxJS now supports tslib 2.x, rather than just 2.1.x ([#6692](https://github.com/reactivex/rxjs/issues/6692)) ([0b2495f](https://github.com/reactivex/rxjs/commit/0b2495f72e76627fdd19dd7a670dd74847d6449c)), closes [#6689](https://github.com/reactivex/rxjs/issues/6689)
- schedulers will no longer error while rescheduling and unsubscribing during flushes ([e35f589](https://github.com/reactivex/rxjs/commit/e35f589e2ca10ab2d2d69f7e9fe60727edc4c53d)), closes [#6672](https://github.com/reactivex/rxjs/issues/6672)

### Features

- **repeat:** now has configurable delay ([#6640](https://github.com/reactivex/rxjs/issues/6640)) ([6b7a534](https://github.com/reactivex/rxjs/commit/6b7a534f579f95f97f47eff74bdea9991ee85712))

# [7.4.0](https://github.com/reactivex/rxjs/compare/7.3.1...7.4.0) (2021-10-06)

### Features

- Add es2015 entries to the exports declaration to support Angular ([#6614](https://github.com/reactivex/rxjs/issues/6614)) ([268777b](https://github.com/reactivex/rxjs/commit/268777bc3a4fd0cf76882683b51809771741ddc3)), closes [/github.com/ReactiveX/rxjs/pull/6613#discussion_r716958551](https://github.com//github.com/ReactiveX/rxjs/pull/6613/issues/discussion_r716958551)

## [7.3.1](https://github.com/reactivex/rxjs/compare/7.3.0...7.3.1) (2021-10-01)

### Bug Fixes

- **Schedulers:** Throwing a falsy error in a scheduled function no longer results in strange error objects. ([#6594](https://github.com/reactivex/rxjs/issues/6594)) ([c70fcc0](https://github.com/reactivex/rxjs/commit/c70fcc02b4b737709aba559bf36b030a47902ee4))
- scheduling with Rx-provided schedulers will no longer leak action references ([#6562](https://github.com/reactivex/rxjs/issues/6562)) ([ff5a748](https://github.com/reactivex/rxjs/commit/ff5a748b31ee73a6517e2f4220c920c73fbdd1fc)), closes [#6561](https://github.com/reactivex/rxjs/issues/6561)
- **forkJoin:** now finalizes sources before emitting ([#6546](https://github.com/reactivex/rxjs/issues/6546)) ([c52ff2e](https://github.com/reactivex/rxjs/commit/c52ff2e3aae19cd0877adb63182c03b79427de96)), closes [#4914](https://github.com/reactivex/rxjs/issues/4914)
- **observeOn:** release action references on teardown ([321d205](https://github.com/reactivex/rxjs/commit/321d2052696a7c366786c1ef3be7ad2a98a55f62))
- **types:** update schedule signature overload ([c61e57c](https://github.com/reactivex/rxjs/commit/c61e57c9c64a1525d034aea641f1b846737e1eee))

# [7.3.0](https://github.com/reactivex/rxjs/compare/7.2.0...7.3.0) (2021-07-28)

### Bug Fixes

- Expose `Connectable`, the return type of `connectable` ([#6531](https://github.com/reactivex/rxjs/issues/6531)) ([69f5bfa](https://github.com/reactivex/rxjs/commit/69f5bfae0eb2880a3d5cfb34db3a182182b325de)), closes [#6529](https://github.com/reactivex/rxjs/issues/6529)
- **AsyncSubject:** properly emits values during reentrant subscriptions ([#6522](https://github.com/reactivex/rxjs/issues/6522)) ([dd8bdf3](https://github.com/reactivex/rxjs/commit/dd8bdf3b18b596155b66029ef16ebabf989360c5)), closes [#6520](https://github.com/reactivex/rxjs/issues/6520)

### Features

- **retry:** Now supports configurable delay as a named argument ([#6421](https://github.com/reactivex/rxjs/issues/6421)) ([5f69795](https://github.com/reactivex/rxjs/commit/5f69795f4be035499cf223bf9a3d7352c4975291))
- **tap:** Now supports subscribe, unsubscribe, and finalize handlers ([#6527](https://github.com/reactivex/rxjs/issues/6527)) ([eb26cbc](https://github.com/reactivex/rxjs/commit/eb26cbc4488c9953cdde565b598b1dbdeeeee9ea))

# [7.2.0](https://github.com/reactivex/rxjs/compare/7.1.0...7.2.0) (2021-07-05)

### Bug Fixes

- **debounceTime:** unschedule dangling task on unsubscribe before complete ([#6464](https://github.com/reactivex/rxjs/issues/6464)) ([7ab0a4c](https://github.com/reactivex/rxjs/commit/7ab0a4c649b1b54e763a726c4ffdc183b0b45b23))
- **fromEvent:** Types now properly infer when resultSelector is provided ([#6447](https://github.com/reactivex/rxjs/issues/6447)) ([39b9d81](https://github.com/reactivex/rxjs/commit/39b9d818ef6ea033dc8e53800e3a220d56c76b4a))

### Features

- Operators are all exported at the top level, from "rxjs". From here on out, we encourage top-level imports with RxJS. Importing from `rxjs/operators` will be deprecated soon. ([#6488](https://github.com/reactivex/rxjs/issues/6488)) ([512adc2](https://github.com/reactivex/rxjs/commit/512adc25f350660113275d8277d16b7f3eec1d49)), closes [#6242](https://github.com/reactivex/rxjs/issues/6242)

# [7.1.0](https://github.com/reactivex/rxjs/compare/7.0.1...7.1.0) (2021-05-21)

### Bug Fixes

- returned operator functions from multicast operators `share`, `publish`, `publishReplay` are now referentially transparent. Meaning if you take the result of calling `publishReplay(3)` and pass it to more than one observable's `pipe` method, it will behave the same in each case, rather than having a cumulative effect, which was a regression introduced sometime in version 6. If you required this broken behavior, there is a workaround posted [here](https://github.com/ReactiveX/rxjs/pull/6410#issuecomment-846087374) ([#6410](https://github.com/reactivex/rxjs/issues/6410)) ([e2f2e51](https://github.com/reactivex/rxjs/commit/e2f2e516514bdeb76229e69c639f10f21bccafad)), closes [/github.com/ReactiveX/rxjs/pull/6410#issuecomment-846087374](https://github.com//github.com/ReactiveX/rxjs/pull/6410/issues/issuecomment-846087374) [#5411](https://github.com/reactivex/rxjs/issues/5411)

### Features

- All subjects now have an `observed` property. This will allow users to check whether a subject has current subscribers without us allowing access to the `observers` array, which is going to be made private in future versions. ([#6405](https://github.com/reactivex/rxjs/issues/6405)) ([f47425d](https://github.com/reactivex/rxjs/commit/f47425d349475231c0f3542bb6ecef16a63e933a))
- **groupBy:** Support named arguments, support ObservableInputs for duration selector ([#5679](https://github.com/reactivex/rxjs/issues/5679)) ([7a99397](https://github.com/reactivex/rxjs/commit/7a9939773802c4f7948c6d868a8f75facdea9f37))
- **share:** use another observable to control resets ([#6169](https://github.com/reactivex/rxjs/issues/6169)) ([12c3716](https://github.com/reactivex/rxjs/commit/12c3716cecbf01f353c980488bf18845177b37b6))

## [7.0.1](https://github.com/reactivex/rxjs/compare/7.0.0...7.0.1) (2021-05-12)

### Bug Fixes

- **bindCallback:** resulting function now recreated underlying Subject and is reusable once again. ([#6369](https://github.com/reactivex/rxjs/issues/6369)) ([abf2bc1](https://github.com/reactivex/rxjs/commit/abf2bc13e38406717127159c8c373b910223b562))
- **retry:** properly handles retry counts smaller than `1`. ([#6359](https://github.com/reactivex/rxjs/issues/6359)) ([e797bd7](https://github.com/reactivex/rxjs/commit/e797bd70b1368e189df00d697504304a3a5ef1a8))
- **share:** properly closes synchronous "firehose" sources. ([#6370](https://github.com/reactivex/rxjs/issues/6370)) ([2271a91](https://github.com/reactivex/rxjs/commit/2271a9180131a0becdbf789c1429ef741ace4b2f))
- Observable teardowns now properly called if `useDeprecatedSynchronousErrorHandling` is `true`. ([#6365](https://github.com/reactivex/rxjs/issues/6365)) ([e19e104](https://github.com/reactivex/rxjs/commit/e19e104d011233d83bc10c37f1ee0b3ac6e15612)), closes [#6364](https://github.com/reactivex/rxjs/issues/6364)
- **Subscription:** properly release parent subscriptions when unsubscribed. ([#6352](https://github.com/reactivex/rxjs/issues/6352)) ([88331d2](https://github.com/reactivex/rxjs/commit/88331d2ecdcf0f81a0712b315ed810d4da7d4b97)), closes [#6351](https://github.com/reactivex/rxjs/issues/6351) [#6351](https://github.com/reactivex/rxjs/issues/6351)
- **node**: do not reference DOM-related imports to assist in node usage. ([#6305](https://github.com/reactivex/rxjs/issues/6305)) ([b24818e](https://github.com/reactivex/rxjs/commit/b24818e96775045c7485932bf33349471e8f1363)), closes [#6297](https://github.com/reactivex/rxjs/issues/6297)

# [7.0.0](https://github.com/reactivex/rxjs/compare/7.0.0-rc.3...7.0.0) (2021-04-29)

### Bug Fixes

- VS code will now properly auto-import operators, et al ([#6276](https://github.com/reactivex/rxjs/issues/6276)) ([f43c728](https://github.com/reactivex/rxjs/commit/f43c72815f9ebe5ee3a8ed11513be0f541c9517d)), closes [#6067](https://github.com/reactivex/rxjs/issues/6067)
- **AjaxResponse:** add stricter `type` (`AjaxResponseType`) ([#6279](https://github.com/reactivex/rxjs/issues/6279)) ([839e192](https://github.com/reactivex/rxjs/commit/839e192b7d826d833d7ce941be97c3735bd19c0a))

# [7.0.0-rc.3](https://github.com/reactivex/rxjs/compare/7.0.0-rc.2...7.0.0-rc.3) (2021-04-28)

### Bug Fixes

- finalize behaves well with useDeprecatedSynchronousErrorHandling ([#6251](https://github.com/reactivex/rxjs/issues/6251)) ([e4bed2a](https://github.com/reactivex/rxjs/commit/e4bed2a2bad994f05a39246707d4f203412cebbd)), closes [#6250](https://github.com/reactivex/rxjs/issues/6250)
- resolve run-time errors when using deprecated sync error handling ([#6272](https://github.com/reactivex/rxjs/issues/6272)) ([35daaf7](https://github.com/reactivex/rxjs/commit/35daaf77d3a9a909a7ec22c362c97ac42a597f79)), closes [#6271](https://github.com/reactivex/rxjs/issues/6271)
- resolve issue that made users unable to assert `instanceof AjaxError`. ([#6275](https://github.com/reactivex/rxjs/issues/6275)) ([a7c2d29](https://github.com/reactivex/rxjs/commit/a7c2d297ad6b2f405ac312b38f6360e9a645d890))

### Features

- add config object to connectable ([#6267](https://github.com/reactivex/rxjs/issues/6267)) ([4d98b40](https://github.com/reactivex/rxjs/commit/4d98b40f969d5f55381f9a178ef3c18e6850cf47))

### BREAKING CHANGES

- Our very new creation function, `connectable`, now takes a configuration object instead of just the `Subject` instance. This was necessary to make sure it covered all use cases for what we were trying to replace in the deprecated multicasting operators. Apologies for the late-in-the-game change, but we know it's not widely used yet (it's new in v7), and we want to get it right.

# [7.0.0-rc.2](https://github.com/reactivex/rxjs/compare/7.0.0-rc.1...7.0.0-rc.2) (2021-04-20)

### Bug Fixes

- **webSocket:** return the correct type for `WebSocketSubject` `multiplex` method([#6232](https://github.com/reactivex/rxjs/issues/6232)) ([33383b8](https://github.com/reactivex/rxjs/commit/33383b884d895fa77866362b8b00fd2e2c3597e6))

### Reverts

- Revert "chore: Add typesVersions to package.json (#6229)" (#6241) ([304f3a7](https://github.com/reactivex/rxjs/commit/304f3a73e67871f9b37f39675e503174d3dcc23a)), closes [#6229](https://github.com/reactivex/rxjs/issues/6229) [#6241](https://github.com/reactivex/rxjs/issues/6241)

# [7.0.0-rc.1](https://github.com/reactivex/rxjs/compare/7.0.0-rc.0...7.0.0-rc.1) (2021-04-19)

### Bug Fixes

- **TypeScript:** Add typesVersions definition to package.json in order to help VS Code find automatic imports. ([#6067](https://github.com/reactivex/rxjs/issues/6067)) ([659a623](https://github.com/reactivex/rxjs/commit/659a623c94bd6b210e9beb6bb6061be540b05538))

# [7.0.0-rc.0](https://github.com/reactivex/rxjs/compare/7.0.0-beta.15...7.0.0-rc.0) (2021-04-19)

### Bug Fixes

- **symbol:** revert unique symbol in [#5874](https://github.com/reactivex/rxjs/issues/5874) ([#6224](https://github.com/reactivex/rxjs/issues/6224)) ([3c49429](https://github.com/reactivex/rxjs/commit/3c49429fadc31ebaddd143d4412907edc50e32be)), closes [#5919](https://github.com/reactivex/rxjs/issues/5919) [#6178](https://github.com/reactivex/rxjs/issues/6178) [#6175](https://github.com/reactivex/rxjs/issues/6175)
- forkJoin/combineLatest return Observable<unknown> if passed any ([#6227](https://github.com/reactivex/rxjs/issues/6227)) ([ce0a2fa](https://github.com/reactivex/rxjs/commit/ce0a2fa975e7c08de2bbf893010f2c25c090b1ca)), closes [#6226](https://github.com/reactivex/rxjs/issues/6226)
- **fromEvent:** match targets properly; fix result selector type ([#6208](https://github.com/reactivex/rxjs/issues/6208)) ([8412c73](https://github.com/reactivex/rxjs/commit/8412c739bb47cc45ec3f38327115301b4fcc0118))
- **merge:** single array is not an array of sources ([#6211](https://github.com/reactivex/rxjs/issues/6211)) ([4e900dc](https://github.com/reactivex/rxjs/commit/4e900dc745b5fbd7659b104c49fb0fce4ae84707))
- **pipe:** Ensure that `unknown` is inferred for 9+ arguments. ([#6212](https://github.com/reactivex/rxjs/issues/6212)) ([6fa819b](https://github.com/reactivex/rxjs/commit/6fa819beb91ba99dadd6262d6c13f7ddfd9470c5))

### Features

- add (optional) defaultValue configuration to firstValueFrom and lastValueFrom ([#6204](https://github.com/reactivex/rxjs/issues/6204)) ([df51b04](https://github.com/reactivex/rxjs/commit/df51b04d7ec68a72b3a4b0d69c3bb29264c72611))

# [7.0.0-beta.15](https://github.com/reactivex/rxjs/compare/7.0.0-beta.14...7.0.0-beta.15) (2021-03-31)

### Bug Fixes

- **esm:** duplicate directory in export path ([#6194](https://github.com/reactivex/rxjs/issues/6194)) ([aa41462](https://github.com/reactivex/rxjs/commit/aa4146288ec6542754f41ffd260fa4d6936a4d22))

# [7.0.0-beta.14](https://github.com/reactivex/rxjs/compare/7.0.0-beta.13...7.0.0-beta.14) (2021-03-30)

### Bug Fixes

- **share:** No longer throws errors for reentrant observables ([#6151](https://github.com/reactivex/rxjs/issues/6151)) ([fc728cd](https://github.com/reactivex/rxjs/commit/fc728cdf2f395620cca347602e66f3d173c057b5)), closes [#6144](https://github.com/reactivex/rxjs/issues/6144)

### Features

- **ajax:** Now allows configuration of query string parameters, via a `params` option in the request configuration ([#6174](https://github.com/reactivex/rxjs/issues/6174)) ([980f4d4](https://github.com/reactivex/rxjs/commit/980f4d4bb6a3bc1513a4335ed124f4d11b93d251))
- **esm:** Added exports within package.json to enable scoped package loading. ([#6192](https://github.com/reactivex/rxjs/issues/6192)) ([33a9f06](https://github.com/reactivex/rxjs/commit/33a9f06f2c59c8aef3bb583bdb7d61d08ab597a0)), closes [sveltejs/kit#612](https://github.com/sveltejs/kit/issues/612) [nodejs/node#27408](https://github.com/nodejs/node/issues/27408)
- **ReadableStreams:** RxJS now supports conversions for ReadableStreams e.g. `from(readableStream)`. ([#6163](https://github.com/reactivex/rxjs/issues/6163)) ([19d6502](https://github.com/reactivex/rxjs/commit/19d650223cf0e1964e893baca19f264154422a7d))

# [7.0.0-beta.13](https://github.com/reactivex/rxjs/compare/7.0.0-beta.12...7.0.0-beta.13) (2021-03-15)

### Bug Fixes

- **fromEvent:** throw if passed invalid target ([#6136](https://github.com/reactivex/rxjs/issues/6136)) ([317ba0c](https://github.com/reactivex/rxjs/commit/317ba0c9254e447385414e2c57e1d81760f88aa6)), closes [#5823](https://github.com/reactivex/rxjs/issues/5823)
- remove misused type parameter from static pipe ([#6119](https://github.com/reactivex/rxjs/issues/6119)) ([8dc7d17](https://github.com/reactivex/rxjs/commit/8dc7d1793b4067d9eedc42b28d49ace8296672f5)), closes [#5557](https://github.com/reactivex/rxjs/issues/5557)
- **Subscriber:** don't leak destination ([#6116](https://github.com/reactivex/rxjs/issues/6116)) ([5bba36c](https://github.com/reactivex/rxjs/commit/5bba36c6dde5b1b4b7e434104e716b233e5f402c))
- **combineLatest:** POJO signature should match only ObservableInput values ([#6103](https://github.com/reactivex/rxjs/issues/6103)) ([d633494](https://github.com/reactivex/rxjs/commit/d633494dcdcabecda2c64ee84b8b6ceeaa2cb3d8))
- **forkJoin:** POJO signature should match only ObservableInput values ([#6095](https://github.com/reactivex/rxjs/issues/6095)) ([566427e](https://github.com/reactivex/rxjs/commit/566427e88e597589f21b8cfb057dd13d5c61e0f2))
- predicates that return `any` will now behave property with findIndex ([#6097](https://github.com/reactivex/rxjs/issues/6097)) ([c6f73d6](https://github.com/reactivex/rxjs/commit/c6f73d687e6b2142da4cab2a66047cc6dd123bf9))
- remove misused type parameter from isObservable ([#6083](https://github.com/reactivex/rxjs/issues/6083)) ([f16b634](https://github.com/reactivex/rxjs/commit/f16b6341eef85009fc16de13623dc860d8d87778))
- unhandled errors in observers correctly scheduled ([#6118](https://github.com/reactivex/rxjs/issues/6118)) ([c02ceb7](https://github.com/reactivex/rxjs/commit/c02ceb75e3de12fedbe270d5d323f508171f9cfd))
- **defaultIfEmpty:** Allow `undefined` as an argument, require an argument ([4983760](https://github.com/reactivex/rxjs/commit/4983760b9179da27ddfcbf419ac5975cff9447c9)), closes [#6064](https://github.com/reactivex/rxjs/issues/6064)
- **elementAt:** Allow `defaultValue` of `undefined`. ([5bc1b3e](https://github.com/reactivex/rxjs/commit/5bc1b3e22deceb5ea5f1882c0f92f061c1c4792d))
- **first:** Allow `defaultValue` of `undefined`. ([62a6bbe](https://github.com/reactivex/rxjs/commit/62a6bbe1c3c51468c57e4e8f754c1c09da2db51b))
- **last:** Allow `defaultValue` of `undefined`. ([ef3e721](https://github.com/reactivex/rxjs/commit/ef3e721f440132cf199f662b6a987349a0a70418))

### Features

- rename and alias `combineLatest` as `combineLatestAll` for consistency ([#6079](https://github.com/reactivex/rxjs/issues/6079)) ([42cee80](https://github.com/reactivex/rxjs/commit/42cee8045594779e8802b370c7244e6bbeeccaa3)), closes [#4590](https://github.com/reactivex/rxjs/issues/4590)

### BREAKING CHANGES

- **defaultIfEmpty:** `defaultIfEmpty` requires a value be passed. Will no longer convert `undefined` to `null` for no good reason.

# [7.0.0-beta.12](https://github.com/reactivex/rxjs/compare/7.0.0-beta.11...7.0.0-beta.12) (2021-02-27)

5bc8e3361 Fix/6052 ajax responseType should default to "json" (#6056)

### Bug Fixes

- **ajax**: `responseType` is now properly defaulted to `"json"` again. ([#6056](https://github.com/reactivex/rxjs/issues/6056)) ([5bc8e3361](https://github.com/reactivex/rxjs/commit/5bc8e3361))
- Corner case resolved where an error thrown in a completion handler might delay teardown if it happened to be after a completing operator like `take`. ([#6062](https://github.com/reactivex/rxjs/issues/6062)) ([a2b9563](https://github.com/reactivex/rxjs/commit/a2b95631be882d2cf0fd87f43804d1ed699591d7))
- **AsyncGenerator support**: consumed async generators are now properly finalized. ([#6062](https://github.com/reactivex/rxjs/issues/6062)) ([a2b9563](https://github.com/reactivex/rxjs/commit/a2b95631be882d2cf0fd87f43804d1ed699591d7)), closes [#5998](https://github.com/reactivex/rxjs/issues/5998)
- **throttle:** no longer emits more than necessary in sync/sync trailing case ([#6059](https://github.com/reactivex/rxjs/issues/6059)) ([9da638a](https://github.com/reactivex/rxjs/commit/9da638a70d5abb862439ab4ee6a55368228811b0)), closes [#6058](https://github.com/reactivex/rxjs/issues/6058)

# [7.0.0-beta.11](https://github.com/reactivex/rxjs/compare/7.0.0-beta.10...7.0.0-beta.11) (2021-02-24)

### Bug Fixes

- **ajax:** now errors on forced abort ([#6041](https://github.com/reactivex/rxjs/issues/6041)) ([d950921](https://github.com/reactivex/rxjs/commit/d95092143c1860eef054d27f2a1e50cb98b0ef58)), closes [#4251](https://github.com/reactivex/rxjs/issues/4251)
- **buffer:** closingNotifier completion does not complete resulting observable ([358ae84](https://github.com/reactivex/rxjs/commit/358ae84cb9d59170216e7e0845c192eb3e1dcb51))
- **buffer:** Remaining buffer will correctly be emitted on source close. ([0c667d5](https://github.com/reactivex/rxjs/commit/0c667d596d4a14002ffe9d4db319ed7cd7442ada)), closes [#3990](https://github.com/reactivex/rxjs/issues/3990) [#6035](https://github.com/reactivex/rxjs/issues/6035)
- **debounceTime:** improves performance on quick succession of emits ([#6049](https://github.com/reactivex/rxjs/issues/6049)) ([9b70861](https://github.com/reactivex/rxjs/commit/9b708613cb7687647dc43c5e15b821e17ccc23ef))
- **distinctUntilChanged:** Ensure reentrant code is compared properly ([#6014](https://github.com/reactivex/rxjs/issues/6014)) ([0ebcf17](https://github.com/reactivex/rxjs/commit/0ebcf1751a5359072b137ff197789570be4d7ead))
- **share:** Ensure proper memory clean up ([1aa400a](https://github.com/reactivex/rxjs/commit/1aa400a5214325bc843a74602022a7912da20166))
- **window:** final window stays open until source complete ([e8b05ef](https://github.com/reactivex/rxjs/commit/e8b05ef090d33af5b883e8020b8b7a3c4c8fa30e))
- **concat/merge:** operators will finalize inners before moving to the next ([#6010](https://github.com/reactivex/rxjs/issues/6010)) ([5249a23](https://github.com/reactivex/rxjs/commit/5249a23b38bdda4639e9d669afd62a624172f89c)), closes [#3338](https://github.com/reactivex/rxjs/issues/3338)
- predicates that return `any` will now behave property in TS ([#5987](https://github.com/reactivex/rxjs/issues/5987)) ([f5ae97d](https://github.com/reactivex/rxjs/commit/f5ae97d49a35b9f99ac59f79dd244a6d8d6c8a7b)), closes [#5986](https://github.com/reactivex/rxjs/issues/5986)
- `publish` variants returning `ConnectableObservable` not properly utilizing lift ([#6003](https://github.com/reactivex/rxjs/issues/6003)) ([9acb950](https://github.com/reactivex/rxjs/commit/9acb950aec9efda95eb7492bfc47a33b71ef2e55))
- Resolve issues with deprecated synchronous error handling and chained operators ([#5980](https://github.com/reactivex/rxjs/issues/5980)) ([0ad2802](https://github.com/reactivex/rxjs/commit/0ad2802a5aa9cd19875dc05c1cfb33f0b2f2c153)), closes [#5979](https://github.com/reactivex/rxjs/issues/5979)
- `useDeprecatedSynchronousErrorThrowing` honored for flattened sync sources ([#5984](https://github.com/reactivex/rxjs/issues/5984)) ([abd95ce](https://github.com/reactivex/rxjs/commit/abd95ce1aa81a64de81c074a72570a8f0949cd0d)), closes [#5983](https://github.com/reactivex/rxjs/issues/5983)

### Features

- **ajax:** Add option for streaming progress ([#6001](https://github.com/reactivex/rxjs/issues/6001)) ([873e52d](https://github.com/reactivex/rxjs/commit/873e52d0d67b0f8470e6290c6fbc35c571464aaf))
- **exhaustAll:** renamed `exhaust` to `exhaustAll` ([#5639](https://github.com/reactivex/rxjs/issues/5639)) ([701c7d4](https://github.com/reactivex/rxjs/commit/701c7d48cf1c3e60941692010254d6a27fc70980))

### BREAKING CHANGES

- **window:** The `windowBoundaries` observable no longer completes the result. It was only ever meant to notify of the window boundary. To get the same behavior as the old behavior, you would need to add an `endWith` and a `skipLast(1)` like so: `source$.pipe(window(notifier$.pipe(endWith(true))), skipLast(1))`.
- **buffer:** Final buffered values will now always be emitted. To get the same behavior as the previous release, you can use `endWith` and `skipLast(1)`, like so: `source$.pipe(buffer(notifier$.pipe(endWith(true))), skipLast(1))`
- **buffer:** `closingNotifier` completion no longer completes the result of `buffer`. If that is truly a desired behavior, then you should use `takeUntil`. Something like: `source$.pipe(buffer(notifier$), takeUntil(notifier$.pipe(ignoreElements(), endWith(true))))`, where `notifier$` is multicast, although there are many ways to compose this behavior.

# [7.0.0-beta.10](https://github.com/reactivex/rxjs/compare/7.0.0-beta.9...7.0.0-beta.10) (2021-01-18)

### Bug Fixes

- **combineLatest:** Ensure `EMPTY` is returned if no observables are passed. ([#5963](https://github.com/reactivex/rxjs/issues/5963)) ([157c7e8](https://github.com/reactivex/rxjs/commit/157c7e8068befdfb26a9ba6ca770d38a66966ab5)), closes [#5962](https://github.com/reactivex/rxjs/issues/5962)
- **fromEvent:** fixed HasEventTargetAddRemove to support EventTarget types ([#5945](https://github.com/reactivex/rxjs/issues/5945)) ([5f022d7](https://github.com/reactivex/rxjs/commit/5f022d784570684632e6fd5ae247fc259ee34c4b))

### Features

- **connect:** Adds new `connect` operator. ([9d53af0](https://github.com/reactivex/rxjs/commit/9d53af04103dbbb3bae40a4c511e2eebf117be09))
- **connectable:** Adds `connectable` creation method ([f968a79](https://github.com/reactivex/rxjs/commit/f968a791c1b48f3100e925d700e8a0ecd69cc7e5))
- **share:** Make `share` completely configurable. Also adds `SubjectLike`. ([2d600c7](https://github.com/reactivex/rxjs/commit/2d600c75c1065d862a2089dc1cd26007996b1c9d))
- **TestScheduler:** add `expectObservable(a$).toEqual(b$)`. ([3372c72](https://github.com/reactivex/rxjs/commit/3372c72ed77a96e29a613a620e85f93bcf447920))

### Performance Improvements

- ensure same hidden class for OperatorSubscriber ([#5878](https://github.com/reactivex/rxjs/issues/5878)) ([246b449](https://github.com/reactivex/rxjs/commit/246b44902acde3a80e659f362969e6e2f8b19ef2))

### BREAKING CHANGES

- **share:** The TypeScript type `Subscribable` now only supports what is a valid return for `[Symbol.observable]()`.
- **share:** The TypeScript type `Observer` no longer incorrectly has an optional `closed` property.

# [7.0.0-beta.9](https://github.com/reactivex/rxjs/compare/7.0.0-beta.8...7.0.0-beta.9) (2020-12-07)

### Bug Fixes

- **audit:** don't signal on complete ([54cb428](https://github.com/reactivex/rxjs/commit/54cb42823ceec4db469f6155de67993b67ec85be))
- **bufferToggle:** don't signal on complete ([65686ff](https://github.com/reactivex/rxjs/commit/65686ffd23f2d5a5145f2b7c33ea739e9bb808cd))
- **bufferWhen:** don't signal on complete ([a2ba364](https://github.com/reactivex/rxjs/commit/a2ba364ede3c69c7703795a744f57122b49eac40))
- **debounce:** don't signal on complete ([c919c68](https://github.com/reactivex/rxjs/commit/c919c684ad63724f0b55ccc4561f847773d945c8))
- **delayWhen:** no longer emits if duration selector is empty ([#5769](https://github.com/reactivex/rxjs/issues/5769)) ([0872341](https://github.com/reactivex/rxjs/commit/087234146760ab2c67a04f9f0b5494a93affadb7)), closes [#3665](https://github.com/reactivex/rxjs/issues/3665)
- **forkJoin:** ensure readonly array argument `forkJoin([a$, b$, c$] as const)` result is correct ([6baec53](https://github.com/reactivex/rxjs/commit/6baec536015253ac96827f2136ede17a324c634e))
- **iif:** No longer allow accidental undefined arguments ([#5829](https://github.com/reactivex/rxjs/issues/5829)) ([23b98b4](https://github.com/reactivex/rxjs/commit/23b98b4e61c3284c81c07a8d810e8c3ec99ddfec))
- **sample:** don't signal on complete ([95e0b70](https://github.com/reactivex/rxjs/commit/95e0b703caaf288657c7d722b9823458280be88b))
- **Symbol.observable:** properly defined as a `unique symbol`. ([#5874](https://github.com/reactivex/rxjs/issues/5874)) ([374138e](https://github.com/reactivex/rxjs/commit/374138e09eb7ceb6f8da556c6c11dea1ba8cdbee)), closes [#5861](https://github.com/reactivex/rxjs/issues/5861) [#4415](https://github.com/reactivex/rxjs/issues/4415)
- **throttle:** don't signal on complete ([4af0227](https://github.com/reactivex/rxjs/commit/4af022753d6dd4e94bcfcf0cc6082bb2312a3f02))
- **windowToggle:** don't signal on complete ([9cb56c4](https://github.com/reactivex/rxjs/commit/9cb56c45de289ef5b062f33971996bdb8414cf99)), closes [#5838](https://github.com/reactivex/rxjs/issues/5838)
- use empty object type in combineLatest/forkJoin sigs ([#5832](https://github.com/reactivex/rxjs/issues/5832)) ([22aaaa2](https://github.com/reactivex/rxjs/commit/22aaaa2f03dc721f850d9836243773c5310e85e8))
- **withLatestFrom:** allow synchronous source ([#5828](https://github.com/reactivex/rxjs/issues/5828)) ([adbe65e](https://github.com/reactivex/rxjs/commit/adbe65e659bbf17f6ab20a9b30fcca0e4d76af9a))

### Features

- stopped notification handler ([#5750](https://github.com/reactivex/rxjs/issues/5750)) ([cfa267b](https://github.com/reactivex/rxjs/commit/cfa267bc0916ede09c8b14aedcdb69a791055fb6))
- support emoji in marble diagrams ([#5907](https://github.com/reactivex/rxjs/issues/5907)) ([1b4608c](https://github.com/reactivex/rxjs/commit/1b4608cea3a9db96d7a629ad5de0e100145c180e))
- **filter:** improve type inference for filter(Boolean) ([#5831](https://github.com/reactivex/rxjs/issues/5831)) ([d2658fa](https://github.com/reactivex/rxjs/commit/d2658fa32d7a86ac1e0796c452df258fc5470f67))

### BREAKING CHANGES

- **windowToggle:** the observable returned by the windowToggle operator's
  closing selector must emit a next notification to close the window.
  Complete notifications no longer close the window.
- **bufferToggle:** the observable returned by the bufferToggle operator's
  closing selector must emit a next notification to close the buffer.
  Complete notifications no longer close the buffer.
- **bufferWhen:** the observable returned by the bufferWhen operator's
  closing selector must emit a next notification to close the buffer.
  Complete notifications no longer close the buffer.
- **debounce:** the observable returned by the debounce operator's
  duration selector must emit a next notification to end the duration.
  Complete notifications no longer end the duration.
- **throttle:** the observable returned by the throttle operator's
  duration selector must emit a next notification to end the duration.
  Complete notifications no longer end the duration.
- **sample:** the sample operator's notifier observable must emit a next notification to effect a sample. Complete notifications no longer effect a sample.
- **audit:** the observable returned by the audit operator's duration selector must emit a next notification to end the duration. Complete notifications no longer end the duration.
- **Symbol.observable:** `rxjs@7` is only compatible with `@types/node@14.14.3` or higher and `symbol-observable@3.0.0` and higher. Older versions of `@types/node` incorrectly defined `Symbol.observable` and will be in conflict with `rxjs` and `symbol-observable@3.0.0`.
- **delayWhen:** `delayWhen` will no longer emit if the duration selector simply completes without a value. Notifiers must notify with a value, not a completion.
- **iif:** `iif` will no longer allow result arguments that are `undefined`. This was a bad call pattern that was likely an error in most cases. If for some reason you are relying on this behavior, simply substitute `EMPTY` in place of the `undefined` argument. This ensures that the behavior was intentional and desired, rather than the result of an accidental `undefined` argument.

# [7.0.0-beta.8](https://github.com/reactivex/rxjs/compare/7.0.0-beta.7...7.0.0-beta.8) (2020-10-15)

### Bug Fixes

- **audit, auditTime:** audit and auditTime emit last value after source completes ([#5799](https://github.com/reactivex/rxjs/issues/5799)) ([643bc85](https://github.com/reactivex/rxjs/commit/643bc85ab17a15a5d96f8bef8f08c3987d16eb40)), closes [#5730](https://github.com/reactivex/rxjs/issues/5730)
- No longer allow invalid "Subscribable" type as valid observable source in `from` and others. ([258dddd](https://github.com/reactivex/rxjs/commit/258dddd8a392456e7d0b5ed9a7e294044f7c2518)), closes [#4532](https://github.com/reactivex/rxjs/issues/4532)
- **bindNodeCallback:** ensure underlying function is not called twice during subscription ([#5780](https://github.com/reactivex/rxjs/issues/5780)) ([74aa4b2](https://github.com/reactivex/rxjs/commit/74aa4b2ea6685f475329a8b8ecbcebed9adae547))
- **delay:** Now properly handles Date and negative numbers ([#5719](https://github.com/reactivex/rxjs/issues/5719)) ([868c02b](https://github.com/reactivex/rxjs/commit/868c02b47bb6f4ec4cd1d68b5b474731c470f27e)), closes [#5232](https://github.com/reactivex/rxjs/issues/5232)
- **delayWhen:** only deprecates when subscriptionDelay presents ([#5797](https://github.com/reactivex/rxjs/issues/5797)) ([43d1731](https://github.com/reactivex/rxjs/commit/43d17311a521234375146029aa5c4709cb221344))
- **every:** index properly increments in predicate ([5686f83](https://github.com/reactivex/rxjs/commit/5686f838fdc3da710d3f1eed1a6381791e3cc644))
- **firstValueFrom:** now unsubscribes from source after first value is received ([#5813](https://github.com/reactivex/rxjs/issues/5813)) ([a321516](https://github.com/reactivex/rxjs/commit/a321516908aa036fb658395a372668a986af2504)), closes [#5811](https://github.com/reactivex/rxjs/issues/5811)
- **from:** objects that are thennable that happen to have a subscribe method will no longer error. ([789d6e3](https://github.com/reactivex/rxjs/commit/789d6e3d851d57ab3b4488381f702120fd079737))
- **fromEvent:** now properly types JQuery event targets ([b5aa15a](https://github.com/reactivex/rxjs/commit/b5aa15a7f58377310438aa5957e1516749d36219))
- **mergeScan:** no longer emits state again upon completion. ([#5805](https://github.com/reactivex/rxjs/issues/5805)) ([68c2894](https://github.com/reactivex/rxjs/commit/68c28943b4d2c51068fecbc359a68ca6982307bf)), closes [#5372](https://github.com/reactivex/rxjs/issues/5372)
- **throttle:** now supports synchronous duration selectors ([55e953e](https://github.com/reactivex/rxjs/commit/55e953e1f7b915e6c9072bf14a2febd5b8431393)), closes [#5658](https://github.com/reactivex/rxjs/issues/5658)
- **throttle:** trailing values will now emit after source completes ([d5fd69c](https://github.com/reactivex/rxjs/commit/d5fd69c123d2232335563eea95c69c07576d079d))
- **timeout:** allows synchronous observable as a source ([84c5c0b](https://github.com/reactivex/rxjs/commit/84c5c0b9d9e0d1791ac2f066c26e462e822d73e1)), closes [#5746](https://github.com/reactivex/rxjs/issues/5746)
- **zip:** zip now accepts an array of arguments like its counterparts ([3123b67](https://github.com/reactivex/rxjs/commit/3123b670cca9b77919845333952ef70275ed6e90))

### Code Refactoring

- **count:** Base off of `reduce`. ([98a6d09](https://github.com/reactivex/rxjs/commit/98a6d0991df2a28366ab8f34098109a67257c235))
- **pairs:** Based off of `from` and `Object.entries` ([#5775](https://github.com/reactivex/rxjs/issues/5775)) ([d39f830](https://github.com/reactivex/rxjs/commit/d39f8309c33917cb7070c7432fcd382395e4211e))

### Features

- **ajax:** now supports passing custom XSRF cookies in a custom header ([#5702](https://github.com/reactivex/rxjs/issues/5702)) ([1a2c2e4](https://github.com/reactivex/rxjs/commit/1a2c2e49482a460778ea92c7f6a92e58cc3e87bb)), closes [#4003](https://github.com/reactivex/rxjs/issues/4003)
- **switchScan:** add switchScan() operator ([#4442](https://github.com/reactivex/rxjs/issues/4442)) ([73fa910](https://github.com/reactivex/rxjs/commit/73fa910cb62eccbccc4b4249f9b2606095704328)), closes [#2931](https://github.com/reactivex/rxjs/issues/2931)

### BREAKING CHANGES

- **mergeScan:** `mergeScan` will no longer emit its inner state again upon completion.
- **pairs:** `pairs` will no longer function in IE without a polyfill for `Object.entries`. `pairs` itself is also deprecated in favor of users just using `from(Object.entries(obj))`.
- **zip:** Zipping a single array will now have a different result. This is an extreme corner-case, because it is very unlikely that anyone would want to zip an array with nothing at all. The workaround would be to wrap the array in another array `zip([[1,2,3]])`. But again, that's pretty weird.
- **count:** No longer passes `source` observable as a third argument to the predicate. That feature was rarely used, and of limited value. The workaround is to simply close over the source inside of the function if you need to access it in there.

# [7.0.0-beta.7](https://github.com/reactivex/rxjs/compare/7.0.0-beta.5...7.0.0-beta.7) (2020-09-23)

### Bug Fixes

- **multicast:** and other publish variants will handle errors thrown in a selector appropriately ([bde8eda](https://github.com/reactivex/rxjs/commit/bde8eda09310463b05c5ec7d8a1dd1bafe9dba6f))

### Code Refactoring

- **tap:** reduce the size of the implementation ([1222d5a](https://github.com/reactivex/rxjs/commit/1222d5a68faa9d3f3c9ad8f8d5db1440971502bd))
- **Subscriber:** Massively untangle Subscriber and SafeSubscriber ([07902ca](https://github.com/reactivex/rxjs/commit/07902ca99ee828521ce238826f10b55e25fbf554))

### BREAKING CHANGES

- **Subscriber:** `new Subscriber` no longer takes 0-3 arguments. To create a `Subscriber` with 0-3 arguments, use `Subscriber.create`. However, please note that there is little to no reason that you should be creating `Subscriber` references directly, and `Subscriber.create` and `new Subscriber` are both deprecated.

# [7.0.0-beta.6](https://github.com/reactivex/rxjs/compare/7.0.0-beta.5...7.0.0-beta.6) (2020-09-23)

### Bug Fixes

- **AsyncSubject:** fixed reentrancy issue in complete ([9e00f11](https://github.com/reactivex/rxjs/commit/9e00f11e992d223edf1013d0a44c7cad41b72470)), closes [/github.com/ReactiveX/rxjs/pull/5729/files/30d429cf1b791db15c04a61f6a683e189b53fb3e#r492314703](https://github.com//github.com/ReactiveX/rxjs/pull/5729/files/30d429cf1b791db15c04a61f6a683e189b53fb3e/issues/r492314703)
- **delay:** proper handling of absolute time (`Date`) passed as an argument ([8ae89b1](https://github.com/reactivex/rxjs/commit/8ae89b19a095541eb3dfe6e6d9f26367486c435e))
- **fromEvent:** properly teardown for ArrayLike targets ([066de74](https://github.com/reactivex/rxjs/commit/066de7408810864891b9fd16e05c6c8b4ca88087))
- **ReplaySubject:** no longer buffers additional values after it's already stopped ([#5696](https://github.com/reactivex/rxjs/issues/5696)) ([a08232b](https://github.com/reactivex/rxjs/commit/a08232be6dcab74e94cfbb17cc5138050bcd6ddb))
- **scan:** proper indexes when seed is not supplied ([f93fb9c](https://github.com/reactivex/rxjs/commit/f93fb9c1fb7434c97e1d156370756159c5f2b077)), closes [#4348](https://github.com/reactivex/rxjs/issues/4348) [#3879](https://github.com/reactivex/rxjs/issues/3879)
- **windowTime:** Passing no creation interval will now properly open new window when old one closes ([cbd0ac0](https://github.com/reactivex/rxjs/commit/cbd0ac0478730ec10172b57210e7d269d1ce62a2))

### Code Refactoring

- **Massive Size Reduction:** reduced the size of all operator implementations as well as other utilities and types ([#5729](https://github.com/reactivex/rxjs/issues/5729)) ([4d3fc23](https://github.com/reactivex/rxjs/commit/fc41e13a1b9a05fc242c1369b4f597c931bd28b5))

### Features

- **onUnhandledError:** configuration point added for unhandled errors ([#5681](https://github.com/reactivex/rxjs/issues/5681)) ([3485dd5](https://github.com/reactivex/rxjs/commit/3485dd5149b731e1103d2d070e3892735cbacef1))
- **skipLast:** counts zero or less will mirror the source ([02e113b](https://github.com/reactivex/rxjs/commit/02e113b3345a9efe8f7c29f8b9c1c0d088aaf726))

### BREAKING CHANGES

- **skipLast:** `skipLast` will no longer error when passed a negative number, rather it will simply return the source, as though `0` was passed.
- **map:** `thisArg` will now default to `undefined`. The previous default of `MapSubscriber` never made any sense. This will only affect code that calls map with a `function` and references `this` like so: `source.pipe(map(function () { console.log(this); }))`. There wasn't anything useful about doing this, so the breakage is expected to be very minimal. If anything we're no longer leaking an implementation detail.
- **onUnhandledError:** Errors that occur during setup of an observable subscription after the subscription has emitted an error or completed will now throw in their own call stack. Before it would call `console.warn`. This is potentially breaking in edge cases for node applications, which may be configured to terminate for unhandled exceptions. In the unlikely event this affects you, you can configure the behavior to `console.warn` in the new configuration setting like so: `import { config } from 'rxjs'; config.onUnhandledError = (err) => console.warn(err);`

# [7.0.0-beta.5](https://github.com/reactivex/rxjs/compare/7.0.0-beta.4...7.0.0-beta.5) (2020-09-03)

### Bug Fixes

- **ajax:** Allow XHR to perform body serialization and set content-type where possible ([d8657ed](https://github.com/reactivex/rxjs/commit/d8657ede8d9620ac2a7d61557e1f1d0e89b0b52a)), closes [#2837](https://github.com/reactivex/rxjs/issues/2837)
- **ajax:** Do not mutate headers passed as arguments ([0d66ba4](https://github.com/reactivex/rxjs/commit/0d66ba458f07fba51cfc73440d01ef453c24cda7)), closes [#2801](https://github.com/reactivex/rxjs/issues/2801)
- **bindCallback:** now emits errors that happen after callback ([2bddd31](https://github.com/reactivex/rxjs/commit/2bddd317fad962ad375de4a04dd528b02479ec5b))
- **bindNodeCallback:** now emits errors that happen after callback ([edc28cf](https://github.com/reactivex/rxjs/commit/edc28cfd13ba3d7fadc24ea3c20ec8ca5a19064d))
- **buffer:** Ensure notifier is subscribed after source ([#5654](https://github.com/reactivex/rxjs/issues/5654)) ([c088b0e](https://github.com/reactivex/rxjs/commit/c088b0eca904ab835b23df629d472003d6a82561)), closes [#2195](https://github.com/reactivex/rxjs/issues/2195) [#1754](https://github.com/reactivex/rxjs/issues/1754)
- **catchError:** ensure proper handling of async return for synchronous source error handling ([#5627](https://github.com/reactivex/rxjs/issues/5627)) ([1b29d4b](https://github.com/reactivex/rxjs/commit/1b29d4b6d42e3d6b649f9f2c4bb718f343233d83)), closes [#5115](https://github.com/reactivex/rxjs/issues/5115)
- **catchError:** inner synchronous observables will properly terminate ([#5655](https://github.com/reactivex/rxjs/issues/5655)) ([d3fd2fb](https://github.com/reactivex/rxjs/commit/d3fd2fb2bd619b79d0c4afebc3c10299afbca262))
- **errors:** Custom RxJS errors now all have a call stack ([#5686](https://github.com/reactivex/rxjs/issues/5686)) ([9bb046c](https://github.com/reactivex/rxjs/commit/9bb046c744cc1f9438a805849b655946e5793936)), closes [#4250](https://github.com/reactivex/rxjs/issues/4250)
- **onErrorResumeNext:** observables always finalized before moving to next source ([#5650](https://github.com/reactivex/rxjs/issues/5650)) ([ff68ad2](https://github.com/reactivex/rxjs/commit/ff68ad2caa3d275a23416984fab5570d3fed9458))
- **package.json:** change homepage setting to official docs site. ([#5669](https://github.com/reactivex/rxjs/issues/5669)) ([e57c402](https://github.com/reactivex/rxjs/commit/e57c402b29288f61fe886b00e51817730bcb320b))
- **repeat:** Ensure teardown happens between repeated synchronous obs… ([#5620](https://github.com/reactivex/rxjs/issues/5620)) ([0ca8a65](https://github.com/reactivex/rxjs/commit/0ca8a65b73aea93172366ca67207b53e3e3e77a8))
- **repeatWhen:** Ensure teardown happens between repeat subscriptions ([#5625](https://github.com/reactivex/rxjs/issues/5625)) ([98356f4](https://github.com/reactivex/rxjs/commit/98356f4ebefdba1f5a14edbd96de1592694a01a8))
- **retry:** Ensure teardown happens before resubscription with synchronous observables ([6f90597](https://github.com/reactivex/rxjs/commit/6f90597e51e038dabd8397b9f066ab4e3d344a5b)), closes [#5620](https://github.com/reactivex/rxjs/issues/5620)
- **retryWhen:** Ensure subscription tears down between retries ([#5623](https://github.com/reactivex/rxjs/issues/5623)) ([6752af7](https://github.com/reactivex/rxjs/commit/6752af7c1839baf3cd7ed9d024499de61a2477e9))
- **throttleTime:** ensure the spacing between throttles is always at least the throttled amount ([#5687](https://github.com/reactivex/rxjs/issues/5687)) ([ea84fc4](https://github.com/reactivex/rxjs/commit/ea84fc4dce84e32598701f79d9449be00a05352c)), closes [#3712](https://github.com/reactivex/rxjs/issues/3712) [#4864](https://github.com/reactivex/rxjs/issues/4864) [#2727](https://github.com/reactivex/rxjs/issues/2727) [#4727](https://github.com/reactivex/rxjs/issues/4727) [#4429](https://github.com/reactivex/rxjs/issues/4429)
- **zip:** zip operators and functions are now able to zip all iterable sources ([#5688](https://github.com/reactivex/rxjs/issues/5688)) ([02c3a1b](https://github.com/reactivex/rxjs/commit/02c3a1b70c0e96b784a3c5c214c0f89c5ebdd696)), closes [#4304](https://github.com/reactivex/rxjs/issues/4304)
- `switchMap` and `exhaustMap` behave correctly with re-entrant code. ([c289688](https://github.com/reactivex/rxjs/commit/c289688f5e1f33ec21306b4d2f5539dd19f963f2))
- **webSocket:** close websocket connection attempt on unsubscribe ([e1a671c](https://github.com/reactivex/rxjs/commit/e1a671cbd7f5a6ce547ed9ee6ce98c22264500f4)), closes [#4446](https://github.com/reactivex/rxjs/issues/4446)

### Code Refactoring

- **ajax:** Use simple Observable ([17b9add](https://github.com/reactivex/rxjs/commit/17b9add03a90aec6e708a87c0fc387745f0b9df6))
- **Subscriber:** remove \_unsubscribeAndRecycle ([d879c3f](https://github.com/reactivex/rxjs/commit/d879c3f3ae4b1de5660d1613bb8b300e7194d581))
- **VirtualTimeScheduler:** remove sortActions from public API ([#5657](https://github.com/reactivex/rxjs/issues/5657)) ([a468f88](https://github.com/reactivex/rxjs/commit/a468f881c8c02195b089889486d1a94fab2771e0))

### Features

- **combineLatest:** add N-args signature for observable inputs ([#5488](https://github.com/reactivex/rxjs/issues/5488)) ([fcc47e7](https://github.com/reactivex/rxjs/commit/fcc47e75a4c811199c5071144172f4d06ffc7c70))
- **Subscription:** `add` no longer returns unnecessary Subscription reference ([#5656](https://github.com/reactivex/rxjs/issues/5656)) ([4de604e](https://github.com/reactivex/rxjs/commit/4de604ea66261f597af11918aec53cd94590b30f))
- **Subscription:** `remove` will now remove any teardown by reference ([#5659](https://github.com/reactivex/rxjs/issues/5659)) ([1531152](https://github.com/reactivex/rxjs/commit/15311529fa1b880ed469b6c253cd0be7ff2f98a1))
- **throwError:** now accepts a factory to create the error ([#5647](https://github.com/reactivex/rxjs/issues/5647)) ([dad270a](https://github.com/reactivex/rxjs/commit/dad270afcf496de74b4392024191715d7dbef4f5)), closes [#5617](https://github.com/reactivex/rxjs/issues/5617)
- **useDeprecatedNextContext:** Puts deprecated next context behavior behind a flag ([dfdef5d](https://github.com/reactivex/rxjs/commit/dfdef5dcaf52363be59359786aef8bc733197b43))
- support schedulers within run ([#5619](https://github.com/reactivex/rxjs/issues/5619)) ([c63de0d](https://github.com/reactivex/rxjs/commit/c63de0d380a923987aab587720473fad1d205d71))

### Performance Improvements

- **SafeSubscriber:** avoid using `Object.create` ([40a9e77](https://github.com/reactivex/rxjs/commit/40a9e77fe3d75df9161ad0093f54750b70f57245))

### BREAKING CHANGES

- **ajax:**
  - `ajax` body serialization will now use default XHR behavior in all cases. If the body is a `Blob`, `ArrayBuffer`, any array buffer view (like a byte sequence, e.g. `Uint8Array`, etc), `FormData`, `URLSearchParams`, `string`, or `ReadableStream`, default handling is use. If the `body` is otherwise `typeof` `"object"`, then it will be converted to JSON via `JSON.stringify`, and the `Content-Type` header will be set to `application/json;charset=utf-8`. All other types will emit an error.
  - The `Content-Type` header passed to `ajax` configuration no longer has any effect on the serialization behavior of the AJAX request.
  - For TypeScript users, `AjaxRequest` is no longer the type that should be explicitly used to create an `ajax`. It is now `AjaxConfig`, although the two types are compatible, only `AjaxConfig` has `progressSubscriber` and `createXHR`.

* **zip:** `zip` operators will no longer iterate provided iterables "as needed", instead the iterables will be treated as push-streams just like they would be everywhere else in RxJS. This means that passing an endless iterable will result in the thread locking up, as it will endlessly try to read from that iterable. This puts us in-line with all other Rx implementations. To work around this, it is probably best to use `map` or some combination of `map` and `zip`. For example, `zip(source$, iterator)` could be `source$.pipe(map(value => [value, iterator.next().value]))`.

* **Subscription:** `add` no longer returns an unnecessary Subscription reference. This was done to prevent confusion caused by a legacy behavior. You can now add and remove functions and Subscriptions as teardowns to and from a `Subscription` using `add` and `remove` directly. Before this, `remove` only accepted subscriptions.

* **RxJS Error types** Tests that are written with naive expectations against errors may fail now that errors have a proper `stack` property. In some testing frameworks, a deep equality check on two error instances will check the values in `stack`, which could be different.

* **Undocumented Behaviors/APIs Removed**:

  - `unsubscribe` no longer available via the `this` context of observer functions. To reenable, set `config.useDeprecatedNextContext = true` on the rxjs `config` found at `import { config } from 'rxjs';`. Note that enabling this will result in a performance penalty for all consumer subscriptions.
  - Leaked implementation detail `_unsubscribeAndRecycle` of `Subscriber` has been removed. Just use new `Subscription` objects
  - Removed an undocumented behavior where passing a negative count argument to `retry` would result in an observable that repeats forever.
  - An undocumented behavior where passing a negative count argument to `repeat` would result in an observable that repeats forever.
  - The static `sortActions` method on `VirtualTimeScheduler` is no longer publicly exposed by our TS types.

* **throwError:** In an extreme corner case for usage, `throwError` is no longer able to emit a function as an error directly. If you need to push a function as an error, you will have to use the factory function to return the function like so: `throwError(() => functionToEmit)`, in other words `throwError(() => () => console.log('called later'))`.

# [7.0.0-beta.4](https://github.com/reactivex/rxjs/compare/7.0.0-beta.1...7.0.0-beta.4) (2020-08-02)

### Bug Fixes

- **ajax:** Partial observers passed to `progressSubscriber` will no longer error ([25d279f](https://github.com/reactivex/rxjs/commit/25d279f0b45d07f39bfb87b19bc7e2279df8b542))
- **ajax:** Unparsable responses will no longer prevent full AjaxError from being thrown ([605ee55](https://github.com/reactivex/rxjs/commit/605ee550e5efc266b5dc5d3a9756c7c3b3968a61))
- **animationFrames:** emit the timestamp from the rAF's callback ([#5438](https://github.com/reactivex/rxjs/issues/5438)) ([c980ae6](https://github.com/reactivex/rxjs/commit/c980ae65ee1b585e8ed66a366eb534ac3e50c205))
- Ensure unsubscriptions/teardowns on internal subscribers are idempotent ([#5465](https://github.com/reactivex/rxjs/issues/5465)) ([3e39749](https://github.com/reactivex/rxjs/commit/3e39749a58ca663c17f5f0354b0f27532fb6d319)), closes [#5464](https://github.com/reactivex/rxjs/issues/5464)
- **timeout:** defer error creation until timeout occurs ([#5497](https://github.com/reactivex/rxjs/issues/5497)) ([3be9840](https://github.com/reactivex/rxjs/commit/3be98404fafd5a8de758deb4e0d103a7b60aa31e)), closes [#5491](https://github.com/reactivex/rxjs/issues/5491)

### Code Refactoring

- **ajax:** Drop support for IE10 and lower ([0eaadd6](https://github.com/reactivex/rxjs/commit/0eaadd60c716050f5e3701d513a028a9cd49085a))
- **Observable:** Update property and method types ([#5572](https://github.com/reactivex/rxjs/issues/5572)) ([144b626](https://github.com/reactivex/rxjs/commit/144b626c3905640b4adeb2b97e722912eff1b264))

### Features

- **combineLatest:** support for observable dictionaries ([#5022](https://github.com/reactivex/rxjs/issues/5022)) ([#5363](https://github.com/reactivex/rxjs/issues/5363)) ([f5278aa](https://github.com/reactivex/rxjs/commit/f5278aa89ea164caf5cf10e77d7bd00eff26fc0f))
- **TestScheduler:** add an animate "run mode" helper ([#5607](https://github.com/reactivex/rxjs/issues/5607)) ([edd6731](https://github.com/reactivex/rxjs/commit/edd67313814bfc32e8a5129d8049e4d4678cd35d))
- **timeout:** One timeout to rule them all ([def1d34](https://github.com/reactivex/rxjs/commit/def1d346b43008bc413a3ac985e1611bbbf62003))

### BREAKING CHANGES

- **ajax:** In an extreme corner-case... If an error occurs, the responseType is `"json"`, we're in IE, and the `responseType` is not valid JSON, the `ajax` observable will no longer emit a syntax error, rather it will emit a full `AjaxError` with more details.
- **ajax:** Ajax implementation drops support for IE10 and lower. This puts us in-line with other implementations and helps clean up code in this area
- **Observable:** `lift` no longer exposed. It was _NEVER_ documented that end users of the library should be creating operators using `lift`. Lift has a [variety of issues](https://github.com/ReactiveX/rxjs/issues/5431) and was always an internal implementation detail of rxjs that might have been used by a few power users in the early days when it had the most value. The value of `lift`, originally, was that subclassed `Observable`s would compose through all operators that implemented lift. The reality is that feature is not widely known, used, or supported, and it was never documented as it was very experimental when it was first added. Until the end of v7, `lift` will remain on Observable. Standard JavaScript users will notice no difference. However, TypeScript users might see complaints about `lift` not being a member of observable. To workaround this issue there are two things you can do: 1. Rewrite your operators as [outlined in the documentation](https://rxjs.dev/guide/operators), such that they return `new Observable`. or 2. cast your observable as `any` and access `lift` that way. Method 1 is recommended if you do not want things to break when we move to version 8.

# [7.0.0-beta.3](https://github.com/reactivex/rxjs/compare/7.0.0-beta.1...7.0.0-beta.3) (2020-07-30)

### Bug Fixes

- **perf:** Ensure unsubscriptions/teardowns on internal subscribers are idempotent ([#5465](https://github.com/reactivex/rxjs/issues/5465)) ([3e39749](https://github.com/reactivex/rxjs/commit/3e39749a58ca663c17f5f0354b0f27532fb6d319)), closes [#5464](https://github.com/reactivex/rxjs/issues/5464)
- **timeout:** defer error creation until timeout occurs ([#5497](https://github.com/reactivex/rxjs/issues/5497)) ([3be9840](https://github.com/reactivex/rxjs/commit/3be98404fafd5a8de758deb4e0d103a7b60aa31e)), closes [#5491](https://github.com/reactivex/rxjs/issues/5491)

### Code Refactoring

- **perf:** Reduce memory pressure by no longer retaining outer values across the majority of operators. ([#5610](https://github.com/reactivex/rxjs/pull/5610)) ([bff1827](https://github.com/ReactiveX/rxjs/commit/bff18272dca23938a5f5b57cec6eb8d8be5bfddf))
- **Observable:** Update property and method types ([#5572](https://github.com/reactivex/rxjs/issues/5572)) ([144b626](https://github.com/reactivex/rxjs/commit/144b626c3905640b4adeb2b97e722912eff1b264))

### Features

- **combineLatest:** support for observable dictionaries ([#5022](https://github.com/reactivex/rxjs/issues/5022)) ([#5363](https://github.com/reactivex/rxjs/issues/5363)) ([f5278aa](https://github.com/reactivex/rxjs/commit/f5278aa89ea164caf5cf10e77d7bd00eff26fc0f))

### BREAKING CHANGES

- **Observable:** `lift` no longer exposed. It was _never_ documented that end users of the library should be creating operators using `lift`. Lift has a [variety of issues](https://github.com/ReactiveX/rxjs/issues/5431) and was always an internal implementation detail of rxjs that might have been used by a few power users in the early days when it had the most value. The value of `lift`, originally, was that subclassed `Observable`s would compose through all operators that implemented lift. The reality is that feature is not widely known, used, or supported, and it was never documented as it was very experimental when it was first added. Until the end of v7, `lift` will remain on Observable. Standard JavaScript users will notice no difference. However, TypeScript users might see complaints about `lift` not being a member of observable. To workaround this issue there are two things you can do: 1. Rewrite your operators as [outlined in the documentation](https://rxjs.dev/guide/operators), such that they return `new Observable`. or 2. cast your observable as `any` and access `lift` that way. It is recommended that operators be implemented in terms of functions that return `(source: Observable<T>) => new Observable<R>(...)`, per the documentation/guide.

# [7.0.0-beta.2](https://github.com/reactivex/rxjs/compare/7.0.0-beta.1...7.0.0-beta.2) (2020-07-03)

### Bug Fixes

- **dependencies:** Move accidental dependency on `typedoc` to dev-dependencies. ([#5566](https://github.com/reactivex/rxjs/issues/5566)) ([45702bf](https://github.com/ReactiveX/rxjs/commit/45702bf6cd1b4a150f47b2a1d273f1ee31ca2482))

# [7.0.0-beta.1](https://github.com/reactivex/rxjs/compare/7.0.0-beta.0...7.0.0-beta.1) (2020-07-02)

### Bug Fixes

- **pluck:** operator breaks with null/undefined inputs. ([#5524](https://github.com/reactivex/rxjs/issues/5524)) ([c5f6550](https://github.com/reactivex/rxjs/commit/c5f65508505cf1f90560e6be76425e09c455bec3))
- **shareReplay:** no longer misses synchronous values from source ([92452cc](https://github.com/reactivex/rxjs/commit/92452cc20021141aa0f047c7e5af569a413143e5))
- **interop:** chain interop/safe subscriber unsubscriptions correctly ([#5472](https://github.com/reactivex/rxjs/issues/5472)) ([98ad0eb](https://github.com/reactivex/rxjs/commit/98ad0eba6bc079851b44951f3963e8aae0abf861)), closes [#5469](https://github.com/reactivex/rxjs/issues/5469) [#5311](https://github.com/reactivex/rxjs/issues/5311) [#2675](https://github.com/reactivex/rxjs/issues/2675)
- **finalize:** chain subscriptions for interop with finalize ([#5239](https://github.com/reactivex/rxjs/issues/5239)) ([04ba662](https://github.com/reactivex/rxjs/commit/04ba6621fe9e09238e1796217d04107e52dd36d5)), closes [#5237](https://github.com/reactivex/rxjs/issues/5237) [#5237](https://github.com/reactivex/rxjs/issues/5237)
- **animationFrameScheduler:** don't execute rescheduled animation frame and asap actions in flush ([#5399](https://github.com/reactivex/rxjs/issues/5399)) ([33c9c8c](https://github.com/reactivex/rxjs/commit/33c9c8cf7e247d4ad4d7318bfd02e8e5bedb0f40)), closes [#4972](https://github.com/reactivex/rxjs/issues/4972) [#5397](https://github.com/reactivex/rxjs/issues/5397)
- **iterables:** errors thrown from iterables now properly propagated ([#5444](https://github.com/reactivex/rxjs/issues/5444)) ([75d4c2f](https://github.com/reactivex/rxjs/commit/75d4c2f33d2e2121b2a316849044ad17ab28dbaf))
- **finalize:** callback will be called after the source observable is torn down. ([0d7b7c1](https://github.com/reactivex/rxjs/commit/0d7b7c14e34eed43fb2ad1386281800fa3ae8aec)), closes [#5357](https://github.com/reactivex/rxjs/issues/5357)
- **Notification:** typing improvements ([#5478](https://github.com/reactivex/rxjs/issues/5478)) ([96868ac](https://github.com/reactivex/rxjs/commit/96868ac754c0147a9aa61182185f27224eb7f11a))
- **TestScheduler:** support empty subscription marbles ([#5502](https://github.com/reactivex/rxjs/issues/5502)) ([e65696e](https://github.com/reactivex/rxjs/commit/e65696e2f7f7338659a873f6653026b33b9011a9)), closes [#5499](https://github.com/reactivex/rxjs/issues/5499)
- **expand:** now works properly with asynchronous schedulers ([294b27e](https://github.com/reactivex/rxjs/commit/294b27eb6a96e8edee3af35e6aaaef50628376e4))
- **subscribeOn:** allow Infinity as valid delay ([#5500](https://github.com/reactivex/rxjs/issues/5500)) ([cd7d649](https://github.com/reactivex/rxjs/commit/cd7d64901e82fd7fb5e8407f1f30828906fac420))
- **Subject:** resolve issue where Subject constructor errantly allowed an argument ([#5476](https://github.com/reactivex/rxjs/issues/5476)) ([e1d35dc](https://github.com/reactivex/rxjs/commit/e1d35dc258edea0237ef49a31f7b34c058755969))
- **Subject:** no default generic ([e678e81](https://github.com/reactivex/rxjs/commit/e678e81ba80f5bcc27b0e956295ce2fc8dfe4576))
- **defer:** No longer allows `() => undefined` to observableFactory (#5449) ([1ae937a](https://github.com/reactivex/rxjs/commit/1ae937a8e594aef96b93313bb3c68ea910e6f528)), closes [#5449](https://github.com/reactivex/rxjs/issues/5449)
- **single:** Corrected behavior for `single(() => false)` on empty observables. (#5325) ([27931bc](https://github.com/reactivex/rxjs/commit/27931bcfd2aa864e277d3e72128c57e807b28bb0)), closes [#5325](https://github.com/reactivex/rxjs/issues/5325)
- **take/takeLast**: Properly assert number types at runtime (#5326) ([5efc474](https://github.com/reactivex/rxjs/commit/5efc474161c9196dbdf4803a9cc444a547067549)), closes [#5326](https://github.com/reactivex/rxjs/issues/5326)

### Features

- **Observable:** Remove async iteration ([#5492](https://github.com/reactivex/rxjs/issues/5492)) ([8f43e71](https://github.com/reactivex/rxjs/commit/8f43e71f5692119e57a7acc5817c146d0b288e8c))
- **groupBy:** Add typeguards support for groupBy ([#5441](https://github.com/reactivex/rxjs/issues/5441)) ([da382da](https://github.com/reactivex/rxjs/commit/da382da4cdcc6e7ab1ffc6a499f4f7f5ea7de130))
- **raceWith:** add raceWith, the renamed `race` operator ([#5303](https://github.com/reactivex/rxjs/issues/5303)) ([ca7f370](https://github.com/reactivex/rxjs/commit/ca7f370d8379f22526cfb17d40deff53e1358742))
- **fetch:** add selector ([#5306](https://github.com/reactivex/rxjs/issues/5306)) ([99b5af1](https://github.com/reactivex/rxjs/commit/99b5af1af5d169d55d454ff8e27d88105cee4b6f)), closes [#4744](https://github.com/reactivex/rxjs/issues/4744)
- **TimestampProvider:** Reduced scheduler footprint for default usage of shareReplay, timeInterval, and timestamp ([#4973](https://github.com/reactivex/rxjs/issues/4973)) ([b2e67e3](https://github.com/reactivex/rxjs/commit/b2e67e3139f0be1fb000ba42bb42c5ba60cc803a))

### BREAKING CHANGES

- `Notification.createNext(undefined)` will no longer return the exact same reference every time.
- Type signatures tightened up around `Notification` and `dematerialize`, may uncover issues with invalid types passed to those operators.
- Experimental support for `for await` as been removed. Use https://github.com/benlesh/rxjs-for-await instead.
- `defer` no longer allows factories to return `void` or `undefined`. All factories passed to defer must return a proper `ObservableInput`, such as `Observable`, `Promise`, et al. To get the same behavior as you may have relied on previously, `return EMPTY` or `return of()` from the factory.
- `single` operator will now throw for scenarios where values coming in are either not present, or do not match the provided predicate. Error types have thrown have also been updated, please check documentation for changes.
- `take` and will now throw runtime error for arguments that are negative or NaN, this includes non-TS calls like `take()`.

- `takeLast` now has runtime assertions that throw `TypeError`s for invalid arguments. Calling takeLast without arguments or with an argument that is `NaN` will throw a `TypeError`
- `ReplaySubject` no longer schedules emissions when a scheduler is provided. If you need that behavior,
  please compose in `observeOn` using `pipe`, for example: `new ReplaySubject(2, 3000).pipe(observeOn(asap))`

- `timestamp` operator accepts a `TimestampProvider`, which is any object with a `now` method
  that returns a number. This means pulling in less code for the use of the `timestamp` operator. This may cause
  issues with `TestScheduler` run mode. (Issue here: https://github.com/ReactiveX/rxjs/issues/5553)

# [7.0.0-beta.0](https://github.com/reactivex/rxjs/compare/7.0.0-alpha.1...7.0.0-beta.0) (2020-04-03)

### Bug Fixes

- **mergeMapTo:** remove redundant/unused generic ([#5299](https://github.com/reactivex/rxjs/issues/5299)) ([d67b7da](https://github.com/reactivex/rxjs/commit/d67b7dafbacb3aac8f4dd7f215fe2d2c602f0d36))
- **ajax:** AjaxTimeoutErrorImpl extends AjaxError ([#5226](https://github.com/reactivex/rxjs/issues/5226)) ([a8da8dc](https://github.com/reactivex/rxjs/commit/a8da8dcc899342d3bb6d2d913247d9e734095287))
- **delay:** emit complete notification as soon as possible ([63b8797](https://github.com/reactivex/rxjs/commit/63b8797fbeed09eb675ea64b0b83607cef1367a9)), closes [#4249](https://github.com/reactivex/rxjs/issues/4249)
- **endWith:** will properly type N arguments ([#5246](https://github.com/reactivex/rxjs/issues/5246)) ([81ee1f7](https://github.com/reactivex/rxjs/commit/81ee1f72408854f4017615fe7949edf5dd50533b))
- **fetch:** don't leak event listeners added to passed-in signals ([#5305](https://github.com/reactivex/rxjs/issues/5305)) ([d4d6c47](https://github.com/reactivex/rxjs/commit/d4d6c47d8abccc8cbe17e46192fc1eaa42d2d023))
- **TestScheduler:** Subclassing TestScheduler needs RunHelpers ([#5138](https://github.com/reactivex/rxjs/issues/5138)) ([927d5d9](https://github.com/reactivex/rxjs/commit/927d5d90ab5f12a79cd50f7290b4f8df1e83ecfc))
- **pipe:** Special handling for 0-arg case. ([#4936](https://github.com/reactivex/rxjs/issues/4936)) ([290fa51](https://github.com/reactivex/rxjs/commit/290fa51c44881f25f2fe4cf9885028396c7fd74c))
- **pluck:** fix pluck's catch-all signature for better type safety ([#5192](https://github.com/reactivex/rxjs/issues/5192)) ([e0c5b7c](https://github.com/reactivex/rxjs/commit/e0c5b7c790bb9d99fa8bee26c805b5e70c1e456b))
- **pluck:** param type now accepts number and symbol ([9697b69](https://github.com/reactivex/rxjs/commit/9697b695c23c3dcb614e6a70be63a94ffcd86ed9))
- **startWith:** accepts N arguments and returns correct type ([#5247](https://github.com/reactivex/rxjs/issues/5247)) ([150ed8b](https://github.com/reactivex/rxjs/commit/150ed8b75909b0e0bb9dc8928287ebdc47e19c51))
- **combineLatestWith:** and zipWith infer types from n-arguments ([#5257](https://github.com/reactivex/rxjs/issues/5257)) ([3e282a5](https://github.com/reactivex/rxjs/commit/3e282a58b1baf7aa03b17142f858bca09a542adf))
- **race:** support N args in static race and ensure observable returned ([#5286](https://github.com/reactivex/rxjs/issues/5286)) ([6d901cb](https://github.com/reactivex/rxjs/commit/6d901cbb0c0f2aa3fc5a02ef895cc9e9a7a09243))
- **toPromise:** correct toPromise return type ([#5072](https://github.com/reactivex/rxjs/issues/5072)) ([b1c3573](https://github.com/reactivex/rxjs/commit/b1c35738204b5b1a5d325a16e70cdbf25b523976))
- **fromFetch:** don't reassign closed-over parameter in fromFetch ([#5234](https://github.com/reactivex/rxjs/issues/5234)) ([37d2d99](https://github.com/reactivex/rxjs/commit/37d2d99762264ef5faabc0ce4f56d7aab51806dc)), closes [#5233](https://github.com/reactivex/rxjs/issues/5233) [#5233](https://github.com/reactivex/rxjs/issues/5233)

### Features

- add `lastValueFrom` and `firstValueFrom` methods ([#5295](https://github.com/reactivex/rxjs/issues/5295)) ([e69b765](https://github.com/reactivex/rxjs/commit/e69b76584d6872b3c55aa1bdf39c8984e9d9b00e))
- RxJS now supports first-class interop with AsyncIterables ([4fa9d01](https://github.com/reactivex/rxjs/commit/4fa9d016a83049d014d77b89c56301e42db16b4d))
- **combineLatestWith:** adds `combineLatestWith` - renamed legacy `combineLatest` operator ([#5251](https://github.com/reactivex/rxjs/issues/5251)) ([6d7b146](https://github.com/reactivex/rxjs/commit/6d7b1469110b405405549c9b6c311d2621738353))
- **retry:** add config to reset error count on successful emission ([#5280](https://github.com/reactivex/rxjs/issues/5280)) ([ab6e9fc](https://github.com/reactivex/rxjs/commit/ab6e9fc32c19c1f14f8f59459db75312e75b9351))
- **zipWith:** add `zipWith` which is just a rename of legacy `zip` operator ([#5249](https://github.com/reactivex/rxjs/issues/5249)) ([86b6a27](https://github.com/reactivex/rxjs/commit/86b6a272fd48c4712adba78963e05bb759ecf4f9))

### BREAKING CHANGES

- **startWith:** `startWith` will return incorrect types when called with more than 7 arguments and a scheduler. Passing scheduler to startWith is deprecated
- **toPromise:** toPromise return type now returns `T | undefined` in TypeScript, which is correct, but may break builds.

# [7.0.0-alpha.1](https://github.com/reactivex/rxjs/compare/7.0.0-alpha.0...7.0.0-alpha.1) (2019-12-27)

### Bug Fixes

- chain subscriptions from observables that belong to other instances of RxJS (e.g. in node_modules) ([#5059](https://github.com/reactivex/rxjs/issues/5059)) ([d7f7078](https://github.com/reactivex/rxjs/commit/d7f7078))
- clear subscription on `shareReplay` completion ([#5044](https://github.com/reactivex/rxjs/issues/5044)) ([35e600f](https://github.com/reactivex/rxjs/commit/35e600f)), closes [#5034](https://github.com/reactivex/rxjs/issues/5034)
- **closure:** Annotate next() for ReplaySubject ([#5088](https://github.com/reactivex/rxjs/issues/5088)) ([8687fbd](https://github.com/reactivex/rxjs/commit/8687fbd))
- **closure:** static prop frameTimeFactor being collapsed when compiled with closure. ([39872c9](https://github.com/reactivex/rxjs/commit/39872c9))
- **docs:** remove repetitive op3() in example ([#5043](https://github.com/reactivex/rxjs/issues/5043)) ([e17df33](https://github.com/reactivex/rxjs/commit/e17df33))
- **filter:** Fix overload order for filter to support inferring the generic type ([#5024](https://github.com/reactivex/rxjs/issues/5024)) ([8255365](https://github.com/reactivex/rxjs/commit/8255365))
- **fromFetch:** passing already aborted signal to init aborts fetch ([0e4849a](https://github.com/reactivex/rxjs/commit/0e4849a))

### Features

- **concatWith:** adds concatWith ([#4988](https://github.com/reactivex/rxjs/issues/4988)) ([dc89736](https://github.com/reactivex/rxjs/commit/dc89736))

# [7.0.0-alpha.0](https://github.com/reactivex/rxjs/compare/6.5.2...7.0.0-alpha.0) (2019-09-18)

### Bug Fixes

- missing package.json in rxjs/fetch ([#5001](https://github.com/reactivex/rxjs/issues/5001)) ([f4bee07](https://github.com/reactivex/rxjs/commit/f4bee07))
- **filter:** Resolve TS build failures for certain situations where Boolean is the predicate ([77c7dfd](https://github.com/reactivex/rxjs/commit/77c7dfd))
- **pluck:** key union type strictness ([#4585](https://github.com/reactivex/rxjs/issues/4585)) ([bd5ec2d](https://github.com/reactivex/rxjs/commit/bd5ec2d))
- **race:** ignore latter sources after first complete or error ([#4809](https://github.com/reactivex/rxjs/issues/4809)) ([f31c3df](https://github.com/reactivex/rxjs/commit/f31c3df)), closes [#4808](https://github.com/reactivex/rxjs/issues/4808)
- **scan/reduce:** Typings correct for mixed seed/value types ([#4858](https://github.com/reactivex/rxjs/issues/4858)) ([b89ebe5](https://github.com/reactivex/rxjs/commit/b89ebe5))
- **scheduled:** import from relative paths ([#4832](https://github.com/reactivex/rxjs/issues/4832)) ([1d37a87](https://github.com/reactivex/rxjs/commit/1d37a87))
- **TS:** Error impls now properly type `this` ([#4978](https://github.com/reactivex/rxjs/issues/4978)) ([7606dc7](https://github.com/reactivex/rxjs/commit/7606dc7))
- **TS:** fix type inference for defaultIfEmpty. ([#4833](https://github.com/reactivex/rxjs/issues/4833)) ([9b5ce2f](https://github.com/reactivex/rxjs/commit/9b5ce2f))
- **types:** add Boolean signature to filter ([#4961](https://github.com/reactivex/rxjs/issues/4961)) ([259853e](https://github.com/reactivex/rxjs/commit/259853e)), closes [#4959](https://github.com/reactivex/rxjs/issues/4959) [/github.com/ReactiveX/rxjs/issues/4959#issuecomment-520629091](https://github.com//github.com/ReactiveX/rxjs/issues/4959/issues/issuecomment-520629091)

### Features

- **animationFrames:** Adds an observable of animationFrames ([#5021](https://github.com/reactivex/rxjs/issues/5021)) ([6a4cd68](https://github.com/reactivex/rxjs/commit/6a4cd68))
- **concat:** can infer N types ([6c0cbc4](https://github.com/reactivex/rxjs/commit/6c0cbc4))
- **of:** Update of typings ([e8adbb5](https://github.com/reactivex/rxjs/commit/e8adbb5))
- **rxjs-compat:** removed for v7 ([#4839](https://github.com/reactivex/rxjs/issues/4839)) ([79b1b95](https://github.com/reactivex/rxjs/commit/79b1b95))
- **TestScheduler:** expose `frameTimeFactor` property ([#4977](https://github.com/reactivex/rxjs/issues/4977)) ([8c32ed0](https://github.com/reactivex/rxjs/commit/8c32ed0))
- **TS:** Update to TypeScript 3.5.3 ([741a136](https://github.com/reactivex/rxjs/commit/741a136))

### BREAKING CHANGES

- **concat:** Generic signature changed. Recommend not explicitly passing generics, just let inference do its job. If you must, cast with `as`.
- **of:** Generic signature changed, do not specify generics, allow them to be inferred or use `as`
- **of:** Use with more than 9 arguments, where the last argument is a `SchedulerLike` may result in the wrong type which includes the `SchedulerLike`, even though the run time implementation does not support that. Developers should be using `scheduled` instead
- **TS:** RxJS requires TS 3.5
- **rxjs-compat:** `rxjs/Rx` is no longer a valid import site.
- **rxjs-compat:** `rxjs-compat` is not published for v7 (yet)
- **race:** `race()` will no longer subscribe to subsequent observables if a provided source synchronously errors or completes. This means side effects that might have occurred during subscription in those rare cases will no longer occur.

## [6.5.3](https://github.com/reactivex/rxjs/compare/6.5.2...6.5.3) (2019-09-03)

### Bug Fixes

- **general:** Refactor modules so they don't show side effects in some tools ([#4769](https://github.com/reactivex/rxjs/issues/4769)) ([9829c5e0](https://github.com/reactivex/rxjs/commit/9829c5e0))
- **defer:** restrict allowed factory types ([#4835](https://github.com/reactivex/rxjs/issues/4835)) ([40a22096](https://github.com/reactivex/rxjs/commit/40a22096))

## [6.5.2](https://github.com/reactivex/rxjs/compare/6.5.0...6.5.2) (2019-05-10)

### Bug Fixes

- **endWith:** wrap args - they are not observables - in of before concatenating ([#4735](https://github.com/reactivex/rxjs/issues/4735)) ([986be2f](https://github.com/reactivex/rxjs/commit/986be2f))
- **forkJoin:** test for object literal ([#4741](https://github.com/reactivex/rxjs/issues/4741)) ([c11e1b3](https://github.com/reactivex/rxjs/commit/c11e1b3)), closes [#4737](https://github.com/reactivex/rxjs/issues/4737) [#4737](https://github.com/reactivex/rxjs/issues/4737)
- **Notification:** replace const enum ([#4556](https://github.com/reactivex/rxjs/issues/4556)) ([e460eec](https://github.com/reactivex/rxjs/commit/e460eec)), closes [#4538](https://github.com/reactivex/rxjs/issues/4538)
- **of:** remove deprecation comment to prevent false positive warning ([#4724](https://github.com/reactivex/rxjs/issues/4724)) ([da69c16](https://github.com/reactivex/rxjs/commit/da69c16))
- **pairwise:** make it recursion-proof ([#4743](https://github.com/reactivex/rxjs/issues/4743)) ([21ab261](https://github.com/reactivex/rxjs/commit/21ab261))
- **scan:** fixed declarations to properly support different return types ([#4598](https://github.com/reactivex/rxjs/issues/4598)) ([126d2b6](https://github.com/reactivex/rxjs/commit/126d2b6))
- **Subscription:** Return Empty when teardown === null ([#4575](https://github.com/reactivex/rxjs/issues/4575)) ([ffc4e68](https://github.com/reactivex/rxjs/commit/ffc4e68))
- **throttleTime:** emit single value with trailing enabled ([#4564](https://github.com/reactivex/rxjs/issues/4564)) ([fd690a6](https://github.com/reactivex/rxjs/commit/fd690a6)), closes [#2859](https://github.com/reactivex/rxjs/issues/2859) [#4491](https://github.com/reactivex/rxjs/issues/4491)
- **umd:** export fetch namespace ([#4738](https://github.com/reactivex/rxjs/issues/4738)) ([7926122](https://github.com/reactivex/rxjs/commit/7926122))
- **fromFetch:** don't abort if fetch resolves ([#4742](https://github.com/reactivex/rxjs/issues/4742) ([ed8d771](https://github.com/reactivex/rxjs/commit/ed8d771))

## [6.5.1](https://github.com/reactivex/rxjs/compare/6.5.0...6.5.1) (2019-04-23)

### Bug Fixes

- **Notification:** replace const enum ([#4556](https://github.com/reactivex/rxjs/issues/4556)) ([e460eec](https://github.com/reactivex/rxjs/commit/e460eec)), closes [#4538](https://github.com/reactivex/rxjs/issues/4538)
- **throttleTime:** emit single value with trailing enabled ([#4564](https://github.com/reactivex/rxjs/issues/4564)) ([fd690a6](https://github.com/reactivex/rxjs/commit/fd690a6)), closes [#2859](https://github.com/reactivex/rxjs/issues/2859) [#4491](https://github.com/reactivex/rxjs/issues/4491)

# [6.5.0](https://github.com/reactivex/rxjs/compare/6.4.0...6.5.0) (2019-04-23)

### Bug Fixes

- **docs-app:** remove stopWordFilter from lunr pipeline ([#4536](https://github.com/reactivex/rxjs/issues/4536)) ([9eaebd4](https://github.com/reactivex/rxjs/commit/9eaebd4))
- **dtslint:** disable tests that break in TS@next ([#4705](https://github.com/reactivex/rxjs/issues/4705)) ([ecc73d2](https://github.com/reactivex/rxjs/commit/ecc73d2))
- **index:** export NotificationKind ([#4514](https://github.com/reactivex/rxjs/issues/4514)) ([7125355](https://github.com/reactivex/rxjs/commit/7125355)), closes [#4513](https://github.com/reactivex/rxjs/issues/4513)
- **race:** better typings ([#4643](https://github.com/reactivex/rxjs/issues/4643)) ([fb9bc48](https://github.com/reactivex/rxjs/commit/fb9bc48)), closes [#4390](https://github.com/reactivex/rxjs/issues/4390) [#4642](https://github.com/reactivex/rxjs/issues/4642)
- **throwIfEmpty:** ensure result is retry-able ([c4f44b9](https://github.com/reactivex/rxjs/commit/c4f44b9))
- **types:** Fixed signature for onErrorResumeNext ([#4603](https://github.com/reactivex/rxjs/issues/4603)) ([4dd0be0](https://github.com/reactivex/rxjs/commit/4dd0be0))

### Features

- **combineLatest:** deprecated rest argument and scheduler signatures ([#4641](https://github.com/reactivex/rxjs/issues/4641)) ([6661c79](https://github.com/reactivex/rxjs/commit/6661c79)), closes [#4640](https://github.com/reactivex/rxjs/issues/4640)
- **fromFetch:** We now export a `fromFetch` static observable creation method from `rxjs/fetch`. Mirrors native `fetch` only it's lazy and cancellable via `Observable` interface. ([#4702](https://github.com/reactivex/rxjs/issues/4702)) ([5a1ef86](https://github.com/reactivex/rxjs/commit/5a1ef86))
- **forkJoin:** accepts a dictionary of sources ([#4640](https://github.com/reactivex/rxjs/issues/4640)) ([b5a2ac9](https://github.com/reactivex/rxjs/commit/b5a2ac9))
- **partition:** new `partition` observable creation function. Old `partition` operator is deprecated ([#4419](https://github.com/reactivex/rxjs/issues/4419)) ([#4685](https://github.com/reactivex/rxjs/issues/4685)) ([d5d6980](https://github.com/reactivex/rxjs/commit/d5d6980))
- **scheduled:** Add `scheduled` creation function to use to create scheduled observable of values. Deprecate scheduled versions of `from`, `range`, et al. ([#4595](https://github.com/reactivex/rxjs/issues/4595)) ([f57e1fc](https://github.com/reactivex/rxjs/commit/f57e1fc))

### Performance Improvements

- **Subscription:** improve parent management ([#4526](https://github.com/reactivex/rxjs/issues/4526)) ([06f1a25](https://github.com/reactivex/rxjs/commit/06f1a25))

# [6.4.0](https://github.com/reactivex/rxjs/compare/6.3.3...6.4.0) (2019-01-30)

### Bug Fixes

- **ajax:** Fix case-insensitive headers in HTTP request ([#4453](https://github.com/reactivex/rxjs/issues/4453)) ([673bf47](https://github.com/reactivex/rxjs/commit/673bf47))
- **bundle:** closure to not rewrite polyfills for minification ([#4487](https://github.com/reactivex/rxjs/issues/4487)) ([a1fedb9](https://github.com/reactivex/rxjs/commit/a1fedb9))
- **bundle:** don't export `operators` twice ([#4310](https://github.com/reactivex/rxjs/issues/4310)) ([2399f6e](https://github.com/reactivex/rxjs/commit/2399f6e))
- **combineLatest:** improve typings for combineLatest ([#4470](https://github.com/reactivex/rxjs/issues/4470)) ([40c3d9f](https://github.com/reactivex/rxjs/commit/40c3d9f))
- **compat:** remove internal from import locations ([#4498](https://github.com/reactivex/rxjs/issues/4498)) ([a6c0017](https://github.com/reactivex/rxjs/commit/a6c0017)), closes [#4070](https://github.com/reactivex/rxjs/issues/4070)
- **endWith:** ability to endWith different types ([#4183](https://github.com/reactivex/rxjs/issues/4183)) ([#4185](https://github.com/reactivex/rxjs/issues/4185)) ([83533d1](https://github.com/reactivex/rxjs/commit/83533d1))
- **fromEventPattern:** improve typings for fromEventPattern ([#4496](https://github.com/reactivex/rxjs/issues/4496)) ([037f53d](https://github.com/reactivex/rxjs/commit/037f53d))
- **Observable:** Fix Observable.subscribe to add operator TeardownLogic to returned Subscription. ([#4434](https://github.com/reactivex/rxjs/issues/4434)) ([f28955f](https://github.com/reactivex/rxjs/commit/f28955f))
- **subscribe:** Deprecate null starting parameter signatures for subscribe ([#4202](https://github.com/reactivex/rxjs/issues/4202)) ([c85ddf6](https://github.com/reactivex/rxjs/commit/c85ddf6))
- **combineLatest:** support passing union types ([ffda319](https://github.com/reactivex/rxjs/commit/ffda319))
- **from:** support passing union types ([eb1d596](https://github.com/reactivex/rxjs/commit/eb1d596))
- **withLatestFrom:** support passing union types ([1e19a24](https://github.com/reactivex/rxjs/commit/1e19a24))
- **zip:** support passing union types ([0d87f52](https://github.com/reactivex/rxjs/commit/0d87f52))
- **multicast:** support returning union types from projection ([e9e9041](https://github.com/reactivex/rxjs/commit/e9e9041))
- **exhaustMap:** support returning union types from projection ([ff1f5dc](https://github.com/reactivex/rxjs/commit/ff1f5dc))
- **merge:** support union type inference for merge operators ([c2ac39c](https://github.com/reactivex/rxjs/commit/c2ac39c))
- **catchError:** support union type returns ([8350622](https://github.com/reactivex/rxjs/commit/8350622))
- **switchMap:** support union type returns ([32d35fd](https://github.com/reactivex/rxjs/commit/32d35fd))
- **defer:** support union types passed ([5aea50e](https://github.com/reactivex/rxjs/commit/5aea50e))
- **race:** Update typings to support proper return types ([#4465](https://github.com/reactivex/rxjs/issues/4465)) ([0042846](https://github.com/reactivex/rxjs/commit/0042846))
- **VirtualTimeScheduler:** rework flush so it won't lose actions ([#4433](https://github.com/reactivex/rxjs/issues/4433)) ([d068bc9](https://github.com/reactivex/rxjs/commit/d068bc9))
- **WebSocketSubject:** fix subject failing to close socket ([#4446](https://github.com/reactivex/rxjs/issues/4446)) ([dcfa52b](https://github.com/reactivex/rxjs/commit/dcfa52b))

### Features

- **shareReplay:** Add configuration object for named arguments, and add argument to support unsubscribing from source observable by `refCount` when all resulting subscriptions have unsubscribed. The default behavior is to leave the source subscription running.
- **mergeScan:** Add index to the accumulator function ([#4458](https://github.com/reactivex/rxjs/issues/4458)) ([f5e143d](https://github.com/reactivex/rxjs/commit/f5e143d)), closes [#4441](https://github.com/reactivex/rxjs/issues/4441)
- **range:** accept one argument ([#4360](https://github.com/reactivex/rxjs/issues/4360)) ([a388578](https://github.com/reactivex/rxjs/commit/a388578))
- **takeWhile:** add an `inclusive` option to the operator which causes to emit final value ([#4115](https://github.com/reactivex/rxjs/issues/4115)) ([6e7f407](https://github.com/reactivex/rxjs/commit/6e7f407))

### Performance Improvements

- **internal:** optimize Subscription#add() for the common case ([#4489](https://github.com/reactivex/rxjs/issues/4489)) ([bdd201c](https://github.com/reactivex/rxjs/commit/bdd201c))
- **internal:** use strict equality for isObject() ([#4493](https://github.com/reactivex/rxjs/issues/4493)) ([fc84a00](https://github.com/reactivex/rxjs/commit/fc84a00))
- **Subscription:** use `instanceof` to avoid megamorphic LoadIC ([#4499](https://github.com/reactivex/rxjs/issues/4499)) ([065b4e3](https://github.com/reactivex/rxjs/commit/065b4e3))

<a name="6.3.3"></a>

## [6.3.3](https://github.com/reactivex/rxjs/compare/6.3.2...6.3.3) (2018-09-25)

### Bug Fixes

- **pipe:** align static pipe to Observable pipe rest parameters overl… ([#4112](https://github.com/reactivex/rxjs/issues/4112)) ([8c607e9](https://github.com/reactivex/rxjs/commit/8c607e9)), closes [#4109](https://github.com/reactivex/rxjs/issues/4109) [#4109](https://github.com/reactivex/rxjs/issues/4109)
- **RxJS:** each instance of RxJS now has a unique Subscriber symbol ([0972c56](https://github.com/reactivex/rxjs/commit/0972c56))
- **subscribe:** report errors that occur in subscribe after the initial error ([#4089](https://github.com/reactivex/rxjs/issues/4089)) ([9b4b2bc](https://github.com/reactivex/rxjs/commit/9b4b2bc)), closes [#3803](https://github.com/reactivex/rxjs/issues/3803)
- **Subscriber:** Can no longer subscribe to itself in a circular manner ([#4106](https://github.com/reactivex/rxjs/issues/4106)) ([e623ec6](https://github.com/reactivex/rxjs/commit/e623ec6)), closes [#4095](https://github.com/reactivex/rxjs/issues/4095)
- **Subscriber:** use only local Subscriber instances ([50ee0a7](https://github.com/reactivex/rxjs/commit/50ee0a7))
- **TypeScript:** ensure RxJS builds with TS@next as well ([f03e790](https://github.com/reactivex/rxjs/commit/f03e790))

<a name="6.3.2"></a>

## [6.3.2](https://github.com/reactivex/rxjs/compare/6.3.1...6.3.2) (2018-09-04)

### Bug Fixes

- **node:** will no longer error mixing RxJS 6.3 and 6.2 ([#4078](https://github.com/reactivex/rxjs/issues/4078)) ([69d9ccf](https://github.com/reactivex/rxjs/commit/69d9ccf)), closes [#4077](https://github.com/reactivex/rxjs/issues/4077)

<a name="6.3.1"></a>

## [6.3.1](https://github.com/reactivex/rxjs/compare/6.3.0...6.3.1) (2018-08-31)

### Bug Fixes

- **mergeMap:** fix nested mergeMaps ([#4072](https://github.com/reactivex/rxjs/issues/4072)) ([0ab701b](https://github.com/reactivex/rxjs/commit/0ab701b)), closes [#4071](https://github.com/reactivex/rxjs/issues/4071)

<a name="6.3.0"></a>

# [6.3.0](https://github.com/reactivex/rxjs/compare/6.2.2...6.3.0) (2018-08-30)

### Bug Fixes

- **find:** unsubscribe from source when found ([#3968](https://github.com/reactivex/rxjs/issues/3968)) ([fd01f7b](https://github.com/reactivex/rxjs/commit/fd01f7b))
- convert [@internal](https://github.com/internal) comment to JSDoc ([#3932](https://github.com/reactivex/rxjs/issues/3932)) ([f8a9d6e](https://github.com/reactivex/rxjs/commit/f8a9d6e))
- **AjaxObservable:** notify with error if fails to parse json response ([#3139](https://github.com/reactivex/rxjs/issues/3139)) ([d8231e2](https://github.com/reactivex/rxjs/commit/d8231e2)), closes [#3138](https://github.com/reactivex/rxjs/issues/3138)
- **catchError:** stop listening to a synchronous inner-observable when unsubscribed ([456ef33](https://github.com/reactivex/rxjs/commit/456ef33))
- **distinctUntilKeyChanged:** improved key typing with keyof T ([#3988](https://github.com/reactivex/rxjs/issues/3988)) ([4ec4ff1](https://github.com/reactivex/rxjs/commit/4ec4ff1))
- **exhaustMap:** stop listening to a synchronous inner-observable when unsubscribed ([ee1a339](https://github.com/reactivex/rxjs/commit/ee1a339))
- **find:** add undefined to return type ([#3970](https://github.com/reactivex/rxjs/issues/3970)) ([5a6c90f](https://github.com/reactivex/rxjs/commit/5a6c90f)), closes [#3969](https://github.com/reactivex/rxjs/issues/3969)
- **IE10:** Remove dependency on Object.setPrototypeOf ([#3967](https://github.com/reactivex/rxjs/issues/3967)) ([5c52a73](https://github.com/reactivex/rxjs/commit/5c52a73)), closes [#3966](https://github.com/reactivex/rxjs/issues/3966)
- **mergeAll:** add source subscription to composite before actually subscribing ([#2479](https://github.com/reactivex/rxjs/issues/2479)) ([40852ff](https://github.com/reactivex/rxjs/commit/40852ff)), closes [#2476](https://github.com/reactivex/rxjs/issues/2476)
- **mergeScan:** stop listening to a synchronous inner-observable when unsubscribed ([c4002f3](https://github.com/reactivex/rxjs/commit/c4002f3))
- **Observable:** forEach will no longer next values after an error ([b4bad1f](https://github.com/reactivex/rxjs/commit/b4bad1f))
- **Observable:** use more granular Observable exports in compat mode ([#3974](https://github.com/reactivex/rxjs/issues/3974)) ([3f75564](https://github.com/reactivex/rxjs/commit/3f75564))
- **onErrorResumeNext:** stop listening to a synchronous inner-observable when unsubscribed ([1d14277](https://github.com/reactivex/rxjs/commit/1d14277))
- **pipe:** replace rest parameters overload ([#3945](https://github.com/reactivex/rxjs/issues/3945)) ([872b0ec](https://github.com/reactivex/rxjs/commit/872b0ec)), closes [#3841](https://github.com/reactivex/rxjs/issues/3841)
- **skipUntil:** stop listening to a synchronous notifier after its first nexted value ([1c257db](https://github.com/reactivex/rxjs/commit/1c257db))
- **startWith:** allow empty type signature and passing a different type ([b7866a0](https://github.com/reactivex/rxjs/commit/b7866a0))
- **subscribable:** make subscribe() signature match Observable ([#4050](https://github.com/reactivex/rxjs/issues/4050)) ([865d8d7](https://github.com/reactivex/rxjs/commit/865d8d7)), closes [#3891](https://github.com/reactivex/rxjs/issues/3891)
- **subscriber:** unsubscribe parents on error/complete ([ad8131b](https://github.com/reactivex/rxjs/commit/ad8131b))
- **switchMap:** stop listening to a synchronous inner-observable when unsubscribed ([260d52a](https://github.com/reactivex/rxjs/commit/260d52a))
- **takeUntil:** takeUntil should subscribe to the source if notifier sync completes without emitting ([#4039](https://github.com/reactivex/rxjs/issues/4039)) ([21fd0b4](https://github.com/reactivex/rxjs/commit/21fd0b4)), closes [#3504](https://github.com/reactivex/rxjs/issues/3504)
- **testscheduler:** type arguments to Observable creation functions ([#3928](https://github.com/reactivex/rxjs/issues/3928)) ([0e30ef1](https://github.com/reactivex/rxjs/commit/0e30ef1))

### Features

- **delayWhen:** add index to the selector function ([#2473](https://github.com/reactivex/rxjs/issues/2473)) ([0979d31](https://github.com/reactivex/rxjs/commit/0979d31))
- **forEach:** deprecating passing promise constructor ([5178ab9](https://github.com/reactivex/rxjs/commit/5178ab9))
- **TestScheduler:** Add subscription schedule to expectObservable ([#3997](https://github.com/reactivex/rxjs/issues/3997)) ([0d20255](https://github.com/reactivex/rxjs/commit/0d20255))

<a name="6.2.2"></a>

## [6.2.2](https://github.com/reactivex/rxjs/compare/6.2.1...6.2.2) (2018-07-13)

### Bug Fixes

- **first:** improved type guards for TypeScript ([3e12f7a](https://github.com/reactivex/rxjs/commit/3e12f7a))
- **last:** improved type guards for TypeScript ([3e12f7a](https://github.com/reactivex/rxjs/commit/3e12f7a))

<a name="6.2.1"></a>

## [6.2.1](https://github.com/reactivex/rxjs/compare/6.2.0...6.2.1) (2018-06-12)

### Bug Fixes

- **ci:** do not trigger postbuild script on PR ([f82c085](https://github.com/reactivex/rxjs/commit/f82c085))
- **delayWhen:** Emit source value if duration selector completes synchronously ([#3664](https://github.com/reactivex/rxjs/issues/3664)) ([2c43af7](https://github.com/reactivex/rxjs/commit/2c43af7)), closes [#3663](https://github.com/reactivex/rxjs/issues/3663)
- **docs:** fix broken github links ([#3802](https://github.com/reactivex/rxjs/issues/3802)) ([9f9bf9b](https://github.com/reactivex/rxjs/commit/9f9bf9b))
- **docs:** fix code examples ([#3784](https://github.com/reactivex/rxjs/issues/3784)) ([a95441b](https://github.com/reactivex/rxjs/commit/a95441b))
- **from:** Objects implementing Symbol.observable take precedence over other types ([80ceea0](https://github.com/reactivex/rxjs/commit/80ceea0))
- **fromEvent:** Support React Native and node-compatible event sources. ([#3821](https://github.com/reactivex/rxjs/issues/3821)) ([1969f18](https://github.com/reactivex/rxjs/commit/1969f18))
- **Observable.prototype.pipe:** TS typings now more correct for >8 parameters ([#3789](https://github.com/reactivex/rxjs/issues/3789)) ([ad010ea](https://github.com/reactivex/rxjs/commit/ad010ea))
- **subscribe:** ignore syncError when deprecated ([#3749](https://github.com/reactivex/rxjs/issues/3749)) ([f94560c](https://github.com/reactivex/rxjs/commit/f94560c))
- **Symbol.observable:** make observable declaration readonly ([#3697](https://github.com/reactivex/rxjs/issues/3697)) ([#3773](https://github.com/reactivex/rxjs/issues/3773)) ([e1c203f](https://github.com/reactivex/rxjs/commit/e1c203f))
- **TypeScript:** resolved typings issue for TS 3.0 ([bf2cdeb](https://github.com/reactivex/rxjs/commit/bf2cdeb))
- **typings:** allow bufferCreationInterval null for bufferTime ([#3734](https://github.com/reactivex/rxjs/issues/3734)) ([0bda9cd](https://github.com/reactivex/rxjs/commit/0bda9cd)), closes [#3728](https://github.com/reactivex/rxjs/issues/3728)

### Performance Improvements

- remove comments from js-files ([#3760](https://github.com/reactivex/rxjs/issues/3760)) ([bb2c334](https://github.com/reactivex/rxjs/commit/bb2c334))

<a name="6.2.0"></a>

# [6.2.0](https://github.com/ReactiveX/RxJS/compare/6.1.0...6.2.0) (2018-05-22)

### Bug Fixes

- **ajax:** Handle timeouts as errors ([#3653](https://github.com/ReactiveX/RxJS/issues/3653)) ([e4128ea](https://github.com/ReactiveX/RxJS/commit/e4128ea))
- **ajax:** RxJS v6 TimeoutError is missing name property ([576d943](https://github.com/ReactiveX/RxJS/commit/576d943))
- **isObservable:** Fix throwing error when testing isObservable(null) ([#3688](https://github.com/ReactiveX/RxJS/issues/3688)) ([c9acc61](https://github.com/ReactiveX/RxJS/commit/c9acc61))
- **range:** Range should be same for every subscriber ([#3707](https://github.com/ReactiveX/RxJS/issues/3707)) ([9642133](https://github.com/ReactiveX/RxJS/commit/9642133))
- **skipUntil:** fix skipUntil when innerSubscription is null ([#3686](https://github.com/ReactiveX/RxJS/issues/3686)) ([4226432](https://github.com/ReactiveX/RxJS/commit/4226432))
- **TestScheduler:** restore run changes upon error ([27cb9b6](https://github.com/ReactiveX/RxJS/commit/27cb9b6))
- **TimeoutError:** Add name to TimeoutError ([44042d0](https://github.com/ReactiveX/RxJS/commit/44042d0))
- **WebSocketSubject:** Check to see if WebSocket exists in global scope ([#3694](https://github.com/ReactiveX/RxJS/issues/3694)) ([2db0788](https://github.com/ReactiveX/RxJS/commit/2db0788))

### Features

- **endWith:** add new operator endWith ([#3679](https://github.com/ReactiveX/RxJS/issues/3679)) ([537fe7d](https://github.com/ReactiveX/RxJS/commit/537fe7d))

<a name="6.1.0"></a>

# [6.1.0](https://github.com/ReactiveX/RxJS/compare/6.0.0...6.1.0) (2018-05-03)

### Bug Fixes

- **audit:** will not crash if duration is synchronous ([#3608](https://github.com/ReactiveX/RxJS/issues/3608)) ([76b7e27](https://github.com/ReactiveX/RxJS/commit/76b7e27)), closes [#2743](https://github.com/ReactiveX/RxJS/issues/2743)
- **delay:** fix memory leak ([#3605](https://github.com/ReactiveX/RxJS/issues/3605)) ([96f05b0](https://github.com/ReactiveX/RxJS/commit/96f05b0))

### Features

- **isObservable:** a new method for checking to see if an object is an RxJS Observable ([edb33e5](https://github.com/ReactiveX/RxJS/commit/edb33e5))

<a name="6.0.0"></a>

# [6.0.0](https://github.com/ReactiveX/RxJS/compare/6.0.0-uncanny-rc.7...v6.0.0) (2018-04-24)

### Bug Fixes

- **websocket:** no longer throws errors in operators applied to it ([#3577](https://github.com/ReactiveX/RxJS/issues/3577)) ([cb38ddf](https://github.com/ReactiveX/RxJS/commit/cb38ddf))

### Code Refactoring

- **webSocket:** rename back to webSocket ala 5.0 ([#3590](https://github.com/ReactiveX/RxJS/issues/3590)) ([d5658fe](https://github.com/ReactiveX/RxJS/commit/d5658fe))

### Features

- **testing:** Add testScheduler.run() helper ([2d5b3b2](https://github.com/ReactiveX/RxJS/commit/2d5b3b2))
- **testing:** testScheduler.run() supports time progression syntax ([9322b7d](https://github.com/ReactiveX/RxJS/commit/9322b7d))

### BREAKING CHANGES

- **webSocket:** UNBREAKING websocket to be named `webSocket` again, just like it was in 5.0. Now you should import from `rxjs/webSocket`

<a name="6.0.0-uncanny-rc.7"></a>

# [6.0.0-uncanny-rc.7](https://github.com/ReactiveX/RxJS/compare/6.0.0-ucandoit-rc.6...v6.0.0-uncanny-rc.7) (2018-04-13)

### Bug Fixes

- **interop:** functions with `[Symbol.observable]` on them will now be accepted in operators like `mergeMap`, `from`, etc ([#3562](https://github.com/ReactiveX/RxJS/issues/3562)) ([c9570df](https://github.com/ReactiveX/RxJS/commit/c9570df))
- **migrations:** change the version the migration applies to ([#3564](https://github.com/ReactiveX/RxJS/issues/3564)) ([9217a03](https://github.com/ReactiveX/RxJS/commit/9217a03))
- **rxjs:** no longer requires `dom` lib ([#3566](https://github.com/ReactiveX/RxJS/issues/3566)) ([8b33ee2](https://github.com/ReactiveX/RxJS/commit/8b33ee2))
- **throttleTime:** emit throttled values when complete if trailing=true ([#3559](https://github.com/ReactiveX/RxJS/issues/3559)) ([3e846f2](https://github.com/ReactiveX/RxJS/commit/3e846f2)), closes [#3351](https://github.com/ReactiveX/RxJS/issues/3351)
- **websocket:** export WebSocketSubject, WebSocketSubjectConfig from rxjs/websocket ([#3557](https://github.com/ReactiveX/RxJS/issues/3557)) ([c365405](https://github.com/ReactiveX/RxJS/commit/c365405))

<a name="6.0.0-ucandoit-rc.6"></a>

# [6.0.0-ucandoit-rc.6](https://github.com/ReactiveX/RxJS/compare/6.0.0-uber-rc.5...v6.0.0-ucandoit-rc.6) (2018-04-13)

### Bug Fixes

- **migrations:** make sure collection.json is present ([63e10a8](https://github.com/ReactiveX/RxJS/commit/63e10a8))

<a name="6.0.0-uber-rc.5"></a>

# [6.0.0-uber-rc.5](https://github.com/ReactiveX/RxJS/compare/6.0.0-turbo-rc.4...6.0.0-uber-rc.5) (2018-04-13)

### Bug Fixes

- **migrations:** deploy compiled JS rather than just the TS files. ([9aed72f](https://github.com/ReactiveX/RxJS/commit/9aed72f))

<a name="6.0.0-turbo-rc.4"></a>

# [6.0.0-turbo-rc.4](https://github.com/ReactiveX/RxJS/compare/6.0.0-terrific-rc.3...6.0.0-turbo-rc.4) (2018-04-12)

### Bug Fixes

- **groupBy:** reexporting the GroupedObservable type ([#3556](https://github.com/ReactiveX/RxJS/issues/3556)) ([12d4933](https://github.com/ReactiveX/RxJS/commit/12d4933)), closes [#3551](https://github.com/ReactiveX/RxJS/issues/3551)
- **migrations:** build now properly copies migration into package ([#3555](https://github.com/ReactiveX/RxJS/issues/3555)) ([329a145](https://github.com/ReactiveX/RxJS/commit/329a145))

<a name="6.0.0-terrific-rc.3"></a>

# [6.0.0-terrific-rc.3](https://github.com/ReactiveX/RxJS/compare/6.0.0-tenacious-rc.2...v6.0.0-terrific-rc.3) (2018-04-11)

### Features

- **schematics:** add migration schematics for schematics users ([20a2f07](https://github.com/ReactiveX/RxJS/commit/20a2f07))

<a name="6.0.0-tenacious-rc.2"></a>

# [6.0.0-tenacious-rc.2](https://github.com/ReactiveX/RxJS/compare/6.0.0-tactical-rc.1...v6.0.0-tenacious-rc.2) (2018-04-11)

### Bug Fixes

- **compat:** fix first & last operators so undefined arguments won't create empty values ([#3542](https://github.com/ReactiveX/RxJS/issues/3542)) ([a327db2](https://github.com/ReactiveX/RxJS/commit/a327db2))
- **node/TS:** eliminate incompatible types to protected properties ([#3544](https://github.com/ReactiveX/RxJS/issues/3544)) ([21dd3bd](https://github.com/ReactiveX/RxJS/commit/21dd3bd))

### BREAKING CHANGES

- **NodeJS** Dropping support for non-LTS versions of Node.

<a name="6.0.0-tactical-rc.1"></a>

# [6.0.0-tactical-rc.1](https://github.com/ReactiveX/RxJS/compare/6.0.0-rc.0...6.0.0-tactical-rc.1) (2018-04-07)

Why "tactical"? Because I _TOTALLY MEANT_ to ruin the release names by publishing an amazingly funny April Fool's joke about smooshMap. So this was "tactical". Super tactical. So very tactical.

### Bug Fixes

- **closure-compiler:** adds nocollapse to static members ([#3519](https://github.com/ReactiveX/RxJS/issues/3519)) ([8758a5d](https://github.com/ReactiveX/RxJS/commit/8758a5d))
- **closure-compiler:** remove internal flag from \_isScalar ([#3520](https://github.com/ReactiveX/RxJS/issues/3520)) ([b3a657d](https://github.com/ReactiveX/RxJS/commit/b3a657d))
- **closure-compiler:** remove top level throws ([#3518](https://github.com/ReactiveX/RxJS/issues/3518)) ([b069473](https://github.com/ReactiveX/RxJS/commit/b069473))
- **closure-compiler:** removes bad \[@params](https://github.com/params) comments that caused issues ([#3521](https://github.com/ReactiveX/RxJS/issues/3521)) ([09c874c](https://github.com/ReactiveX/RxJS/commit/09c874c))
- **compat:** deprecate Observable.if/throw ([#3527](https://github.com/ReactiveX/RxJS/issues/3527)) ([3116275](https://github.com/ReactiveX/RxJS/commit/3116275))
- **compat:** export TeardownLogic ([#3532](https://github.com/ReactiveX/RxJS/issues/3532)) ([0c76e64](https://github.com/ReactiveX/RxJS/commit/0c76e64)), closes [#3531](https://github.com/ReactiveX/RxJS/issues/3531)
- **compat:** remove observable/scalar deep import as it wasn't previously available ([4566001](https://github.com/ReactiveX/RxJS/commit/4566001))
- **Scheduler:** export but deprecate ([#3522](https://github.com/ReactiveX/RxJS/issues/3522)) ([a3e1fb8](https://github.com/ReactiveX/RxJS/commit/a3e1fb8))
- **skipUntil:** properly manages notifier subscription ([889f84a](https://github.com/ReactiveX/RxJS/commit/889f84a)), closes [#1886](https://github.com/ReactiveX/RxJS/issues/1886)
- fix type mismatch in NodeStyleEventEmitter ([#3530](https://github.com/ReactiveX/RxJS/issues/3530)) ([3f51ddd](https://github.com/ReactiveX/RxJS/commit/3f51ddd))
- **sourcemaps:** fix mappings for source maps so they will work ([#3523](https://github.com/ReactiveX/RxJS/issues/3523)) ([32e7f75](https://github.com/ReactiveX/RxJS/commit/32e7f75)), closes [#3479](https://github.com/ReactiveX/RxJS/issues/3479)

### Features

- **compat:** add Observable extension classes with static create() ([ecd7f68](https://github.com/ReactiveX/RxJS/commit/ecd7f68))
- **compat:** add rxjs/interfaces exports ([ba5c266](https://github.com/ReactiveX/RxJS/commit/ba5c266))

<a name="6.0.0-rc.0"></a>

# [6.0.0-rc.0](https://github.com/ReactiveX/RxJS/compare/6.0.0-beta.4...6.0.0-rc.0) (2018-03-31)

### Bug Fixes

- **ajax:** properly encode body with form data that includes URLs ([#3502](https://github.com/ReactiveX/RxJS/issues/3502)) ([4455d21](https://github.com/ReactiveX/RxJS/commit/4455d21)), closes [#2399](https://github.com/ReactiveX/RxJS/issues/2399)
- **bindNodeCallback:** better type inference ([932bb7a](https://github.com/ReactiveX/RxJS/commit/932bb7a))
- **elementAt:** now allows falsy defaultValues ([13706e7](https://github.com/ReactiveX/RxJS/commit/13706e7))
- **lint_perf:** fix lint issues with newer perf tests ([1013754](https://github.com/ReactiveX/RxJS/commit/1013754))
- **throttle:** now properly trailing throttles for individual values ([#3505](https://github.com/ReactiveX/RxJS/issues/3505)) ([3db18d1](https://github.com/ReactiveX/RxJS/commit/3db18d1)), closes [#2864](https://github.com/ReactiveX/RxJS/issues/2864)

### Features

- **takeUntil:** no longer subscribes to source if notifier synchronously emits ([#3504](https://github.com/ReactiveX/RxJS/issues/3504)) ([7b8a3e3](https://github.com/ReactiveX/RxJS/commit/7b8a3e3)), closes [#2189](https://github.com/ReactiveX/RxJS/issues/2189)

### Performance Improvements

- **pluck,bufferTime,asObservable:** add performance tests for pluck(), bufferTime() and asObservable() operators ([#2491](https://github.com/ReactiveX/RxJS/issues/2491)) ([24506b3](https://github.com/ReactiveX/RxJS/commit/24506b3))
- **ReplaySubject:** slightly improved performance ([#2677](https://github.com/ReactiveX/RxJS/issues/2677)) ([9fea36d](https://github.com/ReactiveX/RxJS/commit/9fea36d))

### BREAKING CHANGES

- **throttle:** This changes the behavior of throttle, in particular
  throttling with both leading and trailing behaviors set to true, to more
  closely match the throttling behavior of lodash and other libraries.
  Throttling now starts immediately after any emission from the
  observable, and values will not be double emitted for both leading and
  trailing values

<a name="6.0.0-beta.4"></a>

# [6.0.0-beta.4](https://github.com/ReactiveX/RxJS/compare/6.0.0-beta.3...v6.0.0-beta.4) (2018-03-29)

### Bug Fixes

- **bindCallback:** add better type overloads ([#3480](https://github.com/ReactiveX/RxJS/issues/3480)) ([037cf34](https://github.com/ReactiveX/RxJS/commit/037cf34))
- **compat:** add IScheduler to compat/Scheduler ([0a67df6](https://github.com/ReactiveX/RxJS/commit/0a67df6))

### Features

- **compat:** add all utilities to internal-compatibility ([a9ecfe7](https://github.com/ReactiveX/RxJS/commit/a9ecfe7))
- **websocket:** Add serializer/deserializer config settings ([#3489](https://github.com/ReactiveX/RxJS/issues/3489)) ([8d44124](https://github.com/ReactiveX/RxJS/commit/8d44124))

### BREAKING CHANGES

- **websocket:** WebSocketSubject will now JSON serialize all messages sent over it by default, to return to the old behavior, pass a config setting of `serializer: x => x` like so: `websocket({ url, serializer: x => x })`

<a name="6.0.0-beta.3"></a>

# [6.0.0-beta.3](https://github.com/ReactiveX/RxJS/compare/6.0.0-beta.1...6.0.0-beta.3) (2018-03-27)

### Bug Fixes

- **build:** update build-optimizer and point to correct sources ([6717a01](https://github.com/ReactiveX/RxJS/commit/6717a01))
- **node:** Subscriber no longer trampled if from another copy of rxjs ([371b658](https://github.com/ReactiveX/RxJS/commit/371b658))
- **Observable:** empty ctor returns valid Observable ([#3464](https://github.com/ReactiveX/RxJS/issues/3464)) ([58b8ebc](https://github.com/ReactiveX/RxJS/commit/58b8ebc))
- **subscribeOn:** add subscribeOn back to the distribution ([d6556f2](https://github.com/ReactiveX/RxJS/commit/d6556f2))

<a name="6.0.0-beta.2"></a>

# [6.0.0-beta.2](https://github.com/ReactiveX/RxJS/compare/6.0.0-beta.1...6.0.0-beta.2) (2018-03-24)

### Bug Fixes

- **build:** update build-optimizer and point to correct sources ([6717a01](https://github.com/ReactiveX/RxJS/commit/6717a01))
- **Observable:** empty ctor returns valid Observable ([#3464](https://github.com/ReactiveX/RxJS/issues/3464)) ([58b8ebc](https://github.com/ReactiveX/RxJS/commit/58b8ebc))
- **subscribeOn:** add subscribeOn back to the distribution ([d6556f2](https://github.com/ReactiveX/RxJS/commit/d6556f2))

<a name="6.0.0-beta.1"></a>

# [6.0.0-beta.1](https://github.com/ReactiveX/RxJS/compare/6.0.0-beta.0...v6.0.0-beta.1) (2018-03-21)

### Bug Fixes

- remove duplicate Subscribable<T> interface declaration ([#3450](https://github.com/ReactiveX/RxJS/issues/3450)) ([ac78d89](https://github.com/ReactiveX/RxJS/commit/ac78d89))
- **compat:** add package.json for internal-compatibility package ([#3455](https://github.com/ReactiveX/RxJS/issues/3455)) ([3b306ed](https://github.com/ReactiveX/RxJS/commit/3b306ed))
- **config.useDeprecatedSynchronousErrorThrowing:** reentrant error throwing no longer trapped ([#3449](https://github.com/ReactiveX/RxJS/issues/3449)) ([0892a2d](https://github.com/ReactiveX/RxJS/commit/0892a2d)), closes [#3161](https://github.com/ReactiveX/RxJS/issues/3161)

### Features

- **compat:** add interfaces export ([d8f8122](https://github.com/ReactiveX/RxJS/commit/d8f8122))
- **compat:** add rxjs/observable/dom/\* APIs to compatibility package ([d9a618f](https://github.com/ReactiveX/RxJS/commit/d9a618f))

<a name="6.0.0-beta.0"></a>

# [6.0.0-beta.0](https://github.com/ReactiveX/RxJS/compare/6.0.0-alpha.3...6.0.0-beta.0) (2018-03-16)

### Bug Fixes

- **AjaxObservable:** 1xx,2xx,3xx requests shouldn't error, only 4xx,5xx ([#3438](https://github.com/ReactiveX/RxJS/issues/3438)) ([2128932](https://github.com/ReactiveX/RxJS/commit/2128932))
- **compat:** adjustments to get rxjs-compat to build correctly ([dea6964](https://github.com/ReactiveX/RxJS/commit/dea6964))
- **config:** expose configuration via rxjs exports ([#3441](https://github.com/ReactiveX/RxJS/issues/3441)) ([4287424](https://github.com/ReactiveX/RxJS/commit/4287424))
- **config:** make sure that Promise config is undefined initially ([#3440](https://github.com/ReactiveX/RxJS/issues/3440)) ([469afe8](https://github.com/ReactiveX/RxJS/commit/469afe8))
- **ESM:** Add [operators|ajax|websocket|testing]/package.json for ESM support, fixes [#3227](https://github.com/ReactiveX/RxJS/issues/3227) ([#3356](https://github.com/ReactiveX/RxJS/issues/3356)) ([725dcb4](https://github.com/ReactiveX/RxJS/commit/725dcb4))
- **forkJoin:** fix forkJoin typings for forkJoin(Observable<any>[]) ([#3436](https://github.com/ReactiveX/RxJS/issues/3436)) ([17c7f8f](https://github.com/ReactiveX/RxJS/commit/17c7f8f))
- **fromEvent:** Defines toString to fix Closure compilations ([#3417](https://github.com/ReactiveX/RxJS/issues/3417)) ([1558b43](https://github.com/ReactiveX/RxJS/commit/1558b43))
- **fromEvent:** pass options in unsubscribe ([f1872b0](https://github.com/ReactiveX/RxJS/commit/f1872b0)), closes [#3349](https://github.com/ReactiveX/RxJS/issues/3349)
- **publishReplay:** type inference improved ([#3437](https://github.com/ReactiveX/RxJS/issues/3437)) ([dd7c9f1](https://github.com/ReactiveX/RxJS/commit/dd7c9f1)), closes [#3260](https://github.com/ReactiveX/RxJS/issues/3260)
- **rxjs:** add exports for symbols/interfaces that were missing ([#3380](https://github.com/ReactiveX/RxJS/issues/3380)) ([1622ee0](https://github.com/ReactiveX/RxJS/commit/1622ee0))
- **rxjs:** make sure esm imports from index.js by default, not Rx.js ([#3316](https://github.com/ReactiveX/RxJS/issues/3316)) ([c2b00f4](https://github.com/ReactiveX/RxJS/commit/c2b00f4)), closes [#3315](https://github.com/ReactiveX/RxJS/issues/3315)
- **rxjs:** once again exports custom error types ([#3371](https://github.com/ReactiveX/RxJS/issues/3371)) ([4465a9f](https://github.com/ReactiveX/RxJS/commit/4465a9f))
- **rxjs:** remove types.ts importing from itself. ([#3383](https://github.com/ReactiveX/RxJS/issues/3383)) ([8fd50ad](https://github.com/ReactiveX/RxJS/commit/8fd50ad))
- **spec:** get tests running using compatibility package ([916e968](https://github.com/ReactiveX/RxJS/commit/916e968))
- correct internal module paths to be systemjs compatible ([#3412](https://github.com/ReactiveX/RxJS/issues/3412)) ([35abc9d](https://github.com/ReactiveX/RxJS/commit/35abc9d))
- **Symbol.iterator:** correctly handle case where Symbol constructor itself is not defined ([#3394](https://github.com/ReactiveX/RxJS/issues/3394)) ([6725be1](https://github.com/ReactiveX/RxJS/commit/6725be1))
- **typings:** fixed some cases where multicast and publish would not return a ConnectableObservable ([#3320](https://github.com/ReactiveX/RxJS/issues/3320)) ([ddffecc](https://github.com/ReactiveX/RxJS/commit/ddffecc))
- reexport Symbol.observable typings patch ([4c4d7b0](https://github.com/ReactiveX/RxJS/commit/4c4d7b0))
- remove the root operators.ts because it overshadows operators/package.json ([184b6d4](https://github.com/ReactiveX/RxJS/commit/184b6d4))

### Code Refactoring

- **Observable.if:** remove ts hacks from Observable ([f46f261](https://github.com/ReactiveX/RxJS/commit/f46f261))
- **Rx.ts:** move Rx.ts to internal ([#3400](https://github.com/ReactiveX/RxJS/issues/3400)) ([7ad2119](https://github.com/ReactiveX/RxJS/commit/7ad2119))

### Features

- **ajax:** default to opting into CORS ([#3442](https://github.com/ReactiveX/RxJS/issues/3442)) ([aa3bf57](https://github.com/ReactiveX/RxJS/commit/aa3bf57)), closes [#3273](https://github.com/ReactiveX/RxJS/issues/3273)
- **bindCallback:** remove result selector ([2535641](https://github.com/ReactiveX/RxJS/commit/2535641))
- **bindNodeCallback:** remove resultSelector ([26e6e5c](https://github.com/ReactiveX/RxJS/commit/26e6e5c))
- **compat:** add compatability package definition ([40aca82](https://github.com/ReactiveX/RxJS/commit/40aca82))
- **compat:** add concat operator to compatibility layer ([6e84e78](https://github.com/ReactiveX/RxJS/commit/6e84e78))
- **compat:** add legacy reexport compat layer for 'rxjs/Observable' and other top-level symbols ([70e562b](https://github.com/ReactiveX/RxJS/commit/70e562b))
- **compat:** add Rx.ts to rxjs-compat ([df25de1](https://github.com/ReactiveX/RxJS/commit/df25de1))
- **compat:** compatibility mode for combineLatest ([fd86df5](https://github.com/ReactiveX/RxJS/commit/fd86df5))
- **compat:** compatibility mode for merge operator ([ffce980](https://github.com/ReactiveX/RxJS/commit/ffce980))
- **compat:** compatibility mode for zip operator ([9f131d0](https://github.com/ReactiveX/RxJS/commit/9f131d0))
- **compat:** make Rx.ts for compatability layer work as the default for rxjs-compat ([d43a4c2](https://github.com/ReactiveX/RxJS/commit/d43a4c2))
- **compat:** set up correct imports & get build working for rxjs-comapt ([1a0dc97](https://github.com/ReactiveX/RxJS/commit/1a0dc97))
- **deprecated-error-handling-warning:** add console warning when code sets the flag to bad mode ([49be56a](https://github.com/ReactiveX/RxJS/commit/49be56a))
- **error-handling:** add deprecated sync error handling behind a flag ([583cd1d](https://github.com/ReactiveX/RxJS/commit/583cd1d))
- **exhaustMap:** simplify interface ([42589d0](https://github.com/ReactiveX/RxJS/commit/42589d0))
- **first:** simplify interface ([a011338](https://github.com/ReactiveX/RxJS/commit/a011338))
- **forkJoin:** simplify interface ([4d2338b](https://github.com/ReactiveX/RxJS/commit/4d2338b))
- **fromEvent:** remove resultSelector ([197f449](https://github.com/ReactiveX/RxJS/commit/197f449))
- **fromEvent:** will now emit an array when event emits multiple arguments ([51b37fd](https://github.com/ReactiveX/RxJS/commit/51b37fd))
- **fromEventPattern:** removed resultSelector ([6b34f9f](https://github.com/ReactiveX/RxJS/commit/6b34f9f))
- **last:** simplify interface ([3240419](https://github.com/ReactiveX/RxJS/commit/3240419))
- **mergeMap|concatMap|concatMapTo:** simplified the signatures ([d293245](https://github.com/ReactiveX/RxJS/commit/d293245))
- **mergeMapTo:** simplify interface ([582c7be](https://github.com/ReactiveX/RxJS/commit/582c7be))
- **never:** no longer export `never` function ([#3386](https://github.com/ReactiveX/RxJS/issues/3386)) ([53debc8](https://github.com/ReactiveX/RxJS/commit/53debc8))
- **switchMap|switchMapTo:** simplify interface ([959fb6a](https://github.com/ReactiveX/RxJS/commit/959fb6a))
- **Symbol.iterator:** no longer polyfilled ([#3389](https://github.com/ReactiveX/RxJS/issues/3389)) ([6319f3c](https://github.com/ReactiveX/RxJS/commit/6319f3c))
- **Symbol.observable:** is no longer polyfilled ([#3387](https://github.com/ReactiveX/RxJS/issues/3387)) ([4a5aaaf](https://github.com/ReactiveX/RxJS/commit/4a5aaaf))
- **throwIfEmpty:** adds throwIfEmpty operator ([#3368](https://github.com/ReactiveX/RxJS/issues/3368)) ([9b21458](https://github.com/ReactiveX/RxJS/commit/9b21458))
- **typings:** updated typings for combineAll, mergeAll, concatAll, switch, exhaust, zipAll ([#3321](https://github.com/ReactiveX/RxJS/issues/3321)) ([f7e4c02](https://github.com/ReactiveX/RxJS/commit/f7e4c02))
- **umd:** UMD now mirrors export schema for ESM and CJS ([#3426](https://github.com/ReactiveX/RxJS/issues/3426)) ([556c904](https://github.com/ReactiveX/RxJS/commit/556c904))

### BREAKING CHANGES

- **ajax:** will no longer execute a CORS request by default, you must opt-in with the `crossDomain` flag in the config.
- **mergeMap|concatMap|concatMapTo:** mergeMap, concatMap and concatMapTo no longer support a result selector, if you need to use a result selector, use the following pattern: `source.mergeMap(x => of(x + x).pipe(map(y => y + x))` (the pattern would be the same for `concatMap`).
- **never:** no longer exported. Use the `NEVER` constant instead.
- **bindCallback:** removes result selector, use `map` instead: `bindCallback(fn1, fn2)()` becomes `bindCallback(fn1)().pipe(map(fn2))`
- **Rx.ts:** importing from `rxjs/Rx` is no longer available. Upcoming backwards compat solution will allow that
- **Symbol.iterator:** We are no longer polyfilling `Symbol.iterator`. That would be done by a proper polyfilling library
- **Observable.if:** TypeScript users using `Observable.if` will have to cast `Observable` as any to get to `if`. It is a better idea to just use `iif` directly via `import { iif } from 'rxjs';`
- **bindNodeCallback:** resultSelector removed, use `map` instead: `bindNodeCallback(fn1, fn2)()` becomes `bindNodeCallback(fn1)().pipe(map(fn2))`
- **Symbol.observable:** RxJS will no longer be polyfilling Symbol.observable. That should be done by an actual polyfill library. This is to prevent duplication of code, and also to prevent having modules with side-effects in rxjs.
- **fromEvent:** result selector removed, use `map` instead: `fromEvent(target, 'click', fn)` becomes `fromEvent(target, 'click').pipe(map(fn))`
- **last:** no longer accepts `resultSelector` argument. To get this same functionality, use `map`.
- **first:** no longer supports `resultSelector` argument. The same functionality can be achieved by simply mapping either before or after `first` depending on your use case.
- **exhaustMap:** `resultSelector` no longer supported, to get this functionality use: `source.pipe(exhaustMap(x => of(x + x).pipe(map(y => x + y))))`
- **switchMap|switchMapTo:** `switchMap` and `switchMapTo` no longer take `resultSelector` arguments, to get the same functionality use `switchMap` and `map` in combination: `source.pipe(switchMap(x => of(x + x).pipe(y => x + y)))`.
- **mergeMapTo:** `mergeMapTo` no longer accepts a resultSelector, to get this functionality, you'll want to use `mergeMap` and `map` together: `source.pipe(mergeMap(() => inner).pipe(map(y => x + y)))`
- **fromEventPattern:** no longer supports a result selector, use `map` instead: `fromEventPattern(fn1, fn2, fn3)` becomes `fromEventPattern(fn1, fn2).pipe(map(fn3))`

<a name="6.0.0-alpha.4"></a>

# [6.0.0-alpha.4](https://github.com/ReactiveX/RxJS/compare/6.0.0-alpha.3...v6.0.0-alpha.4) (2018-03-13)

### Bug Fixes

- **ESM:** Add [operators|ajax|websocket|testing]/package.json for ESM support, fixes [#3227](https://github.com/ReactiveX/RxJS/issues/3227) ([#3356](https://github.com/ReactiveX/RxJS/issues/3356)) ([725dcb4](https://github.com/ReactiveX/RxJS/commit/725dcb4))
- **fromEvent:** Defines toString to fix Closure compilations ([#3417](https://github.com/ReactiveX/RxJS/issues/3417)) ([1558b43](https://github.com/ReactiveX/RxJS/commit/1558b43))
- **fromEvent:** pass options in unsubscribe ([f1872b0](https://github.com/ReactiveX/RxJS/commit/f1872b0)), closes [#3349](https://github.com/ReactiveX/RxJS/issues/3349)
- **rxjs:** add exports for symbols/interfaces that were missing ([#3380](https://github.com/ReactiveX/RxJS/issues/3380)) ([1622ee0](https://github.com/ReactiveX/RxJS/commit/1622ee0))
- **rxjs:** make sure esm imports from index.js by default, not Rx.js ([#3316](https://github.com/ReactiveX/RxJS/issues/3316)) ([c2b00f4](https://github.com/ReactiveX/RxJS/commit/c2b00f4)), closes [#3315](https://github.com/ReactiveX/RxJS/issues/3315)
- **rxjs:** once again exports custom error types ([#3371](https://github.com/ReactiveX/RxJS/issues/3371)) ([4465a9f](https://github.com/ReactiveX/RxJS/commit/4465a9f))
- **rxjs:** remove types.ts importing from itself. ([#3383](https://github.com/ReactiveX/RxJS/issues/3383)) ([8fd50ad](https://github.com/ReactiveX/RxJS/commit/8fd50ad))
- correct internal module paths to be systemjs compatible ([#3412](https://github.com/ReactiveX/RxJS/issues/3412)) ([35abc9d](https://github.com/ReactiveX/RxJS/commit/35abc9d))
- **Symbol.iterator:** correctly handle case where Symbol constructor itself is not defined ([#3394](https://github.com/ReactiveX/RxJS/issues/3394)) ([6725be1](https://github.com/ReactiveX/RxJS/commit/6725be1))
- **typings:** fixed some cases where multicast and publish would not return a ConnectableObservable ([#3320](https://github.com/ReactiveX/RxJS/issues/3320)) ([ddffecc](https://github.com/ReactiveX/RxJS/commit/ddffecc))
- reexport Symbol.observable typings patch ([4c4d7b0](https://github.com/ReactiveX/RxJS/commit/4c4d7b0))
- remove the root operators.ts because it overshadows operators/package.json ([184b6d4](https://github.com/ReactiveX/RxJS/commit/184b6d4))

### Code Refactoring

- **Observable.if:** remove ts hacks from Observable ([f46f261](https://github.com/ReactiveX/RxJS/commit/f46f261))
- **Rx.ts:** move Rx.ts to internal ([#3400](https://github.com/ReactiveX/RxJS/issues/3400)) ([7ad2119](https://github.com/ReactiveX/RxJS/commit/7ad2119))

### Features

- **bindCallback:** remove result selector ([2535641](https://github.com/ReactiveX/RxJS/commit/2535641))
- **bindNodeCallback:** remove resultSelector ([26e6e5c](https://github.com/ReactiveX/RxJS/commit/26e6e5c))
- **exhaustMap:** simplify interface ([42589d0](https://github.com/ReactiveX/RxJS/commit/42589d0))
- **first:** simplify interface ([a011338](https://github.com/ReactiveX/RxJS/commit/a011338))
- **forkJoin:** simplify interface ([4d2338b](https://github.com/ReactiveX/RxJS/commit/4d2338b))
- **fromEvent:** remove resultSelector ([197f449](https://github.com/ReactiveX/RxJS/commit/197f449))
- **fromEvent:** will now emit an array when event emits multiple arguments ([51b37fd](https://github.com/ReactiveX/RxJS/commit/51b37fd))
- **fromEventPattern:** removed resultSelector ([6b34f9f](https://github.com/ReactiveX/RxJS/commit/6b34f9f))
- **last:** simplify interface ([3240419](https://github.com/ReactiveX/RxJS/commit/3240419))
- **mergeMap|concatMap|concatMapTo:** simplified the signatures ([d293245](https://github.com/ReactiveX/RxJS/commit/d293245))
- **mergeMapTo:** simplify interface ([582c7be](https://github.com/ReactiveX/RxJS/commit/582c7be))
- **never:** no longer export `never` function ([#3386](https://github.com/ReactiveX/RxJS/issues/3386)) ([53debc8](https://github.com/ReactiveX/RxJS/commit/53debc8))
- **switchMap|switchMapTo:** simplify interface ([959fb6a](https://github.com/ReactiveX/RxJS/commit/959fb6a))
- **Symbol.iterator:** no longer polyfilled ([#3389](https://github.com/ReactiveX/RxJS/issues/3389)) ([6319f3c](https://github.com/ReactiveX/RxJS/commit/6319f3c))
- **Symbol.observable:** is no longer polyfilled ([#3387](https://github.com/ReactiveX/RxJS/issues/3387)) ([4a5aaaf](https://github.com/ReactiveX/RxJS/commit/4a5aaaf))
- **throwIfEmpty:** adds throwIfEmpty operator ([#3368](https://github.com/ReactiveX/RxJS/issues/3368)) ([9b21458](https://github.com/ReactiveX/RxJS/commit/9b21458))
- **typings:** updated typings for combineAll, mergeAll, concatAll, switch, exhaust, zipAll ([#3321](https://github.com/ReactiveX/RxJS/issues/3321)) ([f7e4c02](https://github.com/ReactiveX/RxJS/commit/f7e4c02))
- **umd:** UMD now mirrors export schema for ESM and CJS ([#3426](https://github.com/ReactiveX/RxJS/issues/3426)) ([556c904](https://github.com/ReactiveX/RxJS/commit/556c904))

### BREAKING CHANGES

- **Symbol.observable:** RxJS will no longer be polyfilling Symbol.observable. That should be done by an actual polyfill library. This is to prevent duplication of code, and also to prevent having modules with side-effects in rxjs.
- **mergeMap|concatMap|concatMapTo:** mergeMap, concatMap and concatMapTo no longer support a result selector, if you need to use a result selector, use the following pattern: `source.mergeMap(x => of(x + x).pipe(map(y => y + x))` (the pattern would be the same for `concatMap`).
- **bindCallback:** removes result selector, use `map` instead: `bindCallback(fn1, fn2)()` becomes `bindCallback(fn1)().pipe(map(fn2))`
- **Rx.ts:** importing from `rxjs/Rx` is no longer available. Upcoming backwards compat solution will allow that
- **Symbol.iterator:** We are no longer polyfilling `Symbol.iterator`. That would be done by a proper polyfilling library
- **Observable.if:** TypeScript users using `Observable.if` will have to cast `Observable` as any to get to `if`. It is a better idea to just use `iif` directly via `import { iif } from 'rxjs';`
- **bindNodeCallback:** resultSelector removed, use `map` instead: `bindNodeCallback(fn1, fn2)()` becomes `bindNodeCallback(fn1)().pipe(map(fn2))`
- **never:** no longer exported. Use the `NEVER` constant instead.
- **fromEvent:** result selector removed, use `map` instead: `fromEvent(target, 'click', fn)` becomes `fromEvent(target, 'click').pipe(map(fn))`
- **last:** no longer accepts `resultSelector` argument. To get this same functionality, use `map`.
- **first:** no longer supports `resultSelector` argument. The same functionality can be achieved by simply mapping either before or after `first` depending on your use case.
- **exhaustMap:** `resultSelector` no longer supported, to get this functionality use: `source.pipe(exhaustMap(x => of(x + x).pipe(map(y => x + y))))`
- **switchMap|switchMapTo:** `switchMap` and `switchMapTo` no longer take `resultSelector` arguments, to get the same functionality use `switchMap` and `map` in combination: `source.pipe(switchMap(x => of(x + x).pipe(y => x + y)))`.
- **mergeMapTo:** `mergeMapTo` no longer accepts a resultSelector, to get this functionality, you'll want to use `mergeMap` and `map` together: `source.pipe(mergeMap(() => inner).pipe(map(y => x + y)))`
- **fromEventPattern:** no longer supports a result selector, use `map` instead: `fromEventPattern(fn1, fn2, fn3)` becomes `fromEventPattern(fn1, fn2).pipe(map(fn3))`

<a name="6.0.0-alpha.3"></a>

# [6.0.0-alpha.3](https://github.com/ReactiveX/RxJS/compare/6.0.0-alpha.2...v6.0.0-alpha.3) (2018-02-06)

### Bug Fixes

- **animationFrame.spec:** spec description fix ([#3140](https://github.com/ReactiveX/RxJS/issues/3140)) ([ab6c325](https://github.com/ReactiveX/RxJS/commit/ab6c325))
- **debounce:** support scalar selectors ([#3236](https://github.com/ReactiveX/RxJS/issues/3236)) ([1548393](https://github.com/ReactiveX/RxJS/commit/1548393)), closes [#3232](https://github.com/ReactiveX/RxJS/issues/3232)
- **forkJoin:** catch and forward selector errors ([#3261](https://github.com/ReactiveX/RxJS/issues/3261)) ([e57bbb7](https://github.com/ReactiveX/RxJS/commit/e57bbb7)), closes [#3216](https://github.com/ReactiveX/RxJS/issues/3216)
- **Observable:** expose pipe rest parameter overload ([#3292](https://github.com/ReactiveX/RxJS/issues/3292)) ([7ff5bc3](https://github.com/ReactiveX/RxJS/commit/7ff5bc3))
- **onErrorResumeNext:** no longer holds onto subscriptions too long ([abbbdad](https://github.com/ReactiveX/RxJS/commit/abbbdad)), closes [#3178](https://github.com/ReactiveX/RxJS/issues/3178)
- **scheduler:** prevent unwanted clearInterval ([#3226](https://github.com/ReactiveX/RxJS/issues/3226)) ([d7cfb42](https://github.com/ReactiveX/RxJS/commit/d7cfb42)), closes [#3042](https://github.com/ReactiveX/RxJS/issues/3042)
- **timer:** multiple subscriptions to timer(Date) behaves correctly ([aafa7ff](https://github.com/ReactiveX/RxJS/commit/aafa7ff)), closes [#3252](https://github.com/ReactiveX/RxJS/issues/3252)
- **typings:** correct compilation warnings from missing types in tests ([3aad6bc](https://github.com/ReactiveX/RxJS/commit/3aad6bc))
- **typings:** relax debounce selector type ([c419ab4](https://github.com/ReactiveX/RxJS/commit/c419ab4)), closes [#3164](https://github.com/ReactiveX/RxJS/issues/3164)
- **typings:** relax throttle selector type ([#3205](https://github.com/ReactiveX/RxJS/issues/3205)) ([e83fda7](https://github.com/ReactiveX/RxJS/commit/e83fda7)), closes [#3204](https://github.com/ReactiveX/RxJS/issues/3204)
- **typings:** the return type of factory of defer should be ObservableInput<T> ([#3211](https://github.com/ReactiveX/RxJS/issues/3211)) ([dc41a5e](https://github.com/ReactiveX/RxJS/commit/dc41a5e))

### Features

- **empty:** empty() returns the same instance ([5c7c749](https://github.com/ReactiveX/RxJS/commit/5c7c749))
- **EMPTY:** observable constant EMPTY now exported ([08fb074](https://github.com/ReactiveX/RxJS/commit/08fb074))
- **never:** always return the same instance ([#3249](https://github.com/ReactiveX/RxJS/issues/3249)) ([d57fa52](https://github.com/ReactiveX/RxJS/commit/d57fa52))
- **rxjs:** move rxjs/create into rxjs ([#3299](https://github.com/ReactiveX/RxJS/issues/3299)) ([6711fe2](https://github.com/ReactiveX/RxJS/commit/6711fe2))
- **throwError:** functional version of throwError ([639236e](https://github.com/ReactiveX/RxJS/commit/639236e))

### BREAKING CHANGES

- **rxjs:** `rxjs/create` items are now exported from `rxjs`
- **throwError:** Observable.throw no longer available in TypeScript without a cast
- **empty:** `empty()` without a scheduler will return the same
  instance every time.
- **empty:** In TypeScript, `empty()` no longer accepts a generic
  argument, as it returns `Observable<never>`
- **never:** `never()` always returns the same instance
- **never:** TypeScript typing for `never()` is now `Observable<never>` and the function no longer requires a generic type.

<a name="6.0.0-alpha.2"></a>

# [6.0.0-alpha.2](https://github.com/ReactiveX/RxJS/compare/6.0.0-alpha.1...6.0.0-alpha.2) (2018-01-14)

### Bug Fixes

- **build:** properly outputs subdirectories like `rxjs/operators` ([34fe560](https://github.com/ReactiveX/RxJS/commit/34fe560))

<a name="6.0.0-alpha.1"></a>

# [6.0.0-alpha.1](https://github.com/ReactiveX/RxJS/compare/5.5.3...v6.0.0-alpha.1) (2018-01-12)

### Bug Fixes

- Revert "fix(scheduler): prevent unwanted clearInterval ([#3044](https://github.com/ReactiveX/RxJS/issues/3044))" ([ad5c7c6](https://github.com/ReactiveX/RxJS/commit/ad5c7c6))
- Revert "fix(scheduler): prevent unwanted clearInterval ([#3044](https://github.com/ReactiveX/RxJS/issues/3044))" ([64f9285](https://github.com/ReactiveX/RxJS/commit/64f9285))
- **debounceTime:** synchronous reentrancy of debounceTime no longer swallows the second value ([#3218](https://github.com/ReactiveX/RxJS/issues/3218)) ([598e9ce](https://github.com/ReactiveX/RxJS/commit/598e9ce)), closes [#2748](https://github.com/ReactiveX/RxJS/issues/2748)
- **dependency:** move symbol-observable into devdependency ([4400628](https://github.com/ReactiveX/RxJS/commit/4400628))
- **IteratorObservable:** get new iterator for each subscription ([#2497](https://github.com/ReactiveX/RxJS/issues/2497)) ([1bd0a58](https://github.com/ReactiveX/RxJS/commit/1bd0a58)), closes [#2496](https://github.com/ReactiveX/RxJS/issues/2496)
- **Observable.toArray:** Fix toArray with multiple subscriptions. ([#3134](https://github.com/ReactiveX/RxJS/issues/3134)) ([3390926](https://github.com/ReactiveX/RxJS/commit/3390926))
- **SystemJS:** avoid node module resolution of pipeable operators ([#3025](https://github.com/ReactiveX/RxJS/issues/3025)) ([0f3cf71](https://github.com/ReactiveX/RxJS/commit/0f3cf71)), closes [#2971](https://github.com/ReactiveX/RxJS/issues/2971) [#2996](https://github.com/ReactiveX/RxJS/issues/2996) [#3011](https://github.com/ReactiveX/RxJS/issues/3011)
- **tap:** make next optional ([#3073](https://github.com/ReactiveX/RxJS/issues/3073)) ([e659f0c](https://github.com/ReactiveX/RxJS/commit/e659f0c)), closes [#2534](https://github.com/ReactiveX/RxJS/issues/2534)
- **TSC:** Fixing TSC errors. Fixes [#3020](https://github.com/ReactiveX/RxJS/issues/3020) ([01d1575](https://github.com/ReactiveX/RxJS/commit/01d1575))
- **typings:** the return type of project of mergeScan should be ObservableInput<R> ([23fe17d](https://github.com/ReactiveX/RxJS/commit/23fe17d))

### Chores

- **TypeScript:** Bump up typescript to latest ([#3009](https://github.com/ReactiveX/RxJS/issues/3009)) ([2f395da](https://github.com/ReactiveX/RxJS/commit/2f395da))

### Code Refactoring

- **asap:** Remove setImmediate polyfill ([5eb6af7](https://github.com/ReactiveX/RxJS/commit/5eb6af7))
- **distinct:** Remove Set polyfill ([68ee499](https://github.com/ReactiveX/RxJS/commit/68ee499))
- **groupBy:** Remove Map polyfill ([74b5b1a](https://github.com/ReactiveX/RxJS/commit/74b5b1a))

### Features

- **Observable:** unhandled errors are now reported to HostReportErrors ([#3062](https://github.com/ReactiveX/RxJS/issues/3062)) ([cd9626a](https://github.com/ReactiveX/RxJS/commit/cd9626a))
- **reorganize:** move ./interfaces.ts to internal/types.ts ([cfbfaac](https://github.com/ReactiveX/RxJS/commit/cfbfaac))
- **reorganize:** internal utils hidden ([70058cd](https://github.com/ReactiveX/RxJS/commit/70058cd))
- **reorganize:** add `rxjs/create` exports ([c9963bd](https://github.com/ReactiveX/RxJS/commit/c9963bd))
- **reorganize:** ajax observable creator now exported from `rxjs/ajax` ([e971c93](https://github.com/ReactiveX/RxJS/commit/e971c93))
- **reorganize:** all patch operators moved to `internal` directory ([7342401](https://github.com/ReactiveX/RxJS/commit/7342401))
- **reorganize:** export `noop` and `identity` from `rxjs` ([810c4d0](https://github.com/ReactiveX/RxJS/commit/810c4d0))
- **reorganize:** export `Notification` from `rxjs` ([8809b48](https://github.com/ReactiveX/RxJS/commit/8809b48))
- **reorganize:** export schedulers from `rxjs` ([abd3b61](https://github.com/ReactiveX/RxJS/commit/abd3b61))
- **reorganize:** export Subject, ReplaySubject, BehaviorSubject from rxjs ([bd683ca](https://github.com/ReactiveX/RxJS/commit/bd683ca))
- **reorganize:** export the `pipe` utility function from `rxjs` ([4574310](https://github.com/ReactiveX/RxJS/commit/4574310))
- **reorganize:** hid testing implementation details ([b981666](https://github.com/ReactiveX/RxJS/commit/b981666))
- **reorganize:** move observable implementations under internal directory ([2d5c3f8](https://github.com/ReactiveX/RxJS/commit/2d5c3f8))
- **reorganize:** move operator impls under internal directory ([207976f](https://github.com/ReactiveX/RxJS/commit/207976f))
- **reorganize:** move top-level impls under internal directory ([c3bb705](https://github.com/ReactiveX/RxJS/commit/c3bb705))
- **reorganize:** moved symbols to be internal ([80783ab](https://github.com/ReactiveX/RxJS/commit/80783ab))
- **reorganize:** operators all exported from `rxjs/operators` ([b1f8bfe](https://github.com/ReactiveX/RxJS/commit/b1f8bfe))
- **reorganize:** websocket subject creator now exported from `rxjs/websocket` ([5ac62c0](https://github.com/ReactiveX/RxJS/commit/5ac62c0))

### BREAKING CHANGES

- **webSocket:** `webSocket` creator function now exported from `rxjs/websocket` as `websocket`.
- **IteratorObservable:** IteratorObservable no longer share iterator between
  subscription
- **utils:** Many internal use utilities like `isArray` are now hidden under `rxjs/internal`, they are implementation details and should not be used.
- **testing observables:** `HotObservable` and `ColdObservable`, and other testing support types are no longer exported directly.
- **creation functions:** All create functions such as `of`, `from`, `combineLatest` and `fromEvent` should now be imported from `rxjs/create`.
- **types and interfaces:** Can no longer explicitly import types from `rxjs/interfaces`, import them from `rxjs` instead
- **symbols:** Symbols are no longer exported directly from modules such as `rxjs/symbol/observable` please use `Symbol.observable` and `Symbol.iterator` (polyfills may be required)
- **deep imports:** Can no longer deep import top-level types such as `rxjs/Observable`, `rxjs/Subject`, `rxjs/ReplaySubject`, et al. All imports should be done directly from `rxjs`, for example: `import \{ Observable, Subject \} from 'rxjs';`
- **schedulers:** Scheduler instances have changed names to be suffixed with `Scheduler`, (e.g. `asap` -> `asapScheduler`)
- **operators:** Pipeable operators must now be imported from `rxjs`
  like so: `import { map, filter, switchMap } from 'rxjs/operators';`. No deep imports.
- **ajax:** Ajax observable should be imported from `rxjs/ajax`.
- **Observable:** You should no longer deep import custom Observable
  implementations such as `ArrayObservable` or `ForkJoinObservable`.
- **\_throw:** `_throw` is now exported as `throwError`
- **if:** `if` is now exported as `iif`
- **operators:** Deep imports to `rxjs/operator/*` will no longer work. Again, pipe operators are still where they were.
- **error handling:** Unhandled errors are no longer caught and rethrown, rather they are caught and scheduled to be thrown, which causes them to be reported to window.onerror or process.on('error'), depending on the environment. Consequently, teardown after a synchronous, unhandled, error will no longer occur, as the teardown would not exist, and producer interference cannot occur
- **distinct:** Using `distinct` requires a `Set` implementation and must be polyfilled in older runtimes
- **asap:** Old runtimes must polyfill Promise in order to use ASAP scheduling.
- **groupBy:** Older runtimes will require Map to be polyfilled to use
  `groupBy`
- **TypeScript:** IE10 and lower will need to polyfill `Object.setPrototypeOf`
- **operators removed:** Operator versions of static observable creators such as
  `merge`, `concat`, `zip`, `onErrorResumeNext`, and `race` have been
  removed. Please use the static versions of those operations. e.g.
  `a.pipe(concat(b, c))` becomes `concat(a, b, c)`.

<a name="5.5.6"></a>

## [5.5.6](https://github.com/ReactiveX/RxJS/compare/5.5.5...v5.5.6) (2017-12-21)

### Bug Fixes

- **Observable:** rethrow errors when syncErrorThrowable and inherit it from destination. Fixes [#2813](https://github.com/ReactiveX/RxJS/issues/2813) ([541b49d](https://github.com/ReactiveX/RxJS/commit/541b49d))

<a name="5.5.5"></a>

## [5.5.5](https://github.com/ReactiveX/RxJS/compare/5.5.4...v5.5.5) (2017-12-06)

### Support Added

- **Bazel:** Add files to support users that want Bazel builds with RxJS ([12dac3b](https://github.com/ReactiveX/rxjs/commit/12dac3b))

<a name="5.5.4"></a>

## [5.5.4](https://github.com/ReactiveX/RxJS/compare/5.5.3...v5.5.4) (2017-12-05)

### Bug Fixes

- **scheduler:** resolve regression on angular router with zones ([#3158](https://github.com/ReactiveX/RxJS/issues/3158)) ([520b06a](https://github.com/ReactiveX/RxJS/commit/520b06a))
- **publish:** re-publish after having built with proper version of TypeScript. ([f0ff5bc](https://github.com/ReactiveX/RxJS/commit/f0ff5bc), closes[#3155](https://github.com/ReactiveX/rxjs/issues/3155))

<a name="5.5.3"></a>

## [5.5.3](https://github.com/ReactiveX/RxJS/compare/5.5.2...v5.5.3) (2017-12-01)

### Bug Fixes

- **concatStatic:** missing exports for mergeStatic and concatStatic ([#2999](https://github.com/ReactiveX/RxJS/issues/2999)) ([cae5f9b](https://github.com/ReactiveX/RxJS/commit/cae5f9b))
- **scheduler:** prevent unwanted clearInterval ([#3044](https://github.com/ReactiveX/RxJS/issues/3044)) ([7d722d4](https://github.com/ReactiveX/RxJS/commit/7d722d4)), closes [#3042](https://github.com/ReactiveX/RxJS/issues/3042)
- **SystemJS:** avoid node module resolution of pipeable operators ([#3025](https://github.com/ReactiveX/RxJS/issues/3025)) ([d77e3d7](https://github.com/ReactiveX/RxJS/commit/d77e3d7)), closes [#2971](https://github.com/ReactiveX/RxJS/issues/2971) [#2996](https://github.com/ReactiveX/RxJS/issues/2996) [#3011](https://github.com/ReactiveX/RxJS/issues/3011)
- **typings:** fix subscribe overloads ([#3053](https://github.com/ReactiveX/RxJS/issues/3053)) ([1a9fd42](https://github.com/ReactiveX/RxJS/commit/1a9fd42)), closes [#3052](https://github.com/ReactiveX/RxJS/issues/3052)

<a name="5.5.2"></a>

## [5.5.2](https://github.com/ReactiveX/RxJS/compare/5.5.1...v5.5.2) (2017-10-25)

### Bug Fixes

- **package:** fixed import failures in Webpack ([#2987](https://github.com/ReactiveX/RxJS/issues/2987)) ([e16202d](https://github.com/ReactiveX/RxJS/commit/e16202d))
- **typings:** improved type inference for arguments to publishReplay ([#2992](https://github.com/ReactiveX/RxJS/issues/2992)) ([0753ff7](https://github.com/ReactiveX/RxJS/commit/0753ff7)), closes [#2991](https://github.com/ReactiveX/RxJS/issues/2991)
- **typings:** ensure TS types for `zip` and `combineLatest` are properly inferred. ([b8e6cf8](https://github.com/ReactiveX/RxJS/commit/b8e6cf8))
- **typings:** publish variants will properly return ConnectableObservable([#2983](https://github.com/ReactiveX/RxJS/issues/2983)) ([d563bfa](https://github.com/ReactiveX/RxJS/commit/d563bfa))

<a name="5.5.1"></a>

## [5.5.1](https://github.com/ReactiveX/RxJS/compare/5.5.0...v5.5.1) (2017-10-24)

### Bug Fixes

- **build:** Remove `module` and `es2015` keys to avoid resolution conflicts ([5073139](https:/github.com/ReactiveX/RxJS/commit/5073139))
- **ajaxobservable:** fix operator import path ([d9b62ed](https://github.com/ReactiveX/RxJS/commit/d9b62ed))

<a name="5.5.0"></a>

# [5.5.0](https://github.com/ReactiveX/RxJS/compare/5.5.0-beta.7...v5.5.0) (2017-10-18)

### Bug Fixes

- **build:** CJS sourceMaps now inlined into sourcesContent ([39b4af5](https://github.com/ReactiveX/RxJS/commit/39b4af5)), closes [#2934](https://github.com/ReactiveX/RxJS/issues/2934)

### Features

- **publishReplay:** add selector function to publishReplay ([#2885](https://github.com/ReactiveX/RxJS/issues/2885)) ([e0efd13](https://github.com/ReactiveX/RxJS/commit/e0efd13))

<a name="5.5.0-beta.7"></a>

# [5.5.0-beta.7](https://github.com/ReactiveX/RxJS/compare/5.5.0-beta.5...5.5.0-beta.7) (2017-10-13)

(Due to a publish snafu, there is no 5.5.0-beta.6) (womp womp 👎)

### Bug Fixes

- **build:** sourceMaps updated to support CJS properly again ([75f7f11](https://github.com/ReactiveX/RxJS/commit/75f7f11)), closes [#2934](https://github.com/ReactiveX/RxJS/issues/2934)
- **flatMap:** reexport flatMap as alias of mergeMap ([#2920](https://github.com/ReactiveX/RxJS/issues/2920)) ([9922c02](https://github.com/ReactiveX/RxJS/commit/9922c02))
- **publish:** correct the name and republish to sync packages ([464b115](https://github.com/ReactiveX/RxJS/commit/464b115))
- **shareReplay:** no longer exporting function unnecessarily ([#2928](https://github.com/ReactiveX/RxJS/issues/2928)) ([e159578](https://github.com/ReactiveX/RxJS/commit/e159578))
- **shareReplay:** properly uses `lift` ([#2924](https://github.com/ReactiveX/RxJS/issues/2924)) ([3d9cf87](https://github.com/ReactiveX/RxJS/commit/3d9cf87)), closes [#2921](https://github.com/ReactiveX/RxJS/issues/2921)
- **toPromise:** include toPromise in build output ([#2923](https://github.com/ReactiveX/RxJS/issues/2923)) ([f55bfa5](https://github.com/ReactiveX/RxJS/commit/f55bfa5)), closes [#2922](https://github.com/ReactiveX/RxJS/issues/2922)

<a name="5.5.0-beta.5"></a>

# [5.5.0-beta.5](https://github.com/ReactiveX/RxJS/compare/5.5.0-beta.4...v5.5.0-beta.5) (2017-10-06)

### Bug Fixes

- **toPromise:** remove lettable version of toPromise ([031edca](https://github.com/ReactiveX/RxJS/commit/031edca)), closes [#2868](https://github.com/ReactiveX/RxJS/issues/2868)

### Features

- **toPromise:** now exists as a permanent method on Observable ([2e49a5c](https://github.com/ReactiveX/RxJS/commit/2e49a5c))

<a name="5.5.0-beta.4"></a>

# [5.5.0-beta.4](https://github.com/ReactiveX/RxJS/compare/5.5.0-beta.3...v5.5.0-beta.4) (2017-10-06)

### Bug Fixes

- **publish:** fix selector typings ([#2891](https://github.com/ReactiveX/RxJS/issues/2891)) ([9ee234d](https://github.com/ReactiveX/RxJS/commit/9ee234d)), closes [#2889](https://github.com/ReactiveX/RxJS/issues/2889)
- **shareReplay:** properly retains history on subscribe ([#2910](https://github.com/ReactiveX/RxJS/issues/2910)) ([accbcd0](https://github.com/ReactiveX/RxJS/commit/accbcd0)), closes [#2908](https://github.com/ReactiveX/RxJS/issues/2908)
- **subscribeOn:** remove subscribeOn from reexport to support treesha… ([#2899](https://github.com/ReactiveX/RxJS/issues/2899)) ([fb51a02](https://github.com/ReactiveX/RxJS/commit/fb51a02))

<a name="5.5.0-beta.3"></a>

# [5.5.0-beta.3](https://github.com/ReactiveX/RxJS/compare/5.5.0-beta.2...v5.5.0-beta.3) (2017-10-03)

### Bug Fixes

- **build:** revert to 5.4.x build output for CJS & add configurable support for ESM ([#2878](https://github.com/ReactiveX/RxJS/issues/2878)) ([167456a](https://github.com/ReactiveX/RxJS/commit/167456a))
- **concatAll:** use higher-order lettable version of concatAll ([60c96ab](https://github.com/ReactiveX/RxJS/commit/60c96ab))
- **mergeAll:** use higher-order lettable version of mergeAll ([f0b703b](https://github.com/ReactiveX/RxJS/commit/f0b703b))

<a name="5.5.0-beta.2"></a>

# [5.5.0-beta.2](https://github.com/ReactiveX/RxJS/compare/5.5.0-beta.1...v5.5.0-beta.2) (2017-09-27)

### Bug Fixes

- **build:** make CJS references to import X from '../operators' work correctly with SystemJS ([#2874](https://github.com/ReactiveX/RxJS/issues/2874)) ([3dd4cc4](https://github.com/ReactiveX/RxJS/commit/3dd4cc4))

<a name="5.5.0-beta.1"></a>

# [5.5.0-beta.1](https://github.com/ReactiveX/RxJS/compare/5.5.0-beta.0...v5.5.0-beta.1) (2017-09-27)

### Bug Fixes

- **package:** published from a Linux machine to prevent a strange issue where
  the Observable directory was not showing up when installed on some Linux
  environments.
- **build:** fix source maps by adding back sources and fixing path ([#2872](https://github.com/ReactiveX/RxJS/issues/2872)) ([daaf424](https://github.com/ReactiveX/RxJS/commit/daaf424))
- **package:** remove src directory and fix typings location ([#2866](https://github.com/ReactiveX/RxJS/issues/2866)) ([c57eea7](https://github.com/ReactiveX/RxJS/commit/c57eea7))

### Features

- **global:** export lettables as Rx.operators ([#2862](https://github.com/ReactiveX/RxJS/issues/2862)) ([ba2f586](https://github.com/ReactiveX/RxJS/commit/ba2f586)), closes [#2861](https://github.com/ReactiveX/RxJS/issues/2861)

<a name="5.5.0-beta.0"></a>

# [5.5.0-beta.0](https://github.com/ReactiveX/RxJS/compare/5.4.3...5.5.0-beta.0) (2017-09-22)

**Important! Checkout the explanation of the new [lettable operators features here](doc/lettable-operators.md)**

### Bug Fixes

- **package:** correct errors generated during rollup for UMD generation ([#2839](https://github.com/ReactiveX/RxJS/issues/2839)) ([124cc93](https://github.com/ReactiveX/RxJS/commit/124cc93))
- **partition:** update TypeScript signature to match docs and filter operator ([#2819](https://github.com/ReactiveX/RxJS/issues/2819)) ([755df9b](https://github.com/ReactiveX/RxJS/commit/755df9b))
- **subscribeToResult:** throw error in subscriber with inner observable ([d7bffa9](https://github.com/ReactiveX/RxJS/commit/d7bffa9)), closes [#2618](https://github.com/ReactiveX/RxJS/issues/2618)

### Features

- **ajax:** Include the response on instances of AjaxError ([3f6553c](https://github.com/ReactiveX/RxJS/commit/3f6553c))
- **audit:** add higher-order lettable version of audit ([e2daefe](https://github.com/ReactiveX/RxJS/commit/e2daefe))
- **auditTime:** add higher-order lettable version of auditTime ([9e963aa](https://github.com/ReactiveX/RxJS/commit/9e963aa))
- **buffer:** add higher-order lettable version of buffer ([d8ca9de](https://github.com/ReactiveX/RxJS/commit/d8ca9de))
- **bufferCount:** add higher-order lettable version of bufferCount ([0ae2ed5](https://github.com/ReactiveX/RxJS/commit/0ae2ed5))
- **bufferTime:** add higher-order lettable version of bufferTime operator ([0377ca6](https://github.com/ReactiveX/RxJS/commit/0377ca6))
- **bufferToggle:** add higher-order lettable version of bufferToggle ([ea1c3ee](https://github.com/ReactiveX/RxJS/commit/ea1c3ee))
- **bufferWhen:** add higher-order lettable version of bufferWhen ([ec3eceb](https://github.com/ReactiveX/RxJS/commit/ec3eceb))
- **catchError:** add higher-order lettable version of `catch` ([408a2af](https://github.com/ReactiveX/RxJS/commit/408a2af))
- **combineAll:** add higher-order lettable version of combineAll ([97704b3](https://github.com/ReactiveX/RxJS/commit/97704b3))
- **combineLatest:** add higher-order lettable version of combineLatest ([b7154f2](https://github.com/ReactiveX/RxJS/commit/b7154f2))
- **concatMap:** add higher-order lettable version of concatMap ([c4125ff](https://github.com/ReactiveX/RxJS/commit/c4125ff))
- **concatMapTo:** add higher-order lettable version of concatMapTo ([0a6672e](https://github.com/ReactiveX/RxJS/commit/0a6672e))
- **count:** add higher-order lettable version of count ([caf713e](https://github.com/ReactiveX/RxJS/commit/caf713e))
- **debounce:** add higher-order lettable version of debounce ([cb8ce46](https://github.com/ReactiveX/RxJS/commit/cb8ce46))
- **debounceTime:** add higher-order lettable version of debounceTime ([df0d439](https://github.com/ReactiveX/RxJS/commit/df0d439))
- **delay:** add higher-order lettable version of delay ([7efb803](https://github.com/ReactiveX/RxJS/commit/7efb803))
- **delayWhen:** add higher-order lettable version of delayWhen ([cb91c3f](https://github.com/ReactiveX/RxJS/commit/cb91c3f))
- **dematerialize:** add higher-order lettable version of dematerialize ([b5948f9](https://github.com/ReactiveX/RxJS/commit/b5948f9))
- **distinct:** add higher-order lettable version of distinct ([0429a69](https://github.com/ReactiveX/RxJS/commit/0429a69))
- **distinctUntilChanged:** add higher-order lettable version of distinctUntilChanged ([b2725e7](https://github.com/ReactiveX/RxJS/commit/b2725e7))
- **distinctUntilKeyChanged:** add higher-order lettable version of distinctUntilKeyChanged ([9db141c](https://github.com/ReactiveX/RxJS/commit/9db141c))
- **elementAt:** add higher-order lettable version of elementAt ([b8e956b](https://github.com/ReactiveX/RxJS/commit/b8e956b))
- **every:** add higher-order lettable version of every ([13f3503](https://github.com/ReactiveX/RxJS/commit/13f3503))
- **exhaust:** add higher-order lettable version of exhaust ([b145dca](https://github.com/ReactiveX/RxJS/commit/b145dca))
- **exhaustMap:** add higher-order lettable exhaustMap ([b134e0c](https://github.com/ReactiveX/RxJS/commit/b134e0c))
- **expand:** add higher-order lettable expand ([6ec8a19](https://github.com/ReactiveX/RxJS/commit/6ec8a19))
- **filter:** add higher-order lettable version of filter ([2848556](https://github.com/ReactiveX/RxJS/commit/2848556))
- **finalize:** add higher-order lettable version of finally, called finalize ([cfeae9f](https://github.com/ReactiveX/RxJS/commit/cfeae9f))
- **find:** add higher-order lettable version of find ([ff6d5af](https://github.com/ReactiveX/RxJS/commit/ff6d5af))
- **findIndex:** add higher-order lettable findIndex ([40e680e](https://github.com/ReactiveX/RxJS/commit/40e680e))
- **first:** add higher-order lettable first ([33eac1e](https://github.com/ReactiveX/RxJS/commit/33eac1e))
- **groupBy:** add higher-order lettable groupBy ([5281229](https://github.com/ReactiveX/RxJS/commit/5281229))
- **ignoreElements:** add higher-order lettable version of ignoreElements ([68286d4](https://github.com/ReactiveX/RxJS/commit/68286d4))
- **isEmpty:** add higher-order lettable version of isEmpty ([aad1833](https://github.com/ReactiveX/RxJS/commit/aad1833))
- **last:** add higher-order lettable version of last ([bf33b97](https://github.com/ReactiveX/RxJS/commit/bf33b97))
- **lettables:** add higher-order lettable versions of concat, concatAll, mergeAll ([d7e8be7](https://github.com/ReactiveX/RxJS/commit/d7e8be7))
- **map:** add higher-order lettable map operator ([ce40b2d](https://github.com/ReactiveX/RxJS/commit/ce40b2d))
- **mapTo:** add higher-order lettable version of mapTo ([e97530f](https://github.com/ReactiveX/RxJS/commit/e97530f))
- **materialize:** add higher-order lettable materialize operator ([ce42477](https://github.com/ReactiveX/RxJS/commit/ce42477))
- **merge:** add higher-order lettable version of merge ([#2809](https://github.com/ReactiveX/RxJS/issues/2809)) ([3136403](https://github.com/ReactiveX/RxJS/commit/3136403))
- **mergeMap:** add higher-order lettable version of mergeMap ([417efde](https://github.com/ReactiveX/RxJS/commit/417efde))
- **mergeMapTo:** add higher-order lettable version of mergeMapTo ([653b47a](https://github.com/ReactiveX/RxJS/commit/653b47a))
- **mergeScan:** add higher-order lettable version of mergeScan ([fde7205](https://github.com/ReactiveX/RxJS/commit/fde7205))
- **multicast:** add higher-order lettable variant of multicast ([fb6014d](https://github.com/ReactiveX/RxJS/commit/fb6014d))
- **observeOn:** add higher-order lettable version of observeOn ([feb0f5a](https://github.com/ReactiveX/RxJS/commit/feb0f5a))
- **onErrorResumeNext:** add higher-order lettable version of onErrorResumeNext ([badec6a](https://github.com/ReactiveX/RxJS/commit/badec6a))
- **operators:** higher-order lettables of reduce, min, max and defaultIfEmpty added ([9974fc2](https://github.com/ReactiveX/RxJS/commit/9974fc2))
- **package:** rxjs distribution now supports main, module and es2015 keys in package.json ([988e1af](https://github.com/ReactiveX/RxJS/commit/988e1af))
- **pairwise:** add higher-order lettable version of pairwise ([bb21a44](https://github.com/ReactiveX/RxJS/commit/bb21a44))
- **partition:** add higher-order lettable version of partition ([595e588](https://github.com/ReactiveX/RxJS/commit/595e588))
- **pipe:** add pipe method ot Observable ([9f6312d](https://github.com/ReactiveX/RxJS/commit/9f6312d))
- **pipe:** add pipe utility function([42f9daf](https://github.com/ReactiveX/RxJS/commit/42f9daf))
- **pluck:** add higher-order lettable version of pluck ([8ab0914](https://github.com/ReactiveX/RxJS/commit/8ab0914))
- **publish:** add higher-order lettable variant of publish ([4ccf794](https://github.com/ReactiveX/RxJS/commit/4ccf794))
- **publishBehavior:** add higher-order lettable version of publishBehavior ([e911aef](https://github.com/ReactiveX/RxJS/commit/e911aef))
- **publishLast:** add higher-order lettable version of publishLast ([684728c](https://github.com/ReactiveX/RxJS/commit/684728c))
- **publishReplay:** add higher-order lettable version of publishReplay ([2958917](https://github.com/ReactiveX/RxJS/commit/2958917))
- **race:** add higher-order lettable version of race ([e646851](https://github.com/ReactiveX/RxJS/commit/e646851))
- **refCount:** add higher-order lettable version of refCount ([21fba63](https://github.com/ReactiveX/RxJS/commit/21fba63))
- **repeat:** add higher-order lettable version of repeat ([8473fe5](https://github.com/ReactiveX/RxJS/commit/8473fe5))
- **repeatWhen:** add higher-order lettable version of repeatWhen ([1d1cecd](https://github.com/ReactiveX/RxJS/commit/1d1cecd))
- **retry:** add higher-order lettable version of retry ([28e9b13](https://github.com/ReactiveX/RxJS/commit/28e9b13))
- **retryWhen:** add higher-order lettable version of retryWhen ([1290e3c](https://github.com/ReactiveX/RxJS/commit/1290e3c))
- **sample:** add higher-order lettable version of sample ([8c73e6e](https://github.com/ReactiveX/RxJS/commit/8c73e6e))
- **sampleTime:** add higher-order lettable version of sampleTime ([ba6a9ce](https://github.com/ReactiveX/RxJS/commit/ba6a9ce))
- **scan:** add higher-order lettable version of scan ([2cc5d75](https://github.com/ReactiveX/RxJS/commit/2cc5d75))
- **sequenceEqual:** add higher-order lettable version of sequenceEqual ([7cd3165](https://github.com/ReactiveX/RxJS/commit/7cd3165))
- **share:** add higher-order lettable version of share ([f10c42e](https://github.com/ReactiveX/RxJS/commit/f10c42e))
- **shareReplay:** add higher-order lettable version of shareReplay ([e8be197](https://github.com/ReactiveX/RxJS/commit/e8be197))
- **single:** add higher-order lettable version of single ([3bc050a](https://github.com/ReactiveX/RxJS/commit/3bc050a))
- **skip:** add higher-order lettable version of skip ([baed383](https://github.com/ReactiveX/RxJS/commit/baed383))
- **skipLast:** add higher-order lettable version of skipLast ([6e1ff3c](https://github.com/ReactiveX/RxJS/commit/6e1ff3c))
- **skipUntil:** add higher-order lettable version of skipUntil ([6cc2cd6](https://github.com/ReactiveX/RxJS/commit/6cc2cd6))
- **skipWhile:** add higher-order lettable version of skipWhile ([76d8ffa](https://github.com/ReactiveX/RxJS/commit/76d8ffa))
- **subscribeOn:** add higher-order lettable version of subscribeOn ([866af37](https://github.com/ReactiveX/RxJS/commit/866af37))
- **switchAll:** add higher-order lettable version of switch ([2f12572](https://github.com/ReactiveX/RxJS/commit/2f12572))
- **switchMap:** add higher-order lettable version of switchMap ([b6e5b56](https://github.com/ReactiveX/RxJS/commit/b6e5b56))
- **switchMapTo:** add higher-order lettable version of switchMapTo ([2640184](https://github.com/ReactiveX/RxJS/commit/2640184))
- **take:** add higher-order lettable version of take ([089a5a6](https://github.com/ReactiveX/RxJS/commit/089a5a6))
- **takeLast:** add higher-order lettable version of takeLast ([cd7e7dd](https://github.com/ReactiveX/RxJS/commit/cd7e7dd))
- **takeUntil:** add higher-order lettable version of takeUntil ([bb2ddaa](https://github.com/ReactiveX/RxJS/commit/bb2ddaa))
- **takeWhile:** add higher-order lettable version of takeWhile ([f86c862](https://github.com/ReactiveX/RxJS/commit/f86c862))
- **tap:** add higher-order lettable version of do ([f85c60e](https://github.com/ReactiveX/RxJS/commit/f85c60e))
- **throttle:** add higher-order lettable version of throttle ([e4dd1fd](https://github.com/ReactiveX/RxJS/commit/e4dd1fd))
- **throttleTime:** add higher-order lettable version of throttleTime ([34a592d](https://github.com/ReactiveX/RxJS/commit/34a592d))
- **timeInterval:** add higher-order lettable version of timeInterval ([fcad034](https://github.com/ReactiveX/RxJS/commit/fcad034))
- **timeout:** add higher-order lettable version of timeout ([2546750](https://github.com/ReactiveX/RxJS/commit/2546750))
- **timeoutWith:** add higher-order lettable version of timeoutWith ([bd7f5ed](https://github.com/ReactiveX/RxJS/commit/bd7f5ed))
- **timestamp:** add higher-order lettable version of timestamp ([a780bf2](https://github.com/ReactiveX/RxJS/commit/a780bf2))
- **toArray:** add higher-order lettable version of toArray ([82480cf](https://github.com/ReactiveX/RxJS/commit/82480cf))
- **toArray:** add higher-order lettable version of toArray ([a03a50c](https://github.com/ReactiveX/RxJS/commit/a03a50c))
- **toPromise:** add higher-order lettable version of toPromise ([1627da2](https://github.com/ReactiveX/RxJS/commit/1627da2))
- **window:** add higher-order lettable version of window ([9f6373e](https://github.com/ReactiveX/RxJS/commit/9f6373e))
- **windowCount:** add higher-order lettable version of windowCount ([2a9e54c](https://github.com/ReactiveX/RxJS/commit/2a9e54c))
- **windowTime:** add higher-order lettable version of windowTime ([29ffa1b](https://github.com/ReactiveX/RxJS/commit/29ffa1b))
- **windowToggle:** add higher-order lettable version of windowToggle ([81ec389](https://github.com/ReactiveX/RxJS/commit/81ec389))
- **windowWhen:** add higher-order lettable version of windowWhen ([0b73208](https://github.com/ReactiveX/RxJS/commit/0b73208))
- **withLatestFrom:** add higher-order lettable version of withLatestFrom ([509c97c](https://github.com/ReactiveX/RxJS/commit/509c97c))
- **zip:** add higher-order lettable version of zip ([8a9b9b2](https://github.com/ReactiveX/RxJS/commit/8a9b9b2))
- **zipAll:** add higher-order lettable version of zipAll ([f6bd51f](https://github.com/ReactiveX/RxJS/commit/f6bd51f))

<a name="5.4.3"></a>

## [5.4.3](https://github.com/ReactiveX/RxJS/compare/5.4.2...v5.4.3) (2017-08-10)

### Bug Fixes

- **compilation:** compiles under typescript 2.4.2 ([#2780](https://github.com/ReactiveX/RxJS/issues/2780)) ([d2a32f9](https://github.com/ReactiveX/RxJS/commit/d2a32f9))
- **exports:** add exports for missing static operators: generate, ([08c4196](https://github.com/ReactiveX/RxJS/commit/08c4196))

<a name="5.4.2"></a>

## [5.4.2](https://github.com/ReactiveX/RxJS/compare/5.4.1...v5.4.2) (2017-07-05)

### Bug Fixes

- **Notification:** Don't reference `this` from static methods. ([9f8e375](https://github.com/ReactiveX/RxJS/commit/9f8e375))
- **Subject:** lift signature is now appropriate for stricter TypeScript 2.4 checks ([#2722](https://github.com/ReactiveX/RxJS/issues/2722)) ([9804de7](https://github.com/ReactiveX/RxJS/commit/9804de7))

<a name="5.4.1"></a>

## [5.4.1](https://github.com/ReactiveX/RxJS/compare/5.4.0...v5.4.1) (2017-06-14)

### Bug Fixes

- **ajax:** Only set timeout & responseType if request is asynchronous ([#2486](https://github.com/ReactiveX/RxJS/issues/2486)) ([380fbcf](https://github.com/ReactiveX/RxJS/commit/380fbcf))
- **audit:** will now properly mirror source if durations are Observable.empty() ([#2595](https://github.com/ReactiveX/RxJS/issues/2595)) ([6ded82e](https://github.com/ReactiveX/RxJS/commit/6ded82e))
- **elementAt:** will now properly unsubscribe when it completes or errors ([#2501](https://github.com/ReactiveX/RxJS/issues/2501)) ([a400cab](https://github.com/ReactiveX/RxJS/commit/a400cab))
- **ErrorObservable:** will now propagate errors properly when used in a `catch` after `fromPromise`. ([#2552](https://github.com/ReactiveX/RxJS/issues/2552)) ([cf88a20](https://github.com/ReactiveX/RxJS/commit/cf88a20))
- **groupBy:** group duration notifiers will now properly unsubscribe and clean up ([#2662](https://github.com/ReactiveX/RxJS/issues/2662)) ([ab92083](https://github.com/ReactiveX/RxJS/commit/ab92083)), closes [#2660](https://github.com/ReactiveX/RxJS/issues/2660) [#2661](https://github.com/ReactiveX/RxJS/issues/2661)
- **Observable:** errors thrown in observer/handlers without an operator applied will no longer be swallowed ([#2626](https://github.com/ReactiveX/RxJS/issues/2626)) ([c250afc](https://github.com/ReactiveX/RxJS/commit/c250afc)), closes [#2565](https://github.com/ReactiveX/RxJS/issues/2565)
- **reduce:** type definitions overloads for TypeScript are now in proper order ([#2523](https://github.com/ReactiveX/RxJS/issues/2523)) ([ccc0647](https://github.com/ReactiveX/RxJS/commit/ccc0647))
- **Schedulers:** Fix issue where canceling an asap or animationFrame action early could throw ([#2638](https://github.com/ReactiveX/RxJS/issues/2638)) ([fc39043](https://github.com/ReactiveX/RxJS/commit/fc39043))

<a name="5.4.0"></a>

# [5.4.0](https://github.com/ReactiveX/RxJS/) (2017-05-09)

### Features

- **shareReplay:** adds `shareReplay` variant of `publishReplay` ([#2443](https://github.com/ReactiveX/RxJS/issues/2443)) ([5a2266a](https://github.com/ReactiveX/RxJS/commit/5a2266a))
- **skipLast:** add skipLast operator ([#2316](https://github.com/ReactiveX/RxJS/issues/2316)) ([4ffbbe5](https://github.com/ReactiveX/RxJS/commit/4ffbbe5)), closes [#1404](https://github.com/ReactiveX/RxJS/issues/1404)
- **TypeScript:** fromPromise accepts PromiseLike object ([#2505](https://github.com/ReactiveX/RxJS/issues/2505)) ([ade1fd5](https://github.com/ReactiveX/RxJS/commit/ade1fd5))

<a name="5.3.3"></a>

## [5.3.3](https://github.com/ReactiveX/RxJS/compare/5.3.1...5.3.3) (2017-05-09)

### Bug Fixes

- **delayWhen:** correctly handle synchronous duration observable ([#2589](https://github.com/ReactiveX/RxJS/issues/2589)) ([695f280](https://github.com/ReactiveX/RxJS/commit/695f280)), closes [#2587](https://github.com/ReactiveX/RxJS/issues/2587)
- **race:** allow TypeScript support for array of observables other than rest param ([#2548](https://github.com/ReactiveX/RxJS/issues/2548)) ([ace553c](https://github.com/ReactiveX/RxJS/commit/ace553c))
- **Subscriber:** do not call complete with undefined value param ([#2559](https://github.com/ReactiveX/RxJS/issues/2559)) ([3d63de2](https://github.com/ReactiveX/RxJS/commit/3d63de2))

**(NOTE: 5.3.2 was a broken release and was removed)**

<a name="5.3.1"></a>

## [5.3.1](https://github.com/ReactiveX/RxJS/compare/5.3.0...v5.3.1) (2017-05-02)

### Bug Fixes

- **AsyncAction:** rescheduling an action with the same delay before it has executed will now schedule appropriately. ([#2580](https://github.com/ReactiveX/RxJS/issues/2580)) ([281760e](https://github.com/ReactiveX/RxJS/commit/281760e))
- **closure:** make root.ts work with closure ([#2546](https://github.com/ReactiveX/RxJS/issues/2546)) ([0ecf55d](https://github.com/ReactiveX/RxJS/commit/0ecf55d))
- **tests:** add missing babel-polyfill to package.json ([b277ce9](https://github.com/ReactiveX/RxJS/commit/b277ce9)), closes [#2261](https://github.com/ReactiveX/RxJS/issues/2261)
- **withLatestFrom:** change from hot to cold observable in marble test ([0c65446](https://github.com/ReactiveX/RxJS/commit/0c65446)), closes [#2526](https://github.com/ReactiveX/RxJS/issues/2526)

<a name="5.3.0"></a>

# [5.3.0](https://github.com/ReactiveX/RxJS/compare/5.2.0...v5.3.0) (2017-04-03)

### Bug Fixes

- **catch:** return type is now the union of input types ([#2478](https://github.com/ReactiveX/RxJS/issues/2478)) ([840def0](https://github.com/ReactiveX/RxJS/commit/840def0))
- **forEach:** fix a temporal dead zone issue in forEach. ([#2474](https://github.com/ReactiveX/RxJS/issues/2474)) ([e9e9801](https://github.com/ReactiveX/RxJS/commit/e9e9801))
- **multicast:** Ensure ConnectableObservables returned by multicast are state-isolated. ([aaa9e6b](https://github.com/ReactiveX/RxJS/commit/aaa9e6b))
- **reduce:** proper TypeScript signature overload ordering ([#2382](https://github.com/ReactiveX/RxJS/issues/2382)) ([f6a4951](https://github.com/ReactiveX/RxJS/commit/f6a4951)), closes [#2338](https://github.com/ReactiveX/RxJS/issues/2338)
- **SafeSubscriber:** SafeSubscriber shouldn't mutate incoming Observers. ([a1778e0](https://github.com/ReactiveX/RxJS/commit/a1778e0))
- **timeout:** Cancels scheduled timeout, if no longer needed ([3e9d529](https://github.com/ReactiveX/RxJS/commit/3e9d529)), closes [#2134](https://github.com/ReactiveX/RxJS/issues/2134) [#2244](https://github.com/ReactiveX/RxJS/issues/2244) [#2355](https://github.com/ReactiveX/RxJS/issues/2355) [#2347](https://github.com/ReactiveX/RxJS/issues/2347) [#2353](https://github.com/ReactiveX/RxJS/issues/2353) [#2254](https://github.com/ReactiveX/RxJS/issues/2254) [#2372](https://github.com/ReactiveX/RxJS/issues/2372) [#1301](https://github.com/ReactiveX/RxJS/issues/1301)
- **zipAll:** complete when the source is empty ([712fece](https://github.com/ReactiveX/RxJS/commit/712fece))

### Features

- **delayWhen:** add index to the selector function ([5d6291e](https://github.com/ReactiveX/RxJS/commit/5d6291e))
- **symbol exports:** symbols now also exported without `$$` prefix to work with Babel UMD exporting ([#2435](https://github.com/ReactiveX/RxJS/issues/2435)) ([747bef6](https://github.com/ReactiveX/RxJS/commit/747bef6)), closes [#2415](https://github.com/ReactiveX/RxJS/issues/2415)

### Performance Improvements

- **bufferCount:** optimize bufferCount operator ([#2359](https://github.com/ReactiveX/RxJS/issues/2359)) ([28d0883](https://github.com/ReactiveX/RxJS/commit/28d0883))

### April Fools

- **smooth:** `smooth()` was never really a thing. Sorry, folks. :D

<a name="5.2.0"></a>

# [5.2.0](https://github.com/ReactiveX/RxJS/compare/5.1.1...v5.2.0) (2017-02-21)

### Bug Fixes

- **ajax:** will set `withCredentials` after `open` on XHR for IE10 ([#2332](https://github.com/ReactiveX/RxJS/issues/2332)) ([0ab1d3b](https://github.com/ReactiveX/RxJS/commit/0ab1d3b))
- **bindCallback:** emit undefined when callback is without arguments ([915a2a8](https://github.com/ReactiveX/RxJS/commit/915a2a8))
- **bindNodeCallback:** emit undefined when callback has no success arguments ([8b81fc6](https://github.com/ReactiveX/RxJS/commit/8b81fc6)), closes [#2254](https://github.com/ReactiveX/RxJS/issues/2254)
- **bindNodeCallback:** errors thrown in callback will be scheduled if a scheduler is provided ([#2344](https://github.com/ReactiveX/RxJS/issues/2344)) ([82ec4f1](https://github.com/ReactiveX/RxJS/commit/82ec4f1))
- **concat:** will now return Observable when given a single object implementing Symbol.observable ([#2387](https://github.com/ReactiveX/RxJS/issues/2387)) ([f5d035a](https://github.com/ReactiveX/RxJS/commit/f5d035a))
- **ErrorObservable:** remove type constraint to error value ([2f951cd](https://github.com/ReactiveX/RxJS/commit/2f951cd)), closes [#2395](https://github.com/ReactiveX/RxJS/issues/2395)
- **forkJoin:** add type signature for single observable with selector ([7983b91](https://github.com/ReactiveX/RxJS/commit/7983b91)), closes [#2347](https://github.com/ReactiveX/RxJS/issues/2347)
- **merge:** return Observable when called with single lowerCaseO ([85752eb](https://github.com/ReactiveX/RxJS/commit/85752eb))
- **mergeAll:** introduce variant support <T, R> for mergeMap ([656f2b3](https://github.com/ReactiveX/RxJS/commit/656f2b3)), closes [#2372](https://github.com/ReactiveX/RxJS/issues/2372)
- **single:** predicate function receives indices starting at 0 ([#2396](https://github.com/ReactiveX/RxJS/issues/2396)) ([c81882f](https://github.com/ReactiveX/RxJS/commit/c81882f))
- **subscribeToResult:** accept array-like as result ([14685ba](https://github.com/ReactiveX/RxJS/commit/14685ba))

### Features

- **webSocket:** Add binaryType to config object ([86acbd1](https://github.com/ReactiveX/RxJS/commit/86acbd1)), closes [#2353](https://github.com/ReactiveX/RxJS/issues/2353)
- **windowTime:** maxWindowSize parameter in windowTime operator ([381be3f](https://github.com/ReactiveX/RxJS/commit/381be3f)), closes [#1301](https://github.com/ReactiveX/RxJS/issues/1301)

<a name="5.1.1"></a>

## [5.1.1](https://github.com/ReactiveX/RxJS/compare/5.1.0...v5.1.1) (2017-02-13)

### Bug Fixes

- **bindCallback:** input function context can now be properly set via output function ([#2319](https://github.com/ReactiveX/RxJS/issues/2319)) ([cb91c76](https://github.com/ReactiveX/RxJS/commit/cb91c76))
- **bindNodeCallback:** input function context can now be properly set via output function ([#2320](https://github.com/ReactiveX/RxJS/issues/2320)) ([3ec315d](https://github.com/ReactiveX/RxJS/commit/3ec315d))
- **Subscription:** fold ChildSubscription logic into Subscriber to prevent operators from leaking ChildSubscriptions. ([#2360](https://github.com/ReactiveX/RxJS/issues/2360)) ([22e4c17](https://github.com/ReactiveX/RxJS/commit/22e4c17)), closes [#2244](https://github.com/ReactiveX/RxJS/issues/2244) [#2355](https://github.com/ReactiveX/RxJS/issues/2355)

<a name="5.1.0"></a>

# [5.1.0](https://github.com/ReactiveX/RxJS/compare/5.0.3...v5.1.0) (2017-02-01)

### Bug Fixes

- **catch:** update the catch operator to dispose inner subscriptions if the catch subscription is di ([#2271](https://github.com/ReactiveX/RxJS/issues/2271)) ([8a1e089](https://github.com/ReactiveX/RxJS/commit/8a1e089))
- **combineLatest:** Don't mutate array of observables passed to ([#2276](https://github.com/ReactiveX/RxJS/issues/2276)) ([9b73c46](https://github.com/ReactiveX/RxJS/commit/9b73c46))
- **ISubscription:** update type definition of ISubscription::closed ([#2249](https://github.com/ReactiveX/RxJS/issues/2249)) ([0c304a2](https://github.com/ReactiveX/RxJS/commit/0c304a2))
- **Observable:** Ensure the generic type of the Observer passed to Observable's initializer function is the same. ([51a0bc1](https://github.com/ReactiveX/RxJS/commit/51a0bc1)), closes [#2166](https://github.com/ReactiveX/RxJS/issues/2166)
- **Observable:** errors thrown during subscription are now properly sent down error channel ([#2313](https://github.com/ReactiveX/RxJS/issues/2313)) ([d4a9aac](https://github.com/ReactiveX/RxJS/commit/d4a9aac)), closes [#1833](https://github.com/ReactiveX/RxJS/issues/1833)
- **reduce:** index will properly start at 1 if no seed is provided, to match native Array reduce behavior ([30a4ca4](https://github.com/ReactiveX/RxJS/commit/30a4ca4)), closes [#2290](https://github.com/ReactiveX/RxJS/issues/2290)
- **repeatWhen:** resulting observable will wait for the source to complete, even if a hot notifier completes first. ([#2209](https://github.com/ReactiveX/RxJS/issues/2209)) ([c65a098](https://github.com/ReactiveX/RxJS/commit/c65a098)), closes [#2054](https://github.com/ReactiveX/RxJS/issues/2054)
- **Subject:** ensure subject properly throws ObjectUnsubscribedError when unsubscribed then resubscribed to ([#2318](https://github.com/ReactiveX/RxJS/issues/2318)) ([41489eb](https://github.com/ReactiveX/RxJS/commit/41489eb))
- **TestScheduler:** helper methods return proper types, `HotObservable` and `ColdObservable` instead of Observable ([#2305](https://github.com/ReactiveX/RxJS/issues/2305)) ([758aae9](https://github.com/ReactiveX/RxJS/commit/758aae9))
- **windowTime:** ensure windows created when only a timespan is passed are closed and cleaned up properly. ([#2278](https://github.com/ReactiveX/RxJS/issues/2278)) ([d4533c4](https://github.com/ReactiveX/RxJS/commit/d4533c4))

### Features

- **fromEventPattern:** support optional removeHandler ([86960c2](https://github.com/ReactiveX/RxJS/commit/86960c2))
- **fromEventPattern:** support pass signal from addHandler to removeHandler ([01d0622](https://github.com/ReactiveX/RxJS/commit/01d0622))

<a name="5.0.3"></a>

## [5.0.3](https://github.com/ReactiveX/RxJS/compare/5.0.2...v5.0.3) (2017-01-05)

### Bug Fixes

- **observeOn:** seal memory leak involving old notifications ([9664a38](https://github.com/ReactiveX/RxJS/commit/9664a38)), closes [#2244](https://github.com/ReactiveX/RxJS/issues/2244)
- **Subscription:** `add` will return Subscription that `remove`s itself when unsubscribed ([375d4a5](https://github.com/ReactiveX/RxJS/commit/375d4a5))
- **TypeScript:** interfaces that accepted `Scheduler` now accept `IScheduler` interface ([a0d28a8](https://github.com/ReactiveX/RxJS/commit/a0d28a8))

<a name="5.0.2"></a>

## [5.0.2](https://github.com/ReactiveX/RxJS/compare/5.0.1...v5.0.2) (2016-12-23)

### Bug Fixes

- **ajax:** upload progress is now set correctly ([#2200](https://github.com/ReactiveX/RxJS/issues/2200)) ([1a83041](https://github.com/ReactiveX/RxJS/commit/1a83041))
- **groupBy:** Fix groupBy to dispose of outer subscription. ([#2201](https://github.com/ReactiveX/RxJS/issues/2201)) ([2269618](https://github.com/ReactiveX/RxJS/commit/2269618))

<a name="5.0.1"></a>

## [5.0.1](https://github.com/ReactiveX/RxJS/compare/5.0.0...v5.0.1) (2016-12-13)

### Bug Fixes

- **TypeScript:** pin to TypeScript 2.0.x, fix errors with Error subclassing ([300504c](https://github.com/ReactiveX/RxJS/commit/300504c))

<a name="5.0.0"></a>

# [5.0.0](https://github.com/ReactiveX/RxJS/compare/5.0.0-rc.5...v5.0.0) (2016-12-13)

### Bug Fixes

- **race:** unsubscribe raced observables with immediate scheduler ([#2158](https://github.com/ReactiveX/RxJS/issues/2158)) ([7dd533b](https://github.com/ReactiveX/RxJS/commit/7dd533b))
- **SubscribeOnObservable:** Add the source subscription to the action disposable so the source will ([64e3815](https://github.com/ReactiveX/RxJS/commit/64e3815))

<a name="5.0.0-rc.5"></a>

# [5.0.0-rc.5](https://github.com/ReactiveX/RxJS/compare/5.0.0-rc.4...v5.0.0-rc.5) (2016-12-07)

### Bug Fixes

- **AjaxObservable:** catch XHR send failures to observer ([#2159](https://github.com/ReactiveX/RxJS/issues/2159)) ([128fb9c](https://github.com/ReactiveX/RxJS/commit/128fb9c))
- **distinctKey:** Removed accidental leftover reference of `distinctKey` ([9fd8096](https://github.com/ReactiveX/RxJS/commit/9fd8096)), closes [#2161](https://github.com/ReactiveX/RxJS/issues/2161)
- **errors:** Better error message when you return non-observable things, ([#2152](https://github.com/ReactiveX/RxJS/issues/2152)) ([86a909c](https://github.com/ReactiveX/RxJS/commit/86a909c)), closes [#215](https://github.com/ReactiveX/RxJS/issues/215)
- **event:** uses `Object.prototype.toString.call` on objects ([#2143](https://github.com/ReactiveX/RxJS/issues/2143)) ([e036e79](https://github.com/ReactiveX/RxJS/commit/e036e79))
- **typings:** type guard support for `last`, `first`, `find` and `filter`. ([5f2e849](https://github.com/ReactiveX/RxJS/commit/5f2e849))

### Features

- **timeout:** remove `errorToSend` argument, always throw TimeoutError ([#2172](https://github.com/ReactiveX/RxJS/issues/2172)) ([98ea3d2](https://github.com/ReactiveX/RxJS/commit/98ea3d2))

### BREAKING CHANGES

- timeout: `timeout` no longer accepts the `errorToSend` argument

related #2141

<a name="5.0.0-rc.4"></a>

# [5.0.0-rc.4](https://github.com/ReactiveX/RxJS/compare/5.0.0-rc.3...v5.0.0-rc.4) (2016-11-19)

### Bug Fixes

- **partition:** handles `thisArg` as expected ([#2138](https://github.com/ReactiveX/RxJS/issues/2138)) ([6cf7296](https://github.com/ReactiveX/RxJS/commit/6cf7296))
- **timeout:** throw traceable TimeoutError ([#2132](https://github.com/ReactiveX/RxJS/issues/2132)) ([9ebc46b](https://github.com/ReactiveX/RxJS/commit/9ebc46b))

<a name="5.0.0-rc.3"></a>

# [5.0.0-rc.3](https://github.com/ReactiveX/RxJS/compare/5.0.0-rc.2...v5.0.0-rc.3) (2016-11-15)

### Bug Fixes

- **typings:** You no longer have to install the type definition for chai ([#2112](https://github.com/ReactiveX/rxjs/issues/2112))

### Features

- **filter:** support type guards without casting ([68b7922](https://github.com/ReactiveX/RxJS/commit/68b7922))
- **find:** support type guards without casting ([9058bf6](https://github.com/ReactiveX/RxJS/commit/9058bf6))
- **first:** support type guards without casting ([3aa1988](https://github.com/ReactiveX/RxJS/commit/3aa1988))
- **last:** support type guards without casting ([07ecd5e](https://github.com/ReactiveX/RxJS/commit/07ecd5e))

<a name="5.0.0-rc.2"></a>

# [5.0.0-rc.2](https://github.com/ReactiveX/RxJS/compare/5.0.0-rc.1...v5.0.0-rc.2) (2016-11-05)

### Bug Fixes

- **AjaxObservable:** remove needless type param R from AjaxObservable.getJSON() ([#2069](https://github.com/ReactiveX/RxJS/issues/2069)) ([0c3d4a4](https://github.com/ReactiveX/RxJS/commit/0c3d4a4))
- **bufferCount:** will behave as expected when `startBufferEvery` is less than `bufferSize` ([#2076](https://github.com/ReactiveX/RxJS/issues/2076)) ([d13dbb4](https://github.com/ReactiveX/RxJS/commit/d13dbb4)), closes [#2062](https://github.com/ReactiveX/RxJS/issues/2062)
- **build_docs:** fix doc building ([#1974](https://github.com/ReactiveX/RxJS/issues/1974)) ([1bbbe8b](https://github.com/ReactiveX/RxJS/commit/1bbbe8b))
- **ErrorObservable:** Add generic error type for ErrorObservable. ([#2071](https://github.com/ReactiveX/RxJS/issues/2071)) ([9df86ba](https://github.com/ReactiveX/RxJS/commit/9df86ba))
- **first:** will now only emit one value in recursive cases ([#2100](https://github.com/ReactiveX/RxJS/issues/2100)) ([a047e7a](https://github.com/ReactiveX/RxJS/commit/a047e7a)), closes [#2098](https://github.com/ReactiveX/RxJS/issues/2098)
- **fromEvent:** Throw if event target is invalid ([#2107](https://github.com/ReactiveX/RxJS/issues/2107)) ([147ce3e](https://github.com/ReactiveX/RxJS/commit/147ce3e))
- **IteratorObservable:** clarify the return type of IteratorObservable.create() ([#2070](https://github.com/ReactiveX/RxJS/issues/2070)) ([4f0f865](https://github.com/ReactiveX/RxJS/commit/4f0f865))
- **IteratorObservable:** Observables `from` generators will now finalize when subscription ends ([22d286a](https://github.com/ReactiveX/RxJS/commit/22d286a)), closes [#1938](https://github.com/ReactiveX/RxJS/issues/1938)
- **multicast:** fix a bug that caused multicast to omit messages after termination ([#2021](https://github.com/ReactiveX/RxJS/issues/2021)) ([44fbc14](https://github.com/ReactiveX/RxJS/commit/44fbc14))
- **Notification:** `materialize` output will now match Rx4 ([#2106](https://github.com/ReactiveX/RxJS/issues/2106)) ([c83bab9](https://github.com/ReactiveX/RxJS/commit/c83bab9)), closes [#2105](https://github.com/ReactiveX/RxJS/issues/2105)
- **Object.assign:** stop polyfilling Object assign ([#2080](https://github.com/ReactiveX/RxJS/issues/2080)) ([b5f8ab3](https://github.com/ReactiveX/RxJS/commit/b5f8ab3))
- **Observable/Ajax:** mount properties to origin readystatechange fn ([#2025](https://github.com/ReactiveX/RxJS/issues/2025)) ([76a9abb](https://github.com/ReactiveX/RxJS/commit/76a9abb))
- **operator/do:** fix typings ([9a40297](https://github.com/ReactiveX/RxJS/commit/9a40297))
- **reduce/scan:** both scan/reduce operators now accepts `undefined` itself as a valid seed ([#2050](https://github.com/ReactiveX/RxJS/issues/2050)) ([fee7585](https://github.com/ReactiveX/RxJS/commit/fee7585)), closes [#2047](https://github.com/ReactiveX/RxJS/issues/2047)
- **ReplaySubject:** observer now subscribed prior to running subscription function ([#2046](https://github.com/ReactiveX/RxJS/issues/2046)) ([fea08e9](https://github.com/ReactiveX/RxJS/commit/fea08e9)), closes [#2044](https://github.com/ReactiveX/RxJS/issues/2044)
- **sample:** source is now subscribed to before the notifier ([ffe99e8](https://github.com/ReactiveX/RxJS/commit/ffe99e8)), closes [#2075](https://github.com/ReactiveX/RxJS/issues/2075)
- **Symbol.iterator:** will not polyfill Symbol iterator unless Symbol exists ([#2082](https://github.com/ReactiveX/RxJS/issues/2082)) ([1138c99](https://github.com/ReactiveX/RxJS/commit/1138c99))
- **typings:** fixed Subject<T>.lift to have the same shape as Observable<T>.lift ([b07f597](https://github.com/ReactiveX/RxJS/commit/b07f597))
- **WebSocketSubject.prototype.multiplex:** no longer nulls out socket after first unsubscribe ([#2039](https://github.com/ReactiveX/RxJS/issues/2039)) ([a5e9cfe](https://github.com/ReactiveX/RxJS/commit/a5e9cfe)), closes [#2037](https://github.com/ReactiveX/RxJS/issues/2037)

### Features

- **distinct:** remove `distinctKey`, `distinct` signature change and perf improvements ([#2049](https://github.com/ReactiveX/RxJS/issues/2049)) ([89612b2](https://github.com/ReactiveX/RxJS/commit/89612b2)), closes [#2009](https://github.com/ReactiveX/RxJS/issues/2009)
- **groupBy:** Adds subjectSelector argument to groupBy ([#2023](https://github.com/ReactiveX/RxJS/issues/2023)) ([f94ceb9](https://github.com/ReactiveX/RxJS/commit/f94ceb9))
- **typescript:** remove dependency to 3rd party es2015 definition ([#2027](https://github.com/ReactiveX/RxJS/issues/2027)) ([4c31974](https://github.com/ReactiveX/RxJS/commit/4c31974)), closes [#2016](https://github.com/ReactiveX/RxJS/issues/2016)

### BREAKING CHANGES

- Notification: `Notification.prototype.exception` is now `Notification.prototype.error` to match Rx4 semantics
- Symbol.iterator: RxJS will no longer polyfill `Symbol.iterator` if `Symbol` does not exist. This may break code that inadvertently relies on this behavior
- Object.assign: RxJS will no longer polyfill `Object.assign`. It does
  not require `Object.assign` to function, however, your code may be
  inadvertently relying on this polyfill.
- AjaxObservable: Observable.ajax.getJSON() now only supports a single type parameter,
  `getJSON<T>(url: string, headers?: Object): Observable<T>`.
  The extra type parameter it accepted previously was superfluous.
- distinct: `distinctKey` has been removed. Use `distinct`
- distinct: `distinct` operator has changed, first argument is an
  optional `keySelector`. The custom `compare` function is no longer
  supported.

<a name="5.0.0-rc.1"></a>

# [5.0.0-rc.1](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.12...v5.0.0-rc.1) (2016-10-11)

### Bug Fixes

- **AjaxObservable:** Fix for [#1921](https://github.com/ReactiveX/RxJS/issues/1921) exposed AjaxObservable unsubscription error calling xhr.abort(). ([4d23f87](https://github.com/ReactiveX/RxJS/commit/4d23f87))
- **AnonymousSubject:** is now exposed on Rx namespace ([0a6f049](https://github.com/ReactiveX/RxJS/commit/0a6f049)), closes [#2002](https://github.com/ReactiveX/RxJS/issues/2002)
- **bufferTime:** no errors with take after bufferTime with maxBufferSize ([ecec640](https://github.com/ReactiveX/RxJS/commit/ecec640)), closes [#1944](https://github.com/ReactiveX/RxJS/issues/1944)
- **docs:** Fix esdoc for Observable.merge spread argument ([b794e9b](https://github.com/ReactiveX/RxJS/commit/b794e9b))
- **Observer:** fix Observable#subscribe() signature to suggest correct usable ([459d2a2](https://github.com/ReactiveX/RxJS/commit/459d2a2))
- **operator:** Fix take to complete when the source is re-entrant. ([86615cb](https://github.com/ReactiveX/RxJS/commit/86615cb))
- **root:** find global context (window/self/global) in a more safe way ([a098132](https://github.com/ReactiveX/RxJS/commit/a098132)), closes [#1930](https://github.com/ReactiveX/RxJS/issues/1930)
- **schedulers:** Queue, Asap, and AnimationFrame Schedulers should be Async if delay > 0 ([d5c682c](https://github.com/ReactiveX/RxJS/commit/d5c682c))
- **util/toSubscriber:** Supplies the Subscriber constructor with emptyObserver as destination if no ([8e7e4e3](https://github.com/ReactiveX/RxJS/commit/8e7e4e3))
- **WebSocketSubject:** ensure all internal state properly reset when socket is nulled out ([62d242e](https://github.com/ReactiveX/RxJS/commit/62d242e)), closes [#1863](https://github.com/ReactiveX/RxJS/issues/1863)

### Features

- **cache:** remove `cache` operator ([1b23ace](https://github.com/ReactiveX/RxJS/commit/1b23ace))
- **ES2015:** stop publishing `rxjs-es`, ES2015 output no longer included in `@reactivex/rxjs` package under `/dist/es6` ([6be9968](https://github.com/ReactiveX/RxJS/commit/6be9968)), closes [#1671](https://github.com/ReactiveX/RxJS/issues/1671)
- **filter:** Observable<T>.filter() can take type guard as the predicate function ([d62fbf0](https://github.com/ReactiveX/RxJS/commit/d62fbf0))
- **find:** Observable<T>.find() can take type guard as the predicate function ([b952718](https://github.com/ReactiveX/RxJS/commit/b952718))
- **first:** Observable<T>.first() can take type guard as the predicate function ([f99ca49](https://github.com/ReactiveX/RxJS/commit/f99ca49))
- **last:** Observable<T>.last() can take type guard as the predicate function ([76a8a57](https://github.com/ReactiveX/RxJS/commit/76a8a57))
- **operators:** Use lift in the operators that don't currently use lift. ([68af9ef](https://github.com/ReactiveX/RxJS/commit/68af9ef))
- **TypeScript:** update TypeScript to v2.0 ([3478b0b](https://github.com/ReactiveX/RxJS/commit/3478b0b))

### BREAKING CHANGES

- **cache:** The .cache() operator has been removed, pending further discussion ([1b23ace](https://github.com/ReactiveX/RxJS/commit/1b23ace))
- ES2015: `rxjs-es` is no longer being published
- ES2015: `@reactivex/rxjs` no longer has `/dist/es6` output

related #2016
related #1992

- package.json: TypeScript definitions are now for TS 2.0 and higher

Even if we use getter for class, they are marked with `readonly` properties
in d.ts.

- operators: Removes MulticastObservable subclass in favor of a MulticastOperator.

<a name="5.0.0-beta.12"></a>

# [5.0.0-beta.12](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.11...v5.0.0-beta.12) (2016-09-09)

### Bug Fixes

- **ajaxObservable:** remove implicit dependency to map operator patch ([1744ae9](https://github.com/ReactiveX/RxJS/commit/1744ae9)), closes [#1874](https://github.com/ReactiveX/RxJS/issues/1874)
- **AjaxObservable:** return null value from JSON.Parse (#1904) ([6ba374e](https://github.com/ReactiveX/RxJS/commit/6ba374e))
- **catch:** removed unneeded overload for catch ([dd0e586](https://github.com/ReactiveX/RxJS/commit/dd0e586))
- **max:** do not return comparer values ([f454e93](https://github.com/ReactiveX/RxJS/commit/f454e93)), closes [#1892](https://github.com/ReactiveX/RxJS/issues/1892)
- **min:** do not return comparer values ([222fd17](https://github.com/ReactiveX/RxJS/commit/222fd17)), closes [#1892](https://github.com/ReactiveX/RxJS/issues/1892)
- **operators:** export reserved name operators on prototype ([34c39dd](https://github.com/ReactiveX/RxJS/commit/34c39dd)), closes [#1924](https://github.com/ReactiveX/RxJS/issues/1924)
- **VirtualTimeScheduler:** remove default maxFrame limit ([1de86f1](https://github.com/ReactiveX/RxJS/commit/1de86f1)), closes [#1889](https://github.com/ReactiveX/RxJS/issues/1889)
- **WebSocketSubject:** pass constructor errors onto observable ([49c7d67](https://github.com/ReactiveX/RxJS/commit/49c7d67))

### Features

- **operator:** Add repeatWhen operator ([c288d88](https://github.com/ReactiveX/RxJS/commit/c288d88))
- **sequenceEqual:** adds sequenceEqual operator ([3c30293](https://github.com/ReactiveX/RxJS/commit/3c30293)), closes [#1882](https://github.com/ReactiveX/RxJS/issues/1882)

<a name="5.0.0-beta.11"></a>

# [5.0.0-beta.11](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.10...v5.0.0-beta.11) (2016-08-09)

### Bug Fixes

- **ajaxObservable:** only set default Content-Type header when no body is sent (#1830) ([5a895e8](https://github.com/ReactiveX/RxJS/commit/5a895e8))
- **AjaxObservable:** drop resultSelector support in ajax method ([7a77437](https://github.com/ReactiveX/RxJS/commit/7a77437)), closes [#1783](https://github.com/ReactiveX/RxJS/issues/1783)
- **AsyncSubject:** do not allow change value after complete ([801f282](https://github.com/ReactiveX/RxJS/commit/801f282)), closes [#1800](https://github.com/ReactiveX/RxJS/issues/1800)
- **BoundNodeCallbackObservable:** cast to `any` to access to private field in `source` ([54f342f](https://github.com/ReactiveX/RxJS/commit/54f342f))
- **catch:** accept selector returns ObservableInput ([e55c62d](https://github.com/ReactiveX/RxJS/commit/e55c62d)), closes [#1857](https://github.com/ReactiveX/RxJS/issues/1857)
- **combineLatest:** emit unique array instances with the default projection ([2e30fd1](https://github.com/ReactiveX/RxJS/commit/2e30fd1))
- **Observable.from:** standardise arguments (remove map/context) ([aa30af2](https://github.com/ReactiveX/RxJS/commit/aa30af2))
- **schedulers:** fix asap and animationFrame schedulers to execute across async boundaries. (#182 ([548ec2a](https://github.com/ReactiveX/RxJS/commit/548ec2a)), closes [(#1820](https://github.com/(/issues/1820) [#1814](https://github.com/ReactiveX/RxJS/issues/1814)
- **subscribeToResult:** update subscription to iterables ([5d6339a](https://github.com/ReactiveX/RxJS/commit/5d6339a))
- **WebSocketSubject:** prevent early close (#1831) ([848a527](https://github.com/ReactiveX/RxJS/commit/848a527)), closes [(#1831](https://github.com/(/issues/1831)

### Features

- **fromEvent:** Pass through event listener options (#1845) ([8f0dc01](https://github.com/ReactiveX/RxJS/commit/8f0dc01))
- **PairsObservable:** add PairsObservable creation method ([26bafff](https://github.com/ReactiveX/RxJS/commit/26bafff)), closes [#1804](https://github.com/ReactiveX/RxJS/issues/1804)

### BREAKING CHANGES

- Observable.from: - Observable.from no longer supports the optional map function and associated context argument.
  This change has been reflected in the related constructors and their properties have been standardised.
- AjaxObservable: ajax.\*() method no longer support resultSelector, encourage to use `map` instead

<a name="5.0.0-beta.10"></a>

# [5.0.0-beta.10](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.9...v5.0.0-beta.10) (2016-07-06)

### Bug Fixes

- **AjaxObservable:** ignore content-type for formdata (#1746) ([43d05e7](https://github.com/ReactiveX/RxJS/commit/43d05e7))
- **AjaxObservable:** support withCredentials for CORS request ([8084572](https://github.com/ReactiveX/RxJS/commit/8084572)), closes [#1732](https://github.com/ReactiveX/RxJS/issues/1732) [#1711](https://github.com/ReactiveX/RxJS/issues/1711)
- **babel:** fix an issue where babel could not compile `Scheduler.async` (#1807) ([12c5c74](https://github.com/ReactiveX/RxJS/commit/12c5c74)), closes [(#1807](https://github.com/(/issues/1807) [#1806](https://github.com/ReactiveX/RxJS/issues/1806)
- **bufferTime:** handle closing context when synchronously unsubscribed ([4ce4433](https://github.com/ReactiveX/RxJS/commit/4ce4433)), closes [#1763](https://github.com/ReactiveX/RxJS/issues/1763)
- **multicast:** Fixes multicast with selector to create a new source connection per subscriber. ([c3ac852](https://github.com/ReactiveX/RxJS/commit/c3ac852)), closes [(#1774](https://github.com/(/issues/1774)
- **Subject:** allow optional next value in type definition ([3e0c6d9](https://github.com/ReactiveX/RxJS/commit/3e0c6d9)), closes [#1728](https://github.com/ReactiveX/RxJS/issues/1728)
- **WebSocketSubject:** respect WebSocketCtor, support source/destination arguments in constructor. (#179 ([cd8cdd0](https://github.com/ReactiveX/RxJS/commit/cd8cdd0)), closes [#1745](https://github.com/ReactiveX/RxJS/issues/1745) [#1784](https://github.com/ReactiveX/RxJS/issues/1784)

<a name="5.0.0-beta.9"></a>

# [5.0.0-beta.9](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.8...v5.0.0-beta.9) (2016-06-14)

### Bug Fixes

- **cache:** get correct caching behavior (#1765) ([cb0b806](https://github.com/ReactiveX/RxJS/commit/cb0b806)), closes [#1628](https://github.com/ReactiveX/RxJS/issues/1628)
- **ConnectableObservable:** fix ConnectableObservable connection handling issue ([41ce80c](https://github.com/ReactiveX/RxJS/commit/41ce80c))
- **typings:** make HotObservable.\_subscribe protected ([1c3d6ea](https://github.com/ReactiveX/RxJS/commit/1c3d6ea))
- **WebSocketSubject:** WebSocketSubject will now chain operators properly (#1752) ([bf54db4](https://github.com/ReactiveX/RxJS/commit/bf54db4)), closes [#1745](https://github.com/ReactiveX/RxJS/issues/1745)
- **window:** don't track internal window subjects as subscriptions. ([f3357b9](https://github.com/ReactiveX/RxJS/commit/f3357b9))

### Performance Improvements

- **fromEventPattern:** ~3x improvement in speed ([3dc1c00](https://github.com/ReactiveX/RxJS/commit/3dc1c00))

<a name="5.0.0-beta.8"></a>

# [5.0.0-beta.8](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.7...v5.0.0-beta.8) (2016-05-22)

### Bug Fixes

- **AnonymousSubject:** allow anonymous observers as destination ([0e2c28b](https://github.com/ReactiveX/RxJS/commit/0e2c28b))
- **combineLatest:** rxjs/observable/combineLatest is now properly exported ([21fab73](https://github.com/ReactiveX/RxJS/commit/21fab73)), closes [#1722](https://github.com/ReactiveX/RxJS/issues/1722)
- **ConnectableObservable:** fix race conditions in ConnectableObservable and refCount. ([d1412bc](https://github.com/ReactiveX/RxJS/commit/d1412bc))
- **Rx:** remove kitchenSink and DOM, let Rx export all ([f5090b4](https://github.com/ReactiveX/RxJS/commit/f5090b4)), closes [#1650](https://github.com/ReactiveX/RxJS/issues/1650)
- **ScalarObservable:** set \_isScalar to false when initialized with a scheduler ([5037b3a](https://github.com/ReactiveX/RxJS/commit/5037b3a))
- **Subject:** correct Subject behaviors to be more like Rx4 ([ba9ef2b](https://github.com/ReactiveX/RxJS/commit/ba9ef2b))
- **subscriptions:** fixes bug that tracked subscriber subscriptions twice. ([29ff794](https://github.com/ReactiveX/RxJS/commit/29ff794))

### Features

- **bufferTime:** add `maxBufferSize` optional argument ([cf45540](https://github.com/ReactiveX/RxJS/commit/cf45540)), closes [#1295](https://github.com/ReactiveX/RxJS/issues/1295)
- **multicast:** subjectfactory allows selectors ([32fa3a4](https://github.com/ReactiveX/RxJS/commit/32fa3a4))
- **onErrorResumeNext:** add onErrorResumeNext operator ([51e022b](https://github.com/ReactiveX/RxJS/commit/51e022b)), closes [#1665](https://github.com/ReactiveX/RxJS/issues/1665)
- **publish:** support optional selectors ([0e5991d](https://github.com/ReactiveX/RxJS/commit/0e5991d)), closes [#1629](https://github.com/ReactiveX/RxJS/issues/1629)

### Performance Improvements

- **combineLatest:** avoid splice and indexOf ([33599cd](https://github.com/ReactiveX/RxJS/commit/33599cd))

### BREAKING CHANGES

- Subject: Subjects no longer duck-type as Subscriptions
- Subject: Subjects will no longer throw when re-subscribed to if they are not unsubscribed
- Subject: Subjects no longer automatically unsubscribe when completed or errored
  BREAKING CHANGE: Minor scheduling changes to groupBy to ensure proper emission ordering
- Rx: `Rx.kitchenSink` and `Rx.DOM` are removed, `Rx`
  export everything.

<a name="5.0.0-beta.7"></a>

# [5.0.0-beta.7](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.6...v5.0.0-beta.7) (2016-04-27)

### Bug Fixes

- **race:** handle observables completes immediately ([abac3d1](https://github.com/ReactiveX/RxJS/commit/abac3d1)), closes [#1615](https://github.com/ReactiveX/RxJS/issues/1615)
- **scan:** accumulator passes current index ([a3ec896](https://github.com/ReactiveX/RxJS/commit/a3ec896)), closes [#1614](https://github.com/ReactiveX/RxJS/issues/1614)

### Features

- **Observable.generate:** add generate static creation method ([c03434c](https://github.com/ReactiveX/RxJS/commit/c03434c))

<a name="5.0.0-beta.6"></a>

# [5.0.0-beta.6](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.5...v5.0.0-beta.6) (2016-04-12)

### Bug Fixes

- **AjaxObservable:** support json responseType on IE ([bba13d8](https://github.com/ReactiveX/RxJS/commit/bba13d8)), closes [#1381](https://github.com/ReactiveX/RxJS/issues/1381)
- **bufferToggle:** accepts closing selector returns promise ([b1c575c](https://github.com/ReactiveX/RxJS/commit/b1c575c))
- **bufferToggle:** accepts promise as openings ([3d22c7a](https://github.com/ReactiveX/RxJS/commit/3d22c7a))
- **bufferToggle:** handle closingSelector completes immediately ([02239fb](https://github.com/ReactiveX/RxJS/commit/02239fb))
- **typings:** explicitly export typings for arguments to functions that destructure configuration objects ([ef305af](https://github.com/ReactiveX/RxJS/commit/ef305af))

### Features

- **UnsubscriptionError:** add messages from inner errors to output message ([dd01279](https://github.com/ReactiveX/RxJS/commit/dd01279)), closes [#1590](https://github.com/ReactiveX/RxJS/issues/1590)

### Performance Improvements

- **DeferSubscriber:** split up 'tryDefer()' into a method to call a factory function. ([566f46b](https://github.com/ReactiveX/RxJS/commit/566f46b))

<a name="5.0.0-beta.5"></a>

# [5.0.0-beta.5](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.4...v5.0.0-beta.5) (2016-04-05)

### Bug Fixes

- **take:** make 'take' unsubscribe when it reaches the total ([9858aa3](https://github.com/ReactiveX/RxJS/commit/9858aa3))

### BREAKING CHANGES

- Operator: `Operator.prototype.call` has been refactored to include both the destination Subscriber, and the source Observable
  the Operator is now responsible for describing it's own subscription process. ([26423f4](https://github.com/ReactiveX/rxjs/pull/1570/commits/26423f4))

<a name="5.0.0-beta.4"></a>

# [5.0.0-beta.4](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.3...v5.0.0-beta.4) (2016-03-29)

### Bug Fixes

- **AjaxObservable:** enhance compatibility ([0ac7e1e](https://github.com/ReactiveX/RxJS/commit/0ac7e1e))
- **Observable.if:** accept promise as source ([147166e](https://github.com/ReactiveX/RxJS/commit/147166e))
- **mergeMap:** allow concurrent to be set as the second argument for mergeMap and mergeMapTo ([c003468](https://github.com/ReactiveX/RxJS/commit/c003468))
- **observable:** ensure the subscriber chain is complete before calling this.\_subscribe ([1631224](https://github.com/ReactiveX/RxJS/commit/1631224))
- **Symbol:** fixed issue where \$\$observable is not defined ([e66b2d8](https://github.com/ReactiveX/RxJS/commit/e66b2d8))
- **Observable.using:** accepts factory returns promise ([f8d7d1b](https://github.com/ReactiveX/RxJS/commit/f8d7d1b))
- **windowToggle:** handle closingSelector completes immediately ([c755587](https://github.com/ReactiveX/RxJS/commit/c755587)), closes [#1487](https://github.com/ReactiveX/RxJS/issues/1487)

### Features

- **ajax:** add FormData support in AjaxObservable and add percent encoding for parameters ([1f6119c](https://github.com/ReactiveX/RxJS/commit/1f6119c))
- **Subscription:** `add()` now returns a Subscription reference ([a3f4552](https://github.com/ReactiveX/RxJS/commit/a3f4552))
- **timestamp:** add timestamp operator ([80b1646](https://github.com/ReactiveX/RxJS/commit/80b1646)), closes [#1515](https://github.com/ReactiveX/RxJS/issues/1515)

### Performance Improvements

- **forkJoin:** improve forkJoin perf slightly by removing unnecessary context tracking ([280b985](https://github.com/ReactiveX/RxJS/commit/280b985))

### BREAKING CHANGES

- Observable: `Observable.fromArray` was removed since it's deprecated on RxJS 4. You should use `Observable.from` instead.

<a name="5.0.0-beta.3"></a>

# [5.0.0-beta.3](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.2...v5.0.0-beta.3) (2016-03-21)

### Bug Fixes

- **AjaxObservable:** update type definition for AjaxObservable ([3f5c269](https://github.com/ReactiveX/RxJS/commit/3f5c269)), closes [#1382](https://github.com/ReactiveX/RxJS/issues/1382)
- **deferObservable:** accepts factory returns promise ([0cb44e1](https://github.com/ReactiveX/RxJS/commit/0cb44e1))
- **do:** fix do operator to invoke observer message handlers in the right context. ([67a2f25](https://github.com/ReactiveX/RxJS/commit/67a2f25))
- **exhaustMap:** remove innersubscription when it completes ([7ca0859](https://github.com/ReactiveX/RxJS/commit/7ca0859))
- **forEach:** ensure that teardown logic is called when nextHandler throws ([c50f528](https://github.com/ReactiveX/RxJS/commit/c50f528)), closes [#1411](https://github.com/ReactiveX/RxJS/issues/1411)
- **forkJoin:** accepts observables emitting null or undefined ([6279d6b](https://github.com/ReactiveX/RxJS/commit/6279d6b)), closes [#1362](https://github.com/ReactiveX/RxJS/issues/1362)
- **forkJoin:** dispose the inner subscriptions when the outer subscription is disposed ([c7bf30c](https://github.com/ReactiveX/RxJS/commit/c7bf30c))
- **FutureAction:** add support for periodic scheduling with setInterval instead of setTimeout ([c4f5408](https://github.com/ReactiveX/RxJS/commit/c4f5408))
- **Observable:** introduce Subscribable interface that will be used instead of Observable in input ([2256e7b](https://github.com/ReactiveX/RxJS/commit/2256e7b))
- **Observable.prototype.forEach:** removed thisArg to match es-observable spec ([d5f1bcd](https://github.com/ReactiveX/RxJS/commit/d5f1bcd))
- **package.json:** install typings only after packages are installed ([a48d796](https://github.com/ReactiveX/RxJS/commit/a48d796))
- **Schedulers:** ensure schedulers can be reused after error in execution ([202b79a](https://github.com/ReactiveX/RxJS/commit/202b79a))
- **takeLast:** fix takeLast behavior to emit correct order ([73eb658](https://github.com/ReactiveX/RxJS/commit/73eb658)), closes [#1407](https://github.com/ReactiveX/RxJS/issues/1407)
- **typings:** set map function parameter for Observable.from as optional ([efa4dc3](https://github.com/ReactiveX/RxJS/commit/efa4dc3))

### Features

- **AsyncScheduler:** add AsyncScheduler implementation ([4486c1f](https://github.com/ReactiveX/RxJS/commit/4486c1f))
- **if:** add static Observable.if creation operator. ([f7ff7ec](https://github.com/ReactiveX/RxJS/commit/f7ff7ec))
- **let:** adds the let operator to Rx.KitchenSink ([dca6504](https://github.com/ReactiveX/RxJS/commit/dca6504))
- **using:** add static Observable.using creation operator. ([6c76593](https://github.com/ReactiveX/RxJS/commit/6c76593))

### BREAKING CHANGES

- Observable.prototype.forEach: thisArg removed to match es-observable spec

<a name="5.0.0-beta.2"></a>

# [5.0.0-beta.2](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.1...v5.0.0-beta.2) (2016-02-10)

### Bug Fixes

- **ajax:** fixes error in Chrome accessing responseText when responseType isn't text. ([f3e2f73](https://github.com/ReactiveX/RxJS/commit/f3e2f73))
- **benchpress:** fix issues with benchmarks ([16894bb](https://github.com/ReactiveX/RxJS/commit/16894bb))
- **every:** remove eager predicate calls ([74c2c44](https://github.com/ReactiveX/RxJS/commit/74c2c44))
- **forkJoin:** fix forkJoin to complete if sources Array is empty. ([412b13b](https://github.com/ReactiveX/RxJS/commit/412b13b))
- **groupBy:** does not emit on unsubscribed group ([6d08705](https://github.com/ReactiveX/RxJS/commit/6d08705))
- **groupBy:** fix groupBy to use lift(), supports composability ([815cfae](https://github.com/ReactiveX/RxJS/commit/815cfae)), closes [#1085](https://github.com/ReactiveX/RxJS/issues/1085)
- **merge/concat:** passed scalar observables will now complete properly ([c01b92f](https://github.com/ReactiveX/RxJS/commit/c01b92f)), closes [#1150](https://github.com/ReactiveX/RxJS/issues/1150)
- **MergeMapSubscriber:** clarify type definitions for MergeMapSubscriber's members ([4ee5f02](https://github.com/ReactiveX/RxJS/commit/4ee5f02))
- **Observable.forEach:** errors thrown in nextHandler reject returned promise ([c5ead88](https://github.com/ReactiveX/RxJS/commit/c5ead88)), closes [#1184](https://github.com/ReactiveX/RxJS/issues/1184)
- **Observer:** fix typing to allow observation via partial observables with PartialObservable<T ([7b6da90](https://github.com/ReactiveX/RxJS/commit/7b6da90))
- **Subject:** align parameter order to match with RxJS4 ([44dfa07](https://github.com/ReactiveX/RxJS/commit/44dfa07)), closes [#1285](https://github.com/ReactiveX/RxJS/issues/1285)
- **Subject:** throw ObjectUnsubscribedError when unsubscribed ([29b630b](https://github.com/ReactiveX/RxJS/commit/29b630b)), closes [#859](https://github.com/ReactiveX/RxJS/issues/859)
- **Subscriber:** adds unsubscription when errors are thrown from user-land handlers. ([dc67d21](https://github.com/ReactiveX/RxJS/commit/dc67d21))
- **Subscription:** fix leaks caused by unsubscribe functions that throw ([9e88c2e](https://github.com/ReactiveX/RxJS/commit/9e88c2e))
- **subscriptions:** unsubscribe correctly when a Subscriber throws during synchronous dispatch. ([b1698fe](https://github.com/ReactiveX/RxJS/commit/b1698fe))
- **typings:** don't expose PromiseConstructor dependency ([f59225b](https://github.com/ReactiveX/RxJS/commit/f59225b)), closes [#1270](https://github.com/ReactiveX/RxJS/issues/1270)
- **typings:** remove R from Operator.call, update operators accordingly ([f27902d](https://github.com/ReactiveX/RxJS/commit/f27902d))
- **typings:** remove redundant generics from call<T, R> and lift<T, R> ([603c9eb](https://github.com/ReactiveX/RxJS/commit/603c9eb))
- **windowTime:** does not emit on unsubscribed window ([595f4ef](https://github.com/ReactiveX/RxJS/commit/595f4ef))

### Features

- **cache:** add cache operator ([4308a04](https://github.com/ReactiveX/RxJS/commit/4308a04))
- **delayWhen:** add delayWhen operator ([17122f9](https://github.com/ReactiveX/RxJS/commit/17122f9))
- **distinct:** add distinct operator ([94a034d](https://github.com/ReactiveX/RxJS/commit/94a034d))
- **distinctKey:** add distinctKey operator ([fe4d57f](https://github.com/ReactiveX/RxJS/commit/fe4d57f))
- **from:** allow Observable.from to handle array-like objects ([7245005](https://github.com/ReactiveX/RxJS/commit/7245005))
- **MapPolyfill:** implement clear interface ([e3fbd05](https://github.com/ReactiveX/RxJS/commit/e3fbd05))
- **operator:** adds inspect and inspectTime operators ([54f957b](https://github.com/ReactiveX/RxJS/commit/54f957b))
- **OuterSubscriber:** notifyNext passes innersubscriber when next emits ([1df8928](https://github.com/ReactiveX/RxJS/commit/1df8928)), closes [#1250](https://github.com/ReactiveX/RxJS/issues/1250)
- **Subject:** implement asObservable ([aca3dd0](https://github.com/ReactiveX/RxJS/commit/aca3dd0)), closes [#1108](https://github.com/ReactiveX/RxJS/issues/1108)
- **takeLast:** adds takeLast operator. ([3583cd3](https://github.com/ReactiveX/RxJS/commit/3583cd3))

### Performance Improvements

- **catch:** remove tryCatch/errorObject for custom tryCatching, 1.3M -> 1.5M ops/sec ([35caf74](https://github.com/ReactiveX/RxJS/commit/35caf74))
- **combineLatest:** remove tryCatch/errorObject, 156k -> 221k ops/sec ([1c7d639](https://github.com/ReactiveX/RxJS/commit/1c7d639))
- **count:** remove tryCatch/errorObject for custom tryCatching, 1.84M -> 1.97M ops/sec ([869718d](https://github.com/ReactiveX/RxJS/commit/869718d))
- **debounce:** remove tryCatch/errorObject for custom tryCatching ([90bf3f1](https://github.com/ReactiveX/RxJS/commit/90bf3f1))
- **distinct:** increase perf from 60% of Rx4 to 1000% Rx4 ([d026c41](https://github.com/ReactiveX/RxJS/commit/d026c41))
- **do:** remove tryCatch/errorObject use, 104k -> 263k ops/sec improvement ([ccba39d](https://github.com/ReactiveX/RxJS/commit/ccba39d))
- **every:** remove tryCatch/errorObject (~1.8x improvement) ([14afeb6](https://github.com/ReactiveX/RxJS/commit/14afeb6))
- **exhaustMap:** remove tryCatch/errorObject (~10% improvement) ([a55f459](https://github.com/ReactiveX/RxJS/commit/a55f459))
- **filter:** remove tryCatch/errorObject for 2x perf improvement ([086c4bf](https://github.com/ReactiveX/RxJS/commit/086c4bf))
- **find:** remove tryCatch/errorObject (~2x improvement) ([aa35b2a](https://github.com/ReactiveX/RxJS/commit/aa35b2a))
- **first:** remove tryCatch/errorObject for custom tryCatching, 970k ops -> 1.27M ops/sec ([d8c835a](https://github.com/ReactiveX/RxJS/commit/d8c835a))
- **groupBy:** remove tryCatch/errorObject for custom tryCatching, 38% faster. ([40c43f7](https://github.com/ReactiveX/RxJS/commit/40c43f7))
- **last:** remove tryCatch/errorObject for custom tryCatching, 960k -> 1.38M ops/sec ([243ace3](https://github.com/ReactiveX/RxJS/commit/243ace3))
- **map:** 2x increase from removing tryCatch/errorObject ([231f729](https://github.com/ReactiveX/RxJS/commit/231f729))
- **mergeMap:** extra 1x factor gains from custom tryCatch member function ([c4ce2fb](https://github.com/ReactiveX/RxJS/commit/c4ce2fb))
- **mergeMapTo:** remove tryCatch/errorObject (~2x improvement) ([42bcced](https://github.com/ReactiveX/RxJS/commit/42bcced))
- **reduce:** remove tryCatch/errorObject, optimize calls, 2-3x perf improvement ([6186d46](https://github.com/ReactiveX/RxJS/commit/6186d46))
- **scan:** remove tryCatch/errorObject for custom tryCatcher 1.75x improvement ([338135d](https://github.com/ReactiveX/RxJS/commit/338135d))
- **single:** remove tryCatch/errorObject (~2.5x improvement) ([2515cfb](https://github.com/ReactiveX/RxJS/commit/2515cfb))
- **skipWhile:** remove tryCatch/errorObject (~1.6x improvement) ([cf002db](https://github.com/ReactiveX/RxJS/commit/cf002db))
- **Subscriber:** double performance adding tryOrUnsub to Subscriber ([4e75466](https://github.com/ReactiveX/RxJS/commit/4e75466))
- **switchMap:** remove tryCatch/errorObject ~20% improvement ([ec0199f](https://github.com/ReactiveX/RxJS/commit/ec0199f))
- **switchMapTo:** remove tryCatch/errorObject (~2x improvement) ([c8cf72a](https://github.com/ReactiveX/RxJS/commit/c8cf72a))
- **takeWhile:** remove tryCatch/errorObject (~6x improvement) ([ef6c3c3](https://github.com/ReactiveX/RxJS/commit/ef6c3c3))
- **withLatestFrom:** remove tryCatch/errorObject, 92k -> 107k (16% improvement) ([e4ccb44](https://github.com/ReactiveX/RxJS/commit/e4ccb44))
- **zip:** extra 1x-2x factor gains from custom tryCatch member function ([a1b0e52](https://github.com/ReactiveX/RxJS/commit/a1b0e52))

### BREAKING CHANGES

- Subject: Subject.create arguments have been swapped to match Rx 4 signature. `Subject.create(observable, observer)` is now `Subject.create(observer, observable)`
- Observable patching: Patch files for static observable methods such as `of` and `from` can now be found in `rxjs/add/observable/of`, `rxjs/add/observable/from`, etc.
- Observable modules: Observable modules for subclassed Observables like `PromiseObservable`, `ArrayObservable` are now in appropriately named files like `rxjs/observable/PromiseObservable` and `rxjs/observable/ArrayObservable`
  as opposed to `rxjs/observable/fromPromise` and `rxjs/observable/fromArray`, since they're not patching, they simply house the Observable implementations.

<a name="5.0.0-beta.1"></a>

# [5.0.0-beta.1](https://github.com/ReactiveX/RxJS/compare/5.0.0-beta.0...v5.0.0-beta.1) (2016-01-13)

### Bug Fixes

- **ajax:** ensure post sending values ([7aae0a3](https://github.com/ReactiveX/RxJS/commit/7aae0a3))
- **ajax:** ensure that headers are set properly ([1100bdd](https://github.com/ReactiveX/RxJS/commit/1100bdd))
- **ajax:** ensure XHR props are set after open ([4a6a579](https://github.com/ReactiveX/RxJS/commit/4a6a579))
- **ajax:** ensure XHR send is being called ([c569e3e](https://github.com/ReactiveX/RxJS/commit/c569e3e))
- **ajax:** remove unnecessary onAbort handling ([ed8240e](https://github.com/ReactiveX/RxJS/commit/ed8240e))
- **ajax:** response properly based off responseType ([b2a27a2](https://github.com/ReactiveX/RxJS/commit/b2a27a2))
- **ajax:** should no longer succeed on 300 status ([4d4fa32](https://github.com/ReactiveX/RxJS/commit/4d4fa32))
- **animationFrame:** req/cancel animationFrame has to be called within the context of root. ([30a11ee](https://github.com/ReactiveX/RxJS/commit/30a11ee))
- **debounceTime:** align value emit behavior as same as RxJS4 ([5ee11e0](https://github.com/ReactiveX/RxJS/commit/5ee11e0)), closes [#1081](https://github.com/ReactiveX/RxJS/issues/1081)
- **distinctUntilChanged:** implement optional keySelector ([f6a897c](https://github.com/ReactiveX/RxJS/commit/f6a897c))
- **fromEvent:** added spread operator for emitters that pass multiple arguments ([3f8eabb](https://github.com/ReactiveX/RxJS/commit/3f8eabb))
- **fromObservable:** expand compatibility for iterating string source ([8f7924f](https://github.com/ReactiveX/RxJS/commit/8f7924f)), closes [#1147](https://github.com/ReactiveX/RxJS/issues/1147)
- **Immediate:** update setImmediate compatibility on IE ([39e6c0e](https://github.com/ReactiveX/RxJS/commit/39e6c0e)), closes [#1163](https://github.com/ReactiveX/RxJS/issues/1163)
- **inspect:** remove inspect and inspectTime operators ([17341a4](https://github.com/ReactiveX/RxJS/commit/17341a4))
- **Readme:** update link to bundle on npmcdn ([44a8ca7](https://github.com/ReactiveX/RxJS/commit/44a8ca7))
- **ReplaySubject:** Fix case-sensitive import. ([de31f32](https://github.com/ReactiveX/RxJS/commit/de31f32))
- **ScalarObservable:** fix issue where scalar map fired twice ([c18c42e](https://github.com/ReactiveX/RxJS/commit/c18c42e)), closes [#1142](https://github.com/ReactiveX/RxJS/issues/1142) [#1140](https://github.com/ReactiveX/RxJS/issues/1140)
- **scheduling:** Fixes bugs in scheduled actions. ([e050f01](https://github.com/ReactiveX/RxJS/commit/e050f01))
- **Subscriber:** errors in nextHandler no longer propagate to errorHandler ([f42eed2](https://github.com/ReactiveX/RxJS/commit/f42eed2)), closes [#1135](https://github.com/ReactiveX/RxJS/issues/1135)
- **WebSocketSubject:** ensure error codes passed to WebSocket close method ([3b1655e](https://github.com/ReactiveX/RxJS/commit/3b1655e))
- **WebSocketSubject:** ensure WebSocketSubject can be resubscribed ([861a0c1](https://github.com/ReactiveX/RxJS/commit/861a0c1))
- **WebSocketSubject:** resultSelector and protocols specifications work properly ([580f69a](https://github.com/ReactiveX/RxJS/commit/580f69a))

### Features

- **ajax:** add resultSelector and improve perf ([6df755f](https://github.com/ReactiveX/RxJS/commit/6df755f))
- **ajax:** adds ajax methods from rx-dom. ([2ca4236](https://github.com/ReactiveX/RxJS/commit/2ca4236))
- **bindNodeCallback:** add Observable.bindNodeCallback ([497bb0d](https://github.com/ReactiveX/RxJS/commit/497bb0d)), closes [#736](https://github.com/ReactiveX/RxJS/issues/736)
- **Observable:** add let to allow fluent style query building ([5a2014c](https://github.com/ReactiveX/RxJS/commit/5a2014c))
- **Observable:** add pairwise operator ([1432e59](https://github.com/ReactiveX/RxJS/commit/1432e59))
- **Operator:** Expose the Operator interface to library consumers ([29aa3af](https://github.com/ReactiveX/RxJS/commit/29aa3af))
- **pluck:** add pluck operator ([8026906](https://github.com/ReactiveX/RxJS/commit/8026906)), closes [#1134](https://github.com/ReactiveX/RxJS/issues/1134)
- **race:** add race operator ([ee3b593](https://github.com/ReactiveX/RxJS/commit/ee3b593))
- **scheduler:** adds animationFrame scheduler. ([e637b78](https://github.com/ReactiveX/RxJS/commit/e637b78))
- **WebSocketSubject:** add basic WebSocketSubject implementation ([58cd806](https://github.com/ReactiveX/RxJS/commit/58cd806))
- **WebSocketSubject.multiplex:** add multiplex operator to WebSocketSubject ([904d617](https://github.com/ReactiveX/RxJS/commit/904d617))

### BREAKING CHANGES

- inspect: `inspect` and `inspectTime` were removed. Use `withLatestFrom` instead.
- Subscriber/Observable: errors thrown in nextHandlers by consumer code will no longer propagate to the errorHandler.

<a name="5.0.0-beta.0"></a>

# [5.0.0-beta.0](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.14...v5.0.0-beta.0) (2015-12-15)

### Bug Fixes

- **micro-perf:** rename immediate to queue scheduler ([fe56b28](https://github.com/ReactiveX/RxJS/commit/fe56b28)), closes [#1040](https://github.com/ReactiveX/RxJS/issues/1040)
- **micro-perf:** use the current scheduler on current-thread tests ([3dff5eb](https://github.com/ReactiveX/RxJS/commit/3dff5eb))
- **operators:** emit declarations for patch modules ([676f82d](https://github.com/ReactiveX/RxJS/commit/676f82d))
- **test:** make explicit unsubscription for observable ([7f67b09](https://github.com/ReactiveX/RxJS/commit/7f67b09))
- **test:** make explicit unsubscription for observable ([65e65e2](https://github.com/ReactiveX/RxJS/commit/65e65e2))
- **window:** fix window() to dispose window Subjects ([5168f73](https://github.com/ReactiveX/RxJS/commit/5168f73))
- **windowCount:** fix windowCount to dispose window Subjects ([f29ee29](https://github.com/ReactiveX/RxJS/commit/f29ee29))
- **windowTime:** fix windowTime to dispose window Subjects ([b73e260](https://github.com/ReactiveX/RxJS/commit/b73e260))
- **windowToggle:** fix windowToggle to dispose window Subjects ([15ff3f7](https://github.com/ReactiveX/RxJS/commit/15ff3f7))
- **windowWhen:** fix windowWhen to dispose window Subjects ([91c1941](https://github.com/ReactiveX/RxJS/commit/91c1941))

### Features

- **inspect:** added inspect operator ([f9944ae](https://github.com/ReactiveX/RxJS/commit/f9944ae))
- **inspectTime:** add inspectTime operator ([6835dcd](https://github.com/ReactiveX/RxJS/commit/6835dcd))
- **sample:** readd `sample` operator ([e93bffc](https://github.com/ReactiveX/RxJS/commit/e93bffc))
- **sampleTime:** reimplement `sampleTime` with RxJS 4 behavior ([6b77e69](https://github.com/ReactiveX/RxJS/commit/6b77e69))
- **TestScheduler:** add createTime() parser to return number ([cb8cf6b](https://github.com/ReactiveX/RxJS/commit/cb8cf6b))

### BREAKING CHANGES

- sampleTime: `sampleTime` now has the same behavior `sample(number, scheduler)` did in RxJS 4
- sample: `sample` behavior returned to RxJS 4 behavior
- inspectTime: `sampleTime` is now `inspectTime`
- inspect: RxJS 5 `sample` behavior is now `inspect`
- extended operators: All extended operators are now under the same operator directory as all others. This means that
  `import "rxjs/add/operator/extended/min"` is now `import "rxjs/add/operator/min"`

<a name="5.0.0-alpha.14"></a>

# [5.0.0-alpha.14](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.13...v5.0.0-alpha.14) (2015-12-09)

### Bug Fixes

- **every:** handle thisArg for scalar and array observables ([eae4b00](https://github.com/ReactiveX/RxJS/commit/eae4b00))
- **SymbolShim:** ensure for function even if Symbol already exists ([e942776](https://github.com/ReactiveX/RxJS/commit/e942776)), closes [#999](https://github.com/ReactiveX/RxJS/issues/999)
- **SymbolShim:** Symbol polyfill is a function ([1f57157](https://github.com/ReactiveX/RxJS/commit/1f57157)), closes [#988](https://github.com/ReactiveX/RxJS/issues/988)
- **timeoutWith:** fix to avoid unnecessary inner subscription ([6e63752](https://github.com/ReactiveX/RxJS/commit/6e63752))

### Features

- **count:** remove thisArg ([878a1fd](https://github.com/ReactiveX/RxJS/commit/878a1fd))
- **distinctUntilChanged:** remove thisArg ([bfc52d6](https://github.com/ReactiveX/RxJS/commit/bfc52d6))
- **exhaust:** rename switchFirst operators to exhaust ([9b565c9](https://github.com/ReactiveX/RxJS/commit/9b565c9)), closes [#915](https://github.com/ReactiveX/RxJS/issues/915)
- **finally:** remove thisArg ([d4b02fc](https://github.com/ReactiveX/RxJS/commit/d4b02fc))
- **forEach:** add thisArg ([14ffce6](https://github.com/ReactiveX/RxJS/commit/14ffce6)), closes [#878](https://github.com/ReactiveX/RxJS/issues/878)
- **single:** remove thisArg ([43af805](https://github.com/ReactiveX/RxJS/commit/43af805))

### BREAKING CHANGES

- exhaust: switchFirst is now exhaust
- exhaust: switchFirstMap is now exhaustMap
- forEach: Observable.prototype.forEach argument order changed to accommodate thisArg. Optional PromiseCtor argument moved to third arg from second

<a name="5.0.0-alpha.13"></a>

# [5.0.0-alpha.13](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.12...v5.0.0-alpha.13) (2015-12-08)

### Bug Fixes

- **Observable:** fix circular dependency issue. ([b7672f4](https://github.com/ReactiveX/RxJS/commit/b7672f4))
- **bufferToggle:** fix unsubscriptions of closing Observable ([439b641](https://github.com/ReactiveX/RxJS/commit/439b641))
- **expand:** accept scheduler parameter ([79e9084](https://github.com/ReactiveX/RxJS/commit/79e9084)), closes [#841](https://github.com/ReactiveX/RxJS/issues/841)
- **publish:** make script generate correct package names ([10563d3](https://github.com/ReactiveX/RxJS/commit/10563d3))
- **repeat:** preserve Subscriber chain in repeat() ([d9a7328](https://github.com/ReactiveX/RxJS/commit/d9a7328))
- **retry:** preserve Subscriber chain in retry() ([b429dac](https://github.com/ReactiveX/RxJS/commit/b429dac))
- **retryWhen:** preserve Subscriber chain in retryWhen() ([c9cb958](https://github.com/ReactiveX/RxJS/commit/c9cb958))

### Features

- **AsapScheduler:** rename NextTickScheduler to AsapScheduler ([3255fb3](https://github.com/ReactiveX/RxJS/commit/3255fb3)), closes [#838](https://github.com/ReactiveX/RxJS/issues/838)
- **BehaviorSubject:** add getValue method to access value ([33b387b](https://github.com/ReactiveX/RxJS/commit/33b387b)), closes [#758](https://github.com/ReactiveX/RxJS/issues/758)
- **BehaviorSubject:** now throws when getValue is called after unsubscription ([1ddf116](https://github.com/ReactiveX/RxJS/commit/1ddf116))
- **ObjectUnsubscribedError:** add ObjectUnsubscribed error class ([39836af](https://github.com/ReactiveX/RxJS/commit/39836af))
- **Observable:** subscribe accepts objects with rxSubscriber symbol ([b7672f4](https://github.com/ReactiveX/RxJS/commit/b7672f4))
- **QueueScheduler:** rename ImmediateScheduler to QueueScheduler ([66eb537](https://github.com/ReactiveX/RxJS/commit/66eb537))
- **Rx.Symbol.rxSubscriber:** add rxSubscriber symbol ([d4f1670](https://github.com/ReactiveX/RxJS/commit/d4f1670))
- **Subject:** add rxSubscriber symbol ([d2e4257](https://github.com/ReactiveX/RxJS/commit/d2e4257))
- **Subscriber:** add rxSubscriber symbol ([7bda360](https://github.com/ReactiveX/RxJS/commit/7bda360))
- **switchFirstMap:** rename switchMapFirst to switchFirstMap ([eddd4dc](https://github.com/ReactiveX/RxJS/commit/eddd4dc))

### BREAKING CHANGES

- AsapScheduler: `Rx.Scheduler.nextTick` (Rx 4's "default" scheduler) is now `Rx.Scheduler.asap`
- QueueScheduler: `Rx.Scheduler.immediate` (Rx 4's "currentThread" scheduler) is now `Rx.Scheduler.queue`
  related #838
- switchFirstMap: `switchMapFirst` is now `switchFirstMap`

<a name="5.0.0-alpha.12"></a>

# [5.0.0-alpha.12](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.10...v5.0.0-alpha.12) (2015-12-04)

### Bug Fixes

- **AsyncSubject:** emit value when it's subscribed after complete ([ed0eaf6](https://github.com/ReactiveX/RxJS/commit/ed0eaf6))
- **bindCallback:** only call function once even while scheduled ([8637d47](https://github.com/ReactiveX/RxJS/commit/8637d47)), closes [#881](https://github.com/ReactiveX/RxJS/issues/881)
- **bufferToggle:** fix disposal of subscriptions when errors occur ([a20325c](https://github.com/ReactiveX/RxJS/commit/a20325c))
- **catch:** fix catch to dispose old subscriptions ([280f7ed](https://github.com/ReactiveX/RxJS/commit/280f7ed)), closes [#763](https://github.com/ReactiveX/RxJS/issues/763)
- **catch:** fix catch() to preserve Subscriber chain ([e1447ac](https://github.com/ReactiveX/RxJS/commit/e1447ac))
- **concat:** accept scheduler parameter ([8859702](https://github.com/ReactiveX/RxJS/commit/8859702))
- **ConnectableObservable:** fix ConnectableObservable connectability and refCounting ([aef9578](https://github.com/ReactiveX/RxJS/commit/aef9578)), closes [#678](https://github.com/ReactiveX/RxJS/issues/678)
- **debounce:** Fix debounce to unsubscribe duration Observables ([dea7847](https://github.com/ReactiveX/RxJS/commit/dea7847))
- **expand:** fix expand's concurrency behavior ([01f86e5](https://github.com/ReactiveX/RxJS/commit/01f86e5))
- **expand:** terminate recursive call when destination completes ([3b8cf94](https://github.com/ReactiveX/RxJS/commit/3b8cf94))
- **Observable:** Subjects no longer wrapped in Subscriber ([5cb0f2b](https://github.com/ReactiveX/RxJS/commit/5cb0f2b)), closes [#825](https://github.com/ReactiveX/RxJS/issues/825) [#748](https://github.com/ReactiveX/RxJS/issues/748)
- **Observer:** anonymous observers now allow missing handlers ([a11c763](https://github.com/ReactiveX/RxJS/commit/a11c763)), closes [#723](https://github.com/ReactiveX/RxJS/issues/723)
- **operators:** Remove shareReplay and shareBehavior ([536a6a6](https://github.com/ReactiveX/RxJS/commit/536a6a6)), closes [#710](https://github.com/ReactiveX/RxJS/issues/710)
- **publish:** copy readme and license, remove scripts ([439a2f3](https://github.com/ReactiveX/RxJS/commit/439a2f3)), closes [#845](https://github.com/ReactiveX/RxJS/issues/845)
- **throttleTime:** fix and rename throttleTime operator ([3b0c1f3](https://github.com/ReactiveX/RxJS/commit/3b0c1f3))
- **TimerObservable:** accepts absolute date for dueTime ([e284fb8](https://github.com/ReactiveX/RxJS/commit/e284fb8)), closes [#648](https://github.com/ReactiveX/RxJS/issues/648)

### Features

- **AsyncSubject:** add AsyncSubject ([34c05fe](https://github.com/ReactiveX/RxJS/commit/34c05fe))
- **bindCallback:** remove thisArg ([feea9a1](https://github.com/ReactiveX/RxJS/commit/feea9a1))
- **bindCallback:** rename fromCallback to bindCallback ([305d66d](https://github.com/ReactiveX/RxJS/commit/305d66d)), closes [#876](https://github.com/ReactiveX/RxJS/issues/876)
- **callback:** Add Observable.fromCallback ([9f751e7](https://github.com/ReactiveX/RxJS/commit/9f751e7))
- **combineLatest:** accept array of observable as parameter ([2edd92c](https://github.com/ReactiveX/RxJS/commit/2edd92c)), closes [#594](https://github.com/ReactiveX/RxJS/issues/594)
- **forkJoin:** accept array of observable as parameter ([d45f672](https://github.com/ReactiveX/RxJS/commit/d45f672))
- **mergeScan:** support concurrency parameter for mergeScan ([fe0eb37](https://github.com/ReactiveX/RxJS/commit/fe0eb37)), closes [#868](https://github.com/ReactiveX/RxJS/issues/868)
- **usage:** add auto-patching operators ([1ab3508](https://github.com/ReactiveX/RxJS/commit/1ab3508)), closes [#860](https://github.com/ReactiveX/RxJS/issues/860)
- **skipWhile:** add skipWhile operator ([a2244e0](https://github.com/ReactiveX/RxJS/commit/a2244e0))
- **switchFirst:** add switchFirst and switchMapFirst ([71e3dd1](https://github.com/ReactiveX/RxJS/commit/71e3dd1))
- **publishLast:** add publishLast operator ([9bef228](https://github.com/ReactiveX/RxJS/commit/9bef228)), closes [#883](https://github.com/ReactiveX/RxJS/issues/883)
- **takeWhile:** add takeWhile operator ([48e53ea](https://github.com/ReactiveX/RxJS/commit/48e53ea)), closes [#695](https://github.com/ReactiveX/RxJS/issues/695)
- **takeWhile:** remove thisArg ([b5219a4](https://github.com/ReactiveX/RxJS/commit/b5219a4))
- **throttle:** add throttle operator with durationSelector ([c3bf3e7](https://github.com/ReactiveX/RxJS/commit/c3bf3e7)), closes [#496](https://github.com/ReactiveX/RxJS/issues/496)

### Performance Improvements

- **ReplaySubject:** fix memory leak of growing buffer ([0a73b4d](https://github.com/ReactiveX/RxJS/commit/0a73b4d)), closes [#578](https://github.com/ReactiveX/RxJS/issues/578)

<a name="5.0.0-alpha.11"></a>

# [5.0.0-alpha.11](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.10...v5.0.0-alpha.11) (2015-12-01)

### Bug Fixes

- **catch:** fix catch to dispose old subscriptions ([280f7ed](https://github.com/ReactiveX/RxJS/commit/280f7ed)), closes [#763](https://github.com/ReactiveX/RxJS/issues/763)
- **concat:** accept scheduler parameter ([8859702](https://github.com/ReactiveX/RxJS/commit/8859702))
- **ConnectableObservable:** fix ConnectableObservable connectability and refCounting ([aef9578](https://github.com/ReactiveX/RxJS/commit/aef9578)), closes [#678](https://github.com/ReactiveX/RxJS/issues/678)
- **debounce:** Fix debounce to unsubscribe duration Observables ([dea7847](https://github.com/ReactiveX/RxJS/commit/dea7847))
- **expand:** fix expand's concurrency behavior ([01f86e5](https://github.com/ReactiveX/RxJS/commit/01f86e5))
- **expand:** terminate recursive call when destination completes ([3b8cf94](https://github.com/ReactiveX/RxJS/commit/3b8cf94))
- **Observer:** anonymous observers now allow missing handlers ([a11c763](https://github.com/ReactiveX/RxJS/commit/a11c763)), closes [#723](https://github.com/ReactiveX/RxJS/issues/723)
- **operators:** Remove shareReplay and shareBehavior ([536a6a6](https://github.com/ReactiveX/RxJS/commit/536a6a6)), closes [#710](https://github.com/ReactiveX/RxJS/issues/710)
- **test:** make explicit unsubscription for observable ([505f5b7](https://github.com/ReactiveX/RxJS/commit/505f5b7))
- **throttleTime:** fix and rename throttleTime operator ([3b0c1f3](https://github.com/ReactiveX/RxJS/commit/3b0c1f3))
- **TimerObservable:** accepts absolute date for dueTime ([e284fb8](https://github.com/ReactiveX/RxJS/commit/e284fb8)), closes [#648](https://github.com/ReactiveX/RxJS/issues/648)

### Features

- **callback:** Add Observable.fromCallback ([9f751e7](https://github.com/ReactiveX/RxJS/commit/9f751e7))
- **combineLatest:** accept array of observable as parameter ([2edd92c](https://github.com/ReactiveX/RxJS/commit/2edd92c)), closes [#594](https://github.com/ReactiveX/RxJS/issues/594)
- **forkJoin:** accept array of observable as parameter ([d45f672](https://github.com/ReactiveX/RxJS/commit/d45f672))
- **operator:** add skipWhile operator ([a2244e0](https://github.com/ReactiveX/RxJS/commit/a2244e0))
- **operator:** add switchFirst and switchMapFirst ([71e3dd1](https://github.com/ReactiveX/RxJS/commit/71e3dd1))
- **takeWhile:** add takeWhile operator ([48e53ea](https://github.com/ReactiveX/RxJS/commit/48e53ea)), closes [#695](https://github.com/ReactiveX/RxJS/issues/695)
- **throttle:** add throttle operator with durationSelector ([c3bf3e7](https://github.com/ReactiveX/RxJS/commit/c3bf3e7)), closes [#496](https://github.com/ReactiveX/RxJS/issues/496)

### Performance Improvements

- **ReplaySubject:** fix memory leak of growing buffer ([0a73b4d](https://github.com/ReactiveX/RxJS/commit/0a73b4d)), closes [#578](https://github.com/ReactiveX/RxJS/issues/578)

<a name="5.0.0-alpha.10"></a>

# [5.0.0-alpha.10](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.9...v5.0.0-alpha.10) (2015-11-10)

### Bug Fixes

- **Immediate:** set immediate should no longer throw in Chrome ([a3de7d9](https://github.com/ReactiveX/RxJS/commit/a3de7d9)), closes [#690](https://github.com/ReactiveX/RxJS/issues/690)

<a name="5.0.0-alpha.9"></a>

# [5.0.0-alpha.9](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.8...v5.0.0-alpha.9) (2015-11-10)

### Bug Fixes

- **util:** incorrect Symbol.iterator for es6-shim ([15bf32c](https://github.com/ReactiveX/RxJS/commit/15bf32c))

### Features

- **forkJoin:** accept promise, resultselector as parameter of forkJoin ([190f349](https://github.com/ReactiveX/RxJS/commit/190f349)), closes [#507](https://github.com/ReactiveX/RxJS/issues/507)

<a name="5.0.0-alpha.8"></a>

# [5.0.0-alpha.8](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.7...v5.0.0-alpha.8) (2015-11-06)

### Bug Fixes

- **concat:** handle a given scheduler correctly ([8745216](https://github.com/ReactiveX/RxJS/commit/8745216))
- **package.json:** loosen the engines/npm semver range to prevent false warnings ([df791c6](https://github.com/ReactiveX/RxJS/commit/df791c6))
- **skipUntil:** unsubscribe source when it completes ([8a4162b](https://github.com/ReactiveX/RxJS/commit/8a4162b)), closes [#577](https://github.com/ReactiveX/RxJS/issues/577)
- **take:** deal with total <= 0 and add tests ([c5cc06f](https://github.com/ReactiveX/RxJS/commit/c5cc06f))
- **windowWhen:** fix windowWhen with regard to unsubscriptions ([8174947](https://github.com/ReactiveX/RxJS/commit/8174947))

### Features

- **mergeScan:** add new mergeScan operator. ([0ebb5bd](https://github.com/ReactiveX/RxJS/commit/0ebb5bd))
- **multicast:** support both Subject and subjectFactory arguments ([f779027](https://github.com/ReactiveX/RxJS/commit/f779027))

### BREAKING CHANGES

- **publish:** reverted to RxJS 4 behavior
- **publishBehavior:** reverted to RxJS 4 behavior
- **publishReplay:** reverted to RxJS 4 behavior
- **shareBehavior:** removed
- **shareReplay:** removed

<a name="5.0.0-alpha.7"></a>

# [5.0.0-alpha.7](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.6...v5.0.0-alpha.7) (2015-10-27)

### Bug Fixes

- **NextTickAction:** fix unsubscription behavior ([3d8264c](https://github.com/ReactiveX/RxJS/commit/3d8264c)), closes [#582](https://github.com/ReactiveX/RxJS/issues/582)
- **buffer:** cleanup notifier subscription when unsubscribed ([1b30aa9](https://github.com/ReactiveX/RxJS/commit/1b30aa9))
- **delay:** accepts absolute time delay ([b109100](https://github.com/ReactiveX/RxJS/commit/b109100))
- **mergeMapTo:** mergeMapTo result should complete ([6f9859e](https://github.com/ReactiveX/RxJS/commit/6f9859e))
- **operator:** update type definitions for union types ([9d90c75](https://github.com/ReactiveX/RxJS/commit/9d90c75)), closes [#581](https://github.com/ReactiveX/RxJS/issues/581)
- **repeat:** fix inner subscription semantics for repeat ([f67a596](https://github.com/ReactiveX/RxJS/commit/f67a596)), closes [#554](https://github.com/ReactiveX/RxJS/issues/554)
- **switchMapTo:** reimplement switchMapTo to pass tests ([d4789cd](https://github.com/ReactiveX/RxJS/commit/d4789cd))
- **takeUntil:** unsubscribe notifier when it completes ([9415196](https://github.com/ReactiveX/RxJS/commit/9415196))

### Features

- **operator:** add max operator ([7fda036](https://github.com/ReactiveX/RxJS/commit/7fda036))
- **operator:** add min operator ([79cb6cf](https://github.com/ReactiveX/RxJS/commit/79cb6cf))
- **shareBehavior:** add shareBehavior and its tests ([97ff1ec](https://github.com/ReactiveX/RxJS/commit/97ff1ec))

<a name="5.0.0-alpha.6"></a>

# [5.0.0-alpha.6](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.5...v5.0.0-alpha.6) (2015-10-17)

### Bug Fixes

- **retryWhen:** fix internal unsubscriptions ([5aff5e8](https://github.com/ReactiveX/RxJS/commit/5aff5e8))
- **scan:** scan now behaves like RxJS 4 scan ([27f9c09](https://github.com/ReactiveX/RxJS/commit/27f9c09))

<a name="5.0.0-alpha.5"></a>

# [5.0.0-alpha.5](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.4...v5.0.0-alpha.5) (2015-10-16)

### Bug Fixes

- **bufferToggle:** fix bugs in order to pass tests ([949fa31](https://github.com/ReactiveX/RxJS/commit/949fa31))
- **mergeAll:** fix mergeAll micro performance tests to use mapTo instead of map. ([616e86e](https://github.com/ReactiveX/RxJS/commit/616e86e))
- **package:** correct typings path ([a501b06](https://github.com/ReactiveX/RxJS/commit/a501b06))
- **repeat:** add additional resubscription behavior ([4f9f33b](https://github.com/ReactiveX/RxJS/commit/4f9f33b)), closes [#516](https://github.com/ReactiveX/RxJS/issues/516)
- **retry:** fix internal unsubscriptions for retry ([cc92f45](https://github.com/ReactiveX/RxJS/commit/cc92f45)), closes [#546](https://github.com/ReactiveX/RxJS/issues/546)
- **windowToggle:** fix window closing and unsubscription semantics ([0cb21e6](https://github.com/ReactiveX/RxJS/commit/0cb21e6))

<a name="5.0.0-alpha.4"></a>

# [5.0.0-alpha.4](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.3...5.0.0-alpha.4) (2015-10-15)

### Bug Fixes

- **Subject:** fix missing unsubscribe call ([9dd27d6](https://github.com/ReactiveX/RxJS/commit/9dd27d6))
- **Subscriber:** avoid implicit any ([08faaa9](https://github.com/ReactiveX/RxJS/commit/08faaa9))
- **bufferWhen:** onComplete of closings determine buffers ([5d28a38](https://github.com/ReactiveX/RxJS/commit/5d28a38))
- **fromEvent:** make selector argument optional in fromEvent static method ([71d90b4](https://github.com/ReactiveX/RxJS/commit/71d90b4))
- **skipUntil:** update skipUntil behavior with error, completion ([6f0d98f](https://github.com/ReactiveX/RxJS/commit/6f0d98f)), closes [#518](https://github.com/ReactiveX/RxJS/issues/518)
- **windowCount:** fix windowCount window opening times ([908ae56](https://github.com/ReactiveX/RxJS/commit/908ae56)), closes [#273](https://github.com/ReactiveX/RxJS/issues/273)

### Features

- **operator:** add debounce operator ([a1e652f](https://github.com/ReactiveX/RxJS/commit/a1e652f)), closes [#493](https://github.com/ReactiveX/RxJS/issues/493)
- **operator:** add debounceTime operator ([dd2ba40](https://github.com/ReactiveX/RxJS/commit/dd2ba40))

### Performance Improvements

- **ScalarObservable:** add fast-path for mapping scalar observables ([7b0d3dc](https://github.com/ReactiveX/RxJS/commit/7b0d3dc))
- **count:** fast-path for counting over scalars ([c35a120](https://github.com/ReactiveX/RxJS/commit/c35a120))
- **filter:** add fast-path for filtering scalar observables ([e2e8954](https://github.com/ReactiveX/RxJS/commit/e2e8954))
- **reduce:** add fast-path for reducing over scalar observables ([4c65136](https://github.com/ReactiveX/RxJS/commit/4c65136))
- **scan:** fast-path for scanning scalars ([0201b92](https://github.com/ReactiveX/RxJS/commit/0201b92))
- **skip:** fast-path for skip over scalar observable ([9b49936](https://github.com/ReactiveX/RxJS/commit/9b49936))
- **take:** add fast-path for take over scalars ([33053b1](https://github.com/ReactiveX/RxJS/commit/33053b1))

<a name="5.0.0-alpha.3"></a>

# [5.0.0-alpha.3](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.2...5.0.0-alpha.3) (2015-10-13)

### Bug Fixes

- **Observable:** fix type signature of some static operators ([e5364de](https://github.com/ReactiveX/RxJS/commit/e5364de))
- **Subject.create:** ensure operator property not required for Observable subscription ([2259de2](https://github.com/ReactiveX/RxJS/commit/2259de2)), closes [#483](https://github.com/ReactiveX/RxJS/issues/483)
- **TestScheduler:** stop sorting actual results ([51db0b8](https://github.com/ReactiveX/RxJS/commit/51db0b8)), closes [#422](https://github.com/ReactiveX/RxJS/issues/422)
- **benchpress:** update benchpress dependencies and config ([8513eaa](https://github.com/ReactiveX/RxJS/commit/8513eaa)), closes [#348](https://github.com/ReactiveX/RxJS/issues/348)
- **buffer:** change behavior of buffer to more closely match RxJS 4 ([b66592d](https://github.com/ReactiveX/RxJS/commit/b66592d))
- **combineLatest:** fix type signature ([a3e6deb](https://github.com/ReactiveX/RxJS/commit/a3e6deb))
- **defer:** fix type signature ([11327b9](https://github.com/ReactiveX/RxJS/commit/11327b9))
- **empty:** fix type signature ([893cb7e](https://github.com/ReactiveX/RxJS/commit/893cb7e))
- **fromPromise:** fix type signature ([17415fa](https://github.com/ReactiveX/RxJS/commit/17415fa))
- **groupBy:** durationSelector cannot keep source alive ([57e4207](https://github.com/ReactiveX/RxJS/commit/57e4207))
- **groupBy:** fix bugs related to group resets ([23a7574](https://github.com/ReactiveX/RxJS/commit/23a7574))
- **groupBy:** fix bugs with groupBy ([86992c6](https://github.com/ReactiveX/RxJS/commit/86992c6))
- **interval:** fix signature type ([9c238c0](https://github.com/ReactiveX/RxJS/commit/9c238c0))
- **operator:** startWith operator accepts scheduler, multiple values ([d1d339a](https://github.com/ReactiveX/RxJS/commit/d1d339a))
- **operators:** reorder signature of resultSelectors ([fc1724d](https://github.com/ReactiveX/RxJS/commit/fc1724d))
- **range:** fix type signature ([9237d0b](https://github.com/ReactiveX/RxJS/commit/9237d0b))
- **timeout:** fix absolute timeout behavior ([8ec06cf](https://github.com/ReactiveX/RxJS/commit/8ec06cf))
- **timeout:** update behavior of timeout, timeoutWith ([16bd691](https://github.com/ReactiveX/RxJS/commit/16bd691))
- **timer:** fix type signature ([fffb96c](https://github.com/ReactiveX/RxJS/commit/fffb96c))
- **window:** handle closingNotifier errors/completes ([42beff1](https://github.com/ReactiveX/RxJS/commit/42beff1))

### Features

- **TestScheduler:** support unsubscription marbles ([ffb0bb9](https://github.com/ReactiveX/RxJS/commit/ffb0bb9))
- **count:** add predicate support in count() ([42d1add](https://github.com/ReactiveX/RxJS/commit/42d1add)), closes [#425](https://github.com/ReactiveX/RxJS/issues/425)
- **dematerialize:** add dematerialize operator ([0a8b074](https://github.com/ReactiveX/RxJS/commit/0a8b074)), closes [#475](https://github.com/ReactiveX/RxJS/issues/475)
- **do:** do will now handle an observer as an argument ([c1a4994](https://github.com/ReactiveX/RxJS/commit/c1a4994)), closes [#476](https://github.com/ReactiveX/RxJS/issues/476)
- **first:** add resultSelector ([3c20fcc](https://github.com/ReactiveX/RxJS/commit/3c20fcc)), closes [#417](https://github.com/ReactiveX/RxJS/issues/417)
- **last:** add resultSelector argument ([5a4896c](https://github.com/ReactiveX/RxJS/commit/5a4896c)), closes [#418](https://github.com/ReactiveX/RxJS/issues/418)
- **operator:** add every operator ([d11f32e](https://github.com/ReactiveX/RxJS/commit/d11f32e))
- **operator:** add timeInterval operator ([6cc0615](https://github.com/ReactiveX/RxJS/commit/6cc0615))
- **share:** add the share operator ([c36f2be](https://github.com/ReactiveX/RxJS/commit/c36f2be)), closes [#439](https://github.com/ReactiveX/RxJS/issues/439)
- **shareReplay:** add the shareReplay() operator ([65c84ea](https://github.com/ReactiveX/RxJS/commit/65c84ea))

### Performance Improvements

- **ReplaySubject:** remove unnecessary computation ([488ac2e](https://github.com/ReactiveX/RxJS/commit/488ac2e))

### BREAKING CHANGES

- **operators with resultSelectors** (mergeMap, concatMap, switchMap, etc):
  The function signature of resultSelectors used to be (innerValue,
  outerValue, innerIndex, outerIndex) but this commits changes it to
  be (outerValue, innerValue, outerIndex, innerIndex), to match
  signatures in RxJS 4.

<a name="5.0.0-alpha.2"></a>

# [5.0.0-alpha.2](https://github.com/ReactiveX/RxJS/compare/5.0.0-alpha.1...5.0.0-alpha.2) (2015-09-30)

### Bug Fixes

- **concat:** let observable concat instead of merge ([c17e832](https://github.com/ReactiveX/RxJS/commit/c17e832))

### Features

- **operator:** add find, findIndex operator ([7c6cc9d](https://github.com/ReactiveX/RxJS/commit/7c6cc9d))
- **operator:** add first operator ([274c233](https://github.com/ReactiveX/RxJS/commit/274c233))
- **operator:** add ignoreElements operator ([fe1a952](https://github.com/ReactiveX/RxJS/commit/fe1a952))
- **zip:** zip now supports never-ending iterables ([a5684ba](https://github.com/ReactiveX/RxJS/commit/a5684ba)), closes [#397](https://github.com/ReactiveX/RxJS/issues/397)

<a name="5.0.0-alpha.1"></a>

# [5.0.0-alpha.1](https://github.com/ReactiveX/RxJS/compare/0.0.0-prealpha.3...5.0.0-alpha.1) (2015-09-23)

### Bug Fixes

- **Promises:** escape promise error trap ([c69088a](https://github.com/ReactiveX/RxJS/commit/c69088a))
- **TestScheduler:** ensure TestScheduler subscribes to expectations before hot subjects ([b9b2ba5](https://github.com/ReactiveX/RxJS/commit/b9b2ba5))
- **TestScheduler:** properly schedule actions added dynamically ([069ede4](https://github.com/ReactiveX/RxJS/commit/069ede4))
- **buffer:** do not emit empty buffer when completes ([252fccb](https://github.com/ReactiveX/RxJS/commit/252fccb))
- **bufferTime:** inner intervals will now clean up properly ([4ef41b0](https://github.com/ReactiveX/RxJS/commit/4ef41b0))
- **expand:** Fix expand to stay open until the source Observable completes. ([20ef785](https://github.com/ReactiveX/RxJS/commit/20ef785))
- **expand:** fix expand operator to match Rx3 ([67f9623](https://github.com/ReactiveX/RxJS/commit/67f9623))
- **last:** emit value matches with predicate instead of result of predicate ([0f635ee](https://github.com/ReactiveX/RxJS/commit/0f635ee))
- **merge:** fix issues with async in merge ([7a15304](https://github.com/ReactiveX/RxJS/commit/7a15304))
- **mergeAll:** merge all will properly handle async observables ([43b63cc](https://github.com/ReactiveX/RxJS/commit/43b63cc))
- **package:** specify supported npm version ([f72e622](https://github.com/ReactiveX/RxJS/commit/f72e622))
- **switchAll:** switch all will properly handle async observables ([c2e2d29](https://github.com/ReactiveX/RxJS/commit/c2e2d29))
- **switchAll/switchLatest:** inner subscriptions should now properly unsub ([38a45f8](https://github.com/ReactiveX/RxJS/commit/38a45f8)), closes [#302](https://github.com/ReactiveX/RxJS/issues/302)

### Features

- **combineLatest:** supports promises, iterables, lowercase-o observables and Observables ([ce76e4e](https://github.com/ReactiveX/RxJS/commit/ce76e4e))
- **config:** add global configuration of Promise capability ([e7eb5d7](https://github.com/ReactiveX/RxJS/commit/e7eb5d7)), closes [#115](https://github.com/ReactiveX/RxJS/issues/115)
- **expand:** now handles promises, iterables and lowercase-o observables ([c5239e9](https://github.com/ReactiveX/RxJS/commit/c5239e9))
- **mergeAll:** now supports promises, iterables and lowercase-o observables ([4c16aa6](https://github.com/ReactiveX/RxJS/commit/4c16aa6))
- **operator:** add elementAt operator ([cd562c4](https://github.com/ReactiveX/RxJS/commit/cd562c4))
- **operator:** add isEmpty operator ([80f72c5](https://github.com/ReactiveX/RxJS/commit/80f72c5))
- **operator:** add last operator ([d841b11](https://github.com/ReactiveX/RxJS/commit/d841b11)), closes [#304](https://github.com/ReactiveX/RxJS/issues/304) [#306](https://github.com/ReactiveX/RxJS/issues/306)
- **operator:** add single operator ([49484a2](https://github.com/ReactiveX/RxJS/commit/49484a2))
- **switch:** add promise, iterable and array support ([24fdd34](https://github.com/ReactiveX/RxJS/commit/24fdd34))
- **withLatestFrom:** default array output, handle other types ([cb393dc](https://github.com/ReactiveX/RxJS/commit/cb393dc))
- **zip:** supports promises, iterables and lowercase-o observables ([d332a0e](https://github.com/ReactiveX/RxJS/commit/d332a0e))

<a name="0.0.0-prealpha.3"></a>

# [0.0.0-prealpha.3](https://github.com/ReactiveX/RxJS/compare/0.0.0-prealpha.2...0.0.0-prealpha.3) (2015-09-11)

### Bug Fixes

- **root:** use self as the root object when available ([0428a85](https://github.com/ReactiveX/RxJS/commit/0428a85))

<a name="0.0.0-prealpha.2"></a>

# [0.0.0-prealpha.2](https://github.com/ReactiveX/RxJS/compare/0.0.0-prealpha.1...0.0.0-prealpha.2) (2015-09-11)

### Bug Fixes

- **bufferCount:** set default value for skip argument, do not emit empty buffer at the end ([2c1a9dc](https://github.com/ReactiveX/RxJS/commit/2c1a9dc))
- **windowCount:** set default value for skip argument, do not emit empty buffer at the end ([a513dbb](https://github.com/ReactiveX/RxJS/commit/a513dbb))

### Features

- **Observable:** add static create method ([e0d27ba](https://github.com/ReactiveX/RxJS/commit/e0d27ba)), closes [#255](https://github.com/ReactiveX/RxJS/issues/255)
- **TestScheduler:** add TestScheduler ([b23daf1](https://github.com/ReactiveX/RxJS/commit/b23daf1)), closes [#270](https://github.com/ReactiveX/RxJS/issues/270)
- **VirtualTimeScheduler:** add VirtualTimeScheduler ([96f9386](https://github.com/ReactiveX/RxJS/commit/96f9386)), closes [#269](https://github.com/ReactiveX/RxJS/issues/269)
- **operator:** add sample and sampleTime ([9e62789](https://github.com/ReactiveX/RxJS/commit/9e62789)), closes [#178](https://github.com/ReactiveX/RxJS/issues/178)

<a name="0.0.0-prealpha.1"></a>

# [0.0.0-prealpha.1](https://github.com/ReactiveX/RxJS/compare/0441dea...0.0.0-prealpha.1) (2015-09-02)

### Bug Fixes

- **combineLatest:** check for limits higher than total observable count ([81e5dfb](https://github.com/ReactiveX/RxJS/commit/81e5dfb))
- **rx:** add hack to export global until better global build exists ([1a543b0](https://github.com/ReactiveX/RxJS/commit/1a543b0))
- **subscription-ref:** add setter for isDisposed ([6fe5427](https://github.com/ReactiveX/RxJS/commit/6fe5427))
- **take:** complete on limit reached ([801a711](https://github.com/ReactiveX/RxJS/commit/801a711))

### Features

- **benchpress:** add benchpress config and flatmap spec ([0441dea](https://github.com/ReactiveX/RxJS/commit/0441dea))
- **catch:** add catch operator, related to #141, closes #130 ([94b4c01](https://github.com/ReactiveX/RxJS/commit/94b4c01)), closes [#130](https://github.com/ReactiveX/RxJS/issues/130)
- **from:** let from handle any "observablesque" ([526d4c3](https://github.com/ReactiveX/RxJS/commit/526d4c3)), closes [#156](https://github.com/ReactiveX/RxJS/issues/156) [#236](https://github.com/ReactiveX/RxJS/issues/236)
- **index:** add index module which requires commonjs build ([379d2d1](https://github.com/ReactiveX/RxJS/commit/379d2d1)), closes [#117](https://github.com/ReactiveX/RxJS/issues/117)
- **observable:** add Observable.all (forkJoin) ([44a4ee1](https://github.com/ReactiveX/RxJS/commit/44a4ee1))
- **operator:** Add count operator. ([30dd894](https://github.com/ReactiveX/RxJS/commit/30dd894))
- **operator:** Add distinctUntilChanged and distinctUntilKeyChanged ([f9ba4da](https://github.com/ReactiveX/RxJS/commit/f9ba4da))
- **operator:** Add do operator. ([7d9b52b](https://github.com/ReactiveX/RxJS/commit/7d9b52b))
- **operator:** Add expand operator. ([47b178b](https://github.com/ReactiveX/RxJS/commit/47b178b))
- **operator:** Add minimal delay operator. ([7851885](https://github.com/ReactiveX/RxJS/commit/7851885))
- **operator:** add buffer operators: buffer, bufferWhen, bufferTime, bufferCount, and bufferTog ([9f8347f](https://github.com/ReactiveX/RxJS/commit/9f8347f)), closes [#207](https://github.com/ReactiveX/RxJS/issues/207)
- **operator:** add debounce ([f03adaf](https://github.com/ReactiveX/RxJS/commit/f03adaf)), closes [#193](https://github.com/ReactiveX/RxJS/issues/193)
- **operator:** add defaultIfEmpty ([c80688b](https://github.com/ReactiveX/RxJS/commit/c80688b))
- **operator:** add finally ([526e4c9](https://github.com/ReactiveX/RxJS/commit/526e4c9))
- **operator:** add fromEventPattern creator function ([1095d4c](https://github.com/ReactiveX/RxJS/commit/1095d4c))
- **operator:** add groupBy ([1e13aea](https://github.com/ReactiveX/RxJS/commit/1e13aea)), closes [#165](https://github.com/ReactiveX/RxJS/issues/165)
- **operator:** add materialize. closes #132 ([6d9f6ae](https://github.com/ReactiveX/RxJS/commit/6d9f6ae)), closes [#132](https://github.com/ReactiveX/RxJS/issues/132)
- **operator:** add publishBehavior operator and spec ([249ab8d](https://github.com/ReactiveX/RxJS/commit/249ab8d))
- **operator:** add publishReplay operator and spec ([a0c47d6](https://github.com/ReactiveX/RxJS/commit/a0c47d6))
- **operator:** add retry ([4451db5](https://github.com/ReactiveX/RxJS/commit/4451db5))
- **operator:** add retryWhen operator. closes #129 ([65eb50e](https://github.com/ReactiveX/RxJS/commit/65eb50e)), closes [#129](https://github.com/ReactiveX/RxJS/issues/129)
- **operator:** add skipUntil ([ef2620e](https://github.com/ReactiveX/RxJS/commit/ef2620e)), closes [#180](https://github.com/ReactiveX/RxJS/issues/180)
- **operator:** add throttle ([1d735b9](https://github.com/ReactiveX/RxJS/commit/1d735b9)), closes [#191](https://github.com/ReactiveX/RxJS/issues/191)
- **operator:** add timeout and timeoutWith ([bb440ad](https://github.com/ReactiveX/RxJS/commit/bb440ad)), closes [#244](https://github.com/ReactiveX/RxJS/issues/244)
- **operator:** add toPromise operator. closes #159 ([361a53b](https://github.com/ReactiveX/RxJS/commit/361a53b)), closes [#159](https://github.com/ReactiveX/RxJS/issues/159)
- **operator:** add window operators: window, windowWhen, windowTime, windowCount, windowToggle ([9f5d510](https://github.com/ReactiveX/RxJS/commit/9f5d510)), closes [#195](https://github.com/ReactiveX/RxJS/issues/195)
- **operator:** add withLatestFrom ([322218a](https://github.com/ReactiveX/RxJS/commit/322218a)), closes [#209](https://github.com/ReactiveX/RxJS/issues/209)
- **operator:** implement startWith(). ([1f36d99](https://github.com/ReactiveX/RxJS/commit/1f36d99))
