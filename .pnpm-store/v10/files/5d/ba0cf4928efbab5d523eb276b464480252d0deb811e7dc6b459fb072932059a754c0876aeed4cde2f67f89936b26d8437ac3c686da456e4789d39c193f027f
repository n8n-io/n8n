"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiddlewareSet = void 0;
const logger_1 = require("@microsoft/agents-activity/logger");
const logger = (0, logger_1.debug)('agents:middleware');
/**
 * Represents a set of middleware.
 */
class MiddlewareSet {
    /**
     * Initializes a new instance of the MiddlewareSet class.
     * @param middlewares The middleware handlers or middleware objects to use.
     */
    constructor(...middlewares) {
        this.middleware = [];
        this.use(...middlewares);
    }
    /**
     * Handles the turn of the middleware.
     * @param context The turn context.
     * @param next The next function to call.
     * @returns A promise representing the asynchronous operation.
     */
    async onTurn(context, next) {
        return await this.run(context, next);
    }
    /**
     * Adds middleware to the set.
     * @param middlewares The middleware handlers or middleware objects to add.
     * @returns The current MiddlewareSet instance.
     */
    use(...middlewares) {
        middlewares.forEach((plugin) => {
            if (typeof plugin === 'function' || (typeof plugin === 'object' && plugin.onTurn)) {
                this.middleware.push(typeof plugin === 'function' ? plugin : async (context, next) => await plugin.onTurn(context, next));
            }
            else {
                throw new Error('MiddlewareSet.use(): invalid plugin type being added.');
            }
        });
        return this;
    }
    /**
     * Runs the middleware chain.
     * @param context The turn context.
     * @param next The next function to call.
     * @returns A promise representing the asynchronous operation.
     */
    async run(context, next) {
        return await this.middleware.reduceRight((nextHandler, currentHandler) => async () => await currentHandler(context, nextHandler), next)().catch(err => {
            logger.error('Error in middleware chain:', err);
            throw err;
        });
    }
}
exports.MiddlewareSet = MiddlewareSet;
//# sourceMappingURL=middlewareSet.js.map