import { context, SpanStatusCode } from '../../';
var defaultOnException = function (e, span) {
    span.recordException(e);
    span.setStatus({
        code: SpanStatusCode.ERROR,
    });
};
/**
 * return a new SugaredTracer created from the supplied one
 * @param tracer
 */
export function wrapTracer(tracer) {
    return new SugaredTracer(tracer);
}
var SugaredTracer = /** @class */ (function () {
    function SugaredTracer(tracer) {
        this._tracer = tracer;
        this.startSpan = tracer.startSpan.bind(this._tracer);
        this.startActiveSpan = tracer.startActiveSpan.bind(this._tracer);
    }
    SugaredTracer.prototype.withActiveSpan = function (name, arg2, arg3, arg4) {
        var _a = massageParams(arg2, arg3, arg4), opts = _a.opts, ctx = _a.ctx, fn = _a.fn;
        return this._tracer.startActiveSpan(name, opts, ctx, function (span) {
            return handleFn(span, opts, fn);
        });
    };
    SugaredTracer.prototype.withSpan = function (name, arg2, arg3, arg4) {
        var _a = massageParams(arg2, arg3, arg4), opts = _a.opts, ctx = _a.ctx, fn = _a.fn;
        var span = this._tracer.startSpan(name, opts, ctx);
        return handleFn(span, opts, fn);
    };
    return SugaredTracer;
}());
export { SugaredTracer };
/**
 * Massages parameters of withSpan and withActiveSpan to allow signature overwrites
 * @param arg
 * @param arg2
 * @param arg3
 */
function massageParams(arg, arg2, arg3) {
    var opts;
    var ctx;
    var fn;
    if (!arg2 && !arg3) {
        fn = arg;
    }
    else if (!arg3) {
        opts = arg;
        fn = arg2;
    }
    else {
        opts = arg;
        ctx = arg2;
        fn = arg3;
    }
    opts = opts !== null && opts !== void 0 ? opts : {};
    ctx = ctx !== null && ctx !== void 0 ? ctx : context.active();
    return { opts: opts, ctx: ctx, fn: fn };
}
/**
 * Executes fn, returns results and runs onException in the case of exception to allow overwriting of error handling
 * @param span
 * @param opts
 * @param fn
 */
function handleFn(span, opts, fn) {
    var _a;
    var onException = (_a = opts.onException) !== null && _a !== void 0 ? _a : defaultOnException;
    var errorHandler = function (e) {
        onException(e, span);
        span.end();
        throw e;
    };
    try {
        var ret = fn(span);
        // if fn is an async function, attach a recordException and spanEnd callback to the promise
        if (typeof (ret === null || ret === void 0 ? void 0 : ret.then) === 'function') {
            return ret.then(function (val) {
                span.end();
                return val;
            }, errorHandler);
        }
        span.end();
        return ret;
    }
    catch (e) {
        // add throw to signal the compiler that this will throw in the inner scope
        throw errorHandler(e);
    }
}
//# sourceMappingURL=SugaredTracer.js.map