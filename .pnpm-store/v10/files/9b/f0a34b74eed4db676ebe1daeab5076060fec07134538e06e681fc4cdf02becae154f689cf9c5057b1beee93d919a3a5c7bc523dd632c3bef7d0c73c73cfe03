"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lru_cache_1 = require("lru-cache");
const number_allocator_1 = require("number-allocator");
class TopicAliasSend {
    constructor(max) {
        if (max > 0) {
            this.aliasToTopic = new lru_cache_1.LRUCache({ max });
            this.topicToAlias = {};
            this.numberAllocator = new number_allocator_1.NumberAllocator(1, max);
            this.max = max;
            this.length = 0;
        }
    }
    put(topic, alias) {
        if (alias === 0 || alias > this.max) {
            return false;
        }
        const entry = this.aliasToTopic.get(alias);
        if (entry) {
            delete this.topicToAlias[entry];
        }
        this.aliasToTopic.set(alias, topic);
        this.topicToAlias[topic] = alias;
        this.numberAllocator.use(alias);
        this.length = this.aliasToTopic.size;
        return true;
    }
    getTopicByAlias(alias) {
        return this.aliasToTopic.get(alias);
    }
    getAliasByTopic(topic) {
        const alias = this.topicToAlias[topic];
        if (typeof alias !== 'undefined') {
            this.aliasToTopic.get(alias);
        }
        return alias;
    }
    clear() {
        this.aliasToTopic.clear();
        this.topicToAlias = {};
        this.numberAllocator.clear();
        this.length = 0;
    }
    getLruAlias() {
        const alias = this.numberAllocator.firstVacant();
        if (alias)
            return alias;
        return [...this.aliasToTopic.keys()][this.aliasToTopic.size - 1];
    }
}
exports.default = TopicAliasSend;
//# sourceMappingURL=topic-alias-send.js.map