'use strict';

// Manually extracted from mysql-5.5.23/include/mysql_com.h

/**
  Is raised when a multi-statement transaction
  has been started, either explicitly, by means
  of BEGIN or COMMIT AND CHAIN, or
  implicitly, by the first transactional
  statement, when autocommit=off.
*/
exports.SERVER_STATUS_IN_TRANS = 1;
exports.SERVER_STATUS_AUTOCOMMIT = 2; /* Server in auto_commit mode */
exports.SERVER_MORE_RESULTS_EXISTS = 8; /* Multi query - next query exists */
exports.SERVER_QUERY_NO_GOOD_INDEX_USED = 16;
exports.SERVER_QUERY_NO_INDEX_USED = 32;
/**
  The server was able to fulfill the clients request and opened a
  read-only non-scrollable cursor for a query. This flag comes
  in reply to COM_STMT_EXECUTE and COM_STMT_FETCH commands.
*/
exports.SERVER_STATUS_CURSOR_EXISTS = 64;
/**
  This flag is sent when a read-only cursor is exhausted, in reply to
  COM_STMT_FETCH command.
*/
exports.SERVER_STATUS_LAST_ROW_SENT = 128;
exports.SERVER_STATUS_DB_DROPPED = 256; /* A database was dropped */
exports.SERVER_STATUS_NO_BACKSLASH_ESCAPES = 512;
/**
  Sent to the client if after a prepared statement reprepare
  we discovered that the new statement returns a different
  number of result set columns.
*/
exports.SERVER_STATUS_METADATA_CHANGED = 1024;
exports.SERVER_QUERY_WAS_SLOW = 2048;

/**
  To mark ResultSet containing output parameter values.
*/
exports.SERVER_PS_OUT_PARAMS = 4096;

exports.SERVER_STATUS_IN_TRANS_READONLY = 0x2000; // in a read-only transaction
exports.SERVER_SESSION_STATE_CHANGED = 0x4000;
