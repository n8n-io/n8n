# Node.js Essentials

## File System (fs/promises)

```javascript
import { readFile, writeFile, appendFile, mkdir, rm, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

// Read file
const content = await readFile('./file.txt', 'utf-8');

// Write file (overwrites)
await writeFile('./output.txt', 'Hello World');

// Append to file
await appendFile('./log.txt', 'New log entry\n');

// Read JSON file
const readJSON = async (path) => {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
};

// Write JSON file
const writeJSON = async (path, data) => {
  await writeFile(path, JSON.stringify(data, null, 2));
};

// Create directory (recursive)
await mkdir('./nested/path/dir', { recursive: true });

// Remove directory/file (recursive)
await rm('./temp', { recursive: true, force: true });

// List directory
const files = await readdir('./src');
const filesWithTypes = await readdir('./src', { withFileTypes: true });

for (const file of filesWithTypes) {
  if (file.isDirectory()) {
    console.log(`[DIR] ${file.name}`);
  } else {
    console.log(`[FILE] ${file.name}`);
  }
}

// Get file stats
const stats = await stat('./file.txt');
console.log('Size:', stats.size);
console.log('Modified:', stats.mtime);
console.log('Is file:', stats.isFile());

// Check existence (sync only)
if (existsSync('./path')) {
  // Path exists
}
```

## Path Module

```javascript
import { join, resolve, dirname, basename, extname, parse, format } from 'path';
import { fileURLToPath } from 'url';

// Get current file and directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Join paths (platform-independent)
const filePath = join(__dirname, 'data', 'config.json');

// Resolve to absolute path
const absolutePath = resolve('./relative/path');

// Get filename
const filename = basename('/path/to/file.txt'); // 'file.txt'
const filenameNoExt = basename('/path/to/file.txt', '.txt'); // 'file'

// Get extension
const ext = extname('file.txt'); // '.txt'

// Parse path
const parsed = parse('/home/user/file.txt');
// {
//   root: '/',
//   dir: '/home/user',
//   base: 'file.txt',
//   ext: '.txt',
//   name: 'file'
// }

// Format path
const formatted = format({
  dir: '/home/user',
  base: 'file.txt'
}); // '/home/user/file.txt'
```

## Streams

```javascript
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

// Read large file efficiently
const readStream = createReadStream('./large-file.txt', {
  encoding: 'utf-8',
  highWaterMark: 16 * 1024 // 16KB chunks
});

readStream.on('data', (chunk) => {
  console.log('Chunk:', chunk);
});

readStream.on('end', () => {
  console.log('Finished reading');
});

readStream.on('error', (error) => {
  console.error('Error:', error);
});

// Write stream
const writeStream = createWriteStream('./output.txt');
writeStream.write('Line 1\n');
writeStream.write('Line 2\n');
writeStream.end('Final line\n');

// Pipe streams
const input = createReadStream('./input.txt');
const output = createWriteStream('./output.txt');
input.pipe(output);

// Transform stream
const upperCaseTransform = new Transform({
  transform(chunk, encoding, callback) {
    const transformed = chunk.toString().toUpperCase();
    callback(null, transformed);
  }
});

await pipeline(
  createReadStream('./input.txt'),
  upperCaseTransform,
  createWriteStream('./output.txt')
);

// Async iteration over stream
const processStream = async (filePath) => {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });

  for await (const chunk of stream) {
    processChunk(chunk);
  }
};
```

## EventEmitter

```javascript
import { EventEmitter } from 'events';

class DataProcessor extends EventEmitter {
  async process(data) {
    this.emit('start', { itemCount: data.length });

    for (let i = 0; i < data.length; i++) {
      await this.processItem(data[i]);
      this.emit('progress', { current: i + 1, total: data.length });
    }

    this.emit('complete', { processed: data.length });
  }

  async processItem(item) {
    // Processing logic
    if (item.error) {
      this.emit('error', new Error('Item processing failed'));
    }
  }
}

// Usage
const processor = new DataProcessor();

processor.on('start', ({ itemCount }) => {
  console.log(`Starting processing ${itemCount} items`);
});

processor.on('progress', ({ current, total }) => {
  console.log(`Progress: ${current}/${total}`);
});

processor.on('complete', ({ processed }) => {
  console.log(`Completed: ${processed} items`);
});

processor.on('error', (error) => {
  console.error('Processing error:', error);
});

// One-time listener
processor.once('complete', () => {
  console.log('First completion');
});

// Remove listener
const handler = () => console.log('Event fired');
processor.on('event', handler);
processor.off('event', handler);
```

## Child Processes

```javascript
import { spawn, exec, execFile } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Execute shell command
const { stdout, stderr } = await execAsync('ls -la');
console.log('Output:', stdout);

// Spawn process with streaming
const ls = spawn('ls', ['-la', '/usr']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

// Execute Node.js script
const child = spawn('node', ['script.js'], {
  cwd: './scripts',
  env: { ...process.env, CUSTOM_VAR: 'value' }
});
```

## Worker Threads

```javascript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

if (isMainThread) {
  // Main thread
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { items: [1, 2, 3, 4, 5] }
  });

  worker.on('message', (result) => {
    console.log('Result from worker:', result);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  worker.on('exit', (code) => {
    console.log(`Worker exited with code ${code}`);
  });

  worker.postMessage({ command: 'process' });
} else {
  // Worker thread
  const { items } = workerData;

  parentPort.on('message', (message) => {
    if (message.command === 'process') {
      const result = items.reduce((sum, n) => sum + n, 0);
      parentPort.postMessage(result);
    }
  });
}

// Worker pool pattern
class WorkerPool {
  #workers = [];
  #queue = [];

  constructor(workerPath, poolSize = 4) {
    for (let i = 0; i < poolSize; i++) {
      this.#workers.push({
        worker: new Worker(workerPath),
        busy: false
      });
    }
  }

  async execute(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      this.#queue.push(task);
      this.#processQueue();
    });
  }

  #processQueue() {
    const availableWorker = this.#workers.find(w => !w.busy);
    if (!availableWorker || this.#queue.length === 0) return;

    const task = this.#queue.shift();
    availableWorker.busy = true;

    const handleMessage = (result) => {
      task.resolve(result);
      availableWorker.busy = false;
      availableWorker.worker.off('message', handleMessage);
      this.#processQueue();
    };

    availableWorker.worker.on('message', handleMessage);
    availableWorker.worker.postMessage(task.data);
  }
}
```

## Process & Environment

```javascript
// Environment variables
const port = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';

// Command-line arguments
const args = process.argv.slice(2);
console.log('Arguments:', args);

// Exit process
process.exit(0); // Success
process.exit(1); // Error

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM');
  await cleanup();
  process.exit(0);
});

// Unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Process info
console.log('PID:', process.pid);
console.log('Platform:', process.platform);
console.log('Node version:', process.version);
console.log('Memory usage:', process.memoryUsage());
console.log('Uptime:', process.uptime());
```

## HTTP/HTTPS Server

```javascript
import { createServer } from 'http';
import { readFile } from 'fs/promises';

const server = createServer(async (req, res) => {
  // Parse URL and method
  const { url, method } = req;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Route handling
  if (url === '/api/users' && method === 'GET') {
    const users = [{ id: 1, name: 'John' }];
    res.writeHead(200);
    res.end(JSON.stringify(users));
  } else if (url === '/api/users' && method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const user = JSON.parse(body);
      res.writeHead(201);
      res.end(JSON.stringify({ id: 2, ...user }));
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// Graceful shutdown
const shutdown = () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Cluster for Multi-Core

```javascript
import cluster from 'cluster';
import { cpus } from 'os';
import { createServer } from 'http';

const numCPUs = cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {
  // Workers share TCP connection
  const server = createServer((req, res) => {
    res.writeHead(200);
    res.end(`Handled by worker ${process.pid}\n`);
  });

  server.listen(3000);
  console.log(`Worker ${process.pid} started`);
}
```

## Quick Reference

| Module | Use Case | Import |
|--------|----------|--------|
| `fs/promises` | Async file operations | `import { readFile } from 'fs/promises'` |
| `path` | Path manipulation | `import { join } from 'path'` |
| `stream` | Stream processing | `import { pipeline } from 'stream/promises'` |
| `events` | Event emitters | `import { EventEmitter } from 'events'` |
| `child_process` | Spawn processes | `import { spawn } from 'child_process'` |
| `worker_threads` | Multi-threading | `import { Worker } from 'worker_threads'` |
| `http` | HTTP server | `import { createServer } from 'http'` |
| `cluster` | Multi-core scaling | `import cluster from 'cluster'` |
