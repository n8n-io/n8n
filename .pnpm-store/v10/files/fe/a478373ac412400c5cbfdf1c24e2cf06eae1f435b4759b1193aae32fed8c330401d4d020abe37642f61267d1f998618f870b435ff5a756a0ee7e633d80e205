// Type definitions for winston 3.0
// Project: https://github.com/winstonjs/winston

/// <reference types="node" />

declare namespace winston {
  interface AbstractConfigSetLevels {
    [key: string]: number;
  }

  interface AbstractConfigSetColors {
    [key: string]: string | string[];
  }

  interface AbstractConfigSet {
    levels: AbstractConfigSetLevels;
    colors: AbstractConfigSetColors;
  }

  interface CliConfigSetLevels extends AbstractConfigSetLevels {
    error: number;
    warn: number;
    help: number;
    data: number;
    info: number;
    debug: number;
    prompt: number;
    verbose: number;
    input: number;
    silly: number;
  }

  interface CliConfigSetColors extends AbstractConfigSetColors {
    error: string | string[];
    warn: string | string[];
    help: string | string[];
    data: string | string[];
    info: string | string[];
    debug: string | string[];
    prompt: string | string[];
    verbose: string | string[];
    input: string | string[];
    silly: string | string[];
  }

  interface NpmConfigSetLevels extends AbstractConfigSetLevels {
    error: number;
    warn: number;
    info: number;
    http: number;
    verbose: number;
    debug: number;
    silly: number;
  }

  interface NpmConfigSetColors extends AbstractConfigSetColors {
    error: string | string[];
    warn: string | string[];
    info: string | string[];
    http: string | string[];
    verbose: string | string[];
    debug: string | string[];
    silly: string | string[];
  }

  interface SyslogConfigSetLevels extends AbstractConfigSetLevels {
    emerg: number;
    alert: number;
    crit: number;
    error: number;
    warning: number;
    notice: number;
    info: number;
    debug: number;
  }

  interface SyslogConfigSetColors extends AbstractConfigSetColors {
    emerg: string | string[];
    alert: string | string[];
    crit: string | string[];
    error: string | string[];
    warning: string | string[];
    notice: string | string[];
    info: string | string[];
    debug: string | string[];
  }

  interface Config {
    allColors: AbstractConfigSetColors;
    cli: { levels: CliConfigSetLevels, colors: CliConfigSetColors };
    npm: { levels: NpmConfigSetLevels, colors: NpmConfigSetColors };
    syslog: { levels: SyslogConfigSetLevels, colors: SyslogConfigSetColors };

    addColors(colors: AbstractConfigSetColors): void;
  }
}

declare const winston: winston.Config;
export = winston;
