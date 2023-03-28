/* eslint-disable @typescript-eslint/no-use-before-define */
import { EnvironmentManager } from './EnvironmentManager.ee';

export const handleEnvironmentInit = async (): Promise<void> => {
	return EnvironmentManager.init();
};
