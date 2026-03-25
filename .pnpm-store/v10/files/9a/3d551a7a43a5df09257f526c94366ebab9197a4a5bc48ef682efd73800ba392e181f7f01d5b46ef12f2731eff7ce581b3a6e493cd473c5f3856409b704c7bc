"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toConfiguredId = exports.toStandardizedId = void 0;
function toStandardizedId(commandID, config) {
    return commandID.replaceAll(new RegExp(config.topicSeparator, 'g'), ':');
}
exports.toStandardizedId = toStandardizedId;
function toConfiguredId(commandID, config) {
    const defaultTopicSeparator = ':';
    return commandID.replaceAll(new RegExp(defaultTopicSeparator, 'g'), config.topicSeparator || defaultTopicSeparator);
}
exports.toConfiguredId = toConfiguredId;
