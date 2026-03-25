import { strictEqual } from 'assert'

// We dynamically import a specific file that imports the
// native module for this platform and architecture.
//
// This way we know the file exists and the native module can
// be loaded.
const lib = await import(`../fixtures/native-modules/${process.platform}-${process.arch}.js`)

strictEqual(typeof lib.default.crc32, 'function')
