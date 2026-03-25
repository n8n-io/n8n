// This file was modified by Oracle on September 21, 2021.
// New capability for multi-factor authentication based on mandatory session
// trackers, that are signaled with an extra single-byte prefix on new
// versions of the MySQL server.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

'use strict';

// Manually extracted from mysql-5.5.23/include/mysql_com.h
exports.LONG_PASSWORD = 0x00000001; /* new more secure passwords */
exports.FOUND_ROWS = 0x00000002; /* found instead of affected rows */
exports.LONG_FLAG = 0x00000004; /* get all column flags */
exports.CONNECT_WITH_DB = 0x00000008; /* one can specify db on connect */
exports.NO_SCHEMA = 0x00000010; /* don't allow database.table.column */
exports.COMPRESS = 0x00000020; /* can use compression protocol */
exports.ODBC = 0x00000040; /* odbc client */
exports.LOCAL_FILES = 0x00000080; /* can use LOAD DATA LOCAL */
exports.IGNORE_SPACE = 0x00000100; /* ignore spaces before '' */
exports.PROTOCOL_41 = 0x00000200; /* new 4.1 protocol */
exports.INTERACTIVE = 0x00000400; /* this is an interactive client */
exports.SSL = 0x00000800; /* switch to ssl after handshake */
exports.IGNORE_SIGPIPE = 0x00001000; /* IGNORE sigpipes */
exports.TRANSACTIONS = 0x00002000; /* client knows about transactions */
exports.RESERVED = 0x00004000; /* old flag for 4.1 protocol  */
exports.SECURE_CONNECTION = 0x00008000; /* new 4.1 authentication */
exports.MULTI_STATEMENTS = 0x00010000; /* enable/disable multi-stmt support */
exports.MULTI_RESULTS = 0x00020000; /* enable/disable multi-results */
exports.PS_MULTI_RESULTS = 0x00040000; /* multi-results in ps-protocol */
exports.PLUGIN_AUTH = 0x00080000; /* client supports plugin authentication */
exports.CONNECT_ATTRS = 0x00100000; /* permits connection attributes */
exports.PLUGIN_AUTH_LENENC_CLIENT_DATA = 0x00200000; /* Understands length-encoded integer for auth response data in Protocol::HandshakeResponse41. */
exports.CAN_HANDLE_EXPIRED_PASSWORDS = 0x00400000; /* Announces support for expired password extension. */
exports.SESSION_TRACK = 0x00800000; /* Can set SERVER_SESSION_STATE_CHANGED in the Status Flags and send session-state change data after a OK packet. */

exports.SSL_VERIFY_SERVER_CERT = 0x40000000;
exports.REMEMBER_OPTIONS = 0x80000000;

exports.MULTI_FACTOR_AUTHENTICATION = 0x10000000; /* multi-factor authentication */
