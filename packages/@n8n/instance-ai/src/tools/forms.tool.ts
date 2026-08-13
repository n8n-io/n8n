/**
 * Forms tool — appearance/theming of form-trigger workflows.
 *
 * v1 is appearance-only: read a form node's current look (`describe`), learn the
 * theming surface (`list-appearance-options`), render a non-interactive preview
 * (`preview`), and apply a preset or custom overrides to node(s) behind an HITL
 * confirmation card (`apply-theme`). The action union and `InstanceAiFormService`
 * are shaped so field/structure editing can be added later without rework.
 *
 * Thin-tool rule: no business logic here — every read/write goes through
 * `context.formService`.
 */
import { Tool } from '@n8n/agents';
import {
	formAppearanceConfirmationSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import {
	applyFormThemePreset,
	assembleFormCss,
	FORM_CSS_VARIABLE_CONTROLS,
	FORM_CSS_VARIABLE_GROUPS,
	FORM_THEMES,
	resolveFormTheme,
	validateThemeOverrides,
} from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { FormNodeSummary, InstanceAiContext } from '../types';

// ── Preset descriptions (LLM-facing) ─────────────────────────────────────────
// One-line human descriptions per built-in preset id, so `list-appearance-options`
// teaches the model what each preset looks like.
const PRESET_DESCRIPTIONS: Record<string, string> = {
	light: 'Default light theme — white card on a near-white page',
	dark: 'Dark background with light text',
	dense: 'Reduced spacing and smaller headings, light background',
	compact: 'Narrow, tightly-spaced layout',
	compactDark: 'Compact layout on a dark background',
	enterprise: 'Formal corporate blue with near-square corners',
	enterpriseDark: 'Formal corporate look on a dark background',
	fun: 'Playful pink/purple with heavily rounded corners',
	funColorful: 'Bright, colorful and highly rounded',
};

// Human display names for preset ids (the id is a property name; the UI shows this).
const PRESET_LABELS: Record<string, string> = {
	light: 'Light',
	dark: 'Dark',
	dense: 'Dense',
	compact: 'Compact',
	compactDark: 'Compact Dark',
	enterprise: 'Enterprise',
	enterpriseDark: 'Enterprise Dark',
	fun: 'Fun',
	funColorful: 'Fun Colorful',
};

/** Display label for a preset id: proper name, "Custom theme", or the id as a fallback. */
function presetLabel(id: string): string {
	if (id === 'custom') return 'Custom theme';
	return PRESET_LABELS[id] ?? id;
}

// Shared field descriptions must be identical across the discriminated union
// (the MCP-schema sanitizer merges same-named fields and rejects conflicts).
const WORKFLOW_ID_DESC = 'ID of the workflow containing the form node(s)';
const NODE_NAME_DESC =
	"Form node name. Omit to use the Form Trigger (or first form node). For apply-theme this is the target when scope='node' and is ignored when scope='workflow'.";
const PRESET_DESC = 'Built-in theme preset id (e.g. "dark"). Mutually exclusive with overrides.';
const OVERRIDES_DESC =
	'Custom CSS-variable overrides map (e.g. {"--color-background":"#101010"}). Mutually exclusive with preset.';

// ── Action schemas ───────────────────────────────────────────────────────────

const describeAction = z.object({
	action: z
		.literal('describe')
		.describe(
			"Read a form node's current theme/appearance (resolved CSS overrides, matched preset, attribution) before changing it. Also lists the workflow's form nodes.",
		),
	workflowId: z.string().describe(WORKFLOW_ID_DESC),
	nodeName: z.string().optional().describe(NODE_NAME_DESC),
});

const listAppearanceOptionsAction = z.object({
	action: z
		.literal('list-appearance-options')
		.describe(
			'List built-in themes and the editable CSS-variable catalog (variable, type, group, default, description). Call this before creating a custom theme so you compose overrides from valid variable names and values.',
		),
});

const previewAction = z.object({
	action: z
		.literal('preview')
		.describe(
			'Show the user what a form looks like, non-interactively (e.g. before/after a restyle). Omit nodeName to preview EVERY form step (the whole form); pass nodeName to preview a single step. Optionally pass a preset or overrides to preview a proposed look before applying it. Does not modify the workflow.',
		),
	workflowId: z.string().describe(WORKFLOW_ID_DESC),
	nodeName: z.string().optional().describe(NODE_NAME_DESC),
	preset: z.string().optional().describe(PRESET_DESC),
	overrides: z.record(z.string()).optional().describe(OVERRIDES_DESC),
});

const applyThemeAction = z.object({
	action: z
		.literal('apply-theme')
		.describe(
			'Apply a built-in theme or a custom set of CSS overrides to form node(s). Requires user confirmation: suspends an approval card showing the rendered preview, then writes the CSS on approval. Provide EXACTLY ONE of `preset` or `overrides`. To create a theme from a vague description (mood/brand/style), FIRST call list-appearance-options, compose `overrides` from that catalog, optionally `preview`, then apply. If the overrides are rejected, fix the reported values and retry.',
		),
	workflowId: z.string().describe(WORKFLOW_ID_DESC),
	scope: z
		.enum(['node', 'workflow'])
		.describe("'node' targets a single form node; 'workflow' targets every form node."),
	nodeName: z.string().optional().describe(NODE_NAME_DESC),
	preset: z.string().optional().describe(PRESET_DESC),
	overrides: z.record(z.string()).optional().describe(OVERRIDES_DESC),
});

const actionUnion = z.discriminatedUnion('action', [
	describeAction,
	listAppearanceOptionsAction,
	previewAction,
	applyThemeAction,
]);

const inputSchema = sanitizeInputSchema(actionUnion);

type Input = z.infer<typeof actionUnion>;

// ── Suspend / resume schemas ─────────────────────────────────────────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	formAppearance: formAppearanceConfirmationSchema,
});

const resumeSchema = z.object({
	approved: z.boolean(),
});

interface FormsToolContext {
	resumeData: z.infer<typeof resumeSchema> | undefined;
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve the CSS-variable overrides an apply/preview request describes. */
function resolveOverrides(input: {
	preset?: string;
	overrides?: Record<string, string>;
}):
	| { ok: true; overrides: Record<string, string>; preset?: string; themeLabel: string }
	| {
			ok: false;
			error: string;
			errors?: Array<{ variable: string; value: string; reason: string }>;
	  } {
	const hasPreset = typeof input.preset === 'string' && input.preset.length > 0;
	const hasOverrides = input.overrides !== undefined && Object.keys(input.overrides).length > 0;

	if (hasPreset && hasOverrides) {
		return { ok: false, error: 'Provide exactly one of `preset` or `overrides`, not both.' };
	}

	if (hasPreset) {
		const overrides = applyFormThemePreset(input.preset!);
		if (!overrides) {
			return {
				ok: false,
				error: `Unknown preset "${input.preset!}". Call list-appearance-options for valid preset ids.`,
			};
		}
		return { ok: true, overrides, preset: input.preset, themeLabel: presetLabel(input.preset!) };
	}

	if (hasOverrides) {
		const result = validateThemeOverrides(input.overrides!);
		if (!result.valid) {
			return {
				ok: false,
				error:
					'Some overrides are invalid. Fix the values below and retry — do not write them to the node.',
				errors: result.errors,
			};
		}
		const matched = resolveFormTheme(result.overrides);
		return {
			ok: true,
			overrides: result.overrides,
			themeLabel: presetLabel(matched),
		};
	}

	return { ok: false, error: 'Provide either `preset` or `overrides`.' };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleDescribe(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'describe' }>,
) {
	const [node, formNodes, workflowName] = await Promise.all([
		context.formService.getFormNode(input.workflowId, input.nodeName),
		context.formService.listFormNodes(input.workflowId),
		context.formService.getWorkflowName(input.workflowId),
	]);

	if (!node) {
		return {
			workflowId: input.workflowId,
			workflowName,
			found: false as const,
			formNodes,
			hint:
				formNodes.length > 0
					? 'That node was not found. Pick a form node from `formNodes`.'
					: 'This workflow has no Form Trigger or Form nodes.',
		};
	}

	return {
		workflowId: input.workflowId,
		workflowName,
		node: {
			nodeName: node.nodeName,
			nodeType: node.nodeType,
			preset: node.preset,
			overrides: node.overrides,
			appendAttribution: node.appendAttribution,
		},
		formNodes,
	};
}

function handleListAppearanceOptions() {
	return {
		presets: FORM_THEMES.map((theme) => ({
			id: theme.id,
			description: PRESET_DESCRIPTIONS[theme.id] ?? '',
		})),
		groups: FORM_CSS_VARIABLE_GROUPS,
		variables: FORM_CSS_VARIABLE_CONTROLS.map((control) => ({
			variable: control.variable,
			type: control.type,
			group: control.group,
			default: control.default,
			description: control.description,
		})),
	};
}

async function handlePreview(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'preview' }>,
) {
	const [formNodes, workflowName] = await Promise.all([
		context.formService.listFormNodes(input.workflowId),
		context.formService.getWorkflowName(input.workflowId),
	]);
	if (formNodes.length === 0) {
		return {
			workflowId: input.workflowId,
			workflowName,
			found: false as const,
			formNodes,
			hint: 'This workflow has no Form Trigger or Form nodes.',
		};
	}

	// A proposed preset/overrides is optional — without one we render the saved
	// look. When present it applies to every previewed step.
	let customCss: string | undefined;
	let themeLabel: string | undefined;
	let preset: string | undefined;
	if (input.preset !== undefined || input.overrides !== undefined) {
		const resolved = resolveOverrides(input);
		if (!resolved.ok) {
			return { workflowId: input.workflowId, ...resolved };
		}
		customCss = assembleFormCss(resolved.overrides);
		themeLabel = resolved.themeLabel;
		preset = resolved.preset;
	}

	// A named node previews just that step; otherwise preview EVERY form step.
	let targets: FormNodeSummary[];
	if (input.nodeName) {
		const target = formNodes.find((n) => n.nodeName === input.nodeName);
		if (!target) {
			return {
				workflowId: input.workflowId,
				workflowName,
				found: false as const,
				formNodes,
				hint: 'That node was not found. Pick a form node from `formNodes`.',
			};
		}
		targets = [target];
	} else {
		targets = formNodes;
	}

	const previews = await Promise.all(
		targets.map(async (n) => ({
			nodeName: n.nodeName,
			// A proposed theme labels every step the same; otherwise show each
			// step's own current theme (display name).
			themeLabel: themeLabel ?? presetLabel(n.preset),
			previewHtml: await context.formService.renderPreview(input.workflowId, {
				nodeName: n.nodeName,
				...(customCss !== undefined ? { customCss } : {}),
			}),
		})),
	);

	return { workflowId: input.workflowId, workflowName, ...(preset ? { preset } : {}), previews };
}

async function handleApplyTheme(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'apply-theme' }>,
	ctx: FormsToolContext,
) {
	if (context.permissions?.updateWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const resolved = resolveOverrides(input);
	if (!resolved.ok) {
		// Validation failures return to the model so it can self-correct — no suspend.
		return { success: false, workflowId: input.workflowId, ...resolved };
	}

	// Resolve the target node(s).
	const [formNodes, workflowName] = await Promise.all([
		context.formService.listFormNodes(input.workflowId),
		context.formService.getWorkflowName(input.workflowId),
	]);
	if (formNodes.length === 0) {
		return {
			success: false,
			workflowId: input.workflowId,
			error: 'This workflow has no Form Trigger or Form nodes.',
		};
	}

	let targetNodeNames: string[];
	if (input.scope === 'workflow') {
		targetNodeNames = formNodes.map((n) => n.nodeName);
	} else {
		const target = input.nodeName
			? formNodes.find((n) => n.nodeName === input.nodeName)
			: (formNodes.find((n) => n.isTrigger) ?? formNodes[0]);
		if (!target) {
			return {
				success: false,
				workflowId: input.workflowId,
				error: `Form node "${input.nodeName ?? ''}" not found.`,
				formNodes,
			};
		}
		targetNodeNames = [target.nodeName];
	}

	const customCss = assembleFormCss(resolved.overrides);
	const previewNodeName = targetNodeNames[0];

	// First call — render preview and suspend the confirmation card.
	const { resumeData } = ctx;
	if (resumeData === undefined || resumeData === null) {
		const previewHtml = await context.formService.renderPreview(input.workflowId, {
			nodeName: previewNodeName,
			customCss,
		});
		const scopeLabel =
			input.scope === 'workflow'
				? `all ${targetNodeNames.length} form node(s)`
				: `"${previewNodeName}"`;
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Apply ${resolved.themeLabel} to ${scopeLabel}?`,
			severity: 'info',
			formAppearance: {
				workflowId: input.workflowId,
				...(input.scope === 'node' ? { nodeName: previewNodeName } : {}),
				scope: input.scope,
				previewHtml,
				...(resolved.preset ? { preset: resolved.preset } : {}),
				themeLabel: resolved.themeLabel,
			},
		});
	}

	// Denied.
	if (!resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	// Approved — write to the target node(s).
	try {
		const { updatedNodeNames } = await context.formService.applyAppearance(input.workflowId, {
			nodeNames: targetNodeNames,
			customCss,
			appendAttribution: true,
		});
		return {
			success: true,
			workflowId: input.workflowId,
			workflowName,
			scope: input.scope,
			themeLabel: resolved.themeLabel,
			updatedNodeNames,
		};
	} catch (error) {
		return {
			success: false,
			workflowId: input.workflowId,
			error: error instanceof Error ? error.message : 'Failed to apply appearance',
		};
	}
}

// ── Tool factory ─────────────────────────────────────────────────────────────

export function createFormsTool(context: InstanceAiContext) {
	return new Tool('forms')
		.description(
			'Preview and restyle/theme form-trigger workflows (Form Trigger + Form nodes). Appearance only — colors, fonts, spacing and themes — not field or logic editing (yet). Actions: describe (read current theme), list-appearance-options (themes + CSS variable catalog), preview (show a form, non-interactive), apply-theme (apply a preset or custom overrides, with approval).',
		)
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (input, ctx) => {
			const formInput = input as Input;
			switch (formInput.action) {
				case 'describe':
					return await handleDescribe(context, formInput);
				case 'list-appearance-options':
					return handleListAppearanceOptions();
				case 'preview':
					return await handlePreview(context, formInput);
				case 'apply-theme':
					return await handleApplyTheme(context, formInput, ctx);
				default:
					return { error: `Unknown action: ${(formInput as { action: string }).action}` };
			}
		})
		.build();
}
