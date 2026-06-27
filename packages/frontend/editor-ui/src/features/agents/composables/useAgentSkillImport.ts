import { parse as parseYaml } from 'yaml';
import {
	AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_BYTES,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

import type { AgentSkill, AgentSkillReference } from '../types';

const SKILL_FILE_NAME = 'SKILL.md';
const FRONTMATTER_DELIMITER = '---';

export class AgentSkillImportError extends Error {
	constructor(readonly i18nKey: BaseTextKey) {
		super(i18nKey);
	}
}

type SkillFrontmatter = {
	name?: unknown;
	description?: unknown;
	allowed_tools?: unknown;
	recommended_tools?: unknown;
	interface?: unknown;
	policy?: unknown;
	dependencies?: unknown;
	version?: unknown;
	license?: unknown;
	compatibility?: unknown;
	platforms?: unknown;
	metadata?: unknown;
};

export function useAgentSkillImport() {
	async function importSkillFiles(files: File[]): Promise<AgentSkill> {
		if (files.length === 0) {
			throw new AgentSkillImportError('agents.builder.skills.import.noFiles');
		}

		const fileEntries = files.map((file) => ({
			file,
			path: normalizePath(file.webkitRelativePath || file.name),
		}));
		const skillFile = findSkillFile(fileEntries);
		if (!skillFile) {
			throw new AgentSkillImportError('agents.builder.skills.import.missingSkillFile');
		}

		const skillDir = skillFile.path.slice(0, -SKILL_FILE_NAME.length).replace(/\/$/, '');
		const skillContent = await readFileText(skillFile.file);
		const parsed = parseSkillMarkdown(skillContent);
		const references: AgentSkillReference[] = [];
		const seenPaths = new Set<string>();
		let totalReferenceBytes = 0;

		for (const entry of fileEntries) {
			if (entry === skillFile) continue;
			const relativePath = pathRelativeToSkillDir(entry.path, skillDir);
			if (!relativePath) continue;
			if (relativePath === SKILL_FILE_NAME) continue;
			if (relativePath.startsWith('scripts/')) {
				throw new AgentSkillImportError('agents.builder.skills.import.scriptsUnsupported');
			}
			if (!relativePath.startsWith('references/')) continue;
			if (!isMarkdownPath(relativePath)) {
				throw new AgentSkillImportError('agents.builder.skills.import.referenceMarkdownOnly');
			}
			if (seenPaths.has(relativePath)) {
				throw new AgentSkillImportError('agents.builder.skills.import.duplicateReference');
			}
			if (references.length >= AGENT_SKILL_REFERENCE_MAX_COUNT) {
				throw new AgentSkillImportError('agents.builder.skills.import.tooManyReferences');
			}
			if (entry.file.size > AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES) {
				throw new AgentSkillImportError('agents.builder.skills.import.referenceTooLarge');
			}
			seenPaths.add(relativePath);

			const content = await readFileText(entry.file);
			const bytes = new TextEncoder().encode(content).byteLength;
			if (bytes > AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES) {
				throw new AgentSkillImportError('agents.builder.skills.import.referenceTooLarge');
			}
			totalReferenceBytes += bytes;
			if (totalReferenceBytes > AGENT_SKILL_REFERENCES_TOTAL_MAX_BYTES) {
				throw new AgentSkillImportError('agents.builder.skills.import.referencesTooLarge');
			}
			references.push({
				path: relativePath,
				content,
				bytes,
				sha256: await sha256(content),
			});
		}

		return {
			...parsed,
			allowedTools: parsed.allowedTools,
			recommendedTools: parsed.recommendedTools,
			interface: parsed.interface,
			policy: parsed.policy,
			dependencies: parsed.dependencies,
			version: parsed.version,
			license: parsed.license,
			compatibility: parsed.compatibility,
			platforms: parsed.platforms,
			metadata: parsed.metadata,
			references: references.length > 0 ? references : undefined,
		};
	}

	return { importSkillFiles };
}

function findSkillFile(entries: Array<{ file: File; path: string }>) {
	return entries.find(
		(entry) => entry.path === SKILL_FILE_NAME || entry.path.endsWith(`/${SKILL_FILE_NAME}`),
	);
}

function pathRelativeToSkillDir(path: string, skillDir: string): string | null {
	if (!skillDir) return path;
	if (!path.startsWith(`${skillDir}/`)) return null;
	return path.slice(skillDir.length + 1);
}

function parseSkillMarkdown(content: string): AgentSkill {
	const lines = content.split(/\r?\n/);
	if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
		throw new AgentSkillImportError('agents.builder.skills.import.missingFrontmatter');
	}
	const endIndex = lines.findIndex(
		(line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER,
	);
	if (endIndex === -1) {
		throw new AgentSkillImportError('agents.builder.skills.import.invalidFrontmatter');
	}

	const data = parseYaml(lines.slice(1, endIndex).join('\n')) as SkillFrontmatter | null;
	if (!data || typeof data !== 'object') {
		throw new AgentSkillImportError('agents.builder.skills.import.invalidFrontmatter');
	}

	const name = readRequiredString(data.name, 'name');
	const description = readRequiredString(data.description, 'description');
	const instructions = lines
		.slice(endIndex + 1)
		.join('\n')
		.trim();
	if (!instructions) {
		throw new AgentSkillImportError('agents.builder.skills.validation.instructionsRequired');
	}

	return {
		name,
		description,
		instructions,
		...optionalStringArrayField('allowedTools', data.allowed_tools),
		...optionalStringArrayField('recommendedTools', data.recommended_tools),
		...optionalInterface(data.interface),
		...optionalPolicy(data.policy),
		...optionalDependencies(data.dependencies),
		...optionalStringField('version', data.version),
		...optionalStringField('license', data.license),
		...optionalStringField('compatibility', data.compatibility),
		...optionalStringArrayField('platforms', data.platforms),
		...(isRecord(data.metadata) ? { metadata: data.metadata } : {}),
	};
}

function readRequiredString(value: unknown, field: 'name' | 'description'): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new AgentSkillImportError(
			field === 'name'
				? 'agents.builder.skills.import.missingName'
				: 'agents.builder.skills.import.missingDescription',
		);
	}
	return value.trim();
}

function optionalStringField(field: 'version' | 'license' | 'compatibility', value: unknown) {
	return typeof value === 'string' && value.trim() ? { [field]: value.trim() } : {};
}

function optionalStringArrayField(
	field: 'allowedTools' | 'recommendedTools' | 'platforms',
	value: unknown,
) {
	if (typeof value === 'string' && value.trim()) return { [field]: [value.trim()] };
	if (!Array.isArray(value)) return {};
	const strings = value.filter(
		(item): item is string => typeof item === 'string' && Boolean(item.trim()),
	);
	return strings.length > 0 ? { [field]: strings.map((item) => item.trim()) } : {};
}

function optionalInterface(value: unknown): Pick<AgentSkill, 'interface'> | {} {
	if (!isRecord(value)) return {};
	const interfaceData: AgentSkill['interface'] = {
		...optionalStringProperty('displayName', value.display_name),
		...optionalStringProperty('shortDescription', value.short_description),
		...optionalStringProperty('defaultPrompt', value.default_prompt),
		...optionalStringProperty('icon', value.icon),
		...optionalStringProperty('brandColor', value.brand_color),
	};
	return Object.keys(interfaceData).length > 0 ? { interface: interfaceData } : {};
}

function optionalPolicy(value: unknown): Pick<AgentSkill, 'policy'> | {} {
	if (!isRecord(value)) return {};
	const policy: AgentSkill['policy'] = {
		...(typeof value.allow_implicit_invocation === 'boolean'
			? { allowImplicitInvocation: value.allow_implicit_invocation }
			: {}),
		...optionalStringProperty('product', value.product),
	};
	return Object.keys(policy).length > 0 ? { policy } : {};
}

function optionalDependencies(value: unknown): Pick<AgentSkill, 'dependencies'> | {} {
	if (!isRecord(value)) return {};
	const mcpServers = Array.isArray(value.mcp_servers)
		? value.mcp_servers.filter(isRecord).flatMap((server) => {
				if (typeof server.name !== 'string' || !server.name.trim()) return [];
				return [
					{
						name: server.name.trim(),
						...optionalStringProperty('description', server.description),
						...optionalStringProperty('transport', server.transport),
						...optionalStringProperty('url', server.url),
						...optionalStringProperty('command', server.command),
					},
				];
			})
		: [];
	const dependencies: AgentSkill['dependencies'] = {
		...optionalStringArrayProperty('tools', value.tools),
		...optionalStringArrayProperty('secrets', value.secrets),
		...(mcpServers.length > 0 ? { mcpServers } : {}),
	};
	return Object.keys(dependencies).length > 0 ? { dependencies } : {};
}

function optionalStringProperty<T extends string>(
	field: T,
	value: unknown,
): Partial<Record<T, string>> {
	return typeof value === 'string' && value.trim()
		? ({ [field]: value.trim() } as Partial<Record<T, string>>)
		: {};
}

function optionalStringArrayProperty<T extends string>(
	field: T,
	value: unknown,
): Partial<Record<T, string[]>> {
	if (!Array.isArray(value)) return {};
	const strings = value.filter(
		(item): item is string => typeof item === 'string' && Boolean(item.trim()),
	);
	return strings.length > 0
		? ({ [field]: strings.map((item) => item.trim()) } as Partial<Record<T, string[]>>)
		: {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePath(path: string): string {
	return path.replaceAll('\\', '/').replace(/^\/+/, '');
}

function isMarkdownPath(path: string): boolean {
	return path.endsWith('.md') || path.endsWith('.markdown');
}

async function sha256(content: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readFileText(file: File): Promise<string> {
	if (typeof file.text === 'function') return await file.text();
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
		reader.readAsText(file);
	});
}
