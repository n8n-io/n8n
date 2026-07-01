import { isRecord } from '@n8n/utils/is-record';
import { parse as parseYaml } from 'yaml';

import {
	RUNTIME_SKILL_FILE_NAME,
	type RuntimeSkill,
	type RuntimeSkillDependenciesContract,
	type RuntimeSkillInterfaceContract,
	type RuntimeSkillMcpServerDependency,
	type RuntimeSkillPolicyContract,
	type RuntimeSkillValidationError,
	type RuntimeSkillValidationResult,
} from './types';

export const RUNTIME_SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const RUNTIME_SKILL_FRONTMATTER_FIELDS = [
	'name',
	'description',
	'recommended_tools',
	'allowed_tools',
	'interface',
	'policy',
	'dependencies',
	'platforms',
	'version',
	'license',
	'compatibility',
	'metadata',
] as const;

export interface ParseRuntimeSkillMarkdownOptions {
	id?: string;
	sourceName?: string;
	path?: string;
	sourcePath?: string;
	directory?: string;
	sourceDirectory?: string;
	category?: string;
	metadata?: Record<string, unknown>;
	validateName?: boolean;
}

export function validateRuntimeSkill(skill: RuntimeSkill): RuntimeSkillValidationResult {
	const errors: RuntimeSkillValidationError[] = [];

	requiredString(skill.id, 'id', errors);
	requiredString(skill.name, 'name', errors);
	requiredString(skill.description, 'description', errors);
	requiredString(skill.instructions, 'instructions', errors);

	if (errors.length > 0) return { ok: false, errors };

	return { ok: true, skill };
}

export function parseRuntimeSkillMarkdown(
	content: string,
	options: ParseRuntimeSkillMarkdownOptions = {},
): RuntimeSkillValidationResult {
	const frontmatter = parseFrontmatter(
		content,
		options.sourcePath ?? options.path ?? RUNTIME_SKILL_FILE_NAME,
	);
	if (!frontmatter.ok) return frontmatter;

	const errors: RuntimeSkillValidationError[] = [];
	rejectUnknownFields(frontmatter.data, RUNTIME_SKILL_FRONTMATTER_FIELDS, undefined, errors);

	const name = requiredFrontmatterString(frontmatter.data, 'name', errors);
	if (name && (options.validateName ?? true) && !RUNTIME_SKILL_NAME_PATTERN.test(name)) {
		errors.push({
			code: 'invalid_name',
			message: `Invalid skill name "${name}"`,
			field: 'name',
			hint: 'Use lowercase letters, numbers, dots, underscores, or dashes; max length is 64.',
		});
	}

	const description = requiredFrontmatterString(frontmatter.data, 'description', errors);
	const recommendedTools = optionalStringArray(frontmatter.data, 'recommended_tools', errors);
	const allowedTools = optionalStringArray(frontmatter.data, 'allowed_tools', errors);
	const skillInterface = optionalSkillInterface(frontmatter.data, errors);
	const policy = optionalSkillPolicy(frontmatter.data, errors);
	const dependencies = optionalSkillDependencies(frontmatter.data, errors);
	const platforms = optionalStringArray(frontmatter.data, 'platforms', errors)?.map((platform) =>
		platform.toLowerCase(),
	);
	const version = optionalFrontmatterString(frontmatter.data, 'version', errors);
	const license = optionalFrontmatterString(frontmatter.data, 'license', errors);
	const compatibility = optionalFrontmatterString(frontmatter.data, 'compatibility', errors);
	const metadata = optionalFrontmatterRecord(frontmatter.data, 'metadata', errors);

	if (errors.length > 0 || !name || !description) return { ok: false, errors };

	return validateRuntimeSkill({
		id: options.id ?? name,
		name,
		description,
		instructions: frontmatter.body.trim(),
		...(options.sourceName ? { sourceName: options.sourceName } : {}),
		...(options.path ? { path: options.path } : {}),
		...(options.sourcePath ? { sourcePath: options.sourcePath } : {}),
		...(options.directory ? { directory: options.directory } : {}),
		...(options.sourceDirectory ? { sourceDirectory: options.sourceDirectory } : {}),
		...(options.category ? { category: options.category } : {}),
		...(recommendedTools ? { recommendedTools } : {}),
		...(allowedTools ? { allowedTools } : {}),
		...(skillInterface ? { interface: skillInterface } : {}),
		...(policy ? { policy } : {}),
		...(dependencies ? { dependencies } : {}),
		...(version ? { version } : {}),
		...(license ? { license } : {}),
		...(compatibility ? { compatibility } : {}),
		...(platforms ? { platforms } : {}),
		...((options.metadata ?? metadata)
			? { metadata: { ...(metadata ?? {}), ...(options.metadata ?? {}) } }
			: {}),
	});
}

function parseFrontmatter(
	content: string,
	sourcePath: string,
):
	| { ok: true; data: Record<string, unknown>; body: string }
	| { ok: false; errors: RuntimeSkillValidationError[] } {
	const lines = content.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		return {
			ok: false,
			errors: [
				{
					code: 'missing_frontmatter',
					message: `${RUNTIME_SKILL_FILE_NAME} must start with a YAML frontmatter delimiter`,
					path: sourcePath,
				},
			],
		};
	}

	const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
	if (endIndex === -1) {
		return {
			ok: false,
			errors: [
				{
					code: 'unterminated_frontmatter',
					message: `${RUNTIME_SKILL_FILE_NAME} frontmatter must end with a YAML delimiter`,
					path: sourcePath,
				},
			],
		};
	}

	let data: unknown;
	try {
		data = parseYaml(lines.slice(1, endIndex).join('\n'));
	} catch (error) {
		return {
			ok: false,
			errors: [
				{
					code: 'invalid_yaml',
					message: `${RUNTIME_SKILL_FILE_NAME} frontmatter YAML is invalid: ${
						error instanceof Error ? error.message : String(error)
					}`,
					path: sourcePath,
				},
			],
		};
	}

	if (!isRecord(data)) {
		return {
			ok: false,
			errors: [
				{
					code: 'frontmatter_not_object',
					message: `${RUNTIME_SKILL_FILE_NAME} frontmatter must be a YAML object`,
					path: sourcePath,
				},
			],
		};
	}

	return { ok: true, data, body: lines.slice(endIndex + 1).join('\n') };
}

function requiredString(
	value: unknown,
	field: string,
	errors: RuntimeSkillValidationError[],
	displayField = field,
): string | undefined {
	const normalized = optionalString(value);
	if (!normalized) {
		errors.push({
			code: 'missing_required_field',
			message: `Missing required field "${displayField}"`,
			field: displayField,
		});
	}
	return normalized;
}

function requiredFrontmatterString(
	frontmatter: Record<string, unknown>,
	field: string,
	errors: RuntimeSkillValidationError[],
	displayField = field,
): string | undefined {
	return requiredString(frontmatter[field], field, errors, displayField);
}

function optionalFrontmatterString(
	frontmatter: Record<string, unknown>,
	field: string,
	errors: RuntimeSkillValidationError[],
	displayField = field,
): string | undefined {
	const value = frontmatter[field];
	if (value === undefined || value === null) return undefined;

	const normalized = optionalString(value);
	if (!normalized) {
		errors.push({
			code: 'invalid_field',
			message: `Field "${displayField}" must be a non-empty string`,
			field: displayField,
		});
	}
	return normalized;
}

function optionalStringArray(
	frontmatter: Record<string, unknown>,
	field: string,
	errors: RuntimeSkillValidationError[],
	displayField = field,
): string[] | undefined {
	const value = frontmatter[field];
	if (value === undefined || value === null) return undefined;

	if (typeof value === 'string' && value.trim() !== '') return [value.trim()];

	if (!Array.isArray(value)) {
		errors.push({
			code: 'invalid_field',
			message: `Field "${displayField}" must be a string array`,
			field: displayField,
		});
		return undefined;
	}

	const strings = value
		.map((item) => optionalString(item))
		.filter((item): item is string => Boolean(item));

	if (strings.length !== value.length) {
		errors.push({
			code: 'invalid_field',
			message: `Field "${displayField}" must contain only non-empty strings`,
			field: displayField,
		});
	}

	return strings.length > 0 ? strings : undefined;
}

function optionalFrontmatterRecord(
	frontmatter: Record<string, unknown>,
	field: string,
	errors: RuntimeSkillValidationError[],
	displayField = field,
): Record<string, unknown> | undefined {
	const value = frontmatter[field];
	if (value === undefined || value === null) return undefined;
	if (!isRecord(value)) {
		errors.push({
			code: 'invalid_field',
			message: `Field "${displayField}" must be a YAML object`,
			field: displayField,
		});
		return undefined;
	}
	return value;
}

function optionalBoolean(
	frontmatter: Record<string, unknown>,
	field: string,
	errors: RuntimeSkillValidationError[],
	displayField = field,
): boolean | undefined {
	const value = frontmatter[field];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'boolean') {
		errors.push({
			code: 'invalid_field',
			message: `Field "${displayField}" must be a boolean`,
			field: displayField,
		});
		return undefined;
	}
	return value;
}

function optionalSkillInterface(
	frontmatter: Record<string, unknown>,
	errors: RuntimeSkillValidationError[],
): RuntimeSkillInterfaceContract | undefined {
	const value = optionalFrontmatterRecord(frontmatter, 'interface', errors);
	if (!value) return undefined;

	rejectUnknownFields(
		value,
		['display_name', 'short_description', 'default_prompt', 'icon', 'brand_color'],
		'interface',
		errors,
	);

	const displayName = optionalFrontmatterString(
		value,
		'display_name',
		errors,
		'interface.display_name',
	);
	const shortDescription = optionalFrontmatterString(
		value,
		'short_description',
		errors,
		'interface.short_description',
	);
	const defaultPrompt = optionalFrontmatterString(
		value,
		'default_prompt',
		errors,
		'interface.default_prompt',
	);
	const icon = optionalFrontmatterString(value, 'icon', errors, 'interface.icon');
	const brandColor = optionalFrontmatterString(
		value,
		'brand_color',
		errors,
		'interface.brand_color',
	);

	const skillInterface: RuntimeSkillInterfaceContract = {
		...(displayName ? { displayName } : {}),
		...(shortDescription ? { shortDescription } : {}),
		...(defaultPrompt ? { defaultPrompt } : {}),
		...(icon ? { icon } : {}),
		...(brandColor ? { brandColor } : {}),
	};

	return hasContractFields(skillInterface) ? skillInterface : undefined;
}

function optionalSkillPolicy(
	frontmatter: Record<string, unknown>,
	errors: RuntimeSkillValidationError[],
): RuntimeSkillPolicyContract | undefined {
	const value = optionalFrontmatterRecord(frontmatter, 'policy', errors);
	if (!value) return undefined;

	rejectUnknownFields(value, ['allow_implicit_invocation', 'product'], 'policy', errors);

	const allowImplicitInvocation = optionalBoolean(
		value,
		'allow_implicit_invocation',
		errors,
		'policy.allow_implicit_invocation',
	);
	const product = optionalFrontmatterString(value, 'product', errors, 'policy.product');
	const policy: RuntimeSkillPolicyContract = {
		...(allowImplicitInvocation !== undefined ? { allowImplicitInvocation } : {}),
		...(product ? { product } : {}),
	};

	return hasContractFields(policy) ? policy : undefined;
}

function optionalSkillDependencies(
	frontmatter: Record<string, unknown>,
	errors: RuntimeSkillValidationError[],
): RuntimeSkillDependenciesContract | undefined {
	const value = optionalFrontmatterRecord(frontmatter, 'dependencies', errors);
	if (!value) return undefined;

	rejectUnknownFields(value, ['tools', 'secrets', 'mcp_servers'], 'dependencies', errors);

	const tools = optionalStringArray(value, 'tools', errors, 'dependencies.tools');
	const secrets = optionalStringArray(value, 'secrets', errors, 'dependencies.secrets');
	const mcpServers = optionalMcpServers(value, errors);
	const dependencies: RuntimeSkillDependenciesContract = {
		...(tools ? { tools } : {}),
		...(secrets ? { secrets } : {}),
		...(mcpServers ? { mcpServers } : {}),
	};

	return hasContractFields(dependencies) ? dependencies : undefined;
}

function optionalMcpServers(
	frontmatter: Record<string, unknown>,
	errors: RuntimeSkillValidationError[],
): RuntimeSkillMcpServerDependency[] | undefined {
	const value = frontmatter.mcp_servers;
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value)) {
		errors.push({
			code: 'invalid_field',
			message: 'Field "dependencies.mcp_servers" must be an array',
			field: 'dependencies.mcp_servers',
		});
		return undefined;
	}

	const servers: RuntimeSkillMcpServerDependency[] = [];
	value.forEach((item, index) => {
		const field = `dependencies.mcp_servers[${index}]`;
		if (!isRecord(item)) {
			errors.push({
				code: 'invalid_field',
				message: `Field "${field}" must be a YAML object`,
				field,
			});
			return;
		}

		rejectUnknownFields(
			item,
			['name', 'description', 'transport', 'url', 'command'],
			field,
			errors,
		);

		const name = requiredFrontmatterString(item, 'name', errors, `${field}.name`);
		const description = optionalFrontmatterString(
			item,
			'description',
			errors,
			`${field}.description`,
		);
		const transport = optionalFrontmatterString(item, 'transport', errors, `${field}.transport`);
		const url = optionalFrontmatterString(item, 'url', errors, `${field}.url`);
		const command = optionalFrontmatterString(item, 'command', errors, `${field}.command`);
		if (!name) return;

		servers.push({
			name,
			...(description ? { description } : {}),
			...(transport ? { transport } : {}),
			...(url ? { url } : {}),
			...(command ? { command } : {}),
		});
	});

	return servers.length > 0 ? servers : undefined;
}

function rejectUnknownFields(
	value: Record<string, unknown>,
	allowedFields: readonly string[],
	fieldPrefix: string | undefined,
	errors: RuntimeSkillValidationError[],
): void {
	const allowed = new Set(allowedFields);
	for (const field of Object.keys(value)) {
		if (allowed.has(field)) continue;

		const nestedField = fieldPrefix ? `${fieldPrefix}.${field}` : field;
		errors.push({
			code: 'unknown_field',
			message: `Unknown field "${nestedField}"`,
			field: nestedField,
			hint: 'Use metadata for extension data outside the skill contract.',
		});
	}
}

function hasContractFields(value: object): boolean {
	return Object.keys(value).length > 0;
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
