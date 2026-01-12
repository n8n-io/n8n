import { IContext, mapTo } from 'intento-core';
import { INodeProperties, LogMetadata } from 'n8n-workflow';

/**
 * Configuration keys and defaults for suppression context.
 * Used to configure custom sentence segmentation suppressions for domain-specific content.
 */
export const SUPPRESSION = {
	KEYS: {
		ENABLED: 'suppression_context_enabled',
		LIST: 'suppression_context_list',
	},
	DEFAULTS: {
		ENABLED: false,
	},
};

/**
 * Context for configuring custom sentence segmentation suppressions.
 * Prevents sentence breaks at domain-specific abbreviations or terms.
 *
 * Must be initialized before execute(). Validation ensures list is provided when enabled.
 */
export class SuppressionContext implements IContext {
	readonly enabled: boolean;
	readonly list?: string[];

	/**
	 * @param enabled - Whether custom suppressions are active
	 * @param list - Abbreviations/terms that should NOT trigger sentence breaks (e.g., "Dr", "Prof", "Inc")
	 */
	constructor(
		@mapTo(SUPPRESSION.KEYS.ENABLED) enabled: boolean = SUPPRESSION.DEFAULTS.ENABLED,
		@mapTo(SUPPRESSION.KEYS.LIST) list?: string[],
	) {
		this.enabled = enabled;
		this.list = list;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.enabled && !this.list) throw new Error('Suppression list must be provided when suppression is enabled.');
	}

	asLogMetadata(): LogMetadata {
		return {
			enabled: this.enabled,
			listLength: this.list?.length ?? 0,
		};
	}
}

/**
 * n8n node properties for configuring suppression context in the workflow UI.
 * Provides toggle for enabling suppressions and multi-value input for suppression terms.
 */
export const CONTEXT_SUPPRESSION = [
	{
		displayName: 'Enable Custom Suppressions',
		name: SUPPRESSION.KEYS.ENABLED,
		type: 'boolean',
		default: SUPPRESSION.DEFAULTS.ENABLED,
		description:
			'Whether to prevent sentence breaks at specific abbreviations or terms. Useful for domain-specific content (e.g., medical, legal, technical) where custom abbreviations should not trigger sentence splits.',
	},
	{
		displayName: 'Suppression Terms',
		name: SUPPRESSION.KEYS.LIST,
		type: 'string',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Term',
		},
		displayOptions: {
			show: {
				[SUPPRESSION.KEYS.ENABLED]: [true],
			},
		},
		default: [],
		placeholder: 'Dr',
		description:
			'Abbreviations or terms that should NOT trigger sentence breaks (e.g., "Dr", "Prof", "Inc", "Ltd", "Fig", "vs"). Enter each term without the period.',
	},
] as INodeProperties[];
