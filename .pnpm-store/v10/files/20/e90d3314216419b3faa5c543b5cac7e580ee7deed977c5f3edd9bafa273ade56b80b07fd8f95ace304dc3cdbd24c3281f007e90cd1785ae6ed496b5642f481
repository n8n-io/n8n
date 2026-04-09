"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helps = void 0;
exports.interpolate = interpolate;
const diagnostics_1 = require("./diagnostics");
/**
 * @internal
 */
exports.Helps = {
    FixMissingModule: '{{label}}: `npm i -D {{module}}` (or `yarn add --dev {{module}}`)',
    MigrateConfigUsingCLI: 'Your Jest configuration is outdated. Use the CLI to help migrating it: ts-jest config:migrate <config-file>.',
    UsingModernNodeResolution: `Using hybrid module kind (Node16/18/Next) is only supported in "isolatedModules: true". Please set "isolatedModules: true" in your tsconfig.json. To disable this message, you can set "diagnostics.ignoreCodes" to include ${diagnostics_1.TsJestDiagnosticCodes.ModernNodeModule} in your ts-jest config. See more at https://kulshekhar.github.io/ts-jest/docs/getting-started/options/diagnostics`,
};
/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function interpolate(msg, vars = {}) {
    // eslint-disable-next-line no-useless-escape
    return msg.replace(/\{\{([^\}]+)\}\}/g, (_, key) => (key in vars ? vars[key] : _));
}
