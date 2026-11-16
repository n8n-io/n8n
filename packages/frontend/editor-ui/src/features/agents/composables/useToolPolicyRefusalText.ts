import type { PolicyViolation } from '@n8n/api-types';
import {
	getRestrictionMessage,
	getViolationVerdict,
	type RestrictionMessage,
} from '@n8n/frontend-module-type-availability-policies';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ToolPolicyRefusal } from '@/features/ai/shared/agentsChat/toolPolicyRefusal';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

const TOOL_SUFFIX = 'Tool';

const REASON_KEY: Record<RestrictionMessage, BaseTextKey> = {
	instance: 'agents.chat.toolPolicyRefusal.reason',
	project: 'agents.chat.toolPolicyRefusal.reason.project',
	optIn: 'agents.chat.toolPolicyRefusal.reason.optIn',
	generic: 'agents.chat.toolPolicyRefusal.reason',
};

export function useToolPolicyRefusalText() {
	const i18n = useI18n();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	function nodeTypeName(type: string): string | undefined {
		// Agents run the generated `*Tool` variant of a usable-as-tool node. Real nodes such as
		// `agentTool` also end in `Tool`, so only a usable-as-tool base names the subject.
		if (type.endsWith(TOOL_SUFFIX)) {
			const base = nodeTypesStore.getNodeType(type.slice(0, -TOOL_SUFFIX.length));
			if (base?.usableAsTool) return base.displayName;
		}
		return nodeTypesStore.getNodeType(type)?.displayName;
	}

	/** Undefined until the types are loaded, so callers show a readable fallback, not a type id. */
	function subjectName(violation: PolicyViolation): string | undefined {
		const { subject, subjectType } = violation;
		if (!subject) return undefined;
		return subjectType === 'credentialType'
			? credentialsStore.getCredentialTypeByName(subject)?.displayName
			: nodeTypeName(subject);
	}

	/** The agent builder does not load node or credential types up front. */
	async function loadSubjectTypes(refusal: ToolPolicyRefusal) {
		const types = new Set(refusal.violations.map((v) => v.subjectType));
		await Promise.all([
			types.has('credentialType') ? credentialsStore.fetchCredentialTypes(false) : undefined,
			types.has('nodeType') ? nodeTypesStore.loadNodeTypesIfNotLoaded() : undefined,
		]);
	}

	function reason(violation: PolicyViolation, fallbackName: string): string {
		const message = getRestrictionMessage(getViolationVerdict(violation), violation.projectId);
		return i18n.baseText(REASON_KEY[message], {
			interpolate: { name: subjectName(violation) ?? fallbackName },
		});
	}

	return { subjectName, reason, loadSubjectTypes };
}
