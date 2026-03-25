"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTopics = exports.validateTopic = void 0;
function validateTopic(topic) {
    const parts = topic.split('/');
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '+') {
            continue;
        }
        if (parts[i] === '#') {
            return i === parts.length - 1;
        }
        if (parts[i].indexOf('+') !== -1 || parts[i].indexOf('#') !== -1) {
            return false;
        }
    }
    return true;
}
exports.validateTopic = validateTopic;
function validateTopics(topics) {
    if (topics.length === 0) {
        return 'empty_topic_list';
    }
    for (let i = 0; i < topics.length; i++) {
        if (!validateTopic(topics[i])) {
            return topics[i];
        }
    }
    return null;
}
exports.validateTopics = validateTopics;
//# sourceMappingURL=validations.js.map