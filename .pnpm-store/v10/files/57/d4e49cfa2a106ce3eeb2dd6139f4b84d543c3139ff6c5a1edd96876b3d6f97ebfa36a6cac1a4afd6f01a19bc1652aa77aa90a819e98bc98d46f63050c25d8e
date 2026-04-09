"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cloneValueForInsertion = cloneValueForInsertion;
// https://w3c.github.io/IndexedDB/#clone-value
// Note that we only need to call this during insertions because the spec does not expect any cloning during retrieval,
// only `StructuredDeserialize()` (e.g. see [1]). This is also only required for values, not keys, since keys do not
// require cloning during insertion (e.g. see [2]).
// [1]: https://w3c.github.io/IndexedDB/#retrieve-multiple-items-from-an-object-store
// [2]: https://w3c.github.io/IndexedDB/#add-or-put
function cloneValueForInsertion(value, transaction) {
  // Assert: transaction’s state is active.
  if (transaction._state !== "active") {
    throw new Error("Assert: transaction state is active");
  }

  // Set transaction’s state to inactive.
  transaction._state = "inactive";
  try {
    // Let serialized be StructuredSerializeForStorage(value).
    // Let clone be ? StructuredDeserialize(serialized, targetRealm).
    // Return clone.
    return structuredClone(value);
  } finally {
    // Set transaction’s state to active.
    transaction._state = "active";
  }
}