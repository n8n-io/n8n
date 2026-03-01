import { Service } from '@n8n/di';
import argvParser from 'yargs-parser';
import type { z } from 'zod';

import { Logger } from './logging';

type CliInput<Flags extends z.ZodRawShape> = {
	argv: string[];
	flagsSchema?: z.ZodObject<Flags>;
	description?: string;
	examples?: string[];
};

type ParsedArgs<Flags = Record<string, unknown>> = {
	flags: Flags;
	args: string[];
};

@Service()
export class CliParser {
	constructor(private readonly logger: Logger) {}

	parse<Flags extends z.ZodRawShape>(
		input: CliInput<Flags>,
	): ParsedArgs<z.infer<z.ZodObject<Flags>>> {
		// eslint-disable-next-line id-denylist
		const { _: rest, ...rawFlags } = argvParser(input.argv, { string: ['id'] });

		let flags = {} as z.infer<z.ZodObject<Flags>>;
		if (input.flagsSchema) {
			for (const key in input.flagsSchema.shape) {
				const flagSchema = input.flagsSchema.shape[key];
				let schemaDef = flagSchema._def as z.ZodTypeDef & {
					typeName: string;
					innerType?: z.ZodType;
					_alias?: string;
				};

				if (schemaDef.typeName === 'ZodOptional' && schemaDef.innerType) {
					schemaDef = schemaDef.innerType._def as typeof schemaDef;
				}

				const alias = schemaDef._alias;
				if (alias?.length && !(key in rawFlags) && rawFlags[alias]) {
					rawFlags[key] = rawFlags[alias] as unknown;
				}
			}

			flags = input.flagsSchema.parse(rawFlags);
		}

		const args = rest.map(String).slice(2);

		this.logger.debug('Received CLI command', {
			execPath: rest[0],
			scriptPath: rest[1],
			args,
			flags,
		});

		return { flags, args };
	}
}
