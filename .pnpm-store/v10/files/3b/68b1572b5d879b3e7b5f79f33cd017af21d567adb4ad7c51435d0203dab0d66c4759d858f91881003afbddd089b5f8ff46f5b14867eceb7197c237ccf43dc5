const { v4: uuidv4 } = require('uuid');

const Url = require('url');
const QueryString = require('querystring');
const EventEmitter = require('events').EventEmitter;
const Util = require('../util');
const Result = require('./result/result');
const Parameters = require('../parameters');
const RowStream = require('./result/row_stream');
const Errors = require('../errors');
const ErrorCodes = Errors.codes;
const Logger = require('../logger');
const NativeTypes = require('./result/data_types').NativeTypes;
const FileTransferAgent = require('../file_transfer_agent/file_transfer_agent');
const Bind = require('./bind_uploader');
const RowMode = require('./../constants/row_mode');

const states =
  {
    FETCHING: 'fetching',
    COMPLETE: 'complete'
  };

const statementTypes =
  {
    ROW_PRE_EXEC: 'ROW_PRE_EXEC',
    ROW_POST_EXEC: 'ROW_POST_EXEC',
    FILE_PRE_EXEC: 'FILE_PRE_EXEC',
    FILE_POST_EXEC: 'FILE_POST_EXEC'
  };

const queryCodes = {
  QUERY_IN_PROGRESS: '333333',       // GS code: the query is in progress
  QUERY_IN_PROGRESS_ASYNC: '333334'  // GS code: the query is detached
};

exports.createContext = function (
  options, services, connectionConfig) {
  // create a statement context for a pre-exec statement
  const context = createContextPreExec(
    options, services, connectionConfig);

  context.type = statementTypes.FILE_PRE_EXEC;

  createStatement(options, context, services, connectionConfig);

  // add the result request headers to the context
  context.resultRequestHeaders = buildResultRequestHeadersFile();

  return context;

};

function createStatement(
  statementOptions, context, services, connectionConfig) {
  // call super
  BaseStatement.apply(this, [statementOptions, context, services, connectionConfig]);
}

/**
 * Check the type of command to execute.
 *
 * @param {Object} options
 * @param {Object} services
 * @param {Object} connectionConfig
 *
 * @returns {Object}
 */
exports.createStatementPreExec = function (
  options, services, connectionConfig) {
  Logger.getInstance().debug('--createStatementPreExec');
  // create a statement context for a pre-exec statement
  const context = createContextPreExec(
    options, services, connectionConfig);

  if (options.sqlText && (Util.isPutCommand(options.sqlText) || Util.isGetCommand(options.sqlText))) {
    if (options.fileStream) {
      context.fileStream = options.fileStream;
      options.fileStream = null;
    }
    return createFileStatementPreExec(
      options, context, services, connectionConfig);
  }

  const numBinds = countBinding(context.binds);
  Logger.getInstance().debug('numBinds = %d', numBinds);
  let threshold = Parameters.getValue(Parameters.names.CLIENT_STAGE_ARRAY_BINDING_THRESHOLD);
  if (connectionConfig.getbindThreshold()) {
    threshold = connectionConfig.getbindThreshold();
  }
  Logger.getInstance().debug('threshold = %d', threshold);

  // check array binding,
  if (numBinds > threshold) {
    return createStageStatementpreExec(options, context, services, connectionConfig);
  } else {
    return createRowStatementPreExec(
      options, context, services, connectionConfig);
  }
};

/**
 * Executes a statement and returns a statement object that can be used to fetch
 * its result.
 *
 * @param {Object} statementOptions
 * @param {Object} statementContext
 * @param {Object} services
 * @param {Object} connectionConfig
 *
 * @returns {Object}
 */
function createRowStatementPreExec(
  statementOptions, statementContext, services, connectionConfig) {
  // set the statement type
  statementContext.type = statementTypes.ROW_PRE_EXEC;

  return new RowStatementPreExec(
    statementOptions, statementContext, services, connectionConfig);
}

/**
 * Creates a statement object that can be used to fetch the result of a
 * previously executed statement.
 *
 * @param {Object} statementOptions
 * @param {Object} services
 * @param {Object} connectionConfig
 *
 * @returns {Object}
 */
exports.createStatementPostExec = function (
  statementOptions, services, connectionConfig) {
  // check for missing options
  Errors.checkArgumentExists(Util.exists(statementOptions),
    ErrorCodes.ERR_CONN_FETCH_RESULT_MISSING_OPTIONS);

  // check for invalid options
  Errors.checkArgumentValid(Util.isObject(statementOptions),
    ErrorCodes.ERR_CONN_FETCH_RESULT_INVALID_OPTIONS);

  // check for missing query id
  Errors.checkArgumentExists(Util.exists(statementOptions.queryId),
    ErrorCodes.ERR_CONN_FETCH_RESULT_MISSING_QUERY_ID);

  // check for invalid query id
  Errors.checkArgumentValid(Util.isString(statementOptions.queryId),
    ErrorCodes.ERR_CONN_FETCH_RESULT_INVALID_QUERY_ID);

  // check for invalid complete callback
  const complete = statementOptions.complete;
  if (Util.exists(complete)) {
    Errors.checkArgumentValid(Util.isFunction(complete),
      ErrorCodes.ERR_CONN_FETCH_RESULT_INVALID_COMPLETE);
  }

  // check for invalid streamResult
  if (Util.exists(statementOptions.streamResult)) {
    Errors.checkArgumentValid(Util.isBoolean(statementOptions.streamResult),
      ErrorCodes.ERR_CONN_FETCH_RESULT_INVALID_STREAM_RESULT);
  }

  // check for invalid fetchAsString
  const fetchAsString = statementOptions.fetchAsString;
  if (Util.exists(fetchAsString)) {
    // check that the value is an array
    Errors.checkArgumentValid(Util.isArray(fetchAsString),
      ErrorCodes.ERR_CONN_FETCH_RESULT_INVALID_FETCH_AS_STRING);

    // check that all the array elements are valid
    const invalidValueIndex = NativeTypes.findInvalidValue(fetchAsString);
    Errors.checkArgumentValid(invalidValueIndex === -1,
      ErrorCodes.ERR_CONN_FETCH_RESULT_INVALID_FETCH_AS_STRING_VALUES,
      JSON.stringify(fetchAsString[invalidValueIndex]));
  }

  const rowMode = statementOptions.rowMode;
  if (Util.exists(rowMode)) {
    RowMode.checkRowModeValid(rowMode);
  }
  const cwd = statementOptions.cwd;
  if (Util.exists(cwd)) {
    Errors.checkArgumentValid(Util.isString(cwd), ErrorCodes.ERR_CONN_FETCH_RESULT_INVALID_CWD);
  }

  // validate non-user-specified arguments
  Errors.assertInternal(Util.isObject(services));
  Errors.assertInternal(Util.isObject(connectionConfig));

  // create a statement context
  const statementContext = createStatementContext();

  statementContext.queryId = statementOptions.queryId;
  statementContext.complete = complete;
  statementContext.streamResult = statementOptions.streamResult;
  statementContext.fetchAsString = statementOptions.fetchAsString;
  statementContext.multiResultIds = statementOptions.multiResultIds;
  statementContext.multiCurId = statementOptions.multiCurId;
  statementContext.rowMode = statementOptions.rowMode;
  statementContext.cwd = statementOptions.cwd;

  // set the statement type
  statementContext.type = (statementContext.type === statementTypes.ROW_PRE_EXEC) ? statementTypes.ROW_POST_EXEC : statementTypes.FILE_POST_EXEC;

  return new StatementPostExec(
    statementOptions, statementContext, services, connectionConfig);
};

/**
 * Creates a new statement context object.
 *
 * @returns {Object}
 */
function createStatementContext() {
  return new EventEmitter();
}

/**
 * Creates a statement object that can be used to execute a PUT or GET file
 * operation.
 *
 * @param {Object} statementOptions
 * @param {Object} statementContext
 * @param {Object} services
 * @param {Object} connectionConfig
 *
 * @returns {Object}
 */
function createFileStatementPreExec(
  statementOptions, statementContext, services, connectionConfig) {
  // set the statement type
  statementContext.type = statementTypes.FILE_PRE_EXEC;

  return new FileStatementPreExec(
    statementOptions, statementContext, services, connectionConfig);
}

/**
 * Creates a statement object that can be used to execute stage binding
 * operation.
 *
 * @param {Object} statementOptions
 * @param {Object} statementContext
 * @param {Object} services
 * @param {Object} connectionConfig
 *
 * @returns {Object}
 */
function createStageStatementpreExec(
  statementOptions, statementContext, services, connectionConfig) {
  return new StageBindingStatementPreExec(statementOptions, statementContext, services, connectionConfig);
}

/**
 * Creates a statement context object for pre-exec statement.
 *
 * @param {Object} statementOptions
 * @param {Object} services
 * @param {Object} connectionConfig
 *
 * @returns {Object}
 */
function createContextPreExec(
  statementOptions, services, connectionConfig) {
  // check for missing options
  Errors.checkArgumentExists(Util.exists(statementOptions),
    ErrorCodes.ERR_CONN_EXEC_STMT_MISSING_OPTIONS);

  // check for invalid options
  Errors.checkArgumentValid(Util.isObject(statementOptions),
    ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_OPTIONS);

  if (!Util.exists(statementOptions.requestId)) {
    // check for missing sql text
    Errors.checkArgumentExists(Util.exists(statementOptions.sqlText),
      ErrorCodes.ERR_CONN_EXEC_STMT_MISSING_SQL_TEXT);

    // check for invalid sql text
    Errors.checkArgumentValid(Util.isString(statementOptions.sqlText),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_SQL_TEXT);
  }

  // check for invalid complete callback
  const complete = statementOptions.complete;
  if (Util.exists(complete)) {
    Errors.checkArgumentValid(Util.isFunction(complete),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_COMPLETE);
  }

  // check for invalid streamResult
  if (Util.exists(statementOptions.streamResult)) {
    Errors.checkArgumentValid(Util.isBoolean(statementOptions.streamResult),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_STREAM_RESULT);
  }

  // check for invalid fetchAsString
  const fetchAsString = statementOptions.fetchAsString;
  if (Util.exists(fetchAsString)) {
    // check that the value is an array
    Errors.checkArgumentValid(Util.isArray(fetchAsString),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_FETCH_AS_STRING);

    // check that all the array elements are valid
    const invalidValueIndex = NativeTypes.findInvalidValue(fetchAsString);
    Errors.checkArgumentValid(invalidValueIndex === -1,
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_FETCH_AS_STRING_VALUES,
      JSON.stringify(fetchAsString[invalidValueIndex]));
  }

  // check for invalid requestId
  if (Util.exists(statementOptions.requestId)) {
    Errors.checkArgumentValid(Util.isString(statementOptions.requestId),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_REQUEST_ID);
  }

  // if parameters are specified, make sure the specified value is an object
  if (Util.exists(statementOptions.parameters)) {
    Errors.checkArgumentValid(Util.isObject(statementOptions.parameters),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_PARAMETERS);
  }

  // if binds are specified
  const binds = statementOptions.binds;
  if (Util.exists(binds)) {
    // make sure the specified value is an array
    Errors.checkArgumentValid(Util.isArray(binds),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_BINDS);

    // make sure everything in the binds array is stringifiable
    for (let index = 0, length = binds.length; index < length; index++) {
      Errors.checkArgumentValid(JSON.stringify(binds[index]) !== undefined,
        ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_BIND_VALUES, binds[index]);
    }
  }

  // if an internal option is specified, make sure it's boolean
  if (Util.exists(statementOptions.internal)) {
    Errors.checkArgumentValid(Util.isBoolean(statementOptions.internal),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_INTERNAL);
  }
  const rowMode = statementOptions.rowMode;
  if (Util.exists(rowMode)) {
    RowMode.checkRowModeValid(rowMode);
  }

  // if an asyncExec flag is specified, make sure it's boolean
  if (Util.exists(statementOptions.asyncExec)) {
    Errors.checkArgumentValid(Util.isBoolean(statementOptions.asyncExec),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_ASYNC_EXEC);
  }

  // if a describeOnly flag is specified, make sure it's boolean
  if (Util.exists(statementOptions.describeOnly)) {
    Errors.checkArgumentValid(Util.isBoolean(statementOptions.describeOnly),
      ErrorCodes.ERR_CONN_EXEC_STMT_INVALID_DESCRIBE_ONLY);
  }

  // create a statement context
  const statementContext = createStatementContext();

  statementContext.sqlText = statementOptions.sqlText;
  statementContext.complete = complete;
  statementContext.streamResult = statementOptions.streamResult;
  statementContext.fetchAsString = statementOptions.fetchAsString;
  statementContext.multiResultIds = statementOptions.multiResultIds;
  statementContext.multiCurId = statementOptions.multiCurId;
  statementContext.rowMode = statementOptions.rowMode;
  statementContext.asyncExec = statementOptions.asyncExec;

  // if a binds array is specified, add it to the statement context
  if (Util.exists(statementOptions.binds)) {
    statementContext.binds = statementOptions.binds;
  }

  // if parameters are specified, add them to the statement context
  if (Util.exists(statementOptions.parameters)) {
    statementContext.parameters = statementOptions.parameters;
  }

  // if the internal flag is specified, add it to the statement context
  if (Util.exists(statementOptions.internal)) {
    statementContext.internal = statementOptions.internal;
  }

  if (Util.exists(statementOptions.cwd)) {
    statementContext.cwd = statementOptions.cwd;
  }

  // if the describeOnly flag is specified, add it to the statement context
  if (Util.exists(statementOptions.describeOnly)) {
    statementContext.describeOnly = statementOptions.describeOnly;
  }

  // validate non-user-specified arguments
  Errors.assertInternal(Util.isObject(services));
  Errors.assertInternal(Util.isObject(connectionConfig));

  // use request id passed by user
  if (statementOptions.requestId) {
    statementContext.requestId = statementOptions.requestId;
    statementContext.resubmitRequest = true;
  } else {
    // use a random uuid for the statement request id
    statementContext.requestId = uuidv4();
  }

  return statementContext;
}

/**
 * Creates a new BaseStatement.
 *
 * @param statementOptions
 * @param context
 * @param services
 * @param connectionConfig
 * @constructor
 */
function BaseStatement(
  statementOptions, context, services, connectionConfig) {
  // call super
  EventEmitter.call(this);

  // validate input
  Errors.assertInternal(Util.isObject(statementOptions));
  Errors.assertInternal(Util.isObject(context));

  context.services = services;
  context.connectionConfig = connectionConfig;
  context.isFetchingResult = true;
  context.rowMode = statementOptions.rowMode || connectionConfig.getRowMode();

  // TODO: add the parameters map to the statement context

  const statement = this;

  /**
   * Returns this statement's SQL text.
   *
   * @returns {String}
   */
  this.getSqlText = function () {
    return context.sqlText;
  };

  /**
   * Returns the current status of this statement.
   *
   * @returns {String}
   */
  this.getStatus = function () {
    return context.isFetchingResult ? states.FETCHING : states.COMPLETE;
  };

  /**
   * Returns the columns produced by this statement.
   *
   * @returns {Object[]}
   */
  this.getColumns = function () {
    return context.result ? context.result.getColumns() : undefined;
  };

  /**
   * Given a column identifier, returns the corresponding column. The column
   * identifier can be either the column name (String) or the column index
   * (Number). If a column is specified and there is more than one column with
   * that name, the first column with the specified name will be returned.
   *
   * @param {String | Number} columnIdentifier
   *
   * @returns {Object}
   */
  this.getColumn = function (columnIdentifier) {
    return context.result ? context.result.getColumn(columnIdentifier) :
      undefined;
  };

  /**
   * Returns the number of rows returned by this statement.
   *
   * @returns {Number}
   */
  this.getNumRows = function () {
    return context.result ? context.result.getReturnedRows() : undefined;
  };

  /**
   * Returns the number of rows updated by this statement.
   *
   * @returns {Number}
   */
  this.getNumUpdatedRows = function () {
    return context.result ? context.result.getNumUpdatedRows() : undefined;
  };

  /**
   * Returns an object that contains information about the values of the
   * current warehouse, current database, etc., when this statement finished
   * executing.
   *
   * @returns {Object}
   */
  this.getSessionState = function () {
    return context.result ? context.result.getSessionState() : undefined;
  };

  /**
   * Returns the request id that was used when the statement was issued.
   *
   * @returns {String}
   */
  this.getRequestId = function () {
    return context.requestId;
  };

  /**
   * Returns the query id generated by the server for this statement.
   * If the statement is still executing and we don't know the query id
   * yet, this method will return undefined.
   *
   * Should use getQueryId instead.
   * @deprecated 
   * @returns {String}
   */
  this.getStatementId = function () {
    return context.queryId;
  };

  /**
   * Returns the query id generated by the server for this statement.
   * If the statement is still executing and we don't know the query id
   * yet, this method will return undefined.
   *
   * @returns {String}
   */
  this.getQueryId = function () {
    return context.queryId;
  };

  /**
   * Cancels this statement if possible.
   *
   * @param {Function} [callback]
   */
  this.cancel = function (callback) {
    sendCancelStatement(context, statement, callback);
  };

  //Integration Testing purpose.
  this.getQueryContextCacheSize = function () {
    return services.sf.getQueryContextCacheSize();
  };

  this.getQueryContextDTOSize = function () {
    return services.sf.getQueryContextDTO().entries.length;
  };

  /**
   * Issues a request to get the statement result again.
   *
   * @param {Function} callback
   */
  context.refresh = function (callback) {
    // pick the appropriate function to get the result based on whether we
    // have the query id or request id (we should have at least one)
    const sendRequestFn = context.queryId ?
      sendRequestPostExec : sendRequestPreExec;

    // the current result error might be transient,
    // so issue a request to get the result again
    sendRequestFn(context, function (err, body) {
      // refresh the result
      context.onStatementRequestComp(err, body);

      // if a callback was specified, invoke it
      if (Util.isFunction(callback)) {
        callback(context);
      }
    });
  };

  /**
   * Called when the statement request is complete.
   *
   * @param err
   * @param body
   */
  context.onStatementRequestComp = async function (err, body) {
    // if we already have a result or a result error, we invoked the complete
    // callback once, so don't invoke it again
    const suppressComplete = context.result || context.resultError;

    // clear the previous result error
    context.resultError = null;

    // if there was no error, call the success function
    if (!err) {
      await context.onStatementRequestSucc(body);
    } else {
      // save the error
      context.resultError = err;

      // if we don't have a query id and we got a response from GS, extract
      // the query id from the data
      if (!context.queryId &&
        Errors.isOperationFailedError(err) && err.data) {
        context.queryId = err.data.queryId;
      }
    }

    // we're no longer fetching the result
    context.isFetchingResult = false;

    if (!suppressComplete) {
      // emit a complete event
      context.emit('statement-complete', Errors.externalize(err), statement);

      // if a complete function was specified, invoke it
      if (Util.exists(context.complete)) {
        invokeStatementComplete(statement, context);
      }
    } else {
      Logger.getInstance().debug('refreshed result of statement with %s',
        context.requestId ?
          Util.format('request id = %s', context.requestId) :
          Util.format('query id = %s', context.queryId));
    }
  };

  /**
   * Called when the statement request is successful. Subclasses must provide
   * their own implementation.
   */
  context.onStatementRequestSucc = function () {
  };
}

Util.inherits(BaseStatement, EventEmitter);

/**
 * Invokes the statement complete callback.
 *
 * @param {Object} statement
 * @param {Object} context
 */
function invokeStatementComplete(statement, context) {
  // find out if the result will be streamed;
  // if a value is not specified, get it from the connection
  let streamResult = context.streamResult;
  if (!Util.exists(streamResult)) {
    streamResult = context.connectionConfig.getStreamResult();
  }

  // if the result will be streamed later or in asyncExec mode,
  // invoke the complete callback right away
  if (streamResult) {
    context.complete(Errors.externalize(context.resultError), statement);
  } else if (context.asyncExec) {
    // return the result object with the query ID inside.
    context.complete(null, statement, context.result);
  } else {
    process.nextTick(function () {
      // aggregate all the rows into an array and pass this
      // array to the complete callback as the last argument
      const rows = [];
      statement.streamRows()
        .on('readable', function () {
          // read only when data is available
          let row;

          // while there are rows available to read, push row to results array
          while ((row = this.read()) !== null) {
            rows.push(row);
          }
        })
        .on('end', function () {
          context.complete(null, statement, rows);
        })
        .on('error', function (err) {
          context.complete(Errors.externalize(err), statement);
        });
    });
  }
}

/**
 * Creates a new RowStatementPreExec instance.
 *
 * @param {Object} statementOptions
 * @param {Object} context
 * @param {Object} services
 * @param {Object} connectionConfig
 * @constructor
 */
function RowStatementPreExec(
  statementOptions,
  context,
  services,
  connectionConfig) {
  Logger.getInstance().debug('RowStatementPreExec');
  // call super
  BaseStatement.apply(this, [statementOptions, context, services, connectionConfig]);

  // add the result request headers to the context
  context.resultRequestHeaders = buildResultRequestHeadersRow();

  /**
   * Called when the request to get the statement result is successful.
   *
   * @param {Object} body
   */
  context.onStatementRequestSucc =
    createOnStatementRequestSuccRow(this, context);

  /**
   * Fetches the rows in this statement's result and invokes the each()
   * callback on each row. If start and end values are specified, the each()
   * callback will only be invoked on rows in the specified range.
   *
   * @param {Object} options
   */
  this.fetchRows = createFnFetchRows(this, context);

  /**
   * Streams the rows in this statement's result. If start and end values are
   * specified, only rows in the specified range are streamed.
   *
   * @param {Object} options
   */
  this.streamRows = createFnStreamRows(this, context);

  // send a request to execute the statement
  sendRequestPreExec(context, context.onStatementRequestComp);
}

Util.inherits(RowStatementPreExec, BaseStatement);

/**
 * Creates a function that can be used by row statements to process the response
 * when the request is successful.
 *
 * @param statement
 * @param context
 * @returns {Function}
 */
function createOnStatementRequestSuccRow(statement, context) {
  return function (body) {
    // if we don't already have a result
    if (!context.result) {
      if (body.code === queryCodes.QUERY_IN_PROGRESS_ASYNC) {
        context.result = {
          queryId: body.data.queryId
        };
        return;
      }
      if (body.data.resultIds != null && body.data.resultIds.length > 0) {
        //multi statements
        this._resultIds = body.data.resultIds.split(',');
        context.isMulti = true;
        context.multiResultIds = this._resultIds;
        context.multiCurId = 0;
        context.queryId = this._resultIds[context.multiCurId];
        exports.createStatementPostExec(context, context.services, context.connectionConfig);
      } else {
        // build a result from the response
        context.result = new Result(
          {
            response: body,
            statement: statement,
            services: context.services,
            connectionConfig: context.connectionConfig,
            rowMode: context.rowMode
          });

        context.queryId = context.result.getQueryId();
        this.services.sf.deserializeQueryContext(context.result.getQueryContext());
      }
    } else {
      // refresh the existing result
      context.result.refresh(body);
    }

    if (context.isMulti == null || context.isMulti === false) {
      // only update the parameters if the statement isn't a post-exec statement
      if (context.type !== statementTypes.ROW_POST_EXEC || context.type !== statementTypes.FILE_POST_EXEC) {
        Parameters.update(context.result.getParametersArray());
      }
    }
  };
}

/**
 * Creates a new FileStatementPreExec instance.
 *
 * @param {Object} statementOptions
 * @param {Object} context
 * @param {Object} services
 * @param {Object} connectionConfig
 * @constructor
 */
function FileStatementPreExec(
  statementOptions, context, services, connectionConfig) {
  // call super
  BaseStatement.apply(this, [statementOptions, context, services, connectionConfig]);

  // add the result request headers to the context
  context.resultRequestHeaders = buildResultRequestHeadersFile();

  /**
   * Called when the statement request is successful.
   *
   * @param {Object} body
   */
  context.onStatementRequestSucc = async function (body) {
    await executeFileTransferRequest(context, body, this);
  };

  /**
   * Streams the rows in this statement's result. If start and end values are
   * specified, only rows in the specified range are streamed.
   *
   * @param {Object} options
   */
  this.streamRows = createFnStreamRows(this, context);
  this.hasNext = hasNextResult(this, context);
  this.NextResult = createNextReuslt(this, context);

  /**
   * Returns the file metadata generated by the statement.
   *
   * @returns {Object}
   */
  this.getFileMetadata = function () {
    return context.fileMetadata;
  };

  // send a request to execute the file statement
  sendRequestPreExec(context, context.onStatementRequestComp);
}

async function executeFileTransferRequest(context, body, statement, fileTransferAgent) {
  context.fileMetadata = body;

  const fta = fileTransferAgent ?? new FileTransferAgent(context);
  await fta.execute();

  try {
    // build a result from the response
    const result = fta.result();

    // init result and meta
    body.data = {
      rowset: result.rowset,
      returned: result.rowset.length,
      rowtype: result.rowtype,
      parameters: [],
    };

    context.result = new Result({
      response: body,
      statement: statement,
      services: context.services,
      connectionConfig: context.connectionConfig
    });
  } catch (error) {
    context.resultError = error;
  }
}

exports.executeFileTransferRequest = executeFileTransferRequest;

Util.inherits(FileStatementPreExec, BaseStatement);

/**
 * Creates a new StageBindingStatementPreExec instance.
 *
 * @param {Object} statementOptions
 * @param {Object} context
 * @param {Object} services
 * @param {Object} connectionConfig
 * @constructor
 */
function StageBindingStatementPreExec(
  statementOptions, context, services, connectionConfig) {
  // call super
  BaseStatement.apply(this, arguments);

  // add the result request headers to the context
  context.resultRequestHeaders = buildResultRequestHeadersFile();

  /**
   * Called when the statement request is successful. Subclasses must provide
   * their own implementation.
   */
  context.onStatementRequestSucc = function () {
    //do nothing
  };

  /**
   * Called the stage binding request
   *
   * @param {Object} options
   * @param {Object} context
   * @param {Object} services
   * @param {Object} connectionConfig
   */
  this.StageBindingRequest = async function (options, context, services, connectionConfig) {
    try {
      const bindUploaderRequestId = uuidv4();
      const bind = new Bind.BindUploader(options, services, connectionConfig, bindUploaderRequestId);
      context.bindStage = Bind.GetStageName(bindUploaderRequestId);
      await bind.Upload(context.binds);
      return createRowStatementPreExec(
        options, context, services, connectionConfig);
    } catch (error) {
      context.bindStage = null;
      return createRowStatementPreExec(
        options, context, services, connectionConfig);
    }
  };
   
  /**
   * Fetches the rows in this statement's result and invokes the each()
   * callback on each row. If start and end values are specified, the each()
   * callback will only be invoked on rows in the specified range.
   *
   * @param {Object} options
   */
  this.fetchRows = createFnFetchRows(this, context);

  /**
   * Streams the rows in this statement's result. If start and end values are
   * specified, only rows in the specified range are streamed.
   *
   * @param {Object} options
   */
  this.streamRows = createFnStreamRows(this, context);
  this.hasNext = hasNextResult(this, context);
  this.NextResult = createNextReuslt(this, context);

  this.StageBindingRequest(statementOptions, context, services, connectionConfig);
  
}

Util.inherits(StageBindingStatementPreExec, BaseStatement);

/**
 * Creates a new StatementPostExec instance.
 *
 * @param {Object} statementOptions
 * @param {Object} context
 * @param {Object} services
 * @param {Object} connectionConfig
 * @constructor
 */
function StatementPostExec(
  statementOptions, context, services, connectionConfig) {
  // call super
  BaseStatement.apply(this, [statementOptions, context, services, connectionConfig]);

  // add the result request headers to the context
  context.resultRequestHeaders = buildResultRequestHeadersRow();

  /**
   * Called when the statement request is successful.
   *
   * @param {Object} body
   */
  context.onStatementRequestSucc =
    createOnStatementRequestSuccRow(this, context);

  /**
   * Fetches the rows in this statement's result and invokes the each()
   * callback on each row. If startIndex and endIndex values are specified, the
   * each() callback will only be invoked on rows in the requested range. The
   * end() callback will be invoked when either all the requested rows have been
   * successfully processed, or if an error was encountered while trying to
   * fetch the requested rows.
   *
   * @param {Object} options
   */
  this.fetchRows = createFnFetchRows(this, context);

  /**
   * Streams the rows in this statement's result. If start and end values are
   * specified, only rows in the specified range are streamed.
   *
   * @param {Object} options
   */
  this.streamRows = createFnStreamRows(this, context);
  this.hasNext = hasNextResult(this, context);
  this.NextResult = createNextReuslt(this, context);
  
  // send a request to fetch the result
  sendRequestPostExec(context, context.onStatementRequestComp);
}

Util.inherits(StatementPostExec, BaseStatement);

/**
 * Creates a function that fetches the rows in a statement's result and
 * invokes the each() callback on each row. If start and end values are
 * specified, the each() callback will only be invoked on rows in the
 * specified range.
 *
 * @param statement
 * @param context
 */
function createFnFetchRows(statement, context) {
  return function (options) {
    // check for missing options
    Errors.checkArgumentExists(Util.exists(options),
      ErrorCodes.ERR_STMT_FETCH_ROWS_MISSING_OPTIONS);

    // check for invalid options
    Errors.checkArgumentValid(Util.isObject(options),
      ErrorCodes.ERR_STMT_FETCH_ROWS_INVALID_OPTIONS);

    // check for missing each()
    Errors.checkArgumentExists(Util.exists(options.each),
      ErrorCodes.ERR_STMT_FETCH_ROWS_MISSING_EACH);

    // check for invalid each()
    Errors.checkArgumentValid(Util.isFunction(options.each),
      ErrorCodes.ERR_STMT_FETCH_ROWS_INVALID_EACH);

    // check for missing end()
    Errors.checkArgumentExists(Util.exists(options.end),
      ErrorCodes.ERR_STMT_FETCH_ROWS_MISSING_END);

    // check for invalid end()
    Errors.checkArgumentValid(Util.isFunction(options.end),
      ErrorCodes.ERR_STMT_FETCH_ROWS_INVALID_END);

    const rowMode = options.rowMode;
    if (Util.exists(rowMode)) {
      RowMode.checkRowModeValid(rowMode);
    }

    // if we're still trying to fetch the result, create an error of our own
    // and invoke the end() callback
    if (context.isFetchingResult) {
      process.nextTick(function () {
        options.end(Errors.createClientError(
          ErrorCodes.ERR_STMT_FETCH_ROWS_FETCHING_RESULT).externalize(),
        statement);
      });
    } else if (context.resultError) {
      // if there was an error the last time we tried to get the result
      // if we have a fatal error, end the fetch rows operation since we're not
      // going to be able to get any rows, either because the statement failed
      // or because the result's been purged
      if (Errors.isOperationFailedError(context.resultError) &&
        context.resultError.sqlState) {
        process.nextTick(function () {
          endFetchRows(options, statement, context);
        });
      } else {
        context.refresh(function () {
          // if there was no error, fetch rows from the result
          if (!context.resultError) {
            fetchRowsFromResult(options, statement, context);
          } else {
            // give up because it's unlikely we'll succeed if we retry again
            endFetchRows(options, statement, context);
          }
        });
      }
    } else {
      fetchRowsFromResult(options, statement, context);
    }
  };
}

/**
 * Creates a function that streams the rows in a statement's result. If start
 * and end values are specified, only rows in the specified range are streamed.
 *
 * @param statement
 * @param context
 */
function createFnStreamRows(statement, context) {
  return function (options) {
    // if some options are specified
    if (Util.exists(options)) {
      // check for invalid options
      Errors.checkArgumentValid(Util.isObject(options),
        ErrorCodes.ERR_STMT_FETCH_ROWS_INVALID_OPTIONS);

      // check for invalid start
      if (Util.exists(options.start)) {
        Errors.checkArgumentValid(Util.isNumber(options.start),
          ErrorCodes.ERR_STMT_STREAM_ROWS_INVALID_START);
      }

      // check for invalid end
      if (Util.exists(options.end)) {
        Errors.checkArgumentValid(Util.isNumber(options.end),
          ErrorCodes.ERR_STMT_STREAM_ROWS_INVALID_END);
      }

      // check for invalid fetchAsString
      const fetchAsString = options.fetchAsString;
      if (Util.exists(fetchAsString)) {
        // check that the value is an array
        Errors.checkArgumentValid(Util.isArray(fetchAsString),
          ErrorCodes.ERR_STMT_STREAM_ROWS_INVALID_FETCH_AS_STRING);

        // check that all the array elements are valid
        const invalidValueIndex = NativeTypes.findInvalidValue(fetchAsString);
        Errors.checkArgumentValid(invalidValueIndex === -1,
          ErrorCodes.ERR_STMT_STREAM_ROWS_INVALID_FETCH_AS_STRING_VALUES,
          JSON.stringify(fetchAsString[invalidValueIndex]));
      }

      const rowMode = context.rowMode;
      if (Util.exists(rowMode)) {
        RowMode.checkRowModeValid(rowMode);
      }
    }

    return new RowStream(statement, context, options);
  };
}

/**
 * Ends the fetchRows() operation.
 *
 * @param {Object} options the options passed to fetchRows().
 * @param {Object} statement
 * @param {Object} context
 */
function endFetchRows(options, statement, context) {
  options.end(Errors.externalize(context.resultError), statement);
}

/**
 * Fetches rows from the statement's result.
 *
 * @param {Object} options the options passed to fetchRows().
 * @param {Object} statement
 * @param {Object} context
 */
function fetchRowsFromResult(options, statement, context) {
  let numInterrupts = 0;

  // forward to the result to get a FetchRowsOperation object
  const operation = context.result.fetchRows(options);

  // subscribe to the operation's 'complete' event
  operation.on('complete', function (err, continueCallback) {
    // we want to retry if the error is retryable and the
    // result stream hasn't been closed too many times
    if (Errors.isLargeResultSetError(err) && err.response &&
      (err.response.statusCode === 403) &&
      (numInterrupts <
        context.connectionConfig.getResultStreamInterrupts())) {
      // increment the interrupt counter
      numInterrupts++;

      // issue a request to fetch the result again
      sendRequestPostExec(context, function (err, body) {
        // refresh the result
        context.onStatementRequestComp(err, body);

        // if there was no error, continue from where we got interrupted
        if (!err) {
          continueCallback();
        }
      });
    } else {
      endFetchRows(options, statement, context);
    }
  });
}

/**
 * Issues a request to cancel a statement.
 *
 * @param {Object} statementContext
 * @param {Object} statement
 * @param {Function} callback
 */
function sendCancelStatement(statementContext, statement, callback) {
  let url;
  let json;

  // use different rest endpoints based on whether the query id is available
  if (statementContext.queryId) {
    url = '/queries/' + statementContext.queryId + '/abort-request';
  } else {
    url = '/queries/v1/abort-request';
    json =
      {
        requestId: statementContext.requestId
      };
  }

  // issue a request to cancel the statement
  statementContext.services.sf.request(
    {
      method: 'POST',
      url: url,
      json: json,
      callback: function (err) {
        // if a callback was specified, invoke it
        if (Util.isFunction(callback)) {
          callback(Errors.externalize(err), statement);
        }
      }
    });
}

/**
 * Issues a request to get the result of a statement that hasn't been previously
 * executed.
 *
 * @param statementContext
 * @param onResultAvailable
 */
function sendRequestPreExec(statementContext, onResultAvailable) {
  // get the request headers
  const headers = statementContext.resultRequestHeaders;

  // build the basic json for the request
  const json =
  {
    disableOfflineChunks: false,
  };
  json.sqlText = statementContext.sqlText;

  if (statementContext.resubmitRequest && !json.sqlText) {
    json.sqlText = `SELECT 'Error retrieving query results for request id: ${statementContext.requestId}, `
       + 'please use RESULT_SCAN instead\' AS ErrorMessage;';
  }

  Logger.getInstance().debug('context.bindStage=' + statementContext.bindStage);
  if (Util.exists(statementContext.bindStage)) {
    json.bindStage = statementContext.bindStage;
  } else if (Util.exists(statementContext.binds)) {
    // if binds are specified, build a binds map and include it in the request
    json.bindings = buildBindsMap(statementContext.binds);
  }

  // include statement parameters if a value was specified
  if (Util.exists(statementContext.parameters)) {
    json.parameters = statementContext.parameters;
    Logger.getInstance().debug('context.parameters=' + statementContext.parameters);
  }

  // include the internal flag if a value was specified
  if (Util.exists(statementContext.internal)) {
    json.isInternal = statementContext.internal;
  }

  if (!statementContext.disableQueryContextCache){
    json.queryContextDTO = statementContext.services.sf.getQueryContextDTO();
  }

  // include the asyncExec flag if a value was specified
  if (Util.exists(statementContext.asyncExec)) {
    json.asyncExec = statementContext.asyncExec;
  }

  // include describeOnly flag if a value was specified
  if (Util.exists(statementContext.describeOnly)) {
    json.describeOnly = statementContext.describeOnly;
  }

  // use the snowflake service to issue the request
  sendSfRequest(statementContext,
    {
      method: 'POST',
      headers: headers,
      url: Url.format(
        {
          pathname: '/queries/v1/query-request',
          search: QueryString.stringify(
            {
              requestId: statementContext.requestId
            })
        }),
      json: json,
      callback: buildResultRequestCallback(
        statementContext, headers, onResultAvailable)
    },
    true);
}

this.sendRequest = function (statementContext, onResultAvailable) {
  // get the request headers
  const headers = statementContext.resultRequestHeaders;

  // build the basic json for the request
  const json =
  {
    disableOfflineChunks: false,
    sqlText: statementContext.sqlText
  };

  Logger.getInstance().debug('context.bindStage=' + statementContext.bindStage);
  if (Util.exists(statementContext.bindStage)) {
    json.bindStage = statementContext.bindStage;
  } else if (Util.exists(statementContext.binds)) {
    // if binds are specified, build a binds map and include it in the request
    json.bindings = buildBindsMap(statementContext.binds);
  }

  // include statement parameters if a value was specified
  if (Util.exists(statementContext.parameters)) {
    json.parameters = statementContext.parameters;
  }

  // include the internal flag if a value was specified
  if (Util.exists(statementContext.internal)) {
    json.isInternal = statementContext.internal;
  }

  if (!statementContext.disableQueryContextCache){
    json.queryContextDTO = statementContext.services.sf.getQueryContextDTO();
  }

  let options =
  {
    method: 'POST',
    headers: headers,
    url: Url.format(
      {
        pathname: '/queries/v1/query-request',
        search: QueryString.stringify(
          {
            requestId: statementContext.requestId
          })
      }),
    json: json,
    callback: buildResultRequestCallback(
      statementContext, headers, onResultAvailable)
  };

  const sf = statementContext.services.sf;

  // clone the options
  options = Util.apply({}, options);

  return new Promise((resolve) => {
    resolve(sf.postAsync(options));
  });
};

/**
 * Converts a bind variables array to a map that can be included in the
 * POST-body when issuing a pre-exec statement request.
 *
 * @param bindsArray
 *
 * @returns {Object}
 */
function buildBindsMap(bindsArray) {
  const bindsMap = {};
  const isArrayBinding = bindsArray.length > 0 && Util.isArray(bindsArray[0]);
  const singleArray = isArrayBinding ? bindsArray[0] : bindsArray;

  for (let index = 0, length = singleArray.length; index < length; index++) {
    let value = singleArray[index];

    // pick the appropriate logical data type based on the bind value
    let type;
    if (Util.isBoolean(value)) {
      type = 'BOOLEAN';
    } else if (Util.isObject(value) || Util.isArray(value)) {
      type = 'VARIANT';
    } else if (Util.isNumber(value)) {
      if (Number(value) === value && value % 1 === 0) {
        // if value is integer
        type = 'FIXED';
      } else {
        type = 'REAL';
      }
    } else {
      type = 'TEXT';
    }

    // convert non-null values to a string if necessary; we don't convert null
    // because the client might want to run something like
    //   sql text = update t set name = :1 where id = 1;, binds = [null]
    // and converting null to a string would result in us executing
    //   sql text = update t set name = 'null' where id = 1;
    // instead of
    //   sql text = update t set name = null where id = 1;
    if (!isArrayBinding) {
      if (value !== null && !Util.isString(value)) {
        if (value instanceof Date) {
          value = value.toJSON();
        } else {
          value = JSON.stringify(value);
        }
      }
    } else {
      value = [];
      for (let rowIndex = 0; rowIndex < bindsArray.length; rowIndex++) {
        let value0 = bindsArray[rowIndex][index];
        if (value0 !== null && !Util.isString(value0)) {
          if (value0 instanceof Date) {
            value0 = value0.toJSON();
          } else {
            value0 = JSON.stringify(value0);
          }
        }
        value.push(value0);
      }
    }

    // add an entry for the bind variable to the map
    bindsMap[index + 1] =
      {
        type: type,
        value: value
      };
  }

  return bindsMap;
}

/**
 * Issues a request to get the result of a statement that has been previously
 * executed.
 *
 * @param statementContext
 * @param onResultAvailable
 */
function sendRequestPostExec(statementContext, onResultAvailable) {
  // get the request headers
  const headers = statementContext.resultRequestHeaders;

  // use the snowflake service to issue the request
  sendSfRequest(statementContext,
    {
      method: 'GET',
      headers: headers,
      url: Url.format(
        {
          pathname: '/queries/' + statementContext.queryId + '/result',
          search: QueryString.stringify(
            {
              disableOfflineChunks: false
            })
        }),
      callback: buildResultRequestCallback(
        statementContext, headers, onResultAvailable)
    });
}

/**
 * Issues a statement-related request using the Snowflake service.
 *
 * @param {Object} statementContext the statement context.
 * @param {Object} options the request options.
 * @param {Boolean} [appendQueryParamOnRetry] whether retry=true should be
 *   appended to the url if the request is retried.
 */
function sendSfRequest(statementContext, options, appendQueryParamOnRetry) {
  const sf = statementContext.services.sf;
  const connectionConfig = statementContext.connectionConfig;

  // clone the options
  options = Util.apply({}, options);

  // get the original url and callback
  const urlOrig = options.url;
  const callbackOrig = options.callback;

  let numRetries = 0;
  const maxNumRetries = connectionConfig.getRetrySfMaxNumRetries();
  let sleep = connectionConfig.getRetrySfStartingSleepTime();
  let lastStatusCodeForRetry;

  // create a function to send the request
  const sendRequest = function () {
    // if this is a retry and a query parameter should be appended to the url on
    // retry, update the url
    if ((numRetries > 0) && appendQueryParamOnRetry) {
      const retryOption = {
        url: urlOrig,
        retryCount: numRetries,
        retryReason: lastStatusCodeForRetry,
        includeRetryReason: connectionConfig.getIncludeRetryReason(),
      };
      
      options.url = Util.url.appendRetryParam(retryOption);
    }

    sf.request(options);
  };

  // replace the specified callback with a new one that retries
  options.callback = async function (err) {
    // if we haven't exceeded the maximum number of retries yet and the server
    // came back with a retryable error code
    if (numRetries < maxNumRetries &&
      err && Util.isRetryableHttpError(
      err.response, false // no retry for HTTP 403
    )) {
      // increment the retry count
      numRetries++;
      lastStatusCodeForRetry = err.response ? err.response.statusCode : 0;

      // use exponential backoff with decorrelated jitter to compute the
      // next sleep time.
      const cap = connectionConfig.getRetrySfMaxSleepTime();
      sleep = Util.nextSleepTime(1, cap, sleep);

      Logger.getInstance().debug(
        'Retrying statement with request id %s, retry count = %s',
        statementContext.requestId, numRetries);

      // wait the appropriate amount of time before retrying the request
      setTimeout(sendRequest, sleep * 1000);
    } else {
      // invoke the original callback
      await callbackOrig.apply(this, arguments);
    }
  };

  // issue the request
  sendRequest();
}

/**
 * Builds a callback for use in an exec-statement or fetch-result request.
 *
 * @param statementContext
 * @param headers
 * @param onResultAvailable
 *
 * @returns {Function}
 */
function buildResultRequestCallback(
  statementContext, headers, onResultAvailable) {
  const callback = async function (err, body) {
    if (err) {
      await onResultAvailable.call(null, err, null);
    } else {
      // extract the query id from the response and save it
      statementContext.queryId = body.data.queryId;

      // if the result is not ready yet, extract the result url from the response
      // and issue a GET request to try to fetch the result again unless asyncExec is enabled.
      if (body && (body.code === queryCodes.QUERY_IN_PROGRESS
        || body.code === queryCodes.QUERY_IN_PROGRESS_ASYNC)) {

        if (statementContext.asyncExec) {
          await onResultAvailable.call(null, err, body);
          return;
        }

        // extract the result url from the response and try to get the result
        // again
        sendSfRequest(statementContext,
          {
            method: 'GET',
            headers: headers,
            url: body.data.getResultUrl,
            callback: callback
          });
      } else {
        await onResultAvailable.call(null, err, body);
      }
    }
  };

  return callback;
}

/**
 * Builds the request headers for a row statement request.
 *
 * @returns {Object}
 */
function buildResultRequestHeadersRow() {
  return {
    'Accept': 'application/snowflake'
  };
}

/**
 * Builds the request headers for a file statement request.
 *
 * @returns {Object}
 */
function buildResultRequestHeadersFile() {
  return {
    'Accept': 'application/json'
  };
}

/**
 * Count number of bindings
 * 
 * @returns {int}
 */
function countBinding(binds) {
  if (!Util.isArray(binds)) {
    return 0;
  }
  Logger.getInstance().debug('-- binds.length= %d', binds.length);
  let count = 0;
  for (let index = 0; index < binds.length; index++) {
    if (binds[index] != null && Util.isArray(binds[index])) {
      count += binds[index].length;
    }
  }
  return count;
}

function hasNextResult(statement, context) {
  return function () {
    return (context.multiResultIds != null && context.multiCurId + 1 < context.multiResultIds.length);
  };
}

function createNextReuslt(statement, context) {
  return function () {
    if (hasNextResult(statement, context)) {
      context.multiCurId++;
      context.queryId = context.multiResultIds[context.multiCurId];
      exports.createStatementPostExec(context, context.services, context.connectionConfig);
    }
  };
}
