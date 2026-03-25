import { extendError } from "./extend-error";
import { normalizeArgs, normalizeOptions } from "./normalize";
import { toJSON as errorToJSON } from "./to-json";
const constructor = Ono;
export { constructor as Ono };
/**
 * Creates an `Ono` instance for a specifc error type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function Ono(ErrorConstructor, options) {
    options = normalizeOptions(options);
    function ono(...args) {
        let { originalError, props, message } = normalizeArgs(args, options);
        // Create a new error of the specified type
        let newError = new ErrorConstructor(message);
        // Extend the error with the properties of the original error and the `props` object
        return extendError(newError, originalError, props);
    }
    ono[Symbol.species] = ErrorConstructor;
    return ono;
}
/**
 * Returns an object containing all properties of the given Error object,
 * which can be used with `JSON.stringify()`.
 */
Ono.toJSON = function toJSON(error) {
    return errorToJSON.call(error);
};
/**
 * Extends the given Error object with enhanced Ono functionality, such as nested stack traces,
 * additional properties, and improved support for `JSON.stringify()`.
 */
Ono.extend = function extend(error, originalError, props) {
    if (props || originalError instanceof Error) {
        return extendError(error, originalError, props);
    }
    else if (originalError) {
        return extendError(error, undefined, originalError);
    }
    else {
        return extendError(error);
    }
};
//# sourceMappingURL=constructor.js.map