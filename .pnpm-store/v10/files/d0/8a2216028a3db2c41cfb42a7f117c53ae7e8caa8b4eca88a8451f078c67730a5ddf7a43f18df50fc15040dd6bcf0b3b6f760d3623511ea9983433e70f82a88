"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(dest, src) {
    const args = [
        'CMS.MERGE',
        dest,
        src.length.toString()
    ];
    if (isStringSketches(src)) {
        args.push(...src);
    }
    else {
        for (const sketch of src) {
            args.push(sketch.name);
        }
        args.push('WEIGHTS');
        for (const sketch of src) {
            args.push(sketch.weight.toString());
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
function isStringSketches(src) {
    return typeof src[0] === 'string';
}
