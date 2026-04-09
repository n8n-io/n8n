import { parentPort } from 'node:worker_threads';
import { attachFS } from '../../dist/backends/port/fs.js';
import { mounts } from '../../dist/index.js';

attachFS(parentPort, mounts.get('/'));
