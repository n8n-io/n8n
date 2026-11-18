export async function downloadArtwork(element: SVGSVGElement, format: 'svg' | 'png') {
	const artwork = element.cloneNode(true);
	if (!(artwork instanceof SVGSVGElement)) return;
	// Exports are still images. Keep the SVG independent of page styles.
	for (const star of artwork.querySelectorAll('[style]')) star.removeAttribute('style');
	const svg = new Blob([new XMLSerializer().serializeToString(artwork)], {
		type: 'image/svg+xml;charset=utf-8',
	});
	let blob = svg;
	if (format === 'png') {
		const url = URL.createObjectURL(svg);
		try {
			const image = new Image();
			image.src = url;
			await image.decode();
			const canvas = document.createElement('canvas');
			canvas.width = 3200;
			canvas.height = 2000;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Canvas unavailable');
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(result) => (result ? resolve(result) : reject(new Error('Image export failed'))),
					'image/png',
				);
			});
		} finally {
			URL.revokeObjectURL(url);
		}
	}
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `workflow-constellation.${format}`;
	link.click();
	// Give the browser time to start the download before releasing the URL.
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
