# mobx-react-lite

## 4.0.7

### Patch Changes

-   [`61abc53f`](https://github.com/mobxjs/mobx/commit/61abc53ff10554d1d5ce3e85466f6beda4d63fa2) [#3852](https://github.com/mobxjs/mobx/pull/3852) Thanks [@mweststrate](https://github.com/mweststrate)! - Patched the release process, forcing release to get everything in pristine state.

*   [`7bbb523a`](https://github.com/mobxjs/mobx/commit/7bbb523a7b81229570e0e2a176b989bfc74c4634) [#3842](https://github.com/mobxjs/mobx/pull/3842) Thanks [@r0b1n](https://github.com/r0b1n)! - Prevent warnings when using `mobx-react-lite` with Rollup

## 4.0.6

### Patch Changes

-   [`b970cbb4`](https://github.com/mobxjs/mobx/commit/b970cbb4dd2e43516d37f3f01c956cab3540d4d3) [#3830](https://github.com/mobxjs/mobx/pull/3830) Thanks [@dmitrytavern](https://github.com/dmitrytavern)! - fix #3826: components make two renders because of the different state of the snapshots

*   [`1b8ab199`](https://github.com/mobxjs/mobx/commit/1b8ab199df5e73d384cc40ec2d13915a690c14f3) [#3831](https://github.com/mobxjs/mobx/pull/3831) Thanks [@kitsuned](https://github.com/kitsuned)! - fix: ensure observer component name is only set when configurable

## 4.0.5

### Patch Changes

-   [`87e5dfb5`](https://github.com/mobxjs/mobx/commit/87e5dfb52a84869d62b6343887a1c8659aee595d) [#3763](https://github.com/mobxjs/mobx/pull/3763) Thanks [@mweststrate](https://github.com/mweststrate)! - Switched observer implementation from using global to local state version. Fixes #3728

## 4.0.4

### Patch Changes

-   [`3ceeb865`](https://github.com/mobxjs/mobx/commit/3ceeb8651e328c4c7211c875696b3f5269fea834) [#3732](https://github.com/mobxjs/mobx/pull/3732) Thanks [@urugator](https://github.com/urugator)! - fix: #3734: `isolateGlobalState: true` makes observer stop to react to store changes

## 4.0.3

### Patch Changes

-   [`58bb052c`](https://github.com/mobxjs/mobx/commit/58bb052ca41b8592e5bd5c3003b68ec52da53f33) [#3670](https://github.com/mobxjs/mobx/pull/3670) Thanks [@urugator](https://github.com/urugator)! - fix #3669: SSR: `useSyncExternalStore` throws due to missing `getServerSnapshot`

*   [`473cb3f5`](https://github.com/mobxjs/mobx/commit/473cb3f5fc8bf43abdd1c9c7857fe2820d2291fe) [#3718](https://github.com/mobxjs/mobx/pull/3718) Thanks [@mweststrate](https://github.com/mweststrate)! - - Fixed `observer` in `StrictMode` #3671
    -   **[BREAKING CHANGE]** Class component's `props`/`state`/`context` are no longer observable. Attempt to use these in any derivation other than component's `render` throws and error. For details see https://github.com/mobxjs/mobx/blob/main/packages/mobx-react/README.md#note-on-using-props-and-state-in-derivations
    -   Extending or applying `observer` classes is now explicitly forbidden

## 4.0.2

### Patch Changes

-   [`f86df867`](https://github.com/mobxjs/mobx/commit/f86df86784fa92d793ca4d1b97a3dd954355f7dd) [#3667](https://github.com/mobxjs/mobx/pull/3667) Thanks [@tony](https://github.com/tony)! - Fix package dependency for use-sync-external-store.

## 4.0.1

### Patch Changes

-   [`8e58fa95`](https://github.com/mobxjs/mobx/commit/8e58fa958908f632a2c49d22c259fda135781455) [#3664](https://github.com/mobxjs/mobx/pull/3664) Thanks [@mweststrate](https://github.com/mweststrate)! - (Hopefully) fixed release process for mobx-react-lite

## 4.0.0

### Major Changes

-   [`44a2cf42`](https://github.com/mobxjs/mobx/commit/44a2cf42dec7635f639ddbfb19202ebc710bac54) [#3590](https://github.com/mobxjs/mobx/pull/3590) Thanks [@urugator](https://github.com/urugator)! - Components now use `useSyncExternalStore`, which should prevent tearing - you have to update mobx, otherwise it should behave as previously.<br>
    Improved displayName/name handling as discussed in #3438.<br>

## 3.4.3

### Patch Changes

-   [`dfeb1f5d`](https://github.com/mobxjs/mobx/commit/dfeb1f5d18acb8a995d4fa78374173d419fec16e) [#3651](https://github.com/mobxjs/mobx/pull/3651) Thanks [@urugator](https://github.com/urugator)! - fix #3650 regression clearTimers -> clearTimes

## 3.4.2

### Patch Changes

-   [`7acaf305`](https://github.com/mobxjs/mobx/commit/7acaf305f81ac5457a8de272e42dd5634a97eb88) [#3645](https://github.com/mobxjs/mobx/pull/3645) Thanks [@urugator](https://github.com/urugator)! - fix FinalizationRegistry support check #3643

## 3.4.1

### Patch Changes

-   [`4ef8ff3f`](https://github.com/mobxjs/mobx/commit/4ef8ff3f84ec8ae893d8c84031664ea388d78091) [#3598](https://github.com/mobxjs/mobx/pull/3598) Thanks [@urugator](https://github.com/urugator)! - refactor reaction tracking

## 3.4.0

### Minor Changes

-   [`4c5e75cd`](https://github.com/mobxjs/mobx/commit/4c5e75cdfec08c04ad774c70dca0629bd2c77016) [#3382](https://github.com/mobxjs/mobx/pull/3382) Thanks [@iChenLei](https://github.com/iChenLei)! - replace the deprecated react type definition with recommended type definition

*   [`bd4b70d8`](https://github.com/mobxjs/mobx/commit/bd4b70d8ded29673af8161aa42fb88dc4ad4420e) [#3387](https://github.com/mobxjs/mobx/pull/3387) Thanks [@mweststrate](https://github.com/mweststrate)! - Added experimental / poor man's support for React 18. Fixes #3363, #2526. Supersedes #3005

    -   Updated tests, test / build infra, peerDependencies to React 18
    -   **[breaking icmw upgrading to React 18]** Already deprecated hooks like `useMutableSource` will trigger warnings in React 18, which is correct and those shouldn't be used anymore.
    -   **[breaking icmw upgrading to React 18]** When using React 18, it is important that `act` is used in **unit tests** around every programmatic mutation. Without it, changes won't propagate!
    -   The React 18 support is poor man's support; that is, we don't do anything yet to play nicely with Suspense features. Although e.g. [startTransition](https://github.com/mweststrate/platform-app/commit/bdd995773ddc6551235a4d2b0a4c9bd57d30510e) basically works, MobX as is doesn't respect the Suspense model and will always reflect the latest state that is being rendered with, so tearing might occur. I think this is in theoretically addressable by using `useSyncExternalStore` and capturing the current values together with the dependency tree of every component instance. However that isn't included in this pull request 1) it would be a breaking change, whereas the current change is still compatible with React 16 and 17. 2) I want to collect use cases where the tearing leads to problems first to build a better problem understanding. If you run into the problem, please submit an issue describing your scenario, and a PR with a unit tests demonstrating the problem in simplified form. For further discussion see #2526, #3005

## 3.3.0

### Minor Changes

-   [`59b42c28`](https://github.com/mobxjs/mobx/commit/59b42c2826208435353ce6bf154ae59077edcc05) [#3282](https://github.com/mobxjs/mobx/pull/3282) Thanks [@urugator](https://github.com/urugator)! - support `observable(forwardRef(fn))`, deprecate `observable(fn, { forwardRef: true })`, solve #2527, #3267

## 3.2.3

### Patch Changes

-   [`4887d200`](https://github.com/mobxjs/mobx/commit/4887d200ba5e1563717a0b4f55e09b9984437990) [#3192](https://github.com/mobxjs/mobx/pull/3192) Thanks [@urugator](https://github.com/urugator)! - Support customizing `displayName` on anonymous components [#2721](https://github.com/mobxjs/mobx/issues/2721).

## 3.2.2

### Patch Changes

-   [`2dcfec09`](https://github.com/mobxjs/mobx/commit/2dcfec093533bd12bb564580b14ce6037ee1ebac) [#3172](https://github.com/mobxjs/mobx/pull/3172) Thanks [@urugator](https://github.com/urugator)! - support legacy context

## 3.2.1

### Patch Changes

-   [`320544a5`](https://github.com/mobxjs/mobx/commit/320544a5d0defb1a1524c83c7a5d0a9dee9de001) [#2983](https://github.com/mobxjs/mobx/pull/2983) Thanks [@urugator](https://github.com/urugator)! - Allow force update to be called infinitely times

*   [`10c762cc`](https://github.com/mobxjs/mobx/commit/10c762cce4871f3599bac6acc2c56776e0b4badd) [#2995](https://github.com/mobxjs/mobx/pull/2995) Thanks [@Bnaya](https://github.com/Bnaya)! - Reduce useObserver gc pressure

## 3.2.0

### Patch Changes

-   Updated dependencies [[`28f8a11d`](https://github.com/mobxjs/mobx/commit/28f8a11d8b94f1aca2eec4ae9c5f45c5ea2f4362)]:
    -   mobx@6.1.0

## 3.1.7

### Patch Changes

-   [`592e6e99`](https://github.com/mobxjs/mobx/commit/592e6e996c2d5264e162cfb0921a071c1d815c92) [#2743](https://github.com/mobxjs/mobx/pull/2743) Thanks [@vkrol](https://github.com/vkrol)! - Remove `sideEffects` section in `mobx-react-lite` `package.json`

-   Updated dependencies [[`6b304232`](https://github.com/mobxjs/mobx/commit/6b30423266e5418a3f20389d0bd0eae31f3384d2), [`83b84fd3`](https://github.com/mobxjs/mobx/commit/83b84fd354f2253fdd8ea556e217a92fc2633c00), [`65c7b73b`](https://github.com/mobxjs/mobx/commit/65c7b73b7f0b1a69a1a2786b5f484419d129d10b), [`989390d4`](https://github.com/mobxjs/mobx/commit/989390d46bbe9941b61ac6c6d1292f96445e7cc3), [`dea1cf18`](https://github.com/mobxjs/mobx/commit/dea1cf189b0f43929f4f626229d34a80bd10212e), [`592e6e99`](https://github.com/mobxjs/mobx/commit/592e6e996c2d5264e162cfb0921a071c1d815c92)]:
    -   mobx@6.0.5

## 3.1.6

### Patch Changes

-   [`2f3dcb27`](https://github.com/mobxjs/mobx/commit/2f3dcb274f795ffca4ae724b6b4795958620838d) Thanks [@FredyC](https://github.com/FredyC)! - Fix names of UMD exports [#2517](https://github.com/mobxjs/mobx/issues/2617)

-   Updated dependencies [[`79a09f49`](https://github.com/mobxjs/mobx/commit/79a09f49a9f2baddbab8d89e9a7ac07cffadf624)]:
    -   mobx@6.0.4

## 3.1.5

### Patch Changes

-   [`01a050f7`](https://github.com/mobxjs/mobx/commit/01a050f7603183e6833b7fd948adb4fbe1437f5a) Thanks [@FredyC](https://github.com/FredyC)! - Fix use of react-dom vs react-native

    The `es` folder content is compiled only without transpilation to keep `utils/reactBatchedUpdates` which exists in DOM and RN versions. The bundled `esm` is still kept around too, especially the prod/dev ones that should be utilized in modern browser environments.

## 3.1.4

### Patch Changes

-   [`8bbbc7c0`](https://github.com/mobxjs/mobx/commit/8bbbc7c0df77cd79530add5db2d6a04cfe6d84b1) Thanks [@FredyC](https://github.com/FredyC)! - Fix names of dist files (for real now). Third time is the charm 😅

## 3.1.3

### Patch Changes

-   [`b7aa9d35`](https://github.com/mobxjs/mobx/commit/b7aa9d35432888ee5dd80a6c9dcbc18b04a0346c) Thanks [@FredyC](https://github.com/FredyC)! - Fixed wrong package name for dist files

## 3.1.2

### Patch Changes

-   [`5239db80`](https://github.com/mobxjs/mobx/commit/5239db80cf000026906c28a035725933d4dd6823) Thanks [@FredyC](https://github.com/FredyC)! - Fixed release with missing dist files

## 3.1.1

### Patch Changes

-   [`81a2f865`](https://github.com/mobxjs/mobx/commit/81a2f8654d9656e2e831176e45cbf926fbc364e0) Thanks [@FredyC](https://github.com/FredyC)! - ESM bundles without NODE_ENV present are available in dist folder. This useful for consumption in browser environment that supports ESM Choose either `esm.production.min.js` or `esm.development.js` from `dist` folder.

## 3.1.0

### Minor Changes

-   [`a0e5fea`](https://github.com/mobxjs/mobx-react-lite/commit/a0e5feaeede68b0bac035f60bf2a7edff3fa1269) [#329](https://github.com/mobxjs/mobx-react-lite/pull/329) Thanks [@RoystonS](https://github.com/RoystonS)! - expose `clearTimers` function to tidy up background timers, allowing test frameworks such as Jest to exit immediately

### Patch Changes

-   [`fafb136`](https://github.com/mobxjs/mobx-react-lite/commit/fafb136cce2847b83174cbd15af803442a9a0023) [#332](https://github.com/mobxjs/mobx-react-lite/pull/332) Thanks [@Bnaya](https://github.com/Bnaya)! - Introduce alternative way for managing cleanup of reactions.
    This is internal change and shouldn't affect functionality of the library.

## 3.0.1

### Patch Changes

-   [`570e8d5`](https://github.com/mobxjs/mobx-react-lite/commit/570e8d594bac415cf9a6c6771080fec043161d0b) [#328](https://github.com/mobxjs/mobx-react-lite/pull/328) Thanks [@mweststrate](https://github.com/mweststrate)! - If observable data changed between mount and useEffect, the render reaction would incorrectly be disposed causing incorrect suspension of upstream computed values

*   [`1d6f0a8`](https://github.com/mobxjs/mobx-react-lite/commit/1d6f0a8dd0ff34d7e7cc71946ed670c31193572d) [#326](https://github.com/mobxjs/mobx-react-lite/pull/326) Thanks [@FredyC](https://github.com/FredyC)! - No important changes, just checking new setup for releases.

> Prior 3.0.0 see GitHub releases for changelog
