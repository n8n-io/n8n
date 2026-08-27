// Inert stand-in for `.svg` imports in the frontend vitest harness.
//
// `icons.ts` / `node-icons.ts` statically import ~100 `.svg` files that
// `vite-svg-loader` transforms on demand (async). In jsdom an in-flight
// transform can resolve *after* the environment tears down, surfacing as an
// `EnvironmentTeardownError` that turns an otherwise-green shard red. Aliasing
// every `.svg` import to this empty functional component removes the racy
// transform (see frontend.ts).
export default () => null;
