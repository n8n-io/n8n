import { RedisCommandArguments } from '.';
export declare function transformArguments(): RedisCommandArguments;
type FunctionStatsRawReply = [
    'running_script',
    null | [
        'name',
        string,
        'command',
        string,
        'duration_ms',
        number
    ],
    'engines',
    Array<any>
];
interface FunctionStatsReply {
    runningScript: null | {
        name: string;
        command: string;
        durationMs: number;
    };
    engines: Record<string, {
        librariesCount: number;
        functionsCount: number;
    }>;
}
export declare function transformReply(reply: FunctionStatsRawReply): FunctionStatsReply;
export {};
