import type { INodePropertyOptions, INodeProperties } from 'n8n-workflow';
import { useUsersStore } from '@/stores/users.store';

/**
 * Filter node operation options based on user role
 * Hide delete operations for member users in MongoDB and PostgreSQL nodes
 * This function filters both the operation options and their associated actions
 * to ensure member users cannot see or access delete functionality
 */
export function filterNodeOperationsByUserRole(
	nodeType: string,
	parameter: INodeProperties,
): INodeProperties {
	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser;

	// Only apply filtering to operation parameters
	if (parameter.name !== 'operation' || parameter.type !== 'options') {
		return parameter;
	}

	// Only apply to MongoDB and PostgreSQL nodes
	const restrictedNodeTypes = ['n8n-nodes-base.mongoDb', 'n8n-nodes-base.postgres'];
	if (!restrictedNodeTypes.includes(nodeType)) {
		return parameter;
	}

	// Only restrict for member users - owners and admins can see all operations
	if (!currentUser || currentUser.role !== 'global:member') {
		return parameter;
	}

	// Filter out delete operations for member users
	const filteredOptions = (parameter.options as INodePropertyOptions[]).filter((option) => {
		// For MongoDB: hide 'delete' operation and its action
		if (nodeType === 'n8n-nodes-base.mongoDb' && option.value === 'delete') {
			return false;
		}
		// For PostgreSQL: hide 'deleteTable' operation and its action
		if (nodeType === 'n8n-nodes-base.postgres' && option.value === 'deleteTable') {
			return false;
		}
		return true;
	});

	// Return a modified parameter with filtered options
	return {
		...parameter,
		options: filteredOptions,
	};
}

/**
 * Check if current user can perform delete operations
 */
export function canPerformDeleteOperations(): boolean {
	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser;

	// Owners and admins can perform delete operations, members cannot
	return currentUser?.role === 'global:owner' || currentUser?.role === 'global:admin';
}
