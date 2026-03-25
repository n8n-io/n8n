// Copyright (c) 2022, 2025, Oracle and/or its affiliates.
//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const util = require('util');

// define error prefix for all messages
const ERR_PREFIX = "NJS";

const ERR_INTEGRITY_ERROR_CODES = [
  1,     // unique constraint violated
  1400,  // cannot insert NULL
  1438,  // value larger than specified precision
  2290,  // check constraint violated
  2291,  // integrity constraint violated - parent key not found
  2292,  // integrity constraint violated - child record found
  21525, // attribute or collection element violated its constraints
  40479, // internal JSON serializer error
];

// define error number constants (used in JavaScript library)
const ERR_INVALID_POOL = 2;
const ERR_INVALID_CONNECTION = 3;
const ERR_INVALID_PROPERTY_VALUE = 4;
const ERR_INVALID_PARAMETER_VALUE = 5;
const ERR_INVALID_PROPERTY_VALUE_IN_PARAM = 7;
const ERR_INVALID_NUMBER_OF_PARAMETERS = 9;
const ERR_UNSUPPORTED_DATA_TYPE = 10;
const ERR_BIND_VALUE_AND_TYPE_MISMATCH = 11;
const ERR_INVALID_BIND_DATA_TYPE = 12;
const ERR_INVALID_BIND_DIRECTION = 13;
const ERR_NO_TYPE_FOR_CONVERSION = 15;
const ERR_INSUFFICIENT_BUFFER_FOR_BINDS = 16;
const ERR_BUSY_RS = 17;
const ERR_INVALID_RS = 18;
const ERR_NOT_A_QUERY = 19;
const ERR_INVALID_TYPE_FOR_CONVERSION = 21;
const ERR_INVALID_LOB = 22;
const ERR_BUSY_LOB = 23;
const ERR_INSUFFICIENT_MEMORY = 24;
const ERR_INVALID_TYPE_FOR_ARRAY_BIND = 34;
const ERR_REQUIRED_MAX_ARRAY_SIZE = 35;
const ERR_INVALID_ARRAY_SIZE = 36;
const ERR_INCOMPATIBLE_TYPE_ARRAY_BIND = 37;
const ERR_CONN_REQUEST_TIMEOUT = 40;
const ERR_CANNOT_CONVERT_RS_TO_STREAM = 41;
const ERR_CANNOT_INVOKE_RS_METHODS = 42;
const ERR_RS_ALREADY_CONVERTED = 43;
const ERR_INVALID_BIND_UNIT = 44;
const ERR_CANNOT_LOAD_BINARY = 45;
const ERR_POOL_WITH_ALIAS_ALREADY_EXISTS = 46;
const ERR_POOL_WITH_ALIAS_NOT_FOUND = 47;
const ERR_INCOMPATIBLE_TYPE_ARRAY_INDEX_BIND = 52;
const ERR_MIXED_BIND = 55;
const ERR_MISSING_MAX_SIZE_BY_POS = 56;
const ERR_MISSING_MAX_SIZE_BY_NAME = 57;
const ERR_MAX_SIZE_TOO_SMALL = 58;
const ERR_MISSING_TYPE_BY_POS = 59;
const ERR_MISSING_TYPE_BY_NAME = 60;
const ERR_INVALID_SUBSCR = 61;
const ERR_MISSING_SUBSCR_CALLBACK = 62;
const ERR_MISSING_SUBSCR_SQL = 63;
const ERR_POOL_CLOSING = 64;
const ERR_POOL_CLOSED = 65;
const ERR_INVALID_SODA_DOC_CURSOR = 66;
const ERR_NO_BINARY_AVAILABLE = 67;
const ERR_INVALID_ERR_NUM = 68;
const ERR_NODE_TOO_OLD = 69;
const ERR_INVALID_AQ_MESSAGE = 70;
const ERR_DBL_CONNECT_STRING = 75;
const ERR_QUEUE_MAX_EXCEEDED = 76;
const ERR_UNSUPPORTED_DATA_TYPE_IN_JSON = 78;
const ERR_DBL_USER = 80;
const ERR_CONCURRENT_OPS = 81;
const ERR_POOL_RECONFIGURING = 82;
const ERR_POOL_STATISTICS_DISABLED = 83;
const ERR_TOKEN_BASED_AUTH = 84;
const ERR_POOL_TOKEN_BASED_AUTH = 85;
const ERR_CONN_TOKEN_BASED_AUTH = 86;
const ERR_TOKEN_HAS_EXPIRED = 87;
const ERR_NOT_IMPLEMENTED = 89;
const ERR_INIT_ORACLE_CLIENT_ARGS = 90;
const ERR_MISSING_FILE = 91;
const ERR_INVALID_NUMBER_OF_CONNECTIONS = 92;
const ERR_EXEC_MODE_ONLY_FOR_DML = 95;
const ERR_INVALID_BIND_NAME = 97;
const ERR_WRONG_NUMBER_OF_BINDS = 98;
const ERR_BUFFER_LENGTH_INSUFFICIENT = 99;
const ERR_NCHAR_CS_NOT_SUPPORTED = 100;
const ERR_MISSING_CREDENTIALS = 101;
const ERR_UNEXPECTED_END_OF_DATA = 102;
const ERR_UNEXPECTED_MESSAGE_TYPE = 103;
const ERR_POOL_HAS_BUSY_CONNECTIONS = 104;
const ERR_NAN_VALUE = 105;
const ERR_INTERNAL = 106;
const ERR_INVALID_REF_CURSOR = 107;
const ERR_INVALID_TYPE_NUM = 109;
const ERR_INVALID_ORACLE_TYPE_NUM = 110;
const ERR_UNEXPECTED_NEGATIVE_INTEGER = 111;
const ERR_INTEGER_TOO_LARGE = 112;
const ERR_UNEXPECTED_DATA = 113;
const ERR_OSON_FIELD_NAME_LIMITATION = 114;
const ERR_ORACLE_NUMBER_NO_REPR = 115;
const ERR_UNSUPPORTED_VERIFIER_TYPE = 116;
const ERR_THIN_CONNECTION_ALREADY_CREATED = 118;
const ERR_UNSUPPORTED_CONVERSION = 119;
const ERR_FETCH_TYPE_HANDLER_RETURN_VALUE = 120;
const ERR_FETCH_TYPE_HANDLER_TYPE = 121;
const ERR_FETCH_TYPE_HANDLER_CONVERTER = 122;
const ERR_CALL_TIMEOUT_EXCEEDED = 123;
const ERR_EMPTY_CONNECT_STRING = 125;
const ERR_OSON_VERSION_NOT_SUPPORTED = 126;
const ERR_UNKOWN_SERVER_SIDE_PIGGYBACK = 127;
const ERR_UNKNOWN_COLUMN_TYPE_NAME = 128;
const ERR_INVALID_OBJECT_TYPE_NAME = 129;
const ERR_TDS_TYPE_NOT_SUPPORTED = 130;
const ERR_INVALID_COLL_INDEX_SET = 131;
const ERR_INVALID_COLL_INDEX_GET = 132;
const ERR_DELETE_ELEMENTS_OF_VARRAY = 133;
const ERR_WRONG_VALUE_FOR_DBOBJECT_ATTR = 134;
const ERR_WRONG_VALUE_FOR_DBOBJECT_ELEM = 135;
const ERR_WRONG_CRED_FOR_EXTAUTH = 136;
const ERR_MISSING_BIND_VALUE = 137;
const ERR_SERVER_VERSION_NOT_SUPPORTED = 138;
const ERR_UNEXPECTED_XML_TYPE = 139;
const ERR_WRONG_USER_FORMAT_EXTAUTH_PROXY = 140;
const ERR_TOO_MANY_BATCH_ERRORS = 141;
const ERR_WRONG_LENGTH_FOR_DBOBJECT_ATTR = 142;
const ERR_WRONG_LENGTH_FOR_DBOBJECT_ELEM = 143;
const ERR_VECTOR_FORMAT_NOT_SUPPORTED = 144;
const ERR_VECTOR_VERSION_NOT_SUPPORTED = 145;
const ERR_OBJECT_IS_NOT_A_COLLECTION = 146;
const ERR_CURSOR_HAS_BEEN_CLOSED = 147;
const ERR_DML_RETURNING_DUP_BINDS = 149;
const ERR_INVALID_TPC_BEGIN_FLAGS = 150;
const ERR_INVALID_TPC_END_FLAGS = 151;
const ERR_UNKNOWN_TRANSACTION_STATE = 152;
const ERR_INVALID_TRANSACTION_SIZE = 153;
const ERR_INVALID_BRANCH_SIZE = 154;
const ERR_OPERATION_NOT_SUPPORTED_ON_BFILE = 155;
const ERR_OPERATION_ONLY_SUPPORTED_ON_BFILE = 156;
const ERR_EXECMANY_NOT_ALLOWED_ON_QUERIES = 157;
const ERR_VECTOR_SPARSE_INDICES_IS_NOT_ARRAY = 158;
const ERR_VECTOR_SPARSE_VALUES_IS_NOT_ARRAY = 159;
const ERR_VECTOR_SPARSE_DIMS_IS_NOT_INTEGER = 160;
const ERR_VECTOR_SPARSE_INDICES_VALUES_NOT_EQUAL = 161;
const ERR_VECTOR_SPARSE_INVALID_JSON = 162;
const ERR_VECTOR_SPARSE_INVALID_STRING = 163;
const ERR_VECTOR_SPARSE_INVALID_INPUT = 164;
const ERR_VECTOR_SPARSE_INDICES_ELEM_IS_NOT_VALID = 165;
const ERR_DB_FETCH_TYPE_HANDLER_CONVERTER = 166;
const ERR_DB_FETCH_TYPE_HANDLER_RETURN_VALUE = 167;
const ERR_ACCESS_TOKEN = 168;
const ERR_CALLOUT_FN = 169;
const ERR_SESSIONLESS_DIFFERING_METHODS = 170;
const ERR_SESSIONLESS_ALREADY_ACTIVE = 171;
const ERR_SESSIONLESS_INACTIVE = 172;

// Oracle Net layer errors start from 500
const ERR_CONNECTION_CLOSED = 500;
const ERR_CONNECTION_LOSTCONTACT = 501;
const ERR_CONNECTION_INCOMPLETE = 503;
const ERR_PROXY_CONNECTION_FAILURE = 504;
const ERR_TLS_INIT_FAILURE = 505;
const ERR_TLS_AUTH_FAILURE = 506;
const ERR_TLS_DNMATCH_FAILURE = 507;
const ERR_TLS_HOSTMATCH_FAILURE = 508;
const ERR_INVALID_PACKET = 509;
const ERR_CONNECTION_TIMEDOUT = 510;
const ERR_CONNECTION_REFUSED = 511;
const ERR_INVALID_CONNECT_STRING_PARAMETERS = 512;
const ERR_CONNECTION_INBAND = 513;
const ERR_INVALID_CONNECT_STRING_SYNTAX = 514;
const ERR_INVALID_EZCONNECT_SYNTAX = 515;
const ERR_NO_CONFIG_DIR = 516;
const ERR_TNS_ENTRY_NOT_FOUND = 517;
const ERR_INVALID_SERVICE_NAME = 518;
const ERR_INVALID_SID = 519;
const ERR_TNS_NAMES_FILE_MISSING = 520;
const ERR_CONNECTION_EOF = 521;
const ERR_CONFIG_PROVIDER_FAILED_TO_RETRIEVE_CONFIG = 523;
const ERR_REGISTER_HOOKFN_CONFIGPROVIDER = 524;
const ERR_WALLET_TYPE_NOT_SUPPORTED = 529;
const ERR_HOST_NOT_FOUND = 530;
const ERR_ANO_PACKET = 531;
const ERR_ANO_STATUS = 532;
const ERR_ANO_NEGOTIATION = 533;
const ERR_DATA_COMPRESSION = 534;
const ERR_CONFIG_PROVIDER_PARAM_TYPE = 535;

// Oracle SUCCESS_WITH_INFO warning start from 700
const WRN_COMPILATION_CREATE = 700;

// define mapping for ODPI-C, OCI & ORA errors that need to be wrapped
// with NJS errors
const adjustErrorXref = new Map();
adjustErrorXref.set("DPI-1010", ERR_INVALID_CONNECTION);
adjustErrorXref.set("DPI-1024", [ERR_INVALID_COLL_INDEX_GET, 'at index ([0-9]+) does']);
adjustErrorXref.set("DPI-1044", ERR_ORACLE_NUMBER_NO_REPR);
adjustErrorXref.set("DPI-1055", ERR_NAN_VALUE);
adjustErrorXref.set("DPI-1063", ERR_EXEC_MODE_ONLY_FOR_DML);
adjustErrorXref.set("DPI-1067", [ERR_CALL_TIMEOUT_EXCEEDED, "call timeout of ([0-9]+) ms"]);
adjustErrorXref.set("DPI-1080", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("OCI-22303", [ERR_INVALID_OBJECT_TYPE_NAME, 'type "([^"]*"."[^"]*)"']);
adjustErrorXref.set("OCI-22164", ERR_DELETE_ELEMENTS_OF_VARRAY);
adjustErrorXref.set("OCI-22165", [ERR_INVALID_COLL_INDEX_SET, /index \[([0-9]+)\] must be in the range of \[([0-9]+)\] to \[([0-9]+)\]/]);
adjustErrorXref.set("ORA-00022", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00028", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00031", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00045", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00378", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00600", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00602", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00603", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-00609", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-01012", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-01041", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-01043", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-01089", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-01092", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-02396", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-03113", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-03114", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-03122", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-03135", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-12153", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-12537", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-12547", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-12570", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-12583", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-27146", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-28511", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-56600", ERR_CONNECTION_CLOSED);
adjustErrorXref.set("ORA-24338", ERR_INVALID_REF_CURSOR);
adjustErrorXref.set("ORA-25708", ERR_TOKEN_HAS_EXPIRED);
adjustErrorXref.set("ORA-24344", WRN_COMPILATION_CREATE);
adjustErrorXref.set("ORA-26202", ERR_SESSIONLESS_INACTIVE);
adjustErrorXref.set("ORA-26211", ERR_SESSIONLESS_DIFFERING_METHODS);
adjustErrorXref.set("ORA-26216", ERR_SESSIONLESS_ALREADY_ACTIVE);

// define mapping for error messages
const messages = new Map();
messages.set(ERR_INVALID_POOL,                          // NJS-002
  'invalid pool');
messages.set(ERR_INVALID_CONNECTION,                    // NJS-003
  'invalid or closed connection');
messages.set(ERR_INVALID_PROPERTY_VALUE,                // NJS-004
  'invalid value for property "%s"');
messages.set(ERR_INVALID_PARAMETER_VALUE,               // NJS-005
  'invalid value for parameter %d');
messages.set(ERR_INVALID_PROPERTY_VALUE_IN_PARAM,       // NJS-007
  'invalid value for "%s" in parameter %d');
messages.set(ERR_INVALID_NUMBER_OF_PARAMETERS,          // NJS-009
  'invalid number of function parameters: %d provided but expected between %d and %d');
// used in C -- keep synchronized!
messages.set(ERR_UNSUPPORTED_DATA_TYPE,                 // NJS-010
  'unsupported data type %d in column %d');
messages.set(ERR_BIND_VALUE_AND_TYPE_MISMATCH,          // NJS-011
  'encountered bind value and type mismatch');
messages.set(ERR_INVALID_BIND_DATA_TYPE,                // NJS-012
  'encountered invalid bind data type in parameter %d');
messages.set(ERR_INVALID_BIND_DIRECTION,                // NJS-013
  'invalid bind direction');
messages.set(ERR_NO_TYPE_FOR_CONVERSION,                // NJS-015
  'type was not specified for conversion');
// used in C -- keep synchronized!
messages.set(ERR_INSUFFICIENT_BUFFER_FOR_BINDS,         // NJS-016
  'buffer is too small for OUT binds');
messages.set(ERR_BUSY_RS,                               // NJS-017
  'concurrent operations on ResultSet are not allowed');
messages.set(ERR_INVALID_RS,                            // NJS-018
  'invalid ResultSet');
messages.set(ERR_NOT_A_QUERY,                           // NJS-019
  'ResultSet cannot be returned for non-query statements');
messages.set(ERR_INVALID_TYPE_FOR_CONVERSION,           // NJS-021
  'invalid type for conversion specified');
messages.set(ERR_INVALID_LOB,                           // NJS-022
  'invalid Lob');
messages.set(ERR_BUSY_LOB,                              // NJS-023
  'concurrent operations on a Lob are not allowed');
// used in C -- keep synchronized!
messages.set(ERR_INSUFFICIENT_MEMORY,                   // NJS-024
  'memory allocation failed');
messages.set(ERR_INVALID_TYPE_FOR_ARRAY_BIND,           // NJS-034
  'data type is unsupported for array bind');
messages.set(ERR_REQUIRED_MAX_ARRAY_SIZE,               // NJS-035
  'maxArraySize is required for IN OUT array bind');
messages.set(ERR_INVALID_ARRAY_SIZE,                    // NJS-036
  'length of given array is greater than "maxArraySize"');
messages.set(ERR_INCOMPATIBLE_TYPE_ARRAY_BIND,          // NJS-037
  'invalid data type at array index %d for bind ":%s"');
messages.set(ERR_CONN_REQUEST_TIMEOUT,                  // NJS-040
  'connection request timeout. Request exceeded "queueTimeout" of %d');
messages.set(ERR_CANNOT_CONVERT_RS_TO_STREAM,           // NJS-041
  'cannot convert ResultSet to QueryStream after invoking methods');
messages.set(ERR_CANNOT_INVOKE_RS_METHODS,              // NJS-042
  'cannot invoke ResultSet methods after converting to QueryStream');
messages.set(ERR_RS_ALREADY_CONVERTED,                  // NJS-043
  'ResultSet already converted to QueryStream');
messages.set(ERR_INVALID_BIND_UNIT,                     // NJS-044
  'bind object must contain one of the following attributes: "dir", "type", "maxSize", or "val"');
messages.set(ERR_CANNOT_LOAD_BINARY,                    // NJS-045
  'cannot load a node-oracledb Thick mode binary for Node.js. Please try using Thin mode. %s');
messages.set(ERR_POOL_WITH_ALIAS_ALREADY_EXISTS,        // NJS-046
  'pool alias "%s" already exists in the connection pool cache');
messages.set(ERR_POOL_WITH_ALIAS_NOT_FOUND,             // NJS-047
  'pool alias "%s" not found in connection pool cache');
messages.set(ERR_INCOMPATIBLE_TYPE_ARRAY_INDEX_BIND,    // NJS-052
  'invalid data type at array index %d for bind position %d');
messages.set(ERR_MIXED_BIND,                            // NJS-055
  'binding by position and name cannot be mixed');
messages.set(ERR_MISSING_MAX_SIZE_BY_POS,               // NJS-056
  'maxSize for bind position %d must be specified and be greater than zero');
messages.set(ERR_MISSING_MAX_SIZE_BY_NAME,              // NJS-057
  'maxSize for bind "%s" must be specified and greater than zero');
messages.set(ERR_MAX_SIZE_TOO_SMALL,                    // NJS-058
  'maxSize of %d is too small for value of length %d in row %d');
messages.set(ERR_MISSING_TYPE_BY_POS,                   // NJS-059
  'type must be specified for bind position %d');
messages.set(ERR_MISSING_TYPE_BY_NAME,                  // NJS-060
  'type must be specified for bind "%s"');
messages.set(ERR_INVALID_SUBSCR,                        // NJS-061
  'invalid subscription');
messages.set(ERR_MISSING_SUBSCR_CALLBACK,               // NJS-062
  'subscription notification callback missing');
messages.set(ERR_MISSING_SUBSCR_SQL,                    // NJS-063
  'subscription notification SQL missing');
messages.set(ERR_POOL_CLOSING,                          // NJS-064
  'connection pool is closing');
messages.set(ERR_POOL_CLOSED,                           // NJS-065
  'connection pool was closed');
messages.set(ERR_INVALID_SODA_DOC_CURSOR,               // NJS-066
  'invalid SODA document cursor');
messages.set(ERR_NO_BINARY_AVAILABLE,                   // NJS-067
  'a pre-built node-oracledb Thick mode binary was not found for %s');
messages.set(ERR_INVALID_ERR_NUM,                       // NJS-068
  'invalid error number %d supplied');
messages.set(ERR_NODE_TOO_OLD,                          // NJS-069
  'node-oracledb %s requires Node.js %s or later');
messages.set(ERR_INVALID_AQ_MESSAGE,                    // NJS-070
  'message must be a string, buffer, database object or an object containing a payload property which itself is a string, buffer or database object');
messages.set(ERR_DBL_CONNECT_STRING,                    // NJS-075
  'only one of "connectString" and "connectionString" can be used');
messages.set(ERR_QUEUE_MAX_EXCEEDED,                    // NJS-076
  'connection request rejected. Pool queue length "queueMax" %d reached');
// used in C -- keep synchronized!
messages.set(ERR_UNSUPPORTED_DATA_TYPE_IN_JSON,         // NJS-078
  'unsupported data type %d in JSON value');
messages.set(ERR_DBL_USER,                              // NJS-080
  'only one of "user" and "username" can be used');
messages.set(ERR_CONCURRENT_OPS,                        // NJS-081
  'concurrent operations on a connection are disabled');
messages.set(ERR_POOL_RECONFIGURING,                    // NJS-082
  'connection pool is being reconfigured');
messages.set(ERR_POOL_STATISTICS_DISABLED,              // NJS-083
  'pool statistics are not enabled');
messages.set(ERR_TOKEN_BASED_AUTH,                      // NJS-084
  'invalid access token');
messages.set(ERR_POOL_TOKEN_BASED_AUTH,                 // NJS-085
  'invalid connection pool configuration with token-based authentication. The "homogeneous" and "externalAuth" attributes must be set to true');
messages.set(ERR_CONN_TOKEN_BASED_AUTH,                 // NJS-086
  'invalid standalone configuration with token-based authentication. The "externalAuth" attribute must be set to true');
messages.set(ERR_TOKEN_HAS_EXPIRED,                     // NJS-087
  'access token has expired');
messages.set(ERR_NOT_IMPLEMENTED,                       // NJS-089
  '%s is not supported by node-oracledb in Thin mode');
messages.set(ERR_INIT_ORACLE_CLIENT_ARGS,               // NJS-090
  'initOracleClient() was already called with different arguments');
messages.set(ERR_MISSING_FILE,                          // NJS-091
  'file %s is missing');
messages.set(ERR_INVALID_NUMBER_OF_CONNECTIONS,         // NJS-092
  '"poolMax" %d must be greater than or equal to "poolMin" %d');
messages.set(ERR_EXEC_MODE_ONLY_FOR_DML,                // NJS-095
  'setting "batchErrors" or "dmlRowCounts" to true is only permitted for DML statements');
messages.set(ERR_INVALID_BIND_NAME,                     // NJS-097
  'no bind placeholder named ":%s" was found in the statement text');
messages.set(ERR_WRONG_NUMBER_OF_BINDS,                 // NJS-098
  '%s bind placeholders were used in the SQL statement but %s bind values were provided');
messages.set(ERR_BUFFER_LENGTH_INSUFFICIENT,            // NJS-099
  'internal error: buffer of length %s insufficient to hold %s bytes');
messages.set(ERR_NCHAR_CS_NOT_SUPPORTED,                // NJS-100
  'national character set id %d is not supported by node-oracledb in Thin mode');
messages.set(ERR_MISSING_CREDENTIALS,                   // NJS-101
  'no credentials specified');
messages.set(ERR_UNEXPECTED_END_OF_DATA,                // NJS-102
  'unexpected end of data: want %d bytes but only %d bytes are available');
messages.set(ERR_UNEXPECTED_MESSAGE_TYPE,               // NJS-103
  'unexpected message type %d received at position %d of packet %d');
messages.set(ERR_POOL_HAS_BUSY_CONNECTIONS,             // NJS-104
  'connection pool cannot be closed because connections are busy');
messages.set(ERR_NAN_VALUE,                             // NJS-105
  'value is not a number (NaN) and cannot be used in Oracle Database numbers');
messages.set(ERR_INTERNAL,                              // NJS-106
  'internal error: %s');
messages.set(ERR_INVALID_REF_CURSOR,                    // NJS-107
  'invalid cursor');
messages.set(ERR_INVALID_TYPE_NUM,                      // NJS-109
  'invalid type number %d');
messages.set(ERR_INVALID_ORACLE_TYPE_NUM,               // NJS-110
  'invalid Oracle type number %d [csfrm: %d]');
messages.set(ERR_UNEXPECTED_NEGATIVE_INTEGER,           // NJS-111
  'internal error: read a negative integer when expecting a positive integer at position %d of packet %d');
messages.set(ERR_INTEGER_TOO_LARGE,                     // NJS-112
  'internal error: read integer of length %d when expecting integer of no more than length %d at position %d of packet %d');
messages.set(ERR_UNEXPECTED_DATA,                       // NJS-113
  'unexpected data received: %s');
messages.set(ERR_OSON_FIELD_NAME_LIMITATION,            // NJS-114
  'OSON field names may not exceed %d UTF-8 encoded bytes');
messages.set(ERR_ORACLE_NUMBER_NO_REPR,                 // NJS-115
  'value cannot be represented as an Oracle Database number');
messages.set(ERR_UNSUPPORTED_VERIFIER_TYPE,             // NJS-116
  'password verifier type 0x%s is not supported by node-oracledb in Thin mode');
messages.set(ERR_THIN_CONNECTION_ALREADY_CREATED,       // NJS-118
  'node-oracledb Thick mode cannot be enabled because a Thin mode connection has already been created');
messages.set(ERR_UNSUPPORTED_CONVERSION,                // NJS-119
  'conversion from type %s to type %s is not supported');
messages.set(ERR_FETCH_TYPE_HANDLER_RETURN_VALUE,       // NJS-120
  'fetchTypeHandler return value must be an object');
messages.set(ERR_FETCH_TYPE_HANDLER_TYPE,               // NJS-121
  'fetchTypeHandler return value attribute "type" must be a valid database type');
messages.set(ERR_FETCH_TYPE_HANDLER_CONVERTER,          // NJS-122
  'fetchTypeHandler return value attribute "converter" must be a function');
messages.set(ERR_CALL_TIMEOUT_EXCEEDED,                 // NJS-123
  'call timeout of %d ms exceeded');
messages.set(ERR_EMPTY_CONNECT_STRING,                  // NJS-125
  '"connectString" cannot be empty or undefined. Bequeath connections are not supported in Thin mode');
messages.set(ERR_OSON_VERSION_NOT_SUPPORTED,            // NJS-126
  'OSON version %s is not supported');
messages.set(ERR_UNKOWN_SERVER_SIDE_PIGGYBACK,          // NJS-127
  'internal error: unknown server side piggyback opcode %s');
messages.set(ERR_UNKNOWN_COLUMN_TYPE_NAME,              // NJS-128
  'internal error: unknown column type name "%s"');
messages.set(ERR_INVALID_OBJECT_TYPE_NAME,              // NJS-129
  'invalid object type name: "%s"');
messages.set(ERR_TDS_TYPE_NOT_SUPPORTED,                // NJS-130
  'Oracle TDS data type %d is not supported');
messages.set(ERR_INVALID_COLL_INDEX_SET,                // NJS-131
  'given index [%d] must be in the range of [%d] to [%d]');
messages.set(ERR_INVALID_COLL_INDEX_GET,                // NJS-132
  'element at index %d does not exist');
messages.set(ERR_DELETE_ELEMENTS_OF_VARRAY,             // NJS-133
  'cannot delete elements of a VARRAY');
messages.set(ERR_WRONG_VALUE_FOR_DBOBJECT_ATTR,         // NJS-134
  'value is of wrong type for attribute %s of object %s');
messages.set(ERR_WRONG_VALUE_FOR_DBOBJECT_ELEM,         // NJS-135
  'value is of wrong type for an element of object %s');
messages.set(ERR_WRONG_CRED_FOR_EXTAUTH,                // NJS-136
  'user name and password cannot be set when using external authentication');
messages.set(ERR_MISSING_BIND_VALUE,                    // NJS-137
  'a bind variable replacement value for placeholder ":%s" was not provided');
messages.set(ERR_SERVER_VERSION_NOT_SUPPORTED,          // NJS-138
  'connections to this database server version are not supported by node-oracledb in Thin mode');
messages.set(ERR_UNEXPECTED_XML_TYPE,                   // NJS-139
  'unexpected XML type with flag %d');
messages.set(ERR_WRONG_USER_FORMAT_EXTAUTH_PROXY,       // NJS-140
  'user name must be enclosed in [] when using external authentication with a proxy user');
messages.set(ERR_TOO_MANY_BATCH_ERRORS,                 // NJS-141
  'the number of batch errors from executemany() exceeds 65535');
messages.set(ERR_WRONG_LENGTH_FOR_DBOBJECT_ATTR,        // NJS-142
  'value too large for attribute %s of object %s (actual: %d, maximum: %d)');
messages.set(ERR_WRONG_LENGTH_FOR_DBOBJECT_ELEM,        // NJS-143
  'value too large for element %d of object %s (actual: %d, maximum: %d)');
messages.set(ERR_VECTOR_FORMAT_NOT_SUPPORTED,           // NJS-144
  'VECTOR format %d is not supported');
messages.set(ERR_VECTOR_VERSION_NOT_SUPPORTED,          // NJS-145
  'VECTOR version %d is not supported');
messages.set(ERR_OBJECT_IS_NOT_A_COLLECTION,            // NJS-146
  'object %s is not a collection');
messages.set(ERR_CURSOR_HAS_BEEN_CLOSED,                // NJS-147
  'cursor has been closed by the database');
messages.set(ERR_DML_RETURNING_DUP_BINDS,               // NJS-149
  'the bind variable placeholder "%s" cannot be used both before and after the RETURNING clause in a DML RETURNING statement');
messages.set(ERR_INVALID_TPC_BEGIN_FLAGS,               // NJS-150
  'invalid flags for tpcBegin() in Two Phase Commit');
messages.set(ERR_INVALID_TPC_END_FLAGS,                 // NJS-151
  'invalid flags for tpcEnd() in Two Phase Commit');
messages.set(ERR_UNKNOWN_TRANSACTION_STATE,             // NJS-152
  'internal error: unknown transaction state {state} in Two Phase Commit');
messages.set(ERR_INVALID_TRANSACTION_SIZE,              // NJS-153
  'size of the transaction ID must be non-zero and must not exceed 64. Its current size is %d.');
messages.set(ERR_INVALID_BRANCH_SIZE,                   // NJS-154
  'size of the branch ID is %d and cannot exceed 64');
messages.set(ERR_OPERATION_NOT_SUPPORTED_ON_BFILE,      // NJS-155
  'operation is not supported on BFILE LOBs');
messages.set(ERR_OPERATION_ONLY_SUPPORTED_ON_BFILE,     // NJS-156
  'operation is only supported on BFILE LOBs');
messages.set(ERR_EXECMANY_NOT_ALLOWED_ON_QUERIES,       // NJS-157
  'executeMany() cannot be used with SELECT statement or WITH SQL clause');
messages.set(ERR_VECTOR_SPARSE_INDICES_IS_NOT_ARRAY,    // NJS-158
  'SPARSE VECTOR indices is not Uint32Array or an Array');
messages.set(ERR_VECTOR_SPARSE_VALUES_IS_NOT_ARRAY,     // NJS-159
  'SPARSE VECTOR values is not an Array');
messages.set(ERR_VECTOR_SPARSE_DIMS_IS_NOT_INTEGER,     // NJS-160
  'SPARSE VECTOR dimensions is not an Positive Integer');
messages.set(ERR_VECTOR_SPARSE_INDICES_VALUES_NOT_EQUAL, // NJS-161
  'SPARSE VECTOR indices and values must be of same length');
messages.set(ERR_VECTOR_SPARSE_INVALID_JSON,           // NJS-162
  'SPARSE VECTOR string data is not valid JSON');
messages.set(ERR_VECTOR_SPARSE_INVALID_STRING,         // NJS-163
  'SPARSE VECTOR string data Array should have exactly 3 elements');
messages.set(ERR_VECTOR_SPARSE_INVALID_INPUT,           // NJS-164
  'SPARSE VECTOR Invalid Input Data');
messages.set(ERR_VECTOR_SPARSE_INDICES_ELEM_IS_NOT_VALID,    // NJS-165
  'SPARSE VECTOR indices element at index %d is not valid');
messages.set(ERR_DB_FETCH_TYPE_HANDLER_CONVERTER,       // NJS-166
  'DBFetchTypeHandler return value attribute "converter" must be a function');
messages.set(ERR_DB_FETCH_TYPE_HANDLER_RETURN_VALUE,    // NJS-167
  'DBFetchTypeHandler return value must be an object');
messages.set(ERR_ACCESS_TOKEN,                          // NJS-168
  'access token function failed.');
messages.set(ERR_CALLOUT_FN,                            // NJS-169
  'External function call failed.');
messages.set(ERR_SESSIONLESS_DIFFERING_METHODS,         //NJS-170
  'Different ways to start or suspend sessionless transactions are being used(server procedures and client APIs)');
messages.set(ERR_SESSIONLESS_ALREADY_ACTIVE,            //NJS-171
  'Suspend, commit or rollback the currently active sessionless transaction before beginning or resuming another one.');
messages.set(ERR_SESSIONLESS_INACTIVE,                  //NJS-172
  'No sessionless transaction is active');

// Oracle Net layer errors

messages.set(ERR_CONNECTION_CLOSED,                     // NJS-500
  'connection to Oracle Database was closed or broken');
messages.set(ERR_CONNECTION_LOSTCONTACT,                // NJS-501
  'connection to host %s port %d terminated unexpectedly. (CONNECTION_ID=%s)\n%s');
messages.set(ERR_CONNECTION_INCOMPLETE,                 // NJS-503
  'connection to host %s port %d could not be established. (CONNECTION_ID=%s)\n%s');
messages.set(ERR_PROXY_CONNECTION_FAILURE,              // NJS-504
  'connection establishment through a web proxy at host %s port %d failed. (CONNECTION_ID=%s)\n%s');
messages.set(ERR_TLS_INIT_FAILURE,                      // NJS-505
  'unable to initiate TLS connection. Please check if wallet credentials are valid\n%s');
messages.set(ERR_TLS_AUTH_FAILURE,                      // NJS-506
  'connection to host %s port %d encountered TLS handshake failure. (CONNECTION_ID=%s)\n%s');
messages.set(ERR_TLS_DNMATCH_FAILURE,                   // NJS-507
  'TLS detected an invalid certificate. Server DN in certificate does not match the specified DN');
messages.set(ERR_TLS_HOSTMATCH_FAILURE,                 // NJS-508
  'TLS detected an invalid certificate. %s not present in certificate');
messages.set(ERR_INVALID_PACKET,                        // NJS-509
  'internal error: invalid packet type or malformed packet received');
messages.set(ERR_CONNECTION_TIMEDOUT,                   // NJS-510
  'connection to host %s port %d timed out. Request exceeded "%s" of %d seconds. (CONNECTION_ID=%s)');
messages.set(ERR_CONNECTION_REFUSED,                    // NJS-511
  'connection to listener at host %s port %d was refused. (CONNECTION_ID=%s)\nCause: %s');
messages.set(ERR_INVALID_CONNECT_STRING_PARAMETERS,     // NJS-512
  'invalid connection string parameters.\n%s');
messages.set(ERR_CONNECTION_INBAND,                     // NJS-513
  'error received through in-band notification: %s');
messages.set(ERR_INVALID_CONNECT_STRING_SYNTAX,         // NJS-514
  'syntax error in connection string');
messages.set(ERR_INVALID_EZCONNECT_SYNTAX,              // NJS-515
  'error in Easy Connect connection string: %s: %s');
messages.set(ERR_NO_CONFIG_DIR,                         // NJS-516
  'no configuration directory set or available to search for tnsnames.ora');
messages.set(ERR_TNS_ENTRY_NOT_FOUND,                   // NJS-517
  'cannot connect to Oracle Database. Unable to find "%s" in "%s"');
messages.set(ERR_INVALID_SERVICE_NAME,                  // NJS-518
  'cannot connect to Oracle Database. Service "%s" is not registered with the listener at host %s port %s. (CONNECTION_ID=%s)');
messages.set(ERR_INVALID_SID,                           // NJS-519
  'cannot connect to Oracle Database. SID "%s" is not registered with the listener at host %s port %s. (CONNECTION_ID=%s)');
messages.set(ERR_TNS_NAMES_FILE_MISSING,                // NJS-520
  'cannot connect to Oracle Database. File tnsnames.ora not found in %s');
messages.set(ERR_CONNECTION_EOF,                        // NJS-521
  'connection to host %s port %d received end-of-file on communication channel. (CONNECTION_ID=%s)');
messages.set(ERR_CONFIG_PROVIDER_FAILED_TO_RETRIEVE_CONFIG,   // NJS-523
  'Failed to retrieve configuration from Centralized Configuration Provider:\n %s');
messages.set(ERR_REGISTER_HOOKFN_CONFIGPROVIDER,         // NJS-524
  '%s Configuration provider plugin not registered. Please register the hook function for the same');
messages.set(ERR_WALLET_TYPE_NOT_SUPPORTED,             // NJS-529
  'Invalid wallet content format. Supported format is PEM');
messages.set(ERR_HOST_NOT_FOUND,                        // NJS-530
  'The host addresses or URLs provided by the connect string are incorrect or unresolvable in your network.');
messages.set(ERR_ANO_PACKET,                            // NJS-531
  'Error in Advanced Networking Option packet received from the server');
messages.set(ERR_ANO_STATUS,                            // NJS-532
  '%s service recieved status failure');
messages.set(ERR_ANO_NEGOTIATION,                       // NJS-533
  'Advanced Networking Option service negotiation failed. Native Network Encryption and DataIntegrity only supported in node-oracledb thick mode.\nCause: ORA-%s');
messages.set(ERR_DATA_COMPRESSION, 'Error during data compression/decompression: %s\n'); //NJS-534
// Oracle SUCCESS_WITH_INFO warning
messages.set(ERR_CONFIG_PROVIDER_PARAM_TYPE,               // NJS-535
  'Parameter does not have a valid type: %s\n');
messages.set(WRN_COMPILATION_CREATE,                    // NJS-700
  'creation succeeded with compilation errors');

//-----------------------------------------------------------------------------
// assert()
//
// Checks the condition, and if the condition is not true, throws an exception
// using the specified error number and arguments.
//-----------------------------------------------------------------------------
function assert(condition) {
  if (!condition) {
    const args = Array.prototype.slice.call(arguments, 1);
    throwErr(...args);
  }
}

//-----------------------------------------------------------------------------
// assertArgCount()
//
// Asserts that the argument count falls between the minimum and maximum number
// of arguments.
//-----------------------------------------------------------------------------
function assertArgCount(args, minArgCount, maxArgCount) {
  assert(args.length >= minArgCount && args.length <= maxArgCount,
    ERR_INVALID_NUMBER_OF_PARAMETERS, args.length, minArgCount, maxArgCount);
}

//-----------------------------------------------------------------------------
// assertParamPropBool()
//
// Asserts that the property value of a parameter is a boolean value (or
// undefined).
//-----------------------------------------------------------------------------
function assertParamPropBool(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(typeof obj[propName] === 'boolean', parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropFunction()
//
// Asserts that the property value of a parameter is a function (or undefined).
//-----------------------------------------------------------------------------
function assertParamPropFunction(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(typeof obj[propName] === 'function', parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropInt()
//
// Asserts that the property value of a parameter is an integer value (or
// undefined).
//-----------------------------------------------------------------------------
function assertParamPropInt(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(Number.isInteger(obj[propName]), parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropUnsignedInt()
//
// Asserts that the property value of a parameter is a positive integer value
// (or undefined).
//-----------------------------------------------------------------------------
function assertParamPropUnsignedInt(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(Number.isInteger(obj[propName]) && obj[propName] >= 0,
      parameterNum, propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropUnsignedIntNonZero()
//
// Asserts that the property value of a parameter is a positive integer value
// (or undefined).
//-----------------------------------------------------------------------------
function assertParamPropUnsignedIntNonZero(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(Number.isInteger(obj[propName]) && obj[propName] > 0,
      parameterNum, propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropString()
//
// Asserts that the property value of a parameter is a string value (or undefined).
//-----------------------------------------------------------------------------
function assertParamPropString(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(typeof obj[propName] === 'string', parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropValue()
//
// Asserts that the property value of a parameter passes the specified
// condition.
//-----------------------------------------------------------------------------
function assertParamPropValue(condition, parameterNum, propName) {
  assert(condition, ERR_INVALID_PROPERTY_VALUE_IN_PARAM, propName,
    parameterNum);
}

//-----------------------------------------------------------------------------
// assertParamValue()
//
// Asserts that the parameter value passes the specified condition.
//-----------------------------------------------------------------------------
function assertParamValue(condition, parameterNum) {
  assert(condition, ERR_INVALID_PARAMETER_VALUE, parameterNum);
}

//-----------------------------------------------------------------------------
// assertPropValue()
//
// Asserts that the property value passes the specified condition.
//-----------------------------------------------------------------------------
function assertPropValue(condition, propName) {
  assert(condition, ERR_INVALID_PROPERTY_VALUE, propName);
}

//-----------------------------------------------------------------------------
// getErr()
//
// Returns an error object with the given error number after formatting it with
// the given arguments.
//-----------------------------------------------------------------------------
function getErr(errorNum) {
  let baseText = messages.get(errorNum);
  let args = [...arguments];
  if (!baseText) {
    args = [undefined, errorNum];
    errorNum = ERR_INVALID_ERR_NUM;
    baseText = messages.get(errorNum);
  }
  const errorNumStr = errorNum.toString().padStart(3, '0');
  const code = `${ERR_PREFIX}-${errorNumStr}`;
  args[0] = `${code}: ${baseText}`;
  const err = new Error(util.format(...args));
  err.code = code;
  err.isRecoverable = (errorNum === ERR_CONNECTION_CLOSED);
  Error.captureStackTrace(err, getErr);
  return err;
}

//-----------------------------------------------------------------------------
// throwErr()
//
// Throws an error with the given error number after formatting it with the
// given arguments.
//-----------------------------------------------------------------------------
function throwErr() {
  throw (getErr(...arguments));
}

function throwErrWithORAError() {
  const err =  (getErr(...arguments));
  const pos = err.message.indexOf("ORA-");
  const oraError = err.message.substring(pos + 4, pos + 9);
  err.message = err.message + '\nHelp: https://docs.oracle.com/error-help/db/ora-' + oraError;
  throw err;
}

//-----------------------------------------------------------------------------
// throwNotImplemented()
//
// Throws an error that the feature is not supported in Thin mode
//-----------------------------------------------------------------------------
function throwNotImplemented(feature) {
  throwErr(ERR_NOT_IMPLEMENTED, feature);
}


//-----------------------------------------------------------------------------
// transformErr()
//
// Adjusts the supplied error, if necessary, by looking for specific ODPI-C and
// Oracle errors and replacing them with driver specific errors.
//-----------------------------------------------------------------------------
function transformErr(err, fnOpt) {
  if (!err.code) {
    const pos = err.message.indexOf(":");
    if (pos > 0) {
      err.code = err.message.substr(0, pos);
      /* add Oracle Database Error Help Portal URL for database error
         messages, but only in thin mode since this is done
         automatically in thick mode with Oracle Client 23ai and higher
      */
      const settings = require('./settings.js');
      if (err.errorNum && settings.thin) {
        err.message += '\n' + 'Help: https://docs.oracle.com/error-help/db/ora-' +
          `${err.errorNum.toString().padStart(5, '0')}/`;
      }
      if (adjustErrorXref.has(err.code)) {
        let args = [];
        let driverErrorNum;
        const driverErrorInfo = adjustErrorXref.get(err.code);
        if (typeof driverErrorInfo === 'number') {
          driverErrorNum = driverErrorInfo;
        } else {
          driverErrorNum = driverErrorInfo[0];
          const pattern = driverErrorInfo[1];
          const results = err.message.match(pattern);
          if (results) {
            args = results.slice(1);
          }
        }
        const newErr = getErr(driverErrorNum, ...args);
        err.code = newErr.code;
        err.message = newErr.message + "\n" + err.message;
      }
    }
  }

  if (err.requiresStackCapture) {
    delete err.requiresStackCapture;
    Error.captureStackTrace(err, fnOpt);
  }
  return err;
}

//-----------------------------------------------------------------------------
// throwWrapErr()
//
// Throws error by wrapping exceptions with a specific error.
//-----------------------------------------------------------------------------
function throwWrapErr(err, fnOpt) {
  const newErr = getErr(fnOpt);
  newErr.stack = err.stack;
  throw newErr;
}

// define exports
module.exports = {
  ERR_INTEGRITY_ERROR_CODES,
  ERR_INVALID_POOL,
  ERR_INVALID_CONNECTION,
  ERR_INVALID_PROPERTY_VALUE,
  ERR_INVALID_PARAMETER_VALUE,
  ERR_INVALID_PROPERTY_VALUE_IN_PARAM,
  ERR_INVALID_NUMBER_OF_PARAMETERS,
  ERR_UNSUPPORTED_DATA_TYPE,
  ERR_BIND_VALUE_AND_TYPE_MISMATCH,
  ERR_INVALID_BIND_DATA_TYPE,
  ERR_INVALID_BIND_DIRECTION,
  ERR_NO_TYPE_FOR_CONVERSION,
  ERR_INSUFFICIENT_BUFFER_FOR_BINDS,
  ERR_BUSY_RS,
  ERR_INVALID_RS,
  ERR_NOT_A_QUERY,
  ERR_INVALID_TYPE_FOR_CONVERSION,
  ERR_INVALID_LOB,
  ERR_BUSY_LOB,
  ERR_INSUFFICIENT_MEMORY,
  ERR_INVALID_TYPE_FOR_ARRAY_BIND,
  ERR_REQUIRED_MAX_ARRAY_SIZE,
  ERR_INVALID_ARRAY_SIZE,
  ERR_INCOMPATIBLE_TYPE_ARRAY_BIND,
  ERR_CONN_REQUEST_TIMEOUT,
  ERR_CANNOT_CONVERT_RS_TO_STREAM,
  ERR_CANNOT_INVOKE_RS_METHODS,
  ERR_RS_ALREADY_CONVERTED,
  ERR_INVALID_BIND_UNIT,
  ERR_CANNOT_LOAD_BINARY,
  ERR_POOL_WITH_ALIAS_ALREADY_EXISTS,
  ERR_POOL_WITH_ALIAS_NOT_FOUND,
  ERR_INCOMPATIBLE_TYPE_ARRAY_INDEX_BIND,
  ERR_MIXED_BIND,
  ERR_MISSING_MAX_SIZE_BY_POS,
  ERR_MISSING_MAX_SIZE_BY_NAME,
  ERR_MAX_SIZE_TOO_SMALL,
  ERR_MISSING_TYPE_BY_POS,
  ERR_MISSING_TYPE_BY_NAME,
  ERR_INVALID_SUBSCR,
  ERR_MISSING_SUBSCR_CALLBACK,
  ERR_MISSING_SUBSCR_SQL,
  ERR_POOL_CLOSING,
  ERR_POOL_CLOSED,
  ERR_INVALID_SODA_DOC_CURSOR,
  ERR_NO_BINARY_AVAILABLE,
  ERR_INVALID_ERR_NUM,
  ERR_NODE_TOO_OLD,
  ERR_INVALID_AQ_MESSAGE,
  ERR_DBL_CONNECT_STRING,
  ERR_QUEUE_MAX_EXCEEDED,
  ERR_UNSUPPORTED_DATA_TYPE_IN_JSON,
  ERR_DBL_USER,
  ERR_CONCURRENT_OPS,
  ERR_POOL_RECONFIGURING,
  ERR_POOL_STATISTICS_DISABLED,
  ERR_TOKEN_BASED_AUTH,
  ERR_POOL_TOKEN_BASED_AUTH,
  ERR_CONN_TOKEN_BASED_AUTH,
  ERR_TOKEN_HAS_EXPIRED,
  ERR_NOT_IMPLEMENTED,
  ERR_INIT_ORACLE_CLIENT_ARGS,
  ERR_MISSING_FILE,
  ERR_INVALID_NUMBER_OF_CONNECTIONS,
  ERR_EXEC_MODE_ONLY_FOR_DML,
  ERR_CONNECTION_CLOSED,
  ERR_CONNECTION_LOSTCONTACT,
  ERR_CONNECTION_INCOMPLETE,
  ERR_PROXY_CONNECTION_FAILURE,
  ERR_TLS_INIT_FAILURE,
  ERR_TLS_AUTH_FAILURE,
  ERR_TLS_DNMATCH_FAILURE,
  ERR_TLS_HOSTMATCH_FAILURE,
  ERR_INVALID_PACKET,
  ERR_CONNECTION_TIMEDOUT,
  ERR_CONNECTION_REFUSED,
  ERR_INVALID_CONNECT_STRING_PARAMETERS,
  ERR_CONNECTION_INBAND,
  ERR_INVALID_CONNECT_STRING_SYNTAX,
  ERR_INVALID_EZCONNECT_SYNTAX,
  ERR_NO_CONFIG_DIR,
  ERR_TNS_ENTRY_NOT_FOUND,
  ERR_CONNECTION_EOF,
  ERR_CONFIG_PROVIDER_FAILED_TO_RETRIEVE_CONFIG,
  ERR_CONFIG_PROVIDER_PARAM_TYPE,
  ERR_REGISTER_HOOKFN_CONFIGPROVIDER,
  ERR_DATA_COMPRESSION,
  ERR_WALLET_TYPE_NOT_SUPPORTED,
  ERR_HOST_NOT_FOUND,
  ERR_ANO_PACKET,
  ERR_ANO_STATUS,
  ERR_ANO_NEGOTIATION,
  ERR_INVALID_BIND_NAME,
  ERR_WRONG_NUMBER_OF_BINDS,
  ERR_BUFFER_LENGTH_INSUFFICIENT,
  ERR_NCHAR_CS_NOT_SUPPORTED,
  ERR_MISSING_CREDENTIALS,
  ERR_UNEXPECTED_END_OF_DATA,
  ERR_UNEXPECTED_MESSAGE_TYPE,
  ERR_POOL_HAS_BUSY_CONNECTIONS,
  ERR_INTERNAL,
  ERR_INVALID_REF_CURSOR,
  ERR_UNSUPPORTED_VERIFIER_TYPE,
  ERR_NAN_VALUE,
  ERR_ORACLE_NUMBER_NO_REPR,
  ERR_INVALID_SERVICE_NAME,
  ERR_INVALID_SID,
  ERR_TNS_NAMES_FILE_MISSING,
  ERR_INVALID_TYPE_NUM,
  ERR_INVALID_ORACLE_TYPE_NUM,
  ERR_UNEXPECTED_NEGATIVE_INTEGER,
  ERR_INTEGER_TOO_LARGE,
  ERR_UNEXPECTED_DATA,
  ERR_OSON_FIELD_NAME_LIMITATION,
  ERR_OSON_VERSION_NOT_SUPPORTED,
  ERR_THIN_CONNECTION_ALREADY_CREATED,
  ERR_UNSUPPORTED_CONVERSION,
  ERR_FETCH_TYPE_HANDLER_RETURN_VALUE,
  ERR_FETCH_TYPE_HANDLER_TYPE,
  ERR_FETCH_TYPE_HANDLER_CONVERTER,
  ERR_CALL_TIMEOUT_EXCEEDED,
  ERR_EMPTY_CONNECT_STRING,
  ERR_UNKOWN_SERVER_SIDE_PIGGYBACK,
  ERR_UNKNOWN_COLUMN_TYPE_NAME,
  ERR_INVALID_OBJECT_TYPE_NAME,
  ERR_TDS_TYPE_NOT_SUPPORTED,
  ERR_INVALID_COLL_INDEX_SET,
  ERR_INVALID_COLL_INDEX_GET,
  ERR_DELETE_ELEMENTS_OF_VARRAY,
  ERR_WRONG_VALUE_FOR_DBOBJECT_ATTR,
  ERR_WRONG_VALUE_FOR_DBOBJECT_ELEM,
  ERR_WRONG_CRED_FOR_EXTAUTH,
  ERR_MISSING_BIND_VALUE,
  ERR_SERVER_VERSION_NOT_SUPPORTED,
  ERR_UNEXPECTED_XML_TYPE,
  ERR_WRONG_USER_FORMAT_EXTAUTH_PROXY,
  ERR_TOO_MANY_BATCH_ERRORS,
  ERR_WRONG_LENGTH_FOR_DBOBJECT_ATTR,
  ERR_WRONG_LENGTH_FOR_DBOBJECT_ELEM,
  ERR_VECTOR_FORMAT_NOT_SUPPORTED,
  ERR_VECTOR_VERSION_NOT_SUPPORTED,
  ERR_OBJECT_IS_NOT_A_COLLECTION,
  ERR_CURSOR_HAS_BEEN_CLOSED,
  ERR_DML_RETURNING_DUP_BINDS,
  ERR_INVALID_TPC_BEGIN_FLAGS,
  ERR_INVALID_TPC_END_FLAGS,
  ERR_UNKNOWN_TRANSACTION_STATE,
  ERR_INVALID_TRANSACTION_SIZE,
  ERR_INVALID_BRANCH_SIZE,
  ERR_SESSIONLESS_DIFFERING_METHODS,
  ERR_SESSIONLESS_ALREADY_ACTIVE,
  ERR_SESSIONLESS_INACTIVE,
  ERR_CONNECTION_CLOSED_CODE: `${ERR_PREFIX}-${ERR_CONNECTION_CLOSED}`,
  ERR_OPERATION_NOT_SUPPORTED_ON_BFILE,
  ERR_OPERATION_ONLY_SUPPORTED_ON_BFILE,
  ERR_EXECMANY_NOT_ALLOWED_ON_QUERIES,
  ERR_VECTOR_SPARSE_INDICES_IS_NOT_ARRAY,
  ERR_VECTOR_SPARSE_VALUES_IS_NOT_ARRAY,
  ERR_VECTOR_SPARSE_DIMS_IS_NOT_INTEGER,
  ERR_VECTOR_SPARSE_INDICES_VALUES_NOT_EQUAL,
  ERR_VECTOR_SPARSE_INVALID_JSON,
  ERR_VECTOR_SPARSE_INVALID_STRING,
  ERR_VECTOR_SPARSE_INVALID_INPUT,
  ERR_VECTOR_SPARSE_INDICES_ELEM_IS_NOT_VALID,
  ERR_DB_FETCH_TYPE_HANDLER_CONVERTER,
  ERR_DB_FETCH_TYPE_HANDLER_RETURN_VALUE,
  ERR_ACCESS_TOKEN,
  ERR_CALLOUT_FN,
  WRN_COMPILATION_CREATE,
  assert,
  assertArgCount,
  assertParamPropBool,
  assertParamPropFunction,
  assertParamPropInt,
  assertParamPropString,
  assertParamPropUnsignedInt,
  assertParamPropUnsignedIntNonZero,
  assertParamPropValue,
  assertParamValue,
  assertPropValue,
  getErr,
  throwErr,
  throwErrWithORAError,
  throwNotImplemented,
  transformErr,
  throwWrapErr
};
