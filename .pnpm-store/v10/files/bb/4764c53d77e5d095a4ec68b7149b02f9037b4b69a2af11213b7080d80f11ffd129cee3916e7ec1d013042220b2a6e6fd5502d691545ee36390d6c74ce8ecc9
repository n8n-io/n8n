"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = void 0;
function transformArguments(...[parameterOrConfig, value]) {
    const args = ['CONFIG', 'SET'];
    if (typeof parameterOrConfig === 'string') {
        args.push(parameterOrConfig, value);
    }
    else {
        for (const [key, value] of Object.entries(parameterOrConfig)) {
            args.push(key, value);
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
