export type Logger = {
    debug: (formatter: unknown, ...args: unknown[]) => void;
    error: (formatter: unknown, ...args: unknown[]) => void;
    info: (formatter: unknown, ...args: unknown[]) => void;
    trace: (formatter: unknown, ...args: unknown[]) => void;
    warn: (formatter: unknown, ...args: unknown[]) => void;
    child: (namespace: string) => Logger;
    namespace: string;
};
