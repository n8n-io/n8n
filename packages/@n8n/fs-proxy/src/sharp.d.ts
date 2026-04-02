declare module 'sharp' {
	interface Sharp {
		resize(width: number, height?: number): Sharp;
		png(): Sharp;
		jpeg(options?: { quality?: number }): Sharp;
		toBuffer(): Promise<Buffer>;
		metadata(): Promise<{ width?: number; height?: number; format?: string }>;
	}

	interface SharpOptions {
		raw?: { width: number; height: number; channels: 1 | 2 | 3 | 4 };
	}

	function sharp(input?: Buffer | string, options?: SharpOptions): Sharp;

	// eslint-disable-next-line import-x/no-default-export
	export default sharp;
}
