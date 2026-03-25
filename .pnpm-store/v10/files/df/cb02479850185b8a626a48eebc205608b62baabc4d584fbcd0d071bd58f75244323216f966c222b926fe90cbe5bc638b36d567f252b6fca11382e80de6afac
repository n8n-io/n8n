declare type ParseOpts = {
    name?: string;
    types?: number[];
    text: string;
};
declare type ValueMapper = (param: any, index: number) => any;
declare type BindOpts = {
    portal?: string;
    binary?: boolean;
    statement?: string;
    values?: any[];
    valueMapper?: ValueMapper;
};
declare type ExecOpts = {
    portal?: string;
    rows?: number;
};
declare type PortalOpts = {
    type: 'S' | 'P';
    name?: string;
};
declare const serialize: {
    startup: (opts: Record<string, string>) => Buffer;
    password: (password: string) => Buffer;
    requestSsl: () => Buffer;
    sendSASLInitialResponseMessage: (mechanism: string, initialResponse: string) => Buffer;
    sendSCRAMClientFinalMessage: (additionalData: string) => Buffer;
    query: (text: string) => Buffer;
    parse: (query: ParseOpts) => Buffer;
    bind: (config?: BindOpts) => Buffer;
    execute: (config?: ExecOpts) => Buffer;
    describe: (msg: PortalOpts) => Buffer;
    close: (msg: PortalOpts) => Buffer;
    flush: () => Buffer;
    sync: () => Buffer;
    end: () => Buffer;
    copyData: (chunk: Buffer) => Buffer;
    copyDone: () => Buffer;
    copyFail: (message: string) => Buffer;
    cancel: (processID: number, secretKey: number) => Buffer;
};
export { serialize };
