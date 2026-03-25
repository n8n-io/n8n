"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UnexpectedTokenError = exports.TokenHandler = exports.RequestTokenHandler = exports.Login7TokenHandler = exports.InitialSqlTokenHandler = exports.AttentionTokenHandler = void 0;
var _request = _interopRequireDefault(require("../request"));
var _errors = require("../errors");
var _esAggregateError = _interopRequireDefault(require("es-aggregate-error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class UnexpectedTokenError extends Error {
  constructor(handler, token) {
    super('Unexpected token `' + token.name + '` in `' + handler.constructor.name + '`');
  }
}
exports.UnexpectedTokenError = UnexpectedTokenError;
class TokenHandler {
  onInfoMessage(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onErrorMessage(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onSSPI(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onDatabaseChange(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onLanguageChange(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onCharsetChange(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onSqlCollationChange(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onRoutingChange(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onPacketSizeChange(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onResetConnection(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onBeginTransaction(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onCommitTransaction(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onRollbackTransaction(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onFedAuthInfo(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onFeatureExtAck(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onLoginAck(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onColMetadata(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onOrder(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onRow(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onReturnStatus(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onReturnValue(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onDoneProc(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onDoneInProc(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onDone(token) {
    throw new UnexpectedTokenError(this, token);
  }
  onDatabaseMirroringPartner(token) {
    throw new UnexpectedTokenError(this, token);
  }
}

/**
 * A handler for tokens received in the response message to the initial SQL Batch request
 * that sets up different connection settings.
 */
exports.TokenHandler = TokenHandler;
class InitialSqlTokenHandler extends TokenHandler {
  constructor(connection) {
    super();
    this.connection = connection;
  }
  onInfoMessage(token) {
    this.connection.emit('infoMessage', token);
  }
  onErrorMessage(token) {
    this.connection.emit('errorMessage', token);
  }
  onDatabaseChange(token) {
    this.connection.emit('databaseChange', token.newValue);
  }
  onLanguageChange(token) {
    this.connection.emit('languageChange', token.newValue);
  }
  onCharsetChange(token) {
    this.connection.emit('charsetChange', token.newValue);
  }
  onSqlCollationChange(token) {
    this.connection.databaseCollation = token.newValue;
  }
  onPacketSizeChange(token) {
    this.connection.messageIo.packetSize(token.newValue);
  }
  onBeginTransaction(token) {
    this.connection.transactionDescriptors.push(token.newValue);
    this.connection.inTransaction = true;
  }
  onCommitTransaction(token) {
    this.connection.transactionDescriptors.length = 1;
    this.connection.inTransaction = false;
  }
  onRollbackTransaction(token) {
    this.connection.transactionDescriptors.length = 1;
    // An outermost transaction was rolled back. Reset the transaction counter
    this.connection.inTransaction = false;
    this.connection.emit('rollbackTransaction');
  }
  onColMetadata(token) {
    this.connection.emit('error', new Error("Received 'columnMetadata' when no sqlRequest is in progress"));
    this.connection.close();
  }
  onOrder(token) {
    this.connection.emit('error', new Error("Received 'order' when no sqlRequest is in progress"));
    this.connection.close();
  }
  onRow(token) {
    this.connection.emit('error', new Error("Received 'row' when no sqlRequest is in progress"));
    this.connection.close();
  }
  onReturnStatus(token) {
    // Do nothing
  }
  onReturnValue(token) {
    // Do nothing
  }
  onDoneProc(token) {
    // Do nothing
  }
  onDoneInProc(token) {
    // Do nothing
  }
  onDone(token) {
    // Do nothing
  }
  onResetConnection(token) {
    this.connection.emit('resetConnection');
  }
}

/**
 * A handler for tokens received in the response message to a Login7 message.
 */
exports.InitialSqlTokenHandler = InitialSqlTokenHandler;
class Login7TokenHandler extends TokenHandler {
  constructor(connection) {
    super();
    this.loginAckReceived = false;
    this.connection = connection;
  }
  onInfoMessage(token) {
    this.connection.emit('infoMessage', token);
  }
  onErrorMessage(token) {
    this.connection.emit('errorMessage', token);
    const error = new _errors.ConnectionError(token.message, 'ELOGIN');
    const isLoginErrorTransient = this.connection.transientErrorLookup.isTransientError(token.number);
    if (isLoginErrorTransient && this.connection.curTransientRetryCount !== this.connection.config.options.maxRetriesOnTransientErrors) {
      error.isTransient = true;
    }
    this.connection.loginError = error;
  }
  onSSPI(token) {
    if (token.ntlmpacket) {
      this.connection.ntlmpacket = token.ntlmpacket;
      this.connection.ntlmpacketBuffer = token.ntlmpacketBuffer;
    }
  }
  onDatabaseChange(token) {
    this.connection.emit('databaseChange', token.newValue);
  }
  onLanguageChange(token) {
    this.connection.emit('languageChange', token.newValue);
  }
  onCharsetChange(token) {
    this.connection.emit('charsetChange', token.newValue);
  }
  onSqlCollationChange(token) {
    this.connection.databaseCollation = token.newValue;
  }
  onFedAuthInfo(token) {
    this.fedAuthInfoToken = token;
  }
  onFeatureExtAck(token) {
    const {
      authentication
    } = this.connection.config;
    if (authentication.type === 'azure-active-directory-password' || authentication.type === 'azure-active-directory-access-token' || authentication.type === 'azure-active-directory-msi-vm' || authentication.type === 'azure-active-directory-msi-app-service' || authentication.type === 'azure-active-directory-service-principal-secret' || authentication.type === 'azure-active-directory-default') {
      if (token.fedAuth === undefined) {
        this.connection.loginError = new _errors.ConnectionError('Did not receive Active Directory authentication acknowledgement');
      } else if (token.fedAuth.length !== 0) {
        this.connection.loginError = new _errors.ConnectionError(`Active Directory authentication acknowledgment for ${authentication.type} authentication method includes extra data`);
      }
    } else if (token.fedAuth === undefined && token.utf8Support === undefined) {
      this.connection.loginError = new _errors.ConnectionError('Received acknowledgement for unknown feature');
    } else if (token.fedAuth) {
      this.connection.loginError = new _errors.ConnectionError('Did not request Active Directory authentication, but received the acknowledgment');
    }
  }
  onLoginAck(token) {
    if (!token.tdsVersion) {
      // unsupported TDS version
      this.connection.loginError = new _errors.ConnectionError('Server responded with unknown TDS version.', 'ETDS');
      return;
    }
    if (!token.interface) {
      // unsupported interface
      this.connection.loginError = new _errors.ConnectionError('Server responded with unsupported interface.', 'EINTERFACENOTSUPP');
      return;
    }

    // use negotiated version
    this.connection.config.options.tdsVersion = token.tdsVersion;
    this.loginAckReceived = true;
  }
  onRoutingChange(token) {
    // Removes instance name attached to the redirect url. E.g., redirect.db.net\instance1 --> redirect.db.net
    const [server] = token.newValue.server.split('\\');
    this.routingData = {
      server,
      port: token.newValue.port
    };
  }
  onDoneInProc(token) {
    // Do nothing
  }
  onDone(token) {
    // Do nothing
  }
  onPacketSizeChange(token) {
    this.connection.messageIo.packetSize(token.newValue);
  }
  onDatabaseMirroringPartner(token) {
    // Do nothing
  }
}

/**
 * A handler for tokens received in the response message to a RPC Request,
 * a SQL Batch Request, a Bulk Load BCP Request or a Transaction Manager Request.
 */
exports.Login7TokenHandler = Login7TokenHandler;
class RequestTokenHandler extends TokenHandler {
  constructor(connection, request) {
    super();
    this.connection = connection;
    this.request = request;
    this.errors = [];
  }
  onInfoMessage(token) {
    this.connection.emit('infoMessage', token);
  }
  onErrorMessage(token) {
    this.connection.emit('errorMessage', token);
    if (!this.request.canceled) {
      const error = new _errors.RequestError(token.message, 'EREQUEST');
      error.number = token.number;
      error.state = token.state;
      error.class = token.class;
      error.serverName = token.serverName;
      error.procName = token.procName;
      error.lineNumber = token.lineNumber;
      this.errors.push(error);
      this.request.error = error;
      if (this.request instanceof _request.default && this.errors.length > 1) {
        this.request.error = new _esAggregateError.default(this.errors);
      }
    }
  }
  onDatabaseChange(token) {
    this.connection.emit('databaseChange', token.newValue);
  }
  onLanguageChange(token) {
    this.connection.emit('languageChange', token.newValue);
  }
  onCharsetChange(token) {
    this.connection.emit('charsetChange', token.newValue);
  }
  onSqlCollationChange(token) {
    this.connection.databaseCollation = token.newValue;
  }
  onPacketSizeChange(token) {
    this.connection.messageIo.packetSize(token.newValue);
  }
  onBeginTransaction(token) {
    this.connection.transactionDescriptors.push(token.newValue);
    this.connection.inTransaction = true;
  }
  onCommitTransaction(token) {
    this.connection.transactionDescriptors.length = 1;
    this.connection.inTransaction = false;
  }
  onRollbackTransaction(token) {
    this.connection.transactionDescriptors.length = 1;
    // An outermost transaction was rolled back. Reset the transaction counter
    this.connection.inTransaction = false;
    this.connection.emit('rollbackTransaction');
  }
  onColMetadata(token) {
    if (!this.request.canceled) {
      if (this.connection.config.options.useColumnNames) {
        const columns = Object.create(null);
        for (let j = 0, len = token.columns.length; j < len; j++) {
          const col = token.columns[j];
          if (columns[col.colName] == null) {
            columns[col.colName] = col;
          }
        }
        this.request.emit('columnMetadata', columns);
      } else {
        this.request.emit('columnMetadata', token.columns);
      }
    }
  }
  onOrder(token) {
    if (!this.request.canceled) {
      this.request.emit('order', token.orderColumns);
    }
  }
  onRow(token) {
    if (!this.request.canceled) {
      if (this.connection.config.options.rowCollectionOnRequestCompletion) {
        this.request.rows.push(token.columns);
      }
      if (this.connection.config.options.rowCollectionOnDone) {
        this.request.rst.push(token.columns);
      }
      this.request.emit('row', token.columns);
    }
  }
  onReturnStatus(token) {
    if (!this.request.canceled) {
      // Keep value for passing in 'doneProc' event.
      this.connection.procReturnStatusValue = token.value;
    }
  }
  onReturnValue(token) {
    if (!this.request.canceled) {
      this.request.emit('returnValue', token.paramName, token.value, token.metadata);
    }
  }
  onDoneProc(token) {
    if (!this.request.canceled) {
      if (token.sqlError && !this.request.error) {
        // check if the DONE_ERROR flags was set, but an ERROR token was not sent.
        this.request.error = new _errors.RequestError('An unknown error has occurred.', 'UNKNOWN');
      }
      this.request.emit('doneProc', token.rowCount, token.more, this.connection.procReturnStatusValue, this.request.rst);
      this.connection.procReturnStatusValue = undefined;
      if (token.rowCount !== undefined) {
        this.request.rowCount += token.rowCount;
      }
      if (this.connection.config.options.rowCollectionOnDone) {
        this.request.rst = [];
      }
    }
  }
  onDoneInProc(token) {
    if (!this.request.canceled) {
      this.request.emit('doneInProc', token.rowCount, token.more, this.request.rst);
      if (token.rowCount !== undefined) {
        this.request.rowCount += token.rowCount;
      }
      if (this.connection.config.options.rowCollectionOnDone) {
        this.request.rst = [];
      }
    }
  }
  onDone(token) {
    if (!this.request.canceled) {
      if (token.sqlError && !this.request.error) {
        // check if the DONE_ERROR flags was set, but an ERROR token was not sent.
        this.request.error = new _errors.RequestError('An unknown error has occurred.', 'UNKNOWN');
      }
      this.request.emit('done', token.rowCount, token.more, this.request.rst);
      if (token.rowCount !== undefined) {
        this.request.rowCount += token.rowCount;
      }
      if (this.connection.config.options.rowCollectionOnDone) {
        this.request.rst = [];
      }
    }
  }
  onResetConnection(token) {
    this.connection.emit('resetConnection');
  }
}

/**
 * A handler for the attention acknowledgement message.
 *
 * This message only contains a `DONE` token that acknowledges
 * that the attention message was received by the server.
 */
exports.RequestTokenHandler = RequestTokenHandler;
class AttentionTokenHandler extends TokenHandler {
  /**
   * Returns whether an attention acknowledgement was received.
   */

  constructor(connection, request) {
    super();
    this.connection = connection;
    this.request = request;
    this.attentionReceived = false;
  }
  onDone(token) {
    if (token.attention) {
      this.attentionReceived = true;
    }
  }
}
exports.AttentionTokenHandler = AttentionTokenHandler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfcmVxdWVzdCIsIl9pbnRlcm9wUmVxdWlyZURlZmF1bHQiLCJyZXF1aXJlIiwiX2Vycm9ycyIsIl9lc0FnZ3JlZ2F0ZUVycm9yIiwib2JqIiwiX19lc01vZHVsZSIsImRlZmF1bHQiLCJVbmV4cGVjdGVkVG9rZW5FcnJvciIsIkVycm9yIiwiY29uc3RydWN0b3IiLCJoYW5kbGVyIiwidG9rZW4iLCJuYW1lIiwiZXhwb3J0cyIsIlRva2VuSGFuZGxlciIsIm9uSW5mb01lc3NhZ2UiLCJvbkVycm9yTWVzc2FnZSIsIm9uU1NQSSIsIm9uRGF0YWJhc2VDaGFuZ2UiLCJvbkxhbmd1YWdlQ2hhbmdlIiwib25DaGFyc2V0Q2hhbmdlIiwib25TcWxDb2xsYXRpb25DaGFuZ2UiLCJvblJvdXRpbmdDaGFuZ2UiLCJvblBhY2tldFNpemVDaGFuZ2UiLCJvblJlc2V0Q29ubmVjdGlvbiIsIm9uQmVnaW5UcmFuc2FjdGlvbiIsIm9uQ29tbWl0VHJhbnNhY3Rpb24iLCJvblJvbGxiYWNrVHJhbnNhY3Rpb24iLCJvbkZlZEF1dGhJbmZvIiwib25GZWF0dXJlRXh0QWNrIiwib25Mb2dpbkFjayIsIm9uQ29sTWV0YWRhdGEiLCJvbk9yZGVyIiwib25Sb3ciLCJvblJldHVyblN0YXR1cyIsIm9uUmV0dXJuVmFsdWUiLCJvbkRvbmVQcm9jIiwib25Eb25lSW5Qcm9jIiwib25Eb25lIiwib25EYXRhYmFzZU1pcnJvcmluZ1BhcnRuZXIiLCJJbml0aWFsU3FsVG9rZW5IYW5kbGVyIiwiY29ubmVjdGlvbiIsImVtaXQiLCJuZXdWYWx1ZSIsImRhdGFiYXNlQ29sbGF0aW9uIiwibWVzc2FnZUlvIiwicGFja2V0U2l6ZSIsInRyYW5zYWN0aW9uRGVzY3JpcHRvcnMiLCJwdXNoIiwiaW5UcmFuc2FjdGlvbiIsImxlbmd0aCIsImNsb3NlIiwiTG9naW43VG9rZW5IYW5kbGVyIiwibG9naW5BY2tSZWNlaXZlZCIsImVycm9yIiwiQ29ubmVjdGlvbkVycm9yIiwibWVzc2FnZSIsImlzTG9naW5FcnJvclRyYW5zaWVudCIsInRyYW5zaWVudEVycm9yTG9va3VwIiwiaXNUcmFuc2llbnRFcnJvciIsIm51bWJlciIsImN1clRyYW5zaWVudFJldHJ5Q291bnQiLCJjb25maWciLCJvcHRpb25zIiwibWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzIiwiaXNUcmFuc2llbnQiLCJsb2dpbkVycm9yIiwibnRsbXBhY2tldCIsIm50bG1wYWNrZXRCdWZmZXIiLCJmZWRBdXRoSW5mb1Rva2VuIiwiYXV0aGVudGljYXRpb24iLCJ0eXBlIiwiZmVkQXV0aCIsInVuZGVmaW5lZCIsInV0ZjhTdXBwb3J0IiwidGRzVmVyc2lvbiIsImludGVyZmFjZSIsInNlcnZlciIsInNwbGl0Iiwicm91dGluZ0RhdGEiLCJwb3J0IiwiUmVxdWVzdFRva2VuSGFuZGxlciIsInJlcXVlc3QiLCJlcnJvcnMiLCJjYW5jZWxlZCIsIlJlcXVlc3RFcnJvciIsInN0YXRlIiwiY2xhc3MiLCJzZXJ2ZXJOYW1lIiwicHJvY05hbWUiLCJsaW5lTnVtYmVyIiwiUmVxdWVzdCIsIkFnZ3JlZ2F0ZUVycm9yIiwidXNlQ29sdW1uTmFtZXMiLCJjb2x1bW5zIiwiT2JqZWN0IiwiY3JlYXRlIiwiaiIsImxlbiIsImNvbCIsImNvbE5hbWUiLCJvcmRlckNvbHVtbnMiLCJyb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbiIsInJvd3MiLCJyb3dDb2xsZWN0aW9uT25Eb25lIiwicnN0IiwicHJvY1JldHVyblN0YXR1c1ZhbHVlIiwidmFsdWUiLCJwYXJhbU5hbWUiLCJtZXRhZGF0YSIsInNxbEVycm9yIiwicm93Q291bnQiLCJtb3JlIiwiQXR0ZW50aW9uVG9rZW5IYW5kbGVyIiwiYXR0ZW50aW9uUmVjZWl2ZWQiLCJhdHRlbnRpb24iXSwic291cmNlcyI6WyIuLi8uLi9zcmMvdG9rZW4vaGFuZGxlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ29ubmVjdGlvbiBmcm9tICcuLi9jb25uZWN0aW9uJztcbmltcG9ydCBSZXF1ZXN0IGZyb20gJy4uL3JlcXVlc3QnO1xuaW1wb3J0IHsgQ29ubmVjdGlvbkVycm9yLCBSZXF1ZXN0RXJyb3IgfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHsgdHlwZSBDb2x1bW5NZXRhZGF0YSB9IGZyb20gJy4vY29sbWV0YWRhdGEtdG9rZW4tcGFyc2VyJztcbmltcG9ydCB7XG4gIEJlZ2luVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbixcbiAgQ2hhcnNldEVudkNoYW5nZVRva2VuLFxuICBDb2xsYXRpb25DaGFuZ2VUb2tlbixcbiAgQ29sTWV0YWRhdGFUb2tlbixcbiAgQ29tbWl0VHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbixcbiAgRGF0YWJhc2VFbnZDaGFuZ2VUb2tlbixcbiAgRGF0YWJhc2VNaXJyb3JpbmdQYXJ0bmVyRW52Q2hhbmdlVG9rZW4sXG4gIERvbmVJblByb2NUb2tlbixcbiAgRG9uZVByb2NUb2tlbixcbiAgRG9uZVRva2VuLFxuICBFcnJvck1lc3NhZ2VUb2tlbixcbiAgRmVhdHVyZUV4dEFja1Rva2VuLFxuICBGZWRBdXRoSW5mb1Rva2VuLFxuICBJbmZvTWVzc2FnZVRva2VuLFxuICBMYW5ndWFnZUVudkNoYW5nZVRva2VuLFxuICBMb2dpbkFja1Rva2VuLFxuICBOQkNSb3dUb2tlbixcbiAgT3JkZXJUb2tlbixcbiAgUGFja2V0U2l6ZUVudkNoYW5nZVRva2VuLFxuICBSZXNldENvbm5lY3Rpb25FbnZDaGFuZ2VUb2tlbixcbiAgUmV0dXJuU3RhdHVzVG9rZW4sXG4gIFJldHVyblZhbHVlVG9rZW4sXG4gIFJvbGxiYWNrVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbixcbiAgUm91dGluZ0VudkNoYW5nZVRva2VuLFxuICBSb3dUb2tlbixcbiAgU1NQSVRva2VuLFxuICBUb2tlblxufSBmcm9tICcuL3Rva2VuJztcbmltcG9ydCBCdWxrTG9hZCBmcm9tICcuLi9idWxrLWxvYWQnO1xuXG5pbXBvcnQgQWdncmVnYXRlRXJyb3IgZnJvbSAnZXMtYWdncmVnYXRlLWVycm9yJztcblxuZXhwb3J0IGNsYXNzIFVuZXhwZWN0ZWRUb2tlbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihoYW5kbGVyOiBUb2tlbkhhbmRsZXIsIHRva2VuOiBUb2tlbikge1xuICAgIHN1cGVyKCdVbmV4cGVjdGVkIHRva2VuIGAnICsgdG9rZW4ubmFtZSArICdgIGluIGAnICsgaGFuZGxlci5jb25zdHJ1Y3Rvci5uYW1lICsgJ2AnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5IYW5kbGVyIHtcbiAgb25JbmZvTWVzc2FnZSh0b2tlbjogSW5mb01lc3NhZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbkVycm9yTWVzc2FnZSh0b2tlbjogRXJyb3JNZXNzYWdlVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25TU1BJKHRva2VuOiBTU1BJVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25EYXRhYmFzZUNoYW5nZSh0b2tlbjogRGF0YWJhc2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbkxhbmd1YWdlQ2hhbmdlKHRva2VuOiBMYW5ndWFnZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uQ2hhcnNldENoYW5nZSh0b2tlbjogQ2hhcnNldEVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uU3FsQ29sbGF0aW9uQ2hhbmdlKHRva2VuOiBDb2xsYXRpb25DaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJvdXRpbmdDaGFuZ2UodG9rZW46IFJvdXRpbmdFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblBhY2tldFNpemVDaGFuZ2UodG9rZW46IFBhY2tldFNpemVFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJlc2V0Q29ubmVjdGlvbih0b2tlbjogUmVzZXRDb25uZWN0aW9uRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25CZWdpblRyYW5zYWN0aW9uKHRva2VuOiBCZWdpblRyYW5zYWN0aW9uRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Db21taXRUcmFuc2FjdGlvbih0b2tlbjogQ29tbWl0VHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJvbGxiYWNrVHJhbnNhY3Rpb24odG9rZW46IFJvbGxiYWNrVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbkZlZEF1dGhJbmZvKHRva2VuOiBGZWRBdXRoSW5mb1Rva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uRmVhdHVyZUV4dEFjayh0b2tlbjogRmVhdHVyZUV4dEFja1Rva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uTG9naW5BY2sodG9rZW46IExvZ2luQWNrVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Db2xNZXRhZGF0YSh0b2tlbjogQ29sTWV0YWRhdGFUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbk9yZGVyKHRva2VuOiBPcmRlclRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uUm93KHRva2VuOiBSb3dUb2tlbiB8IE5CQ1Jvd1Rva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uUmV0dXJuU3RhdHVzKHRva2VuOiBSZXR1cm5TdGF0dXNUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJldHVyblZhbHVlKHRva2VuOiBSZXR1cm5WYWx1ZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uRG9uZVByb2ModG9rZW46IERvbmVQcm9jVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Eb25lSW5Qcm9jKHRva2VuOiBEb25lSW5Qcm9jVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Eb25lKHRva2VuOiBEb25lVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25EYXRhYmFzZU1pcnJvcmluZ1BhcnRuZXIodG9rZW46IERhdGFiYXNlTWlycm9yaW5nUGFydG5lckVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdG9rZW5zIHJlY2VpdmVkIGluIHRoZSByZXNwb25zZSBtZXNzYWdlIHRvIHRoZSBpbml0aWFsIFNRTCBCYXRjaCByZXF1ZXN0XG4gKiB0aGF0IHNldHMgdXAgZGlmZmVyZW50IGNvbm5lY3Rpb24gc2V0dGluZ3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbml0aWFsU3FsVG9rZW5IYW5kbGVyIGV4dGVuZHMgVG9rZW5IYW5kbGVyIHtcbiAgZGVjbGFyZSBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IENvbm5lY3Rpb24pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgfVxuXG4gIG9uSW5mb01lc3NhZ2UodG9rZW46IEluZm9NZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnaW5mb01lc3NhZ2UnLCB0b2tlbik7XG4gIH1cblxuICBvbkVycm9yTWVzc2FnZSh0b2tlbjogRXJyb3JNZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnZXJyb3JNZXNzYWdlJywgdG9rZW4pO1xuICB9XG5cbiAgb25EYXRhYmFzZUNoYW5nZSh0b2tlbjogRGF0YWJhc2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdkYXRhYmFzZUNoYW5nZScsIHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uTGFuZ3VhZ2VDaGFuZ2UodG9rZW46IExhbmd1YWdlRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnbGFuZ3VhZ2VDaGFuZ2UnLCB0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvbkNoYXJzZXRDaGFuZ2UodG9rZW46IENoYXJzZXRFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdjaGFyc2V0Q2hhbmdlJywgdG9rZW4ubmV3VmFsdWUpO1xuICB9XG5cbiAgb25TcWxDb2xsYXRpb25DaGFuZ2UodG9rZW46IENvbGxhdGlvbkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmRhdGFiYXNlQ29sbGF0aW9uID0gdG9rZW4ubmV3VmFsdWU7XG4gIH1cblxuICBvblBhY2tldFNpemVDaGFuZ2UodG9rZW46IFBhY2tldFNpemVFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5tZXNzYWdlSW8ucGFja2V0U2l6ZSh0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvbkJlZ2luVHJhbnNhY3Rpb24odG9rZW46IEJlZ2luVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLnB1c2godG9rZW4ubmV3VmFsdWUpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5pblRyYW5zYWN0aW9uID0gdHJ1ZTtcbiAgfVxuXG4gIG9uQ29tbWl0VHJhbnNhY3Rpb24odG9rZW46IENvbW1pdFRyYW5zYWN0aW9uRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24udHJhbnNhY3Rpb25EZXNjcmlwdG9ycy5sZW5ndGggPSAxO1xuICAgIHRoaXMuY29ubmVjdGlvbi5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gIH1cblxuICBvblJvbGxiYWNrVHJhbnNhY3Rpb24odG9rZW46IFJvbGxiYWNrVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLmxlbmd0aCA9IDE7XG4gICAgLy8gQW4gb3V0ZXJtb3N0IHRyYW5zYWN0aW9uIHdhcyByb2xsZWQgYmFjay4gUmVzZXQgdGhlIHRyYW5zYWN0aW9uIGNvdW50ZXJcbiAgICB0aGlzLmNvbm5lY3Rpb24uaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdyb2xsYmFja1RyYW5zYWN0aW9uJyk7XG4gIH1cblxuICBvbkNvbE1ldGFkYXRhKHRva2VuOiBDb2xNZXRhZGF0YVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKFwiUmVjZWl2ZWQgJ2NvbHVtbk1ldGFkYXRhJyB3aGVuIG5vIHNxbFJlcXVlc3QgaXMgaW4gcHJvZ3Jlc3NcIikpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5jbG9zZSgpO1xuICB9XG5cbiAgb25PcmRlcih0b2tlbjogT3JkZXJUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcihcIlJlY2VpdmVkICdvcmRlcicgd2hlbiBubyBzcWxSZXF1ZXN0IGlzIGluIHByb2dyZXNzXCIpKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgfVxuXG4gIG9uUm93KHRva2VuOiBSb3dUb2tlbiB8IE5CQ1Jvd1Rva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKFwiUmVjZWl2ZWQgJ3Jvdycgd2hlbiBubyBzcWxSZXF1ZXN0IGlzIGluIHByb2dyZXNzXCIpKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgfVxuXG4gIG9uUmV0dXJuU3RhdHVzKHRva2VuOiBSZXR1cm5TdGF0dXNUb2tlbikge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIG9uUmV0dXJuVmFsdWUodG9rZW46IFJldHVyblZhbHVlVG9rZW4pIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cblxuICBvbkRvbmVQcm9jKHRva2VuOiBEb25lUHJvY1Rva2VuKSB7XG4gICAgLy8gRG8gbm90aGluZ1xuICB9XG5cbiAgb25Eb25lSW5Qcm9jKHRva2VuOiBEb25lSW5Qcm9jVG9rZW4pIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cblxuICBvbkRvbmUodG9rZW46IERvbmVUb2tlbikge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIG9uUmVzZXRDb25uZWN0aW9uKHRva2VuOiBSZXNldENvbm5lY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdyZXNldENvbm5lY3Rpb24nKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdG9rZW5zIHJlY2VpdmVkIGluIHRoZSByZXNwb25zZSBtZXNzYWdlIHRvIGEgTG9naW43IG1lc3NhZ2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dpbjdUb2tlbkhhbmRsZXIgZXh0ZW5kcyBUb2tlbkhhbmRsZXIge1xuICBkZWNsYXJlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG5cbiAgZGVjbGFyZSBmZWRBdXRoSW5mb1Rva2VuOiBGZWRBdXRoSW5mb1Rva2VuIHwgdW5kZWZpbmVkO1xuICBkZWNsYXJlIHJvdXRpbmdEYXRhOiB7IHNlcnZlcjogc3RyaW5nLCBwb3J0OiBudW1iZXIgfSB8IHVuZGVmaW5lZDtcblxuICBkZWNsYXJlIGxvZ2luQWNrUmVjZWl2ZWQ6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoY29ubmVjdGlvbjogQ29ubmVjdGlvbikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5sb2dpbkFja1JlY2VpdmVkID0gZmFsc2U7XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgfVxuXG4gIG9uSW5mb01lc3NhZ2UodG9rZW46IEluZm9NZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnaW5mb01lc3NhZ2UnLCB0b2tlbik7XG4gIH1cblxuICBvbkVycm9yTWVzc2FnZSh0b2tlbjogRXJyb3JNZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnZXJyb3JNZXNzYWdlJywgdG9rZW4pO1xuXG4gICAgY29uc3QgZXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKHRva2VuLm1lc3NhZ2UsICdFTE9HSU4nKTtcblxuICAgIGNvbnN0IGlzTG9naW5FcnJvclRyYW5zaWVudCA9IHRoaXMuY29ubmVjdGlvbi50cmFuc2llbnRFcnJvckxvb2t1cC5pc1RyYW5zaWVudEVycm9yKHRva2VuLm51bWJlcik7XG4gICAgaWYgKGlzTG9naW5FcnJvclRyYW5zaWVudCAmJiB0aGlzLmNvbm5lY3Rpb24uY3VyVHJhbnNpZW50UmV0cnlDb3VudCAhPT0gdGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycykge1xuICAgICAgZXJyb3IuaXNUcmFuc2llbnQgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGlvbi5sb2dpbkVycm9yID0gZXJyb3I7XG4gIH1cblxuICBvblNTUEkodG9rZW46IFNTUElUb2tlbikge1xuICAgIGlmICh0b2tlbi5udGxtcGFja2V0KSB7XG4gICAgICB0aGlzLmNvbm5lY3Rpb24ubnRsbXBhY2tldCA9IHRva2VuLm50bG1wYWNrZXQ7XG4gICAgICB0aGlzLmNvbm5lY3Rpb24ubnRsbXBhY2tldEJ1ZmZlciA9IHRva2VuLm50bG1wYWNrZXRCdWZmZXI7XG4gICAgfVxuICB9XG5cbiAgb25EYXRhYmFzZUNoYW5nZSh0b2tlbjogRGF0YWJhc2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdkYXRhYmFzZUNoYW5nZScsIHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uTGFuZ3VhZ2VDaGFuZ2UodG9rZW46IExhbmd1YWdlRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnbGFuZ3VhZ2VDaGFuZ2UnLCB0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvbkNoYXJzZXRDaGFuZ2UodG9rZW46IENoYXJzZXRFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdjaGFyc2V0Q2hhbmdlJywgdG9rZW4ubmV3VmFsdWUpO1xuICB9XG5cbiAgb25TcWxDb2xsYXRpb25DaGFuZ2UodG9rZW46IENvbGxhdGlvbkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmRhdGFiYXNlQ29sbGF0aW9uID0gdG9rZW4ubmV3VmFsdWU7XG4gIH1cblxuICBvbkZlZEF1dGhJbmZvKHRva2VuOiBGZWRBdXRoSW5mb1Rva2VuKSB7XG4gICAgdGhpcy5mZWRBdXRoSW5mb1Rva2VuID0gdG9rZW47XG4gIH1cblxuICBvbkZlYXR1cmVFeHRBY2sodG9rZW46IEZlYXR1cmVFeHRBY2tUb2tlbikge1xuICAgIGNvbnN0IHsgYXV0aGVudGljYXRpb24gfSA9IHRoaXMuY29ubmVjdGlvbi5jb25maWc7XG5cbiAgICBpZiAoYXV0aGVudGljYXRpb24udHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmQnIHx8IGF1dGhlbnRpY2F0aW9uLnR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbicgfHwgYXV0aGVudGljYXRpb24udHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJyB8fCBhdXRoZW50aWNhdGlvbi50eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnIHx8IGF1dGhlbnRpY2F0aW9uLnR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCcgfHwgYXV0aGVudGljYXRpb24udHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCcpIHtcbiAgICAgIGlmICh0b2tlbi5mZWRBdXRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLmxvZ2luRXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKCdEaWQgbm90IHJlY2VpdmUgQWN0aXZlIERpcmVjdG9yeSBhdXRoZW50aWNhdGlvbiBhY2tub3dsZWRnZW1lbnQnKTtcbiAgICAgIH0gZWxzZSBpZiAodG9rZW4uZmVkQXV0aC5sZW5ndGggIT09IDApIHtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLmxvZ2luRXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKGBBY3RpdmUgRGlyZWN0b3J5IGF1dGhlbnRpY2F0aW9uIGFja25vd2xlZGdtZW50IGZvciAke2F1dGhlbnRpY2F0aW9uLnR5cGV9IGF1dGhlbnRpY2F0aW9uIG1ldGhvZCBpbmNsdWRlcyBleHRyYSBkYXRhYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0b2tlbi5mZWRBdXRoID09PSB1bmRlZmluZWQgJiYgdG9rZW4udXRmOFN1cHBvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5jb25uZWN0aW9uLmxvZ2luRXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKCdSZWNlaXZlZCBhY2tub3dsZWRnZW1lbnQgZm9yIHVua25vd24gZmVhdHVyZScpO1xuICAgIH0gZWxzZSBpZiAodG9rZW4uZmVkQXV0aCkge1xuICAgICAgdGhpcy5jb25uZWN0aW9uLmxvZ2luRXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKCdEaWQgbm90IHJlcXVlc3QgQWN0aXZlIERpcmVjdG9yeSBhdXRoZW50aWNhdGlvbiwgYnV0IHJlY2VpdmVkIHRoZSBhY2tub3dsZWRnbWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIG9uTG9naW5BY2sodG9rZW46IExvZ2luQWNrVG9rZW4pIHtcbiAgICBpZiAoIXRva2VuLnRkc1ZlcnNpb24pIHtcbiAgICAgIC8vIHVuc3VwcG9ydGVkIFREUyB2ZXJzaW9uXG4gICAgICB0aGlzLmNvbm5lY3Rpb24ubG9naW5FcnJvciA9IG5ldyBDb25uZWN0aW9uRXJyb3IoJ1NlcnZlciByZXNwb25kZWQgd2l0aCB1bmtub3duIFREUyB2ZXJzaW9uLicsICdFVERTJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0b2tlbi5pbnRlcmZhY2UpIHtcbiAgICAgIC8vIHVuc3VwcG9ydGVkIGludGVyZmFjZVxuICAgICAgdGhpcy5jb25uZWN0aW9uLmxvZ2luRXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKCdTZXJ2ZXIgcmVzcG9uZGVkIHdpdGggdW5zdXBwb3J0ZWQgaW50ZXJmYWNlLicsICdFSU5URVJGQUNFTk9UU1VQUCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHVzZSBuZWdvdGlhdGVkIHZlcnNpb25cbiAgICB0aGlzLmNvbm5lY3Rpb24uY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA9IHRva2VuLnRkc1ZlcnNpb247XG5cbiAgICB0aGlzLmxvZ2luQWNrUmVjZWl2ZWQgPSB0cnVlO1xuICB9XG5cbiAgb25Sb3V0aW5nQ2hhbmdlKHRva2VuOiBSb3V0aW5nRW52Q2hhbmdlVG9rZW4pIHtcbiAgICAvLyBSZW1vdmVzIGluc3RhbmNlIG5hbWUgYXR0YWNoZWQgdG8gdGhlIHJlZGlyZWN0IHVybC4gRS5nLiwgcmVkaXJlY3QuZGIubmV0XFxpbnN0YW5jZTEgLS0+IHJlZGlyZWN0LmRiLm5ldFxuICAgIGNvbnN0IFsgc2VydmVyIF0gPSB0b2tlbi5uZXdWYWx1ZS5zZXJ2ZXIuc3BsaXQoJ1xcXFwnKTtcblxuICAgIHRoaXMucm91dGluZ0RhdGEgPSB7XG4gICAgICBzZXJ2ZXIsIHBvcnQ6IHRva2VuLm5ld1ZhbHVlLnBvcnRcbiAgICB9O1xuICB9XG5cbiAgb25Eb25lSW5Qcm9jKHRva2VuOiBEb25lSW5Qcm9jVG9rZW4pIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cblxuICBvbkRvbmUodG9rZW46IERvbmVUb2tlbikge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIG9uUGFja2V0U2l6ZUNoYW5nZSh0b2tlbjogUGFja2V0U2l6ZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLm1lc3NhZ2VJby5wYWNrZXRTaXplKHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uRGF0YWJhc2VNaXJyb3JpbmdQYXJ0bmVyKHRva2VuOiBEYXRhYmFzZU1pcnJvcmluZ1BhcnRuZXJFbnZDaGFuZ2VUb2tlbikge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdG9rZW5zIHJlY2VpdmVkIGluIHRoZSByZXNwb25zZSBtZXNzYWdlIHRvIGEgUlBDIFJlcXVlc3QsXG4gKiBhIFNRTCBCYXRjaCBSZXF1ZXN0LCBhIEJ1bGsgTG9hZCBCQ1AgUmVxdWVzdCBvciBhIFRyYW5zYWN0aW9uIE1hbmFnZXIgUmVxdWVzdC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlcXVlc3RUb2tlbkhhbmRsZXIgZXh0ZW5kcyBUb2tlbkhhbmRsZXIge1xuICBkZWNsYXJlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG4gIGRlY2xhcmUgcmVxdWVzdDogUmVxdWVzdCB8IEJ1bGtMb2FkO1xuICBkZWNsYXJlIGVycm9yczogUmVxdWVzdEVycm9yW107XG5cbiAgY29uc3RydWN0b3IoY29ubmVjdGlvbjogQ29ubmVjdGlvbiwgcmVxdWVzdDogUmVxdWVzdCB8IEJ1bGtMb2FkKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgdGhpcy5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICB0aGlzLmVycm9ycyA9IFtdO1xuICB9XG5cbiAgb25JbmZvTWVzc2FnZSh0b2tlbjogSW5mb01lc3NhZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdpbmZvTWVzc2FnZScsIHRva2VuKTtcbiAgfVxuXG4gIG9uRXJyb3JNZXNzYWdlKHRva2VuOiBFcnJvck1lc3NhZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdlcnJvck1lc3NhZ2UnLCB0b2tlbik7XG5cbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgUmVxdWVzdEVycm9yKHRva2VuLm1lc3NhZ2UsICdFUkVRVUVTVCcpO1xuXG4gICAgICBlcnJvci5udW1iZXIgPSB0b2tlbi5udW1iZXI7XG4gICAgICBlcnJvci5zdGF0ZSA9IHRva2VuLnN0YXRlO1xuICAgICAgZXJyb3IuY2xhc3MgPSB0b2tlbi5jbGFzcztcbiAgICAgIGVycm9yLnNlcnZlck5hbWUgPSB0b2tlbi5zZXJ2ZXJOYW1lO1xuICAgICAgZXJyb3IucHJvY05hbWUgPSB0b2tlbi5wcm9jTmFtZTtcbiAgICAgIGVycm9yLmxpbmVOdW1iZXIgPSB0b2tlbi5saW5lTnVtYmVyO1xuICAgICAgdGhpcy5lcnJvcnMucHVzaChlcnJvcik7XG4gICAgICB0aGlzLnJlcXVlc3QuZXJyb3IgPSBlcnJvcjtcbiAgICAgIGlmICh0aGlzLnJlcXVlc3QgaW5zdGFuY2VvZiBSZXF1ZXN0ICYmIHRoaXMuZXJyb3JzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LmVycm9yID0gbmV3IEFnZ3JlZ2F0ZUVycm9yKHRoaXMuZXJyb3JzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBvbkRhdGFiYXNlQ2hhbmdlKHRva2VuOiBEYXRhYmFzZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2RhdGFiYXNlQ2hhbmdlJywgdG9rZW4ubmV3VmFsdWUpO1xuICB9XG5cbiAgb25MYW5ndWFnZUNoYW5nZSh0b2tlbjogTGFuZ3VhZ2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdsYW5ndWFnZUNoYW5nZScsIHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uQ2hhcnNldENoYW5nZSh0b2tlbjogQ2hhcnNldEVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2NoYXJzZXRDaGFuZ2UnLCB0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvblNxbENvbGxhdGlvbkNoYW5nZSh0b2tlbjogQ29sbGF0aW9uQ2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZGF0YWJhc2VDb2xsYXRpb24gPSB0b2tlbi5uZXdWYWx1ZTtcbiAgfVxuXG4gIG9uUGFja2V0U2l6ZUNoYW5nZSh0b2tlbjogUGFja2V0U2l6ZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLm1lc3NhZ2VJby5wYWNrZXRTaXplKHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uQmVnaW5UcmFuc2FjdGlvbih0b2tlbjogQmVnaW5UcmFuc2FjdGlvbkVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnMucHVzaCh0b2tlbi5uZXdWYWx1ZSk7XG4gICAgdGhpcy5jb25uZWN0aW9uLmluVHJhbnNhY3Rpb24gPSB0cnVlO1xuICB9XG5cbiAgb25Db21taXRUcmFuc2FjdGlvbih0b2tlbjogQ29tbWl0VHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLmxlbmd0aCA9IDE7XG4gICAgdGhpcy5jb25uZWN0aW9uLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgfVxuXG4gIG9uUm9sbGJhY2tUcmFuc2FjdGlvbih0b2tlbjogUm9sbGJhY2tUcmFuc2FjdGlvbkVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnMubGVuZ3RoID0gMTtcbiAgICAvLyBBbiBvdXRlcm1vc3QgdHJhbnNhY3Rpb24gd2FzIHJvbGxlZCBiYWNrLiBSZXNldCB0aGUgdHJhbnNhY3Rpb24gY291bnRlclxuICAgIHRoaXMuY29ubmVjdGlvbi5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ3JvbGxiYWNrVHJhbnNhY3Rpb24nKTtcbiAgfVxuXG4gIG9uQ29sTWV0YWRhdGEodG9rZW46IENvbE1ldGFkYXRhVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5jb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcykge1xuICAgICAgICBjb25zdCBjb2x1bW5zOiB7IFtrZXk6IHN0cmluZ106IENvbHVtbk1ldGFkYXRhIH0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAgIGZvciAobGV0IGogPSAwLCBsZW4gPSB0b2tlbi5jb2x1bW5zLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgY29uc3QgY29sID0gdG9rZW4uY29sdW1uc1tqXTtcbiAgICAgICAgICBpZiAoY29sdW1uc1tjb2wuY29sTmFtZV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgY29sdW1uc1tjb2wuY29sTmFtZV0gPSBjb2w7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0LmVtaXQoJ2NvbHVtbk1ldGFkYXRhJywgY29sdW1ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlcXVlc3QuZW1pdCgnY29sdW1uTWV0YWRhdGEnLCB0b2tlbi5jb2x1bW5zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBvbk9yZGVyKHRva2VuOiBPcmRlclRva2VuKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdvcmRlcicsIHRva2VuLm9yZGVyQ29sdW1ucyk7XG4gICAgfVxuICB9XG5cbiAgb25Sb3codG9rZW46IFJvd1Rva2VuIHwgTkJDUm93VG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5jb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbikge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93cyEucHVzaCh0b2tlbi5jb2x1bW5zKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5jb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25Eb25lKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5yc3QhLnB1c2godG9rZW4uY29sdW1ucyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdyb3cnLCB0b2tlbi5jb2x1bW5zKTtcbiAgICB9XG4gIH1cblxuICBvblJldHVyblN0YXR1cyh0b2tlbjogUmV0dXJuU3RhdHVzVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgLy8gS2VlcCB2YWx1ZSBmb3IgcGFzc2luZyBpbiAnZG9uZVByb2MnIGV2ZW50LlxuICAgICAgdGhpcy5jb25uZWN0aW9uLnByb2NSZXR1cm5TdGF0dXNWYWx1ZSA9IHRva2VuLnZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIG9uUmV0dXJuVmFsdWUodG9rZW46IFJldHVyblZhbHVlVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgdGhpcy5yZXF1ZXN0LmVtaXQoJ3JldHVyblZhbHVlJywgdG9rZW4ucGFyYW1OYW1lLCB0b2tlbi52YWx1ZSwgdG9rZW4ubWV0YWRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIG9uRG9uZVByb2ModG9rZW46IERvbmVQcm9jVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgaWYgKHRva2VuLnNxbEVycm9yICYmICF0aGlzLnJlcXVlc3QuZXJyb3IpIHtcbiAgICAgICAgLy8gY2hlY2sgaWYgdGhlIERPTkVfRVJST1IgZmxhZ3Mgd2FzIHNldCwgYnV0IGFuIEVSUk9SIHRva2VuIHdhcyBub3Qgc2VudC5cbiAgICAgICAgdGhpcy5yZXF1ZXN0LmVycm9yID0gbmV3IFJlcXVlc3RFcnJvcignQW4gdW5rbm93biBlcnJvciBoYXMgb2NjdXJyZWQuJywgJ1VOS05PV04nKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXF1ZXN0LmVtaXQoJ2RvbmVQcm9jJywgdG9rZW4ucm93Q291bnQsIHRva2VuLm1vcmUsIHRoaXMuY29ubmVjdGlvbi5wcm9jUmV0dXJuU3RhdHVzVmFsdWUsIHRoaXMucmVxdWVzdC5yc3QpO1xuXG4gICAgICB0aGlzLmNvbm5lY3Rpb24ucHJvY1JldHVyblN0YXR1c1ZhbHVlID0gdW5kZWZpbmVkO1xuXG4gICAgICBpZiAodG9rZW4ucm93Q291bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93Q291bnQhICs9IHRva2VuLnJvd0NvdW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LnJzdCA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG9uRG9uZUluUHJvYyh0b2tlbjogRG9uZUluUHJvY1Rva2VuKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdkb25lSW5Qcm9jJywgdG9rZW4ucm93Q291bnQsIHRva2VuLm1vcmUsIHRoaXMucmVxdWVzdC5yc3QpO1xuXG4gICAgICBpZiAodG9rZW4ucm93Q291bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93Q291bnQhICs9IHRva2VuLnJvd0NvdW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LnJzdCA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG9uRG9uZSh0b2tlbjogRG9uZVRva2VuKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIGlmICh0b2tlbi5zcWxFcnJvciAmJiAhdGhpcy5yZXF1ZXN0LmVycm9yKSB7XG4gICAgICAgIC8vIGNoZWNrIGlmIHRoZSBET05FX0VSUk9SIGZsYWdzIHdhcyBzZXQsIGJ1dCBhbiBFUlJPUiB0b2tlbiB3YXMgbm90IHNlbnQuXG4gICAgICAgIHRoaXMucmVxdWVzdC5lcnJvciA9IG5ldyBSZXF1ZXN0RXJyb3IoJ0FuIHVua25vd24gZXJyb3IgaGFzIG9jY3VycmVkLicsICdVTktOT1dOJyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdkb25lJywgdG9rZW4ucm93Q291bnQsIHRva2VuLm1vcmUsIHRoaXMucmVxdWVzdC5yc3QpO1xuXG4gICAgICBpZiAodG9rZW4ucm93Q291bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93Q291bnQhICs9IHRva2VuLnJvd0NvdW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LnJzdCA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG9uUmVzZXRDb25uZWN0aW9uKHRva2VuOiBSZXNldENvbm5lY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdyZXNldENvbm5lY3Rpb24nKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdGhlIGF0dGVudGlvbiBhY2tub3dsZWRnZW1lbnQgbWVzc2FnZS5cbiAqXG4gKiBUaGlzIG1lc3NhZ2Ugb25seSBjb250YWlucyBhIGBET05FYCB0b2tlbiB0aGF0IGFja25vd2xlZGdlc1xuICogdGhhdCB0aGUgYXR0ZW50aW9uIG1lc3NhZ2Ugd2FzIHJlY2VpdmVkIGJ5IHRoZSBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBBdHRlbnRpb25Ub2tlbkhhbmRsZXIgZXh0ZW5kcyBUb2tlbkhhbmRsZXIge1xuICBkZWNsYXJlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG4gIGRlY2xhcmUgcmVxdWVzdDogUmVxdWVzdCB8IEJ1bGtMb2FkO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgYW4gYXR0ZW50aW9uIGFja25vd2xlZGdlbWVudCB3YXMgcmVjZWl2ZWQuXG4gICAqL1xuICBkZWNsYXJlIGF0dGVudGlvblJlY2VpdmVkOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IENvbm5lY3Rpb24sIHJlcXVlc3Q6IFJlcXVlc3QgfCBCdWxrTG9hZCkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIHRoaXMucmVxdWVzdCA9IHJlcXVlc3Q7XG5cbiAgICB0aGlzLmF0dGVudGlvblJlY2VpdmVkID0gZmFsc2U7XG4gIH1cblxuICBvbkRvbmUodG9rZW46IERvbmVUb2tlbikge1xuICAgIGlmICh0b2tlbi5hdHRlbnRpb24pIHtcbiAgICAgIHRoaXMuYXR0ZW50aW9uUmVjZWl2ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxufVxuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxJQUFBQSxRQUFBLEdBQUFDLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBQyxPQUFBLEdBQUFELE9BQUE7QUFpQ0EsSUFBQUUsaUJBQUEsR0FBQUgsc0JBQUEsQ0FBQUMsT0FBQTtBQUFnRCxTQUFBRCx1QkFBQUksR0FBQSxXQUFBQSxHQUFBLElBQUFBLEdBQUEsQ0FBQUMsVUFBQSxHQUFBRCxHQUFBLEtBQUFFLE9BQUEsRUFBQUYsR0FBQTtBQUV6QyxNQUFNRyxvQkFBb0IsU0FBU0MsS0FBSyxDQUFDO0VBQzlDQyxXQUFXQSxDQUFDQyxPQUFxQixFQUFFQyxLQUFZLEVBQUU7SUFDL0MsS0FBSyxDQUFDLG9CQUFvQixHQUFHQSxLQUFLLENBQUNDLElBQUksR0FBRyxRQUFRLEdBQUdGLE9BQU8sQ0FBQ0QsV0FB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