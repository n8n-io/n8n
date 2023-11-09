import type { AutocompleteOptionType, FunctionOptionType } from './types';

export const isFunctionOption = (value: AutocompleteOptionType): value is FunctionOptionType => {
	return value === 'native-function' || value === 'extension-function';
};
