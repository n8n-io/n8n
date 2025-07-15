import { DateTime, Duration, Interval } from 'luxon';
import { WorkflowDataProxy, Workflow, Expression } from 'n8n-workflow';

export function freezePrototypes() {
	// Freeze globals prototypes, except in tests because Jest needs to be able to mutate prototypes
	if (process.env.NODE_ENV !== 'test') {
		Object.getOwnPropertyNames(globalThis)
			// @ts-expect-error globalThis does not have string in index signature
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			.map((name) => globalThis[name])
			.filter((value) => typeof value === 'function')
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
			.forEach((fn) => Object.freeze(fn.prototype));
	}

	// Freeze internal classes prototypes
	[Workflow, Expression, WorkflowDataProxy, DateTime, Interval, Duration]
		.map((constructor) => constructor.prototype)
		.forEach(Object.freeze);
}
