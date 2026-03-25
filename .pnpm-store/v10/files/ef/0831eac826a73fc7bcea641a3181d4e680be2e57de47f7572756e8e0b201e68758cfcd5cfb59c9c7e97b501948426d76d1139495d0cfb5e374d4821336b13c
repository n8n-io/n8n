"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushLatestArgument = exports.transformMRangeWithLabelsReply = exports.transformMRangeReply = exports.transformRangeReply = exports.pushMRangeWithLabelsArguments = exports.pushWithLabelsArgument = exports.pushMRangeArguments = exports.pushFilterArgument = exports.pushMRangeGroupByArguments = exports.pushRangeArguments = exports.TimeSeriesBucketTimestamp = exports.transformSampleReply = exports.transformIncrDecrArguments = exports.pushLabelsArgument = exports.transformLablesReply = exports.pushDuplicatePolicy = exports.pushChunkSizeArgument = exports.pushEncodingArgument = exports.TimeSeriesEncoding = exports.pushRetentionArgument = exports.transformTimestampArgument = exports.TimeSeriesReducers = exports.TimeSeriesDuplicatePolicies = exports.TimeSeriesAggregationType = void 0;
const ADD = require("./ADD");
const ALTER = require("./ALTER");
const CREATE = require("./CREATE");
const CREATERULE = require("./CREATERULE");
const DECRBY = require("./DECRBY");
const DEL = require("./DEL");
const DELETERULE = require("./DELETERULE");
const GET = require("./GET");
const INCRBY = require("./INCRBY");
const INFO_DEBUG = require("./INFO_DEBUG");
const INFO = require("./INFO");
const MADD = require("./MADD");
const MGET = require("./MGET");
const MGET_WITHLABELS = require("./MGET_WITHLABELS");
const QUERYINDEX = require("./QUERYINDEX");
const RANGE = require("./RANGE");
const REVRANGE = require("./REVRANGE");
const MRANGE = require("./MRANGE");
const MRANGE_WITHLABELS = require("./MRANGE_WITHLABELS");
const MREVRANGE = require("./MREVRANGE");
const MREVRANGE_WITHLABELS = require("./MREVRANGE_WITHLABELS");
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
exports.default = {
    ADD,
    add: ADD,
    ALTER,
    alter: ALTER,
    CREATE,
    create: CREATE,
    CREATERULE,
    createRule: CREATERULE,
    DECRBY,
    decrBy: DECRBY,
    DEL,
    del: DEL,
    DELETERULE,
    deleteRule: DELETERULE,
    GET,
    get: GET,
    INCRBY,
    incrBy: INCRBY,
    INFO_DEBUG,
    infoDebug: INFO_DEBUG,
    INFO,
    info: INFO,
    MADD,
    mAdd: MADD,
    MGET,
    mGet: MGET,
    MGET_WITHLABELS,
    mGetWithLabels: MGET_WITHLABELS,
    QUERYINDEX,
    queryIndex: QUERYINDEX,
    RANGE,
    range: RANGE,
    REVRANGE,
    revRange: REVRANGE,
    MRANGE,
    mRange: MRANGE,
    MRANGE_WITHLABELS,
    mRangeWithLabels: MRANGE_WITHLABELS,
    MREVRANGE,
    mRevRange: MREVRANGE,
    MREVRANGE_WITHLABELS,
    mRevRangeWithLabels: MREVRANGE_WITHLABELS
};
var TimeSeriesAggregationType;
(function (TimeSeriesAggregationType) {
    TimeSeriesAggregationType["AVG"] = "AVG";
    // @deprecated
    TimeSeriesAggregationType["AVERAGE"] = "AVG";
    TimeSeriesAggregationType["FIRST"] = "FIRST";
    TimeSeriesAggregationType["LAST"] = "LAST";
    TimeSeriesAggregationType["MIN"] = "MIN";
    // @deprecated
    TimeSeriesAggregationType["MINIMUM"] = "MIN";
    TimeSeriesAggregationType["MAX"] = "MAX";
    // @deprecated
    TimeSeriesAggregationType["MAXIMUM"] = "MAX";
    TimeSeriesAggregationType["SUM"] = "SUM";
    TimeSeriesAggregationType["RANGE"] = "RANGE";
    TimeSeriesAggregationType["COUNT"] = "COUNT";
    TimeSeriesAggregationType["STD_P"] = "STD.P";
    TimeSeriesAggregationType["STD_S"] = "STD.S";
    TimeSeriesAggregationType["VAR_P"] = "VAR.P";
    TimeSeriesAggregationType["VAR_S"] = "VAR.S";
    TimeSeriesAggregationType["TWA"] = "TWA";
})(TimeSeriesAggregationType || (exports.TimeSeriesAggregationType = TimeSeriesAggregationType = {}));
var TimeSeriesDuplicatePolicies;
(function (TimeSeriesDuplicatePolicies) {
    TimeSeriesDuplicatePolicies["BLOCK"] = "BLOCK";
    TimeSeriesDuplicatePolicies["FIRST"] = "FIRST";
    TimeSeriesDuplicatePolicies["LAST"] = "LAST";
    TimeSeriesDuplicatePolicies["MIN"] = "MIN";
    TimeSeriesDuplicatePolicies["MAX"] = "MAX";
    TimeSeriesDuplicatePolicies["SUM"] = "SUM";
})(TimeSeriesDuplicatePolicies || (exports.TimeSeriesDuplicatePolicies = TimeSeriesDuplicatePolicies = {}));
var TimeSeriesReducers;
(function (TimeSeriesReducers) {
    TimeSeriesReducers["AVG"] = "AVG";
    TimeSeriesReducers["SUM"] = "SUM";
    TimeSeriesReducers["MIN"] = "MIN";
    // @deprecated
    TimeSeriesReducers["MINIMUM"] = "MIN";
    TimeSeriesReducers["MAX"] = "MAX";
    // @deprecated
    TimeSeriesReducers["MAXIMUM"] = "MAX";
    TimeSeriesReducers["RANGE"] = "range";
    TimeSeriesReducers["COUNT"] = "COUNT";
    TimeSeriesReducers["STD_P"] = "STD.P";
    TimeSeriesReducers["STD_S"] = "STD.S";
    TimeSeriesReducers["VAR_P"] = "VAR.P";
    TimeSeriesReducers["VAR_S"] = "VAR.S";
})(TimeSeriesReducers || (exports.TimeSeriesReducers = TimeSeriesReducers = {}));
function transformTimestampArgument(timestamp) {
    if (typeof timestamp === 'string')
        return timestamp;
    return (typeof timestamp === 'number' ?
        timestamp :
        timestamp.getTime()).toString();
}
exports.transformTimestampArgument = transformTimestampArgument;
function pushRetentionArgument(args, retention) {
    if (retention !== undefined) {
        args.push('RETENTION', retention.toString());
    }
    return args;
}
exports.pushRetentionArgument = pushRetentionArgument;
var TimeSeriesEncoding;
(function (TimeSeriesEncoding) {
    TimeSeriesEncoding["COMPRESSED"] = "COMPRESSED";
    TimeSeriesEncoding["UNCOMPRESSED"] = "UNCOMPRESSED";
})(TimeSeriesEncoding || (exports.TimeSeriesEncoding = TimeSeriesEncoding = {}));
function pushEncodingArgument(args, encoding) {
    if (encoding !== undefined) {
        args.push('ENCODING', encoding);
    }
    return args;
}
exports.pushEncodingArgument = pushEncodingArgument;
function pushChunkSizeArgument(args, chunkSize) {
    if (chunkSize !== undefined) {
        args.push('CHUNK_SIZE', chunkSize.toString());
    }
    return args;
}
exports.pushChunkSizeArgument = pushChunkSizeArgument;
function pushDuplicatePolicy(args, duplicatePolicy) {
    if (duplicatePolicy !== undefined) {
        args.push('DUPLICATE_POLICY', duplicatePolicy);
    }
    return args;
}
exports.pushDuplicatePolicy = pushDuplicatePolicy;
function transformLablesReply(reply) {
    const labels = {};
    for (const [key, value] of reply) {
        labels[key] = value;
    }
    return labels;
}
exports.transformLablesReply = transformLablesReply;
function pushLabelsArgument(args, labels) {
    if (labels) {
        args.push('LABELS');
        for (const [label, value] of Object.entries(labels)) {
            args.push(label, value);
        }
    }
    return args;
}
exports.pushLabelsArgument = pushLabelsArgument;
function transformIncrDecrArguments(command, key, value, options) {
    const args = [
        command,
        key,
        value.toString()
    ];
    if (options?.TIMESTAMP !== undefined && options?.TIMESTAMP !== null) {
        args.push('TIMESTAMP', transformTimestampArgument(options.TIMESTAMP));
    }
    pushRetentionArgument(args, options?.RETENTION);
    if (options?.UNCOMPRESSED) {
        args.push('UNCOMPRESSED');
    }
    pushChunkSizeArgument(args, options?.CHUNK_SIZE);
    pushLabelsArgument(args, options?.LABELS);
    return args;
}
exports.transformIncrDecrArguments = transformIncrDecrArguments;
function transformSampleReply(reply) {
    return {
        timestamp: reply[0],
        value: Number(reply[1])
    };
}
exports.transformSampleReply = transformSampleReply;
var TimeSeriesBucketTimestamp;
(function (TimeSeriesBucketTimestamp) {
    TimeSeriesBucketTimestamp["LOW"] = "-";
    TimeSeriesBucketTimestamp["HIGH"] = "+";
    TimeSeriesBucketTimestamp["MID"] = "~";
})(TimeSeriesBucketTimestamp || (exports.TimeSeriesBucketTimestamp = TimeSeriesBucketTimestamp = {}));
function pushRangeArguments(args, fromTimestamp, toTimestamp, options) {
    args.push(transformTimestampArgument(fromTimestamp), transformTimestampArgument(toTimestamp));
    pushLatestArgument(args, options?.LATEST);
    if (options?.FILTER_BY_TS) {
        args.push('FILTER_BY_TS');
        for (const ts of options.FILTER_BY_TS) {
            args.push(transformTimestampArgument(ts));
        }
    }
    if (options?.FILTER_BY_VALUE) {
        args.push('FILTER_BY_VALUE', options.FILTER_BY_VALUE.min.toString(), options.FILTER_BY_VALUE.max.toString());
    }
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    if (options?.ALIGN) {
        args.push('ALIGN', transformTimestampArgument(options.ALIGN));
    }
    if (options?.AGGREGATION) {
        args.push('AGGREGATION', options.AGGREGATION.type, transformTimestampArgument(options.AGGREGATION.timeBucket));
        if (options.AGGREGATION.BUCKETTIMESTAMP) {
            args.push('BUCKETTIMESTAMP', options.AGGREGATION.BUCKETTIMESTAMP);
        }
        if (options.AGGREGATION.EMPTY) {
            args.push('EMPTY');
        }
    }
    return args;
}
exports.pushRangeArguments = pushRangeArguments;
function pushMRangeGroupByArguments(args, groupBy) {
    if (groupBy) {
        args.push('GROUPBY', groupBy.label, 'REDUCE', groupBy.reducer);
    }
    return args;
}
exports.pushMRangeGroupByArguments = pushMRangeGroupByArguments;
function pushFilterArgument(args, filter) {
    args.push('FILTER');
    return (0, generic_transformers_1.pushVerdictArguments)(args, filter);
}
exports.pushFilterArgument = pushFilterArgument;
function pushMRangeArguments(args, fromTimestamp, toTimestamp, filter, options) {
    args = pushRangeArguments(args, fromTimestamp, toTimestamp, options);
    args = pushFilterArgument(args, filter);
    return pushMRangeGroupByArguments(args, options?.GROUPBY);
}
exports.pushMRangeArguments = pushMRangeArguments;
function pushWithLabelsArgument(args, selectedLabels) {
    if (!selectedLabels) {
        args.push('WITHLABELS');
    }
    else {
        args.push('SELECTED_LABELS');
        args = (0, generic_transformers_1.pushVerdictArguments)(args, selectedLabels);
    }
    return args;
}
exports.pushWithLabelsArgument = pushWithLabelsArgument;
function pushMRangeWithLabelsArguments(args, fromTimestamp, toTimestamp, filter, options) {
    args = pushRangeArguments(args, fromTimestamp, toTimestamp, options);
    args = pushWithLabelsArgument(args, options?.SELECTED_LABELS);
    args = pushFilterArgument(args, filter);
    return pushMRangeGroupByArguments(args, options?.GROUPBY);
}
exports.pushMRangeWithLabelsArguments = pushMRangeWithLabelsArguments;
function transformRangeReply(reply) {
    return reply.map(transformSampleReply);
}
exports.transformRangeReply = transformRangeReply;
function transformMRangeReply(reply) {
    const args = [];
    for (const [key, _, sample] of reply) {
        args.push({
            key,
            samples: sample.map(transformSampleReply)
        });
    }
    return args;
}
exports.transformMRangeReply = transformMRangeReply;
function transformMRangeWithLabelsReply(reply) {
    const args = [];
    for (const [key, labels, samples] of reply) {
        args.push({
            key,
            labels: transformLablesReply(labels),
            samples: samples.map(transformSampleReply)
        });
    }
    return args;
}
exports.transformMRangeWithLabelsReply = transformMRangeWithLabelsReply;
function pushLatestArgument(args, latest) {
    if (latest) {
        args.push('LATEST');
    }
    return args;
}
exports.pushLatestArgument = pushLatestArgument;
