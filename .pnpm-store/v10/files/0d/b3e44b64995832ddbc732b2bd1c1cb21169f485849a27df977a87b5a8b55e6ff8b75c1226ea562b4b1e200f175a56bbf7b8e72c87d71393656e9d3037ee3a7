const Util = require('./util');
const errorMessages = require('./constants/error_messages');

const codes = {};

// 400001
codes.ERR_INTERNAL_ASSERT_FAILED = 400001;
codes.ERR_UNSUPPORTED_NODE_JS_VERSION = 400002;

// 401001
codes.ERR_SF_NETWORK_COULD_NOT_CONNECT = 401001;
codes.ERR_SF_RESPONSE_FAILURE = 401002;
codes.ERR_SF_RESPONSE_NOT_JSON = 401003;
codes.ERR_SF_RESPONSE_INVALID_TOKEN = 401004;

// 402001
codes.ERR_LARGE_RESULT_SET_NETWORK_COULD_NOT_CONNECT = 402001;
codes.ERR_LARGE_RESULT_SET_RESPONSE_FAILURE = 402002;

// 403001
codes.ERR_GLOBAL_CONFIGURE_INVALID_LOG_LEVEL = 403001;
codes.ERR_GLOBAL_CONFIGURE_INVALID_DISABLE_OCSP_CHECKS = 403002;
codes.ERR_GLOBAL_CONFIGURE_INVALID_OCSP_MODE = 403003;
codes.ERR_GLOBAL_CONFIGURE_INVALID_JSON_PARSER = 403004;
codes.ERR_GLOBAL_CONFIGURE_INVALID_XML_PARSER = 403005;
codes.ERR_GLOBAL_CONFIGURE_INVALID_KEEP_ALIVE = 403006;
codes.ERR_GLOBAL_CONFIGURE_INVALID_CUSTOM_CREDENTIAL_MANAGER = 403007;
codes.ERR_GLOBAL_CONFIGURE_INVALID_USE_ENV_PROXY = 403008;

// 404001
codes.ERR_CONN_CREATE_MISSING_OPTIONS = 404001;
codes.ERR_CONN_CREATE_INVALID_OPTIONS = 404002;
codes.ERR_CONN_CREATE_MISSING_USERNAME = 404003;
codes.ERR_CONN_CREATE_INVALID_USERNAME = 404004;
codes.ERR_CONN_CREATE_MISSING_PASSWORD = 404005;
codes.ERR_CONN_CREATE_INVALID_PASSWORD = 404006;
codes.ERR_CONN_CREATE_MISSING_ACCOUNT = 404007;
codes.ERR_CONN_CREATE_INVALID_ACCOUNT = 404008;
codes.ERR_CONN_CREATE_MISSING_ACCESS_URL = 404009;
codes.ERR_CONN_CREATE_INVALID_ACCESS_URL = 404010;
codes.ERR_CONN_CREATE_INVALID_WAREHOUSE = 404011;
codes.ERR_CONN_CREATE_INVALID_DATABASE = 404012;
codes.ERR_CONN_CREATE_INVALID_SCHEMA = 404013;
codes.ERR_CONN_CREATE_INVALID_ROLE = 404014;
codes.ERR_CONN_CREATE_MISSING_PROXY_HOST = 404015;
codes.ERR_CONN_CREATE_INVALID_PROXY_HOST = 404016;
codes.ERR_CONN_CREATE_MISSING_PROXY_PORT = 404017;
codes.ERR_CONN_CREATE_INVALID_PROXY_PORT = 404018;
codes.ERR_CONN_CREATE_INVALID_STREAM_RESULT = 404019;
codes.ERR_CONN_CREATE_INVALID_FETCH_AS_STRING = 404020;
codes.ERR_CONN_CREATE_INVALID_FETCH_AS_STRING_VALUES = 404021;
codes.ERR_CONN_CREATE_INVALID_REGION = 404022;
codes.ERR_CONN_CREATE_INVALID_KEEP_ALIVE = 404023;
codes.ERR_CONN_CREATE_INVALID_KEEP_ALIVE_HEARTBEAT_FREQ = 404024;
codes.ERR_CONN_CREATE_INVALID_TREAT_INTEGER_AS_BIGINT = 404025;
codes.ERR_CONN_CREATE_INVALID_PRIVATE_KEY = 404026;
codes.ERR_CONN_CREATE_INVALID_PRIVATE_KEY_PATH = 404027;
codes.ERR_CONN_CREATE_INVALID_PRIVATE_KEY_PASS = 404028;
codes.ERR_CONN_CREATE_INVALID_OAUTH_TOKEN = 404029;
codes.ERR_CONN_CREATE_INVALID_VALIDATE_DEFAULT_PARAMETERS = 404030;
codes.ERR_CONN_CREATE_INVALID_APPLICATION = 404031;
codes.ERR_CONN_CREATE_MISSING_PROXY_USER = 404032;
codes.ERR_CONN_CREATE_INVALID_PROXY_USER = 404033;
codes.ERR_CONN_CREATE_MISSING_PROXY_PASS = 404034;
codes.ERR_CONN_CREATE_INVALID_PROXY_PASS = 404035;
codes.ERR_CONN_CREATE_INVALID_NO_PROXY = 404036;
codes.ERR_CONN_CREATE_INVALID_ARRAY_BINDING_THRESHOLD = 404037;
codes.ERR_CONN_CREATE_INVALID_GCS_USE_DOWNSCOPED_CREDENTIAL = 404038;
codes.ERR_CONN_CREATE_INVALID_FORCE_STAGE_BIND_ERROR = 404039;
codes.ERR_CONN_CREATE_INVALID_BROWSER_TIMEOUT = 404040;
codes.ERR_CONN_CREATE_INVALID_DISABLED_QUERY_CONTEXT_CACHE = 404041;
codes.ERR_CONN_CREATE_INVALID_INCLUDE_RETRY_REASON = 404042;
codes.ERR_CONN_CREATE_INVALID_CLIENT_CONFIG_FILE = 404043;
codes.ERR_CONN_CREATE_INVALID_RETRY_TIMEOUT = 404044;
codes.ERR_CONN_CREATE_INVALID_ACCOUNT_REGEX = 404045;
codes.ERR_CONN_CREATE_INVALID_REGION_REGEX = 404046;
codes.ERR_CONN_CREATE_INVALID_DISABLE_CONSOLE_LOGIN = 404047;
codes.ERR_CONN_CREATE_INVALID_FORCE_GCP_USE_DOWNSCOPED_CREDENTIAL = 404048;
codes.ERR_CONN_CREATE_INVALID_CLIENT_STORE_TEMPORARY_CREDENTIAL = 404049;
codes.ERR_CONN_CREATE_INVALID_REPRESENT_NULL_AS_STRING_NULL = 404050;
codes.ERR_CONN_CREATE_INVALID_DISABLE_SAML_URL_CHECK = 404051;
codes.ERR_CONN_CREATE_INVALID_CLIENT_REQUEST_MFA_TOKEN = 404052;
codes.ERR_CONN_CREATE_MISSING_HOST = 404053;
codes.ERR_CONN_CREATE_INVALID_HOST = 404054;
codes.ERR_CONN_CREATE_INVALID_PASSCODE_IN_PASSWORD = 404055;
codes.ERR_CONN_CREATE_INVALID_PASSCODE = 404056;
codes.ERR_CONN_CREATE_MISSING_PASSWORD_AND_TOKEN = 404057;
codes.ERR_CONN_CREATE_INVALID_OUATH_AUTHORIZATION_URL = 404058;
codes.ERR_CONN_CREATE_INVALID_OUATH_CLIENT_ID = 404059;
codes.ERR_CONN_CREATE_INVALID_OUATH_CLIENT_SECRET = 404060;
codes.ERR_CONN_CREATE_INVALID_OUATH_TOKEN_REQUEST_URL = 404061;

// 405001
codes.ERR_CONN_CONNECT_INVALID_CALLBACK = 405001;

// 405501
codes.ERR_CONN_CONNECT_STATUS_CONNECTING = 405501; // sql state: 08002
codes.ERR_CONN_CONNECT_STATUS_CONNECTED = 405502; // sql state: 08002
codes.ERR_CONN_CONNECT_STATUS_DISCONNECTED = 405503; // sql state: 08002
codes.ERR_CONN_CREATE_INVALID_AUTH_CONNECT = 405504;
codes.ERR_CONN_CONNECT_INVALID_CLIENT_CONFIG = 405505;
codes.ERR_CONN_CREATE_INVALID_AUTH_UNSUPPORTED = 405506;
codes.ERR_CONN_CREATE_AUTH_NOT_ALLOWED = 405507;

// 406001
codes.ERR_CONN_DESTROY_INVALID_CALLBACK = 406001;

// 406501
codes.ERR_CONN_DESTROY_STATUS_PRISTINE = 406501;
codes.ERR_CONN_DESTROY_STATUS_DISCONNECTED = 406502;

// 407001
codes.ERR_CONN_REQUEST_STATUS_PRISTINE = 407001; // sql state: 08003
codes.ERR_CONN_REQUEST_STATUS_DISCONNECTED = 407002; // sql state: 08003

// 408001
codes.ERR_CONN_DESERIALIZE_MISSING_CONFIG = 408001;
codes.ERR_CONN_DESERIALIZE_INVALID_CONFIG_TYPE = 408002;
codes.ERR_CONN_DESERIALIZE_INVALID_CONFIG_FORM = 408003;

// 409001
codes.ERR_CONN_EXEC_STMT_MISSING_OPTIONS = 409001;
codes.ERR_CONN_EXEC_STMT_INVALID_OPTIONS = 409002;
codes.ERR_CONN_EXEC_STMT_MISSING_SQL_TEXT = 409003;
codes.ERR_CONN_EXEC_STMT_INVALID_SQL_TEXT = 409004;
codes.ERR_CONN_EXEC_STMT_INVALID_INTERNAL = 409005;
codes.ERR_CONN_EXEC_STMT_INVALID_PARAMETERS = 409006;
codes.ERR_CONN_EXEC_STMT_INVALID_BINDS = 409007;
codes.ERR_CONN_EXEC_STMT_INVALID_BIND_VALUES = 409008;
codes.ERR_CONN_EXEC_STMT_INVALID_COMPLETE = 409009;
codes.ERR_CONN_EXEC_STMT_INVALID_STREAM_RESULT = 409010;
codes.ERR_CONN_EXEC_STMT_INVALID_FETCH_AS_STRING = 409011;
codes.ERR_CONN_EXEC_STMT_INVALID_FETCH_AS_STRING_VALUES = 409012;
codes.ERR_CONN_EXEC_STMT_INVALID_REQUEST_ID = 409013;
codes.ERR_CONN_EXEC_STMT_INVALID_ASYNC_EXEC = 409014;
codes.ERR_CONN_EXEC_STMT_INVALID_DESCRIBE_ONLY = 409015;

// 410001
codes.ERR_CONN_FETCH_RESULT_MISSING_OPTIONS = 410001;
codes.ERR_CONN_FETCH_RESULT_INVALID_OPTIONS = 410002;
codes.ERR_CONN_FETCH_RESULT_MISSING_QUERY_ID = 410003;
codes.ERR_CONN_FETCH_RESULT_INVALID_QUERY_ID = 410004;
codes.ERR_CONN_FETCH_RESULT_INVALID_COMPLETE = 410005;
codes.ERR_CONN_FETCH_RESULT_INVALID_STREAM_RESULT = 410006;
codes.ERR_CONN_FETCH_RESULT_INVALID_FETCH_AS_STRING = 410007;
codes.ERR_CONN_FETCH_RESULT_INVALID_FETCH_AS_STRING_VALUES = 410008;
codes.ERR_CONN_FETCH_RESULT_INVALID_CWD = 410009;

// 411001
codes.ERR_STMT_STREAM_ROWS_INVALID_OPTIONS = 411001;
codes.ERR_STMT_STREAM_ROWS_INVALID_START = 411002;
codes.ERR_STMT_STREAM_ROWS_INVALID_END = 411003;
codes.ERR_STMT_STREAM_ROWS_INVALID_FETCH_AS_STRING = 411004;
codes.ERR_STMT_STREAM_ROWS_INVALID_FETCH_AS_STRING_VALUES = 411005;
codes.ERR_STMT_STREAM_ROWS_INVALID_ROW_MODE = 411006;

// 412001
codes.ERR_OCSP_REVOKED = 412001;
codes.ERR_OCSP_UNKNOWN = 412002;
codes.ERR_OCSP_NO_SIGNATURE_ALGORITHM = 412003;
codes.ERR_OCSP_INVALID_SIGNATURE = 412004;
codes.ERR_OCSP_NO_RESPONSE = 412005;
codes.ERR_OCSP_INVALID_VALIDITY = 412006;
codes.ERR_OCSP_UNKNOWN_STATE = 412007;
codes.ERR_OCSP_NOT_TWO_ELEMENTS = 412008;
codes.ERR_OCSP_CACHE_EXPIRED = 412009;
codes.ERR_OCSP_FAILED_PARSE_RESPONSE = 412010;
codes.ERR_OCSP_INVALID_CERTIFICATE_VALIDITY = 412011;
codes.ERR_OCSP_RESPONDER_TIMEOUT = 412012;
codes.ERR_OCSP_CACHE_SERVER_TIMEOUT = 412013;
codes.ERR_OCSP_FAILED_OBTAIN_OCSP_RESPONSE = 412014;

// 450001
codes.ERR_STMT_FETCH_ROWS_MISSING_OPTIONS = 450001;
codes.ERR_STMT_FETCH_ROWS_INVALID_OPTIONS = 450002;
codes.ERR_STMT_FETCH_ROWS_MISSING_EACH = 450003;
codes.ERR_STMT_FETCH_ROWS_INVALID_EACH = 450004;
codes.ERR_STMT_FETCH_ROWS_MISSING_END = 450005;
codes.ERR_STMT_FETCH_ROWS_INVALID_END = 450006;
codes.ERR_STMT_FETCH_ROWS_FETCHING_RESULT = 450007;

// 460001
codes.ERR_GET_RESPONSE_QUERY_INVALID_UUID = 460001;
codes.ERR_GET_RESULTS_QUERY_ID_NO_DATA = 460002;
codes.ERR_GET_RESULTS_QUERY_ID_NOT_SUCCESS_STATUS = 460003;

exports.codes = codes;

/**
 * A map in which the keys are the error codes and the values are the
 * corresponding SQL-states.
 */
const errCodeToSqlState = exports.mapErrorCodeToSqlState =
  {
    405501: '08002',
    405502: '08002',
    405503: '08003',
    407001: '08003',
    407002: '08003'
  };

/**
 * An enumeration of all the different types of errors we create.
 */
const errorTypes =
  {
    // internal synchronous errors
    InternalAssertError: 'InternalAssertError',

    // external synchronous errors
    MissingParameterError: 'MissingParameterError',
    InvalidParameterError: 'InvalidParameterError',

    // external asynchronous errors
    NetworkError: 'NetworkError',
    RequestFailedError: 'RequestFailedError',
    UnexpectedContentError: 'UnexpectedContentError',
    OperationFailedError: 'OperationFailedError',
    LargeResultSetError: 'LargeResultSetError',
    ClientError: 'ClientError',
    OCSPError: 'OCSPError'
  };

/**
 * Ensures the truth of an expression. Used to catch internal programming
 * errors. If the given expression is false, an InternalAssertError will be
 * thrown.
 *
 * @param {Boolean} expression a boolean expression.
 * @param {String} [message] a message for the error should the check fail.
 */
exports.assertInternal = function (expression, message) {
  if (!expression) {
    throw createError(errorTypes.InternalAssertError,
      {
        code: codes.ERR_INTERNAL_ASSERT_FAILED,
        message: message,
        synchronous: true
      });
  }
};

/**
 * Ensures the truth of an expression. Used to make sure all required arguments
 * are passed in to a method. If the specified expression is false, a
 * MissingParameterError will be thrown.
 *
 * @param {Boolean} expression a boolean expression.
 * @param {Number} errorCode a code for the error should the check fail.
 *
 * @throws will throw an MissingParameter error if the expression is false.
 */
exports.checkArgumentExists = function (expression, errorCode) {
  if (!expression) {
    throw createError(errorTypes.MissingParameterError,
      {
        code: errorCode,
        messageArgs: Array.prototype.slice.call(arguments, 2),
        synchronous: true
      });
  }
};

/**
 * Ensures the truth of an expression. Used for validating arguments to methods.
 * If the specified expression is false, an InvalidParameterError will be
 * thrown.
 *
 * @param {Boolean} expression a boolean expression.
 * @param {Number} errorCode a code for the error should the check fail.
 *
 * @throws will throw an InvalidParameter error if the expression is false.
 */
exports.checkArgumentValid = function (expression, errorCode) {
  if (!expression) {
    throw createError(errorTypes.InvalidParameterError,
      {
        code: errorCode,
        messageArgs: Array.prototype.slice.call(arguments, 2),
        synchronous: true
      });
  }
};

/**
 * Creates a new InvalidParameterError.
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {messageArgs} array of error massages
 * @returns {Error}
 */
exports.createInvalidParameterError = function (errorCode, ...messageArgs) {
  return createError(errorTypes.InvalidParameterError,
    {
      code: errorCode,
      messageArgs: messageArgs,
      synchronous: true
    });
};
/**
 * Creates a new NetworkError.
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {Error} cause the underlying cause of the network error.
 *
 * @returns {Error}
 */
exports.createNetworkError = function (errorCode, cause) {
  return createError(errorTypes.NetworkError,
    {
      code: errorCode,
      cause: cause
    });
};

/**
 * Creates a new RequestFailedError.
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {Object} response the response sent by Global Services.
 *
 * @returns {Error}
 */
exports.createRequestFailedError = function (errorCode, response) {
  return createError(errorTypes.RequestFailedError,
    {
      code: errorCode,
      response: response
    });
};

/**
 * Creates a new UnexpectedContentError.
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {String} responseBody the response body sent by Global Services.
 *
 * @returns {Error}
 */
exports.createUnexpectedContentError = function (errorCode, responseBody) {
  return createError(errorTypes.UnexpectedContentError,
    {
      code: errorCode,
      responseBody: responseBody
    });
};

/**
 * Creates a new OperationFailedError.
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {Object} data the data sent by Global Services.
 * @param {String} message the error message sent by Global Services.
 * @param {String} sqlState the sql state sent by Global Services.
 *
 * @returns {Error}
 */
exports.createOperationFailedError = function (
  errorCode, data, message, sqlState) {
  return createError(errorTypes.OperationFailedError,
    {
      code: errorCode,
      data: data,
      message: message,
      sqlState: sqlState
    });
};

/**
 * Creates a new LargeResultSetError.
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {Object} response the response sent by S3/Blob.
 *
 * @returns {Error}
 */
exports.createLargeResultSetError = function (errorCode, response) {
  return createError(errorTypes.LargeResultSetError,
    {
      code: errorCode,
      response: response
    });
};

/**
 * Creates a new ClientError.
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {Object} [isFatal] whether the error is fatal.
 *
 * @return {Error}
 */
exports.createClientError = function (errorCode, isFatal) {
  return createError(errorTypes.ClientError,
    {
      code: errorCode,
      isFatal: isFatal,
      messageArgs: Array.prototype.slice.call(arguments, 2)
    });
};

/**
 * Creates a OCSPError
 *
 * @param {Number} errorCode the error code to use when building the error.
 * @param {String} message
 * @returns {Error}
 */
exports.createOCSPError = function (errorCode) {
  return createError(errorTypes.OCSPError,
    {
      code: errorCode,
      messageArgs: Array.prototype.slice.call(arguments, 1)
    }
  );
};

/**
 * Creates a new error by combining the error messages from the json parser and xml parser
 *
 * @param {Object} jsonParseError contains the JSON parse error message
 * @param {Object} xmlParseError contains the XML parse error message
 * @returns {Error}
 */
exports.VariantParseError = function (jsonParseError, xmlParseError) {
  const errMessage = 'VariantParseError: Variant cannot be parsed neither as JSON nor as XML:\n' +
    ` - JSON parse error message: ${jsonParseError.message}\n` +
    ` - XML parse error message: ${xmlParseError.message}`;
  return new Error(errMessage);
};

/**
 * Determines if a given error is an InternalAssertError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isInternalAssertError = function (error) {
  return isErrorOfType(error, errorTypes.InternalAssertError);
};

/**
 * Determines if a given error is a MissingParameterError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isMissingParameterError = function (error) {
  return isErrorOfType(error, errorTypes.MissingParameterError);
};

/**
 * Determines if a given error is an InvalidParameterError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isInvalidParameterError = function (error) {
  return isErrorOfType(error, errorTypes.InvalidParameterError);
};

/**
 * Determines if a given error is a NetworkError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isNetworkError = function (error) {
  return isErrorOfType(error, errorTypes.NetworkError);
};

/**
 * Determines if a given error is a RequestFailedError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isRequestFailedError = function (error) {
  return isErrorOfType(error, errorTypes.RequestFailedError);
};

/**
 * Determines if a given error is an UnexpectedContentError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isUnexpectedContentError = function (error) {
  return isErrorOfType(error, errorTypes.UnexpectedContentError);
};

/**
 * Determines if a given error is an OperationFailedError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isOperationFailedError = function (error) {
  return isErrorOfType(error, errorTypes.OperationFailedError);
};

/**
 * Determines if a given error is an LargeResultSetError.
 *
 * @param {Error} error
 *
 * @returns {Boolean}
 */
exports.isLargeResultSetError = function (error) {
  return isErrorOfType(error, errorTypes.LargeResultSetError);
};

/**
 * Externalizes an error.
 *
 * @param {Error} error
 *
 * @returns {Error}
 */
exports.externalize = function (error) {
  return error && error.externalize ? error.externalize() : error;
};

/**
 * Determines if a given error is of a specific type.
 *
 * @param {Error} error
 * @param {String} type
 *
 * @returns {Boolean}
 */
function isErrorOfType(error, type) {
  return error && (error.name === type);
}

/**
 * Creates a generic error.
 *
 * @param {String} name
 * @param {Object} options
 *
 * @returns {Error}
 */
function createError(name, options) {
  // TODO: validate that name is a string and options is an object

  // TODO: this code is a bit of a mess and needs to be cleaned up

  // create a new error
  const error = new Error();

  // set its name
  error.name = name;

  // set the error code
  let code;
  error.code = code = options.code;

  // if no error message was specified in the options
  let message = options.message;
  if (!message) {
    // use the error code to get the error message template
    const messageTemplate = errorMessages[code];

    // if some error message arguments were specified, substitute them into the
    // error message template to get the full error message, otherwise just use
    // the error message template as the error message
    let messageArgs = options.messageArgs;
    if (messageArgs) {
      messageArgs = messageArgs.slice();
      messageArgs.unshift(messageTemplate);
      message = Util.format.apply(Util, messageArgs);
    } else {
      message = messageTemplate;
    }
  }
  error.message = message;

  // if no sql state was specified in the options, use the error code to try to
  // get the appropriate sql state
  let sqlState = options.sqlState;
  if (!sqlState) {
    sqlState = errCodeToSqlState[code];
  }
  error.sqlState = sqlState;

  // set the error data
  error.data = options.data;

  // set the error response and response body
  error.response = options.response;
  error.responseBody = options.responseBody;

  // set the error cause
  error.cause = options.cause;

  // set the error's fatal flag
  error.isFatal = options.isFatal;

  // if the error is not synchronous, add an externalize() method
  if (!options.synchronous) {
    error.externalize = function () {
      const propNames =
        [
          'name',
          'code',
          'message',
          'sqlState',
          'data',
          'response',
          'responseBody',
          'cause',
          'isFatal',
          'stack'
        ];

      const externalizedError = new Error();

      let propName, propValue;
      for (let index = 0, length = propNames.length; index < length; index++) {
        propName = propNames[index];
        propValue = this[propName];
        if (Util.exists(propValue)) {
          externalizedError[propName] = propValue;
        }
      }

      return externalizedError;
    };
  }

  return error;
}
