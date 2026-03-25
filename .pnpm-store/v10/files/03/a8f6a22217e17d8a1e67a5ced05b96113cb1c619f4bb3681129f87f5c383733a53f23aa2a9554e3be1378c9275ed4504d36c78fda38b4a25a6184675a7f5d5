import { CompositeWaitStrategy } from "./composite-wait-strategy";
import { HttpWaitStrategy, HttpWaitStrategyOptions } from "./http-wait-strategy";
import { Log } from "./log-wait-strategy";
import { ShellWaitStrategy } from "./shell-wait-strategy";
import { WaitStrategy } from "./wait-strategy";
export declare class Wait {
    static forAll(waitStrategies: WaitStrategy[]): CompositeWaitStrategy;
    static forListeningPorts(): WaitStrategy;
    static forLogMessage(message: Log | RegExp, times?: number): WaitStrategy;
    static forHealthCheck(): WaitStrategy;
    static forOneShotStartup(): WaitStrategy;
    static forHttp(path: string, port: number, options?: HttpWaitStrategyOptions): HttpWaitStrategy;
    static forSuccessfulCommand(command: string): ShellWaitStrategy;
}
