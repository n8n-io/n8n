import difference from 'lodash/difference';
import mapValues from 'lodash/mapValues';
import partition from 'lodash/partition';

const bindStringList = (isPostgres: boolean, values: string[]) =>
	isPostgres ? values : JSON.stringify(values);

const inBoundStringList = (isPostgres: boolean, parameter: string) =>
	isPostgres
		? `= ANY(CAST(:${parameter} AS text[]))`
		: `IN (SELECT value FROM json_each(:${parameter}))`;

export interface NodeTypesInProjects {
	projectIds: string[];
	nodeTypes: string[];
}

export interface RestrictedNodeTypes {
	shared: string[];
	byProjects: NodeTypesInProjects[];
	nodeTypesInUse: string[];
}

const projectNodeTypeKeys = (projectIds: string[], nodeTypes: string[]) =>
	projectIds.flatMap((projectId) => nodeTypes.map((nodeType) => `${projectId} ${nodeType}`));

export function keyProjectOutcomes({ byProjects, nodeTypesInUse }: RestrictedNodeTypes) {
	const [allowlists, denylists] = partition(
		byProjects,
		({ nodeTypes }) => nodeTypes.length * 2 > nodeTypesInUse.length,
	);

	return {
		exceptProjectIds: byProjects.flatMap(({ projectIds }) => projectIds),
		deniedKeys: denylists.flatMap(({ projectIds, nodeTypes }) =>
			projectNodeTypeKeys(projectIds, nodeTypes),
		),
		allowlistProjectIds: allowlists.flatMap(({ projectIds }) => projectIds),
		allowedKeys: allowlists.flatMap(({ projectIds, nodeTypes }) =>
			projectNodeTypeKeys(projectIds, difference(nodeTypesInUse, nodeTypes)),
		),
	};
}

export function restrictedNodeTypeMatch(restricted: RestrictedNodeTypes, isPostgres: boolean) {
	const inList = (parameter: string) => inBoundStringList(isPostgres, parameter);
	const { exceptProjectIds, deniedKeys, allowlistProjectIds, allowedKeys } =
		keyProjectOutcomes(restricted);
	const projectNodeType = "(restrictedOwner.projectId || ' ' || restrictedDep.dependencyKey)";

	const deniedByDefault = `restrictedDep.dependencyKey ${inList('restrictedShared')} AND NOT (restrictedOwner.projectId ${inList('restrictedExceptProjectIds')})`;
	const deniedInOwnProject = `${projectNodeType} ${inList('restrictedDeniedKeys')}`;
	const notInOwnAllowlist = `restrictedOwner.projectId ${inList('restrictedAllowlistProjectIds')} AND NOT (${projectNodeType} ${inList('restrictedAllowedKeys')})`;

	return {
		condition: `((${deniedByDefault}) OR ${deniedInOwnProject} OR (${notInOwnAllowlist}))`,
		parameters: mapValues(
			{
				restrictedShared: restricted.shared,
				restrictedExceptProjectIds: exceptProjectIds,
				restrictedDeniedKeys: deniedKeys,
				restrictedAllowlistProjectIds: allowlistProjectIds,
				restrictedAllowedKeys: allowedKeys,
			},
			(values) => bindStringList(isPostgres, values),
		),
	};
}
