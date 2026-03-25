"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandWrapper = commandWrapper;
const openapi_core_1 = require("@redocly/openapi-core");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const update_version_notifier_1 = require("./utils/update-version-notifier");
const miscellaneous_1 = require("./utils/miscellaneous");
const lint_1 = require("./commands/lint");
function commandWrapper(commandHandler) {
    return async (argv) => {
        let code = 2;
        let hasConfig;
        let telemetry;
        let specVersion;
        let specKeyword;
        let specFullVersion;
        const collectSpecData = (document) => {
            specVersion = (0, openapi_core_1.detectSpec)(document);
            if (!(0, utils_1.isPlainObject)(document))
                return;
            specKeyword = document?.openapi
                ? 'openapi'
                : document?.swagger
                    ? 'swagger'
                    : document?.asyncapi
                        ? 'asyncapi'
                        : document?.arazzo
                            ? 'arazzo'
                            : undefined;
            if (specKeyword) {
                specFullVersion = document[specKeyword];
            }
        };
        try {
            if (argv.config && !(0, openapi_core_1.doesYamlFileExist)(argv.config)) {
                (0, miscellaneous_1.exitWithError)('Please provide a valid path to the configuration file.');
            }
            const config = (await (0, miscellaneous_1.loadConfigAndHandleErrors)({
                configPath: argv.config,
                customExtends: argv.extends,
                region: argv.region,
                files: argv.files,
                processRawConfig: (0, lint_1.lintConfigCallback)(argv, update_version_notifier_1.version),
            }));
            telemetry = config.telemetry;
            hasConfig = !config.styleguide.recommendedFallback;
            code = 1;
            if (typeof commandHandler === 'function') {
                await commandHandler({ argv, config, version: update_version_notifier_1.version, collectSpecData });
            }
            code = 0;
        }
        catch (err) {
            // Do nothing
        }
        finally {
            if (process.env.REDOCLY_TELEMETRY !== 'off' && telemetry !== 'off') {
                await (0, miscellaneous_1.sendTelemetry)(argv, code, hasConfig, specVersion, specKeyword, specFullVersion);
            }
            process.once('beforeExit', () => {
                process.exit(code);
            });
        }
    };
}
