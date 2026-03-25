// Copyright (c) 2022, 2024, Oracle and/or its affiliates.

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

const { Buffer } = require('buffer');
const constants = require('../constants');
const errors = require('../errors');
const protoConstants = require('./protocol/constants');

/**
 * It is used to cache the metadata about bind information
 * associated with the statement. This will determine if statement needs
 * to use Execute or Re-Execute.
 */
class BindInfo {
  constructor(name, isReturnBind = false) {
    this.bindName = name;
    this.isReturnBind = isReturnBind;
    this.maxSize = 0;
    this.numElements = 0;
    this.maxArraySize = 0;
    this.type = null;
    this.isArray = false;
    this.dir = constants.BIND_IN;
    this.bindVar = null;
  }
}

/**
 * Encapsulates the SQL statement run on the connection.
 * It has information like type of stmt, bind infrmation, cursor number, ...
 */
module.exports.BindInfo = BindInfo;

class Parser {
  constructor() {
    this.returningKeywordFound = false;
    this.pos = 0;
    this.maxPos = 0;
    this.sqlData = "";
  }

  /**
   * Bind variables are identified as follows:
   *  - Quoted and non-quoted bind names are allowed.
   *  - Quoted bind names can contain any characters.
   *  - Non-quoted bind names must begin with an alphabetic character.
   *  - Non-quoted bind names can only contain alphanumeric characters, the
   *    underscore, the dollar sign and the pound sign.
   *  - Non-quoted bind names cannot be Oracle Database Reserved Names (this
   *    is left to the server to detect and return an appropriate error).
   */
  _parseBindName(stmt) {
    let quotedName = false;
    let inBind = false;
    let digitsOnly = false;
    let startPos = 0;
    let pos = this.pos + 1;
    let bindName;
    let ch;

    while (pos <= this.maxPos) {
      ch = this.sqlData[pos];
      if (!inBind) {
        if (/\p{space}/u.test(ch)) {
          pos += 1;
          continue;
        } else if (ch === '"') {
          quotedName = true;
        } else if (/\p{N}/u.test(ch)) {
          digitsOnly = true;
        } else if (!/\p{Alpha}/u.test(ch)) {
          break;
        }
        inBind = true;
        startPos = pos;
      } else if (digitsOnly && !(/\p{N}/u.test(ch))) {
        this.pos = pos - 1;
        break;
      } else if (quotedName && ch === '"') {
        this.pos = pos;
        break;
      } else if (!digitsOnly && !quotedName
          && !(/[\p{L}\p{N}]/u.test(ch))
          && !['$', '_', '#'].includes(ch)) {
        this.pos = pos - 1;
        break;
      }
      pos += 1;
    }

    if (inBind) {
      if (quotedName) {
        bindName = stmt.sql.substring(startPos + 1, pos);
      } else if (digitsOnly) {
        bindName = stmt.sql.substring(startPos, pos);
      } else {
        bindName = stmt.sql.substring(startPos, pos).toUpperCase();
      }
      stmt._addBind(bindName);
    }
  }

  /**
   * Multiple line comments consist of the characters /* followed by all
   * characters up until * followed by /. This method is called when the first
   * slash is detected and checks for the subsequent asterisk. If found,
   * the comment is traversed and the current position is updated; otherwise,
   * the current position is left untouched.
   */
  _parseMultiLineComment() {
    let inComment = false;
    let exitingComment = false;
    let pos = this.pos + 1;
    let ch;
    while (pos <= this.maxPos) {
      ch = this.sqlData[pos];
      if (!inComment) {
        if (ch !== '*') {
          break;
        }
        inComment = true;
      } else if (ch === '*') {
        exitingComment = true;
      } else if (exitingComment) {
        if (ch === '/') {
          this.pos = pos;
          break;
        }
        exitingComment = false;
      }
      pos += 1;
    }
  }

  /** Parses a q-string which consists of the characters "q" and a single
   * quote followed by a start separator, any text that does not contain the
   * end seprator and the end separator and ending quote. The following are
   * examples that demonstrate this:
   *   - q'[...]'
   *   - q'{...}'
   *   - q'<...>'
   *   - q'(...)'
   *   - q'?...?' (where ? is any character)
   */
  _parseQstring() {
    let exitingQstring = false;
    let inQstring = false;
    let sep;
    let ch;

    this.pos += 1;

    while (this.pos <= this.maxPos) {
      ch = this.sqlData[this.pos];
      if (!inQstring) {
        if (ch === '[') {
          sep = ']';
        } else if (ch === '{') {
          sep = '}';
        } else if (ch === '(') {
          sep = ')';
        } else if (ch === '<') {
          sep = '>';
        } else {
          sep = ch;
        }
        inQstring = true;
      } else if (!exitingQstring && ch === sep) {
        exitingQstring = true;
      } else if (exitingQstring) {
        if (ch === "'") {
          break;
        } else if (ch !== sep) {
          exitingQstring = false;
        }
      }
      this.pos += 1;
    }
  }

  /**
   * Parses a quoted string with the given separator. All characters until
   * the separate is detected are discarded.
   */
  _parseQuotedString(sep) {
    let ch;
    this.pos += 1;
    while (this.pos <= this.maxPos) {
      ch = this.sqlData[this.pos];
      if (ch === sep) {
        break;
      }
      this.pos += 1;
    }
  }

  /**
   * Single line comments consist of two dashes and all characters up to the
   * next line break (or the end of the data). This method is called when
   * the first dash is detected and checks for the subsequent dash. If found,
   * the single line comment is traversed and the current position is updated;
   * otherwise, the current position is left untouched.
   */
  _parseSingleLineComment() {
    let inComment = false;
    let pos = this.pos + 1;
    let ch;

    while (pos <= this.maxPos) {
      ch = this.sqlData[pos];
      if (!inComment) {
        if (ch !== '-') {
          return;
        }
        inComment = true;
      } else if (ch === '\n') {
        break;
      }
      pos += 1;
    }
    this.pos = pos;
  }

  /**
   * Parses the SQL stored in the statement in order to determine the
   * keyword that identifies the type of SQL being executed as well as a
   * list of bind variable names. A check is also made for DML returning
   * statements since the bind variables following the "INTO" keyword are
   * treated differently from other bind variables.
   */
  parse(stmt) {
    let initialKeywordFound = false;
    let lastWasString = false;
    let ch, lastCh = '', alphaStartCh = '';
    let alphaStartPos = 0, alphaLen;
    let isAlpha, lastWasAlpha = false;
    let keyword;

    // initialization
    this.pos = 0;
    this.maxPos = stmt.sql.length - 1;
    this.sqlData = stmt.sql;

    // scan all the characters in the string
    while (this.pos <= this.maxPos) {
      ch = this.sqlData[this.pos];
      // look for certain keywords (initial keyword and the ones for
      // detecting DML returning statements
      isAlpha = /\p{L}/u.test(ch);
      if (isAlpha && !lastWasAlpha) {
        alphaStartPos = this.pos;
        alphaStartCh = ch;
      } else if (!isAlpha && lastWasAlpha) {
        alphaLen = this.pos - alphaStartPos;
        if (!initialKeywordFound) {
          keyword = stmt.sql.substring(alphaStartPos, this.pos).toUpperCase();
          stmt._determineStatementType(keyword);
          initialKeywordFound = true;
          if (stmt.isDdl) {
            break;
          }
        } else if (stmt.isDml && !this.returningKeywordFound
            && (alphaLen === 9 || alphaLen === 6)
            && ['r', 'R'].includes(alphaStartCh)) {
          keyword = stmt.sql.substring(alphaStartPos, this.pos).toUpperCase();
          if (['RETURNING', 'RETURN'].includes(keyword)) {
            this.returningKeywordFound = true;
          }
        } else if (this.returningKeywordFound && alphaLen === 4
            && ['i', 'I'].includes(alphaStartCh)) {
          keyword = stmt.sql.substring(alphaStartPos, this.pos).toUpperCase();
          if (keyword === 'INTO') {
            stmt.isReturning = true;
          }
        }
      }

      // need to keep track of whether the last token parsed was a string
      // (excluding whitespace) as if the last token parsed was a string
      // a following colon is not a bind variable but a part of the JSON
      // constant syntax
      if (ch === "'") {
        lastWasString = true;
        if (['q', 'Q'].includes(lastCh)) {
          this._parseQstring();
        } else {
          this._parseQuotedString(ch);
        }
      } else if (!(/\p{space}/u.test(ch))) {
        if (ch === '-') {
          this._parseSingleLineComment();
        } else if (ch === '/') {
          this._parseMultiLineComment();
        } else if (ch === '"') {
          this._parseQuotedString(ch);
        } else if (ch === ':' && !lastWasString) {
          this._parseBindName(stmt);
        }
        lastWasString = false;
      }

      this.pos += 1;
      lastWasAlpha = isAlpha;
      lastCh = ch;
    }

    // if only a single word is found in sql, e.g. in case of commit/rollback
    if (!initialKeywordFound) {
      stmt._determineStatementType(stmt.sql.toUpperCase());
    }
  }
}

class Statement {
  constructor() {
    this.sql = "";
    this.sqlBytes = [];
    this.sqlLength = 0;
    this.cursorId = 0;
    this.requiresDefine = false;
    this.isQuery = false;
    this.isPlSql = false;
    this.isDml = false;
    this.isDdl = false;
    this.isReturning = false;
    this.bindInfoList = [];
    this.queryVars = [];
    this.bindInfoDict = new Map();
    this.requiresFullExecute = false;
    this.noPrefetch = false;
    this.returnToCache = false;
    this.numColumns = 0;
    this.lastRowIndex;
    this.lastRowid;
    this.moreRowsToFetch = true;
    this.inUse = false;
    this.bufferRowIndex = 0;
    this.bufferRowCount = 0;
    this.pendingClear = false;
    this.statementType = constants.STMT_TYPE_UNKNOWN;
  }

  //---------------------------------------------------------------------------
  // _copy()
  //
  // Copying existing statement into new statement object required by drcp
  //---------------------------------------------------------------------------
  _copy() {
    const copiedStatement = new Statement();
    copiedStatement.sql = this.sql;
    copiedStatement.sqlBytes = this.sqlBytes;
    copiedStatement.sqlLength = this.sqlLength;
    copiedStatement.isQuery = this.isQuery;
    copiedStatement.isPlSql = this.isPlSql;
    copiedStatement.isDml = this.isDml;
    copiedStatement.isDdl = this.isDdl;
    copiedStatement.isReturning = this.isReturning;
    copiedStatement.bindInfoList = [];
    for (const bindInfo of this.bindInfoList) {
      const newBindInfo = new BindInfo(bindInfo.bindName, bindInfo.isReturnBind);
      copiedStatement.bindInfoList.push(newBindInfo);
    }
    const bindInfoDict = copiedStatement.bindInfoDict = new Map();
    for (const bindInfo of copiedStatement.bindInfoList) {
      if (bindInfoDict.has(bindInfo.bindName)) {
        bindInfoDict.get(bindInfo.bindName).push(bindInfo);
      } else {
        bindInfoDict.set(bindInfo.bindName, [bindInfo]);
      }
    }
    copiedStatement.returnToCache = false;
    return copiedStatement;
  }

  //---------------------------------------------------------------------------
  // _determineStatementType(sql)
  //
  // Determine the type of the SQL statement by examining the first keyword
  // found in the statement
  //---------------------------------------------------------------------------
  _determineStatementType(sqlKeyword) {
    switch (sqlKeyword) {
      case 'DECLARE':
        this.isPlSql = true;
        this.statementType = constants.STMT_TYPE_DECLARE;
        break;
      case 'CALL':
        this.isPlSql = true;
        this.statementType = constants.STMT_TYPE_CALL;
        break;
      case 'BEGIN':
        this.isPlSql = true;
        this.statementType = constants.STMT_TYPE_BEGIN;
        break;
      case 'SELECT':
        this.isQuery = true;
        this.statementType = constants.STMT_TYPE_SELECT;
        break;
      case 'WITH':
        this.isQuery = true;
        break;
      case 'INSERT':
        this.isDml = true;
        this.statementType = constants.STMT_TYPE_INSERT;
        break;
      case 'UPDATE':
        this.isDml = true;
        this.statementType = constants.STMT_TYPE_UPDATE;
        break;
      case 'DELETE':
        this.isDml = true;
        this.statementType = constants.STMT_TYPE_DELETE;
        break;
      case 'MERGE':
        this.isDml = true;
        this.statementType = constants.STMT_TYPE_MERGE;
        break;
      case 'ALTER':
        this.isDdl = true;
        this.statementType = constants.STMT_TYPE_ALTER;
        break;
      case 'CREATE':
        this.isDdl = true;
        this.statementType = constants.STMT_TYPE_CREATE;
        break;
      case 'DROP':
        this.isDdl = true;
        this.statementType = constants.STMT_TYPE_DROP;
        break;
      case 'ANALYZE':
      case 'AUDIT':
      case 'COMMENT':
      case 'GRANT':
      case 'REVOKE':
      case 'TRUNCATE':
        this.isDdl = true;
        break;
      case 'COMMIT':
        this.statementType = constants.STMT_TYPE_COMMIT;
        break;
      case 'ROLLBACK':
        this.statementType = constants.STMT_TYPE_ROLLBACK;
        break;
      default:
        this.statementType = constants.STMT_TYPE_UNKNOWN;
        break;
    }
  }

  //---------------------------------------------------------------------------
  // prepare(sql)
  //
  // Prepare the SQL for execution by determining the list of bind names
  // that are found within it. The length of the SQL text is also calculated
  // at this time.
  //---------------------------------------------------------------------------
  _prepare(sql) {
    this.sql = sql;
    this.sqlBytes = Buffer.from(this.sql, 'utf8');
    this.sqlLength = this.sqlBytes.length;
    const parser = new Parser();
    parser.parse(this);
  }

  //---------------------------------------------------------------------------
  // _addBinds(sql)
  //
  // Add bind information to the statement by examining the passed SQL for
  // bind variable names.
  //---------------------------------------------------------------------------
  _addBind(name) {
    if (!this.isPlSql || !this.bindInfoDict.has(name)) {
      const info = new BindInfo(name, this.isReturning);
      this.bindInfoList.push(info);
      if (this.bindInfoDict.has(info.bindName)) {
        if (this.isReturning) {
          const origInfo = this.bindInfoDict.get(info.bindName)[0];
          if (!origInfo.isReturnBind) {
            errors.throwErr(errors.ERR_DML_RETURNING_DUP_BINDS, name);
          }
        }
        this.bindInfoDict.get(info.bindName).push(info);
      } else {
        this.bindInfoDict.set(info.bindName, [info]);
      }
    }
  }

  //---------------------------------------------------------------------------
  // _setVariable(sql)
  //
  // Set the variable on the bind information and copy across metadata that
  // will be used for binding. If the bind metadata has changed, mark the
  // statement as requiring a full execute. In addition, binding a REF
  // cursor also requires a full execute.
  //---------------------------------------------------------------------------
  _setVariable(bindInfo, variable) {
    if (variable.type._oraTypeNum === protoConstants.TNS_DATA_TYPE_CURSOR) {
      this.requiresFullExecute = true;
    }
    if (variable.maxSize !== bindInfo.maxSize
        || variable.dir !== bindInfo.dir
        || variable.isArray !== bindInfo.isArray
        || variable.values.length > bindInfo.numElements
        || variable.type != bindInfo.type
        || variable.maxArraySize != bindInfo.maxArraySize) {
      bindInfo.isArray = variable.isArray;
      bindInfo.numElements = variable.values.length;
      bindInfo.maxSize = variable.maxSize;
      bindInfo.type = variable.type;
      bindInfo.dir = variable.dir;
      bindInfo.maxArraySize = variable.maxArraySize;
      this.requiresFullExecute = true;
    }

    bindInfo.bindVar = variable;
  }

  //---------------------------------------------------------------------------
  // _clearAllState
  //
  // clear all state associated with the cursor
  //---------------------------------------------------------------------------
  _clearAllState() {
    this.cursorId = 0;
    this.requiresDefine = false;
    this.noPrefetch = false;
    this.requiresFullExecute = false;
    this.queryVars = [];
    this.numQueryVars = 0;
    this.bufferRowCount = 0;
    this.bufferRowIndex = 0;
  }

  //---------------------------------------------------------------------------
  // _clearState
  //
  // clear some state associated with the cursor
  //---------------------------------------------------------------------------
  _clearState() {
    this.cursorId = 0;
    this.requiresDefine = false;
    this.noPrefetch = false;
    this.requiresFullExecute = false;
  }
}

module.exports.Statement = Statement;
