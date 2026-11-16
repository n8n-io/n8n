import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

const fix = process.argv.includes('--fix');
const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function filesOf(path: string): string[] {
	if (!statSync(path).isDirectory()) return [path];
	return readdirSync(path).flatMap((entry) => {
		const child = join(path, entry);
		if (statSync(child).isDirectory()) return filesOf(child);
		return /\.(ts|mts)$/.test(entry) && !entry.endsWith('.generated.ts') ? [child] : [];
	});
}

function commentRanges(text: string): Array<{ pos: number; end: number }> {
	const sf = ts.createSourceFile('file.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const found = new Map<number, number>();
	const note = (ranges: ts.CommentRange[] | undefined) => {
		for (const range of ranges ?? []) found.set(range.pos, range.end);
	};
	const walk = (node: ts.Node) => {
		note(ts.getLeadingCommentRanges(text, node.getFullStart()));
		note(ts.getTrailingCommentRanges(text, node.getEnd()));
		for (const child of node.getChildren(sf)) walk(child);
	};
	walk(sf);
	return [...found.entries()].map(([pos, end]) => ({ pos, end })).sort((a, b) => a.pos - b.pos);
}

function withoutComments(text: string, ranges: Array<{ pos: number; end: number }>): string {
	let out = '';
	let at = 0;
	for (const range of ranges) {
		out += text.slice(at, range.pos);
		at = range.end;
	}
	out += text.slice(at);
	return out
		.split('\n')
		.map((line) => line.trimEnd())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/^\n+/, '');
}

let count = 0;
for (const file of targets.flatMap(filesOf)) {
	const text = readFileSync(file, 'utf8');
	const ranges = commentRanges(text);
	if (ranges.length === 0) continue;
	count += ranges.length;
	if (fix) {
		writeFileSync(file, withoutComments(text, ranges));
		continue;
	}
	for (const range of ranges) {
		const line = text.slice(0, range.pos).split('\n').length;
		console.error(`${file}:${line}: no-comments: delete the comment; the code says what it does`);
	}
}
if (count > 0 && !fix) {
	console.error(`no-comments: ${count} comment(s). Run with --fix to delete them.`);
	process.exit(1);
}
console.log(fix ? `no-comments: deleted ${count} comment(s)` : 'no-comments: ok');
