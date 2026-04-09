declare const logger: {
    readonly trace: (message: any, ...rest: any[]) => void;
    readonly debug: (message: any, ...rest: any[]) => void;
    readonly info: (message: any, ...rest: any[]) => void;
    readonly warn: (message: any, ...rest: any[]) => void;
    readonly error: (message: any, ...rest: any[]) => void;
    readonly log: (message: any, ...rest: any[]) => void;
};
declare const once: {
    (type: keyof typeof logger): (message: any, ...rest: any[]) => void;
    clear(): void;
    trace: (message: any, ...rest: any[]) => void;
    debug: (message: any, ...rest: any[]) => void;
    info: (message: any, ...rest: any[]) => void;
    warn: (message: any, ...rest: any[]) => void;
    error: (message: any, ...rest: any[]) => void;
    log: (message: any, ...rest: any[]) => void;
};
declare const deprecate: (message: any, ...rest: any[]) => void;
declare const pretty: {
    (type: keyof typeof logger): (message: any, ...args: any[]) => void;
    trace: (message: any, ...args: any[]) => void;
    debug: (message: any, ...args: any[]) => void;
    info: (message: any, ...args: any[]) => void;
    warn: (message: any, ...args: any[]) => void;
    error: (message: any, ...args: any[]) => void;
};

export { deprecate, logger, once, pretty };
