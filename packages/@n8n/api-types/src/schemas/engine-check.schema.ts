/** One reason why a workflow version can't run on an engine. */
export type EngineCheckReason = {
	code: string;
	/** The node that causes the problem, when there is one. */
	nodeName?: string;
	/** A fallback text for clients that don't map `code` to their own text. */
	message: string;
};

/** The result of the engine check that runs when a version is published. */
export type EngineCheckResult = { ok: true } | { ok: false; reasons: EngineCheckReason[] };
