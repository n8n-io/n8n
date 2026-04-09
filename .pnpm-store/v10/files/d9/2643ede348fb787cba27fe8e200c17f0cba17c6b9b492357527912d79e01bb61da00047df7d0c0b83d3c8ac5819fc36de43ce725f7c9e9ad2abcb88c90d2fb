"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UnexpectedTokenError = exports.TokenHandler = exports.RequestTokenHandler = exports.Login7TokenHandler = exports.InitialSqlTokenHandler = exports.AttentionTokenHandler = void 0;
var _request = _interopRequireDefault(require("../request"));
var _errors = require("../errors");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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
  onDatabaseMirroringPartner(token) {
    this.connection.emit('databaseMirroringPartner', token.newValue);
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
    // Splits instance name attached to the redirect url. E.g., redirect.db.net\instance1 --> [redirect.db.net, instance1]
    const [server, instance] = token.newValue.server.split('\\');
    this.routingData = {
      server,
      port: token.newValue.port,
      instance
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
        this.request.error = new AggregateError(this.errors);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfcmVxdWVzdCIsIl9pbnRlcm9wUmVxdWlyZURlZmF1bHQiLCJyZXF1aXJlIiwiX2Vycm9ycyIsImUiLCJfX2VzTW9kdWxlIiwiZGVmYXVsdCIsIlVuZXhwZWN0ZWRUb2tlbkVycm9yIiwiRXJyb3IiLCJjb25zdHJ1Y3RvciIsImhhbmRsZXIiLCJ0b2tlbiIsIm5hbWUiLCJleHBvcnRzIiwiVG9rZW5IYW5kbGVyIiwib25JbmZvTWVzc2FnZSIsIm9uRXJyb3JNZXNzYWdlIiwib25TU1BJIiwib25EYXRhYmFzZUNoYW5nZSIsIm9uTGFuZ3VhZ2VDaGFuZ2UiLCJvbkNoYXJzZXRDaGFuZ2UiLCJvblNxbENvbGxhdGlvbkNoYW5nZSIsIm9uUm91dGluZ0NoYW5nZSIsIm9uUGFja2V0U2l6ZUNoYW5nZSIsIm9uUmVzZXRDb25uZWN0aW9uIiwib25CZWdpblRyYW5zYWN0aW9uIiwib25Db21taXRUcmFuc2FjdGlvbiIsIm9uUm9sbGJhY2tUcmFuc2FjdGlvbiIsIm9uRmVkQXV0aEluZm8iLCJvbkZlYXR1cmVFeHRBY2siLCJvbkxvZ2luQWNrIiwib25Db2xNZXRhZGF0YSIsIm9uT3JkZXIiLCJvblJvdyIsIm9uUmV0dXJuU3RhdHVzIiwib25SZXR1cm5WYWx1ZSIsIm9uRG9uZVByb2MiLCJvbkRvbmVJblByb2MiLCJvbkRvbmUiLCJvbkRhdGFiYXNlTWlycm9yaW5nUGFydG5lciIsIkluaXRpYWxTcWxUb2tlbkhhbmRsZXIiLCJjb25uZWN0aW9uIiwiZW1pdCIsIm5ld1ZhbHVlIiwiZGF0YWJhc2VDb2xsYXRpb24iLCJtZXNzYWdlSW8iLCJwYWNrZXRTaXplIiwidHJhbnNhY3Rpb25EZXNjcmlwdG9ycyIsInB1c2giLCJpblRyYW5zYWN0aW9uIiwibGVuZ3RoIiwiY2xvc2UiLCJMb2dpbjdUb2tlbkhhbmRsZXIiLCJsb2dpbkFja1JlY2VpdmVkIiwiZXJyb3IiLCJDb25uZWN0aW9uRXJyb3IiLCJtZXNzYWdlIiwiaXNMb2dpbkVycm9yVHJhbnNpZW50IiwidHJhbnNpZW50RXJyb3JMb29rdXAiLCJpc1RyYW5zaWVudEVycm9yIiwibnVtYmVyIiwiY3VyVHJhbnNpZW50UmV0cnlDb3VudCIsImNvbmZpZyIsIm9wdGlvbnMiLCJtYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnMiLCJpc1RyYW5zaWVudCIsImxvZ2luRXJyb3IiLCJudGxtcGFja2V0IiwibnRsbXBhY2tldEJ1ZmZlciIsImZlZEF1dGhJbmZvVG9rZW4iLCJhdXRoZW50aWNhdGlvbiIsInR5cGUiLCJmZWRBdXRoIiwidW5kZWZpbmVkIiwidXRmOFN1cHBvcnQiLCJ0ZHNWZXJzaW9uIiwiaW50ZXJmYWNlIiwic2VydmVyIiwiaW5zdGFuY2UiLCJzcGxpdCIsInJvdXRpbmdEYXRhIiwicG9ydCIsIlJlcXVlc3RUb2tlbkhhbmRsZXIiLCJyZXF1ZXN0IiwiZXJyb3JzIiwiY2FuY2VsZWQiLCJSZXF1ZXN0RXJyb3IiLCJzdGF0ZSIsImNsYXNzIiwic2VydmVyTmFtZSIsInByb2NOYW1lIiwibGluZU51bWJlciIsIlJlcXVlc3QiLCJBZ2dyZWdhdGVFcnJvciIsInVzZUNvbHVtbk5hbWVzIiwiY29sdW1ucyIsIk9iamVjdCIsImNyZWF0ZSIsImoiLCJsZW4iLCJjb2wiLCJjb2xOYW1lIiwib3JkZXJDb2x1bW5zIiwicm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb24iLCJyb3dzIiwicm93Q29sbGVjdGlvbk9uRG9uZSIsInJzdCIsInByb2NSZXR1cm5TdGF0dXNWYWx1ZSIsInZhbHVlIiwicGFyYW1OYW1lIiwibWV0YWRhdGEiLCJzcWxFcnJvciIsInJvd0NvdW50IiwibW9yZSIsIkF0dGVudGlvblRva2VuSGFuZGxlciIsImF0dGVudGlvblJlY2VpdmVkIiwiYXR0ZW50aW9uIl0sInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Rva2VuL2hhbmRsZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IENvbm5lY3Rpb24gZnJvbSAnLi4vY29ubmVjdGlvbic7XG5pbXBvcnQgUmVxdWVzdCBmcm9tICcuLi9yZXF1ZXN0JztcbmltcG9ydCB7IENvbm5lY3Rpb25FcnJvciwgUmVxdWVzdEVycm9yIH0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7IHR5cGUgQ29sdW1uTWV0YWRhdGEgfSBmcm9tICcuL2NvbG1ldGFkYXRhLXRva2VuLXBhcnNlcic7XG5pbXBvcnQge1xuICBCZWdpblRyYW5zYWN0aW9uRW52Q2hhbmdlVG9rZW4sXG4gIENoYXJzZXRFbnZDaGFuZ2VUb2tlbixcbiAgQ29sbGF0aW9uQ2hhbmdlVG9rZW4sXG4gIENvbE1ldGFkYXRhVG9rZW4sXG4gIENvbW1pdFRyYW5zYWN0aW9uRW52Q2hhbmdlVG9rZW4sXG4gIERhdGFiYXNlRW52Q2hhbmdlVG9rZW4sXG4gIERhdGFiYXNlTWlycm9yaW5nUGFydG5lckVudkNoYW5nZVRva2VuLFxuICBEb25lSW5Qcm9jVG9rZW4sXG4gIERvbmVQcm9jVG9rZW4sXG4gIERvbmVUb2tlbixcbiAgRXJyb3JNZXNzYWdlVG9rZW4sXG4gIEZlYXR1cmVFeHRBY2tUb2tlbixcbiAgRmVkQXV0aEluZm9Ub2tlbixcbiAgSW5mb01lc3NhZ2VUb2tlbixcbiAgTGFuZ3VhZ2VFbnZDaGFuZ2VUb2tlbixcbiAgTG9naW5BY2tUb2tlbixcbiAgTkJDUm93VG9rZW4sXG4gIE9yZGVyVG9rZW4sXG4gIFBhY2tldFNpemVFbnZDaGFuZ2VUb2tlbixcbiAgUmVzZXRDb25uZWN0aW9uRW52Q2hhbmdlVG9rZW4sXG4gIFJldHVyblN0YXR1c1Rva2VuLFxuICBSZXR1cm5WYWx1ZVRva2VuLFxuICBSb2xsYmFja1RyYW5zYWN0aW9uRW52Q2hhbmdlVG9rZW4sXG4gIFJvdXRpbmdFbnZDaGFuZ2VUb2tlbixcbiAgUm93VG9rZW4sXG4gIFNTUElUb2tlbixcbiAgVG9rZW5cbn0gZnJvbSAnLi90b2tlbic7XG5pbXBvcnQgQnVsa0xvYWQgZnJvbSAnLi4vYnVsay1sb2FkJztcblxuZXhwb3J0IGNsYXNzIFVuZXhwZWN0ZWRUb2tlbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihoYW5kbGVyOiBUb2tlbkhhbmRsZXIsIHRva2VuOiBUb2tlbikge1xuICAgIHN1cGVyKCdVbmV4cGVjdGVkIHRva2VuIGAnICsgdG9rZW4ubmFtZSArICdgIGluIGAnICsgaGFuZGxlci5jb25zdHJ1Y3Rvci5uYW1lICsgJ2AnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5IYW5kbGVyIHtcbiAgb25JbmZvTWVzc2FnZSh0b2tlbjogSW5mb01lc3NhZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbkVycm9yTWVzc2FnZSh0b2tlbjogRXJyb3JNZXNzYWdlVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25TU1BJKHRva2VuOiBTU1BJVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25EYXRhYmFzZUNoYW5nZSh0b2tlbjogRGF0YWJhc2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbkxhbmd1YWdlQ2hhbmdlKHRva2VuOiBMYW5ndWFnZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uQ2hhcnNldENoYW5nZSh0b2tlbjogQ2hhcnNldEVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uU3FsQ29sbGF0aW9uQ2hhbmdlKHRva2VuOiBDb2xsYXRpb25DaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJvdXRpbmdDaGFuZ2UodG9rZW46IFJvdXRpbmdFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblBhY2tldFNpemVDaGFuZ2UodG9rZW46IFBhY2tldFNpemVFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJlc2V0Q29ubmVjdGlvbih0b2tlbjogUmVzZXRDb25uZWN0aW9uRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25CZWdpblRyYW5zYWN0aW9uKHRva2VuOiBCZWdpblRyYW5zYWN0aW9uRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Db21taXRUcmFuc2FjdGlvbih0b2tlbjogQ29tbWl0VHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJvbGxiYWNrVHJhbnNhY3Rpb24odG9rZW46IFJvbGxiYWNrVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbkZlZEF1dGhJbmZvKHRva2VuOiBGZWRBdXRoSW5mb1Rva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uRmVhdHVyZUV4dEFjayh0b2tlbjogRmVhdHVyZUV4dEFja1Rva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uTG9naW5BY2sodG9rZW46IExvZ2luQWNrVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Db2xNZXRhZGF0YSh0b2tlbjogQ29sTWV0YWRhdGFUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvbk9yZGVyKHRva2VuOiBPcmRlclRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uUm93KHRva2VuOiBSb3dUb2tlbiB8IE5CQ1Jvd1Rva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uUmV0dXJuU3RhdHVzKHRva2VuOiBSZXR1cm5TdGF0dXNUb2tlbikge1xuICAgIHRocm93IG5ldyBVbmV4cGVjdGVkVG9rZW5FcnJvcih0aGlzLCB0b2tlbik7XG4gIH1cblxuICBvblJldHVyblZhbHVlKHRva2VuOiBSZXR1cm5WYWx1ZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxuXG4gIG9uRG9uZVByb2ModG9rZW46IERvbmVQcm9jVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Eb25lSW5Qcm9jKHRva2VuOiBEb25lSW5Qcm9jVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25Eb25lKHRva2VuOiBEb25lVG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgVW5leHBlY3RlZFRva2VuRXJyb3IodGhpcywgdG9rZW4pO1xuICB9XG5cbiAgb25EYXRhYmFzZU1pcnJvcmluZ1BhcnRuZXIodG9rZW46IERhdGFiYXNlTWlycm9yaW5nUGFydG5lckVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhyb3cgbmV3IFVuZXhwZWN0ZWRUb2tlbkVycm9yKHRoaXMsIHRva2VuKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdG9rZW5zIHJlY2VpdmVkIGluIHRoZSByZXNwb25zZSBtZXNzYWdlIHRvIHRoZSBpbml0aWFsIFNRTCBCYXRjaCByZXF1ZXN0XG4gKiB0aGF0IHNldHMgdXAgZGlmZmVyZW50IGNvbm5lY3Rpb24gc2V0dGluZ3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbml0aWFsU3FsVG9rZW5IYW5kbGVyIGV4dGVuZHMgVG9rZW5IYW5kbGVyIHtcbiAgZGVjbGFyZSBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IENvbm5lY3Rpb24pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgfVxuXG4gIG9uSW5mb01lc3NhZ2UodG9rZW46IEluZm9NZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnaW5mb01lc3NhZ2UnLCB0b2tlbik7XG4gIH1cblxuICBvbkVycm9yTWVzc2FnZSh0b2tlbjogRXJyb3JNZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnZXJyb3JNZXNzYWdlJywgdG9rZW4pO1xuICB9XG5cbiAgb25EYXRhYmFzZUNoYW5nZSh0b2tlbjogRGF0YWJhc2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdkYXRhYmFzZUNoYW5nZScsIHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uTGFuZ3VhZ2VDaGFuZ2UodG9rZW46IExhbmd1YWdlRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnbGFuZ3VhZ2VDaGFuZ2UnLCB0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvbkNoYXJzZXRDaGFuZ2UodG9rZW46IENoYXJzZXRFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdjaGFyc2V0Q2hhbmdlJywgdG9rZW4ubmV3VmFsdWUpO1xuICB9XG5cbiAgb25TcWxDb2xsYXRpb25DaGFuZ2UodG9rZW46IENvbGxhdGlvbkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmRhdGFiYXNlQ29sbGF0aW9uID0gdG9rZW4ubmV3VmFsdWU7XG4gIH1cblxuICBvblBhY2tldFNpemVDaGFuZ2UodG9rZW46IFBhY2tldFNpemVFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5tZXNzYWdlSW8ucGFja2V0U2l6ZSh0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvbkJlZ2luVHJhbnNhY3Rpb24odG9rZW46IEJlZ2luVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLnB1c2godG9rZW4ubmV3VmFsdWUpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5pblRyYW5zYWN0aW9uID0gdHJ1ZTtcbiAgfVxuXG4gIG9uQ29tbWl0VHJhbnNhY3Rpb24odG9rZW46IENvbW1pdFRyYW5zYWN0aW9uRW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24udHJhbnNhY3Rpb25EZXNjcmlwdG9ycy5sZW5ndGggPSAxO1xuICAgIHRoaXMuY29ubmVjdGlvbi5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gIH1cblxuICBvblJvbGxiYWNrVHJhbnNhY3Rpb24odG9rZW46IFJvbGxiYWNrVHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLmxlbmd0aCA9IDE7XG4gICAgLy8gQW4gb3V0ZXJtb3N0IHRyYW5zYWN0aW9uIHdhcyByb2xsZWQgYmFjay4gUmVzZXQgdGhlIHRyYW5zYWN0aW9uIGNvdW50ZXJcbiAgICB0aGlzLmNvbm5lY3Rpb24uaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdyb2xsYmFja1RyYW5zYWN0aW9uJyk7XG4gIH1cblxuICBvbkNvbE1ldGFkYXRhKHRva2VuOiBDb2xNZXRhZGF0YVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKFwiUmVjZWl2ZWQgJ2NvbHVtbk1ldGFkYXRhJyB3aGVuIG5vIHNxbFJlcXVlc3QgaXMgaW4gcHJvZ3Jlc3NcIikpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5jbG9zZSgpO1xuICB9XG5cbiAgb25PcmRlcih0b2tlbjogT3JkZXJUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcihcIlJlY2VpdmVkICdvcmRlcicgd2hlbiBubyBzcWxSZXF1ZXN0IGlzIGluIHByb2dyZXNzXCIpKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgfVxuXG4gIG9uUm93KHRva2VuOiBSb3dUb2tlbiB8IE5CQ1Jvd1Rva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKFwiUmVjZWl2ZWQgJ3Jvdycgd2hlbiBubyBzcWxSZXF1ZXN0IGlzIGluIHByb2dyZXNzXCIpKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgfVxuXG4gIG9uUmV0dXJuU3RhdHVzKHRva2VuOiBSZXR1cm5TdGF0dXNUb2tlbikge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIG9uUmV0dXJuVmFsdWUodG9rZW46IFJldHVyblZhbHVlVG9rZW4pIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cblxuICBvbkRvbmVQcm9jKHRva2VuOiBEb25lUHJvY1Rva2VuKSB7XG4gICAgLy8gRG8gbm90aGluZ1xuICB9XG5cbiAgb25Eb25lSW5Qcm9jKHRva2VuOiBEb25lSW5Qcm9jVG9rZW4pIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cblxuICBvbkRvbmUodG9rZW46IERvbmVUb2tlbikge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIG9uUmVzZXRDb25uZWN0aW9uKHRva2VuOiBSZXNldENvbm5lY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdyZXNldENvbm5lY3Rpb24nKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdG9rZW5zIHJlY2VpdmVkIGluIHRoZSByZXNwb25zZSBtZXNzYWdlIHRvIGEgTG9naW43IG1lc3NhZ2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dpbjdUb2tlbkhhbmRsZXIgZXh0ZW5kcyBUb2tlbkhhbmRsZXIge1xuICBkZWNsYXJlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG5cbiAgZGVjbGFyZSBmZWRBdXRoSW5mb1Rva2VuOiBGZWRBdXRoSW5mb1Rva2VuIHwgdW5kZWZpbmVkO1xuICBkZWNsYXJlIHJvdXRpbmdEYXRhOiB7IHNlcnZlcjogc3RyaW5nLCBwb3J0OiBudW1iZXIsIGluc3RhbmNlOiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcblxuICBkZWNsYXJlIGxvZ2luQWNrUmVjZWl2ZWQ6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoY29ubmVjdGlvbjogQ29ubmVjdGlvbikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5sb2dpbkFja1JlY2VpdmVkID0gZmFsc2U7XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgfVxuXG4gIG9uSW5mb01lc3NhZ2UodG9rZW46IEluZm9NZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnaW5mb01lc3NhZ2UnLCB0b2tlbik7XG4gIH1cblxuICBvbkVycm9yTWVzc2FnZSh0b2tlbjogRXJyb3JNZXNzYWdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnZXJyb3JNZXNzYWdlJywgdG9rZW4pO1xuXG4gICAgY29uc3QgZXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKHRva2VuLm1lc3NhZ2UsICdFTE9HSU4nKTtcblxuICAgIGNvbnN0IGlzTG9naW5FcnJvclRyYW5zaWVudCA9IHRoaXMuY29ubmVjdGlvbi50cmFuc2llbnRFcnJvckxvb2t1cC5pc1RyYW5zaWVudEVycm9yKHRva2VuLm51bWJlcik7XG4gICAgaWYgKGlzTG9naW5FcnJvclRyYW5zaWVudCAmJiB0aGlzLmNvbm5lY3Rpb24uY3VyVHJhbnNpZW50UmV0cnlDb3VudCAhPT0gdGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycykge1xuICAgICAgZXJyb3IuaXNUcmFuc2llbnQgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGlvbi5sb2dpbkVycm9yID0gZXJyb3I7XG4gIH1cblxuICBvblNTUEkodG9rZW46IFNTUElUb2tlbikge1xuICAgIGlmICh0b2tlbi5udGxtcGFja2V0KSB7XG4gICAgICB0aGlzLmNvbm5lY3Rpb24ubnRsbXBhY2tldCA9IHRva2VuLm50bG1wYWNrZXQ7XG4gICAgICB0aGlzLmNvbm5lY3Rpb24ubnRsbXBhY2tldEJ1ZmZlciA9IHRva2VuLm50bG1wYWNrZXRCdWZmZXI7XG4gICAgfVxuICB9XG5cbiAgb25EYXRhYmFzZUNoYW5nZSh0b2tlbjogRGF0YWJhc2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdkYXRhYmFzZUNoYW5nZScsIHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uRGF0YWJhc2VNaXJyb3JpbmdQYXJ0bmVyKHRva2VuOiBEYXRhYmFzZU1pcnJvcmluZ1BhcnRuZXJFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdkYXRhYmFzZU1pcnJvcmluZ1BhcnRuZXInLCB0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvbkxhbmd1YWdlQ2hhbmdlKHRva2VuOiBMYW5ndWFnZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2xhbmd1YWdlQ2hhbmdlJywgdG9rZW4ubmV3VmFsdWUpO1xuICB9XG5cbiAgb25DaGFyc2V0Q2hhbmdlKHRva2VuOiBDaGFyc2V0RW52Q2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW1pdCgnY2hhcnNldENoYW5nZScsIHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uU3FsQ29sbGF0aW9uQ2hhbmdlKHRva2VuOiBDb2xsYXRpb25DaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5kYXRhYmFzZUNvbGxhdGlvbiA9IHRva2VuLm5ld1ZhbHVlO1xuICB9XG5cbiAgb25GZWRBdXRoSW5mbyh0b2tlbjogRmVkQXV0aEluZm9Ub2tlbikge1xuICAgIHRoaXMuZmVkQXV0aEluZm9Ub2tlbiA9IHRva2VuO1xuICB9XG5cbiAgb25GZWF0dXJlRXh0QWNrKHRva2VuOiBGZWF0dXJlRXh0QWNrVG9rZW4pIHtcbiAgICBjb25zdCB7IGF1dGhlbnRpY2F0aW9uIH0gPSB0aGlzLmNvbm5lY3Rpb24uY29uZmlnO1xuXG4gICAgaWYgKGF1dGhlbnRpY2F0aW9uLnR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJyB8fCBhdXRoZW50aWNhdGlvbi50eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW4nIHx8IGF1dGhlbnRpY2F0aW9uLnR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bScgfHwgYXV0aGVudGljYXRpb24udHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJyB8fCBhdXRoZW50aWNhdGlvbi50eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnIHx8IGF1dGhlbnRpY2F0aW9uLnR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnKSB7XG4gICAgICBpZiAodG9rZW4uZmVkQXV0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbi5sb2dpbkVycm9yID0gbmV3IENvbm5lY3Rpb25FcnJvcignRGlkIG5vdCByZWNlaXZlIEFjdGl2ZSBEaXJlY3RvcnkgYXV0aGVudGljYXRpb24gYWNrbm93bGVkZ2VtZW50Jyk7XG4gICAgICB9IGVsc2UgaWYgKHRva2VuLmZlZEF1dGgubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbi5sb2dpbkVycm9yID0gbmV3IENvbm5lY3Rpb25FcnJvcihgQWN0aXZlIERpcmVjdG9yeSBhdXRoZW50aWNhdGlvbiBhY2tub3dsZWRnbWVudCBmb3IgJHthdXRoZW50aWNhdGlvbi50eXBlfSBhdXRoZW50aWNhdGlvbiBtZXRob2QgaW5jbHVkZXMgZXh0cmEgZGF0YWApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodG9rZW4uZmVkQXV0aCA9PT0gdW5kZWZpbmVkICYmIHRva2VuLnV0ZjhTdXBwb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvbi5sb2dpbkVycm9yID0gbmV3IENvbm5lY3Rpb25FcnJvcignUmVjZWl2ZWQgYWNrbm93bGVkZ2VtZW50IGZvciB1bmtub3duIGZlYXR1cmUnKTtcbiAgICB9IGVsc2UgaWYgKHRva2VuLmZlZEF1dGgpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvbi5sb2dpbkVycm9yID0gbmV3IENvbm5lY3Rpb25FcnJvcignRGlkIG5vdCByZXF1ZXN0IEFjdGl2ZSBEaXJlY3RvcnkgYXV0aGVudGljYXRpb24sIGJ1dCByZWNlaXZlZCB0aGUgYWNrbm93bGVkZ21lbnQnKTtcbiAgICB9XG4gIH1cblxuICBvbkxvZ2luQWNrKHRva2VuOiBMb2dpbkFja1Rva2VuKSB7XG4gICAgaWYgKCF0b2tlbi50ZHNWZXJzaW9uKSB7XG4gICAgICAvLyB1bnN1cHBvcnRlZCBURFMgdmVyc2lvblxuICAgICAgdGhpcy5jb25uZWN0aW9uLmxvZ2luRXJyb3IgPSBuZXcgQ29ubmVjdGlvbkVycm9yKCdTZXJ2ZXIgcmVzcG9uZGVkIHdpdGggdW5rbm93biBURFMgdmVyc2lvbi4nLCAnRVREUycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdG9rZW4uaW50ZXJmYWNlKSB7XG4gICAgICAvLyB1bnN1cHBvcnRlZCBpbnRlcmZhY2VcbiAgICAgIHRoaXMuY29ubmVjdGlvbi5sb2dpbkVycm9yID0gbmV3IENvbm5lY3Rpb25FcnJvcignU2VydmVyIHJlc3BvbmRlZCB3aXRoIHVuc3VwcG9ydGVkIGludGVyZmFjZS4nLCAnRUlOVEVSRkFDRU5PVFNVUFAnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyB1c2UgbmVnb3RpYXRlZCB2ZXJzaW9uXG4gICAgdGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPSB0b2tlbi50ZHNWZXJzaW9uO1xuXG4gICAgdGhpcy5sb2dpbkFja1JlY2VpdmVkID0gdHJ1ZTtcbiAgfVxuXG4gIG9uUm91dGluZ0NoYW5nZSh0b2tlbjogUm91dGluZ0VudkNoYW5nZVRva2VuKSB7XG4gICAgLy8gU3BsaXRzIGluc3RhbmNlIG5hbWUgYXR0YWNoZWQgdG8gdGhlIHJlZGlyZWN0IHVybC4gRS5nLiwgcmVkaXJlY3QuZGIubmV0XFxpbnN0YW5jZTEgLS0+IFtyZWRpcmVjdC5kYi5uZXQsIGluc3RhbmNlMV1cbiAgICBjb25zdCBbIHNlcnZlciwgaW5zdGFuY2UgXSA9IHRva2VuLm5ld1ZhbHVlLnNlcnZlci5zcGxpdCgnXFxcXCcpO1xuXG4gICAgdGhpcy5yb3V0aW5nRGF0YSA9IHtcbiAgICAgIHNlcnZlciwgcG9ydDogdG9rZW4ubmV3VmFsdWUucG9ydCwgaW5zdGFuY2VcbiAgICB9O1xuICB9XG5cbiAgb25Eb25lSW5Qcm9jKHRva2VuOiBEb25lSW5Qcm9jVG9rZW4pIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cblxuICBvbkRvbmUodG9rZW46IERvbmVUb2tlbikge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIG9uUGFja2V0U2l6ZUNoYW5nZSh0b2tlbjogUGFja2V0U2l6ZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLm1lc3NhZ2VJby5wYWNrZXRTaXplKHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdG9rZW5zIHJlY2VpdmVkIGluIHRoZSByZXNwb25zZSBtZXNzYWdlIHRvIGEgUlBDIFJlcXVlc3QsXG4gKiBhIFNRTCBCYXRjaCBSZXF1ZXN0LCBhIEJ1bGsgTG9hZCBCQ1AgUmVxdWVzdCBvciBhIFRyYW5zYWN0aW9uIE1hbmFnZXIgUmVxdWVzdC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlcXVlc3RUb2tlbkhhbmRsZXIgZXh0ZW5kcyBUb2tlbkhhbmRsZXIge1xuICBkZWNsYXJlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG4gIGRlY2xhcmUgcmVxdWVzdDogUmVxdWVzdCB8IEJ1bGtMb2FkO1xuICBkZWNsYXJlIGVycm9yczogUmVxdWVzdEVycm9yW107XG5cbiAgY29uc3RydWN0b3IoY29ubmVjdGlvbjogQ29ubmVjdGlvbiwgcmVxdWVzdDogUmVxdWVzdCB8IEJ1bGtMb2FkKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgdGhpcy5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICB0aGlzLmVycm9ycyA9IFtdO1xuICB9XG5cbiAgb25JbmZvTWVzc2FnZSh0b2tlbjogSW5mb01lc3NhZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdpbmZvTWVzc2FnZScsIHRva2VuKTtcbiAgfVxuXG4gIG9uRXJyb3JNZXNzYWdlKHRva2VuOiBFcnJvck1lc3NhZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdlcnJvck1lc3NhZ2UnLCB0b2tlbik7XG5cbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgUmVxdWVzdEVycm9yKHRva2VuLm1lc3NhZ2UsICdFUkVRVUVTVCcpO1xuXG4gICAgICBlcnJvci5udW1iZXIgPSB0b2tlbi5udW1iZXI7XG4gICAgICBlcnJvci5zdGF0ZSA9IHRva2VuLnN0YXRlO1xuICAgICAgZXJyb3IuY2xhc3MgPSB0b2tlbi5jbGFzcztcbiAgICAgIGVycm9yLnNlcnZlck5hbWUgPSB0b2tlbi5zZXJ2ZXJOYW1lO1xuICAgICAgZXJyb3IucHJvY05hbWUgPSB0b2tlbi5wcm9jTmFtZTtcbiAgICAgIGVycm9yLmxpbmVOdW1iZXIgPSB0b2tlbi5saW5lTnVtYmVyO1xuICAgICAgdGhpcy5lcnJvcnMucHVzaChlcnJvcik7XG4gICAgICB0aGlzLnJlcXVlc3QuZXJyb3IgPSBlcnJvcjtcbiAgICAgIGlmICh0aGlzLnJlcXVlc3QgaW5zdGFuY2VvZiBSZXF1ZXN0ICYmIHRoaXMuZXJyb3JzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LmVycm9yID0gbmV3IEFnZ3JlZ2F0ZUVycm9yKHRoaXMuZXJyb3JzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBvbkRhdGFiYXNlQ2hhbmdlKHRva2VuOiBEYXRhYmFzZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2RhdGFiYXNlQ2hhbmdlJywgdG9rZW4ubmV3VmFsdWUpO1xuICB9XG5cbiAgb25MYW5ndWFnZUNoYW5nZSh0b2tlbjogTGFuZ3VhZ2VFbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdsYW5ndWFnZUNoYW5nZScsIHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uQ2hhcnNldENoYW5nZSh0b2tlbjogQ2hhcnNldEVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ2NoYXJzZXRDaGFuZ2UnLCB0b2tlbi5uZXdWYWx1ZSk7XG4gIH1cblxuICBvblNxbENvbGxhdGlvbkNoYW5nZSh0b2tlbjogQ29sbGF0aW9uQ2hhbmdlVG9rZW4pIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24uZGF0YWJhc2VDb2xsYXRpb24gPSB0b2tlbi5uZXdWYWx1ZTtcbiAgfVxuXG4gIG9uUGFja2V0U2l6ZUNoYW5nZSh0b2tlbjogUGFja2V0U2l6ZUVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLm1lc3NhZ2VJby5wYWNrZXRTaXplKHRva2VuLm5ld1ZhbHVlKTtcbiAgfVxuXG4gIG9uQmVnaW5UcmFuc2FjdGlvbih0b2tlbjogQmVnaW5UcmFuc2FjdGlvbkVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnMucHVzaCh0b2tlbi5uZXdWYWx1ZSk7XG4gICAgdGhpcy5jb25uZWN0aW9uLmluVHJhbnNhY3Rpb24gPSB0cnVlO1xuICB9XG5cbiAgb25Db21taXRUcmFuc2FjdGlvbih0b2tlbjogQ29tbWl0VHJhbnNhY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLmxlbmd0aCA9IDE7XG4gICAgdGhpcy5jb25uZWN0aW9uLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgfVxuXG4gIG9uUm9sbGJhY2tUcmFuc2FjdGlvbih0b2tlbjogUm9sbGJhY2tUcmFuc2FjdGlvbkVudkNoYW5nZVRva2VuKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnMubGVuZ3RoID0gMTtcbiAgICAvLyBBbiBvdXRlcm1vc3QgdHJhbnNhY3Rpb24gd2FzIHJvbGxlZCBiYWNrLiBSZXNldCB0aGUgdHJhbnNhY3Rpb24gY291bnRlclxuICAgIHRoaXMuY29ubmVjdGlvbi5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtaXQoJ3JvbGxiYWNrVHJhbnNhY3Rpb24nKTtcbiAgfVxuXG4gIG9uQ29sTWV0YWRhdGEodG9rZW46IENvbE1ldGFkYXRhVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5jb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcykge1xuICAgICAgICBjb25zdCBjb2x1bW5zOiB7IFtrZXk6IHN0cmluZ106IENvbHVtbk1ldGFkYXRhIH0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAgIGZvciAobGV0IGogPSAwLCBsZW4gPSB0b2tlbi5jb2x1bW5zLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgY29uc3QgY29sID0gdG9rZW4uY29sdW1uc1tqXTtcbiAgICAgICAgICBpZiAoY29sdW1uc1tjb2wuY29sTmFtZV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgY29sdW1uc1tjb2wuY29sTmFtZV0gPSBjb2w7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0LmVtaXQoJ2NvbHVtbk1ldGFkYXRhJywgY29sdW1ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlcXVlc3QuZW1pdCgnY29sdW1uTWV0YWRhdGEnLCB0b2tlbi5jb2x1bW5zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBvbk9yZGVyKHRva2VuOiBPcmRlclRva2VuKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdvcmRlcicsIHRva2VuLm9yZGVyQ29sdW1ucyk7XG4gICAgfVxuICB9XG5cbiAgb25Sb3codG9rZW46IFJvd1Rva2VuIHwgTkJDUm93VG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5jb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbikge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93cyEucHVzaCh0b2tlbi5jb2x1bW5zKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5jb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25Eb25lKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5yc3QhLnB1c2godG9rZW4uY29sdW1ucyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdyb3cnLCB0b2tlbi5jb2x1bW5zKTtcbiAgICB9XG4gIH1cblxuICBvblJldHVyblN0YXR1cyh0b2tlbjogUmV0dXJuU3RhdHVzVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgLy8gS2VlcCB2YWx1ZSBmb3IgcGFzc2luZyBpbiAnZG9uZVByb2MnIGV2ZW50LlxuICAgICAgdGhpcy5jb25uZWN0aW9uLnByb2NSZXR1cm5TdGF0dXNWYWx1ZSA9IHRva2VuLnZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIG9uUmV0dXJuVmFsdWUodG9rZW46IFJldHVyblZhbHVlVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgdGhpcy5yZXF1ZXN0LmVtaXQoJ3JldHVyblZhbHVlJywgdG9rZW4ucGFyYW1OYW1lLCB0b2tlbi52YWx1ZSwgdG9rZW4ubWV0YWRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIG9uRG9uZVByb2ModG9rZW46IERvbmVQcm9jVG9rZW4pIHtcbiAgICBpZiAoIXRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgaWYgKHRva2VuLnNxbEVycm9yICYmICF0aGlzLnJlcXVlc3QuZXJyb3IpIHtcbiAgICAgICAgLy8gY2hlY2sgaWYgdGhlIERPTkVfRVJST1IgZmxhZ3Mgd2FzIHNldCwgYnV0IGFuIEVSUk9SIHRva2VuIHdhcyBub3Qgc2VudC5cbiAgICAgICAgdGhpcy5yZXF1ZXN0LmVycm9yID0gbmV3IFJlcXVlc3RFcnJvcignQW4gdW5rbm93biBlcnJvciBoYXMgb2NjdXJyZWQuJywgJ1VOS05PV04nKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXF1ZXN0LmVtaXQoJ2RvbmVQcm9jJywgdG9rZW4ucm93Q291bnQsIHRva2VuLm1vcmUsIHRoaXMuY29ubmVjdGlvbi5wcm9jUmV0dXJuU3RhdHVzVmFsdWUsIHRoaXMucmVxdWVzdC5yc3QpO1xuXG4gICAgICB0aGlzLmNvbm5lY3Rpb24ucHJvY1JldHVyblN0YXR1c1ZhbHVlID0gdW5kZWZpbmVkO1xuXG4gICAgICBpZiAodG9rZW4ucm93Q291bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93Q291bnQhICs9IHRva2VuLnJvd0NvdW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LnJzdCA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG9uRG9uZUluUHJvYyh0b2tlbjogRG9uZUluUHJvY1Rva2VuKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdkb25lSW5Qcm9jJywgdG9rZW4ucm93Q291bnQsIHRva2VuLm1vcmUsIHRoaXMucmVxdWVzdC5yc3QpO1xuXG4gICAgICBpZiAodG9rZW4ucm93Q291bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93Q291bnQhICs9IHRva2VuLnJvd0NvdW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LnJzdCA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG9uRG9uZSh0b2tlbjogRG9uZVRva2VuKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVlc3QuY2FuY2VsZWQpIHtcbiAgICAgIGlmICh0b2tlbi5zcWxFcnJvciAmJiAhdGhpcy5yZXF1ZXN0LmVycm9yKSB7XG4gICAgICAgIC8vIGNoZWNrIGlmIHRoZSBET05FX0VSUk9SIGZsYWdzIHdhcyBzZXQsIGJ1dCBhbiBFUlJPUiB0b2tlbiB3YXMgbm90IHNlbnQuXG4gICAgICAgIHRoaXMucmVxdWVzdC5lcnJvciA9IG5ldyBSZXF1ZXN0RXJyb3IoJ0FuIHVua25vd24gZXJyb3IgaGFzIG9jY3VycmVkLicsICdVTktOT1dOJyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVxdWVzdC5lbWl0KCdkb25lJywgdG9rZW4ucm93Q291bnQsIHRva2VuLm1vcmUsIHRoaXMucmVxdWVzdC5yc3QpO1xuXG4gICAgICBpZiAodG9rZW4ucm93Q291bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3Qucm93Q291bnQhICs9IHRva2VuLnJvd0NvdW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LnJzdCA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG9uUmVzZXRDb25uZWN0aW9uKHRva2VuOiBSZXNldENvbm5lY3Rpb25FbnZDaGFuZ2VUb2tlbikge1xuICAgIHRoaXMuY29ubmVjdGlvbi5lbWl0KCdyZXNldENvbm5lY3Rpb24nKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGFuZGxlciBmb3IgdGhlIGF0dGVudGlvbiBhY2tub3dsZWRnZW1lbnQgbWVzc2FnZS5cbiAqXG4gKiBUaGlzIG1lc3NhZ2Ugb25seSBjb250YWlucyBhIGBET05FYCB0b2tlbiB0aGF0IGFja25vd2xlZGdlc1xuICogdGhhdCB0aGUgYXR0ZW50aW9uIG1lc3NhZ2Ugd2FzIHJlY2VpdmVkIGJ5IHRoZSBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBBdHRlbnRpb25Ub2tlbkhhbmRsZXIgZXh0ZW5kcyBUb2tlbkhhbmRsZXIge1xuICBkZWNsYXJlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG4gIGRlY2xhcmUgcmVxdWVzdDogUmVxdWVzdCB8IEJ1bGtMb2FkO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgYW4gYXR0ZW50aW9uIGFja25vd2xlZGdlbWVudCB3YXMgcmVjZWl2ZWQuXG4gICAqL1xuICBkZWNsYXJlIGF0dGVudGlvblJlY2VpdmVkOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IENvbm5lY3Rpb24sIHJlcXVlc3Q6IFJlcXVlc3QgfCBCdWxrTG9hZCkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIHRoaXMucmVxdWVzdCA9IHJlcXVlc3Q7XG5cbiAgICB0aGlzLmF0dGVudGlvblJlY2VpdmVkID0gZmFsc2U7XG4gIH1cblxuICBvbkRvbmUodG9rZW46IERvbmVUb2tlbikge1xuICAgIGlmICh0b2tlbi5hdHRlbnRpb24pIHtcbiAgICAgIHRoaXMuYXR0ZW50aW9uUmVjZWl2ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxufVxuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxJQUFBQSxRQUFBLEdBQUFDLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBQyxPQUFBLEdBQUFELE9BQUE7QUFBMEQsU0FBQUQsdUJBQUFHLENBQUEsV0FBQUEsQ0FBQSxJQUFBQSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxLQUFBRSxPQUFBLEVBQUFGLENBQUE7QUFpQ25ELE1BQU1HLG9CQUFvQixTQUFTQyxLQUFLLENBQUM7RUFDOUNDLFdBQVdBLENBQUNDLE9BQXFCLEVBQUVDLEtBQVksRUFBRTtJQUMvQyxLQUFLLENBQUMsb0JBQW9CLEdBQUdBLEtBQUssQ0FBQ0MsSUFBSSxHQUFHLFFBQVEsR0FBR0YsT0FBTyxDQUFDRCxXQUFX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