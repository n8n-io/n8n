// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

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

const ResultSetImpl = require('../impl/resultset.js');
const ExecuteMessage = require('./protocol/messages/execute.js');
const FetchMessage = require('./protocol/messages/fetch.js');

class ThinResultSetImpl extends ResultSetImpl {

  //---------------------------------------------------------------------------
  // _fetchMoreRows()
  //
  // Fetches more rows from the database. This is done by means of the full
  // OAL8 RPC if needed; otherwise, the simpler OFETCH RPC is used.
  //---------------------------------------------------------------------------
  async _fetchMoreRows(options) {
    const cls = (this.statement.requiresFullExecute) ? ExecuteMessage : FetchMessage;
    const message = new cls(this.connection, this.statement, options, this);
    await this.connection._protocol._processMessage(message);
    this.statement.requiresFullExecute = false;
  }

  //---------------------------------------------------------------------------
  // Set the metadata info for a new resultSet object
  //---------------------------------------------------------------------------
  _resultSetNew(connection, statement, options) {
    this.connection = connection;
    this.statement = statement;
    this._nestedCursorIndices = [];
    this.options = options;
    this.prefetchRowsProcessed = false;
    this.statement.bufferRowIndex = 0;
  }

  //---------------------------------------------------------------------------
  // Returns the statement to cache so that it can be used later
  //---------------------------------------------------------------------------
  close() {
    this.connection._returnStatement(this.statement);
  }

  //---------------------------------------------------------------------------
  // Returns rows fetched to the common layer in array format
  //---------------------------------------------------------------------------
  _processRows(numRowsFetched) {
    const rows = [];
    const bufferRowIndex = this.statement.bufferRowIndex;
    for (let row = bufferRowIndex; row < bufferRowIndex + numRowsFetched; row++) {
      const rowObj = [];
      for (let col = 0; col < this.statement.numQueryVars; col++) {
        rowObj.push(this.statement.queryVars[col].values[row]);
      }
      rows.push(rowObj);
    }
    this.statement.bufferRowIndex += numRowsFetched;
    if (this.statement.bufferRowIndex === this.statement.bufferRowCount) {
      this.statement.bufferRowCount = 0;
      this.statement.bufferRowIndex = 0;
    }
    return rows;
  }

  //---------------------------------------------------------------------------
  // getRows()
  //
  // Fetches the specified number of rows from the database and returns them to
  // the common layer for processing.
  //---------------------------------------------------------------------------
  async getRows(numRows, options) {
    options.fetchArraySize = numRows || this.options.fetchArraySize;
    options.prefetchRows = this.options.prefetchRows;
    if (this.statement.bufferRowCount - this.statement.bufferRowIndex >= options.fetchArraySize) {
      return this._processRows(options.fetchArraySize);
    } else {
      // We fetch for the required number of row
      options.fetchArraySize = options.fetchArraySize - (this.statement.bufferRowCount - this.statement.bufferRowIndex);
      const prevBufferRowCount = this.statement.bufferRowCount;
      if (this.statement.moreRowsToFetch && options.fetchArraySize > 0) {
        await this._fetchMoreRows(options);
      }
      options.fetchArraySize = numRows || this.options.fetchArraySize;
      if (prevBufferRowCount === this.statement.bufferRowCount) {
        const numRowsFetched = this.statement.bufferRowCount - this.statement.bufferRowIndex;
        this.statement.bufferRowCount = 0;
        if (numRowsFetched > 0) {
          return this._processRows(numRowsFetched);
        }
        return [];
      }
    }
    const numRowsFetched = this.statement.bufferRowCount - this.statement.bufferRowIndex;
    return this._processRows(numRowsFetched);
  }

}

module.exports = ThinResultSetImpl;
