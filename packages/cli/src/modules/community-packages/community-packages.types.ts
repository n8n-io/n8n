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
			wanted: string;
			latest: string;
			location: string;
		};
	};

	export type PackageStatusCheck = {
		status: 'OK' | 'Banned';
		reason?: string;
	};
}
