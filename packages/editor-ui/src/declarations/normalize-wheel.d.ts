declare module 'normalize-wheel' {
	function normalizeWheel(e: WheelEvent): {
		spinX: number;
		spinY: number;
		pixelX: number;
		pixelY: number;
	};

	export = normalizeWheel;
}
