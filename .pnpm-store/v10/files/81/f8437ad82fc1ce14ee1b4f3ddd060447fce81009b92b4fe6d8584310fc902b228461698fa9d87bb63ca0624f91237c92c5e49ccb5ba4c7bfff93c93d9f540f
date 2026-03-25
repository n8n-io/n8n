export as namespace TripleBeam;

export const LEVEL: unique symbol;
export const MESSAGE: unique symbol;
export const SPLAT: unique symbol;
export const configs: Configs;

export interface Config {
    readonly levels: { [k: string]: number };
    readonly colors: { [k: string]: string };
}

export interface Configs {
    readonly cli: Config;
    readonly npm: Config;
    readonly syslog: Config;
}
