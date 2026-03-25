/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   dbconfig.js
 *
 * DESCRIPTION
 *   Holds the credentials used by node-oracledb examples to connect to the
 *   database. Production applications should consider using External
 *   Authentication to avoid hard coded credentials.
 *
 *   To create a database user, see
 *   https://blogs.oracle.com/sql/post/how-to-create-users-grant-them-privileges-and-remove-them-in-oracle-database
 *
 *   Applications can set the connectString value to an Easy Connect string,
 *   or a Net Service Name from the tnsnames.ora file or an external naming
 *   service, or it can be the name of a local Oracle Database instance.
 *
 *   If node-oracledb is linked with Instant Client, then an Easy
 *   Connect string is generally appropriate.  The basic syntax is:
 *
 *     [//]host_name[:port][/service_name][:server_type][/instance_name]
 *
 *   Commonly just the host_name and service_name are needed
 *   e.g. "localhost/orclpdb1" or "example.com/XEPDB1"
 *
 *   The Easy Connect syntax supports lots of options. To know more, please
 *   refer to the latest Oracle documentation on Easy Connect syntax:
 *   https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-B0437826-43C1-49EC-A94D-B650B6A4A6EE
 *
 *   If using a tnsnames.ora file, the file can be in a default location such
 *   as $ORACLE_HOME/network/admin/tnsnames.ora or /etc/tnsnames.ora.
 *   Alternatively set the TNS_ADMIN environment variable and put the file in
 *   $TNS_ADMIN/tnsnames.ora.
 *
 *   If connectString is not specified, the empty string "" is used which
 *   indicates to connect to the local, default database.
 *
 *   External Authentication can be used by setting the optional property
 *   externalAuth to true. External Authentication allows applications to use
 *   an external password store such as Oracle Wallet, so that passwords
 *   do not need to be hard coded into the application. The user and password
 *   application. The user and password properties for connecting or creating
 *   a pool should not be set when externalAuth is true.
 *
 * TROUBLESHOOTING
 *   Refer to the Error Handling section in node-oracledb documentation
 *   to understand the different types of errors in both the Thin and Thick
 *   modes of node-oracledb:
 *   https://node-oracledb.readthedocs.io/en/latest/user_guide/exception_handling.html#errors-in-thin-and-thick-modes
 *
 *****************************************************************************/

const config = {
  user: process.env.NODE_ORACLEDB_USER,

  // Get the password from the environment variable
  // NODE_ORACLEDB_PASSWORD.  The password could also be a hard coded
  // string (not recommended), or it could be prompted for.
  // Alternatively use External Authentication so that no password is needed.
  password: process.env.NODE_ORACLEDB_PASSWORD,

  // For information on connection strings see:
  // https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionstrings
  connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,

  // Setting externalAuth is optional.  It defaults to false.  See:
  // https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#extauth
  externalAuth: process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false,
};

// Set the NODE_ORACLEDB_WALLET_LOCATION and NODE_ORACLEDB_WALLET_PASSWORD
// environment variables for database connections that require wallets.
// For example, creating and dropping a user.
// See the README.md file in this directory for more details.
if (process.env.NODE_ORACLEDB_WALLET_PASSWORD) {
  config.walletPassword = process.env.NODE_ORACLEDB_WALLET_PASSWORD;
}

if (process.env.NODE_ORACLEDB_WALLET_LOCATION) {
  config.walletLocation = process.env.NODE_ORACLEDB_WALLET_LOCATION;
}

// Set the NODE_ORACLEDB_DBA_USER and NODE_ORACLEDB_DBA_PASSWORD environment
// variables for database operations which require SYSDBA privileges.
// For example, creating and dropping a user. See the README.md file in this
// directory for more details.
if (process.env.NODE_ORACLEDB_DBA_USER) {
  config.DBA_user = process.env.NODE_ORACLEDB_DBA_USER;
}

if (process.env.NODE_ORACLEDB_DBA_PASSWORD) {
  config.DBA_password = process.env.NODE_ORACLEDB_DBA_PASSWORD;
}

module.exports = config;
