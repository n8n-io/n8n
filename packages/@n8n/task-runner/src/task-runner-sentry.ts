import { Service } from '@n8n/di';
import type { ErrorEvent, Exception } from '@sentry/types';
import { ErrorReporter } from 'n8n-core';

import { SentryConfig } from './config/sentry-config';

/**
 * Sentry service for the task runner.
 */
@Service()
export class TaskRunnerSentry {
	constructor(
		private readonly config: SentryConfig,
		private readonly errorReporter: ErrorReporter,
	) {}

	async initIfEnabled() {
		if (!this.config.dsn) return;

		await this.errorReporter.init({
			serverType: 'task_runner',
			dsn: this.config.dsn,
			release: this.config.n8nVersion,
			environment: this.config.environment,
			serverName: this.config.deploymentName,
			beforeSendFilter: this.filterOutUserCodeErrors,
		});
	}

	async shutdown() {
		if (!this.config.dsn) return;

		await this.errorReporter.shutdown();
	}

	/**
	 * Filter out errors originating from user provided code.
	 * It is possible for users to create code that causes unhandledrejections
	 * that end up in the sentry error reporting.
	 */
	filterOutUserCodeErrors = (event: ErrorEvent) => {
		const error = event?.exception?.values?.[0];
		if (!error) return false;

		return error ? this.isUserCodeError(error) : false;
	};

	/**
	 * Check if the error is originating from user provided code.
	 * It is possible for users to create code that causes unhandledrejections
	 * that end up in the sentry error reporting.
	 */
	private isUserCodeError(error?: Exception) {
		if (!error) return false;

		const frames = error.stacktrace?.frames;
		if (!frames) return false;

		return frames.some(
			(frame) => frame.filename === 'node:vm' && frame.function === 'runInContext',
		);
	}
}
