/**
 * Moves models that have a priority to the front, highest first, and keeps the
 * order of the rest. A models API reports a priority to promote a model, for
 * example at its launch.
 */
export function pinPrioritizedModels<T>(models: T[], getPriority: (model: T) => unknown): T[] {
	const entries = models.map((model) => {
		const priority = getPriority(model);
		return {
			model,
			priority: typeof priority === 'number' && Number.isFinite(priority) ? priority : null,
		};
	});
	const prioritized = entries
		.flatMap((entry) =>
			entry.priority === null ? [] : [{ model: entry.model, priority: entry.priority }],
		)
		.sort((a, b) => b.priority - a.priority);
	return [
		...prioritized.map((entry) => entry.model),
		...entries.filter((entry) => entry.priority === null).map((entry) => entry.model),
	];
}
