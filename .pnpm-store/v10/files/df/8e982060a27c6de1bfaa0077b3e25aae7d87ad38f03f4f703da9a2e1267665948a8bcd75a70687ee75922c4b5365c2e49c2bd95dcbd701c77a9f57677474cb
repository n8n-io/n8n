"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeParseBetaMessage = maybeParseBetaMessage;
exports.parseBetaMessage = parseBetaMessage;
const error_1 = require("../core/error.js");
function maybeParseBetaMessage(message, params, opts) {
    if (!params || !('parse' in (params.output_format ?? {}))) {
        return {
            ...message,
            content: message.content.map((block) => {
                if (block.type === 'text') {
                    const parsedBlock = Object.defineProperty({ ...block }, 'parsed_output', {
                        value: null,
                        enumerable: false,
                    });
                    return Object.defineProperty(parsedBlock, 'parsed', {
                        get() {
                            opts.logger.warn('The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.');
                            return null;
                        },
                        enumerable: false,
                    });
                }
                return block;
            }),
            parsed_output: null,
        };
    }
    return parseBetaMessage(message, params, opts);
}
function parseBetaMessage(message, params, opts) {
    let firstParsedOutput = null;
    const content = message.content.map((block) => {
        if (block.type === 'text') {
            const parsedOutput = parseBetaOutputFormat(params, block.text);
            if (firstParsedOutput === null) {
                firstParsedOutput = parsedOutput;
            }
            const parsedBlock = Object.defineProperty({ ...block }, 'parsed_output', {
                value: parsedOutput,
                enumerable: false,
            });
            return Object.defineProperty(parsedBlock, 'parsed', {
                get() {
                    opts.logger.warn('The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.');
                    return parsedOutput;
                },
                enumerable: false,
            });
        }
        return block;
    });
    return {
        ...message,
        content,
        parsed_output: firstParsedOutput,
    };
}
function parseBetaOutputFormat(params, content) {
    if (params.output_format?.type !== 'json_schema') {
        return null;
    }
    try {
        if ('parse' in params.output_format) {
            return params.output_format.parse(content);
        }
        return JSON.parse(content);
    }
    catch (error) {
        throw new error_1.AnthropicError(`Failed to parse structured output: ${error}`);
    }
}
//# sourceMappingURL=beta-parser.js.map