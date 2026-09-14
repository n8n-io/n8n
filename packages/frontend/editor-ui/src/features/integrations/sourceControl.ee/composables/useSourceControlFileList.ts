import type { SourceControlledFile } from '@n8n/api-types';
import orderBy from 'lodash/orderBy';
import { computed, type Ref } from 'vue';

type SourceControlledFileWithOptionalProject = SourceControlledFile & {
	project?: { id: string };
};

type SortByEntry<T extends SourceControlledFileWithOptionalProject> =
	| keyof T
	| ((file: T) => unknown);

type UseSourceControlFileListOptions<T extends SourceControlledFileWithOptionalProject> = {
	files: Readonly<Ref<T[]>>;
	sortBy: Array<SortByEntry<T>>;
	sortOrder: Array<'asc' | 'desc'>;
	filter?: (file: T) => boolean;
};

export function useSourceControlFileList<T extends SourceControlledFileWithOptionalProject>({
	files,
	sortBy,
	sortOrder,
	filter,
}: UseSourceControlFileListOptions<T>) {
	const list = computed(() => {
		const filtered = filter ? files.value.filter(filter) : files.value;
		const ordered = orderBy(filtered, sortBy, sortOrder);
		return ordered;
	});

	return list;
}
