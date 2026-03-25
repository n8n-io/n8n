/**
 * A file system cache to skip inference when repeating steps
 * It also acts as the source of truth for identifying previously seen actions and observations
 */
declare class Cache {
    disabled: boolean;
    constructor({ disabled }?: {
        disabled?: boolean;
    });
    readObservations(): any;
    readActions(): any;
    writeObservations({ key, value, }: {
        key: string;
        value: {
            id: string;
            result: string;
        };
    }): void;
    writeActions({ key, value, }: {
        key: string;
        value: {
            id: string;
            result: string;
        };
    }): void;
    evictCache(): void;
    private initCache;
}
export default Cache;
