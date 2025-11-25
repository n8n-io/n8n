export type FaviconStatus = 'default' | 'executing' | 'success' | 'error';

const STATUS_COLORS = {
	executing: '#333333',
	success: '#4CAF50',
	error: '#F44336',
} as const;

const ORIGINAL_FAVICON_PATH = '/favicon.ico';

// Get the current favicon from DOM (may be dynamically set by Logo component)
function getCurrentFavicon(): string {
	const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	return link?.href || ORIGINAL_FAVICON_PATH;
}

/**
 * Creates a canvas with the original favicon and an optional status indicator dot
 */
async function createFaviconWithStatus(status: FaviconStatus): Promise<string> {
	const currentFavicon = getCurrentFavicon();

	if (status === 'default') {
		return await Promise.resolve(currentFavicon);
	}

	return await new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		const size = 32;
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			resolve(currentFavicon);
			return;
		}

		const img = new Image();
		// Remove crossOrigin to avoid CORS issues with same-origin favicon
		// img.crossOrigin = 'anonymous';

		img.onload = () => {
			// Draw the original favicon
			ctx.drawImage(img, 0, 0, size, size);

			// Draw status indicator in bottom-right corner
			const indicatorSize = 9;
			const indicatorRadius = indicatorSize / 2;
			const centerX = size - indicatorRadius;
			const centerY = size - indicatorRadius;

			// Calculate clearance radius based on status (triangle needs more space)
			let clearanceRadius = indicatorRadius + 3; // Default extra space
			if (status === 'executing') {
				// Triangle is 1.3x larger, so needs proportionally more clearance
				const triangleSize = indicatorSize * 1.3;
				clearanceRadius = (triangleSize / 2) * 1.2 + 3;
			}

			// Clear a circular area around where the indicator will be (to create space from logo)
			ctx.save();
			ctx.globalCompositeOperation = 'destination-out';
			ctx.fillStyle = 'rgba(0, 0, 0, 1)';
			ctx.beginPath();
			ctx.arc(centerX, centerY, clearanceRadius, 0, 2 * Math.PI);
			ctx.fill();
			ctx.restore();

			// Draw colored status indicator with shape based on status
			ctx.fillStyle = STATUS_COLORS[status as keyof typeof STATUS_COLORS];

			if (status === 'executing') {
				// Draw triangle (play button style) - 1.3x larger
				const triangleSize = indicatorSize * 1.3;
				const height = triangleSize;
				const width = triangleSize * 0.85;
				ctx.beginPath();
				ctx.moveTo(centerX - width / 2, centerY - height / 2);
				ctx.lineTo(centerX - width / 2, centerY + height / 2);
				ctx.lineTo(centerX + width / 2, centerY);

				ctx.closePath();
				ctx.fill();
			} else if (status === 'error') {
				// Draw square - larger size
				const squareSize = indicatorSize;
				ctx.fillRect(centerX - squareSize / 2, centerY - squareSize / 2, squareSize, squareSize);
			} else {
				// Draw circle (success or default)
				ctx.beginPath();
				ctx.arc(centerX, centerY, indicatorRadius, 0, 2 * Math.PI);
				ctx.fill();
			}

			resolve(canvas.toDataURL('image/png'));
		};

		img.onerror = () => {
			resolve(currentFavicon);
		};

		img.src = currentFavicon;
	});
}

/**
 * Updates the page favicon to reflect the current workflow execution status
 */
export async function updateFavicon(status: FaviconStatus): Promise<void> {
	const faviconUrl = await createFaviconWithStatus(status);

	// Find or create the favicon link element
	let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	if (!link) {
		link = document.createElement('link');
		link.rel = 'icon';
		document.head.appendChild(link);
	}

	link.href = faviconUrl;
}

/**
 * Resets the favicon to the default state
 */
export function resetFavicon(): void {
	void updateFavicon('default');
}
