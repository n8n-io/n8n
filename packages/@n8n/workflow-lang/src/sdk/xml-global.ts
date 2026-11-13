/**
 * The `XML` and `Ascii` library functions (spec section 4.3) for the type check of this
 * package: library nodes in `src/nodes/` call them. Workflow code gets them
 * from the compiler's own declarations (`src/compiler/lib-dts.ts`).
 */
interface WorkflowXml {
	parse(text: string): unknown;
	snippet(html: string): string;
	content(element: unknown): unknown;
}

/** The `Ascii` checks of spec section 4.3. */
interface WorkflowAscii {
	is(text: string): boolean;
	isPrintable(text: string): boolean;
}

/** The `Base64` codec of spec section 4.3. */
interface WorkflowBase64 {
	encodeUtf8(text: string): string;
}

declare global {
	// oxlint-disable-next-line no-var -- a global needs `var` in a declaration.
	var XML: WorkflowXml;
	// oxlint-disable-next-line no-var -- a global needs `var` in a declaration.
	var Ascii: WorkflowAscii;
	// oxlint-disable-next-line no-var -- a global needs `var` in a declaration.
	var Base64: WorkflowBase64;
}

export {};
