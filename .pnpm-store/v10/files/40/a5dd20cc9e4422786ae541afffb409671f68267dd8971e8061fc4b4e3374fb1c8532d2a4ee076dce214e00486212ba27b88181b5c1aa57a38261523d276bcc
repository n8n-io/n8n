// When the subprocess fails, this is the error instance being returned.
// If another error instance is being thrown, it is kept as `error.cause`.
export const getFinalError = (originalError, message, isSync) => {
	const ErrorClass = isSync ? ExecaSyncError : ExecaError;
	const options = originalError instanceof DiscardedError ? {} : {cause: originalError};
	return new ErrorClass(message, options);
};

// Indicates that the error is used only to interrupt control flow, but not in the return value
export class DiscardedError extends Error {}

// Proper way to set `error.name`: it should be inherited and non-enumerable
const setErrorName = (ErrorClass, value) => {
	Object.defineProperty(ErrorClass.prototype, 'name', {
		value,
		writable: true,
		enumerable: false,
		configurable: true,
	});
	Object.defineProperty(ErrorClass.prototype, execaErrorSymbol, {
		value: true,
		writable: false,
		enumerable: false,
		configurable: false,
	});
};

// Unlike `instanceof`, this works across realms
export const isExecaError = error => isErrorInstance(error) && execaErrorSymbol in error;

const execaErrorSymbol = Symbol('isExecaError');

export const isErrorInstance = value => Object.prototype.toString.call(value) === '[object Error]';

// We use two different Error classes for async/sync methods since they have slightly different shape and types
export class ExecaError extends Error {}
setErrorName(ExecaError, ExecaError.name);

export class ExecaSyncError extends Error {}
setErrorName(ExecaSyncError, ExecaSyncError.name);
