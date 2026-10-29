#!/usr/bin/env node

// Verify Edit Image v2 can load and use both native image libraries.

import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const n8nInstallDir = process.env.N8N_INSTALL_DIR || '/usr/local/lib/node_modules/n8n';
const nodesBasePackageJson =
	process.env.NODES_BASE_PACKAGE_JSON ||
	path.join(n8nInstallDir, 'node_modules/n8n-nodes-base/package.json');
const require = createRequire(realpathSync(nodesBasePackageJson));

const { createCanvas } = require('@napi-rs/canvas');
const { Transformer } = require('@napi-rs/image');

const canvas = createCanvas(2, 2);
const png = await canvas.encode('png');
const metadata = await new Transformer(png).metadata();

if (metadata.width !== 2 || metadata.height !== 2) {
	throw new Error(`Unexpected image dimensions: ${metadata.width}x${metadata.height}`);
}

console.log('Edit Image native bindings smoke check passed.');
