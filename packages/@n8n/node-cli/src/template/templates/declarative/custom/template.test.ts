import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { customTemplate } from './template';

describe('custom template', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n8n-node-cli-custom-template-'));
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it('sets the codex node to the package name and the renamed node name', async () => {
		await customTemplate.run({
			destinationPath: tempDir,
			nodePackageName: 'n8n-nodes-acme',
			user: { name: 'Test User', email: 'test@example.com' },
			packageManager: { name: 'npm', installCommand: 'npm install' },
			config: { credentialType: 'none', baseUrl: 'https://api.acme.com' },
		});

		const codex = JSON.parse(
			await fs.readFile(path.join(tempDir, 'nodes/Acme/Acme.node.json'), 'utf-8'),
		) as { node: string };
		const nodeSource = await fs.readFile(path.join(tempDir, 'nodes/Acme/Acme.node.ts'), 'utf-8');

		expect(codex.node).toBe('n8n-nodes-acme.acme');
		expect(nodeSource).toContain("name: 'acme'");
	});
});
