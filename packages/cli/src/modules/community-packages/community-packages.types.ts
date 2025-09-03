export namespace CommunityPackages {
	export type ParsedPackageName = {
		packageName: string;
		rawString: string;
		scope?: string;
		version?: string;
	};

	export type AvailableUpdates = {
		[packageName: string]: {
			current: string;
			latest: string;
		};
	};

	export type PackageStatusCheck = {
		status: 'OK' | 'Banned';
		reason?: string;
	};
}
