# @vue/reactivity

## Usage Note

This package is inlined into Global & Browser ESM builds of user-facing renderers (e.g. `@vue/runtime-dom`), but also published as a package that can be used standalone. The standalone build should not be used alongside a pre-bundled build of a user-facing renderer, as they will have different internal storage for reactivity connections. A user-facing renderer should re-export all APIs from this package.

For full exposed APIs, see `src/index.ts`.

## Credits

The implementation of this module is inspired by the following prior art in the JavaScript ecosystem:

- [Meteor Tracker](https://docs.meteor.com/api/tracker.html)
- [nx-js/observer-util](https://github.com/nx-js/observer-util)
- [salesforce/observable-membrane](https://github.com/salesforce/observable-membrane)

## Caveats

- Built-in objects are not observed except for `Array`, `Map`, `WeakMap`, `Set` and `WeakSet`.
