"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathDeclarationMustExist = void 0;
const PathDeclarationMustExist = () => {
    return {
        PathItem(_path, { report, key }) {
            if (key.indexOf('{}') !== -1) {
                report({
                    message: 'Path parameter declarations must be non-empty. `{}` is invalid.',
                    location: { reportOnKey: true },
                });
            }
        },
    };
};
exports.PathDeclarationMustExist = PathDeclarationMustExist;
