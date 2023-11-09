import type { SourceControlAggregatedFile, SourceControlStatus } from '@/Interface';

export function aggregateSourceControlFiles(sourceControlStatus: SourceControlStatus) {
	return sourceControlStatus.files.reduce<SourceControlAggregatedFile[]>((acc, file) => {
		const staged = sourceControlStatus.staged.includes(file.path);

		let status = '';
		(
			['conflicted', 'created', 'deleted', 'modified', 'renamed'] as Array<
				keyof SourceControlStatus
			>
		).forEach((key) => {
			const filesForStatus = sourceControlStatus[key] as string[];
			if (filesForStatus.includes(file.path)) {
				status = key;
			}
		});

		acc.push({
			path: file.path,
			status,
			staged,
		});

		return acc;
	}, []);
}
