import type { INode } from 'n8n-workflow';

import type { EngineV2Reason, EngineV2ReasonCode, EngineV2ReasonKind } from './types';

interface ReasonInput {
	code: EngineV2ReasonCode;
	kind: EngineV2ReasonKind;
	/** What engine v2 cannot run. A permanent or invalid reason also says what to change. */
	problem: string;
	node?: Pick<INode, 'id' | 'name'>;
	severity?: EngineV2Reason['severity'];
}

export function makeReason({
	code,
	kind,
	problem,
	node,
	severity = 'blocking',
}: ReasonInput): EngineV2Reason {
	const message =
		kind === 'temporary' ? `${problem} Run this workflow on engine v1 for now.` : problem;
	return {
		code,
		kind,
		severity,
		...(node && { nodeId: node.id, nodeName: node.name }),
		message,
	};
}
