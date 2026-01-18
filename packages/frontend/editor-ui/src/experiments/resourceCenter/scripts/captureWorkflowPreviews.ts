/**
 * Workflow Preview Screenshot Capture Script
 *
 * Captures workflow preview screenshots from n8n.io template pages
 * for use in the Resource Center template cards.
 *
 * Usage:
 *   pnpm add -D playwright sharp @types/sharp  # Install deps (if not present)
 *   npx playwright install chromium            # Install browser
 *   npx tsx src/experiments/resourceCenter/scripts/captureWorkflowPreviews.ts
 *
 * Output:
 *   Screenshots saved to ./workflow-previews/{templateId}.png
 */

import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template IDs from resourceCenterData.ts
const FEATURED_TEMPLATE_IDS = [7639, 3050, 4966, 7177, 8779, 3100];
const LEARN_TEMPLATE_IDS = [8527, 6270];
const ALL_TEMPLATE_IDS = [...FEATURED_TEMPLATE_IDS, ...LEARN_TEMPLATE_IDS];

// Screenshot dimensions for featured templates (smaller cards)
const FEATURED_CAPTURE_WIDTH = 320;
const FEATURED_CAPTURE_HEIGHT = 180;
const CROP_MARGIN = 5;
const FEATURED_FINAL_WIDTH = FEATURED_CAPTURE_WIDTH - CROP_MARGIN * 2; // 310
const FEATURED_FINAL_HEIGHT = FEATURED_CAPTURE_HEIGHT - CROP_MARGIN * 2; // 170

// Screenshot dimensions for learn templates (larger cards)
const LEARN_CAPTURE_WIDTH = 640;
const LEARN_CAPTURE_HEIGHT = 360;
const LEARN_FINAL_WIDTH = LEARN_CAPTURE_WIDTH - CROP_MARGIN * 2; // 630
const LEARN_FINAL_HEIGHT = LEARN_CAPTURE_HEIGHT - CROP_MARGIN * 2; // 350

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'workflow-previews');

interface CaptureResult {
	templateId: number;
	success: boolean;
	error?: string;
	outputPath?: string;
}

async function ensureOutputDir(): Promise<void> {
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		console.log(`Created output directory: ${OUTPUT_DIR}`);
	}
}

interface CaptureDimensions {
	captureWidth: number;
	captureHeight: number;
	finalWidth: number;
	finalHeight: number;
}

type ThemeMode = 'light' | 'dark';

async function captureWorkflowPreview(
	templateId: number,
	browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never,
	dimensions: CaptureDimensions,
	theme: ThemeMode = 'light',
): Promise<CaptureResult> {
	const templateUrl = `https://n8n.io/workflows/${templateId}`;
	const suffix = theme === 'dark' ? '-dark' : '';
	const outputPath = path.join(OUTPUT_DIR, `${templateId}${suffix}.png`);

	console.log(`\nCapturing template ${templateId} (${theme})...`);
	console.log(`  Template URL: ${templateUrl}`);

	const context = await browser.newContext({
		viewport: { width: 1400, height: 1000 },
	});
	const page = await context.newPage();

	try {
		// Navigate to template page
		await page.goto(templateUrl, { waitUntil: 'networkidle', timeout: 30000 });

		// Wait for workflow viewer container to load
		await page.waitForSelector('.workflow-viewer', { timeout: 15000 });

		// Find the preview iframe element
		const iframes = await page.$$('iframe');
		let iframeElement = null;

		for (const frame of iframes) {
			const src = await frame.getAttribute('src');
			if (src && src.includes('preview')) {
				iframeElement = frame;
				break;
			}
		}

		// Fallback: find iframe with proper dimensions
		if (!iframeElement) {
			for (const frame of iframes) {
				const box = await frame.boundingBox();
				if (box && box.width > 500 && box.height > 400) {
					iframeElement = frame;
					break;
				}
			}
		}

		if (!iframeElement) {
			throw new Error('Preview iframe not found on page');
		}

		// Switch theme if needed by modifying the iframe src
		if (theme === 'dark') {
			const currentSrc = await iframeElement.getAttribute('src');
			if (currentSrc) {
				const darkSrc = currentSrc.replace('theme=light', 'theme=dark');
				await iframeElement.evaluate((el, newSrc) => {
					(el as HTMLIFrameElement).src = newSrc;
				}, darkSrc);
				// Wait for iframe to reload with new theme
				await page.waitForTimeout(2000);
			}
		}

		// Get the frame content to hide controls
		const frame = await iframeElement.contentFrame();
		if (frame) {
			// Wait for the workflow canvas to render inside the iframe
			try {
				await frame.waitForSelector('.vue-flow', { timeout: 15000 });

				// Hide canvas controls and other UI elements inside the iframe
				await frame.evaluate(() => {
					const controls = document.querySelector('[data-test-id="canvas-controls"]');
					if (controls) {
						(controls as HTMLElement).style.display = 'none';
					}
					// Hide minimap
					const minimap = document.querySelector('.vue-flow__minimap');
					if (minimap) {
						(minimap as HTMLElement).style.display = 'none';
					}
				});
			} catch {
				console.log('  Note: Could not modify iframe content');
			}
		}

		// Wait for rendering
		await page.waitForTimeout(2000);

		// Take a screenshot of the iframe element
		const rawBuffer = await iframeElement.screenshot({
			type: 'png',
		});

		// Get dimensions for logging
		const box = await iframeElement.boundingBox();
		if (box) {
			console.log(`  Iframe capture: ${Math.round(box.width)}x${Math.round(box.height)}`);
		}

		// Resize to target dimensions and crop edges
		// Use the full iframe capture to show the entire workflow
		await sharp(rawBuffer)
			.resize(dimensions.captureWidth, dimensions.captureHeight, {
				fit: 'cover',
				position: 'center',
			})
			.extract({
				left: CROP_MARGIN,
				top: CROP_MARGIN,
				width: dimensions.finalWidth,
				height: dimensions.finalHeight,
			})
			.toFile(outputPath);

		console.log(`  Saved: ${outputPath} (${dimensions.finalWidth}x${dimensions.finalHeight})`);

		return {
			templateId,
			success: true,
			outputPath,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`  Error: ${errorMessage}`);
		return {
			templateId,
			success: false,
			error: errorMessage,
		};
	} finally {
		await context.close();
	}
}

async function main(): Promise<void> {
	console.log('Workflow Preview Screenshot Capture');
	console.log('===================================\n');
	console.log(`Templates to capture: ${ALL_TEMPLATE_IDS.join(', ')}`);
	console.log(`Output directory: ${OUTPUT_DIR}`);
	console.log(`Featured image size: ${FEATURED_FINAL_WIDTH}x${FEATURED_FINAL_HEIGHT}px`);
	console.log(`Learn image size: ${LEARN_FINAL_WIDTH}x${LEARN_FINAL_HEIGHT}px`);

	await ensureOutputDir();

	const browser = await chromium.launch({
		headless: true,
	});

	const results: CaptureResult[] = [];

	const featuredDimensions: CaptureDimensions = {
		captureWidth: FEATURED_CAPTURE_WIDTH,
		captureHeight: FEATURED_CAPTURE_HEIGHT,
		finalWidth: FEATURED_FINAL_WIDTH,
		finalHeight: FEATURED_FINAL_HEIGHT,
	};

	const learnDimensions: CaptureDimensions = {
		captureWidth: LEARN_CAPTURE_WIDTH,
		captureHeight: LEARN_CAPTURE_HEIGHT,
		finalWidth: LEARN_FINAL_WIDTH,
		finalHeight: LEARN_FINAL_HEIGHT,
	};

	// Capture both light and dark mode versions
	for (const theme of ['light', 'dark'] as ThemeMode[]) {
		console.log(`\n--- Capturing ${theme} mode ---`);
		for (const templateId of ALL_TEMPLATE_IDS) {
			const isLearnTemplate = LEARN_TEMPLATE_IDS.includes(templateId);
			const dimensions = isLearnTemplate ? learnDimensions : featuredDimensions;
			const result = await captureWorkflowPreview(templateId, browser, dimensions, theme);
			results.push(result);
		}
	}

	await browser.close();

	// Summary
	console.log('\n\nCapture Summary');
	console.log('===============');

	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	console.log(`\nSuccessful: ${successful.length}/${results.length}`);
	for (const result of successful) {
		console.log(`  - ${result.templateId}: ${result.outputPath}`);
	}

	if (failed.length > 0) {
		console.log(`\nFailed: ${failed.length}/${results.length}`);
		for (const result of failed) {
			console.log(`  - ${result.templateId}: ${result.error}`);
		}
	}

	console.log('\nDone!');
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
