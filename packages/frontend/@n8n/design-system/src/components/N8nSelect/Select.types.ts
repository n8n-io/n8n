import type { ElSelect } from 'element-plus';

/**
 * The wrapped element-plus instance, exposed by N8nSelect so callers can reach
 * APIs we do not proxy (`handleClose`, `$refs`, …).
 *
 * Declared here rather than inside the SFC: element-plus' instance type is far
 * too large for the compiler to write out structurally, so the emitted
 * declarations need a named type in a real module to point at (TS7056).
 */
export type InnerSelectRef = InstanceType<typeof ElSelect>;

/**
 * What N8nSelect exposes on its template ref.
 *
 * Named explicitly so the emitted declarations can reference this interface
 * instead of expanding `ShallowUnwrapRef<…>` structurally over the element-plus
 * instance type, which the compiler refuses to serialize (TS7056).
 */
export interface N8nSelectExposed {
	focus: () => void;
	blur: () => void;
	focusOnInput: () => void;
	/** The wrapped element-plus instance; `null` until mounted. */
	innerSelect: InnerSelectRef | null;
}
