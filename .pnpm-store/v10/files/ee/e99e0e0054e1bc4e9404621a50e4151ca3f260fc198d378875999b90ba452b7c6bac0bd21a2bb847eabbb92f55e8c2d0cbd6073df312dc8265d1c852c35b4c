"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var matchRecursiveRegexp_1 = __importDefault(require("./matchRecursiveRegexp"));
function getParamInfo(content, hasName) {
    content = content || '';
    var typeSlice = (0, matchRecursiveRegexp_1.default)(content, '{', '}')[0] || '';
    var param = hasName || typeSlice.length ? { type: getTypeObjectFromTypeString(typeSlice) } : {};
    content = content.replace("{".concat(typeSlice, "}"), '');
    if (hasName) {
        var nameSliceArray = /^ *(\w[\w-]+)?/.exec(content);
        if (nameSliceArray) {
            param.name = nameSliceArray[1];
        }
        if (param.name) {
            content = content.replace(new RegExp("^ *".concat(param.name)), '');
        }
    }
    content = content.replace(/^ *-/, '');
    if (content.length) {
        param.description = content.trim();
    }
    return param;
}
function getTypeObjectFromTypeString(typeSlice) {
    if (typeSlice === '' || typeSlice === '*') {
        return { name: 'mixed' };
    }
    else if (/\w+\|\w+/.test(typeSlice)) {
        return {
            name: 'union',
            elements: typeSlice.split('|').map(function (type) { return getTypeObjectFromTypeString(type); })
        };
    }
    else {
        return {
            name: typeSlice
        };
    }
}
/**
 * This is used to ignore the name tag if it does not make sense
 */
var UNNAMED_TAG_TITLES = ['returns', 'throws', 'type'];
/**
 * For those arguments we will try and parse type of the content
 */
var TYPED_TAG_TITLES = [
    'param',
    'arg',
    'argument',
    'property',
    'type',
    'returns',
    'throws',
    'prop',
    'binding',
    'type'
];
/**
 * These tags don't have content and we push them as 'access'
 */
var ACCESS_TAG_TITLES = ['private', 'public'];
/**
 * If one of these tags is placed above content
 * the content is still taken as the description
 * they are usually placed at the top of the docblock
 */
var PREFIX_TAG_TITLES = ['slot', 'ignore'];
/**
 * Given a string, this functions returns an object with
 * two keys:
 * - `tags` an array of tags {title: tagname, content: }
 * - `description` whatever is left once the tags are removed
 */
function getDocblockTags(str) {
    var DOCLET_PATTERN = /^(?:\s+)?@(\w+) ?(.+)?/;
    var tags = [];
    var lines = str.split('\n').reverse();
    var accNonTagLines = '';
    lines.forEach(function (line) {
        var _a = __read(DOCLET_PATTERN.exec(line) || [], 3), title = _a[1], tagContents = _a[2];
        if (!title) {
            accNonTagLines = line + '\n' + accNonTagLines;
            return;
        }
        if (TYPED_TAG_TITLES.includes(title)) {
            tags.push(__assign({ title: title }, getParamInfo(tagContents, !UNNAMED_TAG_TITLES.includes(title))));
        }
        else if (ACCESS_TAG_TITLES.indexOf(title) > -1) {
            tags.push({ title: 'access', content: title });
            return;
        }
        else if (PREFIX_TAG_TITLES.indexOf(title) > -1) {
            tags.push({ title: title, content: tagContents !== null && tagContents !== void 0 ? tagContents : true });
            return;
        }
        else {
            var content = tagContents
                ? (tagContents + '\n' + accNonTagLines).trim()
                : accNonTagLines
                    ? accNonTagLines.trim()
                    : true;
            tags.push({ title: title, content: content });
        }
        accNonTagLines = '';
    });
    var description = accNonTagLines.trim().length ? accNonTagLines.trim() : undefined;
    return { description: description, tags: tags.reverse() };
}
exports.default = getDocblockTags;
