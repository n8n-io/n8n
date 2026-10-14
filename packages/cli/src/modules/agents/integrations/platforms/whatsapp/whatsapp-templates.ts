import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';

import type { WhatsAppTemplateComponent } from '@chat-adapter/whatsapp';

import { numberProperty, stringProperty } from '../../integration-helpers';

/**
 * The only template category the agent can see or send. Utility templates are
 * tied to something the customer already started (an order, a booking), so a
 * wrong pick is far less likely to be reported as spam than a Marketing one,
 * and a low quality rating gets the number rate-limited.
 */
export const WHATSAPP_AGENT_TEMPLATE_CATEGORY = 'UTILITY';

const TEMPLATE_FIELDS = 'name,language,status,category,parameter_format,components';

const TEMPLATE_PAGE_SIZE = '100';

/** Meta's error codes for a token that lacks a permission on the account. */
const PERMISSION_ERROR_CODES = new Set([3, 10, 200]);

const PLACEHOLDER = /\{\{\s*([^{}\s]+)\s*\}\}/g;

/** Meta rejects a parameter with a newline, a tab, or more than 4 spaces in a row. */
const INVALID_PARAMETER_TEXT = /[\n\t]| {5,}/;

/** A raw Graph API answer. A refusal comes back as a status, not a throw. */
export interface WhatsAppGraphResponse {
	statusCode: number;
	body: unknown;
}

export type WhatsAppTemplateQuery = Record<string, string>;

/** Reads the message templates of the business account the channel is connected to. */
export type FetchWhatsAppTemplates = (qs: WhatsAppTemplateQuery) => Promise<WhatsAppGraphResponse>;

/** An approved template in a shape the agent can choose from. */
export interface WhatsAppAgentTemplate {
	name: string;
	language: string;
	category: string;
	header?: string;
	body: string;
	footer?: string;
	/** Placeholder names in the body, in order: `1`, `2`, … or names such as `first_name`. */
	parameters: string[];
}

interface ParsedTemplate extends WhatsAppAgentTemplate {
	parameterFormat: 'POSITIONAL' | 'NAMED';
}

export async function listWhatsAppTemplates(
	fetchTemplates: FetchWhatsAppTemplates,
	input: { cursor?: string },
): Promise<{ templates: WhatsAppAgentTemplate[]; nextCursor?: string }> {
	const body = await requestTemplates(fetchTemplates, {
		limit: TEMPLATE_PAGE_SIZE,
		...(input.cursor ? { after: input.cursor } : {}),
	});
	const nextCursor = hasNextPage(body) ? afterCursor(body) : undefined;
	return {
		templates: parseTemplates(body).map(toAgentTemplate),
		...(nextCursor ? { nextCursor } : {}),
	};
}

/**
 * Builds the components for one send, after it checks the template against
 * the account. The agent only names a template, so this is also where a
 * template outside {@link WHATSAPP_AGENT_TEMPLATE_CATEGORY} is refused.
 */
export async function buildWhatsAppTemplateMessage(
	fetchTemplates: FetchWhatsAppTemplates,
	input: { templateName: string; language: string; parameters?: Record<string, string> },
): Promise<{ name: string; language: string; components?: WhatsAppTemplateComponent[] }> {
	// Meta matches `name` loosely, so the exact match is made here.
	const body = await requestTemplates(fetchTemplates, {
		name: input.templateName,
		language: input.language,
		limit: TEMPLATE_PAGE_SIZE,
	});
	const template = parseTemplates(body).find(
		(candidate) => candidate.name === input.templateName && candidate.language === input.language,
	);
	if (!template) {
		throw new UserError(
			`There is no approved ${WHATSAPP_AGENT_TEMPLATE_CATEGORY.toLowerCase()} template named "${input.templateName}" in language "${input.language}" that this agent can send. Call list_templates to see the templates you can use.`,
		);
	}

	const values = input.parameters ?? {};
	const missing = template.parameters.filter((name) => !values[name]?.trim());
	if (missing.length > 0) {
		throw new UserError(
			`The template "${template.name}" needs a value for these placeholders: ${missing.join(', ')}.`,
		);
	}
	const unknown = Object.keys(values).filter((name) => !template.parameters.includes(name));
	if (unknown.length > 0) {
		throw new UserError(
			`The template "${template.name}" has no placeholders named: ${unknown.join(', ')}.`,
		);
	}
	const invalid = template.parameters.filter((name) => INVALID_PARAMETER_TEXT.test(values[name]));
	if (invalid.length > 0) {
		throw new UserError(
			`WhatsApp does not accept new lines, tabs, or more than 4 spaces in a row in a template value. Change the value for: ${invalid.join(', ')}.`,
		);
	}

	if (template.parameters.length === 0) {
		return { name: template.name, language: template.language };
	}
	const parameters = template.parameters.map((name) => ({
		type: 'text' as const,
		text: values[name],
		// Named templates match each value by its name, not by its position.
		...(template.parameterFormat === 'NAMED' ? { parameter_name: name } : {}),
	}));
	return {
		name: template.name,
		language: template.language,
		components: [{ type: 'body', parameters }],
	};
}

async function requestTemplates(
	fetchTemplates: FetchWhatsAppTemplates,
	qs: WhatsAppTemplateQuery,
): Promise<unknown> {
	const response = await fetchTemplates({
		fields: TEMPLATE_FIELDS,
		status: 'APPROVED',
		category: WHATSAPP_AGENT_TEMPLATE_CATEGORY,
		...qs,
	});
	if (response.statusCode === 200) return response.body;

	const error = isRecord(response.body) ? response.body.error : undefined;
	const code = numberProperty(error, 'code');
	if (response.statusCode === 403 || (code !== undefined && PERMISSION_ERROR_CODES.has(code))) {
		throw new UserError(
			'The WhatsApp access token cannot read message templates. Give the system user token the whatsapp_business_management permission in Meta Business Settings, then try again.',
		);
	}
	throw new OperationalError(
		`WhatsApp did not return the message templates (status ${response.statusCode}${code !== undefined ? `, code ${code}` : ''}).`,
	);
}

function parseTemplates(body: unknown): ParsedTemplate[] {
	const data = isRecord(body) && Array.isArray(body.data) ? body.data : [];
	return data
		.map(parseTemplate)
		.filter((template): template is ParsedTemplate => template !== undefined);
}

/**
 * `undefined` for a template the agent cannot fill. Only body placeholders
 * are supported: a media header, a header placeholder, or a button that takes
 * a value would make Meta reject the send.
 */
function parseTemplate(raw: unknown): ParsedTemplate | undefined {
	const name = stringProperty(raw, 'name');
	const language = stringProperty(raw, 'language');
	const category = stringProperty(raw, 'category');
	if (!name || !language || !category || stringProperty(raw, 'status') !== 'APPROVED') {
		return undefined;
	}
	if (category !== WHATSAPP_AGENT_TEMPLATE_CATEGORY) return undefined;

	const components = isRecord(raw) && Array.isArray(raw.components) ? raw.components : [];
	let header: string | undefined;
	let body: string | undefined;
	let footer: string | undefined;
	for (const component of components) {
		const type = stringProperty(component, 'type');
		const text = stringProperty(component, 'text');
		if (type === 'HEADER') {
			if (stringProperty(component, 'format') !== 'TEXT' || !text) return undefined;
			if (placeholdersIn(text).length > 0) return undefined;
			header = text;
		} else if (type === 'BODY') {
			body = text;
		} else if (type === 'FOOTER') {
			footer = text;
		} else if (type === 'BUTTONS') {
			if (!buttonsNeedNoValues(component)) return undefined;
		} else {
			return undefined;
		}
	}
	if (!body) return undefined;

	const parameterFormat =
		stringProperty(raw, 'parameter_format') === 'NAMED' ? 'NAMED' : 'POSITIONAL';
	const parameters = placeholdersIn(body);
	// Positional values are matched by their number, whatever order the text uses.
	if (parameterFormat === 'POSITIONAL') parameters.sort((a, b) => Number(a) - Number(b));
	return {
		name,
		language,
		category,
		...(header ? { header } : {}),
		body,
		...(footer ? { footer } : {}),
		parameters,
		parameterFormat,
	};
}

function toAgentTemplate({
	parameterFormat: _,
	...template
}: ParsedTemplate): WhatsAppAgentTemplate {
	return template;
}

/** Quick replies, phone numbers, and fixed links send as they are. */
function buttonsNeedNoValues(component: unknown): boolean {
	const buttons = isRecord(component) && Array.isArray(component.buttons) ? component.buttons : [];
	return buttons.every((button: unknown) => {
		const type = stringProperty(button, 'type');
		if (type === 'QUICK_REPLY' || type === 'PHONE_NUMBER') return true;
		if (type === 'URL') return placeholdersIn(stringProperty(button, 'url') ?? '').length === 0;
		return false;
	});
}

/** Unique placeholder names, in the order they first appear. */
function placeholdersIn(text: string): string[] {
	const names = [...text.matchAll(PLACEHOLDER)].map((match) => match[1]);
	return [...new Set(names)];
}

function hasNextPage(body: unknown): boolean {
	return isRecord(body) && isRecord(body.paging) && typeof body.paging.next === 'string';
}

function afterCursor(body: unknown): string | undefined {
	const paging = isRecord(body) ? body.paging : undefined;
	const cursors = isRecord(paging) ? paging.cursors : undefined;
	return stringProperty(cursors, 'after');
}
