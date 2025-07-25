import { Service } from '@n8n/di';
import argvParser from 'yargs-parser';
import type { z } from 'zod';

import { Logger } from './logging';

type CliInput<Flags extends z.ZodRawShape, Args extends readonly string[]> = {
	argv: string[];
	flagsSchema?: z.ZodObject<Flags>;
	argsSchema?: readonly [...Args];
	description?: string;
	examples?: string[];
};

export type ParsedArgs<Flags = Record<string, unknown>> = {
	flags: Flags;
	args: string[];
};

@Service()
export class CliParser {
	constructor(private readonly logger: Logger) {}

	parse<Flags extends z.ZodRawShape, Args extends readonly string[]>(
		input: CliInput<Flags, Args>,
	): ParsedArgs<z.infer<z.ZodObject<Flags>>> {
		// eslint-disable-next-line id-denylist
		const { _: rawArgs, ...rawFlags } = argvParser(input.argv, { string: ['id'] });

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

		const args = rawArgs.map(String);

		this.logger.debug('Received CLI command', {
			interpreter: process.argv[0],
			executable: process.argv[1],
			flags,
			args,
		});

		return { flags, args };
	}
}
