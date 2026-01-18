import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'workflow-previews');
const LEARN_CAPTURE_WIDTH = 640;
const LEARN_CAPTURE_HEIGHT = 360;
const CROP_MARGIN = 5;
const LEARN_FINAL_WIDTH = LEARN_CAPTURE_WIDTH - CROP_MARGIN * 2;
const LEARN_FINAL_HEIGHT = LEARN_CAPTURE_HEIGHT - CROP_MARGIN * 2;

async function captureTemplate(templateId: number) {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
	const page = await context.newPage();

	console.log(`Capturing ${templateId} dark...`);

	await page.goto(`https://n8n.io/workflows/${templateId}`, {
		waitUntil: 'domcontentloaded',
		timeout: 60000,
	});
	await page.waitForSelector('.workflow-viewer', { timeout: 30000 });

	const iframes = await page.$$('iframe');
	let iframeElement = null;
	for (const frame of iframes) {
		const src = await frame.getAttribute('src');
		if (src && src.includes('preview')) {
			iframeElement = frame;
			break;
		}
	}

	if (!iframeElement) {
		for (const frame of iframes) {
			const box = await frame.boundingBox();
			if (box && box.width > 500) {
				iframeElement = frame;
				break;
			}
		}
	}

	if (!iframeElement) throw new Error('No iframe found');

	// Switch to dark theme
	const currentSrc = await iframeElement.getAttribute('src');
	if (currentSrc) {
		const darkSrc = currentSrc.replace('theme=light', 'theme=dark');
		await iframeElement.evaluate((el, newSrc) => {
			(el as HTMLIFrameElement).src = newSrc;
		}, darkSrc);
		await page.waitForTimeout(3000);
	}

	const rawBuffer = await iframeElement.screenshot({ type: 'png' });

	await sharp(rawBuffer)
		.resize(LEARN_CAPTURE_WIDTH, LEARN_CAPTURE_HEIGHT, { fit: 'cover', position: 'center' })
		.extract({
			left: CROP_MARGIN,
			top: CROP_MARGIN,
			width: LEARN_FINAL_WIDTH,
			height: LEARN_FINAL_HEIGHT,
		})
		.toFile(path.join(OUTPUT_DIR, `${templateId}-dark.png`));

	console.log(`Saved ${templateId}-dark.png`);
	await browser.close();
}

async function main() {
	await captureTemplate(8527);
	await captureTemplate(6270);
	console.log('Done!');
}

main().catch(console.error);
