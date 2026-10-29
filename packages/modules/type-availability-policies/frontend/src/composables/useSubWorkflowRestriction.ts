import type { PolicyViolation } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { EXECUTE_WORKFLOW_NODE_TYPE, getSubworkflowId, type INode } from 'n8n-workflow';
import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { isRestrictionScope } from '../type-availability-policies.constants';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

type CallingNode = Pick<INode, 'type' | 'parameters'>;

/**
 * The stored workflow an Execute Workflow node calls, when it is known before a run. Inline and
 * URL sources have no stored sub-workflow, and an expression resolves only at run time.
 */
export function getCalledSubWorkflowId(node: CallingNode): string | null {
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE) return null;
	if ((node.parameters.source ?? 'database') !== 'database') return null;

	// Execute Workflow v1 stores the id as a plain string, later versions as a resource locator.
	const id =
		typeof node.parameters.workflowId === 'string'
			? node.parameters.workflowId
			: getSubworkflowId(node);
	if (typeof id !== 'string' || id === '' || id.startsWith('=')) return null;

	return id;
}

/** What blocks a call to a sub-workflow, merged over its draft and published versions. */
export type SubWorkflowRestriction = {
	/** One per blocked node type, in the order the draft and then the published version name them. */
	violations: PolicyViolation[];
	projectName?: string;
	/** Manual runs execute the draft. */
	blocksDraft: boolean;
	/**
	 * Production runs execute the published version. Without one, the draft decides: it is what
	 * a publish would carry, and the publish check refuses the same node types.
	 */
	blocksPublished: boolean;
};

const isNodeTypeViolation = (violation: PolicyViolation) => violation.subjectType === 'nodeType';

function toRestriction(
	draft: PolicyViolation[],
	published: PolicyViolation[] | null,
	projectName?: string,
): SubWorkflowRestriction | null {
	const draftViolations = draft.filter(isNodeTypeViolation);
	const publishedViolations = (published ?? []).filter(isNodeTypeViolation);

	const bySubject = new Map<string, PolicyViolation>();
	for (const violation of [...draftViolations, ...publishedViolations]) {
		const key = violation.subject ?? violation.message;
		if (!bySubject.has(key)) bySubject.set(key, violation);
	}
	if (bySubject.size === 0) return null;

	return {
		violations: [...bySubject.values()],
		projectName,
		blocksDraft: draftViolations.length > 0,
		blocksPublished:
			published === null ? draftViolations.length > 0 : publishedViolations.length > 0,
	};
}

/**
 * Whether the sub-workflow an Execute Workflow node calls uses a node type that blocks the call.
 * Loads the answer for the node and keeps it current when the node or the parent changes. Pass
 * `refresh` from a surface that must not show a cached answer. `checkFailed` is true when the
 * answer could not load: the real start fails closed then, so it is not "no restriction".
 */
export function useSubWorkflowRestriction({
	parentWorkflowId,
	node,
	enabled = true,
	refresh = false,
}: {
	parentWorkflowId: MaybeRefOrGetter<string | null | undefined>;
	node: MaybeRefOrGetter<CallingNode | null | undefined>;
	enabled?: MaybeRefOrGetter<boolean>;
	refresh?: boolean;
}) {
	const store = useTypeAvailabilityPoliciesStore();

	const target = computed(() => {
		const parentId = toValue(parentWorkflowId);
		const callingNode = toValue(node);
		if (!toValue(enabled) || !parentId || !callingNode) return null;

		const subWorkflowId = getCalledSubWorkflowId(callingNode);
		return subWorkflowId ? { parentId, subWorkflowId } : null;
	});

	watch(
		() => (target.value ? `${target.value.parentId}:${target.value.subWorkflowId}` : null),
		(key, previousKey) => {
			if (!key || !target.value) return;

			const { parentId, subWorkflowId } = target.value;
			void store.fetchSubWorkflowCheck(parentId, subWorkflowId, {
				force: refresh && previousKey === undefined,
			});
		},
		{ immediate: true },
	);

	const restriction = computed(() => {
		if (!target.value) return null;

		const check = store.getSubWorkflowCheck(target.value.parentId, target.value.subWorkflowId);
		return check ? toRestriction(check.draft, check.published, check.projectName) : null;
	});

	const isRestricted = computed(() => restriction.value !== null);

	const checkFailed = computed(
		() =>
			target.value !== null &&
			store.hasSubWorkflowCheckFailed(target.value.parentId, target.value.subWorkflowId),
	);

	async function retry(): Promise<void> {
		if (!target.value) return;

		await store.fetchSubWorkflowCheck(target.value.parentId, target.value.subWorkflowId, {
			force: true,
		});
	}

	return { restriction, isRestricted, checkFailed, retry };
}

const IMPACT_KEY = {
	both: 'typeAvailabilityPolicies.restrictedSubWorkflow.impact.both',
	draft: 'typeAvailabilityPolicies.restrictedSubWorkflow.impact.draft',
	published: 'typeAvailabilityPolicies.restrictedSubWorkflow.impact.published',
} satisfies Record<string, BaseTextKey>;

/**
 * Why calls to the sub-workflow fail, with one line for each scope that blocks. The project line
 * names the sub-workflow's project, never "this project": the parent may live elsewhere.
 * `labelOf` gives a node type's display name, which only the shell knows.
 */
export function describeSubWorkflowRestriction(
	{ violations, projectName, blocksDraft, blocksPublished }: SubWorkflowRestriction,
	labelOf: (violation: PolicyViolation) => string | undefined = () => undefined,
): string[] {
	const i18n = useI18n();

	const namesIn = (matches: (violation: PolicyViolation) => boolean) =>
		violations
			.filter(matches)
			// Quoted because some display names contain commas.
			.map((violation) => `'${labelOf(violation) ?? violation.subject ?? ''}'`)
			.join(', ');

	const scopeLines: Array<[BaseTextKey, string]> = [
		[
			'typeAvailabilityPolicies.restrictedSubWorkflow.scope.instance',
			namesIn((v) => v.scope === 'instance'),
		],
		[
			projectName
				? 'typeAvailabilityPolicies.restrictedSubWorkflow.scope.project'
				: 'typeAvailabilityPolicies.restrictedSubWorkflow.scope.projectUnnamed',
			namesIn((v) => v.scope === 'project'),
		],
		[
			'typeAvailabilityPolicies.restrictedSubWorkflow.scope.generic',
			namesIn((v) => v.scope === undefined || !isRestrictionScope(v.scope)),
		],
	];

	const impact = blocksDraft && blocksPublished ? 'both' : blocksDraft ? 'draft' : 'published';

	return [
		i18n.baseText('typeAvailabilityPolicies.restrictedSubWorkflow.title'),
		...scopeLines
			.filter(([, nodeTypes]) => nodeTypes !== '')
			.map(([key, nodeTypes]) =>
				i18n.baseText(key, { interpolate: { nodeTypes, projectName: projectName ?? '' } }),
			),
		i18n.baseText(IMPACT_KEY[impact]),
	];
}
