import { jsonParse } from 'n8n-workflow';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { formatEntityFile } from '@/modules/n8n-packages/io/entity-file-format';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';

/**
 * Each workflow keeps its own requirements in `requirements.json` next to `workflow.json`. A
 * workflow file changes only when its workflow changes, so two merge requests that touch
 * different workflows never change the same file. Reads join the files into the `requirements`
 * block that import expects. The file lists what the workflow uses, so a row has no `usedBy`.
 */
const WORKFLOW_REQUIREMENTS_FILE = 'requirements.json';

const nonEmpty = z.string().min(1);

const workflowRequirementsSchema = z.object({
	credentials: z
		.array(z.object({ id: nonEmpty, name: nonEmpty.optional(), type: nonEmpty.optional() }))
		.optional(),
	dataTables: z.array(z.object({ id: nonEmpty, name: nonEmpty })).optional(),
	workflows: z.array(z.object({ id: nonEmpty, name: nonEmpty.optional() })).optional(),
	variables: z.array(z.object({ name: nonEmpty })).optional(),
	tags: z.array(z.object({ id: nonEmpty, name: nonEmpty })).optional(),
});

export type WorkflowRequirements = z.infer<typeof workflowRequirementsSchema>;

/** `null` when the file is not valid. */
export function parseWorkflowRequirements(
	raw: string | Buffer | undefined,
): WorkflowRequirements | null {
	if (raw === undefined) return null;
	let json: unknown;
	try {
		json = jsonParse(raw.toString());
	} catch {
		return null;
	}
	const parsed = workflowRequirementsSchema.safeParse(json);
	return parsed.success ? parsed.data : null;
}

export function workflowRequirementsPath(workflowTarget: string): string {
	return `${workflowTarget}/${WORKFLOW_REQUIREMENTS_FILE}`;
}

type WorkflowConsumer = { kind: 'workflow'; id: string };
type Row = { usedBy: Array<{ kind: 'agent' | 'workflow'; id: string }> };

/** The rows that a workflow uses, without their consumers. */
function rowsOfWorkflow<T extends Row>(
	rows: T[] | undefined,
	workflowId: string,
): Array<Omit<T, 'usedBy'>> | undefined {
	const own = (rows ?? [])
		.filter(({ usedBy }) => usedBy.some(({ kind, id }) => kind === 'workflow' && id === workflowId))
		.map(({ usedBy: _usedBy, ...row }) => row);
	return own.length > 0 ? own : undefined;
}

/**
 * The requirements of each workflow. Consumers that are not workflows, such as Agents, and the
 * node types, which import derives from the workflows, are left out.
 */
export function splitRequirementsByWorkflow(
	requirements: PackageRequirements | undefined,
	workflowIds: Iterable<string>,
): Map<string, WorkflowRequirements> {
	const byWorkflow = new Map<string, WorkflowRequirements>();
	for (const workflowId of workflowIds) {
		const credentials = rowsOfWorkflow(requirements?.credentials, workflowId);
		const dataTables = rowsOfWorkflow(requirements?.dataTables, workflowId);
		const workflows = rowsOfWorkflow(requirements?.workflows, workflowId);
		const variables = rowsOfWorkflow(requirements?.variables, workflowId);
		const tags = rowsOfWorkflow(requirements?.tags, workflowId);
		const own: WorkflowRequirements = {
			...(credentials ? { credentials } : {}),
			...(dataTables ? { dataTables } : {}),
			...(workflows ? { workflows } : {}),
			...(variables ? { variables } : {}),
			...(tags ? { tags } : {}),
		};
		if (Object.keys(own).length > 0) byWorkflow.set(workflowId, own);
	}
	return byWorkflow;
}

/**
 * Joins the rows of every workflow by key. A row takes its details from the first workflow, in id
 * order, that has them, so the result does not depend on the order of the files.
 */
function joinRows<T extends { name?: string }, R>(
	byWorkflow: ReadonlyMap<string, T[] | undefined>,
	keyOf: (row: T) => string,
	toRow: (row: T, usedBy: WorkflowConsumer[]) => R,
): R[] | undefined {
	const groups = new Map<string, { rows: T[]; workflowIds: string[] }>();
	for (const [workflowId, rows] of [...byWorkflow].sort(([a], [b]) => (a < b ? -1 : 1))) {
		for (const row of rows ?? []) {
			const key = keyOf(row);
			const group = groups.get(key) ?? { rows: [], workflowIds: [] };
			group.rows.push(row);
			group.workflowIds.push(workflowId);
			groups.set(key, group);
		}
	}
	const joined = [...groups.entries()]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([, { rows, workflowIds }]) => {
			const details = rows.reduceRight((later, earlier) => ({ ...later, ...earlier }));
			return toRow(
				details,
				workflowIds.map((id): WorkflowConsumer => ({ kind: 'workflow', id })),
			);
		});
	return joined.length > 0 ? joined : undefined;
}

/** The `requirements` block of the package, from the requirements of its workflows. */
export function joinWorkflowRequirements(
	byWorkflow: ReadonlyMap<string, WorkflowRequirements>,
): PackageRequirements | undefined {
	const pick = <K extends keyof WorkflowRequirements>(kind: K) =>
		new Map([...byWorkflow].map(([id, own]) => [id, own[kind]]));
	const credentials = joinRows(
		pick('credentials'),
		({ id }) => id,
		({ id, name, type }, usedBy) => ({
			id,
			...(name ? { name } : {}),
			...(type ? { type } : {}),
			usedBy,
		}),
	);
	const dataTables = joinRows(
		pick('dataTables'),
		({ id }) => id,
		({ id, name }, usedBy) => ({ id, name, usedBy }),
	);
	const workflows = joinRows(
		pick('workflows'),
		({ id }) => id,
		({ id, name }, usedBy) => ({ id, ...(name ? { name } : {}), usedBy }),
	);
	const variables = joinRows(
		pick('variables'),
		({ name }) => name,
		({ name }, usedBy) => ({ name, usedBy }),
	);
	const tags = joinRows(
		pick('tags'),
		({ id }) => id,
		({ id, name }, usedBy) => ({ id, name, usedBy }),
	);
	const requirements: PackageRequirements = {
		...(credentials ? { credentials } : {}),
		...(dataTables ? { dataTables } : {}),
		...(workflows ? { workflows } : {}),
		...(variables ? { variables } : {}),
		...(tags ? { tags } : {}),
	};
	return Object.keys(requirements).length > 0 ? requirements : undefined;
}

/**
 * Writes the requirements of every workflow in the manifest next to its workflow file, and
 * removes the file of a workflow that has none. The manifest itself is not written: the branch
 * holds no `manifest.json`, because the entity files and these files carry the same facts.
 */
export async function writeWorkflowRequirementFiles(
	packageFolder: string,
	manifest: PackageManifest,
): Promise<void> {
	const workflows = manifest.workflows ?? [];
	const byWorkflow = splitRequirementsByWorkflow(
		manifest.requirements,
		workflows.map(({ id }) => id),
	);
	for (const { id, target } of workflows) {
		const file = path.join(packageFolder, workflowRequirementsPath(target));
		const own = byWorkflow.get(id);
		if (own) await fs.writeFile(file, formatEntityFile(own));
		else await fs.rm(file, { force: true });
	}
	await fs.rm(path.join(packageFolder, MANIFEST_FILE), { force: true });
}
