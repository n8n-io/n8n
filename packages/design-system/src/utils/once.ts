import { off } from './off';
import { on } from './on';

export const once = function (
	el: HTMLElement | Document | Window,
	event: string,
	fn: (...args: any[]) => any,
): void {
	const listener = function (...args: any[]) {
		if (fn) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			fn.apply(this, args); // eslint-disable-line @typescript-eslint/no-unsafe-call
		}

		off(el, event, listener);
	};

	on(el, event, listener);
};
