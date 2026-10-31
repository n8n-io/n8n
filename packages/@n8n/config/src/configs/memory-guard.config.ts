import { z } from 'zod';

import { Config, Env } from '../decorators';

const levelSchema = z.coerce.number().gt(0).lte(1);

@Config
export class MemoryGuardConfig {
	/**
	 * Experimental. Whether n8n protects the instance from running out of memory, in
	 * regular mode only. When memory runs high, new production executions wait, and n8n
	 * stops the running execution that holds the most data, with its sub-workflows.
	 * If n8n keeps stopping production executions of the same workflow, it unpublishes the
	 * workflow and emails its owner.
	 */
	@Env('N8N_MEMORY_GUARD_ENABLED')
	enabled: boolean = false;

	/**
	 * Experimental. Memory use, as a share of the limit from 0 to 1, at which new production
	 * executions start to wait. Must be above the resume level and below the stop level.
	 */
	@Env('N8N_MEMORY_GUARD_HOLD_LEVEL', levelSchema)
	holdLevel: number = 0.8;

	/**
	 * Experimental. Memory use, as a share of the limit from 0 to 1, below which waiting
	 * executions start again. Must be below the hold level.
	 */
	@Env('N8N_MEMORY_GUARD_RESUME_LEVEL', levelSchema)
	resumeLevel: number = 0.75;

	/**
	 * Experimental. Memory use, as a share of the limit from 0 to 1, at which n8n stops the
	 * running execution that holds the most data. Must be above the hold level and below the
	 * critical level.
	 */
	@Env('N8N_MEMORY_GUARD_STOP_LEVEL', levelSchema)
	stopLevel: number = 0.85;

	/**
	 * Experimental. Memory use, as a share of the limit from 0 to 1, at which n8n stops an
	 * execution at once, without a second check. Must be above the stop level.
	 */
	@Env('N8N_MEMORY_GUARD_CRITICAL_LEVEL', levelSchema)
	criticalLevel: number = 0.95;

	/**
	 * Experimental. Number of stops of the same production workflow after which n8n
	 * unpublishes the workflow. Set to 0 to never unpublish.
	 */
	@Env('N8N_MEMORY_GUARD_STOPS_TO_UNPUBLISH', z.coerce.number().int().gte(0))
	stopsToUnpublish: number = 3;

	sanitize() {
		const { resumeLevel, holdLevel, stopLevel, criticalLevel } = this;
		if (resumeLevel < holdLevel && holdLevel < stopLevel && stopLevel < criticalLevel) return;

		console.warn(
			'Memory guard levels must increase from resume to hold to stop to critical. Falling back to the default levels.',
		);
		Object.assign(this, {
			resumeLevel: 0.75,
			holdLevel: 0.8,
			stopLevel: 0.85,
			criticalLevel: 0.95,
		});
	}
}
