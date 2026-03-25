import * as colorette from 'colorette';
import { isBrowser } from './env';
import { identity } from './utils';

export { options as colorOptions } from 'colorette';

export const colorize = new Proxy(colorette, {
  get(target: typeof colorette, prop: string): typeof identity {
    if (isBrowser) {
      return identity;
    }

    return (target as any)[prop];
  },
});
class Logger {
  protected stderr(str: string) {
    return process.stderr.write(str);
  }

  info(str: string) {
    return isBrowser ? console.log(str) : this.stderr(str);
  }

  warn(str: string) {
    return isBrowser ? console.warn(str) : this.stderr(colorize.yellow(str));
  }

  error(str: string) {
    return isBrowser ? console.error(str) : this.stderr(colorize.red(str));
  }
}

export const logger = new Logger();
