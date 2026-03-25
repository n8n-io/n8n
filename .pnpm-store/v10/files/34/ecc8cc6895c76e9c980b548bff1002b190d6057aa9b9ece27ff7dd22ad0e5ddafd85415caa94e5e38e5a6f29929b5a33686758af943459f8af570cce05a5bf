"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
const _1 = require(".");
function transformArguments(index, schema, options) {
    const args = ['FT.CREATE', index];
    if (options?.ON) {
        args.push('ON', options.ON);
    }
    (0, generic_transformers_1.pushOptionalVerdictArgument)(args, 'PREFIX', options?.PREFIX);
    if (options?.FILTER) {
        args.push('FILTER', options.FILTER);
    }
    if (options?.LANGUAGE) {
        args.push('LANGUAGE', options.LANGUAGE);
    }
    if (options?.LANGUAGE_FIELD) {
        args.push('LANGUAGE_FIELD', options.LANGUAGE_FIELD);
    }
    if (options?.SCORE) {
        args.push('SCORE', options.SCORE.toString());
    }
    if (options?.SCORE_FIELD) {
        args.push('SCORE_FIELD', options.SCORE_FIELD);
    }
    // if (options?.PAYLOAD_FIELD) {
    //     args.push('PAYLOAD_FIELD', options.PAYLOAD_FIELD);
    // }
    if (options?.MAXTEXTFIELDS) {
        args.push('MAXTEXTFIELDS');
    }
    if (options?.TEMPORARY) {
        args.push('TEMPORARY', options.TEMPORARY.toString());
    }
    if (options?.NOOFFSETS) {
        args.push('NOOFFSETS');
    }
    if (options?.NOHL) {
        args.push('NOHL');
    }
    if (options?.NOFIELDS) {
        args.push('NOFIELDS');
    }
    if (options?.NOFREQS) {
        args.push('NOFREQS');
    }
    if (options?.SKIPINITIALSCAN) {
        args.push('SKIPINITIALSCAN');
    }
    (0, generic_transformers_1.pushOptionalVerdictArgument)(args, 'STOPWORDS', options?.STOPWORDS);
    args.push('SCHEMA');
    (0, _1.pushSchema)(args, schema);
    return args;
}
exports.transformArguments = transformArguments;
