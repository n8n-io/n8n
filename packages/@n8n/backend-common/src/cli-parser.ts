import { Service } from '@n8n/di';
import argvParser from 'yargs-parser';
import type { z } from 'zod';

type CliInput<Flags extends z.ZodRawShape, Args extends readonly string[]> = {
	argv: string[];
	flagsSchema?: z.ZodObject<Flags>;
	argsSchema?: readonly [...Args];
	description?: string;
	examples?: string[];
};

export type ParsedArgs<
	Flags = Record<string, unknown>,
	Args extends readonly string[] = readonly string[],
> = {
	flags: Flags;
	argsByKey: Record<Args[number], string>;
	argsByPosition: string[];
};

@Service()
export class CliParser {
	parse<Flags extends z.ZodRawShape, Args extends readonly string[]>(
		input: CliInput<Flags, Args>,
	): ParsedArgs<z.infer<z.ZodObject<Flags>>, Args> {
		const { _: rawArgs, ...rawFlags } = argvParser(input.argv);

		let flags = rawFlags as z.infer<z.ZodObject<Flags>>;
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

		const args = {} as Record<Args[number], string>;
		if (input.argsSchema) {
			input.argsSchema.forEach((argName, index) => {
				args[argName] = String(rawArgs[index] ?? '');
			});
		}

		console.log({ flags, args, rawArgs });

		return {
			flags,
			argsByKey: args,
			argsByPosition: rawArgs.map(String),
		};
	}
}
