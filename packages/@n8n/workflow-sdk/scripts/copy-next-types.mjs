// The package build strips comments from all emitted files. The `/next` types keep their JSDoc,
// because editors and the workflow builder sandbox show it. tsconfig.build.next.json emits them.
import { cpSync, rmSync } from 'node:fs';

const packageDir = new URL('../', import.meta.url);
const emittedDir = new URL('node_modules/.cache/next-types/', packageDir);

cpSync(new URL('next/', emittedDir), new URL('dist/next/', packageDir), { recursive: true });
rmSync(emittedDir, { recursive: true, force: true });
