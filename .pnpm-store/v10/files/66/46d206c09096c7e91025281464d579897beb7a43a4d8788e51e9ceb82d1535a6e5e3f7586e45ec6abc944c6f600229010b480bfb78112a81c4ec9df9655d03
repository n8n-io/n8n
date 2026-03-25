'use strict';

var t = require('lib0/dist/testing.cjs');
var log = require('lib0/dist/logging.cjs');
var Y = require('yjs');
var awareness$1 = require('./awareness.cjs');
var environment = require('lib0/dist/environment.cjs');
require('lib0/dist/encoding.cjs');
require('lib0/dist/decoding.cjs');
require('lib0/dist/time.cjs');
require('lib0/dist/math.cjs');
require('lib0/dist/observable.cjs');
require('lib0/dist/function.cjs');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var t__namespace = /*#__PURE__*/_interopNamespaceDefault(t);
var log__namespace = /*#__PURE__*/_interopNamespaceDefault(log);
var Y__namespace = /*#__PURE__*/_interopNamespaceDefault(Y);

/**
 * @param {t.TestCase} tc
 */
const testAwareness = tc => {
  const doc1 = new Y__namespace.Doc();
  doc1.clientID = 0;
  const doc2 = new Y__namespace.Doc();
  doc2.clientID = 1;
  const aw1 = new awareness$1.Awareness(doc1);
  const aw2 = new awareness$1.Awareness(doc2);
  aw1.on('update', /** @param {any} p */ ({ added, updated, removed }) => {
    const enc = awareness$1.encodeAwarenessUpdate(aw1, added.concat(updated).concat(removed));
    awareness$1.applyAwarenessUpdate(aw2, enc, 'custom');
  });
  let lastChangeLocal = /** @type {any} */ (null);
  aw1.on('change', /** @param {any} change */ change => {
    lastChangeLocal = change;
  });
  let lastChange = /** @type {any} */ (null);
  aw2.on('change', /** @param {any} change */ change => {
    lastChange = change;
  });
  aw1.setLocalState({ x: 3 });
  t__namespace.compare(aw2.getStates().get(0), { x: 3 });
  t__namespace.assert(/** @type {any} */ (aw2.meta.get(0)).clock === 1);
  t__namespace.compare(lastChange.added, [0]);
  // When creating an Awareness instance, the the local client is already marked as available, so it is not updated.
  t__namespace.compare(lastChangeLocal, { added: [], updated: [0], removed: [] });

  // update state
  lastChange = null;
  lastChangeLocal = null;
  aw1.setLocalState({ x: 4 });
  t__namespace.compare(aw2.getStates().get(0), { x: 4 });
  t__namespace.compare(lastChangeLocal, { added: [], updated: [0], removed: [] });
  t__namespace.compare(lastChangeLocal, lastChange);

  lastChange = null;
  lastChangeLocal = null;
  aw1.setLocalState({ x: 4 });
  t__namespace.assert(lastChange === null);
  t__namespace.assert(/** @type {any} */ (aw2.meta.get(0)).clock === 3);
  t__namespace.compare(lastChangeLocal, lastChange);
  aw1.setLocalState(null);
  t__namespace.assert(lastChange.removed.length === 1);
  t__namespace.compare(aw1.getStates().get(0), undefined);
  t__namespace.compare(lastChangeLocal, lastChange);
};

var awareness = /*#__PURE__*/Object.freeze({
  __proto__: null,
  testAwareness: testAwareness
});

/* istanbul ignore if */
if (environment.isBrowser) {
  log__namespace.createVConsole(document.body);
}

t.runTests({
  awareness
}).then(success => {
  /* istanbul ignore next */
  if (environment.isNode) {
    process.exit(success ? 0 : 1);
  }
});
//# sourceMappingURL=test.cjs.map
