"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TopicAliasRecv {
    constructor(max) {
        this.aliasToTopic = {};
        this.max = max;
    }
    put(topic, alias) {
        if (alias === 0 || alias > this.max) {
            return false;
        }
        this.aliasToTopic[alias] = topic;
        this.length = Object.keys(this.aliasToTopic).length;
        return true;
    }
    getTopicByAlias(alias) {
        return this.aliasToTopic[alias];
    }
    clear() {
        this.aliasToTopic = {};
    }
}
exports.default = TopicAliasRecv;
//# sourceMappingURL=topic-alias-recv.js.map