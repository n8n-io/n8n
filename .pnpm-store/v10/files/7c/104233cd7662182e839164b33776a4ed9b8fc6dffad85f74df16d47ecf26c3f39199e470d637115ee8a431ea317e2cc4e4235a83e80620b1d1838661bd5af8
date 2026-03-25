import type {FdSpecificOption} from '../arguments/specific.js';
import type {CommonOptions, Options, StricterOptions} from '../arguments/options.js';
import type {Message, HasIpc} from '../ipc.js';

// `result.ipcOutput`
// This is empty unless the `ipc` option is `true`.
// Also, this is empty if the `buffer` option is `false`.
export type ResultIpcOutput<
	IsSync,
	OptionsType extends CommonOptions,
> = IsSync extends true
	? []
	: ResultIpcAsync<
	FdSpecificOption<OptionsType['buffer'], 'ipc'>,
	HasIpc<StricterOptions<OptionsType, Options>>,
	OptionsType['serialization']
	>;

type ResultIpcAsync<
	BufferOption extends boolean | undefined,
	IpcEnabled extends boolean,
	SerializationOption extends CommonOptions['serialization'],
> = BufferOption extends false
	? []
	: IpcEnabled extends true
		? Array<Message<SerializationOption>>
		: [];
