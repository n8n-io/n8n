/* eslint-disable import/no-cycle */
import config from '../../config';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';

export function isCredentialsSharingEnabled(): boolean {
	return isUserManagementEnabled() && config.getEnv('enterprise.features.sharing');
}

// return the difference between two arrays
export function rightDiff<T1, T2>(
	[arr1, keyExtractor1]: [T1[], (item: T1) => string],
	[arr2, keyExtractor2]: [T2[], (item: T2) => string],
): T2[] {
	// create map { itemKey => true } for fast lookup for diff
	const keyMap = arr1.reduce<{ [key: string]: true }>((map, item) => {
		// eslint-disable-next-line no-param-reassign
		map[keyExtractor1(item)] = true;
		return map;
	}, {});

	// diff against map
	return arr2.reduce<T2[]>((acc, item) => {
		if (!keyMap[keyExtractor2(item)]) {
			acc.push(item);
		}
		return acc;
	}, []);
}
