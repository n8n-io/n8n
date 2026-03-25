type Options = {
    containerId?: string;
    imageName?: string;
};
export declare class Logger {
    private readonly showLevel;
    private readonly logger;
    constructor(namespace: string, showLevel?: boolean);
    enabled(): boolean;
    trace(message: string, options?: Options): void;
    debug(message: string, options?: Options): void;
    info(message: string, options?: Options): void;
    warn(message: string, options?: Options): void;
    error(message: string, options?: Options): void;
    private formatMessage;
    private renderOptions;
}
export declare const log: Logger;
export declare const containerLog: Logger;
export declare const composeLog: Logger;
export declare const buildLog: Logger;
export declare const pullLog: Logger;
export declare const execLog: Logger;
export {};
