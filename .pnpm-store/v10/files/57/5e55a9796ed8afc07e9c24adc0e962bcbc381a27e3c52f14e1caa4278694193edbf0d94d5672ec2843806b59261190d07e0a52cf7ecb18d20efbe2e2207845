"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGenerate = handleGenerate;
const colorette_1 = require("colorette");
const fs_1 = require("fs");
const yaml_1 = require("../utils/yaml");
const arazzo_description_generator_1 = require("../modules/arazzo-description-generator");
const logger_1 = require("../utils/logger/logger");
const exit_with_error_1 = require("../utils/exit-with-error");
const logger = logger_1.DefaultLogger.getInstance();
async function handleGenerate({ argv }) {
    try {
        logger.log((0, colorette_1.gray)('\n  Generating Arazzo description... \n'));
        const generatedConfig = await (0, arazzo_description_generator_1.generateArazzoDescription)(argv);
        const content = (0, yaml_1.stringifyYaml)(generatedConfig);
        const fileName = argv['output-file'] || 'auto-generated.arazzo.yaml';
        (0, fs_1.writeFileSync)(fileName, content);
        logger.log('\n' + (0, colorette_1.blue)(`Arazzo description ${(0, colorette_1.yellow)(fileName)} successfully generated.`) + '\n');
    }
    catch (_err) {
        (0, exit_with_error_1.exitWithError)('\n' +
            '❌  Failed to generate Arazzo description. Check the output file path you provided, or the OpenAPI file content.');
    }
}
//# sourceMappingURL=generate.js.map