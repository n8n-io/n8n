"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.pushAggregatehOptions = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = exports.AggregateGroupByReducers = exports.AggregateSteps = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
const _1 = require(".");
var AggregateSteps;
(function (AggregateSteps) {
    AggregateSteps["GROUPBY"] = "GROUPBY";
    AggregateSteps["SORTBY"] = "SORTBY";
    AggregateSteps["APPLY"] = "APPLY";
    AggregateSteps["LIMIT"] = "LIMIT";
    AggregateSteps["FILTER"] = "FILTER";
})(AggregateSteps || (exports.AggregateSteps = AggregateSteps = {}));
var AggregateGroupByReducers;
(function (AggregateGroupByReducers) {
    AggregateGroupByReducers["COUNT"] = "COUNT";
    AggregateGroupByReducers["COUNT_DISTINCT"] = "COUNT_DISTINCT";
    AggregateGroupByReducers["COUNT_DISTINCTISH"] = "COUNT_DISTINCTISH";
    AggregateGroupByReducers["SUM"] = "SUM";
    AggregateGroupByReducers["MIN"] = "MIN";
    AggregateGroupByReducers["MAX"] = "MAX";
    AggregateGroupByReducers["AVG"] = "AVG";
    AggregateGroupByReducers["STDDEV"] = "STDDEV";
    AggregateGroupByReducers["QUANTILE"] = "QUANTILE";
    AggregateGroupByReducers["TOLIST"] = "TOLIST";
    AggregateGroupByReducers["TO_LIST"] = "TOLIST";
    AggregateGroupByReducers["FIRST_VALUE"] = "FIRST_VALUE";
    AggregateGroupByReducers["RANDOM_SAMPLE"] = "RANDOM_SAMPLE";
})(AggregateGroupByReducers || (exports.AggregateGroupByReducers = AggregateGroupByReducers = {}));
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(index, query, options) {
    return pushAggregatehOptions(['FT.AGGREGATE', index, query], options);
}
exports.transformArguments = transformArguments;
function pushAggregatehOptions(args, options) {
    if (options?.VERBATIM) {
        args.push('VERBATIM');
    }
    if (options?.LOAD) {
        args.push('LOAD');
        (0, _1.pushArgumentsWithLength)(args, () => {
            if (Array.isArray(options.LOAD)) {
                for (const load of options.LOAD) {
                    pushLoadField(args, load);
                }
            }
            else {
                pushLoadField(args, options.LOAD);
            }
        });
    }
    if (options?.STEPS) {
        for (const step of options.STEPS) {
            switch (step.type) {
                case AggregateSteps.GROUPBY:
                    args.push('GROUPBY');
                    if (!step.properties) {
                        args.push('0');
                    }
                    else {
                        (0, generic_transformers_1.pushVerdictArgument)(args, step.properties);
                    }
                    if (Array.isArray(step.REDUCE)) {
                        for (const reducer of step.REDUCE) {
                            pushGroupByReducer(args, reducer);
                        }
                    }
                    else {
                        pushGroupByReducer(args, step.REDUCE);
                    }
                    break;
                case AggregateSteps.SORTBY:
                    (0, _1.pushSortByArguments)(args, 'SORTBY', step.BY);
                    if (step.MAX) {
                        args.push('MAX', step.MAX.toString());
                    }
                    break;
                case AggregateSteps.APPLY:
                    args.push('APPLY', step.expression, 'AS', step.AS);
                    break;
                case AggregateSteps.LIMIT:
                    args.push('LIMIT', step.from.toString(), step.size.toString());
                    break;
                case AggregateSteps.FILTER:
                    args.push('FILTER', step.expression);
                    break;
            }
        }
    }
    (0, _1.pushParamsArgs)(args, options?.PARAMS);
    if (options?.DIALECT) {
        args.push('DIALECT', options.DIALECT.toString());
    }
    if (options?.TIMEOUT !== undefined) {
        args.push('TIMEOUT', options.TIMEOUT.toString());
    }
    return args;
}
exports.pushAggregatehOptions = pushAggregatehOptions;
function pushLoadField(args, toLoad) {
    if (typeof toLoad === 'string') {
        args.push(toLoad);
    }
    else {
        args.push(toLoad.identifier);
        if (toLoad.AS) {
            args.push('AS', toLoad.AS);
        }
    }
}
function pushGroupByReducer(args, reducer) {
    args.push('REDUCE', reducer.type);
    switch (reducer.type) {
        case AggregateGroupByReducers.COUNT:
            args.push('0');
            break;
        case AggregateGroupByReducers.COUNT_DISTINCT:
        case AggregateGroupByReducers.COUNT_DISTINCTISH:
        case AggregateGroupByReducers.SUM:
        case AggregateGroupByReducers.MIN:
        case AggregateGroupByReducers.MAX:
        case AggregateGroupByReducers.AVG:
        case AggregateGroupByReducers.STDDEV:
        case AggregateGroupByReducers.TOLIST:
            args.push('1', reducer.property);
            break;
        case AggregateGroupByReducers.QUANTILE:
            args.push('2', reducer.property, reducer.quantile.toString());
            break;
        case AggregateGroupByReducers.FIRST_VALUE: {
            (0, _1.pushArgumentsWithLength)(args, () => {
                args.push(reducer.property);
                if (reducer.BY) {
                    args.push('BY');
                    if (typeof reducer.BY === 'string') {
                        args.push(reducer.BY);
                    }
                    else {
                        args.push(reducer.BY.property);
                        if (reducer.BY.direction) {
                            args.push(reducer.BY.direction);
                        }
                    }
                }
            });
            break;
        }
        case AggregateGroupByReducers.RANDOM_SAMPLE:
            args.push('2', reducer.property, reducer.sampleSize.toString());
            break;
    }
    if (reducer.AS) {
        args.push('AS', reducer.AS);
    }
}
function transformReply(rawReply) {
    const results = [];
    for (let i = 1; i < rawReply.length; i++) {
        results.push((0, generic_transformers_1.transformTuplesReply)(rawReply[i]));
    }
    return {
        total: rawReply[0],
        results
    };
}
exports.transformReply = transformReply;
