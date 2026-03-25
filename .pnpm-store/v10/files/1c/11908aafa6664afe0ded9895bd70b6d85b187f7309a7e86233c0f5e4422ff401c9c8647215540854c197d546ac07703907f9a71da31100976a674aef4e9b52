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

const settings = require('../settings.js');
const errors = require('../errors.js');
const util = require('util');

// define implementation class
class ConnectionImpl {

  constructor() {
    this._inProgress = false;
    this._dbObjectTypes = new Map();
    this._requestQueue = [];
    this._osonMaxFieldNameSize = 255;
  }

  //---------------------------------------------------------------------------
  // _acquireLock()
  //
  // Acquire a lock on the connection in order to prevent concurrent use of the
  // connection.
  //---------------------------------------------------------------------------
  async _acquireLock() {
    if (this._inProgress) {
      if (settings.errorOnConcurrentExecute) {
        errors.throwErr(errors.ERR_CONCURRENT_OPS);
      }
      await new Promise((resolve, reject) => {
        const payload = {resolve: resolve, reject: reject};
        this._requestQueue.push(payload);
      });
    }
    this._inProgress = true;
  }

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  // ---------------------------------------------------------------------------
  _getConnImpl() {
    return this;
  }

  //---------------------------------------------------------------------------
  // _getConnectTraceConfig()
  //
  // returns the necessary connection config used for debug/trace.
  // ---------------------------------------------------------------------------
  _getConnectTraceConfig() {
    let traceConfig;

    if (this._pool) {
      traceConfig = this._pool._getConnectTraceConfig();
    } else {
      traceConfig = {connectString: this._connectString, user: this._user};
    }
    traceConfig.serviceName = this.getServiceName();
    traceConfig.instanceName = this.getInstanceName();
    traceConfig.pdbName = this.getDbName();

    // Thick mode doesnt have these properties for now.
    if (settings.thin) {
      traceConfig.hostName = this.getHostName();
      traceConfig.port = this.getPort();
      traceConfig.protocol = this.getProtocol();
    }
    return traceConfig;
  }

  //---------------------------------------------------------------------------
  // _getDbObjectType()
  //
  // Return the object identifying the object type. These are cached by fully
  // qualified name and by OID (thin mode only).
  //---------------------------------------------------------------------------
  _getDbObjectType(schema, name, packageName, oid) {
    let dbObjectType;
    if (oid) {
      dbObjectType = this._dbObjectTypes.get(oid);
      if (dbObjectType)
        return dbObjectType;
    }
    const fqn = (packageName) ? `${schema}.${packageName}.${name}` :
      `${schema}.${name}`;
    dbObjectType = this._dbObjectTypes.get(fqn);
    if (!dbObjectType) {
      dbObjectType = {
        oid: oid,
        fqn: fqn,
        schema: schema,
        name: name,
        packageName: packageName,
        partial: true,
        isXmlType: (schema === 'SYS' && name === 'XMLTYPE')
      };
      this._dbObjectTypes.set(fqn, dbObjectType);
    }
    if (oid && !dbObjectType.oid) {
      dbObjectType.oid = oid;
      this._dbObjectTypes.set(oid, dbObjectType);
    }
    return dbObjectType;
  }

  //---------------------------------------------------------------------------
  // _isDate()
  //
  // Method for determining if a value is a Date object. This method can be
  // removed once Node-API version 5 is used in the C extension.
  // ---------------------------------------------------------------------------
  _isDate(val) {
    return (util.types.isDate(val));
  }

  //---------------------------------------------------------------------------
  // _releaseLock()
  //
  // Release the lock on the connection to allow another use of the connection.
  //---------------------------------------------------------------------------
  _releaseLock() {
    if (this._requestQueue.length > 0) {
      const payload = this._requestQueue.shift();
      payload.resolve();
    } else {
      this._inProgress = false;
    }
  }

  //---------------------------------------------------------------------------
  // breakExecution()
  //
  // Breaks execution of a running statement.
  //---------------------------------------------------------------------------
  breakExecution() {
    errors.throwNotImplemented("getting Oracle Server version number");
  }

  //---------------------------------------------------------------------------
  // changePassword()
  //
  // Changes the password of the specified user.
  //---------------------------------------------------------------------------
  changePassword() {
    errors.throwNotImplemented("changing the password");
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the connection.
  //---------------------------------------------------------------------------
  close() {
    errors.throwNotImplemented("closing the connection");
  }

  //---------------------------------------------------------------------------
  // commit()
  //
  // Commits the transaction.
  //---------------------------------------------------------------------------
  commit() {
    errors.throwNotImplemented("committing the transaction");
  }

  //---------------------------------------------------------------------------
  // createLob()
  //
  // Creates a temporary LOB and returns it.
  //---------------------------------------------------------------------------
  createLob() {
    errors.throwNotImplemented("creating a temporary LOB");
  }

  //---------------------------------------------------------------------------
  // execute()
  //
  // Executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  execute() {
    errors.throwNotImplemented("executing a SQL statement");
  }

  //---------------------------------------------------------------------------
  // executeMany()
  //
  // Executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  executeMany() {
    errors.throwNotImplemented("executing a SQL statement multiple times");
  }

  //---------------------------------------------------------------------------
  // getCallTimeout()
  //
  // Returns the call timeout value.
  //---------------------------------------------------------------------------
  getCallTimeout() {
    errors.throwNotImplemented("getting call timeout");
  }

  //---------------------------------------------------------------------------
  // getCurrentSchema()
  //
  // Returns the current schema.
  //---------------------------------------------------------------------------
  getCurrentSchema() {
    errors.throwNotImplemented("getting current schema");
  }

  //---------------------------------------------------------------------------
  // getDbDomain()
  //
  // Returns the Oracle Database domain name associated with the connection.
  //---------------------------------------------------------------------------
  getDbDomain() {
    errors.throwNotImplemented("getting db domain");
  }

  //---------------------------------------------------------------------------
  // getDbName()
  //
  // Returns the Oracle Database name associated with the connection.
  //---------------------------------------------------------------------------
  getDbName() {
    errors.throwNotImplemented("getting db name");
  }

  //---------------------------------------------------------------------------
  // getDbObjectClass()
  //
  // Returns a database object class given its name.
  //---------------------------------------------------------------------------
  getDbObjectClass() {
    errors.throwNotImplemented("getting a database object class");
  }

  //---------------------------------------------------------------------------
  // getExternalName()
  //
  // Returns the external name for TPC logging.
  //---------------------------------------------------------------------------
  getExternalName() {
    errors.throwNotImplemented("getting the external name");
  }

  //---------------------------------------------------------------------------
  // getInstanceName()
  //
  // Returns the Oracle Database instance name associated with the connection.
  //---------------------------------------------------------------------------
  getInstanceName() {
    errors.throwNotImplemented("getting the Oracle Database instance name.");
  }

  //---------------------------------------------------------------------------
  // getInternalName()
  //
  // Returns the internal name for TPC logging.
  //---------------------------------------------------------------------------
  getInternalName() {
    errors.throwNotImplemented("getting the internal name");
  }

  //---------------------------------------------------------------------------
  // getLTXID()
  //
  // Returns the the logical transaction ID for database transactions.
  //---------------------------------------------------------------------------
  getLTXID() {
    errors.throwNotImplemented("getting the logical transaction id");
  }

  //---------------------------------------------------------------------------
  // getMaxIdentifierLength()
  //
  // Returns the maximum length of identifiers supported by the database to
  // which this connection has been established.
  //---------------------------------------------------------------------------
  getMaxIdentifierLength() {
    errors.throwNotImplemented("getting the maximum identifier length");
  }

  //---------------------------------------------------------------------------
  // getMaxOpenCursors()
  //
  // Returns maximum number of cursors that can be opened in one session.
  //---------------------------------------------------------------------------
  getMaxOpenCursors() {
    errors.throwNotImplemented("getting max open cursors");
  }

  //---------------------------------------------------------------------------
  // getOracleServerVersion()
  //
  // Returns an integer identifying the Oracle Server version.
  //---------------------------------------------------------------------------
  getOracleServerVersion() {
    errors.throwNotImplemented("getting Oracle Server version number");
  }

  //---------------------------------------------------------------------------
  // getOracleServerVersionString()
  //
  // Returns a string identifying the Oracle Server version.
  //---------------------------------------------------------------------------
  getOracleServerVersionString() {
    errors.throwNotImplemented("getting Oracle Server version as a string");
  }

  //---------------------------------------------------------------------------
  // getQueue()
  //
  // Returns a queue with the given name.
  //---------------------------------------------------------------------------
  getQueue() {
    errors.throwNotImplemented("getting a queue");
  }

  //---------------------------------------------------------------------------
  // getServiceName()
  //
  // Returns the Oracle Database service name associated with the connection.
  //---------------------------------------------------------------------------
  getServiceName() {
    errors.throwNotImplemented("getting service name");
  }

  //---------------------------------------------------------------------------
  // getSodaDatabase()
  //
  // Returns a SodaDatabase object associated with the connection.
  //---------------------------------------------------------------------------
  getSodaDatabase() {
    errors.throwNotImplemented("getting a SODA database");
  }

  //---------------------------------------------------------------------------
  // getStatementInfo()
  //
  // Returns information about a statement.
  //---------------------------------------------------------------------------
  getStatementInfo() {
    errors.throwNotImplemented("getting information about a statement");
  }

  //---------------------------------------------------------------------------
  // getStmtCacheSize()
  //
  // Returns the size of the statement cache.
  //---------------------------------------------------------------------------
  getStmtCacheSize() {
    errors.throwNotImplemented("getting the statement cache size");
  }

  //---------------------------------------------------------------------------
  // getTag()
  //
  // Returns the tag associated with the connection.
  //---------------------------------------------------------------------------
  getTag() {
    errors.throwNotImplemented("getting the tag for the connection");
  }

  //---------------------------------------------------------------------------
  // getTransactionInProgress()
  //
  // Returns boolean based on the presence of an active transaction on the
  // connection
  //---------------------------------------------------------------------------
  getTransactionInProgress() {
    errors.throwNotImplemented("getting the status of an active transaction" +
      " on the connection");
  }

  //---------------------------------------------------------------------------
  // getWarning()
  //
  // Returns a warning on a connection
  //---------------------------------------------------------------------------
  getWarning() {
    errors.throwNotImplemented("getting information about warning");
  }

  //---------------------------------------------------------------------------
  // isHealthy()
  //
  // Returns whether the connection is healthy or not.
  //---------------------------------------------------------------------------
  isHealthy() {
    errors.throwNotImplemented("getting the health of the connection");
  }

  isCompressionEnabled() {
    errors.throwNotImplemented("getting the data compression status on the connection");
  }

  //---------------------------------------------------------------------------
  // ping()
  //
  // Sends a "ping" to the database to see if it is "alive".
  //---------------------------------------------------------------------------
  ping() {
    errors.throwNotImplemented("sending a ping to the database");
  }

  //---------------------------------------------------------------------------
  // rollback()
  //
  // Rolls back a transaction.
  //---------------------------------------------------------------------------
  rollback() {
    errors.throwNotImplemented("rolling back a transaction");
  }

  //---------------------------------------------------------------------------
  // setAction()
  //
  // Sets the end-to-end tracing attribute "action".
  //---------------------------------------------------------------------------
  setAction() {
    errors.throwNotImplemented("setting end-to-end attribute 'action'");
  }

  //---------------------------------------------------------------------------
  // setCallTimeout()
  //
  // Sets the call timeout value.
  //---------------------------------------------------------------------------
  setCallTimeout() {
    errors.throwNotImplemented("setting call timeout");
  }

  //---------------------------------------------------------------------------
  // setClientId()
  //
  // Sets the end-to-end tracing attribute "clientId".
  //---------------------------------------------------------------------------
  setClientId() {
    errors.throwNotImplemented("setting end-to-end attribute 'clientId'");
  }

  //---------------------------------------------------------------------------
  // setClientInfo()
  //
  // Sets the end-to-end tracing attribute "clientInfo".
  //---------------------------------------------------------------------------
  setClientInfo() {
    errors.throwNotImplemented("setting end-to-end attribute 'clientInfo'");
  }

  //---------------------------------------------------------------------------
  // setCurrentSchema()
  //
  // Sets the current schema.
  //---------------------------------------------------------------------------
  setCurrentSchema() {
    errors.throwNotImplemented("setting the current schema");
  }

  //---------------------------------------------------------------------------
  // setDbOp()
  //
  // Sets the end-to-end tracing attribute "dbOp".
  //---------------------------------------------------------------------------
  setDbOp() {
    errors.throwNotImplemented("setting end-to-end attribute 'dbOp'");
  }

  //---------------------------------------------------------------------------
  // setECID()
  //
  // Sets the end-to-end tracing attribute "ecid".
  //---------------------------------------------------------------------------
  setECID() {
    errors.throwNotImplemented("setting end-to-end attribute 'ecid'");
  }

  //---------------------------------------------------------------------------
  // setExternalName()
  //
  // Sets the external name for TPC logging.
  //---------------------------------------------------------------------------
  setExternalName() {
    errors.throwNotImplemented("setting the external name");
  }

  //---------------------------------------------------------------------------
  // setInternalName()
  //
  // Sets the internal name for TPC logging.
  //---------------------------------------------------------------------------
  setInternalName() {
    errors.throwNotImplemented("setting the internal name");
  }

  //---------------------------------------------------------------------------
  // setStmtCacheSize()
  //
  // Sets the size of the statement cache.
  //---------------------------------------------------------------------------
  setStmtCacheSize() {
    errors.throwNotImplemented("setting the size of the statement cache");
  }

  //---------------------------------------------------------------------------
  // setModule()
  //
  // Sets the end-to-end tracing attribute "module".
  //---------------------------------------------------------------------------
  setModule() {
    errors.throwNotImplemented("setting end-to-end attribute 'module'");
  }

  //---------------------------------------------------------------------------
  // setTag()
  //
  // Sets the tag associated with the connection.
  //---------------------------------------------------------------------------
  setTag() {
    errors.throwNotImplemented("setting the tag for the connection");
  }

  //---------------------------------------------------------------------------
  // shutdown()
  //
  // Shuts down the database instance.
  //---------------------------------------------------------------------------
  shutdown() {
    errors.throwNotImplemented("shutting down the database instance");
  }

  //---------------------------------------------------------------------------
  // startup()
  //
  // Starts up a database instance.
  //---------------------------------------------------------------------------
  startup() {
    errors.throwNotImplemented("starting up the database instance");
  }

  //---------------------------------------------------------------------------
  // subscribe()
  //
  // Subscribes to events in the database.
  //---------------------------------------------------------------------------
  subscribe() {
    errors.throwNotImplemented("subscribing to events in the database");
  }

  //---------------------------------------------------------------------------
  // tpcBegin()
  //
  // Starts a two-phase transaction.
  //---------------------------------------------------------------------------
  tpcBegin() {
    errors.throwNotImplemented("starting a two-phase transaction");
  }

  //---------------------------------------------------------------------------
  // tpcCommit()
  //
  // Commits a two-phase transaction.
  //---------------------------------------------------------------------------
  tpcCommit() {
    errors.throwNotImplemented("committing a two-phase transaction");
  }

  //---------------------------------------------------------------------------
  // tpcEnd()
  //
  // Ends a two-phase transaction.
  //---------------------------------------------------------------------------
  tpcEnd() {
    errors.throwNotImplemented("ending a two-phase transaction");
  }

  //---------------------------------------------------------------------------
  // tpcForget()
  //
  // Forgets a two-phase transaction.
  //---------------------------------------------------------------------------
  tpcForget() {
    errors.throwNotImplemented("forgetting a two-phase transaction");
  }

  //---------------------------------------------------------------------------
  // tpcPrepare()
  //
  // Prepares a two-phase transaction for commit.
  //---------------------------------------------------------------------------
  tpcPrepare() {
    errors.throwNotImplemented("preparing a two-phase transaction");
  }

  //---------------------------------------------------------------------------
  // tpcRollback()
  //
  // Rolls back a two-phase transaction.
  //---------------------------------------------------------------------------
  tpcRollback() {
    errors.throwNotImplemented("rolling back a two-phase transaction");
  }

  //---------------------------------------------------------------------------
  // unsubscribe()
  //
  // Unsubscribes from events in the database.
  //---------------------------------------------------------------------------
  unsubscribe() {
    errors.throwNotImplemented("unsubscribing from events");
  }

  //---------------------------------------------------------------------------
  // getHostName()
  //
  // Returns the Oracle Database host name associated with the connection.
  //---------------------------------------------------------------------------
  getHostName() {
    errors.throwNotImplemented("getting HostName");
  }

  //---------------------------------------------------------------------------
  // getPort()
  //
  // Returns the Oracle Database port number associated with the connection.
  //---------------------------------------------------------------------------
  getPort() {
    errors.throwNotImplemented("getting Port");
  }

  //---------------------------------------------------------------------------
  // getProtocol()
  //
  // Returns the protocol associated with the connection.
  //---------------------------------------------------------------------------
  getProtocol() {
    errors.throwNotImplemented("getting Protocol");
  }

}

// export just the class
module.exports = ConnectionImpl;
