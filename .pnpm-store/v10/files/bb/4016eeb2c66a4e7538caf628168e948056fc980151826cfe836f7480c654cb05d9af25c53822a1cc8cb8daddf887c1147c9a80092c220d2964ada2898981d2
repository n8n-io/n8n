# mobx

## 6.12.0

### Minor Changes

-   [`ec5db592`](https://github.com/mobxjs/mobx/commit/ec5db592d7756826c31e710b1c759d7e9406b153) [#3792](https://github.com/mobxjs/mobx/pull/3792) Thanks [@tonyraoul](https://github.com/tonyraoul)! - Improve observablearray proxy pefromance for es2023.array and es2022.array methods

### Patch Changes

-   [`86616c11`](https://github.com/mobxjs/mobx/commit/86616c11c108a511331eb05e55c08fc2c5a23f4d) [#3654](https://github.com/mobxjs/mobx/pull/3654) Thanks [@ahoisl](https://github.com/ahoisl)! - fix: action transparently forwards toString of underlying function

## 6.11.0

### Minor Changes

-   [`c9260974`](https://github.com/mobxjs/mobx/commit/c9260974f726f58de0fd4974ea024c644d9b7c6f) [#3790](https://github.com/mobxjs/mobx/pull/3790) Thanks [@mweststrate](https://github.com/mweststrate)! - Added support for modern 2022.3 Decorators. [#3790](https://github.com/mobxjs/mobx/pull/3790)
    -   [Installation / usage instruction](https://mobx.js.org/enabling-decorators.html).
    -   [Introduction announcement](https://michel.codes/blogs/mobx-decorators)
    -   Original PR by [@Matchlighter](https://github.com/Matchlighter) in [#3638](https://github.com/mobxjs/mobx/pull/3638),

## 6.10.2

### Patch Changes

-   [`c8d9374d`](https://github.com/mobxjs/mobx/commit/c8d9374d4f3b05cfec0d690e0eb3ada4f619ff0b) [#3748](https://github.com/mobxjs/mobx/pull/3748) Thanks [@mweststrate](https://github.com/mweststrate)! - Fixed: #3747, computed values becoming stale if the underlying observable was created and updated outside a reactive context

## 6.10.1

### Patch Changes

-   [`3ceeb865`](https://github.com/mobxjs/mobx/commit/3ceeb8651e328c4c7211c875696b3f5269fea834) [#3732](https://github.com/mobxjs/mobx/pull/3732) Thanks [@urugator](https://github.com/urugator)! - - fix: #3728: Observable initialization updates state version.
    -   fix: Observable set initialization violates `enforceActions: "always"`.
    -   fix: Changing keys of observable object does not respect `enforceActions`.

## 6.10.0

### Minor Changes

-   [`bebd5f05`](https://github.com/mobxjs/mobx/commit/bebd5f0507a109145f401c78630ed9d59e4a1101) [#3727](https://github.com/mobxjs/mobx/pull/3727) Thanks [@rluvaton](https://github.com/rluvaton)! - Added support for `signal` (AbortSignal) in `autorun`, `reaction` and sync `when` options to dispose them

### Patch Changes

-   [`55f78ddc`](https://github.com/mobxjs/mobx/commit/55f78ddc20e84f38a7aa88b99a51ad994e558241) [#3717](https://github.com/mobxjs/mobx/pull/3717) Thanks [@liucan233](https://github.com/liucan233)! - remove proxy option for makeObservable and makeAutoObservable

## 6.9.1

### Patch Changes

-   [`4792303e`](https://github.com/mobxjs/mobx/commit/4792303ec9119c1ba54134fff7e845d21a1d9337) [#3709](https://github.com/mobxjs/mobx/pull/3709) Thanks [@kubk](https://github.com/kubk)! - Make trace() noop in production build

## 6.9.0

### Minor Changes

-   [`44a2cf42`](https://github.com/mobxjs/mobx/commit/44a2cf42dec7635f639ddbfb19202ebc710bac54) [#3590](https://github.com/mobxjs/mobx/pull/3590) Thanks [@urugator](https://github.com/urugator)! - Better support for React 18: Mobx now keeps track of a global state version, which updates with each mutation.

## 6.8.0

### Minor Changes

-   [`fed3ff14`](https://github.com/mobxjs/mobx/commit/fed3ff14ca4dcbc788c4678e6d3f4edf747ffdb0) [#3608](https://github.com/mobxjs/mobx/pull/3608) Thanks [@emereum](https://github.com/emereum)! - Do not expose the methods `observe_` or `intercept_` on computed values and observable values.

### Patch Changes

-   [`42f8ac05`](https://github.com/mobxjs/mobx/commit/42f8ac057ec70c508232339016cc7249123f0fd0) [#3596](https://github.com/mobxjs/mobx/pull/3596) Thanks [@urugator](https://github.com/urugator)! - fix #3595 onBecomeObserved is not called for ObservableSet

*   [`2bccc5b3`](https://github.com/mobxjs/mobx/commit/2bccc5b3ca1df6444c942c715718519d590281e0) [#3583](https://github.com/mobxjs/mobx/pull/3583) Thanks [@urugator](https://github.com/urugator)! - fix #3582: AbortSignal leaks @types/node

-   [`7095fa45`](https://github.com/mobxjs/mobx/commit/7095fa4569afb538b7f153ce2b2a8078f2dbe1fc) [#3609](https://github.com/mobxjs/mobx/pull/3609) Thanks [@emereum](https://github.com/emereum)! - Restore generic types for newValue and oldValue on IValueDidChange and IBoxDidChange.

## 6.7.0

### Minor Changes

-   [`8cf4784f`](https://github.com/mobxjs/mobx/commit/8cf4784f53857cc977aed641bd778f2c14a080f5) [#3559](https://github.com/mobxjs/mobx/pull/3559) Thanks [@urugator](https://github.com/urugator)! - Proxied observable arrays can now safely read/write out of bound indices. See https://github.com/mobxjs/mobx/discussions/3537

*   [`223e3688`](https://github.com/mobxjs/mobx/commit/223e3688631528a327c79d39e2f497c6e1506165) [#3551](https://github.com/mobxjs/mobx/pull/3551) Thanks [@deadbeef84](https://github.com/deadbeef84)! - Added new option `signal` to `when()`, to support abortion using an AbortSignal / AbortController.

### Patch Changes

-   [`fe25cfed`](https://github.com/mobxjs/mobx/commit/fe25cfede0aee3bddd7fa434a14ed4b40a57ee26) [#3566](https://github.com/mobxjs/mobx/pull/3566) Thanks [@upsuper](https://github.com/upsuper)! - Make return value of reportObserved match invoke of onBecomeObserved

## 6.6.2

### Patch Changes

-   [`b375535c`](https://github.com/mobxjs/mobx/commit/b375535c422453963f5d3485a2ef5233568c12a6) [#3344](https://github.com/mobxjs/mobx/pull/3344) Thanks [@Nokel81](https://github.com/Nokel81)! - Allow readonly tuples as part of IObservableMapInitialValues

*   [`7260cd41`](https://github.com/mobxjs/mobx/commit/7260cd413b1e52449523826ac239c2a197b2880f) [#3516](https://github.com/mobxjs/mobx/pull/3516) Thanks [@urugator](https://github.com/urugator)! - fix regression #3514: LegacyObservableArray compat with Safari 9.\*

-   [`78d1aa23`](https://github.com/mobxjs/mobx/commit/78d1aa2362b4dc5d521518688d6ac7e2d4f7ad3a) [#3458](https://github.com/mobxjs/mobx/pull/3458) Thanks [@egilll](https://github.com/egilll)! - A slight revamp of the README, wording, and clearer links

## 6.6.1

### Patch Changes

-   [`63698d06`](https://github.com/mobxjs/mobx/commit/63698d0681988194bac5fc01851882b417b35f18) [#3427](https://github.com/mobxjs/mobx/pull/3427) Thanks [@RyanCavanaugh](https://github.com/RyanCavanaugh)! - Apply 'object' constraint where required

## 6.6.0

### Minor Changes

-   [`8e204c7b`](https://github.com/mobxjs/mobx/commit/8e204c7b7d1dbad597761fa83beda77f027ee34c) [#3409](https://github.com/mobxjs/mobx/pull/3409) Thanks [@Nokel81](https://github.com/Nokel81)! - Remove observable.box type inconsistancy

## 6.5.0

### Minor Changes

-   [`767baff0`](https://github.com/mobxjs/mobx/commit/767baff0373e5a5e2b7da274b25042078f9a205c) [#3338](https://github.com/mobxjs/mobx/pull/3338) Thanks [@kubk](https://github.com/kubk)! - Replace any with a generic in Set methods

## 6.4.2

### Patch Changes

-   [`2caf7e1a`](https://github.com/mobxjs/mobx/commit/2caf7e1a3504dde3d7c9bde3c6fb56ca85168018) [#3316](https://github.com/mobxjs/mobx/pull/3316) Thanks [@urugator](https://github.com/urugator)! - `requiresObservable` always takes precedence over global `reactionRequiresObservable`

## 6.4.1

### Patch Changes

-   [`d6fa9a19`](https://github.com/mobxjs/mobx/commit/d6fa9a1970ebfb8a8adaf5bf0dc73125acec2dee) [#3306](https://github.com/mobxjs/mobx/pull/3306) Thanks [@urugator](https://github.com/urugator)! - fix missing type inferrence of `observe` and `intercept` for arrays

## 6.4.0

### Minor Changes

-   [`6b926833`](https://github.com/mobxjs/mobx/commit/6b926833ac7abbf92ff5c309613d2345f72527ee) [#3287](https://github.com/mobxjs/mobx/pull/3287) Thanks [@kubk](https://github.com/kubk)! - Remove any from 'merge' and 'replace' methods of ObservableMap

### Patch Changes

-   [`dee35be4`](https://github.com/mobxjs/mobx/commit/dee35be427989b6adc3c8f7ae8dc632ea66f3538) [#3300](https://github.com/mobxjs/mobx/pull/3300) Thanks [@kubk](https://github.com/kubk)! - Make the error message about Object.freeze more informative

## 6.3.13

### Patch Changes

-   [`23803202`](https://github.com/mobxjs/mobx/commit/2380320263f5edcd06d7ba6bdf02aff3fd7d305a) [#3273](https://github.com/mobxjs/mobx/pull/3273) Thanks [@urugator](https://github.com/urugator)! - fix `flow.bound` #3271

## 6.3.12

### Patch Changes

-   [`654a2013`](https://github.com/mobxjs/mobx/commit/654a2013107ac6e5bbe3851e4eed22f0c9130525) [#3257](https://github.com/mobxjs/mobx/pull/3257) Thanks [@urugator](https://github.com/urugator)! - fix: observable map initialization violates `enforceActions: "always"`

## 6.3.11

### Patch Changes

-   [`bf5da6ba`](https://github.com/mobxjs/mobx/commit/bf5da6bad982dc3d955d5f27f7fea6f94b041ea7) [#3239](https://github.com/mobxjs/mobx/pull/3239) Thanks [@bernardobelchior](https://github.com/bernardobelchior)! - Improved `toJS` jsdoc

## 6.3.10

### Patch Changes

-   [`2d70798e`](https://github.com/mobxjs/mobx/commit/2d70798eb327187d93757757ceaf410a608735b2) [#3233](https://github.com/mobxjs/mobx/pull/3233) Thanks [@anderlaw](https://github.com/anderlaw)! - `eq.ts` fix comparer logic

## 6.3.9

### Patch Changes

-   [`87e5a037`](https://github.com/mobxjs/mobx/commit/87e5a03735dbc1930e54a15b5ce88ad684bc3dc1) [#3214](https://github.com/mobxjs/mobx/pull/3214) Thanks [@urugator](https://github.com/urugator)! - `requiresReaction` always takes precedence over global `computedRequiresReaction`

*   [`9b90e25c`](https://github.com/mobxjs/mobx/commit/9b90e25c7bc0cdc0a07d1f847683604e86790f24) [#3198](https://github.com/mobxjs/mobx/pull/3198) Thanks [@urugator](https://github.com/urugator)! - fix `isPlainObject` impl (fixes #3197)

## 6.3.8

### Patch Changes

-   [`9d5e65cb`](https://github.com/mobxjs/mobx/commit/9d5e65cbd612f262d925e57cebb559f5cf36c502) [#3193](https://github.com/mobxjs/mobx/pull/3193) Thanks [@ChocolateLoverRaj](https://github.com/ChocolateLoverRaj)! - Make `IAtom['reportObserved']` return `boolean`

*   [`55508af6`](https://github.com/mobxjs/mobx/commit/55508af690fa875e6affaf30f34280b3f27b6126) [#3189](https://github.com/mobxjs/mobx/pull/3189) Thanks [@RvanderLaan](https://github.com/RvanderLaan)! - Fix for RangeError in ObservableArray.replace for large arrays

## 6.3.7

### Patch Changes

-   [`3a7dee6f`](https://github.com/mobxjs/mobx/commit/3a7dee6fdaddbb4b79205b054601a8020c226fcc) [#3180](https://github.com/mobxjs/mobx/pull/3180) Thanks [@kubk](https://github.com/kubk)! - Fix type inference of observe function

## 6.3.6

### Patch Changes

-   [`49468204`](https://github.com/mobxjs/mobx/commit/49468204d3bc28d15dbf383c0b7f874ca26dff30) [#3162](https://github.com/mobxjs/mobx/pull/3162) Thanks [@upsuper](https://github.com/upsuper)! - Have cancelled when reject with an error rather than a string

*   [`4afb1ec2`](https://github.com/mobxjs/mobx/commit/4afb1ec24427cf8e1f768d0c6fc49d0f44f4ab8e) [#3154](https://github.com/mobxjs/mobx/pull/3154) Thanks [@urugator](https://github.com/urugator)! - `makeObservable` throws when mixing @decorator syntax with annotations

## 6.3.5

### Patch Changes

-   [`4ac6b454`](https://github.com/mobxjs/mobx/commit/4ac6b45473c2e3b07c8e683cd395bc5edfaa8e15) [#3146](https://github.com/mobxjs/mobx/pull/3146) Thanks [@urugator](https://github.com/urugator)! - fix #3109: spy: computed shouldn't report update unless the value changed

## 6.3.4

### Patch Changes

-   [`0dbf3eb6`](https://github.com/mobxjs/mobx/commit/0dbf3eb6eecfa9cd6cd9dc7d707e8d70927e79bf) [#3141](https://github.com/mobxjs/mobx/pull/3141) Thanks [@urugator](https://github.com/urugator)! - [spy: bound actions report correct object](https://github.com/mobxjs/mobx/discussions/3140)

## 6.3.3

### Patch Changes

-   [`d78a1592`](https://github.com/mobxjs/mobx/commit/d78a15929052b96698b3355a0b4c8335750422db) [#2902](https://github.com/mobxjs/mobx/pull/2902) Thanks [@z3rog](https://github.com/z3rog)! - chore: observable use internal constants

*   [`db21d85f`](https://github.com/mobxjs/mobx/commit/db21d85fcd41c6c142998f53e722ee0a0e9b5c18) [#2998](https://github.com/mobxjs/mobx/pull/2998) Thanks [@urugator](https://github.com/urugator)! - `trace()`: log when computed becomes suspended
    `requiresReaction` warns instead of throwing

-   [`b9fa119c`](https://github.com/mobxjs/mobx/commit/b9fa119c90e23d4b327763189f24c00be2fb2c26) [#3056](https://github.com/mobxjs/mobx/pull/3056) Thanks [@upsuper](https://github.com/upsuper)! - Create WHEN_TIMEOUT error earlier to capture useful stack

*   [`99491ec2`](https://github.com/mobxjs/mobx/commit/99491ec2d315a3a01cdbe40d9a24d920a09cbd0e) [#2972](https://github.com/mobxjs/mobx/pull/2972) Thanks [@kk-gjyang](https://github.com/kk-gjyang)! - Polyfill `Object.is` for old/unsupported browsers

-   [`0d28db8a`](https://github.com/mobxjs/mobx/commit/0d28db8a0ba99f5cce744bb83b5bd88ec45a7e41) [#2927](https://github.com/mobxjs/mobx/pull/2927) Thanks [@upsuper](https://github.com/upsuper)! - Give proper typing to opts.equals of reaction

*   [`c6dc925c`](https://github.com/mobxjs/mobx/commit/c6dc925c6cf7eeff9237ee07c55927a7bbc14cb7) [#2985](https://github.com/mobxjs/mobx/pull/2985) Thanks [@fecqs](https://github.com/fecqs)! - Remove duplicate global property check

## 6.3.2

### Patch Changes

-   [`4011b378`](https://github.com/mobxjs/mobx/commit/4011b3789d57e3dab0b85a835fe2979033133ce9) [#2949](https://github.com/mobxjs/mobx/pull/2949) Thanks [@urugator](https://github.com/urugator)! - fix #2948: flow ignores `autoBind` option

## 6.3.1

### Patch Changes

-   [`d678ebd7`](https://github.com/mobxjs/mobx/commit/d678ebd7e54efb3aeae4541f87f5bcf93a623ec6) [#2944](https://github.com/mobxjs/mobx/pull/2944) Thanks [@urugator](https://github.com/urugator)! - Fix [#2941](https://github.com/mobxjs/mobx/issues/2941) - flow.bound replaces method on proto with bound function

## 6.3.0

### Minor Changes

-   [`035bf409`](https://github.com/mobxjs/mobx/commit/035bf4096dd72d296af1fc25304adaade73cc7eb) [#2906](https://github.com/mobxjs/mobx/pull/2906) Thanks [@urugator](https://github.com/urugator)! - Provide `flow.bound` annotation/decorator

### Patch Changes

-   [`3dedb4d4`](https://github.com/mobxjs/mobx/commit/3dedb4d4b5376f3991183923838da942a9a81506) [#2904](https://github.com/mobxjs/mobx/pull/2904) Thanks [@ahoisl](https://github.com/ahoisl)! - Make toJS work with computed value props

## 6.2.0

### Minor Changes

-   [`bc8db3df`](https://github.com/mobxjs/mobx/commit/bc8db3df9405034999f8feb8c95ba8045c7ae008) [#2779](https://github.com/mobxjs/mobx/pull/2779) Thanks [@urugator](https://github.com/urugator)! - In mobx5 all own properties were by default observable regardless of their value. Since mobx6 we treat functional properties as `action`s or to be precise `autoAction`s. `autoAction` provides `action`'s benefits to your functions, without the need to explicitely annotate them as `actions`.
    We think this is useful, but as a consequence, such properties are no longer `observable` and therefore non-writable and also non-enumerable. This turned out to be suprising and inconvinient to some users:
    https://github.com/mobxjs/mobx/discussions/2760
    https://github.com/mobxjs/mobx/discussions/2586
    https://github.com/mobxjs/mobx/issues/2835
    https://github.com/mobxjs/mobx/issues/2629
    https://github.com/mobxjs/mobx/issues/2551
    https://github.com/mobxjs/mobx/issues/2637
    So we decided to change it: All _own_ props _including functions_ are `observable` (enumerable, writable) as in v5, but additionally all functions that become part of deeply observable structure are by default converted to `autoAction`/`flow`.
    Note that `deep` option affects this conversion in the same way as it affects conversion of other values (object/array/map/set).

    -   by default all functions are converted to `autoAction`s/`flow`s
    -   by default all originally _own_ props are now observable and enumerable (as in pre v6)
    -   `deep: false` ignores _all_ property values (including functions that would be previously converted to `autoAction`/`flow`)
    -   by default _lone_ setters are converted to `action`s

### Patch Changes

-   [`16cab8b1`](https://github.com/mobxjs/mobx/commit/16cab8b14cf4a0d995d3f367123abfab5aed8326) [#2806](https://github.com/mobxjs/mobx/pull/2806) Thanks [@urugator](https://github.com/urugator)! - Annotations refactor - reduced code duplication

*   [`6b324edc`](https://github.com/mobxjs/mobx/commit/6b324edc69e7e9041a01e20d2e86f424046f3e25) [#2873](https://github.com/mobxjs/mobx/pull/2873) Thanks [@urugator](https://github.com/urugator)! - Fix [#2871](https://github.com/mobxjs/mobx/issues/2871): `toJS` throws with `configure({ useProxies: "ifavailable" })`

-   [`b5141883`](https://github.com/mobxjs/mobx/commit/b5141883434cba86b257d68a7badff5038c14296) [#2872](https://github.com/mobxjs/mobx/pull/2872) Thanks [@urugator](https://github.com/urugator)! - Fix [#2859](https://github.com/mobxjs/mobx/issues/2859): Trace log only if derivation is actually about to re-run

*   [`0945c265`](https://github.com/mobxjs/mobx/commit/0945c26513057457e1534a80558a3eb98487dc96) [#2840](https://github.com/mobxjs/mobx/pull/2840) Thanks [@iChenLei](https://github.com/iChenLei)! - export IComputedFactory typescript type definition

## 6.1.8

### Patch Changes

-   [`ca4914f9`](https://github.com/mobxjs/mobx/commit/ca4914f978aef427e7b2223328fd66b82e522d89) [#2836](https://github.com/mobxjs/mobx/pull/2836) Thanks [@urugator](https://github.com/urugator)! - Fix [#2832](https://github.com/mobxjs/mobx/issues/2832) - annotation cache ignores overrides

## 6.1.7

### Patch Changes

-   [`5640aa77`](https://github.com/mobxjs/mobx/commit/5640aa7794420a5fc2f99ac0819de11696d6ba71) [#2799](https://github.com/mobxjs/mobx/pull/2799) Thanks [@urugator](https://github.com/urugator)! - - fix: user provided debug names are not preserved on production
    -   fix: property atom's debug name is dynamic on production
    -   fix: `observable(primitive, options)` ignores `options`
    -   fix: `getDebugName(action)` throws `[MobX] Cannot obtain atom from undefined`
    -   [fix: terser using `unsafe: true`](https://github.com/mobxjs/mobx/issues/2751#issuecomment-778171773)

## 6.1.6

### Patch Changes

-   [`9b195b17`](https://github.com/mobxjs/mobx/commit/9b195b17bd661b9c0c4ab3a8ef323e23c2f118e4) [#2780](https://github.com/mobxjs/mobx/pull/2780) Thanks [@iChenLei](https://github.com/iChenLei)! - The overall memory usage of MobX has been reduced in production builds by skipping the generation of debug identifiers. The internal `mapid_` field of Reaction has been removed as part of the change.

## 6.1.5

### Patch Changes

-   [`3979bee3`](https://github.com/mobxjs/mobx/commit/3979bee36c82d342050978834197ea15a7ddbbf8) [#2773](https://github.com/mobxjs/mobx/pull/2773) Thanks [@urugator](https://github.com/urugator)! - Decorators optimization

*   [`7820e5ea`](https://github.com/mobxjs/mobx/commit/7820e5eae0c9dcdfa1e69cf92e0bfa209b2b478b) [#2769](https://github.com/mobxjs/mobx/pull/2769) Thanks [@iChenLei](https://github.com/iChenLei)! - add warn for extending builtins

-   [`a7c15171`](https://github.com/mobxjs/mobx/commit/a7c1517133915c2891e92a865fe5475627b6b89f) [#2775](https://github.com/mobxjs/mobx/pull/2775) Thanks [@pkit](https://github.com/pkit)! - use globalThis in global detection

*   [`5d41b646`](https://github.com/mobxjs/mobx/commit/5d41b6462cf609df869a088e353bc485846c88f8) [#2774](https://github.com/mobxjs/mobx/pull/2774) Thanks [@urugator](https://github.com/urugator)! - Fix: `makeAutoObservable` now working properly with symbolic keys
    Fix: `isComputedProp` and `getAtom` second arg type is incompatible with Symbols

## 6.1.4

### Patch Changes

-   [`0677c0e7`](https://github.com/mobxjs/mobx/commit/0677c0e788bc11ceba909bba16b2b009e90a4c97) [#2766](https://github.com/mobxjs/mobx/pull/2766) Thanks [@urugator](https://github.com/urugator)! - Fix: Inherited annotated fields are not assignable

## 6.1.3

### Patch Changes

-   [`d2a2a52e`](https://github.com/mobxjs/mobx/commit/d2a2a52e59e1cf5867bf72e49e7f134c7055ac5d) [#2763](https://github.com/mobxjs/mobx/pull/2763) Thanks [@vkrol](https://github.com/vkrol)! - Add `safeDescriptors` to `configure` options type

## 6.1.2

### Patch Changes

-   [`ca09f2f5`](https://github.com/mobxjs/mobx/commit/ca09f2f5744f438b0b6572b60e055ca8b59646de) [#2761](https://github.com/mobxjs/mobx/pull/2761) Thanks [@urugator](https://github.com/urugator)! - `configure({ safeDescriptors: false })` now forces all props of observable objects to be writable and configurable

## 6.1.1

### Patch Changes

-   [`39eca50d`](https://github.com/mobxjs/mobx/commit/39eca50de3936807037cb1205bbab29a3e328bc0) [#2757](https://github.com/mobxjs/mobx/pull/2757) Thanks [@urugator](https://github.com/urugator)! - Fix error stringification on minified build
    Fix `isObservableProp` not supporting `Symbols`
    Fix `makeAutoObservable` not ignoring `inferredAnnotationsSymbol`

## 6.1.0

This release fixes a plethora of bugs related to sub-classing and reflecting / iterating on observable objects.
The behavior of MobX is in many edge cases much more explicitly defined now.

A new annotation was introduced: `@override` / `override` to support re-defining actions and computed values(!) on sub classses.

For idiomatic MobX usage this release should have little impact, but if you are using a lot of sub-classing, reflection APIs or direct object manipulations like `defineProperty`,
this release might introduce previously unseen errors for cases that silently failed before, or even worked successfully even though the correct behavior wasn't specified earlier.

If you are migrating from MobX 4/5 we strongly recommend to go to 6.1 in one go, and skip 6.0.\*, as some buggy behavior compared to the previous majors has been corrected.

As always, our libraries come as-is and are maintained by volunteers. Upgrades are at own risk and voluntary. Bug reports require a minimal reproductions and a correctly filled out issue template.

Support the ongoing maintenance at: https://opencollective.com/mobx

### Minor Changes

[`28f8a11d`](https://github.com/mobxjs/mobx/commit/28f8a11d8b94f1aca2eec4ae9c5f45c5ea2f4362) [#2641](https://github.com/mobxjs/mobx/pull/2641) Thanks [@urugator](https://github.com/urugator)!

-   `action`, `computed`, `flow` defined on prototype can be overridden by subclass via `override` annotation/decorator. Previously broken.
-   Overriding anything defined on instance itself (`this`) is not supported and should throw. Previously partially possible or broken.
-   Attempt to re-annotate property always throws. Previously mostly undefined outcome.
-   All annotated and non-observable props (action/flow) are non-writable. Previously writable.
-   All annotated props of non-plain object are non-configurable. Previously configurable.
-   Observable object should now work more reliably in various (edge) cases.
-   Proxied objects now support `Object.defineProperty`. Previously unsupported/broken.
-   `extendObservable/makeObservable/defineProperty` notifies observers/listeners/interceptors about added props. Previously inconsistent.
-   `keys/values/entries` works like `Object.keys/values/entries`. Previously included only observables.
-   `has` works like `in`. Previously reported `true` only for existing own observable props.
-   `set` no longer transforms existing non-observable prop to observable prop, but simply sets the value.
-   `remove/delete` works with non-observable and computed props. Previously unsupported/broken.
-   Passing `options` to `observable/extendObservable/makeObservable` throws if the object is already observable . Previously passed options were mostly ignored.
-   `autoBind` option is now sticky - same as `deep` and `name` option.
-   `observable/extendObservable` now also picks non-enumerable keys (same as `make[Auto]Observable`).
-   Removed deprecated `action.bound("name")`
-   Proxied objects should be compatible with `Reflect` API. Previously throwing instead of returning booleans.

## 6.0.5

### Patch Changes

-   [`6b304232`](https://github.com/mobxjs/mobx/commit/6b30423266e5418a3f20389d0bd0eae31f3384d2) [#2644](https://github.com/mobxjs/mobx/pull/2644) Thanks [@rokoroku](https://github.com/rokoroku)! - Fix broken error reference in errors.ts

*   [`83b84fd3`](https://github.com/mobxjs/mobx/commit/83b84fd354f2253fdd8ea556e217a92fc2633c00) [#2740](https://github.com/mobxjs/mobx/pull/2740) Thanks [@iChenLei](https://github.com/iChenLei)! - Infer optional / promise `action` args type correctly

-   [`65c7b73b`](https://github.com/mobxjs/mobx/commit/65c7b73b7f0b1a69a1a2786b5f484419d129d10b) [#2717](https://github.com/mobxjs/mobx/pull/2717) Thanks [@ahoisl](https://github.com/ahoisl)! - The TypeScript type `CreateObservableOptions` is now exported.

*   [`989390d4`](https://github.com/mobxjs/mobx/commit/989390d46bbe9941b61ac6c6d1292f96445e7cc3) [#2594](https://github.com/mobxjs/mobx/pull/2594) Thanks [@urugator](https://github.com/urugator)! - Fixed [#2579](https://github.com/mobxjs/mobx/issues/2579) - `observable` does not ignore class instances

-   [`dea1cf18`](https://github.com/mobxjs/mobx/commit/dea1cf189b0f43929f4f626229d34a80bd10212e) [#2726](https://github.com/mobxjs/mobx/pull/2726) Thanks [@mweststrate](https://github.com/mweststrate)! - fix: `onBecomeObserved` was not triggered correctly for computed dependencies of computeds. Fixes #2686, #2667

*   [`592e6e99`](https://github.com/mobxjs/mobx/commit/592e6e996c2d5264e162cfb0921a071c1d815c92) [#2743](https://github.com/mobxjs/mobx/pull/2743) Thanks [@vkrol](https://github.com/vkrol)! - Remove `sideEffects` section in `mobx-react-lite` `package.json`

> 🚨🚨🚨 If you are upgrading from V4/V5, please follow [the migration guide](https://mobx.js.org/migrating-from-4-or-5.html).

## 6.0.4

### Patch Changes

-   [`79a09f49`](https://github.com/mobxjs/mobx/commit/79a09f49a9f2baddbab8d89e9a7ac07cffadf624) [#2615](https://github.com/mobxjs/mobx/pull/2615) Thanks [@urugator](https://github.com/urugator)! - Fix [#2614](https://github.com/mobxjs/mobx/issues/2614) - `makeObservable` does not respect `options.name`

## 6.0.3

### Patch Changes

-   [`d0e6778d`](https://github.com/mobxjs/mobx/commit/d0e6778de73f6dfad61283c04103049732b2aea2) - Create ESM bundles with NODE_ENV correctly replaced so it can be used in browser (#2564)

## 6.0.2

### Patch Changes

-   [`b5d64d19`](https://github.com/mobxjs/mobx/commit/b5d64d1965ecd9a593886279ddaf96eda61c4a77) [#2548](https://github.com/mobxjs/mobx/pull/2548) Thanks [@urugator](https://github.com/urugator)! - Fixed [2542](https://github.com/mobxjs/mobx/issues/2542), makeAutoObservable not respecting deep option [@urugator](https://github.com/urugator)

*   [`f4c22925`](https://github.com/mobxjs/mobx/commit/f4c229259a72f0497d3f9b6a05af9d9c4280d8b1) [#2582](https://github.com/mobxjs/mobx/pull/2582) Thanks [@tomenden](https://github.com/tomenden)! - Support running in a web-worker

## 6.0.1

-   Fixed issue in TS typings of `makeObservable` in combination with a member named `toString()`

## 6.0.0

### New features

-   [`makeObservable(target, annotations)`](../../docs/observable-state.md#makeobservable) is now the recommended way to make objects with a fixed shape observable, such as classes.
-   [`makeAutoObservable(target)`](../../docs/observable-state.md#makeautoobservable) will automatically determine the annotations used by `makeObservable`. Methods will be marked as 'autoAction', so that they can be used both from a computed value or as standalone method.
-   MobX 6 can be used in both modern environments, and environments that don't support Proxy. So both MobX 4 and 5 users can upgrade to 6. See [proxy support](../../docs/configuration.md#proxy-support) for more details.
-   `observable.array` now supports `{ proxy: false }` as option.
-   `reaction`'s effect function now receives the previous value seen by the reaction as second argument.
-   `flow` can now be used as annotation as well. You might need `flowResult` in case you use TypeScript to extract the correct result type. [details](../../docs/actions.md#using-flow-instead-of-async--await-).

### Breaking changes

#### Changes that might affect you

-   The `decorate` API has been removed, and needs to be replaced by `makeObservable` in the constructor of the targeted class. It accepts the same arguments. The `mobx-undecorate` can transform this automatically.
-   When using `extendObservable` / `observable`, fields that contained functions used to be turned into observables. This is no longer the case, they will be converted into `autoActions`.
-   [Strict mode](../../docs/configuration.md#enforceactions) for actions is now enabled by default in `observed` mode.
-   `toJS` no longer takes any options. It no longer converts Maps and Sets to plain data structures. Generic, flexible serialization of data structures is out of scope for the MobX project, and writing custom serialization methods is a much more scalable approach to serialization (tip: leverage `computed`s to define how class instances should be serialized).
-   The methods `intercept` and `observe` are no longer exposed on observable arrays, maps and boxed observables. Import them as utility from mobx instead: `import { observe, intercept } from "mobx"`, and pass the collection as first argument: `observer(collection, callback)`. Note that we still recommend to avoid these APIs.
-   `observableMap.toPOJO()`, `observableMap.toJS()` have been dropped. Use `new Map(observableMap)` instead if you want to convert an observable map to a plain Map shallowly.
-   `observableMap.toJSON()` now returns an entries array rather than a new Map, to better support serialization.
-   `observableSet.toJS()` has been dropped. Use `new Set(observableSet)` instead if you want to convert an observable Set to a plain Set shallowly.
-   `observableSet.toJSON()` now returns an array rather than a new Set, to better support serialization.
-   Sorting or reversing an observableArray in a derivation (without slicing first) will now throw rather than warn. In contrast, it is now allowed to sort or reverse observable arrays in-place, as long as it happens in an action.
-   `isArrayLike` is no longer exposed as utility. Use `Array.isArray(x) || isObservableArray(x)` instead.

#### Obscure things that don't work anymore, but that probably won't affect you

-   It is no longer possible to re-decorate a field (through either `@observable` or `makeObservable`) that is already declared in a super class.
-   `runInAction` no longer supports passing a name as first argument. Name the original function or use `action(name, fn)()` if you care about the debug name.
-   `computed(getterFn, setterFn)` no longer accepts a setter function as a second argument. Use the `set` option instead: `computed(getterFn, { set: setterFn })`.
-   In observable arrays, for `findIndex` / `find` method, the `offset` argument (the third one) is no longer supported, to be consistent with ES arrays.
-   The option `computedConfigurable` of `configure` is no longer supported as it is now the default.
-   `observableArray.toJS()` has been removed, use `observableArray.slice()` instead, which does the same.
-   Killed support for the `IGNORE_MOBX_MINIFY_WARNING` environment flag.
-   `_allowStateChangesInComputation(fn)` is no longer needed, use `runInAction(fn)` instead.
-   In `computed`, the `when` predicate (first arg), and `reaction` predicate (first arg) it is now forbidden to directly change state. State changes should be done in their effect functions, or otherwise at least wrapped in `runInAction` (only the state change, not the observables you want to track!). Note that this is still an anti-pattern.
-   The `observableArray.get()` and `observableArray.set()` methods are no longer supported.
-   The `IObservableObject` interface is no longer exported from MobX.
-   The second argument to the `reaction` effect function, the disposer object, is now passed in as third argument. The second argument is now the previous value seen by the reaction.
-   `onBecomeObserved` / `onBecomeUnobserved` will now only trigger for observables that are actually used by a reaction (see [#2309](https://github.com/mobxjs/mobx/issues/2309) for background).

### Fixes

-   [#2326](https://github.com/mobxjs/mobx/issues/2326): Incorrect `this` for array callbacks such as in `array.forEach`
-   [#2379](https://github.com/mobxjs/mobx/issues/2379): Fixed issue with `array.concat`
-   [#2309](https://github.com/mobxjs/mobx/issues/2309): Fixed several inconsistencies between keepAlive'd computed values and `on(un)BecomeObserved`
-   Fixed several inconsistencies when `on(un)BecomeObserved` was triggered for observables changed in actions without having an observer

## 5.15.7 / 4.15.7

-   Fixed [2438](https://github.com/mobxjs/mobx/issues/2438), factory types caused eslint warnings, by [@amareis](https://github.com/Amareis) through [2439](https://github.com/mobxjs/mobx/pull/2439)
-   Fixed [2432](https://github.com/mobxjs/mobx/issues/2423), array.reduce without initial value by [@urugator](https://github.com/urugator)

## 5.15.6 / 4.15.6

-   Fixed [2423](https://github.com/mobxjs/mobx/issues/2423), array methods not dehancing by [@urugator](https://github.com/urugator)
-   Fixed [2424](https://github.com/mobxjs/mobx/issues/2424) Map / Set instantiation triggering a strict warning, through [#2425](https://github.com/mobxjs/mobx/pull/2425) by [@moonball](https://github.com/moonball)

## 5.15.5 / 4.15.5

-   Fixed ObservableSet.prototype.forEach not being reactive in 4.x [#2341](https://github.com/mobxjs/mobx/pull/2341) by [@melnikov-s](https://github.com/melnikov-s)
-   Add error when computed value declared for unspecified getter [#1867](https://github.com/mobxjs/mobx/issues/1867) by [@berrunder](https://github.com/berrunder)
-   Fixed [#2326](https://github.com/mobxjs/mobx/issues/2326) correct array is passed to callbacks by [@urugator](https://github.com/urugator)
-   Fixed [#2278](https://github.com/mobxjs/mobx/issues/2278), `map.delete` should respect strict mode, by [@urugator](https://github.com/urugator)
-   Fixed [#2253](https://github.com/mobxjs/mobx/issues/2253), [#1980](https://github.com/mobxjs/mobx/issues/1980), map key order not always preserved by [@urugator](https://github.com/urugator)
-   Fixed [#2412](https://github.com/mobxjs/mobx/issues/2412), non-enumerable getters not being picked up by `extendObservable` by [@urugator](https://github.com/urugator)

-   Several performance improvements
-   Dropped `browser` fields from `package.json`

## 5.15.4 / 4.15.4

-   Fix process.env replacement in build [#2267](https://github.com/mobxjs/mobx/pull/2267) by [@fredyc](https://github.com/fredyc)

## 5.15.3 / 4.15.3

-   Define action name to be as the function name [#2262](https://github.com/mobxjs/mobx/pull/2262) by [@nadavkaner](https://github.com/nadavkaner)

## 5.15.2 / 4.15.2

-   Fixed [#2230](https://github.com/mobxjs/mobx/issue/2230) computedvalue: throw error object instead of string when options is empty [#2243](https://github.com/mobxjs/mobx/pull/2243) by [@ramkumarvenkat](https://github.com/ramkumarvenkat)
-   supports ES6 Sets and Maps in shallow comparer. [#2238](https://github.com/mobxjs/mobx/pull/2238) by [@hearnden](https://github.com/hearnden)
-   `extendObservable`: can be used existing properties again. Fixes [#2250](https://github.com/mobxjs/mobx/issue/2250) through [#2252](https://github.com/mobxjs/mobx/pull/2252) by [@davefeucht](https://github.com/davefeucht)

## 5.15.1 / 4.15.1

-   Make initial values of observable set accept readonly array [#2202](https://github.com/mobxjs/mobx/pull/2202)
-   Expose `_allowStateReadsStart` & `_allowStateReadsEnd`. This is low level stuff you shouldn't need that's mostly useful for library creators. [#2233](https://github.com/mobxjs/mobx/pull/2233)
-   Fixed an issue with `observableRequiresReaction` and updating observable during reaction [#2195](https://github.com/mobxjs/mobx/pull/2196)
-   Improved type inference for `action` [#2213](https://github.com/mobxjs/mobx/pull/2213) ([see detailed explanation](https://github.com/mobxjs/mobx/pull/2218#discussion_r349889440))

## 5.15.0

**The minimum required TypeScript version is now 3.6**

-   Fixed flow typings with Typescript v3.6. This means that version of Typescript is required when using flows.
-   Cancelled flows now reject with a `FlowCancellationError` instance whose error message is the same as in previous versions (`"FLOW_CANCELLED"`) so this is not breaking. [#2172](https://github.com/mobxjs/mobx/pull/2172) by [@vonovak](https://github.com/vonovak)
-   Fix running mobx in web worker [#2184](https://github.com/mobxjs/mobx/pull/2184/files) by [@shahata](https://github.com/shahata)
-   Fixed flow typings for Facebook's Flow. A new `CancellablePromise` Flow type is exported. [#2164](https://github.com/mobxjs/mobx/pull/2164) by [@vonovak](https://github.com/vonovak)
-   Added support for symbol keys on observable properties (MobX 5 only). [#2175](https://github.com/mobxjs/mobx/pull/2175) by [@StephenHaney](https://github.com/StephenHaney)

## 5.14.2

-   Fixed installation issue trying to run `postinstall` hook for a website [#2165](https://github.com/mobxjs/mobx/issues/2165).

## 5.14.1 / 4.14.1

-   Fixed a possible issue with action stack errors and multiple mobx versions installed at the same time [#2135](https://github.com/mobxjs/mobx/issues/2135).
-   Added `comparer.shallow` for shallow object/array comparisons [#1561](https://github.com/mobxjs/mobx/issues/1561).
-   Fixed disposing an interception within an interception throwing an error [#1950](https://github.com/mobxjs/mobx/issues/1950).

## 5.14.0 / 4.14.0

-   Added experimental `reactionRequiresObservable` & `observableRequiresReaction` config [#2079](https://github.com/mobxjs/mobx/pull/2079), [Docs](https://github.com/mobxjs/mobx/pull/2082)
-   Added experimental `requiresObservable` config to `reaction`, `autorun` & `when` options [#2079](https://github.com/mobxjs/mobx/pull/2079), [Docs](https://github.com/mobxjs/mobx/pull/2082)

## 5.13.1 / 4.13.1

-   Don't use `global` and `self` keywords unless defined. Fixes [#2070](https://github.com/mobxjs/mobx/issues/2070).
-   onBecome(Un)Observed didn't trigger when using number as key of observable map. Fixes [#2067](https://github.com/mobxjs/mobx/issues/2067).
-   Exposed `_startAction` and `_endAction` to be able to start and action and finish it without needing a code block. This is low level stuff you shouldn't need that's mostly useful for library creators.

## 5.13.0 / 4.13.0

-   Fixed potential memory leak in observable maps, when non-primitive values are used as keys. Fixes [#2031](https://github.com/mobxjs/mobx/issues/2031) through [#2032](https://github.com/mobxjs/mobx/pull/2032).
-   Added support to store additional non-observable(!) fields (string or symbol based) on array, to better reflect behavior of MobX 4. Fixes [#2044](https://github.com/mobxjs/mobx/issues/2044) through [#2046](https://github.com/mobxjs/mobx/pull/2046)

## 5.11.0 / 4.12.0

-   Added `computedConfigurable` config [#2011](https://github.com/mobxjs/mobx/pull/2011), [#2013](https://github.com/mobxjs/mobx/pull/2014)

## 4.11.0

**BREAKING CHANGE**

Reverted the support of Symbols in general in MobX 4, as it gives to many potential build errors and increases the system requirements for MobX 4 (which was an oversight in 4.10.0). Apologies for the breaking change (lack of new major version numbers). If lock files are properly used however, no harm should be caused by this change.

-   Reverted `Symbol` support in observable maps and objects. Reverts [#1944](https://github.com/mobxjs/mobx/pull/1944) through [#1988](https://github.com/mobxjs/mobx/pull/1988). Fixes [#1986](https://github.com/mobxjs/mobx/issues/1986), [#1987](https://github.com/mobxjs/mobx/issues/1987)

## 5.10.1

-   Fixed a recent regression where array update events would send undefined as `change.object` through [#1985](https://github.com/mobxjs/mobx/pull/1985) by [xaviergonz](https://github.com/xaviergonz)

## 5.10.0 / 4.10.0

-   Added support for symbol named properties in maps and objects. Fixes [#1809](https://github.com/mobxjs/mobx/issues/1809) and [#1925](https://github.com/mobxjs/mobx/issues/1925) through [#1944](https://github.com/mobxjs/mobx/pull/1944) by [@loklaan](https://github.com/loklaan)
-   Added `set` support for `observable.set`, see [#1945](https://github.com/mobxjs/mobx/pull/1945) by [xaviergonz](https://github.com/xaviergonz)
-   Fixed events for arrays using the wrong object, [#1964](https://github.com/mobxjs/mobx/pull/1964) by [xaviergonz](https://github.com/xaviergonz)
-   Improved flow typings [#1960](https://github.com/mobxjs/mobx/pull/1960) by [@tbezman](https://github.com/tbezman)
-   Updated tooling, [#1949](https://github.com/mobxjs/mobx/pull/1949) and [#1931](https://github.com/mobxjs/mobx/pull/1931) by [xaviergonz](https://github.com/xaviergonz)

## 5.9.4 / 4.9.4

-   Allow symbol keys in `ObservableMap`, see [#1930](https://github.com/mobxjs/mobx/pull/1930) by [pimterry](https://github.com/pimterry)
-   Fixed type definitions of `toStringTag` for Maps and Sets, see [#1929](https://github.com/mobxjs/mobx/pull/1929) by [lennerd](https://github.com/lennerd)

## 4.9.3

-   Fixed `observable.set` compatibility with IE 11, see [#1917](https://github.com/mobxjs/mobx/pull/1917) by [kalmi](https://github.com/kalmi)

## 4.9.2

-   Fixed regression [#1878](https://github.com/mobxjs/mobx/issues/1878), accidental use of `Symbol` breaking Internet Explorer / React Native compatibility.

## 4.9.1

-   Fixed regression in `toJS`: observable maps were not properly serialized. Fixes [#1875](https://github.com/mobxjs/mobx/issues/1875)

## 5.9.0 / 4.9.0

**Features**

-   Introduced support for observable sets! Through [#1592](https://github.com/mobxjs/mobx/pull/1592) by [@newraina](https://github.com/newraina)
-   `observable.box` now accepts an `equals` option, to be able to pass a custom comparision function. Through [#1862](https://github.com/mobxjs/mobx/pull/1862), [#1874](https://github.com/mobxjs/mobx/pull/1874) by [@fi3ework](https://github.com/fi3ework). Fixes [#1580](https://github.com/mobxjs/mobx/issues/1580)
-   Improved logging of reactions; if an action throws an exception, errors in reactions that react to that are only logged as warnings. Fixes [#1836](https://github.com/mobxjs/mobx/issues/1836)

**Fixes**

-   Improved typings for `flow`, see [#1827](https://github.com/mobxjs/mobx/pull/1827) by [@xaviergonz](https://github.com/xaviergonz)
-   Don't allow subclassing map, fixes [#1858](https://github.com/mobxjs/mobx/issues/1858)
-   Fixed `trace(true)` not being able to handle multi-line comments in traced function. Fixes [#1850](https://github.com/mobxjs/mobx/issues/1850)
-   `@computed` now introduces non-configurable properties, to fail fast on incorrect inheritance or property deletion. Fixes [#1867](https://github.com/mobxjs/mobx/issues/1867)
-   The options `enforceActions` and `isolateGlobalState` now work correctly when used together. Fixes [#1869](https://github.com/mobxjs/mobx/issues/1869)

## 5.8.0 / 4.8.0

-   MobX now requires TypeScript 3 (this was already the case in 5.7.0, but in this version the difference is actually noticeable in the typings).
-   Fixed array dehancer sometimes skipping. Fixes [#1839](https://github.com/mobxjs/mobx/issues/1839) through [#1841](https://github.com/mobxjs/mobx/pull/1841) by [k-g-a](https://github.com/k-g-a)
-   Fixed issue where webpack 4 wouldn't use the ESM module [#1834](https://github.com/mobxjs/mobx/pull/1834) by [mrtnbroder](https://github.com/mrtnbroder)
-   Improved type inference for `flow` in TypeScript 3. Fixes [#1816](https://github.com/mobxjs/mobx/issue/1816) through [#1825](https://github.com/mobxjs/mobx/pull/1825) by [ismailhabib](https://github.com/ismailhabib)
-   Introduced support for global environment variable `IGNORE_MOBX_MINIFIY_WARNING=true` to skip the built-in minification warning. See [#1835](https://github.com/mobxjs/mobx/pull/1835) by [fi3ework](https://github.com/fi3ework)
-   Fixed onBecome(Un)Observed dispoer cleanup. Fixes [#1537](https://github.com/mobxjs/mobx/issues/1537) through [#1833](https://github.com/mobxjs/mobx/pull/1833) by [fi3ework](https://github.com/fi3ework)

## 5.7.1 / 4.7.1

-   Fixed [#1839](https://github.com/mobxjs/mobx/issues/1839), ObservableArrayAdministration.dehanceValues does not dehance last value.

## 5.7.0 / 4.7.0

-   Upgraded typings to TypeScript 3
-   Fixed [#1742](https://github.com/mobxjs/mobx/issues/1742), change detection fails when multiple mobx instances were active.
-   Fixed [#1624](https://github.com/mobxjs/mobx/issues/1624), use built-in flow types for iterators
-   Fixed [#1777](https://github.com/mobxjs/mobx/issues/1777) through [#1826](https://github.com/mobxjs/mobx/pull/1826), stack overflow exception, in development mode, when using `@computed` on a React component. The MobX 5 behavior here has been reverted to the MobX 4 behavior.

## 5.6.0 / 4.6.0

-   `keepAlive` has become smarter and won't recomputed computed values that are kept alive, as long as they aren't read. Implements [#1534](https://github.com/mobxjs/mobx/issues/1534)
-   Fixed [#1796](https://github.com/mobxjs/mobx/issues/1796), undeleting a property that had an initial value of `undefined` was undetected
-   Improved Flow typings, see [#1794](https://github.com/mobxjs/mobx/pull/1794) and [#1786](https://github.com/mobxjs/mobx/pull/1786)

## 5.5.2 / 4.5.2

-   Fixed bug in `toJS` not handling `null` values correctly. Fixes [#1557](https://github.com/mobxjs/mobx/issues/1557) through [#1783](https://github.com/mobxjs/mobx/pull/1783) by [@wangyiz4262](https://github.com/wangyiz4262)

## 5.5.1 / 4.5.1

-   `toJS` now has a `recurseEverything` everything option, that even detects and converts observable objects that are "behind" non-observable objects. See [#1699](https://github.com/mobxjs/mobx/pull/1699) by [wangyiz4262](https://github.com/wangyiz4262)
-   Added flow typings form `comparer`, see [#1751](https://github.com/mobxjs/mobx/pull/1752) by [pdong](https://github.com/pdong)
-   Update flow typings for configuration options, [#1772](https://github.com/mobxjs/mobx/pull/1772) by [alexandersorokin](https://github.com/alexandersorokin)

## 5.5.0 / 4.5.0

(Minor version of `5` was bumped significantly to make the number better correlate together :-))

-   Fixed [#1740](https://github.com/mobxjs/mobx/issues/1740): combining decorators and `extendObservable` in a class constructor caused errors to be thrown
-   Fixed [#1739](https://github.com/mobxjs/mobx/issues/1740):
    -   Proxies: `delete`-ing a property was not always picked up by the reactivity system
    -   Non-proxies: `remove()`-ing a property was not always picked up by the `has()` and `get()` utilities
    -   `has` now returns `true` for computed fields
    -   `get` now returns a value for computed fields
-   Introduced `_allowStateChangeInsideComputed`. Don't use it :-).
-   MobX is now transpiled using babel 7

## 5.1.2 / 4.4.2

-   Fixed [#1650](https://github.com/mobxjs/mobx/issues/1650), decorating fields with the name `toString` does not behave correctly.

## 5.1.1 / 4.4.1

-   Improved typings of `decorate`, see [#1711](https://github.com/mobxjs/mobx/pull/1711) by [makepost](https://github.com/makepost)

## 5.1.0 / 4.4.0

-   Improved handling of multiple MobX instances. MobX will no longer complain about being loaded multiple times (one should still prevent it though, to prevent blowing up bundle size!), but merge internal state by default. If multiple MobX versions need to be loaded, call `configure({ isolateGlobalState: true })`. Note that this means that observables from the different MobX instances won't cooperate. Fixes [#1681](https://github.com/mobxjs/mobx/issues/1681), [#1082](https://github.com/mobxjs/mobx/issues/1082)
-   `enforceActions` options now supports the values: `"never"`, `"observed"` and `"always"` to make the behavior more clear. Fixes [#1680](https://github.com/mobxjs/mobx/issues/1680), [#1473](https://github.com/mobxjs/mobx/issues/1473)

## 5.0.5

-   Fixed [#1667](https://github.com/mobxjs/mobx/issues/1667): creating a large array could result in undefined items (MobX 4.\* was not affected)

## 4.3.2 / 5.0.4

-   Fixed [#1685](https://github.com/mobxjs/mobx/issues/1685): expose `IAutorunOptions`
-   `decorate` now can apply multiple decorators, by accepting an array and applying them right to left: `decorate(Todo, { title: [serializable(primitive), persist('object'), observable] })`. By [@ramybenaroya](https://github.com/ramybenaroya) through [#1691](https://github.com/mobxjs/mobx/pull/1691) and [#1686](https://github.com/mobxjs/mobx/pull/1686)
-   Improved typings of `flow` so that it accepts async generators. By [@dannsam](https://github.com/dannsam) through [#1656](https://github.com/mobxjs/mobx/pull/1656) and [#1655](https://github.com/mobxjs/mobx/pull/1655)
-   `keys()` now also supports arrays. Fixes [#1600](https://github.com/mobxjs/mobx/pull/1600) through [#1601](https://github.com/mobxjs/mobx/pull/1601) by [@nunocastromartins](https://github.com/nunocastromartins)

## 5.0.3

-   Fixed issue where it was no longer possible to define custom properties on observable arrays

## 5.0.2

-   Fixed issue where iterators where not compiled to ES5, breaking the ES5 based builds.

## 5.0.1 (Unpublished)

-   Fixed regression bug: `ObservableMap.size` was no longer observable. Fixes [#1583](https://github.com/mobxjs/mobx/issues/1583)
-   Downgraded lib export from ES6 to ES5. To many build tools still trip over ES6. Fixes [#1584](https://github.com/mobxjs/mobx/issues/1584). A modern build is available through `import ... from "mobx/lib/mobx.es6"` (or setup an alias in your build system)
-   Added support for mobx-react-devtools

## 5.0.0

[Release blogpost](https://medium.com/p/4852bce05572/)

### Proxy support!

MobX 5 is the first MobX version fully leveraging Proxies. This has two big advantages

1. MobX can now detect the addition of properties on plain observable objects, so it is now possible to use plain observable objects as dynamic collections.
2. Observable arrays are now recognized as arrays by all third party libraries, which will avoid the need to slice them.

### The system requirements to run MobX has been upped

-   MobX 5 can only be used on environments that support `Proxies`. See the [browser support](https://github.com/mobxjs/mobx#browser-support) for details.
-   Since MobX no longer runs on older browsers, the compilation target has been upgraded to ES2015 syntax supporting browsers. This means that MobX is not loadable on older browsers without down compilation to ES5.
-   If for whatever reason your project cannot meet this requirements, please stick to MobX 4. It will be actively maintained. All current features of MobX 5 are expressable in MobX 4 as well, but it means that for example to use dynamic objects some [additional APIs](https://mobx.js.org/refguide/object-api.html) are needed.
-   The performance footprint of MobX 5 should be pretty similar to MobX 4. In our performance tests we saw some minor improvements in memory footprint, but overall it should be pretty comparable.

### Breaking changes

-   The required runtime needs to support the non-polyfillable `Proxy` API.
-   The minimum runtime target is now ES2015, not ES5
-   `spy` has become a no-op in production builds
-   All earlier deprecated APIs are dropped. Make sure to not have any deprecation warnings before upgrading.
-   `array.move` and `array.peek` are removed from the API
-   Dropped the third argument to `array.find` and `array.findIndex` since they were not standardized in ES.
-   `.$mobx` property has been dropped from all observables and replaced by a Symbol. Instead of using `x.$mobx.name`, use `import { $mobx } from "mobx"; x[$mobx].name` etc.
-   In some cases, the order in which autoruns are fired could have changed due to some internal optimizations (note that MobX never had a guarantee about the order in which autoruns fired!)

### New features

-   It is possible to pass the `proxy: false` argument to `observable.object` to disable proxying (theoretically slightly faster, but removes no dynamic key addition)

### Known Issues

-   Observable objects can no longer be frozen (otherwise they would become un-observable😎). If you are actually trying to do so MobX will now throw an exception like: `[mobx] Dynamic observable objects cannot be frozen]`. A place where that might happen unexpectedly is when passing an observable object as `style` property to a React component. Like `<span style={someObservableObject} />`, since React will freeze all style objects. The work-around is to simply pass a fresh, non-observable object for styling like: `<span style={{...someObservableObject}} />`.
-   ~~If you are using `mobx` with `mobx-react`, and you are upgrading `mobx-react` to the MobX 5 compatible version (`mobx-react@5.2.0`) you will notice that `this.props` or `this.state` are not yet observable in the `constructor` or `componentWillMount`. This is for forward compatibility with React 16.3 where `componentWillMount` has been deprecated. In most cases using `componentDidMount` instead will suffice, especially when the goal is to setup reactions. For more info see [#478](https://github.com/mobxjs/mobx-react/issues/478).~~ Fixed in mobx-react 5.2.1. But note that you should still migrate away from `componentWillMount`😎.
-   Jest `toEqual` might throw an error `allKeys[x].match is not a function` when trying to equal observable arrays. This is a bug in Jest [report](https://github.com/facebook/jest/issues/6398). The simple work around for now is to slice (or `toJS` if the problem is recursive) the array first.
-   Jest `toEqual` matcher might no longer correctly equal your class instances, complaining about differences in the MobX adminstration. This is due to a bug with the processing of symbols: [report](https://github.com/facebook/jest/issues/6392). For now you might want to use a custom matcher if you are directly equalling observable objects. As a work around `toJS(object)` could be used before diffing.

_Note June 7th, 2018:_ Both issues are already in Jest master and should be released soon.

### Migration guide

-   Make sure to not use any API that produces deprecation warnings in MobX 4. Beyond that MobX 5 should pretty well as drop-in replacement of MobX 4.
-   You _could_ perform the following clean ups:
    -   Don't `slice()` arrays when passing them to external libraries. (Note you still shouldn't pass observable data structures to non-`observer` React components, which is an orthogonal concept)
    -   You could replace observable maps with observable objects if you are only using string-based keys.
-   Don't call the `reverse` or `sort` operations directly on observableArray's anymore, as it's behavior slightly differed from the built-in implementations of those methods. Instead use `observableArray.slice().sort()` to perform the sort on a copy. This gives no additional performance overhead compared to MobX 4. (The reason behind this is that built-in `sort` updates the array in place, but the observable array implementation always performed the sort on a defensive copy, and this change makes that explicit).
-   you may remove usages of `isArrayLike()` since `Array.isArray()` will now return true for observable arrays

### API's that have been dropped

-   The `arrayBuffer` setting is no longer supported by `configure` (it has become irrelevant)
-   `observable.shallowBox`, `observable.shallowArray`, `observable.shallowMap`, `observable.shallowObject`, `extendShallowObservable` api's have been removed. Instead, pass `{ deep: false }` to their non-shallow counter parts.
-   `observableArray.peek`, `observableArray.move`

## 4.3.1

-   Fixed [#1534](Fixes https://github.com/mobxjs/mobx/issues/1534): @computed({keepAlive: true}) no long calculates before being accessed.
-   Added the `$mobx` export symbol for MobX 5 forward compatibity

## 4.3.0

-   Introduced the `entries(observable)` API, by @samjacobclift through [#1536](https://github.com/mobxjs/mobx/pull/1536)
-   Fixed [#1535](https://github.com/mobxjs/mobx/issues/1535): Change in nested computed value was not propagated if read outside action context when there is a pending reaction. For more details see the exact test case.
-   Illegal property access through prototypes is now a warning instead of an error. Fixes [#1506](https://github.com/mobxjs/mobx/issues/1506). By @AmazingTurtle through [#1529](https://github.com/mobxjs/mobx/pull/1529)
-   Fixed issue where providing a custom setter to `@computed({ set: ... })` wasn't picked up
-   Fixed #1545: Actions properties where not re-assignable when using TypeScript
-   Illegal Access checks are now a warning instead of an error. Fix

## 4.2.1

-   Fixed flow typings for `mobx.configure` [#1521](https://github.com/mobxjs/mobx/pull/1521) by @andrew--r
-   Improved typings for `mobx.flow`, fixes [#1527](https://github.com/mobxjs/mobx/issues/1527)
-   Throw error when using `@observable` in combination with a getter. [#1511](https://github.com/mobxjs/mobx/pull/1511) by @quanganhtran
-   `toJS` now uses Map internally, for faster detection of cycles. [#1517](https://github.com/mobxjs/mobx/pull/1517) by @loatheb
-   Fixed [#1512](https://github.com/mobxjs/mobx/issues/1512): `observe` hooks not being triggered when using `mobx.set`, Fixed in [#1514](https://github.com/mobxjs/mobx/pull/1514) by @quanganhtran
-   Several minor improvements, additional tests and doc improvements.

## 4.2.0

-   Introduced `configure({ enforceActions: "strict" })`, which is more strict then `enforceActions: true`, as it will also throw on non-observed changes to observables. See also [#1473](https://github.com/mobxjs/mobx/issues/1473)
-   Fixed [#1480](https://github.com/mobxjs/mobx/issues/1480): Exceptions in the effect handler of `reaction` where not properly picked up by the global reaction system
-   Fixed a bug where computed values updated their cached value, even when the comparer considered the new value equal to the previous one. Thanks @kuitos for finding this and fixing it! [#1499](https://github.com/mobxjs/mobx/pull/1499)
-   Undeprecated `ObservableMap`, fixes [#1496](https://github.com/mobxjs/mobx/issues/1496)
-   Observable arrays now support `Symbol.toStringTag` (if available / polyfilled). This allows libraries like Ramda to detect automatically that observable arrays are arrays. Fixes [#1490](https://github.com/mobxjs/mobx/issues/1490). Note that `Array.isArray` will keep returning false for the entire MobX 4 range.
-   Actions are now always `configurable` and `writable`, like in MobX 3. Fixes [#1477](https://github.com/mobxjs/mobx/issues/1477)
-   Merged several improvements to the flow typings. [#1501](https://github.com/mobxjs/mobx/pull/1501) by @quanganhtran
-   Fixed several accidental usages of the global `fail`, by @mtaran-google through [#1483](https://github.com/mobxjs/mobx/pull/1483) and [#1482](https://github.com/mobxjs/mobx/pull/1482)

## 4.1.1

-   Import `default` from MobX will no longer throw, but only warn instead. This fixes some issues with tools that reflect on the `default` export of a module
-   Disposing a spy listener inside a spy handler no longer causes an exception. Fixes [#1459](https://github.com/mobxjs/mobx/issues/1459) through [#1460](https://github.com/mobxjs/mobx/pull/1460) by [farwayer](https://github.com/farwayer)
-   Added a missing `runInAction` overload in the flow typings. [#1451](https://github.com/mobxjs/mobx/pull/1451) by [AMilassin](https://github.com/mobxjs/mobx/issues?q=is%3Apr+author%3AAMilassin)
-   Improved the typings of `decorate`. See [#1450](https://github.com/mobxjs/mobx/pull/1450) by [makepost](https://github.com/mobxjs/mobx/issues?q=is%3Apr+author%3Amakepost)

## 4.1.0

-   Introduced `keepAlive` as option to `computed`
-   All observable api's now default to `any` for their generic arguments
-   Improved `flow` cancellation
-   The effect of `when` is now automatically an action.
-   `@computed` properties are now declared on their owner rather then the protoptype. Fixes an issue where `@computed` fields didn't work in React Native on proxied objects. See [#1396](https://github.com/mobxjs/mobx/issues/1396)
-   `action` and `action.bound` decorated fields are now reassignable, so that they can be stubbed

## 4.0.2

-   Fixed issue where exceptions like `TypeError: Cannot define property:__mobxDidRunLazyInitializers, object is not extensible.` were thrown. Fixes [#1404](https://github.com/mobxjs/mobx/issues/1404)
-   Improved flow typings for `flow`, [#1399](https://github.com/mobxjs/mobx/pull/1399) by @ismailhabib

## 4.0.1

-   Updated flow typings, see [#1393](https://github.com/mobxjs/mobx/pull/1393) by [andrew--r](https://github.com/andrew--r)

## 4.0.0

-   For the highlights of this release, read the [blog](https://medium.com/p/c1fbc08008da/):
-   For migration notes: see the [wiki page](https://github.com/mobxjs/mobx/wiki/Migrating-from-mobx-3-to-mobx-4)
-   Note; many things that were removed to make the api surface smaller. If you think some feature shouldn't have been removed, feel free to open an issue!

This is the extensive list of all changes.

### New features

The changes mentioned here are discussed in detail in the [release highlights](https://medium.com/p/c1fbc08008da/), or were simply updated in the docs.

-   MobX 4 introduces separation between the production and non production build. The production build strips most typechecks, resulting in a faster and smaller build. Make sure to substitute process.env.NODE_ENV = "production" in your build process! If you are using MobX in a react project, you most probably already have set this up. Otherwise, the idea is explained [here](https://reactjs.org/docs/add-react-to-an-existing-app.html).
-   Introduced `flow` to create a chain of async actions. This is the same function as [`asyncActions`](https://github.com/mobxjs/mobx-utils#asyncaction) of the mobx-utils package
-   These `flow`'s are now cancellable, by calling `.cancel()` on the returned promise, which will throw a cancellation exception into the generator function.
-   `flow` also has experimental support for async iterators (`async * function`)
-   Introduced `decorate(thing, decorators)` to decorate classes or object without needing decorator syntax.
-   Introduced `onBecomeObserved` and `onBecomeUnobserved`. These API's enable hooking into the observability system and get notified about when an observable starts / stops becoming used. This is great to automaticaly fetch data from external resources, or stop doing so.
-   `computed` / `@computed` now accepts a `requiresReaction` option. If it set, the computed value will throw an exception if it is being read while not being tracked by some reaction.
-   To make `requiresReaction` the default, use `mobx.configure({ computedRequiresReaction: true })`
-   Introduced `mobx.configure({ disableErrorBoundaries })`, for easier debugging of exceptoins. By [NaridaL](https://github.com/NaridaL) through [#1262](https://github.com/mobxjs/mobx/pull/1262)
-   `toJS` now accepts the options: `{ detectCycles?: boolean, exportMapsAsObjects?: boolean }`, both `true` by default
-   Observable maps are now backed by real ES6 Maps. This means that any value can be used as key now, not just strings and numbers.
-   The flow typings have been updated. Since this is a manual effort, there can be mistakes, so feel free to PR!

-   `computed(fn, options?)` / `@computed(options) get fn()` now accept the following options:

    -   `set: (value) => void` to set a custom setter on the computed property
    -   `name: "debug name"`
    -   `equals: fn` the equality value to use for the computed to determine whether its output has changed. The default is `comparer.default`. Alternatives are `comparer.structural`, `comparer.identity` or just your own comparison function.
    -   `requiresReaction: boolean` see above.

-   `autorun(fn, options?)` now accepts the following options:

    -   `delay: number` debounce the autorun with the given amount of milliseconds. This replaces the MobX 3 api `autorunAsync`
    -   `name: "debug name"`
    -   `scheduler: function` a custom scheduler to run the autorun. For example to connect running the autorun to `requestAnimationFrame`. See the docs for more details
    -   `onError`. A custom error handler to be notified when an autorun throws an exception.

-   `reaction(expr, effect, options?)` now accepts the following options:

    -   `delay: number` debounce the autorun with the given amount of milliseconds. This replaces the MobX 3 api `autorunAsync`
    -   `fireImmediately`. Immediately fire the effect function after the first evaluation of `expr`
    -   `equals`. Custom equality function to determine whether the `expr` function differed from its previous result, and hence should fire `effect`. Accepts the same options as the `equals` option of computed.
    -   All the options `autorun` accepts

-   `when(predicate, effect?, options?)` now accepts the following options:
    -   `name: "debug name"`
    -   `onError`. A custom error handler to be notified when an autorun throws an exception.
    -   `timeout: number` a timeout in milliseconds, after which the `onError` handler will be triggered to signal the condition not being met within a certain time
-   The `effect` parameter of `when` has become optional. If it is omitted, `when` will return a promise. This makes it easy to `await` a condition, for example: `await when(() => user.profile.loaded)`. The returned promise can be cancelled using `promise.cancel()`

-   There is now an utility API that enables manipulating observable maps, objects and arrays with the same api. These api's are fully reactive, which means that even new property declarations can be detected by mobx if `set` is used to add them, and `values` or `keys` to iterate them.

    -   `values(thing)` returns all values in the collection as array
    -   `keys(thing)` returns all keys in the collection as array
    -   `set(thing, key, value)` or `set(thing, { key: value })` Updates the given collection with the provided key / value pair(s).
    -   `remove(thing, key)` removes the specified child from the collection. For arrays splicing is used.
    -   `has(thing, key)` returns true if the collection has the specified _observable_ property.
    -   `get(thing, key)` returns the chlid under the specified key.

-   `observable`, `observable.array`, `observable.object`, `observable.map` and `extendObservable` now accept an additional options object, which can specify the following attributes:
    -   `name: "debug name"`
    -   `deep: boolean`. `true` by default, indicates whether the children of this collection are automatically converted into observables as well.
    -   `defaultDecorator: <decorator>` specifies the default decorator used for new children / properties, by default: `observable.deep`, but could be changed to `observable.ref`, `observable.struct` etc. (The `deep` property is just a short-hand for switching between `observable.deep` or `observable.ref` as default decorator for new properties)

### Breaking changes

The changes mentioned here are discussed in detail in the [migration notes](https://github.com/mobxjs/mobx/wiki/Migrating-from-mobx-3-to-mobx-4)

-   MobX 4 requires `Map` to be globally available. Polyfill it if targeting IE < 11 or other older browsers.
-   For typescript users, MobX now requires `Map` and several `Symbol`s to exist for its typings. So make sure that the `lib` configuration of your project is set to `"es6"`. (The compilation target can still be `"es5"`)
-   `observable.shallowArray(values)` has been removed, instead use `observable.array(values, { deep: false })`
-   `observable.shallowMap(values)` has been removed, instead use `observable.map(values, { deep: false })`
-   `observable.shallowObject(values)` has been removed, instead use `observable.object(values, {}, { deep: false })`
-   `extendShallowObservable(target, props)`, instead use `extendObservable(target, props, {}, { deep: false })`
-   The decorators `observable.ref`, `observable.shallow`, `observable.deep`, `observable.struct` can no longer be used as functions. Instead, they should be passed as part of the `decorators` param to resp. `observable.object` and `extendObservable`
-   The new signature of `extendObservable` is `extendObservable(target, props, decorators?, options?)`. This also means it is no longer possible to pass multiple bags of properties to `extendObservable`. ~~`extendObservable` can no longer be used to re-declare properties. Use `set` instead to update existing properties (or introduce new ones).~~ Update 13-01-2020: the latter limitation has been reverted in MobX 4.15.2 / 5.15.2
-   Iterating maps now follows the spec, that is, `map.values()`, `map.entries()`, `map.keys()`, `map[@@iterator]()` and `array[@@iterator]()` no longer return an array, but an iterator. Use `mobx.values(map)` or `Array.from(map)` to convert the iterators to arrays.
-   dropped `@computed.equals`, instead, you can now use `@computed({ equals: ... })`
-   `useStrict(boolean)` was dropped, use `configure({ enforceActions: boolean })` instead
-   `isolateGlobalState` was dropped, use `configure({ isolateGlobalState: true})` instead
-   If there are multiple mobx instances active in a single project, an exception will be thrown. Previously only a warning was printed. Fixes #1098. For details, see [#1082](https://github.com/mobxjs/mobx/issues/1082).
-   Dropped the `shareGlobalState` feature. Instead, projects should be setup properly and it is up to the hosting package to make sure that there is only one MobX instance
-   `expr` has been moved to mobx-utils. Remember, `expr(fn)` is just `computed(fn).get()`
-   `createTransformer` has been moved to mobx-utils
-   Passing `context` explicitly to `autorun`, `reaction` etc is no longer supported. Use arrow functions or function.bind instead.
-   Removed `autorunAsync`. Use the `delay` option of `autorun` instead.
-   `autorun`, `when`, `reaction` don't support name as first argument anymore, instead pass the `name` option.
-   The `extras.` namespace has been dropped to enable tree-shaking non-used MobX features. All methods that where there originally are now exported at top level. If they are part of the official public API (you are encouraged to use them) they are exported as is. If they are experimental or somehow internal (you are discouraged to use them), they are prefixed with `_`.
-   Dropped bower support. Fixes #1263
-   The `spyReportStart`, `spyReportEnd`, `spyReport` and `isSpyEnabled` are no longer public. It is no longer possible to emit custom spy events as to avoid confusing in listeners what the possible set of events is.
-   Dropped `isStrictModeEnabled`
-   `observable(value)` will only succeed if it can turn the value into an observable data structure (a Map, Array or observable object). But it will no longer create an observable box for other values to avoid confusion. Call `observable.box(value)` explictly in such cases.
-   `isComputed` and `isObservable` no longer accept a property as second argument. Instead use `isComputedProp` and `isObservableProp`.
-   Removed `whyRun`, use `trace` instead
-   The spy event signature has slightly changed
-   The `Atom` class is no longer exposed. Use `createAtom` instead (same signature).
-   Calling reportObserved() on a self made atom will no longer trigger the hooks if reportObserved is triggered outside a reactive context.
-   The options `struct` and `compareStructural` for computed values are deprecated, use `@computed.struct` or `computed({ equals: comparer.structural})` instead.
-   `isModifierDescriptor` is no longer exposed.
-   `deepEqual` is no longer exposed, use `comparer.structural` instead.
-   `setReactionScheduler` -> `configure({ reactionScheduler: fn })`
-   `reserveArrayBuffer` -> `configure({ reactionErrorHandler: fn })`
-   `ObservableMap` is no longer exposed as constructor, use `observable.map` or `isObservableMap` instead
-   `map` -> `observable.map`
-   `runInAction` no longer accepts a custom scope
-   Dropped the already deprecated and broken `default` export that made it harder to tree-shake mobx. Make sure to always use `import { x } from "mobx"` and not `import mobx from "mobx"`.
-   Killed the already deprecated modifiers `asFlat` etc. If you war still using this, see the MobX 2 -> 3 migration notes.
-   Observable maps now fully implement the map interface. See [#1361](https://github.com/mobxjs/mobx/pull/1361) by [Marc Fallows](https://github.com/marcfallows)
-   Observable arrays will no longer expose the `.move` method
-   Dropped the `observable.deep.struct` modifier
-   Dropped the `observable.ref.struct` modifier
-   `observable.struct` now behaves like `observable.ref.struct` (this used to be `observable.deep.struct`). That is; values in an `observable.struct` field will be stored as is, but structural comparison will be used when assigning a new value
-   IReactionDisposer.onError has been removed, use the `onError` option of reactions instead

### Issues fixed in this release:

The issues are incoprorated in the above notes.

-   [#1316](https://github.com/mobxjs/mobx/issues/1316) - Improve `observable` api
-   [#992](https://github.com/mobxjs/mobx/issues/992) - `onBecomeObserved` & `onBecomeUnobserved`
-   [#1301](https://github.com/mobxjs/mobx/issues/1301) - Set `onError` handler when creating reactions
-   [#817](https://github.com/mobxjs/mobx/issues/817) - Improve typings of `observe`
-   [#800](https://github.com/mobxjs/mobx/issues/800) - Use `Map` as backend implementation of observable maps
-   [#1361](https://github.com/mobxjs/mobx/issues/1361) - Make observableMaps structurally correct maps
-   [#813](https://github.com/mobxjs/mobx/issues/813) - Create separate dev and production builds
-   [#961](https://github.com/mobxjs/mobx/issues/961), [#1197](https://github.com/mobxjs/mobx/issues/1197) - Make it possible to forbid reading an untracked computed value
-   [#1098](https://github.com/mobxjs/mobx/issues/1098) - Throw instead of warn if multiple MobX instances are active
-   [#1122](https://github.com/mobxjs/mobx/issues/1122) - Atom hooks fired to often for observable maps
-   [#1148](https://github.com/mobxjs/mobx/issues/1148) - Disposer of reactions should also cancel all scheduled effects
-   [#1241](https://github.com/mobxjs/mobx/issues/1241) - Make it possible to disable error boundaries, to make it easier to find exceptions
-   [#1263](https://github.com/mobxjs/mobx/issues/1263) - Remove bower.json

## 3.6.2

-   Fixed accidental dependency on the `node` typings. Fixes [#1387](https://github.com/mobxjs/mobx/issues/1387) / [#1362](https://github.com/mobxjs/mobx/issues/1387)

## 3.6.1

-   Fixed [#1358](https://github.com/mobxjs/mobx/pull/1359): Deep comparison failing on IE11. By [le0nik](https://github.com/le0nik) through [#1359](https://github.com/mobxjs/mobx/pull/1359)

## 3.6.0

-   Fixed [#1118](https://github.com/mobxjs/mobx/issues/1118), the deepEquals operator build into mobx gave wrong results for non-primitive objects. This affected for example `computed.struct`, or the `compareStructural` of `reaction`

## 3.5.0/1

-   Introduced `trace` for easier debugging of reactions / computed values. See the [docs](https://mobx.js.org/best/trace.html) for details.
-   Improved typings of `observableArray.find`, see [#1324](https://github.com/mobxjs/mobx/pull/1324) for details.

## 3.4.1

-   Republished 3.4.0, because the package update doesn't seem to distibute consistently through yarn / npm

## 3.4.0

-   Improve Flow support by exposing typings regularly. Flow will automatically include them now. In your `.flowconfig` will have to remove the import in the `[libs]` section (as it's done [here](https://github.com/mobxjs/mobx/pull/1254#issuecomment-348926416)). Fixes [#1232](https://github.com/mobxjs/mobx/issues/1232).

## 3.3.3

-   Fixed regression bug where observable map contents could not be replaced using another observable map [#1258](https://github.com/mobxjs/mobx/issues/1258)
-   Fixed weird exception abot not being able to read `length` property of a function, see[#1238](https://github.com/mobxjs/mobx/issues/1238) through [#1257](https://github.com/mobxjs/mobx/issues/1238) by @dannsam

## 3.3.2

-   Fix bug where custom comparers could be invoked with `undefined` values. Fixes [#1208](https://github.com/mobxjs/mobx/issues/1208)
-   Make typings for observable stricter when using flow [#1194](https://github.com/mobxjs/mobx/issues/1194), [#1231](https://github.com/mobxjs/mobx/issues/1231)
-   Fix a bug where `map.replace` would trigger reactions for unchanged values, fixes [#1243](https://github.com/mobxjs/mobx/issues/1243)
-   Fixed issue where `NaN` was considered unequal to `NaN` when a deep compare was made [#1249](https://github.com/mobxjs/mobx/issues/1249)

## 3.3.1

-   Fix bug allowing maps to be modified outside actions when using strict mode, fixes [#940](https://github.com/mobxjs/mobx/issues/940)
-   Fixed [#1139](https://github.com/mobxjs/mobx/issues/1139) properly: `transaction` is no longer deprecated and doesn't disable tracking properties anymore
-   Fixed [#1120](https://github.com/mobxjs/mobx/issues/1139): `isComputed` should return false for non-existing properties

## 3.3.0

-   Undeprecated `transaction`, see [#1139](https://github.com/mobxjs/mobx/issues/1139)
-   Fixed typings of reaction [#1136](https://github.com/mobxjs/mobx/issues/1136)
-   It is now possible to re-define a computed property [#1121](https://github.com/mobxjs/mobx/issues/1121)
-   Print an helpful error message when using `@action` on a getter [#971](https://github.com/mobxjs/mobx/issues/971)
-   Improved typings of intercept [#1119](https://github.com/mobxjs/mobx/issues/1119)
-   Made code base Prettier [#1103](https://github.com/mobxjs/mobx/issues/1103)
-   react-native will now by default use the es module build as well.
-   Added support for Weex, see [#1163](https://github.com/mobxjs/mobx/pull/1163/)
-   Added workaround for Firefox issue causing MobX to crash, see [#614](https://github.com/mobxjs/mobx/issues/614)

## 3.2.2

-   Fixes a bug (or a known limitation) described in [#1092](https://github.com/mobxjs/mobx/issue/1092/). It is now possible to have different observable administration on different levels of the prototype chain. By @guillaumeleclerc
-   Fixed a build issue when using mobx in a project that was using rollup, fixes [#1099](https://github.com/mobxjs/mobx/issue/1099/) by @rossipedia
-   Fixed typings of `useStrict`, by @rickbeerendonk

## 3.2.1

-   Introduced customizable value comperators to reactions and computed values. `reaction` and `computed` now support an additional option, `equals`, which takes a comparision function. See [#951](https://github.com/mobxjs/mobx/pull/951/) by @jamiewinder. Fixes #802 and #943. See the updated [`computed` docs](https://mobx.js.org/refguide/computed-decorator.html) for more details.

## 3.2.0

-   MobX will warn again when there are multiple instances of MobX loaded, as this lead to often to confusing bugs if the project setup was not properly. The signal mobx that multiple instances are loaded on purpose, use `mobx.extras.runInSandbox`. See [#1082](https://github.com/mobxjs/mobx/issues/1082) for details.

## 3.1.17

-   Improved typings of `IObservableArray.intercept`: use more restrictive types for `change` parameter of `handler`, by @bvanreeven
-   Fixed [#1072](https://github.com/mobxjs/mobx/issues/1072), fields without a default value could not be observed yet when using TypeScript

## 3.1.16

-   Restored `default` export (and added warning), which broke code that was importing mobx like `import mobx from "mobx"`. Use `import * as mobx from "mobx"` or use named importes instead. By @andykog, see #1043, #1050
-   Fixed several typos in exceptions and documentation

## 3.1.15

-   Fixed issue where `array.remove` did not work correctly in combination with `extras.interceptReads`

## 3.1.14

-   Fixed 3.1.12 / 3.1.13 module packing. See #1039; `module` target is now transpiled to ES5 as well

## 3.1.13 (Unpublished: Uglify chokes on it in CRA)

-   Fixed build issue with webpack 2, see #1040

## 3.1.12 (Unpublished: wasn't being bundled correctly by all bundlers)

-   Added support for ES modules. See #1027 by @rossipedia
-   Improved flow typings. See #1019 by @fb55
-   Introduced experimental feature `extras.interceptReads(observable: ObservableMap | ObservableArray | ObservableObject | ObservableBox, property?: string, handler: value => value): Disposer` that can be used to intercept _reads_ from observable objects, to transform values on the fly when a value is read. One can achieve similar things with this as with proxying reads. See #1036

## 3.1.11

-   Using rollup as bundler, instead of custom hacked build scripts, by @rossipedia, see #1023

## 3.1.10

-   Fixed flow typings for `when`, by @jamsea
-   Add flow typings for `map.replace`, by @leader22
-   Added `observableArray.findIndex`, by @leader22
-   Improved typings of `autorun` / `autorunAsync` to better support async / await, by @capaj
-   Fixed typings of `action.bound`, see #803

## 3.1.9

-   Introduced explicit `.get(index)` and `.set(index, value)` methods on observable arrays, for issues that have trouble handling many property descriptors on objects. See also #734
-   Made sure it is safe to call `onBecomeObserved` twice in row, fixes #874, #898
-   Fixed typings of `IReactionDisposer`

## 3.1.8

-   Fixed edge case where `autorun` was not triggered again if a computed value was invalidated by the reaction itself, see [#916](https://github.com/mobxjs/mobx/issues/916), by @andykog
-   Added support for primtive keys in `createTransformer`, See #920 by @dnakov
-   Improved typings of `isArrayLike`, see #904, by @mohsen1

## 3.1.7

-   Reverted ES2015 module changes, as they broke with webpack 2 (will be re-released later)

## 3.1.6 (Unpublished)

-   Expose ES2015 modules to be used with advanced bundlers, by @mohsen1, fixes #868
-   Improved typings of `IObservableArray.intercept`: remove superflous type parameter, by @bvanreeven
-   Improved typings of map changes, by @hediet

## 3.1.5

-   Improved typings of map changes, see #847, by @hediet
-   Fixed issue with `reaction` if `fireImmediately` was combined with `delay` option, see #837, by @SaboteurSpk

## 3.1.4

-   Observable maps initialized from ES6 didn't deeply convert their values to observables. (fixes #869,by @ggarek)

## 3.1.3

-   Make sure that `ObservableArray.replace` can handle large arrays by not using splats internally. (See e.g. #859)
-   Exposed `ObservableArray.spliceWithArray`, that unlike a normal splice, doesn't use a variadic argument list so that it is possible to splice in new arrays that are larger then allowed by the callstack.

## 3.1.2

-   Fixed incompatiblity issue with `mobx-react@4.1.0`

## 3.1.1 (unpublished)

-   Introduced `isBoxedObservable(value)`, fixes #804

## 3.1.0

### Improved strict mode

Strict mode has been relaxed a bit in this release. Also computed values can now better handle creating new observables (in an action if needed). The semantics are now as follows:

-   In strict mode, it is not allowed to modify state that is already being _observed_ by some reaction.
-   It is allowed to create and modify observable values in computed blocks, as long as they are not _observed_ yet.

In order words: Observables that are not in use anywhere yet, are not protected by MobX strict mode.
This is fine as the main goal of strict mode is to avoid kicking of reactions at undesired places.
Also strict mode enforces batched mutations of observables (through action).
However, for unobserved observables this is not relevant; they won't kick of reactions at all.

This fixes some uses cases where one now have to jump through hoops like:

-   Creating observables in computed properties was fine already, but threw if this was done with the aid of an action. See issue [#798](https://github.com/mobxjs/mobx/issues/798).
-   In strict mode, it was not possible to _update_ observable values without wrapping the code in `runInAction` or `action`. See issue [#563](https://github.com/mobxjs/mobx/issues/563)

Note that the following constructions are still anti patterns, although MobX won't throw anymore on them:

-   Changing unobserved, but not just created observables in a computed value
-   Invoke actions in computed values. Use reactions like `autorun` or `reaction` instead.

Note that observables that are not in use by a reaction, but that have `.observe` listeners attached, do _not_ count towards being observed.
Observe and intercept callbacks are concepts that do not relate to strict mode, actions or transactions.

### Other changes

-   Reactions and observable values now consider `NaN === NaN`, See #805 by @andykog
-   Merged #783: extract error messages to seperate file, so that they can be optimized in production builds (not yet done), by @reisel, #GoodnessSquad
-   Improved typings of actions, see #796 by @mattiamanzati

## 3.0.2

-   Fixed issue where MobX failed on environments where `Map` is not defined, #779 by @dirtyrolf
-   MobX can now be compiled on windows as well! #772 by @madarauchiha #GoodnessSquad
-   Added documentation on how Flow typings can be used, #766 by @wietsevenema
-   Added support for `Symbol.toPrimitive()` and `valueOf()`, see #773 by @eladnava #GoodnessSquad
-   Supressed an exception that was thrown when using the Chrome Developer tools to inspect arrays, see #752

Re-introduced _structural comparison_. Seems we couldn't part from it yet :). So the following things have been added:

-   `struct` option to `reaction` (alias for `compareStructural`, to get more consistency in naming)
-   `observable.struct`, as alias for `observable.deep.struct`
-   `observable.deep.struct`: Only stores a new value and notify observers if the new value is not structurally the same as the previous value. Beware of cycles! Converts new values automatically to observables (like `observable.deep`)
-   `observable.ref.struct`: Only stores a new value and notify observers if the new value is not structurally the same as the previous value. Beware of cycles! Doesn't convert the new value into observables.
-   `extras.deepEquals`: Check if two data structures are deeply equal. supports observable and non observable data structures.

## 3.0.1

-   `toString()` of observable arrays now behaves like normal arrays (by @capaj, see #759)
-   Improved flow types of `toJS`by @jamsea (#758)

## 3.0.0

The changelog of MobX 3 might look quite overwhelming, but migrating to MobX 3 should be pretty straight forward nonetheless.
The api has now become more layered, and the api is more uniform and modifiers are cleaned up.
In practice, you should check your usage of modifiers (`asFlat`, `asMap` etc.). Besides that the migration should be pretty painless.
Please report if this isn't the case!
Note that no changes to the runtime algorithm where made, almost all changes evolve in making the creation of observables more uniform, and removing deprecated stuff.

## `observable` api has been redesigned

The api to create observables has been redesigned.
By default, it keeps the automatic conversion behavior from MobX 2.
However, one can now have more fine grained control on how / which observables are constructed.
Modifiers still exists, but they are more regular, and there should be less need for them.

### `observable(plainObject)` will no longer enhance objects, but clone instead

When passing a plain object to `observable`, MobX used to modify that object inplace and give it observable capabilities.
This also happened when assigning a plain object to an observable array etc.
However, this behavior has changed for a few reasons

1.  Both arrays and maps create new data structure, however, `observable(object)` didn't
2.  It resulted in unnecessary and confusing side effects. If you passed an object you received from some api to a function that added it, for example, to an observable collection. Suddenly your object would be modified as side effect of passing it down to that function. This was often confusing for beginners and could lead to subtle bugs.
3.  If MobX in the future uses Proxies behind the scenes, this would need to change as well

If you want, you can still enhance existing plainObjects, but simply using `extendObservable(data, data)`. This was actually the old implementation, which has now changed to `extendObservable({}, data)`.

As always, it is best practice not to have transportation objects etc lingering around; there should be only one source of truth, and that is the data that is in your observable state.
If you already adhered to this rule, this change won't impact you.

See [#649](https://github.com/mobxjs/mobx/issues/649)

### Factories per observable type

There are now explicit methods to create an observable of a specific type.

-   `observable.object(props, name?)` creates a new observable object, by cloning the give props and making them observable
-   `observable.array(initialValues, name?)`. Take a guess..
-   `observable.map(initialValues, name?)`
-   `observable.box(initialValue, name?)`. Creates a [boxed](http://mobxjs.github.io/mobx/refguide/boxed.html) value, which can be read from / written to using `.get()` and `.set(newValue)`
-   `observable(value)`, as-is, based on the type of `value`, uses any of the above four functions to create a new observable.

### Shallow factories per type

The standard observable factories create observable structures that will try to turn any plain javascript value (arrays, objects or Maps) into observables.
Allthough this is fine in most cases, in some cases you might want to disable this autoconversion.
For example when storing objects from external libraries.
In MobX 2 you needed to use `asFlat` or `asReference` modifiers for this.
In MobX 3, there are factories to directly create non-converting data structures:

-   `observable.shallowObject(props, name?)`
-   `observable.shallowArray(initialValues, name?)`
-   `observable.shallowMap(initialValues, name?)`
-   `observable.shallowBox(initialValue, name?)`

So for example, `observable.shallowArray([todo1, todo2])` will create an observable array, but it won't try to convert the todos inside the array into observables as well.

### Shallow properties

The `@observable` decorator can still be used to introduce observable properties. And like in MobX 2, it will automatically convert its values.

However, sometimes you want to create an observable property that does not convert its _value_ into an observable automatically.
Previously that could be written as `@observable x = asReference(value)`.

### Structurally comparison of observables have been removed

This was not for a technical reason, but they just seemed hardly used.
Structural comparision for computed properties and reactions is still possible.
Feel free to file an issue, including use case, to re-introduce this feature if you think you really need it.
However, we noticed that in practice people rarely use it. And in cases where it is used `reference` / `shallow` is often a better fit (when using immutable data for example).

### Modifiers

Modifiers can be used in combination `@observable`, `extendObservable` and `observable.object` to change the autoconversion rules of specific properties.

The following modifiers are available:

-   `observable.deep`: This is the default modifier, used by any observable. It converts any assigned, non-primitive value into an observable value if it isn't one yet.
-   `observable.ref`: Disables automatic observable conversion, just creates an observable reference instead.
-   `observable.shallow`: Can only used in combination with collections. Turns any assigned collection into an collection, which is shallowly observable (instead of deep)

Modifiers can be used as decorator:

```javascript
class TaskStore {
    @observable.shallow tasks = []
}
```

Or as property modifier in combination with `observable.object` / `observable.extendObservable`.
Note that modifiers always 'stick' to the property. So they will remain in effect even if a new value is assigned.

```javascript
const taskStore = observable({
    tasks: observable.shallow([])
})
```

See [modifiers](http://mobxjs.github.io/mobx/refguide/modifiers.html)

### `computed` api has been simplified

Using `computed` to create boxed observables has been simplified, and `computed` can now be invoked as follows:

-   `computed(expr)`
-   `computed(expr, setter)`
-   `computed(expr, options)`, where options is an object that can specify one or more of the following fields: `name`, `setter`, `compareStructural` or `context` (the "this").

Computed can also be used as a decorator:

-   `@computed`
-   `@computed.struct` when you want to compareStructural (previously was `@computed({asStructure: true})`)

### `reaction` api has been simplified

The signature of `reaction` is now `reaction(dataFunc, effectFunc, options?)`, where the following options are accepted:

-   `context`: The `this` to be used in the functions
-   `fireImmediately`
-   `delay`: Number in milliseconds that can be used to debounce the effect function.
-   `compareStructural`: `false` by default. If `true`, the return value of the _data_ function is structurally compared to its previous return value, and the _effect_ function will only be invoked if there is a structural change in the output.
-   `name`: String

### Bound actions

It is now possible to create actions and bind them in one go using `action.bound`. See [#699](https://github.com/mobxjs/mobx/issues/699).
This means that now the following is possible:

```javascript
class Ticker {
    @observable tick = 0

    @action.bound
    increment() {
        this.tick++ // 'this' will always be correct
    }
}

const ticker = new Ticker()
setInterval(ticker.increment, 1000)
```

### Improve error handling

Error handling in MobX has been made more consistent. In MobX 2 there was a best-effort recovery attempt if a derivation throws, but MobX 3 introduced
more consistent behavior:

-   Computed values that throw, store the exception and throw it to the next consumer(s). They keep tracking their data, so they are able to recover from exceptions in next re-runs.
-   Reactions (like `autorun`, `when`, `reaction`, `render()` of `observer` components) will always catch their exceptions, and just log the error. They will keep tracking their data, so they are able to recover in next re-runs.
-   The disposer of a reaction exposes an `onError(handler)` method, which makes it possible to attach custom error handling logic to an reaction (that overrides the default logging behavior).
-   `extras.onReactionError(handler)` can be used to register a global onError handler for reactions (will fire after spy "error" event). This can be useful in tests etc.

See [#731](https://github.com/mobxjs/mobx/issues/731)

### Removed error handling, improved error recovery

MobX always printed a warning when an exception was thrown from a computed value, reaction or react component: `[mobx] An uncaught exception occurred while calculating....`.
This warning was often confusing for people because they either had the impression that this was a mobx exception, while it actually is just informing about an exception that happened in userland code.
And sometimes, the actual exception was silently caught somewhere else.
MobX now does not print any warnings anymore, and just makes sure its internal state is still stable.
Not throwing or handling an exception is now entirely the responsibility of the user.

Throwing an exception doesn't revert the causing mutation, but it does reset tracking information, which makes it possible to recover from exceptions by changing the state in such a way that a next run of the derivation doesn't throw.

### Flow-Types Support 🎉🎉🎉

Flow typings have been added by [A-gambit](https://github.com/A-gambit).
Add flow types for methods and interfaces of observable variables:

```js
const observableValue: IObservableValue<number> = observable(1)
const observableArray: IObservableArray<number> = observable([1, 2, 3])

const sum: IComputedValue<number> = computed(() => {
    return observableArray.reduce((a: number, b: number): number => a + b, 0)
})
```

See [#640](https://github.com/mobxjs/mobx/issues/640)

### MobX will no longer share global state by default

For historical reasons (at Mendix), MobX had a feature that it would warn if different versions of the MobX package are being loaded into the same javascript runtime multiple times.
This is because multiple instances by default try to share their state.
This allows reactions from one package to react to observables created by another package,
even when both packages where shipped with their own (embedded) version of MobX (!).

Obviously this is a nasty default as it breaks package isolation and might actually start to throw errors unintentionally when MobX is loaded multiple times in the same runtime by completely unrelated packages.
So this sharing behavior is now by default turned off.
Sharing MobX should be achieved by means of proper bundling, de-duplication of packages or using peer dependencies / externals if needed.
This is similar to packages like React, which will also bail out if you try to load it multiple times.

If you still want to use the old behavior, this can be achieved by running `mobx.extras.shareGlobalState()` on _all_ packages that want to share state with each other.
Since this behavior is probably not used outside Mendix, it has been deprecated immediately, so if you rely on this feature, please report in #621, so that it can be undeprecated if there is no more elegant solution.

See [#621](https://github.com/mobxjs/mobx/issues/621)

### Using the @action decorator inside individual objects

Don't use the `@action` decorator on an individual object that you pass to `observable()` or `extendObservable()`. If you have code that looks like `observable({ @action f: () => {})`, you should change it to `observable({ f: action(() => {})`.

Whether or not this was ever a good idea is debatable, but it stopped working in this version. If you're using classes, it's a non-issue.

### Other changes

-   **Breaking change:** The arguments to `observe` listeners for computed and boxed observables have changed and are now consistent with the other apis. Instead of invoking the callback with `(newValue: T, oldValue: T)` they are now invoked with a single change object: `(change: {newValue: T, oldValue: T, object, type: "update"})`
-   Using transaction is now deprecated, use `action` or `runInAction` instead. Transactions now will enter an `untracked` block as well, just as actions, which removes the conceptual difference.
-   Upgraded to typescript 2
-   It is now possible to pass ES6 Maps to `observable` / observable maps. The map will be converted to an observable map (if keys are string like)
-   Made `action` more debug friendly, it should now be easier to step through
-   ObservableMap now has an additional method, `.replace(data)`, which is a combination of `clear()` and `merge(data)`.
-   Passing a function to `observable` will now create a boxed observable refering to that function
-   Fixed #603: exceptions in transaction breaks future reactions
-   Fixed #698: createTransformer should support default arguments
-   Transactions are no longer reported grouped in spy events. If you want to group events, use actions instead.
-   Normalized `spy` events further. Computed values and actions now report `object` instead of `target` for the scope they have been applied to.
-   The following deprecated methods have been removed:
    -   `transaction`
    -   `autorunUntil`
    -   `trackTransitions`
    -   `fastArray`
    -   `SimpleEventEmitter`
    -   `ObservableMap.toJs` (use `toJS`)
    -   `toJSlegacy`
    -   `toJSON` (use `toJS`)
    -   invoking `observe` and `inject` with plain javascript objects

---

## 2.7.0

### Automatic inference of computed properties has been deprecated.

A deprecation message will now be printed if creating computed properties while relying on automatical inferrence of argumentless functions as computed values. In other words, when using `observable` or `extendObservable` in the following manner:

```javascript
const x = observable({
    computedProp: function() {
        return someComputation
    }
})

// Due to automatic inferrence now available as computed property:
x.computedProp
// And not !
x.computedProp()
```

Instead, to create a computed property, use:

```javascript
observable({
    get computedProp() {
        return someComputation
    }
})
```

or alternatively:

```javascript
observable({
    computedProp: computed(function() {
        return someComputation
    })
})
```

This change should avoid confusing experiences when trying to create methods that don't take arguments.
The current behavior will be kept as-is in the MobX 2.\* range,
but from MobX 3 onward the argumentless functions will no longer be turned
automatically into computed values; they will be treated the same as function with arguments.
An observable _reference_ to the function will be made and the function itself will be preserved.
See for more details [#532](https://github.com/mobxjs/mobx/issues/532)

N.B. If you want to introduce actions on an observable that modify its state, using `action` is still the recommended approach:

```javascript
observable({
    counter: 0,
    increment: action(function() {
        this.counter++
    })
})
```

By the way, if you have code such as:

```
observable({
    @computed get someProp() { ... }
});
```

That code will no longer work. Rather, reactions will fail silently. Remove `@computed`.
Note, this only applies when using observable in this way; it doesn't apply when using
`@observable` on a property within a class declaration.

### Misc

-   Fixed #701: `toJS` sometimes failing to convert objects decorated with `@observable` (cause: `isObservable` sometimes returned false on these object)
-   Fixed typings for `when` / `autorun` / `reaction`; they all return a disposer function.

## 2.6.5

-   Added `move` operation to observable array, see [#697](https://github.com/mobxjs/mobx/pull/697)

## 2.6.4

-   Fixed potential clean up issue if an exception was thrown from an intercept handler
-   Improved typings of `asStructure` (by @nidu, see #687)
-   Added support for `computed(asStructure(() => expr))` (by @yotambarzilay, see #685)

## 2.6.3

-   Fixed #603: exceptions in transaction breaks future reactions
-   Improved typings of `toJS`
-   Introduced `setReactionScheduler`. Internal api used by mobx-react@4 to be notified when reactions will be run

## 2.6.2

-   Changes related to `toJS` as mentioned in version `2.6.0` where not actually shipped. This has been fixed, so see release notes below.

## 2.6.1

-   Introduced convenience `isArrayLike`: returns whether the argument is either a JS- or observable array. By @dslmeinte
-   Improved readme. By @DavidLGoldberg
-   Improved assertion message, by @ncammarate (See [#618](https://github.com/mobxjs/mobx/pull/618))
-   Added HashNode badge, by @sandeeppanda92

## 2.6.0

_Marked as minor release as the behavior of `toJS` has been changed, which might be interpreted both as bug-fix or as breaking change, depending of how you interpreted the docs_

-   Fixed [#566](https://github.com/mobxjs/mobx/pull/566): Fixed incorrect behavior of `toJS`: `toJS` will now only recurse into observable object, not all objects. The new behavior is now aligned with what is suggested in the docs, but as a result the semantics changed a bit. `toJSlegacy` will be around for a while implementing the old behavior. See [#589](See https://github.com/mobxjs/mobx/pull/589) for more details.
-   Fixed [#571](https://github.com/mobxjs/mobx/pull/571): Don't use `instanceof` operator. Should fix issues if MobX is included multiple times in the same bundle.
-   Fixed [#576](https://github.com/mobxjs/mobx/pull/576): disallow passing actions directly to `autorun`; as they won't be tracked by @jeffijoe
-   Extending observable objects with other observable (objects) is now explicitly forbidden, fixes [#540](https://github.com/mobxjs/mobx/pull/540).

## 2.5.2

-   Introduced `isComputed`
-   Observable objects can now have a type: `IObservableObject`, see [#484](https://github.com/mobxjs/mobx/pull/484) by @spiffytech
-   Restored 2.4 behavior of boxed observables inside observable objects, see [#558](https://github.com/mobxjs/mobx/issues/558)

## 2.5.1

-   Computed properties can now be created by using getter / setter functions. This is the idiomatic way to introduce computed properties from now on:

```javascript
const box = observable({
    length: 2,
    get squared() {
        return this.length * this.length
    },
    set squared(value) {
        this.length = Math.sqrt(value)
    }
})
```

## 2.5.0

-   Core derivation algorithm has received some majore improvements by @asterius1! See below. Pr #452, 489
-   Introduced setters for computed properties, use `computed(expr, setter)` or `@computed get name() { return expr } set name (value) { action }`. `computed` can now be used as modifier in `observable` / `extendObservable`, #421, #463 (see below for example)
-   Introduced `isStrictModeEnabled()`, deprecated `useStrict()` without arguments, see #464
-   Fixed #505, accessing an observable property throws before it is initialized

MobX is now able track and memoize computed values while an (trans)action is running.
Before 2.5, accessing a computed value during a transaction always resulted in a recomputation each time the computed value was accessed, because one of the upstream observables (might) have changed.
In 2.5, MobX actively tracks whether one of the observables has changed and won't recompute computed values unnecessary.
This means that computed values are now always memoized for the duration of the current action.
In specific cases, this might signficantly speed up actions that extensively make decisions based on computed values.

Example:

```javascript
class Square {
    @observable length = 2
    @computed get squared() {
        return this.length * this.length
    }
    // mobx now supports setters for computed values
    set squared(surfaceSize) {
        this.length = Math.sqrt(surfaceSize)
    }

    // core changes make actions more efficient if extensively using computed values:
    @action stuff() {
        this.length = 3
        console.log(this.squared) // recomputes in both 2.5 and before
        console.log(this.squared) // no longer recomputes
        this.length = 4
        console.log(this.squared) // recomputes in both 2.5 and before
        // after the action, before 2.5 squared would compute another time (if in use by a reaction), that is no longer the case
    }
}
```

ES5 example for setters:

```javascript
function Square() {
    extendObservable(this, {
        length: 2,
        squared: computed(
            function() {
                return this.squared * this.squared
            },
            function(surfaceSize) {
                this.length = Math.sqrt(surfaceSize)
            }
        )
    })
}
```

## 2.4.4

-   Fixed #503: map.delete returns boolean
-   Fix return type of `runInAction`, #499 by @Strate
-   Fixed enumerability of observable array methods, see #496.
-   Use TypeScript typeguards, #487 by @Strate
-   Added overloads to `action` for better type inference, #500 by @Strate
-   Fixed #502: `extendObservable` fails on objects created with `Object.create(null)`
-   Implemented #480 / #488: better typings for `asMap`, by @Strate

## 2.4.3

-   Objects with a `null` prototype are now considered plain objects as well
-   Improved error message for non-converging cyclic reactions
-   Fixed potential HMR issue

## 2.4.2

-   Improved error message when wrongly using `@computed`, by @bb (#450)
-   `observableArray.slice` now automatically converts observable arrays to plain arrays, fixes #460
-   Improved error message when an uncaught exception is thrown by a MobX tracked function

## 2.4.1

-   `@action` decorated methods are now configurable. Fixes #441
-   The `onBecomeObserved` event handler is now triggered when an atom is observed, instead of when it is bound as dependency. Fixes #427 and makes atoms easier to extend.
-   if `useStrict()` is invoked without arguments, it now returns the current value of strict mode.
-   the current reaction is now always passed as first argument to the callbacks of `autorun`, `autorunAsync`, `when` and `reaction`. This allows reactions to be immediately disposed during the first run. See #438, by @andykog

## 2.4.0

-   _Note: the internal version of MobX has been bumped. This version has no breaking api changes, but if you have MobX loaded multiple times in your project, they all have to be upgraded to `2.4.0`. MobX will report this when starting._
-   Made dependency tracking and binding significant faster. Should result in huge performance improvements when working with large collections.
-   Fixed typescript decorator issue, #423, #425? (by @bb)

## 2.3.7

-   Fixed issue where computed values were tracked and accidentally kept alive during actions

## 2.3.6

-   Fixed #406: Observable maps doesn't work with empty initial value in Safari
-   Implemented #357, #348: ObservableMap and ObservableArray now support iterators. Use [`@@iterator()` or iterall](https://github.com/leebyron/iterall) in ES5 environments.

## 2.3.5

-   Fixed #364: Observable arrays not reacting properly to index assignments under iOS safari (mobile) 9.1.1 By @andykog
-   Fixed #387: Typings of boxed values
-   Added warning when reading array entries out of bounds. See #381

## 2.3.4

-   Fixed #360: Removed expensive cycle detection (cycles are still detected, but a bit later)
-   Fixed #377: `toJS` serialization of Dates and Regexes preserves the original values
-   Fixed #379: `@action` decorated methods can now be inherited / overridden

## 2.3.3

-   Fixed #186: Log a warning instead of an error if an exception is thrown in a derivation. Fixes issue where React Native would produce unusable error screens (because it shows the first logged error)
-   Fixed #333: Fixed some interoperability issues in combination with `Reflect` / `InversifyJS` decorators. @andykog
-   Fixed #333: `@observable` class properties are now _owned_ by their instance again, meaning they will show up in `Object.keys()` and `.hasOwnProperty` @andykog

## 2.3.2

-   Fixed #328: Fixed exception when inspecting observable in `onBecomeObserved`
-   Fixed #341: `array.find` now returns `undefined` instead of `null` when nothing was found, behavior now matches the docs. (By @hellectronic)

## 2.3.1

-   Fixed #327: spy not working with runInAction

## 2.3.0

### Introduced `whyRun`:

Usage:

-   `whyRun()`
-   `whyRun(Reaction object / ComputedValue object / disposer function)`
-   `whyRun(object, "computed property name")`

`whyRun` is a small utility that can be used inside computed value or reaction (`autorun`, `reaction` or the `render` method of an `observer` React component)
and prints why the derivation is currently running, and under which circumstances it will run again.
This should help to get a deeper understanding when and why MobX runs stuff, and prevent some beginner mistakes.

This feature can probably be improved based on your feedback, so feel free to file issues with suggestions!

### Semantic changes:

-   `@observable` is now always defined on the class prototypes and not in the instances. This means that `@observable` properties are enumerable, but won't appear if `Object.keys` or `hasOwnProperty` is used on a class _instance_.
-   Updated semantics of `reaction` as discussed in `#278`. The expression now needs to return a value and the side effect won't be triggered if the result didn't change. `asStructure` is supported in these cases. In contrast to MobX 2.2, effects will no longer be run if the output of the expression didn't change.

### Enhancements

-   Introduces `isAction(fn)` #290
-   If an (argumentless) action is passed to `observable` / `extendObservable`, it will not be converted into a computed property.
-   Fixed #285: class instances are now also supported by `toJS`. Also members defined on prototypes which are enumerable are converted.
-   Map keys are now always coerced to strings. Fixes #308
-   `when`, `autorun` and `autorunAsync` now accept custom debug names (see #293, by @jamiewinder)
-   Fixed #286: autoruns no longer stop working if an action throws an exception
-   Implemented `runInAction`, can be used to create on the fly actions (especially useful in combination with `async/await`, see #299
-   Improved performance and reduced mem usage of decorators signficantly (by defining the properties on the prototype if possible), and removed subtle differences between the implementation and behavior in babel and typescript.
-   Updated logo as per #244. Tnx @osenvosem!

# 2.2.2:

-   Fixed issue #267: exception when `useStrict(true)` was invoked in combination with `@observable` attributes when using Babel
-   Fixed issue #269: @action in combination with typescript targeting ES6 and reflect.ts
-   Improved compatibility with `JSON.stringify`, removed incorrect deprecation message
-   Improved some error messages

# 2.2.1

-   Fixed issue where typescript threw a compile error when using `@action` without params on a field
-   Fixed issue where context was accidentally shared between class instances when using `@action` on a field

# 2.2.0

See the [release announcement](https://medium.com/@mweststrate/45cdc73c7c8d) for the full details of this release:

Introduced:

-   `action` / `@action`
-   `intercept`
-   `spy`
-   `reaction`
-   `useStrict`
-   improved debug names
-   `toJSON` was renamed to `toJS`
-   `observable(asMap())` is the new idiomatic way to create maps
-   the effect of `when` is now untracked, similar to `reaction.
-   `extras.trackTransations` is deprecated, use `spy` instead
-   `untracked` has been undeprecated
-   introduced / documented: `getAtom`, `getDebugName`, `isSpyEnabled`, `spyReport`, `spyReportStart`, `spyReportEnd`
-   deprecated `extras.SimpleEventEmitter`
-   array splice events now also report the `added` collection and `removedCount`

# 2.1.7

-   Fixed a false negative in cycle detection, as reported in #236

# 2.1.6

-   Fixed #236, #237 call stack issues when working with large arrays

# 2.1.5

-   Fix #222 (by @andykog) run `observe` callback of computed properties in untracked mode.

# 2.1.4

-   Fixed #201 (see also #160), another iOS enumerability issue... By @luosong

# 2.1.3

-   Fixed #191, when using babel, complex field initializers where shared. By @andykog
-   Added `lib/mobx.umd.min.js` for minified cdn builds, see #85

# 2.1.2

-   Improved debug names of objects created using a constructor
-   Fixed(?) some issues with iOS7 as reported in #60 by @bstst

# 2.1.1

-   Fixed issue where `autorun`s created inside `autorun`s were not always kicked off. (`mobx-react`'s `observer` was not affected). Please upgrade if you often use autorun.
-   Fixed typings of `mobx.map`, a list of entries is also acceptable.
-   (Experimental) Improved error recovery a bit further

# 2.1.0

-   MobX is now chatty again when an exception occurs inside a autorun / computed value / React.render. Previously this was considered to be the responsibility of the surrounding code. But if exceptions were eaten this would be really tricky to debug.
-   (Experimental) MobX will now do a poor attempt to recover from exceptions that occured in autorun / computed value / React.render.

# 2.0.6

-   `resetGlobalState` is now part of the `mobx.extras` namespace, as it is useful for test setup, to restore inconsistent state after test failures.
-   `resetGlobalState` now also resets the caches of `createTransformer`, see #163.

# 2.0.5

-   WIP on bower support

# 2.0.4

-   `$transformId` property on transformed objects should be non-enumerable. Fixes #170.

# 2.0.3

-   Always peek if inspecting a stale, computed value. Fixes #165.

# 2.0.2

-   Fixed issue where changing an object property was tracked, which could lead to unending loops in `autorunAsync`.

# 2.0.1

-   Undeprecated `observable(scalar)` (see 143)
-   `expr` no longer prints incorrect deprecated messages (see 143)
-   Requires `mobx` twice no longer fails.

# 2.0.0

## A new name...

Welcome to ~Mobservable~ MobX 2! First of all, there is the name change.
The new name is shorter and funnier and it has the right emphasis: MobX is about reactive programming.
Not about observability of data structures, which is just a technical necessity.
MobX now has its own [mobxjs](https://github.com/mobxjs) organization on GitHub. Just report an issue if you want to join.

All MobX 2.0 two compatible packages and repos have been renamed. So `mobx-react`, `mobx-react-devtools` etc.
For the 1.0 versions, use the old `mobservable` based names.

## Migrating from Mobservable 1.x to MobX 2.0

Migrating from Mobservable should be pretty straight-forward as the public api is largely the same.
However there are some conceptual changes which justifies a Major version bump as it might alter the behavior of MobX in edge cases.
Besides that, MobX is just a large collection of minor improvements over Mobservable.
Make sure to remove your old `mobservable` dependencies when installing the new `mobx` dependencies!

## `autorun`s are now allowed to cause cycles!

`autorun` is now allowed to have cycles. In Mobservable 1 an exception was thrown as soon as an autorun modified a variable which it was reading as well.
In MobX 2 these situations are now allowed and the autorun will trigger itself to be fired again immediately after the current execution.
This is fine as long as the autorun terminates within a reasonable amount of iterations (100).
This should avoid the need for work-arounds involving `setTimeout` etc.
Note that computed values (created using `observable(func)` are still not allowed to have cycles.

## [Breaking] `observable(scalar)` returns an object instead of a function and has been deprecated.

Creating an observable from a primitive or a reference no longer returns a getter/setter function, but a method with a `.get` and `.set` method.
This is less confusing, easier to debug and more efficient.

So to read or write from an observable scalar use:

```javascript
const temperature = observable(27)
temperature.set(15) // previously: temperature(15)
temperature.get() // previously: temperature()
```

`observable(scalar)` has been deprecated to make the api smaller and the syntax more uniform. In practice having observable objects, arrays and decorators seems to suffice in 99% of the cases. Deprecating this functionality means that people have simply less concepts to learn. Probably creating observable scalars will continue to work for a long time, as it is important to the internals of MobX and very convenient for testing.

## Introduced `@computed`

MobX introduced the `@computed` decorator for ES6 class properties with getter functions.
It does technically the same as `@observable` for getter properties. But having a separate decorator makes it easier to communicate about the code.
`@observable` is for mutable state properties, `@computed` is for derived values.

`@computed` can now also be parameterized. `@computed({asStructure: true})` makes sure that the result of a derivation is compared structurally instead of referentially with its preview value. This makes sure that observers of the computation don't re-evaluate if new structures are returned that are structurally equal to the original ones. This is very useful when working with point, vector or color structures for example. It behaves the same as the `asStructure` modifier for observable values.

`@computed` properties are no longer enumerable.

## MobX is now extensible!

The core algorithm of MobX has been largely rewritten to improve the clarity, extensibility, performance and stability of the source code.
It is now possible to define your own custom observable data sources by using the `Atom` class.
It is also possible to create your own reactive functions using the `Reaction` class. `autorun`, `autorunAsync` and `@observer` have now all been implemented using the concept of Reactions.
So feel free to write your own reactive [constructions](http://mobxjs.github.io/mobx/refguide/extending.html)!

## Mobservable now fails fast

In Mobservable 1 exceptions would be caught and sometimes re-thrown after logging them.
This was confusing and not all derivations were able to recover from these exceptions.
In MobX 2 it is no longer allowed for a computed function or `autorun` to throw an exception.

## Improved build

-   MobX is roughly 20% faster
-   MobX is smaller: 75KB -> 60KB unminified, and 54KB -> 30KB minified.
-   Distributable builds are no longer available in the git repository, use unpkg instead:
-   Commonjs build: https://unpkg.com/mobx@^2.0.0/lib/mobx.js
-   Minified commonjs build: https://unpkg.com/mobx@^2.0.0/lib/mobx.min.js
-   UMD build: https://unpkg.com/mobx@^2.0.0/lib/mobx.umd.js
-   To use the minified build, require / import the lib from `"mobx/lib/mobx.min.js"` (or set up an alias in your webpack configuration if applicable)

## Other changes

-   Improved debug names of all observables. This is especially visible when using `mobx-react-devtools` or `extras.trackTransitions`.
-   Renamed `extras.SimpleEventEmitter` to `SimpleEventEmitter`
-   Removed already deprecated methods: `isReactive`, `makeReactive`, `observeUntil`, `observeAsync`
-   Removed `extras.getDNode`
-   Invoking `ObservableArray.peek` is no longer registered as listener
-   Deprecated `untracked`. It wasn't documented and nobody seems to miss it.

# 1.2.5

-   Map no longer throws when `.has`, `.get` or `.delete` is invoked with an invalid key (#116)
-   Files are now compiled without sourcemap to avoid issues when loading mobservable in a debugger when `src/` folder is not available.

# 1.2.4

-   Fixed: observable arrays didn't properly apply modifiers if created using `asFlat([])` or `fastArray([])`
-   Don't try to make frozen objects observable (by @andykog)
-   `observableArray.reverse` no longer mutates the arry but just returns a sorted copy
-   Updated tests to use babel6

# 1.2.3

-   observableArray.sort no longer mutates the array being sorted but returns a sorted clone instead (#90)
-   removed an incorrect internal state assumption (#97)

# 1.2.2

-   Add bower support

# 1.2.1

-   Computed value now yields consistent results when being inspected while in transaction

# 1.2.0

-   Implemented #67: Reactive graph transformations. See: http://mobxjs.github.io/mobservable/refguide/create-transformer.html

# 1.1.8

-   Implemented #59, `isObservable` and `observe` now support a property name as second param to observe individual values on maps and objects.

# 1.1.7

-   Fixed #77: package consumers with --noImplicitAny should be able to build

# 1.1.6

-   Introduced `mobservable.fastArray(array)`, in addition to `mobservable.observable(array)`. Which is much faster when adding items but doesn't support enumerability (`for (var idx in ar) ..` loops).
-   Introduced `observableArray.peek()`, for fast access to the array values. Should be used read-only.

# 1.1.5

-   Fixed 71: transactions should not influence running computations

# 1.1.4

-   Fixed #65; illegal state exception when using a transaction inside a reactive function. Credits: @kmalakoff

# 1.1.3

-   Fixed #61; if autorun was created during a transaction, postpone execution until the end of the transaction

# 1.1.2

-   Fixed exception when autorunUntil finished immediately

# 1.1.1

-   `toJSON` now serializes object trees with cycles as well. If you know the object tree is acyclic, pass in `false` as second parameter for a performance gain.

# 1.1.0

-   Exposed `ObservableMap` type
-   Introduced `mobservable.untracked(block)`
-   Introduced `mobservable.autorunAsync(block, delay)`

# 1.0.9

Removed accidental log message

# 1.0.7 / 1.0.8

Fixed inconsistency when using `transaction` and `@observer`, which sometimes caused stale values to be displayed.

# 1.0.6

Fix incompatibility issue with systemjs bundler (see PR 52)

# 1.0.4/5

-   `map.size` is now a property instead of a function
-   `map()` now accepts an array as entries to construct the new map
-   introduced `isObservableObject`, `isObservableArray` and `isObservableMap`
-   introduced `observe`, to observe observable arrays, objects and maps, similarly to Object.observe and Array.observe

# 1.0.3

-   `extendObservable` now supports passing in multiple object properties

# 1.0.2

-   added `mobservable.map()`, which creates a new map similarly to ES6 maps, yet observable. Until properly documentation, see the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map).

# 1.0.1

-   Stricter argument checking for several apis.

# 1.0

## Renames

-   `isReactive` -> `isObservable`
-   `makeReactive` -> `observable`
-   `extendReactive` -> `extendObservable`
-   `observe` -> `autorun`
-   `observeUntil` -> `autorunUntil`
-   `observeAsync` -> `autorunAsync`
-   `reactiveComponent` -> `observer` (in `mobservable-react` package)

## Breaking changes

-   dropped the `strict` and `logLevel` settings of mobservable. View functions are by default run in `strict` mode, `autorun` (formerly: `observe`) functions in `non-strict` mode (strict indicates that it is allowed to change other observable values during the computation of a view funtion).
    Use `extras.withStrict(boolean, block)` if you want to deviate from the default behavior.
-   `observable` (formerly `makeReactive`) no longer accepts an options object. The modifiers `asReference`, `asStructure` and `asFlat` can be used instead.
-   dropped the `default` export of observable
-   Removed all earlier deprecated functions

## Bugfixes / improvements

-   `mobservable` now ships with TypeScript 1.6 compliant module typings, no external typings file is required anymore.
-   `mobservable-react` supports React Native as well through the import `"mobservable-react/native"`.
-   Improved debugger support
-   `for (var key in observablearray)` now lists the correct keys
-   `@observable` now works correct on classes that are transpiled by either TypeScript or Babel (Not all constructions where supported in Babel earlier)
-   Simplified error handling, mobservable will no longer catch errors in views, which makes the stack traces easier to debug.
-   Removed the initial 'welcom to mobservable' logline that was printed during start-up.

# 0.7.1

-   Backported Babel support for the @observable decorator from the 1.0 branch. The decorator should now behave the same when compiled with either Typescript or Babeljs.

# 0.7.0

-   Introduced `strict` mode (see issues [#30](), [#31]())
-   Renamed `sideEffect` to `observe`
-   Renamed `when` to `observeUntil`
-   Introduced `observeAsync`.
-   Fixed issue where changing the `logLevel` was not picked up.
-   Improved typings.
-   Introduces `asStructure` (see [#8]()) and `asFlat`.
-   Assigning a plain object to a reactive structure no longer clones the object, instead, the original object is decorated. (Arrays are still cloned due to Javascript limitations to extend arrays).
-   Reintroduced `expr(func)` as shorthand for `makeReactive(func)()`, which is useful to create temporarily views inside views
-   Deprecated the options object that could be passed to `makeReactive`.
-   Deprecated the options object that could be passed to `makeReactive`:
    -   A `thisArg` can be passed as second param.
    -   A name (for debugging) can be passed as second or third param
    -   The `as` modifier is no longer needed, use `asReference` (instead of `as:'reference'`) or `asFlat` (instead of `recurse:false`).

# 0.6.10

-   Fixed issue where @observable did not properly create a stand-alone view

# 0.6.9

-   Fixed bug where views where sometimes not triggered again if the dependency tree changed to much.

# 0.6.8

-   Introduced `when`, which, given a reactive predicate, observes it until it returns true.
-   Renamed `sideEffect -> observe`

# 0.6.7:

-   Improved logging

# 0.6.6:

-   Deprecated observable array `.values()` and `.clone()`
-   Deprecated observeUntilInvalid; use sideEffect instead
-   Renamed mobservable.toJson to mobservable.toJSON

# 0.6.5:

-   It is no longer possible to create impure views; views that alter other reactive values.
-   Update links to the new documentation.

# 0.6.4:

-   2nd argument of sideEffect is now the scope, instead of an options object which hadn't any useful properties

# 0.6.3

-   Deprecated: reactiveComponent, reactiveComponent from the separate package mobservable-react should be used instead
-   Store the trackingstack globally, so that multiple instances of mobservable can run together

# 0.6.2

-   Deprecated: @observable on functions (use getter functions instead)
-   Introduced: `getDependencyTree`, `getObserverTree` and `trackTransitions`
-   Minor performance improvements
