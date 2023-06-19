import type { VersionControlAggregatedFile, VersionControlStatus } from '@/Interface';

export function aggregateVersionControlFiles(versionControlStatus: VersionControlStatus) {
	return versionControlStatus.files.reduce<VersionControlAggregatedFile[]>((acc, file) => {
		const staged = versionControlStatus.staged.includes(file.path);

		let status = '';
		(
			['conflicted', 'created', 'deleted', 'modified', 'renamed'] as Array<
				keyof VersionControlStatus
			>
		).forEach((key) => {
			const filesForStatus = versionControlStatus[key] as string[];
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
