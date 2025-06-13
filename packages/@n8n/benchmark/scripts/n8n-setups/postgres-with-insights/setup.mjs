#!/usr/bin/env zx

import path from 'path';
import { fs } from 'zx';

/**
 * Creates the needed directories so the permissions get set correctly.
 */
export function setup({ runDir }) {
	const neededDirs = ['n8n', 'postgres'];

	for (const dir of neededDirs) {
		fs.ensureDirSync(path.join(runDir, dir));
	}
}
