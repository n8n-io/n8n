import { Container, Service } from '@n8n/di';

import { BreakingChangeRuleMetadata } from './breaking-change-rule-metadata';

type BreakingChangeRuleOptions = {
	version: string;
};

export const BreakingChangeRule =
	(opts: BreakingChangeRuleOptions): ClassDecorator =>
	(target) => {
		Container.get(BreakingChangeRuleMetadata).register({
			class: target as unknown as new (...args: unknown[]) => unknown,
			version: opts.version,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
