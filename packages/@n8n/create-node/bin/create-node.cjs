#!/usr/bin/env node

const { spawnSync } = require('child_process');

const n8nNodeBin = require.resolve('.bin/n8n-node');

const result = spawnSync(n8nNodeBin, ['new', ...process.argv.slice(2)], {
	stdio: 'inherit',
});

process.exit(result.status ?? 1);
