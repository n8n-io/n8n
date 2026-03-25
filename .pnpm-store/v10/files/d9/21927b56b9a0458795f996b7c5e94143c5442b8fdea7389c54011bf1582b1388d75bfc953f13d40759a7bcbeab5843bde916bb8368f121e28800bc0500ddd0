"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments(index, query, options) {
    const args = ['FT.SPELLCHECK', index, query];
    if (options?.DISTANCE) {
        args.push('DISTANCE', options.DISTANCE.toString());
    }
    if (options?.TERMS) {
        if (Array.isArray(options.TERMS)) {
            for (const term of options.TERMS) {
                pushTerms(args, term);
            }
        }
        else {
            pushTerms(args, options.TERMS);
        }
    }
    if (options?.DIALECT) {
        args.push('DIALECT', options.DIALECT.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
function pushTerms(args, { mode, dictionary }) {
    args.push('TERMS', mode, dictionary);
}
function transformReply(rawReply) {
    return rawReply.map(([, term, suggestions]) => ({
        term,
        suggestions: suggestions.map(([score, suggestion]) => ({
            score: Number(score),
            suggestion
        }))
    }));
}
exports.transformReply = transformReply;
