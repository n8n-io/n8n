import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import type { BoundaryReport } from './types.js';

/**
 * Hard write boundary: only paths under packages/nodes-base/nodes/<NewNode>/ may be written.
 */
export class WriteBoundary {
	readonly root: string;
	readonly written: string[] = [];
	readonly refused: Array<{ path: string; reason: string }> = [];

	constructor(repoRoot: string, nodeFolderName: string) {
		this.root = resolve(repoRoot, 'packages', 'nodes-base', 'nodes', nodeFolderName);
	}

	private isInsideRoot(absolutePath: string): boolean {
		const resolved = resolve(absolutePath);
		const rootWithSep = this.root.endsWith(sep) ? this.root : `${this.root}${sep}`;
		return resolved === this.root || resolved.startsWith(rootWithSep);
	}

	writeAllowed(relativePath: string, content: string): string {
		const absolutePath = resolve(this.root, relativePath);

		if (!this.isInsideRoot(absolutePath)) {
			const reason = `Path escapes write boundary (${this.root})`;
			this.refused.push({ path: absolutePath, reason });
			throw new Error(reason);
		}

		mkdirSync(dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, content, 'utf8');
		const rel = relative(this.root, absolutePath) || '.';
		this.written.push(rel);
		console.log(`  write  ${rel}`);
		return absolutePath;
	}

	report(): BoundaryReport {
		return {
			root: this.root,
			written: [...this.written],
			refused: [...this.refused],
		};
	}

	formatReport(): string {
		const lines = [
			'## Boundary report',
			'',
			`Write root: \`${this.root}\``,
			'',
			'### Written (inside boundary)',
		];

		if (this.written.length === 0) {
			lines.push('- (none)');
		} else {
			for (const file of this.written) {
				lines.push(`- ${file}`);
			}
		}

		lines.push('', '### Refused (outside boundary)');
		if (this.refused.length === 0) {
			lines.push('- (none)');
		} else {
			for (const item of this.refused) {
				lines.push(`- ${item.path}: ${item.reason}`);
			}
		}

		lines.push(
			'',
			'### Intentionally out of scope',
			'- `packages/nodes-base/package.json` — register the node under `"n8n"."nodes"` before it loads in the editor',
			'- `packages/nodes-base/credentials/*` — move `credentials-draft/` here if you need a real credential type',
			'',
			'These paths are outside the hard write boundary by design so the scaffolder cannot silently expand scope.',
		);

		return lines.join('\n');
	}
}

export function resolveRepoRoot(fromDir: string): string {
	// node-scaffolder/ lives at <repo>/node-scaffolder
	return resolve(fromDir, '..');
}
