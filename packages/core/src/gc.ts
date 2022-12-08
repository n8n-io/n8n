import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

setFlagsFromString('--expose_gc');
export const gc = runInNewContext('gc') as unknown as () => void;

export const currentMemory = () => Math.floor(process.memoryUsage().heapTotal / 1024 / 1024);
