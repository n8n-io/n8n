import { IMessageIdProvider } from './default-message-id-provider';
export default class UniqueMessageIdProvider implements IMessageIdProvider {
    private numberAllocator;
    private lastId;
    constructor();
    allocate(): number;
    getLastAllocated(): number;
    register(messageId: number): boolean;
    deallocate(messageId: number): void;
    clear(): void;
}
