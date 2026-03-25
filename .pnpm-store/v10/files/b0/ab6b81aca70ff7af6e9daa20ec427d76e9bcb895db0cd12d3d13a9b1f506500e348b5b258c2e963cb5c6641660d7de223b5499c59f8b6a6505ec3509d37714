/**
 * Enum for isolation levels
 * @readonly
 * @enum {number}
 */
module.exports = {
  // Makes all records visible
  READ_UNCOMMITTED: 0,

  // non-transactional and COMMITTED transactional records are visible. It returns all data
  // from offsets smaller than the current LSO (last stable offset), and enables the inclusion of
  // the list of aborted transactions in the result, which allows consumers to discard ABORTED
  // transactional records
  READ_COMMITTED: 1,
}
