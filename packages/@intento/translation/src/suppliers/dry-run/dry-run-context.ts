import { mapTo, RegExpValidator, type IContext } from 'intento-core';
import { INodeProperties } from 'n8n-workflow';

type DryRunMode = 'pass' | 'override' | 'replace' | 'fail';

const DRY_RUN = {
	KEYS: {
		MODE: 'dry_run_context_mode',
		OVERRIDE: 'dry_run_context_override',
		REPLACE_PATTERN: 'dry_run_context_replace_pattern',
		REPLACE_TO: 'dry_run_context_replace_to',
		ERROR_CODE: 'dry_run_context_error_code',
		ERROR_MESSAGE: 'dry_run_context_error_message',
	},
	MODES: {
		PASS: 'pass' as DryRunMode,
		OVERRIDE: 'override' as DryRunMode,
		REPLACE: 'replace' as DryRunMode,
		FAIL: 'fail' as DryRunMode,
	},
	BOUNDS: {
		CODE: {
			MIN: 100,
			MAX: 599,
		},
	},
};

export class DryRunContext implements IContext {
	readonly mode: DryRunMode;
	readonly override?: string;
	readonly replacePattern?: string;
	readonly replaceTo?: string;
	readonly errorCode?: number;
	readonly errorMessage?: string;

	constructor(
		@mapTo(DRY_RUN.KEYS.MODE) mode: DryRunMode,
		@mapTo(DRY_RUN.KEYS.OVERRIDE) override?: string,
		@mapTo(DRY_RUN.KEYS.REPLACE_PATTERN) replacePattern?: string,
		@mapTo(DRY_RUN.KEYS.REPLACE_TO) replaceTo?: string,
		@mapTo(DRY_RUN.KEYS.ERROR_CODE) errorCode?: number,
		@mapTo(DRY_RUN.KEYS.ERROR_MESSAGE) errorMessage?: string,
	) {
		this.mode = mode;
		this.override = override;
		this.replacePattern = replacePattern;
		this.replaceTo = replaceTo;
		this.errorCode = errorCode;
		this.errorMessage = errorMessage;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		switch (this.mode) {
			case 'pass':
				this.throwIfPassModeInvalid();
				return;
			case 'override':
				this.throwIfOverrideModeInvalid();
				return;
			case 'replace':
				this.throwIfReplaceModeInvalid();
				return;
			case 'fail':
				this.throwIfFailModeInvalid();
				return;
		}
	}

	asLogMetadata(): Record<string, unknown> {
		return {
			dryRunMode: this.mode,
			override: this.override,
			replacePattern: this.replacePattern,
			replaceTo: this.replaceTo,
			errorCode: this.errorCode,
			errorMessage: this.errorMessage,
		};
	}

	private throwIfPassModeInvalid(): void {
		if (this.override) throw new Error('override must not be set for dryRun mode "pass"');
		if (this.replacePattern) throw new Error('replacePattern must not be set for dryRun mode "pass"');
		if (this.replaceTo) throw new Error('replaceTo must not be set for dryRun mode "pass"');
		if (this.errorCode) throw new Error('errorCode must not be set for dryRun mode "pass"');
		if (this.errorMessage) throw new Error('errorMessage must not be set for dryRun mode "pass"');
	}

	private throwIfReplaceModeInvalid(): void {
		if (!this.replacePattern) throw new Error('replacePattern is required for dryRun mode "replace"');
		if (!RegExpValidator.isValidPattern(this.replacePattern))
			throw new Error('replacePattern contains invalid regex for dryRun mode "replace"');
		if (!this.replaceTo) throw new Error('replaceTo is required for dryRun mode "replace"');
		if (this.override) throw new Error('override must not be set for dryRun mode "replace"');
		if (this.errorCode) throw new Error('errorCode must not be set for dryRun mode "replace"');
		if (this.errorMessage) throw new Error('errorMessage must not be set for dryRun mode "replace"');
	}

	private throwIfOverrideModeInvalid(): void {
		if (!this.override) throw new Error('override is required for dryRun mode "override"');
		if (this.replacePattern) throw new Error('replacePattern must not be set for dryRun mode "override"');
		if (this.replaceTo) throw new Error('replaceTo must not be set for dryRun mode "override"');
		if (this.errorCode) throw new Error('errorCode must not be set for dryRun mode "override"');
		if (this.errorMessage) throw new Error('errorMessage must not be set for dryRun mode "override"');
	}

	private throwIfFailModeInvalid(): void {
		if (this.override) throw new Error('override must not be set for dryRun mode "fail"');
		if (this.replacePattern) throw new Error('replacePattern must not be set for dryRun mode "fail"');
		if (this.replaceTo) throw new Error('replaceTo must not be set for dryRun mode "fail"');
		if (!this.errorCode) throw new Error('errorCode is required for dryRun mode "fail"');
		if (!this.errorMessage) throw new Error('errorMessage is required for dryRun mode "fail"');
		if (this.errorCode < DRY_RUN.BOUNDS.CODE.MIN)
			throw new RangeError(`errorCode must be at least ${DRY_RUN.BOUNDS.CODE.MIN} for dryRun mode "fail"`);
		if (this.errorCode > DRY_RUN.BOUNDS.CODE.MAX)
			throw new RangeError(`errorCode must be at most ${DRY_RUN.BOUNDS.CODE.MAX} for dryRun mode "fail"`);
	}
}

export const CONTEXT_DRY_RUN = [
	{
		displayName: 'Dry Run Mode',
		name: DRY_RUN.KEYS.MODE,
		type: 'options',
		options: [
			{
				name: 'Pass Through',
				value: DRY_RUN.MODES.PASS,
				description: 'Process the request normally without any dry run modifications',
			},
			{
				name: 'Replace Text',
				value: DRY_RUN.MODES.REPLACE,
				description: 'Replace text using a pattern instead of making an actual request',
			},
			{
				name: 'Override Response',
				value: DRY_RUN.MODES.OVERRIDE,
				description: 'Return a predefined response instead of making an actual request',
			},
			{
				name: 'Simulate Failure',
				value: DRY_RUN.MODES.FAIL,
				description: 'Simulate a failed request with a predefined error code and message',
			},
		],
		default: DRY_RUN.MODES.PASS,
		description: 'Determines how to handle the request in dry run mode',
	},
	{
		displayName: 'Replace Pattern',
		name: DRY_RUN.KEYS.REPLACE_PATTERN,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				[DRY_RUN.KEYS.MODE]: [DRY_RUN.MODES.REPLACE],
			},
		},
		validation: [
			{
				type: 'regex',
				properties: {
					regex: '^/.+/[gimusy]*$',
					errorMessage: 'Pattern must be in format /pattern/flags (e.g., /text/gi or /\\d+/)',
				},
			},
		],
		placeholder: '/<span[^>]*>(.*?)</span>/g',
		hint: 'Example: /<span[^>]*>(.*?)</span>/g matches <span>text</span> and <span class="x">text</span>. [^>]* matches any attributes. Flags: g (global), i (case-insensitive)',
		description:
			'Regular expression pattern in /pattern/flags format. Supports full regex syntax including character classes [aA-Z], capture groups (\\w+), quantifiers +*?, etc. Captured groups can be referenced as $1, $2 in the replacement field',
	},
	{
		displayName: 'Replace With',
		name: DRY_RUN.KEYS.REPLACE_TO,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				[DRY_RUN.KEYS.MODE]: [DRY_RUN.MODES.REPLACE],
			},
		},
		placeholder: '_$1_',
		hint: 'Use $1 for first capture group, $2 for second, etc. Leave empty to remove matches',
		description:
			'Replacement text. Use $1, $2, etc. to insert captured groups from the pattern. Use empty string to remove matched text. Example: Pattern /<span>(.*?)</span>/g with replacement "_$1_" changes <span>text</span> to _text_',
	},
	{
		displayName: 'Override Response',
		name: DRY_RUN.KEYS.OVERRIDE,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				[DRY_RUN.KEYS.MODE]: [DRY_RUN.MODES.OVERRIDE],
			},
		},
		description: 'The response to return when in override mode',
	},
	{
		displayName: 'Error Code',
		name: DRY_RUN.KEYS.ERROR_CODE,
		type: 'number',
		default: 400,
		displayOptions: {
			show: {
				[DRY_RUN.KEYS.MODE]: [DRY_RUN.MODES.FAIL],
			},
		},
		description: 'The HTTP error code to simulate when in fail mode',
	},
	{
		displayName: 'Error Message',
		name: DRY_RUN.KEYS.ERROR_MESSAGE,
		type: 'string',
		default: 'Simulated error',
		displayOptions: {
			show: {
				[DRY_RUN.KEYS.MODE]: [DRY_RUN.MODES.FAIL],
			},
		},
		description: 'The error message to return when simulating a failure',
	},
] as INodeProperties[];
