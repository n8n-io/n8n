"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformProfile = exports.pushSearchOptions = exports.pushParamsArgs = exports.pushSchema = exports.VectorAlgorithms = exports.SchemaTextFieldPhonetics = exports.SchemaFieldTypes = exports.pushArgumentsWithLength = exports.pushSortByArguments = exports.pushSortByProperty = exports.RedisSearchLanguages = void 0;
const _LIST = require("./_LIST");
const ALTER = require("./ALTER");
const AGGREGATE_WITHCURSOR = require("./AGGREGATE_WITHCURSOR");
const AGGREGATE = require("./AGGREGATE");
const ALIASADD = require("./ALIASADD");
const ALIASDEL = require("./ALIASDEL");
const ALIASUPDATE = require("./ALIASUPDATE");
const CONFIG_GET = require("./CONFIG_GET");
const CONFIG_SET = require("./CONFIG_SET");
const CREATE = require("./CREATE");
const CURSOR_DEL = require("./CURSOR_DEL");
const CURSOR_READ = require("./CURSOR_READ");
const DICTADD = require("./DICTADD");
const DICTDEL = require("./DICTDEL");
const DICTDUMP = require("./DICTDUMP");
const DROPINDEX = require("./DROPINDEX");
const EXPLAIN = require("./EXPLAIN");
const EXPLAINCLI = require("./EXPLAINCLI");
const INFO = require("./INFO");
const PROFILESEARCH = require("./PROFILE_SEARCH");
const PROFILEAGGREGATE = require("./PROFILE_AGGREGATE");
const SEARCH = require("./SEARCH");
const SEARCH_NOCONTENT = require("./SEARCH_NOCONTENT");
const SPELLCHECK = require("./SPELLCHECK");
const SUGADD = require("./SUGADD");
const SUGDEL = require("./SUGDEL");
const SUGGET_WITHPAYLOADS = require("./SUGGET_WITHPAYLOADS");
const SUGGET_WITHSCORES_WITHPAYLOADS = require("./SUGGET_WITHSCORES_WITHPAYLOADS");
const SUGGET_WITHSCORES = require("./SUGGET_WITHSCORES");
const SUGGET = require("./SUGGET");
const SUGLEN = require("./SUGLEN");
const SYNDUMP = require("./SYNDUMP");
const SYNUPDATE = require("./SYNUPDATE");
const TAGVALS = require("./TAGVALS");
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
exports.default = {
    _LIST,
    _list: _LIST,
    ALTER,
    alter: ALTER,
    AGGREGATE_WITHCURSOR,
    aggregateWithCursor: AGGREGATE_WITHCURSOR,
    AGGREGATE,
    aggregate: AGGREGATE,
    ALIASADD,
    aliasAdd: ALIASADD,
    ALIASDEL,
    aliasDel: ALIASDEL,
    ALIASUPDATE,
    aliasUpdate: ALIASUPDATE,
    CONFIG_GET,
    configGet: CONFIG_GET,
    CONFIG_SET,
    configSet: CONFIG_SET,
    CREATE,
    create: CREATE,
    CURSOR_DEL,
    cursorDel: CURSOR_DEL,
    CURSOR_READ,
    cursorRead: CURSOR_READ,
    DICTADD,
    dictAdd: DICTADD,
    DICTDEL,
    dictDel: DICTDEL,
    DICTDUMP,
    dictDump: DICTDUMP,
    DROPINDEX,
    dropIndex: DROPINDEX,
    EXPLAIN,
    explain: EXPLAIN,
    EXPLAINCLI,
    explainCli: EXPLAINCLI,
    INFO,
    info: INFO,
    PROFILESEARCH,
    profileSearch: PROFILESEARCH,
    PROFILEAGGREGATE,
    profileAggregate: PROFILEAGGREGATE,
    SEARCH,
    search: SEARCH,
    SEARCH_NOCONTENT,
    searchNoContent: SEARCH_NOCONTENT,
    SPELLCHECK,
    spellCheck: SPELLCHECK,
    SUGADD,
    sugAdd: SUGADD,
    SUGDEL,
    sugDel: SUGDEL,
    SUGGET_WITHPAYLOADS,
    sugGetWithPayloads: SUGGET_WITHPAYLOADS,
    SUGGET_WITHSCORES_WITHPAYLOADS,
    sugGetWithScoresWithPayloads: SUGGET_WITHSCORES_WITHPAYLOADS,
    SUGGET_WITHSCORES,
    sugGetWithScores: SUGGET_WITHSCORES,
    SUGGET,
    sugGet: SUGGET,
    SUGLEN,
    sugLen: SUGLEN,
    SYNDUMP,
    synDump: SYNDUMP,
    SYNUPDATE,
    synUpdate: SYNUPDATE,
    TAGVALS,
    tagVals: TAGVALS
};
var RedisSearchLanguages;
(function (RedisSearchLanguages) {
    RedisSearchLanguages["ARABIC"] = "Arabic";
    RedisSearchLanguages["BASQUE"] = "Basque";
    RedisSearchLanguages["CATALANA"] = "Catalan";
    RedisSearchLanguages["DANISH"] = "Danish";
    RedisSearchLanguages["DUTCH"] = "Dutch";
    RedisSearchLanguages["ENGLISH"] = "English";
    RedisSearchLanguages["FINNISH"] = "Finnish";
    RedisSearchLanguages["FRENCH"] = "French";
    RedisSearchLanguages["GERMAN"] = "German";
    RedisSearchLanguages["GREEK"] = "Greek";
    RedisSearchLanguages["HUNGARIAN"] = "Hungarian";
    RedisSearchLanguages["INDONESAIN"] = "Indonesian";
    RedisSearchLanguages["IRISH"] = "Irish";
    RedisSearchLanguages["ITALIAN"] = "Italian";
    RedisSearchLanguages["LITHUANIAN"] = "Lithuanian";
    RedisSearchLanguages["NEPALI"] = "Nepali";
    RedisSearchLanguages["NORWEIGAN"] = "Norwegian";
    RedisSearchLanguages["PORTUGUESE"] = "Portuguese";
    RedisSearchLanguages["ROMANIAN"] = "Romanian";
    RedisSearchLanguages["RUSSIAN"] = "Russian";
    RedisSearchLanguages["SPANISH"] = "Spanish";
    RedisSearchLanguages["SWEDISH"] = "Swedish";
    RedisSearchLanguages["TAMIL"] = "Tamil";
    RedisSearchLanguages["TURKISH"] = "Turkish";
    RedisSearchLanguages["CHINESE"] = "Chinese";
})(RedisSearchLanguages || (exports.RedisSearchLanguages = RedisSearchLanguages = {}));
function pushSortByProperty(args, sortBy) {
    if (typeof sortBy === 'string') {
        args.push(sortBy);
    }
    else {
        args.push(sortBy.BY);
        if (sortBy.DIRECTION) {
            args.push(sortBy.DIRECTION);
        }
    }
}
exports.pushSortByProperty = pushSortByProperty;
function pushSortByArguments(args, name, sortBy) {
    const lengthBefore = args.push(name, '' // will be overwritten
    );
    if (Array.isArray(sortBy)) {
        for (const field of sortBy) {
            pushSortByProperty(args, field);
        }
    }
    else {
        pushSortByProperty(args, sortBy);
    }
    args[lengthBefore - 1] = (args.length - lengthBefore).toString();
    return args;
}
exports.pushSortByArguments = pushSortByArguments;
function pushArgumentsWithLength(args, fn) {
    const lengthIndex = args.push('') - 1;
    fn(args);
    args[lengthIndex] = (args.length - lengthIndex - 1).toString();
    return args;
}
exports.pushArgumentsWithLength = pushArgumentsWithLength;
var SchemaFieldTypes;
(function (SchemaFieldTypes) {
    SchemaFieldTypes["TEXT"] = "TEXT";
    SchemaFieldTypes["NUMERIC"] = "NUMERIC";
    SchemaFieldTypes["GEO"] = "GEO";
    SchemaFieldTypes["TAG"] = "TAG";
    SchemaFieldTypes["VECTOR"] = "VECTOR";
})(SchemaFieldTypes || (exports.SchemaFieldTypes = SchemaFieldTypes = {}));
var SchemaTextFieldPhonetics;
(function (SchemaTextFieldPhonetics) {
    SchemaTextFieldPhonetics["DM_EN"] = "dm:en";
    SchemaTextFieldPhonetics["DM_FR"] = "dm:fr";
    SchemaTextFieldPhonetics["FM_PT"] = "dm:pt";
    SchemaTextFieldPhonetics["DM_ES"] = "dm:es";
})(SchemaTextFieldPhonetics || (exports.SchemaTextFieldPhonetics = SchemaTextFieldPhonetics = {}));
var VectorAlgorithms;
(function (VectorAlgorithms) {
    VectorAlgorithms["FLAT"] = "FLAT";
    VectorAlgorithms["HNSW"] = "HNSW";
})(VectorAlgorithms || (exports.VectorAlgorithms = VectorAlgorithms = {}));
function pushSchema(args, schema) {
    for (const [field, fieldOptions] of Object.entries(schema)) {
        args.push(field);
        if (typeof fieldOptions === 'string') {
            args.push(fieldOptions);
            continue;
        }
        if (fieldOptions.AS) {
            args.push('AS', fieldOptions.AS);
        }
        args.push(fieldOptions.type);
        switch (fieldOptions.type) {
            case SchemaFieldTypes.TEXT:
                if (fieldOptions.NOSTEM) {
                    args.push('NOSTEM');
                }
                if (fieldOptions.WEIGHT) {
                    args.push('WEIGHT', fieldOptions.WEIGHT.toString());
                }
                if (fieldOptions.PHONETIC) {
                    args.push('PHONETIC', fieldOptions.PHONETIC);
                }
                if (fieldOptions.WITHSUFFIXTRIE) {
                    args.push('WITHSUFFIXTRIE');
                }
                break;
            // case SchemaFieldTypes.NUMERIC:
            // case SchemaFieldTypes.GEO:
            //     break;
            case SchemaFieldTypes.TAG:
                if (fieldOptions.SEPARATOR) {
                    args.push('SEPARATOR', fieldOptions.SEPARATOR);
                }
                if (fieldOptions.CASESENSITIVE) {
                    args.push('CASESENSITIVE');
                }
                if (fieldOptions.WITHSUFFIXTRIE) {
                    args.push('WITHSUFFIXTRIE');
                }
                break;
            case SchemaFieldTypes.VECTOR:
                args.push(fieldOptions.ALGORITHM);
                pushArgumentsWithLength(args, () => {
                    args.push('TYPE', fieldOptions.TYPE, 'DIM', fieldOptions.DIM.toString(), 'DISTANCE_METRIC', fieldOptions.DISTANCE_METRIC);
                    if (fieldOptions.INITIAL_CAP) {
                        args.push('INITIAL_CAP', fieldOptions.INITIAL_CAP.toString());
                    }
                    switch (fieldOptions.ALGORITHM) {
                        case VectorAlgorithms.FLAT:
                            if (fieldOptions.BLOCK_SIZE) {
                                args.push('BLOCK_SIZE', fieldOptions.BLOCK_SIZE.toString());
                            }
                            break;
                        case VectorAlgorithms.HNSW:
                            if (fieldOptions.M) {
                                args.push('M', fieldOptions.M.toString());
                            }
                            if (fieldOptions.EF_CONSTRUCTION) {
                                args.push('EF_CONSTRUCTION', fieldOptions.EF_CONSTRUCTION.toString());
                            }
                            if (fieldOptions.EF_RUNTIME) {
                                args.push('EF_RUNTIME', fieldOptions.EF_RUNTIME.toString());
                            }
                            break;
                    }
                });
                continue; // vector fields do not contain SORTABLE and NOINDEX options
        }
        if (fieldOptions.SORTABLE) {
            args.push('SORTABLE');
            if (fieldOptions.SORTABLE === 'UNF') {
                args.push('UNF');
            }
        }
        if (fieldOptions.NOINDEX) {
            args.push('NOINDEX');
        }
    }
}
exports.pushSchema = pushSchema;
function pushParamsArgs(args, params) {
    if (params) {
        const enrties = Object.entries(params);
        args.push('PARAMS', (enrties.length * 2).toString());
        for (const [key, value] of enrties) {
            args.push(key, typeof value === 'number' ? value.toString() : value);
        }
    }
    return args;
}
exports.pushParamsArgs = pushParamsArgs;
function pushSearchOptions(args, options) {
    if (options?.VERBATIM) {
        args.push('VERBATIM');
    }
    if (options?.NOSTOPWORDS) {
        args.push('NOSTOPWORDS');
    }
    // if (options?.WITHSCORES) {
    //     args.push('WITHSCORES');
    // }
    // if (options?.WITHPAYLOADS) {
    //     args.push('WITHPAYLOADS');
    // }
    (0, generic_transformers_1.pushOptionalVerdictArgument)(args, 'INKEYS', options?.INKEYS);
    (0, generic_transformers_1.pushOptionalVerdictArgument)(args, 'INFIELDS', options?.INFIELDS);
    (0, generic_transformers_1.pushOptionalVerdictArgument)(args, 'RETURN', options?.RETURN);
    if (options?.SUMMARIZE) {
        args.push('SUMMARIZE');
        if (typeof options.SUMMARIZE === 'object') {
            if (options.SUMMARIZE.FIELDS) {
                args.push('FIELDS');
                (0, generic_transformers_1.pushVerdictArgument)(args, options.SUMMARIZE.FIELDS);
            }
            if (options.SUMMARIZE.FRAGS) {
                args.push('FRAGS', options.SUMMARIZE.FRAGS.toString());
            }
            if (options.SUMMARIZE.LEN) {
                args.push('LEN', options.SUMMARIZE.LEN.toString());
            }
            if (options.SUMMARIZE.SEPARATOR) {
                args.push('SEPARATOR', options.SUMMARIZE.SEPARATOR);
            }
        }
    }
    if (options?.HIGHLIGHT) {
        args.push('HIGHLIGHT');
        if (typeof options.HIGHLIGHT === 'object') {
            if (options.HIGHLIGHT.FIELDS) {
                args.push('FIELDS');
                (0, generic_transformers_1.pushVerdictArgument)(args, options.HIGHLIGHT.FIELDS);
            }
            if (options.HIGHLIGHT.TAGS) {
                args.push('TAGS', options.HIGHLIGHT.TAGS.open, options.HIGHLIGHT.TAGS.close);
            }
        }
    }
    if (options?.SLOP) {
        args.push('SLOP', options.SLOP.toString());
    }
    if (options?.INORDER) {
        args.push('INORDER');
    }
    if (options?.LANGUAGE) {
        args.push('LANGUAGE', options.LANGUAGE);
    }
    if (options?.EXPANDER) {
        args.push('EXPANDER', options.EXPANDER);
    }
    if (options?.SCORER) {
        args.push('SCORER', options.SCORER);
    }
    // if (options?.EXPLAINSCORE) {
    //     args.push('EXPLAINSCORE');
    // }
    // if (options?.PAYLOAD) {
    //     args.push('PAYLOAD', options.PAYLOAD);
    // }
    if (options?.SORTBY) {
        args.push('SORTBY');
        pushSortByProperty(args, options.SORTBY);
    }
    // if (options?.MSORTBY) {
    //     pushSortByArguments(args, 'MSORTBY', options.MSORTBY);
    // }
    if (options?.LIMIT) {
        args.push('LIMIT', options.LIMIT.from.toString(), options.LIMIT.size.toString());
    }
    if (options?.PARAMS) {
        pushParamsArgs(args, options.PARAMS);
    }
    if (options?.DIALECT) {
        args.push('DIALECT', options.DIALECT.toString());
    }
    if (options?.RETURN?.length === 0) {
        args.preserve = true;
    }
    if (options?.TIMEOUT !== undefined) {
        args.push('TIMEOUT', options.TIMEOUT.toString());
    }
    return args;
}
exports.pushSearchOptions = pushSearchOptions;
function transformProfile(reply) {
    return {
        totalProfileTime: reply[0][1],
        parsingTime: reply[1][1],
        pipelineCreationTime: reply[2][1],
        iteratorsProfile: transformIterators(reply[3][1])
    };
}
exports.transformProfile = transformProfile;
function transformIterators(IteratorsProfile) {
    var res = {};
    for (let i = 0; i < IteratorsProfile.length; i += 2) {
        const value = IteratorsProfile[i + 1];
        switch (IteratorsProfile[i]) {
            case 'Type':
                res.type = value;
                break;
            case 'Counter':
                res.counter = value;
                break;
            case 'Time':
                res.time = value;
                break;
            case 'Query type':
                res.queryType = value;
                break;
            case 'Child iterators':
                res.childIterators = value.map(transformChildIterators);
                break;
        }
    }
    return res;
}
function transformChildIterators(IteratorsProfile) {
    var res = {};
    for (let i = 1; i < IteratorsProfile.length; i += 2) {
        const value = IteratorsProfile[i + 1];
        switch (IteratorsProfile[i]) {
            case 'Type':
                res.type = value;
                break;
            case 'Counter':
                res.counter = value;
                break;
            case 'Time':
                res.time = value;
                break;
            case 'Size':
                res.size = value;
                break;
            case 'Term':
                res.term = value;
                break;
            case 'Child iterators':
                res.childIterators = value.map(transformChildIterators);
                break;
        }
    }
    return res;
}
