"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImplicitLibVariable = void 0;
const ESLintScopeVariable_1 = require("./ESLintScopeVariable");
/**
 * An variable implicitly defined by the TS Lib
 */
class ImplicitLibVariable extends ESLintScopeVariable_1.ESLintScopeVariable {
    constructor(scope, name, { isTypeVariable, isValueVariable, writeable, eslintImplicitGlobalSetting, }) {
        super(name, scope);
        this.isTypeVariable = isTypeVariable ?? false;
        this.isValueVariable = isValueVariable ?? false;
        this.writeable = writeable ?? false;
        this.eslintImplicitGlobalSetting =
            eslintImplicitGlobalSetting ?? 'readonly';
    }
}
exports.ImplicitLibVariable = ImplicitLibVariable;
//# sourceMappingURL=ImplicitLibVariable.js.map