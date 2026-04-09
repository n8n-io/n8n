"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VersionError = exports.TransactionInactiveError = exports.SyntaxError = exports.ReadOnlyError = exports.NotFoundError = exports.InvalidStateError = exports.InvalidAccessError = exports.DataError = exports.DataCloneError = exports.ConstraintError = exports.AbortError = void 0;
const messages = {
  AbortError: "A request was aborted, for example through a call to IDBTransaction.abort.",
  ConstraintError: "A mutation operation in the transaction failed because a constraint was not satisfied. For example, an object such as an object store or index already exists and a request attempted to create a new one.",
  DataCloneError: "The data being stored could not be cloned by the internal structured cloning algorithm.",
  DataError: "Data provided to an operation does not meet requirements.",
  InvalidAccessError: "An invalid operation was performed on an object. For example transaction creation attempt was made, but an empty scope was provided.",
  InvalidStateError: "An operation was called on an object on which it is not allowed or at a time when it is not allowed. Also occurs if a request is made on a source object that has been deleted or removed. Use TransactionInactiveError or ReadOnlyError when possible, as they are more specific variations of InvalidStateError.",
  NotFoundError: "The operation failed because the requested database object could not be found. For example, an object store did not exist but was being opened.",
  ReadOnlyError: 'The mutating operation was attempted in a "readonly" transaction.',
  TransactionInactiveError: "A request was placed against a transaction which is currently not active, or which is finished.",
  SyntaxError: "The keypath argument contains an invalid key path",
  VersionError: "An attempt was made to open a database using a lower version than the existing version."
};

// Cannot set an error code on an error using the normal setter;
// this leads to "Cannot set property code of  which has only a getter"
const setErrorCode = (error, value) => {
  Object.defineProperty(error, 'code', {
    value,
    writable: false,
    enumerable: true,
    configurable: false
  });
};
class AbortError extends DOMException {
  constructor(message = messages.AbortError) {
    super(message, "AbortError");
  }
}
exports.AbortError = AbortError;
class ConstraintError extends DOMException {
  constructor(message = messages.ConstraintError) {
    super(message, "ConstraintError");
  }
}
exports.ConstraintError = ConstraintError;
class DataCloneError extends DOMException {
  constructor(message = messages.DataCloneError) {
    super(message, "DataCloneError");
  }
}
exports.DataCloneError = DataCloneError;
class DataError extends DOMException {
  constructor(message = messages.DataError) {
    super(message, "DataError");
    setErrorCode(this, 0);
  }
}
exports.DataError = DataError;
class InvalidAccessError extends DOMException {
  constructor(message = messages.InvalidAccessError) {
    super(message, "InvalidAccessError");
  }
}
exports.InvalidAccessError = InvalidAccessError;
class InvalidStateError extends DOMException {
  constructor(message = messages.InvalidStateError) {
    super(message, "InvalidStateError");
    setErrorCode(this, 11);
  }
}
exports.InvalidStateError = InvalidStateError;
class NotFoundError extends DOMException {
  constructor(message = messages.NotFoundError) {
    super(message, "NotFoundError");
  }
}
exports.NotFoundError = NotFoundError;
class ReadOnlyError extends DOMException {
  constructor(message = messages.ReadOnlyError) {
    super(message, "ReadOnlyError");
  }
}
exports.ReadOnlyError = ReadOnlyError;
class SyntaxError extends DOMException {
  constructor(message = messages.VersionError) {
    super(message, "SyntaxError");
    setErrorCode(this, 12);
  }
}
exports.SyntaxError = SyntaxError;
class TransactionInactiveError extends DOMException {
  constructor(message = messages.TransactionInactiveError) {
    super(message, "TransactionInactiveError");
    setErrorCode(this, 0);
  }
}
exports.TransactionInactiveError = TransactionInactiveError;
class VersionError extends DOMException {
  constructor(message = messages.VersionError) {
    super(message, "VersionError");
  }
}
exports.VersionError = VersionError;