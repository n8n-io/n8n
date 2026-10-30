// Node type description types and helpers that the type and Zod schema generators share.

import { checkConditions } from '../validation/display-options';

// Discriminator fields that create operation-specific parameter sets
// Only fields that truly benefit from splitting the type are included here
// Other fields like authentication, trigger, agent, promptType are treated as regular properties
const DISCRIMINATOR_FIELDS = ['resource', 'operation', 'mode'];

/** Custom API Call operations don't have fixed schemas - skip them */
const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

export function isCustomApiCall(operation: string): boolean {
	return operation === CUSTOM_API_CALL_KEY;
}

/**
 * Property types that render UI affordances but carry no data in the saved
 * workflow JSON. They are skipped entirely from generated types/schemas.
 *
 * Note: `button` and `icon` are not in this list — they can carry data.
 * See the type mappers for their dedicated schemas.
 */
export const DISPLAY_ONLY_PROPERTY_TYPES = new Set([
	'notice',
	'curlImport',
	'credentials',
	'callout',
]);

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * One variation of `extraTypeDefContent`, optionally gated by `displayOptions`.
 * Variations with `displayOptions` are emitted only in narrowed discriminator
 * types (e.g. per-mode or per-resource/operation files) whose combo matches.
 * Variations without `displayOptions` are emitted unconditionally.
 */
export interface BuilderHintVariation {
	content: string;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
}

export interface ParameterBuilderHint {
	propertyHint: string;
	placeholderSupported?: boolean;
}

export interface NodePropertyOption {
	name: string;
	value?: string | number | boolean;
	description?: string;
	displayName?: string;
	builderHint?: ParameterBuilderHint;
	values?: NodeProperty[];
	type?: string;
	default?: unknown;
	required?: boolean;
	options?: NodePropertyOption[];
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	disabledOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	typeOptions?: Record<string, unknown>;
	noDataExpression?: boolean;
	modes?: Array<{
		name: string;
		displayName?: string;
		type?: string;
		typeOptions?: Record<string, unknown>;
	}>;
}

export interface NodeProperty {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	hint?: string;
	builderHint?: ParameterBuilderHint;
	default?: unknown;
	required?: boolean;
	options?: NodePropertyOption[];
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	disabledOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	typeOptions?: Record<string, unknown>;
	noDataExpression?: boolean;
	modes?: Array<{
		name: string;
		displayName?: string;
		type?: string;
		typeOptions?: Record<string, unknown>;
	}>;
}

export interface NodeTypeDescription {
	name: string;
	displayName: string;
	description?: string;
	group: string[];
	version: number | number[];
	defaultVersion?: number;
	properties: NodeProperty[];
	credentials?: Array<{ name: string; required?: boolean }>;
	/**
	 * Connections may be a runtime expression string (`={{ ... }}`) for nodes
	 * whose shape depends on parameters (e.g. AI Agent, Merge). Generation
	 * handles those lexically: `ai_*` connection types are extracted from the
	 * expression source, and dynamic `main` connections don't influence
	 * heuristics like trigger detection.
	 */
	inputs: string | string[] | Array<{ type: string; displayName?: string }>;
	outputs: string | string[] | Array<{ type: string; displayName?: string }>;
	subtitle?: string;
	usableAsTool?: boolean;
	hidden?: boolean;
	documentationUrl?: string;
	/** Path to schema directory relative to nodes-base/dist/nodes/ (e.g., "Google/Drive") */
	schemaPath?: string;
}

export interface DiscriminatorCombination {
	resource?: string;
	operation?: string;
	mode?: string;
	authentication?: string;
	trigger?: string;
	[key: string]: string | undefined;
}

/**
 * Translate a property's disabledOptions into effective displayOptions that
 * exclude the disabled states from the generated type. Returns
 * { displayOptions, fullyDisabled } where fullyDisabled is true when every
 * visible state is read-only.
 *
 * - For keys present in both displayOptions.show and disabledOptions.show, the
 *   disabled values are subtracted from the show list. If any key is left with
 *   no settable values, the property is fully disabled.
 * - For keys in disabledOptions.show that aren't covered by displayOptions.show,
 *   they are merged into displayOptions.hide — "disabled" is equivalent to
 *   "unsettable" for schema purposes, so the field is excluded from those
 *   states.
 */
export function narrowDisplayOptionsByDisabled(prop: NodeProperty): {
	displayOptions: NodeProperty['displayOptions'];
	fullyDisabled: boolean;
} {
	const { displayOptions, disabledOptions } = prop;
	if (!disabledOptions?.show) {
		return { displayOptions, fullyDisabled: false };
	}

	const currentShow = displayOptions?.show;
	const narrowedShow: Record<string, unknown[]> = {};
	const mergedHide: Record<string, unknown[]> = {};
	for (const [key, values] of Object.entries(displayOptions?.hide ?? {})) {
		mergedHide[key] = [...values];
	}

	if (currentShow) {
		for (const [key, values] of Object.entries(currentShow)) {
			const disabledValues = disabledOptions.show[key];
			if (!disabledValues) {
				narrowedShow[key] = values;
				continue;
			}
			const remaining = values.filter(
				(v) => !disabledValues.some((d) => JSON.stringify(d) === JSON.stringify(v)),
			);
			if (remaining.length === 0) {
				return { displayOptions: undefined, fullyDisabled: true };
			}
			narrowedShow[key] = remaining;
		}
	}

	for (const [key, values] of Object.entries(disabledOptions.show)) {
		if (currentShow && key in currentShow) continue;
		const existing = mergedHide[key] ?? [];
		const seen = new Set(existing.map((v) => JSON.stringify(v)));
		for (const v of values) {
			if (!seen.has(JSON.stringify(v))) {
				existing.push(v);
			}
		}
		mergedHide[key] = existing;
	}

	const result: NonNullable<NodeProperty['displayOptions']> = {};
	if (Object.keys(narrowedShow).length > 0) result.show = narrowedShow;
	if (Object.keys(mergedHide).length > 0) result.hide = mergedHide;

	return {
		displayOptions: Object.keys(result).length > 0 ? result : undefined,
		fullyDisabled: false,
	};
}

// =============================================================================
// Discriminated Union Generation
// =============================================================================

/**
 * Extract all discriminator combinations from a node's properties
 * Handles resource/operation, agent, promptType, mode, authentication patterns
 */
export function extractDiscriminatorCombinations(
	node: NodeTypeDescription,
): DiscriminatorCombination[] {
	const combinations: DiscriminatorCombination[] = [];

	// Find discriminator properties
	const resourceProp = node.properties.find((p) => p.name === 'resource' && p.type === 'options');
	const operationProps = node.properties.filter(
		(p) => p.name === 'operation' && p.type === 'options',
	);

	// Check for resource/operation pattern (most common)
	if (resourceProp && operationProps.length > 0) {
		// Extract resource values
		const resources = resourceProp.options?.map((o) => String(o.value)) ?? [];

		// For each resource, find its operations
		for (const resource of resources) {
			// Find operation prop that shows for this resource
			const opProp = operationProps.find((op) => {
				const showResource = op.displayOptions?.show?.resource;
				return showResource?.includes(resource);
			});

			if (opProp?.options) {
				for (const opOption of opProp.options) {
					combinations.push({
						resource,
						operation: String(opOption.value),
					});
				}
			}
		}

		return combinations;
	}

	// Check for other single-discriminator patterns
	// Only 'mode' benefits from splitting - other fields like 'authentication', 'promptType', 'agent'
	// should be treated as regular properties with union types, not as discriminators
	const otherDiscriminators = ['mode'];
	for (const discName of otherDiscriminators) {
		const discProp = node.properties.find(
			(p) => p.name === discName && p.type === 'options' && p.options && p.options.length > 1,
		);

		// Skip if this discriminator has displayOptions (it's conditionally shown)
		// Exception: @version displayOptions are fine since version filtering is handled separately
		if (discProp?.displayOptions) {
			/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Logical OR for boolean combination */
			const hasNonVersionDisplayOptions =
				(discProp.displayOptions.show &&
					Object.keys(discProp.displayOptions.show).some((k) => k !== '@version')) ||
				(discProp.displayOptions.hide &&
					Object.keys(discProp.displayOptions.hide).some((k) => k !== '@version'));
			/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
			if (hasNonVersionDisplayOptions) {
				continue;
			}
		}

		if (discProp?.options) {
			// Check if any properties depend on this discriminator
			const hasDependentProps = node.properties.some(
				(p) =>
					p.displayOptions?.show?.[discName] !== undefined ||
					p.displayOptions?.hide?.[discName] !== undefined,
			);

			if (hasDependentProps) {
				for (const opt of discProp.options) {
					combinations.push({
						[discName]: String(opt.value),
					});
				}
				return combinations;
			}
		}
	}

	return [];
}

/**
 * Get properties applicable to a specific discriminator combination.
 *
 * This function filters properties for code generation purposes.
 * It checks if a property "potentially applies" to a given discriminator combination
 * (resource, operation, mode) by evaluating show/hide conditions.
 *
 * Uses the centralized checkConditions function to support _cnd operators.
 */
export function getPropertiesForCombination(
	node: NodeTypeDescription,
	combination: DiscriminatorCombination,
): NodeProperty[] {
	const result: NodeProperty[] = [];

	for (const prop of node.properties) {
		// Skip discriminator fields themselves
		if (DISCRIMINATOR_FIELDS.includes(prop.name)) {
			continue;
		}

		// Skip display-only types
		if (DISPLAY_ONLY_PROPERTY_TYPES.has(prop.type)) {
			continue;
		}

		// Check if this property applies to the combination
		if (prop.displayOptions?.show) {
			let matches = true;

			// Check each discriminator in the show condition
			for (const [key, conditions] of Object.entries(prop.displayOptions.show)) {
				if (combination[key] !== undefined) {
					// This property has a condition on this discriminator
					// Use checkConditions to support _cnd operators
					if (!checkConditions(conditions, [combination[key]])) {
						matches = false;
						break;
					}
				}
			}

			if (matches) {
				result.push(prop);
			}
		} else if (prop.displayOptions?.hide) {
			// Check hide conditions - only exclude if combination explicitly matches hide
			let excluded = false;

			for (const [key, conditions] of Object.entries(prop.displayOptions.hide)) {
				if (combination[key] !== undefined) {
					if (checkConditions(conditions, [combination[key]])) {
						excluded = true;
						break;
					}
				}
			}

			if (!excluded) {
				result.push(prop);
			}
		} else {
			// Property has no conditions - include it (global property)
			result.push(prop);
		}
	}

	return result;
}

/**
 * Represents a conditional version check (e.g., { _cnd: { gte: 3.1 } })
 */
interface VersionCondition {
	_cnd: {
		eq?: number;
		not?: number;
		gt?: number;
		gte?: number;
		lt?: number;
		lte?: number;
		between?: { from: number; to: number };
	};
}

/**
 * Check if a version matches a single condition item (number or VersionCondition)
 */
function versionMatchesCondition(version: number, condition: number | VersionCondition): boolean {
	// If it's a simple number, check for equality
	if (typeof condition === 'number') {
		return version === condition;
	}

	// It's a conditional expression like { _cnd: { gte: 3.1 } }
	if (condition._cnd) {
		const { eq, not, gt, gte, lt, lte, between } = condition._cnd;
		if (eq !== undefined && version !== eq) return false;
		if (not !== undefined && version === not) return false;
		if (gt !== undefined && !(version > gt)) return false;
		if (gte !== undefined && !(version >= gte)) return false;
		if (lt !== undefined && !(version < lt)) return false;
		if (lte !== undefined && !(version <= lte)) return false;
		if (between !== undefined && !(version >= between.from && version <= between.to)) return false;
		return true;
	}

	return false;
}

/**
 * Check if a property applies to a specific version based on displayOptions
 * @param prop The property to check
 * @param version The specific version number to check for
 * @returns true if the property applies to this version
 */
export function propertyAppliesToVersion(
	prop: Pick<NodeProperty, 'displayOptions'>,
	version: number,
): boolean {
	// If no displayOptions, property applies to all versions
	if (!prop.displayOptions) {
		return true;
	}

	// Check show conditions for @version
	if (prop.displayOptions.show?.['@version']) {
		const allowedVersions = prop.displayOptions.show['@version'] as Array<
			number | VersionCondition
		>;
		// Property should show if ANY version condition matches
		const anyMatches = allowedVersions.some((cond) => versionMatchesCondition(version, cond));
		if (!anyMatches) {
			return false;
		}
	}

	// Check hide conditions for @version
	if (prop.displayOptions.hide?.['@version']) {
		const hiddenVersions = prop.displayOptions.hide['@version'] as Array<number | VersionCondition>;
		// Property should hide if ANY version condition matches
		const anyMatches = hiddenVersions.some((cond) => versionMatchesCondition(version, cond));
		if (anyMatches) {
			return false;
		}
	}

	return true;
}

/**
 * Drop nested collection options and fixedCollection values that do not apply
 * to the version. Nested `@version` gates are common (Slack's `botProfile`,
 * the Form node's `fieldName`), and the UI evaluates them at any depth.
 * Returns the same object when nothing changes.
 */
function filterNestedOptionsForVersion<T extends NodePropertyOption | NodeProperty>(
	prop: T,
	version: number,
): T {
	if (!prop.options) return prop;

	let changed = false;
	const options: NodePropertyOption[] = [];
	for (const option of prop.options) {
		if (!propertyAppliesToVersion(option, version)) {
			changed = true;
			continue;
		}
		let next = filterNestedOptionsForVersion(option, version);
		if (next.values) {
			const values = filterPropertiesForVersion(next.values, version);
			if (values.length !== next.values.length || values.some((v, i) => v !== next.values?.[i])) {
				next = { ...next, values };
			}
		}
		if (next !== option) changed = true;
		options.push(next);
	}

	return changed ? { ...prop, options } : prop;
}

/**
 * Filter node properties to only include those that apply to a specific version.
 * Nested options and fixedCollection values are filtered too.
 * @param properties The full list of node properties
 * @param version The specific version to filter for
 * @returns Properties that apply to the given version
 */
export function filterPropertiesForVersion(
	properties: NodeProperty[],
	version: number,
): NodeProperty[] {
	return properties
		.filter((prop) => propertyAppliesToVersion(prop, version))
		.map((prop) => filterNestedOptionsForVersion(prop, version));
}

/**
 * Represents the discriminator tree structure for a node version
 * Used for generating index files at different levels
 */
export interface DiscriminatorTree {
	/** Type of discriminator pattern: 'resource_operation' or 'single' (mode, auth, etc.) */
	type: 'resource_operation' | 'single';
	/** For resource_operation: map of resource -> operations */
	resources?: Map<string, string[]>;
	/** For single discriminators: discriminator name and its values */
	discriminatorName?: string;
	discriminatorValues?: string[];
}

/**
 * Build a discriminator tree from combinations
 */
export function buildDiscriminatorTree(
	combinations: DiscriminatorCombination[],
): DiscriminatorTree {
	if (combinations.length === 0) {
		return { type: 'single' };
	}

	const first = combinations[0];

	// Resource/operation pattern
	if (first.resource !== undefined && first.operation !== undefined) {
		const resources = new Map<string, string[]>();
		for (const combo of combinations) {
			if (combo.resource && combo.operation) {
				if (!resources.has(combo.resource)) {
					resources.set(combo.resource, []);
				}
				resources.get(combo.resource)!.push(combo.operation);
			}
		}
		return { type: 'resource_operation', resources };
	}

	// Single discriminator pattern
	const discName = Object.keys(first).find((k) => first[k] !== undefined);
	if (discName) {
		const values = combinations.map((c) => c[discName]!).filter(Boolean);
		return {
			type: 'single',
			discriminatorName: discName,
			discriminatorValues: [...new Set(values)],
		};
	}

	return { type: 'single' };
}

// =============================================================================
// AI Input Type Extraction and Narrowed Subnode Config Generation
// =============================================================================

export interface AIInputTypeInfo {
	type: string;
	required: boolean;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
}

// Types for builderHint.inputs
interface BuilderHintInput {
	required?: boolean;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
}

export interface NodeBuilderHint {
	searchHint?: string;
	relatedNodes?: Array<{ nodeType: string; relationHint: string }>;
	inputs?: Record<string, BuilderHintInput>;
	/**
	 * Multi-line content (typically code examples wrapped in `<patterns>...</patterns>`)
	 * emitted into the generated `.d.ts` but NOT surfaced in
	 * `nodes(action="search")` results. Each variation may carry `displayOptions`
	 * so per-mode / per-resource / per-operation examples land only in their
	 * corresponding narrowed type. Variations with no `displayOptions` emit
	 * once at the file-level node header.
	 */
	extraTypeDefContent?: BuilderHintVariation[];
}

/**
 * Extract AI input types from a node definition.
 * Handles both static array inputs and dynamic expression inputs.
 *
 * @param node The node type description
 * @returns Array of AI input types with required status (e.g., [{ type: 'ai_languageModel', required: true }])
 */
export function extractAIInputTypes(node: NodeTypeDescription): AIInputTypeInfo[] {
	const inputs = node.inputs;
	// Use Map to track type -> required status (true if ANY input of that type is required)
	const aiTypes: Map<string, boolean> = new Map();

	// Handle string inputs (expression format like "={{ ... }}")
	if (typeof inputs === 'string') {
		// Extract ai_* types from the expression string using regex
		// For expression inputs, we also try to extract required status
		const aiTypeRegex = /["']ai_(\w+)["']/g;
		let match;
		while ((match = aiTypeRegex.exec(inputs)) !== null) {
			const aiType = `ai_${match[1]}`;
			// Check if this type has required: true in the expression
			// Look for pattern like: { type: "ai_languageModel", ... required: true }
			const requiredRegex = new RegExp(
				`\\{[^}]*type:\\s*["']${aiType}["'][^}]*required:\\s*true[^}]*\\}`,
				'g',
			);
			const isRequired = requiredRegex.test(inputs);
			// Only update if not already set to true (any required input makes it required)
			if (!aiTypes.has(aiType) || isRequired) {
				aiTypes.set(aiType, isRequired);
			}
		}
		return [...aiTypes.entries()].map(([type, required]) => ({ type, required }));
	}

	// Handle array inputs
	if (!Array.isArray(inputs)) {
		return [];
	}

	for (const input of inputs) {
		let inputType: string | undefined;
		let isRequired = false;

		if (typeof input === 'string') {
			inputType = input;
		} else if (typeof input === 'object' && input !== null && 'type' in input) {
			inputType = input.type;
			// Extract required status from object input
			if ('required' in input && input.required === true) {
				isRequired = true;
			}
		}

		// Only include AI input types (starting with 'ai_')
		if (inputType?.startsWith('ai_')) {
			// If any input of this type is required, mark it as required
			const existingRequired = aiTypes.get(inputType) ?? false;
			aiTypes.set(inputType, existingRequired || isRequired);
		}
	}

	return [...aiTypes.entries()].map(([type, required]) => ({ type, required }));
}

/**
 * Extract AI input types from builderHint.inputs when available.
 * Falls back to extractAIInputTypes when no builderHint is present.
 *
 * This function:
 * - Uses builderHint.inputs for explicit subnode configuration
 * - Filters subnodes based on discriminator combo (mode, resource, operation)
 * - Strips discriminator keys from displayOptions (they're used for filtering)
 * - Preserves non-discriminator displayOptions for JSDoc generation
 *
 * @param node The node type description
 * @param combo Optional discriminator combination for filtering
 * @returns Array of AI input types with required status and displayOptions
 */
export function extractAIInputTypesFromBuilderHint(
	node: NodeTypeDescription,
	combo?: DiscriminatorCombination,
): AIInputTypeInfo[] {
	// builderHint is an extended property not yet in the official type definition
	const nodeWithBuilderHint = node as NodeTypeDescription & { builderHint?: NodeBuilderHint };
	const builderHint = nodeWithBuilderHint.builderHint;
	if (!builderHint?.inputs) {
		// Fall back to existing extraction, but mark all as optional
		// since we can't reliably determine required status from expressions
		return extractAIInputTypes(node).map((input) => ({
			...input,
			required: false,
		}));
	}

	const result: AIInputTypeInfo[] = [];

	for (const [inputType, config] of Object.entries(builderHint.inputs)) {
		if (!inputType.startsWith('ai_')) continue;

		// Check if this input applies to the current discriminator combo
		if (combo && config.displayOptions?.show) {
			let applies = true;
			for (const [key, values] of Object.entries(config.displayOptions.show)) {
				if (DISCRIMINATOR_FIELDS.includes(key) && combo[key as keyof DiscriminatorCombination]) {
					// This is a discriminator check
					const comboValue = combo[key as keyof DiscriminatorCombination];
					if (!values.includes(comboValue)) {
						applies = false;
						break;
					}
				}
			}
			if (!applies) continue;
		}

		// Determine if required (default to false for safety)
		const isRequired = config.required === true;

		// Extract non-discriminator displayOptions for JSDoc
		const nonDiscriminatorOptions = getNonDiscriminatorDisplayOptions(config.displayOptions);

		const aiInput: AIInputTypeInfo = {
			type: inputType,
			required: isRequired,
		};

		// Only add displayOptions if there are non-discriminator ones
		if (nonDiscriminatorOptions) {
			aiInput.displayOptions = nonDiscriminatorOptions;
		}

		result.push(aiInput);
	}

	return result;
}

/**
 * Extract non-discriminator displayOptions from a displayOptions object.
 * Discriminators (mode, resource, operation) are stripped as they're used for filtering.
 */
function getNonDiscriminatorDisplayOptions(
	displayOptions?: BuilderHintInput['displayOptions'],
): AIInputTypeInfo['displayOptions'] | undefined {
	if (!displayOptions) return undefined;

	const result: AIInputTypeInfo['displayOptions'] = {};

	if (displayOptions.show) {
		const filteredShow: Record<string, unknown[]> = {};
		for (const [key, values] of Object.entries(displayOptions.show)) {
			if (!DISCRIMINATOR_FIELDS.includes(key)) {
				filteredShow[key] = values;
			}
		}
		if (Object.keys(filteredShow).length > 0) {
			result.show = filteredShow;
		}
	}

	if (displayOptions.hide) {
		const filteredHide: Record<string, unknown[]> = {};
		for (const [key, values] of Object.entries(displayOptions.hide)) {
			if (!DISCRIMINATOR_FIELDS.includes(key)) {
				filteredHide[key] = values;
			}
		}
		if (Object.keys(filteredHide).length > 0) {
			result.hide = filteredHide;
		}
	}

	// Return undefined if empty
	if (!result.show && !result.hide) {
		return undefined;
	}

	return result;
}
