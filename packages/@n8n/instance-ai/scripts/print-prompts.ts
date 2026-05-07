#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Print Prompts CLI
//
// Renders the final system prompt for the main Instance Agent and every
// orchestration sub-agent, then writes one markdown file per agent variant
// into `.output/prompts/<agent>/<variant>.md` (gitignored). Useful for
// auditing the full prompt verbatim, diffing prompts across branches, or
// sharing them outside the codebase.
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

interface Variant {
	/** File name (without extension) inside the agent's folder. */
	file: string;
	/** Short human-readable label for the variant header (omit when only one variant). */
	label?: string;
	body: string;
}

interface AgentEntry {
	/** Folder name under `.output/prompts/`. */
	folder: string;
	displayName: string;
	source: string;
	variants: Variant[];
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

function collectAgents(): AgentEntry[] {
	return [
		{
			folder: 'main-agent',
			displayName: 'Main Instance Agent',
			source: 'src/agent/system-prompt.ts → getSystemPrompt',
			variants: [
				{
					file: 'all-features',
					label:
						'all features enabled (research, filesystem, gateway connected, tool-search, browser, sample license hint)',
					body: getSystemPrompt({
						researchMode: true,
						webhookBaseUrl: 'https://your-instance.example.com',
						filesystemAccess: true,
						localGateway: { status: 'connected' },
						toolSearchEnabled: true,
						licenseHints: ['<sample license hint — replace with real hint at runtime>'],
						timeZone: 'UTC',
						browserAvailable: true,
						branchReadOnly: false,
					}),
				},
				{
					file: 'default',
					label:
						'no options set — what a fresh OSS install sees (no webhook URL, no filesystem, no gateway, no browser, no tool search)',
					body: getSystemPrompt({}),
				},
				{
					file: 'read-only',
					label:
						'branchReadOnly: true — instance protected by source control settings; otherwise default',
					body: getSystemPrompt({ branchReadOnly: true }),
				},
				{
					file: 'computer-use-prompting',
					label:
						"localGateway disconnected with filesystem + browser capabilities — renders the 'install Computer Use' pitch and 'Browser Automation (Unavailable)' note",
					body: getSystemPrompt({
						webhookBaseUrl: 'https://your-instance.example.com',
						localGateway: {
							status: 'disconnected',
							capabilities: ['filesystem', 'browser'],
						},
						browserAvailable: false,
					}),
				},
				{
					file: 'gateway-no-browser',
					label:
						"localGateway connected, filesystemAccess: true, browserAvailable: false — renders 'Project Filesystem Access' and 'Browser Automation (Disabled in Computer Use)'",
					body: getSystemPrompt({
						webhookBaseUrl: 'https://your-instance.example.com',
						filesystemAccess: true,
						localGateway: { status: 'connected' },
						browserAvailable: false,
					}),
				},
			],
		},
		{
			folder: 'planner',
			displayName: 'Sub-Agent — Workflow Planner',
			source: 'src/tools/orchestration/plan-agent-prompt.ts → PLANNER_AGENT_PROMPT',
			variants: [{ file: 'prompt', body: PLANNER_AGENT_PROMPT }],
		},
		{
			folder: 'builder',
			displayName: 'Sub-Agent — Workflow Builder',
			source: 'src/tools/orchestration/build-workflow-agent.prompt.ts',
			variants: [
				{
					file: 'tool',
					label: 'tool mode (no sandbox) → BUILDER_AGENT_PROMPT',
					body: BUILDER_AGENT_PROMPT,
				},
				{
					file: 'sandbox',
					label: 'sandbox mode → createSandboxBuilderAgentPrompt(workspaceRoot: /workspace)',
					body: createSandboxBuilderAgentPrompt('/workspace'),
				},
			],
		},
		{
			folder: 'researcher',
			displayName: 'Sub-Agent — Web Researcher',
			source: 'src/tools/orchestration/research-agent-prompt.ts → RESEARCH_AGENT_PROMPT',
			variants: [{ file: 'prompt', body: RESEARCH_AGENT_PROMPT }],
		},
		{
			folder: 'data-table',
			displayName: 'Sub-Agent — Data Table Manager',
			source: 'src/tools/orchestration/data-table-agent.prompt.ts → DATA_TABLE_AGENT_PROMPT',
			variants: [{ file: 'prompt', body: DATA_TABLE_AGENT_PROMPT }],
		},
		{
			folder: 'browser-credential-setup',
			displayName: 'Sub-Agent — Browser Credential Setup',
			source:
				'src/tools/orchestration/browser-credential-setup.prompt.ts → buildBrowserAgentPrompt',
			variants: [
				{
					file: 'gateway',
					label: "source: 'gateway' (local gateway browser tools)",
					body: buildBrowserAgentPrompt('gateway'),
				},
				{
					file: 'chrome-mcp',
					label: "source: 'chrome-devtools-mcp' (Chrome DevTools MCP server)",
					body: buildBrowserAgentPrompt('chrome-devtools-mcp'),
				},
			],
		},
		{
			folder: 'delegate',
			displayName: 'Sub-Agent — Generic Delegate (template)',
			source: 'src/agent/sub-agent-factory.ts → buildSubAgentPrompt',
			variants: [
				{
					file: 'template',
					label:
						'placeholder role/instructions — orchestrator fills these per delegation at runtime',
					body: buildSubAgentPrompt(
						'<example-role>',
						'<example task instructions — orchestrator fills this in per delegation>',
						'UTC',
					),
				},
			],
		},
	];
}

function renderFile(agent: AgentEntry, variant: Variant): string {
	const header: string[] = [`# ${agent.displayName}`, '', `> Source: \`${agent.source}\``];
	if (variant.label) {
		header.push(`> Variant: ${variant.label}`);
	}
	header.push('', '---', '');
	return header.join('\n') + variant.body;
}

function main(): void {
	const { outDir } = parseArgs(process.argv);
	const agents = collectAgents();

	const written: Array<{ relPath: string; chars: number }> = [];
	for (const agent of agents) {
		const agentDir = join(outDir, agent.folder);
		mkdirSync(agentDir, { recursive: true });
		for (const variant of agent.variants) {
			const target = join(agentDir, `${variant.file}.md`);
			writeFileSync(target, renderFile(agent, variant), 'utf8');
			written.push({
				relPath: `${agent.folder}/${variant.file}.md`,
				chars: variant.body.length,
			});
		}
	}

	const longestName = Math.max(...written.map((w) => w.relPath.length));
	console.log(`Wrote ${written.length} prompts to ${outDir}`);
	for (const { relPath, chars } of written) {
		const padded = relPath.padEnd(longestName);
		console.log(`  ${padded}  ${chars.toLocaleString().padStart(7)} chars`);
	}
}

main();
