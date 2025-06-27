import { Container, Service } from '@n8n/di';

import { CommandMetadata } from './command-metadata';
import type { CommandClass, CommandOptions } from './types';

export const Command =
	({ name, description, examples, flagsSchema }: CommandOptions): ClassDecorator =>
	(target) => {
		const commandClass = target as unknown as CommandClass;
		Container.get(CommandMetadata).register(name, {
			description,
			flagsSchema,
			class: commandClass,
			examples,
		});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
