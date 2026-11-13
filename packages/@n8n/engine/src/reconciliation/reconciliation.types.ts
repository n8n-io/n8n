/**
 * One row that a detector observed in a stuck state. The `kind` names the
 * stuck state, and not the method that detects it. The first write of the
 * repair compares the other values, so a row that changed after the detector
 * read it is not repaired.
 */
export type Finding =
	| { kind: 'execution-queued-no-message'; executionId: string; staleAfter: Date }
	| { kind: 'step-queued-no-message'; stepId: string; staleAfter: Date }
	| { kind: 'step-running-no-worker'; stepId: string; staleAfter: Date };

/** Finds rows in one stuck state. Writes nothing. */
export interface Detector {
	readonly name: string;
	readonly intervalMs: number;
	/** Returns at most one batch of findings that are true at the time `at`. */
	detect(at: Date): Promise<Finding[]>;
}

/** The compensating action for one kind of finding. */
export interface Repair<K extends Finding['kind']> {
	readonly kind: K;
	/**
	 * Repairs one row. The first write compares the values of the finding.
	 * Returns false when that write changed no row.
	 */
	apply(finding: Extract<Finding, { kind: K }>, at: Date): Promise<boolean>;
}

/** At most one repair for each kind. */
export type Repairs = { readonly [K in Finding['kind']]?: Repair<K> };
