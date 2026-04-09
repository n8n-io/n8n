export interface Duration {
    seconds: number;
    nanos: number;
}
export interface DurationMessage {
    seconds: string;
    nanos: number;
}
export declare function durationMessageToDuration(message: DurationMessage): Duration;
export declare function msToDuration(millis: number): Duration;
export declare function durationToMs(duration: Duration): number;
export declare function isDuration(value: any): value is Duration;
export declare function isDurationMessage(value: any): value is DurationMessage;
export declare function parseDuration(value: string): Duration | null;
export declare function durationToString(duration: Duration): string;
