#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Print Prompts CLI
//
// Renders the final system prompt for the main Instance Agent and every
// orchestration sub-agent, then writes one markdown file per agent into
// `.output/prompts/` (gitignored). Useful for auditing, diffing across
// branches, or sharing the full prompt outside the codebase.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

import { buildSubAgentPrompt } from '../src/agent/sub-agent-factory';
import { getSystemPrompt } from '../src/agent/system-prompt';
import { buildBrowserAgentPrompt } from '../src/tools/orchestration/browser-credential-setup.prompt';
import {
	BUILDER_AGENT_PROMPT,
	createSandboxBuilderAgentPrompt,
} from '../src/tools/orchestration/build-workflow-agent.prompt';
import { DATA_TABLE_AGENT_PROMPT } from '../src/tools/orchestration/data-table-agent.prompt';
import { PLANNER_AGENT_PROMPT } from '../src/tools/orchestration/plan-agent-prompt';
import { RESEARCH_AGENT_PROMPT } from '../src/tools/orchestration/research-agent-prompt';

interface PromptEntry {
	file: string;
	displayName: string;
	source: string;
	variant?: string;
	body: string;
}

function parseArgs(argv: string[]): { outDir: string } {
	const args = argv.slice(2);
	let outDir = resolve(__dirname, '..', '.output', 'prompts');
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--out' || args[i] === '-o') {
			const next = args[i + 1];
			if (!next) {
				console.error('Error: --out requires a directory argument');
				process.exit(1);
			}
			outDir = resolve(next);
			i++;
		} else if (args[i] === '--help' || args[i] === '-h') {
			console.log('Usage: pnpm prompts:print [--out <dir>]');
			console.log('  --out, -o   Output directory (default: <package>/.output/prompts)');
			process.exit(0);
		}
	}
	return { outDir };
}

function collectPrompts(): PromptEntry[] {
	const mainAgentPrompt = getSystemPrompt({
		researchMode: true,
		webhookBaseUrl: 'https://your-instance.example.com',
		filesystemAccess: true,
		localGateway: { status: 'connected' },
		toolSearchEnabled: true,
		licenseHints: ['<sample license hint — replace with real hint at runtime>'],
		timeZone: 'UTC',
		browserAvailable: true,
		branchReadOnly: false,
	});

	const delegateTemplate = buildSubAgentPrompt(
		'<example-role>',
		'<example task instructions — orchestrator fills this in per delegation>',
		'UTC',
	);

	return [
		{
			file: 'main-agent.md',
			displayName: 'Main Instance Agent',
			source: 'src/agent/system-prompt.ts → getSystemPrompt',
			variant: 'all features enabled (research, filesystem, gateway, tool-search, browser)',
			body: mainAgentPrompt,
		},
		{
			file: 'subagent-planner.md',
			displayName: 'Sub-Agent — Workflow Planner',
			source: 'src/tools/orchestration/plan-agent-prompt.ts → PLANNER_AGENT_PROMPT',
			body: PLANNER_AGENT_PROMPT,
		},
		{
			file: 'subagent-builder-tool.md',
			displayName: 'Sub-Agent — Workflow Builder (tool mode)',
			source: 'src/tools/orchestration/build-workflow-agent.prompt.ts → BUILDER_AGENT_PROMPT',
			variant: 'tool mode (no sandbox)',
			body: BUILDER_AGENT_PROMPT,
		},
		{
			file: 'subagent-builder-sandbox.md',
			displayName: 'Sub-Agent — Workflow Builder (sandbox mode)',
			source:
				'src/tools/orchestration/build-workflow-agent.prompt.ts → createSandboxBuilderAgentPrompt',
			variant: 'sandbox mode — workspaceRoot: /workspace',
			body: createSandboxBuilderAgentPrompt('/workspace'),
		},
		{
			file: 'subagent-researcher.md',
			displayName: 'Sub-Agent — Web Researcher',
			source: 'src/tools/orchestration/research-agent-prompt.ts → RESEARCH_AGENT_PROMPT',
			body: RESEARCH_AGENT_PROMPT,
		},
		{
			file: 'subagent-data-table.md',
			displayName: 'Sub-Agent — Data Table Manager',
			source: 'src/tools/orchestration/data-table-agent.prompt.ts → DATA_TABLE_AGENT_PROMPT',
			body: DATA_TABLE_AGENT_PROMPT,
		},
		{
			file: 'subagent-browser-gateway.md',
			displayName: 'Sub-Agent — Browser Credential Setup (gateway)',
			source:
				'src/tools/orchestration/browser-credential-setup.prompt.ts → buildBrowserAgentPrompt',
			variant: "source: 'gateway'",
			body: buildBrowserAgentPrompt('gateway'),
		},
		{
			file: 'subagent-browser-chrome-mcp.md',
			displayName: 'Sub-Agent — Browser Credential Setup (Chrome DevTools MCP)',
			source:
				'src/tools/orchestration/browser-credential-setup.prompt.ts → buildBrowserAgentPrompt',
			variant: "source: 'chrome-devtools-mcp'",
			body: buildBrowserAgentPrompt('chrome-devtools-mcp'),
		},
		{
			file: 'subagent-delegate-template.md',
			displayName: 'Sub-Agent — Generic Delegate (template)',
			source: 'src/agent/sub-agent-factory.ts → buildSubAgentPrompt',
			variant: 'placeholder role/instructions — orchestrator fills these per delegation at runtime',
			body: delegateTemplate,
		},
	];
}

function renderFile(entry: PromptEntry): string {
	const header: string[] = [`# ${entry.displayName}`, '', `> Source: \`${entry.source}\``];
	if (entry.variant) {
		header.push(`> Variant: ${entry.variant}`);
	}
	header.push('', '---', '');
	return header.join('\n') + entry.body;
}

function main(): void {
	const { outDir } = parseArgs(process.argv);
	mkdirSync(outDir, { recursive: true });

	const entries = collectPrompts();

	for (const entry of entries) {
		const target = join(outDir, entry.file);
		writeFileSync(target, renderFile(entry), 'utf8');
	}

	const longestName = Math.max(...entries.map((e) => e.file.length));
	console.log(`Wrote ${entries.length} prompts to ${outDir}`);
	for (const entry of entries) {
		const padded = entry.file.padEnd(longestName);
		const chars = entry.body.length.toLocaleString();
		console.log(`  ${padded}  ${chars.padStart(7)} chars`);
	}
}

main();
