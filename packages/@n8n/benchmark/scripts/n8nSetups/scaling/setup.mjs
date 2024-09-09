#!/usr/bin/env zx

import path from 'path';
import { fs } from 'zx';

/**
 * Creates the needed directories for the queue setup so their
 * permissions get set correctly.
 */
export function setup({ runDir }) {
	const neededDirs = ['n8n-worker1', 'n8n-worker2', 'n8n-main1', 'n8n_main2', 'postgres'];

	for (const dir of neededDirs) {
		fs.ensureDirSync(path.join(runDir, dir));
	}
}
