"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedMethods = allowedMethods;
const errors_js_1 = require("../errors.js");
/**
 * Middleware to handle unsupported HTTP methods with a 405 Method Not Allowed response.
 *
 * @param allowedMethods Array of allowed HTTP methods for this endpoint (e.g., ['GET', 'POST'])
 * @returns Express middleware that returns a 405 error if method not in allowed list
 */
function allowedMethods(allowedMethods) {
    return (req, res, next) => {
        if (allowedMethods.includes(req.method)) {
            next();
            return;
        }
        const error = new errors_js_1.MethodNotAllowedError(`The method ${req.method} is not allowed for this endpoint`);
        res.status(405).set('Allow', allowedMethods.join(', ')).json(error.toResponseObject());
    };
}
//# sourceMappingURL=allowedMethods.js.map