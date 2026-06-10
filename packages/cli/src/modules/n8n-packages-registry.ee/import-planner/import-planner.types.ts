import type { SourceControlledFile } from '@n8n/api-types';

import type { IWorkflowToImport } from '@/interfaces';

export type ImportResourceType = Extract<
	SourceControlledFile['type'],
	'credential' | 'datatable' | 'workflow'
>;

export const PROJECT_IMPORT_RESOURCE_TYPES = new Set<SourceControlledFile['type']>([
	'project',
	'workflow',
	'credential',
	'datatable',
	'folders',
]);

export type DependencyKind = 'credentialId' | 'dataTableId' | 'errorWorkflow' | 'workflowCall';

export type ResourceRef = {
	type: ImportResourceType;
	id: string;
};

export type WorkflowDependencyEdge = {
	from: ResourceRef;
	to: ResourceRef;
	kind: DependencyKind;
};

export type DependencyBlockingIssue =
	| {
			type: 'dependency-deleted-remotely' | 'dependency-missing' | 'dependency-not-selected';
			source: ResourceRef;
			target: ResourceRef;
			dependencyKind: DependencyKind;
	  }
	| {
			type: 'credential-unresolved';
			kind: 'not_found';
			sourceId: string;
			usedByWorkflows: string[];
	  };

export type ImportWarning = {
	type: 'dynamic-dependency-unchecked';
	source: ResourceRef;
	dependencyKind: Exclude<DependencyKind, 'credentialId'>;
};

export type ImportValidation = {
	blockingIssues: DependencyBlockingIssue[];
	warnings: ImportWarning[];
};

export type ProjectImportPlan = {
	projectId: string;
	selectedChanges: SourceControlledFile[];
	remoteResources: RemoteResourceSet;
	dependencyGraph: WorkflowDependencyEdge[];
	validation: ImportValidation;
	canApply: boolean;
};

export class RemoteResourceSet {
	readonly workflows = new Map<string, IWorkflowToImport>();

	has(ref: ResourceRef): boolean {
		return ref.type === 'workflow' && this.workflows.has(ref.id);
	}
}

export class SelectedResourceIndex {
	private readonly selected = new Map<string, SourceControlledFile>();

	constructor(readonly all: SourceControlledFile[]) {
		for (const change of all) {
			if (!isImportResourceType(change.type)) continue;
			this.selected.set(resourceKey({ type: change.type, id: change.id }), change);
		}
	}

	has(ref: ResourceRef): boolean {
		return this.selected.has(resourceKey(ref));
	}
}

export class LocalResourceSet {
	constructor(private readonly existing = new Set<string>()) {}

	static from(resources: ResourceRef[]): LocalResourceSet {
		return new LocalResourceSet(new Set(resources.map(resourceKey)));
	}

	has(ref: ResourceRef): boolean {
		return this.existing.has(resourceKey(ref));
	}
}

export class FutureResourceState {
	private readonly existing = new Set<string>();

	private readonly deleted = new Set<string>();

	constructor(private readonly localResources: LocalResourceSet) {}

	exists(ref: ResourceRef): boolean {
		const key = resourceKey(ref);
		return !this.deleted.has(key) && (this.existing.has(key) || this.localResources.has(ref));
	}

	wasDeleted(ref: ResourceRef): boolean {
		return this.deleted.has(resourceKey(ref));
	}

	upsert(ref: ResourceRef): void {
		const key = resourceKey(ref);
		this.deleted.delete(key);
		this.existing.add(key);
	}

	markDeleted(ref: ResourceRef): void {
		const key = resourceKey(ref);
		this.existing.delete(key);
		this.deleted.add(key);
	}
}

export function resourceRef(type: ImportResourceType, id: string): ResourceRef {
	return { type, id };
}

export function resourceKey(ref: ResourceRef): string {
	return `${ref.type}:${ref.id}`;
}

export function isImportResourceType(
	type: SourceControlledFile['type'],
): type is ImportResourceType {
	return type === 'credential' || type === 'datatable' || type === 'workflow';
}
