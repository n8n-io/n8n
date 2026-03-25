export default class TopicAliasSend {
    private aliasToTopic;
    private topicToAlias;
    private max;
    private numberAllocator;
    length: number;
    constructor(max: number);
    put(topic: string, alias: number): boolean;
    getTopicByAlias(alias: number): string;
    getAliasByTopic(topic: string): number | undefined;
    clear(): void;
    getLruAlias(): number;
}
