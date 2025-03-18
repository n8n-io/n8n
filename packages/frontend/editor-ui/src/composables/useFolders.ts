import {
	FOLDER_NAME_ILLEGAL_CHARACTERS_REGEX,
	FOLDER_NAME_MAX_LENGTH,
	FOLDER_NAME_ONLY_DOTS_REGEX,
} from '@/constants';
import { useI18n } from './useI18n';

export function useFolders() {
	const i18n = useI18n();

	function validateFolderName(folderName: string): true | string {
		if (folderName.trim() === '') {
			return i18n.baseText('folders.invalidName.empty.message');
		}

		if (FOLDER_NAME_ONLY_DOTS_REGEX.test(folderName)) {
			return i18n.baseText('folders.invalidName.only.dots.message');
		}

		if (folderName.startsWith('.')) {
			return i18n.baseText('folders.invalidName.starts.with.dot..message');
		}

		if (FOLDER_NAME_ILLEGAL_CHARACTERS_REGEX.test(folderName)) {
			return i18n.baseText('folders.invalidName.invalidCharacters.message');
		}

		if (folderName.length > FOLDER_NAME_MAX_LENGTH) {
			return i18n.baseText('folders.invalidName.tooLong.message', {
				interpolate: {
					maxLength: FOLDER_NAME_MAX_LENGTH,
				},
			});
		}
		return true;
	}

	return {
		validateFolderName,
	};
}
