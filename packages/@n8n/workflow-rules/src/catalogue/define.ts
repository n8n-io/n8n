import type { z } from 'zod';

import type {
	FindingSeverity,
	RawFinding,
	RuleCategory,
	RuleContext,
	RuleWorkflow,
} from '../types';

export interface CatalogueRuleDefinition<Options> {
	readonly id: string;
	readonly category: RuleCategory;
	/** English title and description for the API and the CLI. The editor uses i18n keys. */
	readonly title: string;
	readonly description: string;
	readonly defaultSeverity: FindingSeverity;
	/** Shape only. Merged options must still parse, so put admin-only limits in `validate`. */
	readonly optionsSchema: z.ZodType<Options, z.ZodTypeDef, unknown>;
	/** Checks what an admin typed, such as "add at least one domain". */
	readonly validate?: (options: Options) => string | undefined;
	/** True when the rule needs node type descriptions, which the offline CLI does not have. */
	readonly needsNodeTypes?: boolean;
	/** Combines instance and project options for a rule that projects may only tighten. */
	readonly tightenOptions?: (instance: Options, project: Options) => Options;
	readonly evaluate: (workflow: RuleWorkflow, options: Options, ctx: RuleContext) => RawFinding[];
}

/** A catalogue rule with its option type erased, so rules of different shapes share one list. */
export interface CatalogueRule {
	readonly id: string;
	readonly category: RuleCategory;
	readonly title: string;
	readonly description: string;
	readonly defaultSeverity: FindingSeverity;
	readonly needsNodeTypes: boolean;
	readonly defaultOptions: unknown;
	/** Returns an error message, or `undefined` when the options are valid. */
	validateOptions(raw: unknown): string | undefined;
	tighten(instance: unknown, project: unknown): unknown;
	evaluate(workflow: RuleWorkflow, rawOptions: unknown, ctx: RuleContext): RawFinding[];
}

export function defineCatalogueRule<Options>(
	definition: CatalogueRuleDefinition<Options>,
): CatalogueRule {
	const parse = (raw: unknown): Options => definition.optionsSchema.parse(raw ?? {});
	const defaultOptions = parse({});

	return {
		id: definition.id,
		category: definition.category,
		title: definition.title,
		description: definition.description,
		defaultSeverity: definition.defaultSeverity,
		needsNodeTypes: definition.needsNodeTypes ?? false,
		defaultOptions,
		validateOptions(raw) {
			const result = definition.optionsSchema.safeParse(raw ?? {});
			if (!result.success) {
				return result.error.issues
					.map((issue) => [issue.path.join('.'), issue.message].filter(Boolean).join(': '))
					.join('; ');
			}
			return definition.validate?.(result.data);
		},
		tighten(instance, project) {
			const instanceOptions = parse(instance);
			const projectOptions = parse(project);
			return definition.tightenOptions
				? definition.tightenOptions(instanceOptions, projectOptions)
				: instanceOptions;
		},
		evaluate(workflow, rawOptions, ctx) {
			return definition.evaluate(workflow, parse(rawOptions), ctx);
		},
	};
}
