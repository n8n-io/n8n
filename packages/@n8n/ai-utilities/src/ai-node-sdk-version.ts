import { readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { resolve } from 'path';

function readAiNodeSdkVersion(): number {
	const pkgPath = resolve(__dirname, '..', 'package.json');
	const pkg = jsonParse<{ aiNodeSdkVersion: number }>(readFileSync(pkgPath, 'utf-8'));
	return pkg.aiNodeSdkVersion;
}

export const AI_NODE_SDK_VERSION: number = readAiNodeSdkVersion();
