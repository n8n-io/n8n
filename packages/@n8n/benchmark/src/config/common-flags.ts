import { Flags } from '@oclif/core';

export const testScenariosPath = Flags.string({
	description: 'The path to the scenarios',
	default: 'scenarios',
});
