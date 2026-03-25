// We cannot use `process-polyfill` as the package name due to a bug in Yarn v1. The errors results in a dependency
// conflict with `node-stdlib-browser` which fails to import `process/browser.js`.
// https://github.com/yarnpkg/yarn/issues/6907
// eslint-disable-next-line unicorn/prefer-node-protocol
import process from 'process'

export { process }
export default process
