import { Container, Service } from '@n8n/di';

import type { ContextEstablishmentHookClass } from './context-establishment-hook';
import { ContextEstablishmentHookMetadata } from './context-establishment-hook-metadata';

export const ContextEstablishmentHook =
	<T extends ContextEstablishmentHookClass>(opts: { name: string }) =>
	(target: T) => {
		Container.get(ContextEstablishmentHookMetadata).register(opts.name, {
			class: target,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
