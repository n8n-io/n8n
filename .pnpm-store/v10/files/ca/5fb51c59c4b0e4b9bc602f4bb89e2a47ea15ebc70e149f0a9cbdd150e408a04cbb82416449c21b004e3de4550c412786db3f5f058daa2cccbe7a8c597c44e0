import { strictEqual } from 'assert'
// https://github.com/nodejs/import-in-the-middle/issues/139
import * as libServer from 'vue/server-renderer'
// https://github.com/nodejs/import-in-the-middle/issues/144
import * as lib from 'vue'

strictEqual(typeof libServer.renderToString, 'function')
strictEqual(typeof lib.ref, 'function')
