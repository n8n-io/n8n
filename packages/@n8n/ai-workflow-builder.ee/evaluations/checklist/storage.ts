import fs from 'fs';
import path from 'path';
import type { Run } from './types';

const DATA_DIR = path.join(__dirname, '..', '.data', 'checklist-runs');

function ensureDir(): void {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

export function saveRun(run: Run): void {
	ensureDir();
	const filePath = path.join(DATA_DIR, `${run.id}.json`);
	fs.writeFileSync(filePath, JSON.stringify(run, null, 2));
}

export function getRun(id: string): Run | null {
	const filePath = path.join(DATA_DIR, `${id}.json`);
	if (!fs.existsSync(filePath)) return null;
	const content = fs.readFileSync(filePath, 'utf-8');
	return JSON.parse(content) as Run;
}

export function listRuns(): Run[] {
	ensureDir();
	const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
	return files
		.map((f) => {
			const content = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
			return JSON.parse(content) as Run;
		})
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateRun(run: Run): void {
	saveRun(run);
}
