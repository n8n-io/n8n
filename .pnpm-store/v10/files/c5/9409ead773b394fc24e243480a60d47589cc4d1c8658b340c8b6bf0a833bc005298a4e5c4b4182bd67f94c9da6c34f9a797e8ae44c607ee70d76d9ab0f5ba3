import { isBrowser } from './env';

export const output = {
  write(str: string) {
    return isBrowser ? undefined : process.stdout.write(str);
  },
};
