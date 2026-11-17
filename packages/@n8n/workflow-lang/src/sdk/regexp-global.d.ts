/**
 * `RegExp.exec` of spec section 4.6 for the type check of this package: library nodes in
 * `src/nodes/` call it. Workflow code gets it from the declarations of the compiler
 * (`src/compiler/lib-dts.ts`).
 */
interface RegExpConstructor {
	exec(source: string, flags: string, input: string, lastIndex: number): number[] | null;
}
