"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toStandardizedId = toStandardizedId;
exports.toConfiguredId = toConfiguredId;
function toStandardizedId(commandID, config) {
    return commandID.replaceAll(new RegExp(config.topicSeparator, 'g'), ':');
}
function toConfiguredId(commandID, config) {
    const defaultTopicSeparator = ':';
    return commandID.replaceAll(new RegExp(defaultTopicSeparator, 'g'), config.topicSeparator || defaultTopicSeparator);
}
