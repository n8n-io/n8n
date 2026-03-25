export interface IMessageIdProvider {
    allocate(): number | null;
    getLastAllocated(): number | null;
    register(num: number): boolean;
    deallocate(num: number): void;
    clear(): void;
}
export default class DefaultMessageIdProvider implements IMessageIdProvider {
    private nextId;
    constructor();
    allocate(): number;
    getLastAllocated(): number;
    register(messageId: number): boolean;
    deallocate(messageId: number): void;
    clear(): void;
}
