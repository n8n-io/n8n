import type { PolicyViolation } from '@n8n/api-types';
import {
	getGeneratedToolVariantBase,
	getRestrictionMessage,
	getViolationVerdict,
	type RestrictionMessage,
} from '@n8n/frontend-module-type-availability-policies';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ToolPolicyRefusal } from '@/features/ai/shared/agentsChat/toolPolicyRefusal';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

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

	// Agents run the generated tool variant of a node, so the base names the subject.
	function nodeTypeName(type: string): string | undefined {
		const base = getGeneratedToolVariantBase(type, nodeTypesStore.getNodeType);
		return nodeTypesStore.getNodeType(base ?? type)?.displayName;
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
