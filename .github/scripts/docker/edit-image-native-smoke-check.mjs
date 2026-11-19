#!/usr/bin/env node

// Verify Edit Image v2 can load and use both native image libraries, and that
// its text operation can draw with a system font that the base image ships.

import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const n8nInstallDir = process.env.N8N_INSTALL_DIR || '/usr/local/lib/node_modules/n8n';
const nodesBasePackageJson =
	process.env.NODES_BASE_PACKAGE_JSON ||
	path.join(n8nInstallDir, 'node_modules/n8n-nodes-base/package.json');
const require = createRequire(realpathSync(nodesBasePackageJson));

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { Transformer } = require('@napi-rs/image');

const canvas = createCanvas(2, 2);
const png = await canvas.encode('png');
const metadata = await new Transformer(png).metadata();

if (metadata.width !== 2 || metadata.height !== 2) {
	throw new Error(`Unexpected image dimensions: ${metadata.width}x${metadata.height}`);
}

// The text operation lists fonts with get-system-fonts. Arial is the default
// font in the node.
const systemFonts = require('get-system-fonts');
const fonts = await (systemFonts.default ?? systemFonts)();
const arial = fonts.find((font) => /\/arial\.ttf$/i.test(font));
if (!arial) throw new Error(`No Arial in the system fonts: ${fonts.length} fonts found`);
if (!GlobalFonts.registerFromPath(arial, 'smoke-check')) throw new Error(`Cannot load ${arial}`);

const textCanvas = createCanvas(64, 32);
const context = textCanvas.getContext('2d');
context.font = '24px smoke-check';
context.fillText('n8n', 2, 24);
const pixels = context.getImageData(0, 0, 64, 32).data;
if (!pixels.some((value, index) => index % 4 === 3 && value > 0)) {
	throw new Error(`Drawing text with ${arial} produced no pixels`);
}

console.log('Edit Image native bindings smoke check passed.');
