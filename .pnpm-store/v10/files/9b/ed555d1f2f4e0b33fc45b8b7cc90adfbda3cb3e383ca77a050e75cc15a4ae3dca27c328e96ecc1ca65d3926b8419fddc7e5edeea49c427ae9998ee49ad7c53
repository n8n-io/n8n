"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoServerVariablesEmptyEnum = void 0;
var enumError;
(function (enumError) {
    enumError["empty"] = "empty";
    enumError["invalidDefaultValue"] = "invalidDefaultValue";
})(enumError || (enumError = {}));
const NoServerVariablesEmptyEnum = () => {
    return {
        Root(root, { report, location }) {
            if (!root.servers || root.servers.length === 0)
                return;
            const invalidVariables = [];
            if (Array.isArray(root.servers)) {
                for (const server of root.servers) {
                    const enumErrors = checkEnumVariables(server);
                    if (!enumErrors)
                        continue;
                    invalidVariables.push(...enumErrors);
                }
            }
            else {
                const enumErrors = checkEnumVariables(root.servers);
                if (!enumErrors)
                    return;
                invalidVariables.push(...enumErrors);
            }
            for (const invalidVariable of invalidVariables) {
                if (invalidVariable === enumError.empty) {
                    report({
                        message: 'Server variable with `enum` must be a non-empty array.',
                        location: location.child(['servers']).key(),
                    });
                }
                if (invalidVariable === enumError.invalidDefaultValue) {
                    report({
                        message: 'Server variable define `enum` and `default`. `enum` must include default value',
                        location: location.child(['servers']).key(),
                    });
                }
            }
        },
    };
};
exports.NoServerVariablesEmptyEnum = NoServerVariablesEmptyEnum;
function checkEnumVariables(server) {
    if (server.variables && Object.keys(server.variables).length === 0)
        return;
    const errors = [];
    for (const variable in server.variables) {
        const serverVariable = server.variables[variable];
        if (!serverVariable.enum)
            continue;
        if (Array.isArray(serverVariable.enum) && serverVariable.enum?.length === 0)
            errors.push(enumError.empty);
        if (!serverVariable.default)
            continue;
        const defaultValue = server.variables[variable].default;
        if (serverVariable.enum && !serverVariable.enum.includes(defaultValue))
            errors.push(enumError.invalidDefaultValue);
    }
    if (errors.length)
        return errors;
    return;
}
