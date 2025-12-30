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

export class DryRunContext implements IContext {
	readonly mode: DryRunMode;
	readonly override?: string;
	readonly errorCode?: number;
	readonly errorMessage?: string;

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
