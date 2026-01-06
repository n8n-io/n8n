import { mapTo, type IContext } from 'intento-core';
import { INodeProperties } from 'n8n-workflow';

type DryRunMode = 'pass' | 'override' | 'fail';

const DRY_RUN = {
	KEYS: {
		MODE: 'dry_run_context_mode',
		OVERRIDE: 'dry_run_context_override',
		ERROR_CODE: 'dry_run_context_error_code',
		ERROR_MESSAGE: 'dry_run_context_error_message',
	},
	MODES: {
		PASS: 'pass' as DryRunMode,
		OVERRIDE: 'override' as DryRunMode,
		FAIL: 'fail' as DryRunMode,
	},
	BOUNDS: {
		CODE: {
			MIN: 100,
			MAX: 599,
		},
	},
};

/**
 * Dry run testing context for simulating translation behavior.
 *
 * Supports three modes: pass-through (return original text), override (predefined response),
 * or fail (simulate error). Used for testing workflows without making actual API calls.
 */
export class DryRunContext implements IContext {
	/** Dry run strategy: 'pass', 'override', or 'fail' */
	readonly mode: DryRunMode;
	/** Predefined translation result - required for 'override' mode */
	readonly override?: string;
	/** Error code to simulate - required for 'fail' mode, must be 100-599 */
	readonly errorCode?: number;
	/** Error message to simulate - required for 'fail' mode */
	readonly errorMessage?: string;

	/**
	 * Creates dry run context from n8n node parameters.
	 *
	 * NOTE: @mapTo decorators execute bottom-to-top, binding parameters to n8n properties.
	 *
	 * @param mode - Dry run strategy to apply
	 * @param override - Predefined response text (only for 'override' mode)
	 * @param errorCode - HTTP error code to simulate (only for 'fail' mode)
	 * @param errorMessage - Error description to simulate (only for 'fail' mode)
	 */
	constructor(
		@mapTo(DRY_RUN.KEYS.MODE) mode: DryRunMode,
		@mapTo(DRY_RUN.KEYS.OVERRIDE) override?: string,
		@mapTo(DRY_RUN.KEYS.ERROR_CODE) errorCode?: number,
		@mapTo(DRY_RUN.KEYS.ERROR_MESSAGE) errorMessage?: string,
	) {
		this.mode = mode;
		this.override = override;
		this.errorCode = errorCode;
		this.errorMessage = errorMessage;

		Object.freeze(this);
	}

	/**
	 * Validates dry run configuration has required fields for selected mode.
	 *
	 * NOTE: Each mode requires different parameters - validates mutual exclusivity.
	 *
	 * @throws Error if required fields missing for selected mode
	 * @throws Error if fields set for wrong mode (e.g., errorCode for 'pass' mode)
	 */
	throwIfInvalid(): void {
		switch (this.mode) {
			case 'pass':
				if (this.override || this.errorCode || this.errorMessage)
					throw new Error('override, errorCode, and errorMessage must not be set for dryRun mode "pass"');
				return;
			case 'override':
				if (!this.override) throw new Error('override is required for dryRun mode "override"');
				if (this.errorCode || this.errorMessage) throw new Error('errorCode and errorMessage must not be set for dryRun mode "override"');
				break;
			case 'fail':
				if (!this.errorCode) throw new Error('errorCode is required for dryRun mode "fail"');
				if (!this.errorMessage) throw new Error('errorMessage is required for dryRun mode "fail"');
				if (this.override) throw new Error('override must not be set for dryRun mode "fail"');
				break;
		}
	}
	asLogMetadata(): Record<string, unknown> {
		return {
			dryRunMode: this.mode,
			override: this.override,
			errorCode: this.errorCode,
			errorMessage: this.errorMessage,
		};
	}
}

/**
 * n8n node properties for dry run context.
 *
 * Defines UI form fields for dry run testing configuration in n8n workflow editor.
 * Property names must match DRY_RUN.KEYS for @mapTo decorator binding.
 */
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
