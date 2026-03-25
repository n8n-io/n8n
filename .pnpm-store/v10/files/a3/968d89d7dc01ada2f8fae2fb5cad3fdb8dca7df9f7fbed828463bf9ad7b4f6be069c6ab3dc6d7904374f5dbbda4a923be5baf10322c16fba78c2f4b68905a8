"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveComponents = exports.resolve = void 0;
const Parse_1 = require("./Parse");
const Serialize_1 = require("./Serialize");
function resolve(baseURI, relativeURI, options) {
    const schemeLessOptions = Object.assign({ scheme: 'null' }, options);
    const resolved = resolveComponents((0, Parse_1.parse)(baseURI), (0, Parse_1.parse)(relativeURI), schemeLessOptions, true);
    return (0, Serialize_1.serialize)(resolved);
}
exports.resolve = resolve;
function resolveComponents(base, relative, options, skipNormalization) {
    const target = {};
    if (!skipNormalization) {
        base = (0, Parse_1.parse)((0, Serialize_1.serialize)(base));
        relative = (0, Parse_1.parse)((0, Serialize_1.serialize)(relative));
    }
    options = options || {};
    if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || '');
        target.query = relative.query;
    }
    else {
        if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
            target.userinfo = relative.userinfo;
            target.host = relative.host;
            target.port = relative.port;
            target.path = removeDotSegments(relative.path || '');
            target.query = relative.query;
        }
        else {
            if (!relative.path) {
                target.path = base.path;
                if (relative.query !== undefined) {
                    target.query = relative.query;
                }
                else {
                    target.query = base.query;
                }
            }
            else {
                if (relative.path.charAt(0) === '/') {
                    target.path = removeDotSegments(relative.path);
                }
                else {
                    if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
                        target.path = '/' + relative.path;
                    }
                    else if (!base.path) {
                        target.path = relative.path;
                    }
                    else {
                        target.path = base.path.slice(0, base.path.lastIndexOf('/') + 1) + relative.path;
                    }
                    target.path = removeDotSegments(target.path);
                }
                target.query = relative.query;
            }
            target.userinfo = base.userinfo;
            target.host = base.host;
            target.port = base.port;
        }
        target.scheme = base.scheme;
    }
    target.fragment = relative.fragment;
    return target;
}
exports.resolveComponents = resolveComponents;
function removeDotSegments(input) {
    const RDS1 = /^\.\.?\//u;
    const RDS2 = /^\/\.(?:\/|$)/u;
    const RDS3 = /^\/\.\.(?:\/|$)/u;
    const RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/u;
    const output = [];
    while (input.length) {
        if (input.match(RDS1)) {
            input = input.replace(RDS1, '');
        }
        else if (input.match(RDS2)) {
            input = input.replace(RDS2, '/');
        }
        else if (input.match(RDS3)) {
            input = input.replace(RDS3, '/');
            output.pop();
        }
        else if (input === '.' || input === '..') {
            input = '';
        }
        else {
            const im = input.match(RDS5);
            if (im) {
                const s = im[0];
                input = input.slice(s.length);
                output.push(s);
            }
            else {
                throw new Error('Unexpected dot segment condition');
            }
        }
    }
    return output.join('');
}
