import type {FromOption} from './fd-options.js';

// Options which can be fd-specific like `{verbose: {stdout: 'none', stderr: 'full'}}`
export type FdGenericOption<OptionType> = OptionType | GenericOptionObject<OptionType>;

type GenericOptionObject<OptionType> = {
	readonly [FdName in GenericFromOption]?: OptionType
};

type GenericFromOption = FromOption | 'ipc';

// Retrieve fd-specific option's value
export type FdSpecificOption<
	GenericOption extends FdGenericOption<unknown>,
	FdNumber extends string,
> = GenericOption extends GenericOptionObject<unknown>
	? FdSpecificObjectOption<GenericOption, FdNumber>
	: GenericOption;

type FdSpecificObjectOption<
	GenericOption extends GenericOptionObject<unknown>,
	FdNumber extends string,
> = keyof GenericOption extends GenericFromOption
	? FdNumberToFromOption<FdNumber, keyof GenericOption> extends never
		? undefined
		: GenericOption[FdNumberToFromOption<FdNumber, keyof GenericOption>]
	: GenericOption;

type FdNumberToFromOption<
	FdNumber extends string,
	GenericOptionKeys extends GenericFromOption,
> = FdNumber extends '1'
	? 'stdout' extends GenericOptionKeys
		? 'stdout'
		: 'fd1' extends GenericOptionKeys
			? 'fd1'
			: 'all' extends GenericOptionKeys
				? 'all'
				: never
	: FdNumber extends '2'
		? 'stderr' extends GenericOptionKeys
			? 'stderr'
			: 'fd2' extends GenericOptionKeys
				? 'fd2'
				: 'all' extends GenericOptionKeys
					? 'all'
					: never
		: `fd${FdNumber}` extends GenericOptionKeys
			? `fd${FdNumber}`
			: 'ipc' extends GenericOptionKeys
				? 'ipc'
				: never;
