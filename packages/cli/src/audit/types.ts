import type { WorkflowEntity as Workflow } from '@/databases/entities/WorkflowEntity';

export namespace Risk {
	export type Category = 'database' | 'credentials' | 'nodes' | 'instance' | 'filesystem';

	type CredLocation = {
		kind: 'credential';
		id: string;
		name: string;
	};

	export type NodeLocation = {
		kind: 'node';
		workflowId: string;
		workflowName: string;
		nodeId: string;
		nodeName: string;
		nodeType: string;
	};

	export type CommunityNodeDetails = {
		kind: 'community';
		nodeType: string;
		packageUrl: string;
	};

	export type CustomNodeDetails = {
		kind: 'custom';
		nodeType: string;
		filePath: string;
	};

	type SectionBase = {
		title: string;
		description: string;
		recommendation: string;
	};

	export type Report = StandardReport | InstanceReport;

	export type StandardSection = SectionBase & {
		location: NodeLocation[] | CredLocation[] | CommunityNodeDetails[] | CustomNodeDetails[];
	};

	export type InstanceSection = SectionBase & {
		location?: NodeLocation[];
		settings?: Record<string, unknown>;
		nextVersions?: n8n.Version[];
	};

	export type StandardReport = {
		risk: Exclude<Category, 'instance'>;
		sections: StandardSection[];
	};

	export type InstanceReport = {
		risk: 'instance';
		sections: InstanceSection[];
	};

	export type Audit = {
		[reportTitle: string]: Report;
	};

	export type SyncReportFn = (workflows: Workflow[]) => StandardReport | null;

	export type AsyncReportFn = (workflows: Workflow[]) => Promise<Report | null>;
}

export namespace n8n {
	export type Version = {
		name: string;
		nodes: Array<
			Workflow['nodes'][number] & {
				iconData?: { type: string; fileBuffer: string }; // removed to declutter report
			}
		>;
		createdAt: string;
		description: string;
		documentationUrl: string;
		hasBreakingChange: boolean;
		hasSecurityFix: boolean;
		hasSecurityIssue: boolean;
		securityIssueFixVersion: string;
	};
}
