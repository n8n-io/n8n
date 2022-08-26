/* eslint-disable no-param-reassign */
/* eslint-disable import/no-cycle */
import config from '../../config';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';

export function isCredentialsSharingEnabled(): boolean {
	return isUserManagementEnabled() && config.getEnv('experimental.credentialsSharing');
}

// return the difference between two arrays
export function rightDiff<T, J>(
	[arr1, keyExtractor1]: [T[], (item: T) => string],
	[arr2, keyExtractor2]: [J[], (item: J) => string],
): J[] {
	// create map { itemKey => true } for fast lookup for diff
	const keyMap = arr1.reduce((map, item) => {
		map[keyExtractor1(item)] = true;
		return map;
	}, {} as { [key: string]: true });

	// diff against map
	return arr2.reduce((acc, item) => {
		if (!keyMap[keyExtractor2(item)]) {
			acc.push(item);
		}
		return acc;
	}, [] as J[]);
}
