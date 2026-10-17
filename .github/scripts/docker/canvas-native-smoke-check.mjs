#!/usr/bin/env node

// Verifies the canvas native binding loads from the same dependency tree that
// the PDF nodes use in the n8n image.

import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import path from 'node:path';

const n8nInstallDir = process.env.N8N_INSTALL_DIR || '/usr/local/lib/node_modules/n8n';
const nodesBasePackageJson =
	process.env.NODES_BASE_PACKAGE_JSON ||
	path.join(n8nInstallDir, 'node_modules/n8n-nodes-base/package.json');
const require = createRequire(realpathSync(nodesBasePackageJson));

const { DOMMatrix, ImageData, Path2D } = require('@napi-rs/canvas');

new DOMMatrix();
new ImageData(1, 1);
new Path2D();

console.log('Canvas native smoke check passed.');
