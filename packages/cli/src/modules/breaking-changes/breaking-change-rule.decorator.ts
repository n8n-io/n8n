import type { BreakingChangeVersion } from '@n8n/api-types';
import { Container, Service, type Constructable } from '@n8n/di';

import { BreakingChangeRuleMetadata } from './breaking-changes.rule-metadata.service';
import type { IBreakingChangeRule } from './types';

type BreakingChangeRuleOptions = {
	version: BreakingChangeVersion;
};

export const BreakingChangeRule =
	(opts: BreakingChangeRuleOptions): ClassDecorator =>
	(target) => {
		Container.get(BreakingChangeRuleMetadata).register({
			class: target as unknown as Constructable<IBreakingChangeRule>,
			version: opts.version,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
