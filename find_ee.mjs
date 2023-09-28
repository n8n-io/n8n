import { glob, globSync, globStream, globStreamSync, Glob } from 'glob';

let tsFiles = await glob('**/*.ee.ts', { ignore: 'node_modules/**' });

tsFiles = tsFiles.map((f) => f.replace(/\\/g, '/'));

const tsFileNames = tsFiles.map((f) => f.split('/').reverse()[0]);

console.log({ tsFiles, tsFileNames });
