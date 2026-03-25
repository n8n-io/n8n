import { runTests } from './testing.js'
import * as array from './array.test.js'
import * as broadcastchannel from './broadcastchannel.test.js'
import * as crypto from './crypto.test.js'
import * as rabin from './hash/rabin.test.js'
import * as sha256 from './hash/sha256.test.js'
import * as logging from './logging.test.js'
import * as string from './string.test.js'
import * as encoding from './encoding.test.js'
import * as diff from './diff.test.js'
import * as patienceDiff from './diff/patience.test.js'
import * as testing from './testing.test.js'
import * as indexeddb from './indexeddb.test.js'
import * as indexeddbV2 from './indexeddbV2.test.js'
import * as prng from './prng.test.js'
import * as log from 'lib0/logging'
import * as statistics from './statistics.test.js'
import * as binary from './binary.test.js'
import * as random from './random.test.js'
import * as promise from './promise.test.js'
import * as queue from './queue.test.js'
import * as map from './map.test.js'
import * as eventloop from './eventloop.test.js'
import * as time from './time.test.js'
import * as pair from './pair.test.js'
import * as object from './object.test.js'
import * as observable from './observable.test.js'
import * as pledge from './pledge.test.js'
import * as math from './math.test.js'
import * as number from './number.test.js'
import * as buffer from './buffer.test.js'
import * as set from './set.test.js'
import * as sort from './sort.test.js'
import * as url from './url.test.js'
import * as metric from './metric.test.js'
import * as func from './function.test.js'
import * as storage from './storage.test.js'
import * as list from './list.test.js'
import * as cache from './cache.test.js'
import * as symbol from './symbol.test.js'
import * as traits from './trait/traits.test.js'
import * as schema from './schema.test.js'
import * as delta from './delta/delta.test.js'
import * as deltaPitch from './delta/delta-pitch.test.js'
// import * as deltaBinding from './delta/binding.test.js'
import * as mutex from './mutex.test.js'
import { isBrowser, isNode } from './environment.js'

/* c8 ignore next */
if (isBrowser) {
  log.createVConsole(document.body)
}

runTests({
  array,
  broadcastchannel,
  crypto,
  rabin,
  sha256,
  logging,
  string,
  encoding,
  diff,
  patienceDiff,
  testing,
  indexeddb,
  indexeddbV2,
  prng,
  statistics,
  binary,
  random,
  promise,
  queue,
  map,
  eventloop,
  time,
  pair,
  object,
  observable,
  pledge,
  math,
  number,
  buffer,
  set,
  sort,
  url,
  metric,
  func,
  storage,
  list,
  cache,
  symbol,
  traits,
  schema,
  delta,
  deltaPitch,
  // deltaBinding,
  mutex
}).then(success => {
  /* c8 ignore next */
  if (isNode) {
    process.exit(success ? 0 : 1)
  }
})
