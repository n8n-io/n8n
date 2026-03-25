"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoIdenticalPaths = void 0;
const NoIdenticalPaths = () => {
    return {
        Paths(pathMap, { report, location }) {
            const Paths = new Map();
            for (const pathName of Object.keys(pathMap)) {
                const id = pathName.replace(/{.+?}/g, '{VARIABLE}');
                const existingSamePath = Paths.get(id);
                if (existingSamePath) {
                    report({
                        message: `The path already exists which differs only by path parameter name(s): \`${existingSamePath}\` and \`${pathName}\`.`,
                        location: location.child([pathName]).key(),
                    });
                }
                else {
                    Paths.set(id, pathName);
                }
            }
        },
    };
};
exports.NoIdenticalPaths = NoIdenticalPaths;
