import { relative } from 'node:path';

const RULE = 'n8n-local-rules/require-request-target';

export default function format(results) {
	const lines = [];
	const perFolder = new Map();
	for (const { filePath, messages } of results) {
		const path = relative(process.cwd(), filePath);
		for (const { ruleId, line, column, messageId } of messages) {
			if (ruleId !== RULE) continue;
			lines.push(`${path}:${line}:${column} ${messageId}`);
			const folder = path.match(/^.*?\/(?:nodes|credentials|utils)\/[^/]+/)?.[0] ?? path;
			perFolder.set(folder, (perFolder.get(folder) ?? 0) + 1);
		}
	}
	const summary = [...perFolder]
		.sort((a, b) => b[1] - a[1])
		.map(([folder, n]) => `${n}\t${folder}`);
	return [...lines, '', `${lines.length} findings`, ...summary].join('\n') + '\n';
}
