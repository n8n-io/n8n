"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyMessages = stringifyMessages;
exports.stringifyGenerationConfig = stringifyGenerationConfig;
function stringifyMessages(messages, opts) {
    let messagesStr = JSON.stringify(messages, null, "\t");
    if (opts?.indent) {
        messagesStr = messagesStr.replaceAll("\n", `\n${opts.indent}`);
    }
    if (!opts?.attributeKeyQuotes) {
        messagesStr = messagesStr.replace(/"([^"]+)":/g, "$1:");
    }
    if (opts?.customContentEscaper) {
        messagesStr = opts.customContentEscaper(messagesStr);
    }
    return messagesStr;
}
function stringifyGenerationConfig(config, opts) {
    const quote = opts.attributeKeyQuotes ? `"` : "";
    return Object.entries(config)
        .map(([key, val]) => `${quote}${key}${quote}${opts.attributeValueConnector}${val},`)
        .join(`${opts.indent}`);
}
