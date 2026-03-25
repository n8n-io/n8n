"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDifferent = void 0;
const recast_1 = require("recast");
const Parser_1 = require("./Parser");
const isWrapped = (node) => {
    var _a;
    return ((_a = node.program.body[1]) === null || _a === void 0 ? void 0 : _a.type) === 'TryStatement';
};
const getWrapped = (node) => {
    var _a;
    return (_a = node.program.body[1]) === null || _a === void 0 ? void 0 : _a.block.body[0];
};
const isMultiPartExpression = (node) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return (((_a = node.program.body[1]) === null || _a === void 0 ? void 0 : _a.type) === 'ReturnStatement' &&
        ((_b = node.program.body[1].argument) === null || _b === void 0 ? void 0 : _b.type) === 'CallExpression' &&
        ((_d = (_c = node.program.body[1].argument) === null || _c === void 0 ? void 0 : _c.arguments[0]) === null || _d === void 0 ? void 0 : _d.type) === 'Literal' &&
        ((_f = (_e = node.program.body[1].argument) === null || _e === void 0 ? void 0 : _e.arguments[0]) === null || _f === void 0 ? void 0 : _f.value) === '' &&
        ((_g = node.program.body[1].argument) === null || _g === void 0 ? void 0 : _g.callee.type) === 'MemberExpression' &&
        ((_h = node.program.body[1].argument) === null || _h === void 0 ? void 0 : _h.callee.object.type) === 'ArrayExpression' &&
        ((_j = node.program.body[1].argument) === null || _j === void 0 ? void 0 : _j.callee.property.type) === 'Identifier' &&
        ((_k = node.program.body[1].argument) === null || _k === void 0 ? void 0 : _k.callee.property.name) === 'join');
};
const getMultiPartExpression = (node) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!(((_a = node.program.body[1]) === null || _a === void 0 ? void 0 : _a.type) === 'ReturnStatement' &&
        ((_b = node.program.body[1].argument) === null || _b === void 0 ? void 0 : _b.type) === 'CallExpression' &&
        ((_d = (_c = node.program.body[1].argument) === null || _c === void 0 ? void 0 : _c.arguments[0]) === null || _d === void 0 ? void 0 : _d.type) === 'Literal' &&
        ((_f = (_e = node.program.body[1].argument) === null || _e === void 0 ? void 0 : _e.arguments[0]) === null || _f === void 0 ? void 0 : _f.value) === '' &&
        ((_g = node.program.body[1].argument) === null || _g === void 0 ? void 0 : _g.callee.type) === 'MemberExpression' &&
        ((_h = node.program.body[1].argument) === null || _h === void 0 ? void 0 : _h.callee.object.type) === 'ArrayExpression')) {
        return [];
    }
    return node.program.body[1].argument.callee.object.elements
        .map((e) => {
        if ((e === null || e === void 0 ? void 0 : e.type) !== 'CallExpression' ||
            e.callee.type !== 'MemberExpression' ||
            e.callee.object.type !== 'FunctionExpression') {
            return null;
        }
        const maybeExpr = e.callee.object.body.body[0];
        if (maybeExpr.type !== 'TryStatement') {
            return maybeExpr;
        }
        return maybeExpr.block.body[0];
    })
        .filter((e) => e !== null);
};
const isDifferent = (tmpl, tourn) => {
    const tmplParsed = (0, recast_1.parse)(tmpl, {
        parser: { parse: Parser_1.parseWithEsprimaNext },
    });
    const tournParsed = (0, recast_1.parse)(tourn, {
        parser: { parse: Parser_1.parseWithEsprimaNext },
    });
    const problemPaths = [];
    let same = recast_1.types.astNodesAreEquivalent(tmplParsed, tournParsed, problemPaths);
    if (!same) {
        if (isWrapped(tournParsed) && !isWrapped(tmplParsed)) {
            const tournWrapped = getWrapped(tournParsed);
            same = recast_1.types.astNodesAreEquivalent(tmplParsed.program.body[1], tournWrapped);
        }
        else if (isMultiPartExpression(tournParsed) && isMultiPartExpression(tmplParsed)) {
            const tournExprs = getMultiPartExpression(tournParsed);
            const tmplExprs = getMultiPartExpression(tmplParsed);
            if (tournExprs.length === tmplExprs.length) {
                for (let i = 0; i < tournExprs.length; i++) {
                    same = recast_1.types.astNodesAreEquivalent(tmplExprs[i], tournExprs[i], problemPaths);
                    if (!same) {
                        break;
                    }
                }
            }
        }
    }
    return !same;
};
exports.isDifferent = isDifferent;
//# sourceMappingURL=Differ.js.map