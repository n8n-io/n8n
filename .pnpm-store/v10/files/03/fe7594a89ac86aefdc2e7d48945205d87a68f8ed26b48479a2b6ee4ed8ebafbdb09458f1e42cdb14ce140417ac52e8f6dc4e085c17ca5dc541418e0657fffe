// Copyright (c) 2015, 2023, Oracle and/or its affiliates.

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

const process = require('process');
const { Readable } = require('stream');

class QueryStream extends Readable {

  constructor(rs) {
    super({ objectMode: true });
    this._fetching = false;
    this._numRows = 0;

    // calling open via process.nextTick to allow event handlers to be
    // registered prior to the events being emitted
    if (rs) {
      process.nextTick(() => {
        this._open(rs);
      });
    }
  }

  // called by readable.destroy() and ensures that the result set is closed if
  // it has not already been closed (never called directly)
  async _destroy(err, cb) {
    if (this._resultSet) {
      const rs = this._resultSet;
      this._resultSet = null;
      if (this._fetching) {
        await new Promise(resolve =>
          this.once('_doneFetching', resolve));
      }
      try {
        await rs._impl.close();
      } catch (closeErr) {
        cb(closeErr);
        return;
      }
    }
    cb(err);
  }

  // called when the query stream is to be associated with a result set; this
  // takes place when the query stream if constructed (if a result set is known
  // at that point) or by Connection.execute() when the result set is ready
  _open(rs) {
    this._resultSet = rs;

    // trigger the event listener that may have been added in _read() now that
    // the result set is ready
    this.emit('open');

    // emit a metadata event as a convenience to users
    this.emit('metadata', rs.metaData);
  }

  // called by readable.read() and pushes rows to the internal queue maintained
  // by the stream implementation (never called directly) appropriate
  async _read() {

    // still waiting on the result set to be added via _open() so add an event
    // listener to retry when ready
    if (!this._resultSet) {
      this.once('open', this._read);
      return;
    }

    // using the JS getRow() to leverage the JS row cache; the result set's
    // _allowGetRowCall is set to true to allow the call for query streams
    // created via ResultSet.toQueryStream()
    try {
      this._fetching = true;
      this._resultSet._allowGetRowCall = true;
      const row = await this._resultSet.getRow();
      if (row) {
        this.push(row);
      } else {
        this.push(null);
      }
    } catch (err) {
      this.destroy(err);
    } finally {
      this._fetching = false;
      if (this._resultSet) {
        this._resultSet._allowGetRowCall = false;
      } else {
        this.emit('_doneFetching');
      }
    }
  }

}

module.exports = QueryStream;
