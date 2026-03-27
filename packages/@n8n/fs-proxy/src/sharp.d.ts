// sharp is overridden to empty-npm-package in the root package.json
// (native binary not available in monorepo CI). This shim satisfies
// the TypeScript compiler; actual sharp usage only runs on the gateway.
declare module 'sharp' {
	interface RawOptions {
		width: number;
		height: number;
		channels: number;
	}

	interface SharpOptions {
		raw?: RawOptions;
	}

	interface Sharp {
		resize(width: number, height: number): Sharp;
		jpeg(options?: { quality?: number }): Sharp;
		toBuffer(): Promise<Buffer>;
	}

	function sharp(input?: Buffer | string, options?: SharpOptions): Sharp;
	export default sharp;
}
