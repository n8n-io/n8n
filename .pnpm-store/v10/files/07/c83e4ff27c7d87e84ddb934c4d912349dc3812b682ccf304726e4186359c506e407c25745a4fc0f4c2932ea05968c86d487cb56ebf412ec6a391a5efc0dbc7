// Copyright (c) 2024, Oracle and/or its affiliates.

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
// Node file defining the StatementCache class used to manage cached statements
//-----------------------------------------------------------------------------

const errors = require("../errors.js");
const { Statement } = require("./statement");

class StatementCache {
  constructor(maxSize) {
    this._cachedStatements = new Map();
    this._maxSize = maxSize;
    this._cursorsToClose = new Set();
    this._openCursors = new Set();
  }

  //---------------------------------------------------------------------------
  // _addCursorToClose()
  //
  // Add the statement's cursor to the list of cursors that need to be closed.
  //---------------------------------------------------------------------------
  _addCursorToClose(statement) {
    if (this._cursorsToClose.has(statement.cursorId)) {
      const reason = `attempt to close cursor ${statement.cursorId} twice`;
      errors.throwErr(errors.ERR_INTERNAL, reason);
    }
    if (statement.cursorId != 0) {
      this._cursorsToClose.add(statement.cursorId);
    }
    this._openCursors.delete(statement);
  }

  //---------------------------------------------------------------------------
  // _adjustCache()
  // Adjust the cache so that no more than the maximum number of statements
  // are cached by removing least recently used statements
  //---------------------------------------------------------------------------
  _adjustCache() {
    while (this._cachedStatements.size > this._maxSize) {
      const sql = this._cachedStatements.keys().next().value;
      const stmt = this._cachedStatements.get(sql);
      this._cachedStatements.delete(sql);
      if (stmt.inUse) {
        stmt.returnToCache = false;
      } else if (stmt.cursorId !== 0) {
        this._addCursorToClose(stmt);
      }
    }
  }

  //---------------------------------------------------------------------------
  //clearCursors() {
  // Clears the list of open cursors and removes the list of cursors that
  // need to be closed. This is required when a DRCP session change has
  // taken place as the cursor ID values are invalidated.
  //---------------------------------------------------------------------------
  clearCursors() {
    const newOpenCursors = new Set();
    for (const stmt of this._openCursors) {
      if (stmt.inUse || stmt.returnToCache) {
        stmt.pendingClear = true;
        newOpenCursors.add(stmt);
      }
      stmt._clearState();
    }
    this._openCursors = newOpenCursors;
    this._cursorsToClose.clear();
  }

  //---------------------------------------------------------------------------
  //clearPendingState() {
  // Clears state for statment with pending clear flag set and not in use.
  // This will clear all state for open cursors.
  // Called after rows processing is completed.
  //---------------------------------------------------------------------------
  clearPendingStatus() {
    for (const stmt of this._openCursors) {
      if (stmt.pendingClear && !stmt.inUse) {
        stmt._clearAllState();
        stmt.pendingClear = false;
      }
    }
  }

  //---------------------------------------------------------------------------
  // get_statement()
  // Get a statement from the statement cache, or prepare a new statement
  // for use. If a statement is already in use or the statement is not
  // supposed to be cached, a copy will be made (and not returned to the
  // cache).
  //---------------------------------------------------------------------------
  getStatement(sql, cacheStatement = false, forceNew = false) {
    let stmt = null;
    if (sql) {
      stmt = this._cachedStatements.get(sql);
    }
    if (!stmt) {
      stmt = new Statement();
      if (sql) {
        stmt._prepare(sql);
      }
      if (cacheStatement && !stmt.isDdl && this._maxSize > 0) {
        stmt.returnToCache = true;
        this._cachedStatements.set(sql, stmt);
        this._adjustCache();
      }
      this._openCursors.add(stmt);
    } else if (forceNew || stmt.inUse) {
      if (!cacheStatement) {
        this._addCursorToClose(stmt);
        this._cachedStatements.delete(sql);
      }
      stmt = stmt._copy();
      this._openCursors.add(stmt);
    } else if (!cacheStatement) {
      this._cachedStatements.delete(sql);
      stmt.returnToCache = false;
    } else {
      this._cachedStatements.delete(sql);
      this._cachedStatements.set(sql, stmt);
    }
    this._openCursors.add(stmt);
    stmt.inUse = true;
    return stmt;
  }

  clearCursor(statement) {
    this._addCursorToClose(statement);
    statement.cursorId = 0;
  }

  //---------------------------------------------------------------------------
  // returnStatement()
  // Return the statement to the statement cache, if applicable. If the
  // statement must not be returned to the statement cache, add the cursor
  // id to the list of cursor ids to close on the next round trip to the
  // database. Clear all bind variables and fetch variables in order to
  // ensure that unnecessary references are not retained.
  //---------------------------------------------------------------------------
  returnStatement(statement) {
    if (statement.bindInfoList) {
      statement.bindInfoList.forEach(bindInfo => {
        bindInfo.bindVar = null;
      });
    }
    if (statement.queryVars) {
      statement.queryVars.forEach(queryVar => {
        queryVar.values.fill(null);
      });
    }
    if (statement.returnToCache) {
      statement.inUse = false;
    } else {
      this._addCursorToClose(statement);
    }
    // clear all state for statement which is having flag set and not in use
    this.clearPendingStatus();
  }

  //---------------------------------------------------------------------------
  // writeCursorsToClose()
  // Write the list of cursors to close to the buffer.
  //---------------------------------------------------------------------------
  writeCursorsToClose(buf) {
    buf.writeUB4(this._cursorsToClose.size);
    for (const cursorNum of this._cursorsToClose.keys()) {
      buf.writeUB4(cursorNum);
    }
    this._cursorsToClose.clear();
  }
}

module.exports = StatementCache;
