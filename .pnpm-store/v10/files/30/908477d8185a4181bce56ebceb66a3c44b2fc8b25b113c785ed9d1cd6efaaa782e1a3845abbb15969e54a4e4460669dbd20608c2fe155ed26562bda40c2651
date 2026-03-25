import type { AuthInterface } from "./AuthInterface.js";
export interface StrategyInterface<StrategyOptions extends any[], AuthOptions extends any[], Authentication extends object> {
    (...args: StrategyOptions): AuthInterface<AuthOptions, Authentication>;
}
