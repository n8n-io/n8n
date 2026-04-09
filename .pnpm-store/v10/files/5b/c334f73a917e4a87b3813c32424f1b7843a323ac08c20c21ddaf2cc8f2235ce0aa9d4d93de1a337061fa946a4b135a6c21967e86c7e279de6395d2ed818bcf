import type { ScreenshotComparatorRegistry, ScreenshotMatcherOptions } from "../../../context.js";
export type ScreenshotMatcherArguments<ComparatorName extends keyof ScreenshotComparatorRegistry = keyof ScreenshotComparatorRegistry> = [name: string, testName: string, options: ScreenshotMatcherOptions<ComparatorName> & {
	element: string;
	screenshotOptions?: ScreenshotMatcherOptions<ComparatorName>["screenshotOptions"] & {
		mask?: readonly string[];
	};
}];
interface ScreenshotData {
	path: string;
	width: number;
	height: number;
}
export type ScreenshotMatcherOutput = Promise<{
	pass: false;
	outcome: "unstable-screenshot" | "missing-reference" | "mismatch";
	reference: ScreenshotData | null;
	actual: ScreenshotData | null;
	diff: ScreenshotData | null;
	message: string;
} | {
	pass: true;
	outcome: "update-reference" | "matched-immediately" | "matched-after-comparison";
}>;
export {};
