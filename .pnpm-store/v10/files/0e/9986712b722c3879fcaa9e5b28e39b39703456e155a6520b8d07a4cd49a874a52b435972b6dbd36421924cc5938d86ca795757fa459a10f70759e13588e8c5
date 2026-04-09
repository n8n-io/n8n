import { parentPort } from 'node:worker_threads';
import { resolveRemoteMount } from '../../dist/backends/port/fs.js';
import { InMemory } from '../../dist/backends/memory.js';

await resolveRemoteMount(parentPort, { backend: InMemory });
